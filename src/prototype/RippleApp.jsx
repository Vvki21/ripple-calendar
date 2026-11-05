import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadPalette, paletteVars } from '../lib/palette.js';
import { SAMPLE_EVENTS, STAGES, TODAY, TODAY_KEY, DAY_START, NOW_MINUTES, DEFAULT_COLOR, colorName, sameDay, addDays, weekOf, dayKey, fromKey, range, clock } from './data.js';
import {
  computeRipple, clampEnd, clampStart, commit, resolveOptions,
  findConflicts, findSlot, freeIntervalAt, SNAP,
} from './ripple.js';
import Timeline, { HOUR } from './Timeline.jsx';
import WeekView from './WeekView.jsx';
import MonthView from './MonthView.jsx';
import EventPopover from './EventPopover.jsx';
import ConflictCard from './ConflictCard.jsx';
import RippleSuggest from './RippleSuggest.jsx';
import StageDock from './StageDock.jsx';
import ContextMenu from './ContextMenu.jsx';
import { Logo, PlusIcon, SwatchIcon, CheckIcon, ChevronLeft, ChevronRight } from './icons.jsx';
import './prototype.css';

/* ---------- Stage scripts ----------
   Every stage runs on the same live schedule; jumping to a stage builds its
   situation from whatever the schedule is now. */

const byStart = (a, b) => a.start - b.start;
const nextAfter = (events, e) => [...events].sort(byStart).find((n) => n.id !== e.id && n.start >= e.end);

const onToday = (events) => events.filter((e) => e.date === TODAY_KEY); // demos run on today's column

function demoStretch(events) {
  const day = onToday(events);
  const flex = [...day].sort(byStart).filter((e) => e.type === 'flexible');
  for (const e of flex) {
    const n = nextAfter(day, e);
    if (!n || n.type !== 'flexible') continue;
    const draft = { id: e.id, end: clampEnd(e, n.start + 30) };
    const r = computeRipple(events, draft);
    if (r.changed.length && !r.conflicts.length) return draft;
  }
  for (const e of flex) {
    const draft = { id: e.id, end: clampEnd(e, e.end + 30) };
    if (draft.end !== e.end && !computeRipple(events, draft).conflicts.length) return draft;
  }
  return null;
}

// A small stretch into free time — nothing else needs to move.
function demoSmall(events) {
  const flex = [...onToday(events)].sort(byStart).filter((e) => e.type === 'flexible');
  for (const e of flex) {
    const draft = { id: e.id, end: clampEnd(e, e.end + 15) };
    const r = computeRipple(events, draft);
    if (draft.end !== e.end && !r.changed.length && !r.conflicts.length) return draft;
  }
  return demoStretch(events);
}

function demoConflict(events) {
  const day = onToday(events);
  const flex = [...day].sort(byStart).filter((e) => e.type === 'flexible');
  for (const e of flex) {
    const n = nextAfter(day, e);
    if (n?.type === 'fixed') return { draft: { id: e.id, end: clampEnd(e, n.start + 30) } };
  }
  for (const e of flex) {
    const n = nextAfter(day, e);
    if (n) return { draft: { id: e.id, end: clampEnd(e, n.start + 30) }, lock: n.id };
  }
  return { draft: null };
}

function stageFromUrl() {
  const n = Number(new URLSearchParams(window.location.search).get('stage'));
  return Number.isInteger(n) && n >= 1 && n <= STAGES.length ? n - 1 : 0;
}

function describeChange(r) {
  const t = r.target;
  const total = r.events
    .filter((e) => e.id === t.id || (e.splitOf === t.id && e.part))
    .reduce((s, e) => s + e.end - e.start, 0);
  const delta = total - (t.origEnd - t.origStart);
  const parts = [];
  if (r.moved) parts.push(`${t.title} moved to ${clock(t.start)}`);
  if (delta) parts.push(`${t.title} ${delta > 0 ? 'extended' : 'shortened'} by ${Math.abs(delta)} min`);
  const moved = r.changed.filter((e) => e.delta).length;
  if (moved) parts.push(`${moved} event${moved > 1 ? 's' : ''} rippled`);
  const split = r.changed.filter((e) => e.part === 1);
  if (split.length) parts.push(`${split.map((e) => e.title).join(', ')} split in two`);
  const cut = r.changed.filter((e) => e.shortened && e.id !== t.id);
  if (cut.length) parts.push(`${cut.map((e) => e.title).join(', ')} shortened`);
  return parts.join(' · ') || 'Schedule updated';
}

// Saved schedule: survives a refresh. (Undo history is per session.)
const EVENTS_KEY = 'ripple-events-v2';
const VIEW_KEY = 'ripple-view';
function loadEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(EVENTS_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) return saved.map((e) => ({ date: TODAY_KEY, ...e }));
  } catch { /* storage unavailable */ }
  return SAMPLE_EVENTS;
}

function initialState() {
  const i = stageFromUrl();
  const fromDemoUrl = new URLSearchParams(window.location.search).has('stage');
  const s = { events: fromDemoUrl ? SAMPLE_EVENTS : loadEvents(), draft: null, simDrag: false, compare: false, history: [], applied: null };
  const id = STAGES[i].id;
  if (id === 'stretch' || id === 'ripple' || id === 'compare') {
    s.draft = id === 'stretch' ? demoSmall(s.events) : demoStretch(s.events);
    s.simDrag = true; // shown as if mid-drag; release isn't simulated
    s.compare = id === 'compare';
  } else if (id === 'lock') {
    const c = demoConflict(s.events);
    if (c.lock) s.events = s.events.map((e) => (e.id === c.lock ? { ...e, type: 'fixed' } : e));
    s.draft = c.draft;
  } else if (id === 'updated') {
    const r = computeRipple(s.events, demoStretch(s.events));
    s.history = [s.events];
    s.events = commit(r);
    s.applied = { message: 'Event updated', detail: describeChange(r), key: 1 };
  }
  s.selectedId = s.draft?.id || null;
  return s;
}

const NEW_ID = '__new';
let idSeq = 0;
const newId = () => `ev-${Date.now().toString(36)}-${idSeq++}`;

export default function RippleApp() {
  const palette = useMemo(loadPalette, []);
  const initial = useMemo(initialState, []);

  const [date, setDate] = useState(TODAY);
  const [view, setView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) || 'week'; } catch { return 'week'; }
  }); // Week is the main experience
  const [events, setEvents] = useState(initial.events);
  const [draft, setDraft] = useState(initial.draft);
  const [dragging, setDragging] = useState(false);
  const [simDrag, setSimDrag] = useState(initial.simDrag);
  const [compare, setCompare] = useState(initial.compare);
  const [lockTouched, setLockTouched] = useState(false);
  const [resolution, setResolution] = useState(null);
  const [history, setHistory] = useState(initial.history);
  const [applied, setApplied] = useState(initial.applied);
  const [selectedId, setSelectedId] = useState(initial.selectedId);

  const [createPreview, setCreatePreview] = useState(null); // {start, end} while drag-creating
  const [newEvent, setNewEvent] = useState(null); // provisional event being created (not saved yet)
  const [renamingId, setRenamingId] = useState(null);
  const [menu, setMenu] = useState(null); // {id, x, y}
  const [gestureOn, setGestureOn] = useState(false);
  const [toastOn, setToastOn] = useState(false);
  const [popover, setPopover] = useState(null);
  const [conflictShown, setConflictShown] = useState(false);
  // Demo Mode: the six-stage navigator for presenting the prototype. Hidden in normal use.
  const [demo, setDemo] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    return q.has('demo') || Number(q.get('stage')) > 1;
  }); // the conflict card can be tucked away and reopened // {id, focusTitle} — event details, anchored to its card

  const isToday = sameDay(date, TODAY);
  const activeDraft = view === 'month' ? null : draft;
  const eventsOn = (k) => events.filter((e) => e.date === k);

  // One engine for every view: it ripples only within the edited event's (destination) day.
  const rippled = useMemo(() => computeRipple(events, activeDraft), [events, activeDraft]);
  const fixes = useMemo(
    () => (activeDraft ? resolveOptions(rippled, activeDraft, events) : { options: [], notes: [] }),
    [rippled, activeDraft, events],
  );
  const chosen = fixes.options.find((o) => o.id === resolution) || null;
  const shown = chosen ? chosen.result : rippled;
  const unresolved = shown.conflicts.length > 0;
  const hadConflict = rippled.conflicts.length > 0;
  const selected = shown.events.find((e) => e.id === selectedId) || null;

  // Stages follow the live interaction: dragging (2) becomes a ripple (3) the moment
  // something moves; only conflicts outlive the drag (4); a committed change is (6).
  const stageIndex = (() => {
    if (dragging || simDrag) return compare ? 4 : rippled.changed.length ? 2 : 1;
    if (activeDraft) return 3;
    return applied ? 5 : 0;
  })();
  const stage = STAGES[stageIndex];

  useEffect(() => {
    document.title = 'Ripple';
  }, []);

  // Persist the schedule and the chosen view.
  useEffect(() => {
    try { localStorage.setItem(EVENTS_KEY, JSON.stringify(events)); } catch { /* ignore */ }
  }, [events]);
  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ }
  }, [view]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (demo) {
      url.searchParams.set('demo', '');
      url.searchParams.set('stage', String(stageIndex + 1));
    } else {
      url.searchParams.delete('demo');
      url.searchParams.delete('stage');
    }
    window.history.replaceState(null, '', url.toString().replace('demo=&', 'demo&').replace(/demo=$/, 'demo'));
  }, [stageIndex, demo]);

  // "Event updated · Undo" — shown briefly after every committed change.
  useEffect(() => {
    if (!applied?.key) return undefined;
    setToastOn(true);
    const t = setTimeout(() => setToastOn(false), 5000);
    return () => clearTimeout(t);
  }, [applied?.key]);

  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current && view !== 'month') scrollRef.current.scrollTop = ((9.5 * 60 - DAY_START) / 60) * HOUR;
  }, [date, view]);

  /* ---------- Schedule mutations (all undoable) ---------- */

  const applyEvents = (next, message) => {
    setHistory((h) => [...h, events]);
    setEvents(next);
    setApplied({ message, key: Date.now() });
  };

  const resetPreview = () => {
    setCompare(false);
    setLockTouched(false);
    setSimDrag(false);
    setResolution(null);
  };

  const changeDraft = (next) => {
    setDraft(next);
    setResolution(null);
  };

  // Commit a ripple result as the new schedule (one undo step covers every event it touched).
  const commitResult = (r) => {
    setHistory((h) => [...h, events]);
    setEvents(commit(r));
    setApplied({ message: 'Schedule updated', key: Date.now() });
    setDraft(null);
    setDragging(false);
    resetPreview();
  };

  const isNoop = (d) => {
    const ev = events.find((e) => e.id === d.id);
    return !ev || (d.end === ev.end && (d.start ?? ev.start) === ev.start && (d.date ?? ev.date) === ev.date);
  };

  // Drag, release, done: a clean change commits at once; a conflicting one waits for a choice.
  const propose = (next) => {
    if (!next || isNoop(next)) { setDraft(null); resetPreview(); return; }
    const r = computeRipple(events, next);
    if (r.conflicts.length) { setDraft(next); setResolution(null); setSimDrag(false); setConflictShown(true); return; }
    commitResult(r);
  };

  const applyResolution = (id) => {
    const o = fixes.options.find((x) => x.id === id);
    if (o) commitResult(o.result);
  };

  const cancel = useCallback(() => {
    setDraft(null);
    setDragging(false);
    resetPreview();
  }, []);

  // Enter applies a scripted (navigator) preview; normal drags commit on release.
  const confirm = () => {
    if (!activeDraft || unresolved || dragging) return;
    commitResult(shown);
  };

  const undo = useCallback(() => {
    if (!history.length) return;
    setToastOn(false);
    setEvents(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setApplied(null);
    setDraft(null);
    setNewEvent(null);
    setRenamingId(null);
    resetPreview();
  }, [history]);

  const setType = (id, type) => {
    const ev = events.find((e) => e.id === id);
    if (!ev || ev.type === type) return;
    // Undoable, and touches only the lock state — color and everything else stay as they are.
    applyEvents(events.map((e) => (e.id === id ? { ...e, type } : e)), type === 'fixed' ? `Locked “${ev.title}”` : `Unlocked “${ev.title}”`);
    setResolution(null);
    if (draft) {
      setLockTouched(true);
      if (draft.id === id && type === 'fixed') cancel();
    }
  };
  const toggleLock = (id) => {
    const ev = events.find((e) => e.id === id);
    if (ev) setType(id, ev.type === 'fixed' ? 'flexible' : 'fixed');
  };
  const setColor = (id, color) => {
    const ev = events.find((e) => e.id === id);
    if (!ev || ev.color === color) return;
    applyEvents(events.map((e) => (e.id === id ? { ...e, color } : e)), `${colorName(color)} · ${ev.title}`);
  };
  const setSplittable = (id, splittable) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, splittable } : e)));
    setResolution(null);
  };

  const adjust = (id, minutes) => {
    const ev = events.find((e) => e.id === id);
    if (!ev || ev.type !== 'flexible') return;
    const same = draft?.id === id;
    const start = same ? draft.start ?? ev.start : ev.start;
    const fromEnd = same ? draft.end : ev.end;
    if (!same) resetPreview();
    setSimDrag(false);
    setApplied(null);
    const end = clampEnd(ev, fromEnd + minutes, start);
    propose({ id, start, end, date: ev.date });
    setSelectedId(id);
  };

  // Times typed in the popover go through the same ripple as a drag.
  const setTime = (id, start, end) => {
    const ev = events.find((e) => e.id === id);
    if (!ev || end - start < ev.minDuration) return;
    setPopover(null);
    propose({ id, start, end, date: ev.date });
  };

  /* ---------- Create / rename / duplicate / delete ---------- */

  // A provisional event: shown on the timeline, edited in the popover, saved only with a name.
  const provisional = (start, end, date) => ({
    id: NEW_ID, date, title: '', subtitle: '', location: '', notes: '',
    start, end, type: 'flexible', minDuration: SNAP, splittable: false, color: DEFAULT_COLOR,
  });

  const saveNew = (title) => {
    if (!newEvent) return;
    const name = title.trim();
    if (!name) { setNewEvent(null); return; }
    const ev = { ...newEvent, id: newId(), title: name };
    setNewEvent(null);
    if (findConflicts([...events, ev]).length) return; // never overlap on create
    applyEvents([...events, ev], `Added “${name}” · ${range(ev.start, ev.end)}`);
    setSelectedId(ev.id);
  };

  // "+" in an empty slot: 30 minutes, clipped to the free time available.
  const quickCreate = (minute, k) => {
    if (draft) return;
    const gap = freeIntervalAt(eventsOn(k), minute);
    if (!gap) return;
    const start = Math.max(minute, gap.lo);
    const end = Math.min(start + 30, gap.hi);
    if (end - start < SNAP) return;
    setMenu(null);
    setRenamingId(null);
    setPopover(null);
    setNewEvent(provisional(start, end, k));
  };

  const newFromNav = () => {
    cancel();
    if (view === 'month') setView('week');
    const k = dayKey(date);
    const from = k === TODAY_KEY ? Math.max(DAY_START, Math.ceil(NOW_MINUTES / SNAP) * SNAP) : DAY_START + 60;
    const start = findSlot(eventsOn(k), from, 30) ?? findSlot(eventsOn(k), DAY_START, 30);
    if (start == null) return;
    setPopover(null);
    setNewEvent(provisional(start, start + 30, k));
    requestAnimationFrame(() => {
      const sc = scrollRef.current;
      if (sc) sc.scrollTo({ top: Math.max(0, ((start - DAY_START) / 60) * HOUR - 120), behavior: 'smooth' });
    });
  };

  const rename = (id, title) => {
    setRenamingId((cur) => (cur === id ? null : cur)); // don't close an editor opened on another card
    const name = title.trim();
    const ev = events.find((e) => e.id === id);
    if (!ev || !name || name === ev.title) return;
    applyEvents(events.map((e) => (e.id === id ? { ...e, title: name } : e)), `Renamed to “${name}”`);
  };

  const updateField = (id, field, value) => {
    applyEvents(events.map((e) => (e.id === id ? { ...e, [field]: value } : e)), 'Event updated');
  };

  const duplicateSlot = (id) => {
    const ev = events.find((e) => e.id === id);
    return ev ? findSlot(eventsOn(ev.date), ev.end, ev.end - ev.start) : null;
  };
  const duplicate = (id) => {
    const ev = events.find((e) => e.id === id);
    const start = duplicateSlot(id);
    if (!ev || start == null) return;
    const copy = { ...ev, id: newId(), start, end: start + ev.end - ev.start, type: 'flexible' };
    delete copy.splitOf;
    applyEvents([...events, copy], `Duplicated “${ev.title}” to ${clock(start)}`);
    setSelectedId(copy.id);
  };
  const remove = (id) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    if (draft?.id === id) cancel();
    applyEvents(events.filter((e) => e.id !== id), `Deleted “${ev.title}”`);
    if (selectedId === id) setSelectedId(null);
  };

  /* ---------- Pointer gestures: create · move · resize ---------- */

  const gRef = useRef(null);
  const previewRef = useRef(null);

  // Every day column is a lane tagged with its date; they share the same vertical scale.
  const lanes = () => [...document.querySelectorAll('[data-lane-date]')];
  const laneAt = (clientX) => {
    const all = lanes();
    return all.find((l) => { const r = l.getBoundingClientRect(); return clientX >= r.left && clientX < r.right; })
      || all.sort((a, b) => {
        const da = Math.abs(clientX - (a.getBoundingClientRect().left + a.getBoundingClientRect().width / 2));
        const db = Math.abs(clientX - (b.getBoundingClientRect().left + b.getBoundingClientRect().width / 2));
        return da - db;
      })[0];
  };
  const minuteAt = (clientY, lane = lanes()[0]) => {
    const r = lane.getBoundingClientRect();
    return DAY_START + ((clientY - r.top) / HOUR) * 60;
  };

  const begin = (kind, pe, payload) => {
    gRef.current = { kind, y0: pe.clientY, x0: pe.clientX, lastY: pe.clientY, lastX: pe.clientX, active: false, prevDraft: draft, ...payload };
    setGestureOn(true);
  };

  const exitDemo = () => { setDraft(null); setSimDrag(false); setCompare(false); };

  const onCardPointerDown = (id, part, pe) => {
    if (pe.button !== 0 || renamingId === id) return;
    if (simDrag) exitDemo();
    setMenu(null);
    const ev = events.find((e) => e.id === id);
    if (!ev) { setSelectedId(id); return; } // synthetic preview block (e.g. split part)
    const same = draft?.id === id;
    const base = same ? { start: draft.start ?? ev.start, end: draft.end, date: draft.date ?? ev.date } : { start: ev.start, end: ev.end, date: ev.date };
    if (part === 'handle') {
      pe.preventDefault();
      begin('resize', pe, { id, ev, base });
    } else {
      const onTitle = Boolean(pe.target.closest?.('.ev__title'));
      begin('move', pe, { id, ev, base, offset: minuteAt(pe.clientY) - base.start, locked: ev.type === 'fixed', onTitle });
    }
  };

  const onLanePointerDown = (pe) => {
    if (pe.button !== 0 || pe.pointerType === 'touch') return; // touch scrolls
    if (pe.target.closest('.ev, .tl__plus, .ev-editor, .tl__warn')) return;
    setMenu(null);
    if (simDrag) { exitDemo(); return; }
    if (draft || newEvent || renamingId) return;
    const lane = pe.currentTarget;
    const k = lane.dataset.laneDate;
    const raw = minuteAt(pe.clientY, lane);
    const gap = freeIntervalAt(eventsOn(k), raw);
    if (!gap || gap.hi - gap.lo < SNAP) return;
    const anchor = Math.min(gap.hi - SNAP, Math.max(gap.lo, Math.floor(raw / SNAP) * SNAP));
    pe.preventDefault();
    begin('create', pe, { anchor, gap, date: k });
  };

  const activate = (g) => {
    g.active = true;
    setRenamingId(null);
    setPopover(null);
    if (g.kind === 'create') {
      const p = { start: g.anchor, end: g.anchor + SNAP, date: g.date };
      previewRef.current = p;
      setCreatePreview(p);
      return;
    }
    if (draft?.id !== g.id) resetPreview();
    setSimDrag(false);
    setApplied(null);
    setResolution(null);
    setSelectedId(g.id);
    g.last = { id: g.id, start: g.base.start, end: g.base.end, date: g.base.date };
    setDraft(g.last);
    setDragging(true);
  };

  const track = (clientX, clientY) => {
    const g = gRef.current;
    if (!g) return;
    g.lastY = clientY;
    g.lastX = clientX;
    if (!g.active) {
      if (Math.abs(clientY - g.y0) < 5 && Math.abs(clientX - g.x0) < 5) return;
      if (g.kind === 'move' && g.locked) { g.blocked = true; return; } // locked: can't be dragged
      activate(g);
    }
    const m = minuteAt(clientY);
    if (g.kind === 'resize') {
      const end = clampEnd(g.ev, m, g.base.start);
      if (g.last.end !== end) { g.last = { id: g.id, start: g.base.start, end, date: g.base.date }; setDraft(g.last); }
    } else if (g.kind === 'move') {
      const len = g.base.end - g.base.start;
      const start = clampStart(m - g.offset, len);
      const date = laneAt(clientX)?.dataset.laneDate || g.base.date; // sideways = another day
      if (g.last.start !== start || g.last.date !== date) { g.last = { id: g.id, start, end: start + len, date }; setDraft(g.last); }
    } else {
      const cur = Math.round(m / SNAP) * SNAP;
      let s = g.anchor;
      let e = g.anchor + SNAP;
      if (cur >= g.anchor + SNAP) e = cur;
      else if (cur < g.anchor) s = cur;
      s = Math.max(s, g.gap.lo);
      e = Math.min(e, g.gap.hi);
      if (e - s < SNAP) { if (s + SNAP <= g.gap.hi) e = s + SNAP; else s = e - SNAP; }
      const p = previewRef.current;
      if (!p || p.start !== s || p.end !== e) {
        previewRef.current = { start: s, end: e, date: g.date };
        setCreatePreview(previewRef.current);
      }
    }
  };

  const finish = () => {
    const g = gRef.current;
    gRef.current = null;
    setGestureOn(false);
    if (!g) return;
    if (!g.active) {
      if (g.kind === 'move' && !g.blocked) { // a click, not a drag
        setSelectedId(g.id);
        setSimDrag(false);
        if (g.onTitle) { setPopover(null); setRenamingId(g.id); } // title → rename in place
        else setPopover({ id: g.id, focusTitle: false }); // anywhere else → popover
      }
      return;
    }
    if (g.kind === 'create') {
      setNewEvent(provisional(previewRef.current.start, previewRef.current.end, previewRef.current.date));
      previewRef.current = null;
      setCreatePreview(null);
      return;
    }
    setDragging(false);
    propose(g.last);
  };

  const abort = () => {
    const g = gRef.current;
    gRef.current = null;
    setGestureOn(false);
    if (!g?.active) return;
    if (g.kind === 'create') {
      previewRef.current = null;
      setCreatePreview(null);
    } else {
      setDragging(false);
      setDraft(g.prevDraft);
    }
  };

  useEffect(() => {
    if (!gestureOn) return undefined;
    const move = (pe) => track(pe.clientX, pe.clientY);
    const up = () => finish();
    const key = (ke) => { if (ke.key === 'Escape') { ke.stopPropagation(); abort(); } };
    let raf;
    const tick = () => { // auto-scroll near the edges while dragging
      const g = gRef.current;
      const sc = scrollRef.current;
      if (g?.active && sc) {
        const r = sc.getBoundingClientRect();
        const edge = 56;
        let dy = 0;
        if (g.lastY < r.top + edge) dy = -Math.ceil((r.top + edge - g.lastY) / 4);
        else if (g.lastY > r.bottom - edge) dy = Math.ceil((g.lastY - (r.bottom - edge)) / 4);
        if (dy) { sc.scrollTop += dy; track(g.lastX, g.lastY); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const kind = gRef.current?.kind;
    document.body.classList.add(kind === 'move' ? 'is-moving' : kind === 'create' ? 'is-creating' : 'is-resizing');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', abort);
    window.addEventListener('blur', abort);
    window.addEventListener('keydown', key, true);
    return () => {
      cancelAnimationFrame(raf);
      document.body.classList.remove('is-moving', 'is-creating', 'is-resizing');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', abort);
      window.removeEventListener('blur', abort);
      window.removeEventListener('keydown', key, true);
    };
    // track/finish/abort read refs and stable setters, so binding once per gesture is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestureOn]);

  /* ---------- Navigator ---------- */

  const loadStage = (i) => {
    const idx = Math.max(0, Math.min(STAGES.length - 1, i));
    const id = STAGES[idx].id;
    if (document.activeElement?.closest?.('.ev')) document.activeElement.blur();
    setDate(TODAY);
    if (view === 'month') setView('week');
    setDragging(false);
    setLockTouched(false);
    setResolution(null);
    setCompare(false);
    setSimDrag(false);
    setNewEvent(null);
    setRenamingId(null);
    setMenu(null);

    if (id === 'today') { setDraft(null); setApplied(null); return; }
    if (id === 'updated') {
      if (activeDraft && !unresolved) { commitResult(shown); return; }
      const d = demoStretch(events);
      if (!d) return;
      const r = computeRipple(events, d);
      setHistory((h) => [...h, events]);
      setEvents(commit(r));
      setApplied({ message: 'Event updated', detail: describeChange(r), key: Date.now() });
      setDraft(null);
      setSelectedId(d.id);
      return;
    }
    setApplied(null);
    if (id === 'lock') {
      const c = demoConflict(events);
      if (c.lock) setEvents((prev) => prev.map((e) => (e.id === c.lock ? { ...e, type: 'fixed' } : e)));
      setDraft(c.draft);
      if (c.draft) setSelectedId(c.draft.id);
      return;
    }
    const d = id === 'stretch' ? demoSmall(events) : demoStretch(events);
    setDraft(d);
    if (d) setSelectedId(d.id);
    setSimDrag(Boolean(d));
    setCompare(id === 'compare');
  };

  const resetSample = () => {
    setEvents(SAMPLE_EVENTS);
    setHistory([]);
    setApplied(null);
    setDraft(null);
    setNewEvent(null);
    setRenamingId(null);
    resetPreview();
    setSelectedId(null);
  };

  /* ---------- Keyboard ---------- */

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.target.closest?.('input, textarea, [contenteditable]')) return;
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        if (draft) cancel(); else undo();
        return;
      }
      if (ev.key === 'Escape') {
        if (menu) setMenu(null);
        else if (draft) cancel();
        else setSelectedId(null);
      } else if (ev.key === 'Enter' && draft && !ev.target.closest?.('button, [role="button"]')) confirm();
      else if ((ev.key === 'Delete' || ev.key === 'Backspace') && selectedId && !draft && committedIds.has(selectedId)) remove(selectedId);
      else if (demo && ev.key === 'ArrowRight' && !draft) loadStage(stageIndex + 1);
      else if (demo && ev.key === 'ArrowLeft' && !draft) loadStage(stageIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const committedIds = useMemo(() => new Set(events.map((e) => e.id)), [events]);

  /* ---------- Views ---------- */

  const weekKeys = weekOf(date).map(dayKey);
  const todayVisible = view === 'week' ? weekKeys.includes(TODAY_KEY) : view === 'day' ? isToday
    : date.getMonth() === TODAY.getMonth() && date.getFullYear() === TODAY.getFullYear();
  const step = (dir) => {
    cancel();
    setPopover(null);
    setNewEvent(null);
    if (view === 'day') setDate(addDays(date, dir));
    else if (view === 'week') setDate(addDays(date, dir * 7));
    else setDate(new Date(date.getFullYear(), date.getMonth() + dir, 1));
  };
  const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const title = view === 'day' ? (
    <>{date.toLocaleDateString('en-US', { weekday: 'long' })}<span>, {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span></>
  ) : view === 'week' ? (
    <>{monthYear.split(' ')[0]} <span>{monthYear.split(' ')[1]}</span></>
  ) : (
    <>{monthYear.split(' ')[0]} <span>{monthYear.split(' ')[1]}</span></>
  );

  // What one day column shows: the (previewed) events on that date and any overlays.
  const sliceDay = (k) => {
    const t = shown.target;
    return {
      events: shown.events.filter((e) => e.date === k),
      changed: shown.changed.filter((e) => e.date === k),
      conflicts: (chosen ? [] : rippled.conflicts).filter((c) => c.by?.date === k),
      target: t && t.date === k ? t : null,
      moved: t && t.date === k ? shown.moved : 0,
      durationDelta: shown.durationDelta,
      originGhost: t && (shown.moved !== 0 || shown.movedDay) && t.origDate === k ? t : null,
    };
  };
  const laneProps = (k) => ({
    selectedId: selected?.id,
    committedIds,
    hoverEnabled: !gestureOn && !activeDraft && !newEvent && !renamingId,
    createPreview: createPreview?.date === k ? createPreview : null,
    newEvent: newEvent?.date === k ? newEvent : null,
    renamingId,
    canOpenConflict: Boolean(activeDraft && hadConflict && !dragging),
    onLanePointerDown,
    onCardPointerDown,
    onCardMenu: (id, x, y) => { setSelectedId(id); setMenu({ id, x, y }); },
    onCardRename: (id) => { setSelectedId(id); setPopover({ id, focusTitle: true }); },
    onQuickCreate: quickCreate,
    onRenameSave: rename,
    onRenameCancel: () => setRenamingId(null),
    onToggleLock: toggleLock,
    onOpenConflict: () => setConflictShown(true),
  });
  const menuEvent = menu ? events.find((e) => e.id === menu.id) : null;
  const popoverEvent = popover ? events.find((e) => e.id === popover.id) : null;
  const liveItems = (dragging || simDrag) && activeDraft ? shown.changed.filter((e) => e.delta > 0) : [];
  const liveRipple = Boolean(rippled.target && (dragging || simDrag) && (liveItems.length || rippled.conflicts.length));
  const conflictOpen = Boolean(activeDraft && hadConflict && !dragging && !simDrag && rippled.target && conflictShown);

  return (
    <div className="app" style={paletteVars(palette)} data-stage={stage.id}>
      <nav className="topnav">
        <a className="topnav__brand" href={import.meta.env.BASE_URL} aria-label="Ripple home"><Logo /></a>

        <div className="topnav__date">
          <div className="topnav__step" role="group" aria-label={`Change ${view}`}>
            <button className="iconbtn" type="button" onClick={() => step(-1)} aria-label={`Previous ${view}`}><ChevronLeft /></button>
            <button className="topnav__today" type="button" onClick={() => setDate(TODAY)} disabled={todayVisible}>Today</button>
            <button className="iconbtn" type="button" onClick={() => step(1)} aria-label={`Next ${view}`}><ChevronRight /></button>
          </div>
          <h1 className="topnav__title">{title}</h1>
        </div>

        <div className="topnav__right">
          <div className="topnav__views" role="tablist" aria-label="Calendar view">
            {['day', 'week', 'month'].map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                className={view === v ? 'is-on' : ''}
                onClick={() => { cancel(); setPopover(null); setNewEvent(null); setView(v); }}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`demobtn ${demo ? 'is-on' : ''}`}
            aria-pressed={demo}
            onClick={() => { if (demo) { exitDemo(); } else if (view === 'month') setView('week'); setDemo((d) => !d); }}
            title="Show the six prototype stages"
          >
            Demo
          </button>
          <a className="iconbtn" href={`${import.meta.env.BASE_URL}design-system`} aria-label="Design system" title="Design system"><SwatchIcon /></a>
          <button className="newbtn" type="button" onClick={newFromNav} aria-label="New event"><PlusIcon /> New</button>
        </div>
      </nav>

      <div className="workspace">
        <main className="main">
          <div className={`main__scroll main__scroll--${view}`} ref={scrollRef}>
            {view === 'week' && (
              <WeekView
                weekKeys={weekKeys}
                todayKey={TODAY_KEY}
                selectedKey={dayKey(date)}
                sliceDay={sliceDay}
                laneProps={laneProps}
                draftId={activeDraft?.id ?? null}
                dragging={dragging || simDrag}
                compare={compare}
                gestureOn={gestureOn}
                onPickDay={(k) => { setDate(fromKey(k)); setView('day'); }}
              />
            )}
            {view === 'day' && (
              <Timeline
                dateKey={dayKey(date)}
                isToday={isToday}
                day={sliceDay(dayKey(date))}
                stage={stage}
                draftId={activeDraft?.id ?? null}
                dragging={dragging || simDrag}
                compare={compare}
                gestureOn={gestureOn}
                {...laneProps(dayKey(date))}
              />
            )}
            {view === 'month' && (
              <MonthView
                monthDate={date}
                todayKey={TODAY_KEY}
                selectedId={popover?.id}
                events={events}
                onOpenEvent={(id) => { setSelectedId(id); setPopover({ id, focusTitle: false }); }}
                onOpenDay={(k) => { setDate(fromKey(k)); setView('day'); }}
              />
            )}
          </div>
          <div className={`toast ${toastOn && applied ? 'is-on' : ''}`} role="status" aria-live="polite">
            {applied && (
              <>
                <span className="toast__check"><CheckIcon /></span>
                <span className="toast__msg">{applied.message}</span>
                {applied.detail && <span className="toast__detail">{applied.detail}</span>}
                {history.length > 0 && (
                  <button type="button" className="toast__undo" onClick={undo} tabIndex={toastOn ? 0 : -1}>
                    Undo <kbd>⌘Z</kbd>
                  </button>
                )}
              </>
            )}
          </div>
          {demo && <StageDock index={stageIndex} onChange={loadStage} onReset={resetSample} />}
        </main>


      </div>

      {newEvent && !gestureOn && (
        <EventPopover
          key="__new"
          mode="create"
          event={newEvent}
          layoutKey={newEvent}
          onSave={saveNew}
          onCancel={() => setNewEvent(null)}
          onSetType={(_, type) => setNewEvent((n) => ({ ...n, type }))}
          onSetTime={(_, start, end) => setNewEvent((n) => {
            const gap = freeIntervalAt(eventsOn(n.date), n.start); // a new event stays inside its free slot
            return end - start >= SNAP && (!gap || (start >= gap.lo && end <= gap.hi)) ? { ...n, start, end } : n;
          })}
          onSetColor={(_, color) => setNewEvent((n) => ({ ...n, color }))}
          onSetSplittable={(_, splittable) => setNewEvent((n) => ({ ...n, splittable }))}
          onUpdateField={(_, field, value) => setNewEvent((n) => ({ ...n, [field]: value }))}
        />
      )}

      {popoverEvent && !gestureOn && !activeDraft && (
        <EventPopover
          key={popoverEvent.id}
          event={popoverEvent}
          focusTitle={popover.focusTitle}
          layoutKey={events}
          onClose={() => { setPopover(null); setSelectedId(null); }}
          onRename={rename}
          onSetTime={setTime}
          onSetType={setType}
          onSetColor={setColor}
          onSetSplittable={setSplittable}
          onUpdateField={updateField}
          onMenu={(id, x, y) => setMenu({ id, x, y, fromPopover: true })}
        />
      )}

      {liveRipple && (
        <RippleSuggest
          mode="live"
          targetId={activeDraft.id}
          title={rippled.target.title}
          items={liveItems}
          conflict={rippled.conflicts[0]}
          layoutKey={shown}
        />
      )}


      {conflictOpen && (
        <ConflictCard
          raw={rippled}
          fixes={fixes}
          resolution={resolution}
          layoutKey={shown}
          onPreview={setResolution}
          onApply={applyResolution}
          onCancel={cancel}
          onDismiss={() => setConflictShown(false)}
        />
      )}

      {menu && menuEvent && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          event={menuEvent}
          canDuplicate={duplicateSlot(menu.id) != null}
          onClose={() => setMenu(null)}
          compact={menu.fromPopover}
          onRename={() => { setMenu(null); setSelectedId(menu.id); setPopover({ id: menu.id, focusTitle: true }); }}
          onDuplicate={() => { setMenu(null); setPopover(null); duplicate(menu.id); }}
          onToggleLock={() => { setMenu(null); toggleLock(menu.id); }}
          onDelete={() => { setMenu(null); setPopover(null); remove(menu.id); }}
        />
      )}
    </div>
  );
}

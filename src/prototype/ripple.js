// Elastic Timeline engine — pure time arithmetic, no visual state.
//
// A "draft" is a proposed change to one event: { id, start?, end }.
//   • resize: only `end` changes   • move: `start` and `end` change together
// computeRipple() returns the schedule as it would look with the draft applied.
// The saved schedule is never mutated — callers commit the result only when valid.
//
// Rules, kept deliberately simple:
//   • Later Flexible events are pushed forward just enough to stop overlapping,
//     in their original order and keeping their durations. Free time absorbs
//     the push first, so the ripple stops as soon as there's room.
//   • Locked events never move. A pushed event hops over a locked one into the
//     next free time after it.
//   • Preferred time windows are soft: an event may be pushed outside its window
//     (it's marked `offWindow`), and that never stops the ripple.
//   • The edited event itself landing on a locked event, on an earlier event, or
//     pushing anything past the end of the day is a conflict: preview only.
//   • Nothing is ever shortened, split or deleted automatically.

import { DAY_START, DAY_END, range, duration, clock, shortDay } from './data.js';

export const SNAP = 15; // minutes

export const snap = (min) => Math.round(min / SNAP) * SNAP;

const outside = (e) => Boolean(e.window && (e.start < e.window.start || e.end > e.window.end));

export function computeRipple(events, draft) {
  const out = events.map((e) => ({ ...e, origStart: e.start, origEnd: e.end, origDate: e.date, delta: 0, offWindow: outside(e) }));
  const result = { events: out, target: null, changed: [], conflicts: [], durationDelta: 0, moved: 0 };
  if (!draft) return result;

  const target = out.find((e) => e.id === draft.id);
  if (!target) return result;
  if (draft.start != null) target.start = draft.start;
  if (draft.date) target.date = draft.date; // an explicit move to another day
  target.end = draft.end;
  const sameDay = (e) => e.id !== target.id && e.date === target.date; // ripple never crosses days
  target.offWindow = outside(target);
  result.target = target;
  result.durationDelta = target.end - target.start - (target.origEnd - target.origStart);
  result.moved = target.start - target.origStart;
  result.movedDay = target.date !== target.origDate;

  const locked = out.filter((e) => sameDay(e) && e.type === 'fixed').sort((a, b) => a.start - b.start);

  // 1. The edited event itself on top of a locked event.
  const hit = locked.find((f) => f.start < target.end && f.end > target.start);
  if (hit) {
    const start = Math.max(hit.start, target.start);
    const end = Math.min(hit.end, target.end);
    hit.hit = true;
    result.conflicts.push({ kind: 'fixed', blocker: hit, by: target, start, end, overlap: end - start });
  }

  // 2. Dropped onto an earlier event — we never push events upward.
  const above = out
    .filter((e) => sameDay(e) && e.type === 'flexible' && e.start < target.start && e.end > target.start)
    .sort((a, b) => b.end - a.end)[0];
  if (above) {
    const end = Math.min(above.end, target.end);
    result.conflicts.push({ kind: 'before', blocker: above, by: target, start: target.start, end, overlap: end - target.start });
  }

  // 3. Ripple later flexible events forward, hopping over locked ones.
  const later = out
    .filter((e) => sameDay(e) && e.type === 'flexible' && e.start >= target.start)
    .sort((a, b) => a.start - b.start);
  let cursor = target.end;
  let pusher = target;
  for (const e of later) {
    if (e.start >= cursor) break; // absorbed by free time
    const len = e.end - e.start;
    let s = cursor;
    for (let hop = true; hop;) {
      hop = false;
      for (const f of locked) if (f.start < s + len && f.end > s) { s = f.end; hop = true; f.hit = true; } // ripple reached a locked event
    }
    e.delta = s - e.start;
    e.start = s;
    e.end = s + len;
    e.offWindow = outside(e);
    cursor = e.end;
    pusher = e;
  }
  if (cursor > DAY_END) {
    result.conflicts.push({ kind: 'overflow', blocker: null, by: pusher, start: DAY_END, end: cursor, overlap: cursor - DAY_END });
  }

  result.changed = out.filter((e) => e.delta !== 0).sort((a, b) => a.start - b.start);
  return result;
}

// Longest end time (≤ the requested one) that produces no conflict.
export function fitEnd(events, draft) {
  const ev = events.find((e) => e.id === draft.id);
  const start = draft.start ?? ev.start;
  for (let end = draft.end; end >= start + ev.minDuration; end -= SNAP) {
    if (!computeRipple(events, { ...draft, end }).conflicts.length) return end;
  }
  return ev.end;
}

// Clamp a proposed end time to the event's own rules.
export function clampEnd(event, end, start = event.start) {
  return Math.min(DAY_END, Math.max(start + event.minDuration, snap(end)));
}

// Clamp a moved start so the whole event stays within the day.
export function clampStart(start, length) {
  return Math.min(DAY_END - length, Math.max(DAY_START, snap(start)));
}

// Strip engine bookkeeping so a preview can be committed as the new schedule.
export const commit = (rippled) =>
  rippled.events.map(({ origStart, origEnd, origDate, delta, shortened, part, parts, offWindow, hit, ...e }) => e);

/* ---------- Free time ---------- */

// Any overlap between two events, or anything running past the end of the day.
export function findConflicts(events) {
  const sorted = [...events].sort((a, b) => (a.date === b.date ? a.start - b.start : String(a.date).localeCompare(String(b.date))));
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length && sorted[j].date === sorted[i].date && sorted[j].start < sorted[i].end; j++) {
      out.push({ a: sorted[i], b: sorted[j] });
    }
    if (sorted[i].end > DAY_END) out.push({ a: sorted[i], b: null });
  }
  return out;
}

// Earliest SNAP-aligned start ≥ `from` where `length` minutes fit before DAY_END without overlap.
export function findSlot(events, from, length) {
  for (let s = Math.ceil(from / SNAP) * SNAP; s + length <= DAY_END; s += SNAP) {
    if (!events.some((e) => e.start < s + length && e.end > s)) return s;
  }
  return null;
}

// The free interval around a minute, or null if that minute is inside an event.
export function freeIntervalAt(events, minute) {
  if (events.some((e) => e.start <= minute && e.end > minute)) return null;
  const lo = Math.max(DAY_START, ...events.filter((e) => e.end <= minute).map((e) => e.end));
  const hi = Math.min(DAY_END, ...events.filter((e) => e.start > minute).map((e) => e.start));
  return { lo, hi };
}

/* ---------- Conflict resolution ---------- */

// Stable, unique id for a split's second part (an event may be split more than once).
function nextPartId(events, id) {
  const root = id.split('~')[0];
  let n = 2;
  while (events.some((e) => e.id === `${root}~${n}`)) n++;
  return `${root}~${n}`;
}

// What a proposal changes relative to the saved schedule, in plain terms.
export function describeChanges(saved, events) {
  const out = [];
  for (const e of [...events].sort((a, b) => a.start - b.start)) {
    const o = saved.find((x) => x.id === e.id);
    if (!o) out.push({ id: e.id, title: e.title, to: range(e.start, e.end), kind: 'added' });
    else if (o.start !== e.start || o.end !== e.end || o.date !== e.date) {
      const resized = o.end - o.start !== e.end - e.start;
      const day = o.date !== e.date ? `${shortDay(e.date)} ` : '';
      out.push({ id: e.id, title: e.title, from: range(o.start, o.end), to: day + range(e.start, e.end), kind: resized ? 'resized' : 'moved' });
    }
  }
  return out;
}

/**
 * Fixes for the first conflict. Only the edited event changes shape, only when
 * the user picks it, and only if the result is fully valid. Locked events are
 * never unlocked. Each option lists exactly what will change.
 *
 * Option: { id, title, changes: [{title, to, kind}], result }
 */
export function resolveOptions(rippled, draft, events) {
  const c = rippled.conflicts[0];
  if (!c) return { options: [], notes: [] };
  const t = rippled.target;
  const len = t.end - t.start;
  const options = [];
  const add = (id, title, r) => {
    if (!r || r.conflicts.length) return;
    const changes = describeChanges(events, r.events);
    if (changes.length) options.push({ id, title, changes, result: r }); // an option that changes nothing isn't a fix
  };
  const b = c.blocker;

  if (c.kind === 'overflow') {
    const end = t.end - c.overlap;
    if (end - t.start >= t.minDuration) add('shorten', `Shorten ${t.title}`, computeRipple(events, { id: t.id, date: t.date, start: t.start, end }));
  } else if (b && b.start >= t.start && c.kind === 'fixed') {
    // Runs into a locked event: end where it begins, or continue after it.
    if (b.start - t.start >= t.minDuration) {
      add('shorten', `Shorten ${t.title}`, computeRipple(events, { id: t.id, date: t.date, start: t.start, end: b.start }));
    }
    if (t.splittable && b.start - t.start >= SNAP) {
      const base = computeRipple(events, { id: t.id, date: t.date, start: t.start, end: b.start });
      const rest = t.end - b.start;
      if (!base.conflicts.length) {
        const first = { ...base.target, part: 1, parts: 2 };
        const others = base.events.filter((e) => e.id !== t.id && e.date === t.date);
        const start = findSlot([...others, first], b.end, rest);
        if (start !== null) {
          const second = {
            ...t, id: nextPartId(events, t.id), start, end: start + rest,
            origStart: start, origEnd: start + rest, delta: 0, part: 2, parts: 2, splitOf: t.id,
          };
          const evs = [...base.events.filter((e) => e.id !== t.id), first, second];
          if (!findConflicts(evs).length) {
            add('split', `Split ${t.title}`, { ...base, events: evs, target: first, changed: [...base.changed, first, second], conflicts: [] });
          }
        }
      }
    }
  } else if (b) {
    // Dropped onto an event (earlier, or a locked one it starts inside): start right after it.
    add('after', `Start after ${b.title}`, computeRipple(events, { id: t.id, date: t.date, start: b.end, end: b.end + len }));
  }

  // Move: keep the full length and find the nearest start where everything fits.
  if (!options.some((o) => o.id === 'after')) {
    for (let d = SNAP; d <= DAY_END - DAY_START; d += SNAP) {
      const tries = [t.start - d, t.start + d].filter((s) => s >= DAY_START && s + len <= DAY_END);
      const fit = tries.map((s) => computeRipple(events, { id: t.id, date: t.date, start: s, end: s + len })).find((r) => !r.conflicts.length);
      if (fit && describeChanges(events, fit.events).length) {
        options.unshift({ id: 'move', title: `Move ${t.title}`, changes: describeChanges(events, fit.events), result: fit });
        break;
      }
    }
  }

  const notes = options.length ? [] : ['Nothing fits around the locked events today. Drag to adjust, or keep the original.'];
  return { options, notes, conflict: c };
}

export function shiftLabel(min) {
  if (min < 60) return `+${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `+${h}h${m ? ` ${m}m` : ''}`;
}

export { clock };

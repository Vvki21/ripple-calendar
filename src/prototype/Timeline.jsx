import { useEffect, useRef, useState } from 'react';
import { DAY_START, DAY_END, NOW_MINUTES, DEFAULT_COLOR, hourLabel, range, duration, clock } from './data.js';
import { shiftLabel, freeIntervalAt, SNAP } from './ripple.js';
import { LockIcon, AlertIcon, SplitIcon, MoreIcon, PlusIcon, ClockIcon } from './icons.jsx';

export const HOUR = 56; // px per hour

const y = (min) => ((min - DAY_START) / 60) * HOUR;

// One day's column of time: grid lines, events, ripple/conflict overlays, create preview,
// provisional event and the hover "+". Shared by Day view (one lane) and Week view (seven).
export function DayLane({
  dateKey, isToday, day, selectedId, draftId, dragging, compare, committedIds,
  hoverEnabled, createPreview, newEvent, renamingId, canOpenConflict, compact,
  onLanePointerDown, onCardPointerDown, onCardMenu, onCardRename, onQuickCreate,
  onRenameSave, onRenameCancel, onToggleLock, onOpenConflict,
}) {
  const { events, changed, conflicts, target, moved, durationDelta } = day;
  const laneRef = useRef(null);
  const hours = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) hours.push(m);
  const showNow = isToday && NOW_MINUTES >= DAY_START && NOW_MINUTES <= DAY_END;
  const conflictIds = new Set(conflicts.flatMap((c) => [c.by?.id, c.blocker?.id]).filter(Boolean));
  const shiftOrder = Object.fromEntries(changed.map((e, i) => [e.id, i]));

  const [hover, setHover] = useState(null);
  useEffect(() => { if (!hoverEnabled) setHover(null); }, [hoverEnabled]);
  const onLaneMove = (pe) => {
    if (!hoverEnabled || pe.pointerType !== 'mouse') return;
    if (pe.target.closest('.tl__plus')) return;
    if (pe.target.closest('.ev, .ev-editor')) { setHover(null); return; }
    const r = laneRef.current.getBoundingClientRect();
    const m = Math.floor((DAY_START + ((pe.clientY - r.top) / HOUR) * 60) / SNAP) * SNAP;
    const gap = freeIntervalAt(events, m + 1);
    const start = gap ? Math.max(m, gap.lo) : null;
    setHover(gap && gap.hi - start >= SNAP ? start : null);
  };

  return (
    <div
      className={`tl__lane ${isToday ? 'is-today' : ''}`}
      ref={laneRef}
      data-lane-date={dateKey}
      onPointerDown={onLanePointerDown}
      onPointerMove={onLaneMove}
      onPointerLeave={() => setHover(null)}
    >
      {hours.map((m) => <span key={m} className="tl__line" style={{ top: y(m) }} />)}
      {hours.slice(0, -1).map((m) => (
        <span key={`h${m}`} className="tl__line tl__line--half" style={{ top: y(m + 30) }} />
      ))}

      {showNow && <div className="tl__past" style={{ height: y(NOW_MINUTES) }} />}

      {compare && changed.filter((e) => e.delta).map((e) => (
        <div key={`ghost-${e.id}`} className="tl__ghost" style={{ top: y(e.origStart) + 2, height: y(e.origEnd) - y(e.origStart) - 4 }}>
          <span>Before · {range(e.origStart, e.origEnd)}</span>
        </div>
      ))}
      {/* Where the event in hand came from (same day, or this is its origin day) */}
      {day.originGhost && (
        <div
          className="tl__ghost tl__ghost--moved"
          style={{ top: y(day.originGhost.origStart) + 2, height: y(day.originGhost.origEnd) - y(day.originGhost.origStart) - 4 }}
        >
          <span>{clock(day.originGhost.origStart)}</span>
        </div>
      )}
      {compare && target && durationDelta !== 0 && !moved && (
        <div className="tl__ghost tl__ghost--target" style={{ top: y(target.origEnd) - 1 }}>
          <span>Before · ended {clock(target.origEnd)}</span>
        </div>
      )}

      {events.filter((e) => e.shortened && !events.some((o) => o.id !== e.id && o.start < e.end + e.shortened && o.end > e.end)).map((e) => (
        <div key={`trim-${e.id}`} className="tl__trim" style={{ top: y(e.end) + 2, height: y(e.end + e.shortened) - y(e.end) - 4 }}>
          <span>−{duration(e.shortened)}</span>
        </div>
      ))}

      {!compact && events.length === 0 && !createPreview && !newEvent && (
        <div className="tl__empty">
          <span className="tl__empty-title">Nothing scheduled</span>
          <span className="tl__empty-sub">Drag on the timeline to add an event.</span>
        </div>
      )}

      {events.map((e) => (
        <EventCard
          key={e.id}
          event={e}
          selected={e.id === selectedId}
          stretching={e.id === draftId}
          dragging={dragging && e.id === draftId}
          dimmed={false}
          order={shiftOrder[e.id] ?? 0}
          lockable={committedIds.has(e.id)}
          conflict={conflictIds.has(e.id)}
          renaming={renamingId === e.id}
          moved={e.id === draftId ? moved : 0}
          onPointerDown={(part, pe) => onCardPointerDown(e.id, part, pe)}
          onMenu={(x, yy) => onCardMenu(e.id, x, yy)}
          onRename={() => onCardRename(e.id)}
          onRenameSave={(title) => onRenameSave(e.id, title)}
          onRenameCancel={onRenameCancel}
          onToggleLock={() => onToggleLock(e.id)}
        />
      ))}

      {conflicts.map((c) => (
        <div key={`conflict-${c.kind}`} className="tl__conflict" style={{ top: y(c.start), height: Math.max(y(c.end) - y(c.start), 4) }}>
          {canOpenConflict && (
            <button
              type="button"
              className="tl__warn"
              onPointerDown={(pe) => pe.stopPropagation()}
              onClick={onOpenConflict}
              aria-label={`${c.blocker ? `${c.by.title} overlaps ${c.blocker.title}` : `${c.by.title} runs past 10 PM`}. Not saved. Show options`}
            >
              <AlertIcon />
              <span>{c.blocker ? `Overlaps ${c.blocker.title}` : 'Past 10 PM'}</span>
            </button>
          )}
        </div>
      ))}

      {createPreview && (
        <div className="tl__create" style={{ '--ev': DEFAULT_COLOR, top: y(createPreview.start) + 2, height: y(createPreview.end) - y(createPreview.start) - 4 }}>
          <span className="tl__create-time">{range(createPreview.start, createPreview.end)}</span>
          <span className="tl__create-dur">{duration(createPreview.end - createPreview.start)}</span>
        </div>
      )}

      {newEvent && (
        <div
          className="ev ev--flexible ev--provisional is-selected"
          data-ev-id={newEvent.id}
          tabIndex={-1}
          style={{ '--ev': newEvent.color, top: y(newEvent.start) + 2, height: y(newEvent.end) - y(newEvent.start) - 4 }}
        >
          <span className="ev__body">
            <span className="ev__titlerow"><span className={`ev__title ${newEvent.title ? '' : 'is-placeholder'}`}>{newEvent.title || 'New event'}</span></span>
            {y(newEvent.end) - y(newEvent.start) >= 50 && <span className="ev__time">{range(newEvent.start, newEvent.end)}</span>}
          </span>
          {!flexibleNew(newEvent) && <span className="ev__corner"><span className="ev__lockbtn is-locked" aria-hidden="true"><LockIcon size={12} /></span></span>}
        </div>
      )}

      {hover !== null && hoverEnabled && (
        <div className="tl__hover" style={{ top: y(hover) }}>
          <button
            type="button"
            className="tl__plus"
            onPointerDown={(pe) => pe.stopPropagation()}
            onClick={() => { onQuickCreate(hover, dateKey); setHover(null); }}
            aria-label={`New event at ${clock(hover)}`}
          >
            <PlusIcon /> {clock(hover)}
          </button>
        </div>
      )}

      {showNow && (
        <div className="tl__now" style={{ top: y(NOW_MINUTES) }}>
          <span />
        </div>
      )}
    </div>
  );
}

// Hour labels down the left edge (shared by Day and Week views).
export function HourGutter({ showNow }) {
  const hours = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) hours.push(m);
  return (
    <div className="tl__gutter" aria-hidden="true">
      {hours.map((m) => <span key={m} className="tl__hour" style={{ top: y(m) }}>{hourLabel(m)}</span>)}
      {showNow && <span className="tl__nowtag" style={{ top: y(NOW_MINUTES) }}>{clock(NOW_MINUTES, { suffix: false })}</span>}
    </div>
  );
}

// Day view: gutter + one lane.
export default function Timeline({ dateKey, isToday, day, stage, draftId, dragging, compare, gestureOn, ...lane }) {
  return (
    <div
      className={['tl', draftId ? 'is-previewing' : '', dragging ? 'is-dragging' : '', compare ? 'is-compare' : '', gestureOn ? 'is-gesture' : ''].join(' ')}
      data-mode={stage?.mode}
      style={{ '--hour': `${HOUR}px`, height: y(DAY_END) }}
    >
      <HourGutter showNow={isToday} />
      <div className="tl__spine" aria-hidden="true">
        {isToday && <span className="tl__spine-now" style={{ top: y(NOW_MINUTES) }} />}
      </div>
      <DayLane dateKey={dateKey} isToday={isToday} day={day} draftId={draftId} dragging={dragging} compare={compare} {...lane} />
    </div>
  );
}

export const laneHeight = () => y(DAY_END);

/* ---------- Inline editors ---------- */

const flexibleNew = (e) => e.type === 'flexible';

function RenameInput({ value, onSave, onCancel }) {
  const ref = useRef(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length); // just a caret, no highlight
    // If the editor disappears without blur (e.g. another card was clicked), keep the edit.
    return () => {
      if (!done.current && el.value !== value) onSave(el.value, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const finish = (save) => {
    if (done.current) return;
    done.current = true;
    if (save) onSave(ref.current.value); else onCancel();
  };
  return (
    <input
      ref={ref}
      className="ev__title ev__rename"
      defaultValue={value}
      spellCheck={false}
      autoComplete="off"
      aria-label="Event name"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      }}
      onBlur={() => finish(true)}
    />
  );
}

/* ---------- Event card ---------- */

// Soft constraint: a quiet mark when an event is pushed outside its preferred time.
function OffWindow({ e }) {
  const label = `Outside preferred time (${range(e.window.start, e.window.end)})`;
  return (
    <span className="ev__offwin" title={label}>
      <ClockIcon />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function EventCard({
  event: e, selected, stretching, dragging, dimmed, order, lockable, conflict, renaming, moved,
  onPointerDown, onMenu, onRename, onRenameSave, onRenameCancel, onToggleLock,
}) {
  const h = y(e.end) - y(e.start);
  const flexible = e.type === 'flexible';
  const size = h >= 100 ? 'lg' : h >= 50 ? 'md' : 'sm';
  const grew = e.end - e.start - (e.origEnd - e.origStart);

  return (
    <div
      role="button"
      tabIndex={0}
      data-ev-id={e.id}
      aria-haspopup="dialog"
      className={[
        'ev',
        `ev--${e.type}`,
        `ev--${size}`,
        selected ? 'is-selected' : '',
        stretching ? 'is-stretching' : '',
        dragging ? 'is-dragging' : '',
        e.delta ? 'is-shifted' : '',
        e.shortened ? 'is-shortened' : '',
        e.hit && !flexible ? 'is-reached' : '',
        e.part ? `is-part is-part-${e.part}` : '',
        dimmed ? 'is-dimmed' : '',
        conflict ? 'is-conflict' : '',
        renaming ? 'is-renaming' : '',
        lockable && flexible ? 'is-movable' : '',
      ].join(' ')}
      style={{ '--ev': e.color || DEFAULT_COLOR, top: y(e.start) + 2, height: h - 4, transitionDelay: e.delta ? `${order * 45}ms` : '0ms' }}
      onPointerDown={(pe) => onPointerDown('body', pe)}
      onContextMenu={(ev) => { if (!lockable) return; ev.preventDefault(); onMenu(ev.clientX, ev.clientY); }}
      onKeyDown={(ev) => {
        if (renaming) return;
        if (ev.key === 'Enter' && lockable) { ev.preventDefault(); ev.stopPropagation(); onRename(); }
      }}
      aria-label={`${e.title}, ${range(e.start, e.end)}${flexible ? '' : ', locked'}`}
    >

      <span className="ev__body">
        <span className="ev__titlerow">
          {renaming ? (
            <RenameInput value={e.title} onSave={onRenameSave} onCancel={onRenameCancel} />
          ) : (
            <span className="ev__title">{e.title}</span>
          )}
          {e.delta > 0 && <span className="ev__shift">{shiftLabel(e.delta)}</span>}
          {e.shortened > 0 && <span className="ev__cut">−{duration(e.shortened)}</span>}
          {e.part && <span className="ev__part"><SplitIcon /> {e.part}/{e.parts}</span>}
          {stretching && grew !== 0 && !e.shortened && !e.part && (
            <span className="ev__grow">{grew > 0 ? shiftLabel(grew) : `−${duration(-grew)}`}</span>
          )}
        </span>
        {size !== 'sm' && (
          <span className="ev__time">
            {range(e.start, e.end)}
            {e.offWindow && <OffWindow e={e} />}
          </span>
        )}
      </span>

      {size === 'sm' && (
        <span className="ev__time ev__time--inline">
          {range(e.start, e.end)}
          {e.offWindow && <OffWindow e={e} />}
        </span>
      )}

      {/* Top-right: lock state (always visible when locked; a hover/focus action when flexible) + ⋯ */}
      <span className="ev__corner">
        {lockable && !renaming && (
          <button
            type="button"
            className={`ev__lockbtn ${flexible ? '' : 'is-locked'}`}
            onPointerDown={(ev) => ev.stopPropagation()}
            onClick={(ev) => { ev.stopPropagation(); onToggleLock(); }}
            aria-label={flexible ? `Lock ${e.title}` : `Unlock ${e.title}`}
            aria-pressed={!flexible}
            title={flexible ? 'Lock' : 'Locked — click to unlock'}
          >
            <LockIcon size={12} />
          </button>
        )}
        {!lockable && !flexible && <span className="ev__lockbtn is-locked" aria-hidden="true"><LockIcon size={12} /></span>}
      {lockable && !renaming && (
        <button
          type="button"
          className="ev__more"
          onPointerDown={(ev) => ev.stopPropagation()}
          onClick={(ev) => { ev.stopPropagation(); const r = ev.currentTarget.getBoundingClientRect(); onMenu(r.left, r.bottom + 4); }}
          aria-label={`${e.title} actions`}
        >
          <MoreIcon />
        </button>
      )}
      </span>

      {flexible && lockable && !renaming && (
        <span
          className="ev__handle"
          title="Drag to change length"
          aria-hidden="true"
          onPointerDown={(ev) => { ev.stopPropagation(); onPointerDown('handle', ev); }}
        >
          <i />
        </span>
      )}

      {dragging && (
        <span className="ev__endtag" aria-hidden="true">
          {moved !== 0 ? range(e.start, e.end) : `Ends ${clock(e.end)}`} · {duration(e.end - e.start)}
        </span>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { range, duration, EVENT_COLORS, DEFAULT_COLOR, colorName } from './data.js';
import { Floating, useAnchoredPosition } from './Floating.jsx';
import { LockIcon, MoreIcon, ChevronRight, CheckIcon } from './icons.jsx';

/**
 * Apple-Calendar-style popover anchored to an event card.
 *
 * mode="edit"   — an existing event. Title saves on Enter / click-away; color and lock
 *                 apply instantly; Esc closes (reverting an unsaved title).
 * mode="create" — a provisional event from drag-to-create / "+". Enter or click-away saves
 *                 it if it has a name (otherwise it's discarded); Esc discards it.
 */
export default function EventPopover({
  mode = 'edit', event: e, focusTitle, layoutKey,
  onClose, onSave, onCancel, onRename, onSetTime, onSetType, onSetColor, onSetSplittable, onUpdateField, onMenu,
}) {
  const creating = mode === 'create';
  const ref = useRef(null);
  const titleRef = useRef(null);
  const anchor = `[data-ev-id="${CSS.escape(e.id)}"]`;
  const pos = useAnchoredPosition(anchor, ref, [layoutKey, e.start, e.end]);
  const [more, setMore] = useState(false);
  const [palette, setPalette] = useState(false);
  const flexible = e.type === 'flexible';
  const color = e.color || DEFAULT_COLOR;

  const finishCreate = () => {
    const name = titleRef.current?.value.trim();
    if (name) onSave(name); else onCancel();
  };

  const close = (refocus = true) => {
    if (creating) { finishCreate(); return; }
    onClose();
    if (refocus) document.querySelector(anchor)?.focus({ preventScroll: true });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (focusTitle || creating) {
        const el = titleRef.current;
        el?.focus({ preventScroll: true });
        el?.setSelectionRange(el.value.length, el.value.length);
      } else {
        ref.current?.focus({ preventScroll: true });
      }
    }, 0);
    return () => clearTimeout(t);
  }, [e.id, focusTitle, creating]);

  // Outside click saves (create) / closes (edit). Esc closes the color picker first,
  // then cancels creation or closes the popover.
  useEffect(() => {
    const down = (ev) => {
      if (ref.current?.contains(ev.target)) return;
      if (ev.target.closest?.(`${anchor}, .cmenu`)) return;
      close(false);
    };
    const key = (ev) => {
      if (ev.key !== 'Escape' || document.querySelector('.cmenu')) return;
      if (document.activeElement?.classList.contains('evpop__field')) return; // the field reverts itself
      ev.stopPropagation();
      if (palette) { setPalette(false); ref.current?.querySelector('.evpop__colorbtn')?.focus(); return; }
      if (creating) onCancel();
      else close();
    };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('keydown', key, true);
    };
  });

  const commitTitle = () => {
    if (creating) return;
    const v = titleRef.current?.value.trim();
    if (v && v !== e.title) onRename(e.id, v);
    else if (titleRef.current) titleRef.current.value = e.title;
  };

  const pick = (hex) => {
    onSetColor(e.id, hex);
    setPalette(false);
    requestAnimationFrame(() => ref.current?.querySelector('.evpop__colorbtn')?.focus());
  };

  return (
    <Floating ref={ref} pos={pos} label={creating ? 'New event' : `${e.title} details`} tabIndex={-1} className="evpop">
      <div className="evpop__head">
        <button
          type="button"
          className="evpop__colorbtn"
          style={{ '--sw': color }}
          aria-label={`Color: ${colorName(color)}. Change color`}
          aria-haspopup="true"
          aria-expanded={palette}
          onClick={() => setPalette((p) => !p)}
        />
        <input
          ref={titleRef}
          key={creating ? 'new' : e.id + e.title}
          className="evpop__title"
          defaultValue={creating ? '' : e.title}
          placeholder="New event"
          aria-label="Event name"
          spellCheck={false}
          autoComplete="off"
          onBlur={commitTitle}
          onInput={creating ? (ev) => onUpdateField(e.id, 'title', ev.currentTarget.value) : undefined}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              if (creating) { finishCreate(); return; }
              commitTitle();
              ev.currentTarget.blur();
              ref.current?.focus();
            }
            if (ev.key === 'Escape' && !creating) ev.currentTarget.value = e.title; // revert, then close
          }}
        />
        {!creating && (
          <button
            type="button"
            className="evpop__more"
            aria-label="More actions"
            aria-haspopup="menu"
            onClick={(ev) => { const r = ev.currentTarget.getBoundingClientRect(); onMenu(e.id, r.right - 168, r.bottom + 4); }}
          >
            <MoreIcon />
          </button>
        )}

        {palette && (
          <div className="evpop__palette" role="radiogroup" aria-label="Event color">
            {EVENT_COLORS.map((c, i) => {
              const on = color.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={c.name}
                  title={c.name}
                  autoFocus={on}
                  className={`swatch-dot ${on ? 'is-on' : ''}`}
                  style={{ '--sw': c.hex }}
                  onClick={() => pick(c.hex)}
                  onKeyDown={(ev) => {
                    const dir = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
                    if (!dir) return;
                    ev.preventDefault();
                    ev.currentTarget.parentElement.children[(i + dir + EVENT_COLORS.length) % EVENT_COLORS.length].focus();
                  }}
                >
                  {on && <CheckIcon />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {onSetTime ? (
        <TimeRange key={`${e.id}-${e.start}-${e.end}`} start={e.start} end={e.end} onCommit={(st, en) => onSetTime(e.id, st, en)} />
      ) : (
        <div className="evpop__time">
          {range(e.start, e.end)}
          <span>{duration(e.end - e.start)}</span>
        </div>
      )}

      <div className="evpop__lockrow">
        <span className="evpop__locklabel" id={`lock-${e.id}`}><LockIcon /> Lock time</span>
        <button
          type="button"
          role="switch"
          aria-checked={!flexible}
          aria-labelledby={`lock-${e.id}`}
          className={`switch ${!flexible ? 'is-on' : ''}`}
          onClick={() => onSetType(e.id, flexible ? 'fixed' : 'flexible')}
        >
          <span className="switch__track"><span className="switch__thumb" /></span>
        </button>
      </div>

      <button
        type="button"
        className={`evpop__disclosure ${more ? 'is-open' : ''}`}
        aria-expanded={more}
        onClick={() => setMore((m) => !m)}
      >
        <ChevronRight /> More details
      </button>

      {more && (
        <div className="evpop__details">
          <Field label="Location" value={e.location} placeholder="Add location" live={creating} onSave={(v) => onUpdateField(e.id, 'location', v)} />
          <Field label="Notes" value={e.notes} placeholder="Add notes" multiline live={creating} onSave={(v) => onUpdateField(e.id, 'notes', v)} />
          {e.window && (
            <div className="evpop__row">
              <span>Preferred</span>
              <span className="evpop__val">{range(e.window.start, e.window.end)}</span>
            </div>
          )}
          <div className="evpop__row">
            <span id={`split-${e.id}`}>Can split</span>
            <button
              type="button"
              role="switch"
              aria-labelledby={`split-${e.id}`}
              aria-checked={Boolean(e.splittable)}
              className={`switch ${e.splittable ? 'is-on' : ''}`}
              onClick={() => onSetSplittable(e.id, !e.splittable)}
            >
              <span className="switch__track"><span className="switch__thumb" /></span>
            </button>
          </div>
        </div>
      )}
    </Floating>
  );
}

// Text detail. Existing events save on blur (one undo step); a new event's draft updates live.
// Esc reverts what you typed without closing the popover.
function Field({ label, value, placeholder, multiline, live, onSave }) {
  const Tag = multiline ? 'textarea' : 'input';
  const save = (ev) => {
    const v = ev.currentTarget.value.trim();
    if (v !== (value || '')) onSave(v);
  };
  return (
    <label className="evpop__row evpop__row--field">
      <span>{label}</span>
      <Tag
        className="evpop__field"
        defaultValue={value || ''}
        placeholder={placeholder}
        rows={multiline ? 2 : undefined}
        onInput={live ? save : undefined}
        onBlur={live ? undefined : save}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' && !multiline) ev.currentTarget.blur();
          if (ev.key === 'Escape') {
            ev.stopPropagation();
            ev.nativeEvent.stopImmediatePropagation();
            ev.currentTarget.value = value || '';
            if (live) onSave(value || '');
            ev.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

// Start / end as compact time fields (15-minute steps). Changing the start keeps the length
// (a move); changing the end changes the length (a stretch). Applied on Enter or leaving the field,
// through the same Ripple engine as dragging.
const toHM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const fromHM = (v) => { const [h, mm] = String(v).split(':').map(Number); return Number.isFinite(h) ? Math.round((h * 60 + (mm || 0)) / 15) * 15 : null; };

function TimeRange({ start, end, onCommit }) {
  const [s, setS] = useState(toHM(start));
  const [en, setEn] = useState(toHM(end));
  const commit = () => {
    const ns = fromHM(s);
    const ne = fromHM(en);
    if (ns == null || ne == null) return;
    const len = end - start;
    const startChanged = ns !== start;
    const finalStart = Math.max(8 * 60, Math.min(ns, 22 * 60 - 15));
    const finalEnd = startChanged && ne === end ? finalStart + len : Math.min(22 * 60, ne);
    if (finalEnd <= finalStart || (finalStart === start && finalEnd === end)) { setS(toHM(start)); setEn(toHM(end)); return; }
    onCommit(finalStart, finalEnd);
  };
  const keys = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); commit(); } };
  return (
    <div className="evpop__time evpop__time--edit" role="group" aria-label="Time">
      <input type="time" step="900" min="08:00" max="22:00" value={s} onChange={(ev) => setS(ev.target.value)} onBlur={commit} onKeyDown={keys} aria-label="Start time" className="evpop__timein" />
      <span aria-hidden="true">–</span>
      <input type="time" step="900" min="08:00" max="22:00" value={en} onChange={(ev) => setEn(ev.target.value)} onBlur={commit} onKeyDown={keys} aria-label="End time" className="evpop__timein" />
      <span className="evpop__dur">{duration(end - start)}</span>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { duration, clock, range } from './data.js';
import { Floating, useAnchoredPosition } from './Floating.jsx';
import { CloseIcon, UndoIcon, AlertIcon, ClockIcon } from './icons.jsx';

/**
 * Ripple Suggestions — a small popover beside the event you're adjusting that lists
 * what the ripple moved and by how much.
 *  • live:  follows the drag (read-only, never steals the pointer)
 *  • done:  after a conflict-free release — already saved; offers Undo and closes freely
 */
export default function RippleSuggest({ mode, targetId, title, items, conflict, layoutKey, onUndo, onClose }) {
  const ref = useRef(null);
  const pos = useAnchoredPosition(`[data-ev-id="${CSS.escape(targetId)}"]`, ref, [layoutKey, items.length]);

  useEffect(() => {
    if (mode !== 'done') return undefined;
    const down = (ev) => { if (!ref.current?.contains(ev.target)) onClose(); };
    const key = (ev) => { if (ev.key === 'Escape') onClose(); };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('keydown', key);
    };
  }, [mode, onClose]);

  return (
    <Floating
      ref={ref}
      pos={pos}
      label="Ripple"
      className={`ripplepop ripplepop--${mode}`}
      aria-live="polite"
    >
      {items.length > 0 && (
      <div className="ripplepop__head">
        <span className="ripplepop__title">
          {mode === 'live' ? 'Ripple' : 'Rippled'} · {items.length} {items.length === 1 ? 'event' : 'events'}
        </span>
        {mode === 'done' && (
          <button type="button" className="ripplepop__close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        )}
      </div>
      )}

      {items.length > 0 && (
      <ul className="ripplepop__list">
        {items.map((e) => (
          <li key={e.id} style={{ '--ev': e.color }}>
            <span className="ripplepop__dot" aria-hidden="true" />
            <span className="ripplepop__name">{e.title}</span>
            <span className="ripplepop__to">{clock(e.start)}</span>
            <span className="ripplepop__delta">+{duration(e.delta)}</span>
            {e.offWindow && (
              <span className="ripplepop__soft" title={`Outside preferred ${range(e.window.start, e.window.end)}`}>
                <ClockIcon /><span className="sr-only">Outside preferred time</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      )}

      {conflict && (
        <p className="ripplepop__warn"><AlertIcon /> {conflict.blocker ? `${title} overlaps ${conflict.blocker.title}` : 'Runs past 10 PM'}</p>
      )}

      {mode === 'done' && (
        <div className="ripplepop__foot">
          <span>Saved</span>
          <button type="button" className="linkbtn" onClick={onUndo}><UndoIcon /> Undo</button>
        </div>
      )}
    </Floating>
  );
}

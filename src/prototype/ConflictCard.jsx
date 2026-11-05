import { useEffect, useRef } from 'react';
import { duration } from './data.js';
import { Floating, useAnchoredPosition } from './Floating.jsx';
import { ScissorsIcon, SplitIcon, ArrowDownIcon, RulerIcon } from './icons.jsx';

// Opens from the small warning chip on the timeline. Names both events, offers only
// fixes that change the edited event, and lists exactly what each one changes.
// The preview is never saved until a fix is chosen.
export default function ConflictCard({ raw, fixes, resolution, layoutKey, onPreview, onApply, onCancel, onDismiss }) {
  const ref = useRef(null);
  const c = fixes.conflict || raw.conflicts[0];
  const pos = useAnchoredPosition('.tl__warn', ref, [layoutKey]);
  const icons = { move: <RulerIcon />, shorten: <ScissorsIcon />, split: <SplitIcon size={14} />, after: <ArrowDownIcon /> };

  useEffect(() => {
    const down = (ev) => {
      if (ref.current?.contains(ev.target) || ev.target.closest?.('.tl__warn')) return;
      onDismiss();
    };
    window.addEventListener('pointerdown', down, true);
    return () => window.removeEventListener('pointerdown', down, true);
  });

  const b = c.blocker;
  return (
    <Floating ref={ref} pos={pos} label="Conflict" className="conflictpop" aria-live="polite">
      <p className="conflictpop__head">
        {b ? (
          <><b>{c.by.title}</b> overlaps <b>{b.title}</b>{b.type === 'fixed' ? ' (locked)' : ''} · {duration(c.overlap)}</>
        ) : (
          <><b>{c.by.title}</b> runs {duration(c.overlap)} past 10 PM</>
        )}
      </p>

      {fixes.options.length > 0 ? (
        <div className="conflictpop__options" role="group" aria-label="Fixes">
          {fixes.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`option ${resolution === o.id ? 'is-on' : ''}`}
              onMouseEnter={() => onPreview(o.id)}
              onMouseLeave={() => onPreview(null)}
              onFocus={() => onPreview(o.id)}
              onBlur={() => onPreview(null)}
              onClick={() => onApply(o.id)}
            >
              <span className="option__icon">{icons[o.id]}</span>
              <span className="option__body">
                <span className="option__title">{o.title}</span>
                {o.changes.map((ch) => (
                  <span key={ch.id} className="option__change">
                    <span className="option__who">{ch.title}</span>
                    <span className="option__when">{ch.to}</span>
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="conflictpop__note">{fixes.notes[0]}</p>
      )}

      <div className="conflictpop__alts">
        <button type="button" className="linkbtn linkbtn--quiet" onClick={onDismiss}>Adjust manually</button>
        <button type="button" className="linkbtn linkbtn--quiet" onClick={onCancel}>Keep original</button>
      </div>
    </Floating>
  );
}

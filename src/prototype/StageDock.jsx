import { STAGES } from './data.js';
import { ChevronLeft, ChevronRight, UndoIcon } from './icons.jsx';

// Prototype navigator: a slim strip under the timeline (in the layout, never over events).
// Every stage reads from the same live schedule.
export default function StageDock({ index, onChange, onReset }) {
  const stage = STAGES[index];
  return (
    <nav className="dock" aria-label="Prototype stages">
      <span className="dock__label">Prototype</span>

      <div className="dock__nav">
        <button className="dock__arrow" type="button" onClick={() => onChange(index - 1)} disabled={index === 0} aria-label="Previous stage">
          <ChevronLeft />
        </button>
        <ol className="dock__steps">
          {STAGES.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={`dock__step ${i === index ? 'is-on' : ''}`}
                onClick={() => onChange(i)}
                aria-current={i === index ? 'step' : undefined}
                title={s.title}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
        <button className="dock__arrow" type="button" onClick={() => onChange(index + 1)} disabled={index === STAGES.length - 1} aria-label="Next stage">
          <ChevronRight />
        </button>
      </div>

      <div className="dock__text" aria-live="polite">
        <span className="dock__title">{stage.title}</span>
        <span className="dock__caption">{stage.caption}</span>
      </div>

      <button className="dock__reset" type="button" onClick={onReset} title="Restore the sample schedule">
        <UndoIcon /> Reset sample
      </button>
    </nav>
  );
}

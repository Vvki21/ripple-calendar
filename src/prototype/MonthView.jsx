import { addDays, dayKey, clock } from './data.js';
import { LockIcon } from './icons.jsx';

// Month overview: dates, compact event indicators, click an event for its popover,
// click a date to open that day. Reads the same events as Week and Day.
export default function MonthView({ monthDate, todayKey, selectedId, events, onOpenEvent, onOpenDay }) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const weeks = days[35].getMonth() === monthDate.getMonth() ? 6 : 5;
  const byDay = {};
  for (const e of events) (byDay[e.date] ||= []).push(e);

  return (
    <div className="mo" role="grid" aria-label={monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}>
      <div className="mo__head" role="row">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span key={d} role="columnheader">{d}</span>)}
      </div>
      <div className="mo__grid" style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>
        {days.slice(0, weeks * 7).map((d) => {
          const k = dayKey(d);
          const list = (byDay[k] || []).sort((a, b) => a.start - b.start);
          const out = d.getMonth() !== monthDate.getMonth();
          return (
            <div key={k} role="gridcell" className={`mo__cell ${out ? 'is-out' : ''} ${k === todayKey ? 'is-today' : ''}`}>
              <button type="button" className="mo__date" onClick={() => onOpenDay(k)} aria-label={`Open ${d.toDateString()}`}>
                {d.getDate()}
              </button>
              <div className="mo__events">
                {list.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    data-ev-id={e.id}
                    className={`mpill ${e.id === selectedId ? 'is-selected' : ''}`}
                    style={{ '--ev': e.color }}
                    onClick={() => onOpenEvent(e.id)}
                    aria-label={`${e.title}, ${clock(e.start)}${e.type === 'fixed' ? ', locked' : ''}`}
                  >
                    <span className="mpill__time">{clock(e.start, { suffix: false })}</span>
                    <span className="mpill__title">{e.title}</span>
                    {e.type === 'fixed' && <LockIcon size={10} />}
                  </button>
                ))}
                {list.length > 3 && (
                  <button type="button" className="mo__more" onClick={() => onOpenDay(k)}>+{list.length - 3} more</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

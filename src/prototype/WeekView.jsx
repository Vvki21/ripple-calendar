import { DAY_END, fromKey } from './data.js';
import { DayLane, HourGutter, HOUR, laneHeight } from './Timeline.jsx';

// Seven interactive day lanes — the same DayLane (and EventCard, engine, gestures) as Day view.
export default function WeekView({ weekKeys, todayKey, selectedKey, sliceDay, laneProps, draftId, dragging, compare, gestureOn, onPickDay }) {
  const todayInWeek = weekKeys.includes(todayKey);
  return (
    <div
      className={['wk', draftId ? 'is-previewing' : '', dragging ? 'is-dragging' : '', compare ? 'is-compare' : '', gestureOn ? 'is-gesture' : ''].join(' ')}
      style={{ '--hour': `${HOUR}px` }}
      data-end={DAY_END}
    >
      <div className="wk__head" role="row">
        <div className="wk__corner" aria-hidden="true" />
        {weekKeys.map((k) => {
          const d = fromKey(k);
          return (
            <button
              key={k}
              type="button"
              role="columnheader"
              className={`wk__day ${k === todayKey ? 'is-today' : ''} ${k === selectedKey ? 'is-selected' : ''}`}
              onClick={() => onPickDay(k)}
              aria-label={`Open ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} in Day view`}
            >
              <span className="wk__dow">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="wk__num">{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="wk__body" style={{ height: laneHeight() }}>
        <HourGutter showNow={todayInWeek} />
        <div className="wk__cols">
          {weekKeys.map((k) => (
            <DayLane
              key={k}
              dateKey={k}
              isToday={k === todayKey}
              day={sliceDay(k)}
              draftId={draftId}
              dragging={dragging}
              compare={compare}
              compact
              {...laneProps(k)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

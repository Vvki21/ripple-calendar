// Schedule data, time helpers and the six prototype stages.

export const DAY_START = 8 * 60; // 8:00 AM
export const DAY_END = 22 * 60; // 10:00 PM
export const NOW_MINUTES = 9 * 60 + 40; // frozen "now" so prototype screenshots stay consistent

// The prototype's "today". Fixed so every stage renders the same day.
export const TODAY = new Date(2026, 10, 4); // Wed, Nov 4 2026

export const t = (h, m = 0) => h * 60 + m;

// Events live on real dates, stored as local "YYYY-MM-DD" keys.
export const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const TODAY_KEY = dayKey(TODAY);
const dayOf = (offset) => dayKey(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offset));
export const shortDay = (k) => fromKey(k).toLocaleDateString('en-US', { weekday: 'short' });

// Event identity colors (independent of lock state).
export const EVENT_COLORS = [
  { id: 'lavender', name: 'Lavender', hex: '#8178DC' },
  { id: 'sky', name: 'Sky', hex: '#55B9DD' },
  { id: 'mint', name: 'Mint', hex: '#6CBCA1' },
  { id: 'peach', name: 'Peach', hex: '#EBA184' },
  { id: 'butter', name: 'Butter', hex: '#D8AD4F' },
  { id: 'rose', name: 'Rose', hex: '#D98BAE' },
];
export const DEFAULT_COLOR = EVENT_COLORS[0].hex;
export const colorName = (hex) => EVENT_COLORS.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase())?.name ?? 'Custom';

export const SAMPLE_EVENTS = [
  {
    id: 'class',
    date: TODAY_KEY,
    title: 'Class',
    color: '#8178DC',
    subtitle: 'HCI Design Studio',
    start: t(10),
    end: t(11),
    type: 'flexible',
    location: 'Room 302, Academic Hall',
    notes: 'Bring printed wireframes for critique.',
    minDuration: 45,
    splittable: false,
  },
  {
    id: 'lunch',
    date: TODAY_KEY,
    title: 'Lunch',
    color: '#EBA184',
    subtitle: 'With Sam',
    start: t(11, 30),
    end: t(12, 30),
    type: 'flexible',
    location: 'Corner café',
    notes: '',
    minDuration: 30,
    splittable: false,
    window: { start: t(11), end: t(14) }, // lunch belongs around midday
  },
  {
    id: 'work',
    date: TODAY_KEY,
    title: 'Work Session',
    color: '#55B9DD',
    subtitle: 'Prototype build',
    start: t(14),
    end: t(16),
    type: 'flexible',
    location: 'Library, 4th floor',
    notes: 'Elastic Timeline interactions.',
    minDuration: 60,
    splittable: true,
  },
  {
    id: 'climbing',
    date: TODAY_KEY,
    title: 'Climbing',
    color: '#6CBCA1',
    subtitle: 'Bouldering with the team',
    start: t(17),
    end: t(19),
    type: 'fixed',
    location: 'Climbing gym',
    notes: 'Booked slot — can’t move.',
    minDuration: 120,
    splittable: false,
  },
  ...[
    // Sun → Sat around "today" (Wed): a calm, balanced week.
    { id: 'brunch', date: dayOf(-3), title: 'Brunch', color: '#EBA184', start: t(11), end: t(12, 30), type: 'flexible' },
    { id: 'planning', date: dayOf(-2), title: 'Sprint Planning', color: '#55B9DD', start: t(9), end: t(10, 30), type: 'flexible' },
    { id: 'deepwork', date: dayOf(-2), title: 'Deep Work', color: '#6CBCA1', start: t(11), end: t(13), type: 'flexible', splittable: true },
    { id: 'research', date: dayOf(-2), title: 'Research Synthesis', color: '#8178DC', start: t(14), end: t(15, 30), type: 'flexible' },
    { id: 'crit', date: dayOf(-1), title: 'Studio Crit', color: '#8178DC', start: t(9, 30), end: t(10, 30), type: 'flexible' },
    { id: 'lunch-lee', date: dayOf(-1), title: 'Lunch with Lee', color: '#EBA184', start: t(12), end: t(13), type: 'flexible' },
    { id: 'usability', date: dayOf(-1), title: 'Usability Test', color: '#D98BAE', start: t(14), end: t(16), type: 'flexible' },
    { id: 'office', date: dayOf(1), title: 'Office Hours', color: '#D8AD4F', start: t(10), end: t(11), type: 'flexible' },
    { id: 'seminar', date: dayOf(1), title: 'HCI Seminar', color: '#8178DC', start: t(13), end: t(14, 30), type: 'fixed' },
    { id: 'writeup', date: dayOf(1), title: 'Write-up', color: '#55B9DD', start: t(15), end: t(16, 30), type: 'flexible' },
    { id: 'portfolio', date: dayOf(2), title: 'Portfolio Review', color: '#D98BAE', start: t(9, 30), end: t(11), type: 'fixed' },
    { id: 'retro', date: dayOf(2), title: 'Team Retro', color: '#55B9DD', start: t(14), end: t(15), type: 'flexible' },
    { id: 'market', date: dayOf(3), title: 'Farmers Market', color: '#6CBCA1', start: t(10), end: t(11, 30), type: 'flexible' },
  ].map((e) => ({ subtitle: '', location: '', notes: '', minDuration: 30, splittable: false, ...e })),
];

/**
 * The six prototype stages share one calendar layout. Each stage declares
 * what the UI should emphasise; interaction logic for stages 2–6 plugs in later
 * by switching on `mode`.
 */
export const STAGES = [
  {
    id: 'today',
    mode: 'view',
    title: 'Today’s Schedule',
    caption: 'Your day at a glance. Flexible events can bend; locked ones hold.',
    focus: 'work',
  },
  {
    id: 'stretch',
    mode: 'stretch',
    title: 'Stretch an Event',
    caption: 'Pull the bottom edge of any flexible event — the timeline follows as you drag.',
    focus: 'work',
  },
  {
    id: 'ripple',
    mode: 'preview',
    title: 'Ripple Effect Preview',
    caption: 'Later flexible events move out of the way live. Release to apply.',
    focus: 'work',
  },
  {
    id: 'lock',
    mode: 'lock',
    title: 'Lock & Adjust',
    caption: 'Hit a locked event and nothing is saved until you pick a fix — shorten or split.',
    focus: 'lunch',
  },
  {
    id: 'compare',
    mode: 'compare',
    title: 'Compare Changes',
    caption: 'Your original day and the new one, side by side.',
    focus: 'work',
  },
  {
    id: 'updated',
    mode: 'applied',
    title: 'Updated Schedule',
    caption: 'Applied on release. Undo is one keystroke away.',
    focus: 'work',
  },
];

/* ---------- Time formatting ---------- */

export function clock(min, { suffix = true } = {}) {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const h = ((h24 + 11) % 12) + 1;
  const mm = m ? `:${String(m).padStart(2, '0')}` : ':00';
  return suffix ? `${h}${mm} ${h24 < 12 ? 'AM' : 'PM'}` : `${h}${mm}`;
}

// "10:00 – 11:00 AM" or "11:30 AM – 12:30 PM"
export function range(start, end) {
  const samePeriod = start < 720 === end < 720;
  return samePeriod
    ? `${clock(start, { suffix: false })} – ${clock(end)}`
    : `${clock(start)} – ${clock(end)}`;
}

export function duration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function hourLabel(min) {
  const h24 = Math.floor(min / 60);
  const h = ((h24 + 11) % 12) + 1;
  return `${h} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/* ---------- Dates ---------- */

export const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function weekOf(d) {
  const start = addDays(d, -d.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/* ---------- Schedule analysis ---------- */

// Gaps of 30+ minutes between consecutive events — the slack a ripple can absorb.
export function freeGaps(events, min = 30) {
  const sorted = [...events].sort((a, b) => a.start - b.start);
  const gaps = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].start - sorted[i].end;
    if (gap >= min) gaps.push({ start: sorted[i].end, end: sorted[i + 1].start });
  }
  return gaps;
}

export function summarize(events) {
  const flexible = events.filter((e) => e.type === 'flexible').reduce((s, e) => s + e.end - e.start, 0);
  const fixed = events.filter((e) => e.type === 'fixed').reduce((s, e) => s + e.end - e.start, 0);
  const free = DAY_END - DAY_START - flexible - fixed;
  return { flexible, fixed, free, total: DAY_END - DAY_START };
}

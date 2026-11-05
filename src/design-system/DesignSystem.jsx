import { useEffect, useMemo, useRef, useState } from 'react';
import {
  normalizeHex, hexToRgb, rgbToHsv, rgbString, hsvString,
  contrast, wcagLabel, readableOn,
} from '../lib/color.js';
import { DEFAULT_PALETTE, PALETTE_STORAGE_KEY, paletteVars } from '../lib/palette.js';
import { EVENT_COLORS, SAMPLE_EVENTS, DAY_START, TODAY, weekOf, dayKey, t as at, range, duration, clock } from '../prototype/data.js';
import { computeRipple } from '../prototype/ripple.js';
import { EventCard, HOUR } from '../prototype/Timeline.jsx';
import WeekView from '../prototype/WeekView.jsx';
import { LockIcon, MoreIcon, ChevronRight, ChevronLeft, AlertIcon, PlusIcon, SearchIcon, CheckIcon as AppCheck, ClockIcon } from '../prototype/icons.jsx';
import '../prototype/prototype.css'; // the app's own component styles — one visual system
import './design-system.css';

/* ---------- Core brand palette (values come from the shared palette module) ---------- */

const DEFAULTS = [
  {
    key: 'primary', role: 'Primary', name: 'Iris', share: 10,
    usage: 'Primary brand color. Selected and active states, the event being dragged, the “now” line, toggles and focus.',
  },
  {
    key: 'secondary', role: 'Secondary', name: 'Seafoam', share: 3,
    usage: 'Soft secondary accent for calm, supporting moments — confirmations, success marks and quiet highlights.',
  },
  {
    key: 'accent', role: 'Accent', name: 'Apricot', share: 2,
    usage: 'The one warm voice. Marks meaningful change: “+30 min” ripple shifts and, deepened, conflict warnings.',
  },
  {
    key: 'background', role: 'Background', name: 'Mist', share: 70,
    usage: 'Main canvas and background. A cool, faintly violet white that keeps long days easy on the eye.',
  },
  {
    key: 'text', role: 'Text', name: 'Ink', share: 15,
    usage: 'Main typography and essential information. Also the solid fill for the “New” button and the undo toast.',
  },
].map((c) => ({ ...c, hex: DEFAULT_PALETTE[c.key] }));

function loadBrand() {
  try {
    const saved = JSON.parse(localStorage.getItem(PALETTE_STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      return DEFAULTS.map((c) => ({ ...c, hex: normalizeHex(saved[c.key]) || c.hex }));
    }
  } catch { /* storage unavailable */ }
  return DEFAULTS;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export default function DesignSystem() {
  const [palette, setPalette] = useState(loadBrand);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  const c = useMemo(() => Object.fromEntries(palette.map((p) => [p.key, p.hex])), [palette]);
  const appVars = paletteVars(c);

  useEffect(() => { document.title = 'Ripple — Design System'; }, []);
  useEffect(() => {
    try { localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
  }, [c]);

  const notify = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };
  const update = (key, hex) => setPalette((prev) => prev.map((p) => (p.key === key ? { ...p, hex } : p)));
  const reset = () => { setPalette(DEFAULTS); notify('Palette reset to Ripple defaults'); };
  const isDefault = palette.every((p, i) => p.hex === DEFAULTS[i].hex);
  const copy = async (text, label) => notify((await copyText(text)) ? `${label} copied` : 'Copy failed — select and copy manually');

  // Event-color demo state — local to this page; never touches the calendar's events.
  const [eventColor, setEventColor] = useState(EVENT_COLORS[1].hex);
  const [sampleLocked, setSampleLocked] = useState(false);

  const vars = {
    '--primary': c.primary, '--secondary': c.secondary, '--accent': c.accent, '--bg': c.background, '--text': c.text,
    '--on-primary': readableOn(c.primary, c.text),
  };

  return (
    <div className="page" style={vars}>
      <Nav onExport={() => copy(formatExport(palette, 'css'), 'CSS variables')} />

      <header className="hero hero--compact" id="top">
        <div className="hero__eyebrow">Ripple · Design System</div>
        <h1 className="hero__title">Keep the interface quiet.<br /><span>Let the interaction be expressive.</span></h1>
        <p className="hero__lede">
          The visual language behind Ripple’s elastic calendar — color, type, spacing and the components you touch.
          Everything below is rendered with the app’s own styles.
        </p>
        <div className="proportion" aria-label="Approximate share of screen area">
          {['background', 'text', 'primary', 'secondary', 'accent'].map((k) => palette.find((p) => p.key === k)).map((p) => (
            <div key={p.key} className={`proportion__seg proportion__seg--${p.key}`} style={{ flexGrow: p.share, background: p.hex }}>
              <span className="proportion__label" style={{ color: readableOn(p.hex, c.text) }}><b>{p.share}%</b> {p.name}</span>
            </div>
          ))}
        </div>
        <div className="proportion__caption">Approximate share of screen area in the calendar. Mist carries the day; color is reserved for meaning.</div>
      </header>

      <section className="section" id="palette">
        <SectionHead index="01" title="Core palette" lede="Five brand colors. Click a swatch or type a HEX value — RGB, HSV, contrast and every preview on this page update live.">
          <button className={`dsbtn dsbtn--quiet ${isDefault ? 'is-hidden' : ''}`} onClick={reset} type="button">Reset</button>
        </SectionHead>
        <div className="cards">
          {palette.map((p) => (
            <ColorCard
              key={p.key}
              color={p}
              ink={c.text}
              against={p.key === 'background' ? c.text : c.background}
              againstName={p.key === 'background' ? 'Ink' : 'Mist'}
              onChange={(hex) => update(p.key, hex)}
              onCopy={copy}
            />
          ))}
        </div>
      </section>

      <section className="section" id="harmony">
        <SectionHead index="02" title="Harmony" lede="A cool-toned palette with a warm accent." />
        <Harmony palette={palette} c={c} />
      </section>

      <section className="section" id="events">
        <SectionHead
          index="03"
          title="Event colors"
          lede="Six colors people choose for their own events. Color is identity; it never encodes scheduling behavior."
        />
        <EventColors
          appVars={appVars}
          color={eventColor}
          setColor={setEventColor}
          locked={sampleLocked}
          setLocked={setSampleLocked}
        />
      </section>

      <section className="section" id="type">
        <SectionHead index="04" title="Typography" lede="Geist throughout. Hierarchy comes from weight and size, not from more color. Times use tabular figures so they align." />
        <Typography c={c} />
      </section>

      <section className="section" id="spacing">
        <SectionHead index="05" title="Spacing & hierarchy" lede="An 8px rhythm with a 4px half-step, restrained radii, and almost no borders." />
        <Spacing appVars={appVars} />
      </section>

      <section className="section" id="components">
        <SectionHead index="06" title="Components" lede="The pieces of the calendar, shown in their real states." />
        <Components appVars={appVars} />
      </section>

      <section className="section" id="preview">
        <SectionHead
          index="07"
          title="Live preview"
          lede="The real Week view, painted with the palette above. Class has just been stretched — Lunch rippled forward; Climbing is locked. A sandbox: nothing here changes your calendar."
        />
        <LivePreview appVars={appVars} workColor={eventColor} />
      </section>

      <section className="section" id="export">
        <SectionHead index="08" title="Export" lede="Take the system with you — CSS custom properties, design tokens or a Tailwind theme." />
        <ExportPanel palette={palette} onCopy={copy} onToast={notify} />
      </section>

      <footer className="footer">
        <span className="brand brand--small"><Logo size={16} /> Ripple</span>
        <span>Design System · HCI Design · 2026</span>
      </footer>

      <div className={`dstoast ${toast ? 'is-on' : ''}`} role="status" aria-live="polite">
        <CheckIcon /> {toast}
      </div>
    </div>
  );
}

/* ---------- Layout pieces ---------- */

function Nav({ onExport }) {
  return (
    <nav className="nav">
      <a className="brand" href="#top"><Logo size={22} /> Ripple</a>
      <div className="nav__links">
        <a href="#palette">Palette</a>
        <a href="#events">Event colors</a>
        <a href="#type">Type</a>
        <a href="#spacing">Spacing</a>
        <a href="#components">Components</a>
        <a href="#preview">Preview</a>
        <a href={import.meta.env.BASE_URL} className="nav__app">Prototype →</a>
      </div>
      <button className="dsbtn dsbtn--dark dsbtn--sm" onClick={onExport} type="button">
        <CopyIcon /> Copy palette
      </button>
    </nav>
  );
}

function SectionHead({ index, title, lede, children }) {
  return (
    <div className="shead">
      <div className="shead__index">{index}</div>
      <div className="shead__main">
        <h2 className="shead__title">{title}</h2>
        {lede && <p className="shead__lede">{lede}</p>}
      </div>
      {children && <div className="shead__aside">{children}</div>}
    </div>
  );
}

// A small frame that gives demos the app's tokens (`.app` provides --surface, --line, --muted…).
function AppFrame({ appVars, className = '', children, ...rest }) {
  return (
    <div className={`app app--embed ${className}`} style={appVars} {...rest}>
      {children}
    </div>
  );
}

/* ---------- Color card ---------- */

function ColorCard({ color, ink: textInk, against, againstName, onChange, onCopy }) {
  const { hex, name, role, usage, key } = color;
  const rgb = hexToRgb(hex);
  const hsv = rgbToHsv(rgb);
  const ink = readableOn(hex, textInk);
  const ratio = contrast(hex, against);
  const grade = wcagLabel(ratio);
  const [draft, setDraft] = useState(hex.slice(1));
  const [focused, setFocused] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => { if (!focused) setDraft(hex.slice(1)); }, [hex, focused]);

  const onDraft = (v) => {
    const clean = v.replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase();
    setDraft(clean);
    const n = clean.length === 6 ? normalizeHex(clean) : null;
    if (n) onChange(n);
  };
  const valid = draft.length === 6 || (draft.length === 3 && normalizeHex(draft));

  return (
    <article className={`card card--${key}`}>
      <button className="swatch" style={{ background: hex, color: ink }} onClick={() => pickerRef.current?.click()} type="button" aria-label={`Edit ${role} color`}>
        <span className="swatch__role">{role}</span>
        <span className="swatch__name">{name}</span>
        <span className="swatch__edit">Pick</span>
        <input ref={pickerRef} className="swatch__picker" type="color" value={hex.toLowerCase()} onChange={(e) => onChange(normalizeHex(e.target.value))} tabIndex={-1} aria-hidden="true" />
      </button>
      <div className="card__body">
        <label className={`hexfield ${valid ? '' : 'is-invalid'}`}>
          <span className="hexfield__hash">#</span>
          <input
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); const n = normalizeHex(draft); if (n) onChange(n); setDraft((n || hex).slice(1)); }}
            spellCheck={false}
            aria-label={`${role} HEX value`}
            maxLength={7}
          />
          <span className="hexfield__chip" style={{ background: hex }} />
        </label>
        <dl className="values">
          <ValueRow label="HEX" value={hex} onCopy={onCopy} />
          <ValueRow label="RGB" value={rgbString(rgb)} display={`${rgb.r}, ${rgb.g}, ${rgb.b}`} onCopy={onCopy} />
          <ValueRow label="HSV" value={hsvString(hsv)} display={`${hsv.h}°, ${hsv.s}%, ${hsv.v}%`} onCopy={onCopy} />
        </dl>
        <p className="usage">{usage}</p>
        <div className="contrast">
          <span className="contrast__sample" style={{ background: against, color: hex }}>Aa</span>
          <span className="contrast__ratio">{ratio.toFixed(2)}:1 <small>on {againstName}</small></span>
          <span className={`contrast__grade grade--${grade.split(' ')[0].toLowerCase()}`}>{grade}</span>
        </div>
      </div>
    </article>
  );
}

function ValueRow({ label, value, display, onCopy }) {
  return (
    <button className="value" onClick={() => onCopy(value, value)} type="button" title={`Copy ${value}`}>
      <dt>{label}</dt>
      <dd>{display || value}</dd>
      <span className="value__copy"><CopyIcon /></span>
    </button>
  );
}

/* ---------- Harmony ---------- */

function Harmony({ palette, c }) {
  const chroma = palette.filter((p) => ['primary', 'secondary', 'accent'].includes(p.key)).map((p) => ({ ...p, hsv: rgbToHsv(hexToRgb(p.hex)) }));
  const R = 112;
  const cx = 140;
  const pos = (h, r = R) => {
    const a = (h * Math.PI) / 180;
    return [cx + r * Math.sin(a), cx - r * Math.cos(a)];
  };
  return (
    <div className="harmony">
      <div className="harmony__visual">
        <div className="wheel">
          <div className="wheel__ring" />
          <svg className="wheel__svg" viewBox="0 0 280 280" aria-hidden="true">
            {chroma.map((p) => {
              const [x, y] = pos(p.hsv.h);
              return (
                <g key={p.key}>
                  <circle cx={x} cy={y} r="15" fill="#fff" />
                  <circle cx={x} cy={y} r="11" fill={p.hex} />
                </g>
              );
            })}
          </svg>
          <div className="wheel__core">
            <span className="wheel__aa" style={{ color: c.text, background: c.background }}>Aa</span>
          </div>
          {chroma.map((p) => {
            const [x, y] = pos(p.hsv.h, R + 40);
            return <span key={p.key} className="wheel__tag" style={{ left: x, top: y }}>{p.name}<small>{p.hsv.h}°</small></span>;
          })}
        </div>
        <div className="harmony__badge">
          <span className="harmony__kicker">Palette character</span>
          <span className="harmony__name">Cool-toned, warm accent</span>
          <span className="harmony__note">Iris and Seafoam sit on the cool side of the wheel; Apricot is the single warm counterpoint. Mist and Ink are neutrals tinted toward Iris.</span>
        </div>
      </div>

      <div className="harmony__text">
        <Rationale n="01" title="Calm by default.">
          A calendar is something people look at all day. Cool, low-saturation hues keep a full schedule from feeling urgent,
          so the time grid reads as open and flexible rather than crowded.
        </Rationale>
        <Rationale n="02" title="Warmth means “something changed”.">
          Apricot is the only warm color, kept for the moment Ripple moves your day — the “+30 min” shift and, deepened, a conflict.
          Warm against cool stands out before you read a label, which keeps direct manipulation easy to follow.
        </Rationale>
        <Rationale n="03" title="Color never carries meaning alone.">
          Locking uses an icon, shifts use text, conflicts name both events. Event colors stay free for personal identity,
          and every text color clears accessible contrast on Mist (Ink on Mist is {contrast(c.text, c.background).toFixed(1)}:1).
        </Rationale>
      </div>
    </div>
  );
}

function Rationale({ n, title, children }) {
  return (
    <div className="rationale">
      <span className="rationale__n">{n}</span>
      <div>
        <h3 className="rationale__title">{title}</h3>
        <p className="rationale__body">{children}</p>
      </div>
    </div>
  );
}

/* ---------- Event colors ---------- */

// Render the real EventCard at its natural height, clipped to its own slot.
function CardDemo({ event, height, delta, ...props }) {
  const [e] = computeRipple([event], null).events;
  const shifted = delta ? { ...e, start: e.start + delta, end: e.end + delta, delta } : e;
  const top = ((shifted.start - DAY_START) / 60) * HOUR;
  const h = height ?? ((shifted.end - shifted.start) / 60) * HOUR;
  const noop = () => {};
  return (
    <div className="carddemo" style={{ height: h }}>
      <div className="carddemo__inner" style={{ transform: `translateY(${-top}px)` }}>
        <EventCard
          event={shifted}
          selected={false}
          stretching={false}
          dragging={false}
          dimmed={false}
          order={0}
          lockable
          conflict={false}
          renaming={false}
          moved={0}
          onPointerDown={noop}
          onMenu={noop}
          onRename={noop}
          onRenameSave={noop}
          onRenameCancel={noop}
          onToggleLock={noop}
          {...props}
        />
      </div>
    </div>
  );
}

const demoEvent = (over) => ({
  id: 'demo', title: 'Design review', subtitle: '', location: '', notes: '',
  start: at(14), end: at(15, 30), type: 'flexible', minDuration: 30, splittable: false, color: EVENT_COLORS[0].hex, ...over,
});

function EventColors({ appVars, color, setColor, locked, setLocked }) {
  const current = EVENT_COLORS.find((x) => x.hex === color);
  return (
    <div className="evcolors">
      <AppFrame appVars={appVars} className="evcolors__stage">
        <div className="evcolors__controls">
          <div className="evcolors__swatches" role="radiogroup" aria-label="Event color">
            {EVENT_COLORS.map((ec, i) => {
              const on = ec.hex === color;
              return (
                <button
                  key={ec.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={ec.name}
                  className={`swatch-dot ${on ? 'is-on' : ''}`}
                  style={{ '--sw': ec.hex }}
                  onClick={() => setColor(ec.hex)}
                  onKeyDown={(ev) => {
                    const dir = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
                    if (!dir) return;
                    ev.preventDefault();
                    const n = EVENT_COLORS[(i + dir + EVENT_COLORS.length) % EVENT_COLORS.length];
                    setColor(n.hex);
                    requestAnimationFrame(() => ev.currentTarget.parentElement?.querySelector('[aria-checked="true"]')?.focus());
                  }}
                />
              );
            })}
          </div>
          <label className="evcolors__lock">
            <LockIcon /> Locked
            <button type="button" role="switch" aria-checked={locked} aria-label="Locked" className={`switch ${locked ? 'is-on' : ''}`} onClick={() => setLocked((l) => !l)}>
              <span className="switch__track"><span className="switch__thumb" /></span>
            </button>
          </label>
        </div>

        <div className="evcolors__card">
          <CardDemo event={demoEvent({ color, type: locked ? 'fixed' : 'flexible' })} />
        </div>

        <div className="evcolors__meta">
          <span><b>{current?.name}</b> <code>{color}</code></span>
          <span>Tint: {color} at 10% on Mist · Accent line: 2.5px</span>
        </div>
      </AppFrame>

      <div className="evcolors__grid">
        {EVENT_COLORS.map((ec) => {
          const rgb = hexToRgb(ec.hex);
          const hsv = rgbToHsv(rgb);
          return (
            <div key={ec.id} className="evchip">
              <span className="evchip__dot" style={{ background: ec.hex }} />
              <span className="evchip__name">{ec.name}</span>
              <span className="evchip__val">{ec.hex}</span>
              <span className="evchip__val">{rgb.r}, {rgb.g}, {rgb.b}</span>
              <span className="evchip__val">{hsv.h}°, {hsv.s}%, {hsv.v}%</span>
            </div>
          );
        })}
      </div>

      <ul className="principles">
        <li><b>Color = identity.</b> What the event is, chosen by the person.</li>
        <li><b>Icon = lock state.</b> A locked event keeps its color and shows a small lock.</li>
        <li><b>Motion = Ripple.</b> Shifts animate and carry a “+30 min” label.</li>
      </ul>
    </div>
  );
}

/* ---------- Typography ---------- */

const TYPE = [
  { name: 'Page heading', sample: <span>Wednesday<span className="ts-mute">, November 4</span></span>, size: 17, weight: 600, lh: 22, track: '−0.03em', use: 'Date in the top bar · popover title' },
  { name: 'Section label', sample: 'Ripple · 2 events', size: 11.5, weight: 500, lh: 16, track: '+0.02em', use: 'Group labels in cards and popovers', muted: true },
  { name: 'Event title', sample: 'Work Session', size: 13.5, weight: 600, lh: 18, track: '−0.015em', use: 'Event cards' },
  { name: 'Body', sample: 'Work Session overlaps Climbing (locked) · 30m', size: 13, weight: 400, lh: 19, track: '−0.006em', use: 'Popover rows, conflict text' },
  { name: 'Secondary', sample: 'Keep original · More details', size: 12.5, weight: 500, lh: 18, track: '0', use: 'Links, muted metadata', muted: true },
  { name: 'Time label', sample: '2:00 – 4:00 PM', size: 12, weight: 400, lh: 16, track: '0 · tabular', use: 'Event times, hour gutter (11.5 / 500)', tabular: true },
  { name: 'Button', sample: 'New event', size: 12.5, weight: 500, lh: 30, track: '0', use: 'Buttons and segmented controls' },
];

function Typography({ c }) {
  return (
    <div className="typespec">
      <div className="typespec__face">
        <span className="typespec__aa">Aa</span>
        <div>
          <div className="typespec__family">Geist</div>
          <div className="typespec__weights"><span style={{ fontWeight: 400 }}>Regular 400</span><span style={{ fontWeight: 500 }}>Medium 500</span><span style={{ fontWeight: 600 }}>Semibold 600</span></div>
          <div className="typespec__mono">Geist Mono — HEX and code values only · Figures: <span style={{ fontVariantNumeric: 'tabular-nums' }}>10:00 11:30 12:45</span></div>
        </div>
      </div>

      <table className="typetable">
        <thead>
          <tr><th>Style</th><th>Sample</th><th>Size</th><th>Weight</th><th>Line</th><th>Tracking</th><th>Use</th></tr>
        </thead>
        <tbody>
          {TYPE.map((r) => (
            <tr key={r.name}>
              <td className="typetable__name">{r.name}</td>
              <td>
                <span
                  className="typetable__sample"
                  style={{
                    fontSize: r.size, fontWeight: r.weight, lineHeight: `${Math.min(r.lh, 22)}px`,
                    letterSpacing: r.track.startsWith('−') ? r.track.replace('−', '-') : r.track.startsWith('+') ? r.track.slice(1) : 0,
                    color: r.muted ? `color-mix(in srgb, ${c.text} 74%, ${c.background})` : c.text,
                    fontVariantNumeric: r.tabular ? 'tabular-nums' : undefined,
                  }}
                >
                  {r.sample}
                </span>
              </td>
              <td className="num">{r.size}px</td>
              <td className="num">{r.weight}</td>
              <td className="num">{r.lh}px</td>
              <td className="num">{r.track}</td>
              <td className="typetable__use">{r.use}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Spacing ---------- */

function Spacing({ appVars }) {
  const scale = [4, 8, 12, 16, 24, 32, 48];
  const radii = [
    { r: 6, label: 'Event cards' },
    { r: 8, label: 'Buttons, controls' },
    { r: 14, label: 'Popovers' },
    { r: 999, label: 'Chips, toggles' },
  ];
  return (
    <div className="spacing">
      <div className="spacing__block">
        <div className="spacing__label">Spacing scale · 8px base</div>
        <div className="spacing__scale">
          {scale.map((s) => (
            <div key={s} className="spacing__step">
              <span className="spacing__bar" style={{ width: s * 2, height: s * 2 }} />
              <span className="num">{s}</span>
            </div>
          ))}
        </div>
        <p className="spacing__note">4 for tight pairs (icon + label), 8 between related items, 12–16 inside cards and popovers, 24–48 between sections.</p>
      </div>

      <div className="spacing__block">
        <div className="spacing__label">Corner radius</div>
        <div className="spacing__radii">
          {radii.map(({ r, label }) => (
            <div key={r} className="spacing__radius">
              <span style={{ borderRadius: r === 999 ? 999 : r }} />
              <b className="num">{r === 999 ? 'Full' : `${r}px`}</b>
              <small>{label}</small>
            </div>
          ))}
        </div>
      </div>

      <AppFrame appVars={appVars} className="spacing__block spacing__anatomy">
        <div className="spacing__label">Event card anatomy</div>
        <div className="anatomy">
          <CardDemo event={demoEvent({ title: 'Work Session', color: EVENT_COLORS[1].hex, start: at(14), end: at(15, 30) })} />
          <ul className="anatomy__notes">
            <li><b>2.5px</b> accent line in the event color</li>
            <li><b>10%</b> tint on Mist — no border at rest</li>
            <li><b>6 / 13px</b> padding, title then time, top-left</li>
            <li><b>Height</b> = duration (56px per hour)</li>
          </ul>
        </div>
      </AppFrame>
    </div>
  );
}

/* ---------- Components ---------- */

function Components({ appVars }) {
  const base = { start: at(10), end: at(11), title: 'Class' };
  return (
    <AppFrame appVars={appVars} className="comps">
      <div className="comps__group">
        <div className="comps__label">Event card</div>
        <div className="comps__cards">
          <figure><CardDemo event={demoEvent({ ...base, color: EVENT_COLORS[0].hex })} /><figcaption>Default</figcaption></figure>
          <figure><CardDemo event={demoEvent({ ...base, color: EVENT_COLORS[0].hex })} selected /><figcaption>Selected</figcaption></figure>
          <figure><CardDemo event={demoEvent({ ...base, title: 'Climbing', type: 'fixed', color: EVENT_COLORS[2].hex })} /><figcaption>Locked</figcaption></figure>
          <figure><CardDemo event={demoEvent({ ...base, title: 'Lunch', color: EVENT_COLORS[3].hex })} delta={30} /><figcaption>Ripple-affected</figcaption></figure>
        </div>
      </div>

      <div className="comps__row">
        <div className="comps__group">
          <div className="comps__label">Event popover</div>
          <div className="pop pop--right is-static evpop" role="group" aria-label="Event popover example">
            <span className="pop__arrow" style={{ top: 22 }} aria-hidden="true" />
            <div className="evpop__head">
              <span className="evpop__colorbtn" style={{ '--sw': EVENT_COLORS[1].hex }} aria-hidden="true" />
              <input className="evpop__title" defaultValue="Work Session" aria-label="Event name (example)" />
              <span className="evpop__more" aria-hidden="true"><MoreIcon /></span>
            </div>
            <div className="evpop__time">2:00 – 4:00 PM <span>2h</span></div>
            <div className="evpop__lockrow">
              <span className="evpop__locklabel"><LockIcon /> Lock time</span>
              <span className="switch" aria-hidden="true"><span className="switch__track"><span className="switch__thumb" /></span></span>
            </div>
            <span className="evpop__disclosure"><ChevronRight /> More details</span>
          </div>
          <p className="comps__note">Title, time, color dot (collapsed picker), lock switch, More details. Saves on Enter or click-away.</p>
        </div>

        <div className="comps__group">
          <div className="comps__label">Buttons & controls</div>
          <div className="controls">
            <div className="controls__item"><button type="button" className="btn btn--primary controls__btn">Primary</button><small>Primary</small></div>
            <div className="controls__item"><button type="button" className="btn btn--ghost controls__btn">Secondary</button><small>Secondary</small></div>
            <div className="controls__item"><button type="button" className="newbtn"><PlusIcon /> New</button><small>Ink action</small></div>
            <div className="controls__item"><span className="controls__icons"><button type="button" className="iconbtn" aria-label="Previous"><ChevronLeft /></button><button type="button" className="iconbtn" aria-label="Search"><SearchIcon /></button></span><small>Icon buttons</small></div>
            <div className="controls__item">
              <div className="topnav__views" role="tablist" aria-label="View (example)"><span className="is-on">Day</span><span>Week</span><span>Month</span></div>
              <small>Segmented</small>
            </div>
            <div className="controls__item"><DemoSwitch /><small>Toggle</small></div>
            <div className="controls__item">
              <div className="evpop__palette is-static" aria-hidden="true">
                {EVENT_COLORS.map((ec, i) => (
                  <span key={ec.id} className={`swatch-dot ${i === 1 ? 'is-on' : ''}`} style={{ '--sw': ec.hex }}>{i === 1 && <AppCheck />}</span>
                ))}
              </div>
              <small>Color swatches</small>
            </div>
          </div>
        </div>
      </div>

      <div className="comps__group">
        <div className="comps__label">Ripple feedback</div>
        <div className="feedback">
          <figure>
            <div className="pop is-static ripplepop" aria-hidden="true">
              <div className="ripplepop__head"><span className="ripplepop__title">Ripple · 2 events</span></div>
              <ul className="ripplepop__list">
                <li style={{ '--ev': EVENT_COLORS[3].hex }}><span className="ripplepop__dot" /><span className="ripplepop__name">Lunch</span><span className="ripplepop__to">12:00 PM</span><span className="ripplepop__delta">+30m</span></li>
                <li style={{ '--ev': EVENT_COLORS[1].hex }}><span className="ripplepop__dot" /><span className="ripplepop__name">Work Session</span><span className="ripplepop__to">2:30 PM</span><span className="ripplepop__delta">+30m</span><span className="ripplepop__soft"><ClockIcon /></span></li>
              </ul>
            </div>
            <figcaption>Affected events — live while dragging</figcaption>
          </figure>
          <figure>
            <div className="feedback__shift"><span className="ev__title">Lunch</span><span className="ev__shift">+30 min</span></div>
            <figcaption>Time-shift label</figcaption>
          </figure>
          <figure>
            <div className="feedback__conflict">
              <span className="feedback__band" />
              <button type="button" className="tl__warn is-static"><AlertIcon /><span>Overlaps Climbing</span></button>
            </div>
            <figcaption>Conflict — overlap tint + chip</figcaption>
          </figure>
          <figure>
            <div className="toast is-on is-static" role="presentation">
              <span className="toast__check"><AppCheck /></span>
              <span className="toast__msg">Schedule updated</span>
              <span className="toast__undo">Undo <kbd>⌘Z</kbd></span>
            </div>
            <figcaption>Undo toast</figcaption>
          </figure>
        </div>
      </div>
    </AppFrame>
  );
}

function DemoSwitch() {
  const [on, setOn] = useState(true);
  return (
    <button type="button" role="switch" aria-checked={on} aria-label="Example toggle" className={`switch ${on ? 'is-on' : ''}`} onClick={() => setOn((v) => !v)}>
      <span className="switch__track"><span className="switch__thumb" /></span>
    </button>
  );
}

/* ---------- Live preview: the real Timeline, sandboxed ---------- */

function LivePreview({ appVars, workColor }) {
  const scrollRef = useRef(null);
  // A private copy of the sample week. The calendar's own (saved) events are never read or written here.
  const events = useMemo(
    () => SAMPLE_EVENTS.map((e) => (e.id === 'work' ? { ...e, color: workColor } : e)),
    [workColor],
  );
  const rippled = useMemo(() => computeRipple(events, { id: 'class', end: at(12) }), [events]);
  const committedIds = useMemo(() => new Set(events.map((e) => e.id)), [events]);
  const weekKeys = weekOf(TODAY).map(dayKey);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = ((9 * 60 - DAY_START) / 60) * HOUR;
  }, []);

  const noop = () => {};
  const sliceDay = (k) => ({
    events: rippled.events.filter((e) => e.date === k),
    changed: rippled.changed.filter((e) => e.date === k),
    conflicts: [],
    target: rippled.target?.date === k ? rippled.target : null,
    moved: 0,
    durationDelta: rippled.durationDelta,
    originGhost: null,
  });
  const laneProps = () => ({
    selectedId: 'work', committedIds, hoverEnabled: false, createPreview: null, newEvent: null, renamingId: null,
    canOpenConflict: false, onLanePointerDown: noop, onCardPointerDown: noop, onCardMenu: noop, onCardRename: noop,
    onQuickCreate: noop, onRenameSave: noop, onRenameCancel: noop, onToggleLock: noop, onOpenConflict: noop,
  });

  return (
    <AppFrame appVars={appVars} className="livepreview">
      <div className="livepreview__bar">
        <span className="livepreview__title">November <span>2026</span></span>
        <div className="topnav__views"><span>Day</span><span className="is-on">Week</span><span>Month</span></div>
      </div>
      <div className="livepreview__scroll livepreview__scroll--week" ref={scrollRef}>
        <WeekView
          weekKeys={weekKeys}
          todayKey={dayKey(TODAY)}
          selectedKey={dayKey(TODAY)}
          sliceDay={sliceDay}
          laneProps={laneProps}
          draftId="class"
          dragging={false}
          compare={false}
          gestureOn={false}
          onPickDay={noop}
        />
      </div>
      <ul className="legend">
        <li><b>Class</b> stretched — strong outline while in hand</li>
        <li><b>Lunch</b> rippled +30 min</li>
        <li><b>Work Session</b> selected · color from section 03</li>
        <li><b>Climbing</b> locked — lock icon, own color</li>
      </ul>
    </AppFrame>
  );
}

/* ---------- Export ---------- */

function formatExport(palette, format) {
  if (format === 'json') {
    const brand = Object.fromEntries(palette.map((p) => {
      const rgb = hexToRgb(p.hex);
      const hsv = rgbToHsv(rgb);
      return [p.key, { name: p.name, hex: p.hex, rgb: [rgb.r, rgb.g, rgb.b], hsv: [hsv.h, hsv.s, hsv.v], usage: p.usage }];
    }));
    const event = Object.fromEntries(EVENT_COLORS.map((e) => [e.id, e.hex]));
    return JSON.stringify({ ripple: { color: brand, event }, type: { family: 'Geist', scale: TYPE.map(({ name, size, weight, lh }) => ({ name, size, weight, lineHeight: lh })) }, space: [4, 8, 12, 16, 24, 32, 48], radius: { card: 6, control: 8, popover: 14 } }, null, 2);
  }
  if (format === 'tailwind') {
    const lines = [
      ...palette.map((p) => `        '${p.key}': '${p.hex}', // ${p.name}`),
      ...EVENT_COLORS.map((e) => `        'event-${e.id}': '${e.hex}',`),
    ];
    return `// tailwind.config.js\nexport default {\n  theme: {\n    extend: {\n      colors: {\n${lines.join('\n')}\n      },\n      fontFamily: { sans: ['Geist', 'system-ui', 'sans-serif'] },\n      borderRadius: { card: '6px', control: '8px', popover: '14px' },\n    },\n  },\n};`;
  }
  if (format === 'text') {
    return [
      ...palette.map((p) => {
        const rgb = hexToRgb(p.hex);
        return `${p.role} — ${p.name}\n  HEX ${p.hex}\n  RGB ${rgbString(rgb)}\n  HSV ${hsvString(rgbToHsv(rgb))}\n  Use: ${p.usage}`;
      }),
      `Event colors\n${EVENT_COLORS.map((e) => `  ${e.name} ${e.hex}`).join('\n')}`,
    ].join('\n\n');
  }
  const lines = palette.map((p) => {
    const { r, g, b } = hexToRgb(p.hex);
    return `  --ripple-${p.key}: ${p.hex};${' '.repeat(Math.max(1, 12 - p.key.length))}/* ${p.name} · ${r} ${g} ${b} */`;
  });
  const ev = EVENT_COLORS.map((e) => `  --ripple-event-${e.id}: ${e.hex};`);
  return `:root {\n${lines.join('\n')}\n\n${ev.join('\n')}\n}`;
}

const FORMATS = [
  { key: 'css', label: 'CSS', ext: 'css', mime: 'text/css' },
  { key: 'json', label: 'Tokens', ext: 'json', mime: 'application/json' },
  { key: 'tailwind', label: 'Tailwind', ext: 'js', mime: 'text/javascript' },
  { key: 'text', label: 'Plain text', ext: 'txt', mime: 'text/plain' },
];

function ExportPanel({ palette, onCopy, onToast }) {
  const [fmt, setFmt] = useState('css');
  const f = FORMATS.find((x) => x.key === fmt);
  const code = formatExport(palette, fmt);
  const download = () => {
    const blob = new Blob([code], { type: f.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ripple-design-system.${f.ext}`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Saved ripple-design-system.${f.ext}`);
  };
  return (
    <div className="export">
      <div className="export__bar">
        <div className="seg" role="tablist">
          {FORMATS.map((x) => (
            <button key={x.key} role="tab" aria-selected={fmt === x.key} className={fmt === x.key ? 'is-on' : ''} onClick={() => setFmt(x.key)} type="button">{x.label}</button>
          ))}
        </div>
        <div className="export__actions">
          <button className="dsbtn dsbtn--quiet" onClick={download} type="button"><DownloadIcon /> Download</button>
          <button className="dsbtn dsbtn--primary" onClick={() => onCopy(code, 'All values')} type="button"><CopyIcon /> Copy all</button>
        </div>
      </div>
      <pre className="export__code"><code>{code}</code></pre>
    </div>
  );
}

/* ---------- Icons ---------- */

function Logo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="logo">
      <circle cx="12" cy="12" r="3.2" fill="var(--primary)" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="var(--primary)" strokeOpacity="0.55" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="10.6" fill="none" stroke="var(--accent)" strokeOpacity="0.7" strokeWidth="1.3" />
    </svg>
  );
}
const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="5" y="5" width="9" height="9" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M11 3.2V3a1.8 1.8 0 0 0-1.8-1.8H3.8A1.8 1.8 0 0 0 2 3v5.4A1.8 1.8 0 0 0 3.8 10.2H4" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2v8M4.5 6.8L8 10.3l3.5-3.5M2.5 13.5h11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

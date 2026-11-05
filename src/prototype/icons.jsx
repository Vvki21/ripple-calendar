const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const Logo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3.2" fill="var(--primary)" />
    <circle cx="12" cy="12" r="7" fill="none" stroke="var(--primary)" strokeOpacity="0.55" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="10.6" fill="none" stroke="var(--accent)" strokeOpacity="0.75" strokeWidth="1.3" />
  </svg>
);

export const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5" {...S} /></svg>
);
export const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" {...S} /></svg>
);
export const LockIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <rect x="3" y="7" width="10" height="7" rx="2" {...S} />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" {...S} />
  </svg>
);
export const WaveIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <path d="M1.5 8c1.6-2.6 3.3-2.6 4.9 0s3.3 2.6 4.9 0 2.6-2.6 3.2-1" {...S} />
  </svg>
);
export const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 14.5s4.5-4.2 4.5-7.8A4.5 4.5 0 0 0 3.5 6.7c0 3.6 4.5 7.8 4.5 7.8z" {...S} />
    <circle cx="8" cy="6.7" r="1.6" {...S} />
  </svg>
);
export const NoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 3.5h10M3 7h10M3 10.5h6" {...S} />
  </svg>
);
export const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6" {...S} />
    <path d="M8 4.8V8l2.2 1.4" {...S} />
  </svg>
);
export const RulerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2v12M5.5 4.5L8 2l2.5 2.5M5.5 11.5L8 14l2.5-2.5" {...S} />
  </svg>
);
export const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="7" cy="7" r="4.5" {...S} />
    <path d="M10.5 10.5L14 14" {...S} />
  </svg>
);
export const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" {...S} /></svg>
);
export const MoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="3.5" cy="8" r="1.1" fill="currentColor" />
    <circle cx="8" cy="8" r="1.1" fill="currentColor" />
    <circle cx="12.5" cy="8" r="1.1" fill="currentColor" />
  </svg>
);
export const GripIcon = () => (
  <svg width="8" height="14" viewBox="0 0 8 14" aria-hidden="true">
    {[2, 7, 12].map((y) => (
      <g key={y}>
        <circle cx="2" cy={y} r="1.1" fill="currentColor" />
        <circle cx="6" cy={y} r="1.1" fill="currentColor" />
      </g>
    ))}
  </svg>
);
export const SwatchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="5.5" cy="6" r="3.3" {...S} />
    <circle cx="10.5" cy="6" r="3.3" {...S} />
    <circle cx="8" cy="10.3" r="3.3" {...S} />
  </svg>
);
export const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2.2L14.5 13.5h-13L8 2.2z" {...S} />
    <path d="M8 6.6v3.2" {...S} />
    <circle cx="8" cy="11.6" r=".8" fill="currentColor" />
  </svg>
);
export const UndoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M5.5 3.5L2.5 6.5l3 3" {...S} />
    <path d="M2.5 6.5h7a4 4 0 0 1 0 8H7" {...S} />
  </svg>
);
export const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" {...S} /></svg>
);
export const UnlockIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <rect x="3" y="7" width="10" height="7" rx="2" {...S} />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 4.9-.7" {...S} />
  </svg>
);
export const SplitIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2.5" y="2" width="11" height="4.5" rx="1.5" {...S} />
    <rect x="2.5" y="9.5" width="11" height="4.5" rx="1.5" {...S} strokeDasharray="2 1.6" />
  </svg>
);
export const ScissorsIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2.5 3.5h11M2.5 8h7M2.5 12.5h4" {...S} />
  </svg>
);
export const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M10.5 2.8l2.7 2.7L6 12.7l-3.3.6.6-3.3 7.2-7.2z" {...S} />
  </svg>
);
export const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="5" y="5" width="8.5" height="8.5" rx="2" {...S} />
    <path d="M11 3.2A1.7 1.7 0 0 0 9.3 2H4a2 2 0 0 0-2 2v5.3A1.7 1.7 0 0 0 3.2 11" {...S} />
  </svg>
);
export const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.3a1.3 1.3 0 0 0 1.3 1.2h3.2a1.3 1.3 0 0 0 1.3-1.2l.6-8.3" {...S} />
  </svg>
);
export const ArrowDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v11M4 9.5l4 4 4-4" {...S} /></svg>
);
export const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" {...S} /></svg>
);

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PencilIcon, CopyIcon, LockIcon, UnlockIcon, TrashIcon } from './icons.jsx';

// Small secondary-actions menu for an event (⋯ button or right-click).
export default function ContextMenu({ x, y, event, canDuplicate, compact, onClose, onRename, onDuplicate, onToggleLock, onDelete }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Keep the menu on screen.
  useLayoutEffect(() => {
    const r = ref.current.getBoundingClientRect();
    setPos({
      left: Math.min(x, window.innerWidth - r.width - 8),
      top: Math.min(y, window.innerHeight - r.height - 8),
    });
  }, [x, y]);

  useEffect(() => {
    ref.current.querySelector('button:not(:disabled)')?.focus();
    const outside = (e) => { if (!ref.current.contains(e.target)) onClose(); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('pointerdown', outside, true);
    window.addEventListener('keydown', key, true);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  const locked = event.type === 'fixed';
  return (
    <div ref={ref} className="cmenu" role="menu" style={pos} aria-label={`${event.title} actions`}>
      {!compact && <button type="button" role="menuitem" onClick={onRename}><PencilIcon /> Rename</button>}
      <button type="button" role="menuitem" onClick={onDuplicate} disabled={!canDuplicate} title={canDuplicate ? undefined : 'No free time later today'}>
        <CopyIcon /> Duplicate
      </button>
      {!compact && (
        <button type="button" role="menuitem" onClick={onToggleLock}>
          {locked ? <UnlockIcon /> : <LockIcon />} {locked ? 'Unlock' : 'Lock'}
        </button>
      )}
      <span className="cmenu__sep" />
      <button type="button" role="menuitem" className="cmenu__danger" onClick={onDelete}><TrashIcon /> Delete</button>
    </div>
  );
}

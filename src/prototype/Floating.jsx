import { forwardRef, useCallback, useEffect, useLayoutEffect, useState } from 'react';

const M = 12; // keep this far from the viewport edge
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Position a floating element next to an anchor (an event card), Apple-Calendar style:
 * beside the event if there's room (right, then left), otherwise below or above it.
 * Re-runs on scroll, resize, its own size changes and whenever `deps` change.
 */
export function useAnchoredPosition(anchorSelector, floatRef, deps = []) {
  const [pos, setPos] = useState(null);

  const update = useCallback(() => {
    const a = document.querySelector(anchorSelector);
    const f = floatRef.current;
    if (!a || !f) return;
    const r0 = a.getBoundingClientRect();
    // Full-width day cards: point at the text area, so the popover sits beside the title
    // (inside the card's empty right side) instead of dropping far below a tall event.
    const ar = r0.width > 560
      ? { left: r0.left, top: r0.top, bottom: r0.bottom, height: r0.height, right: r0.left + 360, width: 360 }
      : r0;
    const fw = f.offsetWidth;
    const fh = f.offsetHeight;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const gap = 10;
    const focusY = ar.top + Math.min(ar.height, 44) / 2; // the part of the card the arrow points at

    let side;
    let left;
    let top;
    if (ar.right + gap + fw <= W - M) {
      side = 'right';
      left = ar.right + gap;
    } else if (ar.left - gap - fw >= M) {
      side = 'left';
      left = ar.left - gap - fw;
    }
    if (side) {
      top = clamp(ar.top - 6, M, H - fh - M);
      setPos({ side, left, top, arrow: clamp(focusY - top, 18, fh - 18) });
      return;
    }
    side = ar.bottom + gap + fh <= H - M || ar.top - gap - fh < M ? 'bottom' : 'top';
    top = side === 'bottom' ? Math.min(ar.bottom + gap, H - fh - M) : ar.top - gap - fh;
    left = clamp(ar.left + 24, M, W - fw - M);
    setPos({ side, left, top, arrow: clamp(ar.left + 48 - left, 18, fw - 18) });
  }, [anchorSelector, floatRef]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(update, [update, ...deps]);

  useEffect(() => {
    const f = floatRef.current;
    const ro = f ? new ResizeObserver(update) : null;
    if (f) ro.observe(f);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [update, floatRef]);

  return pos;
}

export const Floating = forwardRef(function Floating({ pos, className = '', label, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className={`pop ${pos ? `pop--${pos.side} is-in` : ''} ${className}`}
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0, visibility: 'hidden' }}
      {...rest}
    >
      {pos && (
        <span
          className="pop__arrow"
          aria-hidden="true"
          style={pos.side === 'left' || pos.side === 'right' ? { top: pos.arrow } : { left: pos.arrow }}
        />
      )}
      {children}
    </div>
  );
});

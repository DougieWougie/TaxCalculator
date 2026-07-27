import { useEffect, useRef, useState } from 'react';

/**
 * Responsive controls container.
 *
 * Below the 900px breakpoint this behaves as a bottom sheet: tap the handle
 * to expand or collapse — that is the primary, always-available path.
 * Dragging is layered on top for pointer devices; if a pointer event never
 * arrives the sheet still works entirely by tap and keyboard.
 *
 * Above the breakpoint, CSS alone turns the same markup into a static rail
 * (see sheet.css) — the handle is hidden and the body is always visible,
 * regardless of `open`. There is a single instance of `children` in the DOM;
 * only its presentation changes.
 */
export function ControlSheet({
  children,
  peek,
}: {
  children: React.ReactNode;
  peek: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  // Every path that closes the sheet routes through here so focus always
  // lands back on the handle rather than on a now-hidden element.
  const close = () => {
    setOpen(false);
    handleRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = () => {
    if (open) {
      close();
    } else {
      setOpen(true);
    }
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    dragStartY.current = event.clientY;
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    const start = dragStartY.current;
    dragStartY.current = null;
    if (start === null) return;
    const travel = start - event.clientY;
    // Below the threshold this was a tap, not a drag — let onClick handle it.
    if (Math.abs(travel) < 24) return;
    if (travel > 0) {
      setOpen(true);
    } else {
      close();
    }
  };

  return (
    <div
      className="control-sheet"
      ref={panelRef}
      role="dialog"
      aria-label="Controls"
      aria-expanded={open}
    >
      <button
        type="button"
        ref={handleRef}
        className="control-sheet-handle"
        onClick={toggle}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        aria-expanded={open}
      >
        <span className="control-sheet-grab" aria-hidden="true" />
        <span className="control-sheet-peek">{open ? 'Close controls' : peek}</span>
      </button>

      <div className={`control-sheet-body${open ? ' open' : ''}`}>
        {children}
      </div>
    </div>
  );
}

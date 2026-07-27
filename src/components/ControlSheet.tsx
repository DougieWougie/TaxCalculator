import { useEffect, useRef, useState } from 'react';

/**
 * Bottom sheet for narrow screens.
 *
 * Tap the handle to expand or collapse — that is the primary, always-available
 * path. Dragging is layered on top for pointer devices; if a pointer event
 * never arrives the sheet still works entirely by tap and keyboard.
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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

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
    setOpen(travel > 0);
  };

  return (
    <div
      className={`control-sheet ${open ? 'open' : ''}`}
      ref={panelRef}
      role="dialog"
      aria-label="Controls"
      aria-expanded={open}
    >
      <button
        type="button"
        className="control-sheet-handle"
        onClick={() => setOpen((value) => !value)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        aria-expanded={open}
      >
        <span className="control-sheet-grab" aria-hidden="true" />
        <span className="control-sheet-peek">{open ? 'Close controls' : peek}</span>
      </button>

      <div className="control-sheet-body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}

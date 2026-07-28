import { useEffect, useRef, useState } from 'react';
import { nudge, snapValue, type SnapOptions } from '../snapping';

/** Matches sanitizeNumber's ceiling in src/sanitize.ts. */
const DEFAULT_ENTRY_MAX = 10_000_000;

export function ValueControl({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  snapPoints,
  tolerance,
  entryMax,
  prefix,
  suffix,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  snapPoints?: number[];
  tolerance?: number;
  /** Ceiling for TYPED entry, independent of the slider's max. Defaults to sanitizeNumber's ceiling. */
  entryMax?: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  const options: SnapOptions = { min, max, step, snapPoints, tolerance };
  // Commit path: clamp to [min, entryMax] and round to the step grid, but
  // never apply snap attractors — snapping is a drag affordance only.
  const commitOptions: SnapOptions = { min, max: entryMax ?? DEFAULT_ENTRY_MAX, step };

  // Local draft so the field does not fight the user mid-type (leading zeros,
  // a lone minus sign, an empty field). Committed on blur or Enter.
  const [draft, setDraft] = useState(String(value));
  const dirtyRef = useRef(false);

  // Sync draft from value whenever value changes, unless the user is actively typing.
  useEffect(() => {
    if (!dirtyRef.current) {
      setDraft(String(value));
    }
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      // Empty or whitespace-only field: revert without calling onChange
      setDraft(String(value));
      dirtyRef.current = false;
      return;
    }
    const parsed = Number(trimmed.replace(/,/g, ''));
    if (Number.isFinite(parsed)) {
      const next = snapValue(parsed, commitOptions);
      onChange(next);
      setDraft(String(next));
      dirtyRef.current = false;
    } else {
      // Non-numeric input: revert without calling onChange
      setDraft(String(value));
      dirtyRef.current = false;
    }
  };

  // Shared nudge helper. nudge() deliberately ignores snapPoints so keyboard
  // stepping stays predictable — that is not touched here. Shift gives the
  // coarse (10x) step.
  const applyNudge = (direction: -1 | 1, coarse: boolean) => {
    const next = nudge(value, direction, options, coarse);
    onChange(next);
    setDraft(String(next));
    dirtyRef.current = false;
  };

  // Text input: ArrowUp/ArrowDown nudge only. ArrowLeft/ArrowRight and
  // Shift+ArrowLeft/Right are left entirely to the browser for caret
  // movement and text selection.
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      commit();
      return;
    }
    if (event.key === 'ArrowUp') {
      applyNudge(1, event.shiftKey);
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      applyNudge(-1, event.shiftKey);
      event.preventDefault();
    }
  };

  // Range input: all four arrow keys nudge (Up/Right = up, Down/Left = down).
  const handleSliderKeyDown = (event: React.KeyboardEvent) => {
    const direction =
      event.key === 'ArrowUp' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowDown' || event.key === 'ArrowLeft'
          ? -1
          : 0;
    if (direction === 0) return;
    applyNudge(direction, event.shiftKey);
    event.preventDefault();
  };

  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="value-control">
      <div className="value-control-head">
        <label className="label" htmlFor={id}>{label}</label>
        <div className="value-control-entry">
          {prefix && <span className="value-control-affix">{prefix}</span>}
          <input
            id={id}
            className="value-control-input figure"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={draft}
            onFocus={() => {
              dirtyRef.current = false;
            }}
            onChange={(e) => {
              setDraft(e.target.value);
              dirtyRef.current = true;
            }}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
          {suffix && <span className="value-control-affix">{suffix}</span>}
        </div>
      </div>

      <input
        className="value-control-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        style={{ ['--fill' as string]: `${percent}%` }}
        onChange={(e) => onChange(snapValue(Number(e.target.value), options))}
        onKeyDown={handleSliderKeyDown}
      />

      {hint && <p className="value-control-hint">{hint}</p>}
    </div>
  );
}

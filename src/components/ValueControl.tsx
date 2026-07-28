import { useEffect, useRef, useState } from 'react';
import { nudge, snapValue, type SnapOptions } from '../snapping';

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
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  const options: SnapOptions = { min, max, step, snapPoints, tolerance };

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
      onChange(snapValue(parsed, options));
      dirtyRef.current = false;
    } else {
      // Non-numeric input: revert without calling onChange
      setDraft(String(value));
      dirtyRef.current = false;
    }
  };

  // Shared by both inputs: ArrowUp/ArrowRight nudge up, ArrowDown/ArrowLeft
  // nudge down, Shift gives the coarse (10x) step. nudge() deliberately
  // ignores snapPoints so keyboard stepping stays predictable — that is not
  // touched here. Returns true if the key was handled (caller must then
  // preventDefault so the browser's native range stepping doesn't also fire).
  const handleArrowKey = (event: React.KeyboardEvent): boolean => {
    const direction =
      event.key === 'ArrowUp' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowDown' || event.key === 'ArrowLeft'
          ? -1
          : 0;
    if (direction === 0) return false;
    const next = nudge(value, direction, options, event.shiftKey);
    onChange(next);
    setDraft(String(next));
    dirtyRef.current = false;
    return true;
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      commit();
      return;
    }
    if (handleArrowKey(event)) {
      event.preventDefault();
    }
  };

  const handleSliderKeyDown = (event: React.KeyboardEvent) => {
    if (handleArrowKey(event)) {
      event.preventDefault();
    }
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

import { useEffect, useState } from 'react';
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
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const parsed = Number(draft.replace(/,/g, ''));
    if (Number.isFinite(parsed)) {
      onChange(snapValue(parsed, options));
    } else {
      setDraft(String(value));
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      commit();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const direction = event.key === 'ArrowUp' ? 1 : -1;
      onChange(nudge(value, direction, options, event.shiftKey));
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
            onFocus={() => setEditing(true)}
            onChange={(e) => setDraft(e.target.value)}
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
      />

      {hint && <p className="value-control-hint">{hint}</p>}
    </div>
  );
}

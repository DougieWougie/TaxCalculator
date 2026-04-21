export function SliderSpinner({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const decrement = () => onChange(Math.max(min, Math.round((value - step) * 10) / 10));
  const increment = () => onChange(Math.min(max, Math.round((value + step) * 10) / 10));

  return (
    <div className="spinner-row">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={ariaLabel}
      />
      <div className="spinner-compound">
        <button
          type="button"
          className="spinner-btn"
          onClick={decrement}
          disabled={value <= min}
          aria-label="Decrease"
        >
          −
        </button>
        <input
          type="number"
          className="spinner-input"
          min={min}
          max={max}
          step={step}
          value={value.toFixed(1)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
          }}
          onBlur={(e) => {
            if (e.target.value === '' || isNaN(parseFloat(e.target.value))) {
              onChange(min);
            }
          }}
          aria-label={`${ariaLabel} value`}
        />
        <button
          type="button"
          className="spinner-btn"
          onClick={increment}
          disabled={value >= max}
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  );
}

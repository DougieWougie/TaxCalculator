export function BarRow({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: number;
  total: number;
  className: string;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div
          className={`bar-fill ${className}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="bar-percent">{pct.toFixed(1)}%</span>
    </div>
  );
}

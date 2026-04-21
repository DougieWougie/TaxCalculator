export function BaselineActions({
  hasBaseline,
  onSave,
  onClear,
}: {
  hasBaseline: boolean;
  onSave: () => void;
  onClear: () => void;
}) {
  return (
    <div className="baseline-actions">
      <button className="baseline-btn" onClick={onSave}>
        {hasBaseline ? 'Update Baseline' : 'Save as Baseline'}
      </button>
      {hasBaseline && (
        <button className="baseline-clear" onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  );
}

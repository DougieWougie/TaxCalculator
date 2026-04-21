import type { TaxCodeInfo } from '../taxEngine';
import { TaxCodeInput } from './TaxCodeInput';

export function MilitaryPensionCard({
  hasMilitaryPension,
  onHasMilitaryPensionChange,
  militaryPension,
  onMilitaryPensionChange,
  militaryPensionTaxCode,
  onMilitaryPensionTaxCodeChange,
  milTaxCodeInfo,
}: {
  hasMilitaryPension: boolean;
  onHasMilitaryPensionChange: (value: boolean) => void;
  militaryPension: string;
  onMilitaryPensionChange: (value: string) => void;
  militaryPensionTaxCode: string;
  onMilitaryPensionTaxCodeChange: (value: string) => void;
  milTaxCodeInfo: TaxCodeInfo | null;
}) {
  return (
    <div className="card" style={{ animationDelay: '0.15s' }}>
      <div className="card-title">
        <span className="card-title-icon">&#127894;</span>
        Military Pension
      </div>

      <div
        className={`checkbox-group ${hasMilitaryPension ? 'checked' : ''}`}
        onClick={() => onHasMilitaryPensionChange(!hasMilitaryPension)}
        role="checkbox"
        aria-checked={hasMilitaryPension}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onHasMilitaryPensionChange(!hasMilitaryPension);
          }
        }}
      >
        <div className="custom-checkbox">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span className="checkbox-label">I receive a military pension</span>
      </div>

      {hasMilitaryPension && (
        <>
          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label className="input-label" htmlFor="military">
              Annual Military Pension
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">&pound;</span>
              <input
                id="military"
                className="input-field"
                type="text"
                inputMode="decimal"
                value={militaryPension}
                onChange={(e) => onMilitaryPensionChange(e.target.value)}
                placeholder="0"
                autoComplete="off"
              />
            </div>
            <p className="input-hint">
              Military pensions are subject to income tax but <strong>not</strong> National Insurance contributions
            </p>
          </div>

          <TaxCodeInput
            id="mil-tax-code"
            label="Military Pension Tax Code (optional)"
            value={militaryPensionTaxCode}
            onChange={onMilitaryPensionTaxCodeChange}
            info={milTaxCodeInfo}
            placeholder="e.g. BR"
            emptyHint="Leave blank to calculate tax at marginal rates"
            invalidExamples="1257L, BR, D0, NT"
          />
        </>
      )}
    </div>
  );
}

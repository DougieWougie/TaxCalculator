import type { TaxCodeInfo, TaxRegion } from '../taxEngine';
import type { NumericInput } from '../hooks/useNumericInput';
import type { DisplayPeriod } from '../display';
import { ValueControl } from './ValueControl';
import { PeriodSwitch } from './PeriodSwitch';
import { TaxCodeInput } from './TaxCodeInput';

export interface DeductionRow {
  id: number;
  name: string;
  amount: string;
}

export function ControlPanel({
  period,
  onPeriodChange,
  taxRegion,
  onTaxRegionChange,
  annualSalary,
  onAnnualSalaryChange,
  pensionContribution,
  pensionSnapPoints,
  employerPension,
  onEmployerPensionChange,
  salarySacrifice,
  employmentTaxCode,
  onEmploymentTaxCodeChange,
  empTaxCodeInfo,
  hasMilitaryPension,
  onHasMilitaryPensionChange,
  militaryPension,
  onMilitaryPensionChange,
  militaryPensionTaxCode,
  onMilitaryPensionTaxCodeChange,
  milTaxCodeInfo,
  postTaxDeductions,
  onDeductionNameChange,
  onDeductionAmountChange,
  onDeductionAdd,
  onDeductionRemove,
}: {
  period: DisplayPeriod;
  onPeriodChange: (period: DisplayPeriod) => void;
  taxRegion: TaxRegion;
  onTaxRegionChange: (region: TaxRegion) => void;
  annualSalary: number;
  onAnnualSalaryChange: (value: number) => void;
  pensionContribution: NumericInput;
  pensionSnapPoints: number[];
  employerPension: number;
  onEmployerPensionChange: (value: number) => void;
  salarySacrifice: NumericInput;
  employmentTaxCode: string;
  onEmploymentTaxCodeChange: (value: string) => void;
  empTaxCodeInfo: TaxCodeInfo | null;
  hasMilitaryPension: boolean;
  onHasMilitaryPensionChange: (value: boolean) => void;
  militaryPension: number;
  onMilitaryPensionChange: (value: number) => void;
  militaryPensionTaxCode: string;
  onMilitaryPensionTaxCodeChange: (value: string) => void;
  milTaxCodeInfo: TaxCodeInfo | null;
  postTaxDeductions: DeductionRow[];
  onDeductionNameChange: (id: number, name: string) => void;
  onDeductionAmountChange: (id: number, amount: string) => void;
  onDeductionAdd: () => void;
  onDeductionRemove: (id: number) => void;
}) {
  const salaryMax = Math.max(200000, Math.ceil(annualSalary / 10000) * 10000);
  const militaryPensionMax = Math.max(100000, Math.ceil(militaryPension / 10000) * 10000);

  return (
    <>
      <div className="control-group">
        <div className="control-group-head">
          <span className="label">Display</span>
          <PeriodSwitch period={period} onChange={onPeriodChange} />
        </div>

        <div className="region-switch" role="group" aria-label="Tax region">
          <button
            type="button"
            className={taxRegion === 'scottish' ? 'active' : ''}
            aria-pressed={taxRegion === 'scottish'}
            onClick={() => onTaxRegionChange('scottish')}
          >
            Scotland
          </button>
          <button
            type="button"
            className={taxRegion === 'english' ? 'active' : ''}
            aria-pressed={taxRegion === 'english'}
            onClick={() => onTaxRegionChange('english')}
          >
            Rest of UK
          </button>
        </div>
      </div>

      <div className="control-group">
        <span className="label">Employment</span>

        <ValueControl
          id="salary"
          label="Gross salary"
          value={annualSalary}
          onChange={onAnnualSalaryChange}
          min={0}
          max={salaryMax}
          step={100}
          snapPoints={pensionSnapPoints}
          tolerance={250}
          prefix="£"
        />

        <ValueControl
          id="pension"
          label="Your pension"
          value={pensionContribution.annualValue}
          onChange={pensionContribution.setAnnualValue}
          min={0}
          max={Math.max(annualSalary, 1)}
          step={100}
          snapPoints={pensionSnapPoints}
          tolerance={250}
          prefix="£"
          hint="Snaps to the nearest band threshold"
        />

        <ValueControl
          id="employer-pension"
          label="Employer pension"
          value={employerPension}
          onChange={onEmployerPensionChange}
          min={0}
          max={Math.max(annualSalary, 1)}
          step={100}
          prefix="£"
        />

        <ValueControl
          id="sacrifice"
          label="Other sacrifice"
          value={salarySacrifice.annualValue}
          onChange={salarySacrifice.setAnnualValue}
          min={0}
          max={Math.max(annualSalary, 1)}
          step={100}
          prefix="£"
        />

        <TaxCodeInput
          id="employment-tax-code"
          label="Tax code"
          value={employmentTaxCode}
          onChange={onEmploymentTaxCodeChange}
          info={empTaxCodeInfo}
          placeholder="S1257L"
          emptyHint="Leave blank to use the standard personal allowance."
          invalidExamples="S1257L, BR, D0, K475"
        />
      </div>

      <div className="control-group">
        <label className="control-checkbox">
          <input
            type="checkbox"
            checked={hasMilitaryPension}
            onChange={(e) => onHasMilitaryPensionChange(e.target.checked)}
          />
          <span className="label">Military pension</span>
        </label>

        {hasMilitaryPension && (
          <>
            <ValueControl
              id="military-pension"
              label="Annual pension"
              value={militaryPension}
              onChange={onMilitaryPensionChange}
              min={0}
              max={militaryPensionMax}
              step={100}
              prefix="£"
            />

            <TaxCodeInput
              id="military-tax-code"
              label="Tax code"
              value={militaryPensionTaxCode}
              onChange={onMilitaryPensionTaxCodeChange}
              info={milTaxCodeInfo}
              placeholder="BR"
              emptyHint="Blank means it is taxed at marginal rates above your salary."
              invalidExamples="BR, D0, S1257L, NT"
            />
          </>
        )}
      </div>

      <div className="control-group">
        <span className="label">Post-tax deductions</span>
        <p className="control-hint">
          Deducted from net pay after tax and NI — e.g. Share Save (SAYE), Give As You Earn, union dues.
        </p>

        {postTaxDeductions.map((deduction) => (
          <div key={deduction.id} className="deduction-row">
            <input
              className="deduction-name"
              type="text"
              value={deduction.name}
              onChange={(e) => onDeductionNameChange(deduction.id, e.target.value)}
              placeholder="Name"
              autoComplete="off"
              aria-label="Deduction name"
            />
            <div className="deduction-amount-wrapper">
              <span className="value-control-affix">£</span>
              <input
                className="deduction-amount figure"
                type="text"
                inputMode="decimal"
                value={deduction.amount}
                onChange={(e) => onDeductionAmountChange(deduction.id, e.target.value)}
                placeholder="0"
                autoComplete="off"
                aria-label="Deduction annual amount"
              />
            </div>
            <button
              type="button"
              className="deduction-remove"
              onClick={() => onDeductionRemove(deduction.id)}
              aria-label={`Remove ${deduction.name || 'deduction'}`}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}

        <button type="button" className="add-deduction-btn" onClick={onDeductionAdd}>
          + Add deduction
        </button>
      </div>
    </>
  );
}

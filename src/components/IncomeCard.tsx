import type { TaxCodeInfo, TaxRegion } from '../taxEngine';
import type { NumericInput } from '../hooks/useNumericInput';
import { PeriodToggle } from './PeriodToggle';
import { SliderSpinner } from './SliderSpinner';
import { TaxCodeInput } from './TaxCodeInput';

export function IncomeCard({
  annualSalary,
  onAnnualSalaryChange,
  salarySacrifice,
  pensionContribution,
  pensionPct,
  onPensionPctChange,
  onPensionTyped,
  employerPension,
  onEmployerPensionChange,
  employerPensionPct,
  onEmployerPensionPctChange,
  employmentTaxCode,
  onEmploymentTaxCodeChange,
  empTaxCodeInfo,
  taxRegion,
}: {
  annualSalary: string;
  onAnnualSalaryChange: (value: string) => void;
  salarySacrifice: NumericInput;
  pensionContribution: NumericInput;
  pensionPct: number;
  onPensionPctChange: (pct: number) => void;
  onPensionTyped: () => void;
  employerPension: string;
  onEmployerPensionChange: (value: string) => void;
  employerPensionPct: number;
  onEmployerPensionPctChange: (pct: number) => void;
  employmentTaxCode: string;
  onEmploymentTaxCodeChange: (value: string) => void;
  empTaxCodeInfo: TaxCodeInfo | null;
  taxRegion: TaxRegion;
}) {
  return (
    <div className="card" style={{ animationDelay: '0.1s' }}>
      <div className="card-title">
        <span className="card-title-icon">&#128176;</span>
        Employment Income
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="salary">Annual Gross Salary</label>
        <div className="input-wrapper">
          <span className="input-prefix">&pound;</span>
          <input
            id="salary"
            className="input-field"
            type="text"
            inputMode="decimal"
            value={annualSalary}
            onChange={(e) => onAnnualSalaryChange(e.target.value)}
            placeholder="45000"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="input-group">
        <div className="input-label-row">
          <label className="input-label" htmlFor="sacrifice">
            Pre-Tax Salary Sacrifice (excl. pension)
          </label>
          <PeriodToggle
            isMonthly={salarySacrifice.isMonthly}
            onChange={salarySacrifice.setIsMonthly}
          />
        </div>
        <div className="input-wrapper">
          <span className="input-prefix">&pound;</span>
          <input
            id="sacrifice"
            className="input-field"
            type="text"
            inputMode="decimal"
            value={salarySacrifice.displayValue}
            onChange={(e) => salarySacrifice.setDisplay(e.target.value)}
            placeholder={salarySacrifice.isMonthly ? 'e.g. 200' : 'e.g. 2400'}
            autoComplete="off"
          />
        </div>
        <p className="input-hint">
          E.g. cycle-to-work, childcare vouchers — enter{' '}
          {salarySacrifice.isMonthly ? 'monthly' : 'annual'} amount
        </p>
      </div>

      <div className="input-group">
        <div className="input-label-row">
          <label className="input-label" htmlFor="pension">
            Pension Contribution (salary sacrifice)
          </label>
          <PeriodToggle
            isMonthly={pensionContribution.isMonthly}
            onChange={pensionContribution.setIsMonthly}
          />
        </div>
        <div className="input-wrapper">
          <span className="input-prefix">&pound;</span>
          <input
            id="pension"
            className="input-field"
            type="text"
            inputMode="decimal"
            value={pensionContribution.displayValue}
            onChange={(e) => {
              pensionContribution.setDisplay(e.target.value);
              onPensionTyped();
            }}
            placeholder={pensionContribution.isMonthly ? 'e.g. 683' : 'e.g. 8200'}
            autoComplete="off"
          />
        </div>
        <SliderSpinner
          value={pensionPct}
          min={0}
          max={40}
          step={0.5}
          onChange={onPensionPctChange}
          ariaLabel="Pension contribution percentage"
        />
        <p className="input-hint">
          Drag the slider to set as % of gross salary, or enter{' '}
          {pensionContribution.isMonthly ? 'monthly' : 'annual'} amount above
        </p>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="employer-pension">
          Employer Pension Contribution
        </label>
        <div className="input-wrapper">
          <span className="input-prefix">&pound;</span>
          <input
            id="employer-pension"
            className="input-field"
            type="text"
            inputMode="decimal"
            value={employerPension}
            onChange={(e) => onEmployerPensionChange(e.target.value)}
            placeholder="0"
            autoComplete="off"
          />
        </div>
        <SliderSpinner
          value={employerPensionPct}
          min={0}
          max={30}
          step={0.5}
          onChange={onEmployerPensionPctChange}
          ariaLabel="Employer pension contribution percentage"
        />
        <p className="input-hint">
          Paid by your employer on top of your salary &mdash; does not reduce your take-home pay
        </p>
      </div>

      <TaxCodeInput
        id="emp-tax-code"
        label="Tax Code (optional)"
        value={employmentTaxCode}
        onChange={onEmploymentTaxCodeChange}
        info={empTaxCodeInfo}
        placeholder="e.g. 1257L"
        emptyHint={
          <>Leave blank to use standard {taxRegion === 'scottish' ? 'Scottish' : 'English'} rates with calculated personal allowance</>
        }
        invalidExamples="1257L, S1257L, BR, K100, 0T, NT"
      />
    </div>
  );
}

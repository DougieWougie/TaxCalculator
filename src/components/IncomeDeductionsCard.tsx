import { BarChart3 } from 'lucide-react';
import { formatCurrency, scalePeriod, type CalculationResult } from '../taxEngine';
import { BarRow } from './BarRow';
import { PeriodToggle } from './PeriodToggle';

export function IncomeDeductionsCard({
  result,
  hasMilitaryPension,
  showMonthly,
  onShowMonthlyChange,
  totalGross,
}: {
  result: CalculationResult;
  hasMilitaryPension: boolean;
  showMonthly: boolean;
  onShowMonthlyChange: (isMonthly: boolean) => void;
  totalGross: number;
}) {
  const totalIncome = result.grossSalary + (hasMilitaryPension ? result.militaryPension : 0);
  const totalDeductions =
    result.incomeTax + result.nationalInsurance + result.totalSalarySacrifice + result.totalPostTaxDeductions;

  return (
    <div className="card" style={{ animationDelay: '0.15s' }}>
      <div className="card-title">
        <span className="card-title-icon"><BarChart3 size={18} /></span>
        Income & Deductions
        <span className="pl-table-period-toggle">
          <PeriodToggle
            isMonthly={showMonthly}
            onChange={onShowMonthlyChange}
            ariaLabel="Display period"
          />
        </span>
      </div>
      <table className={`pl-table ${showMonthly ? 'hide-annual' : 'hide-monthly'}`}>
        <thead>
          <tr>
            <th></th>
            <th className="pl-col-monthly">Monthly</th>
            <th className="pl-col-annual">Annual</th>
          </tr>
        </thead>
        <tbody>
          <tr className="section-header">
            <td colSpan={3}>Income</td>
          </tr>
          <tr>
            <td>Gross Salary</td>
            <td className="pl-col-monthly">{formatCurrency(scalePeriod(result.grossSalary, 'monthly'))}</td>
            <td className="pl-col-annual">{formatCurrency(result.grossSalary)}</td>
          </tr>
          {hasMilitaryPension && (
            <tr>
              <td>Military Pension</td>
              <td className="pl-col-monthly">{formatCurrency(scalePeriod(result.militaryPension, 'monthly'))}</td>
              <td className="pl-col-annual">{formatCurrency(result.militaryPension)}</td>
            </tr>
          )}
          <tr className="subtotal-row">
            <td>Total Income</td>
            <td className="pl-col-monthly">{formatCurrency(scalePeriod(totalIncome, 'monthly'))}</td>
            <td className="pl-col-annual">{formatCurrency(totalIncome)}</td>
          </tr>

          <tr className="section-header">
            <td colSpan={3}>Deductions</td>
          </tr>
          <tr>
            <td>Income Tax</td>
            <td className="pl-col-monthly negative">−{formatCurrency(scalePeriod(result.incomeTax, 'monthly'))}</td>
            <td className="pl-col-annual negative">−{formatCurrency(result.incomeTax)}</td>
          </tr>
          <tr>
            <td>National Insurance</td>
            <td className="pl-col-monthly negative">−{formatCurrency(scalePeriod(result.nationalInsurance, 'monthly'))}</td>
            <td className="pl-col-annual negative">−{formatCurrency(result.nationalInsurance)}</td>
          </tr>
          {result.otherSalarySacrifice > 0 && (
            <tr>
              <td>Pre-Tax Salary Sacrifice</td>
              <td className="pl-col-monthly negative">−{formatCurrency(scalePeriod(result.otherSalarySacrifice, 'monthly'))}</td>
              <td className="pl-col-annual negative">−{formatCurrency(result.otherSalarySacrifice)}</td>
            </tr>
          )}
          {result.pensionContribution > 0 && (
            <tr>
              <td>Pension Contribution</td>
              <td className="pl-col-monthly negative">−{formatCurrency(scalePeriod(result.pensionContribution, 'monthly'))}</td>
              <td className="pl-col-annual negative">−{formatCurrency(result.pensionContribution)}</td>
            </tr>
          )}
          {result.totalPostTaxDeductions > 0 && (
            <tr>
              <td>Post-Tax Deductions</td>
              <td className="pl-col-monthly negative">−{formatCurrency(scalePeriod(result.totalPostTaxDeductions, 'monthly'))}</td>
              <td className="pl-col-annual negative">−{formatCurrency(result.totalPostTaxDeductions)}</td>
            </tr>
          )}
          <tr className="subtotal-row">
            <td>Total Deductions</td>
            <td className="pl-col-monthly negative">−{formatCurrency(scalePeriod(totalDeductions, 'monthly'))}</td>
            <td className="pl-col-annual negative">−{formatCurrency(totalDeductions)}</td>
          </tr>

          <tr className="net-row">
            <td>Net Take-Home</td>
            <td className="pl-col-monthly">{formatCurrency(scalePeriod(result.netAnnualIncome, 'monthly'))}</td>
            <td className="pl-col-annual">{formatCurrency(result.netAnnualIncome)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: '1.25rem' }}>
        <div className="bar-chart">
          <BarRow label="Take Home" value={result.netAnnualIncome} total={totalGross} className="take-home" />
          <BarRow label="Income Tax" value={result.incomeTax} total={totalGross} className="tax" />
          <BarRow label="NI" value={result.nationalInsurance} total={totalGross} className="ni" />
          {result.totalSalarySacrifice > 0 && (
            <BarRow label="Sacrifice" value={result.totalSalarySacrifice} total={totalGross} className="sacrifice" />
          )}
          {result.totalPostTaxDeductions > 0 && (
            <BarRow label="Post-Tax" value={result.totalPostTaxDeductions} total={totalGross} className="post-tax" />
          )}
          {hasMilitaryPension && result.militaryPension > 0 && (
            <BarRow label="Military (net)" value={result.militaryPension - result.militaryPensionTax} total={totalGross} className="military" />
          )}
        </div>
      </div>
    </div>
  );
}

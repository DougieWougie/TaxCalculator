import { TrendingUp } from 'lucide-react';
import { formatCurrency, formatPercent, type CalculationResult } from '../taxEngine';

export function EffectiveRatesCard({ result }: { result: CalculationResult }) {
  return (
    <div className="card" style={{ animationDelay: '0.2s' }}>
      <div className="card-title">
        <span className="card-title-icon"><TrendingUp size={18} /></span>
        Effective Rates
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Effective Tax Rate</div>
          <div className="stat-value">{formatPercent(result.effectiveTaxRate)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Marginal Rate</div>
          <div className="stat-value">{formatPercent(result.marginalTaxRate)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Personal Allowance</div>
          <div className="stat-value">{formatCurrency(result.personalAllowance)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Taxable Income</div>
          <div className="stat-value">{formatCurrency(result.totalTaxableIncome)}</div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Info, Landmark } from 'lucide-react';
import { formatCurrency, type CalculationResult } from '../taxEngine';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function PensionSummaryCard({
  result,
  pensionContributionAnnual,
}: {
  result: CalculationResult;
  pensionContributionAnnual: number;
}) {
  const [currentPot, setCurrentPot] = useState<string>('');
  const [growthRate, setGrowthRate] = useState<number>(5);
  const [currentAge, setCurrentAge] = useState<string>('30');
  const [retirementAge, setRetirementAge] = useState<string>('65');

  const pot = Number(currentPot) || 0;
  const age = Number(currentAge) || 30;
  const retAge = Number(retirementAge) || 65;
  
  const chartData = useMemo(() => {
    const data = [];
    let potLow = pot;
    let potMed = pot;
    let potHigh = pot;
    let potCustom = pot;
    const years = Math.max(0, retAge - age);
    
    for (let i = 0; i <= years; i++) {
      data.push({
        age: age + i,
        low: Math.round(potLow),
        medium: Math.round(potMed),
        high: Math.round(potHigh),
        selected: Math.round(potCustom),
      });
      potLow = (potLow + result.totalPensionPot) * 1.02;
      potMed = (potMed + result.totalPensionPot) * 1.05;
      potHigh = (potHigh + result.totalPensionPot) * 1.08;
      potCustom = (potCustom + result.totalPensionPot) * (1 + growthRate / 100);
    }
    return data;
  }, [pot, age, retAge, growthRate, result.totalPensionPot]);

  if (result.totalPensionPot <= 0 && !currentPot) return null;

  const niSaving =
    result.taxableEmploymentIncome >= 50_270
      ? 0.02
      : result.taxableEmploymentIncome > 12_570
      ? 0.08
      : 0;
  const effectiveRate = result.effectiveTaxRate > 0 ? result.marginalTaxRate + niSaving : 0;
  const saving = pensionContributionAnnual * effectiveRate;

  const finalPot = chartData.length > 0 ? chartData[chartData.length - 1].selected : pot;

  return (
    <div className="card" style={{ animationDelay: '0.35s' }}>
      <div className="card-title">
        <span className="card-title-icon"><Landmark size={18} /></span>
        Pension Summary
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Your Contribution</div>
          <div className="stat-value">{formatCurrency(pensionContributionAnnual)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Employer Contribution</div>
          <div className="stat-value">{formatCurrency(result.employerPension)}</div>
        </div>
        <div className="stat-card" style={{ gridColumn: 'span 2' }}>
          <div className="stat-label">Total Annual Pension Pot</div>
          <div className="stat-value positive">{formatCurrency(result.totalPensionPot)}</div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
        <div className="card-title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
          Pension Projection
        </div>
        
        <div className="input-group" style={{ marginBottom: '1rem' }}>
          <label className="input-label">Current Pension Pot</label>
          <div className="input-wrapper">
            <span className="input-prefix">£</span>
            <input
              type="number"
              className="input-field"
              value={currentPot}
              onChange={(e) => setCurrentPot(e.target.value)}
              min="0"
              placeholder="0"
            />
          </div>
        </div>

        <div className="field-pair">
          <div className="input-group">
            <label className="input-label">Current Age</label>
            <div className="input-wrapper">
              <input
                type="number"
                className="input-field"
                value={currentAge}
                onChange={(e) => setCurrentAge(e.target.value)}
                min="16"
                max="100"
                style={{ paddingLeft: '1rem' }}
              />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Retirement Age</label>
            <div className="input-wrapper">
              <input
                type="number"
                className="input-field"
                value={retirementAge}
                onChange={(e) => setRetirementAge(e.target.value)}
                min={currentAge}
                max="100"
                style={{ paddingLeft: '1rem' }}
              />
            </div>
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: '1.5rem' }}>
          <label className="input-label">Expected Growth Rate (%)</label>
          <div className="preset-buttons" style={{ marginBottom: '0.75rem' }}>
            <button 
              className={`preset-btn ${growthRate === 2 ? 'active' : ''}`}
              onClick={() => setGrowthRate(2)}
            >
              Low (2%)
            </button>
            <button 
              className={`preset-btn ${growthRate === 5 ? 'active' : ''}`}
              onClick={() => setGrowthRate(5)}
            >
              Medium (5%)
            </button>
            <button 
              className={`preset-btn ${growthRate === 8 ? 'active' : ''}`}
              onClick={() => setGrowthRate(8)}
            >
              High (8%)
            </button>
          </div>
          <div className="input-wrapper">
            <input
              type="number"
              className="input-field"
              value={growthRate}
              onChange={(e) => setGrowthRate(Number(e.target.value))}
              step="0.1"
              style={{ paddingLeft: '1rem' }}
            />
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--accent-glow)', borderColor: 'var(--accent)', marginBottom: '1.5rem' }}>
          <div className="stat-label" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Projected Pot at Age {retAge}</div>
          <div className="stat-value positive" style={{ fontSize: '1.8rem' }}>{formatCurrency(finalPot)}</div>
        </div>

        <div style={{ height: '250px', marginLeft: '-1.5rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--warning)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--warning)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis 
                dataKey="age" 
                stroke="var(--text-muted)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `Age ${value}`}
              />
              <YAxis 
                stroke="var(--text-muted)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                width={65}
              />
              <Tooltip 
                formatter={(value: any, name: any) => [formatCurrency(Number(value) || 0), name]}
                labelFormatter={(label) => `Age ${label}`}
                contentStyle={{ 
                  backgroundColor: 'var(--bg-card)', 
                  borderColor: 'var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-md)',
                  color: 'var(--text-primary)'
                }}
                itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
              />
              <Area 
                type="monotone" 
                dataKey="high" 
                stroke="var(--success)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorHigh)" 
                name="High (8%)"
              />
              <Area 
                type="monotone" 
                dataKey="medium" 
                stroke="var(--accent)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorMedium)" 
                name="Medium (5%)"
              />
              <Area 
                type="monotone" 
                dataKey="low" 
                stroke="var(--warning)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorLow)" 
                name="Low (2%)"
              />
              {![2, 5, 8].includes(growthRate) && (
                <Area 
                  type="monotone" 
                  dataKey="selected" 
                  stroke="var(--text-primary)" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="none" 
                  name={`Custom (${growthRate}%)`}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rates-info" style={{ marginTop: '1.5rem' }}>
        <Info size={16} aria-hidden="true" />
        <div>
          Your contribution of {formatCurrency(pensionContributionAnnual)}/year is via salary sacrifice (pre-tax), saving you{' '}
          {formatCurrency(saving)}{' '}
          in tax and NI. Employer contributions are paid on top of your salary.
        </div>
      </div>
    </div>
  );
}

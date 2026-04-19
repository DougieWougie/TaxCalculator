import { Dispatch, SetStateAction } from 'react';
import { sanitizeNumber } from '../sanitize';
import { PeriodToggle } from './PeriodToggle';

export interface PostTaxDeductionRow {
  id: number;
  name: string;
  amount: string;
  isMonthly: boolean;
  monthlyInput: string;
}

export function PostTaxDeductionsCard({
  postTaxDeductions,
  setPostTaxDeductions,
  nextDeductionId,
  setNextDeductionId,
}: {
  postTaxDeductions: PostTaxDeductionRow[];
  setPostTaxDeductions: Dispatch<SetStateAction<PostTaxDeductionRow[]>>;
  nextDeductionId: number;
  setNextDeductionId: Dispatch<SetStateAction<number>>;
}) {
  return (
    <div className="card" style={{ animationDelay: '0.2s' }}>
      <div className="card-title">
        <span className="card-title-icon">&#128181;</span>
        Post-Tax Deductions
      </div>
      <p className="input-hint" style={{ marginBottom: '0.75rem' }}>
        Deducted from net pay after tax and NI. Enter annual or monthly — use the toggle per row. E.g. Share Save (SAYE), Give As You Earn, union dues.
      </p>

      {postTaxDeductions.map((deduction) => (
        <div key={deduction.id} className="deduction-row">
          <input
            className="input-field deduction-name"
            type="text"
            value={deduction.name}
            onChange={(e) =>
              setPostTaxDeductions((prev) =>
                prev.map((d) => d.id === deduction.id ? { ...d, name: e.target.value } : d)
              )
            }
            placeholder="Name"
            autoComplete="off"
          />
          <div className="input-wrapper deduction-amount-wrapper">
            <span className="input-prefix">&pound;</span>
            <input
              className="input-field deduction-amount"
              type="text"
              inputMode="decimal"
              value={deduction.isMonthly ? deduction.monthlyInput : deduction.amount}
              onChange={(e) => {
                if (deduction.isMonthly) {
                  setPostTaxDeductions((prev) =>
                    prev.map((d) => d.id === deduction.id
                      ? { ...d, monthlyInput: e.target.value, amount: (sanitizeNumber(e.target.value) * 12).toString() }
                      : d
                    )
                  );
                } else {
                  setPostTaxDeductions((prev) =>
                    prev.map((d) => d.id === deduction.id ? { ...d, amount: e.target.value } : d)
                  );
                }
              }}
              placeholder={deduction.isMonthly ? 'e.g. 200' : 'e.g. 2400'}
              autoComplete="off"
            />
          </div>
          <PeriodToggle
            isMonthly={deduction.isMonthly}
            onChange={(isMonthly) =>
              setPostTaxDeductions((prev) =>
                prev.map((d) => {
                  if (d.id !== deduction.id) return d;
                  const monthlyInput = isMonthly
                    ? (sanitizeNumber(d.amount) / 12).toFixed(2)
                    : d.monthlyInput;
                  return { ...d, isMonthly, monthlyInput };
                })
              )
            }
          />
          <button
            className="deduction-remove"
            onClick={() =>
              setPostTaxDeductions((prev) => prev.filter((d) => d.id !== deduction.id))
            }
            aria-label={`Remove ${deduction.name || 'deduction'}`}
            title="Remove"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}

      <button
        className="add-deduction-btn"
        onClick={() => {
          setPostTaxDeductions((prev) => [
            ...prev,
            { id: nextDeductionId, name: '', amount: '0', isMonthly: false, monthlyInput: '0' },
          ]);
          setNextDeductionId((id) => id + 1);
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add deduction
      </button>
    </div>
  );
}

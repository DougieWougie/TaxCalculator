import { formatCurrency, type TaxCodeInfo } from '../taxEngine';

export function TaxCodeInput({
  id,
  label,
  value,
  onChange,
  info,
  placeholder,
  emptyHint,
  invalidExamples,
  maxLength = 10,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  info: TaxCodeInfo | null;
  placeholder: string;
  emptyHint: React.ReactNode;
  invalidExamples: string;
  maxLength?: number;
}) {
  const isValid = value && info?.isValid;
  const isInvalid = value && info && !info.isValid;

  return (
    <div className="input-group">
      <label className="input-label" htmlFor={id}>{label}</label>
      <div className="input-wrapper tax-code-wrapper">
        <input
          id={id}
          className={`input-field tax-code-input ${isInvalid ? 'invalid' : ''} ${isValid ? 'valid' : ''}`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={maxLength}
        />
        {value && info && (
          <span className={`tax-code-status ${info.isValid ? 'valid' : 'invalid'}`}>
            {info.isValid ? '\u2713' : '\u2717'}
          </span>
        )}
      </div>
      {isValid && info && (
        <p className="input-hint tax-code-hint valid">
          {info.isScottish ? 'Scottish ' : ''}
          {info.type === 'cumulative' && `Personal allowance: ${formatCurrency(info.personalAllowance)}`}
          {info.type === 'K' && `K code: adds ${formatCurrency(info.kAdjustment)} to taxable income`}
          {info.type === 'NT' && 'No tax deducted'}
          {info.type === '0T' && 'Zero personal allowance'}
          {(info.type === 'BR' || info.type === 'D0' || info.type === 'D1' || info.type === 'D2' || info.type === 'D3') && `Flat rate: ${info.type}`}
        </p>
      )}
      {isInvalid && (
        <p className="input-hint tax-code-hint invalid">
          Invalid tax code. Examples: {invalidExamples}
        </p>
      )}
      {!value && (
        <p className="input-hint">{emptyHint}</p>
      )}
    </div>
  );
}

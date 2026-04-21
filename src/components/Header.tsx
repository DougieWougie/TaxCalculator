import { CopyLinkButton } from './CopyLinkButton';

export function Header() {
  return (
    <header className="header">
      <h1>UK Pension & Salary Calculator</h1>
      <p>See exactly what you take home after tax, NI, and pension contributions</p>
      <div className="header-meta">
        <div className="tax-year-badge">Tax Year 2025 – 26</div>
        <CopyLinkButton />
      </div>
    </header>
  );
}

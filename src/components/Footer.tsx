export function Footer() {
  return (
    <footer className="footer">
      <p>
        Tax Year 2025–26 rates. This calculator is for guidance only and does not constitute financial advice.
      </p>
      <p style={{ marginTop: '0.5rem' }}>
        Sources:{' '}
        <a href="https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/" target="_blank" rel="noopener noreferrer">
          Scottish Gov
        </a>
        {' '}·{' '}
        <a href="https://www.gov.uk/income-tax-rates" target="_blank" rel="noopener noreferrer">
          HMRC
        </a>
        {' '}·{' '}
        <a href="https://www.gov.uk/national-insurance-rates-letters" target="_blank" rel="noopener noreferrer">
          NI Rates
        </a>
      </p>
    </footer>
  );
}

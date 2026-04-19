export function DisclaimerBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="disclaimer-banner" role="alert">
      <div className="disclaimer-content">
        <span className="disclaimer-icon" aria-hidden="true">&#9888;</span>
        <p>
          <strong>Disclaimer:</strong> This application was developed using AI for AI research purposes.
          It should only be used as a guide. All AI-generated output should be independently verified.
        </p>
        <button
          className="disclaimer-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss disclaimer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

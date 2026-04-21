import { AlertTriangle, X } from 'lucide-react';

export function DisclaimerBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="disclaimer-banner" role="status" aria-live="polite">
      <div className="disclaimer-content">
        <AlertTriangle className="disclaimer-icon" size={20} aria-hidden="true" />
        <p>
          <strong>Disclaimer:</strong> This application was developed using AI for AI research purposes.
          It should only be used as a guide. All AI-generated output should be independently verified.
        </p>
        <button
          className="disclaimer-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss disclaimer"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

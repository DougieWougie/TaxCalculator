import { useCallback, useEffect, useState } from 'react';
import { Check, Link2 } from 'lucide-react';

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, []);

  return (
    <button
      type="button"
      className="copy-link-btn"
      onClick={handleCopy}
      aria-label="Copy shareable link"
    >
      {copied ? <Check size={14} /> : <Link2 size={14} />}
      <span>{copied ? 'Link copied' : 'Copy shareable link'}</span>
    </button>
  );
}

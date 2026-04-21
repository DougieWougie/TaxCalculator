import { Info, MapPin } from 'lucide-react';
import type { TaxRegion } from '../taxEngine';

export function RegionCard({
  taxRegion,
  onChange,
}: {
  taxRegion: TaxRegion;
  onChange: (region: TaxRegion) => void;
}) {
  return (
    <div className="card" style={{ animationDelay: '0.05s' }}>
      <div className="card-title">
        <span className="card-title-icon"><MapPin size={18} /></span>
        Tax Region
      </div>
      <div className="region-toggle">
        <button
          className={`region-btn scottish ${taxRegion === 'scottish' ? 'active' : ''}`}
          onClick={() => onChange('scottish')}
        >
          Scotland
        </button>
        <button
          className={`region-btn english ${taxRegion === 'english' ? 'active' : ''}`}
          onClick={() => onChange('english')}
        >
          England / Wales / NI
        </button>
      </div>
      <div className="rates-info" style={{ marginTop: '1rem' }} aria-live="polite">
        <Info size={16} aria-hidden="true" />
        <div>
          {taxRegion === 'scottish'
            ? 'Scotland has 6 income tax bands (19%–48%). Your tax code starts with "S".'
            : 'England, Wales & NI use 3 income tax bands (20%–45%).'}
        </div>
      </div>
    </div>
  );
}

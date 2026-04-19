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
        <span className="card-title-icon">&#127988;</span>
        Tax Region
      </div>
      <div className="region-toggle">
        <button
          className={`region-btn scottish ${taxRegion === 'scottish' ? 'active' : ''}`}
          onClick={() => onChange('scottish')}
        >
          &#127988;&#917607;&#917602;&#917619;&#917603;&#917620;&#917631; Scotland
        </button>
        <button
          className={`region-btn english ${taxRegion === 'english' ? 'active' : ''}`}
          onClick={() => onChange('english')}
        >
          &#127468;&#127463; England / Wales / NI
        </button>
      </div>
      <div className="rates-info" style={{ marginTop: '1rem' }} aria-live="polite">
        <span aria-hidden="true">&#9432;</span>
        <div>
          {taxRegion === 'scottish'
            ? 'Scotland has 6 income tax bands (19%\u201348%). Your tax code starts with "S".'
            : 'England, Wales & NI use 3 income tax bands (20%\u201345%).'}
        </div>
      </div>
    </div>
  );
}

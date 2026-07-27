import { ControlSheet } from './ControlSheet';

/**
 * The responsive frame. A single CSS breakpoint decides between the fixed rail
 * and the sheet — no JavaScript viewport measuring. Both containers are always
 * rendered; CSS hides the one that does not apply.
 */
export function CockpitShell({
  controls,
  children,
}: {
  controls: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="cockpit">
      <aside className="cockpit-rail" aria-label="Controls">
        {controls}
      </aside>

      <main className="cockpit-canvas">{children}</main>

      <div className="cockpit-sheet-slot">
        <ControlSheet peek="Adjust">{controls}</ControlSheet>
      </div>
    </div>
  );
}

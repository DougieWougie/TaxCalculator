import { ControlSheet } from './ControlSheet';

/**
 * The responsive frame. `controls` is rendered exactly once, inside a single
 * `ControlSheet`. A single CSS breakpoint decides its presentation — a fixed
 * bottom sheet below 900px, a static rail above it — no JavaScript viewport
 * measuring, and no duplicated controls subtree.
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
      <ControlSheet peek="Adjust">{controls}</ControlSheet>

      <main className="cockpit-canvas">{children}</main>
    </div>
  );
}

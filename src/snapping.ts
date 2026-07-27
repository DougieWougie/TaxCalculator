export interface SnapOptions {
  min: number;
  max: number;
  step: number;
  /** Meaningful values (band thresholds, whole percents) to attract the value. */
  snapPoints?: number[];
  /** How close the value must be to a snap point to be pulled onto it. */
  tolerance?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to the step grid without accumulating binary floating point error. */
function toStep(value: number, step: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number((Math.round(value / step) * step).toFixed(decimals));
}

/**
 * Snap a freely-dragged value: clamp, pull onto the nearest snap point if one
 * is within tolerance, otherwise round to the step grid.
 */
export function snapValue(value: number, options: SnapOptions): number {
  const { min, max, step, snapPoints, tolerance = 0 } = options;
  const clamped = clamp(value, min, max);

  if (snapPoints?.length && tolerance > 0) {
    let best: number | null = null;
    let bestDistance = Infinity;
    for (const point of snapPoints) {
      const distance = Math.abs(clamped - point);
      if (distance <= tolerance) {
        if (distance < bestDistance || (distance === bestDistance && (best === null || point < best))) {
          best = point;
          bestDistance = distance;
        }
      }
    }
    if (best !== null) return clamp(best, min, max);
  }

  return clamp(toStep(clamped, step), min, max);
}

/**
 * Keyboard stepping. Deliberately ignores snap points — arrow keys should move
 * by a predictable amount rather than jumping to a nearby threshold.
 */
export function nudge(
  value: number,
  direction: -1 | 1,
  options: SnapOptions,
  coarse = false,
): number {
  const { min, max, step } = options;
  const delta = step * (coarse ? 10 : 1) * direction;
  return clamp(toStep(value + delta, step), min, max);
}

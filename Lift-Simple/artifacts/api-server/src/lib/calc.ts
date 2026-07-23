/**
 * Pure calculation functions — no I/O, no side effects.
 * Extracted here so they can be unit-tested independently.
 */

/**
 * Epley formula for estimated one-rep max.
 * Returns weight directly when reps === 1 (formula degenerates).
 */
export function epleyOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Determine a trend label from an ordered array of data points.
 * Uses a ±2% threshold so tiny noise doesn't flip the trend.
 *
 * @param dataPoints - ordered oldest-first; each item must have a `value` field
 * @returns "up" | "down" | "flat" when ≥2 points, null otherwise
 */
export function calcTrend(
  dataPoints: Array<{ value: number }>,
): "up" | "down" | "flat" | null {
  if (dataPoints.length < 2) return null;
  const first = dataPoints[0].value;
  const last = dataPoints[dataPoints.length - 1].value;
  if (last > first * 1.02) return "up";
  if (last < first * 0.98) return "down";
  return "flat";
}

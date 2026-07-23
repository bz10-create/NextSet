/**
 * Shared date utilities for range filtering and streak calculation.
 *
 * DATE ARITHMETIC POLICY — UTC throughout
 * ----------------------------------------
 * All date strings are stored as YYYY-MM-DD produced by
 * `new Date().toISOString().split("T")[0]`, which is always UTC midnight.
 * To keep "today" and range boundaries consistent regardless of where the
 * server is running, every arithmetic operation here uses the UTC accessors
 * (setUTCDate, setUTCMonth, setUTCFullYear) so the resulting ISO string
 * always lands on the intended UTC calendar day.
 *
 * Local-time methods like setDate() would produce the correct ISO string
 * only in UTC+0 environments; on a UTC-N host a workout logged late in the
 * evening could fall a calendar day behind, breaking "this week" / streak
 * counts — hence this explicit choice.
 */

/** Returns today as a YYYY-MM-DD string in UTC. */
export function todayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

function subtractDaysUTC(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split("T")[0];
}

function subtractMonthsUTC(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().split("T")[0];
}

function subtractYearsUTC(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().split("T")[0];
}

/**
 * Returns the inclusive start date (YYYY-MM-DD, UTC) for a given
 * progress range, or null for "all time".
 * Free-plan users are always capped at the last 7 days.
 */
export function getRangeStartDate(range: string, plan: string): string | null {
  // Free plan: last 7 days only, regardless of requested range
  if (plan === "free") return subtractDaysUTC(7);

  switch (range) {
    case "week":         return subtractDaysUTC(7);
    case "month":        return subtractMonthsUTC(1);
    case "three_months": return subtractMonthsUTC(3);
    case "six_months":   return subtractMonthsUTC(6);
    case "year":         return subtractYearsUTC(1);
    case "all":          return null;
    default:             return null;
  }
}

/**
 * Counts the current consecutive-day workout streak.
 *
 * @param workoutDates - set of YYYY-MM-DD strings (UTC) the user has trained
 * @returns number of consecutive days ending today (0 if none today or yesterday)
 */
export function calcCurrentStreak(workoutDates: Set<string>): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (workoutDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      // Gap found — streak ends
      break;
    }
    // i === 0 (today) with no workout: keep going to check yesterday
  }
  return streak;
}

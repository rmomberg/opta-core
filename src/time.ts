/** Default risk-free rate used across pricing helpers. */
export const DEFAULT_RISK_FREE = 0.045;

/**
 * Convert an expiry date to years from a reference date.
 * Floor is a small positive value so BS math stays defined near expiry.
 */
export function yearsToExpiry(
  expiry: string | Date,
  now: Date = new Date(),
  minYears = 1 / 365.25
): number {
  const exp = expiry instanceof Date ? expiry : new Date(expiry);
  const ms = exp.getTime() - now.getTime();
  return Math.max(ms / (365.25 * 24 * 60 * 60 * 1000), minYears);
}

/** Calendar days until expiry (can be fractional). */
export function daysToExpiry(expiry: string | Date, now: Date = new Date()): number {
  const exp = expiry instanceof Date ? expiry : new Date(expiry);
  return (exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
}

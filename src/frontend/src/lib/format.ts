/** Shared formatting helpers for money, progress and backend timestamps. */

/** Format a cent amount as a whole-dollar currency string, e.g. 25000000n -> "$250,000". */
export function formatCents(cents: bigint): string {
  const dollars = Number(cents) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: dollars % 1 === 0 ? 0 : 2,
  }).format(dollars);
}

/** Convert a Motoko nanosecond timestamp to a Date, or null when invalid. */
export function timestampToDate(timestamp: bigint): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Render a backend timestamp as a short readable date, e.g. "Mar 4, 2026". */
export function formatDate(timestamp: bigint): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Render a backend timestamp as a relative phrase, e.g. "2 hours ago". */
export function formatRelative(timestamp: bigint): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(timestamp);
}

/** Convert basis points (0-10000) to a clamped whole-number percentage. */
export function bpsToPercent(bps: bigint): number {
  const percent = Number(bps) / 100;
  return Math.max(0, Math.min(100, Math.round(percent * 10) / 10));
}

/** Parse a user-entered dollar amount into cents, or null when invalid. */
export function parseDollarsToCents(value: string): bigint | null {
  const trimmed = value.trim().replace(/[$,]/g, "");
  if (trimmed === "") return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return BigInt(Math.round(amount * 100));
}

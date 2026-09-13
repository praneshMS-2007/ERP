/**
 * Standard date formatting utility for the Shuroq Enterprise ERP backend.
 * Enforces the Date/Month/Year (DD/MM/YYYY) format across the entire application.
 */

/**
 * Formats a Date, ISO string, or timestamp as "DD/MM/YYYY" (e.g. "25/05/2026").
 * Always produces two-digit day, two-digit month, and four-digit year.
 */
export function formatDateDMY(d: Date | string | number | null | undefined, fallback: string = '—'): string {
  if (!d) return fallback;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return fallback;
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Formats a Date, ISO string, or timestamp as "DD/MM/YYYY, HH:MM" (e.g. "25/05/2026, 14:30").
 */
export function formatDateTimeDMY(d: Date | string | number | null | undefined, fallback: string = '—'): string {
  if (!d) return fallback;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return fallback;
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dd}/${mm}/${yyyy}, ${time}`;
}

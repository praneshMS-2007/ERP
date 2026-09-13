/**
 * Standard date formatting utility for the Shuroq Enterprise ERP frontend.
 * Enforces the Date/Month/Year (DD/MM/YYYY) format across the entire application.
 */

/**
 * Formats a Date, ISO string, or timestamp into "DD/MM/YYYY" (e.g. "25/05/2026").
 * Returns fallback (default '—') if invalid or nullish.
 */
export function formatDate(val: string | number | Date | null | undefined, fallback: string = '—'): string {
  if (!val) return fallback;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return fallback;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Formats a Date, ISO string, or timestamp into "DD/MM/YYYY, HH:MM" (e.g. "25/05/2026, 14:30").
 * Returns fallback (default '—') if invalid or nullish.
 */
export function formatDateTime(val: string | number | Date | null | undefined, fallback: string = '—'): string {
  if (!val) return fallback;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return fallback;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dd}/${mm}/${yyyy}, ${time}`;
}

// This ERP runs for the Indian market — every money value renders in
// Rupees with Indian digit grouping (lakh/crore), not US-style thousands.
export function formatINR(amount: number): string {
  return `₹${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// Lakh/Crore compact form — the Indian equivalent of the old "$1.2M" / "$28K" KPI-card shorthand.
export function formatINRCompact(amount: number): string {
  const n = amount || 0;
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

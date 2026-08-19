// Same convention as the frontend's lib/currency.ts — this ERP runs for
// the Indian market, so any money that ends up in generated text (chat
// answers, error messages) reads in Rupees with Indian digit grouping.
export function formatINR(amount: number): string {
  return `₹${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

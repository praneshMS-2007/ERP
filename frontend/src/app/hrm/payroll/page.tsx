'use client';

import PayrollPageContent from './PayrollPageContent';

// The HR Management side of Payroll — creates and edits records. Mark
// Paid / Return to HR live only on the Finance side (/finance/payroll),
// even for a Super Admin viewing this page.
export default function PayrollPage() {
  return <PayrollPageContent mode="hr" />;
}

'use client';

import PayrollPageContent from '../../hrm/payroll/PayrollPageContent';

// The Finance side of Payroll — marks records paid or returns them to HR.
// Add Payroll / Edit / Delete live only on the HR side (/hrm/payroll),
// even for a Super Admin viewing this page.
export default function FinancePayrollPage() {
  return <PayrollPageContent mode="finance" />;
}

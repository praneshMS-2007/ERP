const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/** Backend origin without the /api suffix — for building src URLs to static
 * files (avatars, offer letters) that the backend serves directly, not
 * through a JSON endpoint. */
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

// Fetch wrapper with JWT auth header and 401 handling
async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;

  // Get token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    // Handle 401 Unauthorized — token expired or invalid
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    // Handle 403 Forbidden — insufficient permissions
    if (res.status === 403) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Access denied: insufficient permissions');
    }

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return [];
  }
}

/**
 * Like fetchApi, but throws instead of returning [] when something goes wrong.
 *
 * fetchApi swallows every failure into an empty array, which is survivable when
 * you are painting a list and disastrous when you are saving — a failed write
 * would look identical to a successful one. Use this for anything that changes
 * data, and surface the message to the user.
 */
async function mutateApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error('Your session has expired. Please sign in again.');
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // NestJS puts the useful text in `message`; it may be a string or an array.
    const detail = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new Error(detail || `Request failed (${res.status})`);
  }

  return body;
}

export const crmApi = {
  getCustomers: () => fetchApi('/crm/customers'),
  getLeads: () => fetchApi('/crm/leads'),
  getOpportunities: () => fetchApi('/crm/opportunities'),
  getSupportTickets: () => fetchApi('/crm/tickets'),
  getFollowUps: () => fetchApi('/crm/follow-ups'),
  createSupportTicket: (data: any) => mutateApi('/crm/tickets', { method: 'POST', body: JSON.stringify(data) }),
  createFollowUp: (data: any) => mutateApi('/crm/follow-ups', { method: 'POST', body: JSON.stringify(data) }),
  completeFollowUp: (id: string) => mutateApi(`/crm/follow-ups/${id}/complete`, { method: 'PUT' }),
  createLead: (data: any) => mutateApi('/crm/leads', { method: 'POST', body: JSON.stringify(data) }),
  // No createCustomer — a Customer only ever comes from converting a Lead
  // (see convertLead below). Editing an existing one is still allowed.
  updateLead: (id: string, data: any) => mutateApi(`/crm/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLead: (id: string) => mutateApi(`/crm/leads/${id}`, { method: 'DELETE' }),
  updateCustomer: (id: string, data: any) => mutateApi(`/crm/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => mutateApi(`/crm/customers/${id}`, { method: 'DELETE' }),
  convertLead: (id: string) => mutateApi(`/crm/leads/${id}/convert`, { method: 'POST' }),
  updateSupportTicketStatus: (id: string, status: string) => mutateApi(`/crm/tickets/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updateSupportTicket: (id: string, data: any) => mutateApi(`/crm/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupportTicket: (id: string) => mutateApi(`/crm/tickets/${id}`, { method: 'DELETE' }),
  updateOpportunity: (id: string, data: { value?: number; stage?: string; expectedCloseDate?: string }) =>
    mutateApi(`/crm/opportunities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createOpportunity: (data: { customerId: string; value: number; stage: string; expectedCloseDate?: string }) =>
    mutateApi('/crm/opportunities', { method: 'POST', body: JSON.stringify(data) }),
};

export const hrmApi = {
  getEmployees: () => fetchApi('/hrm/employees'),
  getEmployee: (id: string) => mutateApi(`/hrm/employees/${id}`),
  updateEmployee: (id: string, data: any) =>
    mutateApi(`/hrm/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setSalary: (id: string, data: any) =>
    mutateApi(`/hrm/employees/${id}/salary`, { method: 'PUT', body: JSON.stringify(data) }),
  removeEmployee: (id: string, lastWorkingDay?: string) =>
    mutateApi(`/hrm/employees/${id}/remove`, { method: 'PUT', body: JSON.stringify({ lastWorkingDay }) }),
  getUsers: () => mutateApi('/hrm/users'),
  resetUserPassword: (id: string, newPassword: string) =>
    mutateApi(`/hrm/users/${id}/reset-password`, { method: 'PUT', body: JSON.stringify({ newPassword }) }),
  getItAccess: (employeeId: string) => mutateApi(`/hrm/employees/${employeeId}/it-access`),
  setItAccess: (employeeId: string, data: any) =>
    mutateApi(`/hrm/employees/${employeeId}/it-access`, { method: 'PUT', body: JSON.stringify(data) }),
  setAgreementStatus: (employeeId: string, field: 'ndaSigned' | 'policyAcknowledged', value: boolean) =>
    mutateApi(`/hrm/employees/${employeeId}/agreements/${field}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  getDocuments: (employeeId: string) => mutateApi(`/hrm/employees/${employeeId}/documents`),
  uploadDocument: async (employeeId: string, kind: string, file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const body = new FormData();
    body.append('kind', kind);
    body.append('file', file);
    const res = await fetch(`${API_BASE}/hrm/employees/${employeeId}/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.message || `Upload failed (${res.status})`);
    return json;
  },
  deleteDocument: (employeeId: string, documentId: string) =>
    mutateApi(`/hrm/employees/${employeeId}/documents/${documentId}`, { method: 'DELETE' }),
  setAvatar: async (employeeId: string, file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`${API_BASE}/hrm/employees/${employeeId}/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.message || `Upload failed (${res.status})`);
    return json;
  },
  // The download route requires an Authorization header, which a plain
  // <a href> can't send — fetch as a blob and trigger the save manually,
  // same pattern as exportApi.downloadFile below.
  downloadDocument: async (employeeId: string, documentId: string, fileName: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${API_BASE}/hrm/employees/${employeeId}/documents/${documentId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  },
  getAttendance: () => fetchApi('/hrm/attendance'),
  getPayrolls: () => fetchApi('/hrm/payrolls'),
  getLeaves: () => fetchApi('/hrm/leaves'),
  createEmployee: (data: any) =>
    mutateApi('/hrm/employees', { method: 'POST', body: JSON.stringify(data) }),
  createPayroll: (data: any) => mutateApi('/hrm/payrolls', { method: 'POST', body: JSON.stringify(data) }),
  updatePayroll: (id: string, data: any) => mutateApi(`/hrm/payrolls/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePayroll: (id: string) => mutateApi(`/hrm/payrolls/${id}`, { method: 'DELETE' }),
  updatePayrollStatus: (id: string, status: string, reason?: string) =>
    mutateApi(`/hrm/payrolls/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, reason }) }),
  markAttendance: (data: any) => fetchApi('/hrm/attendance', { method: 'POST', body: JSON.stringify(data) }),
  requestLeave: (data: any) => fetchApi('/hrm/leaves', { method: 'POST', body: JSON.stringify(data) }),
  updateLeaveStatus: (id: string, status: string) => fetchApi(`/hrm/leaves/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getPerformanceReviews: () => fetchApi('/hrm/performance-reviews'),
  createPerformanceReview: (data: any) => fetchApi('/hrm/performance-reviews', { method: 'POST', body: JSON.stringify(data) }),
  getAttendanceStats: (date: string) => fetchApi(`/hrm/attendance/stats?date=${date}`),
  getAttendanceTrend: (year: number) => fetchApi(`/hrm/attendance/trend?year=${year}`),
  getEmployeeAttendanceCalendar: (employeeId: string, year: number, month: number) =>
    mutateApi(`/hrm/employees/${employeeId}/attendance/calendar?year=${year}&month=${month}`),
  getHolidays: () => mutateApi('/hrm/holidays'),
  createHoliday: (data: { date: string; name: string; description?: string }) =>
    mutateApi('/hrm/holidays', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (id: string) => mutateApi(`/hrm/holidays/${id}`, { method: 'DELETE' }),
  getPasswordResetRequests: () => mutateApi('/hrm/password-reset-requests'),
  resolvePasswordResetRequest: (id: string) => mutateApi(`/hrm/password-reset-requests/${id}/resolve`, { method: 'PUT' }),
};

export const announcementApi = {
  getAnnouncements: () => mutateApi('/announcements'),
  getRecipientOptions: () => mutateApi('/announcements/recipients'),
  createAnnouncement: (data: { title: string; body: string; fileUrl?: string; fileName?: string; isBroadcast: boolean; recipientUserIds?: string[] }) =>
    mutateApi('/announcements', { method: 'POST', body: JSON.stringify(data) }),
  deleteAnnouncement: (id: string) => mutateApi(`/announcements/${id}`, { method: 'DELETE' }),
};

// Self-service endpoints — the backend derives the employee from the JWT,
// never from a request parameter, so there is no employeeId to pass here.
export const selfApi = {
  getProfile: () => fetchApi('/self/profile'),
  getLeaves: () => fetchApi('/self/leaves'),
  requestLeave: (data: { leaveType: string; startDate: string; endDate: string; reason: string }) =>
    mutateApi('/self/leaves', { method: 'POST', body: JSON.stringify(data) }),
  getLeaveBalance: () => mutateApi('/self/leaves/balance'),
  getAttendance: () => fetchApi('/self/attendance'),
  getAttendanceCalendar: (year: number, month: number) => mutateApi(`/self/attendance/calendar?year=${year}&month=${month}`),
  clockIn: () => fetchApi('/self/attendance/clock-in', { method: 'POST' }),
  getProjects: () => fetchApi('/self/projects'),
  getTasks: () => fetchApi('/self/tasks'),
  getAnnouncements: () => fetchApi('/self/announcements'),
  getPayroll: () => mutateApi('/self/payroll'),
};

export const inventoryApi = {
  getProducts: () => fetchApi('/inventory/products'),
  getStockAlerts: () => fetchApi('/inventory/stock-alerts'),
  getCategories: () => fetchApi('/inventory/categories'),
  createCategory: (data: any) => fetchApi('/inventory/categories', { method: 'POST', body: JSON.stringify(data) }),
  getSuppliers: () => fetchApi('/inventory/suppliers'),
  getWarehouses: () => fetchApi('/inventory/warehouses'),
  getSalesOrders: () => fetchApi('/inventory/sales-orders'),
  getPurchaseOrders: () => fetchApi('/inventory/purchase-orders'),
  createProduct: (data: any) => fetchApi('/inventory/products', { method: 'POST', body: JSON.stringify(data) }),
  createSupplier: (data: any) => fetchApi('/inventory/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  createPurchaseOrder: (data: any) => fetchApi('/inventory/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  createWarehouse: (data: any) => fetchApi('/inventory/warehouses', { method: 'POST', body: JSON.stringify(data) }),
  createSalesOrder: (data: any) => fetchApi('/inventory/sales-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateSalesOrderStatus: (id: string, status: string) => fetchApi(`/inventory/sales-orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updatePurchaseOrderStatus: (id: string, status: string) => fetchApi(`/inventory/purchase-orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
};

export const projectApi = {
  getProjects: () => fetchApi('/projects'),
  getProjectById: (id: string) => mutateApi(`/projects/${id}`),
  getTasks: () => fetchApi('/projects/tasks'),
  // Mutating calls use mutateApi (throws a real error on failure) rather
  // than fetchApi (silently returns [] on failure) — createTask/
  // updateTaskStatus were on fetchApi before, fixed while touching this file.
  createProject: (data: any) => mutateApi('/projects', { method: 'POST', body: JSON.stringify(data) }),
  deleteProject: (id: string) => mutateApi(`/projects/${id}`, { method: 'DELETE' }),
  updateProjectStaffing: (id: string, data: { projectManagerId?: string; teamEmployeeIds?: string[] }) =>
    mutateApi(`/projects/${id}/staffing`, { method: 'PUT', body: JSON.stringify(data) }),
  getProjectStaff: (id: string) => mutateApi(`/projects/${id}/staff`),
  updateMemberRole: (id: string, employeeId: string, role: string) =>
    mutateApi(`/projects/${id}/staff/${employeeId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  updateProjectOverview: (id: string, data: { description?: string; startDate?: string | null; endDate?: string | null }) =>
    mutateApi(`/projects/${id}/overview`, { method: 'PUT', body: JSON.stringify(data) }),
  updateProjectStatus: (id: string, status: string) =>
    mutateApi(`/projects/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  createTask: (data: any) => mutateApi('/projects/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) => mutateApi(`/projects/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string) => mutateApi(`/projects/tasks/${id}`, { method: 'DELETE' }),
  updateTaskStatus: (id: string, status: string) => mutateApi(`/projects/tasks/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  // Timesheet — lives inside a project now. "me" always means the caller;
  // there is no way to pass another employeeId into the fill/update calls.
  getMyTimesheet: (projectId: string) => mutateApi(`/projects/${projectId}/timesheet/me`),
  upsertMyTimesheet: (projectId: string, data: { hours: number; description?: string }) =>
    mutateApi(`/projects/${projectId}/timesheet/me`, { method: 'PUT', body: JSON.stringify(data) }),
  getMemberTimesheet: (projectId: string, employeeId: string, date?: string) =>
    mutateApi(`/projects/${projectId}/timesheet/${employeeId}${date ? `?date=${date}` : ''}`),
  getHolidays: (projectId: string) => mutateApi(`/projects/${projectId}/holidays`),
  createHoliday: (projectId: string, data: { date: string; title: string }) =>
    mutateApi(`/projects/${projectId}/holidays`, { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (projectId: string, holidayId: string) =>
    mutateApi(`/projects/${projectId}/holidays/${holidayId}`, { method: 'DELETE' }),
  getDocuments: (projectId: string) => mutateApi(`/projects/${projectId}/documents`),
  uploadDocument: (projectId: string, data: { kind: string; fileUrl: string; fileName: string }) =>
    mutateApi(`/projects/${projectId}/documents`, { method: 'POST', body: JSON.stringify(data) }),
  deleteDocument: (projectId: string, documentId: string) =>
    mutateApi(`/projects/${projectId}/documents/${documentId}`, { method: 'DELETE' }),
  createAnnouncement: (projectId: string, data: { title: string; body: string; fileUrl?: string; fileName?: string; audienceEmployeeId?: string }) =>
    mutateApi(`/projects/${projectId}/announcements`, { method: 'POST', body: JSON.stringify(data) }),
  getAnnouncements: (projectId: string) => mutateApi(`/projects/${projectId}/announcements`),
  deleteAnnouncement: (projectId: string, announcementId: string) =>
    mutateApi(`/projects/${projectId}/announcements/${announcementId}`, { method: 'DELETE' }),
};

// Generic authenticated file upload, reused for announcement attachments —
// no dedicated upload plumbing needed for this feature.
export const uploadApi = {
  uploadFile: async (file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`${API_BASE}/upload/file`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.message || `Upload failed (${res.status})`);
    return json;
  },
  // Project/announcement attachments are stored as a relative path (e.g.
  // "/uploads/file-xyz.pdf") served by the BACKEND, not the frontend — a
  // plain <a href={fileUrl}> resolves against the frontend's own origin and
  // 404s. Fetching as a blob and triggering the save manually (same pattern
  // as exportApi.downloadFile) also sidesteps browsers silently ignoring
  // the `download` attribute on cross-origin links, so the file always
  // actually saves to disk instead of trying to open in-browser.
  downloadFile: async (fileUrl: string, fileName: string) => {
    const res = await fetch(`${API_ORIGIN}${fileUrl}`);
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download';
    a.click();
    window.URL.revokeObjectURL(url);
  },
};

export const analyticsApi = {
  getDashboardMetrics: () => fetchApi('/analytics/dashboard'),
  getRevenueTrend: () => fetchApi('/analytics/revenue-trend'),
  getRetention: () => fetchApi('/analytics/retention'),
};

export const authApi = {
  login: (data: any) => fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  // Public — no token exists yet, that's the whole point. Always resolves
  // successfully with the same generic message regardless of whether the
  // identifier matched a real account.
  requestPasswordReset: (identifier: string) => mutateApi('/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  }),
};

export const financeApi = {
  getDashboardMetrics: () => fetchApi('/finance/dashboard'),
  getExpenses: () => fetchApi('/finance/expenses'),
  getInvoices: () => fetchApi('/finance/invoices'),
  getIncomes: () => fetchApi('/finance/incomes'),
  getBudgets: () => fetchApi('/finance/budgets'),
  getPayments: () => fetchApi('/finance/payments'),
  getLedgerEntries: () => fetchApi('/finance/ledger'),
  getTaxRecords: () => fetchApi('/finance/taxes'),
  createExpense: (data: any) => fetchApi('/finance/expenses', { method: 'POST', body: JSON.stringify(data) }),
  createInvoice: (data: any) => fetchApi('/finance/invoices', { method: 'POST', body: JSON.stringify(data) }),
  createIncome: (data: any) => fetchApi('/finance/incomes', { method: 'POST', body: JSON.stringify(data) }),
  createPayment: (data: any) => fetchApi('/finance/payments', { method: 'POST', body: JSON.stringify(data) }),
  createLedgerEntry: (data: any) => fetchApi('/finance/ledger', { method: 'POST', body: JSON.stringify(data) }),
  createTaxRecord: (data: any) => fetchApi('/finance/taxes', { method: 'POST', body: JSON.stringify(data) }),
};

export const aiApi = {
  chat: (messages: any[]) => fetchApi('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  }),
};

export const notificationApi = {
  getNotifications: () => fetchApi('/notifications'),
  markAsRead: (id: string) => fetchApi(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllAsRead: () => fetchApi('/notifications/read-all', { method: 'PUT' }),
};

export const searchApi = {
  globalSearch: (q: string) => fetchApi(`/search?q=${encodeURIComponent(q)}`),
};

// ========== EXPORT API ==========
export const exportApi = {
  downloadFile: async (endpoint: string, filename: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      // A rejected export (e.g. a date range outside what's allowed) comes
      // back as a real JSON error body, not a file — surface that message
      // instead of a generic "Export failed" so the reason is visible.
      const body = await res.json().catch(() => null);
      const detail = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
      throw new Error(detail || 'Export failed');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  },
  exportEmployees: (format: string) => exportApi.downloadFile(`/export/employees?format=${format}`, `employees.${format}`),
  exportLeaves: (format: string) => exportApi.downloadFile(`/export/hrm/leaves?format=${format}`, `leave_history.${format}`),
  exportProducts: (format: string) => exportApi.downloadFile(`/export/inventory/products?format=${format}`, `products.${format}`),
  exportCustomers: (format: string) => exportApi.downloadFile(`/export/crm/customers?format=${format}`, `customers.${format}`),
  exportProjects: (format: string) => exportApi.downloadFile(`/export/projects?format=${format}`, `projects.${format}`),
  exportLedger: (format: string) => exportApi.downloadFile(`/export/finance/ledger?format=${format}`, `ledger.${format}`),
  exportExpenses: (format: string) => exportApi.downloadFile(`/export/finance/expenses?format=${format}`, `expenses.${format}`),
  exportAttendance: (format: string, month: number, year: number) => exportApi.downloadFile(`/export/hrm/attendance?format=${format}&month=${month}&year=${year}`, `attendance_${month}_${year}.${format}`),
  exportSelfAttendanceRange: (from: string, to: string) =>
    exportApi.downloadFile(`/export/self/attendance?from=${from}&to=${to}&format=xlsx`, `my_attendance_${from}_to_${to}.xlsx`),
  exportEmployeeAttendanceRange: (employeeId: string, from: string, to: string) =>
    exportApi.downloadFile(`/export/hrm/employees/${employeeId}/attendance?from=${from}&to=${to}&format=xlsx`, `attendance_${from}_to_${to}.xlsx`),
};

export const settingsApi = {
  getProfile: () => fetchApi('/auth/me'),
  // No self-service profile or password edits — every field on Settings >
  // My Profile is read-only, sourced from the Employee record. Changes only
  // happen through HR/Admin's Employee Directory (hrmApi.updateEmployee) or
  // password reset flow (hrmApi.resetUserPassword + the /portal inbox).
  getSessions: () => fetchApi('/auth/sessions'),
  revokeSession: (id: string) => fetchApi(`/auth/sessions/${id}`, { method: 'DELETE' }),
};

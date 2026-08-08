const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  createSupportTicket: (data: any) => fetchApi('/crm/tickets', { method: 'POST', body: JSON.stringify(data) }),
  createFollowUp: (data: any) => fetchApi('/crm/follow-ups', { method: 'POST', body: JSON.stringify(data) }),
  createLead: (data: any) => fetchApi('/crm/leads', { method: 'POST', body: JSON.stringify(data) }),
  createCustomer: (data: any) => fetchApi('/crm/customers', { method: 'POST', body: JSON.stringify(data) }),
  convertLead: (id: string) => fetchApi(`/crm/leads/${id}/convert`, { method: 'POST' }),
  updateSupportTicketStatus: (id: string, status: string) => fetchApi(`/crm/tickets/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
};

export const hrmApi = {
  getEmployees: () => fetchApi('/hrm/employees'),
  getEmployee: (id: string) => mutateApi(`/hrm/employees/${id}`),
  updateEmployee: (id: string, data: any) =>
    mutateApi(`/hrm/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setSalary: (id: string, data: any) =>
    mutateApi(`/hrm/employees/${id}/salary`, { method: 'PUT', body: JSON.stringify(data) }),
  getAttendance: () => fetchApi('/hrm/attendance'),
  getPayrolls: () => fetchApi('/hrm/payrolls'),
  getJobPostings: () => fetchApi('/hrm/jobs'),
  getApplicants: () => fetchApi('/hrm/applicants'),
  getLeaves: () => fetchApi('/hrm/leaves'),
  createEmployee: (data: any) => fetchApi('/hrm/employees', { method: 'POST', body: JSON.stringify(data) }),
  createPayroll: (data: any) => fetchApi('/hrm/payrolls', { method: 'POST', body: JSON.stringify(data) }),
  updatePayrollStatus: (id: string, status: string) => fetchApi(`/hrm/payrolls/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  createJobPosting: (data: any) => fetchApi('/hrm/jobs', { method: 'POST', body: JSON.stringify(data) }),
  createApplicant: (data: any) => fetchApi('/hrm/applicants', { method: 'POST', body: JSON.stringify(data) }),
  updateApplicantStatus: (id: string, status: string) => fetchApi(`/hrm/applicants/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  markAttendance: (data: any) => fetchApi('/hrm/attendance', { method: 'POST', body: JSON.stringify(data) }),
  requestLeave: (data: any) => fetchApi('/hrm/leaves', { method: 'POST', body: JSON.stringify(data) }),
  updateLeaveStatus: (id: string, status: string) => fetchApi(`/hrm/leaves/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getPerformanceReviews: () => fetchApi('/hrm/performance-reviews'),
  createPerformanceReview: (data: any) => fetchApi('/hrm/performance-reviews', { method: 'POST', body: JSON.stringify(data) }),
  getAttendanceStats: (date: string) => fetchApi(`/hrm/attendance/stats?date=${date}`),
  getAttendanceTrend: (year: number) => fetchApi(`/hrm/attendance/trend?year=${year}`),
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
  getTasks: () => fetchApi('/projects/tasks'),
  getTimesheets: () => fetchApi('/projects/timesheets'),
  createProject: (data: any) => fetchApi('/projects', { method: 'POST', body: JSON.stringify(data) }),
  createTask: (data: any) => fetchApi('/projects/tasks', { method: 'POST', body: JSON.stringify(data) }),
  createTimeLog: (data: any) => fetchApi('/projects/timesheets', { method: 'POST', body: JSON.stringify(data) }),
  updateTaskStatus: (id: string, status: string) => fetchApi(`/projects/tasks/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
};

export const analyticsApi = {
  getDashboardMetrics: () => fetchApi('/analytics/dashboard'),
  getRevenueTrend: () => fetchApi('/analytics/revenue-trend'),
};

export const authApi = {
  login: (data: any) => fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
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
  getSalesInsights: () => fetchApi('/ai/sales-insights'),
  getHrInsights: () => fetchApi('/ai/hr-insights'),
  getInventoryInsights: () => fetchApi('/ai/inventory-insights'),
  getExecutiveSummary: () => fetchApi('/ai/executive-summary'),
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
    if (!res.ok) throw new Error('Export failed');
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
};

export const settingsApi = {
  getProfile: () => fetchApi('/auth/me'),
  updateProfile: (data: any) => fetchApi('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) => fetchApi('/auth/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
  getSessions: () => fetchApi('/auth/sessions'),
  revokeSession: (id: string) => fetchApi(`/auth/sessions/${id}`, { method: 'DELETE' }),
};

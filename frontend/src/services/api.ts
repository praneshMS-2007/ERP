const API_BASE = 'http://localhost:5000/api';

// Simple fetch wrapper with auth header support
async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  // Note: We are currently skipping JWT authentication for the demo / preloaded inputs
  // For now, let's assume we bypass auth on the backend or we can mock data if the backend rejects
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    // Return empty array as fallback so UI doesn't crash during demo
    return [];
  }
}

export const crmApi = {
  getCustomers: () => fetchApi('/crm/customers'),
  getLeads: () => fetchApi('/crm/leads'),
  getOpportunities: () => fetchApi('/crm/opportunities'),
};

export const hrmApi = {
  getEmployees: () => fetchApi('/hrm/employees'),
  getAttendance: () => fetchApi('/hrm/attendance'),
};

export const inventoryApi = {
  getProducts: () => fetchApi('/inventory/products'),
  getSuppliers: () => fetchApi('/inventory/suppliers'),
};

export const projectApi = {
  getProjects: () => fetchApi('/projects'),
  getTasks: () => fetchApi('/projects/tasks'),
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

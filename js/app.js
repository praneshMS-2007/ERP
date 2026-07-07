// ============================================================
//  SHUROQ ERP – MAIN APP
// ============================================================

// ---- STATE ----
let currentPage = 'dashboard';
let currentParams = {};
let sidebarCollapsed = false;
let sidebarMobile = window.innerWidth <= 900;

// ---- ROUTER ----
const pageConfig = {
  dashboard:      { title: 'Dashboard',          breadcrumb: 'Dashboard' },
  crm:            { title: 'CRM Dashboard',       breadcrumb: 'CRM / Dashboard' },
  hrm:            { title: 'HR Dashboard',        breadcrumb: 'HRM / Dashboard' },
  employees:      { title: 'Employees',           breadcrumb: 'HRM / Employees' },
  profile:        { title: 'Employee Profile',    breadcrumb: 'HRM / Employee Profile' },
  attendance:     { title: 'Attendance',          breadcrumb: 'HRM / Attendance' },
  leaves:         { title: 'Leave Management',    breadcrumb: 'HRM / Leave Management' },
  performance:    { title: 'Performance',         breadcrumb: 'HRM / Performance' },
  inventory:      { title: 'Inventory Dashboard', breadcrumb: 'Inventory / Dashboard' },
  products:       { title: 'Products',            breadcrumb: 'Inventory / Products' },
  'stock-alerts': { title: 'Stock Alerts',        breadcrumb: 'Inventory / Stock Alerts' },
  projects:       { title: 'Projects',            breadcrumb: 'Projects' },
  'project-detail':{ title: 'Project Detail',    breadcrumb: 'Projects / Detail' },
  tasks:          { title: 'Task Board',          breadcrumb: 'Projects / Task Board' },
};

function navigate(page, params = {}) {
  currentPage = page;
  currentParams = params;

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById(`nav-${page}`) || document.getElementById(`nav-${page.split('-')[0]}`);
  if (navEl) navEl.classList.add('active');

  // Update breadcrumb and page title
  const cfg = pageConfig[page] || { title: page, breadcrumb: page };
  document.getElementById('breadcrumb').textContent = cfg.breadcrumb;
  document.title = `${cfg.title} – Shuroq ERP`;

  // Render page
  renderPage();

  // Close mobile sidebar
  if (sidebarMobile) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

function renderPage() {
  const content = document.getElementById('content');
  content.style.animation = 'none';
  content.offsetHeight; // force reflow
  content.style.animation = '';

  let html = '';

  switch (currentPage) {
    case 'dashboard':     html = renderMainDashboard(); break;
    case 'crm':           html = renderCRMModule(); break;
    case 'hrm':           html = renderHRDashboard(); break;
    case 'employees':     html = renderEmployeeList(); break;
    case 'profile':       html = renderEmployeeProfile(currentParams.id); break;
    case 'attendance':    html = renderAttendance(); break;
    case 'leaves':        html = renderLeaveManagement(); break;
    case 'performance':   html = renderPerformance(); break;
    case 'inventory':     html = renderInventoryDashboard(); break;
    case 'products':      html = renderProducts(); break;
    case 'stock-alerts':  html = renderStockAlerts(); break;
    case 'projects':      html = renderProjects(); break;
    case 'project-detail':html = renderProjectDetail(currentParams.id); break;
    case 'tasks':         html = renderTaskBoard(); break;
    default:              html = '<div class="empty-state"><h3>Page not found</h3></div>';
  }

  content.innerHTML = html;

  // Init charts after render
  requestAnimationFrame(() => {
    switch (currentPage) {
      case 'crm':        if (typeof populateCRMData === 'function') populateCRMData(); break;
      case 'hrm':        initHRDashboardCharts(); break;
      case 'employees':  initEmpPagination(); break;
      case 'attendance': initAttPagination(); break;
      case 'leaves':     initLeavePagination(); break;
      case 'performance':initPerformanceCharts(); break;
      case 'inventory':  initInventoryCharts(); break;
      case 'products':   initInvPagination(); break;
      case 'dashboard':  initDashboardCharts(); break;
    }
    updateAlertBadge();
  });
}

function refreshPage() {
  renderPage();
}

// ======================== MAIN DASHBOARD ==========================
function renderMainDashboard() {
  const totalEmp = DB.employees.length;
  const activeEmp = DB.employees.filter(e => e.status === 'Active').length;
  const totalProd = DB.products.length;
  const lowStock = DB.products.filter(p => p.stock <= p.minStock).length;
  const activeProj = DB.projects.filter(p => p.status === 'In Progress').length;
  const pendingLeaves = DB.leaves.filter(l => l.status === 'Pending').length;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `
    <div class="welcome-banner">
      <div>
        <div class="welcome-title">Good ${getGreeting()}, Pranesh! 👋</div>
        <div class="welcome-sub">${today} — Shuroq ERP Dashboard</div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary btn-sm" onclick="navigate('hrm')">View HR</button>
        <button class="btn btn-secondary btn-sm" onclick="navigate('inventory')">Inventory</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card" style="cursor:pointer;" onclick="navigate('employees')">
        <div class="kpi-header">
          <div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <span class="kpi-badge up">${activeEmp} active</span>
        </div>
        <div class="kpi-value">${totalEmp}</div>
        <div class="kpi-label">Total Employees</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="navigate('leaves')">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(245,158,11,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--amber)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <span class="kpi-badge ${pendingLeaves > 3 ? 'down' : 'up'}">${pendingLeaves} pending</span>
        </div>
        <div class="kpi-value" style="color:var(--amber)">${pendingLeaves}</div>
        <div class="kpi-label">Leave Requests</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="navigate('inventory')">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(20,184,166,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--teal)"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
          <span class="kpi-badge ${lowStock > 0 ? 'down' : 'up'}">${lowStock} low stock</span>
        </div>
        <div class="kpi-value" style="color:var(--teal)">${totalProd}</div>
        <div class="kpi-label">Inventory Items</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="navigate('projects')">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(34,197,94,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--green)"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
          <span class="kpi-badge up">${activeProj} active</span>
        </div>
        <div class="kpi-value" style="color:var(--green)">${DB.projects.length}</div>
        <div class="kpi-label">Projects</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">Attendance Overview – This Week</div>
        <div class="chart-wrap"><canvas id="dashAttChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Project Progress</div>
        <div class="chart-wrap"><canvas id="dashProjChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Inventory by Category</div>
        <div class="chart-wrap"><canvas id="dashInvChart"></canvas></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="section-card">
        <div class="section-card-title">Recent Projects</div>
        ${DB.projects.slice(0, 4).map(p => `
          <div style="padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;" onclick="viewProjectDetail('${p.id}')">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-weight:600;font-size:13.5px;">${p.name}</span>
              ${badge(p.status)}
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${p.progress}%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:4px;">
              <span>${p.progress}% complete</span>
              <span>${p.tasksDone}/${p.tasksTotal} tasks</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="section-card">
        <div class="section-card-title">⚠ Stock Alerts</div>
        ${DB.products.filter(p => p.stock <= p.minStock).slice(0, 5).map(p => {
          const st = stockStatus(p);
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-size:13px;font-weight:600;">${p.name}</div>
                <div style="font-size:11px;color:var(--text-muted);">${p.category}</div>
              </div>
              <div class="stock-indicator ${st.cls}"><div class="stock-dot"></div>${p.stock} left</div>
            </div>
          `;
        }).join('') || '<p style="color:var(--text-muted);text-align:center;padding:16px;font-size:13px;">All items well stocked ✓</p>'}
      </div>
    </div>
  `;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function initDashboardCharts() {
  destroyChart('dashAttChart');
  destroyChart('dashProjChart');
  destroyChart('dashInvChart');

  makeBarChart('dashAttChart',
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    [
      { label: 'Present', data: [7, 6, 7, 5, 7, 3, 0] },
      { label: 'Absent', data: [1, 2, 1, 3, 1, 0, 0] },
    ]
  );

  makeBarChart('dashProjChart',
    DB.projects.map(p => p.name.substring(0, 16) + '…'),
    [{ label: 'Progress %', data: DB.projects.map(p => p.progress) }]
  );

  const cats = {};
  DB.products.forEach(p => { cats[p.category] = (cats[p.category] || 0) + p.stock; });
  makeDoughnutChart('dashInvChart', Object.keys(cats), Object.values(cats));
}

// ======================== SIDEBAR TOGGLE ========================
document.getElementById('sidebarToggle').addEventListener('click', () => {
  if (sidebarMobile) return;
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
  document.getElementById('mainWrap').classList.toggle('sidebar-collapsed', sidebarCollapsed);
});

document.getElementById('topbarToggle').addEventListener('click', () => {
  if (sidebarMobile) {
    document.getElementById('sidebar').classList.toggle('mobile-open');
  } else {
    sidebarCollapsed = !sidebarCollapsed;
    document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
    document.getElementById('mainWrap').classList.toggle('sidebar-collapsed', sidebarCollapsed);
  }
});

// ======================== NAV CLICK ========================
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(el.dataset.page);
  });
});

// ======================== RESIZE ========================
window.addEventListener('resize', () => {
  const wasMobile = sidebarMobile;
  sidebarMobile = window.innerWidth <= 900;
  if (sidebarMobile !== wasMobile) {
    const sb = document.getElementById('sidebar');
    if (sidebarMobile) {
      sb.classList.remove('collapsed');
      document.getElementById('mainWrap').classList.remove('sidebar-collapsed');
    } else {
      sb.classList.remove('mobile-open');
    }
  }
});

// ======================== GLOBAL SEARCH ========================
document.getElementById('globalSearch').addEventListener('input', function() {
  const q = this.value.toLowerCase().trim();
  if (!q) return;
  
  // 1. Search Employees
  const empMatch = DB.employees.some(e =>
    `${e.firstName} ${e.lastName} ${e.email} ${e.id}`.toLowerCase().includes(q)
  );
  if (empMatch) { 
    empSearch = q; 
    navigate('employees'); 
    return; 
  }

  // 2. Search Products
  const prodMatch = DB.products.some(p =>
    `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q)
  );
  if (prodMatch) {
    invSearch = q;
    navigate('products');
    return;
  }

  // 3. Search Projects
  const projMatch = DB.projects.some(p =>
    `${p.name} ${p.description || ''}`.toLowerCase().includes(q)
  );
  if (projMatch) {
    navigate('projects');
    return;
  }
});

// ======================== NOTIFICATIONS SYSTEM ========================
let activeNotifs = [];

function initNotifications() {
  activeNotifs = [];
  
  // 1. Get low stock products
  if (DB.products) {
    DB.products.forEach(p => {
      if (p.stock <= p.minStock && p.status === 'Active') {
        activeNotifs.push({
          id: `stock-${p.id}`,
          title: `⚠️ Low Stock: ${p.name}`,
          desc: `Only ${p.stock} units remaining (min: ${p.minStock})`,
          time: 'Stock Alert',
          page: 'stock-alerts'
        });
      }
    });
  }

  // 2. Get pending leaves
  if (DB.leaves) {
    DB.leaves.forEach(l => {
      if (l.status === 'Pending') {
        activeNotifs.push({
          id: `leave-${l.id}`,
          title: `📅 Leave Requested`,
          desc: `${l.empName} applied for ${l.type} (${l.days} days)`,
          time: `Applied ${l.applied}`,
          page: 'leaves'
        });
      }
    });
  }

  const notifDot = document.getElementById('notifDot');
  if (notifDot) {
    notifDot.style.display = activeNotifs.length > 0 ? 'block' : 'none';
  }
}

function openNotificationsModal() {
  let bodyHTML = '';
  if (activeNotifs.length > 0) {
    bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; max-height:400px; overflow-y:auto; padding:8px 0;">
        ${activeNotifs.map(n => `
          <div style="background:var(--bg-input); border:1px solid var(--border); padding:12px; border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center; gap:16px;">
            <div style="flex:1;">
              <div style="font-weight:600; font-size:13px; color:var(--text-pri); margin-bottom:4px; text-align:left;">${n.title}</div>
              <div style="font-size:11px; color:var(--text-sec); text-align:left;">${n.desc}</div>
              <div style="font-size:9px; color:var(--text-muted); margin-top:4px; text-align:left;">${n.time}</div>
            </div>
            <button class="btn btn-primary btn-sm" style="flex-shrink:0;" onclick="closeModal(); navigate('${n.page}')">Go</button>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    bodyHTML = `
      <div style="padding:40px 20px; text-align:center; color:var(--text-muted);">
        <p style="margin:0 0 8px 0; font-size:16px;">✨ All caught up!</p>
        <p style="margin:0; font-size:12px;">No new alerts or pending tasks.</p>
      </div>
    `;
  }

  const footerHTML = activeNotifs.length > 0 
    ? `<button class="btn btn-secondary" onclick="clearAllNotifications()">Clear All</button>
       <button class="btn btn-primary" onclick="closeModal()">Close</button>`
    : `<button class="btn btn-primary" onclick="closeModal()">Close</button>`;

  openModal('System Notifications', bodyHTML, footerHTML);
}

function clearAllNotifications() {
  activeNotifs = [];
  const notifDot = document.getElementById('notifDot');
  if (notifDot) notifDot.style.display = 'none';
  openNotificationsModal();
}

// Bind button to open modal
document.getElementById('notifBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  openNotificationsModal();
});

// ======================== INITIAL LOAD ========================
initNotifications();
navigate('dashboard');

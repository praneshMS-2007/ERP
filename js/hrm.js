// ============================================================
//  SHUROQ ERP – HRM MODULE
// ============================================================

// ======================== HR DASHBOARD ==========================
function renderHRDashboard() {
  const emps = DB.employees;
  const active = emps.filter(e => e.status === 'Active').length;
  const todayAtt = DB.attendance.filter(a => a.date === '2026-06-26');
  const present = todayAtt.filter(a => a.status === 'Present').length;
  const pendingLeaves = DB.leaves.filter(l => l.status === 'Pending').length;

  const depts = {};
  emps.forEach(e => { depts[e.department] = (depts[e.department] || 0) + 1; });

  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>HR Dashboard</h1>
        <p>Overview of employee-related information</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="navigate('employees')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          Add Employee
        </button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <span class="kpi-badge up">+2 this month</span>
        </div>
        <div class="kpi-value">${emps.length}</div>
        <div class="kpi-label">Total Employees</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(20,184,166,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--teal)"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          <span class="kpi-badge up">↑ 94%</span>
        </div>
        <div class="kpi-value" style="color:var(--teal)">${active}</div>
        <div class="kpi-label">Active Employees</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(34,197,94,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--green)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg></div>
          <span class="kpi-badge up">Today</span>
        </div>
        <div class="kpi-value" style="color:var(--green)">${present}</div>
        <div class="kpi-label">Present Today</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(245,158,11,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--amber)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <span class="kpi-badge ${pendingLeaves > 3 ? 'down' : 'up'}">${pendingLeaves} pending</span>
        </div>
        <div class="kpi-value" style="color:var(--amber)">${pendingLeaves}</div>
        <div class="kpi-label">Pending Leave Requests</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">Attendance Trend – Last 7 Days</div>
        <div class="chart-wrap"><canvas id="attTrendChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Department Distribution</div>
        <div class="chart-wrap"><canvas id="deptChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Employee Growth (2024–2026)</div>
        <div class="chart-wrap"><canvas id="growthChart"></canvas></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="section-card">
        <div class="section-card-title">Recent Leave Requests</div>
        <div class="activity-list">
          ${DB.leaves.slice(0,4).map(l => `
            <div class="activity-item">
              <div class="activity-dot" style="background:${l.status==='Approved'?'var(--green)':l.status==='Rejected'?'var(--red)':'var(--amber)'}"></div>
              <div class="activity-content">
                <p><strong>${l.empName}</strong> — ${l.type}</p>
                <p>${fmtDate(l.from)} → ${fmtDate(l.to)} &nbsp; ${badge(l.status)}</p>
                <div class="time">${fmtDate(l.applied)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="section-card">
        <div class="section-card-title">Today's Attendance Updates</div>
        <div class="activity-list">
          ${todayAtt.slice(0,5).map(a => `
            <div class="activity-item">
              <div class="activity-dot" style="background:${a.status==='Present'?'var(--green)':a.status==='Absent'?'var(--red)':'var(--amber)'}"></div>
              <div class="activity-content">
                <p><strong>${a.empName}</strong></p>
                <p>Check In: ${a.checkIn} &nbsp;&nbsp; ${badge(a.status)}</p>
                <div class="time">${a.hours > 0 ? a.hours + ' hrs worked' : 'Not checked in'}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function initHRDashboardCharts() {
  destroyChart('attTrendChart');
  destroyChart('deptChart');
  destroyChart('growthChart');

  makeLineChart('attTrendChart',
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
    [
      { label: 'Present', data: [7, 6, 7, 5, 7, 3, 5] },
      { label: 'Absent', data: [1, 2, 1, 3, 1, 0, 1] },
    ]
  );

  const depts = {};
  DB.employees.forEach(e => { depts[e.department] = (depts[e.department] || 0) + 1; });
  makeDoughnutChart('deptChart', Object.keys(depts), Object.values(depts));

  makeLineChart('growthChart',
    ['Jan 2024', 'Apr 2024', 'Jul 2024', 'Oct 2024', 'Jan 2025', 'Apr 2025', 'Jul 2025', 'Jan 2026', 'Jun 2026'],
    [{ label: 'Headcount', data: [3, 4, 4, 5, 5, 6, 7, 8, 8] }]
  );
}

// ======================== EMPLOYEE LIST ==========================
let empPage = 1, empSearch = '', empDeptFilter = '', empStatusFilter = '';

function renderEmployeeList() {
  const depts = [...new Set(DB.employees.map(e => e.department))];
  let list = DB.employees;
  if (empSearch) list = filterList(list, empSearch, ['firstName', 'lastName', 'email', 'id', 'position']);
  if (empDeptFilter) list = list.filter(e => e.department === empDeptFilter);
  if (empStatusFilter) list = list.filter(e => e.status === empStatusFilter);
  const { items, total, pages } = paginate(list, empPage, 6);

  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Employees</h1>
        <p>${total} employee${total !== 1 ? 's' : ''} found</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddEmployeeModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Employee
        </button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <span class="table-title">Employee Directory</span>
        <div class="table-controls">
          <div class="tbl-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" id="empSearchInput" placeholder="Search name, email…" value="${empSearch}" oninput="empSearch=this.value;empPage=1;refreshPage()" />
          </div>
          <select class="tbl-select" onchange="empDeptFilter=this.value;empPage=1;refreshPage()">
            <option value="">All Depts</option>
            ${depts.map(d => `<option value="${d}" ${empDeptFilter===d?'selected':''}>${d}</option>`).join('')}
          </select>
          <select class="tbl-select" onchange="empStatusFilter=this.value;empPage=1;refreshPage()">
            <option value="">All Status</option>
            <option value="Active" ${empStatusFilter==='Active'?'selected':''}>Active</option>
            <option value="Inactive" ${empStatusFilter==='Inactive'?'selected':''}>Inactive</option>
          </select>
        </div>
      </div>
      <table class="data-table">
        <thead><tr>
          <th>Employee ID</th>
          <th>Name</th>
          <th>Department</th>
          <th>Position</th>
          <th>Email</th>
          <th>Status</th>
          <th>Actions</th>
        </tr></thead>
        <tbody>
          ${items.length === 0 ? `<tr><td colspan="7"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><h3>No employees found</h3><p>Try changing the search or filters</p></div></td></tr>` :
          items.map(e => `
            <tr>
              <td><span style="font-family:monospace;font-size:12px;background:var(--bg-input);padding:2px 8px;border-radius:4px;">${e.id}</span></td>
              <td>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div class="user-avatar" style="width:32px;height:32px;font-size:11px;border-radius:8px;">${e.avatar}</div>
                  <span>${e.firstName} ${e.lastName}</span>
                </div>
              </td>
              <td>${e.department}</td>
              <td>${e.position}</td>
              <td style="font-size:12.5px;">${e.email}</td>
              <td>${badge(e.status)}</td>
              <td>
                <div class="action-btns">
                  <button class="act-btn act-view" title="View Profile" onclick="viewEmployeeProfile('${e.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button class="act-btn act-edit" title="Edit" onclick="openEditEmployeeModal('${e.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="act-btn act-delete" title="Delete" onclick="deleteEmployee('${e.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="table-pagination" id="empPagination"></div>
    </div>
  `;
}

function initEmpPagination() {
  let list = DB.employees;
  if (empSearch) list = filterList(list, empSearch, ['firstName', 'lastName', 'email', 'id', 'position']);
  if (empDeptFilter) list = list.filter(e => e.department === empDeptFilter);
  if (empStatusFilter) list = list.filter(e => e.status === empStatusFilter);
  const { pages } = paginate(list, empPage, 6);
  const el = document.getElementById('empPagination');
  if (el) renderPagination(el, empPage, pages, (p) => { empPage = p; refreshPage(); });
}

// ---- Employee Form ----
function empFormHTML(emp = {}) {
  return `
    <div class="form-grid">
      <div class="form-section-title">Personal Information</div>
      <div class="form-group">
        <label class="form-label">First Name <span class="required">*</span></label>
        <input class="form-input" id="ef_firstName" value="${emp.firstName||''}" placeholder="First name" />
      </div>
      <div class="form-group">
        <label class="form-label">Last Name <span class="required">*</span></label>
        <input class="form-input" id="ef_lastName" value="${emp.lastName||''}" placeholder="Last name" />
      </div>
      <div class="form-group">
        <label class="form-label">Gender</label>
        <select class="form-select" id="ef_gender">
          <option value="">Select</option>
          <option ${emp.gender==='Male'?'selected':''}>Male</option>
          <option ${emp.gender==='Female'?'selected':''}>Female</option>
          <option ${emp.gender==='Other'?'selected':''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Date of Birth</label>
        <input class="form-input" type="date" id="ef_dob" value="${emp.dob||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Contact Number</label>
        <input class="form-input" id="ef_contact" value="${emp.contact||''}" placeholder="+91 XXXXX XXXXX" />
      </div>
      <div class="form-group">
        <label class="form-label">Email <span class="required">*</span></label>
        <input class="form-input" type="email" id="ef_email" value="${emp.email||''}" placeholder="email@shuroq.com" />
      </div>

      <div class="form-section-title">Employment Details</div>
      <div class="form-group">
        <label class="form-label">Department <span class="required">*</span></label>
        <select class="form-select" id="ef_department">
          <option value="">Select Department</option>
          ${['Engineering','HR','Sales','Design','Finance','Marketing','Operations','Infrastructure'].map(d => `<option ${emp.department===d?'selected':''}>${d}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Position <span class="required">*</span></label>
        <input class="form-input" id="ef_position" value="${emp.position||''}" placeholder="e.g. Senior Developer" />
      </div>
      <div class="form-group">
        <label class="form-label">Joining Date</label>
        <input class="form-input" type="date" id="ef_joinDate" value="${emp.joinDate||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Employment Type</label>
        <select class="form-select" id="ef_empType">
          <option value="">Select</option>
          <option ${emp.empType==='Full-time'?'selected':''}>Full-time</option>
          <option ${emp.empType==='Part-time'?'selected':''}>Part-time</option>
          <option ${emp.empType==='Contract'?'selected':''}>Contract</option>
          <option ${emp.empType==='Intern'?'selected':''}>Intern</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="ef_status">
          <option ${emp.status==='Active'||!emp.status?'selected':''}>Active</option>
          <option ${emp.status==='Inactive'?'selected':''}>Inactive</option>
        </select>
      </div>

      <div class="form-section-title">Address</div>
      <div class="form-group full">
        <label class="form-label">Address</label>
        <input class="form-input" id="ef_address" value="${emp.address||''}" placeholder="Street address" />
      </div>
      <div class="form-group">
        <label class="form-label">City</label>
        <input class="form-input" id="ef_city" value="${emp.city||''}" placeholder="City" />
      </div>
      <div class="form-group">
        <label class="form-label">State</label>
        <input class="form-input" id="ef_state" value="${emp.state||''}" placeholder="State" />
      </div>
      <div class="form-group">
        <label class="form-label">Country</label>
        <input class="form-input" id="ef_country" value="${emp.country||'India'}" placeholder="Country" />
      </div>
    </div>
  `;
}

function getEmpFormData() {
  return {
    firstName: document.getElementById('ef_firstName').value.trim(),
    lastName: document.getElementById('ef_lastName').value.trim(),
    gender: document.getElementById('ef_gender').value,
    dob: document.getElementById('ef_dob').value,
    contact: document.getElementById('ef_contact').value.trim(),
    email: document.getElementById('ef_email').value.trim(),
    department: document.getElementById('ef_department').value,
    position: document.getElementById('ef_position').value.trim(),
    joinDate: document.getElementById('ef_joinDate').value,
    empType: document.getElementById('ef_empType').value,
    status: document.getElementById('ef_status').value,
    address: document.getElementById('ef_address').value.trim(),
    city: document.getElementById('ef_city').value.trim(),
    state: document.getElementById('ef_state').value.trim(),
    country: document.getElementById('ef_country').value.trim(),
  };
}

function openAddEmployeeModal() {
  openModal('Add New Employee', empFormHTML(),
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveNewEmployee()">Save Employee</button>`,
    { large: true }
  );
}

function saveNewEmployee() {
  const data = getEmpFormData();
  if (!data.firstName || !data.lastName || !data.email || !data.department || !data.position) {
    showToast('Please fill all required fields', 'error'); return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    showToast('Please enter a valid email address', 'error'); return;
  }
  const emailExists = DB.employees.some(e => e.email.toLowerCase() === data.email.toLowerCase());
  if (emailExists) {
    showToast('An employee with this email already exists', 'error'); return;
  }
  const newEmp = { ...data, id: genId('EMP', DB.employees), avatar: (data.firstName[0] + data.lastName[0]).toUpperCase(), performanceRating: 3 };
  DB.employees.push(newEmp);
  saveData();
  closeModal();
  showToast(`${data.firstName} ${data.lastName} added successfully!`);
  refreshPage();
}

function openEditEmployeeModal(id) {
  const emp = DB.employees.find(e => e.id === id);
  if (!emp) return;
  openModal(`Edit – ${emp.firstName} ${emp.lastName}`, empFormHTML(emp),
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveEditEmployee('${id}')">Save Changes</button>`,
    { large: true }
  );
}

function saveEditEmployee(id) {
  const idx = DB.employees.findIndex(e => e.id === id);
  if (idx === -1) return;
  const data = getEmpFormData();
  if (!data.firstName || !data.lastName || !data.email) { showToast('Please fill required fields', 'error'); return; }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    showToast('Please enter a valid email address', 'error'); return;
  }
  const emailExists = DB.employees.some(e => e.email.toLowerCase() === data.email.toLowerCase() && e.id !== id);
  if (emailExists) {
    showToast('An employee with this email already exists', 'error'); return;
  }
  data.avatar = (data.firstName[0] + data.lastName[0]).toUpperCase();
  DB.employees[idx] = { ...DB.employees[idx], ...data };
  saveData();
  closeModal();
  showToast('Employee updated successfully!');
  refreshPage();
}

function deleteEmployee(id) {
  const emp = DB.employees.find(e => e.id === id);
  confirmAction(`Delete <strong>${emp.firstName} ${emp.lastName}</strong>? This cannot be undone.`, () => {
    DB.employees = DB.employees.filter(e => e.id !== id);
    
    // Cascade delete related records
    if (DB.attendance) DB.attendance = DB.attendance.filter(a => a.empId !== id);
    if (DB.leaves) DB.leaves = DB.leaves.filter(l => l.empId !== id);
    if (DB.performance) DB.performance = DB.performance.filter(p => p.empId !== id);
    
    saveData();
    showToast('Employee deleted and related records cascaded.', 'warning');
    refreshPage();
  });
}

// ======================== EMPLOYEE PROFILE ==========================
let profileTab = 'overview';

function viewEmployeeProfile(id) {
  profileTab = 'overview';
  navigate('profile', { id });
}

function renderEmployeeProfile(id) {
  const emp = DB.employees.find(e => e.id === id);
  if (!emp) return '<p>Employee not found</p>';

  const attRecords = DB.attendance.filter(a => a.empId === id).slice(0, 6);
  const leaveHistory = DB.leaves.filter(l => l.empId === id);
  const perfRecords = DB.performance.filter(p => p.empId === id);

  const tabs = { overview: 'Overview', attendance: 'Attendance', leave: 'Leave', performance: 'Performance' };

  const tabContent = {
    overview: `
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Employee ID</div><div class="info-value">${emp.id}</div></div>
        <div class="info-item"><div class="info-label">Department</div><div class="info-value">${emp.department}</div></div>
        <div class="info-item"><div class="info-label">Position</div><div class="info-value">${emp.position}</div></div>
        <div class="info-item"><div class="info-label">Employment Type</div><div class="info-value">${emp.empType}</div></div>
        <div class="info-item"><div class="info-label">Joining Date</div><div class="info-value">${fmtDate(emp.joinDate)}</div></div>
        <div class="info-item"><div class="info-label">Status</div><div class="info-value">${badge(emp.status)}</div></div>
        <div class="info-item"><div class="info-label">Email</div><div class="info-value">${emp.email}</div></div>
        <div class="info-item"><div class="info-label">Contact</div><div class="info-value">${emp.contact}</div></div>
        <div class="info-item"><div class="info-label">Gender</div><div class="info-value">${emp.gender}</div></div>
        <div class="info-item"><div class="info-label">Date of Birth</div><div class="info-value">${fmtDate(emp.dob)}</div></div>
        <div class="info-item"><div class="info-label">City</div><div class="info-value">${emp.city}, ${emp.state}</div></div>
        <div class="info-item"><div class="info-label">Country</div><div class="info-value">${emp.country}</div></div>
      </div>`,
    attendance: `
      <table class="data-table">
        <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr></thead>
        <tbody>
          ${attRecords.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No attendance records</td></tr>' :
            attRecords.map(a => `<tr><td>${fmtDate(a.date)}</td><td>${a.checkIn}</td><td>${a.checkOut}</td><td>${a.hours > 0 ? a.hours.toFixed(1) + 'h' : '—'}</td><td>${badge(a.status)}</td></tr>`).join('')}
        </tbody>
      </table>`,
    leave: `
      <table class="data-table">
        <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
        <tbody>
          ${leaveHistory.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No leave history</td></tr>' :
            leaveHistory.map(l => `<tr><td>${l.type}</td><td>${fmtDate(l.from)}</td><td>${fmtDate(l.to)}</td><td>${l.days}</td><td>${badge(l.status)}</td></tr>`).join('')}
        </tbody>
      </table>`,
    performance: `
      ${perfRecords.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:24px;">No performance reviews yet</p>' :
        perfRecords.map(p => `
          <div class="section-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
              <div><strong>${p.quarter}</strong> &nbsp; Reviewed by: ${p.reviewer}</div>
              ${starsHTML(p.rating)}
            </div>
            <p style="font-size:13px;color:var(--text-sec);">${p.review}</p>
            <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">Goal: ${p.goals}</p>
          </div>`).join('')}`,
  };

  return `
    <div class="page-header">
      <div class="page-header-left">
        <button class="btn btn-secondary btn-sm" onclick="navigate('employees')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to List
        </button>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="openEditEmployeeModal('${id}')">Edit Employee</button>
      </div>
    </div>

    <div class="profile-header">
      <div class="profile-avatar">${emp.avatar}</div>
      <div class="profile-info">
        <h2>${emp.firstName} ${emp.lastName}</h2>
        <p>${emp.position} — ${emp.department}</p>
        <div class="profile-meta">
          <span>${badge(emp.status)}</span>
          <span style="color:var(--text-muted);">📧 ${emp.email}</span>
          <span style="color:var(--text-muted);">📍 ${emp.city}, ${emp.country}</span>
          <span style="color:var(--text-muted);">🗓 Joined ${fmtDate(emp.joinDate)}</span>
        </div>
      </div>
      <div style="margin-left:auto;text-align:right;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Performance Rating</div>
        ${starsHTML(emp.performanceRating)}
      </div>
    </div>

    <div class="tabs">
      ${Object.entries(tabs).map(([k, v]) => `<button class="tab-btn ${profileTab === k ? 'active' : ''}" onclick="profileTab='${k}';document.getElementById('tabContent').innerHTML=getProfileTabContent('${id}','${k}');">${v}</button>`).join('')}
    </div>

    <div id="tabContent">
      ${tabContent[profileTab]}
    </div>
  `;
}

function getProfileTabContent(id, tab) {
  profileTab = tab;
  const tmp = document.createElement('div');
  tmp.innerHTML = renderEmployeeProfile(id);
  return tmp.querySelector('#tabContent')?.innerHTML || '';
}

// ======================== ATTENDANCE ==========================
let attPage = 1, attSearch = '', attDeptFilter = '', attStatusFilter = '', attDateFilter = '2026-06-26';

function renderAttendance() {
  let list = DB.attendance;
  if (attDateFilter) list = list.filter(a => a.date === attDateFilter);
  if (attSearch) list = filterList(list, attSearch, ['empName', 'empId']);
  if (attStatusFilter) list = list.filter(a => a.status === attStatusFilter);

  const present = list.filter(a => a.status === 'Present').length;
  const absent = list.filter(a => a.status === 'Absent').length;
  const late = list.filter(a => a.status === 'Late').length;
  const half = list.filter(a => a.status === 'Half Day').length;

  const { items, total, pages } = paginate(list, attPage, 8);

  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Attendance</h1>
        <p>Track employee check-ins and check-outs</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openMarkAttendanceModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Mark Attendance
        </button>
      </div>
    </div>

    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);">
      <div class="kpi-card" style="--card-color:var(--green)">
        <div class="kpi-value" style="color:var(--green)">${present}</div>
        <div class="kpi-label">Present</div>
      </div>
      <div class="kpi-card" style="--card-color:var(--red)">
        <div class="kpi-value" style="color:var(--red)">${absent}</div>
        <div class="kpi-label">Absent</div>
      </div>
      <div class="kpi-card" style="--card-color:var(--amber)">
        <div class="kpi-value" style="color:var(--amber)">${late}</div>
        <div class="kpi-label">Late</div>
      </div>
      <div class="kpi-card" style="--card-color:var(--teal)">
        <div class="kpi-value" style="color:var(--teal)">${half}</div>
        <div class="kpi-label">Half Day</div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <span class="table-title">Attendance Records</span>
        <div class="table-controls">
          <input type="date" class="form-input" style="width:auto;padding:6px 10px;" value="${attDateFilter}" onchange="attDateFilter=this.value;attPage=1;refreshPage()" />
          <div class="tbl-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Search employee…" value="${attSearch}" oninput="attSearch=this.value;attPage=1;refreshPage()" />
          </div>
          <select class="tbl-select" onchange="attStatusFilter=this.value;attPage=1;refreshPage()">
            <option value="">All Status</option>
            <option ${attStatusFilter==='Present'?'selected':''}>Present</option>
            <option ${attStatusFilter==='Absent'?'selected':''}>Absent</option>
            <option ${attStatusFilter==='Late'?'selected':''}>Late</option>
            <option ${attStatusFilter==='Half Day'?'selected':''}>Half Day</option>
          </select>
        </div>
      </div>
      <table class="data-table">
        <thead><tr><th>Employee</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr></thead>
        <tbody>
          ${items.length === 0 ? '<tr><td colspan="6"><div class="empty-state"><h3>No records</h3></div></td></tr>' :
          items.map(a => `<tr>
            <td>${a.empName}</td>
            <td>${fmtDate(a.date)}</td>
            <td>${a.checkIn}</td>
            <td>${a.checkOut}</td>
            <td>${a.hours > 0 ? a.hours.toFixed(1) + 'h' : '—'}</td>
            <td>${badge(a.status)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="table-pagination" id="attPagination"></div>
    </div>
  `;
}

function initAttPagination() {
  let list = DB.attendance;
  if (attDateFilter) list = list.filter(a => a.date === attDateFilter);
  if (attSearch) list = filterList(list, attSearch, ['empName', 'empId']);
  if (attStatusFilter) list = list.filter(a => a.status === attStatusFilter);
  const { pages } = paginate(list, attPage, 8);
  const el = document.getElementById('attPagination');
  if (el) renderPagination(el, attPage, pages, (p) => { attPage = p; refreshPage(); });
}

function openMarkAttendanceModal() {
  const today = new Date().toISOString().split('T')[0];
  const empOptions = DB.employees.filter(e => e.status === 'Active')
    .map(e => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('');
  openModal('Mark Attendance', `
    <div class="form-grid cols-2">
      <div class="form-group">
        <label class="form-label">Employee</label>
        <select class="form-select" id="att_emp">${empOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" type="date" id="att_date" value="${today}" />
      </div>
      <div class="form-group">
        <label class="form-label">Check In</label>
        <input class="form-input" type="time" id="att_in" value="09:00" />
      </div>
      <div class="form-group">
        <label class="form-label">Check Out</label>
        <input class="form-input" type="time" id="att_out" value="18:00" />
      </div>
      <div class="form-group full">
        <label class="form-label">Status</label>
        <select class="form-select" id="att_status">
          <option>Present</option><option>Late</option><option>Half Day</option><option>Absent</option>
        </select>
      </div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveAttendance()">Save</button>`);
}

function saveAttendance() {
  const empId = document.getElementById('att_emp').value;
  const emp = DB.employees.find(e => e.id === empId);
  const checkIn = document.getElementById('att_in').value;
  const checkOut = document.getElementById('att_out').value;
  const status = document.getElementById('att_status').value;
  const date = document.getElementById('att_date').value;
  
  if (!date) { showToast('Please select a date', 'error'); return; }
  const today = new Date();
  const inputDate = new Date(date);
  today.setHours(0,0,0,0);
  inputDate.setHours(0,0,0,0);
  if (inputDate > today) { showToast('Attendance cannot be marked for future dates', 'error'); return; }
  
  const [h1, m1] = checkIn.split(':').map(Number);
  const [h2, m2] = checkOut.split(':').map(Number);
  const hours = Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
  DB.attendance.push({ id: genId('ATT', DB.attendance), empId, empName: `${emp.firstName} ${emp.lastName}`, date, checkIn, checkOut, status, hours: +hours.toFixed(2) });
  saveData();
  closeModal();
  showToast('Attendance marked successfully!');
  refreshPage();
}

// ======================== LEAVE MANAGEMENT ==========================
let leavePage = 1, leaveStatusFilter = '';

function renderLeaveManagement() {
  let list = DB.leaves;
  if (leaveStatusFilter) list = list.filter(l => l.status === leaveStatusFilter);
  const { items, total, pages } = paginate(list, leavePage, 7);

  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Leave Management</h1>
        <p>Manage employee leave requests and approvals</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openApplyLeaveModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Apply Leave
        </button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <span class="table-title">Leave Requests (${total})</span>
        <div class="table-controls">
          <select class="tbl-select" onchange="leaveStatusFilter=this.value;leavePage=1;refreshPage()">
            <option value="">All Status</option>
            <option ${leaveStatusFilter==='Pending'?'selected':''}>Pending</option>
            <option ${leaveStatusFilter==='Approved'?'selected':''}>Approved</option>
            <option ${leaveStatusFilter==='Rejected'?'selected':''}>Rejected</option>
          </select>
        </div>
      </div>
      <table class="data-table">
        <thead><tr><th>Employee</th><th>Leave Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${items.map(l => `<tr>
            <td>${l.empName}</td>
            <td>${l.type}</td>
            <td>${fmtDate(l.from)}</td>
            <td>${fmtDate(l.to)}</td>
            <td>${l.days}</td>
            <td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.reason}</td>
            <td>${badge(l.status)}</td>
            <td>
              <div class="action-btns">
                ${l.status === 'Pending' ? `
                  <button class="act-btn act-approve" title="Approve" onclick="updateLeave('${l.id}','Approved')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button class="act-btn act-reject" title="Reject" onclick="updateLeave('${l.id}','Rejected')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                ` : `<span style="font-size:12px;color:var(--text-muted);">${l.status}</span>`}
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="table-pagination" id="leavePagination"></div>
    </div>
  `;
}

function initLeavePagination() {
  let list = DB.leaves;
  if (leaveStatusFilter) list = list.filter(l => l.status === leaveStatusFilter);
  const { pages } = paginate(list, leavePage, 7);
  const el = document.getElementById('leavePagination');
  if (el) renderPagination(el, leavePage, pages, (p) => { leavePage = p; refreshPage(); });
}

function updateLeave(id, status) {
  const l = DB.leaves.find(x => x.id === id);
  if (!l) return;
  l.status = status;
  saveData();
  showToast(`Leave ${status.toLowerCase()} for ${l.empName}`, status === 'Approved' ? 'success' : 'warning');
  refreshPage();
}

function openApplyLeaveModal() {
  const empOptions = DB.employees.filter(e => e.status === 'Active')
    .map(e => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('');
  openModal('Apply for Leave', `
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Employee</label>
        <select class="form-select" id="lv_emp">${empOptions}</select>
      </div>
      <div class="form-group full">
        <label class="form-label">Leave Type</label>
        <select class="form-select" id="lv_type">
          <option>Casual Leave</option><option>Sick Leave</option><option>Annual Leave</option><option>Maternity Leave</option><option>Paternity Leave</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">From Date</label>
        <input class="form-input" type="date" id="lv_from" />
      </div>
      <div class="form-group">
        <label class="form-label">To Date</label>
        <input class="form-input" type="date" id="lv_to" />
      </div>
      <div class="form-group full">
        <label class="form-label">Reason</label>
        <textarea class="form-textarea" id="lv_reason" placeholder="Reason for leave…"></textarea>
      </div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveLeave()">Submit</button>`);
}

function saveLeave() {
  const empId = document.getElementById('lv_emp').value;
  const emp = DB.employees.find(e => e.id === empId);
  const from = document.getElementById('lv_from').value;
  const to = document.getElementById('lv_to').value;
  const reason = document.getElementById('lv_reason').value.trim();
  if (!from || !to) { showToast('Please select dates', 'error'); return; }
  if (new Date(to) < new Date(from)) { showToast('End date cannot be earlier than start date', 'error'); return; }
  if (!reason) { showToast('Please provide a reason for leave', 'error'); return; }
  const days = Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1;
  DB.leaves.push({ id: genId('LEA', DB.leaves), empId, empName: `${emp.firstName} ${emp.lastName}`, type: document.getElementById('lv_type').value, from, to, days, reason, status: 'Pending', applied: new Date().toISOString().split('T')[0] });
  saveData();
  closeModal();
  showToast('Leave application submitted!');
  refreshPage();
}

// ======================== PERFORMANCE ==========================
function renderPerformance() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Performance Tracking</h1>
        <p>Employee evaluations and performance ratings</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddReviewModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Review
        </button>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">Rating Distribution</div>
        <div class="chart-wrap"><canvas id="ratingChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Department Avg. Rating</div>
        <div class="chart-wrap"><canvas id="deptRatingChart"></canvas></div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar"><span class="table-title">Performance Reviews</span></div>
      <table class="data-table">
        <thead><tr><th>Employee</th><th>Quarter</th><th>Rating</th><th>Review</th><th>Goals</th><th>Reviewer</th></tr></thead>
        <tbody>
          ${DB.performance.map(p => `<tr>
            <td>${p.empName}</td>
            <td>${p.quarter}</td>
            <td>${starsHTML(p.rating)}</td>
            <td style="font-size:12px;max-width:220px;">${p.review.substring(0,80)}…</td>
            <td style="font-size:12px;max-width:160px;">${p.goals}</td>
            <td>${p.reviewer}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function initPerformanceCharts() {
  destroyChart('ratingChart');
  destroyChart('deptRatingChart');
  const ratings = [0, 0, 0, 0, 0];
  DB.performance.forEach(p => { if (p.rating >= 1 && p.rating <= 5) ratings[p.rating - 1]++; });
  makeBarChart('ratingChart', ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'], [{ label: 'Count', data: ratings }]);

  const depts = {};
  DB.employees.forEach(e => {
    const perf = DB.performance.filter(p => p.empId === e.id);
    if (perf.length > 0) {
      const avg = perf.reduce((s, p) => s + p.rating, 0) / perf.length;
      depts[e.department] = depts[e.department] || [];
      depts[e.department].push(avg);
    }
  });
  const deptLabels = Object.keys(depts);
  const deptAvgs = deptLabels.map(d => +(depts[d].reduce((s, v) => s + v, 0) / depts[d].length).toFixed(1));
  makeBarChart('deptRatingChart', deptLabels, [{ label: 'Avg Rating', data: deptAvgs }]);
}

function openAddReviewModal() {
  const empOptions = DB.employees.map(e => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('');
  openModal('Add Performance Review', `
    <div class="form-grid">
      <div class="form-group full"><label class="form-label">Employee</label><select class="form-select" id="pr_emp">${empOptions}</select></div>
      <div class="form-group"><label class="form-label">Quarter</label><select class="form-select" id="pr_q"><option>Q1 2026</option><option selected>Q2 2026</option><option>Q3 2026</option><option>Q4 2026</option></select></div>
      <div class="form-group"><label class="form-label">Rating (1–5)</label><input class="form-input" type="number" id="pr_rating" min="1" max="5" value="4" /></div>
      <div class="form-group"><label class="form-label">Reviewer</label><input class="form-input" id="pr_reviewer" value="Admin" /></div>
      <div class="form-group"><label class="form-label">Goals</label><input class="form-input" id="pr_goals" placeholder="Quarter goals…" /></div>
      <div class="form-group full"><label class="form-label">Review</label><textarea class="form-textarea" id="pr_review" placeholder="Performance review notes…"></textarea></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveReview()">Save Review</button>`);
}

function saveReview() {
  const empId = document.getElementById('pr_emp').value;
  const emp = DB.employees.find(e => e.id === empId);
  const rating = +document.getElementById('pr_rating').value;
  if (!rating || rating < 1 || rating > 5) { showToast('Rating must be 1–5', 'error'); return; }
  DB.performance.push({ id: genId('PER', DB.performance), empId, empName: `${emp.firstName} ${emp.lastName}`, quarter: document.getElementById('pr_q').value, rating, review: document.getElementById('pr_review').value, goals: document.getElementById('pr_goals').value, reviewer: document.getElementById('pr_reviewer').value });
  emp.performanceRating = rating;
  saveData();
  closeModal();
  showToast('Performance review saved!');
  refreshPage();
}

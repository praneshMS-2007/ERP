// ============================================================
//  SHUROQ ERP – CRM MODULE (Premium)
// ============================================================

let crmPage = 1, crmLeadPage = 1, crmOppPage = 1;
let crmCustSearch = '', crmLeadSearch = '', crmOppSearch = '';
let crmLeadStatusFilter = '', crmOppStageFilter = '';
const CRM_PER_PAGE = 6;

// ======================== CRM DASHBOARD ==========================
function renderCRMModule() {
  const totalCust = DB.customers.length;
  const totalLeads = DB.leads.length;
  const activeLeads = DB.leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').length;
  const totalPipeline = DB.opportunities.filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost').reduce((s, o) => s + o.value, 0);
  const wonDeals = DB.opportunities.filter(o => o.stage === 'Closed Won');
  const totalDeals = DB.opportunities.length;
  const winRate = totalDeals > 0 ? Math.round((wonDeals.length / totalDeals) * 100) : 0;
  const wonValue = wonDeals.reduce((s, o) => s + o.value, 0);
  const upcomingFollowUps = DB.followUps.filter(f => new Date(f.nextActionDate) >= new Date()).length;

  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>CRM Dashboard</h1>
        <p>Manage your sales pipeline, leads, customers, and opportunities</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddLeadModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Lead
        </button>
        <button class="btn btn-secondary" onclick="openAddCustomerModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          New Customer
        </button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card" style="cursor:pointer" onclick="navigate('crm-customers')">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(99,102,241,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <span class="kpi-badge up">${totalCust} total</span>
        </div>
        <div class="kpi-value">${totalCust}</div>
        <div class="kpi-label">Customers</div>
      </div>
      <div class="kpi-card" style="cursor:pointer" onclick="navigate('crm-leads')">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(20,184,166,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--teal)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <span class="kpi-badge ${activeLeads > 3 ? 'up' : 'down'}">${activeLeads} active</span>
        </div>
        <div class="kpi-value" style="color:var(--teal)">${totalLeads}</div>
        <div class="kpi-label">Total Leads</div>
      </div>
      <div class="kpi-card" style="cursor:pointer" onclick="navigate('crm-opportunities')">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(245,158,11,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--amber)"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <span class="kpi-badge up">₹${(totalPipeline/1000).toFixed(0)}K</span>
        </div>
        <div class="kpi-value" style="color:var(--amber)">₹${(totalPipeline/100000).toFixed(1)}L</div>
        <div class="kpi-label">Pipeline Value</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(34,197,94,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--green)"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
          <span class="kpi-badge ${winRate >= 30 ? 'up' : 'down'}">${wonDeals.length} won</span>
        </div>
        <div class="kpi-value" style="color:var(--green)">${winRate}%</div>
        <div class="kpi-label">Win Rate</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">Sales Pipeline</div>
        <div class="chart-wrap"><canvas id="crmPipelineChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Lead Status Breakdown</div>
        <div class="chart-wrap"><canvas id="crmLeadChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Revenue Won vs Lost</div>
        <div class="chart-wrap"><canvas id="crmRevenueChart"></canvas></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="section-card">
        <div class="section-card-title">🔥 Recent Leads</div>
        ${DB.leads.slice(0, 5).map(l => `
          <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:600;font-size:13.5px;">${l.name}</div>
              <div style="font-size:11px;color:var(--text-muted);">${l.company || ''} • ${l.source || ''}</div>
            </div>
            ${badge(l.status)}
          </div>
        `).join('')}
        <div style="text-align:center;padding-top:12px;">
          <button class="btn btn-secondary btn-sm" onclick="navigate('crm-leads')">View All Leads →</button>
        </div>
      </div>
      <div class="section-card">
        <div class="section-card-title">📅 Upcoming Follow-ups</div>
        ${DB.followUps.filter(f => new Date(f.nextActionDate) >= new Date()).slice(0, 5).map(f => {
          const entity = f.customerId ? DB.customers.find(c => c.id === f.customerId) : DB.leads.find(l => l.id === f.leadId);
          return `
            <div style="padding:10px 0;border-bottom:1px solid var(--border);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-weight:600;font-size:13px;">${entity ? entity.name : 'Unknown'}</span>
                <span style="font-size:11px;color:var(--accent-light);">${f.nextActionDate}</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);line-height:1.4;">${f.notes}</div>
            </div>
          `;
        }).join('') || '<p style="color:var(--text-muted);text-align:center;padding:16px;font-size:13px;">No upcoming follow-ups ✓</p>'}
        <div style="text-align:center;padding-top:12px;">
          <button class="btn btn-secondary btn-sm" onclick="openAddFollowUpModal()">+ Add Follow-up</button>
        </div>
      </div>
    </div>
  `;
}

function initCRMCharts() {
  destroyChart('crmPipelineChart');
  destroyChart('crmLeadChart');
  destroyChart('crmRevenueChart');

  // Pipeline by stage
  const stages = ['Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
  const stageCounts = stages.map(s => DB.opportunities.filter(o => o.stage === s).length);
  makeDoughnutChart('crmPipelineChart', stages, stageCounts);

  // Lead status
  const leadStatuses = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];
  const leadCounts = leadStatuses.map(s => DB.leads.filter(l => l.status === s).length);
  makeBarChart('crmLeadChart', leadStatuses, [{ label: 'Leads', data: leadCounts }]);

  // Revenue: won vs lost
  const wonVal = DB.opportunities.filter(o => o.stage === 'Closed Won').reduce((s, o) => s + o.value, 0);
  const lostVal = DB.opportunities.filter(o => o.stage === 'Closed Lost').reduce((s, o) => s + o.value, 0);
  const openVal = DB.opportunities.filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost').reduce((s, o) => s + o.value, 0);
  makeBarChart('crmRevenueChart', ['Won', 'Lost', 'Open Pipeline'], [{ label: 'Value (₹)', data: [wonVal, lostVal, openVal] }]);
}

// ======================== CUSTOMERS PAGE ==========================
function renderCRMCustomers() {
  let list = DB.customers;
  if (crmCustSearch) list = list.filter(c => `${c.name} ${c.email} ${c.company}`.toLowerCase().includes(crmCustSearch.toLowerCase()));

  const paged = paginate(list, crmPage, CRM_PER_PAGE);
  
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Customers</h1>
        <p>Manage your customer relationships</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="navigate('crm')">← Back to CRM</button>
        <button class="btn btn-primary" onclick="openAddCustomerModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Customer
        </button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div class="table-title">All Customers (${list.length})</div>
        <div class="table-controls">
          <div class="tbl-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Search name, email…" value="${crmCustSearch}" oninput="crmCustSearch=this.value;crmPage=1;refreshPage()" />
          </div>
        </div>
      </div>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Total Value</th><th>Actions</th></tr></thead>
        <tbody>
          ${paged.items.map(c => `
            <tr>
              <td style="font-weight:600;">${c.name}</td>
              <td>${c.email || '—'}</td>
              <td>${c.phone || '—'}</td>
              <td>${c.company || '—'}</td>
              <td style="font-weight:600;color:var(--green);">₹${(c.totalValue || 0).toLocaleString()}</td>
              <td>
                <div class="action-btns">
                  <button class="act-btn act-edit" onclick="openEditCustomerModal('${c.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                  <button class="act-btn act-delete" onclick="deleteCRMEntity('customers','${c.id}','${c.name}')" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </div>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No customers found</td></tr>'}
        </tbody>
      </table>
      ${renderCRMPagination(paged, 'crmPage')}
    </div>
  `;
}

// ======================== LEADS PAGE ==========================
function renderCRMLeads() {
  let list = DB.leads;
  if (crmLeadSearch) list = list.filter(l => `${l.name} ${l.email} ${l.company}`.toLowerCase().includes(crmLeadSearch.toLowerCase()));
  if (crmLeadStatusFilter) list = list.filter(l => l.status === crmLeadStatusFilter);

  const paged = paginate(list, crmLeadPage, CRM_PER_PAGE);
  
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Leads</h1>
        <p>Track and convert your sales leads</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="navigate('crm')">← Back to CRM</button>
        <button class="btn btn-primary" onclick="openAddLeadModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Lead
        </button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div class="table-title">All Leads (${list.length})</div>
        <div class="table-controls">
          <div class="tbl-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Search leads…" value="${crmLeadSearch}" oninput="crmLeadSearch=this.value;crmLeadPage=1;refreshPage()" />
          </div>
          <select class="tbl-select" onchange="crmLeadStatusFilter=this.value;crmLeadPage=1;refreshPage()">
            <option value="">All Status</option>
            <option value="New" ${crmLeadStatusFilter==='New'?'selected':''}>New</option>
            <option value="Contacted" ${crmLeadStatusFilter==='Contacted'?'selected':''}>Contacted</option>
            <option value="Qualified" ${crmLeadStatusFilter==='Qualified'?'selected':''}>Qualified</option>
            <option value="Converted" ${crmLeadStatusFilter==='Converted'?'selected':''}>Converted</option>
            <option value="Lost" ${crmLeadStatusFilter==='Lost'?'selected':''}>Lost</option>
          </select>
        </div>
      </div>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Source</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${paged.items.map(l => `
            <tr>
              <td style="font-weight:600;">${l.name}</td>
              <td>${l.email || '—'}</td>
              <td>${l.company || '—'}</td>
              <td><span style="font-size:11.5px;background:var(--bg-input);padding:3px 8px;border-radius:4px;color:var(--text-sec);">${l.source || '—'}</span></td>
              <td>${badge(l.status)}</td>
              <td>
                <div class="action-btns">
                  <button class="act-btn act-edit" onclick="openEditLeadModal('${l.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                  ${l.status !== 'Converted' && l.status !== 'Lost' ? `<button class="act-btn act-approve" onclick="convertLead('${l.id}')" title="Convert to Customer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></button>` : ''}
                  <button class="act-btn act-delete" onclick="deleteCRMEntity('leads','${l.id}','${l.name}')" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </div>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No leads found</td></tr>'}
        </tbody>
      </table>
      ${renderCRMPagination(paged, 'crmLeadPage')}
    </div>
  `;
}

// ======================== OPPORTUNITIES PAGE ==========================
function renderCRMOpportunities() {
  let list = DB.opportunities;
  if (crmOppSearch) list = list.filter(o => {
    const cust = DB.customers.find(c => c.id === o.customerId);
    return `${cust ? cust.name : ''} ${o.description || ''}`.toLowerCase().includes(crmOppSearch.toLowerCase());
  });
  if (crmOppStageFilter) list = list.filter(o => o.stage === crmOppStageFilter);

  const paged = paginate(list, crmOppPage, CRM_PER_PAGE);
  
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Opportunities</h1>
        <p>Track deals across your sales pipeline</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="navigate('crm')">← Back to CRM</button>
        <button class="btn btn-primary" onclick="openAddOpportunityModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Opportunity
        </button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div class="table-title">All Opportunities (${list.length})</div>
        <div class="table-controls">
          <div class="tbl-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Search opportunities…" value="${crmOppSearch}" oninput="crmOppSearch=this.value;crmOppPage=1;refreshPage()" />
          </div>
          <select class="tbl-select" onchange="crmOppStageFilter=this.value;crmOppPage=1;refreshPage()">
            <option value="">All Stages</option>
            <option value="Discovery" ${crmOppStageFilter==='Discovery'?'selected':''}>Discovery</option>
            <option value="Proposal" ${crmOppStageFilter==='Proposal'?'selected':''}>Proposal</option>
            <option value="Negotiation" ${crmOppStageFilter==='Negotiation'?'selected':''}>Negotiation</option>
            <option value="Closed Won" ${crmOppStageFilter==='Closed Won'?'selected':''}>Closed Won</option>
            <option value="Closed Lost" ${crmOppStageFilter==='Closed Lost'?'selected':''}>Closed Lost</option>
          </select>
        </div>
      </div>
      <table class="data-table">
        <thead><tr><th>Customer</th><th>Description</th><th>Value</th><th>Stage</th><th>Close Date</th><th>Actions</th></tr></thead>
        <tbody>
          ${paged.items.map(o => {
            const cust = DB.customers.find(c => c.id === o.customerId);
            return `
              <tr>
                <td style="font-weight:600;">${cust ? cust.name : o.customerId}</td>
                <td style="color:var(--text-sec);font-size:12.5px;">${o.description || '—'}</td>
                <td style="font-weight:700;color:var(--green);">₹${o.value.toLocaleString()}</td>
                <td>${badge(o.stage)}</td>
                <td>${o.expectedCloseDate || '—'}</td>
                <td>
                  <div class="action-btns">
                    <button class="act-btn act-edit" onclick="openEditOpportunityModal('${o.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="act-btn act-delete" onclick="deleteCRMEntity('opportunities','${o.id}','Deal #${o.id}')" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                  </div>
                </td>
              </tr>
            `;
          }).join('') || '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No opportunities found</td></tr>'}
        </tbody>
      </table>
      ${renderCRMPagination(paged, 'crmOppPage')}
    </div>
  `;
}

// ======================== PAGINATION HELPER ==========================
function renderCRMPagination(paged, pageVar) {
  if (paged.totalPages <= 1) return '';
  let btns = '';
  for (let i = 1; i <= paged.totalPages; i++) {
    btns += `<button class="page-btn ${i === paged.page ? 'active' : ''}" onclick="${pageVar}=${i};refreshPage()">${i}</button>`;
  }
  return `
    <div class="table-pagination">
      <span>Showing ${(paged.page - 1) * CRM_PER_PAGE + 1}–${Math.min(paged.page * CRM_PER_PAGE, paged.total)} of ${paged.total}</span>
      <div class="pagination-btns">${btns}</div>
    </div>
  `;
}

// ======================== ADD/EDIT MODALS ==========================

// --- LEAD MODALS ---
function leadFormHTML(l = {}) {
  return `
    <div class="form-grid cols-2">
      <div class="form-group"><label class="form-label">Name <span class="required">*</span></label><input class="form-input" type="text" id="ld_name" value="${l.name || ''}" placeholder="Company or contact name" /></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="ld_email" value="${l.email || ''}" placeholder="email@example.com" /></div>
      <div class="form-group"><label class="form-label">Phone</label><input class="form-input" type="text" id="ld_phone" value="${l.phone || ''}" placeholder="+91 98765 43210" /></div>
      <div class="form-group"><label class="form-label">Company</label><input class="form-input" type="text" id="ld_company" value="${l.company || ''}" placeholder="Company name" /></div>
      <div class="form-group"><label class="form-label">Source</label>
        <select class="form-select" id="ld_source">
          ${['Website','Referral','LinkedIn','Cold Outreach','Trade Show','Other'].map(s => `<option ${l.source === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-select" id="ld_status">
          ${['New','Contacted','Qualified','Converted','Lost'].map(s => `<option ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
  `;
}

function openAddLeadModal() {
  openModal('Add New Lead', leadFormHTML(), `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveNewLead()">Save Lead</button>`);
}

function openEditLeadModal(id) {
  const l = DB.leads.find(x => x.id === id);
  if (!l) return;
  openModal(`Edit – ${l.name}`, leadFormHTML(l), `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEditLead('${id}')">Save Changes</button>`);
}

function saveNewLead() {
  const name = document.getElementById('ld_name').value.trim();
  if (!name) { showToast('Lead name is required', 'error'); return; }
  DB.leads.push({
    id: genId('LD', DB.leads), name,
    email: document.getElementById('ld_email').value.trim(),
    phone: document.getElementById('ld_phone').value.trim(),
    company: document.getElementById('ld_company').value.trim(),
    source: document.getElementById('ld_source').value,
    status: document.getElementById('ld_status').value,
  });
  saveData(); closeModal(); showToast('Lead added successfully!'); refreshPage();
}

function saveEditLead(id) {
  const idx = DB.leads.findIndex(x => x.id === id);
  if (idx === -1) return;
  const name = document.getElementById('ld_name').value.trim();
  if (!name) { showToast('Lead name is required', 'error'); return; }
  DB.leads[idx] = { ...DB.leads[idx], name,
    email: document.getElementById('ld_email').value.trim(),
    phone: document.getElementById('ld_phone').value.trim(),
    company: document.getElementById('ld_company').value.trim(),
    source: document.getElementById('ld_source').value,
    status: document.getElementById('ld_status').value,
  };
  saveData(); closeModal(); showToast('Lead updated!'); refreshPage();
}

function convertLead(id) {
  const lead = DB.leads.find(l => l.id === id);
  if (!lead) return;
  confirmAction(`Convert <strong>${lead.name}</strong> to a Customer?`, () => {
    lead.status = 'Converted';
    DB.customers.push({
      id: genId('CUST', DB.customers), name: lead.name,
      email: lead.email, phone: lead.phone, company: lead.company,
      convertedFromLeadId: lead.id, totalDeals: 0, totalValue: 0,
    });
    saveData(); showToast(`${lead.name} converted to customer!`); refreshPage();
  });
}

// --- CUSTOMER MODALS ---
function customerFormHTML(c = {}) {
  return `
    <div class="form-grid cols-2">
      <div class="form-group"><label class="form-label">Name <span class="required">*</span></label><input class="form-input" type="text" id="cust_name" value="${c.name || ''}" placeholder="Customer name" /></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="cust_email" value="${c.email || ''}" placeholder="email@example.com" /></div>
      <div class="form-group"><label class="form-label">Phone</label><input class="form-input" type="text" id="cust_phone" value="${c.phone || ''}" placeholder="+91 98765 43210" /></div>
      <div class="form-group"><label class="form-label">Company</label><input class="form-input" type="text" id="cust_company" value="${c.company || ''}" placeholder="Company name" /></div>
    </div>
  `;
}

function openAddCustomerModal() {
  openModal('Add New Customer', customerFormHTML(), `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveNewCustomer()">Save Customer</button>`);
}

function openEditCustomerModal(id) {
  const c = DB.customers.find(x => x.id === id);
  if (!c) return;
  openModal(`Edit – ${c.name}`, customerFormHTML(c), `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEditCustomer('${id}')">Save Changes</button>`);
}

function saveNewCustomer() {
  const name = document.getElementById('cust_name').value.trim();
  if (!name) { showToast('Customer name is required', 'error'); return; }
  DB.customers.push({
    id: genId('CUST', DB.customers), name,
    email: document.getElementById('cust_email').value.trim(),
    phone: document.getElementById('cust_phone').value.trim(),
    company: document.getElementById('cust_company').value.trim(),
    convertedFromLeadId: null, totalDeals: 0, totalValue: 0,
  });
  saveData(); closeModal(); showToast('Customer added!'); refreshPage();
}

function saveEditCustomer(id) {
  const idx = DB.customers.findIndex(x => x.id === id);
  if (idx === -1) return;
  const name = document.getElementById('cust_name').value.trim();
  if (!name) { showToast('Customer name is required', 'error'); return; }
  DB.customers[idx] = { ...DB.customers[idx], name,
    email: document.getElementById('cust_email').value.trim(),
    phone: document.getElementById('cust_phone').value.trim(),
    company: document.getElementById('cust_company').value.trim(),
  };
  saveData(); closeModal(); showToast('Customer updated!'); refreshPage();
}

// --- OPPORTUNITY MODALS ---
function opportunityFormHTML(o = {}) {
  const custOptions = DB.customers.map(c => `<option value="${c.id}" ${o.customerId === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
  return `
    <div class="form-grid cols-2">
      <div class="form-group"><label class="form-label">Customer <span class="required">*</span></label><select class="form-select" id="opp_cust">${custOptions}</select></div>
      <div class="form-group"><label class="form-label">Value (₹) <span class="required">*</span></label><input class="form-input" type="number" id="opp_value" value="${o.value || ''}" min="1" placeholder="e.g. 50000" /></div>
      <div class="form-group"><label class="form-label">Stage</label>
        <select class="form-select" id="opp_stage">
          ${['Discovery','Proposal','Negotiation','Closed Won','Closed Lost'].map(s => `<option ${o.stage === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Expected Close Date</label><input class="form-input" type="date" id="opp_close" value="${o.expectedCloseDate || ''}" /></div>
      <div class="form-group full"><label class="form-label">Description</label><input class="form-input" type="text" id="opp_desc" value="${o.description || ''}" placeholder="Brief description" /></div>
    </div>
  `;
}

function openAddOpportunityModal() {
  if (DB.customers.length === 0) { showToast('Add a customer first', 'error'); return; }
  openModal('Add Opportunity', opportunityFormHTML(), `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveNewOpportunity()">Save Opportunity</button>`);
}

function openEditOpportunityModal(id) {
  const o = DB.opportunities.find(x => x.id === id);
  if (!o) return;
  openModal(`Edit Opportunity`, opportunityFormHTML(o), `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEditOpportunity('${id}')">Save Changes</button>`);
}

function saveNewOpportunity() {
  const value = +document.getElementById('opp_value').value;
  if (!value || value <= 0) { showToast('Value must be positive', 'error'); return; }
  DB.opportunities.push({
    id: genId('OPP', DB.opportunities),
    customerId: document.getElementById('opp_cust').value,
    value,
    stage: document.getElementById('opp_stage').value,
    expectedCloseDate: document.getElementById('opp_close').value,
    description: document.getElementById('opp_desc').value.trim(),
  });
  saveData(); closeModal(); showToast('Opportunity added!'); refreshPage();
}

function saveEditOpportunity(id) {
  const idx = DB.opportunities.findIndex(x => x.id === id);
  if (idx === -1) return;
  const value = +document.getElementById('opp_value').value;
  if (!value || value <= 0) { showToast('Value must be positive', 'error'); return; }
  DB.opportunities[idx] = { ...DB.opportunities[idx],
    customerId: document.getElementById('opp_cust').value, value,
    stage: document.getElementById('opp_stage').value,
    expectedCloseDate: document.getElementById('opp_close').value,
    description: document.getElementById('opp_desc').value.trim(),
  };
  saveData(); closeModal(); showToast('Opportunity updated!'); refreshPage();
}

// --- FOLLOW-UP MODAL ---
function openAddFollowUpModal() {
  const custOptions = DB.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const leadOptions = DB.leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').map(l => `<option value="${l.id}">${l.name}</option>`).join('');
  const html = `
    <div class="form-grid cols-2">
      <div class="form-group"><label class="form-label">Customer</label><select class="form-select" id="fu_cust"><option value="">— None —</option>${custOptions}</select></div>
      <div class="form-group"><label class="form-label">Lead</label><select class="form-select" id="fu_lead"><option value="">— None —</option>${leadOptions}</select></div>
      <div class="form-group"><label class="form-label">Date <span class="required">*</span></label><input class="form-input" type="date" id="fu_date" value="${new Date().toISOString().split('T')[0]}" /></div>
      <div class="form-group"><label class="form-label">Next Action Date</label><input class="form-input" type="date" id="fu_next" /></div>
      <div class="form-group full"><label class="form-label">Notes <span class="required">*</span></label><textarea class="form-textarea" id="fu_notes" placeholder="Follow-up notes…"></textarea></div>
    </div>
  `;
  openModal('Add Follow-up', html, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveFollowUp()">Save</button>`);
}

function saveFollowUp() {
  const custId = document.getElementById('fu_cust').value;
  const leadId = document.getElementById('fu_lead').value;
  const notes = document.getElementById('fu_notes').value.trim();
  if (!custId && !leadId) { showToast('Select a customer or lead', 'error'); return; }
  if (!notes) { showToast('Notes cannot be empty', 'error'); return; }
  DB.followUps.push({
    id: genId('FU', DB.followUps),
    customerId: custId || null, leadId: leadId || null,
    date: document.getElementById('fu_date').value,
    notes,
    nextActionDate: document.getElementById('fu_next').value || null,
  });
  saveData(); closeModal(); showToast('Follow-up added!'); refreshPage();
}

// --- GENERIC DELETE ---
function deleteCRMEntity(collection, id, name) {
  confirmAction(`Delete <strong>${name}</strong>? This cannot be undone.`, () => {
    DB[collection] = DB[collection].filter(x => x.id !== id);
    saveData(); showToast(`${name} deleted`, 'warning'); refreshPage();
  });
}

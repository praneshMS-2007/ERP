// ============================================================
// CRM MODULE LOGIC
// ============================================================

function renderCRMModule() {
  const html = `
    <div class="page-header">
      <h2>CRM Dashboard</h2>
      <p class="text-secondary">Manage leads, customers, and opportunities.</p>
    </div>
    
    <div class="card" style="margin-bottom: 2rem;">
      <div class="card-header">
        <h3>Customers</h3>
      </div>
      <div class="card-body">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody id="crmCustomersTableBody">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-bottom: 2rem;">
      <div class="card-header">
        <h3>Leads</h3>
      </div>
      <div class="card-body">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="crmLeadsTableBody">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Opportunities</h3>
      </div>
      <div class="card-body">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer ID</th>
              <th>Value</th>
              <th>Stage</th>
              <th>Close Date</th>
            </tr>
          </thead>
          <tbody id="crmOppTableBody">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  return html;
}

function populateCRMData() {
  const custBody = document.getElementById('crmCustomersTableBody');
  const leadsBody = document.getElementById('crmLeadsTableBody');
  const oppBody = document.getElementById('crmOppTableBody');

  // Customers
  if (DB.customers && DB.customers.length > 0) {
    custBody.innerHTML = DB.customers.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.email || '--'}</td>
        <td>${c.phone || '--'}</td>
      </tr>
    `).join('');
  } else {
    custBody.innerHTML = '<tr><td colspan="4" class="text-center">No customers found</td></tr>';
  }

  // Leads
  if (DB.leads && DB.leads.length > 0) {
    leadsBody.innerHTML = DB.leads.map(l => `
      <tr>
        <td>${l.id}</td>
        <td>${l.name}</td>
        <td><span class="badge ${l.status === 'New' ? 'badge-info' : 'badge-primary'}">${l.status}</span></td>
      </tr>
    `).join('');
  } else {
    leadsBody.innerHTML = '<tr><td colspan="3" class="text-center">No leads found</td></tr>';
  }

  // Opportunities
  if (DB.opportunities && DB.opportunities.length > 0) {
    oppBody.innerHTML = DB.opportunities.map(o => `
      <tr>
        <td>${o.id}</td>
        <td>${o.customerId}</td>
        <td>$${o.value.toLocaleString()}</td>
        <td>${o.stage}</td>
        <td>${o.expectedCloseDate || '--'}</td>
      </tr>
    `).join('');
  } else {
    oppBody.innerHTML = '<tr><td colspan="5" class="text-center">No opportunities found</td></tr>';
  }
}

// Ensure the module is registered if we use a module pattern
if (typeof window.modules === 'undefined') window.modules = {};
window.modules.crm = renderCRMModule;

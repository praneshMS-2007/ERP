// ============================================================
//  SHUROQ ERP – INVENTORY MODULE
// ============================================================

let invPage = 1, invSearch = '', invCatFilter = '', invStatusFilter = '';

// ======================== INVENTORY DASHBOARD ==========================
function renderInventoryDashboard() {
  const prods = DB.products;
  const totalVal = prods.reduce((s, p) => s + p.price * p.stock, 0);
  const lowStock = prods.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  const outOfStock = prods.filter(p => p.stock === 0).length;
  const active = prods.filter(p => p.status === 'Active').length;

  const cats = {};
  prods.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });

  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Inventory Dashboard</h1>
        <p>Manage products, stock levels and suppliers</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="navigate('products')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
          <span class="kpi-badge up">${active} active</span>
        </div>
        <div class="kpi-value">${prods.length}</div>
        <div class="kpi-label">Total Products</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(20,184,166,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--teal)"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <span class="kpi-badge up">Inventory Value</span>
        </div>
        <div class="kpi-value" style="font-size:22px;color:var(--teal)">₹${(totalVal/100000).toFixed(1)}L</div>
        <div class="kpi-label">Total Stock Value</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(245,158,11,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--amber)"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <span class="kpi-badge down">Needs restock</span>
        </div>
        <div class="kpi-value" style="color:var(--amber)">${lowStock}</div>
        <div class="kpi-label">Low Stock Items</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon" style="background:rgba(239,68,68,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
          <span class="kpi-badge down">Order now</span>
        </div>
        <div class="kpi-value" style="color:var(--red)">${outOfStock}</div>
        <div class="kpi-label">Out of Stock</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">Stock by Category</div>
        <div class="chart-wrap"><canvas id="catChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Stock Level Status</div>
        <div class="chart-wrap"><canvas id="stockStatusChart"></canvas></div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-card-title">⚠ Critical Stock Alerts</div>
      ${prods.filter(p => p.stock <= p.minStock).slice(0, 5).map(p => {
        const st = stockStatus(p);
        return `<div class="alert-card ${p.stock === 0 ? 'critical' : ''}">
          <div class="alert-card-info">
            <h4>${p.name}</h4>
            <p>${p.category} · SKU: ${p.sku} · Min Stock: ${p.minStock}</p>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="stock-indicator ${st.dot}">
              <div class="stock-dot"></div>
              ${p.stock} units left
            </div>
            <button class="btn btn-primary btn-sm" onclick="navigate('products');openRestockModal('${p.id}')">Restock</button>
          </div>
        </div>`;
      }).join('') || '<p style="color:var(--text-muted);text-align:center;padding:16px;">All items well stocked ✓</p>'}
    </div>
  `;
}

function initInventoryCharts() {
  destroyChart('catChart');
  destroyChart('stockStatusChart');
  const cats = {};
  DB.products.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
  makeDoughnutChart('catChart', Object.keys(cats), Object.values(cats));

  const ok = DB.products.filter(p => p.stock > p.minStock).length;
  const low = DB.products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  const out = DB.products.filter(p => p.stock === 0).length;
  makePolarChart('stockStatusChart', ['In Stock', 'Low Stock', 'Out of Stock'], [ok, low, out]);
}

// ======================== PRODUCT LIST ==========================
function renderProducts() {
  const cats = [...new Set(DB.products.map(p => p.category))];
  let list = DB.products;
  if (invSearch) list = filterList(list, invSearch, ['name', 'sku', 'supplier', 'category']);
  if (invCatFilter) list = list.filter(p => p.category === invCatFilter);
  if (invStatusFilter) list = list.filter(p => p.status === invStatusFilter);
  const { items, total, pages } = paginate(list, invPage, 8);

  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Products</h1>
        <p>${total} product${total !== 1 ? 's' : ''} in inventory</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddProductModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <span class="table-title">Product Catalog</span>
        <div class="table-controls">
          <div class="tbl-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Search name, SKU…" value="${invSearch}" oninput="invSearch=this.value;invPage=1;refreshPage()" />
          </div>
          <select class="tbl-select" onchange="invCatFilter=this.value;invPage=1;refreshPage()">
            <option value="">All Categories</option>
            ${cats.map(c => `<option value="${c}" ${invCatFilter===c?'selected':''}>${c}</option>`).join('')}
          </select>
          <select class="tbl-select" onchange="invStatusFilter=this.value;invPage=1;refreshPage()">
            <option value="">All Status</option>
            <option ${invStatusFilter==='Active'?'selected':''}>Active</option>
            <option ${invStatusFilter==='Inactive'?'selected':''}>Inactive</option>
          </select>
        </div>
      </div>
      <table class="data-table">
        <thead><tr>
          <th>Product ID</th><th>Name</th><th>Category</th><th>SKU</th><th>Supplier</th>
          <th>Price</th><th>Stock</th><th>Stock Status</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${items.length === 0 ? '<tr><td colspan="10"><div class="empty-state"><h3>No products found</h3></div></td></tr>' :
          items.map(p => {
            const st = stockStatus(p);
            return `<tr>
              <td><span style="font-family:monospace;font-size:12px;background:var(--bg-input);padding:2px 8px;border-radius:4px;">${p.id}</span></td>
              <td style="font-weight:600;color:var(--text-pri);">${p.name}</td>
              <td>${p.category}</td>
              <td style="font-family:monospace;font-size:12px;">${p.sku}</td>
              <td>${p.supplier}</td>
              <td>₹${p.price.toLocaleString('en-IN')}</td>
              <td><strong>${p.stock}</strong> ${p.unit}</td>
              <td><div class="stock-indicator ${st.cls}"><div class="stock-dot"></div>${st.label}</div></td>
              <td>${badge(p.status)}</td>
              <td>
                <div class="action-btns">
                  <button class="act-btn act-edit" title="Edit" onclick="openEditProductModal('${p.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="act-btn act-approve" title="Restock" onclick="openRestockModal('${p.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
                  </button>
                  <button class="act-btn act-delete" title="Delete" onclick="deleteProduct('${p.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="table-pagination" id="invPagination"></div>
    </div>
  `;
}

function initInvPagination() {
  let list = DB.products;
  if (invSearch) list = filterList(list, invSearch, ['name', 'sku', 'supplier', 'category']);
  if (invCatFilter) list = list.filter(p => p.category === invCatFilter);
  const { pages } = paginate(list, invPage, 8);
  const el = document.getElementById('invPagination');
  if (el) renderPagination(el, invPage, pages, (p) => { invPage = p; refreshPage(); });
}

function productFormHTML(p = {}) {
  return `
    <div class="form-grid">
      <div class="form-section-title">Product Information</div>
      <div class="form-group full">
        <label class="form-label">Product Name <span class="required">*</span></label>
        <input class="form-input" id="pf_name" value="${p.name||''}" placeholder="Product name" />
      </div>
      <div class="form-group">
        <label class="form-label">Category <span class="required">*</span></label>
        <select class="form-select" id="pf_category">
          <option value="">Select</option>
          ${['Electronics','Furniture','Stationery','Infrastructure','Software','Other'].map(c => `<option ${p.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">SKU</label>
        <input class="form-input" id="pf_sku" value="${p.sku||''}" placeholder="e.g. LPRO-15-001" />
      </div>
      <div class="form-group">
        <label class="form-label">Supplier</label>
        <input class="form-input" id="pf_supplier" value="${p.supplier||''}" placeholder="Supplier name" />
      </div>
      <div class="form-group">
        <label class="form-label">Unit</label>
        <select class="form-select" id="pf_unit">
          <option ${p.unit==='Piece'||!p.unit?'selected':''}>Piece</option>
          <option ${p.unit==='Set'?'selected':''}>Set</option>
          <option ${p.unit==='Ream'?'selected':''}>Ream</option>
          <option ${p.unit==='Unit'?'selected':''}>Unit</option>
          <option ${p.unit==='Box'?'selected':''}>Box</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="pf_status">
          <option ${p.status==='Active'||!p.status?'selected':''}>Active</option>
          <option ${p.status==='Inactive'?'selected':''}>Inactive</option>
        </select>
      </div>
      <div class="form-section-title">Pricing & Stock</div>
      <div class="form-group">
        <label class="form-label">Selling Price (₹)</label>
        <input class="form-input" type="number" id="pf_price" value="${p.price||''}" placeholder="0" />
      </div>
      <div class="form-group">
        <label class="form-label">Cost Price (₹)</label>
        <input class="form-input" type="number" id="pf_cost" value="${p.costPrice||''}" placeholder="0" />
      </div>
      <div class="form-group">
        <label class="form-label">Current Stock</label>
        <input class="form-input" type="number" id="pf_stock" value="${p.stock!=null?p.stock:''}" placeholder="0" />
      </div>
      <div class="form-group">
        <label class="form-label">Min Stock Level</label>
        <input class="form-input" type="number" id="pf_minStock" value="${p.minStock||''}" placeholder="e.g. 10" />
      </div>
    </div>
  `;
}

function getProdFormData() {
  return {
    name: document.getElementById('pf_name').value.trim(),
    category: document.getElementById('pf_category').value,
    sku: document.getElementById('pf_sku').value.trim(),
    supplier: document.getElementById('pf_supplier').value.trim(),
    unit: document.getElementById('pf_unit').value,
    status: document.getElementById('pf_status').value,
    price: +document.getElementById('pf_price').value || 0,
    costPrice: +document.getElementById('pf_cost').value || 0,
    stock: +document.getElementById('pf_stock').value || 0,
    minStock: +document.getElementById('pf_minStock').value || 0,
  };
}

function openAddProductModal() {
  openModal('Add New Product', productFormHTML(),
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveNewProduct()">Add Product</button>`,
    { large: true }
  );
}

function saveNewProduct() {
  const data = getProdFormData();
  if (!data.name || !data.category) { showToast('Name and category are required', 'error'); return; }
  if (data.price < 0 || data.costPrice < 0 || data.stock < 0 || data.minStock < 0) {
    showToast('Price, cost, stock, and min stock cannot be negative', 'error'); return;
  }
  DB.products.push({ ...data, id: genId('PRD', DB.products) });
  saveData();
  closeModal();
  showToast('Product added successfully!');
  refreshPage();
}

function openEditProductModal(id) {
  const p = DB.products.find(x => x.id === id);
  if (!p) return;
  openModal(`Edit – ${p.name}`, productFormHTML(p),
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveEditProduct('${id}')">Save Changes</button>`,
    { large: true }
  );
}

function saveEditProduct(id) {
  const idx = DB.products.findIndex(x => x.id === id);
  if (idx === -1) return;
  const data = getProdFormData();
  if (!data.name) { showToast('Product name is required', 'error'); return; }
  if (data.price < 0 || data.costPrice < 0 || data.stock < 0 || data.minStock < 0) {
    showToast('Price, cost, stock, and min stock cannot be negative', 'error'); return;
  }
  DB.products[idx] = { ...DB.products[idx], ...data };
  saveData();
  closeModal();
  showToast('Product updated!');
  refreshPage();
}

function deleteProduct(id) {
  const p = DB.products.find(x => x.id === id);
  confirmAction(`Delete <strong>${p.name}</strong>?`, () => {
    DB.products = DB.products.filter(x => x.id !== id);
    saveData();
    showToast('Product deleted', 'warning');
    refreshPage();
  });
}

function openRestockModal(id) {
  const p = DB.products.find(x => x.id === id);
  if (!p) return;
  openModal(`Restock – ${p.name}`, `
    <p style="color:var(--text-sec);font-size:14px;margin-bottom:16px;">Current stock: <strong style="color:var(--text-pri)">${p.stock} ${p.unit}</strong></p>
    <div class="form-group">
      <label class="form-label">Add Stock Quantity</label>
      <input class="form-input" type="number" id="restock_qty" value="10" min="1" placeholder="Enter quantity to add" />
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="restockProduct('${id}')">Add Stock</button>`,
    { small: true }
  );
}

function restockProduct(id) {
  const qty = +document.getElementById('restock_qty').value;
  if (!qty || qty < 1) { showToast('Enter a valid quantity', 'error'); return; }
  const p = DB.products.find(x => x.id === id);
  p.stock += qty;
  saveData();
  closeModal();
  showToast(`Added ${qty} units to ${p.name}`);
  refreshPage();
}

// ======================== STOCK ALERTS ==========================
function renderStockAlerts() {
  const alerts = DB.products.filter(p => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock);
  updateAlertBadge();
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Stock Alerts</h1>
        <p>${alerts.length} item${alerts.length !== 1 ? 's' : ''} need attention</p>
      </div>
    </div>

    ${alerts.length === 0 ? `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <h3>All items well stocked!</h3>
        <p>No stock alerts at this time.</p>
      </div>
    ` : alerts.map(p => {
      const st = stockStatus(p);
      return `
        <div class="alert-card ${p.stock === 0 ? 'critical' : ''}">
          <div style="display:flex;align-items:center;gap:14px;flex:1;">
            <div style="width:40px;height:40px;background:${p.stock===0?'rgba(239,68,68,0.15)':'rgba(245,158,11,0.15)'};border-radius:10px;display:flex;align-items:center;justify-content:center;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;color:${p.stock===0?'var(--red)':'var(--amber)'}"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
            </div>
            <div class="alert-card-info">
              <h4>${p.name}</h4>
              <p>Category: ${p.category} &nbsp;·&nbsp; SKU: ${p.sku} &nbsp;·&nbsp; Supplier: ${p.supplier}</p>
              <p>Min stock: ${p.minStock} ${p.unit} &nbsp;·&nbsp; Current: <strong style="color:${p.stock===0?'var(--red)':'var(--amber)'};">${p.stock} ${p.unit}</strong></p>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
            <div class="stock-indicator ${st.cls}"><div class="stock-dot"></div>${st.label}</div>
            <button class="btn btn-primary btn-sm" onclick="openRestockModal('${p.id}')">Restock Now</button>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function updateAlertBadge() {
  const count = DB.products.filter(p => p.stock <= p.minStock).length;
  const badge = document.getElementById('alertBadge');
  if (badge) { badge.textContent = count; badge.style.display = count > 0 ? '' : 'none'; }
}

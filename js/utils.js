// ============================================================
//  SHUROQ ERP – UTILITY FUNCTIONS
// ============================================================

// ---- TOAST NOTIFICATIONS ----
function showToast(message, type = 'success') {
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ---- MODAL ----
function openModal(title, bodyHTML, footerHTML = '', opts = {}) {
  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modal');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFooter').innerHTML = footerHTML;
  if (opts.large) modal.classList.add('modal-lg'); else modal.classList.remove('modal-lg');
  if (opts.small) modal.classList.add('modal-sm'); else modal.classList.remove('modal-sm');
  overlay.classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// ---- CONFIRM DIALOG ----
function confirmAction(message, onConfirm) {
  openModal('Confirm Action',
    `<p style="color:var(--text-sec);font-size:14px;">${message}</p>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-danger" id="confirmBtn">Confirm</button>`,
    { small: true }
  );
  document.getElementById('confirmBtn').onclick = () => { closeModal(); onConfirm(); };
}

// ---- STATUS BADGE ----
function badge(text, cls) {
  const map = {
    'Active': 'active', 'Inactive': 'inactive',
    'Present': 'present', 'Absent': 'absent', 'Late': 'late', 'Half Day': 'halfday',
    'Approved': 'approved', 'Pending': 'pending', 'Rejected': 'rejected',
    'In Progress': 'in-progress', 'Not Started': 'not-started', 'Completed': 'completed', 'On Hold': 'on-hold', 'Done': 'done', 'Review': 'review', 'Cancelled': 'cancelled',
    'Low': 'low', 'Medium': 'medium', 'High': 'high', 'Critical': 'critical',
    // CRM statuses
    'New': 'pending', 'Contacted': 'in-progress', 'Qualified': 'approved', 'Converted': 'completed', 'Lost': 'rejected',
    'Discovery': 'pending', 'Proposal': 'in-progress', 'Negotiation': 'halfday', 'Closed Won': 'approved', 'Closed Lost': 'rejected',
  };
  const c = cls || map[text] || 'pending';
  return `<span class="badge badge-${c}"><span class="badge-dot"></span>${text}</span>`;
}

// ---- STARS RATING ----
function starsHTML(rating, max = 5) {
  let html = '<div class="stars">';
  for (let i = 1; i <= max; i++) {
    html += `<span class="star ${i <= rating ? '' : 'empty'}">★</span>`;
  }
  return html + '</div>';
}

// ---- ID GENERATOR ----
function genId(prefix, arr) {
  const max = arr.reduce((m, x) => {
    const n = parseInt(x.id.replace(prefix, '')) || 0;
    return n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

// ---- FORMAT DATE ----
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---- STOCK STATUS ----
function stockStatus(product) {
  if (product.stock === 0) return { cls: 'stock-critical', label: 'Out of Stock', dot: 'stock-critical' };
  if (product.stock <= product.minStock * 0.5) return { cls: 'stock-critical', label: 'Critical', dot: 'stock-critical' };
  if (product.stock <= product.minStock) return { cls: 'stock-low', label: 'Low Stock', dot: 'stock-low' };
  return { cls: 'stock-ok', label: 'In Stock', dot: 'stock-ok' };
}

// ---- SEARCH FILTER ----
function filterList(arr, query, fields) {
  if (!query) return arr;
  const q = query.toLowerCase();
  return arr.filter(item => fields.some(f => String(item[f] || '').toLowerCase().includes(q)));
}

// ---- PAGINATE ----
function paginate(arr, page, perPage = 8) {
  const totalPages = Math.ceil(arr.length / perPage);
  const safePage = Math.max(1, Math.min(page, totalPages || 1));
  const start = (safePage - 1) * perPage;
  return { items: arr.slice(start, start + perPage), total: arr.length, pages: totalPages, totalPages, page: safePage };
}

// ---- RENDER PAGINATION ----
function renderPagination(container, currentPage, totalPages, onChange) {
  let html = `<span style="color:var(--text-muted);font-size:12px;">${totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'No records'}</span>`;
  html += '<div class="pagination-btns">';
  html += `<button class="page-btn" onclick="(${onChange})(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="(${onChange})(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="(${onChange})(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>`;
  html += '</div>';
  container.innerHTML = html;
}

// ---- AVATAR INITIALS ----
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// ---- CLOSE MODAL ON OVERLAY CLICK ----
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
document.getElementById('modalClose').addEventListener('click', closeModal);

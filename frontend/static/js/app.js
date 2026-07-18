/**
 * PureFlow Service Hub – Frontend Application Logic
 * Chart.js powered dashboard + REST API integration
 */

'use strict';

const API = {
    async get(url) {
        const r = await fetch(url, { credentials: 'include' });
        return r.json();
    },
    async post(url, body) {
        const r = await fetch(url, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return r.json();
    },
    async put(url, body) {
        const r = await fetch(url, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return r.json();
    },
    async delete(url) {
        const r = await fetch(url, { method: 'DELETE', credentials: 'include' });
        return r.json();
    }
};

// ── Toast Notifications ───────────────────────────────────
function toast(msg, type = 'info') {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => { el.classList.add('toast-out'); setTimeout(() => el.remove(), 300); }, 3500);
}

// ── Modal Helpers ─────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
});

// ── Formatting Helpers ────────────────────────────────────
const fmt = {
    currency: v => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    date: d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    tds: v => {
        if (!v) return '<span class="tds-value" style="color:var(--text-muted)">—</span>';
        const ppm = parseFloat(v);
        const cls = ppm < 50 ? 'tds-good' : ppm < 150 ? 'tds-ok' : 'tds-bad';
        return `<span class="tds-value ${cls}">${ppm} ppm</span>`;
    },
    serviceType: t => {
        const map = { Regular:'badge-blue', Paid:'badge-green', Complaint:'badge-orange', Emergency:'badge-red' };
        return `<span class="badge ${map[t]||'badge-gray'}">${t}</span>`;
    },
    status: (s, map) => {
        const cls = map[s] || 'badge-gray';
        return `<span class="badge ${cls}">${s}</span>`;
    },
    techStatus: s => `<span class="badge ${s==='Active'?'badge-green':'badge-gray'}">${s}</span>`,
    payStatus: s => `<span class="badge ${s==='Paid'?'badge-green':'badge-orange'}">${s}</span>`,
    schedStatus: s => {
        const m = { Pending:'badge-blue', Completed:'badge-green', Overdue:'badge-red' };
        return `<span class="badge ${m[s]||'badge-gray'}">${s}</span>`;
    }
};

// ── Page Navigation ───────────────────────────────────────
const App = {
    currentPage: 'dashboard',
    pageTitles: {
        dashboard: 'Dashboard', customers: 'Customers', technicians: 'Technicians',
        products: 'Products', installations: 'Installations', schedules: 'Service Schedule',
        services: 'Services', bills: 'Bills & Invoices', inventory: 'Inventory', sms: 'SMS Logs'
    },
    navigate(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const pageEl = document.getElementById(`page-${page}`);
        const navEl  = document.getElementById(`nav-${page}`);
        if (!pageEl) return;
        pageEl.classList.add('active');
        if (navEl) navEl.classList.add('active');
        document.getElementById('page-title').textContent = this.pageTitles[page] || page;
        this.currentPage = page;
        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('open');
        // Load page data
        const loaders = {
            dashboard: loadDashboard, customers: loadCustomers,
            technicians: loadTechnicians, products: loadProducts,
            installations: loadInstallations, schedules: loadSchedules,
            services: loadServices, bills: loadBills,
            inventory: loadInventory, sms: loadSmsLogs
        };
        if (loaders[page]) loaders[page]();
    }
};

document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        App.navigate(item.dataset.page);
    });
});

// Mobile sidebar toggle
document.getElementById('sidebar-open').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('open');
});
document.getElementById('sidebar-close').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
});
document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
});

// ── Topbar Date ───────────────────────────────────────────
function updateDate() {
    const now = new Date();
    document.getElementById('topbar-date').textContent =
        now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}
updateDate();

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════
const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = document.getElementById('login-btn');
    btn.innerHTML = '<span>Signing in…</span>';
    btn.disabled  = true;
    const res = await API.post('/api/auth/login', {
        email:    document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
    });
    btn.innerHTML = '<span>Sign In</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    btn.disabled  = false;
    if (res.success) {
        showApp(res.data);
        toast('Welcome back, ' + res.data.owner_name + '! 👋', 'success');
    } else {
        toast(res.message || 'Login failed', 'error');
    }
});

function showApp(user) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('sidebar-name').textContent = user.owner_name || 'Admin';
    document.getElementById('sidebar-avatar').textContent = (user.owner_name || 'A')[0].toUpperCase();
    document.getElementById('dash-user-name').textContent = user.owner_name.split(' ')[0];
    App.navigate('dashboard');
}

document.getElementById('logout-btn').addEventListener('click', async () => {
    await API.post('/api/auth/logout', {});
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    toast('Signed out successfully', 'info');
});

// Check if already logged in
(async () => {
    const res = await API.get('/api/auth/me');
    if (res.success) showApp(res.data);
})();

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
let revenueChart = null;
let serviceChart = null;

async function loadDashboard() {
    const res = await API.get('/api/dashboard');
    if (!res.success) return;
    const { stats, monthly_revenue, service_types, recent_services } = res.data;

    // Stats
    document.getElementById('stat-customers').textContent     = stats.total_customers;
    document.getElementById('stat-installations').textContent = stats.total_installations;
    document.getElementById('stat-revenue').textContent       = fmt.currency(stats.total_revenue);
    document.getElementById('stat-profit').textContent        = fmt.currency(stats.total_profit);
    document.getElementById('stat-overdue').textContent       = stats.overdue_count;
    document.getElementById('stat-services').textContent      = stats.total_services;
    document.getElementById('stat-lowstock').textContent      = stats.low_stock_count;
    document.getElementById('stat-technicians').textContent   = stats.total_technicians;

    // Badges
    const oBadge = document.getElementById('overdue-badge');
    const sBadge = document.getElementById('stock-badge');
    if (stats.overdue_count > 0) { oBadge.style.display = 'flex'; oBadge.textContent = stats.overdue_count; }
    if (stats.low_stock_count > 0) { sBadge.style.display = 'flex'; sBadge.textContent = stats.low_stock_count; }

    // Revenue Chart
    const rCtx = document.getElementById('revenue-chart').getContext('2d');
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(rCtx, {
        type: 'bar',
        data: {
            labels: monthly_revenue.map(m => m.month),
            datasets: [
                {
                    label: 'Total Revenue',
                    data: monthly_revenue.map(m => m.revenue),
                    backgroundColor: 'rgba(14,165,233,0.25)',
                    borderColor: 'rgba(14,165,233,0.8)',
                    borderWidth: 2,
                    borderRadius: 6,
                },
                {
                    label: 'Paid Revenue',
                    data: monthly_revenue.map(m => m.paid),
                    backgroundColor: 'rgba(34,211,238,0.18)',
                    borderColor: 'rgba(34,211,238,0.8)',
                    borderWidth: 2,
                    borderRadius: 6,
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94b8d8', font: { family: 'Inter', size: 11 } } },
                tooltip: {
                    backgroundColor: 'rgba(4,12,26,0.95)',
                    borderColor: 'rgba(14,165,233,0.3)',
                    borderWidth: 1,
                    titleColor: '#e2f0ff',
                    bodyColor: '#94b8d8',
                    callbacks: { label: ctx => '  ₹' + ctx.raw.toLocaleString('en-IN') }
                }
            },
            scales: {
                x: { ticks: { color: '#4d7090', font: { size: 10 } }, grid: { color: 'rgba(56,189,248,0.05)' } },
                y: {
                    ticks: { color: '#4d7090', font: { size: 10 }, callback: v => '₹' + (v/1000).toFixed(0) + 'k' },
                    grid: { color: 'rgba(56,189,248,0.05)' }
                }
            }
        }
    });

    // Service Type Chart
    const sCtx = document.getElementById('service-chart').getContext('2d');
    if (serviceChart) serviceChart.destroy();
    const typeLabels  = Object.keys(service_types);
    const typeValues  = Object.values(service_types);
    const typeColors  = ['rgba(14,165,233,0.7)','rgba(34,211,238,0.7)','rgba(249,115,22,0.7)','rgba(239,68,68,0.7)'];
    serviceChart = new Chart(sCtx, {
        type: 'doughnut',
        data: {
            labels: typeLabels,
            datasets: [{
                data: typeValues,
                backgroundColor: typeColors,
                borderColor: 'rgba(4,12,26,0.8)',
                borderWidth: 3,
                hoverOffset: 6,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94b8d8', font: { family: 'Inter', size: 11 }, padding: 12 } },
                tooltip: {
                    backgroundColor: 'rgba(4,12,26,0.95)',
                    borderColor: 'rgba(14,165,233,0.3)',
                    borderWidth: 1,
                    titleColor: '#e2f0ff',
                    bodyColor: '#94b8d8',
                }
            },
            cutout: '68%',
        }
    });

    // Recent Services Table
    const tbody = document.getElementById('recent-services-body');
    tbody.innerHTML = recent_services.length ? recent_services.map(s => `
        <tr>
            <td><strong>${s.customer_name || '—'}</strong></td>
            <td>${fmt.serviceType(s.service_type)}</td>
            <td>${s.technician_name || '—'}</td>
            <td>${fmt.tds(s.tds_before)}</td>
            <td>${fmt.tds(s.tds_after)}</td>
            <td><strong style="color:var(--accent-cyan)">${fmt.currency(s.total_bill)}</strong></td>
            <td>${fmt.date(s.service_date)}</td>
        </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem">No recent services</td></tr>';
}

// ═══════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════
let customerPage = 1;

async function loadCustomers(page = 1) {
    customerPage = page;
    const q   = document.getElementById('customer-search').value;
    const res = await API.get(`/api/customers?page=${page}&limit=15&q=${encodeURIComponent(q)}`);
    if (!res.success) return;
    const { items, total } = res.data;

    document.getElementById('customers-body').innerHTML = items.map((c, i) => `
        <tr>
            <td style="color:var(--text-muted)">${(page-1)*15 + i + 1}</td>
            <td><strong>${c.customer_name}</strong></td>
            <td>${c.mobile}</td>
            <td>${c.city || '—'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${c.address || '—'}</td>
            <td>${fmt.date(c.created_at)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" title="View History" onclick="viewCustomerDetail(${c.id})">👁</button>
                    <button class="btn-icon" title="Edit" onclick="editCustomer(${c.id})">✏️</button>
                    <button class="btn-icon danger" title="Delete" onclick="deleteCustomer(${c.id}, '${c.customer_name}')">🗑</button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem">No customers found</td></tr>';

    renderPagination('customer-pagination', total, 15, page, loadCustomers);
}

document.getElementById('customer-search').addEventListener('input', debounce(() => loadCustomers(1), 400));

document.getElementById('btn-add-customer').addEventListener('click', () => {
    document.getElementById('customer-form').reset();
    document.getElementById('cf-id').value = '';
    document.getElementById('customer-modal-title').textContent = 'Add Customer';
    document.getElementById('customer-submit-btn').textContent = 'Save Customer';
    openModal('modal-customer');
});

document.getElementById('customer-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id   = document.getElementById('cf-id').value;
    const body = {
        customer_name:    document.getElementById('cf-name').value,
        mobile:           document.getElementById('cf-mobile').value,
        alternate_mobile: document.getElementById('cf-altmobile').value,
        city:             document.getElementById('cf-city').value,
        address:          document.getElementById('cf-address').value,
        landmark:         document.getElementById('cf-landmark').value,
        pincode:          document.getElementById('cf-pincode').value,
    };
    const res = id
        ? await API.put(`/api/customers/${id}`, body)
        : await API.post('/api/customers', body);
    if (res.success) {
        closeModal('modal-customer');
        toast(res.message, 'success');
        loadCustomers(customerPage);
        refreshDropdowns();
    } else {
        toast(res.message, 'error');
    }
});

function editCustomer(id) {
    API.get(`/api/customers/${id}`).then(res => {
        if (!res.success) return;
        const c = res.data;
        document.getElementById('cf-id').value      = c.id;
        document.getElementById('cf-name').value    = c.customer_name;
        document.getElementById('cf-mobile').value  = c.mobile;
        document.getElementById('cf-altmobile').value = c.alternate_mobile || '';
        document.getElementById('cf-city').value    = c.city || '';
        document.getElementById('cf-address').value = c.address || '';
        document.getElementById('cf-landmark').value= c.landmark || '';
        document.getElementById('cf-pincode').value = c.pincode || '';
        document.getElementById('customer-modal-title').textContent = 'Edit Customer';
        document.getElementById('customer-submit-btn').textContent  = 'Update Customer';
        openModal('modal-customer');
    });
}

function deleteCustomer(id, name) {
    if (!confirm(`Delete customer "${name}"? This cannot be undone.`)) return;
    API.delete(`/api/customers/${id}`).then(res => {
        if (res.success) { toast('Customer deleted', 'success'); loadCustomers(customerPage); }
        else toast(res.message, 'error');
    });
}

async function viewCustomerDetail(id) {
    const res = await API.get(`/api/customers/${id}`);
    if (!res.success) return;
    const c = res.data;

    document.getElementById('cust-detail-title').textContent = `${c.customer_name} — Customer History`;
    document.getElementById('customer-detail-body').innerHTML = `
        <div class="detail-section">
            <h4>Contact Information</h4>
            <div class="detail-grid">
                <div class="detail-item"><label>Mobile</label><span>${c.mobile}</span></div>
                <div class="detail-item"><label>Alt Mobile</label><span>${c.alternate_mobile || '—'}</span></div>
                <div class="detail-item"><label>City</label><span>${c.city || '—'}</span></div>
                <div class="detail-item"><label>Pincode</label><span>${c.pincode || '—'}</span></div>
                <div class="detail-item"><label>Landmark</label><span>${c.landmark || '—'}</span></div>
                <div class="detail-item"><label>Joined</label><span>${fmt.date(c.created_at)}</span></div>
            </div>
            <div style="margin-top:0.5rem"><label style="font-size:.7rem;color:var(--text-muted)">Address</label><div style="font-size:.88rem;color:var(--text-primary);margin-top:.2rem">${c.address || '—'}</div></div>
        </div>

        <div class="detail-section">
            <h4>Installations (${c.installations.length})</h4>
            ${c.installations.length ? `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead><tr><th>ID</th><th>Product</th><th>Technician</th><th>Date</th><th>Input TDS</th><th>Output TDS</th><th>Selling Price</th><th>Profit</th></tr></thead>
                    <tbody>${c.installations.map(i => `
                        <tr>
                            <td>#${i.id}</td>
                            <td>${i.product_name}</td>
                            <td>${i.technician_name}</td>
                            <td>${fmt.date(i.installation_date)}</td>
                            <td>${fmt.tds(i.input_tds)}</td>
                            <td>${fmt.tds(i.output_tds)}</td>
                            <td>${fmt.currency(i.selling_price)}</td>
                            <td style="color:var(--accent-green)">${fmt.currency(i.profit)}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>` : '<p style="color:var(--text-muted);font-size:.83rem">No installations recorded</p>'}
        </div>

        <div class="detail-section">
            <h4>Services (${c.services.length})</h4>
            ${c.services.length ? `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead><tr><th>ID</th><th>Type</th><th>Date</th><th>TDS Before</th><th>TDS After</th><th>Total Bill</th></tr></thead>
                    <tbody>${c.services.map(s => `
                        <tr>
                            <td>#${s.id}</td>
                            <td>${fmt.serviceType(s.service_type)}</td>
                            <td>${fmt.date(s.service_date)}</td>
                            <td>${fmt.tds(s.tds_before)}</td>
                            <td>${fmt.tds(s.tds_after)}</td>
                            <td>${fmt.currency(s.total_bill)}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>` : '<p style="color:var(--text-muted);font-size:.83rem">No services recorded</p>'}
        </div>

        <div class="detail-section">
            <h4>Bills (${c.bills.length})</h4>
            ${c.bills.length ? `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead><tr><th>Invoice</th><th>Date</th><th>Grand Total</th><th>Payment</th><th>Mode</th></tr></thead>
                    <tbody>${c.bills.map(b => `
                        <tr>
                            <td><strong>${b.invoice_number}</strong></td>
                            <td>${fmt.date(b.bill_date)}</td>
                            <td><strong>${fmt.currency(b.grand_total)}</strong></td>
                            <td>${fmt.payStatus(b.payment_status)}</td>
                            <td>${b.payment_mode}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>` : '<p style="color:var(--text-muted);font-size:.83rem">No bills generated</p>'}
        </div>
    `;
    openModal('modal-customer-detail');
}

// ═══════════════════════════════════════════════════════════
// TECHNICIANS
// ═══════════════════════════════════════════════════════════
async function loadTechnicians() {
    const res = await API.get('/api/technicians');
    if (!res.success) return;
    const grid = document.getElementById('technician-grid');
    grid.innerHTML = res.data.map(t => `
        <div class="tech-card">
            <div class="tech-avatar">🔧</div>
            <div class="tech-name">${t.technician_name}</div>
            <div class="tech-meta">📞 ${t.mobile}</div>
            ${t.email ? `<div class="tech-meta">✉️ ${t.email}</div>` : ''}
            ${t.address ? `<div class="tech-meta">📍 ${t.address}</div>` : ''}
            <div style="margin-top:.5rem">${fmt.techStatus(t.status)}</div>
            <div class="tech-actions">
                <button class="btn btn-sm btn-outline" onclick="editTechnician(${t.id})">✏️ Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTechnician(${t.id}, '${t.technician_name}')">Delete</button>
            </div>
        </div>
    `).join('') || '<p style="color:var(--text-muted)">No technicians found</p>';
}

document.getElementById('btn-add-technician').addEventListener('click', () => {
    document.getElementById('technician-form').reset();
    document.getElementById('tf-id').value = '';
    document.getElementById('technician-modal-title').textContent = 'Add Technician';
    openModal('modal-technician');
});

document.getElementById('technician-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id   = document.getElementById('tf-id').value;
    const body = {
        technician_name: document.getElementById('tf-name').value,
        mobile:          document.getElementById('tf-mobile').value,
        email:           document.getElementById('tf-email').value,
        address:         document.getElementById('tf-address').value,
        status:          document.getElementById('tf-status').value,
    };
    const res = id
        ? await API.put(`/api/technicians/${id}`, body)
        : await API.post('/api/technicians', body);
    if (res.success) {
        closeModal('modal-technician');
        toast(res.message, 'success');
        loadTechnicians();
        refreshDropdowns();
    } else toast(res.message, 'error');
});

function editTechnician(id) {
    API.get('/api/technicians').then(res => {
        const t = res.data.find(x => x.id === id);
        if (!t) return;
        document.getElementById('tf-id').value      = t.id;
        document.getElementById('tf-name').value    = t.technician_name;
        document.getElementById('tf-mobile').value  = t.mobile;
        document.getElementById('tf-email').value   = t.email || '';
        document.getElementById('tf-address').value = t.address || '';
        document.getElementById('tf-status').value  = t.status;
        document.getElementById('technician-modal-title').textContent = 'Edit Technician';
        openModal('modal-technician');
    });
}

function deleteTechnician(id, name) {
    if (!confirm(`Delete technician "${name}"?`)) return;
    API.delete(`/api/technicians/${id}`).then(res => {
        if (res.success) { toast('Technician deleted', 'success'); loadTechnicians(); }
        else toast(res.message, 'error');
    });
}

// ═══════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════
async function loadProducts() {
    const res = await API.get('/api/products');
    if (!res.success) return;
    document.getElementById('products-body').innerHTML = res.data.map((p, i) => `
        <tr>
            <td style="color:var(--text-muted)">${i+1}</td>
            <td><strong>${p.product_name}</strong></td>
            <td>${p.brand}</td>
            <td>${p.model_number || '—'}</td>
            <td style="font-family:monospace;font-size:.8rem">${p.serial_number || '—'}</td>
            <td><span class="badge badge-blue">${p.warranty_months} mo</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="editProduct(${p.id})">✏️</button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem">No products found</td></tr>';
}

document.getElementById('btn-add-product').addEventListener('click', () => {
    document.getElementById('product-form').reset();
    document.getElementById('pf-id').value = '';
    openModal('modal-product');
});

document.getElementById('product-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id   = document.getElementById('pf-id').value;
    const body = {
        product_name:    document.getElementById('pf-name').value,
        brand:           document.getElementById('pf-brand').value,
        model_number:    document.getElementById('pf-model').value,
        serial_number:   document.getElementById('pf-serial').value,
        warranty_months: parseInt(document.getElementById('pf-warranty').value) || 12,
    };
    const res = id
        ? await API.put(`/api/products/${id}`, body)
        : await API.post('/api/products', body);
    if (res.success) { closeModal('modal-product'); toast(res.message, 'success'); loadProducts(); refreshDropdowns(); }
    else toast(res.message, 'error');
});

function editProduct(id) {
    API.get('/api/products').then(res => {
        const p = res.data.find(x => x.id === id);
        if (!p) return;
        document.getElementById('pf-id').value      = p.id;
        document.getElementById('pf-name').value    = p.product_name;
        document.getElementById('pf-brand').value   = p.brand;
        document.getElementById('pf-model').value   = p.model_number || '';
        document.getElementById('pf-serial').value  = p.serial_number || '';
        document.getElementById('pf-warranty').value= p.warranty_months;
        openModal('modal-product');
    });
}

// ═══════════════════════════════════════════════════════════
// INSTALLATIONS
// ═══════════════════════════════════════════════════════════
let installPage = 1;

async function loadInstallations(page = 1) {
    installPage = page;
    const q   = document.getElementById('installation-search').value;
    const res = await API.get(`/api/installations?page=${page}&limit=15&q=${encodeURIComponent(q)}`);
    if (!res.success) return;
    const { items, total } = res.data;

    document.getElementById('installations-body').innerHTML = items.map((inst, i) => `
        <tr>
            <td style="color:var(--text-muted)">#${inst.id}</td>
            <td><strong>${inst.customer_name}</strong></td>
            <td>${inst.product_name}</td>
            <td>${inst.technician_name}</td>
            <td><span class="badge badge-cyan">${inst.source_water_type || '—'}</span></td>
            <td>${fmt.tds(inst.input_tds)}</td>
            <td>${fmt.tds(inst.output_tds)}</td>
            <td>${fmt.currency(inst.selling_price)}</td>
            <td style="color:var(--accent-green);font-weight:600">${fmt.currency(inst.profit)}</td>
            <td>${fmt.date(inst.installation_date)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" title="View" onclick="viewInstallation(${inst.id})">👁</button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="11" style="text-align:center;color:var(--text-muted);padding:2rem">No installations found</td></tr>';

    renderPagination('installation-pagination', total, 15, page, loadInstallations);
}

document.getElementById('installation-search').addEventListener('input', debounce(() => loadInstallations(1), 400));

document.getElementById('btn-add-installation').addEventListener('click', () => {
    document.getElementById('installation-form').reset();
    document.getElementById('if-date').value = new Date().toISOString().split('T')[0];
    openModal('modal-installation');
});

document.getElementById('installation-form').addEventListener('submit', async e => {
    e.preventDefault();
    const body = {
        customer_id:             parseInt(document.getElementById('if-customer').value),
        product_id:              parseInt(document.getElementById('if-product').value),
        technician_id:           parseInt(document.getElementById('if-technician').value),
        installation_date:       document.getElementById('if-date').value,
        source_water_type:       document.getElementById('if-source').value,
        service_interval_months: parseInt(document.getElementById('if-interval').value) || 6,
        input_tds:               parseFloat(document.getElementById('if-input-tds').value) || null,
        output_tds:              parseFloat(document.getElementById('if-output-tds').value) || null,
        cost_price:              parseFloat(document.getElementById('if-cost').value),
        selling_price:           parseFloat(document.getElementById('if-sell').value),
        remarks:                 document.getElementById('if-remarks').value,
    };
    const res = await API.post('/api/installations', body);
    if (res.success) { closeModal('modal-installation'); toast(res.message + ' 📅 Schedule auto-created!', 'success'); loadInstallations(installPage); }
    else toast(res.message, 'error');
});

async function viewInstallation(id) {
    const res = await API.get(`/api/installations/${id}`);
    if (!res.success) return;
    const inst = res.data;
    toast(`Installation #${id}: ${inst.product_name} @ ${inst.customer_name}`, 'info');
}

// ═══════════════════════════════════════════════════════════
// SERVICE SCHEDULES
// ═══════════════════════════════════════════════════════════
let scheduleFilter = '';

async function loadSchedules() {
    const res = await API.get(`/api/schedules${scheduleFilter ? '?status=' + scheduleFilter : ''}`);
    if (!res.success) return;

    document.getElementById('schedules-body').innerHTML = res.data.map((s, i) => `
        <tr>
            <td style="color:var(--text-muted)">${i+1}</td>
            <td><strong>${s.customer_name}</strong></td>
            <td>#${s.installation_id}</td>
            <td>${fmt.date(s.next_service_date)}</td>
            <td>${s.service_interval_months} months</td>
            <td>${fmt.schedStatus(s.status)}</td>
            <td><span class="badge ${s.reminder_sent==='Yes'?'badge-green':'badge-gray'}">${s.reminder_sent}</span></td>
            <td>
                <div class="action-btns">
                    ${s.status !== 'Completed' ? `
                        <button class="btn-icon" title="Mark Completed" onclick="markScheduleComplete(${s.id})">✓</button>
                        <button class="btn-icon" title="Mark Reminder Sent" onclick="markReminderSent(${s.id})">📲</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:2rem">No schedules found</td></tr>';
}

document.querySelectorAll('.btn-filter[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        scheduleFilter = btn.dataset.filter;
        loadSchedules();
    });
});

function markScheduleComplete(id) {
    API.put(`/api/schedules/${id}`, { status: 'Completed' }).then(res => {
        if (res.success) { toast('Marked as Completed', 'success'); loadSchedules(); }
    });
}
function markReminderSent(id) {
    API.put(`/api/schedules/${id}`, { reminder_sent: 'Yes' }).then(res => {
        if (res.success) { toast('Reminder marked as sent', 'success'); loadSchedules(); }
    });
}

// ═══════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════
let servicePage = 1;
let partCount   = 0;

async function loadServices(page = 1) {
    servicePage = page;
    const q   = document.getElementById('service-search').value;
    const res = await API.get(`/api/services?page=${page}&limit=15&q=${encodeURIComponent(q)}`);
    if (!res.success) return;
    const { items, total } = res.data;

    document.getElementById('services-body').innerHTML = items.map((s, i) => `
        <tr>
            <td style="color:var(--text-muted)">#${s.id}</td>
            <td><strong>${s.customer_name}</strong></td>
            <td>${fmt.serviceType(s.service_type)}</td>
            <td>${s.technician_name}</td>
            <td>${fmt.tds(s.tds_before)}</td>
            <td>${fmt.tds(s.tds_after)}</td>
            <td>${fmt.currency(s.service_charge)}</td>
            <td>${fmt.currency(s.parts_total_cost)}</td>
            <td><strong style="color:var(--accent-cyan)">${fmt.currency(s.total_bill)}</strong></td>
            <td>${fmt.date(s.service_date)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="viewService(${s.id})">👁</button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="11" style="text-align:center;color:var(--text-muted);padding:2rem">No services found</td></tr>';

    renderPagination('service-pagination', total, 15, page, loadServices);
}

document.getElementById('service-search').addEventListener('input', debounce(() => loadServices(1), 400));

document.getElementById('btn-add-service').addEventListener('click', () => {
    document.getElementById('service-form').reset();
    document.getElementById('sf-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('parts-list').innerHTML = '';
    partCount = 0;
    openModal('modal-service');
});

document.getElementById('sf-customer').addEventListener('change', async function() {
    const cid = this.value;
    if (!cid) return;
    const res = await API.get(`/api/customers/${cid}`);
    if (!res.success) return;
    const sel = document.getElementById('sf-installation');
    sel.innerHTML = '<option value="">-- Select Installation --</option>' +
        res.data.installations.map(i => `<option value="${i.id}">#${i.id} – ${i.product_name}</option>`).join('');
});

document.getElementById('btn-add-part').addEventListener('click', () => {
    partCount++;
    const div = document.createElement('div');
    div.className = 'part-row';
    div.id = `part-${partCount}`;
    div.innerHTML = `
        <div><input type="text" placeholder="Part name" data-field="part_name" required></div>
        <div><input type="number" placeholder="Qty" data-field="quantity" value="1" min="1"></div>
        <div><input type="number" placeholder="Cost (₹)" data-field="cost_price" min="0"></div>
        <div><input type="number" placeholder="Sell (₹)" data-field="selling_price" min="0"></div>
        <button type="button" class="part-remove-btn" onclick="this.closest('.part-row').remove()">✕</button>
    `;
    document.getElementById('parts-list').appendChild(div);
});

document.getElementById('service-form').addEventListener('submit', async e => {
    e.preventDefault();
    const parts = [];
    document.querySelectorAll('#parts-list .part-row').forEach(row => {
        parts.push({
            part_name:     row.querySelector('[data-field="part_name"]').value,
            quantity:      parseInt(row.querySelector('[data-field="quantity"]').value) || 1,
            cost_price:    parseFloat(row.querySelector('[data-field="cost_price"]').value) || 0,
            selling_price: parseFloat(row.querySelector('[data-field="selling_price"]').value) || 0,
        });
    });
    const body = {
        installation_id: parseInt(document.getElementById('sf-installation').value),
        customer_id:     parseInt(document.getElementById('sf-customer').value),
        technician_id:   parseInt(document.getElementById('sf-technician').value),
        service_date:    document.getElementById('sf-date').value,
        service_type:    document.getElementById('sf-type').value,
        service_charge:  parseFloat(document.getElementById('sf-charge').value) || 0,
        tds_before:      parseFloat(document.getElementById('sf-tds-before').value) || null,
        tds_after:       parseFloat(document.getElementById('sf-tds-after').value) || null,
        remarks:         document.getElementById('sf-remarks').value,
        parts,
    };
    const res = await API.post('/api/services', body);
    if (res.success) { closeModal('modal-service'); toast('Service recorded! Schedule updated 📅', 'success'); loadServices(servicePage); }
    else toast(res.message, 'error');
});

async function viewService(id) {
    const res = await API.get(`/api/services/${id}`);
    if (!res.success) return;
    const s = res.data;
    const partsHtml = s.parts.length
        ? s.parts.map(p => `<li>${p.part_name} × ${p.quantity} @ ₹${p.selling_price} = ₹${(p.selling_price * p.quantity).toFixed(0)} (Profit: ₹${p.profit.toFixed(0)})</li>`).join('')
        : '<li>No parts used</li>';
    toast(`Service #${id}: ${s.customer_name} | TDS ${s.tds_before || '?'} → ${s.tds_after || '?'} ppm | ₹${s.total_bill}`, 'info');
}

// ═══════════════════════════════════════════════════════════
// BILLS
// ═══════════════════════════════════════════════════════════
let billPage = 1;

async function loadBills(page = 1) {
    billPage = page;
    const q   = document.getElementById('bill-search').value;
    const res = await API.get(`/api/bills?page=${page}&limit=15&q=${encodeURIComponent(q)}`);
    if (!res.success) return;
    const { items, total } = res.data;

    document.getElementById('bills-body').innerHTML = items.map(b => `
        <tr>
            <td><strong style="color:var(--accent-cyan)">${b.invoice_number}</strong></td>
            <td>${b.customer_name}</td>
            <td>${fmt.date(b.bill_date)}</td>
            <td>${fmt.currency(b.subtotal)}</td>
            <td>${fmt.currency(b.service_charge)}</td>
            <td><strong>${fmt.currency(b.grand_total)}</strong></td>
            <td>${fmt.payStatus(b.payment_status)}</td>
            <td><span class="badge badge-gray">${b.payment_mode}</span></td>
            <td>
                <div class="action-btns">
                    ${b.payment_status === 'Unpaid' ? `<button class="btn-icon" title="Mark Paid" onclick="markBillPaid(${b.id})">✓</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:2rem">No bills found</td></tr>';

    renderPagination('bill-pagination', total, 15, page, loadBills);
}

document.getElementById('bill-search').addEventListener('input', debounce(() => loadBills(1), 400));

document.getElementById('btn-add-bill').addEventListener('click', () => {
    document.getElementById('bill-form').reset();
    document.getElementById('bf-date').value = new Date().toISOString().split('T')[0];
    openModal('modal-bill');
});

document.getElementById('bill-form').addEventListener('submit', async e => {
    e.preventDefault();
    const body = {
        customer_id:     parseInt(document.getElementById('bf-customer').value),
        installation_id: parseInt(document.getElementById('bf-installation').value) || null,
        service_id:      parseInt(document.getElementById('bf-service').value) || null,
        bill_date:       document.getElementById('bf-date').value,
        subtotal:        parseFloat(document.getElementById('bf-subtotal').value) || 0,
        service_charge:  parseFloat(document.getElementById('bf-charge').value) || 0,
        grand_total:     parseFloat(document.getElementById('bf-total').value),
        payment_mode:    document.getElementById('bf-mode').value,
        payment_status:  document.getElementById('bf-status').value,
    };
    const res = await API.post('/api/bills', body);
    if (res.success) { closeModal('modal-bill'); toast('Invoice generated! SMS logged 📱', 'success'); loadBills(billPage); }
    else toast(res.message, 'error');
});

function markBillPaid(id) {
    API.put(`/api/bills/${id}`, { payment_status: 'Paid' }).then(res => {
        if (res.success) { toast('Marked as Paid ✓', 'success'); loadBills(billPage); }
    });
}

// ═══════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════
let showLowOnly = false;

async function loadInventory() {
    const res = await API.get(`/api/inventory${showLowOnly ? '?low_stock=true' : ''}`);
    if (!res.success) return;

    document.getElementById('inventory-body').innerHTML = res.data.map((inv, i) => `
        <tr class="${inv.is_low_stock ? 'low-stock-row' : ''}">
            <td style="color:var(--text-muted)">${i+1}</td>
            <td><strong>${inv.part_name}</strong></td>
            <td>${inv.brand || '—'}</td>
            <td>
                <span style="font-family:Outfit;font-size:1rem;font-weight:700;color:${inv.is_low_stock ? 'var(--accent-red)' : 'var(--accent-green)'}">
                    ${inv.available_stock}
                </span>
            </td>
            <td style="color:var(--text-muted)">${inv.reorder_level}</td>
            <td>${fmt.currency(inv.purchase_price)}</td>
            <td>${fmt.currency(inv.selling_price)}</td>
            <td>${inv.is_low_stock
                ? '<span class="badge badge-red">⚠ Low Stock</span>'
                : '<span class="badge badge-green">In Stock</span>'}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="editInventory(${inv.id})">✏️</button>
                    <button class="btn-icon danger" onclick="deleteInventory(${inv.id}, '${inv.part_name}')">🗑</button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:2rem">No inventory items</td></tr>';
}

document.getElementById('btn-low-stock').addEventListener('click', function() {
    showLowOnly = !showLowOnly;
    this.textContent = showLowOnly ? '📦 Show All' : '⚠ Low Stock';
    loadInventory();
});

document.getElementById('btn-add-inventory').addEventListener('click', () => {
    document.getElementById('inventory-form').reset();
    document.getElementById('invf-id').value = '';
    document.getElementById('inventory-modal-title').textContent = 'Add Inventory Item';
    openModal('modal-inventory');
});

document.getElementById('inventory-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id   = document.getElementById('invf-id').value;
    const body = {
        part_name:       document.getElementById('invf-name').value,
        brand:           document.getElementById('invf-brand').value,
        available_stock: parseInt(document.getElementById('invf-stock').value) || 0,
        reorder_level:   parseInt(document.getElementById('invf-reorder').value) || 5,
        purchase_price:  parseFloat(document.getElementById('invf-purchase').value) || 0,
        selling_price:   parseFloat(document.getElementById('invf-selling').value) || 0,
    };
    const res = id
        ? await API.put(`/api/inventory/${id}`, body)
        : await API.post('/api/inventory', body);
    if (res.success) { closeModal('modal-inventory'); toast(res.message, 'success'); loadInventory(); }
    else toast(res.message, 'error');
});

function editInventory(id) {
    API.get('/api/inventory').then(res => {
        const inv = res.data.find(x => x.id === id);
        if (!inv) return;
        document.getElementById('invf-id').value       = inv.id;
        document.getElementById('invf-name').value     = inv.part_name;
        document.getElementById('invf-brand').value    = inv.brand || '';
        document.getElementById('invf-stock').value    = inv.available_stock;
        document.getElementById('invf-reorder').value  = inv.reorder_level;
        document.getElementById('invf-purchase').value = inv.purchase_price;
        document.getElementById('invf-selling').value  = inv.selling_price;
        document.getElementById('inventory-modal-title').textContent = 'Edit Inventory Item';
        openModal('modal-inventory');
    });
}

function deleteInventory(id, name) {
    if (!confirm(`Delete "${name}" from inventory?`)) return;
    API.delete(`/api/inventory/${id}`).then(res => {
        if (res.success) { toast('Item deleted', 'success'); loadInventory(); }
        else toast(res.message, 'error');
    });
}

// ═══════════════════════════════════════════════════════════
// SMS LOGS
// ═══════════════════════════════════════════════════════════
let smsPage = 1;

async function loadSmsLogs(page = 1) {
    smsPage = page;
    const res = await API.get(`/api/sms-logs?page=${page}&limit=20`);
    if (!res.success) return;
    const { items, total } = res.data;

    document.getElementById('sms-body').innerHTML = items.map((s, i) => `
        <tr>
            <td style="color:var(--text-muted)">${(page-1)*20 + i + 1}</td>
            <td>${s.customer_id}</td>
            <td style="font-family:monospace">${s.mobile}</td>
            <td style="max-width:350px;white-space:normal;font-size:.78rem;color:var(--text-secondary)">${s.message}</td>
            <td><span class="badge badge-green">${s.status}</span></td>
            <td>${fmt.date(s.sent_at)}</td>
        </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem">No SMS logs</td></tr>';

    renderPagination('sms-pagination', total, 20, page, loadSmsLogs);
}

// ═══════════════════════════════════════════════════════════
// DROPDOWN REFRESH (for modals)
// ═══════════════════════════════════════════════════════════
let _customers  = [];
let _technicians = [];
let _products    = [];

async function refreshDropdowns() {
    const [cr, tr, pr] = await Promise.all([
        API.get('/api/customers?limit=500'),
        API.get('/api/technicians'),
        API.get('/api/products'),
    ]);
    if (cr.success) _customers   = cr.data.items || [];
    if (tr.success) _technicians = tr.data || [];
    if (pr.success) _products    = pr.data || [];

    const custOpts = `<option value="">-- Select Customer --</option>` +
        _customers.map(c => `<option value="${c.id}">${c.customer_name} (${c.mobile})</option>`).join('');
    const techOpts = `<option value="">-- Select Technician --</option>` +
        _technicians.filter(t => t.status === 'Active').map(t => `<option value="${t.id}">${t.technician_name}</option>`).join('');
    const prodOpts = `<option value="">-- Select Product --</option>` +
        _products.map(p => `<option value="${p.id}">${p.product_name} (${p.brand})</option>`).join('');

    ['if-customer','sf-customer','bf-customer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = custOpts;
    });
    ['if-technician','sf-technician'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = techOpts;
    });
    const pSel = document.getElementById('if-product');
    if (pSel) pSel.innerHTML = prodOpts;
}

// ═══════════════════════════════════════════════════════════
// PAGINATION HELPER
// ═══════════════════════════════════════════════════════════
function renderPagination(containerId, total, limit, current, loadFn) {
    const pages  = Math.ceil(total / limit);
    const el     = document.getElementById(containerId);
    if (!el || pages <= 1) { if(el) el.innerHTML = ''; return; }

    let html = `<span style="color:var(--text-muted)">Showing ${Math.min((current-1)*limit+1, total)}–${Math.min(current*limit, total)} of ${total}</span>`;
    html += `<button class="page-btn" ${current===1?'disabled':''} onclick="arguments[0].preventDefault();(${loadFn.name})(${current-1})">‹</button>`;
    for (let p = 1; p <= pages; p++) {
        if (p === 1 || p === pages || Math.abs(p - current) <= 1) {
            html += `<button class="page-btn ${p===current?'active':''}" onclick="(${loadFn.name})(${p})">${p}</button>`;
        } else if (Math.abs(p - current) === 2) {
            html += `<span style="color:var(--text-muted)">…</span>`;
        }
    }
    html += `<button class="page-btn" ${current===pages?'disabled':''} onclick="(${loadFn.name})(${current+1})">›</button>`;
    el.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════
// DEBOUNCE
// ═══════════════════════════════════════════════════════════
function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
refreshDropdowns();

/**
 * PureFlow Service Hub – Frontend Application Logic
 * Chart.js powered dashboard + REST API integration
 */

'use strict';

const API = {
    async get(url) {
        try {
            const r = await fetch(url, { credentials: 'include' });
            return await r.json();
        } catch (e) {
            console.error('API.get error:', e);
            return { success: false, message: 'Network error or server unavailable' };
        }
    },
    async post(url, body) {
        try {
            const r = await fetch(url, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            return await r.json();
        } catch (e) {
            console.error('API.post error:', e);
            return { success: false, message: 'Network error or server unavailable' };
        }
    },
    async put(url, body) {
        try {
            const r = await fetch(url, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            return await r.json();
        } catch (e) {
            console.error('API.put error:', e);
            return { success: false, message: 'Network error or server unavailable' };
        }
    },
    async delete(url) {
        try {
            const r = await fetch(url, { method: 'DELETE', credentials: 'include' });
            return await r.json();
        } catch (e) {
            console.error('API.delete error:', e);
            return { success: false, message: 'Network error or server unavailable' };
        }
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

// ═══════════════════════════════════════════════════════════
// THERMAL PRINT ENGINE
// ═══════════════════════════════════════════════════════════
function printThermalBill(receipt) {
    const fmtAmt = v => parseFloat(v || 0).toFixed(2);
    const fmtQty = v => (v !== null && v !== undefined) ? String(v) : '';

    // Build items rows HTML
    let rowsHtml = '';
    let totalQty = 0;
    let grandTotal = 0;

    (receipt.line_items || []).forEach(item => {
        const qty   = (item.qty !== null && item.qty !== undefined) ? item.qty : null;
        const rate  = parseFloat(item.rate || 0);
        const total = qty !== null ? qty * rate : rate;
        grandTotal += total;
        if (qty !== null) totalQty += qty;

        rowsHtml += `
        <tr>
            <td class="td-desc">${item.description}</td>
            <td class="td-center">${fmtQty(qty)}</td>
            <td class="td-right">${fmtAmt(rate)}</td>
            <td class="td-right">${fmtAmt(total)}</td>
        </tr>`;
    });

    // Absolute URL for the logo (works from any page)
    const logoUrl = window.location.origin + '/static/logo.jpg';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Receipt - ${receipt.invoice_no}</title>
<style>
  @page { size: 80mm auto; margin: 2mm 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    color: #000;
    width: 74mm;
    margin: 0 auto;
    padding: 2mm 0;
    background: #fff;
  }
  .center   { text-align: center; }
  .bold     { font-weight: bold; }
  .hr       { border: none; border-top: 1px dashed #000; margin: 3px 0; }
  .hr-solid { border: none; border-top: 1px solid #000; margin: 3px 0; }

  .receipt-title { text-align: center; font-size: 15px; font-weight: 900; letter-spacing: 2px; margin-bottom: 4px; }
  .header-row    { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 2px; }
  .biz-block     { flex: 1; }
  .biz-name      { font-size: 11.5px; font-weight: 900; line-height: 1.4; }
  .biz-addr      { font-size: 10px; font-weight: bold; line-height: 1.5; }
  .logo-wrap     { flex-shrink: 0; }
  .logo-img      { width: 48px; height: 48px; object-fit: contain; display: block; border-radius: 4px; }

  .meta-row { display: flex; justify-content: space-between; font-size: 10.5px; margin: 2px 0; }
  .to-row   { font-size: 12px; font-weight: bold; margin: 4px 0 2px; }
  table.items { width: 100%; border-collapse: collapse; margin: 3px 0; font-size: 10.5px; }
  .items th { text-align: left; font-weight: bold; padding: 1px 0; border-bottom: 1px solid #000; }
  .items td { padding: 2px 0; vertical-align: top; }
  .td-desc   { width: 42%; word-break: break-word; }
  .td-center { width: 12%; text-align: center; }
  .td-right  { width: 23%; text-align: right; }
  .total-row td { font-weight: bold; border-top: 1px solid #000; padding-top: 3px; }
  .net-row  { display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin: 4px 0; }
  .footer   { text-align: center; font-size: 10px; font-weight: bold; margin-top: 6px; line-height: 1.6; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
  .print-btn {
    display: block; width: 100%; margin: 8px 0 0; padding: 6px;
    background: #000; color: #fff; border: none; font-size: 12px;
    cursor: pointer; font-family: inherit;
  }
</style>
</head>
<body>

<div class="receipt-title">${receipt.bill_type || 'ESTIMATE'}</div>

<div class="header-row">
  <div class="biz-block">
    <div class="biz-name">AQUA CARE WATER SOLUTION</div>
    <div class="biz-addr">${receipt.business.address}</div>
    <div class="biz-addr">${receipt.business.mobile}</div>
  </div>
  <div class="logo-wrap">
    <img class="logo-img" src="${logoUrl}" alt="Aqua Care Logo">
  </div>
</div>

<hr class="hr-solid">
<div class="meta-row">
  <span>No. : <strong>${receipt.invoice_no}</strong></span>
  <span>Date : <strong>${receipt.bill_date}</strong></span>
</div>
<hr class="hr-solid">

<div class="to-row">To. ${receipt.customer_name}</div>

<hr class="hr">

<table class="items">
  <thead>
    <tr>
      <th class="td-desc">Description of</th>
      <th class="td-center">QTY.</th>
      <th class="td-right">Rate</th>
      <th class="td-right">Total</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
    <tr class="total-row">
      <td class="td-desc bold">Total Amount</td>
      <td class="td-center bold">${totalQty || ''}</td>
      <td class="td-right"></td>
      <td class="td-right bold">${fmtAmt(grandTotal)}</td>
    </tr>
  </tbody>
</table>

<hr class="hr-solid">
<div class="net-row">
  <span>Net Amount Rs.</span>
  <span>${fmtAmt(grandTotal)}</span>
</div>
<hr class="hr-solid">

<div class="footer">Goods once Sold cannot be<br>Taken Back</div>

<button class="print-btn no-print" onclick="window.print()">Print Bill</button>

</body>
</html>`;

    const win = window.open('', '_blank', 'width=390,height=660,scrollbars=yes');
    if (!win) { toast('Pop-up blocked! Please allow pop-ups and try again.', 'error'); return; }
    win.document.write(html);
    win.document.close();
    win.addEventListener('load', () => { win.focus(); win.print(); });
}

async function printBillById(billId) {
    const res = await API.get(`/api/bills/${billId}/receipt`);
    if (res.success) printThermalBill(res.data);
    else toast('Could not load receipt data', 'error');
}

async function printInstallationBill(installId) {
    const res = await API.get(`/api/installations/${installId}/receipt`);
    if (res.success) printThermalBill(res.data);
    else toast('Could not load receipt data', 'error');
}

async function printServiceBill(serviceId) {
    const res = await API.get(`/api/services/${serviceId}/receipt`);
    if (res.success) printThermalBill(res.data);
    else toast('Could not load receipt data', 'error');
}


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

    // ── Technician Photo Helpers ─────────────────────────────
    _setTechPhotoPreview(url) {
        document.getElementById('tf-photo-url').value = url;
        document.getElementById('tf-photo-preview').src = url;
        document.getElementById('tf-photo-preview-wrap').style.display = 'flex';
        document.getElementById('tf-photo-placeholder').style.display = 'none';
        document.getElementById('tf-photo-dropzone').style.borderColor = 'var(--accent-cyan)';
    },
    clearTechPhoto() {
        document.getElementById('tf-photo-url').value = '';
        document.getElementById('tf-photo-preview').src = '';
        document.getElementById('tf-photo-preview-wrap').style.display = 'none';
        document.getElementById('tf-photo-placeholder').style.display = 'block';
        document.getElementById('tf-photo-dropzone').style.borderColor = 'var(--border-hover)';
        const inp = document.getElementById('tf-photo-input');
        if (inp) inp.value = '';
    },
    async _uploadTechPhoto(file) {
        const fd = new FormData();
        fd.append('photo', file);
        try {
            const res = await fetch('/api/upload/technician-photo', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                this._setTechPhotoPreview(data.data.url);
                toast('Photo uploaded ✅', 'success');
            } else {
                toast(data.message || 'Upload failed', 'error');
            }
        } catch (err) {
            toast('Upload failed: ' + err.message, 'error');
        }
    },
    handleTechPhotoSelect(event) {
        const file = event.target.files[0];
        if (file) this._uploadTechPhoto(file);
    },
    handleTechPhotoDrop(event) {
        event.preventDefault();
        document.getElementById('tf-photo-dropzone').style.borderColor = 'var(--border-hover)';
        const file = event.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) this._uploadTechPhoto(file);
        else toast('Please drop an image file', 'error');
    },
    // ────────────────────────────────────────────────────────

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
const signupForm = document.getElementById('signup-form');
const techLoginForm = document.getElementById('tech-login-form');
const loginHint = document.getElementById('login-hint-text');

// Login Role Tab Switcher
App.switchLoginTab = function(role) {
    const isHub = role === 'hub';
    document.getElementById('tab-hub').classList.toggle('active', isHub);
    document.getElementById('tab-tech').classList.toggle('active', !isHub);
    loginForm.classList.toggle('hidden', !isHub);
    signupForm.classList.add('hidden');
    techLoginForm.classList.toggle('hidden', isHub);
    if (loginHint) loginHint.classList.toggle('hidden', !isHub);
};

document.getElementById('btn-to-signup').addEventListener('click', e => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    loginHint.classList.add('hidden');
    signupForm.classList.remove('hidden');
});

document.getElementById('btn-to-login').addEventListener('click', e => {
    e.preventDefault();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    loginHint.classList.remove('hidden');
});

// Technician Login Submission
techLoginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('tech-login-btn');
    btn.innerHTML = '<span>Logging in…</span>';
    btn.disabled = true;
    const res = await API.post('/api/auth/tech-login', {
        tech_id:  document.getElementById('tech-id-input').value.trim(),
        passcode: document.getElementById('tech-passcode-input').value
    });
    btn.innerHTML = '<span>🔧 Technician Login</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    btn.disabled = false;
    if (res.success) {
        showTechPortal(res.data);
        toast('Welcome, ' + res.data.technician_name + '! Ready to work 🔧', 'success');
    } else {
        toast(res.message || 'Login failed', 'error');
    }
});

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

signupForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('signup-btn');
    btn.innerHTML = '<span>Creating Account…</span>';
    btn.disabled = true;
    const res = await API.post('/api/auth/register', {
        business_name:    document.getElementById('signup-business-name').value,
        owner_name:       document.getElementById('signup-owner-name').value,
        email:            document.getElementById('signup-email').value,
        mobile:           document.getElementById('signup-mobile').value,
        password:         document.getElementById('signup-password').value,
        business_address: document.getElementById('signup-address').value,
        gst_number:       document.getElementById('signup-gst').value || null
    });
    btn.innerHTML = '<span>Create Business Account</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    btn.disabled = false;
    if (res.success) {
        showApp(res.data);
        toast('Business registered successfully! Welcome! 🎉', 'success');
    } else {
        toast(res.message || 'Registration failed', 'error');
    }
});

function showApp(user) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('tech-portal').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('sidebar-name').textContent = user.owner_name || 'Admin';
    document.getElementById('sidebar-avatar').textContent = (user.owner_name || 'A')[0].toUpperCase();
    document.getElementById('dash-user-name').textContent = user.owner_name.split(' ')[0];
    App.navigate('dashboard');
}

function showTechPortal(tech) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.add('hidden');
    const portal = document.getElementById('tech-portal');
    portal.classList.remove('hidden');
    document.getElementById('tech-portal-name').textContent = tech.technician_name;
    document.getElementById('tech-portal-id').textContent = tech.tech_id || '';
    document.getElementById('tech-portal-status').textContent = tech.status || 'Active';
    // Show photo in header if available
    const avatarImg  = document.getElementById('tech-portal-avatar-img');
    const avatarIcon = document.getElementById('tech-portal-avatar-icon');
    if (tech.photo_url) {
        avatarImg.src = tech.photo_url;
        avatarImg.style.display = 'block';
        avatarIcon.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        avatarIcon.style.display = 'inline';
    }
    // Initialize tech portal data
    App.techPortalInit();
}

document.getElementById('logout-btn').addEventListener('click', async () => {
    await API.post('/api/auth/logout', {});
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    toast('Signed out successfully', 'info');
});

App.techLogout = async function() {
    await API.post('/api/auth/logout', {});
    document.getElementById('tech-portal').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    // Reset tech login form
    techLoginForm.reset();
    App.switchLoginTab('tech');
    toast('Signed out successfully', 'info');
};

// Check if already logged in
(async () => {
    const res = await API.get('/api/auth/me');
    if (res.success) {
        if (res.data.role === 'technician') {
            showTechPortal(res.data);
        } else {
            showApp(res.data);
        }
    }
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

    // Daily Service Summary KPI & Table
    if (stats.daily_services) {
        const ds = stats.daily_services;
        const totalEl = document.getElementById('daily-stat-total');
        const compEl = document.getElementById('daily-stat-completed');
        const pendEl = document.getElementById('daily-stat-pending');
        const overEl = document.getElementById('daily-stat-overdue');
        if (totalEl) totalEl.textContent = ds.total || 0;
        if (compEl) compEl.textContent = ds.completed || 0;
        if (pendEl) pendEl.textContent = ds.pending || 0;
        if (overEl) overEl.textContent = ds.overdue || 0;

        const dailyTbody = document.getElementById('daily-services-body');
        if (dailyTbody) {
            const list = ds.list || [];
            dailyTbody.innerHTML = list.length ? list.map(item => `
                <tr>
                    <td><strong>${item.customer_name}</strong></td>
                    <td>${item.customer_mobile || '—'}</td>
                    <td>${fmt.serviceType(item.service_type || 'General')}</td>
                    <td>${item.technician_name || '—'}</td>
                    <td>
                        <span class="badge ${item.status === 'Completed' ? 'badge-green' : (item.status === 'Overdue' ? 'badge-red' : 'badge-gold')}">
                            ${item.status}
                        </span>
                    </td>
                    <td><strong style="color:var(--accent-cyan)">${item.amount ? fmt.currency(item.amount) : '₹0'}</strong></td>
                </tr>
            `).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.5rem">No service visits scheduled for today</td></tr>';
        }
    }

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
    grid.innerHTML = res.data.map(t => {
        const avatarHtml = t.photo_url
            ? `<img src="${t.photo_url}" alt="${t.technician_name}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--accent-cyan);margin-bottom:0.5rem;">`
            : `<div class="tech-avatar">🔧</div>`;
        return `
        <div class="tech-card">
            ${avatarHtml}
            <div class="tech-name">${t.technician_name}</div>
            <div class="tech-meta">📞 ${t.mobile}</div>
            ${t.email ? `<div class="tech-meta">✉️ ${t.email}</div>` : ''}
            ${t.address ? `<div class="tech-meta">📍 ${t.address}</div>` : ''}
            <div style="margin-top:.5rem">${fmt.techStatus(t.status)}</div>
            <div class="tech-actions">
                <button class="btn btn-sm btn-outline" onclick="editTechnician(${t.id})">✏️ Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTechnician(${t.id}, '${t.technician_name}')">Delete</button>
            </div>
        </div>`;
    }).join('') || '<p style="color:var(--text-muted)">No technicians found</p>';
}

document.getElementById('btn-add-technician').addEventListener('click', () => {
    document.getElementById('technician-form').reset();
    document.getElementById('tf-id').value = '';
    document.getElementById('technician-modal-title').textContent = 'Add Technician';
    App.clearTechPhoto();
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
        photo_url:       document.getElementById('tf-photo-url').value || null,
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
        // Restore photo preview if existing
        if (t.photo_url) {
            App._setTechPhotoPreview(t.photo_url);
        } else {
            App.clearTechPhoto();
        }
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
                    <button class="btn-icon" title="Print Bill" onclick="printInstallationBill(${inst.id})" style="color:var(--accent-cyan)">🖨️</button>
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
                        <button class="btn-icon" title="Send SMS (Local App)" onclick="sendReminderSMS(${s.id}, '${s.customer_name}', '${s.customer_mobile || ''}', '${s.next_service_date}')">📲</button>
                        <button class="btn-icon" title="Send WhatsApp Message" style="color:#25D366" onclick="sendReminderWhatsApp(${s.id}, '${s.customer_name}', '${s.customer_mobile || ''}', '${s.next_service_date}')">💬</button>
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
function sendReminderSMS(id, name, mobile, dateStr) {
    const formattedDate = new Date(dateStr).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    const msg = `Dear ${name}, your PureFlow RO Service is scheduled for ${formattedDate}. Please confirm your availability. Thank you!`;
    const cleanMobile = mobile.replace(/\D/g, '');
    const smsUrl = `sms:${cleanMobile}?body=${encodeURIComponent(msg)}`;
    window.open(smsUrl, '_self');
    API.put(`/api/schedules/${id}`, { reminder_sent: 'Yes' }).then(res => {
        if (res.success) { toast('Opened SMS app. Status marked as sent.', 'success'); loadSchedules(); }
    });
}

function sendReminderWhatsApp(id, name, mobile, dateStr) {
    const formattedDate = new Date(dateStr).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    const msg = `Dear ${name}, your PureFlow RO Service is scheduled for ${formattedDate}. Please confirm your availability. Thank you!`;
    let cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length === 10) cleanMobile = '91' + cleanMobile;
    const waUrl = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    API.put(`/api/schedules/${id}`, { reminder_sent: 'Yes' }).then(res => {
        if (res.success) { toast('Opened WhatsApp. Status marked as sent.', 'success'); loadSchedules(); }
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
                    <button class="btn-icon" title="Print Bill" onclick="printServiceBill(${s.id})" style="color:var(--accent-cyan)">🖨️</button>
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
                    <button class="btn-icon" title="Print Bill" onclick="printBillById(${b.id})" style="color:var(--accent-cyan)">🖨️</button>
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
    const qEl = document.getElementById('inventory-search');
    const q = qEl ? qEl.value.trim() : '';
    let url = `/api/inventory?`;
    if (showLowOnly) url += 'low_stock=true&';
    if (q) url += `q=${encodeURIComponent(q)}&`;
    const res = await API.get(url);
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

const invSearchEl = document.getElementById('inventory-search');
if (invSearchEl) invSearchEl.addEventListener('input', debounce(() => loadInventory(), 400));

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
    const qEl = document.getElementById('sms-search');
    const q = qEl ? qEl.value.trim() : '';
    const res = await API.get(`/api/sms-logs?page=${page}&limit=20&q=${encodeURIComponent(q)}`);
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

const smsSearchEl = document.getElementById('sms-search');
if (smsSearchEl) smsSearchEl.addEventListener('input', debounce(() => loadSmsLogs(1), 400));

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

// ═══════════════════════════════════════════════════════════
// TECHNICIAN PORTAL LOGIC
// ═══════════════════════════════════════════════════════════

App.switchTechTab = function(tab) {
    document.querySelectorAll('.tech-tab').forEach(b => b.classList.toggle('active', b.dataset.techTab === tab));
    document.querySelectorAll('.tech-tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tech-tab-' + tab));
    if (tab === 'jobs') App.techLoadJobs();
};

App.techPortalInit = async function() {
    const pr = await API.get('/api/products');
    if (pr.success) {
        const sel = document.getElementById('ti-product');
        if (sel) sel.innerHTML = '<option value="">— Select Unit —</option>' +
            pr.data.map(p => `<option value="${p.id}">${p.product_name} (${p.brand})</option>`).join('');
    }
    const cr = await API.get('/api/customers?limit=500');
    if (cr.success) {
        const custs = cr.data.items || [];
        const custOpts = '<option value="">— New Customer —</option>' +
            custs.map(c => `<option value="${c.id}" data-name="${c.customer_name}" data-mobile="${c.mobile}" data-address="${(c.address||'').replace(/"/g,'&quot;')}" data-city="${c.city||''}">${c.customer_name} (${c.mobile})</option>`).join('');
        const sel1 = document.getElementById('ti-customer-select');
        if (sel1) sel1.innerHTML = custOpts;

        const svcOpts = '<option value="">— Select Customer —</option>' +
            custs.map(c => `<option value="${c.id}">${c.customer_name} (${c.mobile})</option>`).join('');
        const sel2 = document.getElementById('ts-customer');
        if (sel2) sel2.innerHTML = svcOpts;
    }
    
    // Fetch spares (inventory) added by the Hub
    const invRes = await API.get('/api/inventory');
    if (invRes.success) {
        App.techInventory = invRes.data || [];
    }

    const today = new Date().toISOString().split('T')[0];
    const d1 = document.getElementById('ti-install-date');
    if (d1) d1.value = today;
    const d2 = document.getElementById('ts-service-date');
    if (d2) d2.value = today;
};

App.techFillCustomer = function(cid) {
    const sel = document.getElementById('ti-customer-select');
    const opt = sel.options[sel.selectedIndex];
    if (cid && opt) {
        document.getElementById('ti-customer-name').value = opt.dataset.name || '';
        document.getElementById('ti-mobile').value = opt.dataset.mobile || '';
        document.getElementById('ti-address').value = opt.dataset.address || '';
        document.getElementById('ti-city').value = opt.dataset.city || '';
    } else {
        ['ti-customer-name','ti-mobile','ti-address','ti-city'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }
};

App.techLoadCustomerInstalls = async function(cid) {
    const sel = document.getElementById('ts-installation');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Loading... —</option>';
    if (!cid) { sel.innerHTML = '<option value="">— Select Installation —</option>'; return; }
    const res = await API.get('/api/installations?limit=100');
    if (res.success) {
        const custInst = (res.data.items || []).filter(i => String(i.customer_id) === String(cid));
        if (custInst.length) {
            sel.innerHTML = '<option value="">— Select Installation —</option>' +
                custInst.map(i => {
                    const d = i.installation_date ? new Date(i.installation_date).toLocaleDateString('en-IN') : '';
                    return `<option value="${i.id}">${i.product_name} (${d})</option>`;
                }).join('');
        } else {
            sel.innerHTML = '<option value="">No installations found</option>';
        }
    }
};

App.techPreviewPhoto = function(input) {
    const preview = document.getElementById('ti-photo-preview');
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        preview.innerHTML = `<img src="${ev.target.result}" alt="Preview"><button type="button" class="photo-preview-remove" onclick="App.techRemovePhoto()">✕</button>`;
        preview.classList.remove('hidden');
        document.getElementById('photo-upload-zone').style.display = 'none';
    };
    reader.readAsDataURL(input.files[0]);
};

App.techRemovePhoto = function() {
    const preview = document.getElementById('ti-photo-preview');
    preview.classList.add('hidden');
    preview.innerHTML = '';
    document.getElementById('ti-photo-url').value = '';
    document.getElementById('ti-photo-input').value = '';
    document.getElementById('photo-upload-zone').style.display = '';
};

App.techSubmitInstall = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('tech-install-submit-btn');
    btn.innerHTML = '<span>Uploading...</span>'; btn.disabled = true;

    let photoUrl = '';
    const photoInput = document.getElementById('ti-photo-input');
    if (photoInput.files && photoInput.files[0]) {
        const fd = new FormData();
        fd.append('photo', photoInput.files[0]);
        try {
            const upRes = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: fd });
            const upData = await upRes.json();
            if (upData.success) photoUrl = upData.data.photo_url;
            else { toast('Photo upload failed: ' + upData.message, 'error'); btn.innerHTML = '<span>✅ Submit Installation</span>'; btn.disabled = false; return; }
        } catch(err) { toast('Photo upload error', 'error'); }
    }

    btn.innerHTML = '<span>Saving...</span>';
    const cidSel = document.getElementById('ti-customer-select').value;
    const body = {
        customer_name: document.getElementById('ti-customer-name').value,
        mobile:        document.getElementById('ti-mobile').value,
        address:       document.getElementById('ti-address').value,
        city:          document.getElementById('ti-city').value || 'Hyderabad',
        product_id:    parseInt(document.getElementById('ti-product').value),
        installation_date: document.getElementById('ti-install-date').value,
        service_interval_months: parseInt(document.getElementById('ti-warranty').value) || 12,
        source_water_type: document.getElementById('ti-source-water').value,
        input_tds:     parseFloat(document.getElementById('ti-input-tds').value) || null,
        output_tds:    parseFloat(document.getElementById('ti-output-tds').value) || null,
        installation_photo: photoUrl || null,
        remarks:       document.getElementById('ti-remarks').value,
    };
    if (cidSel) body.customer_id = parseInt(cidSel);

    const res = await API.post('/api/installations', body);
    btn.innerHTML = '<span>✅ Submit Installation</span>'; btn.disabled = false;
    if (res.success) {
        toast('Installation recorded successfully! 🛠️', 'success');
        App.techResetInstallForm();
        // Show print success modal
        App._lastInstallId = res.data && res.data.id ? res.data.id : null;
        if (App._lastInstallId) {
            document.getElementById('print-success-type').textContent = 'Installation';
            document.getElementById('print-success-customer').textContent = res.data.customer_name || body.customer_name || '';
            document.getElementById('print-success-amount').textContent =
                '₹' + parseFloat(res.data.selling_price || body.selling_price || 0).toLocaleString('en-IN');
            document.getElementById('print-success-btn').onclick = () => printInstallationBill(App._lastInstallId);
            openModal('modal-print-success');
        } else {
            App.switchTechTab('jobs');
        }
    } else {
        toast(res.message || 'Failed to save installation', 'error');
    }
};

App.techResetInstallForm = function() {
    document.getElementById('tech-install-form').reset();
    document.getElementById('ti-install-date').value = new Date().toISOString().split('T')[0];
    App.techRemovePhoto();
};

let _techPartCount = 0;
App.techAddPart = function() {
    _techPartCount++;
    const id = _techPartCount;
    const row = document.createElement('div');
    row.className = 'tech-part-row';
    row.id = 'tech-part-' + id;

    // Load available inventory spares added by the hub
    const inventory = App.techInventory || [];
    let optionsHtml = '<option value="">— Select Spare Part —</option>';
    inventory.forEach(function(item) {
        const nameEscaped = item.part_name.replace(/"/g, '&quot;');
        optionsHtml += `<option value="${nameEscaped}" data-cost="${item.purchase_price}" data-sell="${item.selling_price}">${item.part_name} (₹${item.selling_price})</option>`;
    });

    row.innerHTML =
        `<select data-field="name" onchange="App.techOnSelectPart(${id})" style="flex: 2; min-width: 150px; padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border); font-family: inherit; font-size: 0.9rem;">${optionsHtml}</select>` +
        '<input type="number" placeholder="Qty" min="1" value="1" data-field="qty" oninput="App.techCalcServiceTotal()" style="width: 70px;">' +
        '<input type="number" placeholder="Cost ₹" min="0" step="0.01" value="0" data-field="cost" readonly style="width: 90px; background: rgba(0,0,0,0.05); color: var(--text-muted); cursor: not-allowed;">' +
        '<input type="number" placeholder="Sell ₹" min="0" step="0.01" value="0" data-field="sell" oninput="App.techCalcServiceTotal()" style="width: 100px;">' +
        `<button type="button" class="tech-part-remove" onclick="App.techRemovePart(${id})">✕</button>`;
    document.getElementById('tech-parts-list').appendChild(row);
};

App.techOnSelectPart = function(rowId) {
    const row = document.getElementById('tech-part-' + rowId);
    if (!row) return;
    const select = row.querySelector('[data-field="name"]');
    const selectedOption = select.options[select.selectedIndex];
    
    const costInput = row.querySelector('[data-field="cost"]');
    const sellInput = row.querySelector('[data-field="sell"]');
    
    if (selectedOption && selectedOption.value !== "") {
        costInput.value = selectedOption.dataset.cost || 0;
        sellInput.value = selectedOption.dataset.sell || 0;
    } else {
        costInput.value = 0;
        sellInput.value = 0;
    }
    App.techCalcServiceTotal();
};

App.techRemovePart = function(id) {
    const row = document.getElementById('tech-part-' + id);
    if (row) row.remove();
    App.techCalcServiceTotal();
};

App.techCalcServiceTotal = function() {
    const charge = parseFloat(document.getElementById('ts-service-charge').value) || 0;
    let partsTotal = 0;
    document.querySelectorAll('.tech-part-row').forEach(function(row) {
        const qty  = parseFloat(row.querySelector('[data-field="qty"]').value) || 0;
        const sell = parseFloat(row.querySelector('[data-field="sell"]').value) || 0;
        partsTotal += qty * sell;
    });
    const grand = charge + partsTotal;
    const fmtR = function(v) { return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    document.getElementById('ts-total-charge').textContent = fmtR(charge);
    document.getElementById('ts-total-parts').textContent  = fmtR(partsTotal);
    document.getElementById('ts-grand-total').textContent  = fmtR(grand);
};

App.techSubmitService = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('tech-service-submit-btn');
    btn.innerHTML = '<span>Saving...</span>'; btn.disabled = true;

    const parts = [];
    document.querySelectorAll('.tech-part-row').forEach(function(row) {
        const name = row.querySelector('[data-field="name"]').value.trim();
        if (name) {
            parts.push({
                part_name:     name,
                quantity:      parseInt(row.querySelector('[data-field="qty"]').value) || 1,
                cost_price:    parseFloat(row.querySelector('[data-field="cost"]').value) || 0,
                selling_price: parseFloat(row.querySelector('[data-field="sell"]').value) || 0,
            });
        }
    });

    const body = {
        customer_id:     parseInt(document.getElementById('ts-customer').value) || null,
        installation_id: parseInt(document.getElementById('ts-installation').value) || null,
        service_type:    document.getElementById('ts-service-type').value,
        service_date:    document.getElementById('ts-service-date').value,
        service_charge:  parseFloat(document.getElementById('ts-service-charge').value) || 0,
        tds_before:      parseFloat(document.getElementById('ts-tds-before').value) || null,
        tds_after:       parseFloat(document.getElementById('ts-tds-after').value) || null,
        remarks:         document.getElementById('ts-remarks').value,
        parts:           parts,
    };

    const res = await API.post('/api/services', body);
    btn.innerHTML = '<span>✅ Submit Service Record</span>'; btn.disabled = false;
    if (res.success) {
        toast('Service recorded successfully! ⚙️', 'success');
        App.techResetServiceForm();
        // Show print success modal
        App._lastServiceId = res.data && res.data.id ? res.data.id : null;
        if (App._lastServiceId) {
            const totalBill = parseFloat(res.data.total_bill || 0);
            document.getElementById('print-success-type').textContent = 'Service';
            document.getElementById('print-success-customer').textContent = res.data.customer_name || '';
            document.getElementById('print-success-amount').textContent = '₹' + totalBill.toLocaleString('en-IN');
            document.getElementById('print-success-btn').onclick = () => printServiceBill(App._lastServiceId);
            openModal('modal-print-success');
        } else {
            App.switchTechTab('jobs');
        }
    } else {
        toast(res.message || 'Failed to save service', 'error');
    }
};

App.techResetServiceForm = function() {
    document.getElementById('tech-service-form').reset();
    document.getElementById('tech-parts-list').innerHTML = '';
    _techPartCount = 0;
    App.techCalcServiceTotal();
    document.getElementById('ts-service-date').value = new Date().toISOString().split('T')[0];
};

App.techLoadJobs = async function() {
    const iRes = await API.get('/api/installations?limit=20');
    const sRes = await API.get('/api/services?limit=20');

    const iContainer = document.getElementById('tech-jobs-installs');
    const sContainer = document.getElementById('tech-jobs-services');

    if (iRes.success) {
        const items = iRes.data.items || [];
        if (items.length) {
            iContainer.innerHTML = items.map(function(i) {
                const d = i.installation_date ? new Date(i.installation_date).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '';
                const photo = i.installation_photo
                    ? '<img src="' + i.installation_photo + '" style="width:100%;max-height:100px;object-fit:cover;border-radius:8px;margin-top:0.5rem;cursor:pointer" onclick="App.openLightbox(\'' + i.installation_photo + '\',\'Installation - ' + i.customer_name + '\')">'
                    : '';
                return '<div class="tech-job-card"><div class="tech-job-top"><div class="tech-job-name">' + i.customer_name + '</div><div class="tech-job-date">' + d + '</div></div><div class="tech-job-detail">' + i.product_name + '</div>' + photo + '<span class="tech-job-type">🛠️ Installation</span></div>';
            }).join('');
        } else {
            iContainer.innerHTML = '<div class="tech-empty-state">No installations found</div>';
        }
    }

    if (sRes.success) {
        const items = sRes.data.items || [];
        if (items.length) {
            sContainer.innerHTML = items.map(function(s) {
                const d = s.service_date ? new Date(s.service_date).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '';
                const amt = parseFloat(s.total_bill || 0).toLocaleString('en-IN');
                return '<div class="tech-job-card"><div class="tech-job-top"><div class="tech-job-name">' + s.customer_name + '</div><div class="tech-job-date">' + d + '</div></div><div class="tech-job-detail">₹' + amt + '</div><span class="tech-job-type">⚙️ ' + s.service_type + '</span></div>';
            }).join('');
        } else {
            sContainer.innerHTML = '<div class="tech-empty-state">No services found</div>';
        }
    }
};

App.openLightbox = function(src, caption) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox-caption').textContent = caption || '';
    document.getElementById('photo-lightbox').classList.remove('hidden');
};

App.closeLightbox = function() {
    document.getElementById('photo-lightbox').classList.add('hidden');
    document.getElementById('lightbox-img').src = '';
};

// ═══════════════════════════════════════════════════════════
// EXCEL-GRADE COLUMN FILTERING, SORTING & EXPORT SYSTEM
// ═══════════════════════════════════════════════════════════

const TableFilters = {
    // Structure: { [tableId]: { [colIndex]: { search: '', selectedValues: Set(), min: null, max: null, datePreset: '', sort: null } } }
    state: {},
    activeMenu: null,

    init(tableId) {
        if (!this.state[tableId]) this.state[tableId] = {};
    },

    getState(tableId, colIndex) {
        this.init(tableId);
        if (!this.state[tableId][colIndex]) {
            this.state[tableId][colIndex] = {
                search: '',
                selectedValues: null, // null means all selected
                min: null,
                max: null,
                datePreset: '',
                sort: null
            };
        }
        return this.state[tableId][colIndex];
    },

    hasActiveFilter(tableId, colIndex) {
        if (!this.state[tableId] || !this.state[tableId][colIndex]) return false;
        const s = this.state[tableId][colIndex];
        return (s.search && s.search.trim() !== '') ||
               (s.selectedValues !== null) ||
               (s.min !== null && s.min !== '') ||
               (s.max !== null && s.max !== '') ||
               (s.datePreset && s.datePreset !== '') ||
               (s.sort !== null);
    },

    updateTriggerBadge(tableId, colIndex) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const thList = table.querySelectorAll('thead th');
        if (thList[colIndex]) {
            const trigger = thList[colIndex].querySelector('.th-filter-trigger');
            if (trigger) {
                if (this.hasActiveFilter(tableId, colIndex)) {
                    trigger.classList.add('active-filter');
                    trigger.title = 'Filter active (click to modify)';
                } else {
                    trigger.classList.remove('active-filter');
                    trigger.title = 'Filter / Sort column';
                }
            }
        }
    },

    extractColumnData(tableId, colIndex) {
        const table = document.getElementById(tableId);
        if (!table) return [];
        const tbody = table.querySelector('tbody');
        if (!tbody) return [];
        const rows = Array.from(tbody.querySelectorAll('tr')).filter(tr => !tr.classList.contains('empty-filter-row'));
        const values = [];
        rows.forEach(row => {
            const cells = row.children;
            if (cells.length > colIndex) {
                const text = cells[colIndex].innerText.trim();
                values.push({ text, row });
            }
        });
        return values;
    },

    applyFilters(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        // Remove existing empty state row
        const prevEmpty = tbody.querySelector('.empty-filter-row');
        if (prevEmpty) prevEmpty.remove();

        const rows = Array.from(tbody.querySelectorAll('tr')).filter(tr => !tr.classList.contains('empty-filter-row'));
        if (!rows.length) return;

        const tableState = this.state[tableId] || {};
        let visibleCount = 0;

        rows.forEach(row => {
            const cells = row.children;
            let show = true;

            for (const colIdxStr in tableState) {
                const colIdx = parseInt(colIdxStr);
                const s = tableState[colIdx];
                if (!s || cells.length <= colIdx) continue;

                const rawText = cells[colIdx].innerText.trim();

                // 1. Value checkbox filter
                if (s.selectedValues !== null) {
                    if (!s.selectedValues.has(rawText)) {
                        show = false;
                        break;
                    }
                }

                // 2. Text Search filter
                if (s.search && s.search.trim() !== '') {
                    if (!rawText.toLowerCase().includes(s.search.toLowerCase().trim())) {
                        show = false;
                        break;
                    }
                }

                // 3. Numeric min / max filter
                if (s.min !== null && s.min !== '') {
                    const numVal = parseFloat(rawText.replace(/[^\d.-]/g, ''));
                    if (isNaN(numVal) || numVal < parseFloat(s.min)) {
                        show = false;
                        break;
                    }
                }
                if (s.max !== null && s.max !== '') {
                    const numVal = parseFloat(rawText.replace(/[^\d.-]/g, ''));
                    if (isNaN(numVal) || numVal > parseFloat(s.max)) {
                        show = false;
                        break;
                    }
                }

                // 4. Date Preset Filter
                if (s.datePreset) {
                    const rowDate = new Date(rawText);
                    if (!isNaN(rowDate.getTime())) {
                        const now = new Date();
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const rowDay = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
                        
                        if (s.datePreset === 'today' && rowDay.getTime() !== today.getTime()) {
                            show = false; break;
                        } else if (s.datePreset === 'past' && rowDay >= today) {
                            show = false; break;
                        } else if (s.datePreset === 'this_week') {
                            const weekStart = new Date(today);
                            weekStart.setDate(today.getDate() - today.getDay());
                            const weekEnd = new Date(weekStart);
                            weekEnd.setDate(weekStart.getDate() + 7);
                            if (rowDay < weekStart || rowDay > weekEnd) { show = false; break; }
                        } else if (s.datePreset === 'this_month') {
                            if (rowDate.getMonth() !== now.getMonth() || rowDate.getFullYear() !== now.getFullYear()) {
                                show = false; break;
                            }
                        }
                    }
                }
            }

            row.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        // Handle Sorting if requested
        for (const colIdxStr in tableState) {
            const colIdx = parseInt(colIdxStr);
            const s = tableState[colIdx];
            if (s && s.sort) {
                const sortedRows = rows.slice().sort((a, b) => {
                    const aText = a.children[colIdx] ? a.children[colIdx].innerText.trim() : '';
                    const bText = b.children[colIdx] ? b.children[colIdx].innerText.trim() : '';
                    const aNum = parseFloat(aText.replace(/[^\d.-]/g, ''));
                    const bNum = parseFloat(bText.replace(/[^\d.-]/g, ''));
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        return s.sort === 'asc' ? aNum - bNum : bNum - aNum;
                    }
                    return s.sort === 'asc' ? aText.localeCompare(bText) : bText.localeCompare(aText);
                });
                sortedRows.forEach(r => tbody.appendChild(r));
                break;
            }
        }

        if (visibleCount === 0) {
            const colSpan = table.querySelectorAll('thead th').length || 7;
            const emptyTr = document.createElement('tr');
            emptyTr.className = 'empty-filter-row';
            emptyTr.innerHTML = `<td colspan="${colSpan}" style="text-align:center;color:var(--text-muted);padding:2rem;">
                🔍 No rows match current filter criteria.
                <button class="btn btn-sm btn-outline" style="margin-left:0.75rem;" onclick="TableFilters.clearTable('${tableId}')">Clear All Filters</button>
            </td>`;
            tbody.appendChild(emptyTr);
        }

        // Update trigger button active state indicators
        const thCount = table.querySelectorAll('thead th').length;
        for (let i = 0; i < thCount; i++) {
            this.updateTriggerBadge(tableId, i);
        }
    },

    clearColumn(tableId, colIndex) {
        if (this.state[tableId] && this.state[tableId][colIndex]) {
            delete this.state[tableId][colIndex];
        }
        this.updateTriggerBadge(tableId, colIndex);
        this.applyFilters(tableId);
        this.closeMenu();
    },

    clearTable(tableId) {
        if (this.state[tableId]) {
            delete this.state[tableId];
        }
        const table = document.getElementById(tableId);
        if (table) {
            table.querySelectorAll('.th-filter-trigger').forEach(b => b.classList.remove('active-filter'));
        }
        this.applyFilters(tableId);
        this.closeMenu();
    },

    closeMenu() {
        if (this.activeMenu) {
            this.activeMenu.remove();
            this.activeMenu = null;
        }
    }
};

window.TableFilters = TableFilters;

window.toggleColumnFilter = function(event, tableId, colIndex, filterType = 'text') {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    // If menu already open for this exact column, toggle off
    if (TableFilters.activeMenu && TableFilters.activeMenu.dataset.colKey === `${tableId}-${colIndex}`) {
        TableFilters.closeMenu();
        return;
    }

    TableFilters.closeMenu();

    const triggerBtn = event.currentTarget || event.target.closest('.th-filter-trigger');
    const th = triggerBtn ? triggerBtn.closest('th') : null;
    const colName = th ? th.querySelector('span')?.innerText || `Column ${colIndex+1}` : `Column ${colIndex+1}`;

    const colData = TableFilters.extractColumnData(tableId, colIndex);
    const valueCounts = {};
    colData.forEach(item => {
        const val = item.text || '(Blank)';
        valueCounts[val] = (valueCounts[val] || 0) + 1;
    });
    const uniqueValues = Object.keys(valueCounts).sort();

    const filterState = TableFilters.getState(tableId, colIndex);

    // Create dropdown menu element
    const menu = document.createElement('div');
    menu.className = 'col-filter-menu';
    menu.dataset.colKey = `${tableId}-${colIndex}`;

    // Generate menu HTML
    let contentHtml = `
        <div class="sort-actions">
            <button type="button" class="sort-btn" id="cfm-sort-asc">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h12M3 18h6"/></svg>
                Sort Ascending (${filterType === 'numeric' ? '0 → 9' : (filterType === 'date' ? 'Oldest → Newest' : 'A → Z')})
            </button>
            <button type="button" class="sort-btn" id="cfm-sort-desc">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h6M3 12h12M3 18h18"/></svg>
                Sort Descending (${filterType === 'numeric' ? '9 → 0' : (filterType === 'date' ? 'Newest → Oldest' : 'Z → A')})
            </button>
        </div>

        <div class="filter-section-title">Filter "${colName}"</div>
        <input type="text" class="filter-search-box" id="cfm-search" placeholder="Search values..." value="${filterState.search || ''}">
    `;

    if (filterType === 'numeric') {
        contentHtml += `
            <div class="filter-range-inputs">
                <input type="number" id="cfm-min" placeholder="Min" value="${filterState.min !== null ? filterState.min : ''}">
                <input type="number" id="cfm-max" placeholder="Max" value="${filterState.max !== null ? filterState.max : ''}">
            </div>
        `;
    } else if (filterType === 'date') {
        contentHtml += `
            <div class="filter-presets">
                <button type="button" class="filter-preset-chip ${filterState.datePreset === 'today' ? 'active' : ''}" data-preset="today">Today</button>
                <button type="button" class="filter-preset-chip ${filterState.datePreset === 'this_week' ? 'active' : ''}" data-preset="this_week">This Week</button>
                <button type="button" class="filter-preset-chip ${filterState.datePreset === 'this_month' ? 'active' : ''}" data-preset="this_month">This Month</button>
                <button type="button" class="filter-preset-chip ${filterState.datePreset === 'past' ? 'active' : ''}" data-preset="past">Past Due</button>
            </div>
        `;
    }

    // Values list with checkboxes
    contentHtml += `
        <div class="filter-values-list" id="cfm-val-list">
            <div class="filter-val-item">
                <label>
                    <input type="checkbox" id="cfm-select-all" ${filterState.selectedValues === null ? 'checked' : ''}>
                    <strong>(Select All)</strong>
                </label>
            </div>
            ${uniqueValues.map(val => {
                const isChecked = filterState.selectedValues === null || filterState.selectedValues.has(val);
                return `
                    <div class="filter-val-item" data-val="${val.toLowerCase()}">
                        <label>
                            <input type="checkbox" class="cfm-val-cb" value="${val.replace(/"/g, '&quot;')}" ${isChecked ? 'checked' : ''}>
                            <span title="${val.replace(/"/g, '&quot;')}">${val}</span>
                        </label>
                        <span class="filter-val-count">${valueCounts[val]}</span>
                    </div>
                `;
            }).join('')}
        </div>

        <div class="filter-menu-actions">
            <button type="button" class="btn btn-sm btn-outline" id="cfm-clear">Clear</button>
            <button type="button" class="btn btn-sm btn-primary" id="cfm-apply">Apply</button>
        </div>
    `;

    menu.innerHTML = contentHtml;
    document.body.appendChild(menu);
    TableFilters.activeMenu = menu;

    // Position menu below the trigger button
    const btnRect = triggerBtn.getBoundingClientRect();
    let top = btnRect.bottom + window.scrollY + 4;
    let left = btnRect.left + window.scrollX;
    
    // Boundary check for right side of window
    if (left + 260 > window.innerWidth) {
        left = window.innerWidth - 270;
    }
    menu.style.top = `${top}px`;
    menu.style.left = `${Math.max(10, left)}px`;

    // Prevent clicks inside popup from bubbling to window
    menu.addEventListener('click', e => e.stopPropagation());

    // Wire Sort Buttons
    menu.querySelector('#cfm-sort-asc').addEventListener('click', () => {
        filterState.sort = 'asc';
        TableFilters.applyFilters(tableId);
        TableFilters.closeMenu();
    });
    menu.querySelector('#cfm-sort-desc').addEventListener('click', () => {
        filterState.sort = 'desc';
        TableFilters.applyFilters(tableId);
        TableFilters.closeMenu();
    });

    // Wire Search Box inside menu
    const searchInput = menu.querySelector('#cfm-search');
    searchInput.addEventListener('input', e => {
        const query = e.target.value.toLowerCase().trim();
        menu.querySelectorAll('.filter-val-item[data-val]').forEach(item => {
            const val = item.dataset.val;
            item.style.display = (!query || val.includes(query)) ? 'flex' : 'none';
        });
    });

    // Wire (Select All) Checkbox
    const selectAllCb = menu.querySelector('#cfm-select-all');
    const valCbs = menu.querySelectorAll('.cfm-val-cb');
    selectAllCb.addEventListener('change', e => {
        valCbs.forEach(cb => {
            if (cb.closest('.filter-val-item').style.display !== 'none') {
                cb.checked = e.target.checked;
            }
        });
    });

    // Wire Date Presets if present
    menu.querySelectorAll('.filter-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            menu.querySelectorAll('.filter-preset-chip').forEach(c => c.classList.remove('active'));
            if (filterState.datePreset === chip.dataset.preset) {
                filterState.datePreset = '';
            } else {
                chip.classList.add('active');
                filterState.datePreset = chip.dataset.preset;
            }
        });
    });

    // Wire Clear Button
    menu.querySelector('#cfm-clear').addEventListener('click', () => {
        TableFilters.clearColumn(tableId, colIndex);
    });

    // Wire Apply Button
    menu.querySelector('#cfm-apply').addEventListener('click', () => {
        filterState.search = searchInput.value.trim();

        if (filterType === 'numeric') {
            const minVal = menu.querySelector('#cfm-min')?.value;
            const maxVal = menu.querySelector('#cfm-max')?.value;
            filterState.min = minVal !== '' ? parseFloat(minVal) : null;
            filterState.max = maxVal !== '' ? parseFloat(maxVal) : null;
        }

        const checkedValues = new Set();
        let allChecked = true;
        valCbs.forEach(cb => {
            if (cb.checked) {
                checkedValues.add(cb.value);
            } else {
                allChecked = false;
            }
        });

        if (allChecked && !filterState.search) {
            filterState.selectedValues = null;
        } else {
            filterState.selectedValues = checkedValues;
        }

        TableFilters.applyFilters(tableId);
        TableFilters.closeMenu();
    });
};

// Global click outside listener to close column filter menus
document.addEventListener('click', e => {
    if (TableFilters.activeMenu && !TableFilters.activeMenu.contains(e.target) && !e.target.closest('.th-filter-trigger')) {
        TableFilters.closeMenu();
    }
});

// Global escape key listener
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && TableFilters.activeMenu) {
        TableFilters.closeMenu();
    }
});

// Global export to Excel function
window.exportTableToExcel = function(tableId, filename = 'Export') {
    const table = document.getElementById(tableId);
    if (!table) return;

    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
    html += '<x:Name>' + filename + '</x:Name>';
    html += '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
    html += '<body><table border="1">';

    // Clone table and remove action columns / filter triggers
    const clone = table.cloneNode(true);
    clone.querySelectorAll('.th-filter-trigger, .action-btns, button, .sidebar-toggle-close').forEach(el => el.remove());
    clone.querySelectorAll('tr').forEach(tr => {
        if (tr.style.display === 'none' || tr.classList.contains('empty-filter-row')) tr.remove();
    });

    html += clone.innerHTML;
    html += '</table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast(`Exported ${filename} successfully!`, 'success');
};

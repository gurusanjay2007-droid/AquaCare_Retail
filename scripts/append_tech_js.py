#!/usr/bin/env python3
"""Appends Technician Portal JavaScript to app.js"""

tech_js = r"""
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
        App.switchTechTab('jobs');
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
        App.switchTechTab('jobs');
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
"""

with open('frontend/static/js/app.js', 'a', encoding='utf-8') as f:
    f.write(tech_js)

print('Tech Portal JS appended successfully!')

(function () {
    window.__adminLoaded = true;

    const state = {
        products: [],
        orders: [],
        messages: [],
        alerts: []
    };

    function setRuntimeStatus(message) {
        const node = document.getElementById('admin-runtime-status');
        if (!node) return;
        node.style.display = message ? 'block' : 'none';
        node.textContent = message || '';
    }

    function money(v) {
        return `$${(Number(v) || 0).toFixed(2)}`;
    }

    function dateText(v) {
        try { return new Date(v).toLocaleString(); } catch (error) { return v || ''; }
    }

    async function api(path, options = {}) {
        const response = await fetch(path, options);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/admin-login';
            }
            if (response.status === 404 && path.startsWith('/api/')) {
                throw new Error('API not found (404). Start backend with "node app.js".');
            }
            throw new Error(result.message || `Request failed: ${response.status}`);
        }
        return result;
    }

    async function ensureAuthenticated() {
        const response = await fetch('/api/admin/session');
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.authenticated) {
            window.location.href = '/admin-login';
            return false;
        }
        return true;
    }

    function setupLogout() {
        const btn = document.getElementById('admin-logout-btn');
        if (!btn) return;

        btn.addEventListener('click', async () => {
            try {
                await fetch('/api/admin/logout', { method: 'POST' });
            } catch (error) {
                // continue redirect on network error
            }
            window.location.href = '/admin-login';
        });
    }

    function setupTabs() {
        const tabs = document.querySelectorAll('.admin-tab');
        const panels = document.querySelectorAll('.admin-panel');

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                tabs.forEach((t) => t.classList.remove('active'));
                panels.forEach((p) => p.classList.remove('active'));
                tab.classList.add('active');
                const id = tab.getAttribute('data-tab');
                document.getElementById(`panel-${id}`)?.classList.add('active');
            });
        });
    }

    async function loadOverview() {
        const cards = document.getElementById('overview-cards');
        if (!cards) return;

        try {
            const result = await api('/api/admin/overview');
            const c = result.counts || {};
            cards.innerHTML = `
                <article class="overview-card"><h3>Products</h3><p>${c.products || 0}</p></article>
                <article class="overview-card"><h3>Orders</h3><p>${c.orders || 0}</p></article>
                <article class="overview-card"><h3>DMs</h3><p>${c.messages || 0}</p></article>
                <article class="overview-card"><h3>Open Alerts</h3><p>${c.openAlerts || 0}</p></article>
            `;
        } catch (error) {
            cards.innerHTML = `<p>${error.message}</p>`;
        }
    }

    async function loadProducts() {
        const container = document.getElementById('products-list');
        if (!container) return;

        try {
            const result = await api('/api/products');
            state.products = result.products || [];
            if (!state.products.length) {
                container.innerHTML = '<p>No products yet.</p>';
                return;
            }

            container.innerHTML = state.products.map((p) => `
                <article class="admin-card">
                    <h3>${p.name}</h3>
                    <p><strong>Price:</strong> ${money(p.price)}</p>
                    <p><strong>Stock:</strong> ${p.stock}</p>
                    <p><strong>Category:</strong> ${p.category || 'General'}</p>
                    <p><strong>Image URL:</strong> ${p.image ? `<a href="${p.image}" target="_blank" rel="noopener noreferrer">${p.image}</a>` : 'N/A'}</p>
                    ${p.image ? `<img class="admin-product-preview" src="${p.image}" alt="${p.name}" onerror="this.onerror=null;this.style.display='none';">` : ''}
                    <p>${p.description || ''}</p>
                    <div class="admin-row-actions">
                        <button class="checkout-btn" data-edit-product="${p._id}">Edit</button>
                        <button class="remove-btn" data-delete-product="${p._id}">Delete</button>
                    </div>
                </article>
            `).join('');
        } catch (error) {
            state.products = [];
            container.innerHTML = `<p>${error.message}</p>`;
        }
    }

    function bindProductActions() {
        const container = document.getElementById('products-list');
        if (!container) return;

        container.addEventListener('click', async (event) => {
            const editId = event.target.getAttribute('data-edit-product');
            if (editId) {
                const p = state.products.find((x) => String(x._id || x.id) === String(editId));
                if (p) fillProductForm(p);
                return;
            }

            const deleteId = event.target.getAttribute('data-delete-product');
            if (!deleteId) return;

            if (!confirm('Delete this product?')) return;
            try {
                await api(`/api/products/${deleteId}`, { method: 'DELETE' });
                await loadProducts();
                await loadOverview();
            } catch (error) {
                alert(error.message);
            }
        });
    }

    function fillProductForm(product) {
        document.getElementById('product-id').value = product._id || product.id || '';
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-price').value = Number(product.price || 0);
        document.getElementById('product-stock').value = Number(product.stock || 0);
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-image').value = product.image || '';
        document.getElementById('product-colors').value = (product.colors || []).join(', ');
        document.getElementById('product-sizes').value = (product.sizes || []).join(', ');
        document.getElementById('product-description').value = product.description || '';
    }

    function clearProductForm() {
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = '';
    }

    function setFeedback(node, message, tone = '') {
        if (!node) return;
        node.textContent = message || '';
        node.classList.remove('success', 'error', 'info');
        if (tone) {
            node.classList.add(tone);
        }
    }

    function parseListInput(value) {
        if (Array.isArray(value)) {
            return value.map((entry) => String(entry || '').trim()).filter(Boolean).join(', ');
        }
        return String(value || '').trim();
    }

    function normalizeBulkPayload(entry) {
        const safe = entry && typeof entry === 'object' ? entry : {};
        return {
            name: String(safe.name || '').trim(),
            price: Number(safe.price || 0),
            stock: Number(safe.stock || 0),
            category: String(safe.category || '').trim(),
            image: String(safe.image || '').trim(),
            colors: parseListInput(safe.colors),
            sizes: parseListInput(safe.sizes),
            description: String(safe.description || '').trim(),
            rating: Number(safe.rating || 0),
            reviews: Array.isArray(safe.reviews) ? safe.reviews : []
        };
    }

    function validateProductPayload(payload) {
        if (!payload.name || payload.name.length < 2) {
            return 'Product name must be at least 2 characters.';
        }
        if (!Number.isFinite(payload.price) || payload.price < 0) {
            return 'Product price must be a number greater than or equal to 0.';
        }
        if (!Number.isInteger(payload.stock) || payload.stock < 0) {
            return 'Product stock must be a whole number 0 or higher.';
        }
        if (!Number.isFinite(payload.rating) || payload.rating < 0 || payload.rating > 5) {
            return 'Product rating must be between 0 and 5.';
        }
        return '';
    }

    function getProductPayloadFromForm() {
        return {
            name: document.getElementById('product-name').value.trim(),
            price: Number(document.getElementById('product-price').value || 0),
            stock: Number(document.getElementById('product-stock').value || 0),
            category: document.getElementById('product-category').value.trim(),
            image: document.getElementById('product-image').value.trim(),
            colors: document.getElementById('product-colors').value,
            sizes: document.getElementById('product-sizes').value,
            description: document.getElementById('product-description').value.trim(),
            rating: 0,
            reviews: []
        };
    }

    function setupProductForm() {
        const form = document.getElementById('product-form');
        const feedback = document.getElementById('product-feedback');
        const resetBtn = document.getElementById('product-form-reset');
        if (!form || !feedback || !resetBtn) return;

        resetBtn.addEventListener('click', clearProductForm);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            setFeedback(feedback, 'Saving...', 'info');

            const id = document.getElementById('product-id').value.trim();
            const payload = getProductPayloadFromForm();
            const validationError = validateProductPayload(payload);
            if (validationError) {
                setFeedback(feedback, validationError, 'error');
                return;
            }

            try {
                if (id) {
                    await api(`/api/products/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    setFeedback(feedback, 'Product updated.', 'success');
                } else {
                    await api('/api/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    setFeedback(feedback, 'Product created.', 'success');
                }

                clearProductForm();
                await loadProducts();
                await loadOverview();
            } catch (error) {
                setFeedback(feedback, error.message, 'error');
            }
        });
    }

    function parseCsvLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i += 1) {
            const ch = line[i];

            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i += 1;
                    continue;
                }
                inQuotes = !inQuotes;
                continue;
            }

            if (ch === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
                continue;
            }

            current += ch;
        }

        fields.push(current.trim());
        return fields;
    }

    function normalizeInlineList(value) {
        return String(value || '')
            .split('|')
            .map((part) => part.trim())
            .filter(Boolean)
            .join(', ');
    }

    function parseNoCodeRows(rawText) {
        const lines = String(rawText || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line);

        if (!lines.length) {
            return { records: [], rowErrors: ['Paste rows first.'] };
        }

        const first = lines[0].toLowerCase();
        const hasHeader = first.includes('name') && first.includes('price') && first.includes('stock');
        const dataLines = hasHeader ? lines.slice(1) : lines;
        const rowErrors = [];
        const records = [];

        dataLines.forEach((line, index) => {
            const rowNumber = hasHeader ? index + 2 : index + 1;
            const columns = line.includes('\t')
                ? line.split('\t').map((part) => part.trim())
                : parseCsvLine(line);

            if (columns.length < 3) {
                rowErrors.push(`Row ${rowNumber}: expected at least name, price, stock.`);
                return;
            }

            const [
                name = '',
                price = '',
                stock = '',
                category = '',
                image = '',
                colors = '',
                sizes = '',
                description = ''
            ] = columns;

            records.push(normalizeBulkPayload({
                name,
                price,
                stock,
                category,
                image,
                colors: normalizeInlineList(colors),
                sizes: normalizeInlineList(sizes),
                description
            }));
        });

        return { records, rowErrors };
    }

    async function publishProductRecords(records) {
        const existingByName = new Map(
            state.products.map((product) => [String(product?.name || '').trim().toLowerCase(), product])
        );
        const failures = [];
        let created = 0;
        let updated = 0;

        for (let i = 0; i < records.length; i += 1) {
            const payload = normalizeBulkPayload(records[i]);
            const validationError = validateProductPayload(payload);
            if (validationError) {
                failures.push(`Row ${i + 1}: ${validationError}`);
                continue;
            }

            const key = payload.name.toLowerCase();
            const existing = existingByName.get(key);

            try {
                if (existing?._id) {
                    await api(`/api/products/${existing._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    updated += 1;
                } else {
                    const result = await api('/api/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const newProduct = result?.product || {};
                    created += 1;
                    existingByName.set(key, newProduct);
                }
            } catch (error) {
                failures.push(`Row ${i + 1}: ${error.message}`);
            }
        }

        await loadProducts();
        await loadOverview();

        return { created, updated, failures };
    }

    function renderPublishSummary(feedback, summary, prefixErrors = []) {
        const allFailures = [...prefixErrors, ...summary.failures];
        if (!allFailures.length) {
            setFeedback(feedback, `Publish complete. Created ${summary.created}, updated ${summary.updated}.`, 'success');
            return;
        }

        const preview = allFailures.slice(0, 3).join(' | ');
        const remainder = allFailures.length > 3 ? ` (+${allFailures.length - 3} more)` : '';
        setFeedback(
            feedback,
            `Created ${summary.created}, updated ${summary.updated}, failed ${allFailures.length}. ${preview}${remainder}`,
            'error'
        );
    }

    function setupBulkProductPublisher() {
        const input = document.getElementById('product-bulk-json');
        const publishBtn = document.getElementById('product-bulk-publish');
        const clearBtn = document.getElementById('product-bulk-clear');
        const feedback = document.getElementById('product-bulk-feedback');
        const rowsInput = document.getElementById('product-bulk-rows');
        const fileInput = document.getElementById('product-bulk-file');
        const filePublishBtn = document.getElementById('product-bulk-file-publish');
        const rowsPublishBtn = document.getElementById('product-bulk-rows-publish');
        const rowsClearBtn = document.getElementById('product-bulk-rows-clear');
        const rowsTemplateBtn = document.getElementById('product-bulk-rows-template');
        const rowsFeedback = document.getElementById('product-bulk-rows-feedback');
        if (!input || !publishBtn || !clearBtn || !feedback) return;

        clearBtn.addEventListener('click', () => {
            input.value = '';
            setFeedback(feedback, '');
        });

        publishBtn.addEventListener('click', async () => {
            const raw = input.value.trim();
            if (!raw) {
                setFeedback(feedback, 'Paste JSON first.', 'error');
                return;
            }

            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch (error) {
                setFeedback(feedback, 'Invalid JSON. Fix syntax and try again.', 'error');
                return;
            }

            const records = Array.isArray(parsed)
                ? parsed
                : Array.isArray(parsed?.products)
                    ? parsed.products
                    : [];

            if (!records.length) {
                setFeedback(feedback, 'Provide a JSON array of products.', 'error');
                return;
            }

            setFeedback(feedback, `Publishing ${records.length} products...`, 'info');
            const summary = await publishProductRecords(records);
            renderPublishSummary(feedback, summary);
        });

        if (!rowsInput || !rowsPublishBtn || !rowsClearBtn || !rowsTemplateBtn || !rowsFeedback) {
            return;
        }

        rowsTemplateBtn.addEventListener('click', () => {
            rowsInput.value = [
                'name,price,stock,category,image,colors,sizes,description',
                'Crocs Classic Clog,49.99,15,Clogs,,white|black|navy,40|41|42,Everyday comfort.',
                'Crocs Bayaband,54.99,10,Sport,,black|grey,41|42|43,Sporty comfort for daily wear.'
            ].join('\n');
            setFeedback(rowsFeedback, 'Template inserted. Replace sample rows, then click Publish Rows.', 'info');
        });

        rowsClearBtn.addEventListener('click', () => {
            rowsInput.value = '';
            if (fileInput) fileInput.value = '';
            setFeedback(rowsFeedback, '');
        });

        rowsPublishBtn.addEventListener('click', async () => {
            const raw = rowsInput.value.trim();
            const { records, rowErrors } = parseNoCodeRows(raw);

            if (!records.length) {
                setFeedback(rowsFeedback, rowErrors[0] || 'No valid rows found.', 'error');
                return;
            }

            setFeedback(rowsFeedback, `Publishing ${records.length} rows...`, 'info');
            const summary = await publishProductRecords(records);
            renderPublishSummary(rowsFeedback, summary, rowErrors);
        });

        if (!fileInput || !filePublishBtn) {
            return;
        }

        filePublishBtn.addEventListener('click', async () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) {
                setFeedback(rowsFeedback, 'Select a CSV file first.', 'error');
                return;
            }

            setFeedback(rowsFeedback, `Reading ${file.name}...`, 'info');

            let text;
            try {
                text = await file.text();
            } catch (error) {
                setFeedback(rowsFeedback, 'Could not read the selected file.', 'error');
                return;
            }

            const { records, rowErrors } = parseNoCodeRows(text);
            if (!records.length) {
                setFeedback(rowsFeedback, rowErrors[0] || 'No valid rows found in CSV.', 'error');
                return;
            }

            setFeedback(rowsFeedback, `Publishing ${records.length} rows from ${file.name}...`, 'info');
            const summary = await publishProductRecords(records);
            renderPublishSummary(rowsFeedback, summary, rowErrors);
        });
    }

    async function loadOrders() {
        const container = document.getElementById('orders-list');
        if (!container) return;

        try {
            const result = await api('/api/orders');
            state.orders = result.orders || [];
            if (!state.orders.length) {
                container.innerHTML = '<p>No orders yet.</p>';
                return;
            }

            container.innerHTML = state.orders.map((o) => {
                const itemText = (o.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ');
                return `
                    <article class="admin-card">
                        <h3>Order #${o._id}</h3>
                        <p><strong>Date:</strong> ${dateText(o.createdAt)}</p>
                        <p><strong>Customer:</strong> ${o.customer?.fullName || ''} (${o.customer?.email || ''})</p>
                        <p><strong>Items:</strong> ${itemText}</p>
                        <p><strong>Total:</strong> ${money(o.summary?.total)}</p>
                        <div class="admin-row-actions">
                            <select data-order-status="${o._id}">
                                <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>pending</option>
                                <option value="paid" ${o.status === 'paid' ? 'selected' : ''}>paid</option>
                                <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>processing</option>
                                <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>shipped</option>
                                <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>delivered</option>
                                <option value="failed" ${o.status === 'failed' ? 'selected' : ''}>failed</option>
                            </select>
                            <button class="checkout-btn" data-save-order-status="${o._id}">Save Status</button>
                        </div>
                    </article>
                `;
            }).join('');
        } catch (error) {
            container.innerHTML = `<p>${error.message}</p>`;
        }
    }

    function bindOrderActions() {
        const container = document.getElementById('orders-list');
        if (!container) return;

        container.addEventListener('click', async (event) => {
            const id = event.target.getAttribute('data-save-order-status');
            if (!id) return;

            const select = container.querySelector(`select[data-order-status="${id}"]`);
            const status = select ? select.value : 'pending';

            try {
                await api(`/api/orders/${id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                await loadOrders();
            } catch (error) {
                alert(error.message);
            }
        });
    }

    async function loadMessages() {
        const container = document.getElementById('messages-list');
        if (!container) return;

        try {
            const result = await api('/api/contact-messages');
            state.messages = result.messages || [];
            if (!state.messages.length) {
                container.innerHTML = '<p>No messages yet.</p>';
                return;
            }

            container.innerHTML = state.messages.map((m) => `
                <article class="admin-card">
                    <h3>${m.subject}</h3>
                    <p><strong>From:</strong> ${m.name} (${m.email})</p>
                    <p><strong>Date:</strong> ${dateText(m.createdAt)}</p>
                    <p><strong>Status:</strong> ${m.status || 'new'}</p>
                    <p>${m.message}</p>
                    <textarea data-reply="${m._id}" placeholder="Write a reply..."></textarea>
                    <div class="admin-row-actions">
                        <button class="checkout-btn" data-mark-read="${m._id}">Mark Read</button>
                        <button class="checkout-btn" data-send-reply="${m._id}">Save Reply</button>
                    </div>
                </article>
            `).join('');
        } catch (error) {
            container.innerHTML = `<p>${error.message}</p>`;
        }
    }

    function bindMessageActions() {
        const container = document.getElementById('messages-list');
        if (!container) return;

        container.addEventListener('click', async (event) => {
            const markId = event.target.getAttribute('data-mark-read');
            if (markId) {
                try {
                    await api(`/api/contact-messages/${markId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'read' })
                    });
                    await loadMessages();
                    await loadOverview();
                } catch (error) {
                    alert(error.message);
                }
                return;
            }

            const replyId = event.target.getAttribute('data-send-reply');
            if (!replyId) return;

            const textarea = container.querySelector(`textarea[data-reply="${replyId}"]`);
            const adminReply = textarea ? textarea.value.trim() : '';
            if (!adminReply) {
                alert('Write a reply first.');
                return;
            }

            try {
                await api(`/api/contact-messages/${replyId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adminReply, status: 'replied' })
                });
                await loadMessages();
            } catch (error) {
                alert(error.message);
            }
        });
    }

    async function loadAlerts() {
        const container = document.getElementById('alerts-list');
        if (!container) return;

        try {
            const result = await api('/api/stock-alerts');
            state.alerts = result.alerts || [];
            if (!state.alerts.length) {
                container.innerHTML = '<p>No stock alerts yet.</p>';
                return;
            }

            container.innerHTML = state.alerts.map((a) => `
                <article class="admin-card">
                    <h3>${a.productName}</h3>
                    <p><strong>Email:</strong> ${a.email}</p>
                    <p><strong>Status:</strong> ${a.status}</p>
                    <p><strong>Date:</strong> ${dateText(a.createdAt)}</p>
                    <div class="admin-row-actions">
                        <button class="checkout-btn" data-alert-status="${a._id}" data-next-status="${a.status === 'open' ? 'resolved' : 'open'}">${a.status === 'open' ? 'Mark Resolved' : 'Reopen'}</button>
                    </div>
                </article>
            `).join('');
        } catch (error) {
            container.innerHTML = `<p>${error.message}</p>`;
        }
    }

    function bindAlertActions() {
        const container = document.getElementById('alerts-list');
        if (!container) return;

        container.addEventListener('click', async (event) => {
            const id = event.target.getAttribute('data-alert-status');
            const status = event.target.getAttribute('data-next-status');
            if (!id || !status) return;

            try {
                await api(`/api/stock-alerts/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                await loadAlerts();
                await loadOverview();
            } catch (error) {
                alert(error.message);
            }
        });
    }

    async function init() {
        try {
            const ok = await ensureAuthenticated();
            if (!ok) return;

            setupTabs();
            setupLogout();
            setupProductForm();
            setupBulkProductPublisher();
            bindProductActions();
            bindOrderActions();
            bindMessageActions();
            bindAlertActions();

            await Promise.all([
                loadOverview(),
                loadProducts(),
                loadOrders(),
                loadMessages(),
                loadAlerts()
            ]);
            setRuntimeStatus('');
        } catch (error) {
            setRuntimeStatus(`Admin load error: ${error.message}`);
        }
    }

    init();
})();

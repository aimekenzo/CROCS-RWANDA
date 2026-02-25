(function () {
    window.__adminLoaded = true;

    const LOCAL_PRODUCTS_KEY = 'products';
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
                window.location.href = '/pages/admin-login.html';
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
            window.location.href = '/pages/admin-login.html';
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
            window.location.href = '/pages/admin-login.html';
        });
    }

    function getLocalProducts() {
        const products = JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY) || '[]');
        return Array.isArray(products) ? products : [];
    }

    function saveLocalProducts(products) {
        localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
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
            const localProductsCount = getLocalProducts().length;
            cards.innerHTML = `
                <article class="overview-card"><h3>Products (Local)</h3><p>${localProductsCount}</p></article>
                <article class="overview-card"><h3>Orders</h3><p>-</p></article>
                <article class="overview-card"><h3>DMs</h3><p>-</p></article>
                <article class="overview-card"><h3>Open Alerts</h3><p>-</p></article>
            `;
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
            state.products = getLocalProducts();
            if (!state.products.length) {
                container.innerHTML = `<p>${error.message}</p>`;
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
                        <button class="checkout-btn" data-edit-product="${p._id || p.id}">Edit</button>
                        <button class="remove-btn" data-delete-product="${p._id || p.id}">Delete</button>
                    </div>
                </article>
            `).join('');
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
                const next = state.products.filter((p) => String(p._id || p.id) !== String(deleteId));
                state.products = next;
                saveLocalProducts(next);
                await loadProducts();
                await loadOverview();
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

    function setupProductForm() {
        const form = document.getElementById('product-form');
        const feedback = document.getElementById('product-feedback');
        const resetBtn = document.getElementById('product-form-reset');
        if (!form || !feedback || !resetBtn) return;

        resetBtn.addEventListener('click', clearProductForm);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            feedback.textContent = 'Saving...';

            const id = document.getElementById('product-id').value.trim();
            const payload = {
                name: document.getElementById('product-name').value.trim(),
                price: Number(document.getElementById('product-price').value || 0),
                stock: Number(document.getElementById('product-stock').value || 0),
                category: document.getElementById('product-category').value.trim(),
                image: document.getElementById('product-image').value.trim(),
                colors: document.getElementById('product-colors').value,
                sizes: document.getElementById('product-sizes').value,
                description: document.getElementById('product-description').value.trim()
            };

            try {
                if (id) {
                    await api(`/api/products/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    feedback.textContent = 'Product updated.';
                } else {
                    await api('/api/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    feedback.textContent = 'Product created.';
                }

                clearProductForm();
                await loadProducts();
                await loadOverview();
            } catch (error) {
                const current = getLocalProducts();
                const localId = id || `local-${Date.now()}`;
                const localProduct = {
                    id: localId,
                    _id: localId,
                    name: payload.name,
                    price: payload.price,
                    stock: payload.stock,
                    category: payload.category || 'General',
                    image: payload.image,
                    colors: Array.isArray(payload.colors) ? payload.colors : String(payload.colors || '').split(',').map((x) => x.trim()).filter(Boolean),
                    sizes: Array.isArray(payload.sizes) ? payload.sizes : String(payload.sizes || '').split(',').map((x) => x.trim()).filter(Boolean),
                    description: payload.description
                };

                const index = current.findIndex((p) => String(p._id || p.id) === String(localId));
                if (index >= 0) {
                    current[index] = { ...current[index], ...localProduct };
                } else {
                    current.unshift(localProduct);
                }
                saveLocalProducts(current);
                state.products = current;
                feedback.textContent = `Saved locally. (${error.message})`;
                clearProductForm();
                await loadProducts();
                await loadOverview();
            }
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

require('dotenv').config();

const baseUrl = String(process.env.BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');

async function api(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, options);
    const text = await response.text();
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch (error) {
        data = { raw: text };
    }

    if (!response.ok) {
        throw new Error(`${path} -> ${response.status} ${data.message || text || response.statusText}`);
    }

    return { response, data };
}

function getAdminCookie(response) {
    const cookieHeader = response.headers.get('set-cookie') || '';
    return cookieHeader.split(';')[0];
}

async function main() {
    const productName = `Launch QA Product ${Date.now()}`;
    const adminUsername = String(process.env.ADMIN_USERNAME || '');
    const adminPassword = String(process.env.ADMIN_PASSWORD || '');

    if (!adminUsername.trim() || !adminPassword.trim()) {
        throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD are required for e2e order check.');
    }

    const login = await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: adminUsername,
            password: adminPassword
        })
    });

    const adminCookie = getAdminCookie(login.response);
    if (!adminCookie) {
        throw new Error('Admin login did not return a session cookie.');
    }

    const createdProduct = await api('/api/products', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Cookie: adminCookie
        },
        body: JSON.stringify({
            name: productName,
            price: 31,
            description: 'Automated launch QA product',
            image: '',
            stock: 4,
            category: 'Launch QA',
            sizes: '40,41,42'
        })
    });

    const product = createdProduct.data.product;
    const productId = String(product?._id || '');
    if (!productId) {
        throw new Error('Created product did not return an id.');
    }

    const order = await api('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customer: {
                fullName: 'Launch QA Customer',
                email: 'launch.qa@example.com',
                phone: '0788123456'
            },
            payment: {
                method: 'cod'
            },
            items: [
                {
                    productId,
                    name: product.name,
                    price: product.price,
                    quantity: 2,
                    image: product.image
                }
            ],
            summary: {
                subtotal: 62,
                shipping: 5,
                total: 67
            }
        })
    });

    const orderId = String(order.data.orderId || '');
    if (!orderId) {
        throw new Error('Order creation did not return an order id.');
    }

    const productsAfterOrder = await api('/api/products');
    const updatedProduct = (productsAfterOrder.data.products || []).find((entry) => String(entry._id) === productId);
    if (!updatedProduct || Number(updatedProduct.stock) !== 2) {
        throw new Error(`Expected stock to decrement to 2, got ${updatedProduct ? updatedProduct.stock : 'missing product'}.`);
    }

    const tracking = await api(`/api/orders/${encodeURIComponent(orderId)}/track`);
    if (String(tracking.data.order?.status || '') !== 'pending') {
        throw new Error(`Expected tracking status "pending", got "${tracking.data.order?.status}".`);
    }

    await api(`/api/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Cookie: adminCookie
        },
        body: JSON.stringify({ status: 'processing' })
    });

    const trackingAfterUpdate = await api(`/api/orders/${encodeURIComponent(orderId)}/track`);
    if (String(trackingAfterUpdate.data.order?.status || '') !== 'processing') {
        throw new Error(`Expected tracking status "processing", got "${trackingAfterUpdate.data.order?.status}".`);
    }

    console.log(`PASS admin login -> session created`);
    console.log(`PASS product create -> ${productId}`);
    console.log(`PASS order create -> ${orderId}`);
    console.log(`PASS stock decrement -> ${updatedProduct.stock}`);
    console.log(`PASS tracking -> pending to processing`);
    console.log('E2E order flow passed.');
}

main().catch((error) => {
    console.error(`E2E order flow failed: ${error.message}`);
    process.exitCode = 1;
});

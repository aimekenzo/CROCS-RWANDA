(function () {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) {
        return;
    }

    function formatMoney(value) {
        return `$${(Number(value) || 0).toFixed(2)}`;
    }

    function formatDate(value) {
        try {
            return new Date(value).toLocaleString();
        } catch (error) {
            return value || '';
        }
    }

    function renderOrders(orders) {
        if (!orders.length) {
            ordersList.innerHTML = '<p>No orders yet.</p>';
            return;
        }

        ordersList.innerHTML = orders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const itemLines = items.map((item) => `<li>${item.quantity} x ${item.name} (${formatMoney(item.price)})</li>`).join('');
            const paymentLabel = order.payment?.method === 'momo' ? 'MTN MoMo' : 'Card';

            return `
                <article class="order-card">
                    <h3>Order #${order._id}</h3>
                    <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
                    <p><strong>Customer:</strong> ${order.customer?.fullName || ''} (${order.customer?.email || ''})</p>
                    <p><strong>Phone:</strong> ${order.customer?.phone || ''}</p>
                    <p><strong>Payment:</strong> ${paymentLabel}</p>
                    <p><strong>Status:</strong> ${order.status || 'pending'}</p>
                    <ul>${itemLines}</ul>
                    <p><strong>Subtotal:</strong> ${formatMoney(order.summary?.subtotal)}</p>
                    <p><strong>Shipping:</strong> ${formatMoney(order.summary?.shipping)}</p>
                    <p><strong>Total:</strong> ${formatMoney(order.summary?.total)}</p>
                </article>
            `;
        }).join('');
    }

    async function loadOrders() {
        ordersList.innerHTML = '<p>Loading orders...</p>';

        try {
            const response = await fetch('/api/orders');
            const result = await response.json();

            if (!response.ok) {
                ordersList.innerHTML = `<p>Failed to load orders: ${result.message || 'Unknown error'}</p>`;
                return;
            }

            renderOrders(result.orders || []);
        } catch (error) {
            ordersList.innerHTML = '<p>Network error while loading orders.</p>';
        }
    }

    loadOrders();
})();

(function () {
    const LAST_ORDER_ID_STORAGE_KEY = 'crocs_rwanda_last_order_id';
    const orderInput = document.getElementById('orderNumber');
    const messageNode = document.getElementById('tracking-message');
    const updatesNode = document.getElementById('live-updates');
    const statusPoints = Array.from(document.querySelectorAll('.status-point'));
    const statusLabels = ['pending', 'processing', 'shipped', 'delivered'];

    function setMessage(message, type) {
        if (!messageNode) {
            return;
        }

        messageNode.textContent = message || '';
        messageNode.className = type ? `admin-feedback ${type}` : 'admin-feedback';
    }

    function renderStatus(status) {
        const normalizedStatus = String(status || 'pending').trim().toLowerCase();
        const activeIndex = statusLabels.indexOf(normalizedStatus);

        statusPoints.forEach((point, index) => {
            point.classList.toggle('active', activeIndex >= index && activeIndex !== -1);
            if (activeIndex === index) {
                point.setAttribute('aria-current', 'step');
            } else {
                point.removeAttribute('aria-current');
            }
        });

        if (normalizedStatus === 'paid') {
            statusPoints.forEach((point, index) => {
                point.classList.toggle('active', index <= 1);
            });
            statusPoints[1]?.setAttribute('aria-current', 'step');
        }

        if (normalizedStatus === 'failed') {
            statusPoints.forEach((point, index) => {
                point.classList.toggle('active', index === 0);
            });
            statusPoints[0]?.setAttribute('aria-current', 'step');
        }
    }

    function renderUpdates(order) {
        if (!updatesNode) {
            return;
        }

        const items = Array.isArray(order.items) ? order.items : [];
        const lines = [
            `Order ID: ${order._id}`,
            `Created: ${new Date(order.createdAt).toLocaleString()}`,
            `Current status: ${order.status}`,
            `Items: ${items.map((item) => `${item.quantity}x ${item.name}`).join(', ') || 'No items'}`
        ];

        if (order.summary?.total != null) {
            lines.push(`Total: $${(Number(order.summary.total) || 0).toFixed(2)}`);
        }

        updatesNode.innerHTML = lines.map((line) => `<p>${line}</p>`).join('');
    }

    async function fetchTracking(orderId) {
        setMessage('Loading order status...', '');

        try {
            const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/track`);
            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                setMessage(result.message || 'Could not load that order.', 'error');
                if (updatesNode) {
                    updatesNode.innerHTML = '<p>No live updates available.</p>';
                }
                return;
            }

            renderStatus(result.order?.status);
            renderUpdates(result.order || {});
            setMessage('Order loaded successfully.', 'success');
        } catch (error) {
            setMessage('Network error while loading order status.', 'error');
            if (updatesNode) {
                updatesNode.innerHTML = '<p>No live updates available.</p>';
            }
        }
    }

    window.trackOrder = function () {
        const orderId = String(orderInput?.value || '').trim();
        if (!orderId) {
            setMessage('Enter an order ID first.', 'error');
            return;
        }

        fetchTracking(orderId);
    };

    const params = new URLSearchParams(window.location.search);
    const presetOrderId = String(params.get('orderId') || localStorage.getItem(LAST_ORDER_ID_STORAGE_KEY) || '').trim();
    if (presetOrderId && orderInput) {
        orderInput.value = presetOrderId;
        fetchTracking(presetOrderId);
    }
})();

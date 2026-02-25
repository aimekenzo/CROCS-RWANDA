class ShoppingCart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cartItems') || '[]');
        this.selectedItemIds = new Set();
        this.total = 0;
        this.init();
    }

    init() {
        this.updateCartCount();

        if (!document.getElementById('cart-items')) {
            return;
        }

        this.calculateTotal();
        this.selectAllItems();
        this.displayCartItems();
        this.displaySavedItems();
        this.addShippingListeners();
        this.setupSelectTools();
        this.setupVariantPickers();
        this.setupCheckoutFlow();
    }

    updateCartDisplay() {
        this.syncSelectionWithCart();
        this.displayCartItems();
        this.displaySavedItems();
        this.updateCartCount();
        this.updateCheckoutSummary();
        this.updateSelectToolsUI();
    }

    syncSelectionWithCart() {
        const existingIds = new Set(this.items.map((item) => this.getId(item.id)));
        const next = new Set();

        this.selectedItemIds.forEach((id) => {
            const normalized = this.getId(id);
            if (existingIds.has(normalized)) {
                next.add(normalized);
            }
        });

        this.selectedItemIds = next;
    }

    selectAllItems() {
        this.selectedItemIds = new Set(this.items.map((item) => this.getId(item.id)));
    }

    getSelectedItems() {
        return this.items.filter((item) => this.selectedItemIds.has(this.getId(item.id)));
    }

    getId(value) {
        return String(value || '').trim();
    }

    toggleItemSelection(productId, isSelected) {
        const id = this.getId(productId);
        if (isSelected) {
            this.selectedItemIds.add(id);
        } else {
            this.selectedItemIds.delete(id);
        }

        this.updateCartSummary(this.getSelectedSubtotal());
        this.updateSelectToolsUI();
    }

    selectOnlyItem(productId) {
        this.selectedItemIds = new Set([this.getId(productId)]);
        this.updateCartSummary(this.getSelectedSubtotal());
        this.updateSelectToolsUI();
    }

    removeItem(productId) {
        const id = this.getId(productId);
        this.items = this.items.filter((item) => this.getId(item.id) !== id);
        this.selectedItemIds.delete(id);
        this.saveCart();
        this.updateCartDisplay();
    }

    updateQuantity(productId, change) {
        const id = this.getId(productId);
        const item = this.items.find((entry) => this.getId(entry.id) === id);
        if (!item) {
            return;
        }

        item.quantity = Math.max(1, (Number(item.quantity) || 1) + Number(change));
        this.saveCart();
        this.updateCartDisplay();
    }

    calculateTotal() {
        this.total = this.items.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
        return this.total;
    }

    getSubtotal() {
        return this.items.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
    }

    getSelectedSubtotal() {
        return this.getSelectedItems().reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
    }

    getShippingCost() {
        if (!this.getSelectedItems().length) {
            return 0;
        }
        return Number(document.querySelector('input[name="shipping"]:checked')?.value || 5);
    }

    buildLineId(item, sizeValue, colorValue) {
        const currentRaw = this.getId(item.productId || item.id);
        const baseProductId = currentRaw.includes('::') ? currentRaw.split('::')[0] : currentRaw;
        const size = String(sizeValue || '').trim();
        const color = String(colorValue || '').trim();
        return `${baseProductId}::${size || 'nosize'}::${color || 'nocolor'}`;
    }

    validateSelectedVariants() {
        const selected = this.getSelectedItems();
        const missing = [];

        selected.forEach((item) => {
            const needSize = Array.isArray(item.availableSizes) && item.availableSizes.length > 0;
            const needColor = Array.isArray(item.availableColors) && item.availableColors.length > 0;
            const hasSize = Boolean(String(item.selectedSize || '').trim());
            const hasColor = Boolean(String(item.selectedColor || '').trim());

            if ((needSize && !hasSize) || (needColor && !hasColor)) {
                missing.push(item.name);
            }
        });

        if (!missing.length) {
            return { ok: true, message: '' };
        }

        return {
            ok: false,
            message: 'Select required size/color for: ' + [...new Set(missing)].join(', ')
        };
    }

    updateCartCount() {
        const itemCount = this.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        document.querySelectorAll('#cart-count').forEach((node) => {
            node.textContent = String(itemCount);
        });
    }

    saveCart() {
        localStorage.setItem('cartItems', JSON.stringify(this.items));
        this.updateCartCount();
        this.calculateTotal();
    }

    displayCartItems() {
        const cartContainer = document.getElementById('cart-items');
        const buyNowBtn = document.getElementById('buy-now-btn');
        if (!cartContainer) {
            return;
        }

        cartContainer.innerHTML = '';

        if (this.items.length === 0) {
            cartContainer.innerHTML = '<p>Your cart is empty. <a href="products.html">Start shopping now!</a></p>';
            if (buyNowBtn) {
                buyNowBtn.disabled = true;
            }
            this.updateCartSummary(0);
            this.hideCheckoutForm();
            return;
        }

        if (buyNowBtn) {
            buyNowBtn.disabled = this.getSelectedItems().length === 0;
        }

        this.items.forEach((item) => {
            const itemId = this.getId(item.id);
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const itemTotal = price * quantity;
            const isSelected = this.selectedItemIds.has(itemId);

            const cartItemHTML = `
                <div class="cart-item">
                    <label class="cart-select-item">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} onchange='cart.toggleItemSelection("${itemId}", this.checked)'>
                        Select
                    </label>
                    <img src="${item.image}" alt="${item.name}">
                    <div>
                        <h3>${item.name}</h3>
                        <p>${item.description || ''}</p>
                        ${Array.isArray(item.availableSizes) && item.availableSizes.length ? `
                            <p><strong>Size:</strong></p>
                            <select onchange='cart.updateItemVariant("${itemId}", "size", this.value)'>
                                <option value="">Select size</option>
                                ${item.availableSizes.map((size) => `<option value="${size}" ${String(item.selectedSize || '') === String(size) ? 'selected' : ''}>${size}</option>`).join('')}
                            </select>
                        ` : ''}
                        ${Array.isArray(item.availableColors) && item.availableColors.length ? `
                            <p><strong>Color:</strong></p>
                            <div class="color-picker cart-color-picker">
                                ${item.availableColors.map((color) => `
                                    <button type="button" class="color-dot color-choice ${String(item.selectedColor || '') === String(color) ? 'selected' : ''}" data-cart-item-id="${itemId}" data-cart-color="${color}" style="background-color:${color}" title="${color}" aria-label="Select ${color}"></button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick='cart.updateQuantity("${itemId}", -1)'>-</button>
                        <span>${quantity}</span>
                        <button class="quantity-btn" onclick='cart.updateQuantity("${itemId}", 1)'>+</button>
                    </div>
                    <div>$${itemTotal.toFixed(2)}</div>
                    <div class="cart-item-actions">
                        <button class="checkout-btn" onclick='cart.buySingleItem("${itemId}")'>Buy This</button>
                        <button class="remove-btn" onclick='cart.removeItem("${itemId}")'>Remove</button>
                    </div>
                </div>
            `;
            cartContainer.innerHTML += cartItemHTML;
        });

        this.updateCartSummary(this.getSelectedSubtotal());
        this.updateSelectToolsUI();
    }

    buySingleItem(productId) {
        this.selectOnlyItem(productId);
        this.openCheckout();
    }

    updateItemVariant(itemId, type, value) {
        const currentId = this.getId(itemId);
        const item = this.items.find((entry) => this.getId(entry.id) === currentId);
        if (!item) return;

        if (type === 'size') {
            item.selectedSize = String(value || '').trim();
        } else if (type === 'color') {
            item.selectedColor = String(value || '').trim();
        }

        const nextId = this.buildLineId(item, item.selectedSize, item.selectedColor);
        if (nextId !== currentId) {
            const existing = this.items.find((entry) => this.getId(entry.id) === nextId && entry !== item);
            if (existing) {
                existing.quantity = (Number(existing.quantity) || 0) + (Number(item.quantity) || 0);
                this.items = this.items.filter((entry) => entry !== item);
                this.selectedItemIds.delete(currentId);
                this.selectedItemIds.add(this.getId(existing.id));
            } else {
                item.id = nextId;
                if (this.selectedItemIds.has(currentId)) {
                    this.selectedItemIds.delete(currentId);
                    this.selectedItemIds.add(nextId);
                }
            }
        }

        this.saveCart();
        this.updateCartDisplay();
    }

    updateCartSummary(subtotal) {
        const subtotalNode = document.getElementById('subtotal');
        const shippingNode = document.getElementById('shipping');
        const totalNode = document.getElementById('total');
        if (!subtotalNode || !shippingNode || !totalNode) {
            return;
        }

        const shipping = subtotal > 0 ? Number((document.querySelector('input[name="shipping"]:checked')?.value || 5)) : 0;

        subtotalNode.textContent = `$${subtotal.toFixed(2)}`;
        shippingNode.textContent = `$${shipping.toFixed(2)}`;
        totalNode.textContent = `$${(subtotal + shipping).toFixed(2)}`;

        this.updateCheckoutSummary();
    }

    updateCheckoutSummary() {
        const countNode = document.getElementById('checkout-items-count');
        const subtotalNode = document.getElementById('checkout-subtotal');
        const shippingNode = document.getElementById('checkout-shipping');
        const totalNode = document.getElementById('checkout-total');

        if (!countNode || !subtotalNode || !shippingNode || !totalNode) {
            return;
        }

        const selectedItems = this.getSelectedItems();
        const itemCount = selectedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        const subtotal = this.getSelectedSubtotal();
        const shipping = this.getShippingCost();
        const total = subtotal + shipping;

        countNode.textContent = String(itemCount);
        subtotalNode.textContent = `$${subtotal.toFixed(2)}`;
        shippingNode.textContent = `$${shipping.toFixed(2)}`;
        totalNode.textContent = `$${total.toFixed(2)}`;
    }

    updateSelectToolsUI() {
        const selectedCountNode = document.getElementById('selected-count');
        const selectAll = document.getElementById('select-all-items');
        const buyNowBtn = document.getElementById('buy-now-btn');

        const selectedCount = this.getSelectedItems().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        if (selectedCountNode) {
            selectedCountNode.textContent = String(selectedCount);
        }

        if (selectAll) {
            selectAll.checked = this.items.length > 0 && this.selectedItemIds.size === this.items.length;
        }

        if (buyNowBtn) {
            buyNowBtn.disabled = this.getSelectedItems().length === 0;
        }
    }

    displaySavedItems() {
        const savedItems = JSON.parse(localStorage.getItem('savedItems') || '[]');
        const savedContainer = document.getElementById('saved-items');
        if (!savedContainer) {
            return;
        }

        if (savedItems.length === 0) {
            savedContainer.innerHTML = '<p>No saved items</p>';
            return;
        }

        savedContainer.innerHTML = savedItems.map((item, index) => `
            <div class="saved-item">
                <img src="${item.image}" alt="${item.name}">
                <div>
                    <h3>${item.name}</h3>
                    <p>$${Number(item.price || 0).toFixed(2)}</p>
                </div>
                <button onclick="cart.moveToCart(${index})" class="add-to-cart-btn">Move to Cart</button>
            </div>
        `).join('');
    }

    moveToCart(index) {
        const savedItems = JSON.parse(localStorage.getItem('savedItems') || '[]');
        const itemToMove = savedItems.splice(index, 1)[0];
        if (!itemToMove) {
            return;
        }

        const itemId = this.getId(itemToMove.id);
        const existing = this.items.find((item) => this.getId(item.id) === itemId);
        if (existing) {
            existing.quantity = (Number(existing.quantity) || 0) + (Number(itemToMove.quantity) || 1);
        } else {
            this.items.push({ ...itemToMove, id: itemId, quantity: Number(itemToMove.quantity) || 1 });
        }

        localStorage.setItem('savedItems', JSON.stringify(savedItems));
        this.selectedItemIds.add(itemId);
        this.saveCart();
        this.updateCartDisplay();
    }

    addShippingListeners() {
        const shippingOptions = document.querySelectorAll('input[name="shipping"]');
        if (!shippingOptions.length) {
            return;
        }

        shippingOptions.forEach((option) => {
            option.addEventListener('change', this.updateShipping.bind(this));
        });
    }

    updateShipping() {
        const subtotal = this.getSelectedSubtotal();
        this.updateCartSummary(subtotal);
    }

    setupSelectTools() {
        const selectAll = document.getElementById('select-all-items');
        if (!selectAll) {
            return;
        }

        selectAll.addEventListener('change', () => {
            if (selectAll.checked) {
                this.selectAllItems();
            } else {
                this.selectedItemIds.clear();
            }
            this.updateCartDisplay();
        });

        this.updateSelectToolsUI();
    }

    setupCheckoutFlow() {
        const buyNowBtn = document.getElementById('buy-now-btn');
        const paymentForm = document.getElementById('checkout-payment-form');
        const paymentOptions = document.querySelectorAll('input[name="payment-method"]');

        if (!buyNowBtn || !paymentForm) {
            return;
        }

        buyNowBtn.addEventListener('click', () => {
            if (!this.getSelectedItems().length) {
                return;
            }

            this.openCheckout();
        });

        paymentOptions.forEach((option) => {
            option.addEventListener('change', () => {
                this.togglePaymentPanels(option.value);
            });
        });

        paymentForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.placeOrder();
        });
    }

    setupVariantPickers() {
        document.addEventListener('click', (event) => {
            const colorBtn = event.target.closest('[data-cart-item-id][data-cart-color]');
            if (!colorBtn) return;
            const itemId = colorBtn.getAttribute('data-cart-item-id');
            const color = colorBtn.getAttribute('data-cart-color');
            if (!itemId || !color) return;
            this.updateItemVariant(itemId, 'color', color);
        });
    }

    openCheckout() {
        const checkoutFormWrap = document.getElementById('checkoutForm');
        const feedback = document.getElementById('checkout-feedback');
        if (!checkoutFormWrap) {
            return;
        }

        const variantCheck = this.validateSelectedVariants();
        if (!variantCheck.ok) {
            if (feedback) feedback.textContent = variantCheck.message;
            return;
        }

        if (feedback) feedback.textContent = '';
        this.updateCheckoutSummary();
        checkoutFormWrap.style.display = 'block';
        checkoutFormWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    hideCheckoutForm() {
        const checkoutFormWrap = document.getElementById('checkoutForm');
        if (checkoutFormWrap) {
            checkoutFormWrap.style.display = 'none';
        }
    }

    togglePaymentPanels(method) {
        const cardPanel = document.getElementById('card-payment-panel');
        const momoPanel = document.getElementById('momo-payment-panel');

        if (!cardPanel || !momoPanel) {
            return;
        }

        const cardFields = ['card-number', 'expiry-date', 'cvv'];
        const momoFields = ['momo-number', 'momo-name'];

        if (method === 'momo') {
            cardPanel.style.display = 'none';
            momoPanel.style.display = 'grid';

            cardFields.forEach((id) => {
                const field = document.getElementById(id);
                if (field) field.required = false;
            });
            momoFields.forEach((id) => {
                const field = document.getElementById(id);
                if (field) field.required = true;
            });
        } else {
            cardPanel.style.display = 'grid';
            momoPanel.style.display = 'none';

            cardFields.forEach((id) => {
                const field = document.getElementById(id);
                if (field) field.required = true;
            });
            momoFields.forEach((id) => {
                const field = document.getElementById(id);
                if (field) field.required = false;
            });
        }
    }

    placeOrder() {
        const feedback = document.getElementById('checkout-feedback');
        const fullName = document.getElementById('full-name')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const phone = document.getElementById('phone')?.value.trim();
        const method = document.querySelector('input[name="payment-method"]:checked')?.value || 'card';

        if (!this.getSelectedItems().length) {
            if (feedback) {
                feedback.textContent = 'Select at least one product to place order.';
            }
            return;
        }

        const variantCheck = this.validateSelectedVariants();
        if (!variantCheck.ok) {
            if (feedback) {
                feedback.textContent = variantCheck.message;
            }
            return;
        }

        if (!fullName || !email || !phone) {
            if (feedback) {
                feedback.textContent = 'Please fill in your name, email, and phone number.';
            }
            return;
        }

        if (method === 'card') {
            const cardNumber = document.getElementById('card-number')?.value.trim();
            const expiry = document.getElementById('expiry-date')?.value.trim();
            const cvv = document.getElementById('cvv')?.value.trim();
            if (!cardNumber || !expiry || !cvv) {
                if (feedback) {
                    feedback.textContent = 'Please complete your card payment details.';
                }
                return;
            }
        } else {
            const momoNumber = document.getElementById('momo-number')?.value.trim();
            const momoName = document.getElementById('momo-name')?.value.trim();
            if (!momoNumber || !momoName) {
                if (feedback) {
                    feedback.textContent = 'Please complete your MTN MoMo details.';
                }
                return;
            }
        }

        this.submitOrderToServer({ fullName, email, phone, method, feedback });
    }

    async submitOrderToServer({ fullName, email, phone, method, feedback }) {
        const selectedItems = this.getSelectedItems();
        const subtotal = this.getSelectedSubtotal();
        const shipping = this.getShippingCost();
        const total = subtotal + shipping;
        const orderItems = selectedItems.map((item) => ({
            productId: String(item.productId || this.getId(item.id)),
            name: item.name,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 0,
            image: item.image || ''
        }));

        const payment = { method };
        if (method === 'card') {
            payment.cardNumber = document.getElementById('card-number')?.value.trim() || '';
        } else {
            payment.momoNumber = document.getElementById('momo-number')?.value.trim() || '';
            payment.momoName = document.getElementById('momo-name')?.value.trim() || '';
        }

        const payload = {
            customer: { fullName, email, phone },
            payment,
            items: orderItems,
            summary: { subtotal, shipping, total }
        };

        try {
            if (feedback) {
                feedback.textContent = 'Placing order...';
            }

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!response.ok) {
                if (feedback) {
                    feedback.textContent = result.message || 'Failed to place order.';
                }
                return;
            }

            if (feedback) {
                feedback.textContent = `Order placed successfully. Order ID: ${result.orderId}`;
            }

            const selectedIds = new Set(selectedItems.map((item) => this.getId(item.id)));
            this.items = this.items.filter((item) => !selectedIds.has(this.getId(item.id)));
            this.selectedItemIds.clear();
            this.selectAllItems();

            this.saveCart();
            this.updateCartDisplay();

            const form = document.getElementById('checkout-payment-form');
            if (form) {
                form.reset();
            }
            this.togglePaymentPanels('card');
        } catch (error) {
            if (feedback) {
                feedback.textContent = 'Network error while placing order. Please try again.';
            }
        }
    }
}

const cart = new ShoppingCart();
window.cart = cart;

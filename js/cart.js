class ShoppingCart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cartItems') || '[]');
        this.total = 0;
        this.init();
    }

    init() {
        this.updateCartCount();

        if (!document.getElementById('cart-items')) {
            return;
        }

        this.calculateTotal();
        this.displayCartItems();
        this.displaySavedItems();
        this.addShippingListeners();
    }

    updateCartDisplay() {
        this.displayCartItems();
        this.displaySavedItems();
        this.updateCartCount();
    }

    removeItem(productId) {
        this.items = this.items.filter((item) => Number(item.id) !== Number(productId));
        this.saveCart();
        this.updateCartDisplay();
    }

    updateQuantity(productId, change) {
        const item = this.items.find((entry) => Number(entry.id) === Number(productId));
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
        const checkoutBtn = document.querySelector('.checkout-btn');
        if (!cartContainer) {
            return;
        }

        let subtotal = 0;
        cartContainer.innerHTML = '';

        if (this.items.length === 0) {
            cartContainer.innerHTML = '<p>Your cart is empty. <a href="products.html">Start shopping now!</a></p>';
            if (checkoutBtn) {
                checkoutBtn.disabled = true;
            }
            this.updateCartSummary(0);
            return;
        }

        if (checkoutBtn) {
            checkoutBtn.disabled = false;
        }

        this.items.forEach((item) => {
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const itemTotal = price * quantity;
            subtotal += itemTotal;

            const cartItemHTML = `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}">
                    <div>
                        <h3>${item.name}</h3>
                        <p>${item.description || ''}</p>
                    </div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="cart.updateQuantity(${item.id}, -1)">-</button>
                        <span>${quantity}</span>
                        <button class="quantity-btn" onclick="cart.updateQuantity(${item.id}, 1)">+</button>
                    </div>
                    <div>$${itemTotal.toFixed(2)}</div>
                    <button class="remove-btn" onclick="cart.removeItem(${item.id})">Remove</button>
                </div>
            `;
            cartContainer.innerHTML += cartItemHTML;
        });

        this.updateCartSummary(subtotal);
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

        const existing = this.items.find((item) => Number(item.id) === Number(itemToMove.id));
        if (existing) {
            existing.quantity = (Number(existing.quantity) || 0) + (Number(itemToMove.quantity) || 1);
        } else {
            this.items.push({ ...itemToMove, quantity: Number(itemToMove.quantity) || 1 });
        }

        localStorage.setItem('savedItems', JSON.stringify(savedItems));
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
        const subtotalText = document.getElementById('subtotal')?.textContent || '$0.00';
        const subtotal = parseFloat(subtotalText.replace('$', '')) || 0;
        this.updateCartSummary(subtotal);
    }
}

const cart = new ShoppingCart();
window.cart = cart;

document.addEventListener('DOMContentLoaded', () => {
    cart.updateCartCount();

    if (document.getElementById('cart-items')) {
        cart.displayCartItems();
        cart.displaySavedItems();
        cart.addShippingListeners();
    }
});

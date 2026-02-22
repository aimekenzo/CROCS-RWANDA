class ShoppingCart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cartItems')) || [];
        this.total = 0;
        this.init();
    }

    init() {
        this.updateCartCount();
        this.calculateTotal();
        this.displayCartItems();
        this.displaySavedItems();
        this.addShippingListeners();
    }

    async fetchProductsFromAirtable() {
        try {
            const response = await fetch('https://api.airtable.com/v0/YOUR_BASE_ID/products', {
                headers: {
                    Authorization: 'Bearer YOUR_API_KEY'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch products from Airtable');
            }

            const data = await response.json();
            const products = data.records.map(record => ({
                id: record.fields.id,
                name: record.fields.name,
                price: record.fields.price,
                stock: record.fields.stock,
                image: record.fields.image[0]?.url || '', // Use the first image URL
                description: record.fields.description || '',
                quantity: 0 // Default quantity
            }));

            // Save products to localStorage or a global variable
            localStorage.setItem('products', JSON.stringify(products));
            return products;
        } catch (error) {
            console.error('Error fetching products:', error);
            alert('Unable to load products. Please try again later.');
        }
    }

    addItem(productId) {
        const product = products.find(p => p.id === productId);
        if (product) {
            const cartItem = {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                image: product.image
            };

            const existingItem = this.items.find(item => item.id === productId);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                this.items.push(cartItem);
            }

            this.saveCart();
            this.updateCartDisplay();
        }
    }

    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartDisplay();
    }

    updateQuantity(productId, change) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity += change;
            if (item.quantity < 1) item.quantity = 1;
            this.saveCart();
            this.updateCartDisplay();
        }
    }

    calculateTotal() {
        this.total = this.items.reduce((sum, item) =>
            sum + (item.price * item.quantity), 0);
        return this.total;
    }

    updateCartCount() {
        const cartCount = document.getElementById('cart-count');
        const itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = itemCount;
    }

    saveCart() {
        localStorage.setItem('cartItems', JSON.stringify(this.items));
        this.updateCartCount();
        this.calculateTotal();
    }

    displayCartItems() {
        const cartContainer = document.getElementById('cart-items');
        let subtotal = 0;

        cartContainer.innerHTML = '';

        if (this.items.length === 0) {
            cartContainer.innerHTML = '<p>Your cart is empty. Start shopping now!</p>';
            document.querySelector('.checkout-btn').disabled = true;
            return;
        }

        this.items.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
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
                        <span>${item.quantity}</span>
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
        const shipping = subtotal > 0 ? 5 : 0;
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('shipping').textContent = `$${shipping.toFixed(2)}`;
        document.getElementById('total').textContent = `$${(subtotal + shipping).toFixed(2)}`;
    }

    displaySavedItems() {
        const savedItems = JSON.parse(localStorage.getItem('savedItems')) || [];
        const savedContainer = document.getElementById('saved-items');

        if (savedItems.length === 0) {
            savedContainer.innerHTML = '<p>No saved items</p>';
            return;
        }

        savedContainer.innerHTML = savedItems.map((item, index) => `
            <div class="saved-item">
                <img src="${item.image}" alt="${item.name}">
                <div>
                    <h3>${item.name}</h3>
                    <p>$${item.price}</p>
                </div>
                <button onclick="cart.moveToCart(${index})" class="add-to-cart-btn">Move to Cart</button>
            </div>
        `).join('');
    }

    moveToCart(index) {
        let savedItems = JSON.parse(localStorage.getItem('savedItems')) || [];
        const itemToMove = savedItems.splice(index, 1)[0];
        this.items.push(itemToMove);

        localStorage.setItem('savedItems', JSON.stringify(savedItems));
        this.saveCart();
        this.displayCartItems();
        this.displaySavedItems();
    }

    addShippingListeners() {
        document.querySelectorAll('input[name="shipping"]').forEach(option => {
            option.addEventListener('change', this.updateShipping.bind(this));
        });
    }

    updateShipping() {
        const selectedShipping = parseFloat(document.querySelector('input[name="shipping"]:checked').value);
        const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('$', ''));
        document.getElementById('shipping').textContent = `$${selectedShipping.toFixed(2)}`;
        document.getElementById('total').textContent = `$${(subtotal + selectedShipping).toFixed(2)}`;
    }
}

// Initialize cart
const cart = new ShoppingCart();

// Add event listeners for cart functionality
document.addEventListener('DOMContentLoaded', async () => {
    const products = await cart.fetchProductsFromAirtable();
    // You can now use the products variable as needed
    cart.displayCartItems();
    cart.displaySavedItems();
    cart.addShippingListeners();
});

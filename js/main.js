let products = [];

function getCatalog() {
    if (Array.isArray(window.products) && window.products.length > 0) {
        return window.products;
    }

    const stored = JSON.parse(localStorage.getItem('products') || '[]');
    return Array.isArray(stored) ? stored : [];
}

function getCartItems() {
    return JSON.parse(localStorage.getItem('cartItems') || '[]');
}

function saveCartItems(items) {
    localStorage.setItem('cartItems', JSON.stringify(items));
}

function updateCartCount() {
    const cartItems = getCartItems();
    const totalQty = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    document.querySelectorAll('#cart-count').forEach((node) => {
        node.textContent = String(totalQty);
    });
}

function addToCart(productId) {
    const cartItems = getCartItems();
    const product = products.find((p) => Number(p.id) === Number(productId));

    if (!product) {
        alert('Product not found.');
        return;
    }

    if ((Number(product.stock) || 0) <= 0) {
        alert('This product is out of stock.');
        return;
    }

    const existing = cartItems.find((item) => Number(item.id) === Number(product.id));
    if (existing) {
        existing.quantity = (Number(existing.quantity) || 0) + 1;
    } else {
        cartItems.push({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            quantity: 1,
            image: product.image || '',
            description: product.description || ''
        });
    }

    saveCartItems(cartItems);
    updateCartCount();
}

function renderStars(rating) {
    const safeRating = Number(rating) || 0;
    const full = Math.floor(safeRating);
    const half = safeRating % 1 >= 0.5 ? '1/2' : '';
    return `${'*'.repeat(full)}${half}`;
}

function displayProducts(items) {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) {
        return;
    }

    const html = items
        .map((product) => `
            <div class="product-card" data-id="${product.id}">
                <div class="product-badges">
                    ${(Number(product.stock) || 0) < 10 ? '<span class="badge low-stock">Low Stock</span>' : ''}
                </div>
                <img src="${product.image}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.description || ''}</p>
                    <div class="product-rating">
                        <span class="stars">${renderStars(product.rating)}</span>
                        <span class="rating-count">(${(product.reviews || []).length})</span>
                    </div>
                    <div class="product-colors">
                        ${(product.colors || [])
                            .map((color) => `<span class="color-dot" style="background-color: ${color}"></span>`)
                            .join('')}
                    </div>
                    <p class="product-price">$${(Number(product.price) || 0).toFixed(2)}</p>
                    <button onclick="addToCart(${product.id})" class="add-to-cart-btn" aria-label="Add ${product.name} to cart">Add to Cart</button>
                    <button onclick="openQuickView(${product.id})" class="quick-view-btn" aria-label="Quick view for ${product.name}">Quick View</button>
                </div>
            </div>
        `)
        .join('');

    productGrid.innerHTML = html;
}

function openQuickView(productId) {
    const modal = document.getElementById('quickViewModal');
    if (!modal) {
        return;
    }

    const product = products.find((p) => Number(p.id) === Number(productId));
    if (!product) {
        alert('Product not found.');
        return;
    }

    const imgNode = document.getElementById('modalProductImage');
    const nameNode = document.getElementById('modalProductName');
    const priceNode = document.getElementById('modalProductPrice');

    if (imgNode) imgNode.src = product.image;
    if (nameNode) nameNode.textContent = product.name;
    if (priceNode) priceNode.textContent = `$${(Number(product.price) || 0).toFixed(2)}`;

    modal.style.display = 'block';
}

window.onclick = function (event) {
    const modal = document.getElementById('quickViewModal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    products = getCatalog();
    localStorage.setItem('products', JSON.stringify(products));

    if (products.length > 0) {
        displayProducts(products);
    }

    updateCartCount();
});

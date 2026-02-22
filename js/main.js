// Product Data
let products = [];

// Helper Functions for LocalStorage
function getCartItems() {
    return JSON.parse(localStorage.getItem('cartItems')) || [];
}

function saveCartItems(items) {
    localStorage.setItem('cartItems', JSON.stringify(items));
}

// Cart Functions
function addToCart(productId) {
    const cartItems = getCartItems();
    const product = products.find(p => p.id == productId); // loose compare to handle id types

    if (!product) {
        alert('Product not found.');
        return;
    }

    if ((product.stock || 0) <= 0) {
        alert('This product is out of stock.');
        return;
    }

    const existing = cartItems.find(item => item.id == product.id);
    if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
    } else {
        cartItems.push({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            quantity: 1,
            image: product.image || ''
        });
    }

    saveCartItems(cartItems);
    updateCartCount();
    alert(`${product.name} has been added to your cart.`);
}

function updateCartCount() {
    const cartItems = getCartItems();
    document.getElementById('cart-count').textContent = cartItems.length;
}

// Product Display
function displayProducts(products) {
    const productGrid = document.querySelector('.product-grid');

    const productHTML = products.map(product => `
        <div class="product-card" data-id="${product.id}">
            <div class="product-badges">
                ${product.stock < 10 ? '<span class="badge low-stock">Low Stock</span>' : ''}
            </div>
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="product-rating">
                    <span class="stars">${'★'.repeat(Math.floor(product.rating))}${product.rating % 1 ? '½' : ''}</span>
                    <span class="rating-count">(${product.reviews.length})</span>
                </div>
                <div class="product-colors">
                    ${product.colors.map(color => 
                        `<span class="color-dot" style="background-color: ${color}"></span>`
                    ).join('')}
                </div>
                <p class="product-price">$${product.price.toFixed(2)}</p>
                <button onclick="addToCart(${product.id})" class="add-to-cart-btn" aria-label="Add ${product.name} to cart">
                    Add to Cart
                </button>
                <button onclick="openQuickView(${product.id})" class="quick-view-btn" aria-label="Quick view for ${product.name}">
                    Quick View
                </button>
            </div>
        </div>
    `).join('');

    productGrid.innerHTML = productHTML;
}

// Quick View Modal
function openQuickView(productId) {
    const modal = document.getElementById('quickViewModal');
    const product = products.find(p => p.id === productId);

    if (!product) {
        alert('Product not found.');
        return;
    }

    document.getElementById('modalProductImage').src = product.image;
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductPrice').textContent = `$${product.price}`;
    modal.style.display = 'block';
}

// Close Modal
window.onclick = function(event) {
    const modal = document.getElementById('quickViewModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

// Fetch Products
async function fetchProducts() {
    try {
        // Replace YOUR_BASE_ID and YOUR_TABLE_NAME and YOUR_API_KEY
        const url = 'https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME';
        const response = await fetch(url, {
            headers: {
                Authorization: 'Bearer YOUR_API_KEY'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch products (status ${response.status})`);
        }

        const data = await response.json();
        // normalize records to fields we expect
        products = data.records.map(record => {
            const f = record.fields || {};
            // colors may be stored as array or JSON string; ensure array
            let colors = f.colors || [];
            if (typeof colors === 'string') {
                try { colors = JSON.parse(colors); } catch { colors = colors.split(',').map(s => s.trim()); }
            }
            const image = Array.isArray(f.image) ? (f.image[0]?.url || '') : (f.image || '');
            return {
                id: record.id, // use Airtable record id (unique)
                name: f.name || '',
                price: Number(f.price) || 0,
                stock: Number(f.stock) || 0,
                image,
                rating: Number(f.rating) || 0,
                reviews: f.reviews || [],
                colors
            };
        });

        // store for other modules
        localStorage.setItem('products', JSON.stringify(products));
        displayProducts(products);
        updateCartCount();
    } catch (err) {
        console.error('Error fetching products:', err);
        alert('Unable to load products. Check console for details.');
    }
}

// Initialize on Page Load
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCartCount();
});

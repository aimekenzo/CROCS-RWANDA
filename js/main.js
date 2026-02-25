let products = [];
let allProducts = [];
const MAX_SUGGESTIONS = 6;

function getProductId(product) {
    return String(product?._id || product?.id || '').trim();
}

function idsEqual(a, b) {
    return String(a || '').trim() === String(b || '').trim();
}

function getCatalog() {
    const seeded = Array.isArray(window.products) ? window.products : [];
    const stored = JSON.parse(localStorage.getItem('products') || '[]');
    const local = Array.isArray(stored) ? stored : [];
    return mergeCatalogs(local, seeded);
}

function mergeCatalogs(...lists) {
    const merged = [];
    const seen = new Set();

    lists.flat().forEach((product) => {
        if (!product || typeof product !== 'object') return;

        const id = getProductId(product);
        const name = normalize(product.name);
        const key = id ? `id:${id}` : `name:${name}|price:${Number(product.price) || 0}`;
        if (seen.has(key)) return;
        seen.add(key);

        merged.push({
            ...product,
            id: id || String(merged.length + 1)
        });
    });

    return merged;
}

function normalize(value) {
    return String(value || '').toLowerCase().trim();
}

function getSearchableText(product) {
    return [
        product.name,
        product.description,
        product.category,
        ...(product.colors || []),
        ...(product.sizes || [])
    ].join(' ');
}

function filterProductsByQuery(items, query) {
    const q = normalize(query);
    if (!q) {
        return items;
    }

    return items.filter((product) => normalize(getSearchableText(product)).includes(q));
}

function getSuggestionMatches(query) {
    if (!normalize(query)) {
        return [];
    }

    return filterProductsByQuery(allProducts, query).slice(0, MAX_SUGGESTIONS);
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

function getValidatedSize(product, selectedSize) {
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    if (!sizes.length) {
        return '';
    }

    const picked = String(selectedSize || '').trim();
    if (!picked || !sizes.includes(picked)) {
        return null;
    }

    return picked;
}

function addToCart(productId, selectedSize = '', selectedColor = '') {
    const cartItems = getCartItems();
    const product = products.find((p) => idsEqual(getProductId(p), productId));

    if (!product) {
        alert('Product not found.');
        return;
    }

    if ((Number(product.stock) || 0) <= 0) {
        showSoldOutAssistant(product);
        return;
    }

    const safeSize = String(selectedSize || '').trim();
    const safeColor = String(selectedColor || '').trim();

    const normalizedId = getProductId(product);
    const lineId = `${normalizedId}::${safeSize || 'nosize'}::${safeColor || 'nocolor'}`;
    const existing = cartItems.find((item) => idsEqual(item.id, lineId));
    if (existing) {
        existing.quantity = (Number(existing.quantity) || 0) + 1;
    } else {
        cartItems.push({
            id: lineId,
            productId: normalizedId,
            name: product.name,
            price: Number(product.price) || 0,
            quantity: 1,
            image: product.image || '',
            description: product.description || '',
            selectedSize: safeSize || '',
            selectedColor: safeColor || '',
            availableSizes: Array.isArray(product.sizes) ? product.sizes : [],
            availableColors: Array.isArray(product.colors) ? product.colors : []
        });
    }

    saveCartItems(cartItems);
    updateCartCount();
}

function getAlternativeProducts(soldOutProduct, query) {
    const pool = allProducts.filter((product) =>
        !idsEqual(getProductId(product), getProductId(soldOutProduct)) && (Number(product.stock) || 0) > 0
    );

    const filtered = query ? filterProductsByQuery(pool, query) : pool;

    return filtered
        .sort((a, b) => {
            const aSameCategory = a.category === soldOutProduct.category ? 1 : 0;
            const bSameCategory = b.category === soldOutProduct.category ? 1 : 0;
            if (aSameCategory !== bSameCategory) {
                return bSameCategory - aSameCategory;
            }
            return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        })
        .slice(0, 8);
}

async function saveStockAlertRequest(product, email) {
    const key = 'stockAlertRequests';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const normalizedEmail = normalize(email);
    const productId = getProductId(product);

    const alreadyExists = existing.some((entry) =>
        idsEqual(entry.productId, productId) && normalize(entry.email) === normalizedEmail
    );

    if (alreadyExists) {
        return { status: 'exists' };
    }

    try {
        const response = await fetch('/api/stock-alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId,
                productName: product.name,
                email: normalizedEmail
            })
        });

        if (response.ok) {
            return { status: 'saved' };
        }
    } catch (error) {
        // fall through to local fallback
    }

    existing.push({
        productId,
        productName: product.name,
        email: normalizedEmail,
        createdAt: new Date().toISOString()
    });
    localStorage.setItem(key, JSON.stringify(existing));
    return { status: 'saved' };
}

function ensureSoldOutAssistant() {
    let modal = document.getElementById('soldOutAssistant');
    if (modal) {
        return modal;
    }

    modal = document.createElement('div');
    modal.id = 'soldOutAssistant';
    modal.className = 'soldout-assistant';
    modal.innerHTML = `
        <div class="soldout-card" role="dialog" aria-modal="true" aria-label="Sold out alternatives">
            <button type="button" class="soldout-close" aria-label="Close">&times;</button>
            <h3 class="soldout-title"></h3>
            <p class="soldout-subtitle"></p>
            <input type="search" class="soldout-search-input" placeholder="Search another product to replace it">
            <div class="soldout-alt-list"></div>
            <form class="soldout-notify-form">
                <label for="notify-email">Notify me when back in stock</label>
                <div class="soldout-notify-row">
                    <input id="notify-email" class="soldout-notify-input" type="email" placeholder="Enter your email" required>
                    <button type="submit" class="soldout-notify-btn">Notify Me</button>
                </div>
                <small class="soldout-notify-feedback"></small>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
}

function closeSoldOutAssistant() {
    const modal = document.getElementById('soldOutAssistant');
    if (modal) {
        modal.classList.remove('open');
    }
}

function showSoldOutAssistant(soldOutProduct) {
    const modal = ensureSoldOutAssistant();
    const title = modal.querySelector('.soldout-title');
    const subtitle = modal.querySelector('.soldout-subtitle');
    const searchInput = modal.querySelector('.soldout-search-input');
    const list = modal.querySelector('.soldout-alt-list');
    const closeBtn = modal.querySelector('.soldout-close');
    const notifyForm = modal.querySelector('.soldout-notify-form');
    const notifyInput = modal.querySelector('.soldout-notify-input');
    const notifyFeedback = modal.querySelector('.soldout-notify-feedback');

    if (!title || !subtitle || !searchInput || !list || !closeBtn || !notifyForm || !notifyInput || !notifyFeedback) {
        return;
    }

    title.textContent = `${soldOutProduct.name} is sold out`;
    subtitle.textContent = 'Pick an in-stock replacement or search for another product.';
    searchInput.value = '';
    notifyInput.value = '';
    notifyFeedback.textContent = '';
    notifyFeedback.className = 'soldout-notify-feedback';

    function renderAlternatives(query) {
        const alternatives = getAlternativeProducts(soldOutProduct, query);

        if (!alternatives.length) {
            list.innerHTML = '<p class="soldout-empty">No matching replacements found.</p>';
            return;
        }

        list.innerHTML = alternatives.map((item) => `
            <button type="button" class="soldout-alt-item" data-id="${getProductId(item)}">
                <img src="${item.image}" alt="${item.name}">
                <span>${item.name}</span>
                <strong>$${(Number(item.price) || 0).toFixed(2)}</strong>
            </button>
        `).join('');
    }

    renderAlternatives('');
    modal.classList.add('open');

    closeBtn.onclick = closeSoldOutAssistant;
    modal.onclick = (event) => {
        if (event.target === modal) {
            closeSoldOutAssistant();
        }
    };

    searchInput.oninput = () => {
        renderAlternatives(searchInput.value.trim());
    };

    notifyForm.onsubmit = async (event) => {
        event.preventDefault();
        const email = notifyInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        if (!emailRegex.test(email)) {
            notifyFeedback.textContent = 'Enter a valid email address.';
            notifyFeedback.className = 'soldout-notify-feedback error';
            return;
        }

        const result = await saveStockAlertRequest(soldOutProduct, email);
        if (result.status === 'exists') {
            notifyFeedback.textContent = 'You already requested a stock alert for this product.';
            notifyFeedback.className = 'soldout-notify-feedback info';
            return;
        }

        notifyFeedback.textContent = 'Alert saved. We will notify you when stock returns.';
        notifyFeedback.className = 'soldout-notify-feedback success';
        notifyForm.reset();
    };

    list.onclick = (event) => {
        const button = event.target.closest('.soldout-alt-item');
        if (!button) {
            return;
        }

        const nextProductId = button.getAttribute('data-id') || '';
        closeSoldOutAssistant();
        addToCart(nextProductId);
    };
}

function renderStars(rating) {
    const safeRating = Number(rating) || 0;
    const full = Math.floor(safeRating);
    const half = safeRating % 1 >= 0.5 ? '1/2' : '';
    return `${'*'.repeat(full)}${half}`;
}

function formatReviews(product) {
    const raw = Array.isArray(product.reviews) ? product.reviews : [];
    return raw.map((entry, index) => {
        if (typeof entry === 'string') {
            return {
                user: `Customer ${index + 1}`,
                comment: entry,
                rating: Number(product.rating) || 0
            };
        }

        return {
            user: entry.user || `Customer ${index + 1}`,
            comment: entry.comment || 'Great product.',
            rating: Number(entry.rating) || Number(product.rating) || 0
        };
    });
}

function ensureProductModal() {
    let modal = document.getElementById('quickViewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quickViewModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    return modal;
}

function displayProducts(items) {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) {
        return;
    }

    if (!items.length) {
        productGrid.innerHTML = `
            <div class="product-card">
                <div class="product-info">
                    <h3>No products found</h3>
                    <p>Try another search term.</p>
                </div>
            </div>
        `;
        return;
    }

    const html = items
        .map((product) => {
            const productId = getProductId(product);
            return `
                <div class="product-card" data-id="${productId}">
                    <div class="product-badges">
                        ${(Number(product.stock) || 0) < 10 ? '<span class="badge low-stock">Low Stock</span>' : ''}
                    </div>
                    <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.onerror=null;this.src='https://placehold.co/640x480?text=No+Image';">
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
                        ${(product.colors || []).length ? `
                            <div class="size-selector">
                                <span>Color</span>
                                <div class="color-picker">
                                    ${(product.colors || []).map((color) => `
                                        <button type="button" class="color-dot color-choice" data-color="${color}" style="background-color:${color}" title="${color}" aria-label="Select ${color}"></button>
                                    `).join('')}
                                </div>
                                <input type="hidden" class="selected-color-input" value="">
                            </div>
                        ` : ''}
                        ${(product.sizes || []).length ? `
                            <div class="size-selector">
                                <label for="size-${productId}">Size</label>
                                <select id="size-${productId}" class="product-size-select">
                                    <option value="">Select size</option>
                                    ${(product.sizes || []).map((size) => `<option value="${size}">${size}</option>`).join('')}
                                </select>
                            </div>
                        ` : ''}
                        <p class="product-price">$${(Number(product.price) || 0).toFixed(2)}</p>
                        <button onclick='addToCartFromCard(this, "${productId}")' class="add-to-cart-btn" aria-label="Add ${product.name} to cart">Add to Cart</button>
                        <button onclick='openQuickView("${productId}")' class="quick-view-btn" aria-label="View full details for ${product.name}">View</button>
                    </div>
                </div>
            `;
        })
        .join('');

    productGrid.innerHTML = html;

    productGrid.querySelectorAll('.product-card').forEach((card) => {
        card.addEventListener('click', (event) => {
            const blocked = event.target.closest('.add-to-cart-btn, .quick-view-btn, .wishlist-btn, select, button');
            if (blocked) {
                return;
            }
            const productId = card.getAttribute('data-id') || '';
            openQuickView(productId);
        });
    });
}

function addToCartFromCard(button, productId) {
    const card = button?.closest('.product-card');
    const size = card?.querySelector('.product-size-select')?.value || '';
    const color = card?.querySelector('.selected-color-input')?.value || '';
    addToCart(productId, size, color);
}

function getProductsPagePath() {
    return window.location.pathname.includes('/pages/') ? 'products.html' : 'pages/products.html';
}

function applySearch(query) {
    const filtered = filterProductsByQuery(allProducts, query);
    displayProducts(filtered);
}

function setupSearchBar() {
    const searchForms = document.querySelectorAll('form.search-bar');
    if (!searchForms.length) {
        return;
    }

    searchForms.forEach((form) => {
        const input = form.querySelector('input[name="q"]');
        if (!input) {
            return;
        }

        let suggestions = form.querySelector('.search-suggestions');
        if (!suggestions) {
            suggestions = document.createElement('div');
            suggestions.className = 'search-suggestions';
            form.appendChild(suggestions);
        }

        function hideSuggestions() {
            suggestions.innerHTML = '';
            suggestions.classList.remove('open');
        }

        function renderSuggestions(query) {
            const matches = getSuggestionMatches(query);
            if (!matches.length) {
                hideSuggestions();
                return;
            }

            suggestions.innerHTML = matches
                .map((product) => `<button type="button" class="search-suggestion-item" data-name="${product.name}">${product.name}</button>`)
                .join('');
            suggestions.classList.add('open');
        }

        function runLiveSearch(query) {
            const onProductsPage = window.location.pathname.endsWith('/products.html');
            if (!onProductsPage) {
                return;
            }

            applySearch(query);
            const newUrl = query ? `?q=${encodeURIComponent(query)}` : window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }

        form.addEventListener('input', (event) => {
            const target = event.target;
            if (!target || target !== input) {
                return;
            }

            const query = input.value.trim();
            runLiveSearch(query);
            renderSuggestions(query);
        });

        suggestions.addEventListener('click', (event) => {
            const button = event.target.closest('.search-suggestion-item');
            if (!button) {
                return;
            }

            const pickedName = button.getAttribute('data-name') || '';
            input.value = pickedName;
            hideSuggestions();

            const onProductsPage = window.location.pathname.endsWith('/products.html');
            if (onProductsPage) {
                applySearch(pickedName);
                window.history.replaceState({}, '', `?q=${encodeURIComponent(pickedName)}`);
            } else {
                window.location.href = `${getProductsPagePath()}?q=${encodeURIComponent(pickedName)}`;
            }
        });

        input.addEventListener('focus', () => {
            if (input.value.trim()) {
                renderSuggestions(input.value.trim());
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(hideSuggestions, 120);
        });

        form.setAttribute('action', getProductsPagePath());

        form.addEventListener('submit', (event) => {
            const query = input.value.trim();
            const onProductsPage = window.location.pathname.endsWith('/products.html');

            if (onProductsPage) {
                event.preventDefault();
                applySearch(query);

                const newUrl = query ? `?q=${encodeURIComponent(query)}` : window.location.pathname;
                window.history.replaceState({}, '', newUrl);
                hideSuggestions();
            }
        });
    });
}

function openQuickView(productId) {
    const modal = ensureProductModal();

    const product = products.find((p) => idsEqual(getProductId(p), productId));
    if (!product) {
        alert('Product not found.');
        return;
    }

    const reviews = formatReviews(product);
    const ratingValue = Number(product.rating) || 0;
    const stock = Number(product.stock) || 0;
    const stockLabel = stock > 0 ? `${stock} left in stock` : 'Out of stock';

    modal.innerHTML = `
        <div class="product-modal-content" role="dialog" aria-modal="true" aria-label="${product.name} details">
            <button type="button" class="product-modal-close" aria-label="Close product details">&times;</button>
            <div class="product-modal-grid">
                <img src="${product.image}" alt="${product.name}" class="product-modal-image" onerror="this.onerror=null;this.src='https://placehold.co/640x480?text=No+Image';">
                <div class="product-modal-body">
                    <h2>${product.name}</h2>
                    <p class="product-modal-price">$${(Number(product.price) || 0).toFixed(2)}</p>
                    <p>${product.description || 'No product description available.'}</p>
                    <p><strong>Category:</strong> ${product.category || 'General'}</p>
                    <p><strong>Stock:</strong> ${stockLabel}</p>
                    <p><strong>Rating:</strong> ${renderStars(ratingValue)} (${reviews.length} reviews)</p>
                    ${(product.colors || []).length ? `
                        <div class="size-selector">
                            <span>Select Color</span>
                            <div class="color-picker">
                                ${(product.colors || []).map((color) => `
                                    <button type="button" class="color-dot color-choice modal-color-choice" data-color="${color}" style="background-color:${color}" title="${color}" aria-label="Select ${color}"></button>
                                `).join('')}
                            </div>
                            <input type="hidden" class="modal-selected-color-input" value="">
                        </div>
                    ` : ''}
                    <div class="product-modal-colors"><strong>Colors:</strong> ${(product.colors || []).map((color) => `<span class="color-dot" style="background-color:${color}" title="${color}"></span>`).join('')}</div>
                    <div class="product-modal-sizes"><strong>Sizes:</strong> ${(product.sizes || []).map((size) => `<span class="size-pill">${size}</span>`).join('')}</div>
                    ${(product.sizes || []).length ? `
                        <div class="size-selector">
                            <label for="modal-size-${getProductId(product)}">Select Size</label>
                            <select id="modal-size-${getProductId(product)}" class="modal-size-select">
                                <option value="">Select size</option>
                                ${(product.sizes || []).map((size) => `<option value="${size}">${size}</option>`).join('')}
                            </select>
                        </div>
                    ` : ''}
                    <button type="button" class="add-to-cart-btn" ${stock <= 0 ? 'disabled' : ''} onclick='addToCartFromModal(this, "${getProductId(product)}")'>${stock <= 0 ? 'Sold Out' : 'Add to Cart'}</button>
                </div>
            </div>
            <div class="product-modal-reviews">
                <h3>Customer Comments</h3>
                ${reviews.length ? reviews.map((review) => `
                    <div class="review-item">
                        <p><strong>${review.user}</strong> - ${renderStars(review.rating)}</p>
                        <p>${review.comment}</p>
                    </div>
                `).join('') : '<p>No comments yet for this product.</p>'}
            </div>
        </div>
    `;

    const closeBtn = modal.querySelector('.product-modal-close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            modal.innerHTML = '';
        };
    }

    modal.style.display = 'block';
}

function addToCartFromModal(button, productId) {
    const modalBody = button?.closest('.product-modal-body');
    const size = modalBody?.querySelector('.modal-size-select')?.value || '';
    const color = modalBody?.querySelector('.modal-selected-color-input')?.value || '';
    addToCart(productId, size, color);
}

window.onclick = function (event) {
    const modal = document.getElementById('quickViewModal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
        modal.innerHTML = '';
    }
};

async function loadProductsCatalog() {
    const localAndSeeded = getCatalog();
    try {
        const response = await fetch('/api/products');
        const result = await response.json();
        if (response.ok && Array.isArray(result.products)) {
            const apiProducts = result.products.map((product) => ({
                ...product,
                id: getProductId(product)
            }));
            return mergeCatalogs(apiProducts, localAndSeeded);
        }
    } catch (error) {
        // fallback to local catalog
    }

    return localAndSeeded;
}

document.addEventListener('DOMContentLoaded', async () => {
    products = await loadProductsCatalog();
    allProducts = [...products];
    localStorage.setItem('products', JSON.stringify(products));

    setupSearchBar();

    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';

    const searchInput = document.querySelector('form.search-bar input[name="q"]');
    if (searchInput) {
        searchInput.value = query;
    }

    if (products.length > 0) {
        applySearch(query);
    }

    updateCartCount();
});

document.addEventListener('click', (event) => {
    const choice = event.target.closest('.color-choice');
    if (!choice) return;

    const picker = choice.closest('.color-picker');
    if (!picker) return;

    picker.querySelectorAll('.color-choice').forEach((node) => node.classList.remove('selected'));
    choice.classList.add('selected');

    const wrap = choice.closest('.product-card, .product-modal-body');
    if (!wrap) return;

    const hidden = wrap.querySelector('.selected-color-input, .modal-selected-color-input');
    if (hidden) {
        hidden.value = choice.getAttribute('data-color') || '';
    }
});

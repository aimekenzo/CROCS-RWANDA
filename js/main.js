let products = [];
let allProducts = [];
const MAX_SUGGESTIONS = 6;
const PRODUCT_PLACEHOLDER_IMAGE = '/images/product-placeholder.svg';
const CART_STORAGE_KEY = 'crocs_rwanda_cart_items';
const SUPPORT_WHATSAPP_NUMBER = '250788623298';
const BUY_NOW_MODAL_ID = 'buyNowModal';

function getProductId(product) {
    return String(product?._id || product?.id || '').trim();
}

function getProductById(productId) {
    return products.find((product) => idsEqual(getProductId(product), productId));
}

function idsEqual(a, b) {
    return String(a || '').trim() === String(b || '').trim();
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
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
}

function saveCartItems(items) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
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
    const product = getProductById(productId);

    if (!product) {
        alert('Product not found.');
        return null;
    }

    if ((Number(product.stock) || 0) <= 0) {
        showSoldOutAssistant(product);
        return null;
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
    return lineId;
}

function validateRequiredVariantSelection(product, selectedSize, selectedColor) {
    const requiresSize = Array.isArray(product?.sizes) && product.sizes.length > 0;
    const requiresColor = Array.isArray(product?.colors) && product.colors.length > 0;

    const safeSize = String(selectedSize || '').trim();
    const safeColor = String(selectedColor || '').trim();

    if (requiresSize && !safeSize) {
        return 'Please select a size first.';
    }

    if (requiresColor && !safeColor) {
        return 'Please select a color first.';
    }

    return '';
}

function isLikelyPhoneNumber(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 9;
}

function ensureBuyNowModal() {
    let modal = document.getElementById(BUY_NOW_MODAL_ID);
    if (modal) {
        return modal;
    }

    modal = document.createElement('div');
    modal.id = BUY_NOW_MODAL_ID;
    modal.className = 'buy-now-modal-shell';
    modal.innerHTML = `
        <div class="buy-now-modal-card" role="dialog" aria-modal="true" aria-labelledby="buy-now-title">
            <button type="button" class="buy-now-close" aria-label="Close buy now form">&times;</button>
            <div class="buy-now-header">
                <div class="buy-now-product">
                    <img class="buy-now-product-image" alt="">
                    <div class="buy-now-product-copy">
                        <p class="buy-now-kicker">Direct WhatsApp order</p>
                        <h2 id="buy-now-title"></h2>
                        <p class="buy-now-price"></p>
                    </div>
                </div>
                <p class="buy-now-note">Share delivery details once and we will receive the request on WhatsApp immediately.</p>
            </div>
            <form class="buy-now-form" novalidate>
                <div class="buy-now-grid">
                    <div class="buy-now-field buy-now-size-field">
                        <label for="buy-now-size">Size</label>
                        <select id="buy-now-size" name="size"></select>
                    </div>
                    <div class="buy-now-field buy-now-color-field">
                        <label for="buy-now-color">Color</label>
                        <select id="buy-now-color" name="color"></select>
                    </div>
                    <div class="buy-now-field buy-now-field-wide">
                        <label for="buy-now-address">Delivery address</label>
                        <textarea id="buy-now-address" name="address" rows="4" placeholder="Sector, street, house, landmark, or any directions the rider should follow." required></textarea>
                    </div>
                    <div class="buy-now-field">
                        <label for="buy-now-primary-phone">Primary phone number</label>
                        <input id="buy-now-primary-phone" name="primaryPhone" type="tel" inputmode="tel" placeholder="Example: 0788123456" required>
                    </div>
                    <div class="buy-now-field">
                        <label for="buy-now-secondary-phone">Backup phone number</label>
                        <input id="buy-now-secondary-phone" name="secondaryPhone" type="tel" inputmode="tel" placeholder="Second number if the first is unreachable" required>
                    </div>
                </div>
                <p class="buy-now-feedback" role="alert" aria-live="polite"></p>
                <div class="buy-now-actions">
                    <button type="button" class="buy-now-cancel">Cancel</button>
                    <button type="submit" class="buy-now-submit">Send to WhatsApp</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const closeButton = modal.querySelector('.buy-now-close');
    const cancelButton = modal.querySelector('.buy-now-cancel');
    const form = modal.querySelector('.buy-now-form');

    if (closeButton) {
        closeButton.addEventListener('click', closeBuyNowModal);
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', closeBuyNowModal);
    }

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeBuyNowModal();
        }
    });

    if (form) {
        form.addEventListener('submit', handleBuyNowSubmit);
    }

    return modal;
}

function closeBuyNowModal() {
    const modal = document.getElementById(BUY_NOW_MODAL_ID);
    if (!modal) {
        return;
    }

    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
}

function setBuyNowFieldVisibility(modal, selector, isVisible) {
    const field = modal.querySelector(selector);
    if (!field) {
        return;
    }

    field.hidden = !isVisible;
}

function setBuyNowFeedback(modal, message = '', tone = '') {
    const feedback = modal.querySelector('.buy-now-feedback');
    if (!feedback) {
        return;
    }

    feedback.textContent = message;
    feedback.className = 'buy-now-feedback';
    if (tone) {
        feedback.classList.add(tone);
    }
}

function openBuyNowForm(product, selectedSize = '', selectedColor = '') {
    const modal = ensureBuyNowModal();
    const title = modal.querySelector('#buy-now-title');
    const price = modal.querySelector('.buy-now-price');
    const image = modal.querySelector('.buy-now-product-image');
    const sizeSelect = modal.querySelector('#buy-now-size');
    const colorSelect = modal.querySelector('#buy-now-color');
    const addressInput = modal.querySelector('#buy-now-address');
    const primaryPhoneInput = modal.querySelector('#buy-now-primary-phone');
    const secondaryPhoneInput = modal.querySelector('#buy-now-secondary-phone');
    const form = modal.querySelector('.buy-now-form');
    const productId = getProductId(product);
    const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
    const colors = Array.isArray(product?.colors) ? product.colors : [];

    if (!title || !price || !image || !sizeSelect || !colorSelect || !addressInput || !primaryPhoneInput || !secondaryPhoneInput || !form) {
        return;
    }

    title.textContent = product.name;
    price.textContent = `$${(Number(product.price) || 0).toFixed(2)} • ${Math.max(Number(product.stock) || 0, 0)} in stock`;
    image.src = product.image || PRODUCT_PLACEHOLDER_IMAGE;
    image.alt = product.name;

    form.dataset.productId = productId;

    setBuyNowFieldVisibility(modal, '.buy-now-size-field', sizes.length > 0);
    sizeSelect.required = sizes.length > 0;
    sizeSelect.innerHTML = sizes.length
        ? [
            '<option value="">Select size</option>',
            ...sizes.map((size) => `<option value="${size}">${size}</option>`)
        ].join('')
        : '<option value="">No size needed</option>';
    sizeSelect.value = sizes.includes(String(selectedSize || '').trim()) ? String(selectedSize || '').trim() : '';

    setBuyNowFieldVisibility(modal, '.buy-now-color-field', colors.length > 0);
    colorSelect.required = colors.length > 0;
    colorSelect.innerHTML = colors.length
        ? [
            '<option value="">Select color</option>',
            ...colors.map((color) => `<option value="${color}">${color}</option>`)
        ].join('')
        : '<option value="">No color needed</option>';
    colorSelect.value = colors.includes(String(selectedColor || '').trim()) ? String(selectedColor || '').trim() : '';

    addressInput.value = '';
    primaryPhoneInput.value = '';
    secondaryPhoneInput.value = '';
    setBuyNowFeedback(modal);

    modal.classList.add('open');
    document.body.classList.add('modal-open');

    if (sizes.length > 0 && !sizeSelect.value) {
        sizeSelect.focus();
        return;
    }

    if (colors.length > 0 && !colorSelect.value) {
        colorSelect.focus();
        return;
    }

    addressInput.focus();
}

function handleBuyNowSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const modal = form?.closest('.buy-now-modal-shell');
    const productId = form?.dataset.productId || '';
    const product = getProductById(productId);

    if (!modal || !product) {
        return;
    }

    const size = form.elements.size?.value || '';
    const color = form.elements.color?.value || '';
    const address = String(form.elements.address?.value || '').trim();
    const primaryPhone = String(form.elements.primaryPhone?.value || '').trim();
    const secondaryPhone = String(form.elements.secondaryPhone?.value || '').trim();

    if ((Number(product.stock) || 0) <= 0) {
        closeBuyNowModal();
        showSoldOutAssistant(product);
        return;
    }

    const variantError = validateRequiredVariantSelection(product, size, color);
    if (variantError) {
        setBuyNowFeedback(modal, variantError, 'error');
        return;
    }

    if (address.length < 10) {
        setBuyNowFeedback(modal, 'Please enter a more complete delivery address.', 'error');
        return;
    }

    if (!isLikelyPhoneNumber(primaryPhone)) {
        setBuyNowFeedback(modal, 'Enter a valid primary phone number.', 'error');
        return;
    }

    if (!isLikelyPhoneNumber(secondaryPhone)) {
        setBuyNowFeedback(modal, 'Enter a valid backup phone number.', 'error');
        return;
    }

    if (primaryPhone.replace(/\D/g, '') === secondaryPhone.replace(/\D/g, '')) {
        setBuyNowFeedback(modal, 'Use a different backup phone number from the primary one.', 'error');
        return;
    }

    const productLink = `${window.location.origin}/products`;
    const messageLines = [
        'Hello Crocs Rwanda, I want to place this order now:',
        `Product: ${product.name}`,
        `Price: $${(Number(product.price) || 0).toFixed(2)}`,
        `Delivery address: ${address}`,
        `Primary phone: ${primaryPhone}`,
        `Backup phone: ${secondaryPhone}`
    ];

    if (size) {
        messageLines.push(`Size: ${size}`);
    }

    if (color) {
        messageLines.push(`Color: ${color}`);
    }

    messageLines.push(`Product page: ${productLink}`);

    const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(messageLines.join('\n'))}`;
    closeBuyNowModal();
    const whatsappWindow = window.open(whatsappUrl, '_blank', 'noopener');
    if (!whatsappWindow) {
        window.location.href = whatsappUrl;
    }
}

function buyNow(productId, selectedSize = '', selectedColor = '') {
    const product = getProductById(productId);
    if (!product) {
        alert('Product not found.');
        return;
    }

    if ((Number(product.stock) || 0) <= 0) {
        showSoldOutAssistant(product);
        return;
    }

    openBuyNowForm(product, selectedSize, selectedColor);
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
    const normalizedEmail = normalize(email);
    const productId = getProductId(product);

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

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            return {
                status: 'error',
                message: result.message || 'Could not save stock alert right now.'
            };
        }

        if ((result.message || '').toLowerCase().includes('already exists')) {
            return { status: 'exists' };
        }

        return { status: 'saved' };
    } catch (error) {
        return {
            status: 'error',
            message: 'Network error. Please try again.'
        };
    }
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

        if (result.status === 'error') {
            notifyFeedback.textContent = result.message || 'Could not save your alert right now.';
            notifyFeedback.className = 'soldout-notify-feedback error';
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
                    <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.onerror=null;this.src='${PRODUCT_PLACEHOLDER_IMAGE}';">
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
                        <div class="product-actions">
                            <button type="button" data-action="buy-now-card" data-product-id="${productId}" class="checkout-btn product-buy-now-btn" aria-label="Buy ${product.name} now">Buy Now</button>
                            <button type="button" data-action="add-to-cart-card" data-product-id="${productId}" class="add-to-cart-btn" aria-label="Add ${product.name} to cart">Add to Cart</button>
                        </div>
                        <button type="button" data-action="quick-view" data-product-id="${productId}" class="quick-view-btn" aria-label="View full details for ${product.name}">View</button>
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

function buyNowFromCard(button, productId) {
    const card = button?.closest('.product-card');
    const size = card?.querySelector('.product-size-select')?.value || '';
    const color = card?.querySelector('.selected-color-input')?.value || '';
    buyNow(productId, size, color);
}

function getProductsPagePath() {
    return '/products';
}

function isProductsPage() {
    return window.location.pathname === '/products' || window.location.pathname.endsWith('/products.html');
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
            const onProductsPage = isProductsPage();
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

            const onProductsPage = isProductsPage();
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
            const onProductsPage = isProductsPage();

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
                <img src="${product.image}" alt="${product.name}" class="product-modal-image" onerror="this.onerror=null;this.src='${PRODUCT_PLACEHOLDER_IMAGE}';">
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
                    <div class="product-actions">
                        <button type="button" class="checkout-btn product-buy-now-btn" ${stock <= 0 ? 'disabled' : ''} data-action="buy-now-modal" data-product-id="${getProductId(product)}">${stock <= 0 ? 'Sold Out' : 'Buy Now'}</button>
                        <button type="button" class="add-to-cart-btn" ${stock <= 0 ? 'disabled' : ''} data-action="add-to-cart-modal" data-product-id="${getProductId(product)}">${stock <= 0 ? 'Sold Out' : 'Add to Cart'}</button>
                    </div>
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

function buyNowFromModal(button, productId) {
    const modalBody = button?.closest('.product-modal-body');
    const size = modalBody?.querySelector('.modal-size-select')?.value || '';
    const color = modalBody?.querySelector('.modal-selected-color-input')?.value || '';
    buyNow(productId, size, color);
}

window.onclick = function (event) {
    const modal = document.getElementById('quickViewModal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
        modal.innerHTML = '';
    }
};

async function loadProductsCatalog() {
    try {
        const response = await fetch('/api/products');
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            return [];
        }

        return Array.isArray(result.products)
            ? result.products.map((product) => ({
                ...product,
                id: getProductId(product)
            }))
            : [];
    } catch (error) {
        return [];
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    products = await loadProductsCatalog();
    allProducts = [...products];

    setupSearchBar();

    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';

    const searchInput = document.querySelector('form.search-bar input[name="q"]');
    if (searchInput) {
        searchInput.value = query;
    }

    applySearch(query);

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

document.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action][data-product-id]');
    if (!actionButton) {
        return;
    }

    const productId = actionButton.getAttribute('data-product-id') || '';
    if (!productId) {
        return;
    }

    const action = actionButton.getAttribute('data-action');
    if (action === 'buy-now-card') {
        buyNowFromCard(actionButton, productId);
    } else if (action === 'add-to-cart-card') {
        addToCartFromCard(actionButton, productId);
    } else if (action === 'quick-view') {
        openQuickView(productId);
    } else if (action === 'buy-now-modal') {
        buyNowFromModal(actionButton, productId);
    } else if (action === 'add-to-cart-modal') {
        addToCartFromModal(actionButton, productId);
    }
});

window.addToCartFromCard = addToCartFromCard;
window.buyNowFromCard = buyNowFromCard;
window.openQuickView = openQuickView;
window.addToCartFromModal = addToCartFromModal;
window.buyNowFromModal = buyNowFromModal;

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeBuyNowModal();
    }
});

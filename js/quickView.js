class QuickView {
    constructor() {
        this.modal = document.getElementById('quickViewModal');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close modal when clicking outside
        window.onclick = (event) => {
            if (event.target === this.modal) {
                this.closeModal();
            }
        }
    }

    openQuickView(productId) {
        const product = products.find(p => p.id === productId);
        
        const modalContent = `
            <div class="modal-content">
                <span class="close-modal" onclick="quickView.closeModal()">×</span>
                <div class="product-preview">
                    <div class="product-images">
                        <img src="${product.image}" alt="${product.name}">
                        <div class="color-options">
                            ${product.colors.map(color => 
                                `<span class="color-dot" style="background-color: ${color}"></span>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="product-details">
                        <h2>${product.name}</h2>
                        <p class="price">$${product.price.toFixed(2)}</p>
                        <div class="size-selector">
                            <select>
                                ${product.sizes.map(size => 
                                    `<option value="${size}">${size}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <p class="description">${product.description}</p>
                        <button onclick="cart.addItem(${product.id})" class="add-to-cart-btn">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.modal.innerHTML = modalContent;
        this.modal.style.display = 'block';
    }

    closeModal() {
        this.modal.style.display = 'none';
    }
}

// Initialize QuickView
const quickView = new QuickView();

// Add quick view buttons to product cards
document.querySelectorAll('.quick-view-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const productId = parseInt(e.target.closest('.product-card').dataset.id);
        quickView.openQuickView(productId);
    });
});

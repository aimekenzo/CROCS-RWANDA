class ProductManager {
    constructor() {
        this.setupProductForm();
    }

    setupProductForm() {
        const formHTML = `
            <div class="admin-panel">
                <h2>Add New Product</h2>
                <form id="productForm" class="product-form">
                    <input type="text" name="name" placeholder="Product Name" required>
                    <input type="number" name="price" placeholder="Price" step="0.01" required>
                    <select name="category" required>
                        <option value="Classic">Classic</option>
                        <option value="Sport">Sport</option>
                        <option value="Limited">Limited Edition</option>
                    </select>
                    <input type="text" name="colors" placeholder="Colors (comma-separated)" required>
                    <input type="text" name="sizes" placeholder="Sizes (comma-separated)" required>
                    <textarea name="description" placeholder="Product Description" required></textarea>
                    <input type="number" name="stock" placeholder="Stock Quantity" required>
                    <input type="file" name="image" accept="image/*" required>
                    <button type="submit">Add Product</button>
                </form>
            </div>
        `;

        document.querySelector('main').insertAdjacentHTML('beforeend', formHTML);
        this.addFormListener();
    }

    addFormListener() {
        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProductSubmission(e.target);
        });
    }

    handleProductSubmission(form) {
        const formData = new FormData(form);
        const newProduct = {
            id: products.length + 1,
            name: formData.get('name'),
            price: parseFloat(formData.get('price')),
            category: formData.get('category'),
            colors: formData.get('colors').split(',').map(color => color.trim()),
            sizes: formData.get('sizes').split(',').map(size => size.trim()),
            description: formData.get('description'),
            stock: parseInt(formData.get('stock')),
            rating: 0,
            reviews: []
        };

        // Add new product to products array
        products.push(newProduct);
        
        // Refresh product display
        displayProducts(products);
        
        // Reset form
        form.reset();
        
        // Show success message
        alert('Product added successfully!');
    }
}

// Initialize Product Manager
const productManager = new ProductManager();
class EnhancedProductManager {
    constructor() {
        this.setupEnhancedForm();
        this.imagePreview = null;
    }

    setupEnhancedForm() {
        const formHTML = `
            <div class="admin-panel">
                <h2>Product Management Dashboard</h2>
                <form id="productForm" class="product-form">
                    <div class="form-grid">
                        <div class="form-left">
                            <input type="text" name="name" placeholder="Product Name" required>
                            <input type="number" name="price" placeholder="Price" step="0.01" min="0" required>
                            <select name="category" required>
                                <option value="">Select Category</option>
                                <option value="Classic">Classic Crocs</option>
                                <option value="Sport">Sport Line</option>
                                <option value="Limited">Limited Edition</option>
                                <option value="Kids">Kids Collection</option>
                            </select>
                            <div class="color-picker">
                                <label>Available Colors:</label>
                                <div class="color-options">
                                    <input type="color" multiple>
                                    <button type="button" class="add-color">+ Add Color</button>
                                </div>
                            </div>
                        </div>
                        <div class="form-right">
                            <div class="image-preview-container">
                                <div id="imagePreview">
                                    <span>Image Preview</span>
                                </div>
                                <input type="file" name="image" accept="image/*" required>
                            </div>
                            <textarea name="description" placeholder="Product Description" rows="4" required></textarea>
                            <div class="size-grid">
                                ${this.generateSizeCheckboxes()}
                            </div>
                            <input type="number" name="stock" placeholder="Stock Quantity" min="0" required>
                        </div>
                    </div>
                    <button type="submit" class="submit-btn">Add New Product</button>
                </form>
            </div>
        `;

        document.querySelector('main').insertAdjacentHTML('beforeend', formHTML);
        this.initializeFormHandlers();
    }

    generateSizeCheckboxes() {
        const sizes = ['US 4', 'US 5', 'US 6', 'US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12'];
        return sizes.map(size => `
            <div class="size-checkbox">
                <input type="checkbox" name="sizes" value="${size}" id="${size}">
                <label for="${size}">${size}</label>
            </div>
        `).join('');
    }

    initializeFormHandlers() {
        const form = document.getElementById('productForm');
        const imageInput = form.querySelector('input[type="file"]');
        
        imageInput.addEventListener('change', (e) => this.handleImagePreview(e));
        form.addEventListener('submit', (e) => this.handleSubmission(e));
    }

    handleImagePreview(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('imagePreview');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                this.imagePreview = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    handleSubmission(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        const newProduct = {
            id: Date.now(),
            name: formData.get('name'),
            price: parseFloat(formData.get('price')),
            category: formData.get('category'),
            description: formData.get('description'),
            stock: parseInt(formData.get('stock')),
            image: this.imagePreview,
            sizes: Array.from(formData.getAll('sizes')),
            colors: Array.from(document.querySelectorAll('.color-options input[type="color"]'))
                .map(input => input.value),
            rating: 0,
            reviews: []
        };

        // Save to products array and localStorage
        products.push(newProduct);
        localStorage.setItem('products', JSON.stringify(products));
        
        // Show success message and reset form
        this.showNotification('Product added successfully!');
        event.target.reset();
        document.getElementById('imagePreview').innerHTML = '<span>Image Preview</span>';
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// Initialize Enhanced Product Manager
const productManager = new EnhancedProductManager();
class EnhancedProductManager {
    constructor() {
        this.setupEnhancedForm();
        this.imagePreview = null;
    }

    setupEnhancedForm() {
        const formHTML = `
            <div class="admin-panel">
                <h2>Product Management Dashboard</h2>
                <form id="productForm" class="product-form">
                    <div class="form-grid">
                        <div class="form-left">
                            <input type="text" name="name" placeholder="Product Name" required>
                            <input type="number" name="price" placeholder="Price" step="0.01" min="0" required>
                            <select name="category" required>
                                <option value="">Select Category</option>
                                <option value="Classic">Classic Crocs</option>
                                <option value="Sport">Sport Line</option>
                                <option value="Limited">Limited Edition</option>
                                <option value="Kids">Kids Collection</option>
                            </select>
                            <div class="color-picker">
                                <label>Available Colors:</label>
                                <div class="color-options">
                                    <input type="color" multiple>
                                    <button type="button" class="add-color">+ Add Color</button>
                                </div>
                            </div>
                        </div>
                        <div class="form-right">
                            <div class="image-preview-container">
                                <div id="imagePreview">
                                    <span>Image Preview</span>
                                </div>
                                <input type="file" name="image" accept="image/*" required>
                            </div>
                            <textarea name="description" placeholder="Product Description" rows="4" required></textarea>
                            <div class="size-grid">
                                ${this.generateSizeCheckboxes()}
                            </div>
                            <input type="number" name="stock" placeholder="Stock Quantity" min="0" required>
                        </div>
                    </div>
                    <button type="submit" class="submit-btn">Add New Product</button>
                </form>
            </div>
        `;

        document.querySelector('main').insertAdjacentHTML('beforeend', formHTML);
        this.initializeFormHandlers();
    }

    generateSizeCheckboxes() {
        const sizes = ['US 4', 'US 5', 'US 6', 'US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12'];
        return sizes.map(size => `
            <div class="size-checkbox">
                <input type="checkbox" name="sizes" value="${size}" id="${size}">
                <label for="${size}">${size}</label>
            </div>
        `).join('');
    }

    initializeFormHandlers() {
        const form = document.getElementById('productForm');
        const imageInput = form.querySelector('input[type="file"]');
        imageInput.addEventListener('change', (e) => this.handleImagePreview(e));
        form.addEventListener('submit', (e) => this.handleSubmission(e));
    }

    handleImagePreview(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('imagePreview');
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                this.imagePreview = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    handleSubmission(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const newProduct = {
            id: Date.now(),
            name: formData.get('name'),
            price: parseFloat(formData.get('price')),
            category: formData.get('category'),
            description: formData.get('description'),
            stock: parseInt(formData.get('stock')),
            image: this.imagePreview,
            sizes: Array.from(formData.getAll('sizes')),
            colors: Array.from(document.querySelectorAll('.color-options input[type="color"]')).map(input => input.value),
            rating: 0,
            reviews: []
        };
        products.push(newProduct);
        localStorage.setItem('products', JSON.stringify(products));
        this.showNotification('Product added successfully!');
        event.target.reset();
        document.getElementById('imagePreview').innerHTML = '<span>Image Preview</span>';
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

const productManager = new EnhancedProductManager();

class ProductFilter {
    constructor() {
        this.filters = {
            category: 'all',
            priceRange: 'all',
            color: 'all',
            size: 'all'
        };
        
        this.setupFilterUI();
    }

    setupFilterUI() {
        const filterHTML = `
            <div class="filter-container">
                <div class="filter-group">
                    <h3>Categories</h3>
                    <select id="categoryFilter">
                        <option value="all">All Categories</option>
                        <option value="Classic">Classic</option>
                        <option value="Sport">Sport</option>
                        <option value="Limited">Limited Edition</option>
                    </select>
                </div>
                <div class="filter-group">
                    <h3>Price Range</h3>
                    <select id="priceFilter">
                        <option value="all">All Prices</option>
                        <option value="0-30">Under $30</option>
                        <option value="30-50">$30 - $50</option>
                        <option value="50+">Over $50</option>
                    </select>
                </div>
                <div class="filter-group">
                    <h3>Color</h3>
                    <div class="color-filters">
                        <span class="color-filter" data-color="all">All</span>
                        <span class="color-filter" data-color="green"></span>
                        <span class="color-filter" data-color="blue"></span>
                        <span class="color-filter" data-color="black"></span>
                    </div>
                </div>
            </div>
        `;

        document.querySelector('.product-grid').insertAdjacentHTML('beforebegin', filterHTML);
        this.addFilterListeners();
    }

    addFilterListeners() {
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
        });

        document.getElementById('priceFilter').addEventListener('change', (e) => {
            this.filters.priceRange = e.target.value;
            this.applyFilters();
        });

        document.querySelectorAll('.color-filter').forEach(filter => {
            filter.addEventListener('click', (e) => {
                this.filters.color = e.target.dataset.color;
                this.applyFilters();
            });
        });
    }

    applyFilters() {
        let filteredProducts = products;

        // Apply category filter
        if (this.filters.category !== 'all') {
            filteredProducts = filteredProducts.filter(product => 
                product.category === this.filters.category
            );
        }

        // Apply price filter
        if (this.filters.priceRange !== 'all') {
            const [min, max] = this.filters.priceRange.split('-');
            filteredProducts = filteredProducts.filter(product => {
                if (max === '+') return product.price >= parseInt(min);
                return product.price >= parseInt(min) && product.price <= parseInt(max);
            });
        }

        // Apply color filter
        if (this.filters.color !== 'all') {
            filteredProducts = filteredProducts.filter(product => 
                product.colors.includes(this.filters.color)
            );
        }

        displayProducts(filteredProducts);
    }
}

// Initialize filter system
const productFilter = new ProductFilter();

window.products = [
    {
        id: 1,
        name: "Classic Green Clog",
        price: 49.99,
        colors: ["#2ecc71", "#27ae60", "#1abc9c"],
        sizes: ["US 4", "US 5", "US 6", "US 7", "US 8", "US 9"],
        category: "Classic",
        description: "Everyday comfort in a fresh green finish.",
        image: "https://placehold.co/640x480/2ecc71/ffffff?text=Classic+Green",
        stock: 18,
        rating: 4.6,
        reviews: [
            { user: "Aline", rating: 5, comment: "Very comfortable, I wear them daily." },
            { user: "Eric", rating: 4, comment: "Great fit and easy to clean." }
        ]
    },
    {
        id: 2,
        name: "Urban Black Slide",
        price: 39.99,
        colors: ["#111827", "#374151", "#6b7280"],
        sizes: ["US 6", "US 7", "US 8", "US 9", "US 10", "US 11"],
        category: "Slide",
        description: "Lightweight slide for casual city wear.",
        image: "https://placehold.co/640x480/111827/ffffff?text=Urban+Black",
        stock: 22,
        rating: 4.4,
        reviews: [
            { user: "Maya", rating: 4, comment: "Simple and stylish for quick errands." },
            { user: "Patrick", rating: 5, comment: "Good value and durable sole." }
        ]
    },
    {
        id: 3,
        name: "Sport Navy Clog",
        price: 59.99,
        colors: ["#1e3a8a", "#1d4ed8", "#60a5fa"],
        sizes: ["US 6", "US 7", "US 8", "US 9", "US 10"],
        category: "Sport",
        description: "Built for active days with extra grip.",
        image: "https://placehold.co/640x480/1e3a8a/ffffff?text=Sport+Navy",
        stock: 14,
        rating: 4.7,
        reviews: [
            { user: "Joy", rating: 5, comment: "Super stable when walking long distances." },
            { user: "Claude", rating: 4, comment: "Sporty look with great support." }
        ]
    },
    {
        id: 4,
        name: "Sunset Orange Clog",
        price: 52.5,
        colors: ["#f97316", "#fb923c", "#fdba74"],
        sizes: ["US 5", "US 6", "US 7", "US 8", "US 9"],
        category: "Classic",
        description: "Bright colorway for standout style.",
        image: "https://placehold.co/640x480/f97316/ffffff?text=Sunset+Orange",
        stock: 0,
        rating: 4.5,
        reviews: [
            { user: "Nadia", rating: 5, comment: "Color is amazing in person." },
            { user: "Sam", rating: 4, comment: "Comfort is top quality." }
        ]
    },
    {
        id: 5,
        name: "Rose Pink Lite",
        price: 44.99,
        colors: ["#ec4899", "#f472b6", "#f9a8d4"],
        sizes: ["US 4", "US 5", "US 6", "US 7", "US 8"],
        category: "Lite",
        description: "Soft and light for all-day wear.",
        image: "https://placehold.co/640x480/ec4899/ffffff?text=Rose+Pink",
        stock: 16,
        rating: 4.3,
        reviews: [
            { user: "Diane", rating: 4, comment: "Very light and easy to wear." },
            { user: "Beata", rating: 4, comment: "Lovely color and true size." }
        ]
    },
    {
        id: 6,
        name: "Sahara Beige Sandal",
        price: 41.0,
        colors: ["#d6b98c", "#c7a77a", "#e7d3b0"],
        sizes: ["US 6", "US 7", "US 8", "US 9", "US 10"],
        category: "Sandal",
        description: "Breathable sandal for warm weather.",
        image: "https://placehold.co/640x480/d6b98c/ffffff?text=Sahara+Beige",
        stock: 25,
        rating: 4.2,
        reviews: [
            { user: "Irene", rating: 4, comment: "Perfect for sunny days." },
            { user: "Theo", rating: 4, comment: "Comfortable straps and soft sole." }
        ]
    },
    {
        id: 7,
        name: "Forest Trek Clog",
        price: 63.99,
        colors: ["#14532d", "#166534", "#22c55e"],
        sizes: ["US 7", "US 8", "US 9", "US 10", "US 11"],
        category: "Trail",
        description: "Rugged support for longer walks.",
        image: "https://placehold.co/640x480/14532d/ffffff?text=Forest+Trek",
        stock: 12,
        rating: 4.8,
        reviews: [
            { user: "Kevin", rating: 5, comment: "Excellent grip and cushioning." },
            { user: "Ariane", rating: 5, comment: "My favorite for weekend walks." }
        ]
    },
    {
        id: 8,
        name: "Ocean Blue Slide",
        price: 37.5,
        colors: ["#0ea5e9", "#38bdf8", "#7dd3fc"],
        sizes: ["US 5", "US 6", "US 7", "US 8", "US 9", "US 10"],
        category: "Slide",
        description: "Slip-on comfort with fresh blue tones.",
        image: "https://placehold.co/640x480/0ea5e9/ffffff?text=Ocean+Blue",
        stock: 27,
        rating: 4.1,
        reviews: [
            { user: "Yvette", rating: 4, comment: "Easy slip-on style." },
            { user: "Moses", rating: 4, comment: "Good daily pair for home and outside." }
        ]
    },
    {
        id: 9,
        name: "Midnight Purple Clog",
        price: 54.0,
        colors: ["#581c87", "#6d28d9", "#a78bfa"],
        sizes: ["US 6", "US 7", "US 8", "US 9"],
        category: "Classic",
        description: "Bold dark shade with signature comfort.",
        image: "https://placehold.co/640x480/581c87/ffffff?text=Midnight+Purple",
        stock: 11,
        rating: 4.4,
        reviews: [
            { user: "Sharon", rating: 4, comment: "Unique color, lots of compliments." },
            { user: "Jean", rating: 5, comment: "Comfortable from first wear." }
        ]
    },
    {
        id: 10,
        name: "Cloud White Comfort",
        price: 46.99,
        colors: ["#f3f4f6", "#d1d5db", "#9ca3af"],
        sizes: ["US 4", "US 5", "US 6", "US 7", "US 8", "US 9", "US 10"],
        category: "Comfort",
        description: "Minimal clean look for every outfit.",
        image: "https://placehold.co/640x480/f3f4f6/111827?text=Cloud+White",
        stock: 20,
        rating: 4.5,
        reviews: [
            { user: "Bella", rating: 5, comment: "Looks clean and feels premium." },
            { user: "Emile", rating: 4, comment: "Great comfort all day." }
        ]
    }
];

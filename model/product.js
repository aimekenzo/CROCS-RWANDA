const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        user: { type: String, trim: true, default: 'Customer' },
        rating: { type: Number, min: 0, max: 5, default: 0 },
        comment: { type: String, trim: true, default: '' }
    },
    { _id: false }
);

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    stock: { type: Number, default: 0, min: 0 },
    category: { type: String, default: 'General' },
    colors: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: [reviewSchema], default: [] }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;

const mongoose = require('mongoose');

const stockAlertSchema = new mongoose.Schema(
    {
        productId: { type: String, required: true, trim: true },
        productName: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        status: { type: String, enum: ['open', 'resolved'], default: 'open' }
    },
    { timestamps: true }
);

module.exports = mongoose.model('StockAlert', stockAlertSchema);

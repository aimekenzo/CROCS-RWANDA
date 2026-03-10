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

stockAlertSchema.index({ productId: 1, status: 1 });
stockAlertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StockAlert', stockAlertSchema);

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
    {
        productId: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        image: { type: String, default: '' }
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        customer: {
            fullName: { type: String, required: true, trim: true },
            email: { type: String, required: true, trim: true, lowercase: true },
            phone: { type: String, required: true, trim: true }
        },
        payment: {
            method: { type: String, enum: ['card', 'momo'], required: true },
            cardLast4: { type: String, default: '' },
            momoNumber: { type: String, default: '' },
            momoName: { type: String, default: '' }
        },
        items: { type: [orderItemSchema], required: true },
        summary: {
            subtotal: { type: Number, required: true, min: 0 },
            shipping: { type: Number, required: true, min: 0 },
            total: { type: Number, required: true, min: 0 }
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);

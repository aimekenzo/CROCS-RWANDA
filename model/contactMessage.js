const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        subject: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        status: { type: String, enum: ['new', 'read', 'replied'], default: 'new' },
        adminReply: { type: String, default: '' },
        ipAddress: { type: String, default: '' },
        userAgent: { type: String, default: '' }
    },
    { timestamps: true }
);

contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ email: 1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);

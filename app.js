// filepath: c:\Users\HP\OneDrive\Desktop\CROCS RWANDA\crocs-rwanda\app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const morgan = require('morgan');
const ContactMessage = require('./model/contactMessage');
const Order = require('./model/order');
const Product = require('./model/product');
const StockAlert = require('./model/stockAlert');
const app = express();

const ADMIN_SESSION_COOKIE = 'admin_session';
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const adminSessions = new Map();

function parseCookies(req) {
    const raw = req.headers.cookie || '';
    return raw.split(';').reduce((acc, item) => {
        const [key, ...rest] = item.trim().split('=');
        if (!key) return acc;
        acc[key] = decodeURIComponent(rest.join('=') || '');
        return acc;
    }, {});
}

function getAdminToken(req) {
    const cookies = parseCookies(req);
    return String(cookies[ADMIN_SESSION_COOKIE] || '').trim();
}

function isValidAdminSession(token) {
    if (!token) return false;
    const expiresAt = adminSessions.get(token);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
        adminSessions.delete(token);
        return false;
    }
    return true;
}

function requireAdminApi(req, res, next) {
    const token = getAdminToken(req);
    if (!isValidAdminSession(token)) {
        return res.status(401).json({ message: 'Admin authentication required.' });
    }
    next();
}

function requireAdminPage(req, res, next) {
    const token = getAdminToken(req);
    if (!isValidAdminSession(token)) {
        return res.redirect('/pages/admin-login.html');
    }
    next();
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crocs-rwanda').then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse form payloads
app.use(express.static('public')); // Serve static files
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use('/pages/admin.html', requireAdminPage);
app.use('/pages', express.static('pages'));
app.use('/images', express.static('images'));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'products.html'));
});

app.get('/about', (req, res) => {
    res.send('About Crocs Rwanda');
});

app.post('/api/admin/login', (req, res) => {
    const submitted = String(req.body.password || '').trim();
    const expected = String(process.env.ADMIN_PASSWORD || '').trim();

    if (!expected) {
        return res.status(500).json({ message: 'ADMIN_PASSWORD is not configured on server.' });
    }

    if (!submitted || submitted !== expected) {
        return res.status(401).json({ message: 'Invalid admin password.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
    adminSessions.set(token, expiresAt);

    res.setHeader(
        'Set-Cookie',
        `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}`
    );

    res.json({ message: 'Login successful.' });
});

app.get('/api/admin/session', (req, res) => {
    const token = getAdminToken(req);
    res.json({ authenticated: isValidAdminSession(token) });
});

app.post('/api/admin/logout', (req, res) => {
    const token = getAdminToken(req);
    if (token) {
        adminSessions.delete(token);
    }
    res.setHeader('Set-Cookie', `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
    res.json({ message: 'Logged out.' });
});

const contactRateLimit = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_CONTACT_SUBMISSIONS = 5;
const MIN_SECONDS_BETWEEN_SUBMISSIONS = 10;

function validateContactPayload(payload) {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const name = (payload.name || '').trim();
    const email = (payload.email || '').trim();
    const subject = (payload.subject || '').trim();
    const message = (payload.message || '').trim();
    const company = (payload.company || '').trim();

    if (company) {
        errors.push('Spam detected.');
    }
    if (name.length < 2 || name.length > 100) {
        errors.push('Name must be between 2 and 100 characters.');
    }
    if (!emailRegex.test(email)) {
        errors.push('Valid email is required.');
    }
    if (subject.length < 3 || subject.length > 120) {
        errors.push('Subject must be between 3 and 120 characters.');
    }
    if (message.length < 20 || message.length > 2000) {
        errors.push('Message must be between 20 and 2000 characters.');
    }

    return {
        errors,
        cleaned: { name, email, subject, message }
    };
}

function canSubmitContact(ip) {
    const now = Date.now();
    const current = contactRateLimit.get(ip) || { count: 0, firstSeen: now, lastSeen: 0 };

    if (now - current.firstSeen > RATE_LIMIT_WINDOW_MS) {
        current.count = 0;
        current.firstSeen = now;
    }
    if (now - current.lastSeen < MIN_SECONDS_BETWEEN_SUBMISSIONS * 1000) {
        return { allowed: false, code: 'cooldown' };
    }
    if (current.count >= MAX_CONTACT_SUBMISSIONS) {
        return { allowed: false, code: 'rate_limit' };
    }

    current.count += 1;
    current.lastSeen = now;
    contactRateLimit.set(ip, current);
    return { allowed: true };
}

app.post('/api/contact', async (req, res, next) => {
    try {
        const sourceIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const limit = canSubmitContact(sourceIp);

        if (!limit.allowed) {
            if (limit.code === 'cooldown') {
                return res.status(429).json({ message: 'Please wait a few seconds before sending another message.' });
            }
            return res.status(429).json({ message: 'Too many messages sent. Please try again later.' });
        }

        const { errors, cleaned } = validateContactPayload(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ message: errors[0] });
        }

        await ContactMessage.create({
            ...cleaned,
            ipAddress: sourceIp,
            userAgent: req.get('user-agent') || ''
        });

        res.status(201).json({ message: 'Message received.' });
    } catch (error) {
        next(error);
    }
});

app.get('/api/contact-messages', requireAdminApi, async (req, res, next) => {
    try {
        const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(500).lean();
        res.json({ messages });
    } catch (error) {
        next(error);
    }
});

app.patch('/api/contact-messages/:id', requireAdminApi, async (req, res, next) => {
    try {
        const status = String(req.body.status || '').trim();
        const adminReply = String(req.body.adminReply || '').trim();

        const update = {};
        if (['new', 'read', 'replied'].includes(status)) {
            update.status = status;
        }
        if (adminReply) {
            update.adminReply = adminReply;
            update.status = 'replied';
        }

        const updated = await ContactMessage.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!updated) {
            return res.status(404).json({ message: 'Message not found.' });
        }

        res.json({ message: 'Message updated.', data: updated });
    } catch (error) {
        next(error);
    }
});

app.get('/api/products', async (req, res, next) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 }).lean();
        res.json({ products });
    } catch (error) {
        next(error);
    }
});

app.post('/api/products', requireAdminApi, async (req, res, next) => {
    try {
        const payload = req.body || {};
        const product = await Product.create({
            name: String(payload.name || '').trim(),
            price: Number(payload.price || 0),
            description: String(payload.description || '').trim(),
            image: String(payload.image || '').trim(),
            stock: Number(payload.stock || 0),
            category: String(payload.category || 'General').trim(),
            colors: Array.isArray(payload.colors) ? payload.colors : String(payload.colors || '').split(',').map((x) => x.trim()).filter(Boolean),
            sizes: Array.isArray(payload.sizes) ? payload.sizes : String(payload.sizes || '').split(',').map((x) => x.trim()).filter(Boolean),
            rating: Number(payload.rating || 0),
            reviews: Array.isArray(payload.reviews) ? payload.reviews : []
        });

        res.status(201).json({ message: 'Product created.', product });
    } catch (error) {
        next(error);
    }
});

app.put('/api/products/:id', requireAdminApi, async (req, res, next) => {
    try {
        const payload = req.body || {};
        const update = {
            name: String(payload.name || '').trim(),
            price: Number(payload.price || 0),
            description: String(payload.description || '').trim(),
            image: String(payload.image || '').trim(),
            stock: Number(payload.stock || 0),
            category: String(payload.category || 'General').trim(),
            colors: Array.isArray(payload.colors) ? payload.colors : String(payload.colors || '').split(',').map((x) => x.trim()).filter(Boolean),
            sizes: Array.isArray(payload.sizes) ? payload.sizes : String(payload.sizes || '').split(',').map((x) => x.trim()).filter(Boolean),
            rating: Number(payload.rating || 0)
        };

        const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.json({ message: 'Product updated.', product });
    } catch (error) {
        next(error);
    }
});

app.delete('/api/products/:id', requireAdminApi, async (req, res, next) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        res.json({ message: 'Product deleted.' });
    } catch (error) {
        next(error);
    }
});

function validateOrderPayload(payload) {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const customer = payload.customer || {};
    const payment = payload.payment || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    const summary = payload.summary || {};

    const fullName = String(customer.fullName || '').trim();
    const email = String(customer.email || '').trim();
    const phone = String(customer.phone || '').trim();
    const method = String(payment.method || '').trim();

    if (fullName.length < 2) errors.push('Customer name is required.');
    if (!emailRegex.test(email)) errors.push('Valid customer email is required.');
    if (phone.length < 7) errors.push('Valid customer phone is required.');
    if (!['card', 'momo'].includes(method)) errors.push('Payment method must be card or momo.');
    if (!items.length) errors.push('Order must include at least one item.');

    const normalizedItems = items.map((item) => ({
        productId: String(item.productId || '').trim(),
        name: String(item.name || '').trim(),
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 0),
        image: String(item.image || '')
    }));

    if (normalizedItems.some((i) => !i.productId || !i.name || i.price < 0 || i.quantity < 1)) {
        errors.push('Order items are invalid.');
    }

    const subtotal = Number(summary.subtotal || 0);
    const shipping = Number(summary.shipping || 0);
    const total = Number(summary.total || 0);

    if (subtotal < 0 || shipping < 0 || total < 0) {
        errors.push('Order summary values are invalid.');
    }

    const recomputedSubtotal = normalizedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    if (Math.abs(recomputedSubtotal - subtotal) > 0.01) {
        errors.push('Order subtotal mismatch.');
    }
    if (Math.abs((subtotal + shipping) - total) > 0.01) {
        errors.push('Order total mismatch.');
    }

    const normalizedPayment = {
        method,
        cardLast4: '',
        momoNumber: '',
        momoName: ''
    };

    if (method === 'card') {
        const cardNumber = String(payment.cardNumber || '').replace(/\s+/g, '');
        if (cardNumber.length < 12) {
            errors.push('Card number is invalid.');
        } else {
            normalizedPayment.cardLast4 = cardNumber.slice(-4);
        }
    }

    if (method === 'momo') {
        const momoNumber = String(payment.momoNumber || '').trim();
        const momoName = String(payment.momoName || '').trim();
        if (momoNumber.length < 9 || momoName.length < 2) {
            errors.push('MTN MoMo details are invalid.');
        } else {
            normalizedPayment.momoNumber = momoNumber;
            normalizedPayment.momoName = momoName;
        }
    }

    return {
        errors,
        cleaned: {
            customer: { fullName, email, phone },
            payment: normalizedPayment,
            items: normalizedItems,
            summary: { subtotal, shipping, total }
        }
    };
}

app.post('/api/orders', async (req, res, next) => {
    try {
        const { errors, cleaned } = validateOrderPayload(req.body || {});
        if (errors.length > 0) {
            return res.status(400).json({ message: errors[0] });
        }

        const saved = await Order.create({
            ...cleaned,
            status: 'pending'
        });

        res.status(201).json({
            message: 'Order created successfully.',
            orderId: saved._id
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/orders', requireAdminApi, async (req, res, next) => {
    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(300)
            .lean();

        res.json({ orders });
    } catch (error) {
        next(error);
    }
});

app.patch('/api/orders/:id/status', requireAdminApi, async (req, res, next) => {
    try {
        const status = String(req.body.status || '').trim();
        if (!['pending', 'paid', 'failed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid order status.' });
        }

        const updated = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!updated) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        res.json({ message: 'Order status updated.', order: updated });
    } catch (error) {
        next(error);
    }
});

app.post('/api/stock-alerts', async (req, res, next) => {
    try {
        const productId = String(req.body.productId || '').trim();
        const productName = String(req.body.productName || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        if (!productId || !productName || !emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid stock alert payload.' });
        }

        const existing = await StockAlert.findOne({ productId, email });
        if (existing) {
            return res.status(200).json({ message: 'Stock alert already exists.', alertId: existing._id });
        }

        const saved = await StockAlert.create({ productId, productName, email, status: 'open' });
        res.status(201).json({ message: 'Stock alert saved.', alertId: saved._id });
    } catch (error) {
        next(error);
    }
});

app.get('/api/stock-alerts', requireAdminApi, async (req, res, next) => {
    try {
        const alerts = await StockAlert.find().sort({ createdAt: -1 }).limit(500).lean();
        res.json({ alerts });
    } catch (error) {
        next(error);
    }
});

app.patch('/api/stock-alerts/:id', requireAdminApi, async (req, res, next) => {
    try {
        const status = String(req.body.status || '').trim();
        if (!['open', 'resolved'].includes(status)) {
            return res.status(400).json({ message: 'Invalid alert status.' });
        }

        const updated = await StockAlert.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!updated) {
            return res.status(404).json({ message: 'Alert not found.' });
        }

        res.json({ message: 'Alert updated.', alert: updated });
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/overview', requireAdminApi, async (req, res, next) => {
    try {
        const [products, orders, messages, alerts] = await Promise.all([
            Product.countDocuments(),
            Order.countDocuments(),
            ContactMessage.countDocuments(),
            StockAlert.countDocuments({ status: 'open' })
        ]);

        res.json({ counts: { products, orders, messages, openAlerts: alerts } });
    } catch (error) {
        next(error);
    }
});

// 404 Middleware
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

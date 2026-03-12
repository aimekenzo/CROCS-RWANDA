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
const { isEmailConfigured, sendContactNotifications, sendOrderNotifications } = require('./services/email');
const app = express();
app.set('trust proxy', 1);
const isProduction = process.env.NODE_ENV === 'production';
const APP_NAMESPACE = 'crocs_rwanda';

const REQUIRED_ENV_VARS = ['ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET'];
const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !String(process.env[name] || '').trim());
if (missingEnvVars.length > 0) {
    console.error(`Missing required env vars: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const ADMIN_SESSION_COOKIE = `${APP_NAMESPACE}_admin_session`;
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const ADMIN_USERNAME = normalizeId(process.env.ADMIN_USERNAME).toLowerCase();
const ADMIN_PASSWORD = normalizeId(process.env.ADMIN_PASSWORD);
const ADMIN_SESSION_SECRET = String(process.env.ADMIN_SESSION_SECRET);

function looksLikePlaceholder(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return (
        !normalized
        || normalized.includes('change-this')
        || normalized.includes('example')
        || normalized.includes('your-strong-password')
        || normalized.includes('your-long-random-session-secret')
    );
}

function validateProductionSecurityConfig() {
    if (!isProduction) {
        return;
    }

    const issues = [];

    if (ADMIN_PASSWORD.length < 10 || looksLikePlaceholder(ADMIN_PASSWORD)) {
        issues.push('ADMIN_PASSWORD must be a strong non-placeholder value with at least 10 characters.');
    }

    if (ADMIN_SESSION_SECRET.length < 32 || looksLikePlaceholder(ADMIN_SESSION_SECRET)) {
        issues.push('ADMIN_SESSION_SECRET must be a strong non-placeholder value with at least 32 characters.');
    }

    if (issues.length > 0) {
        console.error('Refusing to start with weak production admin configuration:');
        issues.forEach((issue) => console.error(`- ${issue}`));
        process.exit(1);
    }
}

validateProductionSecurityConfig();

function parseCookies(req) {
    const raw = req.headers.cookie || '';
    return raw.split(';').reduce((acc, item) => {
        const [key, ...rest] = item.trim().split('=');
        if (!key) return acc;
        acc[key] = decodeURIComponent(rest.join('=') || '');
        return acc;
    }, {});
}

function getClientIp(req) {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.trim()) {
        return xff.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
}

function createRateLimiter(windowMs, maxRequests, minIntervalMs = 0) {
    const state = new Map();
    return (key) => {
        const now = Date.now();
        const entry = state.get(key) || { count: 0, firstSeen: now, lastSeen: 0 };

        if (now - entry.firstSeen > windowMs) {
            entry.count = 0;
            entry.firstSeen = now;
        }
        if (now - entry.lastSeen < minIntervalMs) {
            return { allowed: false, reason: 'cooldown' };
        }
        if (entry.count >= maxRequests) {
            return { allowed: false, reason: 'rate_limit' };
        }

        entry.count += 1;
        entry.lastSeen = now;
        state.set(key, entry);
        return { allowed: true };
    };
}

function withStatusError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeId(value) {
    return String(value || '').trim();
}

function safeEqual(a, b) {
    const left = Buffer.from(String(a || ''));
    const right = Buffer.from(String(b || ''));
    if (left.length !== right.length) {
        return false;
    }
    return crypto.timingSafeEqual(left, right);
}

function signAdminSessionPayload(payload) {
    return crypto
        .createHmac('sha256', ADMIN_SESSION_SECRET)
        .update(payload)
        .digest('base64url');
}

function createAdminSessionToken() {
    const payload = Buffer.from(JSON.stringify({
        username: ADMIN_USERNAME,
        exp: Date.now() + ADMIN_SESSION_TTL_MS
    })).toString('base64url');

    return `${payload}.${signAdminSessionPayload(payload)}`;
}

function readAdminSession(req) {
    const cookies = parseCookies(req);
    const token = String(cookies[ADMIN_SESSION_COOKIE] || '').trim();
    if (!token) {
        return null;
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
        return null;
    }

    const [payload, signature] = parts;
    const expectedSignature = signAdminSessionPayload(payload);
    if (!safeEqual(signature, expectedSignature)) {
        return null;
    }

    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        const username = normalizeId(decoded.username).toLowerCase();
        const exp = Number(decoded.exp || 0);

        if (!username || username !== ADMIN_USERNAME || !Number.isFinite(exp) || Date.now() > exp) {
            return null;
        }

        return { username, exp };
    } catch (error) {
        return null;
    }
}

function requireAdminApi(req, res, next) {
    const session = readAdminSession(req);
    if (!session) {
        return res.status(401).json({ message: 'Admin authentication required.' });
    }
    next();
}

function requireAdminPage(req, res, next) {
    const session = readAdminSession(req);
    if (!session) {
        return res.redirect('/admin-login');
    }
    next();
}

function getMongoHealth() {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    const readyState = Number(mongoose.connection.readyState || 0);

    return {
        ready: readyState === 1,
        state: states[readyState] || `unknown(${readyState})`
    };
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crocs-rwanda').then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-origin' }
})); // Security headers
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse form payloads
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: 'Invalid JSON payload.' });
    }
    return next(err);
});
app.use(express.static('public')); // Serve static files
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use('/pages/admin.html', requireAdminPage);
app.use('/pages', express.static('pages'));
app.use('/images', express.static('images'));

// Set EJS as the view engine
app.set('view engine', 'ejs');

function sendPage(res, fileName) {
    return res.sendFile(path.join(__dirname, 'pages', fileName));
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.redirect(301, '/');
});

app.get('/products', (req, res) => {
    sendPage(res, 'products.html');
});

app.get('/about', (req, res) => {
    sendPage(res, 'about.html');
});

app.get('/account', (req, res) => {
    sendPage(res, 'account.html');
});

app.get('/cart', (req, res) => {
    sendPage(res, 'cart.html');
});

app.get('/shipping', (req, res) => {
    sendPage(res, 'shipping.html');
});

app.get('/returns', (req, res) => {
    sendPage(res, 'returns.html');
});

app.get('/tracking', (req, res) => {
    sendPage(res, 'tracking.html');
});

app.get('/admin-login', (req, res) => {
    sendPage(res, 'admin-login.html');
});

app.get('/admin', requireAdminPage, (req, res) => {
    sendPage(res, 'admin.html');
});

app.get('/admin/orders', requireAdminPage, (req, res) => {
    sendPage(res, 'admin-orders.html');
});

app.get('/api/health', (req, res) => {
    const mongo = getMongoHealth();
    const status = mongo.ready ? 200 : 503;

    res.status(status).json({
        status: mongo.ready ? 'ok' : 'degraded',
        environment: process.env.NODE_ENV || 'development',
        uptimeSeconds: Math.floor(process.uptime()),
        emailConfigured: isEmailConfigured(),
        database: mongo.state
    });
});

app.post('/api/admin/login', (req, res) => {
    const ip = getClientIp(req);
    const submittedUsername = normalizeId(req.body?.username).toLowerCase();
    const submitted = normalizeId(req.body?.password);

    const loginAttemptLimit = adminLoginRateLimit(ip);
    if (!loginAttemptLimit.allowed) {
        const msg = loginAttemptLimit.reason === 'cooldown'
            ? 'Too many attempts. Wait a few seconds and retry.'
            : 'Too many login attempts. Please try again later.';
        return res.status(429).json({ message: msg });
    }

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_SESSION_SECRET) {
        return res.status(500).json({ message: 'Admin credentials are not configured on server.' });
    }

    if (!safeEqual(submittedUsername, ADMIN_USERNAME) || !safeEqual(submitted, ADMIN_PASSWORD)) {
        return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    const token = createAdminSessionToken();

    res.setHeader(
        'Set-Cookie',
        `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; ${isProduction ? 'Secure; ' : ''}Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}`
    );

    res.json({ message: 'Login successful.' });
});

app.get('/api/admin/session', (req, res) => {
    const session = readAdminSession(req);
    res.json({
        authenticated: Boolean(session),
        username: session?.username || null
    });
});

app.post('/api/admin/logout', (req, res) => {
    res.setHeader(
        'Set-Cookie',
        `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; ${isProduction ? 'Secure; ' : ''}Max-Age=0`
    );
    res.json({ message: 'Logged out.' });
});

const contactRateLimit = createRateLimiter(15 * 60 * 1000, 5, 10000);
const orderRateLimit = createRateLimiter(10 * 60 * 1000, 8, 3000);
const stockAlertRateLimit = createRateLimiter(10 * 60 * 1000, 20, 2000);
const adminLoginRateLimit = createRateLimiter(15 * 60 * 1000, 10, 2000);

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

function parseProductListValue(value) {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item || '').trim())
            .filter((item) => item);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item);
    }

    return [];
}

function normalizeProductReviews(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((entry) => {
        if (!entry || typeof entry !== 'object') {
            return { user: 'Customer', rating: 0, comment: '' };
        }

        return {
            user: String(entry.user || '').trim() || 'Customer',
            rating: Math.min(Math.max(Number(entry.rating) || 0, 0), 5),
            comment: String(entry.comment || '').trim()
        };
    });
}

function buildProductPlaceholderImage(name) {
    return '/images/product-placeholder.svg';
}

function normalizeProductImage(name, value) {
    const image = String(value || '').trim();
    if (!image) {
        return buildProductPlaceholderImage(name);
    }

    if (
        image.startsWith('/images/')
        || image.startsWith('images/')
        || image.startsWith('../images/')
        || image.startsWith('./images/')
        || image.startsWith('data:image/')
    ) {
        return image;
    }

    try {
        const parsed = new URL(image);
        const protocol = parsed.protocol.toLowerCase();
        const host = parsed.hostname.toLowerCase();
        const blockedHosts = new Set([
            'instagram.com',
            'www.instagram.com',
            'facebook.com',
            'www.facebook.com',
            'x.com',
            'www.x.com',
            'twitter.com',
            'www.twitter.com'
        ]);

        if (!['http:', 'https:'].includes(protocol) || blockedHosts.has(host)) {
            return buildProductPlaceholderImage(name);
        }

        return image;
    } catch (error) {
        return buildProductPlaceholderImage(name);
    }
}

function validateProductPayload(payload) {
    const errors = [];
    const cleaned = {};

    cleaned.name = normalizeId(payload?.name);
    cleaned.price = Number(payload?.price || 0);
    cleaned.description = String(payload?.description || '').trim();
    cleaned.image = normalizeProductImage(cleaned.name, payload?.image);
    cleaned.stock = Number(payload?.stock || 0);
    cleaned.category = String(payload?.category || 'General').trim() || 'General';
    cleaned.colors = parseProductListValue(payload?.colors);
    cleaned.sizes = parseProductListValue(payload?.sizes);
    cleaned.rating = Number(payload?.rating || 0);
    cleaned.reviews = normalizeProductReviews(payload?.reviews);

    if (!cleaned.name) {
        errors.push('Product name is required.');
    }
    if (Number.isNaN(cleaned.price) || cleaned.price < 0) {
        errors.push('Product price must be a number greater than or equal to 0.');
    }
    if (Number.isNaN(cleaned.stock) || cleaned.stock < 0) {
        errors.push('Product stock must be 0 or higher.');
    }
    if (!Number.isInteger(cleaned.stock)) {
        errors.push('Product stock must be an integer.');
    }
    if (Number.isNaN(cleaned.rating) || cleaned.rating < 0 || cleaned.rating > 5) {
        errors.push('Product rating must be between 0 and 5.');
    }

    return { errors, cleaned };
}

app.post('/api/contact', async (req, res, next) => {
    try {
        const sourceIp = getClientIp(req);
        const limit = contactRateLimit(sourceIp);

        if (!limit.allowed) {
            if (limit.reason === 'cooldown') {
                return res.status(429).json({ message: 'Please wait a few seconds before sending another message.' });
            }
            return res.status(429).json({ message: 'Too many messages sent. Please try again later.' });
        }

        const { errors, cleaned } = validateContactPayload(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ message: errors[0] });
        }

        const savedMessage = await ContactMessage.create({
            ...cleaned,
            ipAddress: sourceIp,
            userAgent: req.get('user-agent') || ''
        });

        sendContactNotifications(savedMessage).catch((error) => {
            console.error('Contact email notification failed:', error);
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
        const { errors, cleaned } = validateProductPayload(req.body || {});
        if (errors.length > 0) {
            return res.status(400).json({ message: errors[0] });
        }

        const product = await Product.create(cleaned);

        res.status(201).json({ message: 'Product created.', product });
    } catch (error) {
        next(error);
    }
});

app.put('/api/products/:id', requireAdminApi, async (req, res, next) => {
    try {
        const productId = normalizeId(req.params.id);
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid product id.' });
        }

        const { errors, cleaned } = validateProductPayload(req.body || {});
        if (errors.length > 0) {
            return res.status(400).json({ message: errors[0] });
        }

        const update = cleaned;

        const product = await Product.findByIdAndUpdate(productId, update, { new: true, runValidators: true });
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
    if (!['momo', 'cod'].includes(method)) errors.push('Payment method must be MTN MoMo or cash on delivery.');
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
        momoNumber: '',
        momoName: ''
    };

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
        const sourceIp = getClientIp(req);
        const limit = orderRateLimit(sourceIp);
        if (!limit.allowed) {
            return res.status(429).json({ message: 'Too many orders submitted. Please wait a bit and try again.' });
        }

        const { errors, cleaned } = validateOrderPayload(req.body || {});
        if (errors.length > 0) {
            return res.status(400).json({ message: errors[0] });
        }

        const session = await mongoose.startSession();
        let saved;
        const normalizedItems = cleaned.items.map((item) => ({
            ...item,
            productId: normalizeId(item.productId)
        }));

        let useTransactionFlow = true;
        try {
            await session.withTransaction(async () => {
                const ids = [...new Set(normalizedItems.map((item) => item.productId).filter(Boolean))];

                if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
                    throw withStatusError('Order contains invalid product identifiers.', 400);
                }

                const dbProducts = await Product.find({ _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } })
                    .session(session)
                    .lean();

                const productMap = new Map(dbProducts.map((p) => [normalizeId(p._id), p]));

                for (const item of normalizedItems) {
                    const product = productMap.get(item.productId);
                    if (!product) {
                        throw withStatusError('One or more products are no longer available.', 404);
                    }
                    if (Number(product.stock || 0) < Number(item.quantity || 0)) {
                        throw withStatusError(`Insufficient stock for ${product.name}.`, 409);
                    }
                    const decrementResult = await Product.updateOne(
                        {
                            _id: new mongoose.Types.ObjectId(item.productId),
                            stock: { $gte: Number(item.quantity || 0) }
                        },
                        { $inc: { stock: -Number(item.quantity || 0) } },
                        { session }
                    );
                    if (decrementResult.modifiedCount !== 1) {
                        throw withStatusError('Stock changed before checkout. Please refresh and try again.', 409);
                    }
                }

                const created = await Order.create([{
                    ...cleaned,
                    status: 'pending'
                }], { session });
                saved = Array.isArray(created) ? created[0] : created;
            });
        } catch (txError) {
            useTransactionFlow = false;

            // Fallback for non-transactional MongoDB setups (common in single-node local dev)
            // Best effort rollback via compensation to avoid negative/inconsistent stock.
            if (txError?.errorLabels?.includes('TransientTransactionError') || txError?.errorLabels?.includes('UnknownTransactionCommitResult') || /Transaction.*not.*supported|not support.*transactions/i.test(String(txError?.message || ''))) {
                const decremented = [];
                for (const item of normalizedItems) {
                    const stockQty = Number(item.quantity || 0);
                    if (!item.productId || stockQty <= 0) continue;

                    const result = await Product.updateOne(
                        { _id: new mongoose.Types.ObjectId(item.productId), stock: { $gte: stockQty } },
                        { $inc: { stock: -stockQty } }
                    );
                    if (result.modifiedCount !== 1) {
                        for (const applied of decremented) {
                            await Product.updateOne(
                                { _id: new mongoose.Types.ObjectId(applied.productId) },
                                { $inc: { stock: applied.quantity } }
                            );
                        }
                        return next(withStatusError('Stock changed before checkout. Please refresh and try again.', 409));
                    }
                    decremented.push({ productId: item.productId, quantity: stockQty });
                }

                try {
                    const created = await Order.create({
                        ...cleaned,
                        status: 'pending'
                    });
                    saved = created;
                } catch (createError) {
                    for (const applied of decremented) {
                        await Product.updateOne(
                            { _id: new mongoose.Types.ObjectId(applied.productId) },
                            { $inc: { stock: applied.quantity } }
                        );
                    }
                    return next(createError);
                }
            } else {
                return next(txError);
            }
        } finally {
            try {
                await session.endSession();
            } catch (error) {
                // ignore session cleanup errors
            }
        }

        if (!saved || !saved._id) {
            if (useTransactionFlow) {
                throw withStatusError('Order could not be saved.', 500);
            }
            throw withStatusError('Order could not be saved.', 500);
        }

        res.status(201).json({
            message: cleaned.payment.method === 'momo'
                ? 'Order created. We will confirm your MTN MoMo payment before shipping.'
                : 'Order created. Cash on delivery has been recorded.',
            orderId: saved._id
        });

        sendOrderNotifications(saved).catch((error) => {
            console.error('Order email notification failed:', error);
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

app.get('/api/orders/:id/track', async (req, res, next) => {
    try {
        const orderId = normalizeId(req.params.id);
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: 'Invalid order id.' });
        }

        const order = await Order.findById(orderId)
            .select('_id createdAt status items summary')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        res.json({
            order: {
                _id: order._id,
                createdAt: order.createdAt,
                status: order.status,
                items: order.items,
                summary: order.summary
            }
        });
    } catch (error) {
        next(error);
    }
});

app.patch('/api/orders/:id/status', requireAdminApi, async (req, res, next) => {
    try {
        const status = String(req.body.status || '').trim();
        if (!['pending', 'paid', 'processing', 'shipped', 'delivered', 'failed'].includes(status)) {
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
        const sourceIp = getClientIp(req);
        const limit = stockAlertRateLimit(sourceIp);
        if (!limit.allowed) {
            return res.status(429).json({ message: 'Too many stock alert requests. Please try again later.' });
        }

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
    if (req.accepts('json')) {
        return res.status(404).json({ message: 'Route not found.' });
    }
    res.status(404).send('Page not found');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    const status = Number(err.status) || 500;
    console.error(err.stack || err);
    res.status(status).json({
        message: status === 500 ? 'Something went wrong!' : err.message
    });
});

// Start the server
const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

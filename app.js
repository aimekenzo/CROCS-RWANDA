// filepath: c:\Users\HP\OneDrive\Desktop\CROCS RWANDA\crocs-rwanda\app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const ContactMessage = require('./model/contactMessage');
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crocs-rwanda', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
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
app.use('/pages', express.static('pages'));
app.use('/images', express.static('images'));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/products', (req, res) => {
    const products = [
        { name: 'Classic Crocs', price: '$50' },
        { name: 'Crocs Sandals', price: '$40' },
    ];
    res.render('products', { products });
});

app.get('/about', (req, res) => {
    res.send('About Crocs Rwanda');
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

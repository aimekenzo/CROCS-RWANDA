const nodemailer = require('nodemailer');

function readEnv(name) {
    return String(process.env[name] || '').trim();
}

function isEmailConfigured() {
    return Boolean(
        readEnv('SMTP_HOST') &&
        readEnv('SMTP_PORT') &&
        readEnv('SMTP_USER') &&
        readEnv('SMTP_PASS') &&
        readEnv('EMAIL_FROM')
    );
}

function getEmailConfigStatus() {
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
    const missing = requiredVars.filter((name) => !readEnv(name));

    return {
        configured: missing.length === 0,
        missing
    };
}

let transporter;

function getTransporter() {
    if (!isEmailConfigured()) {
        return null;
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: readEnv('SMTP_HOST'),
            port: Number(readEnv('SMTP_PORT')),
            secure: readEnv('SMTP_SECURE') === 'true',
            auth: {
                user: readEnv('SMTP_USER'),
                pass: readEnv('SMTP_PASS')
            }
        });
    }

    return transporter;
}

async function sendMail(options) {
    const client = getTransporter();
    if (!client) {
        return { skipped: true };
    }

    return client.sendMail({
        from: readEnv('EMAIL_FROM'),
        ...options
    });
}

async function verifyEmailTransport() {
    const status = getEmailConfigStatus();
    if (!status.configured) {
        return {
            ok: false,
            skipped: true,
            missing: status.missing
        };
    }

    try {
        const client = getTransporter();
        await client.verify();
        return { ok: true };
    } catch (error) {
        return {
            ok: false,
            skipped: false,
            error: error?.message || 'SMTP verification failed.'
        };
    }
}

function money(value) {
    return `$${(Number(value) || 0).toFixed(2)}`;
}

async function sendOrderNotifications(order) {
    const adminEmail = readEnv('ADMIN_ALERT_EMAIL') || readEnv('EMAIL_FROM');
    const items = Array.isArray(order.items) ? order.items : [];
    const itemLines = items.map((item) => `${item.quantity}x ${item.name}`).join(', ') || 'No items';
    const paymentLabel = order.payment?.method === 'momo' ? 'MTN MoMo Transfer' : 'Cash on Delivery';
    const customerMessage = order.payment?.method === 'momo'
        ? 'We will confirm your MTN MoMo payment before shipping.'
        : 'Cash on delivery has been recorded for your order.';

    const tasks = [
        sendMail({
            to: order.customer.email,
            subject: `Crocs Rwanda order confirmation #${order._id}`,
            text: [
                `Hello ${order.customer.fullName},`,
                '',
                `Your order has been received.`,
                `Order ID: ${order._id}`,
                `Items: ${itemLines}`,
                `Payment: ${paymentLabel}`,
                `Total: ${money(order.summary?.total)}`,
                '',
                customerMessage
            ].join('\n')
        })
    ];

    if (adminEmail) {
        tasks.push(
            sendMail({
                to: adminEmail,
                subject: `New order received #${order._id}`,
                text: [
                    `A new order has been placed.`,
                    `Order ID: ${order._id}`,
                    `Customer: ${order.customer.fullName} (${order.customer.email})`,
                    `Phone: ${order.customer.phone}`,
                    `Payment: ${paymentLabel}`,
                    `Items: ${itemLines}`,
                    `Total: ${money(order.summary?.total)}`
                ].join('\n')
            })
        );
    }

    return Promise.allSettled(tasks);
}

async function sendContactNotifications(message) {
    const adminEmail = readEnv('ADMIN_ALERT_EMAIL') || readEnv('EMAIL_FROM');
    const tasks = [
        sendMail({
            to: message.email,
            subject: 'We received your message - Crocs Rwanda',
            text: [
                `Hello ${message.name},`,
                '',
                'We received your message and will reply soon.',
                `Subject: ${message.subject}`
            ].join('\n')
        })
    ];

    if (adminEmail) {
        tasks.push(
            sendMail({
                to: adminEmail,
                subject: `New contact message: ${message.subject}`,
                text: [
                    `From: ${message.name} (${message.email})`,
                    `Subject: ${message.subject}`,
                    '',
                    message.message
                ].join('\n')
            })
        );
    }

    return Promise.allSettled(tasks);
}

module.exports = {
    getEmailConfigStatus,
    isEmailConfigured,
    sendContactNotifications,
    sendOrderNotifications,
    verifyEmailTransport
};

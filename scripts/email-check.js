require('dotenv').config();

const { getEmailConfigStatus, verifyEmailTransport } = require('../services/email');

async function main() {
    const status = getEmailConfigStatus();

    if (!status.configured) {
        console.error('Email check failed: missing required SMTP configuration.');
        status.missing.forEach((name) => console.error(`- Missing ${name}`));
        process.exitCode = 1;
        return;
    }

    const result = await verifyEmailTransport();
    if (!result.ok) {
        console.error(`Email transport verification failed: ${result.error || 'Unknown error'}`);
        process.exitCode = 1;
        return;
    }

    console.log('Email transport verified successfully.');
}

main().catch((error) => {
    console.error(`Email check failed: ${error.message}`);
    process.exitCode = 1;
});

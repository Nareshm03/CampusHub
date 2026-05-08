const nodemailer = require('nodemailer');

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_PORT === '465',
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });

/**
 * Validates that SMTP env vars are set and not placeholders.
 * Throws a descriptive error so misconfiguration is caught at call-time
 * rather than producing a cryptic nodemailer auth failure.
 */
const assertSmtpConfigured = () => {
  const { SMTP_USER, SMTP_PASS, SMTP_HOST } = process.env;
  const placeholders = ['your-email@gmail.com', 'your-app-password', 'your-gmail-app-password'];

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
  }
  if (placeholders.includes(SMTP_USER) || placeholders.includes(SMTP_PASS)) {
    throw new Error(
      'SMTP credentials are still placeholders. ' +
      'Set a real Gmail address as SMTP_USER and a Gmail App Password as SMTP_PASS. ' +
      'Generate an App Password at: https://myaccount.google.com/apppasswords'
    );
  }
};

/**
 * Verify SMTP connection — call once at server startup to surface
 * misconfiguration immediately rather than at first email send.
 */
const verifySmtpConnection = async () => {
  try {
    assertSmtpConfigured();
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
  } catch (err) {
    console.error('❌ SMTP configuration error:', err.message);
    console.error('   Emails will not be sent until SMTP is correctly configured.');
  }
};

/**
 * Send an email.
 * @param {object} options
 * @param {string}  options.email    - Recipient address
 * @param {string}  options.subject  - Subject line
 * @param {string}  [options.message] - Plain-text fallback
 * @param {string}  [options.html]   - HTML body (preferred)
 */
const sendEmail = async (options) => {
  assertSmtpConfigured();
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `${process.env.FROM_NAME || 'CampusHub'} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message || '',
    html: options.html || undefined
  });
};

module.exports = { sendEmail, verifySmtpConnection };

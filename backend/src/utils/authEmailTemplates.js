const BRAND_COLOR = '#4F46E5';
const BRAND_NAME = process.env.FROM_NAME || 'CampusHub';

const baseLayout = (title, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${BRAND_COLOR};padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;">${BRAND_NAME}</h1>
          </td>
        </tr>
        <tr><td style="padding:32px;">${bodyHtml}</td></tr>
        <tr>
          <td style="background:#f4f4f5;padding:16px 32px;text-align:center;font-size:12px;color:#6b7280;">
            This link expires in <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.<br/>
            &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const passwordResetTemplate = ({ name, resetUrl }) =>
  baseLayout('Reset Your Password', `
    <h2 style="color:#111827;margin-top:0;">Reset Your Password 🔐</h2>
    <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
    <p style="color:#374151;">We received a request to reset the password for your ${BRAND_NAME} account. Click the button below to choose a new password:</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}"
         style="background:${BRAND_COLOR};color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
        Reset Password
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;">Or copy and paste this URL into your browser:</p>
    <p style="color:#4F46E5;font-size:13px;word-break:break-all;">${resetUrl}</p>
    <p style="color:#374151;margin-bottom:0;">This link will expire in <strong>10 minutes</strong>.</p>
  `);

const emailVerificationTemplate = ({ name, verifyUrl }) =>
  baseLayout('Verify Your Email', `
    <h2 style="color:#111827;margin-top:0;">Verify Your Email Address ✉️</h2>
    <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
    <p style="color:#374151;">Welcome to ${BRAND_NAME}! Please verify your email address to activate your account:</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}"
         style="background:#059669;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
        Verify Email
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;">Or copy and paste this URL into your browser:</p>
    <p style="color:#059669;font-size:13px;word-break:break-all;">${verifyUrl}</p>
    <p style="color:#374151;margin-bottom:0;">This link will expire in <strong>24 hours</strong>.</p>
  `);

module.exports = { passwordResetTemplate, emailVerificationTemplate };

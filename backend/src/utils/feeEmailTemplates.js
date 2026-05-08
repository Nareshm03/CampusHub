/**
 * Fee-related email HTML templates.
 * All monetary values are passed pre-formatted (e.g. "₹12,500.00").
 */

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
        <!-- Header -->
        <tr>
          <td style="background:${BRAND_COLOR};padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;">${BRAND_NAME}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${bodyHtml}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f5;padding:16px 32px;text-align:center;font-size:12px;color:#6b7280;">
            This is an automated message from ${BRAND_NAME}. Please do not reply.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

/**
 * Payment success confirmation sent to student.
 */
const paymentSuccessTemplate = ({ studentName, amount, receiptNumber, feeTitle, transactionId, paymentDate }) =>
  baseLayout('Payment Confirmation', `
    <h2 style="color:#111827;margin-top:0;">Payment Confirmed ✅</h2>
    <p style="color:#374151;">Dear <strong>${studentName}</strong>,</p>
    <p style="color:#374151;">Your payment has been successfully processed. Here are your payment details:</p>
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
      <tr style="background:#f9fafb;">
        <td style="border:1px solid #e5e7eb;color:#6b7280;width:40%;">Fee Description</td>
        <td style="border:1px solid #e5e7eb;color:#111827;font-weight:bold;">${feeTitle}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e5e7eb;color:#6b7280;">Amount Paid</td>
        <td style="border:1px solid #e5e7eb;color:#059669;font-weight:bold;font-size:18px;">${amount}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="border:1px solid #e5e7eb;color:#6b7280;">Receipt Number</td>
        <td style="border:1px solid #e5e7eb;color:#111827;font-family:monospace;">${receiptNumber}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e5e7eb;color:#6b7280;">Transaction ID</td>
        <td style="border:1px solid #e5e7eb;color:#111827;font-family:monospace;">${transactionId}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="border:1px solid #e5e7eb;color:#6b7280;">Payment Date</td>
        <td style="border:1px solid #e5e7eb;color:#111827;">${paymentDate}</td>
      </tr>
    </table>
    <p style="color:#374151;">Please keep this receipt for your records. You can also view your payment history in the student portal.</p>
    <p style="color:#374151;margin-bottom:0;">Thank you,<br/><strong>${BRAND_NAME} Finance Team</strong></p>
  `);

/**
 * Fee creation notice sent to student when admin creates a fee record.
 */
const feeCreatedTemplate = ({ studentName, feeTitle, totalAmount, dueDate, semester, academicYear }) =>
  baseLayout('New Fee Notice', `
    <h2 style="color:#111827;margin-top:0;">New Fee Notice 📋</h2>
    <p style="color:#374151;">Dear <strong>${studentName}</strong>,</p>
    <p style="color:#374151;">A new fee has been added to your account. Please review the details below:</p>
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
      <tr style="background:#f9fafb;">
        <td style="border:1px solid #e5e7eb;color:#6b7280;width:40%;">Fee Description</td>
        <td style="border:1px solid #e5e7eb;color:#111827;font-weight:bold;">${feeTitle}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e5e7eb;color:#6b7280;">Semester</td>
        <td style="border:1px solid #e5e7eb;color:#111827;">${semester}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="border:1px solid #e5e7eb;color:#6b7280;">Academic Year</td>
        <td style="border:1px solid #e5e7eb;color:#111827;">${academicYear}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e5e7eb;color:#6b7280;">Total Amount Due</td>
        <td style="border:1px solid #e5e7eb;color:#dc2626;font-weight:bold;font-size:18px;">${totalAmount}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="border:1px solid #e5e7eb;color:#6b7280;">Due Date</td>
        <td style="border:1px solid #e5e7eb;color:#b45309;font-weight:bold;">${dueDate}</td>
      </tr>
    </table>
    <p style="color:#374151;">Please log in to the student portal to make your payment before the due date to avoid late fees.</p>
    <p style="color:#374151;margin-bottom:0;">Thank you,<br/><strong>${BRAND_NAME} Finance Team</strong></p>
  `);

/**
 * Payment due reminder.
 */
const paymentReminderTemplate = ({ studentName, feeTitle, balanceAmount, dueDate }) =>
  baseLayout('Payment Reminder', `
    <h2 style="color:#b45309;margin-top:0;">Payment Reminder ⚠️</h2>
    <p style="color:#374151;">Dear <strong>${studentName}</strong>,</p>
    <p style="color:#374151;">This is a reminder that you have an outstanding fee balance:</p>
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
      <tr style="background:#fef3c7;">
        <td style="border:1px solid #fde68a;color:#92400e;width:40%;">Fee Description</td>
        <td style="border:1px solid #fde68a;color:#92400e;font-weight:bold;">${feeTitle}</td>
      </tr>
      <tr>
        <td style="border:1px solid #fde68a;color:#92400e;">Balance Due</td>
        <td style="border:1px solid #fde68a;color:#dc2626;font-weight:bold;font-size:18px;">${balanceAmount}</td>
      </tr>
      <tr style="background:#fef3c7;">
        <td style="border:1px solid #fde68a;color:#92400e;">Due Date</td>
        <td style="border:1px solid #fde68a;color:#b45309;font-weight:bold;">${dueDate}</td>
      </tr>
    </table>
    <p style="color:#374151;">Please log in to the student portal to complete your payment.</p>
    <p style="color:#374151;margin-bottom:0;">Thank you,<br/><strong>${BRAND_NAME} Finance Team</strong></p>
  `);

module.exports = { paymentSuccessTemplate, feeCreatedTemplate, paymentReminderTemplate };

const Stripe = require('stripe');
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const User = require('../models/User');
const { sendEmail } = require('../utils/sendEmail');
const { paymentSuccessTemplate, feeCreatedTemplate, paymentReminderTemplate } = require('../utils/feeEmailTemplates');

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Currency used throughout the application
const CURRENCY = process.env.FEE_CURRENCY || 'inr';
const CURRENCY_SYMBOL = process.env.FEE_CURRENCY_SYMBOL || '₹';

/** Format an amount for display, e.g. 12500 → "₹12,500.00" */
const formatAmount = (amount) =>
  `${CURRENCY_SYMBOL}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Resolve the Student document for the authenticated user.
 * The JWT payload contains the User._id (req.user._id / req.user.id).
 * Fee records reference Student._id, not User._id — so we must look up
 * the Student by its userId field.
 */
const resolveStudentFromUser = async (userId) => {
  const student = await Student.findOne({ userId }).populate('userId', 'name email');
  return student;
};

// ─── Admin: Create fee record ────────────────────────────────────────────────

// @route   POST /api/fees
// @access  Private/Admin
const createFee = async (req, res, next) => {
  try {
    const { student, semester, academicYear } = req.body;

    const studentDoc = await Student.findById(student);
    if (!studentDoc) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const duplicate = await Fee.findOne({ student, semester, academicYear });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: 'A fee record already exists for this student, semester and academic year'
      });
    }

    const fee = await Fee.create(req.body);
    const populatedFee = await Fee.findById(fee._id)
      .populate({
        path: 'student',
        populate: { path: 'userId', select: 'name email' }
      });

    // Notify student by email
    const studentUser = populatedFee.student?.userId;
    if (studentUser?.email) {
      const dueDate = new Date(fee.dueDate).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
      try {
        await sendEmail({
          email: studentUser.email,
          subject: `Fee Notice – ${fee.academicYear} Semester ${fee.semester}`,
          html: feeCreatedTemplate({
            studentName: studentUser.name,
            feeTitle: `Semester ${fee.semester} Fees`,
            totalAmount: formatAmount(fee.totalAmount),
            dueDate,
            semester: fee.semester,
            academicYear: fee.academicYear
          })
        });
      } catch (emailErr) {
        console.error('Fee creation email failed:', emailErr.message);
      }
    }

    res.status(201).json({ success: true, data: populatedFee });
  } catch (error) {
    next(error);
  }
};

// ─── Get student fees ────────────────────────────────────────────────────────

// @route   GET /api/fees/student/:studentId
// @access  Private/AdminOwnerParent (ADMIN, the student themselves, or a linked parent)
const getStudentFees = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    if (req.user.role !== 'ADMIN') {
      const ownProfile = await Student.findOne({ userId: req.user.id }).select('_id');
      const isOwner = ownProfile && ownProfile._id.toString() === studentId;
      const isLinkedParent =
        req.user.role === 'PARENT' &&
        req.user.linkedStudentId &&
        req.user.linkedStudentId.toString() === studentId;
      if (!isOwner && !isLinkedParent) {
        return res.status(403).json({ success: false, error: 'Access denied to these fee records' });
      }
    }

    const fees = await Fee.find({ student: req.params.studentId })
      .sort({ semester: -1, academicYear: -1 });

    res.status(200).json({ success: true, data: fees });
  } catch (error) {
    next(error);
  }
};

// ─── Get my fees (student self-service) ─────────────────────────────────────

// @route   GET /api/fees/my
// @access  Private/Student
const getMyFees = async (req, res, next) => {
  try {
    // req.user.id is the User._id from the JWT — resolve to Student._id
    const student = await resolveStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    const fees = await Fee.find({ student: student._id })
      .sort({ semester: -1, academicYear: -1 });

    res.status(200).json({ success: true, studentId: student._id, data: fees });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Record manual payment ───────────────────────────────────────────

// @route   POST /api/fees/:feeId/payment
// @access  Private/Admin
const recordPayment = async (req, res, next) => {
  try {
    const { amount, paymentMethod, transactionId } = req.body;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
    }

    const fee = await Fee.findById(req.params.feeId).populate({
      path: 'student',
      populate: { path: 'userId', select: 'name email' }
    });
    if (!fee) return res.status(404).json({ success: false, error: 'Fee record not found' });

    const balance = fee.totalAmount - (fee.paidAmount || 0);
    if (balance <= 0) {
      return res.status(400).json({ success: false, error: 'Fee is already fully paid' });
    }
    if (numericAmount - balance > 0.01) {
      return res.status(400).json({ success: false, error: `Amount exceeds outstanding balance of ${formatAmount(balance)}` });
    }

    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    fee.payments.push({
      amount: numericAmount,
      paymentDate: new Date(),
      paymentMethod,
      transactionId,
      receiptNumber
    });
    fee.paidAmount = (fee.paidAmount || 0) + numericAmount;
    await fee.save();

    // Email notification
    const studentUser = fee.student?.userId;
    if (studentUser?.email) {
      try {
        await sendEmail({
          email: studentUser.email,
          subject: `Payment Confirmed – Receipt ${receiptNumber}`,
          html: paymentSuccessTemplate({
            studentName: studentUser.name,
            amount: formatAmount(amount),
            receiptNumber,
            feeTitle: `Semester ${fee.semester} Fees`,
            transactionId: transactionId || receiptNumber,
            paymentDate: new Date().toLocaleDateString('en-IN', {
              day: '2-digit', month: 'long', year: 'numeric'
            })
          })
        });
      } catch (emailErr) {
        console.error('Payment confirmation email failed:', emailErr.message);
      }
    }

    res.status(200).json({ success: true, data: fee, receiptNumber });
  } catch (error) {
    next(error);
  }
};

// ─── Fee summary ─────────────────────────────────────────────────────────────

// @route   GET /api/fees/summary
// @access  Private/Admin
const getFeeSummary = async (req, res, next) => {
  try {
    const summary = await Fee.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' }
        }
      }
    ]);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

// ─── Stripe: Create Payment Intent ──────────────────────────────────────────

// @route   POST /api/fees/:feeId/create-payment-intent
// @access  Private
const createPaymentIntent = async (req, res, next) => {
  try {
    // Ownership and balance are enforced before any payment-mode branch so
    // mock responses can never leak across students or roles.
    const fee = await Fee.findById(req.params.feeId).populate({
      path: 'student',
      populate: { path: 'userId', select: 'name email' }
    });
    if (!fee) return res.status(404).json({ success: false, error: 'Fee not found' });

    if (req.user.role !== 'ADMIN') {
      const ownProfile = await Student.findOne({ userId: req.user.id }).select('_id');
      if (!ownProfile || fee.student._id.toString() !== ownProfile._id.toString()) {
        return res.status(403).json({ success: false, error: 'Access denied to this fee record' });
      }
    }

    const balance = fee.totalAmount - (fee.paidAmount || 0);
    if (balance <= 0) {
      return res.status(400).json({ success: false, error: 'Fee is already fully paid' });
    }

    if (!stripe || process.env.ENABLE_MOCK_PAYMENTS === 'true') {
      return res.status(200).json({
        success: true,
        mock: true,
        message: 'Mock payment mode enabled',
        clientSecret: 'mock_client_secret',
        paymentIntentId: 'mock_pi_' + Date.now()
      });
    }

    // Stripe amounts are in the smallest currency unit (paise for INR)
    const amountInSmallestUnit = Math.round(balance * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: CURRENCY,
      metadata: {
        feeId: fee._id.toString(),
        studentId: fee.student._id.toString(),
        userId: req.user.id,
        semester: fee.semester.toString(),
        academicYear: fee.academicYear
      },
      description: `CampusHub – Semester ${fee.semester} Fee (${fee.academicYear})`,
      receipt_email: fee.student?.userId?.email || undefined
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: balance,
      amountFormatted: formatAmount(balance),
      currency: CURRENCY
    });
  } catch (error) {
    next(error);
  }
};

// ─── Stripe: Webhook handler ─────────────────────────────────────────────────

// @route   POST /api/fees/webhook
// @access  Public (Stripe-signed)
const stripeWebhook = async (req, res) => {
  if (!stripe || process.env.ENABLE_MOCK_PAYMENTS === 'true') {
    return res.json({ received: true, mock: true });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,                              // raw body (must use express.raw())
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const { feeId } = intent.metadata;

    try {
      const fee = await Fee.findById(feeId).populate({
        path: 'student',
        populate: { path: 'userId', select: 'name email' }
      });

      if (fee) {
        // Idempotency: repeated delivery of the same Stripe event must not
        // duplicate the payment or double-credit the balance.
        const alreadyRecorded = (fee.payments || []).some((p) => p.transactionId === intent.id);
        if (alreadyRecorded) {
          return res.json({ received: true, duplicate: true });
        }

        const paidAmount = intent.amount_received / 100;
        const receiptNumber = `RCP-STR-${intent.id.slice(-8).toUpperCase()}`;

        fee.payments.push({
          amount: paidAmount,
          paymentDate: new Date(),
          paymentMethod: 'CARD',
          transactionId: intent.id,
          receiptNumber
        });
        fee.paidAmount = (fee.paidAmount || 0) + paidAmount;
        await fee.save();

        // Send confirmation email
        const studentUser = fee.student?.userId;
        if (studentUser?.email) {
          try {
            await sendEmail({
              email: studentUser.email,
              subject: `Payment Confirmed – Receipt ${receiptNumber}`,
              html: paymentSuccessTemplate({
                studentName: studentUser.name,
                amount: formatAmount(paidAmount),
                receiptNumber,
                feeTitle: `Semester ${fee.semester} Fees`,
                transactionId: intent.id,
                paymentDate: new Date().toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'long', year: 'numeric'
                })
              })
            });
          } catch (emailErr) {
            console.error('Stripe webhook email failed:', emailErr.message);
          }
        }
      }
    } catch (dbErr) {
      console.error('Stripe webhook DB update failed:', dbErr.message);
    }
  }

  res.json({ received: true });
};

// ─── Send payment reminder ───────────────────────────────────────────────────

// @route   POST /api/fees/:feeId/remind
// @access  Private/Admin
const sendPaymentReminder = async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.feeId).populate({
      path: 'student',
      populate: { path: 'userId', select: 'name email' }
    });
    if (!fee) return res.status(404).json({ success: false, error: 'Fee not found' });

    const studentUser = fee.student?.userId;
    if (!studentUser?.email) {
      return res.status(400).json({ success: false, error: 'Student email not found' });
    }

    const balance = fee.totalAmount - (fee.paidAmount || 0);
    const dueDate = new Date(fee.dueDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    await sendEmail({
      email: studentUser.email,
      subject: `Payment Reminder – Semester ${fee.semester} Fee Due`,
      html: paymentReminderTemplate({
        studentName: studentUser.name,
        feeTitle: `Semester ${fee.semester} Fees`,
        balanceAmount: formatAmount(balance),
        dueDate
      })
    });

    res.status(200).json({ success: true, message: 'Reminder sent successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: List / update / delete fee records ─────────────────────────────────

// @route   GET /api/fees
// @access  Private/Admin
const listFees = async (req, res, next) => {
  try {
    const { status, semester, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (semester) filter.semester = parseInt(semester);

    const skip = (page - 1) * limit;
    const [fees, total] = await Promise.all([
      Fee.find(filter)
        .populate({ path: 'student', populate: { path: 'userId', select: 'name email' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Fee.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: fees.length,
      total,
      data: fees
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/fees/:feeId
// @access  Private/Admin
const updateFee = async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.feeId);
    if (!fee) return res.status(404).json({ success: false, error: 'Fee record not found' });

    const allowed = ['dueDate', 'tuitionFee', 'examFee', 'libraryFee', 'labFee', 'otherFees', 'academicYear', 'semester'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) fee[field] = req.body[field];
    });

    const newTotal =
      (fee.tuitionFee || 0) + (fee.examFee || 0) + (fee.libraryFee || 0) +
      (fee.labFee || 0) + (fee.otherFees || 0);
    if ((fee.paidAmount || 0) - newTotal > 0.01) {
      return res.status(400).json({ success: false, error: 'New total cannot be less than the amount already paid' });
    }

    await fee.save();
    res.status(200).json({ success: true, data: fee });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/fees/:feeId
// @access  Private/Admin
const deleteFee = async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.feeId);
    if (!fee) return res.status(404).json({ success: false, error: 'Fee record not found' });
    if ((fee.payments || []).length > 0 || (fee.paidAmount || 0) > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete a fee record with payments' });
    }
    await fee.deleteOne();
    res.status(200).json({ success: true, message: 'Fee record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFee,
  listFees,
  updateFee,
  deleteFee,
  getStudentFees,
  getMyFees,
  recordPayment,
  getFeeSummary,
  createPaymentIntent,
  stripeWebhook,
  sendPaymentReminder
};

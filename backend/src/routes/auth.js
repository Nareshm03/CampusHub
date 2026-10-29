const express = require('express');
const { register, login, getMe, forgotPassword, resetPassword, verifyEmail, resendVerification, changePassword, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, userValidation } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, userValidation.register, validate, register);
router.post('/login', authLimiter, userValidation.login, validate, login);
router.post('/resend-verification', authLimiter, resendVerification);
router.get('/me', protect, getMe);
router.put('/changepassword', protect, changePassword);
router.post('/forgotpassword', authLimiter, forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/verifyemail/:token', verifyEmail);
router.get('/logout', protect, logout);

module.exports = router;

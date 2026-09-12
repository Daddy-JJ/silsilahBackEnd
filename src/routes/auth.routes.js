const express = require('express');
const rateLimit = require('express-rate-limit');
const { validateBody } = require('../middlewares/validate.middleware');
const { registerSchema, loginSchema } = require('../validations');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 15 : 500, // Lebih longgar di dev
  message: {
    success: false,
    message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

function createAuthRoutes({ authController, authMiddleware }) {
  const router = express.Router();

  router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
  router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
  router.post('/google', authLimiter, authController.googleLogin);
  router.post('/forgot-password', authLimiter, authController.forgotPassword);
  router.post('/reset-password', authLimiter, authController.resetPassword);

  // Protected routes (memerlukan token login)
  router.get('/me', authMiddleware, authController.getMe);
  router.put('/profile', authMiddleware, authController.updateProfile);
  router.put('/change-password', authMiddleware, authController.changePassword);
  router.get('/my-invitations', authMiddleware, authController.getMyInvitations);

  return router;
}

module.exports = createAuthRoutes;

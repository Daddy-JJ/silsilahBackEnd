const express = require('express');
const rateLimit = require('express-rate-limit');
const { validateBody } = require('../middlewares/validate.middleware');
const { registerSchema, loginSchema } = require('../validations');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per `window` (here, per 15 minutes)
  message: {
    success: false,
    message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi setelah 15 menit',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

function createAuthRoutes({ authController, authMiddleware }) {
  const router = express.Router();

  router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
  router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
  router.post('/google', authLimiter, authController.googleLogin);
  router.get('/me', authMiddleware, authController.getMe);

  return router;
}

module.exports = createAuthRoutes;

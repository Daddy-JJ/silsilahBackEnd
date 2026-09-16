const express = require('express');
const { validateBody } = require('../middlewares/validate.middleware');
const { feedbackSchema } = require('../validations');

function createFeedbackRoutes({ feedbackController, authMiddleware }) {
  const router = express.Router();

  // POST /api/v1/feedback — Terproteksi authMiddleware
  router.post(
    '/',
    authMiddleware,
    validateBody(feedbackSchema),
    feedbackController.submitFeedback
  );

  return router;
}

module.exports = createFeedbackRoutes;

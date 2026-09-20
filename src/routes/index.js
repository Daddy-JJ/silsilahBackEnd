const express = require('express');
const createAuthRoutes = require('./auth.routes');
const createTreeRoutes = require('./tree.routes');
const createFamilyMemberRoutes = require('./familyMember.routes');
const createApprovalRoutes = require('./approval.routes');
const createMarriageRoutes = require('./marriage.routes');
const createAdminRoutes = require('./admin.routes');
const createPaymentRoutes = require('./payment.routes');
const createFeedbackRoutes = require('./feedback.routes');
const { getFrontendUrl } = require('../utils/urlHelper');

function createApiRouter(container) {
  const router = express.Router();

  // Root /api/v1 endpoint
  router.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Silsilah Keluarga API v1 Service is active',
      version: '1.0.0',
      health: `${req.baseUrl}/health`,
      frontendUrl: getFrontendUrl(),
    });
  });

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Silsilah Keluarga Backend Service is healthy',
      frontendUrl: getFrontendUrl(),
      timestamp: new Date().toISOString(),
    });
  });

  // SMTP Diagnostic & Handshake test endpoint: /api/v1/health/smtp (?send_to=your@email.com)
  router.get('/health/smtp', async (req, res) => {
    try {
      const { send_to } = req.query;
      const verifyResult = await container.emailService.verifyConnection();

      if (!verifyResult.success) {
        return res.status(500).json(verifyResult);
      }

      // Jika user menambahkan ?send_to=email@gmail.com, kirim email uji coba nyata
      if (send_to) {
        const sendResult = await container.emailService.sendTestEmail(send_to);
        return res.status(200).json({
          ...verifyResult,
          testEmail: {
            delivered: true,
            recipient: send_to,
            messageId: sendResult.messageId,
          },
        });
      }

      return res.status(200).json(verifyResult);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: `Error saat pengujian SMTP: ${err.message}`,
        error: err.message,
      });
    }
  });

  // Feedback routes: /api/v1/feedback
  router.use('/feedback', createFeedbackRoutes(container));

  // Admin routes: /api/v1/admin
  router.use('/admin', createAdminRoutes(container));

  // Payment & Monetization routes: /api/v1/payments
  router.use('/payments', createPaymentRoutes(container));

  // Auth routes: /api/v1/auth
  router.use('/auth', createAuthRoutes(container));

  // Tree routes: /api/v1/trees
  router.use('/trees', createTreeRoutes(container));

  // Family Member routes: /api/v1/trees/:treeId/members & canvas
  router.use('/trees', createFamilyMemberRoutes(container));

  // Approvals & Handover routes: /api/v1/trees/:treeId/approvals
  router.use('/trees', createApprovalRoutes(container));

  // Marriage routes: /api/v1/trees/:treeId/marriages
  router.use('/trees', createMarriageRoutes(container));

  return router;
}

module.exports = createApiRouter;

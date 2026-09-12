const express = require('express');
const createAuthRoutes = require('./auth.routes');
const createTreeRoutes = require('./tree.routes');
const createFamilyMemberRoutes = require('./familyMember.routes');
const createApprovalRoutes = require('./approval.routes');
const createMarriageRoutes = require('./marriage.routes');
const createAdminRoutes = require('./admin.routes');
const createPaymentRoutes = require('./payment.routes');

function createApiRouter(container) {
  const router = express.Router();

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Silsilah Keluarga Backend Service is healthy',
      timestamp: new Date().toISOString(),
    });
  });

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

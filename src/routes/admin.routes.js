const express = require('express');
const { validateBody } = require('../middlewares/validate.middleware');
const {
  createUpgradePlanSchema,
  updateUpgradePlanSchema,
  updateSettingsSchema,
} = require('../validations');

function createAdminRoutes(container) {
  const { adminController, authMiddleware } = container;
  const router = express.Router();

  // Middleware proteksi khusus SUPER_ADMIN
  router.use((req, res, next) => {
    authMiddleware(req, res, () => {
      if (req.user && req.user.system_role === 'SUPER_ADMIN') {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Forbidden: Super Admin only' });
      }
    });
  });

  // 1. Dashboard Statistik
  router.get('/stats', adminController.getStats);

  // 2. CRUD Paket Upgrade
  router.get('/plans', adminController.getPlans);
  router.get('/plans/:id', adminController.getPlanById);
  router.post('/plans', validateBody(createUpgradePlanSchema), adminController.createPlan);
  router.put('/plans/:id', validateBody(updateUpgradePlanSchema), adminController.updatePlan);
  router.delete('/plans/:id', adminController.deletePlan);

  // 3. Pengaturan Sistem & Kredensial Gateway (Duitku)
  router.get('/settings', adminController.getSettings);
  router.put('/settings', validateBody(updateSettingsSchema), adminController.updateSettings);

  // 4. Riwayat Transaksi Platform
  router.get('/transactions', adminController.getTransactions);

  return router;
}

module.exports = createAdminRoutes;

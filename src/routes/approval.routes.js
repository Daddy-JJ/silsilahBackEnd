const express = require('express');
const { validateBody } = require('../middlewares/validate.middleware');
const {
  proposeApprovalSchema,
  resolveApprovalSchema,
} = require('../validations');

function createApprovalRoutes({
  approvalController,
  authMiddleware,
  requireTreeRole,
}) {
  const router = express.Router();

  // Ajukan usulan perubahan (Handover proposal oleh ADMIN_UTAMA atau KONTRIBUTOR)
  router.post(
    '/:treeId/approvals',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA', 'KONTRIBUTOR']),
    validateBody(proposeApprovalSchema),
    approvalController.propose
  );

  // Ambil daftar usulan perubahan per pohon
  router.get(
    '/:treeId/approvals',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA', 'KONTRIBUTOR']),
    approvalController.getApprovals
  );

  // Ambil detail usulan perubahan
  router.get(
    '/:treeId/approvals/:approvalId',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA', 'KONTRIBUTOR']),
    approvalController.getApprovalById
  );

  // Setujui atau Tolak usulan perubahan (Hanya ADMIN_UTAMA)
  // Dibungkus dalam Transaksi Basis Data & Optimistic Locking check
  router.post(
    '/:treeId/approvals/:approvalId/resolve',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA']),
    validateBody(resolveApprovalSchema),
    approvalController.resolve
  );

  // Batalkan/hapus usulan perubahan (Hanya ADMIN_UTAMA atau pembuat usulan)
  router.delete(
    '/:treeId/approvals/:approvalId',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA', 'KONTRIBUTOR']),
    approvalController.deleteApproval
  );

  return router;
}

module.exports = createApprovalRoutes;

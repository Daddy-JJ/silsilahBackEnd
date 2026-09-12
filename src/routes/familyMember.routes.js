const express = require('express');
const { validateBody } = require('../middlewares/validate.middleware');
const {
  addFamilyMemberSchema,
  updateFamilyMemberDirectSchema,
} = require('../validations');

function createFamilyMemberRoutes({
  familyMemberController,
  authMiddleware,
  requireTreeRole,
}) {
  const router = express.Router();

  // Ambil seluruh data anggota keluarga dalam format array
  router.get(
    '/:treeId/members',
    authMiddleware,
    requireTreeRole(),
    familyMemberController.getMembers
  );

  // Ambil data visualisasi pohon terformat untuk React Flow { nodes, edges }
  router.get(
    '/:treeId/canvas',
    authMiddleware,
    requireTreeRole(),
    familyMemberController.getCanvas
  );

  // Ambil detail satu anggota keluarga
  router.get(
    '/:treeId/members/:memberId',
    authMiddleware,
    requireTreeRole(),
    familyMemberController.getMemberById
  );

  // Tambah anggota keluarga baru (ADMIN_UTAMA atau KONTRIBUTOR)
  // Dibungkus dalam Transaksi Basis Data & validasi Hard Limit 50 nodes & Anti-Cycle DAG
  router.post(
    '/:treeId/members',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA', 'KONTRIBUTOR']),
    validateBody(addFamilyMemberSchema),
    familyMemberController.addMember
  );

  // Pembaruan data langsung oleh ADMIN_UTAMA (dengan Optimistic Locking version check)
  router.put(
    '/:treeId/members/:memberId',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA']),
    validateBody(updateFamilyMemberDirectSchema),
    familyMemberController.updateMemberDirect
  );

  // Hapus anggota keluarga (Hanya ADMIN_UTAMA)
  router.delete(
    '/:treeId/members/:memberId',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA']),
    familyMemberController.deleteMember
  );

  return router;
}

module.exports = createFamilyMemberRoutes;

const express = require('express');
const { validateBody } = require('../middlewares/validate.middleware');
const { createTreeSchema, addTreeMemberSchema, updateTreeSchema, updateCollaboratorRoleSchema } = require('../validations');

function createTreeRoutes({ treeController, authMiddleware, requireTreeRole }) {
  const router = express.Router();

  // Buat semesta pohon baru
  router.post('/', authMiddleware, validateBody(createTreeSchema), treeController.createTree);

  // Ambil semua semesta pohon yang diikuti pengguna (Multi-Universe)
  router.get('/', authMiddleware, treeController.getUserTrees);

  // Ambil detail spesifik pohon
  router.get('/:treeId', authMiddleware, requireTreeRole(), treeController.getTreeById);

  // Ubah nama semesta pohon (Hanya ADMIN_UTAMA)
  router.put(
    '/:treeId',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA']),
    validateBody(updateTreeSchema),
    treeController.updateTree
  );

  // Hapus semesta pohon (Hanya ADMIN_UTAMA)
  router.delete(
    '/:treeId',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA']),
    treeController.deleteTree
  );

  // Ambil daftar kolaborator pohon
  router.get(
    '/:treeId/collaborators',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA', 'KONTRIBUTOR', 'VIEWER']),
    treeController.getCollaborators
  );

  // Tambahkan / undang kolaborator baru ke semesta pohon (Hanya ADMIN_UTAMA)
  router.post(
    '/:treeId/collaborators',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA']),
    validateBody(addTreeMemberSchema),
    treeController.addTreeMember
  );

  // Kirim ulang email undangan kolaborator (Hanya ADMIN_UTAMA)
  router.post(
    '/:treeId/invitations/:invitationId/resend',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA']),
    treeController.resendInvitation
  );

  // Batalkan undangan kolaborator tertunda (Hanya ADMIN_UTAMA)
  router.delete(
    '/:treeId/invitations/:invitationId',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA']),
    treeController.revokeInvitation
  );

  // Ubah role kolaborator (Hanya ADMIN_UTAMA)
  router.put(
    '/:treeId/collaborators/:userId',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA']),
    validateBody(updateCollaboratorRoleSchema),
    treeController.updateCollaboratorRole
  );

  // Hapus kolaborator (Hanya ADMIN_UTAMA)
  router.delete(
    '/:treeId/collaborators/:userId',
    authMiddleware,
    requireTreeRole(['ADMIN_UTAMA']),
    treeController.removeCollaborator
  );

  return router;
}

module.exports = createTreeRoutes;

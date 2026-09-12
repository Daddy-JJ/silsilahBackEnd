const express = require('express');
const { validateBody } = require('../middlewares/validate.middleware');
const { addMarriageSchema, updateMarriageSchema } = require('../validations');

function createMarriageRoutes({ marriageController, authMiddleware, requireTreeRole }) {
  const router = express.Router();

  // Semua route di bawah ini membutuhkan autentikasi
  router.use(authMiddleware);

  // Ambil list pernikahan di pohon ini
  router.get('/:treeId/marriages', requireTreeRole(['ADMIN_UTAMA', 'KONTRIBUTOR', 'VIEWER']), marriageController.getMarriages);

  // Tambah relasi pernikahan (Hanya ADMIN_UTAMA dan KONTRIBUTOR)
  router.post(
    '/:treeId/marriages',
    requireTreeRole(['ADMIN_UTAMA', 'KONTRIBUTOR']),
    validateBody(addMarriageSchema),
    marriageController.addMarriage
  );

  // Ubah relasi pernikahan (Hanya ADMIN_UTAMA dan KONTRIBUTOR)
  router.put(
    '/:treeId/marriages/:marriageId',
    requireTreeRole(['ADMIN_UTAMA', 'KONTRIBUTOR']),
    validateBody(updateMarriageSchema),
    marriageController.updateMarriage
  );

  // Hapus relasi pernikahan (Hanya ADMIN_UTAMA dan KONTRIBUTOR)
  router.delete(
    '/:treeId/marriages/:marriageId',
    requireTreeRole(['ADMIN_UTAMA', 'KONTRIBUTOR']),
    marriageController.deleteMarriage
  );

  return router;
}

module.exports = createMarriageRoutes;

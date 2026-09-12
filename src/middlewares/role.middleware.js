const { ForbiddenError, BadRequestError } = require('../errors/AppError');

/**
 * Middleware untuk otorisasi peran pengguna dalam semesta pohon (Multi-Universe)
 * @param {Object} treeRepository - Instance TreeRepository
 * @param {Array<string>} allowedRoles - Contoh: ['ADMIN_UTAMA'], ['ADMIN_UTAMA', 'KONTRIBUTOR']
 */
function createRoleMiddleware(treeRepository, allowedRoles = []) {
  return async (req, res, next) => {
    try {
      const treeId = req.params.treeId || req.body.tree_id;
      if (!treeId) {
        throw new BadRequestError('treeId wajib disertakan dalam parameter atau body request.');
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ForbiddenError('Pengguna tidak terautentikasi.');
      }

      const userRole = await treeRepository.getUserRoleInTree(treeId, userId);
      if (!userRole) {
        throw new ForbiddenError('Anda bukan anggota dari semesta pohon silsilah ini.');
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        throw new ForbiddenError(
          `Akses ditolak. Peran Anda (${userRole}) tidak memiliki izin. Dibutuhkan salah satu dari: ${allowedRoles.join(', ')}.`
        );
      }

      req.treeRole = userRole;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = createRoleMiddleware;

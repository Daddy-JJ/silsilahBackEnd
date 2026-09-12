const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ForbiddenError, BadRequestError, ConflictError } = require('../errors/AppError');

class TreeService {
  constructor(treeRepository, userRepository, pool) {
    this.treeRepository = treeRepository;
    this.userRepository = userRepository;
    this.pool = pool;
  }

  async createTree(userId, { nama_silsilah }) {
    // Batasan Fase 1: Max 1 semesta keluarga yang dibuat per user
    const ownedTreesCount = await this.treeRepository.countOwnedTrees(userId);
    if (ownedTreesCount >= 1) {
      throw new ForbiddenError(
        'Under development: Batas fase ini adalah maksimal 1 semesta keluarga per akun. Nantikan update dari kami!'
      );
    }

    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      let finalMaxMembers;
      const [rows] = await conn.query(`SELECT setting_value FROM system_settings WHERE setting_key = 'default_max_members'`);
      finalMaxMembers = rows.length > 0 ? Number(rows[0].setting_value) : 30;

      const treeId = uuidv4();
      const treeMemberId = uuidv4();

      // 1. Buat semesta pohon
      await this.treeRepository.create(
        {
          id: treeId,
          nama_silsilah,
          created_by_user_id: userId,
          max_members: finalMaxMembers,
        },
        conn
      );

      // 2. Hubungkan pembuat pohon sebagai ADMIN_UTAMA
      await this.treeRepository.addMember(
        {
          id: treeMemberId,
          tree_id: treeId,
          user_id: userId,
          role: 'ADMIN_UTAMA',
        },
        conn
      );

      await conn.commit();

      const createdTree = await this.treeRepository.findById(treeId);
      return {
        ...createdTree,
        currentUserRole: 'ADMIN_UTAMA',
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async getUserTrees(userId) {
    return this.treeRepository.getTreesForUser(userId);
  }

  async getTreeById(treeId, userId) {
    const tree = await this.treeRepository.findById(treeId);
    if (!tree) {
      throw new NotFoundError('Pohon keluarga tidak ditemukan.');
    }

    const role = await this.treeRepository.getUserRoleInTree(treeId, userId);
    return {
      ...tree,
      currentUserRole: role,
    };
  }

  async updateTree(treeId, currentUserId, { nama_silsilah }) {
    if (!nama_silsilah || !nama_silsilah.trim()) {
      throw new BadRequestError('Nama semesta silsilah wajib diisi.');
    }

    const currentRole = await this.treeRepository.getUserRoleInTree(treeId, currentUserId);
    if (currentRole !== 'ADMIN_UTAMA') {
      throw new ForbiddenError('Hanya ADMIN_UTAMA yang dapat mengubah nama semesta silsilah.');
    }

    const updated = await this.treeRepository.update(treeId, { nama_silsilah: nama_silsilah.trim() });
    return {
      ...updated,
      currentUserRole: currentRole,
    };
  }

  async getCollaborators(treeId) {
    return this.treeRepository.getCollaboratorsInTree(treeId);
  }

  async addMemberToTree(treeId, currentUserId, { targetUserEmail, role }) {
    // Pastikan user pemanggil adalah ADMIN_UTAMA
    const currentRole = await this.treeRepository.getUserRoleInTree(treeId, currentUserId);
    if (currentRole !== 'ADMIN_UTAMA') {
      throw new ForbiddenError('Hanya ADMIN_UTAMA yang dapat mengelola anggota pohon.');
    }

    // Batasan Fase 1: Max 1 kolaborator tambahan per semesta keluarga
    const currentInvitedCount = await this.treeRepository.countInvitedCollaborators(treeId);
    if (currentInvitedCount >= 1) {
      throw new ForbiddenError(
        'Under development: Batas fase ini adalah maksimal 1 kolaborator per semesta keluarga. Nantikan update dari kami!'
      );
    }

    const targetUser = await this.userRepository.findByEmail(targetUserEmail);
    if (!targetUser) {
      throw new NotFoundError('Pengguna dengan email tersebut tidak ditemukan.');
    }

    const validRoles = ['ADMIN_UTAMA', 'KONTRIBUTOR', 'VIEWER'];
    if (!validRoles.includes(role)) {
      throw new BadRequestError(`Role tidak valid. Pilihan: ${validRoles.join(', ')}`);
    }

    const existingRole = await this.treeRepository.getUserRoleInTree(treeId, targetUser.id);
    if (existingRole) {
      throw new ConflictError(`Pengguna sudah menjadi anggota pohon ini dengan peran ${existingRole}.`);
    }

    const memberId = uuidv4();
    await this.treeRepository.addMember({
      id: memberId,
      tree_id: treeId,
      user_id: targetUser.id,
      role,
    });

    return {
      tree_id: treeId,
      user_id: targetUser.id,
      email: targetUser.email,
      nama_lengkap: targetUser.nama_lengkap,
      role,
    };
  }

  async deleteTree(treeId, currentUserId) {
    const currentRole = await this.treeRepository.getUserRoleInTree(treeId, currentUserId);
    if (currentRole !== 'ADMIN_UTAMA') {
      throw new ForbiddenError('Hanya ADMIN_UTAMA yang dapat menghapus pohon.');
    }

    const conn = await this.pool.getConnection();
    try {
      await conn.query('DELETE FROM trees WHERE id = ?', [treeId]);
      return { success: true, id: treeId };
    } finally {
      conn.release();
    }
  }

  async updateCollaboratorRole(treeId, currentUserId, targetUserId, newRole) {
    const currentRole = await this.treeRepository.getUserRoleInTree(treeId, currentUserId);
    if (currentRole !== 'ADMIN_UTAMA') {
      throw new ForbiddenError('Hanya ADMIN_UTAMA yang dapat mengubah role kolaborator.');
    }

    const targetRole = await this.treeRepository.getUserRoleInTree(treeId, targetUserId);
    if (!targetRole) {
      throw new NotFoundError('Kolaborator tidak ditemukan di pohon ini.');
    }

    // Jika yang diubah adalah ADMIN_UTAMA dan mengubah dirinya sendiri, mungkin perlu dicegah jika itu ADMIN_UTAMA terakhir. 
    // Tapi untuk simplifikasi kita allow update role.
    const conn = await this.pool.getConnection();
    try {
      await conn.query('UPDATE tree_members SET role = ? WHERE tree_id = ? AND user_id = ?', [newRole, treeId, targetUserId]);
      return { tree_id: treeId, user_id: targetUserId, role: newRole };
    } finally {
      conn.release();
    }
  }

  async removeCollaborator(treeId, currentUserId, targetUserId) {
    const currentRole = await this.treeRepository.getUserRoleInTree(treeId, currentUserId);
    if (currentRole !== 'ADMIN_UTAMA') {
      throw new ForbiddenError('Hanya ADMIN_UTAMA yang dapat menghapus kolaborator.');
    }

    const targetRole = await this.treeRepository.getUserRoleInTree(treeId, targetUserId);
    if (!targetRole) {
      throw new NotFoundError('Kolaborator tidak ditemukan di pohon ini.');
    }

    const conn = await this.pool.getConnection();
    try {
      await conn.query('DELETE FROM tree_members WHERE tree_id = ? AND user_id = ?', [treeId, targetUserId]);
      return { success: true, tree_id: treeId, user_id: targetUserId };
    } finally {
      conn.release();
    }
  }
}

module.exports = TreeService;

const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ForbiddenError, BadRequestError, ConflictError } = require('../errors/AppError');
const { getFrontendUrl } = require('../utils/urlHelper');

class TreeService {
  constructor(treeRepository, userRepository, pool, treeInvitationRepository = null, emailService = null) {
    this.treeRepository = treeRepository;
    this.userRepository = userRepository;
    this.pool = pool;
    this.treeInvitationRepository = treeInvitationRepository;
    this.emailService = emailService;
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
    const activeMembers = await this.treeRepository.getCollaboratorsInTree(treeId);
    let pendingInvitations = [];
    if (this.treeInvitationRepository) {
      pendingInvitations = await this.treeInvitationRepository.findPendingByTreeId(treeId);
    }

    return {
      members: activeMembers,
      pendingInvitations,
    };
  }

  async addMemberToTree(treeId, currentUserId, { targetUserEmail, role }) {
    // Pastikan user pemanggil adalah ADMIN_UTAMA
    const currentRole = await this.treeRepository.getUserRoleInTree(treeId, currentUserId);
    if (currentRole !== 'ADMIN_UTAMA') {
      throw new ForbiddenError('Hanya ADMIN_UTAMA yang dapat mengelola anggota pohon.');
    }

    const validRoles = ['ADMIN_UTAMA', 'KONTRIBUTOR', 'VIEWER'];
    if (!validRoles.includes(role)) {
      throw new BadRequestError(`Role tidak valid. Pilihan: ${validRoles.join(', ')}`);
    }

    const targetEmail = targetUserEmail.trim().toLowerCase();
    const inviter = await this.userRepository.findById(currentUserId);
    if (inviter && inviter.email.toLowerCase() === targetEmail) {
      throw new BadRequestError('Anda tidak dapat mengundang akun Anda sendiri.');
    }

    // Batasan Fase 1: Max 1 kolaborator tambahan (aktif + pending) per semesta keluarga
    const currentInvitedCount = await this.treeRepository.countInvitedCollaborators(treeId);
    let pendingCount = 0;
    if (this.treeInvitationRepository) {
      pendingCount = await this.treeInvitationRepository.countPendingByTreeId(treeId);
    }

    if (currentInvitedCount + pendingCount >= 1) {
      throw new ForbiddenError(
        'Under development: Batas fase ini adalah maksimal 1 kolaborator per semesta keluarga. Batalkan undangan tertunda atau nantikan update fase multi-kolaborator dari kami!'
      );
    }

    const tree = await this.treeRepository.findById(treeId);
    if (!tree) {
      throw new NotFoundError('Pohon silsilah tidak ditemukan.');
    }

    const appFrontendUrl = getFrontendUrl();
    const targetUser = await this.userRepository.findByEmail(targetEmail);

    // KASUS 1: Kerabat SUDAH TERDAFTAR di sistem
    if (targetUser) {
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

      // Catat di riwayat undangan agar masuk ke riwayat user panel
      if (this.treeInvitationRepository) {
        try {
          const inviteId = uuidv4();
          const token = uuidv4().replace(/-/g, '');
          await this.treeInvitationRepository.create({
            id: inviteId,
            tree_id: treeId,
            inviter_user_id: currentUserId,
            email: targetUser.email,
            role,
            token,
          });
          await this.treeInvitationRepository.updateStatus(inviteId, 'ACCEPTED');
        } catch (e) {
          // Abaikan jika sudah tercatat
        }
      }

      // Kirim email notifikasi bahwa ia telah ditambahkan ke semesta
      if (this.emailService) {
        this.emailService.sendCollaborationInviteEmail({
          to: targetUser.email,
          recipientName: targetUser.nama_lengkap,
          inviterName: inviter ? inviter.nama_lengkap : 'Admin Utama',
          treeName: tree.nama_silsilah,
          role,
          inviteUrl: appFrontendUrl,
        }).catch(err => console.error('[TreeService] Gagal kirim email notifikasi:', err.message));
      }

      return {
        isPending: false,
        message: `Berhasil menambahkan ${targetUser.nama_lengkap} sebagai ${role}!`,
        data: {
          tree_id: treeId,
          user_id: targetUser.id,
          email: targetUser.email,
          nama_lengkap: targetUser.nama_lengkap,
          role,
        },
      };
    }

    // KASUS 2: Kerabat BELUM TERDAFTAR di sistem (Organic Growth Loop)
    if (!this.treeInvitationRepository) {
      throw new BadRequestError('Layanan undangan kolaborator belum terkonfigurasi.');
    }

    const existingInvite = await this.treeInvitationRepository.findPendingByTreeAndEmail(treeId, targetEmail);
    if (existingInvite) {
      throw new ConflictError(`Undangan untuk email '${targetEmail}' sudah pernah dikirimkan dan masih menunggu pendaftaran kerabat.`);
    }

    const inviteId = uuidv4();
    const token = uuidv4().replace(/-/g, '');
    const newInvite = await this.treeInvitationRepository.create({
      id: inviteId,
      tree_id: treeId,
      inviter_user_id: currentUserId,
      email: targetEmail,
      role,
      token,
    });

    // Kirim email undangan resmi ke kerabat baru
    if (this.emailService) {
      const inviteUrl = `${appFrontendUrl}?invite=${token}&email=${encodeURIComponent(targetEmail)}`;
      this.emailService.sendCollaborationInviteEmail({
        to: targetEmail,
        recipientName: targetEmail.split('@')[0],
        inviterName: inviter ? inviter.nama_lengkap : 'Admin Utama',
        treeName: tree.nama_silsilah,
        role,
        inviteUrl,
      }).catch(err => console.error('[TreeService] Gagal kirim email undangan baru:', err.message));
    }

    return {
      isPending: true,
      message: `Undangan resmi telah dikirimkan ke ${targetEmail}! Kerabat akan otomatis menjadi ${role} setelah mendaftar akun.`,
      data: newInvite,
    };
  }

  async resendInvitation(treeId, currentUserId, invitationId) {
    const currentRole = await this.treeRepository.getUserRoleInTree(treeId, currentUserId);
    if (currentRole !== 'ADMIN_UTAMA') {
      throw new ForbiddenError('Hanya ADMIN_UTAMA yang dapat mengelola undangan pohon.');
    }

    if (!this.treeInvitationRepository) {
      throw new BadRequestError('Layanan undangan kolaborator belum terkonfigurasi.');
    }

    const invite = await this.treeInvitationRepository.findById(invitationId);
    if (!invite || invite.tree_id !== treeId || invite.status !== 'PENDING') {
      throw new NotFoundError('Data undangan tidak ditemukan atau sudah tidak aktif.');
    }

    const tree = await this.treeRepository.findById(treeId);
    const inviter = await this.userRepository.findById(currentUserId);
    const appFrontendUrl = getFrontendUrl();
    const inviteUrl = `${appFrontendUrl}?invite=${invite.token}&email=${encodeURIComponent(invite.email)}`;

    if (this.emailService) {
      await this.emailService.sendCollaborationInviteEmail({
        to: invite.email,
        recipientName: invite.email.split('@')[0],
        inviterName: inviter ? inviter.nama_lengkap : 'Admin Utama',
        treeName: tree ? tree.nama_silsilah : 'Silsilah Keluarga',
        role: invite.role,
        inviteUrl,
      });
    }

    return {
      success: true,
      message: `Email undangan berhasil dikirimkan ulang ke ${invite.email}!`,
    };
  }

  async revokeInvitation(treeId, currentUserId, invitationId) {
    const currentRole = await this.treeRepository.getUserRoleInTree(treeId, currentUserId);
    if (currentRole !== 'ADMIN_UTAMA') {
      throw new ForbiddenError('Hanya ADMIN_UTAMA yang dapat mengelola undangan pohon.');
    }

    if (!this.treeInvitationRepository) {
      throw new BadRequestError('Layanan undangan kolaborator belum terkonfigurasi.');
    }

    const invite = await this.treeInvitationRepository.findById(invitationId);
    if (!invite || invite.tree_id !== treeId) {
      throw new NotFoundError('Data undangan tidak ditemukan.');
    }

    await this.treeInvitationRepository.delete(invitationId);
    return {
      success: true,
      message: `Undangan untuk ${invite.email} telah berhasil dibatalkan. Kuota kolaborator telah dibebaskan.`,
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

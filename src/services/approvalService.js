const { v4: uuidv4 } = require('uuid');
const {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} = require('../errors/AppError');
const { validateAcyclicRelation, validateParentsGender } = require('../utils/dagValidator');

class ApprovalService {
  constructor(approvalRepository, familyMemberRepository, treeRepository, pool) {
    this.approvalRepository = approvalRepository;
    this.familyMemberRepository = familyMemberRepository;
    this.treeRepository = treeRepository;
    this.pool = pool;
  }

  /**
   * Kontributor mengusulkan perubahan pada data anggota keluarga
   */
  async proposeChange(treeId, userId, { target_member_id, target_version, patch_data }) {
    // 1. Verifikasi eksistensi anggota
    const member = await this.familyMemberRepository.findByIdAndTree(target_member_id, treeId);
    if (!member) {
      throw new NotFoundError('Anggota keluarga target tidak ditemukan dalam pohon ini.');
    }

    if (typeof patch_data !== 'object' || patch_data === null) {
      throw new BadRequestError('patch_data harus berupa objek valid.');
    }

    // Cegah duplikat PENDING approval untuk member yang sama
    const existingPendings = await this.approvalRepository.findByTargetAndStatus(target_member_id, 'PENDING');
    if (existingPendings.length > 0) {
      throw new ConflictError('Sudah ada usulan perubahan yang PENDING untuk anggota ini.');
    }

    // 2. Validasi Anti-Cycle DAG awal jika mengusulkan perubahan orang tua
    const candidateAyahId = patch_data.ayah_id !== undefined ? patch_data.ayah_id : member.ayah_id;
    const candidateIbuId = patch_data.ibu_id !== undefined ? patch_data.ibu_id : member.ibu_id;

    if (candidateAyahId !== member.ayah_id || candidateIbuId !== member.ibu_id) {
      const allMembers = await this.familyMemberRepository.findAllByTreeId(treeId);
      validateAcyclicRelation(allMembers, target_member_id, candidateAyahId, candidateIbuId);
      validateParentsGender(allMembers, candidateAyahId, candidateIbuId);
    }

    const approvalId = uuidv4();
    const createdApproval = await this.approvalRepository.create({
      id: approvalId,
      tree_id: treeId,
      target_member_id,
      proposed_by_user_id: userId,
      target_version: Number(target_version),
      patch_data,
    });

    return createdApproval;
  }

  /**
   * Mengambil daftar usulan perubahan per pohon
   */
  async getApprovals(treeId, status = null, page = 1, limit = 50) {
    return this.approvalRepository.findAllByTreeId(treeId, status, page, limit);
  }

  async getApprovalById(treeId, approvalId) {
    const approval = await this.approvalRepository.findById(approvalId);
    if (!approval) {
      throw new NotFoundError('Usulan perubahan tidak ditemukan.');
    }
    if (approval.tree_id !== treeId) {
      throw new NotFoundError('Usulan perubahan tidak ditemukan dalam pohon ini.');
    }
    return approval;
  }

  /**
   * Admin Utama menyetujui atau menolak usulan perubahan
   * Transaksi Basis Data: Wajib dibungkus dalam connection.beginTransaction(), commit(), dan rollback().
   */
  async resolveApproval(treeId, approvalId, adminUserId, { action, review_notes = null }) {
    if (!['APPROVED', 'REJECTED'].includes(action)) {
      throw new BadRequestError('Aksi harus berupa APPROVED atau REJECTED.');
    }

    const conn = await this.pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1. Ambil usulan perubahan dengan row-level lock
      const approval = await this.approvalRepository.findByIdWithLock(approvalId, conn);
      if (!approval) {
        throw new NotFoundError('Usulan perubahan tidak ditemukan.');
      }

      if (approval.tree_id !== treeId) {
        throw new BadRequestError('Usulan tidak sesuai dengan semesta pohon terkait.');
      }

      if (approval.status !== 'PENDING') {
        throw new BadRequestError(`Usulan sudah diproses sebelumnya dengan status: ${approval.status}.`);
      }

      // 2. Jika aksi ditolak (REJECTED)
      if (action === 'REJECTED') {
        await this.approvalRepository.updateStatus(approvalId, 'REJECTED', review_notes, conn);
        await conn.commit();
        return this.approvalRepository.findById(approvalId);
      }

      // 3. Jika aksi disetujui (APPROVED):
      // Ambil data anggota target saat ini dengan row-level lock
      const targetMember = await this.familyMemberRepository.findByIdAndTree(
        approval.target_member_id,
        treeId,
        conn
      );

      if (!targetMember) {
        throw new NotFoundError('Anggota target silsilah sudah tidak ditemukan.');
      }

      // Kontrol Konkurensi (Optimistic Locking)
      // Cek apakah version di targetMember masih sama dengan target_version saat usulan dibuat
      if (targetMember.version !== approval.target_version) {
        throw new ConflictError(
          `Gagal menyetujui usulan: Versi data anggota telah berubah (Versi saat usulan: ${approval.target_version}, Versi saat ini: ${targetMember.version}). Telah terjadi modifikasi oleh pihak lain.`
        );
      }

      // Validasi Anti-Cycle DAG final sebelum penerapan perubahan
      const candidateAyahId =
        approval.patch_data.ayah_id !== undefined
          ? approval.patch_data.ayah_id
          : targetMember.ayah_id;
      const candidateIbuId =
        approval.patch_data.ibu_id !== undefined
          ? approval.patch_data.ibu_id
          : targetMember.ibu_id;

      if (candidateAyahId !== targetMember.ayah_id || candidateIbuId !== targetMember.ibu_id) {
        const allMembers = await this.familyMemberRepository.findAllByTreeId(treeId, conn);
        validateAcyclicRelation(allMembers, targetMember.id, candidateAyahId, candidateIbuId);
        validateParentsGender(allMembers, candidateAyahId, candidateIbuId);
      }

      // Terapkan perubahan pada family_members dan naikkan versi (+1)
      const updateResult = await this.familyMemberRepository.updateWithVersionCheck(
        targetMember.id,
        approval.target_version,
        approval.patch_data,
        conn
      );

      if (updateResult.affectedRows === 0) {
        throw new ConflictError(
          'Konflik konkurensi: Gagal memperbarui data karena versi anggota telah berubah.'
        );
      }

      // Tandai usulan sebagai APPROVED
      await this.approvalRepository.updateStatus(approvalId, 'APPROVED', review_notes, conn);

      await conn.commit();

      const updatedApproval = await this.approvalRepository.findById(approvalId);
      const updatedMember = await this.familyMemberRepository.findById(targetMember.id);

      return {
        approval: updatedApproval,
        updatedMember,
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async deleteApproval(treeId, approvalId, currentUserId, currentUserRole) {
    const approval = await this.approvalRepository.findById(approvalId);
    if (!approval) {
      throw new NotFoundError('Usulan perubahan tidak ditemukan.');
    }
    if (approval.tree_id !== treeId) {
      throw new NotFoundError('Usulan perubahan tidak ditemukan dalam pohon ini.');
    }

    // Hanya ADMIN_UTAMA atau Proposer (KONTRIBUTOR yang mengusulkan) yang boleh membatalkan
    if (currentUserRole !== 'ADMIN_UTAMA' && approval.proposed_by_user_id !== currentUserId) {
      throw new ForbiddenError('Anda tidak memiliki akses untuk menghapus/membatalkan usulan ini.');
    }

    if (approval.status !== 'PENDING') {
      throw new BadRequestError('Hanya usulan dengan status PENDING yang dapat dihapus.');
    }

    const conn = await this.pool.getConnection();
    try {
      await conn.query('DELETE FROM pending_approvals WHERE id = ? AND tree_id = ?', [approvalId, treeId]);
      return { success: true, id: approvalId };
    } finally {
      conn.release();
    }
  }
}

module.exports = ApprovalService;

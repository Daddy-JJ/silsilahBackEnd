const { v4: uuidv4 } = require('uuid');
const {
  NotFoundError,
  UnprocessableEntityError,
  ConflictError,
  BadRequestError,
} = require('../errors/AppError');
const { validateAcyclicRelation, validateParentsGender } = require('../utils/dagValidator');
const { mapFamilyMembersToReactFlow } = require('../utils/reactFlowMapper');

class FamilyMemberService {
  constructor(familyMemberRepository, treeRepository, pool) {
    this.familyMemberRepository = familyMemberRepository;
    this.treeRepository = treeRepository;
    this.pool = pool;
  }

  async getMembersByTreeId(treeId) {
    const tree = await this.treeRepository.findById(treeId);
    if (!tree) {
      throw new NotFoundError('Pohon keluarga tidak ditemukan.');
    }
    return this.familyMemberRepository.findAllByTreeId(treeId);
  }

  async getReactFlowCanvas(treeId) {
    const members = await this.getMembersByTreeId(treeId);
    return mapFamilyMembersToReactFlow(members);
  }

  async getMemberById(treeId, memberId) {
    const member = await this.familyMemberRepository.findByIdAndTree(memberId, treeId);
    if (!member) {
      throw new NotFoundError('Anggota keluarga tidak ditemukan dalam pohon ini.');
    }
    return member;
  }

  /**
   * Penambahan Anggota Keluarga Baru
   * Transaksi Basis Data: Wajib dibungkus dalam connection.beginTransaction(), commit(), dan rollback().
   */
  async addMember(treeId, userId, memberData) {
    const conn = await this.pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1. Kunci baris semesta pohon untuk memeriksa batas kuota
      const tree = await this.treeRepository.findByIdWithLock(treeId, conn);
      if (!tree) {
        throw new NotFoundError('Pohon keluarga tidak ditemukan.');
      }

      // 2. Cek Aturan Bisnis: Hard Limit Kuota Nodes per tree_id
      const currentCount = await this.familyMemberRepository.countByTreeIdWithLock(treeId, conn);
      const maxAllowed = tree.max_members || 30;

      if (currentCount >= maxAllowed) {
        throw new UnprocessableEntityError(
          `Under development: Batas fase ini adalah maksimal ${maxAllowed} anggota keluarga per semesta. Nantikan update dari kami!`,
          { currentCount, maxAllowed }
        );
      }

      // 3. Ambil seluruh anggota pohon untuk validasi Anti-Cycle DAG
      const allMembers = await this.familyMemberRepository.findAllByTreeId(treeId, conn);

      // 4. Cek Aturan Bisnis: Anti-Cycle DAG Validation
      validateAcyclicRelation(allMembers, null, memberData.ayah_id, memberData.ibu_id);

      // 5. Validasi integritas gender orang tua
      validateParentsGender(allMembers, memberData.ayah_id, memberData.ibu_id);

      // 6. Simpan anggota baru (version default = 1)
      const newMemberId = uuidv4();
      const createdMember = await this.familyMemberRepository.create(
        {
          id: newMemberId,
          tree_id: treeId,
          nama_lengkap: memberData.nama_lengkap,
          jenis_kelamin: memberData.jenis_kelamin,
          tanggal_lahir: memberData.tanggal_lahir || null,
          ayah_id: memberData.ayah_id || null,
          ibu_id: memberData.ibu_id || null,
          urutan_anak: memberData.urutan_anak !== undefined ? memberData.urutan_anak : 0,
          kontributor_id: userId,
        },
        conn
      );

      await conn.commit();
      return createdMember;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Pembaruan Langsung (Direct Update) oleh ADMIN_UTAMA
   * Menggunakan Optimistic Locking dengan verifikasi versi
   */
  async updateMemberDirect(treeId, memberId, expectedVersion, patchData) {
    const conn = await this.pool.getConnection();

    try {
      await conn.beginTransaction();

      const member = await this.familyMemberRepository.findByIdAndTree(memberId, treeId, conn);
      if (!member) {
        throw new NotFoundError('Anggota keluarga tidak ditemukan dalam pohon ini.');
      }

      // Validasi Anti-Cycle DAG & Gender jika ada perubahan relasi orang tua
      const candidateAyahId = patchData.ayah_id !== undefined ? patchData.ayah_id : member.ayah_id;
      const candidateIbuId = patchData.ibu_id !== undefined ? patchData.ibu_id : member.ibu_id;

      if (candidateAyahId !== member.ayah_id || candidateIbuId !== member.ibu_id) {
        const allMembers = await this.familyMemberRepository.findAllByTreeId(treeId, conn);
        validateAcyclicRelation(allMembers, memberId, candidateAyahId, candidateIbuId);
        validateParentsGender(allMembers, candidateAyahId, candidateIbuId);
      }

      // Optimistic Locking update: WHERE id = ? AND version = ?
      const result = await this.familyMemberRepository.updateWithVersionCheck(
        memberId,
        expectedVersion,
        patchData,
        conn
      );

      if (result.affectedRows === 0) {
        throw new ConflictError(
          'Konflik konkurensi: Data telah diperbarui oleh pengguna lain. Silakan muat ulang data terbaru.'
        );
      }

      const updatedMember = await this.familyMemberRepository.findById(memberId, conn);
      
      await conn.commit();

      return updatedMember;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async deleteMember(treeId, memberId) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const member = await this.familyMemberRepository.findByIdAndTree(memberId, treeId, conn);
      if (!member) {
        throw new NotFoundError('Anggota keluarga tidak ditemukan.');
      }

      const deleted = await this.familyMemberRepository.delete(memberId, treeId, conn);
      
      await conn.commit();
      return { success: deleted, id: memberId };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}

module.exports = FamilyMemberService;

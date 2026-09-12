const { v4: uuidv4 } = require('uuid');
const { NotFoundError, BadRequestError, ConflictError } = require('../errors/AppError');

class MarriageService {
  constructor(marriageRepository, familyMemberRepository, treeRepository, pool) {
    this.marriageRepository = marriageRepository;
    this.familyMemberRepository = familyMemberRepository;
    this.treeRepository = treeRepository;
    this.pool = pool;
  }

  async getMarriagesByTreeId(treeId) {
    const tree = await this.treeRepository.findById(treeId);
    if (!tree) {
      throw new NotFoundError('Pohon keluarga tidak ditemukan.');
    }
    return this.marriageRepository.findAllByTreeId(treeId);
  }

  async addMarriage(treeId, { suami_id, istri_id, tanggal_pernikahan }) {
    const conn = await this.pool.getConnection();

    try {
      await conn.beginTransaction();

      const tree = await this.treeRepository.findById(treeId, conn);
      if (!tree) {
        throw new NotFoundError('Pohon keluarga tidak ditemukan.');
      }

      // 1. Verifikasi Suami (Laki-laki)
      const suami = await this.familyMemberRepository.findByIdAndTree(suami_id, treeId, conn);
      if (!suami) {
        throw new NotFoundError('Data suami tidak ditemukan dalam pohon ini.');
      }
      if (suami.jenis_kelamin !== 'L') {
        throw new BadRequestError('Suami harus berjenis kelamin Laki-laki (L).');
      }

      // 2. Verifikasi Istri (Perempuan)
      const istri = await this.familyMemberRepository.findByIdAndTree(istri_id, treeId, conn);
      if (!istri) {
        throw new NotFoundError('Data istri tidak ditemukan dalam pohon ini.');
      }
      if (istri.jenis_kelamin !== 'P') {
        throw new BadRequestError('Istri harus berjenis kelamin Perempuan (P).');
      }

      // 3. Cek Duplikat
      const exists = await this.marriageRepository.checkExists(treeId, suami_id, istri_id, conn);
      if (exists) {
        throw new ConflictError('Relasi pernikahan ini sudah terdaftar sebelumnya.');
      }

      // 4. Simpan
      const newMarriageId = uuidv4();
      const createdMarriage = await this.marriageRepository.create(
        {
          id: newMarriageId,
          tree_id: treeId,
          suami_id,
          istri_id,
          tanggal_pernikahan,
        },
        conn
      );

      await conn.commit();
      return createdMarriage;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async updateMarriage(treeId, marriageId, { tanggal_pernikahan }) {
    const marriage = await this.marriageRepository.findById(marriageId, treeId);
    if (!marriage) {
      throw new NotFoundError('Relasi pernikahan tidak ditemukan.');
    }

    const conn = await this.pool.getConnection();
    try {
      await conn.query(
        'UPDATE marriages SET tanggal_pernikahan = ? WHERE id = ? AND tree_id = ?',
        [tanggal_pernikahan !== undefined ? tanggal_pernikahan : marriage.tanggal_pernikahan, marriageId, treeId]
      );
      return { id: marriageId, tanggal_pernikahan };
    } finally {
      conn.release();
    }
  }

  async deleteMarriage(treeId, marriageId) {
    const marriage = await this.marriageRepository.findById(marriageId, treeId);
    if (!marriage) {
      throw new NotFoundError('Relasi pernikahan tidak ditemukan.');
    }

    const deleted = await this.marriageRepository.delete(marriageId, treeId);
    return { success: deleted, id: marriageId };
  }
}

module.exports = MarriageService;

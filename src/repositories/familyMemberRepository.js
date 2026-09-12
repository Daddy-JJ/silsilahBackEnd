class FamilyMemberRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _getExecutor(conn) {
    return conn || this.pool;
  }

  async findAllByTreeId(treeId, conn = null) {
    const sql = `
      SELECT * FROM family_members
      WHERE tree_id = ?
      ORDER BY created_at ASC
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [treeId]);
    return rows;
  }

  async findById(id, conn = null) {
    const sql = `SELECT * FROM family_members WHERE id = ?`;
    const [rows] = await this._getExecutor(conn).query(sql, [id]);
    return rows[0] || null;
  }

  async findByIdAndTree(id, treeId, conn = null) {
    const sql = `SELECT * FROM family_members WHERE id = ? AND tree_id = ?`;
    const [rows] = await this._getExecutor(conn).query(sql, [id, treeId]);
    return rows[0] || null;
  }

  async countByTreeId(treeId, conn = null) {
    const sql = `SELECT COUNT(*) AS total FROM family_members WHERE tree_id = ?`;
    const [rows] = await this._getExecutor(conn).query(sql, [treeId]);
    return Number(rows[0]?.total || 0);
  }

  async countByTreeIdWithLock(treeId, conn) {
    // Dipanggil di dalam transaksi
    const sql = `SELECT COUNT(*) AS total FROM family_members WHERE tree_id = ? LOCK IN SHARE MODE`;
    const [rows] = await this._getExecutor(conn).query(sql, [treeId]);
    return Number(rows[0]?.total || 0);
  }

  async create(member, conn = null) {
    const sql = `
      INSERT INTO family_members (
        id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir,
        ayah_id, ibu_id, urutan_anak, kontributor_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    await this._getExecutor(conn).query(sql, [
      member.id,
      member.tree_id,
      member.nama_lengkap,
      member.jenis_kelamin,
      member.tanggal_lahir || null,
      member.ayah_id || null,
      member.ibu_id || null,
      member.urutan_anak || 0,
      member.kontributor_id || null,
    ]);
    return this.findById(member.id, conn);
  }

  /**
   * Pembaruan data dengan Kontrol Konkurensi (Optimistic Locking)
   * Hanya baris dengan version yang sama persis yang akan di-update,
   * dan version dinaikkan + 1.
   */
  async updateWithVersionCheck(id, expectedVersion, patch, conn = null) {
    // Siapkan kolom yang di-update
    const allowedFields = ['nama_lengkap', 'jenis_kelamin', 'tanggal_lahir', 'ayah_id', 'ibu_id', 'urutan_anak'];
    const fieldsToUpdate = [];
    const values = [];

    for (const key of allowedFields) {
      if (patch[key] !== undefined) {
        fieldsToUpdate.push(`${key} = ?`);
        values.push(patch[key]);
      }
    }

    if (fieldsToUpdate.length === 0) {
      return { affectedRows: 0 };
    }

    // Naikkan version secara atomik
    fieldsToUpdate.push(`version = version + 1`);

    const sql = `
      UPDATE family_members
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = ? AND version = ?
    `;
    values.push(id, expectedVersion);

    const [result] = await this._getExecutor(conn).query(sql, values);
    return {
      affectedRows: result.affectedRows,
    };
  }

  async delete(id, treeId, conn = null) {
    const sql = `DELETE FROM family_members WHERE id = ? AND tree_id = ?`;
    const [result] = await this._getExecutor(conn).query(sql, [id, treeId]);
    return result.affectedRows > 0;
  }
}

module.exports = FamilyMemberRepository;

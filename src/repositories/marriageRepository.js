class MarriageRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _getExecutor(conn) {
    return conn || this.pool;
  }

  async findAllByTreeId(treeId, conn = null) {
    const sql = `
      SELECT * FROM marriages
      WHERE tree_id = ?
      ORDER BY created_at ASC
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [treeId]);
    return rows;
  }

  async findById(id, treeId, conn = null) {
    const sql = `SELECT * FROM marriages WHERE id = ? AND tree_id = ?`;
    const [rows] = await this._getExecutor(conn).query(sql, [id, treeId]);
    return rows[0] || null;
  }

  async checkExists(treeId, suamiId, istriId, conn = null) {
    const sql = `
      SELECT id FROM marriages 
      WHERE tree_id = ? AND suami_id = ? AND istri_id = ?
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [treeId, suamiId, istriId]);
    return rows.length > 0;
  }

  async create(marriage, conn = null) {
    const sql = `
      INSERT INTO marriages (id, tree_id, suami_id, istri_id, tanggal_pernikahan)
      VALUES (?, ?, ?, ?, ?)
    `;
    await this._getExecutor(conn).query(sql, [
      marriage.id,
      marriage.tree_id,
      marriage.suami_id,
      marriage.istri_id,
      marriage.tanggal_pernikahan || null,
    ]);
    return this.findById(marriage.id, marriage.tree_id, conn);
  }

  async delete(id, treeId, conn = null) {
    const sql = `DELETE FROM marriages WHERE id = ? AND tree_id = ?`;
    const [result] = await this._getExecutor(conn).query(sql, [id, treeId]);
    return result.affectedRows > 0;
  }
}

module.exports = MarriageRepository;

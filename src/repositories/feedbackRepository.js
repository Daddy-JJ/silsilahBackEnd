class FeedbackRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _getExecutor(conn) {
    return conn || this.pool;
  }

  async create({ id, user_id, category, message }, conn = null) {
    const sql = `
      INSERT INTO user_feedbacks (id, user_id, category, message)
      VALUES (?, ?, ?, ?)
    `;
    await this._getExecutor(conn).query(sql, [id, user_id, category, message]);
    return this.findById(id, conn);
  }

  async findById(id, conn = null) {
    const sql = `
      SELECT f.*, u.nama_lengkap, u.email
      FROM user_feedbacks f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.id = ?
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [id]);
    return rows[0] || null;
  }

  async findAll(limit = 50, offset = 0, conn = null) {
    const sql = `
      SELECT f.*, u.nama_lengkap, u.email
      FROM user_feedbacks f
      LEFT JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [limit, offset]);
    return rows;
  }
}

module.exports = FeedbackRepository;

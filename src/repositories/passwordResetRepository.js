class PasswordResetRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _getExecutor(conn) {
    return conn || this.pool;
  }

  async create({ id, email, token, expires_at }, conn = null) {
    const sql = `
      INSERT INTO password_resets (id, email, token, expires_at)
      VALUES (?, ?, ?, ?)
    `;
    await this._getExecutor(conn).query(sql, [id, email.toLowerCase(), token, expires_at]);
    return this.findById(id, conn);
  }

  async findById(id, conn = null) {
    const sql = `SELECT * FROM password_resets WHERE id = ?`;
    const [rows] = await this._getExecutor(conn).query(sql, [id]);
    return rows[0] || null;
  }

  async findValidToken(email, token, conn = null) {
    const sql = `
      SELECT * FROM password_resets
      WHERE email = ? AND token = ? AND used_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [email.toLowerCase(), token]);
    return rows[0] || null;
  }

  async markAsUsed(id, conn = null) {
    const sql = `UPDATE password_resets SET used_at = NOW() WHERE id = ?`;
    const [res] = await this._getExecutor(conn).query(sql, [id]);
    return res.affectedRows > 0;
  }

  async invalidatePreviousTokens(email, conn = null) {
    const sql = `UPDATE password_resets SET used_at = NOW() WHERE email = ? AND used_at IS NULL`;
    await this._getExecutor(conn).query(sql, [email.toLowerCase()]);
  }
}

module.exports = PasswordResetRepository;

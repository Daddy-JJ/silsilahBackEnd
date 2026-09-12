class UserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _getExecutor(conn) {
    return conn || this.pool;
  }

  async findById(id, conn = null) {
    const sql = `SELECT id, email, nama_lengkap, google_id, avatar_url, auth_provider, is_verified, system_role, created_at FROM users WHERE id = ?`;
    const [rows] = await this._getExecutor(conn).query(sql, [id]);
    return rows[0] || null;
  }

  async findByEmail(email, conn = null) {
    const sql = `SELECT id, email, password_hash, nama_lengkap, google_id, avatar_url, auth_provider, is_verified, system_role, created_at FROM users WHERE email = ?`;
    const [rows] = await this._getExecutor(conn).query(sql, [email]);
    return rows[0] || null;
  }

  async findByGoogleId(googleId, conn = null) {
    const sql = `SELECT id, email, nama_lengkap, google_id, avatar_url, auth_provider, is_verified, system_role, created_at FROM users WHERE google_id = ?`;
    const [rows] = await this._getExecutor(conn).query(sql, [googleId]);
    return rows[0] || null;
  }

  async create(user, conn = null) {
    const sql = `
      INSERT INTO users (id, email, password_hash, nama_lengkap, google_id, avatar_url, auth_provider, is_verified, system_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this._getExecutor(conn).query(sql, [
      user.id,
      user.email,
      user.password_hash || null,
      user.nama_lengkap,
      user.google_id || null,
      user.avatar_url || null,
      user.auth_provider || 'LOCAL',
      user.is_verified ?? false,
      user.system_role || 'USER',
    ]);
    return this.findById(user.id, conn);
  }

  async updateGoogleAccount(id, { google_id, avatar_url }, conn = null) {
    const sql = `
      UPDATE users 
      SET google_id = ?, avatar_url = COALESCE(?, avatar_url), is_verified = TRUE
      WHERE id = ?
    `;
    await this._getExecutor(conn).query(sql, [google_id, avatar_url, id]);
    return this.findById(id, conn);
  }

  async updateProfile(id, { nama_lengkap, email }, conn = null) {
    const sql = `
      UPDATE users
      SET nama_lengkap = ?, email = ?
      WHERE id = ?
    `;
    await this._getExecutor(conn).query(sql, [nama_lengkap, email.toLowerCase(), id]);
    return this.findById(id, conn);
  }

  async updatePassword(id, password_hash, conn = null) {
    const sql = `
      UPDATE users
      SET password_hash = ?
      WHERE id = ?
    `;
    await this._getExecutor(conn).query(sql, [password_hash, id]);
    return this.findById(id, conn);
  }
}

module.exports = UserRepository;

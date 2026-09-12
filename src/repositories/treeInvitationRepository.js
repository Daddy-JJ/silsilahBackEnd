class TreeInvitationRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _getExecutor(conn) {
    return conn || this.pool;
  }

  async create(invitation, conn = null) {
    const sql = `
      INSERT INTO tree_invitations (id, tree_id, inviter_user_id, email, role, token, status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `;
    await this._getExecutor(conn).query(sql, [
      invitation.id,
      invitation.tree_id,
      invitation.inviter_user_id,
      invitation.email.toLowerCase(),
      invitation.role,
      invitation.token,
    ]);
    return this.findById(invitation.id, conn);
  }

  async findById(id, conn = null) {
    const sql = `SELECT * FROM tree_invitations WHERE id = ?`;
    const [rows] = await this._getExecutor(conn).query(sql, [id]);
    return rows[0] || null;
  }

  async findPendingByTreeAndEmail(treeId, email, conn = null) {
    const sql = `
      SELECT * FROM tree_invitations
      WHERE tree_id = ? AND email = ? AND status = 'PENDING'
      LIMIT 1
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [treeId, email.toLowerCase()]);
    return rows[0] || null;
  }

  async findPendingByEmail(email, conn = null) {
    const sql = `
      SELECT ti.*, t.nama_silsilah
      FROM tree_invitations ti
      JOIN trees t ON ti.tree_id = t.id
      WHERE ti.email = ? AND ti.status = 'PENDING'
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [email.toLowerCase()]);
    return rows;
  }

  async findPendingByTreeId(treeId, conn = null) {
    const sql = `
      SELECT ti.id, ti.tree_id, ti.inviter_user_id, ti.email, ti.role, ti.status, ti.created_at,
             u.nama_lengkap AS inviter_name, u.email AS inviter_email
      FROM tree_invitations ti
      LEFT JOIN users u ON ti.inviter_user_id = u.id
      WHERE ti.tree_id = ? AND ti.status = 'PENDING'
      ORDER BY ti.created_at DESC
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [treeId]);
    return rows;
  }

  async countPendingByTreeId(treeId, conn = null) {
    const sql = `
      SELECT COUNT(*) AS count
      FROM tree_invitations
      WHERE tree_id = ? AND status = 'PENDING'
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [treeId]);
    return Number(rows[0]?.count) || 0;
  }

  async updateStatus(id, status, conn = null) {
    const sql = `UPDATE tree_invitations SET status = ? WHERE id = ?`;
    await this._getExecutor(conn).query(sql, [status, id]);
    return this.findById(id, conn);
  }

  async delete(id, conn = null) {
    const sql = `DELETE FROM tree_invitations WHERE id = ?`;
    const [res] = await this._getExecutor(conn).query(sql, [id]);
    return res.affectedRows > 0;
  }
}

module.exports = TreeInvitationRepository;

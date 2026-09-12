class ApprovalRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _getExecutor(conn) {
    return conn || this.pool;
  }

  async create(approval, conn = null) {
    const sql = `
      INSERT INTO pending_approvals (
        id, tree_id, target_member_id, proposed_by_user_id,
        target_version, patch_data, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `;
    await this._getExecutor(conn).query(sql, [
      approval.id,
      approval.tree_id,
      approval.target_member_id,
      approval.proposed_by_user_id,
      approval.target_version,
      JSON.stringify(approval.patch_data),
    ]);
    return this.findById(approval.id, conn);
  }

  async findById(id, conn = null) {
    const sql = `
      SELECT pa.*, u.nama_lengkap AS proposed_by_name, u.email AS proposed_by_email,
             fm.nama_lengkap AS target_member_name
      FROM pending_approvals pa
      LEFT JOIN users u ON pa.proposed_by_user_id = u.id
      LEFT JOIN family_members fm ON pa.target_member_id = fm.id
      WHERE pa.id = ?
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [id]);
    if (!rows[0]) return null;
    return this._formatRow(rows[0]);
  }

  async findByIdWithLock(id, conn) {
    const sql = `
      SELECT * FROM pending_approvals
      WHERE id = ? FOR UPDATE
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [id]);
    if (!rows[0]) return null;
    return this._formatRow(rows[0]);
  }

  async findAllByTreeId(treeId, status = null, page = 1, limit = 50, conn = null) {
    let sql = `
      SELECT pa.*, u.nama_lengkap AS proposed_by_name, u.email AS proposed_by_email,
             fm.nama_lengkap AS target_member_name
      FROM pending_approvals pa
      LEFT JOIN users u ON pa.proposed_by_user_id = u.id
      LEFT JOIN family_members fm ON pa.target_member_id = fm.id
      WHERE pa.tree_id = ?
    `;
    const params = [treeId];

    if (status) {
      sql += ` AND pa.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY pa.created_at DESC`;

    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await this._getExecutor(conn).query(sql, params);
    return rows.map((r) => this._formatRow(r));
  }

  async findByTargetAndStatus(targetMemberId, status, conn = null) {
    const sql = `
      SELECT * FROM pending_approvals
      WHERE target_member_id = ? AND status = ?
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [targetMemberId, status]);
    return rows.map(r => this._formatRow(r));
  }

  async updateStatus(id, status, reviewNotes = null, conn = null) {
    const sql = `
      UPDATE pending_approvals
      SET status = ?, review_notes = ?, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const [result] = await this._getExecutor(conn).query(sql, [status, reviewNotes, id]);
    return result.affectedRows > 0;
  }

  _formatRow(row) {
    return {
      ...row,
      patch_data: typeof row.patch_data === 'string' ? JSON.parse(row.patch_data) : row.patch_data,
    };
  }
}

module.exports = ApprovalRepository;

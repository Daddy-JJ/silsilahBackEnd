class TreeRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _getExecutor(conn) {
    return conn || this.pool;
  }

  async findById(id, conn = null) {
    const sql = `SELECT * FROM trees WHERE id = ?`;
    const [rows] = await this._getExecutor(conn).query(sql, [id]);
    return rows[0] || null;
  }

  async findByIdWithLock(id, conn) {
    // Digunakan dalam transaksi untuk mengunci baris semesta pohon saat menghitung kapasitas
    const sql = `SELECT * FROM trees WHERE id = ? FOR UPDATE`;
    const [rows] = await this._getExecutor(conn).query(sql, [id]);
    return rows[0] || null;
  }

  async create(tree, conn = null) {
    const sql = `
      INSERT INTO trees (id, nama_silsilah, created_by_user_id, max_members)
      VALUES (?, ?, ?, ?)
    `;
    await this._getExecutor(conn).query(sql, [
      tree.id,
      tree.nama_silsilah,
      tree.created_by_user_id,
      tree.max_members || 30,
    ]);
    return this.findById(tree.id, conn);
  }

  async update(id, { nama_silsilah }, conn = null) {
    const sql = `UPDATE trees SET nama_silsilah = ? WHERE id = ?`;
    await this._getExecutor(conn).query(sql, [nama_silsilah, id]);
    return this.findById(id, conn);
  }

  async addMember(treeMember, conn = null) {
    const sql = `
      INSERT INTO tree_members (id, tree_id, user_id, role)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE role = VALUES(role)
    `;
    await this._getExecutor(conn).query(sql, [
      treeMember.id,
      treeMember.tree_id,
      treeMember.user_id,
      treeMember.role,
    ]);
    return this.getUserRoleInTree(treeMember.tree_id, treeMember.user_id, conn);
  }

  async getUserRoleInTree(treeId, userId, conn = null) {
    const sql = `SELECT role FROM tree_members WHERE tree_id = ? AND user_id = ?`;
    const [rows] = await this._getExecutor(conn).query(sql, [treeId, userId]);
    return rows[0]?.role || null;
  }

  async getTreesForUser(userId, conn = null) {
    // Multi-Universe: ambil semua pohon yang diikuti pengguna beserta perannya
    const sql = `
      SELECT 
        t.id, t.nama_silsilah, t.created_by_user_id, t.max_members, 
        t.membership_plan, t.membership_expires_at, t.membership_status,
        t.created_at, tm.role
      FROM trees t
      INNER JOIN tree_members tm ON t.id = tm.tree_id
      WHERE tm.user_id = ?
      ORDER BY t.created_at DESC
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [userId]);
    return rows;
  }

  async getCollaboratorsInTree(treeId, conn = null) {
    const sql = `
      SELECT tm.id, tm.tree_id, tm.user_id, tm.role, tm.created_at, u.email, u.nama_lengkap, u.avatar_url
      FROM tree_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.tree_id = ?
      ORDER BY FIELD(tm.role, 'ADMIN_UTAMA', 'KONTRIBUTOR', 'VIEWER'), tm.created_at ASC
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [treeId]);
    return rows;
  }

  async countOwnedTrees(userId, conn = null) {
    const sql = `SELECT COUNT(*) AS count FROM trees WHERE created_by_user_id = ?`;
    const [rows] = await this._getExecutor(conn).query(sql, [userId]);
    return Number(rows[0]?.count) || 0;
  }

  async countInvitedCollaborators(treeId, conn = null) {
    const sql = `
      SELECT COUNT(*) AS count
      FROM tree_members tm
      INNER JOIN trees t ON tm.tree_id = t.id
      WHERE tm.tree_id = ? AND tm.user_id != t.created_by_user_id
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [treeId]);
    return Number(rows[0]?.count) || 0;
  }
}

module.exports = TreeRepository;

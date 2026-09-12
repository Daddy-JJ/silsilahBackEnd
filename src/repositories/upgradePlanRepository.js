class UpgradePlanRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _getExecutor(conn) {
    return conn || this.pool;
  }

  async findAll(activeOnly = false, conn = null) {
    let sql = 'SELECT * FROM upgrade_plans';
    const params = [];
    if (activeOnly) {
      sql += ' WHERE is_active = TRUE';
    }
    sql += ' ORDER BY urutan ASC, target_max_members ASC';
    const [rows] = await this._getExecutor(conn).query(sql, params);
    return rows;
  }

  async findById(id, conn = null) {
    const sql = 'SELECT * FROM upgrade_plans WHERE id = ?';
    const [rows] = await this._getExecutor(conn).query(sql, [id]);
    return rows[0] || null;
  }

  async findByKode(kode, conn = null) {
    const sql = 'SELECT * FROM upgrade_plans WHERE kode_paket = ?';
    const [rows] = await this._getExecutor(conn).query(sql, [kode]);
    return rows[0] || null;
  }

  async create(plan, conn = null) {
    const sql = `
      INSERT INTO upgrade_plans (
        id, kode_paket, nama_paket, deskripsi, target_max_members,
        target_max_trees, target_max_collaborators, harga_normal, harga_promo,
        is_promo_active, promo_badge, is_active, urutan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this._getExecutor(conn).query(sql, [
      plan.id,
      plan.kode_paket,
      plan.nama_paket,
      plan.deskripsi || null,
      plan.target_max_members,
      plan.target_max_trees || 1,
      plan.target_max_collaborators || 3,
      plan.harga_normal,
      plan.harga_promo || null,
      plan.is_promo_active ? 1 : 0,
      plan.promo_badge || null,
      plan.is_active !== undefined ? (plan.is_active ? 1 : 0) : 1,
      plan.urutan || 0,
    ]);
    return this.findById(plan.id, conn);
  }

  async update(id, patch, conn = null) {
    const allowed = [
      'kode_paket',
      'nama_paket',
      'deskripsi',
      'target_max_members',
      'target_max_trees',
      'target_max_collaborators',
      'harga_normal',
      'harga_promo',
      'is_promo_active',
      'promo_badge',
      'is_active',
      'urutan',
    ];

    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (patch[key] !== undefined) {
        fields.push(`${key} = ?`);
        let val = patch[key];
        if (typeof val === 'boolean') val = val ? 1 : 0;
        values.push(val);
      }
    }

    if (fields.length === 0) {
      return this.findById(id, conn);
    }

    const sql = `UPDATE upgrade_plans SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    await this._getExecutor(conn).query(sql, values);
    return this.findById(id, conn);
  }

  async delete(id, conn = null) {
    const sql = 'DELETE FROM upgrade_plans WHERE id = ?';
    const [res] = await this._getExecutor(conn).query(sql, [id]);
    return res.affectedRows > 0;
  }
}

module.exports = UpgradePlanRepository;

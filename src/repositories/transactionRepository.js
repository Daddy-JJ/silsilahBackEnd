class TransactionRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _getExecutor(conn) {
    return conn || this.pool;
  }

  async create(tx, conn = null) {
    const sql = `
      INSERT INTO transactions (
        id, merchant_order_id, user_id, tree_id, plan_id,
        amount, payment_method, duitku_reference, duitku_payment_url,
        status, paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this._getExecutor(conn).query(sql, [
      tx.id,
      tx.merchant_order_id,
      tx.user_id,
      tx.tree_id,
      tx.plan_id,
      tx.amount,
      tx.payment_method,
      tx.duitku_reference || null,
      tx.duitku_payment_url || null,
      tx.status || 'PENDING',
      tx.paid_at || null,
    ]);
    return this.findById(tx.id, conn);
  }

  async findById(id, conn = null) {
    const sql = `
      SELECT t.*, u.nama_lengkap as user_nama, p.nama_paket, tr.nama_silsilah
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN upgrade_plans p ON t.plan_id = p.id
      LEFT JOIN trees tr ON t.tree_id = tr.id
      WHERE t.id = ?
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [id]);
    return rows[0] || null;
  }

  async findByMerchantOrderId(orderId, conn = null) {
    const sql = `
      SELECT t.*, u.nama_lengkap as user_nama, p.nama_paket, p.target_max_members, tr.nama_silsilah
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN upgrade_plans p ON t.plan_id = p.id
      LEFT JOIN trees tr ON t.tree_id = tr.id
      WHERE t.merchant_order_id = ?
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [orderId]);
    return rows[0] || null;
  }

  async findByMerchantOrderIdWithLock(orderId, conn) {
    const sql = `
      SELECT t.*, p.target_max_members
      FROM transactions t
      LEFT JOIN upgrade_plans p ON t.plan_id = p.id
      WHERE t.merchant_order_id = ?
      FOR UPDATE
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [orderId]);
    return rows[0] || null;
  }

  async updateStatus(orderId, status, { paid_at = null, duitku_reference = null } = {}, conn = null) {
    const fields = ['status = ?'];
    const values = [status];

    if (paid_at !== null) {
      fields.push('paid_at = ?');
      values.push(paid_at);
    }
    if (duitku_reference !== null) {
      fields.push('duitku_reference = ?');
      values.push(duitku_reference);
    }

    values.push(orderId);
    const sql = `UPDATE transactions SET ${fields.join(', ')} WHERE merchant_order_id = ?`;
    await this._getExecutor(conn).query(sql, values);
    return this.findByMerchantOrderId(orderId, conn);
  }

  async findAll(limit = 50, offset = 0, conn = null) {
    const sql = `
      SELECT t.*, u.nama_lengkap as user_nama, p.nama_paket, tr.nama_silsilah
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN upgrade_plans p ON t.plan_id = p.id
      LEFT JOIN trees tr ON t.tree_id = tr.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await this._getExecutor(conn).query(sql, [limit, offset]);
    return rows;
  }

  async getTotalOmset(conn = null) {
    const sql = `SELECT COALESCE(SUM(amount), 0) AS total_omset FROM transactions WHERE status = 'SUCCESS'`;
    const [rows] = await this._getExecutor(conn).query(sql);
    return Number(rows[0]?.total_omset || 0);
  }
}

module.exports = TransactionRepository;

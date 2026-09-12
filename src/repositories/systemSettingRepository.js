class SystemSettingRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _getExecutor(conn) {
    return conn || this.pool;
  }

  async getAll(conn = null) {
    const sql = 'SELECT * FROM system_settings';
    const [rows] = await this._getExecutor(conn).query(sql);
    const settingsMap = {};
    for (const row of rows) {
      settingsMap[row.setting_key] = row.setting_value;
    }
    return { list: rows, map: settingsMap };
  }

  async get(key, defaultValue = null, conn = null) {
    const sql = 'SELECT setting_value FROM system_settings WHERE setting_key = ?';
    const [rows] = await this._getExecutor(conn).query(sql, [key]);
    if (rows.length === 0) return defaultValue;
    return rows[0].setting_value;
  }

  async set(key, value, description = null, conn = null) {
    const sql = `
      INSERT INTO system_settings (setting_key, setting_value, description)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        description = COALESCE(VALUES(description), description)
    `;
    await this._getExecutor(conn).query(sql, [key, String(value), description]);
    return this.get(key, null, conn);
  }

  async setMany(settingsObject, conn = null) {
    for (const [key, value] of Object.entries(settingsObject)) {
      if (value !== undefined && value !== null) {
        await this.set(key, String(value), null, conn);
      }
    }
    return this.getAll(conn);
  }
}

module.exports = SystemSettingRepository;

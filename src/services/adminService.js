const { v4: uuidv4 } = require('uuid');
const { NotFoundError, BadRequestError, ConflictError } = require('../errors/AppError');

class AdminService {
  constructor(upgradePlanRepository, systemSettingRepository, transactionRepository, userRepository, pool) {
    this.upgradePlanRepository = upgradePlanRepository;
    this.systemSettingRepository = systemSettingRepository;
    this.transactionRepository = transactionRepository;
    this.userRepository = userRepository;
    this.pool = pool;
  }

  async getStats() {
    const conn = await this.pool.getConnection();
    try {
      const [[{ totalUsers }]] = await conn.query('SELECT COUNT(*) as totalUsers FROM users');
      const [[{ totalTrees }]] = await conn.query('SELECT COUNT(*) as totalTrees FROM trees');
      const [[{ totalNodes }]] = await conn.query('SELECT COUNT(*) as totalNodes FROM family_members');
      const [[{ totalTransactions }]] = await conn.query('SELECT COUNT(*) as totalTransactions FROM transactions');
      const [[{ successfulTransactions }]] = await conn.query(
        "SELECT COUNT(*) as successfulTransactions FROM transactions WHERE status = 'SUCCESS'"
      );
      const omset = await this.transactionRepository.getTotalOmset(conn);

      return {
        totalUsers,
        totalTrees,
        totalNodes,
        totalTransactions,
        successfulTransactions,
        omset,
      };
    } finally {
      conn.release();
    }
  }

  // --- Upgrade Plans CRUD ---
  async getPlans(activeOnly = false) {
    return this.upgradePlanRepository.findAll(activeOnly);
  }

  async getPlanById(id) {
    const plan = await this.upgradePlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundError('Paket upgrade tidak ditemukan.');
    }
    return plan;
  }

  async createPlan(data) {
    const existing = await this.upgradePlanRepository.findByKode(data.kode_paket);
    if (existing) {
      throw new ConflictError(`Paket dengan kode '${data.kode_paket}' sudah ada.`);
    }

    const planId = uuidv4();
    return this.upgradePlanRepository.create({
      id: planId,
      ...data,
    });
  }

  async updatePlan(id, data) {
    const plan = await this.upgradePlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundError('Paket upgrade tidak ditemukan.');
    }

    if (data.kode_paket && data.kode_paket !== plan.kode_paket) {
      const existing = await this.upgradePlanRepository.findByKode(data.kode_paket);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Paket dengan kode '${data.kode_paket}' sudah digunakan paket lain.`);
      }
    }

    return this.upgradePlanRepository.update(id, data);
  }

  async deletePlan(id) {
    const plan = await this.upgradePlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundError('Paket upgrade tidak ditemukan.');
    }

    const deleted = await this.upgradePlanRepository.delete(id);
    return { success: deleted, id };
  }

  // --- System Settings ---
  async getSettings() {
    const { list, map } = await this.systemSettingRepository.getAll();
    
    // Mask sensitive keys for safety when returning to client
    const maskedMap = { ...map };
    if (maskedMap.duitku_api_key && maskedMap.duitku_api_key.length > 8) {
      const visible = maskedMap.duitku_api_key.slice(-4);
      maskedMap.duitku_api_key_preview = `****${visible}`;
    }

    return {
      list,
      settings: maskedMap,
    };
  }

  async updateSettings(settingsObject) {
    if (!settingsObject || typeof settingsObject !== 'object') {
      throw new BadRequestError('Data pengaturan tidak valid.');
    }

    // Do not overwrite secret if user passes masked placeholder
    const cleanSettings = { ...settingsObject };
    if (cleanSettings.duitku_api_key && cleanSettings.duitku_api_key.startsWith('****')) {
      delete cleanSettings.duitku_api_key;
    }

    await this.systemSettingRepository.setMany(cleanSettings);
    return this.getSettings();
  }

  async getTransactions(limit = 50, offset = 0) {
    return this.transactionRepository.findAll(Number(limit), Number(offset));
  }

  // --- Users CRUD ---
  async getAllUsers() {
    const conn = await this.pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT id, email, nama_lengkap, auth_provider, is_verified, system_role, created_at FROM users ORDER BY created_at DESC');
      return rows;
    } finally {
      conn.release();
    }
  }

  async getUserById(id) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User tidak ditemukan.');
    }
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  async updateUserRole(id, role) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User tidak ditemukan.');
    }
    const conn = await this.pool.getConnection();
    try {
      await conn.query('UPDATE users SET system_role = ? WHERE id = ?', [role, id]);
      return { id, system_role: role };
    } finally {
      conn.release();
    }
  }

  async deleteUser(id) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User tidak ditemukan.');
    }
    const conn = await this.pool.getConnection();
    try {
      await conn.query('DELETE FROM users WHERE id = ?', [id]);
      return { success: true, id };
    } finally {
      conn.release();
    }
  }

  async getAllTrees() {
    const conn = await this.pool.getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT 
          t.id, 
          t.nama_silsilah, 
          t.max_members, 
          t.membership_plan, 
          t.membership_expires_at, 
          t.membership_status, 
          t.created_at,
          u.nama_lengkap as creator_name,
          u.email as creator_email,
          (SELECT COUNT(*) FROM family_members WHERE tree_id = t.id) as total_members
        FROM trees t
        LEFT JOIN users u ON t.created_by_user_id = u.id
        ORDER BY t.created_at DESC
      `);
      return rows;
    } finally {
      conn.release();
    }
  }

  async updateTreeMembership(treeId, {
    membership_plan,
    max_members,
    membership_status = 'ACTIVE',
    membership_expires_at = null,
    duration_months = null
  }) {
    const conn = await this.pool.getConnection();
    try {
      const [trees] = await conn.query('SELECT * FROM trees WHERE id = ?', [treeId]);
      if (trees.length === 0) {
        throw new NotFoundError('Pohon keluarga tidak ditemukan.');
      }
      const currentTree = trees[0];

      let finalExpiresAt = membership_expires_at;

      if (membership_status === 'LIFETIME') {
        finalExpiresAt = null;
      } else if (duration_months && !finalExpiresAt) {
        const currentExp = currentTree.membership_expires_at ? new Date(currentTree.membership_expires_at) : null;
        const now = new Date();
        const baseDate = (currentExp && currentExp > now) ? currentExp : now;
        baseDate.setMonth(baseDate.getMonth() + Number(duration_months));
        const pad = (n) => String(n).padStart(2, '0');
        finalExpiresAt = `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())} ${pad(baseDate.getHours())}:${pad(baseDate.getMinutes())}:${pad(baseDate.getSeconds())}`;
      } else if (finalExpiresAt) {
        const d = new Date(finalExpiresAt);
        if (!isNaN(d.getTime())) {
          const pad = (n) => String(n).padStart(2, '0');
          finalExpiresAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
      }

      await conn.query(`
        UPDATE trees
        SET 
          membership_plan = ?,
          max_members = ?,
          membership_status = ?,
          membership_expires_at = ?
        WHERE id = ?
      `, [
        membership_plan,
        Number(max_members),
        membership_status,
        finalExpiresAt,
        treeId
      ]);

      const [updatedRows] = await conn.query(`
        SELECT 
          t.id, 
          t.nama_silsilah, 
          t.max_members, 
          t.membership_plan, 
          t.membership_expires_at, 
          t.membership_status, 
          t.created_at,
          u.nama_lengkap as creator_name,
          u.email as creator_email,
          (SELECT COUNT(*) FROM family_members WHERE tree_id = t.id) as total_members
        FROM trees t
        LEFT JOIN users u ON t.created_by_user_id = u.id
        WHERE t.id = ?
      `, [treeId]);

      return updatedRows[0];
    } finally {
      conn.release();
    }
  }
}

module.exports = AdminService;

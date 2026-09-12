const { sendSuccess } = require('../utils/apiResponse');

class AdminController {
  constructor(adminService) {
    this.adminService = adminService;
  }

  getStats = async (req, res, next) => {
    try {
      const stats = await this.adminService.getStats();
      return sendSuccess(res, stats, 'Statistik admin berhasil diambil');
    } catch (err) {
      next(err);
    }
  };

  getPlans = async (req, res, next) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const plans = await this.adminService.getPlans(activeOnly);
      return sendSuccess(res, plans, 'Daftar paket upgrade berhasil diambil');
    } catch (err) {
      next(err);
    }
  };

  getPlanById = async (req, res, next) => {
    try {
      const plan = await this.adminService.getPlanById(req.params.id);
      return sendSuccess(res, plan, 'Detail paket upgrade berhasil diambil');
    } catch (err) {
      next(err);
    }
  };

  createPlan = async (req, res, next) => {
    try {
      const plan = await this.adminService.createPlan(req.body);
      return sendSuccess(res, plan, 'Paket upgrade baru berhasil dibuat', 201);
    } catch (err) {
      next(err);
    }
  };

  updatePlan = async (req, res, next) => {
    try {
      const plan = await this.adminService.updatePlan(req.params.id, req.body);
      return sendSuccess(res, plan, 'Paket upgrade berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  };

  deletePlan = async (req, res, next) => {
    try {
      const result = await this.adminService.deletePlan(req.params.id);
      return sendSuccess(res, result, 'Paket upgrade berhasil dihapus');
    } catch (err) {
      next(err);
    }
  };

  getSettings = async (req, res, next) => {
    try {
      const data = await this.adminService.getSettings();
      return sendSuccess(res, data, 'Pengaturan sistem berhasil diambil');
    } catch (err) {
      next(err);
    }
  };

  updateSettings = async (req, res, next) => {
    try {
      const data = await this.adminService.updateSettings(req.body);
      return sendSuccess(res, data, 'Pengaturan sistem berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  };

  getTransactions = async (req, res, next) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const txs = await this.adminService.getTransactions(limit, offset);
      return sendSuccess(res, txs, 'Daftar transaksi berhasil diambil');
    } catch (err) {
      next(err);
    }
  };
}

module.exports = AdminController;

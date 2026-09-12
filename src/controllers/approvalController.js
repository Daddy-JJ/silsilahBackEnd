const { sendSuccess } = require('../utils/apiResponse');

class ApprovalController {
  constructor(approvalService) {
    this.approvalService = approvalService;
  }

  propose = async (req, res, next) => {
    try {
      const approval = await this.approvalService.proposeChange(
        req.params.treeId,
        req.user.id,
        req.body
      );
      return sendSuccess(res, approval, 'Usulan perubahan berhasil diajukan untuk ditinjau', 201);
    } catch (error) {
      next(error);
    }
  };

  getApprovals = async (req, res, next) => {
    try {
      const { status, page, limit } = req.query;
      const list = await this.approvalService.getApprovals(
        req.params.treeId, 
        status || null, 
        page ? parseInt(page) : 1, 
        limit ? parseInt(limit) : 50
      );
      return sendSuccess(res, list, 'Daftar usulan perubahan berhasil diambil', 200);
    } catch (error) {
      next(error);
    }
  };

  getApprovalById = async (req, res, next) => {
    try {
      const item = await this.approvalService.getApprovalById(req.params.treeId, req.params.approvalId);
      return sendSuccess(res, item, 'Detail usulan perubahan berhasil diambil', 200);
    } catch (error) {
      next(error);
    }
  };

  resolve = async (req, res, next) => {
    try {
      const result = await this.approvalService.resolveApproval(
        req.params.treeId,
        req.params.approvalId,
        req.user.id,
        req.body
      );
      return sendSuccess(res, result, 'Usulan perubahan berhasil diproses', 200);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = ApprovalController;

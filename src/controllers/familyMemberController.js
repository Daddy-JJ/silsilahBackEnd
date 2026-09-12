const { sendSuccess } = require('../utils/apiResponse');

class FamilyMemberController {
  constructor(familyMemberService) {
    this.familyMemberService = familyMemberService;
  }

  getMembers = async (req, res, next) => {
    try {
      const members = await this.familyMemberService.getMembersByTreeId(req.params.treeId);
      return sendSuccess(res, members, 'Daftar anggota keluarga berhasil diambil', 200);
    } catch (error) {
      next(error);
    }
  };

  getCanvas = async (req, res, next) => {
    try {
      const canvasData = await this.familyMemberService.getReactFlowCanvas(req.params.treeId);
      return sendSuccess(res, canvasData, 'Format canvas React Flow berhasil dihasilkan', 200);
    } catch (error) {
      next(error);
    }
  };

  getMemberById = async (req, res, next) => {
    try {
      const member = await this.familyMemberService.getMemberById(
        req.params.treeId,
        req.params.memberId
      );
      return sendSuccess(res, member, 'Data anggota keluarga berhasil diambil', 200);
    } catch (error) {
      next(error);
    }
  };

  addMember = async (req, res, next) => {
    try {
      const member = await this.familyMemberService.addMember(
        req.params.treeId,
        req.user.id,
        req.body
      );
      return sendSuccess(res, member, 'Anggota keluarga berhasil ditambahkan', 201);
    } catch (error) {
      next(error);
    }
  };

  updateMemberDirect = async (req, res, next) => {
    try {
      const { version, patch_data } = req.body;
      const updated = await this.familyMemberService.updateMemberDirect(
        req.params.treeId,
        req.params.memberId,
        version,
        patch_data
      );
      return sendSuccess(res, updated, 'Data anggota keluarga berhasil diperbarui', 200);
    } catch (error) {
      next(error);
    }
  };

  deleteMember = async (req, res, next) => {
    try {
      const result = await this.familyMemberService.deleteMember(
        req.params.treeId,
        req.params.memberId
      );
      return sendSuccess(res, result, 'Anggota keluarga berhasil dihapus', 200);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = FamilyMemberController;

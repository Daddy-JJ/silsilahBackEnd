const { sendSuccess } = require('../utils/apiResponse');

class TreeController {
  constructor(treeService) {
    this.treeService = treeService;
  }

  createTree = async (req, res, next) => {
    try {
      const result = await this.treeService.createTree(req.user.id, req.body);
      return sendSuccess(res, result, 'Semesta pohon keluarga berhasil dibuat', 201);
    } catch (error) {
      next(error);
    }
  };

  getUserTrees = async (req, res, next) => {
    try {
      const trees = await this.treeService.getUserTrees(req.user.id);
      return sendSuccess(res, trees, 'Daftar pohon keluarga berhasil diambil', 200);
    } catch (error) {
      next(error);
    }
  };

  getTreeById = async (req, res, next) => {
    try {
      const tree = await this.treeService.getTreeById(req.params.treeId, req.user.id);
      return sendSuccess(res, tree, 'Detail pohon keluarga berhasil diambil', 200);
    } catch (error) {
      next(error);
    }
  };

  getCollaborators = async (req, res, next) => {
    try {
      const collaborators = await this.treeService.getCollaborators(req.params.treeId);
      return sendSuccess(res, collaborators, 'Daftar kolaborator berhasil diambil', 200);
    } catch (error) {
      next(error);
    }
  };

  addTreeMember = async (req, res, next) => {
    try {
      const member = await this.treeService.addMemberToTree(
        req.params.treeId,
        req.user.id,
        req.body
      );
      return sendSuccess(res, member, 'Anggota pohon berhasil ditambahkan', 201);
    } catch (error) {
      next(error);
    }
  };

  updateTree = async (req, res, next) => {
    try {
      const tree = await this.treeService.updateTree(
        req.params.treeId,
        req.user.id,
        req.body
      );
      return sendSuccess(res, tree, 'Nama semesta silsilah berhasil diperbarui', 200);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = TreeController;

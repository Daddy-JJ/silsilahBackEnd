const { sendSuccess } = require('../utils/apiResponse');

class MarriageController {
  constructor(marriageService) {
    this.marriageService = marriageService;
  }

  getMarriages = async (req, res, next) => {
    try {
      const list = await this.marriageService.getMarriagesByTreeId(req.params.treeId);
      return sendSuccess(res, list, 'Daftar pernikahan berhasil diambil', 200);
    } catch (error) {
      next(error);
    }
  };

  addMarriage = async (req, res, next) => {
    try {
      const marriage = await this.marriageService.addMarriage(req.params.treeId, req.body);
      return sendSuccess(res, marriage, 'Pernikahan berhasil ditambahkan', 201);
    } catch (error) {
      next(error);
    }
  };

  deleteMarriage = async (req, res, next) => {
    try {
      const result = await this.marriageService.deleteMarriage(req.params.treeId, req.params.marriageId);
      return sendSuccess(res, result, 'Pernikahan berhasil dihapus', 200);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = MarriageController;

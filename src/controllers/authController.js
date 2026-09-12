const { sendSuccess } = require('../utils/apiResponse');

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  register = async (req, res, next) => {
    try {
      const result = await this.authService.register(req.body);
      return sendSuccess(res, result, 'Registrasi berhasil', 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const result = await this.authService.login(req.body);
      return sendSuccess(res, result, 'Login berhasil', 200);
    } catch (error) {
      next(error);
    }
  };

  googleLogin = async (req, res, next) => {
    try {
      const result = await this.authService.loginWithGoogle(req.body);
      return sendSuccess(res, result, 'Login dengan Google berhasil', 200);
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req, res, next) => {
    try {
      const user = await this.authService.getProfile(req.user.id);
      return sendSuccess(res, user, 'Data profil berhasil diambil', 200);
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req, res, next) => {
    try {
      const result = await this.authService.forgotPassword(req.body.email);
      return sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const result = await this.authService.resetPassword(req.body);
      return sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req, res, next) => {
    try {
      const result = await this.authService.updateProfile(req.user.id, req.body);
      return sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req, res, next) => {
    try {
      const result = await this.authService.changePassword(req.user.id, req.body);
      return sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  };

  getMyInvitations = async (req, res, next) => {
    try {
      const result = await this.authService.getMyInvitations(req.user.id);
      return sendSuccess(res, result, 'Daftar riwayat undangan berhasil diambil', 200);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = AuthController;

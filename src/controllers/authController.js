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
}

module.exports = AuthController;

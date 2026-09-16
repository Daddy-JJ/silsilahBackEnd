const { sendSuccess } = require('../utils/apiResponse');

class FeedbackController {
  constructor(feedbackService) {
    this.feedbackService = feedbackService;
  }

  submitFeedback = async (req, res, next) => {
    try {
      const result = await this.feedbackService.submitFeedback(req.user, req.body);
      return sendSuccess(res, result, 'Terima kasih! Masukan Anda telah berhasil diterima.', 201);
    } catch (err) {
      next(err);
    }
  };

  getAllFeedbacks = async (req, res, next) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;
      const feedbacks = await this.feedbackService.getAllFeedbacks(limit, offset);
      return sendSuccess(res, feedbacks, 'Daftar masukan pengguna berhasil diambil');
    } catch (err) {
      next(err);
    }
  };
}

module.exports = FeedbackController;

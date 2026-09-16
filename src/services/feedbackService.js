const { v4: uuidv4 } = require('uuid');

class FeedbackService {
  constructor(feedbackRepository, emailService = null) {
    this.feedbackRepository = feedbackRepository;
    this.emailService = emailService;
  }

  async submitFeedback(user, { category, message }) {
    const feedbackId = uuidv4();

    // 1. Simpan record feedback ke database
    const createdFeedback = await this.feedbackRepository.create({
      id: feedbackId,
      user_id: user.id,
      category,
      message,
    });

    // 2. Kirim notifikasi email ke tim support dengan Reply-To email pengguna
    if (this.emailService) {
      this.emailService
        .sendFeedbackNotificationEmail({
          user,
          category,
          message,
        })
        .catch(err =>
          console.error('[FeedbackService] Gagal kirim email notifikasi feedback:', err.message)
        );
    }

    return {
      id: createdFeedback.id,
      category: createdFeedback.category,
      message: createdFeedback.message,
      createdAt: createdFeedback.created_at,
    };
  }

  async getAllFeedbacks(limit = 50, offset = 0) {
    return this.feedbackRepository.findAll(limit, offset);
  }
}

module.exports = FeedbackService;

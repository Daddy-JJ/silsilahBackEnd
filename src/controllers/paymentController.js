const { sendSuccess } = require('../utils/apiResponse');

class PaymentController {
  constructor(paymentService) {
    this.paymentService = paymentService;
  }

  getPublicPlans = async (req, res, next) => {
    try {
      const plans = await this.paymentService.getPublicPlans();
      return sendSuccess(res, plans, 'Daftar paket upgrade berhasil diambil');
    } catch (err) {
      next(err);
    }
  };

  inquiry = async (req, res, next) => {
    try {
      const result = await this.paymentService.createInquiry(req.user, req.body);
      return sendSuccess(res, result, 'Inquiry pembayaran berhasil dibuat', 201);
    } catch (err) {
      next(err);
    }
  };

  duitkuCallback = async (req, res, next) => {
    try {
      // Duitku sends data via POST body (json or x-www-form-urlencoded)
      const payload = req.body;
      const result = await this.paymentService.handleDuitkuCallback(payload);

      // Return 200 OK to Duitku
      return res.status(200).json(result);
    } catch (err) {
      // If error occurs, pass to error handler or respond 400 for bad signature
      next(err);
    }
  };

  getTransactionStatus = async (req, res, next) => {
    try {
      const { merchantOrderId } = req.params;
      const tx = await this.paymentService.getTransactionStatus(merchantOrderId);
      return sendSuccess(res, tx, 'Status transaksi berhasil diambil');
    } catch (err) {
      next(err);
    }
  };
}

module.exports = PaymentController;

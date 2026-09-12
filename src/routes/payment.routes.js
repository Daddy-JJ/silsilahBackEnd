const express = require('express');
const { validateBody } = require('../middlewares/validate.middleware');
const { paymentInquirySchema } = require('../validations');

function createPaymentRoutes({ paymentController, authMiddleware }) {
  const router = express.Router();

  // 1. Publik: Daftar paket aktif untuk halaman pricing / upgrade dialog
  router.get('/plans', paymentController.getPublicPlans);

  // 2. Terproteksi: Inquiry pembuatan pesanan & QRIS / URL pembayaran Duitku
  router.post(
    '/inquiry',
    authMiddleware,
    validateBody(paymentInquirySchema),
    paymentController.inquiry
  );

  // 3. Webhook Duitku: Notifikasi pembayaran instan dari server Duitku
  // Publik (diproteksi via MD5 signature check di paymentService)
  router.post('/duitku/callback', paymentController.duitkuCallback);

  // 4. Terproteksi: Cek status transaksi pembayaran
  router.get(
    '/transactions/:merchantOrderId',
    authMiddleware,
    paymentController.getTransactionStatus
  );

  return router;
}

module.exports = createPaymentRoutes;

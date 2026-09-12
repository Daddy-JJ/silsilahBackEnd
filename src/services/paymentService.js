const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  UnprocessableEntityError,
} = require('../errors/AppError');

class PaymentService {
  constructor(
    transactionRepository,
    upgradePlanRepository,
    systemSettingRepository,
    treeRepository,
    pool
  ) {
    this.transactionRepository = transactionRepository;
    this.upgradePlanRepository = upgradePlanRepository;
    this.systemSettingRepository = systemSettingRepository;
    this.treeRepository = treeRepository;
    this.pool = pool;
  }

  async getPublicPlans() {
    return this.upgradePlanRepository.findAll(true);
  }

  /**
   * Helper untuk menghitung MD5 signature
   */
  _generateMd5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * Duitku Inquiry Endpoint
   * Membuat transaksi PENDING dan meminta URL/QRIS dari Duitku
   */
  async createInquiry(user, { treeId, planId, paymentMethod = 'SP', returnUrl }) {
    // 1. Verifikasi User & Tree Role (Hanya ADMIN_UTAMA yang berhak upgrade)
    const tree = await this.treeRepository.findById(treeId);
    if (!tree) {
      throw new NotFoundError('Pohon keluarga tidak ditemukan.');
    }

    const role = await this.treeRepository.getUserRoleInTree(treeId, user.id);
    if (role !== 'ADMIN_UTAMA' && user.system_role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Hanya ADMIN_UTAMA dari pohon ini yang dapat melakukan upgrade.');
    }

    // 2. Verifikasi Paket Upgrade
    const plan = await this.upgradePlanRepository.findById(planId);
    if (!plan || !plan.is_active) {
      throw new NotFoundError('Paket upgrade tidak ditemukan atau sudah tidak aktif.');
    }

    // Tentukan harga (prioritas harga promo jika aktif)
    const finalAmount =
      plan.is_promo_active && plan.harga_promo && Number(plan.harga_promo) > 0
        ? Number(plan.harga_promo)
        : Number(plan.harga_normal);

    if (finalAmount <= 0) {
      throw new UnprocessableEntityError('Nominal pembayaran paket tidak valid.');
    }

    // 3. Ambil Kredensial Duitku dari system_settings
    const { map: settings } = await this.systemSettingRepository.getAll();
    const merchantCode = settings.duitku_merchant_code || '';
    const apiKey = settings.duitku_api_key || '';
    const environment = settings.duitku_environment || 'sandbox';

    // 4. Generate Unique Merchant Order ID
    const timestamp = Date.now();
    const shortUuid = uuidv4().split('-')[0];
    const merchantOrderId = `ORD-${timestamp}-${shortUuid}`.toUpperCase();

    // Duitku signature for v2 inquiry: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
    const signature = this._generateMd5(`${merchantCode}${merchantOrderId}${finalAmount}${apiKey}`);

    const duitkuInquiryUrl =
      environment === 'production'
        ? 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry'
        : 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry';

    // Siapkan payload Duitku
    const backendCallbackUrl =
      process.env.BACKEND_CALLBACK_URL ||
      'http://localhost:5000/api/v1/payments/duitku/callback';

    const defaultReturnUrl =
      returnUrl ||
      `${process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0].trim() : 'http://localhost:3001'}/trees/${treeId}?payment=finish`;

    const inquiryPayload = {
      paymentAmount: finalAmount,
      paymentMethod,
      merchantOrderId,
      productDetails: `Upgrade Silsilah - ${plan.nama_paket} (${plan.target_max_members} Anggota)`,
      additionalParam: JSON.stringify({ treeId, planId, userId: user.id }),
      merchantUserInfo: user.id,
      customerVaName: user.nama_lengkap || 'Pengguna Silsilah',
      email: user.email,
      phoneNumber: '08123456789',
      callbackUrl: backendCallbackUrl,
      returnUrl: defaultReturnUrl,
      signature,
      expiryPeriod: 1440, // 24 jam
    };

    let duitkuResponse = null;
    let paymentUrl = null;
    let qrString = null;
    let reference = null;

    // 5. Panggil Duitku API jika kredensial nyata sudah terisi
    const isTestCredentials =
      !merchantCode ||
      !apiKey ||
      merchantCode.startsWith('D12345') ||
      apiKey.includes('test') ||
      apiKey.includes('sandbox_123');

    if (merchantCode && apiKey && !isTestCredentials) {
      try {
        const res = await fetch(duitkuInquiryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(inquiryPayload),
        });

        const data = await res.json();
        if (data.statusCode === '00' && (data.paymentUrl || data.qrString)) {
          duitkuResponse = data;
          paymentUrl = data.paymentUrl || null;
          qrString = data.qrString || null;
          reference = data.reference || null;
        } else {
          throw new BadRequestError(
            `Duitku Inquiry Error: ${data.statusMessage || 'Gagal membuat pembayaran di payment gateway'}`,
            data
          );
        }
      } catch (err) {
        if (err instanceof BadRequestError) throw err;
        throw new BadRequestError(`Gagal menghubungi server Duitku: ${err.message}`);
      }
    } else {
      // Sandbox Simulator fallback jika belum ada API key Duitku di DB atau menggunakan mock test key
      paymentUrl = `https://sandbox.duitku.com/simulator?orderId=${merchantOrderId}`;
      reference = `SIM-${timestamp}`;
    }

    // 6. Simpan transaksi di database dengan status PENDING
    const txId = uuidv4();
    const createdTx = await this.transactionRepository.create({
      id: txId,
      merchant_order_id: merchantOrderId,
      user_id: user.id,
      tree_id: treeId,
      plan_id: planId,
      amount: finalAmount,
      payment_method: paymentMethod,
      duitku_reference: reference,
      duitku_payment_url: paymentUrl,
      status: 'PENDING',
    });

    return {
      transaction: createdTx,
      merchantOrderId,
      paymentUrl,
      qrString,
      reference,
      amount: finalAmount,
      plan: {
        id: plan.id,
        nama_paket: plan.nama_paket,
        target_max_members: plan.target_max_members,
      },
    };
  }

  /**
   * Duitku Callback Webhook
   * Validasi signature md5(merchantCode + amount + merchantOrderId + apiKey)
   * Menggunakan Transaksi Database ACID + Pessimistic Lock + Idempotency
   */
  async handleDuitkuCallback(callbackData) {
    const {
      merchantCode,
      amount,
      merchantOrderId,
      signature: receivedSignature,
      resultCode,
      reference,
    } = callbackData;

    if (!merchantCode || !amount || !merchantOrderId || !receivedSignature) {
      throw new BadRequestError('Payload callback Duitku tidak lengkap.');
    }

    // 1. Ambil API Key Duitku untuk validasi Signature
    const { map: settings } = await this.systemSettingRepository.getAll();
    const apiKey = settings.duitku_api_key || '';
    const configuredMerchantCode = settings.duitku_merchant_code || '';

    // Jika merchant code di database diisi, pastikan cocok
    if (configuredMerchantCode && merchantCode !== configuredMerchantCode) {
      throw new BadRequestError('Merchant code callback tidak cocok.');
    }

    // 2. Validasi Signature Duitku:
    // Format standar Duitku: MD5(merchantCode + amount + merchantOrderId + apiKey)
    // Format alternatif / beberapa channel: MD5(merchantCode + merchantOrderId + amount + apiKey)
    const sigVariant1 = this._generateMd5(`${merchantCode}${amount}${merchantOrderId}${apiKey}`).toLowerCase();
    const sigVariant2 = this._generateMd5(`${merchantCode}${merchantOrderId}${amount}${apiKey}`).toLowerCase();
    const incomingSig = receivedSignature.toLowerCase();

    const compareSig = (expected, actual) => {
      const b1 = Buffer.from(expected);
      const b2 = Buffer.from(actual);
      return b1.length === b2.length && crypto.timingSafeEqual(b1, b2);
    };

    const isSigMatch = compareSig(sigVariant1, incomingSig) || compareSig(sigVariant2, incomingSig);

    if (!isSigMatch) {
      throw new BadRequestError('Invalid Duitku Signature. Akses ditolak.');
    }

    // 3. Mulai Transaksi Database
    const conn = await this.pool.getConnection();

    try {
      await conn.beginTransaction();

      // Kunci transaksi dengan FOR UPDATE untuk mencegah Race Condition / Double Callback
      const tx = await this.transactionRepository.findByMerchantOrderIdWithLock(merchantOrderId, conn);

      if (!tx) {
        throw new NotFoundError(`Transaksi dengan order ID '${merchantOrderId}' tidak ditemukan.`);
      }

      // IDEMPOTENCY CHECK: Jika sudah SUCCESS, langsung return OK tanpa menambah kuota lagi
      if (tx.status === 'SUCCESS') {
        await conn.commit();
        return {
          success: true,
          message: 'Transaksi sudah berhasil diproses sebelumnya (Idempotent OK).',
          merchantOrderId,
        };
      }

      // Validasi nominal callback tidak dimanipulasi
      if (Math.round(Number(amount)) !== Math.round(Number(tx.amount))) {
        throw new BadRequestError(
          `Nominal callback (${amount}) tidak sesuai dengan tagihan transaksi (${tx.amount}).`
        );
      }

      // 4. Periksa Result Code Duitku ('00' menandakan Sukses Bayar)
      if (resultCode === '00') {
        const now = new Date();

        // a. Update Status Transaksi -> SUCCESS
        await this.transactionRepository.updateStatus(
          merchantOrderId,
          'SUCCESS',
          {
            paid_at: now,
            duitku_reference: reference || tx.duitku_reference,
          },
          conn
        );

        // b. Ambil data pohon dengan Pessimistic Lock (FOR UPDATE)
        const [trees] = await conn.query('SELECT * FROM trees WHERE id = ? FOR UPDATE', [tx.tree_id]);
        if (trees.length === 0) {
          throw new NotFoundError('Pohon keluarga terkait transaksi ini tidak ditemukan.');
        }

        const currentTree = trees[0];
        const targetMaxMembers = tx.target_max_members;

        if (targetMaxMembers) {
          // Set kuota ke target baru (atau nilai tertinggi jika sudah lebih besar)
          const newMaxMembers = Math.max(currentTree.max_members, targetMaxMembers);

          await conn.query('UPDATE trees SET max_members = ? WHERE id = ?', [
            newMaxMembers,
            tx.tree_id,
          ]);
        }

        await conn.commit();

        return {
          success: true,
          message: 'Pembayaran berhasil dikonfirmasi dan kuota pohon telah ditingkatkan.',
          merchantOrderId,
          status: 'SUCCESS',
        };
      } else {
        // Result code selain '00' berarti GAGAL / KEDALUWARSA
        await this.transactionRepository.updateStatus(
          merchantOrderId,
          'FAILED',
          {
            duitku_reference: reference || tx.duitku_reference,
          },
          conn
        );

        await conn.commit();

        return {
          success: false,
          message: `Pembayaran tidak berhasil (Result code: ${resultCode}).`,
          merchantOrderId,
          status: 'FAILED',
        };
      }
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async getTransactionStatus(merchantOrderId) {
    const tx = await this.transactionRepository.findByMerchantOrderId(merchantOrderId);
    if (!tx) {
      throw new NotFoundError('Transaksi tidak ditemukan.');
    }
    return tx;
  }
}

module.exports = PaymentService;

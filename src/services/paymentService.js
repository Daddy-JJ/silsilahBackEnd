const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  UnprocessableEntityError,
} = require('../errors/AppError');
const { getFrontendUrl } = require('../utils/urlHelper');

class PaymentService {
  constructor(
    transactionRepository,
    upgradePlanRepository,
    systemSettingRepository,
    treeRepository,
    pool,
    emailService = null
  ) {
    this.transactionRepository = transactionRepository;
    this.upgradePlanRepository = upgradePlanRepository;
    this.systemSettingRepository = systemSettingRepository;
    this.treeRepository = treeRepository;
    this.pool = pool;
    this.emailService = emailService;
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
   * Helper untuk menghitung HMAC-SHA256 signature
   */
  _generateHmacSha256(str, key) {
    return crypto.createHmac('sha256', key).update(str).digest('hex');
  }

  /**
   * Duitku Pop Inquiry Endpoint (Create Invoice)
   * Membuat transaksi PENDING dan meminta reference & paymentUrl dari Duitku Pop
   */
  async createInquiry(user, { treeId, planId, paymentMethod = '', returnUrl }) {
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

    // 3. Ambil Kredensial Duitku dari ENV atau system_settings
    const { map: settings } = await this.systemSettingRepository.getAll();
    const merchantCode = process.env.DUITKU_MERCHANT_CODE || settings.duitku_merchant_code || '';
    const apiKey = process.env.DUITKU_API_KEY || settings.duitku_api_key || '';
    const environment = process.env.DUITKU_ENV || settings.duitku_environment || 'sandbox';

    // 4. Generate Unique Merchant Order ID
    const timestamp = Date.now().toString();
    const shortUuid = uuidv4().split('-')[0];
    const merchantOrderId = `ORD-${timestamp}-${shortUuid}`.toUpperCase();

    // Duitku Pop Create Invoice Endpoint
    const duitkuInquiryUrl =
      environment === 'production'
        ? 'https://api-prod.duitku.com/api/merchant/createInvoice'
        : 'https://api-sandbox.duitku.com/api/merchant/createInvoice';

    // Duitku Pop Signature Header: HMAC-SHA256(merchantCode + timestamp, apiKey)
    const signature = this._generateHmacSha256(`${merchantCode}${timestamp}`, apiKey);

    // Siapkan Callback & Return URL
    const backendCallbackUrl =
      process.env.DUITKU_CALLBACK_URL ||
      process.env.BACKEND_CALLBACK_URL ||
      'https://apisilsilah.kartunamadigital.id/api/v1/payments/duitku/callback';

    const defaultFrontendUrl = getFrontendUrl();
    const defaultReturnUrl =
      returnUrl ||
      `${defaultFrontendUrl}/trees/${treeId}?payment=finish`;

    const inquiryPayload = {
      paymentAmount: finalAmount,
      merchantOrderId,
      productDetails: `Upgrade Silsilah - ${plan.nama_paket} (${plan.target_max_members} Anggota)`,
      email: user.email,
      phoneNumber: user.phone_number || '',
      customerVaName: user.nama_lengkap || 'Pengguna Silsilah',
      callbackUrl: backendCallbackUrl,
      returnUrl: defaultReturnUrl,
      expiryPeriod: 1440, // 24 jam
      additionalParam: JSON.stringify({ treeId, planId, userId: user.id }),
      merchantUserInfo: user.id,
    };

    if (paymentMethod) {
      inquiryPayload.paymentMethod = paymentMethod;
    }

    let paymentUrl = null;
    let reference = null;

    // 5. Panggil Duitku Pop API jika kredensial nyata sudah terisi
    const isTestCredentials =
      !merchantCode ||
      !apiKey ||
      merchantCode.startsWith('DXXXX') ||
      merchantCode.startsWith('D12345') ||
      apiKey.includes('your_sandbox_api_key') ||
      apiKey.includes('test') ||
      apiKey.includes('sandbox_123');

    if (merchantCode && apiKey && !isTestCredentials) {
      try {
        const res = await fetch(duitkuInquiryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-duitku-timestamp': timestamp,
            'x-duitku-merchantcode': merchantCode,
            'x-duitku-signature': signature,
          },
          body: JSON.stringify(inquiryPayload),
        });

        const data = await res.json();
        if (data.statusCode === '00' && data.reference) {
          reference = data.reference;
          paymentUrl = data.paymentUrl || null;
        } else {
          throw new BadRequestError(
            `Duitku Pop Error: ${data.statusMessage || 'Gagal membuat invoice di Duitku'}`,
            data
          );
        }
      } catch (err) {
        if (err instanceof BadRequestError) throw err;
        throw new BadRequestError(`Gagal menghubungi server Duitku: ${err.message}`);
      }
    } else {
      // Sandbox Simulator fallback jika belum ada API key Duitku di DB/env
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
      payment_method: paymentMethod || 'DUITKU_POP',
      duitku_reference: reference,
      duitku_payment_url: paymentUrl,
      status: 'PENDING',
    });

    return {
      transaction: createdTx,
      merchantOrderId,
      reference,
      paymentUrl,
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
   * Validasi signature: HMAC-SHA256(merchantCode + amount + merchantOrderId, apiKey)
   * (Beserta fallback MD5 untuk kompatibilitas multi-channel)
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

    // 1. Ambil API Key Duitku dari ENV atau system_settings
    const { map: settings } = await this.systemSettingRepository.getAll();
    const apiKey = process.env.DUITKU_API_KEY || settings.duitku_api_key || '';
    const configuredMerchantCode = process.env.DUITKU_MERCHANT_CODE || settings.duitku_merchant_code || '';

    // Jika merchant code di konfigurasi diisi, pastikan cocok
    if (configuredMerchantCode && merchantCode !== configuredMerchantCode) {
      throw new BadRequestError('Merchant code callback tidak cocok.');
    }

    // 2. Validasi Signature Duitku:
    // Format Duitku Pop: HMAC-SHA256(merchantCode + amount + merchantOrderId, apiKey)
    // Fallback variasi: HMAC-SHA256(merchantCode + merchantOrderId + amount, apiKey)
    // Fallback legacy Duitku: MD5(merchantCode + amount + merchantOrderId + apiKey)
    const hmacSig1 = this._generateHmacSha256(`${merchantCode}${amount}${merchantOrderId}`, apiKey).toLowerCase();
    const hmacSig2 = this._generateHmacSha256(`${merchantCode}${merchantOrderId}${amount}`, apiKey).toLowerCase();
    const md5Sig1 = this._generateMd5(`${merchantCode}${amount}${merchantOrderId}${apiKey}`).toLowerCase();
    const md5Sig2 = this._generateMd5(`${merchantCode}${merchantOrderId}${amount}${apiKey}`).toLowerCase();
    const incomingSig = receivedSignature.toLowerCase();

    const compareSig = (expected, actual) => {
      if (!expected || !actual) return false;
      const b1 = Buffer.from(expected);
      const b2 = Buffer.from(actual);
      return b1.length === b2.length && crypto.timingSafeEqual(b1, b2);
    };

    const isSigMatch =
      compareSig(hmacSig1, incomingSig) ||
      compareSig(hmacSig2, incomingSig) ||
      compareSig(md5Sig1, incomingSig) ||
      compareSig(md5Sig2, incomingSig);

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
        let newMaxMembers = currentTree.max_members;

        if (targetMaxMembers) {
          // Set kuota ke target baru (atau nilai tertinggi jika sudah lebih besar)
          newMaxMembers = Math.max(currentTree.max_members, targetMaxMembers);
        }

        const membershipPlan = tx.kode_paket || 'PRO';

        // Perbarui kuota pohon, nama paket, status aktif, dan perpanjang masa aktif tahunan (+1 Tahun)
        await conn.query(`
          UPDATE trees 
          SET 
            max_members = ?,
            membership_plan = ?,
            membership_status = 'ACTIVE',
            membership_expires_at = DATE_ADD(GREATEST(COALESCE(membership_expires_at, NOW()), NOW()), INTERVAL 1 YEAR)
          WHERE id = ?
        `, [
          newMaxMembers,
          membershipPlan,
          tx.tree_id,
        ]);

        await conn.commit();

        // c. Kirim email kuitansi resmi via emailService
        if (this.emailService && tx.user_email) {
          const frontendUrl = getFrontendUrl();
          this.emailService.sendPaymentInvoiceEmail({
            to: tx.user_email,
            userName: tx.user_nama || 'Pengguna Silsilah',
            orderId: merchantOrderId,
            planName: tx.nama_paket || 'Paket Upgrade',
            treeName: tx.nama_silsilah || currentTree.nama_silsilah || 'Pohon Keluarga',
            amount: Number(tx.amount),
            paymentMethod: tx.payment_method || 'Duitku Pop',
            newQuota: newMaxMembers,
            treeUrl: `${frontendUrl}/trees/${tx.tree_id}`,
          }).catch(err => console.error('[PaymentService] Gagal kirim email kuitansi:', err.message));
        }

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


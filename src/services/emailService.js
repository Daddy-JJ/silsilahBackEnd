/**
 * SILSILAH KELUARGA — EMAIL SERVICE
 * Layanan pengiriman email transaksional resmi platform via SMTP cPanel (mail.kartunamadigital.id:465).
 * Terintegrasi dengan konfigurasi copywriting di src/config/emailContent.js
 * dan layout visual responsive di src/templates/email/baseLayout.js
 */

const nodemailer = require('nodemailer');
const emailContent = require('../config/emailContent');
const { renderBaseEmail } = require('../templates/email/baseLayout');

class EmailService {
  constructor() {
    this.host = process.env.SMTP_HOST || 'mail.kartunamadigital.id';
    this.port = Number(process.env.SMTP_PORT) || 465;
    this.secure = process.env.SMTP_SECURE === 'true' || this.port === 465;
    this.user = process.env.SMTP_USER || 'silsilahkeluarga@kartunamadigital.id';
    this.pass = process.env.SMTP_PASS || '';
    this.fromName = process.env.SMTP_FROM_NAME || 'Silsilah Keluarga';
    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'silsilahkeluarga@kartunamadigital.id';

    this.transporter = null;
    this._initTransporter();
  }

  _initTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: {
        user: this.user,
        pass: this.pass,
      },
      tls: {
        rejectUnauthorized: false, // Menjamin kompatibilitas sertifikat SSL shared hosting
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
    });
  }

  /**
   * Verifikasi handshake koneksi SMTP server
   */
  async verifyConnection() {
    if (!this.pass) {
      return {
        success: false,
        message: 'SMTP_PASS belum diisi di berkas .env. Pengiriman email saat ini disimulasikan di terminal.',
      };
    }

    try {
      await this.transporter.verify();
      return {
        success: true,
        message: `Koneksi SMTP ke ${this.host}:${this.port} berhasil terverifikasi.`,
      };
    } catch (err) {
      return {
        success: false,
        message: `Gagal terhubung ke SMTP ${this.host}:${this.port}: ${err.message}`,
        error: err,
      };
    }
  }

  /**
   * Metode internal untuk mengirim email
   */
  async sendMail({ to, subject, html, text }) {
    if (!to) {
      throw new Error('[EmailService] Alamat tujuan email (to) wajib diisi.');
    }

    // Jika password SMTP belum diisi, lakukan simulasi log ramah developer
    if (!this.pass) {
      console.log(`\n=============================================================`);
      console.log(`📧 [EMAIL SIMULATED / DRY-RUN]`);
      console.log(`Kepada  : ${to}`);
      console.log(`Pengirim: "${this.fromName}" <${this.fromEmail}>`);
      console.log(`Subjek  : ${subject}`);
      console.log(`Catatan : Masukkan SMTP_PASS di .env untuk mengirim email riil.`);
      console.log(`=============================================================\n`);
      return { success: true, simulated: true, to, subject };
    }

    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to,
      subject,
      text: text || subject,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Email berhasil terkirim ke ${to} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[EmailService] Gagal mengirim email ke ${to}:`, error.message);
      throw error;
    }
  }

  // ─── 1. TEMPLATE: SELAMAT DATANG & VERIFIKASI AKUN ──────────────────
  async sendWelcomeEmail({ to, name, activationUrl }) {
    const cfg = emailContent.welcome;
    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #18181b;">
        ${cfg.greeting(name)}
      </p>
      ${cfg.paragraphs.map(p => `<p style="margin: 0 0 16px 0;">${p}</p>`).join('')}
    `;

    const extraHtml = `
      <p style="margin: 16px 0 24px 0; font-size: 12px; color: #71717a;">
        <em>${cfg.expiryNotice}</em>
      </p>
      <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 18px 20px; margin-top: 24px;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #18181b; margin-bottom: 10px;">
          ${cfg.guideTitle}
        </div>
        <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: #52525b; line-height: 1.6;">
          ${cfg.guideSteps.map(s => `<li style="margin-bottom: 4px;">${s}</li>`).join('')}
        </ol>
      </div>
    `;

    const html = renderBaseEmail({
      badge: cfg.badge,
      title: cfg.title,
      contentHtml,
      buttonText: cfg.buttonText,
      buttonUrl: activationUrl,
      extraHtml,
      closingHtml: cfg.closing,
    });

    return this.sendMail({
      to,
      subject: cfg.subject,
      html,
    });
  }

  // ─── 2. TEMPLATE: KODE OTP VERIFIKASI INSTAN ────────────────────────
  async sendOtpEmail({ to, name, otp }) {
    const cfg = emailContent.otp;
    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #18181b;">
        ${cfg.greeting(name)}
      </p>
      ${cfg.paragraphs.map(p => `<p style="margin: 0 0 16px 0;">${p}</p>`).join('')}
      
      <!-- OTP Box -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
        <tr>
          <td align="center">
            <div style="display: inline-block; background-color: #18181b; color: #f7e043; font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; padding: 16px 36px; border-radius: 8px; border: 2px solid #eab308; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
              ${otp}
            </div>
          </td>
        </tr>
      </table>

      <p style="text-align: center; margin: 0 0 24px 0; font-size: 12px; color: #71717a;">
        ${cfg.expiryNotice}
      </p>

      <!-- Warning Box -->
      <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 16px 18px; margin: 24px 0;">
        <div style="font-size: 11px; font-family: 'Courier New', Courier, monospace; font-weight: 800; color: #9f1239; text-transform: uppercase; margin-bottom: 4px;">
          ${cfg.warningBoxTitle}
        </div>
        <div style="font-size: 12px; color: #881337; line-height: 1.5;">
          ${cfg.warningText}
        </div>
      </div>

      <p style="font-size: 12px; color: #a1a1aa; margin: 16px 0 0 0;">
        ${cfg.altNotice}
      </p>
    `;

    const html = renderBaseEmail({
      badge: cfg.badge,
      title: cfg.title,
      contentHtml,
      closingHtml: cfg.closing,
    });

    return this.sendMail({
      to,
      subject: cfg.subject(otp),
      html,
    });
  }

  // ─── 3. TEMPLATE: PERMINTAAN RESET KATA SANDI ───────────────────────
  async sendPasswordResetEmail({ to, name, resetUrl }) {
    const cfg = emailContent.resetPassword;
    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #18181b;">
        ${cfg.greeting(name)}
      </p>
      ${cfg.paragraphs.map(p => `<p style="margin: 0 0 16px 0;">${p}</p>`).join('')}
    `;

    const extraHtml = `
      <p style="margin: 16px 0 24px 0; font-size: 12px; color: #71717a;">
        <em>${cfg.expiryNotice}</em>
      </p>
      <div style="background-color: #f4f4f5; border-left: 3px solid #71717a; padding: 12px 16px; margin-top: 24px;">
        <p style="margin: 0; font-size: 12px; color: #52525b; line-height: 1.5;">
          ${cfg.securityNotice}
        </p>
      </div>
    `;

    const html = renderBaseEmail({
      badge: cfg.badge,
      title: cfg.title,
      contentHtml,
      buttonText: cfg.buttonText,
      buttonUrl: resetUrl,
      extraHtml,
      closingHtml: cfg.closing,
    });

    return this.sendMail({
      to,
      subject: cfg.subject,
      html,
    });
  }

  // ─── 4. TEMPLATE: UNDANGAN KOLABORATOR SEMESTA ───────────────────────
  async sendCollaborationInviteEmail({ to, recipientName, inviterName, treeName, role = 'KONTRIBUTOR', inviteUrl }) {
    const cfg = emailContent.invitation;
    const roleDesc = cfg.roleDescriptions[role] || role;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #18181b;">
        ${cfg.greeting(recipientName)}
      </p>
      <p style="margin: 0 0 20px 0;">
        ${cfg.intro(inviterName, treeName, role)}
      </p>

      <!-- Invitation Card Details -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin: 20px 0; font-size: 13px;">
        <tr>
          <td style="padding: 14px 18px; border-bottom: 1px solid #f4f4f5; color: #71717a; width: 35%;">
            ${cfg.detailsLabels.treeName}
          </td>
          <td style="padding: 14px 18px; border-bottom: 1px solid #f4f4f5; font-weight: 700; color: #18181b;">
            🌳 ${treeName}
          </td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; border-bottom: 1px solid #f4f4f5; color: #71717a;">
            ${cfg.detailsLabels.role}
          </td>
          <td style="padding: 14px 18px; border-bottom: 1px solid #f4f4f5; font-weight: 700; color: #18181b;">
            <span style="display: inline-block; background-color: #f7e043; color: #18181b; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-family: 'Courier New', Courier, monospace;">
              ${role}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; color: #71717a;" valign="top">
            ${cfg.detailsLabels.roleDescription}
          </td>
          <td style="padding: 14px 18px; color: #52525b; line-height: 1.4;">
            ${roleDesc}
          </td>
        </tr>
      </table>
    `;

    const extraHtml = `
      <p style="margin: 16px 0; font-size: 12px; color: #71717a;">
        ${cfg.newAccountNotice}
      </p>
    `;

    const html = renderBaseEmail({
      badge: cfg.badge,
      title: cfg.title,
      contentHtml,
      buttonText: cfg.buttonText,
      buttonUrl: inviteUrl,
      extraHtml,
      closingHtml: cfg.closing(inviterName),
    });

    return this.sendMail({
      to,
      subject: cfg.subject(inviterName, treeName),
      html,
    });
  }

  // ─── 5. TEMPLATE: NOTIFIKASI STATUS USULAN PERUBAHAN ─────────────────
  async sendProposalStatusEmail({
    to,
    contributorName,
    treeName,
    memberName,
    changeType = 'Sunting Data',
    status = 'APPROVED',
    reviewNotes = '',
    treeUrl,
  }) {
    const cfg = emailContent.approvalStatus;
    const isApproved = status === 'APPROVED';
    const statusBadgeColor = isApproved ? '#dcfce7' : '#fee2e2';
    const statusTextColor = isApproved ? '#166534' : '#991b1b';
    const statusLabel = isApproved ? 'DISETUJUI (APPROVED) ✅' : 'DITOLAK (REJECTED) ❌';

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #18181b;">
        ${cfg.greeting(contributorName)}
      </p>
      <p style="margin: 0 0 20px 0;">
        ${cfg.intro(treeName)}
      </p>

      <!-- Proposal Table -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin: 20px 0; font-size: 13px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; color: #71717a; width: 35%;">
            ${cfg.detailsLabels.memberName}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; font-weight: 700; color: #18181b;">
            ${memberName}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; color: #71717a;">
            ${cfg.detailsLabels.changeType}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; color: #18181b;">
            ${changeType}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; color: #71717a;">
            ${cfg.detailsLabels.status}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5;">
            <span style="display: inline-block; background-color: ${statusBadgeColor}; color: ${statusTextColor}; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">
              ${statusLabel}
            </span>
          </td>
        </tr>
        ${reviewNotes ? `
        <tr>
          <td style="padding: 12px 16px; color: #71717a;" valign="top">
            ${cfg.detailsLabels.adminNotes}
          </td>
          <td style="padding: 12px 16px; color: #52525b; font-style: italic;">
            &ldquo;${reviewNotes}&rdquo;
          </td>
        </tr>
        ` : ''}
      </table>

      <p style="margin: 16px 0; font-size: 13px; color: #52525b;">
        ${isApproved ? cfg.approvedNote : cfg.rejectedNote}
      </p>
    `;

    const html = renderBaseEmail({
      badge: cfg.badge(status),
      title: cfg.title(status),
      contentHtml,
      buttonText: cfg.buttonText,
      buttonUrl: treeUrl,
      closingHtml: cfg.closing,
    });

    return this.sendMail({
      to,
      subject: cfg.subject(status, treeName),
      html,
    });
  }

  // ─── 6. TEMPLATE: BUKTI PEMBAYARAN & UPGRADE KUOTA ───────────────────
  async sendPaymentInvoiceEmail({
    to,
    userName,
    orderId,
    planName,
    treeName,
    amount,
    paymentMethod = 'QRIS / E-Wallet',
    newQuota = 150,
    treeUrl,
  }) {
    const cfg = emailContent.paymentInvoice;
    const formattedAmount = typeof amount === 'number' ? `Rp ${amount.toLocaleString('id-ID')}` : amount;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #18181b;">
        ${cfg.greeting(userName)}
      </p>
      ${cfg.paragraphs.map(p => `<p style="margin: 0 0 16px 0;">${p}</p>`).join('')}

      <!-- Invoice Table -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin: 20px 0; font-size: 13px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; color: #71717a; width: 35%;">
            ${cfg.detailsLabels.orderId}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; font-family: 'Courier New', Courier, monospace; font-weight: 700; color: #18181b;">
            ${orderId}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; color: #71717a;">
            ${cfg.detailsLabels.planName}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; font-weight: 700; color: #18181b;">
            ${planName}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; color: #71717a;">
            ${cfg.detailsLabels.treeName}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; color: #18181b;">
            🌳 ${treeName}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; color: #71717a;">
            ${cfg.detailsLabels.amount}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; font-weight: 800; color: #18181b; font-size: 15px;">
            ${formattedAmount}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; color: #71717a;">
            ${cfg.detailsLabels.paymentMethod}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; color: #52525b;">
            ${paymentMethod}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5; color: #71717a;">
            ${cfg.detailsLabels.status}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f4f4f5;">
            <span style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">
              LUNAS (SUCCESS)
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #71717a;">
            ${cfg.detailsLabels.newQuota}
          </td>
          <td style="padding: 12px 16px; font-weight: 800; color: #166534;">
            ${newQuota} Node Anggota
          </td>
        </tr>
      </table>

      <!-- Highlight Banner -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.5;">
          ${cfg.quotaSuccessNotice(treeName, newQuota)}
        </p>
      </div>

      <p style="font-size: 11px; color: #a1a1aa; margin: 16px 0 0 0;">
        ${cfg.legalNotice}
      </p>
    `;

    const html = renderBaseEmail({
      badge: cfg.badge,
      title: cfg.title,
      contentHtml,
      buttonText: cfg.buttonText,
      buttonUrl: treeUrl,
      closingHtml: cfg.closing,
    });

    return this.sendMail({
      to,
      subject: cfg.subject(treeName),
      html,
    });
  }
}

module.exports = EmailService;

/**
 * SILSILAH KELUARGA — EMAIL CONTENT CONFIGURATION
 * Berkas ini adalah pusat pengaturan narasi (copywriting) semua email resmi platform.
 * Anda dapat dengan mudah melakukan fine-tuning kata-kata, salam, subjek, atau catatan
 * tanpa perlu mengubah kode logika pengiriman maupun desain HTML.
 */

module.exports = {
  // Brand Header & Footer Umum
  brand: {
    name: 'Silsilah Keluarga',
    tagline: 'Collaborative Tree Platform',
    websiteUrl: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0].trim() : 'https://silsilahkeluarga.id',
    supportEmail: process.env.SMTP_FROM_EMAIL || 'admin@silsilahkeluarga.id',
    footerCopyright: `© ${new Date().getFullYear()} Silsilah Keluarga (silsilahkeluarga.id). Seluruh hak cipta dilindungi.`,
    footerDisclaimer: 'Anda menerima email ini karena akun Anda terdaftar di platform Silsilah Keluarga. Jika ini bukan Anda, silakan hubungi tim dukungan kami.',
  },

  // 1. Template: Selamat Datang & Verifikasi Akun Baru
  welcome: {
    subject: 'Selamat Datang di Silsilah Keluarga – Verifikasi Akun Anda',
    badge: 'AKTIVASI AKUN',
    title: 'Selamat Datang di Silsilah Keluarga',
    greeting: (name) => `Halo, ${name || 'Keluarga'}!`,
    paragraphs: [
      'Terima kasih telah bergabung di <strong>Silsilah Keluarga</strong> — platform visual modern untuk menyusun, merawat, dan mengabadikan sejarah garis keturunan keluarga besar Anda lintas generasi.',
      'Untuk mengaktifkan akun dan memastikan keamanan data keluarga Anda, silakan konfirmasi alamat email Anda dengan menekan tombol di bawah ini:',
    ],
    buttonText: 'Aktifkan Akun Saya',
    expiryNotice: 'Tautan aktivasi ini berlaku selama 24 jam.',
    guideTitle: 'Langkah awal yang dapat Anda lakukan:',
    guideSteps: [
      'Buat semesta pohon keluarga pertama Anda.',
      'Tambahkan simpul leluhur utama dan pasangan.',
      'Undang sanak saudara untuk mulai berkolaborasi.',
    ],
    closing: 'Salam hangat,<br><strong>Tim Silsilah Keluarga</strong><br><em>Lestarikan Jejak, Rawat Ikatan.</em>',
  },

  // 2. Template: Kode OTP Verifikasi Instan
  otp: {
    subject: (otp) => `[OTP] Kode Verifikasi Masuk Akun Anda: ${otp}`,
    badge: 'KODE KEAMANAN OTP',
    title: 'Kode Verifikasi Anda',
    greeting: (name) => `Halo, ${name || 'Pengguna'},`,
    paragraphs: [
      'Kami menerima permintaan verifikasi untuk akun Silsilah Keluarga yang terhubung dengan alamat email ini.',
      'Gunakan kode One-Time Password (OTP) di bawah ini untuk melanjutkan:',
    ],
    expiryNotice: 'Kode ini hanya berlaku selama <strong>10 menit</strong> dan hanya dapat digunakan 1 kali.',
    warningBoxTitle: 'PENTING — JAGA KERAHASIAAN KODE:',
    warningText: 'Jangan pernah memberitahukan kode OTP ini kepada siapa pun, termasuk pihak yang mengaku sebagai staf atau admin Silsilah Keluarga.',
    altNotice: 'Jika Anda tidak merasa melakukan permintaan ini, akun Anda mungkin sedang dicoba diakses oleh orang lain. Segera ganti kata sandi akun Anda.',
    closing: 'Salam keamanan,<br><strong>Tim Keamanan Silsilah Keluarga</strong>',
  },

  // 3. Template: Permintaan Atur Ulang Kata Sandi
  resetPassword: {
    subject: 'Permintaan Atur Ulang Kata Sandi Akun Silsilah Keluarga',
    badge: 'RESET KATA SANDI',
    title: 'Atur Ulang Kata Sandi',
    greeting: (name) => `Halo, ${name || 'Pengguna'},`,
    paragraphs: [
      'Kami menerima permintaan untuk mengatur ulang kata sandi akun Silsilah Keluarga Anda.',
      'Silakan klik tombol di bawah ini untuk membuat kata sandi baru yang aman:',
    ],
    buttonText: 'Atur Ulang Kata Sandi',
    expiryNotice: 'Tautan pemulihan ini hanya berlaku selama <strong>60 menit</strong>.',
    securityNotice: 'Jika Anda tidak meminta perubahan kata sandi, abaikan email ini. Kata sandi lama Anda tetap aman dan tidak akan berubah sebelum Anda menekan tombol di atas.',
    closing: 'Salam hormat,<br><strong>Tim Dukungan Silsilah Keluarga</strong>',
  },

  // 4. Template: Undangan Kolaborasi Semesta Keluarga
  invitation: {
    subject: (inviter, tree) => `${inviter} mengundang Anda untuk bergabung di silsilah "${tree}"`,
    badge: 'UNDANGAN KOLABORASI',
    title: 'Undangan Kolaborasi Keluarga',
    greeting: (recipient) => `Halo, ${recipient || 'Kerabat'}!`,
    intro: (inviter, tree, role) => `<strong>${inviter}</strong> baru saja mengundang Anda untuk bergabung dan merawat pohon silsilah keluarga bersama di platform Silsilah Keluarga:`,
    detailsLabels: {
      treeName: 'Semesta Pohon',
      role: 'Peran Akses Diberikan',
      roleDescription: 'Wewenang Peran',
    },
    roleDescriptions: {
      ADMIN_UTAMA: 'Admin Utama (Dapat mengelola anggota, usulan, kolaborator, dan pengaturan semesta).',
      KONTRIBUTOR: 'Kontributor (Dapat menambahkan anggota keluarga baru dan mengusulkan revisi data silsilah).',
      VIEWER: 'Viewer / Pembaca (Dapat menelusuri bagan pohon visual, profil leluhur, dan riwayat silsilah).',
    },
    buttonText: 'Buka Semesta Keluarga',
    newAccountNotice: 'Jika Anda belum memiliki akun, Anda dapat langsung mendaftar dengan alamat email ini untuk otomatis mengakses semesta tersebut.',
    closing: (inviter) => `Salam kebersamaan,<br><strong>${inviter} & Tim Silsilah Keluarga</strong>`,
  },

  // 5. Template: Notifikasi Status Usulan Perubahan
  approvalStatus: {
    subject: (status, tree) => `Usulan Perubahan Silsilah Anda Telah ${status === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK'}`,
    badge: (status) => status === 'APPROVED' ? 'USULAN DISETUJUI' : 'USULAN DITOLAK',
    title: (status) => status === 'APPROVED' ? 'Usulan Anda Berhasil Disetujui' : 'Usulan Anda Belum Dapat Disetujui',
    greeting: (contributor) => `Halo, ${contributor || 'Kontributor'},`,
    intro: (tree) => `Admin Utama telah selesai meninjau usulan perubahan data silsilah yang Anda ajukan pada semesta <strong>${tree}</strong>.`,
    detailsLabels: {
      memberName: 'Nama Anggota',
      changeType: 'Jenis Usulan',
      status: 'Status Usulan',
      adminNotes: 'Catatan Peninjauan Admin',
    },
    approvedNote: 'Versi diagram silsilah telah otomatis diperbarui dan langsung dapat dilihat oleh seluruh keluarga besar.',
    rejectedNote: 'Silakan periksa catatan Admin di atas. Anda dapat mengajukan usulan baru setelah melengkapi data yang diperlukan.',
    buttonText: 'Lihat Pohon Silsilah Terbaru',
    closing: 'Terima kasih atas dedikasi Anda merawat silsilah keluarga!<br><strong>Tim Silsilah Keluarga</strong>',
  },

  // 6. Template: Bukti Pembayaran & Konfirmasi Upgrade Kuota
  paymentInvoice: {
    subject: (tree) => `[Kuitansi Resmi] Pembayaran Upgrade Semesta "${tree}" Berhasil`,
    badge: 'KUITANSI DIGITAL',
    title: 'Pembayaran & Upgrade Berhasil',
    greeting: (name) => `Halo, ${name || 'Pengguna'}!`,
    paragraphs: [
      'Terima kasih atas pembayaran Anda! Transaksi ekspansi kapasitas semesta silsilah keluarga telah kami terima dan diverifikasi secara otomatis.',
    ],
    detailsLabels: {
      orderId: 'ID Pesanan',
      planName: 'Paket Upgrade',
      treeName: 'Semesta Pohon',
      amount: 'Total Pembayaran',
      paymentMethod: 'Metode Bayar',
      status: 'Status Transaksi',
      newQuota: 'Batas Kuota Baru',
    },
    quotaSuccessNotice: (tree, quota) => `Kapasitas semesta <strong>${tree}</strong> kini telah resmi ditingkatkan menjadi <strong>${quota} Node Anggota</strong>.`,
    buttonText: 'Kelola Semesta Keluarga',
    legalNotice: 'Kuitansi ini adalah bukti transaksi digital yang sah dari sistem pembayaran Duitku Gateway & Silsilah Keluarga.',
    closing: 'Salam hangat,<br><strong>Divisi Layanan & Billing Silsilah Keluarga</strong>',
  },
};

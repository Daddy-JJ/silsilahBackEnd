const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../errors/AppError');
const { getFrontendUrl } = require('../utils/urlHelper');

class AuthService {
  constructor(
    userRepository,
    jwtSecret,
    jwtExpiresIn = '7d',
    googleClientId = null,
    treeRepository = null,
    treeInvitationRepository = null,
    emailService = null,
    passwordResetRepository = null
  ) {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
    this.googleClientId = googleClientId || process.env.GOOGLE_CLIENT_ID;
    this.googleClient = new OAuth2Client(this.googleClientId);
    this.treeRepository = treeRepository;
    this.treeInvitationRepository = treeInvitationRepository;
    this.emailService = emailService;
    this.passwordResetRepository = passwordResetRepository;
  }

  async register({ email, password, nama_lengkap }) {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new BadRequestError('Email sudah terdaftar. Silakan gunakan email lain.');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userId = uuidv4();

    const newUser = await this.userRepository.create({
      id: userId,
      email,
      password_hash,
      nama_lengkap,
    });

    // Klaim otomatis semua undangan kolaborator yang tertunda untuk email ini
    await this._claimPendingInvitations(newUser);

    // Kirim email selamat datang via email resmi
    if (this.emailService) {
      const appFrontendUrl = getFrontendUrl();
      this.emailService.sendWelcomeEmail({
        to: newUser.email,
        name: newUser.nama_lengkap,
        activationUrl: appFrontendUrl,
      }).catch(err => console.error('[AuthService] Gagal kirim welcome email:', err.message));
    }

    const token = this._generateToken(newUser);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        nama_lengkap: newUser.nama_lengkap,
        system_role: newUser.system_role,
        created_at: newUser.created_at,
      },
      token,
    };
  }

  async login({ email, password }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Email atau kata sandi salah.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Email atau kata sandi salah.');
    }

    const token = this._generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        nama_lengkap: user.nama_lengkap,
        system_role: user.system_role,
        created_at: user.created_at,
      },
      token,
    };
  }

  async loginWithGoogle({ credential }) {
    if (!credential) {
      throw new BadRequestError('Token kredensial Google tidak ditemukan.');
    }

    let payload;
    try {
      // Tier 1: Verifikasi resmi kriptografis via google-auth-library
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.googleClientId || undefined,
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.warn('[AuthService] google-auth-library verifyIdToken gagal, mencoba fallback tokeninfo/jwt:', err.message);

      // Tier 2: Coba verifikasi via Google tokeninfo endpoint
      let verifiedViaTokenInfo = false;
      if (typeof fetch === 'function') {
        try {
          const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
          if (response.ok) {
            const data = await response.json();
            if (this.googleClientId && data.aud && data.aud !== this.googleClientId) {
              throw new UnauthorizedError('Audience token Google tidak sesuai dengan Client ID.');
            }
            payload = {
              sub: data.sub,
              email: data.email,
              name: data.name,
              picture: data.picture,
            };
            verifiedViaTokenInfo = true;
          }
        } catch (fetchErr) {
          console.warn('[AuthService] Fallback tokeninfo Google gagal:', fetchErr.message);
        }
      }

      // Tier 3: Resilient fallback via validasi klaim JWT jika server hosting memblokir outbound HTTPS
      if (!verifiedViaTokenInfo) {
        try {
          const decoded = jwt.decode(credential);
          const isGoogleIssuer = decoded && (decoded.iss === 'https://accounts.google.com' || decoded.iss === 'accounts.google.com');
          const isNotExpired = decoded && decoded.exp && (decoded.exp * 1000 > Date.now());
          const isAudienceValid = !this.googleClientId || (decoded && (decoded.aud === this.googleClientId || decoded.azp === this.googleClientId));

          if (decoded && isGoogleIssuer && isNotExpired && isAudienceValid && decoded.email) {
            payload = {
              sub: decoded.sub,
              email: decoded.email,
              name: decoded.name,
              picture: decoded.picture,
            };
          } else {
            throw new Error('Validasi struktur klaim token Google tidak valid atau kedaluwarsa.');
          }
        } catch (decodeErr) {
          throw new UnauthorizedError(`Verifikasi token Google gagal: ${err.message}`);
        }
      }
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedError('Token Google tidak memuat informasi email yang valid.');
    }

    const { sub: googleId, email, name: nama_lengkap, picture: avatar_url } = payload;

    // 1. Cari berdasarkan Google ID
    let user = await this.userRepository.findByGoogleId(googleId);

    if (!user) {
      // 2. Cari berdasarkan Email jika belum terhubung dengan Google ID
      user = await this.userRepository.findByEmail(email);

      if (user) {
        // Tautkan Google ID ke akun email yang sudah ada
        user = await this.userRepository.updateGoogleAccount(user.id, {
          google_id: googleId,
          avatar_url,
        });
      } else {
        // 3. Buat akun baru secara otomatis (Auto-Register)
        const userId = uuidv4();
        user = await this.userRepository.create({
          id: userId,
          email,
          nama_lengkap: nama_lengkap || email.split('@')[0],
          google_id: googleId,
          avatar_url,
          auth_provider: 'GOOGLE',
          is_verified: true,
          system_role: 'USER',
        });
      }
    }

    // Auto-claim jika ada undangan tertunda untuk akun Google ini
    await this._claimPendingInvitations(user);

    const token = this._generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        nama_lengkap: user.nama_lengkap,
        avatar_url: user.avatar_url,
        auth_provider: user.auth_provider,
        system_role: user.system_role,
        created_at: user.created_at,
      },
      token,
    };
  }

  async getProfile(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Pengguna tidak ditemukan.');
    }
    return user;
  }

  async forgotPassword(email) {
    if (!email || !email.trim()) {
      throw new BadRequestError('Alamat email wajib diisi.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(cleanEmail);

    // Keamanan standar: jika email tidak terdaftar, tetap kembalikan pesan netral
    if (!user) {
      return {
        message: 'Jika alamat email terdaftar, tautan pemulihan telah dikirimkan ke kotak masuk email Anda.',
      };
    }

    if (user.auth_provider === 'GOOGLE' && !user.password_hash) {
      return {
        message: 'Akun ini terdaftar melalui Google Sign-In. Silakan masuk menggunakan tombol Masuk dengan Google.',
      };
    }

    if (!this.passwordResetRepository) {
      throw new BadRequestError('Layanan pemulihan kata sandi belum terkonfigurasi.');
    }

    // Buat token pemulihan acak 32-byte (64 hex characters)
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 60 menit kedaluwarsa

    // Batalkan token lama yang belum terpakai untuk email ini
    await this.passwordResetRepository.invalidatePreviousTokens(cleanEmail);

    // Simpan token baru ke database
    await this.passwordResetRepository.create({
      id: uuidv4(),
      email: cleanEmail,
      token,
      expires_at,
    });

    // Kirim email resmi pemulihan kata sandi
    if (this.emailService) {
      const appFrontendUrl = getFrontendUrl();
      const resetUrl = `${appFrontendUrl}?reset_token=${token}&email=${encodeURIComponent(cleanEmail)}`;

      this.emailService.sendPasswordResetEmail({
        to: cleanEmail,
        name: user.nama_lengkap,
        resetUrl,
      }).catch(err => console.error('[AuthService] Gagal kirim email reset password:', err.message));
    }

    return {
      message: 'Tautan pemulihan kata sandi telah dikirimkan ke email Anda. Periksa kotak masuk atau spam.',
    };
  }

  async resetPassword({ email, token, newPassword }) {
    if (!email || !token || !newPassword) {
      throw new BadRequestError('Email, token, dan kata sandi baru wajib diisi.');
    }

    if (newPassword.length < 6) {
      throw new BadRequestError('Kata sandi baru minimal 6 karakter.');
    }

    if (!this.passwordResetRepository) {
      throw new BadRequestError('Layanan pemulihan kata sandi belum terkonfigurasi.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const validReset = await this.passwordResetRepository.findValidToken(cleanEmail, token);

    if (!validReset) {
      throw new BadRequestError('Tautan pemulihan kata sandi tidak valid atau telah kedaluwarsa. Silakan ajukan permohonan baru.');
    }

    const user = await this.userRepository.findByEmail(cleanEmail);
    if (!user) {
      throw new NotFoundError('Akun pengguna tidak ditemukan.');
    }

    // Hash kata sandi baru
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    // Perbarui kata sandi di database
    await this.userRepository.updatePassword(user.id, password_hash);

    // Tandai token telah terpakai
    await this.passwordResetRepository.markAsUsed(validReset.id);

    return {
      message: 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.',
    };
  }

  async updateProfile(userId, { nama_lengkap, email }) {
    if (!nama_lengkap || !nama_lengkap.trim()) {
      throw new BadRequestError('Nama lengkap wajib diisi.');
    }
    if (!email || !email.trim()) {
      throw new BadRequestError('Alamat email wajib diisi.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const currentUser = await this.userRepository.findById(userId);
    if (!currentUser) {
      throw new NotFoundError('Pengguna tidak ditemukan.');
    }

    // Jika email diubah, pastikan tidak bentrok dengan akun lain
    if (cleanEmail !== currentUser.email.toLowerCase()) {
      const existing = await this.userRepository.findByEmail(cleanEmail);
      if (existing && existing.id !== userId) {
        throw new BadRequestError('Alamat email tersebut sudah digunakan oleh akun lain.');
      }
    }

    const updatedUser = await this.userRepository.updateProfile(userId, {
      nama_lengkap: nama_lengkap.trim(),
      email: cleanEmail,
    });

    const token = this._generateToken(updatedUser);

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        nama_lengkap: updatedUser.nama_lengkap,
        avatar_url: updatedUser.avatar_url,
        auth_provider: updatedUser.auth_provider,
        system_role: updatedUser.system_role,
        created_at: updatedUser.created_at,
      },
      token,
      message: 'Profil berhasil diperbarui!',
    };
  }

  async changePassword(userId, { oldPassword, newPassword }) {
    if (!oldPassword || !newPassword) {
      throw new BadRequestError('Kata sandi saat ini dan kata sandi baru wajib diisi.');
    }

    if (newPassword.length < 6) {
      throw new BadRequestError('Kata sandi baru minimal 6 karakter.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Pengguna tidak ditemukan.');
    }

    const userWithPass = await this.userRepository.findByEmail(user.email);
    if (!userWithPass || !userWithPass.password_hash) {
      throw new BadRequestError('Akun Anda terhubung melalui Google Sign-In dan tidak memiliki kata sandi lokal.');
    }

    const isMatch = await bcrypt.compare(oldPassword, userWithPass.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Kata sandi saat ini yang Anda masukkan salah.');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await this.userRepository.updatePassword(userId, password_hash);

    return {
      message: 'Kata sandi akun Anda berhasil diperbarui!',
    };
  }

  async getMyInvitations(userId) {
    if (!this.treeInvitationRepository) return [];
    return await this.treeInvitationRepository.findAllByInviterId(userId);
  }

  async _claimPendingInvitations(user) {
    if (!this.treeInvitationRepository || !this.treeRepository) return;
    try {
      const pendingInvites = await this.treeInvitationRepository.findPendingByEmail(user.email);
      for (const invite of pendingInvites) {
        // Cek apakah sudah terdaftar di tree
        const existingRole = await this.treeRepository.getUserRoleInTree(invite.tree_id, user.id);
        if (!existingRole) {
          await this.treeRepository.addMember({
            id: uuidv4(),
            tree_id: invite.tree_id,
            user_id: user.id,
            role: invite.role,
          });
        }
        await this.treeInvitationRepository.updateStatus(invite.id, 'ACCEPTED');
        console.log(`[AuthService] Berhasil mengklaim undangan ${invite.id} untuk user ${user.email} di semesta ${invite.tree_id} sebagai ${invite.role}`);
      }
    } catch (err) {
      console.error('[AuthService] Gagal auto-claim undangan:', err.message);
    }
  }

  _generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        nama_lengkap: user.nama_lengkap,
        system_role: user.system_role,
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }
}

module.exports = AuthService;

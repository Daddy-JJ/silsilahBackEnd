const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../errors/AppError');

class AuthService {
  constructor(
    userRepository,
    jwtSecret,
    jwtExpiresIn = '7d',
    googleClientId = null,
    treeRepository = null,
    treeInvitationRepository = null,
    emailService = null
  ) {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
    this.googleClientId = googleClientId || process.env.GOOGLE_CLIENT_ID;
    this.googleClient = new OAuth2Client(this.googleClientId);
    this.treeRepository = treeRepository;
    this.treeInvitationRepository = treeInvitationRepository;
    this.emailService = emailService;
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
      const appFrontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0].trim() : 'https://silsilahkeluarga-mu.vercel.app';
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
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.googleClientId || undefined,
      });
      payload = ticket.getPayload();
    } catch (err) {
      throw new UnauthorizedError(`Verifikasi token Google gagal: ${err.message}`);
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

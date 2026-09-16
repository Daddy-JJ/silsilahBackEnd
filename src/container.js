const pool = require('./config/database');

// Repositories
const UserRepository = require('./repositories/userRepository');
const TreeRepository = require('./repositories/treeRepository');
const FamilyMemberRepository = require('./repositories/familyMemberRepository');
const ApprovalRepository = require('./repositories/approvalRepository');
const MarriageRepository = require('./repositories/marriageRepository');
const UpgradePlanRepository = require('./repositories/upgradePlanRepository');
const SystemSettingRepository = require('./repositories/systemSettingRepository');
const TransactionRepository = require('./repositories/transactionRepository');
const TreeInvitationRepository = require('./repositories/treeInvitationRepository');
const PasswordResetRepository = require('./repositories/passwordResetRepository');
const FeedbackRepository = require('./repositories/feedbackRepository');

// Services
const AuthService = require('./services/authService');
const TreeService = require('./services/treeService');
const FamilyMemberService = require('./services/familyMemberService');
const ApprovalService = require('./services/approvalService');
const MarriageService = require('./services/marriageService');
const AdminService = require('./services/adminService');
const PaymentService = require('./services/paymentService');
const EmailService = require('./services/emailService');
const FeedbackService = require('./services/feedbackService');

// Controllers
const AuthController = require('./controllers/authController');
const TreeController = require('./controllers/treeController');
const FamilyMemberController = require('./controllers/familyMemberController');
const ApprovalController = require('./controllers/approvalController');
const MarriageController = require('./controllers/marriageController');
const AdminController = require('./controllers/adminController');
const PaymentController = require('./controllers/paymentController');
const FeedbackController = require('./controllers/feedbackController');

// Middlewares
const createAuthMiddleware = require('./middlewares/auth.middleware');
const createRoleMiddleware = require('./middlewares/role.middleware');

// Inisialisasi Dependensi (Dependency Injection)
const jwtSecret = process.env.JWT_SECRET || 'supersecretkey_silsilah_keluarga_2026_dev';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
const googleClientId = process.env.GOOGLE_CLIENT_ID || null;

// 1. Lapisan Repositories
const userRepository = new UserRepository(pool);
const treeRepository = new TreeRepository(pool);
const familyMemberRepository = new FamilyMemberRepository(pool);
const approvalRepository = new ApprovalRepository(pool);
const marriageRepository = new MarriageRepository(pool);
const upgradePlanRepository = new UpgradePlanRepository(pool);
const systemSettingRepository = new SystemSettingRepository(pool);
const transactionRepository = new TransactionRepository(pool);
const treeInvitationRepository = new TreeInvitationRepository(pool);
const passwordResetRepository = new PasswordResetRepository(pool);
const feedbackRepository = new FeedbackRepository(pool);

// 2. Lapisan Services
const emailService = new EmailService();
const authService = new AuthService(
  userRepository,
  jwtSecret,
  jwtExpiresIn,
  googleClientId,
  treeRepository,
  treeInvitationRepository,
  emailService,
  passwordResetRepository
);
const treeService = new TreeService(
  treeRepository,
  userRepository,
  pool,
  treeInvitationRepository,
  emailService
);
const familyMemberService = new FamilyMemberService(familyMemberRepository, treeRepository, pool);
const approvalService = new ApprovalService(
  approvalRepository,
  familyMemberRepository,
  treeRepository,
  pool
);
const marriageService = new MarriageService(
  marriageRepository,
  familyMemberRepository,
  treeRepository,
  pool
);
const adminService = new AdminService(
  upgradePlanRepository,
  systemSettingRepository,
  transactionRepository,
  userRepository,
  pool
);
const paymentService = new PaymentService(
  transactionRepository,
  upgradePlanRepository,
  systemSettingRepository,
  treeRepository,
  pool,
  emailService
);
const feedbackService = new FeedbackService(feedbackRepository, emailService);

// 3. Lapisan Controllers
const authController = new AuthController(authService);
const treeController = new TreeController(treeService);
const familyMemberController = new FamilyMemberController(familyMemberService);
const approvalController = new ApprovalController(approvalService);
const marriageController = new MarriageController(marriageService);
const adminController = new AdminController(adminService);
const paymentController = new PaymentController(paymentService);
const feedbackController = new FeedbackController(feedbackService);

// 4. Middlewares
const authMiddleware = createAuthMiddleware(jwtSecret);
const requireTreeRole = (allowedRoles = []) => createRoleMiddleware(treeRepository, allowedRoles);

module.exports = {
  pool,
  // Repositories
  userRepository,
  treeRepository,
  familyMemberRepository,
  approvalRepository,
  marriageRepository,
  upgradePlanRepository,
  systemSettingRepository,
  transactionRepository,
  treeInvitationRepository,
  feedbackRepository,
  // Services
  authService,
  treeService,
  familyMemberService,
  approvalService,
  marriageService,
  adminService,
  paymentService,
  emailService,
  feedbackService,
  // Controllers
  authController,
  treeController,
  familyMemberController,
  approvalController,
  marriageController,
  adminController,
  paymentController,
  feedbackController,
  // Middlewares
  authMiddleware,
  requireTreeRole,
};

const { z } = require('zod');

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal lahir harus YYYY-MM-DD')
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'Tanggal tidak valid',
  });

const registerSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
  nama_lengkap: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

const createTreeSchema = z.object({
  nama_silsilah: z.string().min(2, 'Nama silsilah minimal 2 karakter').max(100),
  max_members: z.number().int().min(1).optional(),
});

const updateTreeSchema = z.object({
  nama_silsilah: z.string().min(2, 'Nama silsilah minimal 2 karakter').max(100),
});

const addTreeMemberSchema = z.object({
  targetUserEmail: z.string().email('Format email tidak valid'),
  role: z.enum(['ADMIN_UTAMA', 'KONTRIBUTOR', 'VIEWER'], {
    errorMap: () => ({ message: 'Role harus salah satu dari: ADMIN_UTAMA, KONTRIBUTOR, VIEWER' }),
  }),
});

const addFamilyMemberSchema = z.object({
  nama_lengkap: z.string().min(2, 'Nama anggota minimal 2 karakter').max(100),
  jenis_kelamin: z.enum(['L', 'P'], {
    errorMap: () => ({ message: 'Jenis kelamin harus L (Laki-laki) atau P (Perempuan)' }),
  }),
  tanggal_lahir: dateSchema.nullable().optional(),
  ayah_id: z.string().uuid().nullable().optional(),
  ibu_id: z.string().uuid().nullable().optional(),
  urutan_anak: z.number().int().min(0).optional().default(0),
});

const updateFamilyMemberDirectSchema = z.object({
  version: z.number().int().min(1, 'Versi saat ini wajib disertakan untuk Optimistic Locking'),
  patch_data: z.object({
    nama_lengkap: z.string().min(2).max(100).optional(),
    jenis_kelamin: z.enum(['L', 'P']).optional(),
    tanggal_lahir: dateSchema.nullable().optional(),
    ayah_id: z.string().uuid().nullable().optional(),
    ibu_id: z.string().uuid().nullable().optional(),
    urutan_anak: z.number().int().min(0).optional(),
  }),
});

const proposeApprovalSchema = z.object({
  target_member_id: z.string().uuid('target_member_id harus berupa UUID yang valid'),
  target_version: z.number().int().min(1, 'target_version wajib disertakan untuk Optimistic Locking'),
  patch_data: z.object({
    nama_lengkap: z.string().min(2).max(100).optional(),
    jenis_kelamin: z.enum(['L', 'P']).optional(),
    tanggal_lahir: dateSchema.nullable().optional(),
    ayah_id: z.string().uuid().nullable().optional(),
    ibu_id: z.string().uuid().nullable().optional(),
    urutan_anak: z.number().int().min(0).optional(),
  }),
});

const resolveApprovalSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Aksi harus APPROVED atau REJECTED' }),
  }),
  review_notes: z.string().max(500).nullable().optional(),
});

const addMarriageSchema = z.object({
  suami_id: z.string().uuid('suami_id harus berupa UUID valid'),
  istri_id: z.string().uuid('istri_id harus berupa UUID valid'),
  tanggal_pernikahan: dateSchema.nullable().optional(),
});

const createUpgradePlanSchema = z.object({
  kode_paket: z.string().min(2).max(50),
  nama_paket: z.string().min(2).max(100),
  deskripsi: z.string().optional().nullable(),
  target_max_members: z.number().int().min(1),
  target_max_trees: z.number().int().min(1).optional().default(1),
  target_max_collaborators: z.number().int().min(0).optional().default(3),
  harga_normal: z.number().min(0),
  harga_promo: z.number().min(0).optional().nullable(),
  is_promo_active: z.boolean().optional().default(false),
  promo_badge: z.string().max(50).optional().nullable(),
  is_active: z.boolean().optional().default(true),
  urutan: z.number().int().optional().default(0),
});

const updateUpgradePlanSchema = createUpgradePlanSchema.partial();

const updateSettingsSchema = z.record(z.string(), z.string().or(z.number()));

const paymentInquirySchema = z.object({
  treeId: z.string().uuid('treeId harus berupa UUID valid'),
  planId: z.string().uuid('planId harus berupa UUID valid'),
  paymentMethod: z.string().min(1).default('SP'), // SP = ShopeePay / QRIS
  returnUrl: z.string().url().optional(),
});

const updateUserRoleSchema = z.object({
  system_role: z.enum(['USER', 'SUPER_ADMIN'], {
    errorMap: () => ({ message: 'Role harus USER atau SUPER_ADMIN' }),
  }),
});

const updateCollaboratorRoleSchema = z.object({
  role: z.enum(['ADMIN_UTAMA', 'KONTRIBUTOR', 'VIEWER'], {
    errorMap: () => ({ message: 'Role harus ADMIN_UTAMA, KONTRIBUTOR, atau VIEWER' }),
  }),
});

const updateMarriageSchema = z.object({
  tanggal_pernikahan: dateSchema.nullable().optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  createTreeSchema,
  updateTreeSchema,
  addTreeMemberSchema,
  addFamilyMemberSchema,
  updateFamilyMemberDirectSchema,
  proposeApprovalSchema,
  resolveApprovalSchema,
  addMarriageSchema,
  createUpgradePlanSchema,
  updateUpgradePlanSchema,
  updateSettingsSchema,
  paymentInquirySchema,
  updateUserRoleSchema,
  updateCollaboratorRoleSchema,
  updateMarriageSchema,
};

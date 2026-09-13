/**
 * Helper untuk mendapatkan URL Frontend resmi platform.
 * Selalu memprioritaskan domain resmi https://silsilahkeluarga.id
 * dan mencegah tautan tersasar ke domain sementara/staging (seperti Vercel).
 */
function getFrontendUrl() {
  const envUrl = process.env.FRONTEND_URL;
  if (!envUrl) return 'https://silsilahkeluarga.id';

  const origins = envUrl.split(',').map(s => s.trim()).filter(Boolean);

  // 1. Prioritaskan domain resmi silsilahkeluarga.id jika ada di daftar
  const official = origins.find(u => u.includes('silsilahkeluarga.id'));
  if (official) return official.replace(/\/+$/, '');

  // 2. Jika tidak ada dan bukan localhost/vercel, gunakan URL pertama yang valid
  const productionCustom = origins.find(u => !u.includes('vercel.app') && !u.includes('localhost') && !u.includes('127.0.0.1'));
  if (productionCustom) return productionCustom.replace(/\/+$/, '');

  // 3. Fallback mutlak selalu ke domain resmi platform
  return 'https://silsilahkeluarga.id';
}

module.exports = {
  getFrontendUrl,
};

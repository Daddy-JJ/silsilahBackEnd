const { UnprocessableEntityError } = require('../errors/AppError');

/**
 * Validasi Pencegahan Relasi Siklis (Anti-Cycle DAG)
 * Memastikan bahwa penetapan ayah_id atau ibu_id tidak menyebabkan anggota menjadi leluhur bagi dirinya sendiri.
 * 
 * @param {Array} allMembers - Seluruh anggota keluarga dalam pohon terkait (maks 50)
 * @param {string|null} memberId - ID anggota yang sedang dibuat atau diperbarui (null jika pembuatan baru)
 * @param {string|null} newAyahId - Calon ayah_id baru
 * @param {string|null} newIbuId - Calon ibu_id baru
 */
function validateAcyclicRelation(allMembers, memberId, newAyahId, newIbuId) {
  // 1. Cek self-parenting
  if (memberId) {
    if (newAyahId && newAyahId === memberId) {
      throw new UnprocessableEntityError(
        'Relasi siklis terdeteksi: Anggota tidak boleh menjadi ayah bagi dirinya sendiri.'
      );
    }
    if (newIbuId && newIbuId === memberId) {
      throw new UnprocessableEntityError(
        'Relasi siklis terdeteksi: Anggota tidak boleh menjadi ibu bagi dirinya sendiri.'
      );
    }
  }

  // Jika tidak ada orang tua yang ditentukan, tidak mungkin ada siklus
  if (!newAyahId && !newIbuId) {
    return true;
  }

  // Jika ini anggota baru (belum punya ID di basis data),
  // orang tua yang dipilih (jika ada) tidak mungkin memiliki anggota baru ini sebagai leluhurnya.
  if (!memberId) {
    return true;
  }

  // Buat lookup map: memberId -> { ayah_id, ibu_id }
  const memberMap = new Map();
  for (const m of allMembers) {
    memberMap.set(m.id, {
      ayah_id: m.ayah_id,
      ibu_id: m.ibu_id,
    });
  }

  /**
   * Helper untuk mencari seluruh leluhur (ancestors) dari suatu targetId
   * @param {string} startId 
   * @returns {Set<string>}
   */
  function getAncestors(startId) {
    const ancestors = new Set();
    const queue = [startId];
    const visited = new Set();

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) continue;
      visited.add(currentId);

      const parentInfo = memberMap.get(currentId);
      if (parentInfo) {
        if (parentInfo.ayah_id) {
          ancestors.add(parentInfo.ayah_id);
          queue.push(parentInfo.ayah_id);
        }
        if (parentInfo.ibu_id) {
          ancestors.add(parentInfo.ibu_id);
          queue.push(parentInfo.ibu_id);
        }
      }
    }

    return ancestors;
  }

  // Jika memberId ditemukan di antara leluhur dari newAyahId,
  // maka menjadikan newAyahId sebagai ayah dari memberId akan membentuk siklus!
  if (newAyahId) {
    const ayahAncestors = getAncestors(newAyahId);
    if (ayahAncestors.has(memberId)) {
      throw new UnprocessableEntityError(
        'Relasi siklis terdeteksi: Calon ayah merupakan keturunan dari anggota ini (anak tidak boleh menjadi leluhur bagi dirinya sendiri).'
      );
    }
  }

  // Jika memberId ditemukan di antara leluhur dari newIbuId,
  // maka menjadikan newIbuId sebagai ibu dari memberId akan membentuk siklus!
  if (newIbuId) {
    const ibuAncestors = getAncestors(newIbuId);
    if (ibuAncestors.has(memberId)) {
      throw new UnprocessableEntityError(
        'Relasi siklis terdeteksi: Calon ibu merupakan keturunan dari anggota ini (anak tidak boleh menjadi leluhur bagi dirinya sendiri).'
      );
    }
  }

  return true;
}

const { BadRequestError } = require('../errors/AppError');

function validateParentsGender(allMembers, ayahId, ibuId) {
  if (ayahId) {
    const ayah = allMembers.find((m) => m.id === ayahId);
    if (!ayah) {
      throw new BadRequestError('Data ayah yang dipilih tidak ditemukan dalam pohon ini.');
    }
    if (ayah.jenis_kelamin !== 'L') {
      throw new BadRequestError('Anggota yang dipilih sebagai ayah harus berjenis kelamin Laki-laki (L).');
    }
  }

  if (ibuId) {
    const ibu = allMembers.find((m) => m.id === ibuId);
    if (!ibu) {
      throw new BadRequestError('Data ibu yang dipilih tidak ditemukan dalam pohon ini.');
    }
    if (ibu.jenis_kelamin !== 'P') {
      throw new BadRequestError('Anggota yang dipilih sebagai ibu harus berjenis kelamin Perempuan (P).');
    }
  }
}

module.exports = {
  validateAcyclicRelation,
  validateParentsGender,
};

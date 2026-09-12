/**
 * Helper untuk memetakan data family_members dari database
 * ke format state visualisasi React Flow:
 * - nodes: { id, data: { label, ... }, position: { x, y } }
 * - edges: { id, source, target, ... }
 */
function mapFamilyMembersToReactFlow(members) {
  if (!Array.isArray(members)) {
    return { nodes: [], edges: [] };
  }

  // Hitung kedalaman generasi (generation level) sederhana untuk estimasi posisi vertikal
  const depthMap = new Map();
  const memberMap = new Map(members.map((m) => [m.id, m]));

  function getDepth(id, visited = new Set()) {
    if (!id || visited.has(id)) return 0;
    if (depthMap.has(id)) return depthMap.get(id);

    visited.add(id);
    const m = memberMap.get(id);
    if (!m) return 0;

    const ayahDepth = m.ayah_id ? getDepth(m.ayah_id, new Set(visited)) + 1 : 0;
    const ibuDepth = m.ibu_id ? getDepth(m.ibu_id, new Set(visited)) + 1 : 0;
    const depth = Math.max(ayahDepth, ibuDepth);
    depthMap.set(id, depth);
    return depth;
  }

  // Petakan kedalaman seluruh node
  for (const m of members) {
    getDepth(m.id);
  }

  // Kelompokkan per level kedalaman untuk menentukan posisi horizontal
  const levelBuckets = new Map();
  for (const m of members) {
    const d = depthMap.get(m.id) || 0;
    if (!levelBuckets.has(d)) {
      levelBuckets.set(d, []);
    }
    levelBuckets.get(d).push(m);
  }

  const nodes = [];
  const edges = [];

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;
  const GAP_X = 60;
  const GAP_Y = 120;

  levelBuckets.forEach((bucketMembers, level) => {
    bucketMembers.forEach((member, index) => {
      const posX = index * (NODE_WIDTH + GAP_X);
      const posY = level * (NODE_HEIGHT + GAP_Y);

      nodes.push({
        id: member.id,
        type: 'customFamilyNode',
        position: { x: posX, y: posY },
        data: {
          label: member.nama_lengkap,
          id: member.id,
          tree_id: member.tree_id,
          nama_lengkap: member.nama_lengkap,
          jenis_kelamin: member.jenis_kelamin,
          tanggal_lahir: member.tanggal_lahir,
          ayah_id: member.ayah_id,
          ibu_id: member.ibu_id,
          urutan_anak: member.urutan_anak,
          kontributor_id: member.kontributor_id,
          version: member.version,
          created_at: member.created_at,
          updated_at: member.updated_at,
        },
      });

      // Hubungkan relasi ayah (edge)
      if (member.ayah_id && memberMap.has(member.ayah_id)) {
        edges.push({
          id: `e-ayah-${member.ayah_id}-${member.id}`,
          source: member.ayah_id,
          target: member.id,
          type: 'smoothstep',
          label: 'Ayah',
          animated: false,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
        });
      }

      // Hubungkan relasi ibu (edge)
      if (member.ibu_id && memberMap.has(member.ibu_id)) {
        edges.push({
          id: `e-ibu-${member.ibu_id}-${member.id}`,
          source: member.ibu_id,
          target: member.id,
          type: 'smoothstep',
          label: 'Ibu',
          animated: false,
          style: { stroke: '#ec4899', strokeWidth: 2 },
        });
      }
    });
  });

  return { nodes, edges };
}

module.exports = {
  mapFamilyMembersToReactFlow,
};

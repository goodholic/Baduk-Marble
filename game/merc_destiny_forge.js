// v7.0 — 운명의 대장간 시스템
// 운명+전설 무기+유전자+감정을 결합하여 최종 장비 제작

const DESTINY_MATERIALS = [
  { id: 'fate_thread', name: '운명의 실', icon: '🧵⭐', source: '운명 시스템 완료', desc: '운명이 깃든 실' },
  { id: 'legacy_core', name: '전설 무기 핵', icon: '⚔️💎', source: '전설 무기 100레벨', desc: '전설 무기의 핵심' },
  { id: 'dna_essence', name: '유전자 정수', icon: '🧬✨', source: '유전자 연구소 합성', desc: '생명의 정수' },
  { id: 'emotion_crystal', name: '감정 결정', icon: '💎🌀', source: '감정 진화 달성', desc: '감정이 결정화된 것' },
  { id: 'soul_fragment', name: '영혼 파편', icon: '👻💎', source: '소울 링크 5티어', desc: '영혼의 조각' },
  { id: 'star_dust', name: '별의 먼지', icon: '⭐✨', source: '별자리 궁극기 사용', desc: '별에서 떨어진 먼지' },
  { id: 'world_tree_sap', name: '세계수 수액', icon: '🌳💧', source: '세계수 5단계', desc: '세계수의 생명력' },
  { id: 'dragon_tear', name: '용의 눈물', icon: '🐲💧', source: '소원의 용 소환', desc: '용이 흘린 눈물' },
];

// 최종 장비 (운명의 대장간에서만 제작)
const DESTINY_EQUIPMENT = [
  { id: 'sword_of_fate', name: '운명의 검', icon: '⚔️🌟', grade: 'transcend',
    materials: ['fate_thread', 'legacy_core', 'emotion_crystal'],
    stats: { atk: 300, trueDmg: 100, critDmg: 1.5 }, skill: '운명 절단(방어 무시 HP 40%)',
    desc: '운명을 베는 검' },
  { id: 'armor_of_eternity', name: '영원의 갑주', icon: '🛡️🌟', grade: 'transcend',
    materials: ['soul_fragment', 'world_tree_sap', 'dna_essence'],
    stats: { def: 250, hp: 5000, dmgReduce: 0.2 }, skill: '영원의 방어(10초 무적)',
    desc: '영원히 부서지지 않는 갑옷' },
  { id: 'staff_of_cosmos', name: '우주의 지팡이', icon: '🪄🌌', grade: 'transcend',
    materials: ['star_dust', 'emotion_crystal', 'dragon_tear'],
    stats: { matk: 350, penetration: 0.3, cdReduce: 0.5 }, skill: '우주 폭발(전체 HP 30%)',
    desc: '별의 힘을 담은 지팡이' },
  { id: 'ring_of_genesis', name: '창세의 반지', icon: '💍🌟', grade: 'transcend',
    materials: ['dragon_tear', 'fate_thread', 'world_tree_sap', 'star_dust'],
    stats: { allStat: 100, revive: 3 }, skill: '창세(전장 리셋+아군 전체 회복)',
    desc: '세계를 다시 시작하는 반지', ultimate: true },
  { id: 'crown_of_infinity', name: '무한의 관', icon: '👑🌟', grade: 'transcend',
    materials: ['fate_thread', 'legacy_core', 'soul_fragment', 'dna_essence', 'emotion_crystal', 'star_dust', 'world_tree_sap', 'dragon_tear'],
    stats: { allStat: 150, transcend: true }, skill: '무한(모든 스킬 쿨다운 리셋+전 스탯 2배 10초)',
    desc: '모든 재료가 필요한 궁극의 관! 게임 최강 장비!', mythic: true },
];

// 대장간 레벨
const FORGE_LEVELS = [
  { lv: 1, name: '기초 대장간', cost: 100000, craftable: 1, desc: '기본 초월 장비 1종' },
  { lv: 2, name: '고급 대장간', cost: 300000, craftable: 3, desc: '3종 제작 가능' },
  { lv: 3, name: '전설 대장간', cost: 500000, craftable: 4, desc: '4종+궁극 1종' },
  { lv: 4, name: '운명의 대장간', cost: 1000000, craftable: 5, desc: '모든 초월 장비 제작 가능!', ultimate: true },
];

function forgeDestinyEquip(player, equipId) {
  const equip = DESTINY_EQUIPMENT.find(e => e.id === equipId);
  if (!equip) return { ok: false, reason: '알 수 없는 장비' };
  // 재료 체크 (간략화)
  const mats = player.destinyMaterials || {};
  for (const mat of equip.materials) {
    if (!mats[mat]) return { ok: false, reason: `재료 부족: ${mat}` };
  }
  for (const mat of equip.materials) mats[mat]--;
  player.destinyMaterials = mats;
  player.destinyEquipment = player.destinyEquipment || [];
  player.destinyEquipment.push({ ...equip, forged: Date.now() });
  return { ok: true, equipment: equip };
}

function register(io, socket, player) {
  socket.on('destiny_forge_info', () => {
    socket.emit('destiny_forge_info', { materials: DESTINY_MATERIALS, equipment: DESTINY_EQUIPMENT, levels: FORGE_LEVELS, myMaterials: player.destinyMaterials || {}, myEquipment: player.destinyEquipment || [] });
  });
  socket.on('destiny_forge_craft', (data) => {
    const result = forgeDestinyEquip(player, data.equipId);
    socket.emit('destiny_forge_result', result);
    if (result.ok) io.emit('server_msg', `🔨🌟 [운명의 대장간] ${player.name}이(가) "${result.equipment.name}" 제작 성공!!! ${result.equipment.mythic ? '★★★ 게임 최강 장비! ★★★' : ''}`);
  });
}

module.exports = { DESTINY_MATERIALS, DESTINY_EQUIPMENT, FORGE_LEVELS, forgeDestinyEquip, register };

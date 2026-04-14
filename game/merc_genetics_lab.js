// v6.6 — 유전자 연구소
// 용병 DNA 추출+결합, 유전자 변이, 키메라 생성, 금단의 실험

const DNA_TYPES = [
  { id: 'strength', name: '힘 유전자', icon: '💪🧬', effect: { atk: 1.08 }, source: '전사 계열 용병', rarity: 'common' },
  { id: 'defense', name: '방어 유전자', icon: '🛡️🧬', effect: { def: 1.08 }, source: '탱커 계열', rarity: 'common' },
  { id: 'speed', name: '속도 유전자', icon: '💨🧬', effect: { spd: 1.08 }, source: '암살자/궁수', rarity: 'common' },
  { id: 'magic', name: '마력 유전자', icon: '🔮🧬', effect: { matk: 1.08 }, source: '마법사', rarity: 'common' },
  { id: 'heal', name: '재생 유전자', icon: '💚🧬', effect: { hpRegen: 0.03 }, source: '힐러', rarity: 'uncommon' },
  { id: 'dragon', name: '용의 유전자', icon: '🐲🧬', effect: { fireDmg: 1.2, hp: 1.1 }, source: '드래곤 계열', rarity: 'epic' },
  { id: 'demon', name: '마족 유전자', icon: '😈🧬', effect: { darkDmg: 1.2, lifeSteal: 0.1 }, source: '마족 계열', rarity: 'epic' },
  { id: 'celestial', name: '천상 유전자', icon: '✨🧬', effect: { holyDmg: 1.2, healPow: 1.15 }, source: '천사/신성', rarity: 'epic' },
  { id: 'void', name: '공허 유전자', icon: '🌀🧬', effect: { trueDmg: 50, penetration: 0.15 }, source: '심연 계열', rarity: 'legend' },
  { id: 'primordial', name: '태초의 유전자', icon: '🌟🧬', effect: { allStat: 1.1 }, source: '태초의 존재', rarity: 'myth' },
];

// 유전자 결합 (2개 DNA → 신규 특성)
const DNA_COMBOS = [
  { a: 'dragon', b: 'demon', result: { name: '마룡 유전자', icon: '🐲😈🧬', effect: { atk: 1.15, darkFire: true } }, chance: 0.5, desc: '어둠의 드래곤' },
  { a: 'celestial', b: 'void', result: { name: '혼돈 유전자', icon: '✨🌀🧬', effect: { allStat: 1.08, chaos: true } }, chance: 0.3, desc: '빛과 어둠의 공존' },
  { a: 'strength', b: 'speed', result: { name: '폭풍 유전자', icon: '💪💨🧬', effect: { atk: 1.1, spd: 1.1 } }, chance: 0.7, desc: '힘+속도 융합' },
  { a: 'dragon', b: 'celestial', result: { name: '신룡 유전자', icon: '🐲✨🧬', effect: { allStat: 1.12 } }, chance: 0.2, desc: '신성한 용의 유전자', legendary: true },
  { a: 'primordial', b: 'void', result: { name: '초월 유전자', icon: '🌟🌀🧬', effect: { allStat: 1.15, transcend: true } }, chance: 0.1, desc: '모든 한계를 넘어선', mythic: true },
];

// 키메라 생성 (3개 이상 DNA → 합성 용병)
const CHIMERA_RECIPES = [
  { dna: ['dragon', 'demon', 'void'], name: '마왕룡 키메라', icon: '🐲😈🌀', grade: 'myth', stats: { hp: 15000, atk: 700, def: 400 }, skill: '혼돈의 브레스', desc: '세 종족의 힘이 하나로' },
  { dna: ['celestial', 'heal', 'primordial'], name: '생명의 천사 키메라', icon: '✨💚🌟', grade: 'myth', stats: { hp: 12000, atk: 300, healPow: 1000 }, skill: '생명 창조', desc: '생명 그 자체' },
  { dna: ['strength', 'defense', 'speed', 'magic'], name: '만능 키메라', icon: '🧬👑', grade: 'legend', stats: { hp: 10000, atk: 500, def: 500, spd: 8 }, skill: '전 스탯 폭발', desc: '모든 유전자의 집합체' },
];

// 금단의 실험 (실패 시 돌연변이)
const EXPERIMENT_RISKS = [
  { id: 'success', chance: 0.5, desc: '성공! 원하는 결과' },
  { id: 'mutation', chance: 0.25, desc: '돌연변이! 예측 불가 능력 (강할 수도 약할 수도)', effect: 'randomStat' },
  { id: 'failure', chance: 0.15, desc: '실패! 재료만 소멸' },
  { id: 'catastrophe', chance: 0.08, desc: '대참사! 용병 스탯 일부 영구 감소 (-5%)', effect: 'statLoss' },
  { id: 'miracle', chance: 0.02, desc: '기적! 모든 유전자 효과 2배!', effect: 'double' },
];

// 연구소 레벨
const LAB_LEVELS = [
  { lv: 1, name: '기초 연구소', cost: 30000, maxDna: 2, maxExperiments: 1, desc: '기본 유전자 결합' },
  { lv: 2, name: '고급 연구소', cost: 80000, maxDna: 3, maxExperiments: 2, desc: '3DNA 결합+키메라' },
  { lv: 3, name: '금단의 연구소', cost: 200000, maxDna: 5, maxExperiments: 3, desc: '금단의 실험 해금', forbidden: true },
];

function extractDna(merc) {
  const pool = DNA_TYPES.filter(d => d.rarity === 'common' || Math.random() < 0.3);
  return pool[Math.floor(Math.random() * pool.length)];
}

function combineDna(player, dnaIdA, dnaIdB) {
  const combo = DNA_COMBOS.find(c => (c.a === dnaIdA && c.b === dnaIdB) || (c.a === dnaIdB && c.b === dnaIdA));
  if (!combo) return { ok: false, reason: '유효한 조합 없음' };
  const success = Math.random() < combo.chance;
  if (!success) {
    const risk = EXPERIMENT_RISKS.find(r => Math.random() < r.chance) || EXPERIMENT_RISKS[2];
    return { ok: true, success: false, risk };
  }
  return { ok: true, success: true, result: combo.result };
}

function register(io, socket, player) {
  socket.on('genetics_info', () => {
    socket.emit('genetics_info', { dnaTypes: DNA_TYPES, combos: DNA_COMBOS, chimeras: CHIMERA_RECIPES, risks: EXPERIMENT_RISKS, labLevels: LAB_LEVELS, lab: player.geneticsLab });
  });
  socket.on('genetics_extract', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('genetics_extract_result', { ok: false });
    const dna = extractDna(merc);
    player.dnaStorage = player.dnaStorage || [];
    player.dnaStorage.push(dna);
    socket.emit('genetics_extract_result', { ok: true, dna });
  });
  socket.on('genetics_combine', (data) => {
    const result = combineDna(player, data.dnaA, data.dnaB);
    socket.emit('genetics_combine_result', result);
    if (result.success) io.emit('server_msg', `🧬✨ [유전자] ${player.name}이(가) "${result.result.name}" 유전자 합성 성공!`);
  });
}

module.exports = { DNA_TYPES, DNA_COMBOS, CHIMERA_RECIPES, EXPERIMENT_RISKS, LAB_LEVELS, extractDna, combineDna, register };

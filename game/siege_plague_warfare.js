// v6.7 — 역병 전쟁 시스템
// 공성전에서 역병을 무기로 사용, 감염 전파, 치료, 생화학전

const PLAGUE_TYPES = [
  { id: 'black_plague', name: '흑사병', icon: '☠️🖤', dot: 30, spreadRate: 0.3, duration: 30, cure: 'antidote', desc: '빠른 전파+지속 데미지' },
  { id: 'madness', name: '광기병', icon: '🤪☠️', dot: 10, spreadRate: 0.2, duration: 20, effect: 'confusion', cure: 'holy_water', desc: '감염자 조작 랜덤화!' },
  { id: 'petrify', name: '석화병', icon: '🗿☠️', dot: 0, spreadRate: 0.1, duration: 10, effect: 'slow_to_stop', cure: 'elixir', desc: '점점 느려지다 석화!' },
  { id: 'undeath', name: '언데드 역병', icon: '💀☠️', dot: 0, spreadRate: 0.4, duration: 60, effect: 'turn_undead', cure: 'divine_cure', desc: '사망 시 좀비로 부활! (적 편)' },
  { id: 'mana_rot', name: '마력 부패', icon: '🔮☠️', dot: 0, spreadRate: 0.15, duration: 25, effect: 'no_skills', cure: 'mana_crystal', desc: '스킬 사용 불가!' },
  { id: 'void_plague', name: '공허 역병', icon: '🌀☠️', dot: 50, spreadRate: 0.5, duration: 15, effect: 'stat_drain', cure: 'void_antidote', desc: '스탯 서서히 감소! 최악의 역병', legendary: true },
];

// 역병 무기 (역병을 발사하는 장치)
const PLAGUE_WEAPONS = [
  { id: 'plague_catapult', name: '역병 투석기', icon: '🪨☠️', range: 300, aoe: 5, cost: 15000, desc: '역병 항아리 발사' },
  { id: 'poison_well', name: '독우물', icon: '🪣☠️', range: 0, aoe: 3, cost: 8000, desc: '우물에 독 투입 (범위 감염)' },
  { id: 'plague_rat', name: '역병 쥐', icon: '🐀☠️', range: 100, spreadBonus: 1.5, cost: 5000, desc: '쥐를 풀어 전파!' },
  { id: 'miasma_bomb', name: '독기 폭탄', icon: '💣💨☠️', range: 200, aoe: 8, cost: 20000, desc: '넓은 범위 독기' },
  { id: 'curse_totem', name: '저주 토템', icon: '🗿☠️', range: 0, aoe: 10, cost: 25000, desc: '지속 역병 방출 토템' },
];

// 치료 시스템
const CURES = [
  { id: 'antidote', name: '해독제', icon: '💊', cost: 1000, cures: ['black_plague'], desc: '기본 해독' },
  { id: 'holy_water', name: '성수', icon: '💧✨', cost: 3000, cures: ['madness', 'undeath'], desc: '신성 치료' },
  { id: 'elixir', name: '엘릭서', icon: '🧪✨', cost: 5000, cures: ['petrify', 'mana_rot'], desc: '만병통치 (비쌈)' },
  { id: 'void_antidote', name: '공허 해독제', icon: '🌀💊', cost: 15000, cures: ['void_plague'], desc: '공허 역병 전용' },
  { id: 'divine_cure', name: '신성 치유', icon: '✨💊', cost: 10000, cures: 'all', desc: '모든 역병 치료! (최고가)' },
  { id: 'quarantine', name: '격리', icon: '🚫🧑', cost: 0, desc: '감염자를 격리하여 전파 차단', effect: 'isolate' },
];

// 역병 내성 (반복 감염 시 내성 획득)
const IMMUNITY = {
  infectionsForImmunity: 3,
  immunityDuration: 3600, // 1시간 면역
  desc: '같은 역병 3회 감염 → 1시간 면역 획득',
};

// 보상
const PLAGUE_REWARDS = {
  plague_master: { gold: 40000, title: '역병의 군주', desc: '역병으로 50명 감염' },
  healer_hero:   { gold: 60000, title: '치유의 영웅', desc: '역병 100명 치료' },
  survivor:      { gold: 20000, title: '면역자', desc: '전 역병 면역 달성' },
};

function deployPlague(player, plagueId, weaponId, targetX, targetY) {
  const plague = PLAGUE_TYPES.find(p => p.id === plagueId);
  const weapon = PLAGUE_WEAPONS.find(w => w.id === weaponId);
  if (!plague || !weapon) return { ok: false, reason: '알 수 없는 역병/무기' };
  if ((player.gold || 0) < weapon.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= weapon.cost;
  return { ok: true, plague, weapon, targetX, targetY };
}

function register(io, socket, player) {
  socket.on('plague_info', () => {
    socket.emit('plague_info', { plagues: PLAGUE_TYPES, weapons: PLAGUE_WEAPONS, cures: CURES, immunity: IMMUNITY, rewards: PLAGUE_REWARDS });
  });
  socket.on('plague_deploy', (data) => {
    const result = deployPlague(player, data.plagueId, data.weaponId, data.x, data.y);
    socket.emit('plague_deploy_result', result);
    if (result.ok) io.emit('server_msg', `☠️ [역병 전쟁] ${player.name}이(가) "${result.plague.name}" 발동!`);
  });
}

module.exports = { PLAGUE_TYPES, PLAGUE_WEAPONS, CURES, IMMUNITY, PLAGUE_REWARDS, deployPlague, register };

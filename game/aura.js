// 오라(Aura) 시스템 — v1.76
// 캐릭터 주변 입자 이펙트 + 미세한 전투 보너스
// 트랜스모그(스킨)와 다름: 오라는 추가 시각효과 + 작은 패시브
// 1개만 활성화

const AURAS = {
  // 일반
  white_glow: {
    name: '백광 오라',
    icon: '⚪',
    rarity: 'common',
    color: '#ffffff',
    particle: 'simple_glow',
    bonus: { hp: 20 },
    source: '레벨 5 달성',
  },
  green_leaf: {
    name: '녹엽 오라',
    icon: '🍃',
    rarity: 'common',
    color: '#44cc44',
    particle: 'leaves',
    bonus: { hpRegen: 0.05 },
    source: '약초 100 수집',
  },
  // 희귀
  blue_flame: {
    name: '청염 오라',
    icon: '🔵',
    rarity: 'rare',
    color: '#4488ff',
    particle: 'blue_flame',
    bonus: { def: 8, dmgReduce: 0.02 },
    source: '얼음 협곡 정복',
  },
  red_flame: {
    name: '적염 오라',
    icon: '🔴',
    rarity: 'rare',
    color: '#ff4444',
    particle: 'red_flame',
    bonus: { atk: 10, fireDmg: 0.05 },
    source: '불꽃산 정복',
  },
  golden_glow: {
    name: '황금 오라',
    icon: '🟡',
    rarity: 'rare',
    color: '#ffd700',
    particle: 'golden_sparkle',
    bonus: { goldBonus: 0.05 },
    source: '백만장자 칭호',
  },
  // 영웅
  star_aura: {
    name: '별빛 오라',
    icon: '⭐',
    rarity: 'epic',
    color: '#ddddff',
    particle: 'star_field',
    bonus: { critRate: 0.03, expBonus: 0.05 },
    source: '천공의 정상 100회 방문',
  },
  shadow_aura: {
    name: '그림자 오라',
    icon: '🌑',
    rarity: 'epic',
    color: '#222244',
    particle: 'shadow_smoke',
    bonus: { dodgeRate: 0.04, atk: 5 },
    source: '그림자 영역 마스터',
  },
  // 전설
  phoenix_aura: {
    name: '불사조 오라',
    icon: '🪶',
    rarity: 'legendary',
    color: '#ff8800',
    particle: 'phoenix_feathers',
    bonus: { atk: 15, fireDmg: 0.10, autoRevive: 0.05 },
    source: '불멸의 피닉스 처치',
  },
  void_aura: {
    name: '공허 오라',
    icon: '🌌',
    rarity: 'legendary',
    color: '#aa44ff',
    particle: 'void_tendrils',
    bonus: { critDmg: 0.10, atk: 12 },
    source: '공허의 균열 클리어',
  },
  // 신화
  cosmic_aura: {
    name: '우주 오라',
    icon: '🔮',
    rarity: 'mythic',
    color: '#ff00ff',
    particle: 'cosmic_swirl',
    bonus: { allMulti: 0.03, expBonus: 0.10, dropRate: 0.05 },
    source: '태초의 존재 처치',
  },
};

const AURA_CONFIG = {
  changeCostGold: 100,
};

function _ensure(player) {
  if (!player.auras) player.auras = { unlocked: [], active: null };
  return player.auras;
}

function unlockAura(player, auraId) {
  const aura = AURAS[auraId];
  if (!aura) return { success: false, msg: '존재하지 않는 오라' };
  const data = _ensure(player);
  if (data.unlocked.includes(auraId)) return { success: false, msg: '이미 해금됨' };
  data.unlocked.push(auraId);
  if (!data.active) data.active = auraId;
  return { success: true, aura };
}

function setActive(player, auraId) {
  const data = _ensure(player);
  if (!data.unlocked.includes(auraId)) return { success: false, msg: '해금되지 않은 오라' };
  if (data.active === auraId) return { success: false, msg: '이미 활성화됨' };

  if ((player.gold || 0) < AURA_CONFIG.changeCostGold) {
    return { success: false, msg: `골드 ${AURA_CONFIG.changeCostGold} 필요` };
  }
  player.gold -= AURA_CONFIG.changeCostGold;
  data.active = auraId;
  return { success: true };
}

function deactivate(player) {
  const data = _ensure(player);
  data.active = null;
  return { success: true };
}

function getAuraBonus(player, stat) {
  const data = _ensure(player);
  if (!data.active) return 0;
  const aura = AURAS[data.active];
  if (!aura) return 0;
  return aura.bonus[stat] || 0;
}

function getStatus(player) {
  const data = _ensure(player);
  return {
    unlocked: data.unlocked.map(id => ({ id, ...AURAS[id] })),
    active: data.active ? { id: data.active, ...AURAS[data.active] } : null,
    available: Object.entries(AURAS).map(([id, aura]) => ({
      id, ...aura, owned: data.unlocked.includes(id)
    })),
  };
}

module.exports = {
  AURAS,
  AURA_CONFIG,
  unlockAura,
  setActive,
  deactivate,
  getAuraBonus,
  getStatus,
};

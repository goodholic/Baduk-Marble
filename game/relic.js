// 유물(Relic) 시스템 — v1.47
// 보스/던전/이벤트에서 획득하는 패시브 메타 아이템
// 동시 장착 3개까지 — 일반 장비와 별도 슬롯
// 각 유물은 1~5 강화 가능 (강화당 +20% 효과)

const RELICS = {
  // 공격형
  blade_of_chaos: {
    name: '혼돈의 칼날',
    icon: '⚔️',
    rarity: 'rare',
    desc: 'ATK 비례 증가 + 크리율',
    effects: { atkMulti: 0.10, critRate: 0.03 },
    source: '보스 처치 / 던전 클리어',
  },
  shield_of_eternity: {
    name: '영원의 방패',
    icon: '🛡️',
    rarity: 'rare',
    desc: 'DEF + 피해 감소',
    effects: { defMulti: 0.10, dmgReduce: 0.05 },
    source: '나이트 던전',
  },
  heart_of_dragon: {
    name: '용의 심장',
    icon: '🐲',
    rarity: 'epic',
    desc: 'HP + ATK 보너스',
    effects: { hp: 200, atk: 15, fireDmg: 0.10 },
    source: '드래곤 보스 / 그림자 미궁',
  },
  // 유틸형
  crown_of_kings: {
    name: '왕의 왕관',
    icon: '👑',
    rarity: 'epic',
    desc: '경험치 + 골드 보너스',
    effects: { expBonus: 0.15, goldBonus: 0.15 },
    source: '왕의 성 점령전',
  },
  boots_of_wind: {
    name: '바람의 부츠',
    icon: '🌬️',
    rarity: 'rare',
    desc: '이동/공격 속도',
    effects: { speed: 3, atkSpeed: 0.10 },
    source: '낚시터 / 강변',
  },
  eye_of_truth: {
    name: '진실의 눈',
    icon: '👁️',
    rarity: 'epic',
    desc: '회피 + 시야',
    effects: { dodgeRate: 0.08, visionRange: 5 },
    source: '점쟁이 NPC 의뢰',
  },
  // 전설형
  phoenix_feather: {
    name: '불사조 깃털',
    icon: '🪶',
    rarity: 'legendary',
    desc: '자동 부활 + 화염 면역',
    effects: { autoRevive: 1, fireImmune: true, fireDmg: 0.20 },
    source: '월드 보스 (불멸의 피닉스)',
  },
  void_shard: {
    name: '공허의 파편',
    icon: '🌌',
    rarity: 'legendary',
    desc: '암흑 데미지 + 처형',
    effects: { darkDmg: 0.30, executeBonus: 0.15 },
    source: '공허의 심연 던전',
  },
  // 전설 (수집형)
  star_of_destiny: {
    name: '운명의 별',
    icon: '⭐',
    rarity: 'legendary',
    desc: '모든 스탯 +5%',
    effects: { allMulti: 0.05 },
    source: '주간 랭킹 1위',
  },
  // 신화
  primordial_orb: {
    name: '태초의 구슬',
    icon: '🔮',
    rarity: 'mythic',
    desc: '모든 스탯 대폭 + 시간 가속',
    effects: { allMulti: 0.10, expBonus: 0.30, dropRate: 0.20 },
    source: '신화의 크라켄 (낚시) / 풀 클리어 보상',
  },
};

const RELIC_CONFIG = {
  maxEquipped: 3,
  maxEnchantLevel: 5,
  enchantBonusPerLevel: 0.20, // 효과 ×(1 + 0.20×level)
  enchantCostBase: 5000, // 골드, level^2 곱
  enchantMatRequired: 'mat_dragon',
  enchantMatPerLevel: 2,
};

function _ensure(player) {
  if (!player.relics) player.relics = { owned: {}, equipped: [] };
  return player.relics;
}

function grantRelic(player, relicId) {
  const relic = RELICS[relicId];
  if (!relic) return { success: false, msg: '존재하지 않는 유물' };
  const r = _ensure(player);
  if (r.owned[relicId]) {
    // 중복 시 강화 재료 환급
    return { success: false, msg: '이미 보유 중', refund: { mat_dragon: 1 } };
  }
  r.owned[relicId] = { enchantLevel: 0, acquired: Date.now() };
  return { success: true, relicId, relic };
}

function equipRelic(player, relicId) {
  const r = _ensure(player);
  if (!r.owned[relicId]) return { success: false, msg: '보유하지 않은 유물' };
  if (r.equipped.includes(relicId)) return { success: false, msg: '이미 장착됨' };
  if (r.equipped.length >= RELIC_CONFIG.maxEquipped) {
    return { success: false, msg: `최대 ${RELIC_CONFIG.maxEquipped}개 장착 가능` };
  }
  r.equipped.push(relicId);
  return { success: true };
}

function unequipRelic(player, relicId) {
  const r = _ensure(player);
  const idx = r.equipped.indexOf(relicId);
  if (idx < 0) return { success: false, msg: '장착되지 않음' };
  r.equipped.splice(idx, 1);
  return { success: true };
}

function enchantRelic(player, relicId) {
  const r = _ensure(player);
  if (!r.owned[relicId]) return { success: false, msg: '보유하지 않은 유물' };
  const owned = r.owned[relicId];
  if (owned.enchantLevel >= RELIC_CONFIG.maxEnchantLevel) {
    return { success: false, msg: '최대 강화 도달' };
  }
  const goldCost = RELIC_CONFIG.enchantCostBase * Math.pow(owned.enchantLevel + 1, 2);
  const matCost = RELIC_CONFIG.enchantMatPerLevel * (owned.enchantLevel + 1);
  if ((player.gold || 0) < goldCost) return { success: false, msg: `골드 ${goldCost} 필요` };
  if (!player.inventory || (player.inventory[RELIC_CONFIG.enchantMatRequired] || 0) < matCost) {
    return { success: false, msg: `${RELIC_CONFIG.enchantMatRequired} ${matCost}개 필요` };
  }
  player.gold -= goldCost;
  player.inventory[RELIC_CONFIG.enchantMatRequired] -= matCost;
  if (player.inventory[RELIC_CONFIG.enchantMatRequired] <= 0) {
    delete player.inventory[RELIC_CONFIG.enchantMatRequired];
  }
  owned.enchantLevel++;
  return { success: true, newLevel: owned.enchantLevel };
}

function getRelicBonus(player, stat) {
  const r = _ensure(player);
  let total = 0;
  for (const relicId of r.equipped) {
    const relic = RELICS[relicId];
    const owned = r.owned[relicId];
    if (!relic || !owned) continue;
    const value = relic.effects[stat];
    if (typeof value === 'number') {
      const enchantMulti = 1 + RELIC_CONFIG.enchantBonusPerLevel * owned.enchantLevel;
      total += value * enchantMulti;
    }
  }
  return total;
}

function hasRelicEffect(player, effectKey) {
  const r = _ensure(player);
  for (const relicId of r.equipped) {
    const relic = RELICS[relicId];
    if (relic && relic.effects[effectKey]) return true;
  }
  return false;
}

function getStatus(player) {
  const r = _ensure(player);
  const ownedDetail = {};
  for (const [id, data] of Object.entries(r.owned)) {
    ownedDetail[id] = { ...RELICS[id], enchantLevel: data.enchantLevel };
  }
  return {
    owned: ownedDetail,
    equipped: r.equipped,
    maxEquipped: RELIC_CONFIG.maxEquipped,
    relicPool: RELICS,
  };
}

module.exports = {
  RELICS,
  RELIC_CONFIG,
  grantRelic,
  equipRelic,
  unequipRelic,
  enchantRelic,
  getRelicBonus,
  hasRelicEffect,
  getStatus,
};

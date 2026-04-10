// ==========================================
// 금지된 연금술 (Forbidden Alchemy) — v2.49
// 자유 재료 조합 + 성공/폭발/변이 + 유니크 생성 + 레시피 발견
// ==========================================

// ── 연금술 재료 카테고리 ──
const INGREDIENTS = {
  // 기본 재료
  mat_dragon:       { name: '드래곤 비늘', icon: '🐉', cat: 'monster', rarity: 2 },
  mat_soul:         { name: '영혼석', icon: '👻', cat: 'spirit', rarity: 2 },
  // 변이 재료 (v2.47)
  mut_flame_core:   { name: '화염 변이핵', icon: '🔥', cat: 'mutation', rarity: 2, element: 'fire' },
  mut_frost_core:   { name: '빙결 변이핵', icon: '❄️', cat: 'mutation', rarity: 2, element: 'ice' },
  mut_thunder_core: { name: '뇌전 변이핵', icon: '⚡', cat: 'mutation', rarity: 2, element: 'thunder' },
  mut_void_core:    { name: '공허 변이핵', icon: '🕳️', cat: 'mutation', rarity: 2, element: 'void' },
  mut_rage_crystal: { name: '분노의 결정', icon: '😡', cat: 'mutation', rarity: 3 },
  mut_life_crystal: { name: '생명의 결정', icon: '💚', cat: 'mutation', rarity: 3 },
  mut_mirror_shard: { name: '거울 파편', icon: '🎭', cat: 'mutation', rarity: 3 },
  mut_blood_gem:    { name: '혈석', icon: '🧛', cat: 'mutation', rarity: 3 },
  mut_chaos_orb:    { name: '혼돈의 구슬', icon: '☠️', cat: 'mutation', rarity: 4 },
  mut_gold_nugget:  { name: '황금 덩어리', icon: '✨', cat: 'mutation', rarity: 4 },
  mut_shadow_crystal:{ name: '그림자 결정', icon: '🌑', cat: 'mutation', rarity: 4 },
  mut_primordial_shard:{ name: '태초의 파편', icon: '🌟', cat: 'mutation', rarity: 5 },
};

// ── 알려진 레시피 (2~4개 재료 조합, 순서 무관) ──
const RECIPES = {
  // ═══ 기본 레시피 (쉬움) ═══
  'mat_dragon+mat_dragon+mat_soul': {
    name: '용의 정수', icon: '🐉✨', tier: 1,
    result: { type: 'item', id: 'alchemy_dragon_essence', name: '용의 정수', desc: '장비 화속성 영구 부여', sellPrice: 2000 },
    successRate: 0.85, goldCost: 5000,
  },
  'mat_soul+mat_soul+mat_soul': {
    name: '정제된 영혼', icon: '👻✨', tier: 1,
    result: { type: 'item', id: 'alchemy_pure_soul', name: '정제된 영혼', desc: '경험치 부스터 (+30% 1시간)', sellPrice: 3000 },
    successRate: 0.80, goldCost: 8000,
  },

  // ═══ 원소 조합 (변이핵 활용) ═══
  'mut_flame_core+mut_frost_core': {
    name: '증기 결정', icon: '💨🔮', tier: 2,
    result: { type: 'item', id: 'alchemy_steam_crystal', name: '증기 결정', desc: 'ATK +15, DEF +15 영구 강화석', sellPrice: 5000 },
    successRate: 0.70, goldCost: 15000,
  },
  'mut_thunder_core+mut_void_core': {
    name: '차원 전지', icon: '⚡🕳️', tier: 2,
    result: { type: 'item', id: 'alchemy_void_battery', name: '차원 전지', desc: 'MP +50, 스킬 CD -5% 영구', sellPrice: 6000 },
    successRate: 0.65, goldCost: 18000,
  },
  'mut_flame_core+mut_thunder_core+mut_void_core': {
    name: '폭풍의 심장', icon: '🌪️❤️', tier: 2,
    result: { type: 'item', id: 'alchemy_storm_heart', name: '폭풍의 심장', desc: 'ATK +25, SPD +3 영구', sellPrice: 8000 },
    successRate: 0.60, goldCost: 25000,
  },
  'mut_frost_core+mut_life_crystal': {
    name: '영생의 얼음', icon: '❄️💚', tier: 2,
    result: { type: 'item', id: 'alchemy_eternal_ice', name: '영생의 얼음', desc: 'HP +150, HP리젠 +1% 영구', sellPrice: 7000 },
    successRate: 0.65, goldCost: 20000,
  },

  // ═══ 고급 조합 (희귀 재료) ═══
  'mut_rage_crystal+mut_blood_gem': {
    name: '광전사의 피', icon: '😡🧛', tier: 3,
    result: { type: 'item', id: 'alchemy_berserker_blood', name: '광전사의 피', desc: 'ATK +40, 흡혈 +5% 영구', sellPrice: 15000 },
    successRate: 0.50, goldCost: 50000,
  },
  'mut_mirror_shard+mut_mirror_shard+mat_soul': {
    name: '완벽한 거울', icon: '🎭🪞', tier: 3,
    result: { type: 'item', id: 'alchemy_perfect_mirror', name: '완벽한 거울', desc: '회피 +8%, 피격 시 20% 반사', sellPrice: 12000 },
    successRate: 0.45, goldCost: 40000,
  },
  'mut_life_crystal+mut_life_crystal+mat_dragon': {
    name: '불사의 영약', icon: '💚🧪', tier: 3,
    result: { type: 'item', id: 'alchemy_immortal_elixir', name: '불사의 영약', desc: 'HP +300, 사망 시 1회 부활 (10분 CD)', sellPrice: 20000 },
    successRate: 0.40, goldCost: 60000,
  },

  // ═══ 전설 조합 (태초 재료 필요) ═══
  'mut_chaos_orb+mut_primordial_shard': {
    name: '혼돈의 정수', icon: '☠️🌟', tier: 4,
    result: { type: 'item', id: 'alchemy_chaos_essence', name: '혼돈의 정수', desc: '올스탯 +20, 랜덤 궁극 효과 1개 부여', sellPrice: 50000 },
    successRate: 0.30, goldCost: 200000,
  },
  'mut_primordial_shard+mut_primordial_shard+mat_dragon+mat_soul': {
    name: '현자의 돌', icon: '🔴✨', tier: 4,
    result: { type: 'item', id: 'alchemy_philosophers_stone', name: '현자의 돌', desc: '모든 장비 등급 1단계 승급 (1회)', sellPrice: 100000 },
    successRate: 0.20, goldCost: 500000,
  },
  'mut_gold_nugget+mut_gold_nugget+mut_chaos_orb': {
    name: '마이다스의 손', icon: '✨👑', tier: 4,
    result: { type: 'item', id: 'alchemy_midas_touch', name: '마이다스의 손', desc: '골드 +50% 영구, 드롭 골드 3배 (24시간)', sellPrice: 80000 },
    successRate: 0.25, goldCost: 300000,
  },
  'mut_shadow_crystal+mut_void_core+mut_blood_gem+mat_soul': {
    name: '심연의 왕관', icon: '🌑👑', tier: 4,
    result: { type: 'item', id: 'alchemy_abyss_crown', name: '심연의 왕관', desc: 'ATK +50, CRIT +12%, 흡혈 +8%, 암속성 면역', sellPrice: 70000 },
    successRate: 0.25, goldCost: 250000,
  },
};

// ── 폭발/실패 결과 ──
const FAILURE_RESULTS = [
  { name: '소규모 폭발', desc: 'HP -10%, 재료 50% 소실', hpLossPct: 0.10, matLoss: 0.5 },
  { name: '마력 역류', desc: 'MP 전량 소실 + 재료 소실', mpDrain: true, matLoss: 1.0 },
  { name: '유독 가스', desc: '30초간 ATK/DEF -20%', debuff: { atkReduce: 0.20, defReduce: 0.20, duration: 30 }, matLoss: 1.0 },
  { name: '불안정한 변이', desc: '랜덤 재료 1개 다른 재료로 변환', transmute: true, matLoss: 0 },
  { name: '대폭발', desc: 'HP -30%, 모든 재료 소실 + 골드 -5000', hpLossPct: 0.30, goldLoss: 5000, matLoss: 1.0 },
];

// ── 미지의 조합 발견 보상 ──
const UNKNOWN_RESULTS = [
  { name: '실패한 혼합물', type: 'junk', desc: '쓸모없는 혼합물 (100G)', sellPrice: 100 },
  { name: '불안정한 포션', type: 'potion', desc: '10초간 랜덤 스탯 +20', effect: { randomStat: 20, duration: 10 } },
  { name: '폭발성 구슬', type: 'bomb', desc: '던지면 범위 5 데미지', effect: { dmgMulti: 3.0, range: 5 } },
  { name: '연금술사의 먼지', type: 'dust', desc: '연금술 EXP +50', effect: { alchemyExp: 50 } },
  { name: '기적의 물약', type: 'miracle', desc: 'HP/MP 완전 회복', effect: { fullHeal: true } },
];

// ── 연금술 숙련도 ──
const MASTERY_LEVELS = [
  { level: 1, name: '견습 연금술사', exp: 0, successBonus: 0 },
  { level: 2, name: '연금술사', exp: 300, successBonus: 0.05 },
  { level: 3, name: '고급 연금술사', exp: 800, successBonus: 0.10 },
  { level: 4, name: '대연금술사', exp: 2000, successBonus: 0.15 },
  { level: 5, name: '현자', exp: 5000, successBonus: 0.20 },
  { level: 6, name: '연금술의 왕', exp: 12000, successBonus: 0.25 },
];

function _ensure(player) {
  if (!player._alchemy) {
    player._alchemy = {
      mastery: 0,
      masteryLevel: 1,
      discoveredRecipes: {},  // { recipeKey: { firstMade, count } }
      totalCrafts: 0,
      totalFailures: 0,
      totalExplosions: 0,
    };
  }
  return player._alchemy;
}

function _getMastery(mastery) {
  for (let i = MASTERY_LEVELS.length - 1; i >= 0; i--) {
    if (mastery >= MASTERY_LEVELS[i].exp) return MASTERY_LEVELS[i];
  }
  return MASTERY_LEVELS[0];
}

function _normalizeKey(items) {
  return items.slice().sort().join('+');
}

// ── 연금술 시도 ──
function brew(player, itemIds) {
  const al = _ensure(player);
  if (!Array.isArray(itemIds) || itemIds.length < 2 || itemIds.length > 4) {
    return { success: false, msg: '2~4개 재료를 넣으세요' };
  }

  // 재료 보유 확인
  const needed = {};
  for (const id of itemIds) {
    if (!INGREDIENTS[id]) return { success: false, msg: `알 수 없는 재료: ${id}` };
    needed[id] = (needed[id] || 0) + 1;
  }
  for (const [id, count] of Object.entries(needed)) {
    if (!player.inventory?.[id] || player.inventory[id] < count) {
      return { success: false, msg: `${INGREDIENTS[id].name} 부족 (${player.inventory?.[id] || 0}/${count})` };
    }
  }

  const recipeKey = _normalizeKey(itemIds);
  const recipe = RECIPES[recipeKey];

  // 골드 확인 (레시피가 있으면 해당 비용, 없으면 기본 5000)
  const goldCost = recipe ? recipe.goldCost : 5000;
  if ((player.gold || 0) < goldCost) return { success: false, msg: `골드 부족 (${goldCost}G)` };

  // 재료 소모
  for (const [id, count] of Object.entries(needed)) {
    player.inventory[id] -= count;
    if (player.inventory[id] <= 0) delete player.inventory[id];
  }
  player.gold -= goldCost;

  al.totalCrafts++;
  const masteryData = _getMastery(al.mastery);

  if (recipe) {
    // 알려진 레시피
    const adjustedRate = Math.min(0.95, recipe.successRate + masteryData.successBonus);

    if (Math.random() < adjustedRate) {
      // 성공!
      if (!player.inventory) player.inventory = {};
      player.inventory[recipe.result.id] = (player.inventory[recipe.result.id] || 0) + 1;

      const expGain = recipe.tier * 30;
      al.mastery += expGain;
      al.masteryLevel = _getMastery(al.mastery).level;

      if (!al.discoveredRecipes[recipeKey]) {
        al.discoveredRecipes[recipeKey] = { firstMade: Date.now(), count: 0 };
      }
      al.discoveredRecipes[recipeKey].count++;

      const isNew = al.discoveredRecipes[recipeKey].count === 1;

      return {
        success: true, crafted: true, recipe, result: recipe.result, isNew,
        msg: `${recipe.icon} ${recipe.name} 연성 성공! → ${recipe.result.name}`,
      };
    } else {
      // 실패
      al.totalFailures++;
      const failure = FAILURE_RESULTS[Math.floor(Math.random() * FAILURE_RESULTS.length)];
      _applyFailure(player, failure);
      al.mastery += 5; // 실패해도 약간의 경험치
      return {
        success: true, crafted: false, failure,
        msg: `💥 연성 실패! ${failure.name}: ${failure.desc}`,
      };
    }
  } else {
    // 미지의 조합
    al.mastery += 10;
    al.masteryLevel = _getMastery(al.mastery).level;

    if (Math.random() < 0.3) {
      // 30% 확률로 무언가 얻음
      const result = UNKNOWN_RESULTS[Math.floor(Math.random() * UNKNOWN_RESULTS.length)];
      return {
        success: true, crafted: false, unknown: true, unknownResult: result,
        msg: `⚗️ 미지의 조합! ${result.name}: ${result.desc}`,
      };
    } else {
      // 70% 폭발
      al.totalExplosions++;
      const failure = FAILURE_RESULTS[Math.floor(Math.random() * FAILURE_RESULTS.length)];
      _applyFailure(player, failure);
      return {
        success: true, crafted: false, failure,
        msg: `💥 미지의 조합 폭발! ${failure.name}: ${failure.desc}`,
      };
    }
  }
}

function _applyFailure(player, failure) {
  if (failure.hpLossPct) player.hp = Math.max(1, Math.floor(player.hp * (1 - failure.hpLossPct)));
  if (failure.mpDrain) player.mp = 0;
  if (failure.goldLoss) player.gold = Math.max(0, (player.gold || 0) - failure.goldLoss);
  if (failure.transmute && player.inventory) {
    const keys = Object.keys(player.inventory).filter(k => INGREDIENTS[k]);
    if (keys.length > 0) {
      const src = keys[Math.floor(Math.random() * keys.length)];
      const allIngIds = Object.keys(INGREDIENTS);
      const dst = allIngIds[Math.floor(Math.random() * allIngIds.length)];
      if (player.inventory[src] > 0) {
        player.inventory[src]--;
        if (player.inventory[src] <= 0) delete player.inventory[src];
        player.inventory[dst] = (player.inventory[dst] || 0) + 1;
      }
    }
  }
}

// ── 상태 조회 ──
function getStatus(player) {
  const al = _ensure(player);
  const ml = _getMastery(al.mastery);
  const nextMl = MASTERY_LEVELS[Math.min(ml.level, MASTERY_LEVELS.length - 1)];

  // 보유 재료
  const materials = Object.entries(INGREDIENTS).map(([id, ing]) => ({
    id, name: ing.name, icon: ing.icon, cat: ing.cat, rarity: ing.rarity,
    count: player.inventory?.[id] || 0,
  })).filter(m => m.count > 0);

  // 발견된 레시피
  const discovered = Object.entries(al.discoveredRecipes).map(([key, data]) => {
    const recipe = RECIPES[key];
    if (!recipe) return null;
    return {
      key, name: recipe.name, icon: recipe.icon, tier: recipe.tier,
      result: recipe.result, successRate: Math.floor(Math.min(0.95, recipe.successRate + ml.successBonus) * 100),
      goldCost: recipe.goldCost, craftCount: data.count,
      ingredients: key.split('+').map(id => ({ id, name: INGREDIENTS[id]?.name || id, icon: INGREDIENTS[id]?.icon || '?' })),
    };
  }).filter(Boolean);

  // 미발견 레시피 수
  const undiscovered = Object.keys(RECIPES).filter(k => !al.discoveredRecipes[k]).length;

  return {
    mastery: al.mastery,
    masteryLevel: ml.level,
    masteryName: ml.name,
    successBonus: Math.floor(ml.successBonus * 100),
    nextMasteryExp: nextMl.exp,
    totalCrafts: al.totalCrafts,
    totalFailures: al.totalFailures,
    totalExplosions: al.totalExplosions,
    materials,
    discovered,
    undiscoveredCount: undiscovered,
    totalRecipes: Object.keys(RECIPES).length,
  };
}

module.exports = {
  INGREDIENTS, RECIPES, FAILURE_RESULTS, UNKNOWN_RESULTS, MASTERY_LEVELS,
  brew, getStatus,
};

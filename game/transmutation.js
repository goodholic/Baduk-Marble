// 변환(Transmutation) 시스템 — v1.53
// 중복 아이템 → 제작 재료로 변환
// 장비 분해, 음식 정제, 교역품 압축 등 4가지 변환 카테고리

const { EQUIP_STATS, GRADE_INFO } = require('./data/equipment');
const { TRADE_GOODS } = require('./data/economy');

// 등급별 분해 산출량 (장비)
const DISMANTLE_YIELD = {
  normal:    { mat_magic: 1 },
  uncommon:  { mat_magic: 3, goods_iron: 1 },
  rare:      { mat_magic: 5, mat_soul: 1 },
  epic:      { mat_magic: 10, mat_soul: 3, goods_gem: 1 },
  legendary: { mat_dragon: 1, mat_soul: 5, goods_gem: 2 },
};

// 음식 정제 (음식 → 마법재료/약초)
const FOOD_REFINE = {
  food_hp:    { goods_herb: 1 },
  food_atk:   { goods_herb: 1, goods_spice: 1 },
  food_def:   { goods_herb: 1, goods_potion: 1 },
  food_all:   { goods_potion: 1, mat_magic: 1 },
  food_king:  { mat_magic: 2, goods_gem: 1 },
};

// 교역품 압축 (10개 → 1개 고급 재료)
const TRADE_COMPRESSION = {
  goods_silk:    { mat_magic: 2 },     // 비단 10개 → 마법재료 2
  goods_iron:    { mat_magic: 1 },     // 철광석 10개 → 마법재료 1
  goods_herb:    { goods_potion: 2 },  // 약초 10개 → 물약 원료 2
  goods_gem:     { mat_soul: 1 },      // 보석 10개 → 영혼석 1
  goods_wood:    { mat_magic: 1 },     // 목재 10개 → 마법재료 1
  goods_leather: { mat_magic: 2 },     // 가죽 10개 → 마법재료 2
};

// 마법재료 → 영혼석 → 용재료 업그레이드 사이클
const MAT_UPGRADE = {
  mat_magic_to_soul: {
    name: '영혼석 정제',
    input: { mat_magic: 10 },
    output: { mat_soul: 1 },
    successRate: 0.7,
    cost: 1000,
  },
  mat_soul_to_dragon: {
    name: '용재료 정제',
    input: { mat_soul: 10, goods_gem: 5 },
    output: { mat_dragon: 1 },
    successRate: 0.4,
    cost: 5000,
  },
};

const TRANSMUTATION_CONFIG = {
  compressionUnit: 10, // 교역품 압축 단위
};

function dismantleEquipment(player, equipId) {
  const equip = EQUIP_STATS[equipId];
  if (!equip) return { success: false, msg: '존재하지 않는 장비' };
  if (!player.inventory || !player.inventory[equipId]) {
    return { success: false, msg: '보유하지 않은 장비' };
  }
  if (equip.bound) return { success: false, msg: '귀속 장비는 분해 불가' };

  const yield_ = DISMANTLE_YIELD[equip.grade] || DISMANTLE_YIELD.normal;

  // 장비 1개 차감
  player.inventory[equipId]--;
  if (player.inventory[equipId] <= 0) delete player.inventory[equipId];

  // 재료 지급
  for (const [matId, count] of Object.entries(yield_)) {
    player.inventory[matId] = (player.inventory[matId] || 0) + count;
  }

  return {
    success: true,
    dismantled: equip.name,
    grade: equip.grade,
    yield: yield_,
  };
}

function refineFood(player, foodId) {
  const yield_ = FOOD_REFINE[foodId];
  if (!yield_) return { success: false, msg: '정제 불가능한 음식' };
  if (!player.inventory || !player.inventory[foodId]) {
    return { success: false, msg: '보유하지 않음' };
  }

  player.inventory[foodId]--;
  if (player.inventory[foodId] <= 0) delete player.inventory[foodId];

  for (const [matId, count] of Object.entries(yield_)) {
    player.inventory[matId] = (player.inventory[matId] || 0) + count;
  }

  return { success: true, refined: foodId, yield: yield_ };
}

function compressTrade(player, tradeId) {
  const yield_ = TRADE_COMPRESSION[tradeId];
  if (!yield_) return { success: false, msg: '압축 불가능한 교역품' };
  const required = TRANSMUTATION_CONFIG.compressionUnit;
  if (!player.inventory || (player.inventory[tradeId] || 0) < required) {
    return { success: false, msg: `${required}개 필요` };
  }

  player.inventory[tradeId] -= required;
  if (player.inventory[tradeId] <= 0) delete player.inventory[tradeId];

  for (const [matId, count] of Object.entries(yield_)) {
    player.inventory[matId] = (player.inventory[matId] || 0) + count;
  }

  return { success: true, compressed: tradeId, count: required, yield: yield_ };
}

function upgradeMaterial(player, recipeId) {
  const recipe = MAT_UPGRADE[recipeId];
  if (!recipe) return { success: false, msg: '존재하지 않는 정제법' };
  if ((player.gold || 0) < recipe.cost) return { success: false, msg: `골드 ${recipe.cost} 필요` };
  if (!player.inventory) player.inventory = {};
  for (const [matId, count] of Object.entries(recipe.input)) {
    if ((player.inventory[matId] || 0) < count) {
      return { success: false, msg: `${matId} ${count}개 필요` };
    }
  }

  // 비용 차감
  player.gold -= recipe.cost;
  for (const [matId, count] of Object.entries(recipe.input)) {
    player.inventory[matId] -= count;
    if (player.inventory[matId] <= 0) delete player.inventory[matId];
  }

  // 성공 판정
  const success = Math.random() < recipe.successRate;
  if (success) {
    for (const [matId, count] of Object.entries(recipe.output)) {
      player.inventory[matId] = (player.inventory[matId] || 0) + count;
    }
    return { success: true, recipeId, output: recipe.output };
  }
  return { success: false, msg: `${recipe.name} 실패... 재료 소실`, failed: true };
}

function getTransmutationOptions() {
  return {
    dismantleYield: DISMANTLE_YIELD,
    foodRefine: FOOD_REFINE,
    tradeCompression: TRADE_COMPRESSION,
    matUpgrade: MAT_UPGRADE,
    config: TRANSMUTATION_CONFIG,
  };
}

module.exports = {
  DISMANTLE_YIELD,
  FOOD_REFINE,
  TRADE_COMPRESSION,
  MAT_UPGRADE,
  TRANSMUTATION_CONFIG,
  dismantleEquipment,
  refineFood,
  compressTrade,
  upgradeMaterial,
  getTransmutationOptions,
};

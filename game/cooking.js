// 요리 시스템 — v1.92
// 재료를 조합해 음식을 만들어 일시 버프 부여

const INGREDIENTS = {
  meat:    { name:'고기',   rarity:'common',   buyPrice: 20 },
  fish:    { name:'생선',   rarity:'common',   buyPrice: 25 },
  herb:    { name:'허브',   rarity:'common',   buyPrice: 15 },
  rice:    { name:'쌀',     rarity:'common',   buyPrice: 10 },
  egg:     { name:'달걀',   rarity:'common',   buyPrice: 12 },
  cheese:  { name:'치즈',   rarity:'uncommon', buyPrice: 50 },
  honey:   { name:'꿀',     rarity:'uncommon', buyPrice: 60 },
  truffle: { name:'트러플', rarity:'rare',     buyPrice: 200 },
  dragon_pepper:{ name:'용 후추', rarity:'epic', buyPrice: 500 },
};

const RECIPES = {
  rice_ball: {
    name: '주먹밥',
    ingredients: { rice: 2, herb: 1 },
    buff: { stat:'maxHp', value: 20, durationMin: 10 },
    desc: '간단하지만 든든한 주먹밥',
  },
  grilled_fish: {
    name: '구운 생선',
    ingredients: { fish: 1, herb: 1 },
    buff: { stat:'evasion', value: 3, durationMin: 15 },
    desc: '바삭한 껍질과 부드러운 살',
  },
  meat_stew: {
    name: '고기 스튜',
    ingredients: { meat: 2, herb: 2, rice: 1 },
    buff: { stat:'atk', value: 5, durationMin: 20 },
    desc: '뜨끈한 한 그릇',
  },
  cheese_omelet: {
    name: '치즈 오믈렛',
    ingredients: { egg: 2, cheese: 1 },
    buff: { stat:'def', value: 8, durationMin: 15 },
    desc: '폭신한 황금빛 오믈렛',
  },
  honey_glazed_meat: {
    name: '꿀 발린 고기',
    ingredients: { meat: 2, honey: 1 },
    buff: { stat:'crit', value: 4, durationMin: 20 },
    desc: '달콤하고 짭짤한 별미',
  },
  truffle_pasta: {
    name: '트러플 파스타',
    ingredients: { truffle: 1, cheese: 2, egg: 1 },
    buff: { stat:'expBonus', value: 15, durationMin: 30 },
    desc: '귀족의 식탁에 오를 만한 별미',
  },
  dragon_curry: {
    name: '드래곤 카레',
    ingredients: { meat: 3, dragon_pepper: 1, rice: 2 },
    buff: { stat:'allStats', value: 10, durationMin: 30 },
    desc: '입에서 불을 뿜는 전설의 한 끼',
  },
};

const COOKING_CONFIG = {
  baseSuccessRate: 0.85,
  perfectBonus: 1.5, // 퍼펙트시 buff 1.5배
  perfectChance: 0.1,
};

function _ensure(player) {
  if (!player.cooking) {
    player.cooking = {
      ingredients: {},
      cookCount: 0,
      perfects: 0,
      activeBuffs: [], // {stat,value,expiresAt}
      knownRecipes: ['rice_ball','grilled_fish'], // 시작 레시피
    };
  }
  return player.cooking;
}

function getStatus(player) {
  const c = _ensure(player);
  // 만료된 버프 정리
  const now = Date.now();
  c.activeBuffs = c.activeBuffs.filter(b => b.expiresAt > now);
  return {
    ingredients: c.ingredients,
    cookCount: c.cookCount,
    perfects: c.perfects,
    activeBuffs: c.activeBuffs,
    knownRecipes: c.knownRecipes,
    allRecipes: RECIPES,
    allIngredients: INGREDIENTS,
  };
}

function buyIngredient(player, ingredientId, count) {
  const c = _ensure(player);
  const ing = INGREDIENTS[ingredientId];
  if (!ing) return { success:false, msg:'존재하지 않는 재료' };
  count = Math.max(1, Math.floor(count || 1));
  const totalCost = ing.buyPrice * count;
  if ((player.gold || 0) < totalCost) return { success:false, msg:'골드 부족' };
  player.gold -= totalCost;
  c.ingredients[ingredientId] = (c.ingredients[ingredientId] || 0) + count;
  return { success:true, msg:`${ing.name} ${count}개 구매 (${totalCost}G)`, cost: totalCost };
}

function learnRecipe(player, recipeId) {
  const c = _ensure(player);
  if (!RECIPES[recipeId]) return { success:false, msg:'존재하지 않는 레시피' };
  if (c.knownRecipes.includes(recipeId)) return { success:false, msg:'이미 알고 있음' };
  c.knownRecipes.push(recipeId);
  return { success:true, msg:`${RECIPES[recipeId].name} 레시피 습득!` };
}

function cook(player, recipeId) {
  const c = _ensure(player);
  const recipe = RECIPES[recipeId];
  if (!recipe) return { success:false, msg:'존재하지 않는 레시피' };
  if (!c.knownRecipes.includes(recipeId)) return { success:false, msg:'레시피 미습득' };
  // 재료 확인
  for (const [ing, qty] of Object.entries(recipe.ingredients)) {
    if ((c.ingredients[ing] || 0) < qty) {
      return { success:false, msg:`재료 부족: ${INGREDIENTS[ing]?.name || ing}` };
    }
  }
  // 재료 차감
  for (const [ing, qty] of Object.entries(recipe.ingredients)) {
    c.ingredients[ing] -= qty;
  }
  c.cookCount += 1;
  // 성공 판정
  if (Math.random() > COOKING_CONFIG.baseSuccessRate) {
    return { success:true, msg:`${recipe.name} 조리 실패 — 재료만 잃음`, failed:true };
  }
  // 퍼펙트 판정
  const isPerfect = Math.random() < COOKING_CONFIG.perfectChance;
  if (isPerfect) c.perfects += 1;
  const value = Math.floor(recipe.buff.value * (isPerfect ? COOKING_CONFIG.perfectBonus : 1));
  const buff = {
    stat: recipe.buff.stat,
    value,
    expiresAt: Date.now() + recipe.buff.durationMin * 60000,
    source: recipe.name,
  };
  c.activeBuffs.push(buff);
  return {
    success: true,
    msg: `${recipe.name} 완성!${isPerfect ? ' ⭐ 퍼펙트!' : ''} (+${value} ${recipe.buff.stat}, ${recipe.buff.durationMin}분)`,
    perfect: isPerfect,
    buff,
  };
}

function getActiveBonuses(player) {
  const c = _ensure(player);
  const now = Date.now();
  c.activeBuffs = c.activeBuffs.filter(b => b.expiresAt > now);
  const bonuses = {};
  for (const b of c.activeBuffs) {
    bonuses[b.stat] = (bonuses[b.stat] || 0) + b.value;
  }
  return bonuses;
}

module.exports = {
  INGREDIENTS,
  RECIPES,
  COOKING_CONFIG,
  getStatus,
  buyIngredient,
  learnRecipe,
  cook,
  getActiveBonuses,
};

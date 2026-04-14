// v5.8 — 용병 요리 대전 시스템
// 요리 재료 수집 → 레시피 조합 → 요리 대전 → 승자 버프

const MAX_INGREDIENTS = 5;

// 재료 카테고리
const INGREDIENTS = {
  meat:    [{ id: 'dragon_steak', name: '용 스테이크', icon: '🥩🐲', rarity: 'legend', power: 50 },
            { id: 'boar_meat', name: '멧돼지 고기', icon: '🥩🐗', rarity: 'common', power: 10 },
            { id: 'phoenix_wing', name: '불사조 날개', icon: '🍗🔥', rarity: 'epic', power: 35 }],
  veg:     [{ id: 'world_tree_fruit', name: '세계수 열매', icon: '🍎🌳', rarity: 'legend', power: 45 },
            { id: 'mushroom', name: '마법 버섯', icon: '🍄✨', rarity: 'uncommon', power: 15 },
            { id: 'golden_wheat', name: '황금 밀', icon: '🌾💰', rarity: 'rare', power: 25 }],
  spice:   [{ id: 'dragon_pepper', name: '드래곤 후추', icon: '🌶️🔥', rarity: 'epic', power: 30 },
            { id: 'fairy_salt', name: '요정의 소금', icon: '🧂✨', rarity: 'rare', power: 20 },
            { id: 'void_spice', name: '공허 향신료', icon: '🌀🧂', rarity: 'legend', power: 40 }],
  liquid:  [{ id: 'holy_water', name: '성수', icon: '💧✨', rarity: 'rare', power: 22 },
            { id: 'dragon_blood', name: '용혈', icon: '🩸🐲', rarity: 'legend', power: 48 },
            { id: 'moonlight_dew', name: '달빛 이슬', icon: '🌙💧', rarity: 'epic', power: 32 }],
};

// 전설 레시피 (특정 조합 시 특수 요리)
const LEGENDARY_RECIPES = [
  { name: '용왕의 만찬', icon: '🐲🍽️', ingredients: ['dragon_steak', 'dragon_pepper', 'dragon_blood'], grade: 'myth',
    buff: { allStat: 1.15, duration: 3600 }, desc: '전체 스탯 +15% (1시간!)' },
  { name: '세계수의 축복', icon: '🌳🍽️', ingredients: ['world_tree_fruit', 'holy_water', 'fairy_salt'], grade: 'legend',
    buff: { healPow: 1.5, hpRegen: 0.05, duration: 1800 }, desc: '힐+50%, HP 재생 (30분)' },
  { name: '공허의 향연', icon: '🌀🍽️', ingredients: ['void_spice', 'phoenix_wing', 'moonlight_dew'], grade: 'legend',
    buff: { trueDmg: 80, penetration: 0.2, duration: 1800 }, desc: '진정한 DMG+80, 관통 (30분)' },
  { name: '불사조의 불꽃 요리', icon: '🔥🍽️', ingredients: ['phoenix_wing', 'dragon_pepper', 'holy_water'], grade: 'epic',
    buff: { revive: true, fireDmg: 1.3, duration: 1200 }, desc: '1회 부활 + 화염 DMG+30% (20분)' },
  { name: '달빛 디저트', icon: '🌙🍰', ingredients: ['moonlight_dew', 'fairy_salt', 'golden_wheat'], grade: 'epic',
    buff: { expBonus: 1.5, luckBonus: 1.3, duration: 1800 }, desc: 'EXP+50%, 행운+30% (30분)' },
];

// 요리 대전 (PvP)
const COOK_OFF_RULES = {
  rounds: 3,
  timePerRound: 30,
  judging: ['맛 (재료 파워 합산)', '조화 (카테고리 다양성)', '희귀도 (레어 재료 보너스)', '비법 (전설 레시피 매칭)'],
};

// 요리 대전 보상
const COOK_OFF_REWARDS = {
  winner: { gold: 15000, title: '요리왕', buff: '우승 요리 버프 (자동 적용)' },
  loser: { gold: 3000, buff: '위안 요리 (HP 재생)' },
  perfect: { gold: 30000, title: '전설의 요리사', item: 'golden_spatula' },
};

function scoreDish(ingredientIds) {
  const allItems = [...INGREDIENTS.meat, ...INGREDIENTS.veg, ...INGREDIENTS.spice, ...INGREDIENTS.liquid];
  const used = ingredientIds.map(id => allItems.find(i => i.id === id)).filter(Boolean);
  let score = used.reduce((s, i) => s + i.power, 0);
  // 다양성 보너스
  const categories = new Set(used.map(i => Object.entries(INGREDIENTS).find(([k, v]) => v.includes(i))?.[0]));
  score += categories.size * 10;
  // 전설 레시피 체크
  const recipe = LEGENDARY_RECIPES.find(r => r.ingredients.every(id => ingredientIds.includes(id)));
  if (recipe) score += 100;
  return { score, recipe, diversity: categories.size };
}

function register(io, socket, player) {
  socket.on('cooking_info', () => {
    socket.emit('cooking_info', { ingredients: INGREDIENTS, recipes: LEGENDARY_RECIPES, rules: COOK_OFF_RULES, rewards: COOK_OFF_REWARDS });
  });
  socket.on('cooking_score', (data) => {
    const result = scoreDish(data.ingredientIds || []);
    socket.emit('cooking_score', result);
  });
  socket.on('cooking_battle_start', () => {
    socket.emit('cooking_battle_start', { ok: true });
    io.emit('server_msg', `👨‍🍳🔥 [요리 대전] ${player.name}이(가) 요리 대전 참가!`);
  });
}

module.exports = { INGREDIENTS, LEGENDARY_RECIPES, COOK_OFF_RULES, COOK_OFF_REWARDS, scoreDish, register };

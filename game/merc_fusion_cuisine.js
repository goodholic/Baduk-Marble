// v6.4 — 용병 퓨전 요리 시스템
// 재료 조합으로 새로운 레시피 발견, 비밀 레시피, 용병별 취향

const MAX_INGREDIENTS = 4;

// 재료 원산지 (획득처)
const INGREDIENT_SOURCES = {
  io_drops: ['슬라임젤리', '고블린 허브', '드래곤 후추', '불사조 깃털 향신료'],
  fishing:  ['황금 물고기', '심해 해초', '용궁 진주', '크라켄 먹물'],
  farming:  ['세계수 열매', '마법 밀', '무지개 당근', '달빛 포도'],
  hunting:  ['야수 고기', '독 뱀 술', '그리핀 달걀', '피닉스 기름'],
  mining:   ['소금 결정', '마법 설탕', '화산 겨자', '빙하 버터'],
  trade:    ['동방 향신료', '서역 소스', '남방 과일', '북방 유제품'],
};

// 비밀 레시피 (특정 조합 시 발동)
const SECRET_RECIPES = [
  { name: '드래곤 스테이크', icon: '🐲🥩', ingredients: ['드래곤 후추', '야수 고기', '화산 겨자'], grade: 'legend',
    buff: { atk: 1.2, fireDmg: 1.3, duration: 3600 }, desc: '용의 힘이 깃든 스테이크' },
  { name: '불사의 수프', icon: '🔥🥣', ingredients: ['불사조 깃털 향신료', '피닉스 기름', '세계수 열매'], grade: 'legend',
    buff: { revive: true, hpRegen: 0.05, duration: 1800 }, desc: '죽어도 되살아나는 수프' },
  { name: '심해의 회', icon: '🌊🍣', ingredients: ['황금 물고기', '크라켄 먹물', '빙하 버터'], grade: 'epic',
    buff: { spd: 1.15, eva: 1.2, duration: 2400 }, desc: '바다의 정수를 담은 회' },
  { name: '무지개 케이크', icon: '🌈🎂', ingredients: ['무지개 당근', '달빛 포도', '마법 설탕'], grade: 'epic',
    buff: { allStat: 1.08, luck: 1.3, duration: 3600 }, desc: '행운이 따르는 무지개 케이크' },
  { name: '신의 만찬', icon: '👑🍽️', ingredients: ['세계수 열매', '드래곤 후추', '용궁 진주', '동방 향신료'], grade: 'myth',
    buff: { allStat: 1.15, duration: 7200 }, desc: '신도 감탄하는 최고의 요리!', fourIngredient: true },
];

// 용병 취향 (좋아하는 음식 → 친밀도+, 싫어하는 음식 → 친밀도-)
const TASTE_PREFERENCES = {
  warrior: { likes: ['고기', '매운맛'], dislikes: ['단맛', '채소'], likeBonus: 15, dislikeBonus: -5 },
  mage:    { likes: ['마법 재료', '과일'], dislikes: ['고기'], likeBonus: 15, dislikeBonus: -5 },
  assassin:{ likes: ['독 재료', '술'], dislikes: ['단맛'], likeBonus: 15, dislikeBonus: -5 },
  healer:  { likes: ['채소', '과일'], dislikes: ['독 재료'], likeBonus: 15, dislikeBonus: -5 },
  ranger:  { likes: ['야생 재료', '해산물'], dislikes: ['가공식품'], likeBonus: 15, dislikeBonus: -5 },
};

// 요리 실패 (랜덤 확률)
const COOKING_FAILURES = [
  { id: 'burnt', name: '탄 음식', chance: 0.1, effect: 'HP -10%, 친밀도 -5', icon: '🔥🍳💀' },
  { id: 'poison', name: '독 요리', chance: 0.03, effect: '독 30초 + 친밀도 -10', icon: '☠️🍳' },
  { id: 'explosion', name: '폭발!', chance: 0.02, effect: '주방 파괴 (1시간 사용 불가)', icon: '💥🍳' },
  { id: 'mystery', name: '미지의 요리', chance: 0.05, effect: '랜덤 버프 또는 디버프', icon: '❓🍳' },
];

function cook(player, ingredientIds) {
  if (ingredientIds.length < 2 || ingredientIds.length > MAX_INGREDIENTS) return { ok: false, reason: '재료 2~4개' };
  // 비밀 레시피 체크
  const recipe = SECRET_RECIPES.find(r => r.ingredients.every(i => ingredientIds.includes(i)));
  if (recipe) return { ok: true, recipe, secret: true };
  // 실패 체크
  const fail = COOKING_FAILURES.find(f => Math.random() < f.chance);
  if (fail) return { ok: true, fail, recipe: null };
  // 일반 요리
  const power = ingredientIds.length * 10;
  return { ok: true, recipe: { name: '일반 요리', buff: { hp: power * 10 }, duration: 600 }, secret: false };
}

function register(io, socket, player) {
  socket.on('fusion_cuisine_info', () => {
    socket.emit('fusion_cuisine_info', { sources: INGREDIENT_SOURCES, secrets: SECRET_RECIPES.map(r => ({ name: r.name, icon: r.icon, grade: r.grade, hint: '???' })), tastes: TASTE_PREFERENCES, failures: COOKING_FAILURES });
  });
  socket.on('fusion_cuisine_cook', (data) => {
    const result = cook(player, data.ingredients || []);
    socket.emit('fusion_cuisine_result', result);
    if (result.secret) io.emit('server_msg', `👨‍🍳✨ [퓨전 요리] ${player.name}이(가) 비밀 레시피 "${result.recipe.name}" 발견!`);
  });
}

module.exports = { INGREDIENT_SOURCES, SECRET_RECIPES, TASTE_PREFERENCES, COOKING_FAILURES, cook, register };

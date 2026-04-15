// ============================================
// 카드 레시피 북 — 합성/진화/히든/각성/제작/비밀 조합
// ============================================

// 모든 합성 가능한 경로를 한눈에
const RECIPE_BOOK = {
  evolution: [
    { from: '견습 전사', to: '정예 전사', reqLv: 10, cost: 3000, icon: '⚔️→⚔️🔥' },
    { from: '정예 전사', to: '영웅 검사', reqLv: 20, cost: 10000, icon: '⚔️🔥→⚔️💎' },
    { from: '영웅 검사', to: '전설의 검성', reqLv: 30, cost: 30000, icon: '⚔️💎→⚔️🌟' },
    { from: '견습 궁수', to: '정예 궁수', reqLv: 10, cost: 3000, icon: '🏹→🏹🔥' },
    { from: '정예 궁수', to: '영웅 사수', reqLv: 20, cost: 10000, icon: '🏹🔥→🏹💎' },
    { from: '견습 마법사', to: '정예 마법사', reqLv: 10, cost: 3000, icon: '🔮→🔮🔥' },
    { from: '정예 마법사', to: '대마도사', reqLv: 20, cost: 10000, icon: '🔮🔥→🔮💎' },
  ],
  hidden: [
    { a: '정예 전사', b: '정예 마법사', result: '마검사', grade: 'legend', icon: '⚔️+🔮→⚔️🔮', cost: 10000, hint: '검과 마법의 결합...' },
    { a: '정예 궁수', b: '암살자', result: '그림자 사수', grade: 'legend', icon: '🏹+🗡️→🏹🌑', cost: 10000, hint: '보이지 않는 화살...' },
    { a: '영웅 검사', b: '용기사', result: '드래곤 블레이드', grade: 'myth', icon: '⚔️+🐲→🐲⚔️', cost: 20000, hint: '용의 피가 검에 깃든다...' },
    { a: '대마도사', b: '빛의 천사', result: '대천사 마도사', grade: 'myth', icon: '🔮+👼→👼🔮', cost: 20000, hint: '천상의 마법...' },
    { a: '전설의 검성', b: '불사조', result: '불멸의 전사', grade: 'myth', icon: '⚔️🌟+🔥🐦→🔥⚔️🌟', cost: 30000, hint: '죽음조차 멈추지 못하는...' },
  ],
  awakening: [
    { from: '전설의 검성', to: '신검의 주인', reqLv: 30, reqStars: 3, icon: '⚔️🌟→⚔️👑🌟', skill: '무쌍검' },
    { from: '대마도사', to: '차원의 현자', reqLv: 30, reqStars: 3, icon: '🔮💎→🔮👑🌟', skill: '차원 붕괴' },
    { from: '영웅 사수', to: '신궁', reqLv: 30, reqStars: 3, icon: '🏹💎→🏹👑🌟', skill: '만발 사격' },
    { from: '마검사', to: '검마신', reqLv: 30, reqStars: 3, icon: '⚔️🔮→⚔️🔮👑', skill: '마검 합일' },
    { from: '드래곤 블레이드', to: '용신', reqLv: 30, reqStars: 3, icon: '🐲⚔️→🐲⚔️👑', skill: '용신의 일격' },
    { from: '불멸의 전사', to: '영원의 수호자', reqLv: 30, reqStars: 3, icon: '🔥⚔️🌟→🔥⚔️👑', skill: '불멸' },
  ],
  fusion: [
    { desc: '같은 등급 3장 → 상위 등급 1장', example: 'normal×3 → rare×1', icon: '🃏🃏🃏→🃏⬆️' },
    { desc: '같은 카드 2장 → 진급 (★+1)', example: '견습전사×2 → 견습전사★', icon: '🃏🃏→🃏⭐' },
  ],

  // ==========================================
  // 제작 레시피 — 재료 + 골드 → 특수 아이템
  // ==========================================
  crafting: [
    // --- 기본 재료 정제 ---
    { id: 'rc_fire_stone', name: '화염석', materials: ['화염 원석×3'], cost: 3000, result: { type: 'material', name: '화염석🔥', desc: '화염 장비 제작 재료' }, icon: '🔥💎' },
    { id: 'rc_ice_crystal', name: '빙결정', materials: ['얼음 결정×3'], cost: 3000, result: { type: 'material', name: '빙결정❄️' }, icon: '❄️💎' },
    { id: 'rc_holy_water', name: '성수', materials: ['빛의 결정×2', '치유 허브×3'], cost: 5000, result: { type: 'material', name: '성수✨' }, icon: '✨💧' },
    { id: 'rc_dark_essence', name: '어둠의 정수', materials: ['어둠의 결정×3', '영혼 조각×2'], cost: 8000, result: { type: 'material', name: '어둠의 정수🌑' }, icon: '🌑💧' },
    { id: 'rc_wind_core', name: '바람의 핵', materials: ['바람 결정×3'], cost: 3000, result: { type: 'material', name: '바람의 핵🌪️', desc: '바람 장비 제작 재료' }, icon: '🌪️💎' },
    { id: 'rc_earth_core', name: '대지의 핵', materials: ['대지 결정×3'], cost: 3000, result: { type: 'material', name: '대지의 핵🪨', desc: '대지 장비 제작 재료' }, icon: '🪨💎' },
    { id: 'rc_mithril_ingot', name: '미스릴 주괴', materials: ['미스릴 원광×5', '정제 숯×3'], cost: 10000, result: { type: 'material', name: '미스릴 주괴⚪', desc: '최상급 금속 재료' }, icon: '⚪🔨' },
    { id: 'rc_stardust_refined', name: '정제 별먼지', materials: ['별먼지×5'], cost: 6000, result: { type: 'material', name: '정제 별먼지💫', desc: '고급 마법 재료' }, icon: '💫✨' },

    // --- 장비 제작 ---
    { id: 'rc_dragon_scale', name: '용린 갑옷 제작', materials: ['용의 비늘×5', '미스릴×3'], cost: 15000, result: { type: 'equipment', id: 'eq_dragon_armor' }, icon: '🐲🛡️' },
    { id: 'rc_holy_blade', name: '성검 제작', materials: ['빛의 결정×5', '성수×3'], cost: 20000, result: { type: 'equipment', id: 'eq_holy_blade' }, icon: '✨⚔️' },
    { id: 'rc_death_scythe', name: '사신의 낫 제작', materials: ['어둠의 정수×5', '영혼 조각×5', '저주받은 강철×3'], cost: 50000, result: { type: 'equipment', id: 'eq_death_scythe' }, icon: '💀🔪' },
    { id: 'rc_storm_bow', name: '폭풍의 활 제작', materials: ['바람의 핵×5', '세계수 가지×3'], cost: 18000, result: { type: 'equipment', id: 'eq_storm_bow' }, icon: '🌪️🏹' },
    { id: 'rc_flame_staff', name: '화염 지팡이 제작', materials: ['화염석×5', '마력석×3'], cost: 18000, result: { type: 'equipment', id: 'eq_flame_staff' }, icon: '🔥🪄' },
    { id: 'rc_ice_shield', name: '빙결 방패 제작', materials: ['빙결정×5', '미스릴×2'], cost: 16000, result: { type: 'equipment', id: 'eq_ice_shield' }, icon: '❄️🛡️' },
    { id: 'rc_earth_hammer', name: '대지의 망치 제작', materials: ['대지의 핵×5', '미스릴×4'], cost: 22000, result: { type: 'equipment', id: 'eq_earth_hammer' }, icon: '🪨🔨' },
    { id: 'rc_shadow_cloak', name: '그림자 망토 제작', materials: ['어둠의 정수×3', '거미줄×5', '야수 가죽×3'], cost: 25000, result: { type: 'equipment', id: 'eq_shadow_cloak' }, icon: '🌑🧥' },

    // --- 포션/소모품 ---
    { id: 'rc_atk_potion', name: 'ATK 포션', materials: ['전투 허브×2'], cost: 1000, result: { type: 'consumable', effect: { atkBuff: 0.2, duration: 300 } }, icon: '⚔️🧪' },
    { id: 'rc_def_potion', name: 'DEF 포션', materials: ['방어 허브×2'], cost: 1000, result: { type: 'consumable', effect: { defBuff: 0.2, duration: 300 } }, icon: '🛡️🧪' },
    { id: 'rc_exp_potion', name: 'EXP 포션', materials: ['지혜의 꽃×3'], cost: 2000, result: { type: 'consumable', effect: { expBuff: 0.5, duration: 600 } }, icon: '📚🧪' },
    { id: 'rc_luck_charm', name: '행운의 부적', materials: ['네잎 클로버×5', '별먼지×2'], cost: 5000, result: { type: 'consumable', effect: { luckBuff: 0.3, duration: 1800 } }, icon: '🍀✨' },
    { id: 'rc_hp_potion_lg', name: '고급 HP 포션', materials: ['치유 허브×3', '생명의 이슬×1'], cost: 2000, result: { type: 'consumable', effect: { healHp: 500 } }, icon: '❤️🧪' },
    { id: 'rc_mp_potion_lg', name: '고급 MP 포션', materials: ['마나 허브×3', '마력석×1'], cost: 2000, result: { type: 'consumable', effect: { healMp: 300 } }, icon: '💙🧪' },
    { id: 'rc_speed_scroll', name: '속도의 두루마리', materials: ['바람 결정×2', '양피지×1'], cost: 1500, result: { type: 'consumable', effect: { spdBuff: 0.3, duration: 300 } }, icon: '💨📜' },

    // --- 특수 제작 ---
    { id: 'rc_pet_food_legend', name: '전설 펫 먹이', materials: ['마력석×5', '영양 허브×3'], cost: 8000, result: { type: 'pet_food', grade: 'legend', exp: 2000 }, icon: '🍗✨' },
    { id: 'rc_awakening_stone', name: '각성석 제작', materials: ['별먼지×10', '영혼 조각×5', '빛의 결정×3', '어둠의 결정×3'], cost: 30000, result: { type: 'awakening_stone' }, icon: '🌟💎' },
    { id: 'rc_summon_ticket', name: '프리미엄 소환권', materials: ['마력석×8', '별먼지×5'], cost: 15000, result: { type: 'summon_ticket', pool: 'premium' }, icon: '📜👑' },
    { id: 'rc_enchant_scroll', name: '강화 두루마리', materials: ['마력석×3', '양피지×2', '정제 별먼지×1'], cost: 10000, result: { type: 'enchant_scroll', grade: 'rare' }, icon: '📜🔮' },
  ],

  // ==========================================
  // 비밀 레시피 (발견 퀘스트로만 해금)
  // ==========================================
  secret: [
    { id: 'rs_philosopher', name: '현자의 돌', hint: '연금술의 끝에서...', reqDiscover: 'alchemy_master', materials: ['화염석×1', '빙결정×1', '성수×1', '어둠의 정수×1', '별먼지×10'], cost: 100000, result: { type: 'equipment', name: '현자의 반지', stats: { allStat: 30, exp: 0.2 }, grade: 'myth' }, icon: '💍🌟' },
    { id: 'rs_pandora', name: '판도라의 상자', hint: '금지된 것을 열면...', reqDiscover: 'forbidden_chest', materials: ['어둠의 정수×3', '저주받은 강철×5'], cost: 50000, result: { type: 'random_myth' }, icon: '📦🌀' },
    { id: 'rs_elixir', name: '불멸의 엘릭서', hint: '생명의 극한에서...', reqDiscover: 'life_master', materials: ['성수×5', '치유 허브×10', '생명의 이슬×3'], cost: 80000, result: { type: 'consumable', effect: { fullHeal: true, revive: true, permHp: 100 } }, icon: '🧪✨' },
  ],
};

// ============================================
// 발견 퀘스트 — 비밀 레시피 해금 조건
// ============================================
const DISCOVERY_QUESTS = [
  {
    id: 'dq_alchemy', name: '연금술 마스터',
    reqDiscover: 'alchemy_master',
    steps: ['재료 10종 제작', '포션 5종 제작', '장비 3종 제작'],
    reward: { recipe: 'rs_philosopher', title: '연금술사' },
  },
  {
    id: 'dq_forbidden', name: '금지된 지식',
    reqDiscover: 'forbidden_chest',
    steps: ['어둠 재료 10개 수집', '심연 10층 도달', '마왕성 NPC 원정 클리어'],
    reward: { recipe: 'rs_pandora' },
  },
  {
    id: 'dq_life', name: '생명의 탐구',
    reqDiscover: 'life_master',
    steps: ['치유사 카드 3장 보유', '힐러 전직 완료', '보스 레이드 Top 3'],
    reward: { recipe: 'rs_elixir' },
  },
];

// ============================================
// 레시피 완성 마일스톤 보상
// ============================================
const RECIPE_MILESTONES = [
  { discovered: 5, reward: { gold: 5000 }, name: '초보 제작자' },
  { discovered: 15, reward: { gold: 20000, diamonds: 30 }, name: '숙련 제작자' },
  { discovered: 25, reward: { gold: 50000, diamonds: 80, title: '마스터 제작자' }, name: '마스터' },
  { discovered: 35, reward: { gold: 100000, diamonds: 200, card: 'myth', title: '전설의 장인' }, name: '전설의 장인' },
];

// ============================================
// 레시피 발견 상태 (플레이어별)
// ============================================
function getDiscoveredRecipes(player) {
  const discovered = player.discoveredRecipes || [];
  const discoveredSecrets = player.discoveredSecrets || [];
  return {
    evolution: RECIPE_BOOK.evolution, // 항상 공개
    fusion: RECIPE_BOOK.fusion, // 항상 공개
    hidden: RECIPE_BOOK.hidden.map(r => ({
      ...r,
      discovered: discovered.includes(r.result),
      result: discovered.includes(r.result) ? r.result : '???',
      grade: discovered.includes(r.result) ? r.grade : '???',
    })),
    awakening: RECIPE_BOOK.awakening.map(r => ({
      ...r,
      discovered: discovered.includes(r.to),
      to: discovered.includes(r.to) ? r.to : '???',
      skill: discovered.includes(r.to) ? r.skill : '???',
    })),
    crafting: RECIPE_BOOK.crafting, // 항상 공개
    secret: RECIPE_BOOK.secret.map(r => ({
      id: r.id,
      name: discoveredSecrets.includes(r.id) ? r.name : '???',
      hint: r.hint,
      icon: r.icon,
      unlocked: discoveredSecrets.includes(r.id),
      materials: discoveredSecrets.includes(r.id) ? r.materials : [],
      cost: discoveredSecrets.includes(r.id) ? r.cost : '???',
    })),
  };
}

// 레시피 발견 기록
function discoverRecipe(player, resultName) {
  player.discoveredRecipes = player.discoveredRecipes || [];
  if (!player.discoveredRecipes.includes(resultName)) {
    player.discoveredRecipes.push(resultName);
    return true;
  }
  return false;
}

// 비밀 레시피 해금
function discoverSecretRecipe(player, recipeId) {
  player.discoveredSecrets = player.discoveredSecrets || [];
  if (!player.discoveredSecrets.includes(recipeId)) {
    player.discoveredSecrets.push(recipeId);
    return true;
  }
  return false;
}

// ============================================
// 재료 인벤토리 관리
// ============================================
function getMaterials(player) {
  return player.materials || {};
}

function addMaterial(player, name, count) {
  if (!player.materials) player.materials = {};
  player.materials[name] = (player.materials[name] || 0) + count;
  return player.materials[name];
}

function useMaterial(player, name, count) {
  if (!player.materials) player.materials = {};
  const current = player.materials[name] || 0;
  if (current < count) return false;
  player.materials[name] = current - count;
  if (player.materials[name] <= 0) delete player.materials[name];
  return true;
}

// 재료 문자열 파싱 ('화염 원석×3' → { name: '화염 원석', count: 3 })
function parseMaterial(str) {
  const match = str.match(/^(.+?)×(\d+)$/);
  if (!match) return { name: str, count: 1 };
  return { name: match[1], count: parseInt(match[2], 10) };
}

// 레시피로 제작 가능 여부 확인
function canCraft(player, recipeId) {
  const recipe = findRecipeById(recipeId);
  if (!recipe) return { ok: false, reason: '존재하지 않는 레시피' };

  // 비밀 레시피는 해금 확인
  const isSecret = RECIPE_BOOK.secret.find(r => r.id === recipeId);
  if (isSecret) {
    const discoveredSecrets = player.discoveredSecrets || [];
    if (!discoveredSecrets.includes(recipeId)) {
      return { ok: false, reason: '아직 해금되지 않은 비밀 레시피' };
    }
  }

  // 골드 확인
  if ((player.gold || 0) < recipe.cost) {
    return { ok: false, reason: `골드 부족 (필요: ${recipe.cost}, 보유: ${player.gold || 0})` };
  }

  // 재료 확인
  const missing = [];
  for (const matStr of recipe.materials) {
    const { name, count } = parseMaterial(matStr);
    const have = (player.materials || {})[name] || 0;
    if (have < count) {
      missing.push(`${name} ${have}/${count}`);
    }
  }
  if (missing.length > 0) {
    return { ok: false, reason: `재료 부족: ${missing.join(', ')}` };
  }

  return { ok: true };
}

// 레시피 제작 실행
function craftRecipe(player, recipeId) {
  const check = canCraft(player, recipeId);
  if (!check.ok) return { success: false, reason: check.reason };

  const recipe = findRecipeById(recipeId);

  // 재료 소모
  for (const matStr of recipe.materials) {
    const { name, count } = parseMaterial(matStr);
    useMaterial(player, name, count);
  }

  // 골드 소모
  player.gold = (player.gold || 0) - recipe.cost;

  // 레시피 발견 기록
  discoverRecipe(player, recipe.name);

  // 제작 횟수 기록 (마일스톤 체크용)
  player.craftCount = (player.craftCount || 0) + 1;

  // 마일스톤 보상 체크
  const milestoneReward = checkMilestone(player);

  return {
    success: true,
    result: recipe.result,
    name: recipe.name,
    icon: recipe.icon,
    milestoneReward,
  };
}

// 레시피 ID로 찾기 (crafting + secret 통합 검색)
function findRecipeById(recipeId) {
  return RECIPE_BOOK.crafting.find(r => r.id === recipeId)
    || RECIPE_BOOK.secret.find(r => r.id === recipeId)
    || null;
}

// ============================================
// 마일스톤 보상 확인
// ============================================
function checkMilestone(player) {
  const total = (player.discoveredRecipes || []).length;
  player.claimedMilestones = player.claimedMilestones || [];

  for (const ms of RECIPE_MILESTONES) {
    if (total >= ms.discovered && !player.claimedMilestones.includes(ms.discovered)) {
      player.claimedMilestones.push(ms.discovered);
      // 보상 지급
      if (ms.reward.gold) player.gold = (player.gold || 0) + ms.reward.gold;
      if (ms.reward.diamonds) player.diamonds = (player.diamonds || 0) + ms.reward.diamonds;
      return { milestone: ms.name, reward: ms.reward };
    }
  }
  return null;
}

// ============================================
// 발견 퀘스트 진행 상태 확인
// ============================================
function getDiscoveryQuestProgress(player) {
  const progress = player.discoveryQuestProgress || {};
  return DISCOVERY_QUESTS.map(q => ({
    ...q,
    completed: (player.discoveredSecrets || []).includes(
      RECIPE_BOOK.secret.find(r => r.reqDiscover === q.reqDiscover)?.id
    ),
    stepsDone: progress[q.id] || [],
  }));
}

function completeDiscoveryStep(player, questId, stepIndex) {
  if (!player.discoveryQuestProgress) player.discoveryQuestProgress = {};
  const quest = DISCOVERY_QUESTS.find(q => q.id === questId);
  if (!quest) return { success: false, reason: '퀘스트를 찾을 수 없음' };

  const done = player.discoveryQuestProgress[questId] || [];
  if (done.includes(stepIndex)) return { success: false, reason: '이미 완료된 단계' };
  if (stepIndex < 0 || stepIndex >= quest.steps.length) return { success: false, reason: '잘못된 단계' };

  done.push(stepIndex);
  player.discoveryQuestProgress[questId] = done;

  // 모든 단계 완료 시 비밀 레시피 해금
  if (done.length >= quest.steps.length) {
    const secretRecipe = RECIPE_BOOK.secret.find(r => r.reqDiscover === quest.reqDiscover);
    if (secretRecipe) {
      discoverSecretRecipe(player, secretRecipe.id);
      return {
        success: true,
        questComplete: true,
        unlockedRecipe: secretRecipe.name,
        reward: quest.reward,
      };
    }
  }

  return { success: true, questComplete: false, stepsRemaining: quest.steps.length - done.length };
}

// ============================================
// Socket.io 이벤트 등록
// ============================================
function register(io, socket, player) {
  // 레시피 북 조회 (전체)
  socket.on('recipe_book', () => {
    socket.emit('recipe_book', getDiscoveredRecipes(player));
  });

  // 제작 실행
  socket.on('recipe_craft', (data) => {
    const { recipeId } = data || {};
    if (!recipeId) return socket.emit('recipe_craft', { success: false, reason: '레시피 ID 필요' });
    const result = craftRecipe(player, recipeId);
    socket.emit('recipe_craft', result);
  });

  // 재료 인벤토리 조회
  socket.on('recipe_materials', () => {
    socket.emit('recipe_materials', getMaterials(player));
  });

  // 발견 퀘스트 진행 상태 조회
  socket.on('recipe_discovery_quests', () => {
    socket.emit('recipe_discovery_quests', getDiscoveryQuestProgress(player));
  });

  // 마일스톤 조회
  socket.on('recipe_milestones', () => {
    const total = (player.discoveredRecipes || []).length;
    const claimed = player.claimedMilestones || [];
    socket.emit('recipe_milestones', {
      totalDiscovered: total,
      milestones: RECIPE_MILESTONES.map(ms => ({
        ...ms,
        achieved: total >= ms.discovered,
        claimed: claimed.includes(ms.discovered),
      })),
    });
  });
}

module.exports = {
  RECIPE_BOOK,
  DISCOVERY_QUESTS,
  RECIPE_MILESTONES,
  getDiscoveredRecipes,
  discoverRecipe,
  discoverSecretRecipe,
  getMaterials,
  addMaterial,
  useMaterial,
  parseMaterial,
  canCraft,
  craftRecipe,
  findRecipeById,
  checkMilestone,
  getDiscoveryQuestProgress,
  completeDiscoveryStep,
  register,
};

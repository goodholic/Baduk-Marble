// v5.3 — 랜덤 퀘스트 생성기
// 매일 새로운 조합의 퀘스트 자동 생성, 무한 콘텐츠

// 퀘스트 템플릿 파츠
const QUEST_VERBS = ['처치하라', '수집하라', '호위하라', '탐색하라', '방어하라', '탈출하라', '구출하라', '배달하라', '정복하라', '조사하라'];
const QUEST_TARGETS = [
  { id: 'goblins', name: '고블린 무리', icon: '👺', difficulty: 1, type: 'monster' },
  { id: 'undead', name: '언데드 군단', icon: '💀', difficulty: 3, type: 'monster' },
  { id: 'dragon', name: '드래곤', icon: '🐲', difficulty: 8, type: 'boss' },
  { id: 'merchant', name: '상인', icon: '🧑‍💼', difficulty: 2, type: 'npc' },
  { id: 'princess', name: '공주', icon: '👸', difficulty: 5, type: 'npc' },
  { id: 'artifact', name: '고대 유물', icon: '🏺', difficulty: 4, type: 'item' },
  { id: 'crystal', name: '마법 결정', icon: '💎', difficulty: 3, type: 'item' },
  { id: 'fortress', name: '적의 요새', icon: '🏰', difficulty: 7, type: 'location' },
  { id: 'dungeon', name: '깊은 던전', icon: '🕳️', difficulty: 6, type: 'location' },
  { id: 'village', name: '마을', icon: '🏘️', difficulty: 2, type: 'location' },
  { id: 'demon_lord', name: '마왕의 부하', icon: '😈', difficulty: 9, type: 'boss' },
  { id: 'pirates', name: '해적단', icon: '🏴‍☠️', difficulty: 5, type: 'monster' },
];

const QUEST_LOCATIONS = ['초원', '사막', '숲', '산맥', '해안', '동굴', '화산', '얼음 벌판', '고대 유적', '차원의 틈'];
const QUEST_MODIFIERS = [
  { id: 'timed', name: '⏰ 시간 제한', effect: '3분 내 완료', rewardMul: 1.3 },
  { id: 'no_heal', name: '🚫💚 치유 불가', effect: '회복 아이템/스킬 사용 불가', rewardMul: 1.5 },
  { id: 'dark', name: '🌑 암흑', effect: '시야 50% 감소', rewardMul: 1.2 },
  { id: 'escort', name: '🛡️ 호위 동반', effect: 'NPC를 안전하게 호위', rewardMul: 1.4 },
  { id: 'stealth', name: '🤫 은밀', effect: '발각 시 실패', rewardMul: 1.6 },
  { id: 'solo', name: '👤 단독', effect: '용병 1명만 출전 가능', rewardMul: 1.8 },
  { id: 'nightmare', name: '💀 악몽', effect: '적 스탯 2배', rewardMul: 2.5 },
  { id: 'rain', name: '🌧️ 폭우', effect: '화속성 -50%, 수속성 +50%', rewardMul: 1.1 },
];

// 보상 풀
const REWARD_POOL = {
  gold:    { min: 1000, max: 50000, scale: 'difficulty' },
  exp:     { min: 100, max: 5000, scale: 'difficulty' },
  items:   ['철광석', '마법 결정', '희귀 약초', '전설의 지도', '각성석', '용의 비늘', '암흑 에센스', '신의 파편'],
  special: ['랜덤 용병 소환권', '전직 스크롤', '특성 초기화권', '히든 용병 힌트', '펫 알', '변신 토큰'],
};

// 스토리 생성 (조합)
const QUEST_STORIES = [
  '어둠의 세력이 {location}에서 활동하고 있다. {target}을(를) {verb}.',
  '{location}의 {target}이(가) 위험에 처했다! 즉시 {verb}.',
  '전설에 따르면 {location}에 {target}이(가) 숨겨져 있다고 한다. {verb}.',
  '{location}에서 {target}의 목격 보고가 들어왔다. 용사여, {verb}.',
  '긴급 의뢰: {location}으로 가서 {target}을(를) {verb}. 보상은 넉넉하다.',
];

function generateQuest(playerLevel, seed) {
  const rng = seedRandom(seed || Date.now());

  const verb = QUEST_VERBS[Math.floor(rng() * QUEST_VERBS.length)];
  const target = QUEST_TARGETS[Math.floor(rng() * QUEST_TARGETS.length)];
  const location = QUEST_LOCATIONS[Math.floor(rng() * QUEST_LOCATIONS.length)];
  const modifier = rng() < 0.6 ? QUEST_MODIFIERS[Math.floor(rng() * QUEST_MODIFIERS.length)] : null;
  const story = QUEST_STORIES[Math.floor(rng() * QUEST_STORIES.length)]
    .replace('{verb}', verb).replace('{target}', target.name).replace('{location}', location);

  const difficulty = target.difficulty + (modifier ? 1 : 0);
  const rewardMul = modifier ? modifier.rewardMul : 1.0;
  const goldReward = Math.floor((REWARD_POOL.gold.min + difficulty * (REWARD_POOL.gold.max - REWARD_POOL.gold.min) / 10) * rewardMul);
  const expReward = Math.floor((REWARD_POOL.exp.min + difficulty * (REWARD_POOL.exp.max - REWARD_POOL.exp.min) / 10) * rewardMul);
  const itemReward = difficulty >= 5 ? REWARD_POOL.items[Math.floor(rng() * REWARD_POOL.items.length)] : null;
  const specialReward = difficulty >= 8 && rng() < 0.2 ? REWARD_POOL.special[Math.floor(rng() * REWARD_POOL.special.length)] : null;

  return {
    id: `rq_${Date.now()}_${Math.floor(rng() * 10000)}`,
    story, verb, target, location, modifier,
    difficulty,
    rewards: { gold: goldReward, exp: expReward, item: itemReward, special: specialReward },
    generated: Date.now(),
  };
}

// 간단한 시드 랜덤
function seedRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateDailyQuests(playerLevel) {
  const today = new Date();
  const baseSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const quests = [];
  for (let i = 0; i < 5; i++) {
    quests.push(generateQuest(playerLevel, baseSeed + i * 7919));
  }
  return quests;
}

function register(io, socket, player) {
  socket.on('random_quest_daily', () => {
    const quests = generateDailyQuests(player.level || 1);
    socket.emit('random_quest_daily', quests);
  });

  socket.on('random_quest_generate', () => {
    const quest = generateQuest(player.level || 1);
    socket.emit('random_quest_generated', quest);
  });

  socket.on('random_quest_complete', (data) => {
    // 보상 지급 (간략화)
    const { questId, rewards } = data;
    if (rewards) {
      player.gold = (player.gold || 0) + (rewards.gold || 0);
    }
    socket.emit('random_quest_complete_result', { ok: true, questId });
  });
}

module.exports = { QUEST_VERBS, QUEST_TARGETS, QUEST_LOCATIONS, QUEST_MODIFIERS, REWARD_POOL, generateQuest, generateDailyQuests, register };

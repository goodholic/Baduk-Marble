// ============================================
// 카드 각성 시스템 — 최종 성장, 카드가 완전히 새로운 형태로
// ============================================

// 각성 조건: Lv.30+ AND ★3+ AND 진화 완료
// 각성 시 외형/스킬/스탯 대폭 변화

const AWAKENING_FORMS = {
  '전설의 검성':   { awaken: '신검의 주인', icon: '⚔️👑🌟', grade: 'myth', atkMul: 2.0, defMul: 1.5, hpMul: 1.8, newSkill: { name: '무쌍검', desc: '전체 ATK×5 + 3초 무적', icon: '⚔️💥' }, lore: '만 번의 베기 끝에, 검이 주인을 선택했다.' },
  '대마도사':      { awaken: '차원의 현자', icon: '🔮👑🌟', grade: 'myth', atkMul: 1.5, defMul: 1.3, hpMul: 1.5, matkMul: 2.5, newSkill: { name: '차원 붕괴', desc: '전체 마법 DMG×4 + 실명 3초', icon: '🌀💥' }, lore: '마법의 끝에서 차원의 진리를 깨달았다.' },
  '영웅 사수':     { awaken: '신궁', icon: '🏹👑🌟', grade: 'myth', atkMul: 1.8, defMul: 1.2, hpMul: 1.4, newSkill: { name: '만발 사격', desc: '20발 연사, 각 크리 확정', icon: '🏹💥' }, lore: '화살은 이제 바람 자체가 되었다.' },
  '마검사':        { awaken: '검마신', icon: '⚔️🔮👑', grade: 'myth', atkMul: 1.8, defMul: 1.5, hpMul: 1.6, matkMul: 1.8, newSkill: { name: '마검 합일', desc: '물리+마법 동시 공격 ×3', icon: '⚔️🔮💥' }, lore: '검과 마법이 하나가 되는 경지.' },
  '드래곤 블레이드':{ awaken: '용신', icon: '🐲⚔️👑', grade: 'myth', atkMul: 2.2, defMul: 1.8, hpMul: 2.0, newSkill: { name: '용신의 일격', desc: 'HP×50% 데미지 + 전원 공포', icon: '🐲💥' }, lore: '용의 피가 각성하여 신의 경지에 올랐다.' },
  '불멸의 전사':   { awaken: '영원의 수호자', icon: '🔥⚔️👑', grade: 'myth', atkMul: 2.0, defMul: 2.0, hpMul: 2.5, newSkill: { name: '불멸', desc: '10초간 죽지 않음 + 킬마다 HP 회복', icon: '♾️💥' }, lore: '죽음조차 그를 멈출 수 없다.' },
  // --- 14 new awakening forms ---
  '영웅 궁수':     { awaken: '신궁 아르테미스', icon: '🏹👑🌟', grade: 'myth', atkMul: 1.9, defMul: 1.3, hpMul: 1.5, newSkill: { name: '별의 화살', desc: '하늘에서 100발 화살비', icon: '🏹🌟' }, lore: '별빛이 화살이 되어 쏟아진다.' },
  '암살자':        { awaken: '죽음의 그림자', icon: '🗡️🌑👑', grade: 'myth', atkMul: 2.3, defMul: 1.1, hpMul: 1.3, newSkill: { name: '그림자 학살', desc: '5초간 투명+ATK×3', icon: '🌑💀' }, lore: '그의 그림자를 본 자는 이미 죽은 것이다.' },
  '성기사':        { awaken: '빛의 심판자', icon: '🛡️✨👑', grade: 'myth', atkMul: 1.5, defMul: 2.2, hpMul: 2.0, newSkill: { name: '심판의 빛', desc: '전체 회복+적 전체 실명 5초', icon: '✨💥' }, lore: '빛은 모든 죄를 심판한다.' },
  '드루이드':      { awaken: '대자연의 화신', icon: '🌿👑🌟', grade: 'myth', atkMul: 1.6, defMul: 1.6, hpMul: 2.0, newSkill: { name: '자연의 분노', desc: '넝쿨+번개+지진 연속공격', icon: '🌿⚡' }, lore: '자연이 분노할 때 세상이 뒤흔들린다.' },
  '치유사':        { awaken: '생명의 여신', icon: '💚👑🌟', grade: 'myth', atkMul: 1.3, defMul: 1.5, hpMul: 2.5, newSkill: { name: '생명의 기적', desc: '아군 전원 HP 100% 회복+부활', icon: '💚✨' }, lore: '생명의 빛 앞에 죽음은 의미가 없다.' },
  '네크로맨서':    { awaken: '사령왕', icon: '💀👑🌟', grade: 'myth', atkMul: 2.0, defMul: 1.4, hpMul: 1.6, newSkill: { name: '망자의 군대', desc: '처치한 적 5명 소환', icon: '💀⚔️' }, lore: '죽은 자는 그의 명령에 복종한다.' },
  '연금술사':      { awaken: '현자의 돌', icon: '⚗️👑🌟', grade: 'myth', atkMul: 1.7, defMul: 1.7, hpMul: 1.7, newSkill: { name: '등가교환', desc: 'HP 50% 소모 → ATK×5 일격', icon: '⚗️💥' }, lore: '등가교환의 끝에 진리를 찾았다.' },
  '수인 전사':     { awaken: '야수왕', icon: '🐺👑🌟', grade: 'myth', atkMul: 2.1, defMul: 1.8, hpMul: 1.9, newSkill: { name: '야수 본능', desc: 'HP 낮을수록 ATK 상승(최대3배)', icon: '🐺💢' }, lore: '잠든 야수가 마침내 눈을 떴다.' },
  '정령사':        { awaken: '원소의 지배자', icon: '🌀👑🌟', grade: 'myth', atkMul: 1.8, defMul: 1.6, hpMul: 1.7, newSkill: { name: '원소 폭풍', desc: '화+빙+뇌+풍 동시 공격', icon: '🌪️💥' }, lore: '4원소를 하나로 합치는 것, 이것이 지배.' },
  '악마 군주':     { awaken: '마왕', icon: '😈👑🌟', grade: 'myth', atkMul: 2.4, defMul: 1.3, hpMul: 1.8, newSkill: { name: '지옥불', desc: '전체 DOT 10초+공포', icon: '🔥😈' }, lore: '지옥의 문이 열리면 세상은 불탄다.' },
  '천사':          { awaken: '대천사', icon: '👼👑🌟', grade: 'myth', atkMul: 1.6, defMul: 2.0, hpMul: 2.2, newSkill: { name: '천상의 심판', desc: '모든 아군 무적 5초+적 정화', icon: '👼✨' }, lore: '천상의 빛이 내려와 모든 것을 정화한다.' },
  '기계병':        { awaken: '워머신', icon: '🤖👑🌟', grade: 'myth', atkMul: 2.0, defMul: 2.0, hpMul: 1.5, newSkill: { name: '궁극 병기', desc: '미사일 10발+레이저+자폭(HP30%)', icon: '🤖💥' }, lore: '전쟁을 위해 만들어진 궁극의 병기.' },
  '용기사':        { awaken: '드래곤 로드', icon: '🐲⚔️👑', grade: 'myth', atkMul: 2.2, defMul: 1.9, hpMul: 2.1, newSkill: { name: '용의 지배', desc: '드래곤 소환+기사 합체=최종형태', icon: '🐲👑' }, lore: '용과 하나가 된 기사. 하늘의 지배자.' },
  '요정 여왕':     { awaken: '요정왕', icon: '🧚👑🌟', grade: 'myth', atkMul: 1.5, defMul: 1.5, hpMul: 1.5, newSkill: { name: '요정의 축제', desc: '아군 전원 랜덤 초강화', icon: '🧚✨' }, lore: '요정들의 축제가 시작되면 기적이 일어난다.' },
};

// ============================================
// 분기 각성 — 같은 카드가 경로에 따라 다른 형태로 각성
// ============================================

const AWAKENING_BRANCHES = {
  '영웅 검사': [
    { path: 'light', awaken: '성검의 기사', icon: '⚔️✨👑', grade: 'myth', atkMul: 1.8, defMul: 1.8, hpMul: 1.8, newSkill: { name: '성검 해방', desc: '신성 ATK×4 + 아군 치유', icon: '⚔️✨' }, lore: '빛을 선택한 검사', reqItem: '빛의 결정' },
    { path: 'dark', awaken: '암흑 검마', icon: '⚔️🌑👑', grade: 'myth', atkMul: 2.5, defMul: 1.2, hpMul: 1.5, newSkill: { name: '암흑 참격', desc: '암흑 ATK×6 + 자해 20%', icon: '⚔️🌑' }, lore: '어둠을 선택한 검사', reqItem: '어둠의 결정' },
  ],
  '대마도사': [
    { path: 'ice', awaken: '빙결 여제', icon: '❄️👑🌟', grade: 'myth', atkMul: 1.7, defMul: 1.8, hpMul: 1.7, newSkill: { name: '절대영도', desc: '전체 빙결 + DOT', icon: '❄️💥' }, lore: '얼음의 극한', reqItem: '빙결의 심장' },
    { path: 'fire', awaken: '불멸의 현자', icon: '🔥👑🌟', grade: 'myth', atkMul: 2.3, defMul: 1.2, hpMul: 1.4, newSkill: { name: '멸세의 화염', desc: '전체 ATK×5 화염', icon: '🔥💥' }, lore: '화염의 극한', reqItem: '영원의 화염' },
  ],
};

// 각성 비용
const AWAKENING_COST = { gold: 50000, diamonds: 100, awakening_stone: 1 };

// 각성석 획득처
const AWAKENING_STONE_SOURCES = [
  { source: '탑 50층 클리어', chance: 1.0 },
  { source: '탑 100층 클리어', chance: 1.0, count: 3 },
  { source: 'IO 1위', chance: 0.3 },
  { source: '시즌 다이아+ 등급', chance: 1.0 },
  { source: '길드 레이드 세계의적 클리어', chance: 0.5 },
];

// ============================================
// 초월 시스템 — 각성 이후 추가 강화
// ============================================

const TRANSCEND_MAX_LEVEL = 3;

function getTranscendCost(transcendLevel) {
  const mul = Math.pow(2, transcendLevel); // 지수 증가
  return {
    gold: 100000 * mul,
    awakening_stone: 3 * mul,
    reqLevel: 50,
  };
}

const TRANSCEND_PASSIVES = [
  { level: 1, name: '초월 I — 한계 돌파', desc: '전 스탯 +50%', statMul: 1.5 },
  { level: 2, name: '초월 II — 운명 거역', desc: '전 스탯 +100%, 궁극 패시브 해금', statMul: 2.0, passive: { name: '운명 거역', desc: '치명타 시 HP 5% 회복' } },
  { level: 3, name: '초월 III — 신의 영역', desc: '전 스탯 +150%, 궁극 패시브 강화', statMul: 2.5, passive: { name: '신의 영역', desc: '전투 시작 시 5초 무적 + ATK 30% 증가' } },
];

function canTranscend(card) {
  if (!card.awakened) return { can: false, reason: '각성 필요' };
  if ((card.level || 1) < 50) return { can: false, reason: 'Lv.50 필요' };
  const currentT = card.transcendLevel || 0;
  if (currentT >= TRANSCEND_MAX_LEVEL) return { can: false, reason: '최대 초월 달성' };
  return { can: true, nextLevel: currentT + 1, cost: getTranscendCost(currentT) };
}

function transcendCard(player, cardId) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };

  const check = canTranscend(card);
  if (!check.can) return { ok: false, reason: check.reason };

  const cost = check.cost;
  if ((player.gold || 0) < cost.gold) return { ok: false, reason: `골드 ${cost.gold} 필요` };
  if ((player.awakeningStones || 0) < cost.awakening_stone) return { ok: false, reason: `각성석 ${cost.awakening_stone} 필요` };

  player.gold -= cost.gold;
  player.awakeningStones -= cost.awakening_stone;

  const nextLevel = check.nextLevel;
  const passiveInfo = TRANSCEND_PASSIVES[nextLevel - 1];

  // 스탯 적용: 기존 각성 스탯 기준으로 초월 배율 적용
  const prevMul = nextLevel > 1 ? TRANSCEND_PASSIVES[nextLevel - 2].statMul : 1.0;
  const newMul = passiveInfo.statMul;
  const ratio = newMul / prevMul;

  card.atk = Math.floor((card.atk || 30) * ratio);
  card.def = Math.floor((card.def || 20) * ratio);
  card.hp = Math.floor((card.hp || 200) * ratio);
  if (card.matk) card.matk = Math.floor(card.matk * ratio);

  card.transcendLevel = nextLevel;
  card.transcendName = passiveInfo.name;
  if (passiveInfo.passive) {
    card.transcendPassive = passiveInfo.passive;
  }

  return { ok: true, msg: `${passiveInfo.name} 달성! 전 스탯 강화!`, card, passiveInfo };
}

// ============================================
// 각성 퀘스트 — 스토리 기반 각성 경로
// ============================================

const AWAKENING_QUESTS = [
  { cardName: '전설의 검성', quest: '만검의 산', steps: [
    { desc: '검 1000번 휘두르기 (IO 킬 100)', key: 'io_kills', target: 100 },
    { desc: '전설의 대장장이 방문 (대장간 Lv.5)', key: 'smithy_level', target: 5 },
    { desc: '검성의 시험 (PvP 10연승)', key: 'pvp_winstreak', target: 10 },
  ], reward: { awakening_stone: 1 } },
  { cardName: '대마도사', quest: '차원의 문', steps: [
    { desc: '마법 1000회 시전 (IO 스킬 사용 200)', key: 'skill_uses', target: 200 },
    { desc: '마법 도서관 탐험 (탑 30층 클리어)', key: 'tower_floor', target: 30 },
    { desc: '차원의 균열 봉인 (길드 레이드 5회)', key: 'guild_raids', target: 5 },
  ], reward: { awakening_stone: 1, diamonds: 50 } },
  { cardName: '영웅 궁수', quest: '별의 사냥터', steps: [
    { desc: '화살 10000발 사격 (IO 원거리 킬 80)', key: 'ranged_kills', target: 80 },
    { desc: '전설의 활 재료 수집 (재료 던전 10회)', key: 'material_dungeon', target: 10 },
    { desc: '별을 꿰뚫다 (크리티컬 킬 50)', key: 'crit_kills', target: 50 },
  ], reward: { awakening_stone: 1 } },
  { cardName: '암살자', quest: '그림자의 길', steps: [
    { desc: '은신 암살 100회 (IO 백어택 킬 100)', key: 'backstab_kills', target: 100 },
    { desc: '암살단 입단 시험 (PvP 50승)', key: 'pvp_wins', target: 50 },
    { desc: '어둠의 대가와 결투 (보스 챌린지 클리어)', key: 'boss_challenge', target: 1 },
  ], reward: { awakening_stone: 1, gold: 30000 } },
  { cardName: '성기사', quest: '빛의 시련', steps: [
    { desc: '동료 보호 200회 (IO 어시스트 200)', key: 'assists', target: 200 },
    { desc: '성소 순례 (모든 맵 방문)', key: 'maps_visited', target: 10 },
    { desc: '빛의 시험 (HP 1% 생존 클리어)', key: 'survival_clear', target: 1 },
  ], reward: { awakening_stone: 2 } },
  { cardName: '드루이드', quest: '세계수의 부름', steps: [
    { desc: '자연의 정령 소환 100회 (소환 100)', key: 'summon_count', target: 100 },
    { desc: '세계수 뿌리 탐험 (탑 40층 클리어)', key: 'tower_floor', target: 40 },
    { desc: '대자연과의 교감 (IO 서바이벌 1위 5회)', key: 'survival_first', target: 5 },
  ], reward: { awakening_stone: 1 } },
  { cardName: '용기사', quest: '용의 유산', steps: [
    { desc: '드래곤 슬레이어 (보스 드래곤 3회 클리어)', key: 'dragon_boss', target: 3 },
    { desc: '용의 비늘 수집 (재료 50개)', key: 'dragon_scales', target: 50 },
    { desc: '용과의 계약 (탑 80층 클리어)', key: 'tower_floor', target: 80 },
  ], reward: { awakening_stone: 2, diamonds: 100 } },
  { cardName: '악마 군주', quest: '지옥의 왕좌', steps: [
    { desc: '악마 처치 500 (IO 킬 500)', key: 'io_kills', target: 500 },
    { desc: '지옥문 개방 (탑 60층 클리어)', key: 'tower_floor', target: 60 },
    { desc: '마왕의 시험 (PvP 100승)', key: 'pvp_wins', target: 100 },
  ], reward: { awakening_stone: 2 } },
];

function getAwakeningQuest(player, cardId) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };

  const baseName = (card.name || '').replace(/[★+\d]+$/, '').trim();
  const quest = AWAKENING_QUESTS.find(q => q.cardName === baseName);
  if (!quest) return { ok: false, reason: '해당 카드의 각성 퀘스트가 없습니다' };

  const progress = (player.questProgress || {})[baseName] || {};
  const steps = quest.steps.map(step => ({
    desc: step.desc,
    current: progress[step.key] || 0,
    target: step.target,
    done: (progress[step.key] || 0) >= step.target,
  }));

  const allDone = steps.every(s => s.done);

  return { ok: true, quest: quest.quest, cardName: baseName, steps, allDone, reward: quest.reward };
}

function checkAwakeningQuestProgress(player, cardId) {
  const result = getAwakeningQuest(player, cardId);
  if (!result.ok) return result;

  if (result.allDone) {
    // 퀘스트 완료 보상 지급
    const baseName = result.cardName;
    const quest = AWAKENING_QUESTS.find(q => q.cardName === baseName);
    if (quest && !((player.questClaimed || {})[baseName])) {
      if (!player.questClaimed) player.questClaimed = {};
      player.questClaimed[baseName] = true;

      if (quest.reward.awakening_stone) {
        player.awakeningStones = (player.awakeningStones || 0) + quest.reward.awakening_stone;
      }
      if (quest.reward.gold) {
        player.gold = (player.gold || 0) + quest.reward.gold;
      }
      if (quest.reward.diamonds) {
        player.diamonds = (player.diamonds || 0) + quest.reward.diamonds;
      }

      return { ok: true, completed: true, msg: `"${result.quest}" 퀘스트 완료! 보상 지급!`, reward: quest.reward, steps: result.steps };
    }
    return { ok: true, completed: true, claimed: true, msg: '이미 보상을 받았습니다', steps: result.steps };
  }

  return { ok: true, completed: false, steps: result.steps, quest: result.quest };
}

// ============================================
// 기본 각성 로직
// ============================================

function canAwaken(card) {
  if ((card.level || 1) < 30) return { can: false, reason: 'Lv.30 필요' };
  if ((card.stars || 0) < 3) return { can: false, reason: '★3 이상 필요' };
  if (card.awakened) return { can: false, reason: '이미 각성됨' };
  const baseName = (card.name || '').replace(/[★+\d]+$/, '').trim();
  const hasBranch = !!AWAKENING_BRANCHES[baseName];
  const hasForm = !!AWAKENING_FORMS[baseName];
  if (!hasBranch && !hasForm) return { can: false, reason: '각성 폼 없음' };
  return { can: true, form: AWAKENING_FORMS[baseName] || null, hasBranch, branches: hasBranch ? AWAKENING_BRANCHES[baseName] : null };
}

function awakenCard(player, cardId) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };

  const check = canAwaken(card);
  if (!check.can) return { ok: false, reason: check.reason };

  // 분기 각성이 있는 카드는 card_awaken_branch를 사용해야 함
  if (check.hasBranch) return { ok: false, reason: '분기 각성 카드입니다. 경로를 선택하세요.', branches: check.branches };

  if ((player.gold || 0) < AWAKENING_COST.gold) return { ok: false, reason: `골드 ${AWAKENING_COST.gold} 필요` };
  if ((player.diamonds || 0) < AWAKENING_COST.diamonds) return { ok: false, reason: `다이아 ${AWAKENING_COST.diamonds} 필요` };
  if ((player.awakeningStones || 0) < AWAKENING_COST.awakening_stone) return { ok: false, reason: '각성석 필요' };

  player.gold -= AWAKENING_COST.gold;
  player.diamonds -= AWAKENING_COST.diamonds;
  player.awakeningStones--;

  const form = check.form;
  card.name = form.awaken;
  card.icon = form.icon;
  card.grade = form.grade;
  card.atk = Math.floor((card.atk || 30) * form.atkMul);
  card.def = Math.floor((card.def || 20) * form.defMul);
  card.hp = Math.floor((card.hp || 200) * form.hpMul);
  if (form.matkMul) card.matk = Math.floor((card.matk || 0) * form.matkMul + 50);
  card.awakened = true;
  card.awakenSkill = form.newSkill;
  card.lore = form.lore;

  return { ok: true, msg: `🌟 각성! "${card.name}" — ${form.newSkill.name} 해금!`, card, lore: form.lore };
}

function awakenCardBranch(player, cardId, path) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };

  const check = canAwaken(card);
  if (!check.can) return { ok: false, reason: check.reason };
  if (!check.hasBranch) return { ok: false, reason: '분기 각성이 없는 카드입니다' };

  const branch = check.branches.find(b => b.path === path);
  if (!branch) return { ok: false, reason: `"${path}" 경로가 없습니다. 가능한 경로: ${check.branches.map(b => b.path).join(', ')}` };

  // 분기 각성 비용 (기본 비용 + 경로별 필요 아이템)
  if ((player.gold || 0) < AWAKENING_COST.gold) return { ok: false, reason: `골드 ${AWAKENING_COST.gold} 필요` };
  if ((player.diamonds || 0) < AWAKENING_COST.diamonds) return { ok: false, reason: `다이아 ${AWAKENING_COST.diamonds} 필요` };
  if ((player.awakeningStones || 0) < AWAKENING_COST.awakening_stone) return { ok: false, reason: '각성석 필요' };

  // 경로별 필요 아이템 확인
  if (branch.reqItem) {
    const items = player.items || {};
    if (!items[branch.reqItem] || items[branch.reqItem] < 1) {
      return { ok: false, reason: `"${branch.reqItem}" 아이템 필요` };
    }
    if (!player.items) player.items = {};
    player.items[branch.reqItem]--;
  }

  player.gold -= AWAKENING_COST.gold;
  player.diamonds -= AWAKENING_COST.diamonds;
  player.awakeningStones--;

  card.name = branch.awaken;
  card.icon = branch.icon;
  card.grade = branch.grade;
  card.atk = Math.floor((card.atk || 30) * branch.atkMul);
  card.def = Math.floor((card.def || 20) * branch.defMul);
  card.hp = Math.floor((card.hp || 200) * branch.hpMul);
  card.awakened = true;
  card.awakenPath = path;
  card.awakenSkill = branch.newSkill;
  card.lore = branch.lore;

  return { ok: true, msg: `🌟 분기 각성! "${card.name}" [${path}] — ${branch.newSkill.name} 해금!`, card, lore: branch.lore };
}

// ============================================
// 소켓 이벤트 등록
// ============================================

function register(io, socket, player) {
  socket.on('card_awaken_check', (data) => {
    const card = (player.cards || []).find(c => c.id === data.cardId);
    if (!card) return socket.emit('card_awaken_check', { can: false, reason: '카드 없음' });
    const result = canAwaken(card);
    socket.emit('card_awaken_check', { ...result, cost: AWAKENING_COST, stones: player.awakeningStones || 0 });
  });

  socket.on('card_awaken', (data) => {
    const result = awakenCard(player, data.cardId);
    socket.emit('card_awaken_result', result);
    if (result.ok) {
      io.emit('server_msg', `🌟👑 [각성] ${player.displayName || '???'}의 "${result.card.name}" 각성! ${result.card.awakenSkill.name} 해금!`);
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  socket.on('card_awaken_info', () => {
    const forms = Object.entries(AWAKENING_FORMS).map(([k, v]) => ({ from: k, to: v.awaken, icon: v.icon, skill: v.newSkill, grade: v.grade }));
    const branches = Object.entries(AWAKENING_BRANCHES).map(([k, v]) => ({ from: k, paths: v.map(b => ({ path: b.path, to: b.awaken, icon: b.icon, skill: b.newSkill, reqItem: b.reqItem })) }));
    socket.emit('card_awaken_info', { forms, branches, cost: AWAKENING_COST, stones: player.awakeningStones || 0, sources: AWAKENING_STONE_SOURCES });
  });

  // 분기 각성
  socket.on('card_awaken_branch', (data) => {
    const result = awakenCardBranch(player, data.cardId, data.path);
    socket.emit('card_awaken_result', result);
    if (result.ok) {
      io.emit('server_msg', `🌟👑 [분기 각성] ${player.displayName || '???'}의 "${result.card.name}" 각성! [${data.path}] ${result.card.awakenSkill.name} 해금!`);
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // 초월
  socket.on('card_transcend', (data) => {
    const card = (player.cards || []).find(c => c.id === data.cardId);
    if (!card) return socket.emit('card_transcend_result', { ok: false, reason: '카드 없음' });

    // 초월 가능 여부 확인만
    if (data.checkOnly) {
      const check = canTranscend(card);
      return socket.emit('card_transcend_result', { ...check, card });
    }

    const result = transcendCard(player, data.cardId);
    socket.emit('card_transcend_result', result);
    if (result.ok) {
      io.emit('server_msg', `✨👑 [초월] ${player.displayName || '???'}의 "${result.card.name}" ${result.passiveInfo.name}!`);
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // 각성 퀘스트 조회
  socket.on('card_awaken_quest', (data) => {
    const result = getAwakeningQuest(player, data.cardId);
    socket.emit('card_awaken_quest', result);
  });

  // 각성 퀘스트 진행도 확인 + 보상 수령
  socket.on('card_awaken_quest_progress', (data) => {
    const result = checkAwakeningQuestProgress(player, data.cardId);
    socket.emit('card_awaken_quest_progress', result);
    if (result.ok && result.completed && !result.claimed) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });
}

module.exports = {
  AWAKENING_FORMS,
  AWAKENING_BRANCHES,
  AWAKENING_COST,
  AWAKENING_STONE_SOURCES,
  TRANSCEND_PASSIVES,
  TRANSCEND_MAX_LEVEL,
  AWAKENING_QUESTS,
  canAwaken,
  awakenCard,
  awakenCardBranch,
  canTranscend,
  transcendCard,
  getAwakeningQuest,
  checkAwakeningQuestProgress,
  register,
};

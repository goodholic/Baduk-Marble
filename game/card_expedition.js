// ============================================
// 카드 원정/탐험 시스템 — 카드 파견 → 시간 경과 → 보상
// ============================================

const MAX_EXPEDITIONS = 3;
const MAX_AUTO_REPEATS = 3;
const MAX_LOG_ENTRIES = 20;

// 원정지 목록
const EXPEDITION_ZONES = [
  { id: 'exp_forest', name: '고대 숲', icon: '🌲', difficulty: 1, duration: 300, // 5분
    rewards: { gold: [300, 800], exp: [50, 100], cardChance: 0.1 },
    desc: '평화로운 숲. 쉬운 탐험.', reqCards: 1 },
  { id: 'exp_cave', name: '수정 동굴', icon: '💎', difficulty: 3, duration: 600,
    rewards: { gold: [800, 2000], exp: [100, 250], cardChance: 0.2, diamondChance: 0.1 },
    desc: '보석이 빛나는 동굴. 몬스터 주의.', reqCards: 2 },
  { id: 'exp_ruins', name: '고대 유적', icon: '🏛️', difficulty: 5, duration: 1200,
    rewards: { gold: [2000, 5000], exp: [200, 500], cardChance: 0.3, equipChance: 0.15 },
    desc: '고대 문명의 유적. 함정과 보물.', reqCards: 3 },
  { id: 'exp_volcano', name: '화산 지대', icon: '🌋', difficulty: 7, duration: 1800,
    rewards: { gold: [4000, 10000], exp: [400, 800], cardChance: 0.4, equipChance: 0.2, diamondChance: 0.15 },
    desc: '뜨거운 용암 사이로. 강력한 보상.', reqCards: 3 },
  { id: 'exp_abyss', name: '심연', icon: '🌑', difficulty: 9, duration: 3600,
    rewards: { gold: [8000, 20000], exp: [800, 1500], cardChance: 0.5, equipChance: 0.3, diamondChance: 0.2, legendChance: 0.05 },
    desc: '어둠의 심연. 최고 보상, 최고 위험.', reqCards: 4 },
  { id: 'exp_heaven', name: '천상의 탑', icon: '🌟', difficulty: 10, duration: 7200,
    rewards: { gold: [15000, 40000], exp: [1500, 3000], cardChance: 0.6, equipChance: 0.4, diamondChance: 0.3, legendChance: 0.1, mythChance: 0.02 },
    desc: '전설의 탑. 2시간 대탐험.', reqCards: 5 },
];

// 보스 원정
const BOSS_EXPEDITIONS = [
  { id: 'bexp_troll', name: '트롤 소굴🧌', difficulty: 8, duration: 1800, reqCards: 3, reqPower: 200,
    boss: { name: '동굴 트롤', hp: 5000, atk: 150 },
    reward: { gold: [5000, 15000], diamonds: [5, 15], cardGrade: 'epic', equipChance: 0.4 },
    desc: '트롤 소굴 습격! 보스전 발생!' },
  { id: 'bexp_dragon', name: '용의 둥지🐲', difficulty: 10, duration: 3600, reqCards: 4, reqPower: 400,
    boss: { name: '화염 드래곤', hp: 15000, atk: 300 },
    reward: { gold: [15000, 50000], diamonds: [15, 40], cardGrade: 'legend', equipChance: 0.6, awakeningStoneChance: 0.1 },
    desc: '드래곤 둥지 공략! 전설 보상!' },
  { id: 'bexp_demon', name: '마왕의 성😈', difficulty: 12, duration: 7200, reqCards: 5, reqPower: 600,
    boss: { name: '마왕 아스모데우스', hp: 30000, atk: 500 },
    reward: { gold: [30000, 100000], diamonds: [30, 80], cardGrade: 'myth', equipChance: 0.8, awakeningStoneChance: 0.3 },
    desc: '마왕성 최종 공략! 신화급 보상!' },
];

// 비밀 원정지
const SECRET_ZONES = [
  { id: 'exp_fairy', name: '요정의 숲🧚', unlockCondition: { expeditionClears: 20 }, difficulty: 6, duration: 1200,
    rewards: { gold: [3000, 8000], specialItem: 'fairy_dust', cardChance: 0.5 },
    desc: '요정이 숨긴 비밀 숲. 특수 아이템!' },
  { id: 'exp_timeless', name: '시간의 틈⏳', unlockCondition: { towerFloor: 50 }, difficulty: 8, duration: 2400,
    rewards: { gold: [5000, 15000], timeReward: true, legendChance: 0.15 },
    desc: '시간이 멈춘 공간. 원정 시간 반환!' },
  { id: 'exp_chaos', name: '혼돈의 차원🌀', unlockCondition: { mythCards: 1 }, difficulty: 10, duration: 3600,
    rewards: { gold: [10000, 30000], chaosItem: true, mythChance: 0.05 },
    desc: '혼돈의 차원. 무엇이 나올지 모른다!' },
];

// 원정 이벤트 (진행 중 랜덤)
const EXPEDITION_EVENTS = [
  { id: 'ee_treasure', name: '숨겨진 보물!', chance: 0.15, effect: { goldMul: 2.0 }, icon: '💰✨', desc: '골드 보상 2배!' },
  { id: 'ee_ambush', name: '매복!', chance: 0.1, effect: { cardLoss: true }, icon: '⚠️', desc: '파견 카드 1장 부상 (EXP -50)', negative: true },
  { id: 'ee_ally', name: '동료 발견!', chance: 0.08, effect: { bonusCard: true }, icon: '🤝', desc: '추가 카드 1장 획득!' },
  { id: 'ee_boss', name: '보스 조우!', chance: 0.05, effect: { bossReward: true }, icon: '🐲', desc: '보스 처치 시 에픽+ 장비!' },
  { id: 'ee_shortcut', name: '지름길 발견!', chance: 0.1, effect: { timeCut: 0.5 }, icon: '💨', desc: '원정 시간 50% 단축!' },
  { id: 'ee_curse', name: '저주!', chance: 0.05, effect: { rewardCut: 0.5 }, icon: '💀', desc: '보상 50% 감소...', negative: true },
  { id: 'ee_miracle', name: '기적!', chance: 0.02, effect: { allRewardMul: 3.0 }, icon: '🌈✨', desc: '모든 보상 3배!!!' },
];

// 원정 마일스톤
const EXPEDITION_MILESTONES = [
  { count: 10, reward: { gold: 5000, diamonds: 10 }, name: '탐험 입문' },
  { count: 50, reward: { gold: 20000, diamonds: 30 }, name: '노련한 탐험가' },
  { count: 100, reward: { gold: 50000, diamonds: 60, card: 'epic' }, name: '대탐험가' },
  { count: 200, reward: { gold: 100000, diamonds: 100, card: 'legend', title: '전설의 탐험가' }, name: '전설의 탐험가' },
];

// ---- 일반 원정 ----

function startExpedition(player, zoneId, cardIds) {
  const zone = EXPEDITION_ZONES.find(z => z.id === zoneId);
  if (!zone) return { ok: false, reason: '알 수 없는 원정지' };

  const exps = player.expeditions || [];
  if (exps.filter(e => e.status === 'active').length >= MAX_EXPEDITIONS) {
    return { ok: false, reason: `최대 ${MAX_EXPEDITIONS}개 동시 원정 가능` };
  }

  if (!cardIds || cardIds.length < zone.reqCards) {
    return { ok: false, reason: `카드 ${zone.reqCards}장 필요` };
  }

  // 카드 파워 계산
  const cards = (player.cards || []).filter(c => cardIds.includes(c.id));
  const power = cards.reduce((s, c) => s + (c.atk || 30) + (c.def || 20), 0);

  // 랜덤 이벤트 결정
  const events = EXPEDITION_EVENTS.filter(e => Math.random() < e.chance);

  const expedition = {
    id: `exp_${Date.now()}`,
    zoneId, zoneName: zone.name,
    cardIds,
    power,
    startTime: Date.now(),
    endTime: Date.now() + zone.duration * 1000,
    events,
    status: 'active',
    difficulty: zone.difficulty,
  };

  // 시간 단축 이벤트 적용
  const shortcut = events.find(e => e.effect.timeCut);
  if (shortcut) {
    expedition.endTime = Date.now() + Math.floor(zone.duration * shortcut.effect.timeCut) * 1000;
  }

  exps.push(expedition);
  player.expeditions = exps;

  return { ok: true, expedition, events: events.map(e => ({ name: e.name, icon: e.icon, desc: e.desc })), msg: `${zone.name} 원정 시작! (${Math.floor(zone.duration / 60)}분)` };
}

function collectExpedition(player, expId) {
  const exps = player.expeditions || [];
  const exp = exps.find(e => e.id === expId);
  if (!exp) return { ok: false, reason: '원정 없음' };
  if (exp.status !== 'active') return { ok: false, reason: '이미 수집됨' };
  if (Date.now() < exp.endTime) {
    const remaining = Math.ceil((exp.endTime - Date.now()) / 1000);
    return { ok: false, reason: `아직 ${remaining}초 남음` };
  }

  exp.status = 'completed';
  const zone = EXPEDITION_ZONES.find(z => z.id === exp.zoneId)
    || BOSS_EXPEDITIONS.find(z => z.id === exp.zoneId)
    || SECRET_ZONES.find(z => z.id === exp.zoneId);
  if (!zone) return { ok: false, reason: '존 데이터 없음' };

  // 보상 계산
  let goldMul = 1.0;
  exp.events.forEach(e => {
    if (e.effect.goldMul) goldMul *= e.effect.goldMul;
    if (e.effect.allRewardMul) goldMul *= e.effect.allRewardMul;
    if (e.effect.rewardCut) goldMul *= e.effect.rewardCut;
  });

  const r = zone.rewards || zone.reward || {};
  const goldRange = r.gold || [0, 0];
  const gold = Math.floor((goldRange[0] + Math.random() * (goldRange[1] - goldRange[0])) * goldMul);
  const expRange = r.exp || [0, 0];
  const expGain = Math.floor(expRange[0] + Math.random() * (expRange[1] - expRange[0]));

  player.gold = (player.gold || 0) + gold;
  // 파견 카드에 EXP
  const partyCards = (player.cards || []).filter(c => exp.cardIds.includes(c.id));
  if (partyCards.length > 0) {
    partyCards.forEach(c => { c.exp = (c.exp || 0) + Math.floor(expGain / partyCards.length); });
  }

  let bonusCard = null;
  if (Math.random() < (r.cardChance || 0)) {
    const { generateRewardCard } = require('./card_system');
    const cards = generateRewardCard(Math.random() < (r.legendChance || 0) ? 1 : 10, 100);
    if (cards[0]) { player.cards.push(cards[0]); bonusCard = cards[0]; }
  }

  let diamonds = 0;
  const diamondRange = r.diamonds;
  if (diamondRange && Array.isArray(diamondRange)) {
    diamonds = Math.floor(diamondRange[0] + Math.random() * (diamondRange[1] - diamondRange[0]));
    player.diamonds = (player.diamonds || 0) + diamonds;
  } else if (Math.random() < (r.diamondChance || 0)) {
    diamonds = 3 + Math.floor(Math.random() * 10);
    player.diamonds = (player.diamonds || 0) + diamonds;
  }

  // 보스 원정 추가 보상
  let bossResult = null;
  if (exp.bossData) {
    bossResult = resolveBossFight(exp.power, exp.bossData);
  }

  // 원정 로그 기록
  addExpeditionLog(player, {
    zoneId: exp.zoneId, zoneName: exp.zoneName || zone.name,
    gold, diamonds, expGain, bonusCard: bonusCard ? bonusCard.name : null,
    bossResult, completedAt: Date.now(),
  });

  // 원정 카운터 증가 (마일스톤용)
  player.expeditionCount = (player.expeditionCount || 0) + 1;

  // 마일스톤 체크
  const milestoneReward = checkMilestones(player);

  // 자동 반복 체크
  const autoRepeatTriggered = checkAutoRepeat(player, exp);

  const result = {
    ok: true,
    msg: `${zone.name || exp.zoneName} 원정 완료! +${gold}G${diamonds ? ' +' + diamonds + '💎' : ''}${bonusCard ? ' +카드: ' + bonusCard.name : ''}`,
    gold, diamonds, expGain, bonusCard, bossResult,
    events: exp.events.map(e => e.name),
  };

  if (milestoneReward) result.milestone = milestoneReward;
  if (autoRepeatTriggered) result.autoRepeat = true;

  return result;
}

// ---- 보스 원정 ----

function startBossExpedition(player, bossId, cardIds) {
  const boss = BOSS_EXPEDITIONS.find(b => b.id === bossId);
  if (!boss) return { ok: false, reason: '알 수 없는 보스 원정' };

  const exps = player.expeditions || [];
  if (exps.filter(e => e.status === 'active').length >= MAX_EXPEDITIONS) {
    return { ok: false, reason: `최대 ${MAX_EXPEDITIONS}개 동시 원정 가능` };
  }

  if (!cardIds || cardIds.length < boss.reqCards) {
    return { ok: false, reason: `카드 ${boss.reqCards}장 필요` };
  }

  const cards = (player.cards || []).filter(c => cardIds.includes(c.id));
  const power = cards.reduce((s, c) => s + (c.atk || 30) + (c.def || 20), 0);

  if (power < boss.reqPower) {
    return { ok: false, reason: `전투력 ${boss.reqPower} 이상 필요 (현재: ${power})` };
  }

  const events = EXPEDITION_EVENTS.filter(e => Math.random() < e.chance);

  const expedition = {
    id: `bexp_${Date.now()}`,
    zoneId: boss.id, zoneName: boss.name,
    cardIds, power,
    startTime: Date.now(),
    endTime: Date.now() + boss.duration * 1000,
    events,
    status: 'active',
    difficulty: boss.difficulty,
    bossData: { ...boss.boss },
    isBoss: true,
  };

  exps.push(expedition);
  player.expeditions = exps;

  return {
    ok: true, expedition,
    events: events.map(e => ({ name: e.name, icon: e.icon, desc: e.desc })),
    msg: `${boss.name} 보스 원정 시작! 보스: ${boss.boss.name} (HP: ${boss.boss.hp})`,
  };
}

function resolveBossFight(partyPower, bossData) {
  // 간단한 보스전 시뮬레이션: 파워 기반 확률
  const winChance = Math.min(0.95, partyPower / (bossData.hp / 10 + bossData.atk));
  const won = Math.random() < winChance;

  if (won) {
    const damageDealt = bossData.hp;
    const damageTaken = Math.floor(bossData.atk * (1 - winChance) * 5);
    return { won: true, damageDealt, damageTaken, msg: `${bossData.name} 처치 성공!` };
  } else {
    return { won: false, damageDealt: Math.floor(bossData.hp * 0.6), damageTaken: bossData.atk * 3, msg: `${bossData.name}에게 패배...` };
  }
}

// ---- 협동 원정 ----

function startCoopExpedition(players, zoneId, cardIdsByPlayer) {
  if (!players || players.length < 2 || players.length > 4) {
    return { ok: false, reason: '협동 원정은 2~4명 필요' };
  }

  const zone = EXPEDITION_ZONES.find(z => z.id === zoneId)
    || BOSS_EXPEDITIONS.find(z => z.id === zoneId);
  if (!zone) return { ok: false, reason: '알 수 없는 원정지' };

  // 각 플레이어 카드 검증 및 합산 파워
  let totalPower = 0;
  const allCardIds = [];
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const ids = cardIdsByPlayer[i] || [];
    if (ids.length === 0) return { ok: false, reason: `플레이어 ${i + 1}이(가) 카드를 파견하지 않았습니다` };

    const cards = (p.cards || []).filter(c => ids.includes(c.id));
    totalPower += cards.reduce((s, c) => s + (c.atk || 30) + (c.def || 20), 0);
    allCardIds.push(...ids);
  }

  const reqPower = zone.reqPower || 0;
  if (reqPower > 0 && totalPower < reqPower) {
    return { ok: false, reason: `합산 전투력 ${reqPower} 이상 필요 (현재: ${totalPower})` };
  }

  const events = EXPEDITION_EVENTS.filter(e => Math.random() < e.chance);
  const coopId = `coop_${Date.now()}`;

  // 각 플레이어에게 원정 등록
  players.forEach((p, i) => {
    if (!p.expeditions) p.expeditions = [];
    p.expeditions.push({
      id: coopId,
      zoneId: zone.id, zoneName: zone.name,
      cardIds: cardIdsByPlayer[i] || [],
      power: totalPower,
      startTime: Date.now(),
      endTime: Date.now() + zone.duration * 1000,
      events,
      status: 'active',
      difficulty: zone.difficulty,
      isCoop: true,
      coopPlayers: players.length,
      bossData: zone.boss ? { ...zone.boss } : null,
    });
  });

  return {
    ok: true, coopId,
    totalPower,
    playerCount: players.length,
    coopBonus: '+50% 보상',
    events: events.map(e => ({ name: e.name, icon: e.icon, desc: e.desc })),
    msg: `${zone.name} 협동 원정 시작! ${players.length}명 참여, 합산 전투력: ${totalPower} (+50% 보상)`,
  };
}

function collectCoopExpedition(player, expId) {
  const result = collectExpedition(player, expId);
  if (!result.ok) return result;

  // 협동 보너스: +50%
  const coopBonus = Math.floor(result.gold * 0.5);
  player.gold = (player.gold || 0) + coopBonus;
  result.gold += coopBonus;
  result.coopBonus = coopBonus;
  result.msg += ` (협동 보너스 +${coopBonus}G)`;

  return result;
}

// ---- 비밀 원정지 ----

function checkSecretZoneUnlock(player) {
  const unlocked = [];
  for (const zone of SECRET_ZONES) {
    const cond = zone.unlockCondition;
    let met = true;

    if (cond.expeditionClears && (player.expeditionCount || 0) < cond.expeditionClears) met = false;
    if (cond.towerFloor && (player.towerFloor || 0) < cond.towerFloor) met = false;
    if (cond.mythCards) {
      const mythCount = (player.cards || []).filter(c => c.grade === 'myth').length;
      if (mythCount < cond.mythCards) met = false;
    }

    if (met) unlocked.push(zone);
  }
  return unlocked;
}

function startSecretExpedition(player, zoneId, cardIds) {
  const zone = SECRET_ZONES.find(z => z.id === zoneId);
  if (!zone) return { ok: false, reason: '알 수 없는 비밀 원정지' };

  // 해금 조건 확인
  const unlocked = checkSecretZoneUnlock(player);
  if (!unlocked.find(z => z.id === zoneId)) {
    return { ok: false, reason: '비밀 원정지 해금 조건 미충족' };
  }

  // 일반 원정과 동일한 로직 사용 (zoneId로 구분)
  const exps = player.expeditions || [];
  if (exps.filter(e => e.status === 'active').length >= MAX_EXPEDITIONS) {
    return { ok: false, reason: `최대 ${MAX_EXPEDITIONS}개 동시 원정 가능` };
  }

  const reqCards = zone.reqCards || 2;
  if (!cardIds || cardIds.length < reqCards) {
    return { ok: false, reason: `카드 ${reqCards}장 필요` };
  }

  const cards = (player.cards || []).filter(c => cardIds.includes(c.id));
  const power = cards.reduce((s, c) => s + (c.atk || 30) + (c.def || 20), 0);
  const events = EXPEDITION_EVENTS.filter(e => Math.random() < e.chance);

  const expedition = {
    id: `secret_${Date.now()}`,
    zoneId: zone.id, zoneName: zone.name,
    cardIds, power,
    startTime: Date.now(),
    endTime: Date.now() + zone.duration * 1000,
    events, status: 'active',
    difficulty: zone.difficulty,
    isSecret: true,
  };

  exps.push(expedition);
  player.expeditions = exps;

  return {
    ok: true, expedition,
    events: events.map(e => ({ name: e.name, icon: e.icon, desc: e.desc })),
    msg: `비밀 원정지 [${zone.name}] 탐험 시작!`,
  };
}

// ---- 원정 로그/일지 ----

function addExpeditionLog(player, entry) {
  if (!player.expeditionLog) player.expeditionLog = [];
  player.expeditionLog.unshift({ ...entry, timestamp: Date.now() });
  // 최대 기록 수 유지
  if (player.expeditionLog.length > MAX_LOG_ENTRIES) {
    player.expeditionLog = player.expeditionLog.slice(0, MAX_LOG_ENTRIES);
  }
}

function getExpeditionLog(player) {
  const log = player.expeditionLog || [];
  const totalClears = player.expeditionCount || 0;
  const totalGold = log.reduce((s, e) => s + (e.gold || 0), 0);
  const totalDiamonds = log.reduce((s, e) => s + (e.diamonds || 0), 0);
  const cardsFound = log.filter(e => e.bonusCard).length;

  // 달성한 마일스톤
  const achievedMilestones = EXPEDITION_MILESTONES.filter(m => totalClears >= m.count);

  return {
    log,
    stats: {
      totalClears,
      totalGold,
      totalDiamonds,
      cardsFound,
    },
    achievements: achievedMilestones.map(m => m.name),
  };
}

// ---- 자동 반복 ----

function setAutoExpedition(player, zoneId, cardIds) {
  if (!player.autoExpeditions) player.autoExpeditions = [];

  // 이미 등록된 자동 원정 확인
  const existing = player.autoExpeditions.find(a => a.zoneId === zoneId);
  if (existing) {
    return { ok: false, reason: '이미 해당 원정지에 자동 반복 설정됨' };
  }

  if (player.autoExpeditions.length >= MAX_AUTO_REPEATS) {
    return { ok: false, reason: `자동 반복은 최대 ${MAX_AUTO_REPEATS}개까지 가능` };
  }

  player.autoExpeditions.push({
    zoneId,
    cardIds,
    remainingRepeats: MAX_AUTO_REPEATS,
    createdAt: Date.now(),
  });

  return { ok: true, msg: `자동 반복 설정 완료: ${zoneId} (최대 ${MAX_AUTO_REPEATS}회)` };
}

function cancelAutoExpedition(player, zoneId) {
  if (!player.autoExpeditions) return { ok: false, reason: '자동 원정 없음' };
  const idx = player.autoExpeditions.findIndex(a => a.zoneId === zoneId);
  if (idx === -1) return { ok: false, reason: '해당 자동 원정 없음' };
  player.autoExpeditions.splice(idx, 1);
  return { ok: true, msg: '자동 반복 해제' };
}

function checkAutoRepeat(player, completedExp) {
  if (!player.autoExpeditions) return false;
  const auto = player.autoExpeditions.find(a => a.zoneId === completedExp.zoneId);
  if (!auto || auto.remainingRepeats <= 0) return false;

  auto.remainingRepeats--;

  // 자동으로 같은 원정 시작
  const result = startExpedition(player, auto.zoneId, auto.cardIds);
  if (!result.ok) {
    // 시작 실패 시 자동 반복 제거
    const idx = player.autoExpeditions.indexOf(auto);
    if (idx !== -1) player.autoExpeditions.splice(idx, 1);
    return false;
  }

  if (auto.remainingRepeats <= 0) {
    const idx = player.autoExpeditions.indexOf(auto);
    if (idx !== -1) player.autoExpeditions.splice(idx, 1);
  }

  return true;
}

// ---- 마일스톤 ----

function checkMilestones(player) {
  const count = player.expeditionCount || 0;
  if (!player.claimedMilestones) player.claimedMilestones = [];

  for (const ms of EXPEDITION_MILESTONES) {
    if (count >= ms.count && !player.claimedMilestones.includes(ms.count)) {
      player.claimedMilestones.push(ms.count);
      // 보상 지급
      player.gold = (player.gold || 0) + (ms.reward.gold || 0);
      player.diamonds = (player.diamonds || 0) + (ms.reward.diamonds || 0);

      if (ms.reward.card) {
        try {
          const { generateRewardCard } = require('./card_system');
          const gradeMap = { epic: 5, legend: 2, myth: 1 };
          const cards = generateRewardCard(gradeMap[ms.reward.card] || 10, 100);
          if (cards[0]) player.cards.push(cards[0]);
        } catch (e) { /* card_system not available */ }
      }

      if (ms.reward.title) {
        if (!player.titles) player.titles = [];
        player.titles.push(ms.reward.title);
      }

      return { name: ms.name, reward: ms.reward, msg: `마일스톤 달성: ${ms.name}! +${ms.reward.gold}G +${ms.reward.diamonds}💎` };
    }
  }
  return null;
}

// ---- 소켓 등록 ----

function register(io, socket, player) {
  socket.on('expedition_zones', () => {
    socket.emit('expedition_zones', {
      zones: EXPEDITION_ZONES,
      active: (player.expeditions || []).filter(e => e.status === 'active'),
      maxExpeditions: MAX_EXPEDITIONS,
    });
  });

  socket.on('expedition_start', (data) => {
    const result = startExpedition(player, data.zoneId, data.cardIds);
    socket.emit('expedition_start_result', result);
  });

  socket.on('expedition_collect', (data) => {
    const exp = (player.expeditions || []).find(e => e.id === data.expId);
    let result;
    if (exp && exp.isCoop) {
      result = collectCoopExpedition(player, data.expId);
    } else {
      result = collectExpedition(player, data.expId);
    }
    socket.emit('expedition_collect_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('expedition_status', () => {
    const active = (player.expeditions || []).filter(e => e.status === 'active');
    const now = Date.now();
    socket.emit('expedition_status', {
      expeditions: active.map(e => ({
        ...e,
        timeLeft: Math.max(0, Math.ceil((e.endTime - now) / 1000)),
        ready: now >= e.endTime,
      })),
    });
  });

  // 보스 원정
  socket.on('expedition_boss_zones', () => {
    socket.emit('expedition_boss_zones', { zones: BOSS_EXPEDITIONS });
  });

  socket.on('expedition_boss_start', (data) => {
    const result = startBossExpedition(player, data.bossId, data.cardIds);
    socket.emit('expedition_boss_start_result', result);
  });

  // 비밀 원정지
  socket.on('expedition_secret_zones', () => {
    const unlocked = checkSecretZoneUnlock(player);
    socket.emit('expedition_secret_zones', {
      zones: SECRET_ZONES.map(z => {
        const isUnlocked = !!unlocked.find(u => u.id === z.id);
        return { ...z, unlocked: isUnlocked };
      }),
    });
  });

  // 원정 로그
  socket.on('expedition_log', () => {
    socket.emit('expedition_log', getExpeditionLog(player));
  });

  // 자동 반복
  socket.on('expedition_auto_set', (data) => {
    const result = setAutoExpedition(player, data.zoneId, data.cardIds);
    socket.emit('expedition_auto_set_result', result);
  });

  socket.on('expedition_auto_cancel', (data) => {
    const result = cancelAutoExpedition(player, data.zoneId);
    socket.emit('expedition_auto_cancel_result', result);
  });

  // 마일스톤
  socket.on('expedition_milestones', () => {
    const count = player.expeditionCount || 0;
    const claimed = player.claimedMilestones || [];
    socket.emit('expedition_milestones', {
      milestones: EXPEDITION_MILESTONES.map(m => ({
        ...m,
        achieved: count >= m.count,
        claimed: claimed.includes(m.count),
      })),
      totalClears: count,
    });
  });
}

module.exports = {
  EXPEDITION_ZONES, EXPEDITION_EVENTS, BOSS_EXPEDITIONS, SECRET_ZONES,
  EXPEDITION_MILESTONES, MAX_EXPEDITIONS, MAX_AUTO_REPEATS,
  startExpedition, collectExpedition,
  startBossExpedition, resolveBossFight,
  startCoopExpedition, collectCoopExpedition,
  checkSecretZoneUnlock, startSecretExpedition,
  getExpeditionLog, setAutoExpedition, cancelAutoExpedition,
  checkMilestones,
  register,
};

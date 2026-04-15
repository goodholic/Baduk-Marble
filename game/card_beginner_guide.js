// ============================================
// 초보자 7일 가이드 — 신규 유저 온보딩
// ============================================

// 7일 가이드 (일차별 목표 + 보상 + 해금)
const SEVEN_DAY_GUIDE = [
  {
    day: 1, name: '모험의 시작',
    tasks: [
      { id: 'd1_login', name: '게임 접속', goal: 1, track: 'logins', reward: { gold: 1000 } },
      { id: 'd1_summon', name: '첫 소환 1회', goal: 1, track: 'summons', reward: { gold: 2000, diamonds: 10 } },
      { id: 'd1_upgrade', name: '카드 강화 1회', goal: 1, track: 'upgrades', reward: { gold: 1500 } },
    ],
    unlocks: ['카드 강화', '소환', '행동 카드'],
    dayReward: { gold: 5000, diamonds: 20, card: 'rare', desc: '1일차 완료! 희귀 카드 지급!' },
  },
  {
    day: 2, name: '전투의 시작',
    tasks: [
      { id: 'd2_action3', name: '행동 카드 3회 사용', goal: 3, track: 'actions', reward: { gold: 2000 } },
      { id: 'd2_pvp', name: 'PvP 대전 1회', goal: 1, track: 'pvpBattles', reward: { gold: 3000, diamonds: 5 } },
      { id: 'd2_party', name: '파티 편성', goal: 1, track: 'partySet', reward: { gold: 1000 } },
    ],
    unlocks: ['PvP 대전', '파티 편성', '장비 장착'],
    dayReward: { gold: 8000, diamonds: 30, desc: '2일차 완료! PvP 전투 입문!' },
  },
  {
    day: 3, name: '영토 확장',
    tasks: [
      { id: 'd3_fortress', name: '기지 건물 1개 건설', goal: 1, track: 'buildings', reward: { gold: 3000 } },
      { id: 'd3_farm', name: '농장 카드 배치', goal: 1, track: 'farmDeploy', reward: { gold: 2000 } },
      { id: 'd3_expedition', name: '원정 1회', goal: 1, track: 'expeditions', reward: { gold: 3000, diamonds: 5 } },
    ],
    unlocks: ['기지 시스템', '방치 농장', '원정'],
    dayReward: { gold: 10000, diamonds: 40, card: 'epic', desc: '3일차 완료! 에픽 카드 지급!' },
  },
  {
    day: 4, name: '성장의 길',
    tasks: [
      { id: 'd4_tower5', name: '탑 5층 클리어', goal: 5, track: 'towerFloor', reward: { gold: 5000 } },
      { id: 'd4_evolve', name: '카드 진화 1회', goal: 1, track: 'evolves', reward: { gold: 5000, diamonds: 10 } },
      { id: 'd4_enchant', name: '인챈트 1회', goal: 1, track: 'enchants', reward: { gold: 3000 } },
    ],
    unlocks: ['도전의 탑', '카드 진화', '인챈트'],
    dayReward: { gold: 15000, diamonds: 50, desc: '4일차 완료! 본격 성장!' },
  },
  {
    day: 5, name: '사회 진출',
    tasks: [
      { id: 'd5_guild', name: '길드 가입/생성', goal: 1, track: 'hasGuild', reward: { gold: 5000, diamonds: 10 } },
      { id: 'd5_friend', name: '친구 1명 추가', goal: 1, track: 'friends', reward: { gold: 3000 } },
      { id: 'd5_trade', name: '거래소 이용 1회', goal: 1, track: 'trades', reward: { gold: 5000, diamonds: 5 } },
    ],
    unlocks: ['길드', '친구', '거래소'],
    dayReward: { gold: 15000, diamonds: 60, desc: '5일차 완료! 소셜 콘텐츠 해금!' },
  },
  {
    day: 6, name: '전장으로',
    tasks: [
      { id: 'd6_io', name: 'IO 배틀로얄 참가 1회', goal: 1, track: 'ioJoins', reward: { gold: 10000, diamonds: 20 } },
      { id: 'd6_siege', name: 'NPC 성 공략 1회', goal: 1, track: 'siegeAttempts', reward: { gold: 5000 } },
      { id: 'd6_summon10', name: '10연차 소환 1회', goal: 1, track: 'tenPulls', reward: { diamonds: 30 } },
    ],
    unlocks: ['IO 배틀로얄', '성 공략', '10연차 소환'],
    dayReward: { gold: 20000, diamonds: 80, card: 'legend', desc: '6일차 완료! 전설 카드 지급!!' },
  },
  {
    day: 7, name: '진정한 모험가',
    tasks: [
      { id: 'd7_tower20', name: '탑 20층 클리어', goal: 20, track: 'towerFloor', reward: { gold: 10000 } },
      { id: 'd7_promote', name: '카드 진급 1회', goal: 1, track: 'promotes', reward: { gold: 10000, diamonds: 20 } },
      { id: 'd7_pvp5', name: 'PvP 5승', goal: 5, track: 'pvpWins', reward: { gold: 15000, diamonds: 30 } },
    ],
    unlocks: ['시즌 시스템', 'PK', '보스 레이드'],
    dayReward: { gold: 50000, diamonds: 200, card: 'myth', title: '신규 모험가', desc: '7일 완료!! 신화 카드 + 칭호 지급!!!' },
  },
];

// Total 7-day rewards: ~123000G, ~545 diamonds, 1 rare + 1 epic + 1 legend + 1 myth card

const GUIDE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7일

const NEWBIE_BONUSES = {
  expMultiplier: 2.0,       // 2x EXP from all sources
  freeDailySummon: true,    // Free daily summon
  upgradeCostDiscount: 0.5, // -50% upgrade costs
};

// --- 카드 생성용 테이블 ---
const REWARD_CARD_NAMES = {
  rare:   ['정예 전사', '풍수사', '성기사', '암살자', '드루이드'],
  epic:   ['영웅 검사', '대마법사', '용기사', '사신', '성녀'],
  legend: ['전설의 검성', '불사조', '암흑기사', '빛의 천사', '용왕'],
  myth:   ['신의 대리자', '세계의 수호자', '운명의 파괴자', '태초의 존재', '차원의 지배자'],
};
const REWARD_CARD_ICONS = { rare: '🛡️', epic: '💎', legend: '🌟', myth: '👑' };
const REWARD_CARD_BASE_ATK = { rare: 60, epic: 100, legend: 180, myth: 300 };

// --- 내부 헬퍼 ---

function _ensureGuideState(player) {
  if (!player._guideState) {
    player._guideState = {
      startedAt: player._accountCreated || Date.now(),
      taskProgress: {},    // { taskId: currentCount }
      tasksClaimed: [],    // [ taskId, ... ]  (개별 태스크 보상 수령)
      daysClaimed: [],     // [ 1, 2, 3, ... ] (일차 완료 보상 수령)
      graduated: false,
    };
  }
  return player._guideState;
}

function _getCurrentDay(guideState) {
  const elapsed = Date.now() - guideState.startedAt;
  const day = Math.floor(elapsed / (24 * 60 * 60 * 1000)) + 1; // 1-based
  return Math.min(day, 8); // 8 이상이면 기간 만료
}

function _getTrackValue(player, trackKey) {
  // player stats 에서 트래킹 값을 읽어옴
  // _guideState.taskProgress 에 수동으로 기록된 값도 합산
  const gs = player._guideState || {};
  const manual = (gs.taskProgress || {})[trackKey] || 0;

  // 직접 player 필드에서도 읽어옴 (다른 시스템에서 누적된 값)
  const playerVal = _readPlayerStat(player, trackKey);

  return Math.max(manual, playerVal);
}

function _readPlayerStat(player, trackKey) {
  // 다양한 시스템의 누적치를 매핑
  switch (trackKey) {
    case 'logins':        return (player.loginCount || 0);
    case 'summons':       return (player.totalSummons || 0);
    case 'upgrades':      return (player.totalUpgrades || 0);
    case 'actions':       return (player.totalActions || 0);
    case 'pvpBattles':    return (player.pvpBattles || 0);
    case 'pvpWins':       return (player.pvpWins || 0);
    case 'partySet':      return (player.party && player.party.length > 0) ? 1 : 0;
    case 'buildings':     return (player.totalBuildings || 0);
    case 'farmDeploy':    return (player.farmDeployed || 0);
    case 'expeditions':   return (player.totalExpeditions || 0);
    case 'towerFloor':    return (player.towerFloor || 0);
    case 'evolves':       return (player.totalEvolves || 0);
    case 'enchants':      return (player.totalEnchants || 0);
    case 'hasGuild':      return player.guildId ? 1 : 0;
    case 'friends':       return (player.friends || []).length;
    case 'trades':        return (player.totalTrades || 0);
    case 'ioJoins':       return (player.ioJoins || 0);
    case 'siegeAttempts':  return (player.siegeAttempts || 0);
    case 'tenPulls':      return (player.tenPulls || 0);
    case 'promotes':      return (player.totalPromotes || 0);
    default:              return 0;
  }
}

function _generateRewardCard(grade, descLabel) {
  const pool = REWARD_CARD_NAMES[grade] || REWARD_CARD_NAMES.rare;
  const name = pool[Math.floor(Math.random() * pool.length)];
  const baseAtk = REWARD_CARD_BASE_ATK[grade] || 60;
  return {
    id: `card_${Date.now()}_guide_${grade}`,
    name,
    icon: REWARD_CARD_ICONS[grade] || '⚔️',
    grade,
    atk: baseAtk + Math.floor(Math.random() * baseAtk * 0.3),
    def: Math.floor(baseAtk * 0.7 + Math.random() * 20),
    hp: Math.floor(baseAtk * 5 + Math.random() * 100),
    level: 1,
    desc: descLabel || '초보자 가이드 보상',
  };
}

function _sendGuideMail(player, title, rewards, message) {
  const inbox = player.mailbox = player.mailbox || [];
  if (inbox.length >= 30) inbox.shift();

  inbox.push({
    id: `sysmail_${Date.now()}_guide`,
    from: '📮 시스템',
    type: 'system',
    title,
    message,
    rewards,
    sentAt: Date.now(),
    read: false,
    claimed: false,
  });
}

// --- 공개 함수 ---

function getGuideStatus(player) {
  const gs = _ensureGuideState(player);

  // 졸업 체크
  const currentDay = _getCurrentDay(gs);
  if (gs.graduated || currentDay > 7) {
    gs.graduated = true;
    return {
      active: false,
      graduated: true,
      daysClaimed: gs.daysClaimed,
      totalDaysCompleted: gs.daysClaimed.length,
    };
  }

  // 현재 일차 데이터
  const dayData = SEVEN_DAY_GUIDE[currentDay - 1];
  const tasks = dayData.tasks.map(task => {
    const current = _getTrackValue(player, task.track);
    const complete = current >= task.goal;
    const claimed = gs.tasksClaimed.includes(task.id);
    return { ...task, current, complete, claimed };
  });

  const allTasksDone = tasks.every(t => t.complete);
  const dayClaimable = allTasksDone && !gs.daysClaimed.includes(currentDay);
  const dayClaimed = gs.daysClaimed.includes(currentDay);

  // 이전 일차 정보도 포함 (진행 상황 요약)
  const daysSummary = SEVEN_DAY_GUIDE.map(d => ({
    day: d.day,
    name: d.name,
    accessible: d.day <= currentDay,
    claimed: gs.daysClaimed.includes(d.day),
    current: d.day === currentDay,
  }));

  return {
    active: true,
    graduated: false,
    currentDay,
    dayName: dayData.name,
    tasks,
    unlocks: dayData.unlocks,
    dayReward: dayData.dayReward,
    allTasksDone,
    dayClaimable,
    dayClaimed,
    daysSummary,
    daysRemaining: 7 - currentDay + 1,
    newbieBonuses: NEWBIE_BONUSES,
  };
}

function checkGuideTask(player, taskId) {
  const gs = _ensureGuideState(player);
  if (gs.graduated) return { ok: false, reason: '가이드 완료' };

  const currentDay = _getCurrentDay(gs);
  if (currentDay > 7) {
    gs.graduated = true;
    return { ok: false, reason: '가이드 기간 만료' };
  }

  // 현재 일차 또는 이전 일차의 미완료 태스크 검색
  for (let d = 0; d < currentDay; d++) {
    const dayData = SEVEN_DAY_GUIDE[d];
    const task = dayData.tasks.find(t => t.id === taskId);
    if (!task) continue;

    const current = _getTrackValue(player, task.track);
    const complete = current >= task.goal;
    const claimed = gs.tasksClaimed.includes(task.id);

    // 완료 + 미수령이면 보상 지급
    if (complete && !claimed) {
      gs.tasksClaimed.push(task.id);
      player.gold = (player.gold || 0) + (task.reward.gold || 0);
      player.diamonds = (player.diamonds || 0) + (task.reward.diamonds || 0);
      return {
        ok: true,
        taskId: task.id,
        taskName: task.name,
        complete: true,
        claimed: true,
        reward: task.reward,
        gold: player.gold,
        diamonds: player.diamonds,
      };
    }

    return {
      ok: true,
      taskId: task.id,
      taskName: task.name,
      current,
      goal: task.goal,
      complete,
      claimed,
    };
  }

  return { ok: false, reason: '태스크를 찾을 수 없음' };
}

function claimDayReward(player, day) {
  const gs = _ensureGuideState(player);
  if (gs.graduated) return { ok: false, reason: '가이드 이미 완료' };

  const currentDay = _getCurrentDay(gs);
  if (day > currentDay) return { ok: false, reason: `${day}일차에 아직 도달하지 않았습니다` };
  if (gs.daysClaimed.includes(day)) return { ok: false, reason: `${day}일차 보상 이미 수령` };

  const dayData = SEVEN_DAY_GUIDE[day - 1];
  if (!dayData) return { ok: false, reason: '유효하지 않은 일차' };

  // 해당 일차의 모든 태스크 완료 확인
  for (const task of dayData.tasks) {
    const current = _getTrackValue(player, task.track);
    if (current < task.goal) {
      return { ok: false, reason: `태스크 미완료: ${task.name} (${current}/${task.goal})` };
    }
  }

  // 보상 지급
  const reward = dayData.dayReward;
  player.gold = (player.gold || 0) + (reward.gold || 0);
  player.diamonds = (player.diamonds || 0) + (reward.diamonds || 0);
  gs.daysClaimed.push(day);

  const result = {
    ok: true,
    day,
    dayName: dayData.name,
    reward: { gold: reward.gold || 0, diamonds: reward.diamonds || 0 },
    desc: reward.desc,
    gold: player.gold,
    diamonds: player.diamonds,
  };

  // 카드 보상 (우편으로 발송)
  if (reward.card) {
    const card = _generateRewardCard(reward.card, `${day}일차 가이드 완료 보상`);
    _sendGuideMail(player, `🎁 ${day}일차 가이드 보상`, { card }, reward.desc);
    result.cardReward = card;
    result.msg = `${reward.desc} 카드는 우편함으로 발송되었습니다.`;
  }

  // 칭호 보상
  if (reward.title) {
    player.titles = player.titles || [];
    if (!player.titles.includes(reward.title)) {
      player.titles.push(reward.title);
    }
    result.titleReward = reward.title;
  }

  // 7일차 완료 시 졸업
  if (day === 7) {
    gs.graduated = true;
    result.graduated = true;
    result.graduationMsg = '축하합니다! 초보자 가이드를 모두 완료했습니다! 이제 진정한 모험이 시작됩니다!';
  }

  return result;
}

function getNewbieBonus(player) {
  const gs = _ensureGuideState(player);
  const currentDay = _getCurrentDay(gs);

  if (gs.graduated || currentDay > 7) {
    return {
      active: false,
      reason: '초보자 기간 종료',
      expMultiplier: 1.0,
      freeDailySummon: false,
      upgradeCostDiscount: 0,
    };
  }

  const elapsed = Date.now() - gs.startedAt;
  const remainingMs = GUIDE_DURATION_MS - elapsed;
  const remainingHours = Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)));
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));

  return {
    active: true,
    currentDay,
    remainingDays,
    remainingHours,
    expMultiplier: NEWBIE_BONUSES.expMultiplier,
    freeDailySummon: NEWBIE_BONUSES.freeDailySummon,
    upgradeCostDiscount: NEWBIE_BONUSES.upgradeCostDiscount,
    desc: `초보자 혜택: 경험치 ${NEWBIE_BONUSES.expMultiplier}배, 무료 일일 소환, 강화 비용 ${NEWBIE_BONUSES.upgradeCostDiscount * 100}% 할인`,
  };
}

/**
 * 외부 시스템에서 호출하여 가이드 진행 상황을 수동 갱신
 * 예: 소환 후 card_system 에서 trackGuideProgress(player, 'summons', 1) 호출
 */
function trackGuideProgress(player, trackKey, increment) {
  const gs = _ensureGuideState(player);
  if (gs.graduated) return;

  gs.taskProgress = gs.taskProgress || {};
  gs.taskProgress[trackKey] = (gs.taskProgress[trackKey] || 0) + (increment || 1);
}

function register(io, socket, player) {
  socket.on('guide_status', () => {
    socket.emit('guide_status', getGuideStatus(player));
  });

  socket.on('guide_check_tasks', () => {
    // 현재 일차의 모든 태스크 자동 체크 + 미수령 보상 자동 수령
    const gs = _ensureGuideState(player);
    if (gs.graduated) {
      socket.emit('guide_tasks', { active: false, graduated: true });
      return;
    }

    const currentDay = _getCurrentDay(gs);
    if (currentDay > 7) {
      gs.graduated = true;
      socket.emit('guide_tasks', { active: false, graduated: true });
      return;
    }

    const dayData = SEVEN_DAY_GUIDE[currentDay - 1];
    const results = [];

    for (const task of dayData.tasks) {
      const current = _getTrackValue(player, task.track);
      const complete = current >= task.goal;
      let claimed = gs.tasksClaimed.includes(task.id);

      // 완료 + 미수령이면 자동 수령
      if (complete && !claimed) {
        gs.tasksClaimed.push(task.id);
        player.gold = (player.gold || 0) + (task.reward.gold || 0);
        player.diamonds = (player.diamonds || 0) + (task.reward.diamonds || 0);
        claimed = true;
      }

      results.push({
        id: task.id,
        name: task.name,
        current,
        goal: task.goal,
        complete,
        claimed,
        reward: task.reward,
      });
    }

    const allTasksDone = results.every(t => t.complete);

    socket.emit('guide_tasks', {
      active: true,
      currentDay,
      dayName: dayData.name,
      tasks: results,
      allTasksDone,
      dayClaimable: allTasksDone && !gs.daysClaimed.includes(currentDay),
      gold: player.gold,
      diamonds: player.diamonds,
    });
  });

  socket.on('guide_claim_day', (data) => {
    const result = claimDayReward(player, data.day);
    socket.emit('guide_claim_result', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  socket.on('guide_newbie_bonus', () => {
    socket.emit('guide_newbie_bonus', getNewbieBonus(player));
  });
}

module.exports = {
  SEVEN_DAY_GUIDE,
  NEWBIE_BONUSES,
  getGuideStatus,
  checkGuideTask,
  claimDayReward,
  getNewbieBonus,
  trackGuideProgress,
  register,
};

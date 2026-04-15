// ============================================
// 일일 활동 추적 & 크로스 시스템 보너스
// ============================================

// 추적 대상 활동 (13개 시스템)
const ACTIVITY_SYSTEMS = [
  { id: 'cards', name: '카드 관리', icon: '🃏', events: ['card_upgrade', 'card_fuse', 'card_promote', 'card_evolve'] },
  { id: 'action', name: '행동 카드', icon: '🎴', events: ['action_card_play'] },
  { id: 'pvp', name: 'PvP 대전', icon: '⚔️', events: ['card_pvp_request'] },
  { id: 'io', name: 'IO 배틀', icon: '🏆', events: ['br_request_match'] },
  { id: 'fortress', name: '성 공략', icon: '🏰', events: ['fortress_attack', 'fortress_build'] },
  { id: 'trade', name: '무역', icon: '💰', events: ['market_buy', 'market_list_card', 'trade_route_start'] },
  { id: 'summon', name: '소환', icon: '📜', events: ['card_summon'] },
  { id: 'tower', name: '도전의 탑', icon: '🗼', events: ['tower_attempt'] },
  { id: 'expedition', name: '원정', icon: '🗺️', events: ['expedition_start'] },
  { id: 'farm', name: '농장', icon: '🌿', events: ['farm_collect', 'farm_deploy'] },
  { id: 'guild', name: '길드', icon: '👥', events: ['guild_donate', 'guild_raid_attack'] },
  { id: 'enchant', name: '인챈트', icon: '✨', events: ['card_enchant'] },
  { id: 'social', name: '소셜', icon: '💙', events: ['friend_gift', 'friend_visit', 'mail_send'] },
];

// 크로스 시스템 보너스 (참여 시스템 수에 따라)
const CROSS_BONUSES = [
  { systems: 3, name: '활동적인 모험가', bonus: { goldMul: 1.1, expMul: 1.1 }, reward: { gold: 1000 }, icon: '🌟' },
  { systems: 5, name: '다재다능', bonus: { goldMul: 1.2, expMul: 1.2 }, reward: { gold: 3000, diamonds: 5 }, icon: '🌟🌟' },
  { systems: 7, name: '만능 영웅', bonus: { goldMul: 1.3, expMul: 1.3 }, reward: { gold: 5000, diamonds: 10 }, icon: '🌟🌟🌟' },
  { systems: 9, name: '전설의 모험가', bonus: { goldMul: 1.5, expMul: 1.5 }, reward: { gold: 10000, diamonds: 20 }, icon: '🌟🌟🌟🌟' },
  { systems: 11, name: '세계의 지배자', bonus: { goldMul: 2.0, expMul: 2.0 }, reward: { gold: 20000, diamonds: 50, card: 'epic' }, icon: '👑🌟🌟🌟🌟🌟' },
  { systems: 13, name: '완벽한 하루', bonus: { goldMul: 3.0, expMul: 3.0 }, reward: { gold: 50000, diamonds: 100, card: 'legend' }, icon: '👑👑👑' },
];

// 연속 일수 보너스 (매일 3시스템 이상 참여 시 연속)
const STREAK_BONUSES = [
  { days: 3, reward: { gold: 5000, diamonds: 10 }, name: '3일 연속!' },
  { days: 7, reward: { gold: 15000, diamonds: 30, card: 'rare' }, name: '1주일 연속!' },
  { days: 14, reward: { gold: 30000, diamonds: 60, card: 'epic' }, name: '2주 연속!' },
  { days: 30, reward: { gold: 100000, diamonds: 200, card: 'legend', title: '근면한 모험가' }, name: '1개월 연속!!' },
];

// 이벤트 -> 시스템 매핑 (빠른 조회용)
const EVENT_TO_SYSTEM = {};
for (const sys of ACTIVITY_SYSTEMS) {
  for (const ev of sys.events) {
    EVENT_TO_SYSTEM[ev] = sys.id;
  }
}

// ============================================
// 내부 유틸
// ============================================

function getTodayKey() {
  return new Date().toDateString();
}

function ensureData(player) {
  if (!player._dailyActivity) {
    player._dailyActivity = {
      date: getTodayKey(),
      systems: {},        // { systemId: count }
      claimedTiers: [],   // [3, 5, ...] claimed system thresholds
      streak: 0,
      streakClaimedDays: [], // streak day milestones already claimed
      history: [],         // last 7 days: [{ date, systemCount, systems }]
    };
  }
  // 날짜가 바뀌었으면 자동 리셋
  if (player._dailyActivity.date !== getTodayKey()) {
    resetDailyActivity(player);
  }
  return player._dailyActivity;
}

// ============================================
// trackActivity
// ============================================

function trackActivity(player, systemId) {
  // systemId가 이벤트명일 수도 있으므로 변환
  const resolvedId = EVENT_TO_SYSTEM[systemId] || systemId;

  // 유효한 시스템인지 확인
  const systemDef = ACTIVITY_SYSTEMS.find(s => s.id === resolvedId);
  if (!systemDef) return null;

  const data = ensureData(player);
  const prevCount = Object.keys(data.systems).length;

  if (!data.systems[resolvedId]) {
    data.systems[resolvedId] = 0;
  }
  data.systems[resolvedId]++;

  const newCount = Object.keys(data.systems).length;
  const newlyUnlocked = [];

  // 새 시스템 참여로 보너스 티어 달성 여부 확인
  if (newCount > prevCount) {
    for (const tier of CROSS_BONUSES) {
      if (newCount >= tier.systems && prevCount < tier.systems) {
        newlyUnlocked.push(tier);
      }
    }
  }

  return {
    systemId: resolvedId,
    systemName: systemDef.name,
    systemIcon: systemDef.icon,
    activityCount: data.systems[resolvedId],
    totalSystems: newCount,
    totalPossible: ACTIVITY_SYSTEMS.length,
    newlyUnlocked,
  };
}

// ============================================
// getDailyActivity
// ============================================

function getDailyActivity(player) {
  const data = ensureData(player);
  const activeSystems = Object.keys(data.systems);
  const systemCount = activeSystems.length;

  // 현재 달성한 최고 보너스 티어
  let activeTier = null;
  for (const tier of CROSS_BONUSES) {
    if (systemCount >= tier.systems) {
      activeTier = tier;
    }
  }

  // 각 시스템 상태 맵
  const systemStatus = ACTIVITY_SYSTEMS.map(sys => ({
    id: sys.id,
    name: sys.name,
    icon: sys.icon,
    active: !!data.systems[sys.id],
    count: data.systems[sys.id] || 0,
  }));

  return {
    date: data.date,
    systemStatus,
    activeCount: systemCount,
    totalSystems: ACTIVITY_SYSTEMS.length,
    activeTier: activeTier ? {
      systems: activeTier.systems,
      name: activeTier.name,
      icon: activeTier.icon,
      bonus: activeTier.bonus,
    } : null,
    streak: data.streak,
    claimedTiers: [...data.claimedTiers],
  };
}

// ============================================
// claimCrossBonus
// ============================================

function claimCrossBonus(player, tier) {
  const data = ensureData(player);
  const systemCount = Object.keys(data.systems).length;

  // 해당 보너스 티어 찾기
  const bonusTier = CROSS_BONUSES.find(b => b.systems === tier);
  if (!bonusTier) {
    return { ok: false, reason: '존재하지 않는 보너스 티어입니다.' };
  }

  // 이미 수령했는지
  if (data.claimedTiers.includes(tier)) {
    return { ok: false, reason: '오늘 이미 수령한 보너스입니다.' };
  }

  // 조건 충족 여부
  if (systemCount < tier) {
    return { ok: false, reason: `${tier}개 시스템 참여가 필요합니다. (현재: ${systemCount}개)` };
  }

  // 보상 지급
  data.claimedTiers.push(tier);
  const rewards = { ...bonusTier.reward };

  if (rewards.gold && typeof player.gold === 'number') {
    player.gold += rewards.gold;
  }
  if (rewards.diamonds && typeof player.diamonds === 'number') {
    player.diamonds += rewards.diamonds;
  }
  // 카드 보상은 외부에서 처리할 수 있도록 반환
  return {
    ok: true,
    tierName: bonusTier.name,
    tierIcon: bonusTier.icon,
    rewards,
    bonus: bonusTier.bonus,
    message: `${bonusTier.icon} ${bonusTier.name} 보너스 획득!`,
  };
}

// ============================================
// getActiveBonuses
// ============================================

function getActiveBonuses(player) {
  const data = ensureData(player);
  const systemCount = Object.keys(data.systems).length;

  let goldMul = 1.0;
  let expMul = 1.0;
  let activeTierName = null;

  // 가장 높은 달성 티어의 보너스 적용 (중첩X, 최고 티어만)
  for (const tier of CROSS_BONUSES) {
    if (systemCount >= tier.systems) {
      goldMul = tier.bonus.goldMul;
      expMul = tier.bonus.expMul;
      activeTierName = tier.name;
    }
  }

  return {
    goldMul,
    expMul,
    activeTierName,
    systemCount,
    totalSystems: ACTIVITY_SYSTEMS.length,
  };
}

// ============================================
// checkStreak
// ============================================

function checkStreak(player) {
  const data = ensureData(player);
  const streak = data.streak;
  const newRewards = [];

  for (const sb of STREAK_BONUSES) {
    if (streak >= sb.days && !data.streakClaimedDays.includes(sb.days)) {
      data.streakClaimedDays.push(sb.days);

      // 보상 지급
      if (sb.reward.gold && typeof player.gold === 'number') {
        player.gold += sb.reward.gold;
      }
      if (sb.reward.diamonds && typeof player.diamonds === 'number') {
        player.diamonds += sb.reward.diamonds;
      }
      if (sb.reward.title && player.titles) {
        if (!player.titles.includes(sb.reward.title)) {
          player.titles.push(sb.reward.title);
        }
      }

      newRewards.push({
        days: sb.days,
        name: sb.name,
        reward: sb.reward,
      });
    }
  }

  return {
    streak,
    newRewards,
    nextMilestone: STREAK_BONUSES.find(sb => sb.days > streak) || null,
  };
}

// ============================================
// getDashboard
// ============================================

function getDashboard(player) {
  const data = ensureData(player);
  const activity = getDailyActivity(player);
  const bonuses = getActiveBonuses(player);
  const streakInfo = {
    current: data.streak,
    claimedDays: [...data.streakClaimedDays],
    nextMilestone: STREAK_BONUSES.find(sb => sb.days > data.streak) || null,
  };

  // 보너스 티어 전체 상태 (수령 가능 여부 포함)
  const systemCount = Object.keys(data.systems).length;
  const tierStatus = CROSS_BONUSES.map(tier => ({
    systems: tier.systems,
    name: tier.name,
    icon: tier.icon,
    bonus: tier.bonus,
    reward: tier.reward,
    reached: systemCount >= tier.systems,
    claimed: data.claimedTiers.includes(tier.systems),
    claimable: systemCount >= tier.systems && !data.claimedTiers.includes(tier.systems),
  }));

  return {
    activity,
    bonuses,
    streak: streakInfo,
    tiers: tierStatus,
    history: (data.history || []).slice(-7),
  };
}

// ============================================
// resetDailyActivity
// ============================================

function resetDailyActivity(player) {
  const data = player._dailyActivity;
  if (!data) {
    // 첫 접속이면 초기화만
    ensureData(player);
    return;
  }

  const prevDate = data.date;
  const prevSystemCount = Object.keys(data.systems).length;
  const today = getTodayKey();

  // 이미 오늘이면 스킵
  if (prevDate === today) return;

  // 히스토리에 어제 기록 저장
  if (!data.history) data.history = [];
  data.history.push({
    date: prevDate,
    systemCount: prevSystemCount,
    systems: Object.keys(data.systems),
  });
  // 최근 7일만 유지
  if (data.history.length > 7) {
    data.history = data.history.slice(-7);
  }

  // 연속 일수 계산: 어제 3개 이상 시스템 참여했으면 연속 유지/증가
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();

  if (prevDate === yesterdayKey && prevSystemCount >= 3) {
    data.streak = (data.streak || 0) + 1;
  } else if (prevDate !== yesterdayKey) {
    // 하루 이상 빠졌으면 리셋
    data.streak = 0;
    data.streakClaimedDays = [];
  } else {
    // 어제 3개 미만이면 리셋
    data.streak = 0;
    data.streakClaimedDays = [];
  }

  // 오늘 데이터 초기화
  data.date = today;
  data.systems = {};
  data.claimedTiers = [];
}

// ============================================
// register (Socket.io)
// ============================================

function register(io, socket, player) {
  // 대시보드 조회
  socket.on('activity_dashboard', (_, ack) => {
    const cb = typeof _ === 'function' ? _ : ack;
    try {
      const dashboard = getDashboard(player);
      if (typeof cb === 'function') cb({ ok: true, dashboard });
      else socket.emit('activity_dashboard_result', { ok: true, dashboard });
    } catch (e) {
      const errMsg = { ok: false, reason: e.message };
      if (typeof cb === 'function') cb(errMsg);
      else socket.emit('activity_dashboard_result', errMsg);
    }
  });

  // 크로스 보너스 수령
  socket.on('activity_claim_bonus', (data, ack) => {
    const cb = typeof ack === 'function' ? ack : null;
    try {
      const tier = data && data.tier;
      if (typeof tier !== 'number') {
        const errMsg = { ok: false, reason: 'tier(숫자) 파라미터가 필요합니다.' };
        if (cb) cb(errMsg);
        else socket.emit('activity_claim_bonus_result', errMsg);
        return;
      }
      const result = claimCrossBonus(player, tier);
      if (cb) cb(result);
      else socket.emit('activity_claim_bonus_result', result);
    } catch (e) {
      const errMsg = { ok: false, reason: e.message };
      if (cb) cb(errMsg);
      else socket.emit('activity_claim_bonus_result', errMsg);
    }
  });

  // 연속 출석 확인 & 보상 수령
  socket.on('activity_check_streak', (_, ack) => {
    const cb = typeof _ === 'function' ? _ : ack;
    try {
      const result = checkStreak(player);
      if (typeof cb === 'function') cb({ ok: true, ...result });
      else socket.emit('activity_check_streak_result', { ok: true, ...result });
    } catch (e) {
      const errMsg = { ok: false, reason: e.message };
      if (typeof cb === 'function') cb(errMsg);
      else socket.emit('activity_check_streak_result', errMsg);
    }
  });
}

// ============================================
// Exports
// ============================================

module.exports = {
  ACTIVITY_SYSTEMS,
  CROSS_BONUSES,
  STREAK_BONUSES,
  EVENT_TO_SYSTEM,
  trackActivity,
  getDailyActivity,
  claimCrossBonus,
  getActiveBonuses,
  checkStreak,
  getDashboard,
  resetDailyActivity,
  register,
};

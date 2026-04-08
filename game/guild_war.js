// 길드 전쟁 시스템 — v1.64
// 길드 간 공식 전쟁 선언 → 주간 시즌 → 점수/킬 트래킹 → 보상

const WAR_CONFIG = {
  declarationCostGold: 50000, // 선전포고 비용
  warDurationDays: 7,
  killScoreValue: 10,        // 킬 1회 = 10점
  objectiveScoreValue: 50,   // 거점 점령 = 50점
  weeklyResetDay: 1,         // 월요일 리셋
  maxConcurrentWars: 3,      // 길드당 동시 전쟁 한도
};

const WAR_REWARDS = {
  victory: {
    gold: 100000,
    diamonds: 500,
    guildExp: 5000,
    title: 'war_victor',
  },
  defeat: {
    gold: 20000,
    diamonds: 50,
    guildExp: 1000,
  },
  draw: {
    gold: 50000,
    diamonds: 200,
    guildExp: 2000,
  },
  topKiller: { gold: 30000, diamonds: 100 }, // 최다 킬 개인 보상
};

// 활성 전쟁 (메모리)
let activeWars = {}; // { warId: { ... } }
let warIdCounter = 1;

function declareWar(attackerGuild, defenderGuild, attackerLeaderGold) {
  if (!attackerGuild || !defenderGuild) return { success: false, msg: '길드 미지정' };
  if (attackerGuild === defenderGuild) return { success: false, msg: '자기 길드와 전쟁 불가' };

  // 이미 두 길드 간 전쟁 중인지 확인
  for (const war of Object.values(activeWars)) {
    if (war.status === 'active' &&
        ((war.attacker === attackerGuild && war.defender === defenderGuild) ||
         (war.attacker === defenderGuild && war.defender === attackerGuild))) {
      return { success: false, msg: '이미 이 길드와 전쟁 중' };
    }
  }

  // 동시 전쟁 한도
  const myWars = Object.values(activeWars).filter(w =>
    w.status === 'active' && (w.attacker === attackerGuild || w.defender === attackerGuild)
  );
  if (myWars.length >= WAR_CONFIG.maxConcurrentWars) {
    return { success: false, msg: `동시 전쟁 한도 (${WAR_CONFIG.maxConcurrentWars}개)` };
  }

  if ((attackerLeaderGold || 0) < WAR_CONFIG.declarationCostGold) {
    return { success: false, msg: `선전포고 비용 ${WAR_CONFIG.declarationCostGold}G 필요` };
  }

  const warId = `war_${warIdCounter++}`;
  activeWars[warId] = {
    id: warId,
    attacker: attackerGuild,
    defender: defenderGuild,
    status: 'active',
    declaredAt: Date.now(),
    endsAt: Date.now() + WAR_CONFIG.warDurationDays * 24 * 3600 * 1000,
    scores: { [attackerGuild]: 0, [defenderGuild]: 0 },
    kills: { [attackerGuild]: {}, [defenderGuild]: {} }, // memberName: count
    objectives: { [attackerGuild]: 0, [defenderGuild]: 0 },
  };
  return { success: true, war: activeWars[warId], cost: WAR_CONFIG.declarationCostGold };
}

function recordKill(killerGuild, killerName, victimGuild) {
  // 두 길드 간 활성 전쟁 찾기
  for (const war of Object.values(activeWars)) {
    if (war.status !== 'active') continue;
    const isWarParticipant =
      (war.attacker === killerGuild && war.defender === victimGuild) ||
      (war.attacker === victimGuild && war.defender === killerGuild);
    if (!isWarParticipant) continue;

    war.scores[killerGuild] += WAR_CONFIG.killScoreValue;
    if (!war.kills[killerGuild][killerName]) war.kills[killerGuild][killerName] = 0;
    war.kills[killerGuild][killerName]++;
    return { war, scoreGained: WAR_CONFIG.killScoreValue };
  }
  return null;
}

function recordObjective(captureGuild, victimGuild) {
  for (const war of Object.values(activeWars)) {
    if (war.status !== 'active') continue;
    const isWarParticipant =
      (war.attacker === captureGuild && war.defender === victimGuild) ||
      (war.attacker === victimGuild && war.defender === captureGuild);
    if (!isWarParticipant) continue;
    war.scores[captureGuild] += WAR_CONFIG.objectiveScoreValue;
    war.objectives[captureGuild]++;
    return { war, scoreGained: WAR_CONFIG.objectiveScoreValue };
  }
  return null;
}

function resolveWar(warId) {
  const war = activeWars[warId];
  if (!war) return null;
  war.status = 'finished';

  const aScore = war.scores[war.attacker];
  const dScore = war.scores[war.defender];
  let outcome;
  if (aScore > dScore) outcome = 'attacker_win';
  else if (dScore > aScore) outcome = 'defender_win';
  else outcome = 'draw';

  // 최다 킬러
  const allKillers = [];
  for (const [guild, members] of Object.entries(war.kills)) {
    for (const [name, count] of Object.entries(members)) {
      allKillers.push({ guild, name, count });
    }
  }
  allKillers.sort((a, b) => b.count - a.count);
  const topKiller = allKillers[0] || null;

  return {
    warId,
    outcome,
    attacker: war.attacker,
    defender: war.defender,
    scores: war.scores,
    objectives: war.objectives,
    topKiller,
    rewards: {
      attacker: outcome === 'attacker_win' ? WAR_REWARDS.victory :
                outcome === 'draw' ? WAR_REWARDS.draw : WAR_REWARDS.defeat,
      defender: outcome === 'defender_win' ? WAR_REWARDS.victory :
                outcome === 'draw' ? WAR_REWARDS.draw : WAR_REWARDS.defeat,
    },
  };
}

function getActiveWars(guildName = null) {
  const wars = Object.values(activeWars).filter(w => w.status === 'active');
  if (guildName) {
    return wars.filter(w => w.attacker === guildName || w.defender === guildName);
  }
  return wars;
}

function tickWars() {
  const now = Date.now();
  const finished = [];
  for (const war of Object.values(activeWars)) {
    if (war.status === 'active' && now >= war.endsAt) {
      const result = resolveWar(war.id);
      finished.push(result);
    }
  }
  // 종료된 전쟁 정리 (3일 후)
  for (const [warId, war] of Object.entries(activeWars)) {
    if (war.status === 'finished' && (now - war.endsAt) > 3 * 24 * 3600 * 1000) {
      delete activeWars[warId];
    }
  }
  return finished;
}

function getStatus(guildName = null) {
  return {
    activeWars: getActiveWars(guildName),
    config: WAR_CONFIG,
    rewards: WAR_REWARDS,
  };
}

module.exports = {
  WAR_CONFIG,
  WAR_REWARDS,
  declareWar,
  recordKill,
  recordObjective,
  resolveWar,
  getActiveWars,
  tickWars,
  getStatus,
};

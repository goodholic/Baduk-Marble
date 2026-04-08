// 레이드 시스템 — v1.54
// 대규모 코디네이션 보스전 (10~30인)
// 멀티 페이즈 + 데미지 트래킹 + MVP 보상 + 티어 분배
// 보스 러시(솔로)와 던전(소규모)과는 다른 카테고리

const RAIDS = {
  inferno: {
    name: '지옥불 군주',
    icon: '🔥',
    minPlayers: 10,
    maxPlayers: 30,
    minLevel: 30,
    phases: [
      { name:'1페이즈: 화염의 시작', hp: 100000, atk: 80, time: 180 },
      { name:'2페이즈: 분노 폭발', hp: 200000, atk: 120, time: 300, mechanic: 'aoe_burst' },
      { name:'3페이즈: 최후의 발악', hp: 300000, atk: 180, time: 360, mechanic: 'enrage' },
    ],
    rewards: {
      base: { gold: 10000, exp: 15000 },
      mvp: { gold: 30000, exp: 50000, diamonds: 200, drop: 'inferno_cloak' },
      top10: { gold: 15000, exp: 25000, diamonds: 80 },
      participant: { gold: 5000, exp: 8000, diamonds: 20 },
    },
  },
  abyss_titan: {
    name: '심연의 거인',
    icon: '🌌',
    minPlayers: 15,
    maxPlayers: 30,
    minLevel: 40,
    phases: [
      { name:'1페이즈: 어둠 강림', hp: 200000, atk: 100, time: 240 },
      { name:'2페이즈: 그림자 군단', hp: 300000, atk: 150, time: 300, mechanic: 'minion_summon' },
      { name:'3페이즈: 차원 균열', hp: 400000, atk: 200, time: 360, mechanic: 'teleport' },
      { name:'4페이즈: 종말', hp: 500000, atk: 250, time: 420, mechanic: 'doom_timer' },
    ],
    rewards: {
      base: { gold: 20000, exp: 30000 },
      mvp: { gold: 60000, exp: 100000, diamonds: 400, drop: 'abyss_orb' },
      top10: { gold: 30000, exp: 50000, diamonds: 150 },
      participant: { gold: 10000, exp: 15000, diamonds: 40 },
    },
  },
  celestial_guardian: {
    name: '천공의 수호자',
    icon: '⚡',
    minPlayers: 20,
    maxPlayers: 30,
    minLevel: 50,
    phases: [
      { name:'1페이즈: 천둥 강림', hp: 300000, atk: 120, time: 240 },
      { name:'2페이즈: 빛의 심판', hp: 400000, atk: 180, time: 300, mechanic: 'judgement' },
      { name:'3페이즈: 천공 분노', hp: 600000, atk: 240, time: 360, mechanic: 'storm' },
      { name:'4페이즈: 신의 불꽃', hp: 800000, atk: 300, time: 420, mechanic: 'divine_flame' },
      { name:'최종: 운명의 일격', hp: 1000000, atk: 400, time: 300, mechanic: 'fate' },
    ],
    rewards: {
      base: { gold: 50000, exp: 80000 },
      mvp: { gold: 150000, exp: 200000, diamonds: 1000, drop: 'celestial_blade' },
      top10: { gold: 80000, exp: 120000, diamonds: 400 },
      participant: { gold: 25000, exp: 40000, diamonds: 100 },
    },
  },
};

const RAID_CONFIG = {
  registerWindowSec: 300, // 5분 모집
  weeklyEntryLimit: 3,    // 주간 입장 제한
  mvpDamageThreshold: 0.10, // MVP 자격 요건: 전체 데미지의 10%+
};

// 활성 레이드 세션 (메모리)
let activeRaids = {}; // { raidId: { type, phase, hp, players: { id: { damage } }, startedAt } }
let raidIdCounter = 1;

function createRaid(raidType) {
  const raidDef = RAIDS[raidType];
  if (!raidDef) return null;
  const raidId = `raid_${raidIdCounter++}`;
  activeRaids[raidId] = {
    id: raidId,
    type: raidType,
    name: raidDef.name,
    phase: 0,
    currentHp: raidDef.phases[0].hp,
    maxHp: raidDef.phases[0].hp,
    players: {},
    startedAt: Date.now(),
    phaseStartedAt: Date.now(),
    status: 'recruiting',
  };
  return activeRaids[raidId];
}

function joinRaid(player, raidId) {
  const raid = activeRaids[raidId];
  if (!raid) return { success: false, msg: '존재하지 않는 레이드' };
  if (raid.status !== 'recruiting') return { success: false, msg: '모집 종료' };
  const raidDef = RAIDS[raid.type];
  if (Object.keys(raid.players).length >= raidDef.maxPlayers) {
    return { success: false, msg: '레이드 정원 초과' };
  }
  if ((player.level || 1) < raidDef.minLevel) {
    return { success: false, msg: `레벨 ${raidDef.minLevel} 필요` };
  }
  // 주간 한도 체크
  const weekKey = (() => {
    const d = new Date();
    return d.getFullYear() + '-W' + Math.ceil(((d - new Date(d.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
  })();
  if (!player.raidWeekly) player.raidWeekly = {};
  if (player.raidWeekly.week !== weekKey) {
    player.raidWeekly = { week: weekKey, count: 0 };
  }
  if (player.raidWeekly.count >= RAID_CONFIG.weeklyEntryLimit) {
    return { success: false, msg: `주간 입장 한도 (${RAID_CONFIG.weeklyEntryLimit}회) 초과` };
  }
  raid.players[player.id] = { name: player.displayName, damage: 0, joinedAt: Date.now() };
  return { success: true, raid };
}

function startRaid(raidId) {
  const raid = activeRaids[raidId];
  if (!raid) return { success: false, msg: '존재하지 않는 레이드' };
  const raidDef = RAIDS[raid.type];
  if (Object.keys(raid.players).length < raidDef.minPlayers) {
    return { success: false, msg: `최소 ${raidDef.minPlayers}명 필요` };
  }
  raid.status = 'in_progress';
  // 주간 카운트 증가는 서버에서 처리
  return { success: true };
}

function dealDamage(raidId, playerId, damage) {
  const raid = activeRaids[raidId];
  if (!raid || raid.status !== 'in_progress') return null;
  const playerData = raid.players[playerId];
  if (!playerData) return null;

  raid.currentHp -= damage;
  playerData.damage += damage;

  if (raid.currentHp <= 0) {
    // 페이즈 클리어
    return advancePhase(raidId);
  }
  return { phase: raid.phase, currentHp: raid.currentHp };
}

function advancePhase(raidId) {
  const raid = activeRaids[raidId];
  if (!raid) return null;
  const raidDef = RAIDS[raid.type];
  raid.phase++;
  if (raid.phase >= raidDef.phases.length) {
    // 모든 페이즈 클리어 → 종료
    return finishRaid(raidId, true);
  }
  // 다음 페이즈
  raid.currentHp = raidDef.phases[raid.phase].hp;
  raid.maxHp = raidDef.phases[raid.phase].hp;
  raid.phaseStartedAt = Date.now();
  return { phaseAdvanced: true, newPhase: raid.phase, phaseName: raidDef.phases[raid.phase].name };
}

function finishRaid(raidId, victory) {
  const raid = activeRaids[raidId];
  if (!raid) return null;
  raid.status = victory ? 'victory' : 'defeat';
  const raidDef = RAIDS[raid.type];

  if (!victory) return { victory: false };

  // 데미지 순위 계산
  const playerList = Object.entries(raid.players)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.damage - a.damage);

  const totalDmg = playerList.reduce((s, p) => s + p.damage, 0);
  const rewards = {};
  for (let i = 0; i < playerList.length; i++) {
    const p = playerList[i];
    let tier;
    if (i === 0 && p.damage / totalDmg >= RAID_CONFIG.mvpDamageThreshold) {
      tier = 'mvp';
    } else if (i < 10) {
      tier = 'top10';
    } else {
      tier = 'participant';
    }
    rewards[p.id] = {
      tier,
      reward: { ...raidDef.rewards.base, ...(raidDef.rewards[tier] || {}) },
      damage: p.damage,
      rank: i + 1,
    };
  }

  // 세션 정리
  delete activeRaids[raidId];

  return {
    victory: true,
    raidName: raidDef.name,
    totalDamage: totalDmg,
    duration: Math.floor((Date.now() - raid.startedAt) / 1000),
    rewards,
  };
}

function getActiveRaids() {
  return Object.values(activeRaids).map(r => ({
    id: r.id,
    type: r.type,
    name: r.name,
    status: r.status,
    phase: r.phase,
    currentHp: r.currentHp,
    maxHp: r.maxHp,
    playerCount: Object.keys(r.players).length,
  }));
}

module.exports = {
  RAIDS,
  RAID_CONFIG,
  createRaid,
  joinRaid,
  startRaid,
  dealDamage,
  advancePhase,
  finishRaid,
  getActiveRaids,
  _activeRaids: activeRaids,
};

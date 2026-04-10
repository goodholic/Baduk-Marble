// 부직업(Profession) 시스템 — v1.52
// 캐릭터 레벨과 별도로 부직업을 키워서 전문 제작/수집
// 5개 직업 × 각자 레벨 1~50 + 일일 미션
// 부직업 레벨업 시 영구 패시브 보너스

const JOBS = {
  blacksmith: {
    name: '대장장이',
    icon: '🔨',
    desc: '무기/방어구 제작 전문 — 강화 성공률 +',
    perLevelBonus: { stat: 'enchantSuccess', value: 0.005 }, // 레벨당 강화성공률 +0.5%
    dailyMission: { type: 'craft_count', goal: 5, reward: { gold: 500, exp: 200 } },
    expPerAction: 25,
  },
  alchemist: {
    name: '연금술사',
    icon: '⚗️',
    desc: '엘릭서/물약 제작 전문 — 버프 지속시간 +',
    perLevelBonus: { stat: 'buffDuration', value: 0.01 }, // 레벨당 버프 지속 +1%
    dailyMission: { type: 'craft_count', goal: 3, reward: { gold: 700, exp: 250 } },
    expPerAction: 35,
  },
  herbalist: {
    name: '약초학자',
    icon: '🌿',
    desc: '약초 채집 + 농장 효율 — 농장 시간 -',
    perLevelBonus: { stat: 'farmSpeed', value: 0.005 }, // 레벨당 농장 시간 -0.5%
    dailyMission: { type: 'farm_harvest', goal: 5, reward: { gold: 400, exp: 200 } },
    expPerAction: 20,
  },
  miner: {
    name: '광부',
    icon: '⛏️',
    desc: '광물/보석 채집 — 골드 드롭 +',
    perLevelBonus: { stat: 'goldFromMonster', value: 0.005 }, // 레벨당 몬스터 골드 +0.5%
    dailyMission: { type: 'kill_monster', goal: 30, reward: { gold: 600, exp: 200 } },
    expPerAction: 15,
  },
  enchanter: {
    name: '인첸터',
    icon: '✨',
    desc: '룬/유물 강화 전문 — 룬 효과 +',
    perLevelBonus: { stat: 'runePower', value: 0.005 }, // 레벨당 룬 효과 +0.5%
    dailyMission: { type: 'rune_craft', goal: 2, reward: { gold: 800, exp: 300 } },
    expPerAction: 40,
  },
};

const JOB_CONFIG = {
  maxLevel: 50,
  expPerLevelBase: 100,
  expScaleFactor: 1.15,
  dailyMissionResetHour: 0, // 자정 리셋
};

function _ensure(player) {
  if (!player.jobs) player.jobs = {};
  for (const jobId of Object.keys(JOBS)) {
    if (!player.jobs[jobId]) player.jobs[jobId] = { level: 1, exp: 0, missionDate: null, missionProgress: 0, missionDone: false };
  }
  return player.jobs;
}

function getExpRequired(level) {
  return Math.floor(JOB_CONFIG.expPerLevelBase * Math.pow(JOB_CONFIG.expScaleFactor, level - 1));
}

function gainJobExp(player, jobId, amount = null) {
  const jobs = _ensure(player);
  if (!JOBS[jobId]) return { success: false, msg: '존재하지 않는 직업' };
  const job = jobs[jobId];
  const expGain = amount || JOBS[jobId].expPerAction;
  job.exp += expGain;
  let leveledUp = false;
  while (job.level < JOB_CONFIG.maxLevel && job.exp >= getExpRequired(job.level)) {
    job.exp -= getExpRequired(job.level);
    job.level++;
    leveledUp = true;
  }
  return { success: true, jobId, gained: expGain, currentLevel: job.level, leveledUp };
}

function trackJobMission(player, jobId, increment = 1) {
  const jobs = _ensure(player);
  if (!JOBS[jobId]) return null;
  const job = jobs[jobId];
  const today = new Date().toISOString().slice(0, 10);
  // 날짜 바뀌었으면 리셋
  if (job.missionDate !== today) {
    job.missionDate = today;
    job.missionProgress = 0;
    job.missionDone = false;
  }
  if (job.missionDone) return { alreadyDone: true };
  job.missionProgress += increment;
  const mission = JOBS[jobId].dailyMission;
  if (job.missionProgress >= mission.goal) {
    job.missionDone = true;
    return { completed: true, reward: mission.reward, jobId };
  }
  return { progress: job.missionProgress, goal: mission.goal };
}

function claimMissionReward(player, jobId) {
  const jobs = _ensure(player);
  const job = jobs[jobId];
  if (!job || !job.missionDone || job.missionRewardClaimed) {
    return { success: false, msg: '수령 가능한 보상 없음' };
  }
  const mission = JOBS[jobId].dailyMission;
  player.gold = Math.min(999999999, (player.gold || 0) + (mission.reward.gold || 0));
  player.exp = (player.exp || 0) + (mission.reward.exp || 0);
  job.missionRewardClaimed = true;
  // 부직업 EXP도 보너스로
  gainJobExp(player, jobId, mission.reward.exp || 0);
  return { success: true, reward: mission.reward };
}

function getJobBonus(player, stat) {
  const jobs = _ensure(player);
  let total = 0;
  for (const [jobId, jobDef] of Object.entries(JOBS)) {
    const playerJob = jobs[jobId];
    if (jobDef.perLevelBonus.stat === stat) {
      total += jobDef.perLevelBonus.value * (playerJob.level - 1);
    }
  }
  return total;
}

function getStatus(player) {
  const jobs = _ensure(player);
  const result = {};
  for (const [jobId, jobDef] of Object.entries(JOBS)) {
    const playerJob = jobs[jobId];
    result[jobId] = {
      ...jobDef,
      level: playerJob.level,
      exp: playerJob.exp,
      expRequired: getExpRequired(playerJob.level),
      missionProgress: playerJob.missionProgress,
      missionGoal: jobDef.dailyMission.goal,
      missionDone: playerJob.missionDone,
      currentBonus: jobDef.perLevelBonus.value * (playerJob.level - 1),
    };
  }
  return result;
}

module.exports = {
  JOBS,
  JOB_CONFIG,
  getExpRequired,
  gainJobExp,
  trackJobMission,
  claimMissionReward,
  getJobBonus,
  getStatus,
};

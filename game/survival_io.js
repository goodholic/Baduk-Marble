// 서바이벌 IO 모드 — v2.60
// 매판 리셋, 웨이브 생존, 레벨업 업그레이드 선택
// Vampire Survivors + .io 스타일

const SURVIVAL_CONFIG = {
  startHp: 100,
  startAtk: 10,
  startDef: 3,
  startSpeed: 8,
  expPerKill: 10,
  expScaling: 1.15, // 레벨당 필요 경험치 증가율
  waveInterval: 20, // 20초마다 웨이브
  maxWave: 30,
  monsterScaling: { hpMult: 1.12, atkMult: 1.10, countAdd: 1 },
  bossEveryWave: 5, // 5웨이브마다 보스
};

// 레벨업 시 선택 가능한 업그레이드
const UPGRADES = [
  // 공격
  { id: 'atk_1', name: 'ATK +5', icon: '⚔️', cat: 'atk', effect: { atk: 5 }, weight: 20 },
  { id: 'atk_2', name: 'ATK +12', icon: '⚔️', cat: 'atk', effect: { atk: 12 }, weight: 8, minLv: 5 },
  { id: 'crit_1', name: 'CRIT +5%', icon: '💥', cat: 'atk', effect: { critRate: 5 }, weight: 15 },
  { id: 'crit_2', name: 'CRIT +12%', icon: '💥', cat: 'atk', effect: { critRate: 12 }, weight: 5, minLv: 8 },
  { id: 'aspd_1', name: '공속 +15%', icon: '⚡', cat: 'atk', effect: { atkSpeed: 15 }, weight: 12 },
  { id: 'multi', name: '멀티샷', icon: '🔱', cat: 'atk', effect: { multishot: 1 }, weight: 4, minLv: 10 },
  { id: 'pierce', name: '관통', icon: '🏹', cat: 'atk', effect: { pierce: true }, weight: 5, minLv: 7 },

  // 방어/생존
  { id: 'hp_1', name: 'HP +30', icon: '❤️', cat: 'def', effect: { maxHp: 30 }, weight: 18 },
  { id: 'hp_2', name: 'HP +80', icon: '❤️', cat: 'def', effect: { maxHp: 80 }, weight: 6, minLv: 5 },
  { id: 'def_1', name: 'DEF +4', icon: '🛡️', cat: 'def', effect: { def: 4 }, weight: 15 },
  { id: 'regen', name: 'HP 재생 +2/초', icon: '💚', cat: 'def', effect: { hpRegen: 2 }, weight: 12 },
  { id: 'dodge', name: '회피 +8%', icon: '💨', cat: 'def', effect: { dodge: 8 }, weight: 10 },
  { id: 'shield', name: '보호막 50', icon: '🔮', cat: 'def', effect: { shield: 50 }, weight: 5, minLv: 6 },
  { id: 'lifesteal', name: '흡혈 +8%', icon: '🩸', cat: 'def', effect: { lifesteal: 8 }, weight: 7, minLv: 5 },

  // 특수
  { id: 'magnet', name: '자석 (경험치 흡수 범위↑)', icon: '🧲', cat: 'util', effect: { magnet: 30 }, weight: 10 },
  { id: 'gold_1', name: '골드 보너스 +20%', icon: '💰', cat: 'util', effect: { goldBonus: 20 }, weight: 8 },
  { id: 'bomb', name: '화면 폭탄 (즉시)', icon: '💣', cat: 'util', effect: { bomb: true }, weight: 6, minLv: 3 },
  { id: 'freeze', name: '전체 빙결 3초', icon: '❄️', cat: 'util', effect: { freezeAll: 3 }, weight: 4, minLv: 8 },

  // 궁극 (매우 희귀)
  { id: 'ult_fire', name: '화염 오라', icon: '🔥', cat: 'ult', effect: { fireAura: 5 }, weight: 2, minLv: 12 },
  { id: 'ult_thunder', name: '낙뢰', icon: '⚡', cat: 'ult', effect: { thunderStrike: 30 }, weight: 2, minLv: 15 },
  { id: 'ult_revive', name: '부활 1회', icon: '👼', cat: 'ult', effect: { revive: 1 }, weight: 1, minLv: 10 },
];

// ═══ 서바이벌 세션 ═══
const activeSessions = {};

function startSurvival(playerId, playerName, className) {
  if (activeSessions[playerId]) return { success: false, msg: '이미 진행 중' };

  activeSessions[playerId] = {
    playerId,
    playerName,
    className: className || 'Warrior',
    level: 1,
    exp: 0,
    expToNext: 30,
    wave: 0,
    kills: 0,
    gold: 0,
    time: 0,
    alive: true,

    // 스탯 (매판 리셋)
    hp: SURVIVAL_CONFIG.startHp,
    maxHp: SURVIVAL_CONFIG.startHp,
    atk: SURVIVAL_CONFIG.startAtk,
    def: SURVIVAL_CONFIG.startDef,
    speed: SURVIVAL_CONFIG.startSpeed,
    critRate: 5,
    dodge: 0,
    hpRegen: 0,
    lifesteal: 0,
    atkSpeed: 100,
    multishot: 0,
    pierce: false,
    shield: 0,
    fireAura: 0,
    thunderStrike: 0,
    revive: 0,
    magnet: 0,
    goldBonus: 0,

    upgrades: [],
    startTime: Date.now(),
    lastWaveTime: Date.now(),
    pendingLevelUp: false,
    monstersAlive: 0,
  };

  return { success: true, session: getSessionStatus(playerId) };
}

function tickSurvival(playerId) {
  const s = activeSessions[playerId];
  if (!s || !s.alive) return null;

  s.time = Math.floor((Date.now() - s.startTime) / 1000);

  // HP 재생
  if (s.hpRegen > 0) s.hp = Math.min(s.maxHp, s.hp + s.hpRegen);

  // 화염 오라 데미지 (주변 적 자동 처리)
  let auraKills = 0;
  if (s.fireAura > 0) {
    auraKills = Math.floor(Math.random() * 2); // 0~1 자동 킬
  }

  // 낙뢰
  let thunderKills = 0;
  if (s.thunderStrike > 0 && Math.random() < 0.15) {
    thunderKills = 1;
  }

  // 자동 킬 처리
  const autoKills = auraKills + thunderKills;
  for (let i = 0; i < autoKills; i++) processKill(s);

  // 웨이브 체크
  const timeSinceWave = (Date.now() - s.lastWaveTime) / 1000;
  let newWave = null;
  if (timeSinceWave >= SURVIVAL_CONFIG.waveInterval && s.wave < SURVIVAL_CONFIG.maxWave) {
    s.wave++;
    s.lastWaveTime = Date.now();
    const isBoss = s.wave % SURVIVAL_CONFIG.bossEveryWave === 0;
    const monsterCount = 3 + s.wave + (isBoss ? 0 : Math.floor(s.wave / 3));
    s.monstersAlive += monsterCount;

    newWave = {
      wave: s.wave,
      isBoss,
      monsterCount,
      bossName: isBoss ? getWaveBossName(s.wave) : null,
    };
  }

  return { session: getSessionStatus(playerId), newWave };
}

function processKill(s) {
  s.kills++;
  s.monstersAlive = Math.max(0, s.monstersAlive - 1);

  // EXP
  const expGain = SURVIVAL_CONFIG.expPerKill + Math.floor(s.wave * 2);
  s.exp += expGain;

  // 골드
  const goldGain = 5 + s.wave * 3;
  s.gold += Math.floor(goldGain * (1 + s.goldBonus / 100));

  // 레벨업 체크
  if (s.exp >= s.expToNext) {
    s.exp -= s.expToNext;
    s.level++;
    s.expToNext = Math.floor(s.expToNext * SURVIVAL_CONFIG.expScaling);
    s.pendingLevelUp = true;
    // 레벨업 시 HP 소량 회복
    s.hp = Math.min(s.maxHp, s.hp + Math.floor(s.maxHp * 0.1));
  }
}

function survivalAttack(playerId) {
  const s = activeSessions[playerId];
  if (!s || !s.alive || s.pendingLevelUp) return null;
  if (s.monstersAlive <= 0) return { msg: '적이 없습니다' };

  // 전투 계산
  const isBossWave = s.wave % SURVIVAL_CONFIG.bossEveryWave === 0;
  const enemyMult = isBossWave && s.monstersAlive <= 1 ? 3 : 1;
  const enemyAtk = Math.floor((5 + s.wave * 3) * enemyMult * Math.pow(SURVIVAL_CONFIG.monsterScaling.atkMult, s.wave));
  const enemyDef = Math.floor((2 + s.wave) * enemyMult);

  // 플레이어 공격
  const isCrit = Math.random() * 100 < s.critRate;
  const shots = 1 + s.multishot;
  let totalDmg = 0;
  for (let i = 0; i < shots; i++) {
    totalDmg += Math.max(1, Math.floor(s.atk * (isCrit ? 2 : 1) - enemyDef * 0.3));
  }

  // 적 처치 (간소화)
  processKill(s);

  // 흡혈
  if (s.lifesteal > 0) s.hp = Math.min(s.maxHp, s.hp + Math.floor(totalDmg * s.lifesteal / 100));

  // 적 반격
  const dodged = Math.random() * 100 < s.dodge;
  if (!dodged) {
    let dmgTaken = Math.max(1, enemyAtk - Math.floor(s.def * 0.4));
    if (s.shield > 0) { s.shield -= dmgTaken; if (s.shield < 0) { dmgTaken = -s.shield; s.shield = 0; } else dmgTaken = 0; }
    s.hp -= dmgTaken;
  }

  // 사망 체크
  if (s.hp <= 0) {
    if (s.revive > 0) {
      s.revive--;
      s.hp = Math.floor(s.maxHp * 0.5);
      return { killed: true, revived: true, damage: totalDmg, isCrit, session: getSessionStatus(playerId) };
    }
    return endSurvival(playerId, 'death');
  }

  return { killed: true, damage: totalDmg, isCrit, dodged, session: getSessionStatus(playerId) };
}

function getLevelUpChoices(playerId) {
  const s = activeSessions[playerId];
  if (!s || !s.pendingLevelUp) return null;

  const available = UPGRADES.filter(u => !u.minLv || s.level >= u.minLv);
  const totalWeight = available.reduce((sum, u) => sum + u.weight, 0);

  const choices = [];
  const used = new Set();
  while (choices.length < 3 && choices.length < available.length) {
    let roll = Math.random() * totalWeight;
    for (const u of available) {
      if (used.has(u.id)) continue;
      roll -= u.weight;
      if (roll <= 0) {
        choices.push(u);
        used.add(u.id);
        break;
      }
    }
    if (choices.length === 0) break; // 안전장치
  }

  return choices;
}

function selectUpgrade(playerId, upgradeId) {
  const s = activeSessions[playerId];
  if (!s || !s.pendingLevelUp) return { success: false };

  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return { success: false };

  // 효과 적용
  for (const [key, val] of Object.entries(upgrade.effect)) {
    if (key === 'bomb') {
      // 즉시 효과: 화면 클리어
      const bombKills = Math.min(s.monstersAlive, 5 + s.wave);
      for (let i = 0; i < bombKills; i++) processKill(s);
    } else if (key === 'freezeAll') {
      // 빙결은 일시적 — 시간 벌기
    } else if (key === 'maxHp') {
      s.maxHp += val; s.hp += val;
    } else if (key === 'pierce' || key === 'revive') {
      s[key] = (s[key] || 0) + (typeof val === 'boolean' ? 1 : val);
    } else if (s[key] !== undefined) {
      s[key] += val;
    }
  }

  s.upgrades.push({ id: upgrade.id, name: upgrade.name, icon: upgrade.icon });
  s.pendingLevelUp = false;

  return { success: true, upgrade, session: getSessionStatus(playerId) };
}

function endSurvival(playerId, cause) {
  const s = activeSessions[playerId];
  if (!s) return null;

  s.alive = false;
  const score = s.kills * 10 + s.wave * 100 + s.level * 50 + s.time;

  // 영구 계정 보상 (실제 플레이어에게)
  const rewards = {
    gold: Math.floor(s.gold * 0.5), // 골드 50% 가져감
    exp: s.kills * 5 + s.wave * 50,
    diamonds: Math.floor(s.wave / 5) * 5,
    score,
  };

  const result = {
    type: 'game_over',
    cause,
    score,
    wave: s.wave,
    level: s.level,
    kills: s.kills,
    time: s.time,
    upgrades: s.upgrades,
    rewards,
  };

  delete activeSessions[playerId];
  return { success: true, ...result };
}

function getSessionStatus(playerId) {
  const s = activeSessions[playerId];
  if (!s) return null;
  return {
    level: s.level, exp: s.exp, expToNext: s.expToNext,
    wave: s.wave, kills: s.kills, gold: s.gold, time: s.time,
    hp: s.hp, maxHp: s.maxHp, atk: s.atk, def: s.def,
    critRate: s.critRate, speed: s.speed, alive: s.alive,
    monstersAlive: s.monstersAlive,
    pendingLevelUp: s.pendingLevelUp,
    upgradeCount: s.upgrades.length,
    shield: s.shield, revive: s.revive,
  };
}

function getWaveBossName(wave) {
  const bosses = ['슬라임 킹', '골렘 로드', '드래곤 사제', '암흑 기사단장', '마왕의 그림자', '혼돈의 수호자'];
  return bosses[Math.floor(wave / 5) - 1] || '심연의 군주';
}

function registerSurvivalHandlers(socket, playerId, players, io) {
  socket.on('survival_start', () => {
    const p = players[playerId];
    if (!p) return;
    const result = startSurvival(playerId, p.displayName || p.className, p.className);
    socket.emit('survival_result', result);
    if (result.success) io.emit('server_msg', { msg: '🎮 ' + (p.displayName||p.className) + '님이 서바이벌 IO 시작!', type: 'normal' });
  });

  socket.on('survival_attack', () => {
    const result = survivalAttack(playerId);
    if (result) {
      socket.emit('survival_result', result);
      if (result.type === 'game_over') {
        // 영구 보상 지급
        const p = players[playerId];
        if (p && result.rewards) {
          p.gold = (p.gold || 0) + result.rewards.gold;
          if (p.exp !== undefined) p.exp += result.rewards.exp;
          p.diamonds = (p.diamonds || 0) + result.rewards.diamonds;
        }
        io.emit('server_msg', { msg: '💀 서바이벌 종료! ' + (p?.displayName||'') + ' — 웨이브 ' + result.wave + ', ' + result.kills + '킬, 점수 ' + result.score, type: 'normal' });
      }
    }
  });

  socket.on('survival_tick', () => {
    const result = tickSurvival(playerId);
    if (result) socket.emit('survival_tick', result);
  });

  socket.on('survival_levelup_choices', () => {
    const choices = getLevelUpChoices(playerId);
    socket.emit('survival_choices', { choices });
  });

  socket.on('survival_select_upgrade', (upgradeId) => {
    const result = selectUpgrade(playerId, upgradeId);
    socket.emit('survival_result', result);
  });

  socket.on('survival_status', () => {
    socket.emit('survival_status', getSessionStatus(playerId));
  });
}

module.exports = { registerSurvivalHandlers, SURVIVAL_CONFIG };

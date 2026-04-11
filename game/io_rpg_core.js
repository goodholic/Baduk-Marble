// IO-RPG 코어 — v2.60
// 메인 게임 루프: 10분 매치, 실시간 경쟁, 빠른 성장
// 접속 즉시 매치 시작, 클래스 선택 → 사냥 → 레벨업(업그레이드 3택) → PvP → 매치 종료

const MATCH_CONFIG = {
  duration: 600,           // 10분
  maxPlayers: 20,
  levelUpChoices: 3,
  expPerMonster: 15,
  expPerPlayer: 100,
  expScaling: 1.12,
  bossSpawnInterval: 120,  // 2분마다 보스 출현
  shrinkStart: 300,        // 5분 후 안전지대 축소 시작
  shrinkInterval: 30,
  pvpEnabled: true,
  leaderboardUpdateSec: 5,
};

// 클래스별 기본 스탯 + 고유 스킬
const IO_CLASSES = {
  warrior:  { name: '워리어', icon: '⚔️', hp: 150, atk: 14, def: 8, spd: 10, skill: { name: '전쟁 함성', cd: 20, desc: 'ATK +50% (8초)' } },
  assassin: { name: '어쌔신', icon: '🗡️', hp: 90,  atk: 18, def: 3, spd: 16, skill: { name: '은신', cd: 15, desc: '3초 투명 + 첫 공격 3배' } },
  knight:   { name: '나이트', icon: '🛡️', hp: 220, atk: 10, def: 14,spd: 8,  skill: { name: '방벽', cd: 25, desc: '5초 무적' } },
  mage:     { name: '메이지', icon: '🔮', hp: 80,  atk: 22, def: 2, spd: 9,  skill: { name: '메테오', cd: 30, desc: '광역 ATK×5' } },
  cleric:   { name: '클레릭', icon: '✨', hp: 120, atk: 11, def: 6, spd: 10, skill: { name: '치유', cd: 12, desc: 'HP 40% 회복' } },
};

// 레벨업 업그레이드 풀
const IO_UPGRADES = [
  { id: 'atk5',   name: 'ATK +5',      icon: '⚔️', effect: { atk: 5 },       w: 20 },
  { id: 'atk12',  name: 'ATK +12',     icon: '⚔️', effect: { atk: 12 },      w: 6, min: 5 },
  { id: 'hp30',   name: 'HP +30',      icon: '❤️', effect: { maxHp: 30 },    w: 18 },
  { id: 'hp80',   name: 'HP +80',      icon: '❤️', effect: { maxHp: 80 },    w: 5, min: 5 },
  { id: 'def4',   name: 'DEF +4',      icon: '🛡️', effect: { def: 4 },       w: 15 },
  { id: 'crit5',  name: 'CRIT +5%',    icon: '💥', effect: { critRate: 5 },  w: 14 },
  { id: 'crit12', name: 'CRIT +12%',   icon: '💥', effect: { critRate: 12 }, w: 4, min: 8 },
  { id: 'spd3',   name: 'SPD +3',      icon: '💨', effect: { spd: 3 },       w: 12 },
  { id: 'regen2', name: 'HP재생 +2/초', icon: '💚', effect: { hpRegen: 2 },  w: 10 },
  { id: 'steal5', name: '흡혈 +5%',    icon: '🩸', effect: { lifesteal: 5 }, w: 7, min: 3 },
  { id: 'dodge5', name: '회피 +5%',    icon: '🌀', effect: { dodge: 5 },     w: 10 },
  { id: 'multi',  name: '멀티샷',      icon: '🔱', effect: { multishot: 1 }, w: 3, min: 10 },
  { id: 'aoe',    name: '광역 공격',   icon: '💫', effect: { aoe: true },    w: 4, min: 7 },
  { id: 'thorns', name: '가시 반사 10',icon: '🌵', effect: { thorns: 10 },  w: 8 },
  { id: 'gold',   name: '골드 +30%',   icon: '💰', effect: { goldMult: 30 }, w: 8 },
];

// 몬스터 테이블 (맵에 자동 스폰)
const IO_MONSTERS = [
  { name: '슬라임',    tier: 'normal', hp: 40,  atk: 5,  exp: 10, gold: 5,  w: 40 },
  { name: '늑대',      tier: 'normal', hp: 60,  atk: 8,  exp: 15, gold: 8,  w: 30 },
  { name: '오크',      tier: 'elite',  hp: 120, atk: 14, exp: 30, gold: 15, w: 15 },
  { name: '다크나이트', tier: 'rare',   hp: 250, atk: 22, exp: 60, gold: 30, w: 8 },
  { name: '드래곤',    tier: 'boss',   hp: 800, atk: 40, exp: 200,gold: 100,w: 2 },
];

// 보스 (2분마다)
const IO_BOSSES = [
  { name: '슬라임 킹',    icon: '👑', hp: 2000, atk: 30, exp: 500, gold: 200 },
  { name: '골렘 로드',    icon: '🗿', hp: 3500, atk: 45, exp: 800, gold: 350 },
  { name: '드래곤 사제',   icon: '🐲', hp: 5000, atk: 60, exp: 1200,gold: 500 },
  { name: '심연의 군주',   icon: '👿', hp: 8000, atk: 80, exp: 2000,gold: 800 },
  { name: '최종 보스: 카오스',icon: '🌀', hp: 15000,atk: 100,exp: 5000,gold: 2000 },
];

// 장비 드롭
const IO_LOOT = [
  { name: '나무 검',     icon: '🗡️', grade: 'normal',   w: 30, atk: 3 },
  { name: '철 검',       icon: '⚔️', grade: 'uncommon', w: 20, atk: 6 },
  { name: '마법 검',     icon: '✨', grade: 'rare',     w: 10, atk: 12, critRate: 3 },
  { name: '전설의 검',   icon: '🌟', grade: 'epic',     w: 3,  atk: 20, critRate: 8 },
  { name: '엑스칼리버',  icon: '👑', grade: 'legendary', w: 1,  atk: 35, critRate: 15 },
  { name: '가죽 갑옷',   icon: '🦺', grade: 'normal',   w: 25, def: 3 },
  { name: '철판 갑옷',   icon: '🛡️', grade: 'uncommon', w: 15, def: 7, maxHp: 20 },
  { name: '마법 갑옷',   icon: '🔮', grade: 'rare',     w: 8,  def: 12, maxHp: 50 },
  { name: '용린 갑옷',   icon: '🐲', grade: 'epic',     w: 2,  def: 20, maxHp: 100 },
  { name: '생명의 반지', icon: '💍', grade: 'rare',     w: 6,  hpRegen: 3, maxHp: 30 },
  { name: '속도의 장화', icon: '👢', grade: 'uncommon', w: 12, spd: 3, dodge: 3 },
];

// ═══ 매치 관리 ═══
let currentMatch = null;
let matchInterval = null;
let _ioRef = null;
let _playersRef = null;

function initIoRpg(io, players) {
  _ioRef = io;
  _playersRef = players;
}

function getOrCreateMatch() {
  if (currentMatch && currentMatch.phase === 'active') return currentMatch;

  currentMatch = {
    id: 'match_' + Date.now(),
    phase: 'active',
    startTime: Date.now(),
    elapsed: 0,
    players: {},        // { playerId: matchPlayerData }
    monsters: [],       // 맵 위 몬스터
    lootOnGround: [],   // 맵 위 드롭 아이템
    currentBoss: null,
    bossCount: 0,
    safeZone: { x: 0, y: 0, radius: 500 },
    leaderboard: [],
  };

  // 초기 몬스터 스폰
  for (let i = 0; i < 30; i++) spawnIoMonster();

  // 매치 틱
  if (matchInterval) clearInterval(matchInterval);
  matchInterval = setInterval(() => tickMatch(), 1000);

  if (_ioRef) _ioRef.emit('server_msg', { msg: '🎮 새 매치 시작! 10분간 최고 점수를 노려라!', type: 'boss' });

  return currentMatch;
}

function joinMatch(playerId, playerName, classId) {
  const match = getOrCreateMatch();
  if (match.players[playerId]) return { success: true, msg: '이미 참가 중', session: getMatchPlayer(playerId) };

  const cls = IO_CLASSES[classId] || IO_CLASSES.warrior;

  match.players[playerId] = {
    id: playerId,
    name: playerName,
    classId: classId || 'warrior',
    className: cls.name,
    classIcon: cls.icon,
    level: 1, exp: 0, expToNext: 30,
    hp: cls.hp, maxHp: cls.hp,
    atk: cls.atk, def: cls.def, spd: cls.spd,
    critRate: 5, dodge: 0, hpRegen: 0, lifesteal: 0,
    multishot: 0, aoe: false, thorns: 0, goldMult: 0,
    kills: 0, playerKills: 0, deaths: 0,
    gold: 0, score: 0,
    equipment: [],
    upgrades: [],
    skill: { ...cls.skill, lastUsed: 0 },
    alive: true,
    x: Math.random() * 800 - 400,
    y: Math.random() * 800 - 400,
    pendingLevelUp: false,
    respawnAt: 0,
  };

  return { success: true, session: getMatchPlayer(playerId), classInfo: cls };
}

function tickMatch() {
  if (!currentMatch || currentMatch.phase !== 'active') return;

  currentMatch.elapsed = Math.floor((Date.now() - currentMatch.startTime) / 1000);

  // 시간 초과 → 매치 종료
  if (currentMatch.elapsed >= MATCH_CONFIG.duration) {
    endMatch();
    return;
  }

  // HP 재생
  for (const p of Object.values(currentMatch.players)) {
    if (p.alive && p.hpRegen > 0) p.hp = Math.min(p.maxHp, p.hp + p.hpRegen);
  }

  // 몬스터 리스폰 (30마리 유지)
  while (currentMatch.monsters.length < 30) spawnIoMonster();

  // 보스 스폰 (2분마다)
  if (currentMatch.elapsed > 0 && currentMatch.elapsed % MATCH_CONFIG.bossSpawnInterval === 0 && !currentMatch.currentBoss) {
    spawnIoBoss();
  }

  // 안전지대 축소 (5분 후)
  if (currentMatch.elapsed >= MATCH_CONFIG.shrinkStart) {
    const shrinks = Math.floor((currentMatch.elapsed - MATCH_CONFIG.shrinkStart) / MATCH_CONFIG.shrinkInterval);
    currentMatch.safeZone.radius = Math.max(100, 500 - shrinks * 30);

    // 안전지대 밖 데미지
    for (const p of Object.values(currentMatch.players)) {
      if (!p.alive) continue;
      const dist = Math.sqrt(p.x * p.x + p.y * p.y);
      if (dist > currentMatch.safeZone.radius) {
        p.hp -= 5;
        if (p.hp <= 0) killMatchPlayer(p.id, null, 'zone');
      }
    }
  }

  // 죽은 플레이어 부활 (5초 후)
  const now = Date.now();
  for (const p of Object.values(currentMatch.players)) {
    if (!p.alive && p.respawnAt > 0 && now >= p.respawnAt) {
      p.alive = true;
      p.hp = Math.floor(p.maxHp * 0.5);
      p.x = Math.random() * 400 - 200;
      p.y = Math.random() * 400 - 200;
      p.respawnAt = 0;
    }
  }

  // 리더보드 (5초마다)
  if (currentMatch.elapsed % MATCH_CONFIG.leaderboardUpdateSec === 0) {
    updateLeaderboard();
    if (_ioRef) _ioRef.emit('io_leaderboard', { leaderboard: currentMatch.leaderboard, remaining: MATCH_CONFIG.duration - currentMatch.elapsed, safeZone: currentMatch.safeZone });
  }

  // 자동 전투 (가장 가까운 몬스터 공격)
  for (const p of Object.values(currentMatch.players)) {
    if (!p.alive || p.pendingLevelUp) continue;
    autoAttackMonster(p);
  }
}

function autoAttackMonster(player) {
  if (currentMatch.monsters.length === 0) return;

  // 가장 가까운 몬스터 찾기
  let nearest = null, nearDist = Infinity;
  for (let i = 0; i < currentMatch.monsters.length; i++) {
    const m = currentMatch.monsters[i];
    const dx = m.x - player.x, dy = m.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearDist) { nearDist = dist; nearest = i; }
  }

  if (nearest === null || nearDist > 80) {
    // 가까운 몬스터 없으면 이동
    if (currentMatch.monsters.length > 0) {
      const m = currentMatch.monsters[nearest || 0];
      const dx = m.x - player.x, dy = m.y - player.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 1) { player.x += (dx / mag) * player.spd * 0.3; player.y += (dy / mag) * player.spd * 0.3; }
    }
    return;
  }

  const monster = currentMatch.monsters[nearest];

  // 공격
  const isCrit = Math.random() * 100 < player.critRate;
  const dmg = Math.max(1, Math.floor(player.atk * (isCrit ? 2 : 1) - monster.atk * 0.1));
  monster.hp -= dmg;

  // 몬스터 반격
  const dodged = Math.random() * 100 < player.dodge;
  if (!dodged) {
    let mDmg = Math.max(1, monster.atk - Math.floor(player.def * 0.3));
    if (player.thorns > 0) monster.hp -= player.thorns;
    player.hp -= mDmg;
    if (player.lifesteal > 0) player.hp = Math.min(player.maxHp, player.hp + Math.floor(dmg * player.lifesteal / 100));
  }

  // 몬스터 사망
  if (monster.hp <= 0) {
    player.kills++;
    player.exp += monster.exp;
    player.gold += Math.floor(monster.gold * (1 + player.goldMult / 100));
    player.score += monster.exp;

    // 장비 드롭 (15%)
    if (Math.random() < 0.15) {
      const loot = rollLoot();
      if (loot) {
        currentMatch.lootOnGround.push({ ...loot, x: monster.x, y: monster.y, spawnTime: Date.now() });
      }
    }

    currentMatch.monsters.splice(nearest, 1);
    checkLevelUp(player);
  }

  // 플레이어 사망
  if (player.hp <= 0) {
    killMatchPlayer(player.id, null, 'monster');
  }
}

function checkLevelUp(player) {
  while (player.exp >= player.expToNext) {
    player.exp -= player.expToNext;
    player.level++;
    player.expToNext = Math.floor(player.expToNext * MATCH_CONFIG.expScaling);
    player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.15));
    player.pendingLevelUp = true;
  }
}

function selectIoUpgrade(playerId, upgradeId) {
  if (!currentMatch) return { success: false };
  const player = currentMatch.players[playerId];
  if (!player || !player.pendingLevelUp) return { success: false };

  const upg = IO_UPGRADES.find(u => u.id === upgradeId);
  if (!upg) return { success: false };

  for (const [k, v] of Object.entries(upg.effect)) {
    if (k === 'maxHp') { player.maxHp += v; player.hp += v; }
    else if (k === 'aoe') player.aoe = true;
    else if (player[k] !== undefined) player[k] += v;
  }
  player.upgrades.push({ id: upg.id, name: upg.name, icon: upg.icon });
  player.pendingLevelUp = false;

  return { success: true, upgrade: upg };
}

function getIoUpgradeChoices(player) {
  const available = IO_UPGRADES.filter(u => !u.min || player.level >= u.min);
  const choices = [];
  const used = new Set();
  const totalW = available.reduce((s, u) => s + u.w, 0);
  while (choices.length < MATCH_CONFIG.levelUpChoices && choices.length < available.length) {
    let roll = Math.random() * totalW;
    for (const u of available) {
      if (used.has(u.id)) continue;
      roll -= u.w;
      if (roll <= 0) { choices.push(u); used.add(u.id); break; }
    }
  }
  return choices;
}

// PvP
function pvpAttack(attackerId, targetId) {
  if (!currentMatch) return null;
  const attacker = currentMatch.players[attackerId];
  const target = currentMatch.players[targetId];
  if (!attacker || !target || !attacker.alive || !target.alive) return null;

  const dx = target.x - attacker.x, dy = target.y - attacker.y;
  if (Math.sqrt(dx * dx + dy * dy) > 60) return { success: false, msg: '너무 멀어요' };

  const isCrit = Math.random() * 100 < attacker.critRate;
  const dmg = Math.max(1, Math.floor(attacker.atk * (isCrit ? 2 : 1) - target.def * 0.3));
  target.hp -= dmg;

  if (target.hp <= 0) {
    killMatchPlayer(targetId, attackerId, 'pvp');
    return { killed: true, damage: dmg, isCrit, victimName: target.name };
  }

  return { killed: false, damage: dmg, isCrit, targetHp: target.hp, targetMaxHp: target.maxHp };
}

function killMatchPlayer(victimId, killerId, cause) {
  const victim = currentMatch.players[victimId];
  if (!victim) return;
  victim.alive = false;
  victim.deaths++;
  victim.respawnAt = Date.now() + 5000; // 5초 후 부활

  // 장비 드롭 (바닥에)
  for (const eq of victim.equipment) {
    currentMatch.lootOnGround.push({ ...eq, x: victim.x, y: victim.y, spawnTime: Date.now() });
  }
  victim.equipment = [];

  if (killerId) {
    const killer = currentMatch.players[killerId];
    if (killer) {
      killer.playerKills++;
      killer.score += 200;
      killer.exp += MATCH_CONFIG.expPerPlayer;
      checkLevelUp(killer);
    }
  }
}

// 루트 픽업
function pickupLoot(playerId) {
  if (!currentMatch) return null;
  const player = currentMatch.players[playerId];
  if (!player || !player.alive) return null;

  for (let i = currentMatch.lootOnGround.length - 1; i >= 0; i--) {
    const loot = currentMatch.lootOnGround[i];
    const dx = loot.x - player.x, dy = loot.y - player.y;
    if (Math.sqrt(dx * dx + dy * dy) < 30) {
      currentMatch.lootOnGround.splice(i, 1);
      player.equipment.push(loot);
      if (loot.atk) player.atk += loot.atk;
      if (loot.def) player.def += loot.def;
      if (loot.maxHp) { player.maxHp += loot.maxHp; player.hp += loot.maxHp; }
      if (loot.critRate) player.critRate += loot.critRate;
      if (loot.spd) player.spd += loot.spd;
      if (loot.dodge) player.dodge += loot.dodge;
      if (loot.hpRegen) player.hpRegen += loot.hpRegen;
      return { picked: true, item: loot };
    }
  }
  return null;
}

// 스킬 사용
function useIoSkill(playerId) {
  if (!currentMatch) return null;
  const player = currentMatch.players[playerId];
  if (!player || !player.alive) return null;
  const now = Date.now();
  if (now - player.skill.lastUsed < player.skill.cd * 1000) return { success: false, msg: '쿨다운 중' };
  player.skill.lastUsed = now;

  let result = { success: true, skill: player.skill.name };

  // 클래스별 스킬 효과
  switch (player.classId) {
    case 'warrior': player.atk = Math.floor(player.atk * 1.5); setTimeout(() => { if (currentMatch?.players[playerId]) currentMatch.players[playerId].atk = Math.floor(currentMatch.players[playerId].atk / 1.5); }, 8000); result.buff = 'ATK +50%'; break;
    case 'assassin': player.dodge = 100; setTimeout(() => { if (currentMatch?.players[playerId]) currentMatch.players[playerId].dodge = Math.max(0, currentMatch.players[playerId].dodge - 100); }, 3000); result.buff = '은신!'; break;
    case 'knight': player.hp = player.maxHp; result.buff = '무적 + 풀회복'; break;
    case 'mage': { let kills = 0; for (let i = currentMatch.monsters.length - 1; i >= 0; i--) { const m = currentMatch.monsters[i]; const d = Math.sqrt((m.x-player.x)**2+(m.y-player.y)**2); if (d < 120) { player.exp += m.exp; player.gold += m.gold; player.kills++; player.score += m.exp; currentMatch.monsters.splice(i, 1); kills++; } } checkLevelUp(player); result.kills = kills; break; }
    case 'cleric': player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.4)); result.heal = Math.floor(player.maxHp * 0.4); break;
  }

  return result;
}

function spawnIoMonster() {
  const totalW = IO_MONSTERS.reduce((s, m) => s + m.w, 0);
  let roll = Math.random() * totalW;
  let template = IO_MONSTERS[0];
  for (const m of IO_MONSTERS) { roll -= m.w; if (roll <= 0) { template = m; break; } }

  currentMatch.monsters.push({
    ...template,
    hp: template.hp + (currentMatch.elapsed || 0) * 0.5, // 시간 경과에 따라 강해짐
    x: Math.random() * 900 - 450,
    y: Math.random() * 900 - 450,
  });
}

function spawnIoBoss() {
  const bossIdx = Math.min(currentMatch.bossCount, IO_BOSSES.length - 1);
  const boss = IO_BOSSES[bossIdx];
  currentMatch.currentBoss = { ...boss, x: 0, y: 0 };
  currentMatch.bossCount++;

  if (_ioRef) _ioRef.emit('io_boss_spawn', { name: boss.name, icon: boss.icon, hp: boss.hp });
}

function rollLoot() {
  const totalW = IO_LOOT.reduce((s, l) => s + l.w, 0);
  let roll = Math.random() * totalW;
  for (const loot of IO_LOOT) { roll -= loot.w; if (roll <= 0) return { ...loot }; }
  return IO_LOOT[0];
}

function updateLeaderboard() {
  currentMatch.leaderboard = Object.values(currentMatch.players)
    .map(p => ({ name: p.name, classIcon: p.classIcon, level: p.level, kills: p.kills, playerKills: p.playerKills, score: p.score, alive: p.alive }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function endMatch() {
  if (!currentMatch) return;
  currentMatch.phase = 'ended';
  if (matchInterval) { clearInterval(matchInterval); matchInterval = null; }

  updateLeaderboard();

  // 보상 지급 (실제 플레이어에게)
  const rankings = currentMatch.leaderboard;
  const rewardTiers = [
    { gold: 10000, diamonds: 100 },
    { gold: 7000, diamonds: 70 },
    { gold: 5000, diamonds: 50 },
    { gold: 3000, diamonds: 30 },
    { gold: 2000, diamonds: 20 },
  ];

  rankings.forEach((r, i) => {
    const reward = rewardTiers[Math.min(i, rewardTiers.length - 1)] || { gold: 1000, diamonds: 10 };
    for (const [pid, p] of Object.entries(currentMatch.players)) {
      if (p.name === r.name && _playersRef && _playersRef[pid]) {
        _playersRef[pid].gold = (_playersRef[pid].gold || 0) + reward.gold;
        _playersRef[pid].diamonds = (_playersRef[pid].diamonds || 0) + reward.diamonds;
      }
    }
  });

  if (_ioRef) {
    _ioRef.emit('io_match_end', { rankings, matchId: currentMatch.id });
    _ioRef.emit('server_msg', { msg: '🏆 매치 종료! 1위: ' + (rankings[0]?.name || '없음') + ' (' + (rankings[0]?.score || 0) + '점)', type: 'boss' });
  }

  // 3초 후 새 매치
  setTimeout(() => { currentMatch = null; getOrCreateMatch(); }, 3000);
}

function getMatchPlayer(playerId) {
  if (!currentMatch) return null;
  const p = currentMatch.players[playerId];
  if (!p) return null;
  return {
    ...p,
    matchElapsed: currentMatch.elapsed,
    matchRemaining: MATCH_CONFIG.duration - currentMatch.elapsed,
    safeZone: currentMatch.safeZone,
    monstersNearby: currentMatch.monsters.filter(m => Math.sqrt((m.x-p.x)**2+(m.y-p.y)**2) < 100).length,
    lootNearby: currentMatch.lootOnGround.filter(l => Math.sqrt((l.x-p.x)**2+(l.y-p.y)**2) < 40).length,
    boss: currentMatch.currentBoss,
  };
}

// 소켓 핸들러
function registerIoRpgHandlers(socket, playerId, players, io) {
  socket.on('io_join', (classId) => {
    const p = players[playerId];
    if (!p) return;
    const result = joinMatch(playerId, p.displayName || p.className, classId);
    socket.emit('io_joined', result);
  });

  socket.on('io_upgrade', (upgradeId) => {
    const result = selectIoUpgrade(playerId, upgradeId);
    socket.emit('io_upgrade_result', result);
  });

  socket.on('io_skill', () => {
    const result = useIoSkill(playerId);
    if (result) socket.emit('io_skill_result', result);
  });

  socket.on('io_pvp', (targetId) => {
    const result = pvpAttack(playerId, targetId);
    if (result) socket.emit('io_pvp_result', result);
  });

  socket.on('io_pickup', () => {
    const result = pickupLoot(playerId);
    if (result) socket.emit('io_pickup_result', result);
  });

  socket.on('io_status', () => {
    socket.emit('io_status', getMatchPlayer(playerId));
  });

  socket.on('io_levelup_choices', () => {
    const p = currentMatch?.players[playerId];
    if (!p) return;
    socket.emit('io_choices', { choices: getIoUpgradeChoices(p) });
  });
}

module.exports = { initIoRpg, registerIoRpgHandlers, getOrCreateMatch, MATCH_CONFIG, IO_CLASSES };

// 로그라이크 던전 — v2.59
// 매번 랜덤 생성, 층마다 선택지, 영구 사망, 누적 강화

const ROGUE_CONFIG = {
  entryFee: 1000,
  maxFloors: 15,
  startHp: 300,
  startAtk: 20,
  startDef: 8,
};

const ROGUE_ROOMS = [
  { type: 'combat', name: '전투 방', icon: '⚔️', weight: 40 },
  { type: 'elite', name: '엘리트 전투', icon: '💀', weight: 15 },
  { type: 'shop', name: '상점', icon: '🛒', weight: 10 },
  { type: 'rest', name: '휴식', icon: '🏕️', weight: 10 },
  { type: 'treasure', name: '보물', icon: '💎', weight: 8 },
  { type: 'event', name: '이벤트', icon: '❓', weight: 12 },
  { type: 'boss', name: '보스', icon: '👹', weight: 5 },
];

const ROGUE_UPGRADES = [
  { id: 'atk_up', name: 'ATK +8', icon: '⚔️', effect: { atk: 8 } },
  { id: 'def_up', name: 'DEF +6', icon: '🛡️', effect: { def: 6 } },
  { id: 'hp_up', name: 'HP +50', icon: '❤️', effect: { maxHp: 50 } },
  { id: 'crit_up', name: 'CRIT +5%', icon: '💥', effect: { critRate: 5 } },
  { id: 'heal', name: 'HP 30% 회복', icon: '💚', effect: { healPct: 30 } },
  { id: 'lifesteal', name: '흡혈 +5%', icon: '🩸', effect: { lifesteal: 5 } },
  { id: 'thorns', name: '가시 +10', icon: '🌵', effect: { thorns: 10 } },
  { id: 'gold_bonus', name: '골드 +20%', icon: '💰', effect: { goldBonus: 20 } },
];

const ROGUE_EVENTS = [
  { name: '신비한 샘', desc: 'HP를 전부 회복하지만 ATK -3', accept: { healFull: true, atk: -3 }, decline: null },
  { name: '악마의 계약', desc: 'ATK +15 대신 HP 최대치 -30%', accept: { atk: 15, maxHpPct: -30 }, decline: null },
  { name: '도박꾼', desc: '50% 확률로 골드 2배 또는 전부 잃음', accept: { gamble: true }, decline: null },
  { name: '저주받은 무기', desc: 'ATK +20, 매 전투 HP -10', accept: { atk: 20, curseDot: 10 }, decline: null },
  { name: '수수께끼 상자', desc: '열면 랜덤 보상 or 함정', accept: { mystery: true }, decline: null },
];

function startRogueRun(player) {
  if (player._rogueRun) return { success: false, msg: '이미 진행 중' };
  if ((player.gold || 0) < ROGUE_CONFIG.entryFee) return { success: false, msg: '골드 부족 (필요: ' + ROGUE_CONFIG.entryFee + 'G)' };

  player.gold -= ROGUE_CONFIG.entryFee;
  player._rogueRun = {
    floor: 0,
    hp: ROGUE_CONFIG.startHp,
    maxHp: ROGUE_CONFIG.startHp,
    atk: ROGUE_CONFIG.startAtk + Math.floor((player.atk || 25) * 0.3),
    def: ROGUE_CONFIG.startDef + Math.floor((player.def || 10) * 0.2),
    critRate: 10,
    gold: 0,
    kills: 0,
    upgrades: [],
    curseDot: 0,
  };

  return { success: true, msg: '로그라이크 던전 진입!', run: getRogueStatus(player) };
}

function generateRogueRoom(run) {
  // 5층/10층/15층은 보스 강제
  if (run.floor === 5 || run.floor === 10 || run.floor === 15) {
    return { type: 'boss', name: '보스 방', icon: '👹' };
  }
  const totalWeight = ROGUE_ROOMS.filter(r => r.type !== 'boss').reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const room of ROGUE_ROOMS) {
    if (room.type === 'boss') continue;
    roll -= room.weight;
    if (roll <= 0) return { ...room };
  }
  return ROGUE_ROOMS[0];
}

function advanceRogueFloor(player) {
  if (!player._rogueRun) return { success: false, msg: '진행 중이 아닙니다' };
  const run = player._rogueRun;

  run.floor++;
  if (run.floor > ROGUE_CONFIG.maxFloors) return completeRogueRun(player);

  // 저주 DoT
  if (run.curseDot > 0) {
    run.hp -= run.curseDot;
    if (run.hp <= 0) return failRogueRun(player, '저주로 사망');
  }

  const room = generateRogueRoom(run);

  // 3개 선택지 생성 (전투 방은 보상 선택)
  let choices = null;
  if (room.type === 'combat' || room.type === 'elite' || room.type === 'boss') {
    // 전투 후 업그레이드 3개 중 1택
    const shuffled = [...ROGUE_UPGRADES].sort(() => Math.random() - 0.5);
    choices = shuffled.slice(0, 3);
  } else if (room.type === 'event') {
    const evt = ROGUE_EVENTS[Math.floor(Math.random() * ROGUE_EVENTS.length)];
    room.event = evt;
  }

  // 전투 자동 처리
  let combatResult = null;
  if (room.type === 'combat' || room.type === 'elite' || room.type === 'boss') {
    const enemyMult = room.type === 'boss' ? 3 : room.type === 'elite' ? 1.8 : 1;
    const enemyHp = Math.floor((50 + run.floor * 30) * enemyMult);
    const enemyAtk = Math.floor((8 + run.floor * 4) * enemyMult);
    const enemyDef = Math.floor((3 + run.floor * 2) * enemyMult);
    const enemyName = room.type === 'boss' ? run.floor + '층 보스' : room.type === 'elite' ? '엘리트 ' + run.floor : '몬스터 ' + run.floor;

    // 간단 전투 시뮬레이션
    let eHp = enemyHp;
    let rounds = 0;
    while (eHp > 0 && run.hp > 0 && rounds < 30) {
      const isCrit = Math.random() * 100 < run.critRate;
      const dmg = Math.max(1, Math.floor((run.atk * (isCrit ? 2 : 1)) - enemyDef * 0.3));
      eHp -= dmg;
      if (eHp <= 0) break;
      const eDmg = Math.max(1, enemyAtk - Math.floor(run.def * 0.4));
      run.hp -= eDmg;
      if (run.lifesteal) run.hp = Math.min(run.maxHp, run.hp + Math.floor(dmg * run.lifesteal / 100));
      rounds++;
    }

    if (run.hp <= 0) return failRogueRun(player, enemyName + '에게 패배');

    const goldEarned = Math.floor((20 + run.floor * 15) * enemyMult);
    run.gold += goldEarned;
    run.kills++;

    combatResult = { enemy: enemyName, goldEarned, rounds, hpLeft: run.hp };
  }

  return {
    success: true,
    floor: run.floor,
    room,
    choices,
    combatResult,
    run: getRogueStatus(player),
  };
}

function selectRogueUpgrade(player, upgradeId) {
  if (!player._rogueRun) return { success: false };
  const run = player._rogueRun;
  const upgrade = ROGUE_UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return { success: false };

  for (const [key, val] of Object.entries(upgrade.effect)) {
    if (key === 'healPct') run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * val / 100));
    else if (key === 'maxHp') { run.maxHp += val; run.hp += val; }
    else if (key === 'maxHpPct') { const loss = Math.floor(run.maxHp * Math.abs(val) / 100); run.maxHp -= loss; run.hp = Math.min(run.hp, run.maxHp); }
    else if (key === 'healFull') run.hp = run.maxHp;
    else if (run[key] !== undefined) run[key] += val;
  }
  run.upgrades.push(upgrade.name);

  return { success: true, upgrade: upgrade.name, run: getRogueStatus(player) };
}

function handleRogueEvent(player, accept) {
  if (!player._rogueRun) return { success: false };
  const run = player._rogueRun;
  if (!accept) return { success: true, msg: '이벤트를 무시했습니다.', run: getRogueStatus(player) };

  // 간단히 ATK/HP 조정
  const results = [];
  // 도박
  if (Math.random() < 0.5) {
    run.gold *= 2;
    results.push('성공! 골드 2배!');
  } else {
    run.atk += 10;
    results.push('ATK +10 획득!');
  }

  return { success: true, msg: results.join(' '), run: getRogueStatus(player) };
}

function completeRogueRun(player) {
  const run = player._rogueRun;
  const totalGold = run.gold;
  const bonusDiamonds = Math.floor(run.floor * 5);
  player.gold = (player.gold || 0) + totalGold;
  player.diamonds = (player.diamonds || 0) + bonusDiamonds;
  const result = { type: 'complete', floors: run.floor, gold: totalGold, diamonds: bonusDiamonds, kills: run.kills, upgrades: run.upgrades };
  delete player._rogueRun;
  return { success: true, ...result };
}

function failRogueRun(player, cause) {
  const run = player._rogueRun;
  const keptGold = Math.floor(run.gold * 0.3);
  player.gold = (player.gold || 0) + keptGold;
  const result = { type: 'fail', cause, floors: run.floor, goldKept: keptGold, kills: run.kills };
  delete player._rogueRun;
  return { success: true, ...result };
}

function getRogueStatus(player) {
  if (!player._rogueRun) return null;
  const r = player._rogueRun;
  return { floor: r.floor, hp: r.hp, maxHp: r.maxHp, atk: r.atk, def: r.def, critRate: r.critRate, gold: r.gold, kills: r.kills, upgrades: r.upgrades.length };
}

function registerRogueHandlers(socket, playerId, players, io) {
  socket.on('rogue_start', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('rogue_result', startRogueRun(p));
  });
  socket.on('rogue_advance', () => {
    const p = players[playerId];
    if (!p) return;
    const result = advanceRogueFloor(p);
    socket.emit('rogue_result', result);
    if (result.type === 'complete') io.emit('server_msg', { msg: '🏆 ' + (p.displayName||p.className) + '님이 로그라이크 ' + result.floors + '층 클리어!', type: 'boss' });
  });
  socket.on('rogue_upgrade', (id) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('rogue_result', selectRogueUpgrade(p, id));
  });
  socket.on('rogue_event', (accept) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('rogue_result', handleRogueEvent(p, accept));
  });
  socket.on('rogue_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('rogue_status', getRogueStatus(p));
  });
}

module.exports = { registerRogueHandlers };

// 차원 정복 시스템 — v3.0
// 5차원 + 최종 태초의 차원, 주 1회, 서버 TOP10 협동

const DIMENSIONS = [
  { id: 'fire',    name: '🌋 불의 차원',   env: '전역 화상 1/초', bossName: '이프리트',    bossHp: 100000, bossAtk: 200, weakness: 'ice',   reqFloor: 50,  reward: { dimStone: 10, gold: 30000 } },
  { id: 'ice',     name: '❄️ 얼음 차원',   env: '전체 감속 -30%',  bossName: '프로스트 퀸', bossHp: 150000, bossAtk: 250, weakness: 'fire',  reqFloor: 70,  reward: { dimStone: 15, gold: 50000 } },
  { id: 'dark',    name: '��� 어둠 차원',   env: '시야 0',         bossName: '심연의 눈',   bossHp: 200000, bossAtk: 300, weakness: 'light', reqFloor: 90,  reward: { dimStone: 20, gold: 70000 } },
  { id: 'chaos',   name: '🌀 혼돈 차원',   env: '스탯 랜덤 변동',  bossName: '혼돈의 심장', bossHp: 300000, bossAtk: 400, weakness: 'order', reqFloor: 100, reward: { dimStone: 30, gold: 100000, diamonds: 50 } },
  { id: 'time',    name: '⏳ 시간 차원',   env: '3분 제한',       bossName: '크로노스',    bossHp: 500000, bossAtk: 500, weakness: 'chaos', reqFloor: 100, reward: { dimStone: 50, gold: 150000, diamonds: 100 } },
  { id: 'origin',  name: '🌌 태초의 차원', env: '전 효과 랜덤',   bossName: '태초의 그림자',bossHp:1000000,bossAtk: 800, weakness: 'all',   reqFloor: 100, reward: { dimStone: 100, gold: 500000, diamonds: 300, mythicExchange: true } },
];

function getDimState(player) {
  if (!player._dimension) player._dimension = { cleared: [], weekReset: 0, bestTime: {} };
  // 주간 리셋
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - (now.getDay() || 7) + 1); monday.setHours(0,0,0,0);
  if (player._dimension.weekReset < monday.getTime()) {
    player._dimension.cleared = [];
    player._dimension.weekReset = monday.getTime();
  }
  return player._dimension;
}

function challengeDimension(player, dimId) {
  const dim = DIMENSIONS.find(d => d.id === dimId);
  if (!dim) return { success: false, msg: '차원 없음' };

  const state = getDimState(player);
  if (state.cleared.includes(dimId)) return { success: false, msg: '이번 주 이미 클리어 (주 1회)' };

  // 심연 탑 층수 체크
  if ((player._abyssHighest || 0) < dim.reqFloor) {
    return { success: false, msg: `심연의 탑 ${dim.reqFloor}층 필요 (현재 ${player._abyssHighest || 0}층)` };
  }

  // 전투 시뮬
  let mercSystem;
  try { mercSystem = require('./mercenary_system'); } catch(e) {}
  const mercs = mercSystem ? mercSystem.getPlayerMercs(player) : { roster: [], party: [] };
  const party = mercs.roster.filter(m => mercs.party.includes(m.uid));

  if (party.length === 0) return { success: false, msg: '용병 파티 필요' };

  const totalAtk = party.reduce((s, m) => s + m.atk, 0);
  const totalHp = party.reduce((s, m) => s + m.hp, 0);
  const totalDef = party.reduce((s, m) => s + m.def, 0);

  // DPS 체크 (3분 = 180초, 매초 공격)
  const dps = Math.floor(totalAtk * (100 / (100 + 50)) * 1.0);
  const totalDmg = dps * 180;
  const bossCanKill = totalDmg >= dim.bossHp;

  // 생존 체크
  const bossIncomingDps = Math.floor(dim.bossAtk * (100 / (100 + totalDef)));
  const survivalTime = Math.floor(totalHp / Math.max(1, bossIncomingDps));
  const canSurvive = survivalTime >= 60; // 최소 60초 생존

  const startTime = Date.now();
  const victory = bossCanKill && canSurvive;
  const clearTime = victory ? Math.floor(dim.bossHp / Math.max(1, dps)) : 0;

  if (victory) {
    state.cleared.push(dimId);
    player._dimClears = (player._dimClears || 0) + 1;

    // 최고 기록
    if (!state.bestTime[dimId] || clearTime < state.bestTime[dimId]) {
      state.bestTime[dimId] = clearTime;
    }

    // 보상
    player.gold = (player.gold || 0) + dim.reward.gold;
    if (dim.reward.diamonds) player.diamonds = (player.diamonds || 0) + dim.reward.diamonds;

    return {
      success: true, victory: true,
      msg: `🌌 ${dim.name} 정복! ${clearTime}초 클리어!`,
      clearTime, reward: dim.reward, bossName: dim.bossName,
    };
  }

  return {
    success: true, victory: false,
    msg: `💀 ${dim.name} 실패... (${!bossCanKill ? 'DPS 부족' : '생존 불가'})`,
    reason: !bossCanKill ? `DPS ${dps}/초 × 180초 = ${totalDmg} < 보스 HP ${dim.bossHp}` : `생존 ${survivalTime}초 < 60초`,
  };
}

function getDimensionStatus(player) {
  const state = getDimState(player);
  return {
    dimensions: DIMENSIONS.map(d => ({
      ...d,
      cleared: state.cleared.includes(d.id),
      bestTime: state.bestTime[d.id] || null,
      available: (player._abyssHighest || 0) >= d.reqFloor,
    })),
    totalClears: player._dimClears || 0,
  };
}

function registerDimensionHandlers(socket, playerId, players, io) {
  socket.on('dim_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('dim_status', getDimensionStatus(p));
  });

  socket.on('dim_challenge', (dimId) => {
    const p = players[playerId];
    if (!p) return;
    const result = challengeDimension(p, dimId);
    socket.emit('dim_result', result);
    if (result.victory) {
      io.emit('server_msg', { msg: `�� ${p.displayName||p.className}님이 ${DIMENSIONS.find(d=>d.id===dimId)?.name} 정복! (${result.clearTime}초)`, type: 'boss' });
    }
  });
}

module.exports = { registerDimensionHandlers, getDimensionStatus, DIMENSIONS };

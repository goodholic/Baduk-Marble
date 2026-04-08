// 잭팟 복권 시스템 — v1.66
// 서버 전체 누적 잭팟 — 티켓 구매로 풀이 늘어나고, 주간 추첨에서 단 1명이 모두 가져감
// 기존 v1.22 행운의 룰렛(즉시 보상)과 다른 카테고리

const JACKPOT_CONFIG = {
  ticketCostGold: 1000,        // 티켓 1장 = 1000G
  ticketCostDiamond: 10,       // 또는 10💎
  ticketToJackpotPct: 0.80,    // 티켓 비용의 80%가 잭팟에 적립
  initialJackpot: 50000,       // 초기 잭팟
  drawIntervalDays: 7,         // 주간 추첨
  consolationPct: 0.05,        // 미당첨 5명에게 위로상 (잭팟의 5%씩)
  maxTicketsPerPlayer: 50,     // 1주차당 최대 50장
};

// 메모리 상태
let jackpotPool = JACKPOT_CONFIG.initialJackpot;
let currentTickets = []; // [{ playerId, name, count }]
let drawHistory = []; // 과거 추첨 결과
let nextDrawAt = Date.now() + JACKPOT_CONFIG.drawIntervalDays * 24 * 3600 * 1000;

function getCurrentJackpot() {
  return jackpotPool;
}

function getTicketCount(playerId) {
  const entry = currentTickets.find(t => t.playerId === playerId);
  return entry ? entry.count : 0;
}

function buyTickets(player, count = 1, currency = 'gold') {
  const myTickets = getTicketCount(player.id);
  if (myTickets + count > JACKPOT_CONFIG.maxTicketsPerPlayer) {
    return { success: false, msg: `최대 ${JACKPOT_CONFIG.maxTicketsPerPlayer}장 (이미 ${myTickets}장)` };
  }

  let cost;
  if (currency === 'diamond') {
    cost = JACKPOT_CONFIG.ticketCostDiamond * count;
    if ((player.diamonds || 0) < cost) return { success: false, msg: `다이아 ${cost} 필요` };
    player.diamonds -= cost;
    // 다이아 → 골드 환산해서 잭팟에 (1💎 = 100G 가정)
    jackpotPool += Math.floor(cost * 100 * JACKPOT_CONFIG.ticketToJackpotPct);
  } else {
    cost = JACKPOT_CONFIG.ticketCostGold * count;
    if ((player.gold || 0) < cost) return { success: false, msg: `골드 ${cost} 필요` };
    player.gold -= cost;
    jackpotPool += Math.floor(cost * JACKPOT_CONFIG.ticketToJackpotPct);
  }

  // 티켓 등록
  let entry = currentTickets.find(t => t.playerId === player.id);
  if (entry) {
    entry.count += count;
  } else {
    currentTickets.push({ playerId: player.id, name: player.displayName, count });
  }

  return {
    success: true,
    bought: count,
    totalTickets: getTicketCount(player.id),
    currentJackpot: jackpotPool,
    drawAt: nextDrawAt,
  };
}

// 추첨 — 가중치 기반 (티켓 수)
function drawWinner() {
  if (currentTickets.length === 0) return { success: false, msg: '참가자 없음' };

  const totalTickets = currentTickets.reduce((s, t) => s + t.count, 0);
  let roll = Math.random() * totalTickets;
  let winner = currentTickets[0];
  for (const t of currentTickets) {
    roll -= t.count;
    if (roll <= 0) { winner = t; break; }
  }

  // 위로상 (잭팟의 5% × 5명)
  const consolationAmount = Math.floor(jackpotPool * JACKPOT_CONFIG.consolationPct);
  const consolations = currentTickets
    .filter(t => t.playerId !== winner.playerId)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(t => ({ ...t, consolation: consolationAmount }));

  const winningAmount = jackpotPool - (consolationAmount * consolations.length);

  const result = {
    drawAt: Date.now(),
    jackpot: jackpotPool,
    winner: { ...winner, prize: winningAmount },
    consolations,
    totalParticipants: currentTickets.length,
    totalTickets,
  };

  drawHistory.push(result);
  if (drawHistory.length > 20) drawHistory = drawHistory.slice(-20);

  // 리셋
  jackpotPool = JACKPOT_CONFIG.initialJackpot;
  currentTickets = [];
  nextDrawAt = Date.now() + JACKPOT_CONFIG.drawIntervalDays * 24 * 3600 * 1000;

  return result;
}

function tickJackpot() {
  if (Date.now() >= nextDrawAt) {
    return drawWinner();
  }
  return null;
}

function getStatus(playerId = null) {
  return {
    currentJackpot: jackpotPool,
    totalParticipants: currentTickets.length,
    totalTickets: currentTickets.reduce((s, t) => s + t.count, 0),
    myTickets: playerId ? getTicketCount(playerId) : 0,
    nextDrawAt,
    nextDrawRemaining: Math.max(0, nextDrawAt - Date.now()),
    history: drawHistory.slice(-5),
    config: JACKPOT_CONFIG,
  };
}

module.exports = {
  JACKPOT_CONFIG,
  getCurrentJackpot,
  getTicketCount,
  buyTickets,
  drawWinner,
  tickJackpot,
  getStatus,
};

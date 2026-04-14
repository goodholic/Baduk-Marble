// 무역 투기 시스템 — v4.5
// 선물 계약 + 가격 경매 + 무역왕 시즌

const { marketPrices, TRADE_ROUTES } = require('./trade_system');

const FUTURES_DURATION = 600; // 10분 후 결산 (초)
const FUTURES_BET_MIN = 100;  // 최소 100G
const FUTURES_BET_MAX = 50000; // 최대 50000G
const FUTURES_LEVERAGE = 3;   // 3배 레버리지

const TRADE_TITLES = [
  { profit: 0, title: '초보 상인', icon: '🛒' },
  { profit: 10000, title: '숙련 상인', icon: '💰' },
  { profit: 50000, title: '부호', icon: '💎' },
  { profit: 200000, title: '무역 대공', icon: '👑' },
  { profit: 1000000, title: '무역왕', icon: '🏆' },
];

const PRICE_AUCTION_COST = 5000; // 가격 조작 경매 참여비
const PRICE_AUCTION_DURATION = 1800; // 30분 (초)
const PRICE_HISTORY_MAX = 144; // 24시간 × 6 (10분 간격)

// ═══ 가격 히스토리 저장소 ═══
const priceHistories = {}; // { routeId: [{ price, time }] }

// ═══ 활성 가격 경매 ═══
const activeAuctions = {}; // { routeId: { bidder, targetPrice, amount, expiresAt } }

// ═══ 시즌 키 ═══
function seasonKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ═══ 계약 ID 생성 ═══
let contractCounter = 0;
function nextContractId() {
  return `FC-${Date.now()}-${++contractCounter}`;
}

// ═══ 초기화 ═══
function initSpeculation(player) {
  if (!player._speculation) {
    player._speculation = {
      futures: [],       // 활성 선물 계약
      totalProfit: 0,
      tradeTitle: '초보 상인',
      auctionWins: 0,
      season: seasonKey(),
    };
  }
  // 시즌 초기화
  const sk = seasonKey();
  if (player._speculation.season !== sk) {
    player._speculation.totalProfit = 0;
    player._speculation.tradeTitle = '초보 상인';
    player._speculation.season = sk;
  }
  return player._speculation;
}

// ═══ 선물 계약 매수 ═══
function buyFutures(player, routeId, direction, amount) {
  const sp = initSpeculation(player);
  const route = TRADE_ROUTES.find(r => r.id === routeId);
  if (!route) return { ok: false, msg: '⚠️ 존재하지 않는 교역 루트입니다.' };
  if (direction !== 'up' && direction !== 'down') {
    return { ok: false, msg: '⚠️ 방향은 "up" 또는 "down"만 가능합니다.' };
  }
  amount = Math.floor(Number(amount) || 0);
  if (amount < FUTURES_BET_MIN) {
    return { ok: false, msg: `⚠️ 최소 베팅 금액은 ${FUTURES_BET_MIN}G입니다.` };
  }
  if (amount > FUTURES_BET_MAX) {
    return { ok: false, msg: `⚠️ 최대 베팅 금액은 ${FUTURES_BET_MAX}G입니다.` };
  }
  if ((player.gold || 0) < amount) {
    return { ok: false, msg: `⚠️ 골드가 부족합니다. (보유: ${player.gold || 0}G)` };
  }
  // 동시 계약 5개 제한
  if (sp.futures.length >= 5) {
    return { ok: false, msg: '⚠️ 동시에 최대 5개 계약만 보유할 수 있습니다.' };
  }

  player.gold -= amount;
  const mp = marketPrices[routeId];
  const entryPrice = mp ? mp.sellPrice : route.sell;
  const now = Date.now();

  const contract = {
    id: nextContractId(),
    routeId,
    routeName: `${route.from} → ${route.to} (${route.goods})`,
    direction,
    amount,
    entryPrice,
    settleTime: now + FUTURES_DURATION * 1000,
    createdAt: now,
  };
  sp.futures.push(contract);

  const dirLabel = direction === 'up' ? '📈 상승' : '📉 하락';
  return {
    ok: true,
    contract,
    msg: `📜 선물 계약 체결! ${route.goods} ${dirLabel} 베팅 ${amount}G (${FUTURES_DURATION / 60}분 후 결산)`,
  };
}

// ═══ 선물 결산 ═══
function settleFutures(player) {
  const sp = initSpeculation(player);
  const now = Date.now();
  const settled = [];
  const remaining = [];

  for (const c of sp.futures) {
    if (now < c.settleTime) {
      remaining.push(c);
      continue;
    }
    // 결산
    const mp = marketPrices[c.routeId];
    const route = TRADE_ROUTES.find(r => r.id === c.routeId);
    const currentPrice = mp ? mp.sellPrice : (route ? route.sell : c.entryPrice);
    const priceChange = (currentPrice - c.entryPrice) / c.entryPrice; // 비율
    const wentUp = currentPrice > c.entryPrice;
    const wentDown = currentPrice < c.entryPrice;
    const correct = (c.direction === 'up' && wentUp) || (c.direction === 'down' && wentDown);
    const noChange = currentPrice === c.entryPrice;

    let profit = 0;
    let resultMsg = '';

    if (noChange) {
      // 가격 변동 없음 — 원금 반환
      player.gold = (player.gold || 0) + c.amount;
      resultMsg = `⚖️ ${c.routeName}: 가격 변동 없음. 원금 ${c.amount}G 반환.`;
    } else if (correct) {
      const absChange = Math.abs(priceChange);
      profit = Math.floor(c.amount * absChange * FUTURES_LEVERAGE);
      const payout = c.amount + profit;
      player.gold = (player.gold || 0) + payout;
      sp.totalProfit += profit;
      resultMsg = `✅ ${c.routeName}: 적중! +${profit}G 수익 (${(absChange * 100).toFixed(1)}% × ${FUTURES_LEVERAGE}배)`;
    } else {
      sp.totalProfit -= c.amount;
      resultMsg = `❌ ${c.routeName}: 예측 실패! -${c.amount}G 손실`;
    }

    settled.push({ contract: c, currentPrice, profit, correct, noChange, msg: resultMsg });
  }

  sp.futures = remaining;
  // 칭호 갱신
  sp.tradeTitle = getTradingTitle(player);

  return {
    ok: true,
    settled,
    remaining: remaining.length,
    totalProfit: sp.totalProfit,
    title: sp.tradeTitle,
    msg: settled.length > 0
      ? `📊 ${settled.length}건 결산 완료! 잔여 계약 ${remaining.length}건.`
      : '📊 아직 결산할 계약이 없습니다.',
  };
}

// ═══ 무역 칭호 ═══
function getTradingTitle(player) {
  const sp = initSpeculation(player);
  let title = TRADE_TITLES[0].title;
  for (const t of TRADE_TITLES) {
    if (sp.totalProfit >= t.profit) title = t.title;
  }
  sp.tradeTitle = title;
  return title;
}

// ═══ 투기 상태 조회 ═══
function getSpeculationStatus(player) {
  const sp = initSpeculation(player);
  const now = Date.now();
  return {
    futures: sp.futures.map(c => ({
      ...c,
      remainingSec: Math.max(0, Math.floor((c.settleTime - now) / 1000)),
    })),
    totalProfit: sp.totalProfit,
    tradeTitle: sp.tradeTitle,
    auctionWins: sp.auctionWins,
    season: sp.season,
  };
}

// ═══ 가격 조작 경매 ═══
function startPriceAuction(player, routeId, targetPrice, players) {
  const route = TRADE_ROUTES.find(r => r.id === routeId);
  if (!route) return { ok: false, msg: '⚠️ 존재하지 않는 교역 루트입니다.' };
  targetPrice = Math.floor(Number(targetPrice) || 0);
  if (targetPrice <= 0) return { ok: false, msg: '⚠️ 목표 가격은 양수여야 합니다.' };

  const mp = marketPrices[routeId];
  const currentSell = mp ? mp.sellPrice : route.sell;
  const minTarget = Math.floor(currentSell * 0.8);
  const maxTarget = Math.floor(currentSell * 1.2);
  if (targetPrice < minTarget || targetPrice > maxTarget) {
    return { ok: false, msg: `⚠️ 목표 가격은 현재가의 ±20% 범위 (${minTarget}~${maxTarget}G) 내여야 합니다.` };
  }

  if ((player.gold || 0) < PRICE_AUCTION_COST) {
    return { ok: false, msg: `⚠️ 경매 참여비 ${PRICE_AUCTION_COST}G가 부족합니다. (보유: ${player.gold || 0}G)` };
  }

  const playerId = player.odId || player.odid || 'unknown';
  const existing = activeAuctions[routeId];
  const now = Date.now();

  // 이미 경매 진행 중이고 아직 유효하면 더 높은 입찰만 가능
  if (existing && existing.expiresAt > now) {
    if (existing.bidder === playerId) {
      return { ok: false, msg: '⚠️ 이미 이 루트의 경매에 참여 중입니다.' };
    }
    // 기존 입찰자보다 높은 금액이어야 함
    player.gold -= PRICE_AUCTION_COST;
    // 이전 입찰자에게 환불
    const prevPlayer = players[existing.bidder];
    if (prevPlayer) {
      prevPlayer.gold = (prevPlayer.gold || 0) + PRICE_AUCTION_COST;
    }
  } else {
    player.gold -= PRICE_AUCTION_COST;
  }

  const sp = initSpeculation(player);
  sp.auctionWins += 1;

  activeAuctions[routeId] = {
    bidder: playerId,
    bidderName: player.nickname || player.name || '???',
    targetPrice,
    amount: PRICE_AUCTION_COST,
    expiresAt: now + PRICE_AUCTION_DURATION * 1000,
    routeId,
  };

  // 가격 적용
  if (mp) {
    mp.sellPrice = targetPrice;
    mp.lastUpdate = now;
  }

  return {
    ok: true,
    msg: `🔨 가격 경매 낙찰! ${route.goods} 판매가를 ${targetPrice}G로 조작합니다. (${PRICE_AUCTION_DURATION / 60}분간 유효)`,
    auction: activeAuctions[routeId],
  };
}

// ═══ 무역 랭킹 ═══
function getTradeRanking(players) {
  const sk = seasonKey();
  const entries = [];
  for (const pid of Object.keys(players)) {
    const p = players[pid];
    if (!p._speculation) continue;
    if (p._speculation.season !== sk) continue;
    const titleInfo = TRADE_TITLES.find(t => t.title === p._speculation.tradeTitle) || TRADE_TITLES[0];
    entries.push({
      playerId: pid,
      name: p.nickname || p.name || '???',
      totalProfit: p._speculation.totalProfit || 0,
      tradeTitle: p._speculation.tradeTitle || '초보 상인',
      icon: titleInfo.icon,
      auctionWins: p._speculation.auctionWins || 0,
    });
  }
  entries.sort((a, b) => b.totalProfit - a.totalProfit);
  return entries.slice(0, 20);
}

// ═══ 가격 히스토리 ═══
function getPriceHistory(routeId) {
  return (priceHistories[routeId] || []).slice(-144);
}

function recordPrice(routeId, price) {
  if (!priceHistories[routeId]) priceHistories[routeId] = [];
  priceHistories[routeId].push({ price, time: Date.now() });
  // 최대 보관량 초과 시 오래된 것 제거
  if (priceHistories[routeId].length > PRICE_HISTORY_MAX) {
    priceHistories[routeId] = priceHistories[routeId].slice(-PRICE_HISTORY_MAX);
  }
}

// ═══ 소켓 핸들러 등록 ═══
function registerSpeculationHandlers(io, socket, player, players) {
  initSpeculation(player);

  // 선물 계약 매수
  socket.on('futures_buy', (data) => {
    const result = buyFutures(player, data.routeId, data.direction, data.amount);
    socket.emit('futures_result', result);
  });

  // 선물 결산
  socket.on('futures_settle', () => {
    const result = settleFutures(player);
    socket.emit('futures_settle_result', result);
  });

  // 투기 상태 조회
  socket.on('futures_status', () => {
    const status = getSpeculationStatus(player);
    socket.emit('futures_status_result', { ok: true, status });
  });

  // 가격 조작 경매
  socket.on('price_auction', (data) => {
    const result = startPriceAuction(player, data.routeId, data.targetPrice, players);
    socket.emit('price_auction_result', result);
    if (result.ok) {
      // 전체 공지
      io.emit('market_notice', {
        msg: `🔨 ${player.nickname || '???'}님이 ${data.routeId} 루트의 가격을 조작했습니다!`,
      });
    }
  });

  // 무역 랭킹
  socket.on('trade_ranking', () => {
    const ranking = getTradeRanking(players);
    socket.emit('trade_ranking_result', { ok: true, ranking, season: seasonKey() });
  });

  // 가격 차트 데이터
  socket.on('price_history', (data) => {
    const history = getPriceHistory(data.routeId);
    socket.emit('price_history_result', { ok: true, routeId: data.routeId, history });
  });
}

module.exports = {
  FUTURES_DURATION,
  FUTURES_BET_MIN,
  FUTURES_BET_MAX,
  TRADE_TITLES,
  PRICE_AUCTION_COST,
  initSpeculation,
  buyFutures,
  settleFutures,
  getTradingTitle,
  getSpeculationStatus,
  startPriceAuction,
  getTradeRanking,
  getPriceHistory,
  recordPrice,
  registerSpeculationHandlers,
};

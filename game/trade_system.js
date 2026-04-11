// 무역(교역) 시스템 — v3.0
// 거상 스타일: 도시 간 물품 운송, 이윤 창출, 도적 습격

const TRADE_ROUTES = [
  { id: 'r1', from: '바람개비 마을', to: '별빛 항구',    goods: '곡물',     buy: 100,  sell: 180,  risk: 10, time: 30,  desc: '안전한 초보 루트' },
  { id: 'r2', from: '별빛 항구',    to: '달빛 오아시스', goods: '해산물',    buy: 150,  sell: 280,  risk: 20, time: 45,  desc: '해안 루트' },
  { id: 'r3', from: '달빛 오아시스', to: '구름마루 산장', goods: '향신료',   buy: 200,  sell: 400,  risk: 30, time: 60,  desc: '사막 횡단' },
  { id: 'r4', from: '구름마루 산장', to: '신전 마을',    goods: '광석',      buy: 300,  sell: 550,  risk: 40, time: 90,  desc: '산악 루트' },
  { id: 'r5', from: '신전 마을',    to: '사막 시장',    goods: '마법 결정',  buy: 500,  sell: 1000, risk: 50, time: 120, desc: '위험한 고수익' },
  { id: 'r6', from: '사막 시장',    to: '바람개비 마을', goods: '보석',      buy: 800,  sell: 1500, risk: 60, time: 150, desc: '최고 위험 최고 이윤' },
];

const CARAVAN_UPGRADES = [
  { id: 'wagon',  name: '마차 확장',   icon: '🛒', cost: 5000,  effect: { capacity: 5 }, desc: '적재량 +5' },
  { id: 'guard',  name: '호위 강화',   icon: '⚔️', cost: 8000,  effect: { defense: 15 }, desc: '도적 방어 +15%' },
  { id: 'speed',  name: '말 업그레이드',icon: '🐴', cost: 10000, effect: { speedMult: 0.8 }, desc: '이동 시간 -20%' },
  { id: 'luck',   name: '행운 부적',   icon: '🍀', cost: 6000,  effect: { bonusChance: 10 }, desc: '보너스 이윤 10%' },
];

function getTradeState(player) {
  if (!player._trade) player._trade = { activeTrip: null, completedTrips: 0, totalProfit: 0, caravanLevel: 1, upgrades: [], capacity: 10 };
  return player._trade;
}

function startTrade(player, routeId, quantity) {
  const trade = getTradeState(player);
  if (trade.activeTrip) return { success: false, msg: '이미 교역 진행 중!' };

  const route = TRADE_ROUTES.find(r => r.id === routeId);
  if (!route) return { success: false, msg: '루트 없음' };

  quantity = Math.min(quantity || 1, trade.capacity);
  const totalCost = route.buy * quantity;
  if ((player.gold || 0) < totalCost) return { success: false, msg: '골드 부족 (필요: ' + totalCost + 'G)' };

  player.gold -= totalCost;

  // 이동 시간 (업그레이드 반영)
  let travelTime = route.time;
  for (const upg of trade.upgrades) {
    const u = CARAVAN_UPGRADES.find(c => c.id === upg);
    if (u && u.effect.speedMult) travelTime = Math.floor(travelTime * u.effect.speedMult);
  }

  trade.activeTrip = {
    routeId, route, quantity, totalCost,
    startTime: Date.now(),
    arrivalTime: Date.now() + travelTime * 1000,
    travelTime,
  };

  return { success: true, msg: '🐴 ' + route.from + ' → ' + route.to + ' 출발! (' + route.goods + ' ×' + quantity + ', ' + travelTime + '초)', trip: trade.activeTrip };
}

function checkTradeArrival(player) {
  const trade = getTradeState(player);
  if (!trade.activeTrip) return null;
  if (Date.now() < trade.activeTrip.arrivalTime) {
    const remaining = Math.ceil((trade.activeTrip.arrivalTime - Date.now()) / 1000);
    return { arrived: false, remaining };
  }

  const trip = trade.activeTrip;
  const route = trip.route;

  // 도적 습격 체크
  let defenseBonus = 0;
  for (const upg of trade.upgrades) {
    const u = CARAVAN_UPGRADES.find(c => c.id === upg);
    if (u && u.effect.defense) defenseBonus += u.effect.defense;
  }

  const robbed = Math.random() * 100 < (route.risk - defenseBonus);
  let profit = 0;
  let lostGoods = 0;

  if (robbed) {
    lostGoods = Math.ceil(trip.quantity * 0.3); // 30% 손실
    profit = (trip.quantity - lostGoods) * route.sell - trip.totalCost;
  } else {
    profit = trip.quantity * route.sell - trip.totalCost;
    // 행운 보너스
    let bonusChance = 0;
    for (const upg of trade.upgrades) {
      const u = CARAVAN_UPGRADES.find(c => c.id === upg);
      if (u && u.effect.bonusChance) bonusChance += u.effect.bonusChance;
    }
    if (Math.random() * 100 < bonusChance) profit = Math.floor(profit * 1.5);
  }

  player.gold = (player.gold || 0) + trip.totalCost + profit; // 원금 + 이윤
  trade.completedTrips++;
  trade.totalProfit += profit;
  trade.activeTrip = null;

  return { arrived: true, profit, robbed, lostGoods, route: route.from + '→' + route.to, goods: route.goods };
}

function upgradeCaravan(player, upgradeId) {
  const trade = getTradeState(player);
  const upg = CARAVAN_UPGRADES.find(u => u.id === upgradeId);
  if (!upg) return { success: false, msg: '업그레이드 없음' };
  if (trade.upgrades.includes(upgradeId)) return { success: false, msg: '이미 보유' };
  if ((player.gold || 0) < upg.cost) return { success: false, msg: '골드 부족' };

  player.gold -= upg.cost;
  trade.upgrades.push(upgradeId);
  if (upg.effect.capacity) trade.capacity += upg.effect.capacity;

  return { success: true, msg: upg.icon + ' ' + upg.name + ' 구매!' };
}

function registerTradeHandlers(socket, playerId, players, io) {
  socket.on('trade_routes', () => {
    const p = players[playerId];
    if (!p) return;
    const trade = getTradeState(p);
    socket.emit('trade_routes', {
      routes: TRADE_ROUTES,
      upgrades: CARAVAN_UPGRADES,
      state: trade,
      arrival: trade.activeTrip ? checkTradeArrival(p) : null,
    });
  });

  socket.on('trade_start', (data) => {
    const p = players[playerId];
    if (!p) return;
    const result = startTrade(p, data.routeId, data.quantity || 1);
    socket.emit('trade_result', result);
  });

  socket.on('trade_check', () => {
    const p = players[playerId];
    if (!p) return;
    const result = checkTradeArrival(p);
    if (result) {
      socket.emit('trade_arrival', result);
      if (result.arrived) {
        if (result.robbed) io.emit('server_msg', { msg: '⚠️ ' + (p.displayName||p.className) + '의 캐러밴이 도적에게 습격당했다!', type: 'danger' });
        else io.emit('server_msg', { msg: '💰 ' + (p.displayName||p.className) + '의 교역 성공! +' + result.profit + 'G', type: 'normal' });
      }
    }
  });

  socket.on('trade_upgrade', (upgradeId) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('trade_result', upgradeCaravan(p, upgradeId));
  });
}

module.exports = { TRADE_ROUTES, CARAVAN_UPGRADES, registerTradeHandlers };

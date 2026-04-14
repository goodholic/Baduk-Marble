// 무역(교역) 시스템 — v3.0
// 거상 스타일: 도시 간 물품 운송, 이윤 창출, 도적 습격

const TRADE_ROUTES = [
  { id: 'r1', from: '바람개비 마을', to: '별빛 항구',    goods: '곡물',     buy: 100,  sell: 180,  risk: 10, time: 30,  desc: '안전한 초보 루트' },
  { id: 'r2', from: '별빛 항구',    to: '달빛 오아시스', goods: '해산물',    buy: 150,  sell: 280,  risk: 20, time: 45,  desc: '해안 루트' },
  { id: 'r3', from: '달빛 오아시스', to: '구름마루 산장', goods: '향신료',   buy: 200,  sell: 400,  risk: 30, time: 60,  desc: '사막 횡단' },
  { id: 'r4', from: '구름마루 산장', to: '신전 마을',    goods: '광석',      buy: 300,  sell: 550,  risk: 40, time: 90,  desc: '산악 루트' },
  { id: 'r5', from: '신전 마을',    to: '사막 시장',    goods: '마법 결정',  buy: 500,  sell: 1000, risk: 50, time: 120, desc: '위험한 고수익' },
  { id: 'r6', from: '사막 시장',    to: '바람개비 마을', goods: '보석',      buy: 800,  sell: 1500, risk: 60, time: 150, desc: '최고 위험 최고 이윤' },
  // v3.0 확장 루트
  { id: 'r7', from: '동쪽 항구',   to: '신전 마을',    goods: '성수',      buy: 400,  sell: 750,  risk: 35, time: 80,  desc: '신성한 물품' },
  { id: 'r8', from: '구름마루 산장',to: '사막 시장',    goods: '용린',      buy: 1000, sell: 2200, risk: 70, time: 180, desc: '극한 고위험 루트' },
  { id: 'r9', from: '바람개비 마을',to: '구름마루 산장', goods: '목재',      buy: 80,   sell: 160,  risk: 15, time: 40,  desc: '안전한 기본 루트' },
  { id: 'r10',from: '별빛 항구',   to: '동쪽 항구',    goods: '비단',      buy: 250,  sell: 480,  risk: 25, time: 60,  desc: '해상 무역' },
];

// ═══ 동적 시장 가격 시스템 ═══
const marketPrices = {};
function initMarketPrices() {
  for (const route of TRADE_ROUTES) {
    marketPrices[route.id] = {
      buyPrice: route.buy,
      sellPrice: route.sell,
      supply: 100,     // 100% = normal
      demand: 100,     // 100% = normal
      trend: 0,        // -2~+2 trend direction
      lastUpdate: Date.now(),
    };
  }
}
initMarketPrices();

// ═══ 시장 이벤트 ═══
const MARKET_EVENTS = [
  { name: '풍년', icon: '🌾', effect: { routes: ['r1','r9'], supplyMod: +50 }, desc: '곡물/목재 공급 폭증! 매입가 하락' },
  { name: '해적 출몰', icon: '🏴‍☠️', effect: { routes: ['r2','r10'], riskMod: +30, demandMod: +40 }, desc: '해상 루트 위험! 해산물/비단 수요 급등' },
  { name: '마법 폭발', icon: '💥', effect: { routes: ['r5'], supplyMod: -40, demandMod: +60 }, desc: '마법 결정 품귀! 가격 급등' },
  { name: '축제', icon: '🎊', effect: { routes: ['r3','r4'], demandMod: +30 }, desc: '축제로 향신료/광석 수요 증가' },
  { name: '전쟁', icon: '⚔️', effect: { routes: ['r4','r8'], demandMod: +80, riskMod: +20 }, desc: '전쟁! 광석/용린 가격 폭등' },
  { name: '역병', icon: '☠️', effect: { routes: ['r7'], demandMod: +100 }, desc: '역병! 성수 가격 폭등' },
];
let activeMarketEvent = null;

function updateMarketPrices() {
  // 5% 확률로 시장 이벤트 발생
  if (Math.random() < 0.05) {
    activeMarketEvent = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
    activeMarketEvent.startTime = Date.now();
    activeMarketEvent.duration = 10 * 60 * 1000; // 10분간 지속
  } else if (activeMarketEvent && Date.now() > activeMarketEvent.startTime + activeMarketEvent.duration) {
    activeMarketEvent = null;
  }

  for (const route of TRADE_ROUTES) {
    const mp = marketPrices[route.id];
    // Random supply/demand shift (-15 to +15)
    mp.supply = Math.max(30, Math.min(200, mp.supply + (Math.random() * 30 - 15)));
    mp.demand = Math.max(30, Math.min(200, mp.demand + (Math.random() * 30 - 15)));
    // Trend momentum
    mp.trend = Math.max(-2, Math.min(2, mp.trend + (Math.random() * 2 - 1)));
    mp.supply = Math.max(30, Math.min(200, mp.supply + mp.trend * 3));

    // 시장 이벤트 효과 적용
    if (activeMarketEvent && activeMarketEvent.effect.routes.includes(route.id)) {
      const eff = activeMarketEvent.effect;
      if (eff.supplyMod) mp.supply = Math.max(30, Math.min(200, mp.supply + eff.supplyMod));
      if (eff.demandMod) mp.demand = Math.max(30, Math.min(200, mp.demand + eff.demandMod));
    }

    // Price calculation: buy inversely proportional to supply, sell proportional to demand
    mp.buyPrice = Math.floor(route.buy * (mp.supply / 100));
    mp.sellPrice = Math.floor(route.sell * (mp.demand / 100));
    mp.lastUpdate = Date.now();
  }
  return marketPrices;
}

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
  if (!player) return { success: false, msg: '플레이어 없음' };
  const trade = getTradeState(player);
  if (trade.activeTrip) return { success: false, msg: '이미 교역 진행 중!' };

  const route = TRADE_ROUTES.find(r => r.id === routeId);
  if (!route) return { success: false, msg: '루트 없음' };

  quantity = Math.min(quantity || 1, trade.capacity);
  const mp = marketPrices[route.id];
  const currentBuyPrice = mp ? mp.buyPrice : route.buy;
  const totalCost = currentBuyPrice * quantity;
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

  // 시장 이벤트에 의한 위험도 보정
  let riskMod = 0;
  if (activeMarketEvent && activeMarketEvent.effect.routes.includes(route.id) && activeMarketEvent.effect.riskMod) {
    riskMod = activeMarketEvent.effect.riskMod;
  }
  const robbed = Math.random() * 100 < (route.risk + riskMod - defenseBonus);
  let profit = 0;
  let lostGoods = 0;

  const mp = marketPrices[route.id];
  const currentSellPrice = mp ? mp.sellPrice : route.sell;

  if (robbed) {
    lostGoods = Math.ceil(trip.quantity * 0.3); // 30% 손실
    profit = (trip.quantity - lostGoods) * currentSellPrice - trip.totalCost;
  } else {
    profit = trip.quantity * currentSellPrice - trip.totalCost;
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

  socket.on('trade_market', () => {
    const prices = TRADE_ROUTES.map(r => {
      const mp = marketPrices[r.id];
      const trendArrow = mp.trend > 0.5 ? '📈' : mp.trend < -0.5 ? '📉' : '➡️';
      return {
        id: r.id,
        goods: r.goods,
        from: r.from,
        to: r.to,
        baseBuy: r.buy,
        baseSell: r.sell,
        buyPrice: mp.buyPrice,
        sellPrice: mp.sellPrice,
        supply: Math.round(mp.supply),
        demand: Math.round(mp.demand),
        trend: trendArrow,
        risk: r.risk,
      };
    });
    socket.emit('trade_market', {
      prices,
      event: activeMarketEvent ? { name: activeMarketEvent.name, icon: activeMarketEvent.icon, desc: activeMarketEvent.desc, remaining: Math.max(0, Math.ceil((activeMarketEvent.startTime + activeMarketEvent.duration - Date.now()) / 1000)) } : null,
    });
  });
}

// v3.0: 무역 중 PK — 다른 플레이어의 캐러밴 약탈!
function raidCaravan(attackerId, targetId, players, io) {
  const attacker = players[attackerId];
  const target = players[targetId];
  if (!attacker || !target) return { success: false, msg: '대상 없음' };

  const trade = getTradeState(target);
  if (!trade.activeTrip) return { success: false, msg: '상대가 교역 중이 아닙니다' };

  // PK존에서만 가능
  const pkZones = ['chaos','warzone','blood_arena','lawless'];
  if (!pkZones.includes(attacker.zone)) return { success: false, msg: 'PK 허용 존에서만 가능' };

  // 전투 (간소화 — 공격자 ATK vs 방어자 호위)
  let defenseBonus = 0;
  for (const upg of trade.upgrades) {
    const u = CARAVAN_UPGRADES.find(c => c.id === upg);
    if (u && u.effect.defense) defenseBonus += u.effect.defense;
  }

  const attackPower = attacker.atk || 25;
  const defensePower = 10 + defenseBonus;
  const success = attackPower > defensePower + Math.random() * 20;

  if (success) {
    // 약탈 성공! 상대 교역품의 50% 강탈
    const trip = trade.activeTrip;
    const stolenGoods = Math.ceil(trip.quantity * 0.5);
    const stolenValue = stolenGoods * trip.route.sell;
    trip.quantity -= stolenGoods;

    attacker.gold = (attacker.gold || 0) + stolenValue;
    attacker.karma = (attacker.karma || 0) + 150; // 카르마 증가

    if (io) {
      io.to(attackerId).emit('trade_raid_result', { success: true, stolenValue, stolenGoods, goods: trip.route.goods });
      io.to(targetId).emit('trade_raid_result', { success: false, lost: true, stolenGoods, goods: trip.route.goods, attackerName: attacker.displayName });
      io.emit('server_msg', { msg: '☠️ ' + (attacker.displayName||'') + '이(가) ' + (target.displayName||'') + '의 캐러밴을 약탈! ' + stolenValue + 'G 강탈!', type: 'danger' });
    }

    return { success: true, stolenValue, stolenGoods };
  }

  // 약탈 실패
  if (io) io.to(attackerId).emit('trade_raid_result', { success: false, msg: '호위대에 의해 격퇴당했습니다!' });
  return { success: false, msg: '약탈 실패! 호위가 강합니다.' };
}

function registerTradeHandlersV2(socket, playerId, players, io) {
  registerTradeHandlers(socket, playerId, players, io);

  socket.on('trade_raid', (targetName) => {
    const target = Object.entries(players).find(([, p]) => p.displayName === targetName);
    if (!target) { socket.emit('trade_result', { success: false, msg: '대상 없음' }); return; }
    raidCaravan(playerId, target[0], players, io);
  });
}

module.exports = { TRADE_ROUTES, CARAVAN_UPGRADES, registerTradeHandlers: registerTradeHandlersV2, raidCaravan, updateMarketPrices, marketPrices };

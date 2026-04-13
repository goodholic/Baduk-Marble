// 용병 고용소 & 영입 시스템 (거상 스타일) — v3.6
function registerMercenaryHireHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  // 고용소 목록 (위치별 고용소, 갱신 주기에 따라 라인업 변동)
  const HIRE_MARKETS = {
    tavern:       { name: '변방 주막',       minStar: 1, maxStar: 2, refreshMs: 6*3600e3, minLv: 1,  costRange: [500, 2000] },
    guild:        { name: '왕도 용병 길드',   minStar: 2, maxStar: 4, refreshMs: 12*3600e3, minLv: 15, costRange: [5000, 50000] },
    darkMarket:   { name: '암흑 시장',        minStar: 3, maxStar: 5, refreshMs: 24*3600e3, minLv: 1,  costRange: [20000, 200000], requireKarma: 50 },
    spiritAltar:  { name: '정령의 숲 제단',   minStar: 3, maxStar: 4, refreshMs: 48*3600e3, minLv: 1,  costRange: [5, 20], currency: 'spiritStone' },
    dragonNest:   { name: '드래곤 둥지',      minStar: 5, maxStar: 5, refreshMs: 7*24*3600e3, minLv: 40, costRange: [500000, 500000], requireTitle: 'dragonSlayer' },
    riftPortal:   { name: '차원 균열 포탈',   minStar: 4, maxStar: 5, refreshMs: 3*24*3600e3, minLv: 1,  costRange: [10, 30], currency: 'dimensionStone' },
    piratePort:   { name: '해적왕의 항구',    minStar: 3, maxStar: 4, refreshMs: 24*3600e3, minLv: 1,  costRange: [30000, 30000], requireTradeLevel: 5 },
    ancientRuins: { name: '고대 유적 발굴지', minStar: 4, maxStar: 5, refreshMs: 5*24*3600e3, minLv: 1,  costRange: [3, 3], currency: 'ancientRelic' },
    prisonCamp:   { name: '전장의 포로수용소', minStar: 2, maxStar: 5, refreshMs: 0, minLv: 1, costRange: [1, 1], currency: 'prisonerToken', requireSiegeWin: true },
    wanderer:     { name: '떠돌이 상인',      minStar: 1, maxStar: 5, refreshMs: 0, minLv: 1, costRange: [0.5, 2], costMultiplier: true },
  };

  function generateLineup(market) {
    const count = market.maxStar >= 5 ? 2 : 4;
    const lineup = [];
    for (let i = 0; i < count; i++) {
      const star = market.minStar + Math.floor(Math.random() * (market.maxStar - market.minStar + 1));
      const cost = market.costRange[0] + Math.floor(Math.random() * (market.costRange[1] - market.costRange[0] + 1));
      lineup.push({
        id: `merc_${Date.now()}_${i}`,
        star,
        cost,
        currency: market.currency || 'gold',
        traits: generateRandomTraits(star),
      });
    }
    return lineup;
  }

  function generateRandomTraits(star) {
    const pool = ['용맹','교활','수호','신속','마력','축복','저주','광기','치유','지략'];
    const count = Math.min(star, 3);
    const traits = [];
    const used = new Set();
    for (let i = 0; i < count; i++) {
      let t;
      do { t = pool[Math.floor(Math.random() * pool.length)]; } while (used.has(t));
      used.add(t); traits.push(t);
    }
    return traits;
  }

  // 고용소 목록 요청
  socket.on('hire_market_list', () => {
    const p = players[playerId];
    if (!p) return;
    const available = {};
    for (const [key, market] of Object.entries(HIRE_MARKETS)) {
      const meetsLevel = (p.level || 1) >= market.minLv;
      const meetsKarma = !market.requireKarma || (p.karma || 0) >= market.requireKarma;
      available[key] = { ...market, unlocked: meetsLevel && meetsKarma };
    }
    socket.emit('hire_market_list', available);
  });

  // 특정 고용소 라인업 조회
  socket.on('hire_market_browse', (data) => {
    const p = players[playerId];
    if (!p || !data?.marketId) return;
    const market = HIRE_MARKETS[data.marketId];
    if (!market) return;

    if (!p.hireMarkets) p.hireMarkets = {};
    const state = p.hireMarkets[data.marketId] || {};
    const now = Date.now();
    const needRefresh = !state.lineup || (market.refreshMs > 0 && now - (state.lastRefresh || 0) > market.refreshMs);

    if (needRefresh) {
      state.lineup = generateLineup(market);
      state.lastRefresh = now;
      p.hireMarkets[data.marketId] = state;
      savePlayer(p);
    }

    socket.emit('hire_market_lineup', { marketId: data.marketId, lineup: state.lineup });
  });

  // 용병 고용
  socket.on('hire_mercenary', (data) => {
    const p = players[playerId];
    if (!p || !data?.marketId || !data?.mercId) return;
    const state = (p.hireMarkets || {})[data.marketId];
    if (!state?.lineup) return;
    const idx = state.lineup.findIndex(m => m.id === data.mercId);
    if (idx === -1) return;
    const merc = state.lineup[idx];

    // 비용 차감
    const curr = merc.currency || 'gold';
    const wallet = curr === 'gold' ? (p.gold || 0) : (p.resources?.[curr] || 0);
    if (wallet < merc.cost) {
      socket.emit('hire_result', { success: false, reason: 'insufficient_funds' });
      return;
    }
    if (curr === 'gold') p.gold -= merc.cost;
    else { if (!p.resources) p.resources = {}; p.resources[curr] = (p.resources[curr] || 0) - merc.cost; }

    // 용병 추가
    if (!p.mercenaries) p.mercenaries = [];
    p.mercenaries.push({
      id: merc.id,
      star: merc.star,
      traits: merc.traits,
      level: 1,
      bond: 0,        // 친밀도
      loyalty: 80,     // 충성도
      runes: [],
      mutations: [],
      hiredFrom: data.marketId,
      hiredAt: Date.now(),
    });

    state.lineup.splice(idx, 1);
    savePlayer(p);
    socket.emit('hire_result', { success: true, merc: p.mercenaries[p.mercenaries.length - 1] });
    io.emit('server_toast', { msg: `⚔️ ${p.name}님이 새로운 ★${merc.star} 용병을 고용했습니다!` });
  });
}

module.exports = { registerMercenaryHireHandlers };

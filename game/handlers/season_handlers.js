// 시즌 패스 소켓 핸들러 — v1.84 (server.js에서 분리)
// ctx = { io, players, playerId, savePlayer, MAX_GOLD, MAX_DIAMONDS, seasonPass }

function registerSeasonHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, MAX_GOLD, MAX_DIAMONDS, seasonPass } = ctx;

  socket.on('season_status', () => {
    const p = players[playerId];
    if (!p) return;
    let currentTier = 0;
    for (const t of seasonPass.SEASON_PASS_TIERS) {
      if ((p.seasonXp || 0) >= t.xp) currentTier = t.tier;
      else break;
    }
    socket.emit('season_status_result', {
      seasonXp: p.seasonXp || 0,
      currentTier,
      hasSeasonPass: !!p.hasSeasonPass,
      claimed: p.seasonClaimed || { free: [], premium: [] },
      tiers: seasonPass.SEASON_PASS_TIERS,
      xpSources: seasonPass.SEASON_XP_SOURCES,
      price: seasonPass.SEASON_PASS_PRICE,
      duration: seasonPass.SEASON_DURATION_DAYS,
    });
  });

  socket.on('season_buy_pass', () => {
    const p = players[playerId];
    if (!p) return;
    const result = seasonPass.buySeasonPass(p);
    socket.emit('season_buy_result', result);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      io.emit('server_msg', { msg: `[시즌 패스] ${p.displayName}이(가) 프리미엄 패스를 구매했습니다!`, type: 'normal' });
    }
  });

  socket.on('season_claim', (data) => {
    const p = players[playerId];
    if (!p) return;
    const tier = data && Number(data.tier);
    const track = data && (data.track === 'premium' ? 'premium' : 'free');
    if (!tier) { socket.emit('season_claim_result', { success: false, msg: '티어 미지정' }); return; }
    const result = seasonPass.claimSeasonReward(p, tier, track);
    if (!result.success) {
      socket.emit('season_claim_result', result);
      return;
    }
    const r = result.reward || {};
    if (r.gold) p.gold = Math.min(MAX_GOLD, (p.gold || 0) + r.gold);
    if (r.diamonds) p.diamonds = Math.min(MAX_DIAMONDS, (p.diamonds || 0) + r.diamonds);
    if (!p.inventory) p.inventory = {};
    for (const [k, v] of Object.entries(r)) {
      if (['gold','diamonds','title','skin'].includes(k)) continue;
      if (typeof v === 'number') p.inventory[k] = (p.inventory[k] || 0) + v;
    }
    if (r.title) {
      if (!p.titles) p.titles = [];
      if (!p.titles.includes(r.title)) p.titles.push(r.title);
    }
    savePlayer(p);
    socket.emit('season_claim_result', { success: true, tier, track, reward: r });
    io.emit('player_update', p);
  });
}

module.exports = { registerSeasonHandlers };

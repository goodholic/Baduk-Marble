// 용병 PvP 콜로세움 — v3.6
function registerMercenaryColosseumHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  const COLOSSEUM_MODES = {
    duel_1v1:      { name: '1:1 용병 결투', mercCount: 1, bestOf: 3, reward: 'arena_points' },
    team_3v3:      { name: '3:3 팀 배틀',   mercCount: 3, bestOf: 3, reward: 'team_token' },
    brawl_5v5:     { name: '5:5 대난투',     mercCount: 5, bestOf: 1, reward: 'brawl_medal', weekly: true },
    survival:      { name: '무제한 서바이벌', mercCount: -1, bestOf: 0, reward: 'survival_streak' },
    banpick:       { name: '밴픽 토너먼트',  mercCount: 8, bestOf: 5, reward: 'season_skin', seasonal: true },
    legend:        { name: '전설 챔피언전',  mercCount: 3, bestOf: 5, reward: 'legend_trophy', minStar5: 3 },
    king:          { name: '용병왕 결정전',  mercCount: -1, bestOf: 7, reward: 'king_title', inviteOnly: true },
    hybrid:        { name: '이종격투기',     mercCount: 5, bestOf: 3, reward: 'hybrid_medal', weekly: true },
  };

  const RANK_TIERS = [
    { name: '브론즈',     minPts: 0 },
    { name: '실버',       minPts: 1000 },
    { name: '골드',       minPts: 2500 },
    { name: '플래티넘',   minPts: 5000 },
    { name: '다이아몬드', minPts: 7500 },
    { name: '마스터',     minPts: 10000 },
  ];

  function getRank(pts) {
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
      if (pts >= RANK_TIERS[i].minPts) return RANK_TIERS[i];
    }
    return RANK_TIERS[0];
  }

  // 콜로세움 모드 목록
  socket.on('colosseum_modes', () => {
    const p = players[playerId];
    if (!p) return;
    const pts = p.colosseumPoints || 0;
    const result = {};
    for (const [key, mode] of Object.entries(COLOSSEUM_MODES)) {
      result[key] = {
        ...mode,
        available: true,
        currentRank: getRank(pts),
      };
    }
    socket.emit('colosseum_modes', { modes: result, points: pts, rank: getRank(pts).name });
  });

  // 매치 시작 요청
  socket.on('colosseum_queue', (data) => {
    const p = players[playerId];
    if (!p || !data?.mode) return;
    const mode = COLOSSEUM_MODES[data.mode];
    if (!mode) return;

    const mercs = p.mercenaries || [];
    const selected = (data.mercIds || []).map(id => mercs.find(m => m.id === id)).filter(Boolean);

    if (mode.mercCount > 0 && selected.length < mode.mercCount) {
      socket.emit('colosseum_error', { reason: 'not_enough_mercs', required: mode.mercCount });
      return;
    }

    if (mode.minStar5 && selected.filter(m => m.star >= 5).length < mode.minStar5) {
      socket.emit('colosseum_error', { reason: 'need_star5', required: mode.minStar5 });
      return;
    }

    // 매칭 큐 등록
    if (!ctx.colosseumQueue) ctx.colosseumQueue = {};
    if (!ctx.colosseumQueue[data.mode]) ctx.colosseumQueue[data.mode] = [];
    ctx.colosseumQueue[data.mode].push({
      playerId,
      socketId: socket.id,
      mercs: selected,
      queuedAt: Date.now(),
    });

    socket.emit('colosseum_queued', { mode: data.mode, position: ctx.colosseumQueue[data.mode].length });

    // 매칭 시도
    const queue = ctx.colosseumQueue[data.mode];
    if (queue.length >= 2) {
      const [p1, p2] = queue.splice(0, 2);
      const matchId = `colo_${Date.now()}`;
      const matchResult = simulateBattle(p1, p2, mode);

      // 결과 전송
      const winner = matchResult.winnerId;
      const loser = matchResult.loserId;

      const wp = players[winner];
      const lp = players[loser];
      if (wp) {
        wp.colosseumPoints = (wp.colosseumPoints || 0) + 30;
        wp.colosseumWins = (wp.colosseumWins || 0) + 1;
        savePlayer(wp);
      }
      if (lp) {
        lp.colosseumPoints = Math.max(0, (lp.colosseumPoints || 0) - 15);
        lp.colosseumLosses = (lp.colosseumLosses || 0) + 1;
        savePlayer(lp);
      }

      io.to(p1.socketId).emit('colosseum_result', { matchId, ...matchResult, perspective: p1.playerId });
      io.to(p2.socketId).emit('colosseum_result', { matchId, ...matchResult, perspective: p2.playerId });
    }
  });

  // 간단한 전투 시뮬레이션
  function simulateBattle(p1, p2, mode) {
    let score1 = 0, score2 = 0;
    const rounds = [];

    for (let i = 0; i < Math.min(p1.mercs.length, p2.mercs.length); i++) {
      const m1 = p1.mercs[i], m2 = p2.mercs[i];
      const power1 = (m1.star * 100) + (m1.level || 1) * 10 + (m1.bond || 0) * 0.5 + Math.random() * 50;
      const power2 = (m2.star * 100) + (m2.level || 1) * 10 + (m2.bond || 0) * 0.5 + Math.random() * 50;

      if (power1 > power2) score1++;
      else score2++;
      rounds.push({ m1: m1.id, m2: m2.id, p1Power: Math.round(power1), p2Power: Math.round(power2), winner: power1 > power2 ? 1 : 2 });

      if (mode.bestOf > 0) {
        const needed = Math.ceil(mode.bestOf / 2);
        if (score1 >= needed || score2 >= needed) break;
      }
    }

    return {
      winnerId: score1 > score2 ? p1.playerId : p2.playerId,
      loserId: score1 > score2 ? p2.playerId : p1.playerId,
      score: [score1, score2],
      rounds,
    };
  }

  // 랭킹 조회
  socket.on('colosseum_ranking', () => {
    const ranking = Object.values(players)
      .filter(p => p.colosseumPoints > 0)
      .map(p => ({
        name: p.name,
        points: p.colosseumPoints,
        wins: p.colosseumWins || 0,
        losses: p.colosseumLosses || 0,
        rank: getRank(p.colosseumPoints).name,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 50);
    socket.emit('colosseum_ranking', ranking);
  });
}

module.exports = { registerMercenaryColosseumHandlers };

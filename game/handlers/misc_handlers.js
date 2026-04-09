// 잡다 핸들러 묶음 — v1.89 (서버.js의 v1.62~v1.81 핸들러 일괄 분리)
// 작은 핸들러 20개를 하나의 모듈로 묶어 import 양 절감

function registerMiscHandlers(socket, ctx) {
  const {
    io, players, playerId, savePlayer, MAX_GOLD,
    statistics, timeCapsule, invitation, honor, passport, aura, dashboard,
    inn, territory, blueprint, contracts, newsBoard, blessing, library, wisdom,
    dungeonKeys, lotteryJackpot, titleCollection, guildWar, pvpTournament,
    clans, getZone,
  } = ctx;

  // ── v1.81: 서버 통계 ──
  socket.on('statistics_full', () => socket.emit('statistics_full_result', statistics.getStats(players)));
  socket.on('statistics_compact', () => socket.emit('statistics_compact_result', statistics.getCompactStats(players)));

  // ── v1.80: 시간 캡슐 ──
  socket.on('capsule_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('capsule_status_result', timeCapsule.getStatus(p));
  });
  socket.on('capsule_deposit', (data) => {
    const p = players[playerId];
    if (!p || !data || !data.tier || !data.gold) {
      socket.emit('capsule_result', { success: false, msg: '필수 정보 누락' });
      return;
    }
    const goldAmount = Math.floor(Number(data.gold));
    if (!Number.isFinite(goldAmount) || goldAmount <= 0) { socket.emit('capsule_result', { success: false, msg: '유효한 골드 필요' }); return; }
    const result = timeCapsule.depositCapsule(p, data.tier, goldAmount);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('capsule_result', result);
  });
  socket.on('capsule_withdraw', (capsuleId) => {
    const p = players[playerId]; if (!p) return;
    const result = timeCapsule.withdrawCapsule(p, capsuleId);
    if (result.success) {
      if (p.gold > MAX_GOLD) p.gold = MAX_GOLD;
      savePlayer(p); io.emit('player_update', p);
    }
    socket.emit('capsule_result', result);
  });

  // ── v1.79: 초대 ──
  socket.on('invitation_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('invitation_status_result', invitation.getStatus(p));
  });
  socket.on('invitation_generate', () => {
    const p = players[playerId]; if (!p) return;
    const result = invitation.generateCode(p);
    if (result.success) savePlayer(p);
    socket.emit('invitation_result', result);
  });
  socket.on('invitation_apply', (code) => {
    const p = players[playerId]; if (!p) return;
    const result = invitation.applyCode(p, code);
    if (result.success) savePlayer(p);
    socket.emit('invitation_result', result);
  });

  // ── v1.78: 명예 ──
  socket.on('honor_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('honor_status_result', honor.getStatus(p));
  });
  socket.on('honor_buy', (itemId) => {
    const p = players[playerId]; if (!p) return;
    const result = honor.spendHonor(p, itemId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('honor_result', result);
  });

  // ── v1.77: 여권 ──
  socket.on('passport_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('passport_status_result', passport.getStatus(p));
  });

  // ── v1.76: 오라 ──
  socket.on('aura_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('aura_status_result', aura.getStatus(p));
  });
  socket.on('aura_activate', (auraId) => {
    const p = players[playerId]; if (!p) return;
    const result = aura.setActive(p, auraId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('aura_result', result);
  });

  // ── v1.75: 통합 대시보드 ──
  socket.on('dashboard_full', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('dashboard_full_result', dashboard.buildDashboard(p));
  });
  socket.on('dashboard_summary', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('dashboard_summary_result', dashboard.getCompactSummary(p));
  });

  // ── v1.74: 여관 ──
  socket.on('inn_status', () => {
    const p = players[playerId]; if (!p) return;
    const z = getZone(p.x, p.y);
    socket.emit('inn_status_result', inn.getStatus(p, z?.id));
  });
  socket.on('inn_checkin', (hours) => {
    const p = players[playerId]; if (!p) return;
    const z = getZone(p.x, p.y);
    const result = inn.checkIn(p, z?.id, Number(hours) || 1);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('inn_result', result);
  });

  // ── v1.73: 영토 ──
  socket.on('territory_status', () => {
    const p = players[playerId];
    socket.emit('territory_status_result', territory.getStatus(p?.clanName));
  });
  socket.on('territory_claim', (zoneId) => {
    const p = players[playerId];
    if (!p || !p.clanName) {
      socket.emit('territory_result', { success: false, msg: '길드 소속 필요' });
      return;
    }
    const myClan = clans[p.clanName];
    if (!myClan || myClan.leader !== p.id) {
      socket.emit('territory_result', { success: false, msg: '길드 리더만 점유 가능' });
      return;
    }
    const result = territory.claimTerritory(p.clanName, p.gold || 0, zoneId);
    if (result.success) {
      if (result.cost > 0 && p.gold >= result.cost) p.gold -= result.cost; else p.gold = 0;
      savePlayer(p);
      io.emit('player_update', p);
      io.emit('server_msg', {
        msg: `[영토] ${p.clanName} 길드가 ${zoneId} 영토 점유!`,
        type: 'rare',
      });
    }
    socket.emit('territory_result', result);
  });

  // ── v1.72: 도면 ──
  socket.on('blueprint_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('blueprint_status_result', blueprint.getStatus(p));
  });
  socket.on('blueprint_craft', (blueprintId) => {
    const p = players[playerId]; if (!p) return;
    const result = blueprint.craftFromBlueprint(p, blueprintId);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      io.emit('server_msg', {
        msg: `[도면 제작] ${p.displayName}이(가) ${result.resultName}을(를) 제작했습니다!`,
        type: 'rare',
      });
    }
    socket.emit('blueprint_result', result);
  });

  // ── v1.71: 계약 ──
  socket.on('contracts_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('contracts_status_result', contracts.getStatus(p));
  });
  socket.on('contracts_accept', (contractId) => {
    const p = players[playerId]; if (!p) return;
    const result = contracts.acceptContract(p, contractId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('contracts_result', result);
  });
  socket.on('contracts_abandon', (contractId) => {
    const p = players[playerId]; if (!p) return;
    const result = contracts.abandonContract(p, contractId);
    if (result.success) savePlayer(p);
    socket.emit('contracts_result', result);
  });

  // ── v1.70: 서버 뉴스 ──
  socket.on('news_feed', (filter) => {
    socket.emit('news_feed_result', {
      feed: newsBoard.getFeed(filter || {}),
      categories: newsBoard.NEWS_CATEGORIES,
      stats: newsBoard.getCategoryStats(),
    });
  });
  socket.on('news_highlights', () => {
    socket.emit('news_highlights_result', newsBoard.getRecentHighlights(10));
  });

  // ── v1.69: 신의 축복 ──
  socket.on('blessing_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('blessing_status_result', blessing.getStatus(p));
  });
  socket.on('blessing_choose', (deityId) => {
    const p = players[playerId]; if (!p) return;
    const result = blessing.chooseDeity(p, deityId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('blessing_result', result);
  });
  socket.on('blessing_pray', () => {
    const p = players[playerId]; if (!p) return;
    const result = blessing.pray(p);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('blessing_result', result);
  });

  // ── v1.68: 도서관 ──
  socket.on('library_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('library_status_result', library.getStatus(p));
  });
  socket.on('library_read', (bookId) => {
    const p = players[playerId]; if (!p) return;
    const result = library.readBook(p, bookId);
    if (result.success) {
      if (wisdom && wisdom.gainWisdom) wisdom.gainWisdom(p, 'book_read');
      savePlayer(p); io.emit('player_update', p);
    }
    socket.emit('library_result', result);
  });

  // ── v1.67: 던전 열쇠 ──
  socket.on('dungeon_keys_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('dungeon_keys_status_result', dungeonKeys.getStatus(p));
  });

  // ── v1.66: 잭팟 복권 ──
  socket.on('jackpot_status', () => {
    const p = players[playerId];
    socket.emit('jackpot_status_result', lotteryJackpot.getStatus(p?.id));
  });
  socket.on('jackpot_buy', (data) => {
    const p = players[playerId]; if (!p) return;
    const count = Math.min(100, Math.max(1, Math.floor((data && Number(data.count)) || 1)));
    const currency = (data && data.currency === 'diamond') ? 'diamond' : 'gold';
    const result = lotteryJackpot.buyTickets(p, count, currency);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.currentJackpot >= 1000000) {
        io.emit('server_msg', {
          msg: `💰 잭팟 ${result.currentJackpot.toLocaleString()}G 돌파!`,
          type: 'rare',
        });
      }
    }
    socket.emit('jackpot_result', result);
  });

  // ── v1.65: 칭호 컬렉션 ──
  socket.on('title_collection_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('title_collection_status_result', titleCollection.getStatus(p));
  });

  // ── v1.64: 길드 전쟁 ──
  socket.on('guild_war_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('guild_war_status_result', guildWar.getStatus(p.clanName));
  });
  socket.on('guild_war_declare', (defenderGuild) => {
    const p = players[playerId];
    if (!p || !p.clanName) {
      socket.emit('guild_war_result', { success: false, msg: '길드 소속 필요' });
      return;
    }
    const myClan = clans[p.clanName];
    if (!myClan || myClan.leader !== p.id) {
      socket.emit('guild_war_result', { success: false, msg: '길드 리더만 선전포고 가능' });
      return;
    }
    const result = guildWar.declareWar(p.clanName, defenderGuild, p.gold || 0);
    if (result.success) {
      if (result.cost > 0 && p.gold >= result.cost) p.gold -= result.cost; else p.gold = 0;
      savePlayer(p);
      io.emit('player_update', p);
      io.emit('server_msg', {
        msg: `[전쟁] ${p.clanName} 길드가 ${defenderGuild} 길드에 선전포고!`,
        type: 'rare',
      });
    }
    socket.emit('guild_war_result', result);
  });

  // ── v1.63: PvP 토너먼트 ──
  socket.on('tournament_status', () => {
    socket.emit('tournament_status_result', pvpTournament.getStatus());
  });
  socket.on('tournament_register', () => {
    const p = players[playerId]; if (!p) return;
    const result = pvpTournament.register(p);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      io.emit('server_msg', {
        msg: `[토너먼트] ${p.displayName} 참가 (${result.position}/16)`,
        type: 'normal',
      });
    }
    socket.emit('tournament_result', result);
  });

  // ── v1.62: 지혜 ──
  socket.on('wisdom_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('wisdom_status_result', wisdom.getStatus(p));
  });
}

module.exports = { registerMiscHandlers };

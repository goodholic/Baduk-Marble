// 서버 대전쟁 & 진영 시스템 — v3.7
function registerServerWarHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  const FACTIONS = {
    light:  { name: '빛의 군단',   color: '#FFD700', bonus: 'DEF+10%' },
    dark:   { name: '어둠의 결사', color: '#8B0000', bonus: 'ATK+10%' },
    nature: { name: '자연의 수호', color: '#228B22', bonus: 'HP+15%' },
    chaos:  { name: '혼돈의 사도', color: '#8B008B', bonus: 'CRIT+12%' },
  };

  // 진영 전쟁 상태 (서버 싱글톤)
  if (!ctx.serverWar) {
    ctx.serverWar = {
      active: false,
      phase: 0,
      factions: { light: { members: 0, resources: 0, territory: 0 }, dark: { members: 0, resources: 0, territory: 0 }, nature: { members: 0, resources: 0, territory: 0 }, chaos: { members: 0, resources: 0, territory: 0 } },
      alliances: [],
      startTime: null,
    };
  }

  // 진영 선택
  socket.on('war_join_faction', (data) => {
    const p = players[playerId];
    if (!p || !data?.faction) return;
    if (!FACTIONS[data.faction]) return;
    if ((p.level || 1) < 15) { socket.emit('war_error', { reason: 'level_15_required' }); return; }
    if (p.warFaction) { socket.emit('war_error', { reason: 'already_joined' }); return; }

    p.warFaction = data.faction;
    ctx.serverWar.factions[data.faction].members++;
    savePlayer(p);

    socket.emit('war_faction_joined', { faction: data.faction, ...FACTIONS[data.faction] });
    io.emit('war_faction_update', ctx.serverWar.factions);
  });

  // 자원 기부 (자원전 단계)
  socket.on('war_contribute_resources', (data) => {
    const p = players[playerId];
    if (!p || !p.warFaction) return;
    const amount = Math.min(data?.amount || 0, p.gold || 0);
    if (amount <= 0) return;

    p.gold -= amount;
    ctx.serverWar.factions[p.warFaction].resources += amount;
    if (!p.warContribution) p.warContribution = 0;
    p.warContribution += amount;
    savePlayer(p);

    socket.emit('war_contributed', { amount, total: ctx.serverWar.factions[p.warFaction].resources, personal: p.warContribution });
  });

  // 영토 점령 (대전쟁 중)
  socket.on('war_capture_territory', (data) => {
    const p = players[playerId];
    if (!p || !p.warFaction || !data?.territoryId) return;
    if (!ctx.serverWar.active) { socket.emit('war_error', { reason: 'war_not_active' }); return; }

    ctx.serverWar.factions[p.warFaction].territory++;
    if (!p.warCaptures) p.warCaptures = 0;
    p.warCaptures++;
    savePlayer(p);

    io.emit('war_territory_captured', {
      territoryId: data.territoryId,
      faction: p.warFaction,
      capturedBy: p.name,
      factionTerritories: ctx.serverWar.factions[p.warFaction].territory,
    });
  });

  // 동맹 제안 (2진영 vs 2진영)
  socket.on('war_propose_alliance', (data) => {
    const p = players[playerId];
    if (!p || !p.warFaction || !data?.targetFaction) return;
    if (p.warFaction === data.targetFaction) return;

    io.emit('war_alliance_proposed', {
      from: p.warFaction,
      to: data.targetFaction,
      proposerName: p.name,
    });
  });

  // 동맹 수락
  socket.on('war_accept_alliance', (data) => {
    const p = players[playerId];
    if (!p || !p.warFaction || !data?.fromFaction) return;

    ctx.serverWar.alliances.push({ a: data.fromFaction, b: p.warFaction, time: Date.now() });
    io.emit('war_alliance_formed', {
      factions: [data.fromFaction, p.warFaction],
      message: `${FACTIONS[data.fromFaction].name}과 ${FACTIONS[p.warFaction].name}이 동맹을 맺었습니다!`,
    });
  });

  // 전쟁 상태 조회
  socket.on('war_status', () => {
    const p = players[playerId];
    socket.emit('war_status', {
      ...ctx.serverWar,
      myFaction: p?.warFaction || null,
      myContribution: p?.warContribution || 0,
      myCaptures: p?.warCaptures || 0,
    });
  });

  // 전쟁 시작 (관리자 or 자동)
  socket.on('war_start', () => {
    ctx.serverWar.active = true;
    ctx.serverWar.phase = 5;
    ctx.serverWar.startTime = Date.now();
    io.emit('war_started', { message: '서버 대전쟁이 시작되었습니다! 영토를 점령하세요!', factions: ctx.serverWar.factions });
  });

  // 전쟁 종료 & 결과
  socket.on('war_end', () => {
    ctx.serverWar.active = false;
    ctx.serverWar.phase = 8;

    const sorted = Object.entries(ctx.serverWar.factions)
      .map(([k, v]) => ({ faction: k, ...v, ...FACTIONS[k] }))
      .sort((a, b) => b.territory - a.territory || b.resources - a.resources);

    const winner = sorted[0];

    // 승리 진영 보상
    for (const pid of Object.keys(players)) {
      const p = players[pid];
      if (!p || !p.warFaction) continue;
      if (p.warFaction === winner.faction) {
        p.gold = Math.min(999999999, (p.gold || 0) + 500000);
        if (!p.titles) p.titles = [];
        if (!p.titles.includes('war_victor')) p.titles.push('war_victor');
      } else {
        p.gold = Math.min(999999999, (p.gold || 0) + 50000);
      }
      // 개인 기여도 보상
      p.gold = Math.min(999999999, (p.gold || 0) + Math.floor((p.warContribution || 0) * 0.1));
      p.warFaction = null;
      p.warContribution = 0;
      p.warCaptures = 0;
      savePlayer(p);
    }

    io.emit('war_ended', { winner: winner.faction, winnerName: winner.name, rankings: sorted });

    // 리셋
    ctx.serverWar = {
      active: false, phase: 0,
      factions: { light: { members: 0, resources: 0, territory: 0 }, dark: { members: 0, resources: 0, territory: 0 }, nature: { members: 0, resources: 0, territory: 0 }, chaos: { members: 0, resources: 0, territory: 0 } },
      alliances: [], startTime: null,
    };
  });
}

module.exports = { registerServerWarHandlers };

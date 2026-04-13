// 공성전 매치 플로우 시스템 — v3.7
function registerSiegeMatchHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  // 공성전 매치 상태 관리
  if (!ctx.siegeMatches) ctx.siegeMatches = {};

  const SIEGE_PHASES = [
    { name: '선전포고',  duration: 0 },
    { name: '정찰',     duration: 60000 },      // 1분 (테스트용, 실제는 12시간)
    { name: '편성',     duration: 60000 },
    { name: '출정',     duration: 5000 },
    { name: '외성 전투', duration: 180000 },     // 3분
    { name: '내성 돌입', duration: 180000 },
    { name: '왕좌 공략', duration: 240000 },     // 4분
    { name: '결전 판정', duration: 0 },
    { name: '약탈',     duration: 60000 },
    { name: '결과',     duration: 0 },
  ];

  // 선전포고
  socket.on('siege_declare_war', (data) => {
    const p = players[playerId];
    if (!p || !data?.targetClanId) return;
    if (!p.clan) { socket.emit('siege_error', { reason: 'no_clan' }); return; }

    const matchId = `siege_${Date.now()}_${p.clan}`;
    const match = {
      id: matchId,
      attackerClan: p.clan,
      defenderClan: data.targetClanId,
      phase: 0,
      phaseStarted: Date.now(),
      attackerMercs: [],
      defenderTraps: {},
      defenderStructures: {},
      throneHP: 10000,
      morale: { attacker: 50, defender: 50 },
      log: [{ time: Date.now(), event: `${p.name}이(가) ${data.targetClanId}에 선전포고!` }],
    };
    ctx.siegeMatches[matchId] = match;

    io.emit('siege_war_declared', {
      matchId,
      attacker: p.clan,
      defender: data.targetClanId,
      declarerName: p.name,
    });
    socket.emit('siege_match_created', { matchId });
  });

  // 용병 편성
  socket.on('siege_set_lineup', (data) => {
    const p = players[playerId];
    if (!p || !data?.matchId || !data?.mercIds) return;
    const match = ctx.siegeMatches[data.matchId];
    if (!match) return;

    const mercs = (p.mercenaries || []).filter(m => data.mercIds.includes(m.id));
    const isAttacker = p.clan === match.attackerClan;
    const maxMercs = isAttacker ? 8 : 12;

    if (mercs.length > maxMercs) {
      socket.emit('siege_error', { reason: 'too_many_mercs', max: maxMercs });
      return;
    }

    if (isAttacker) {
      match.attackerMercs = mercs.map(m => ({ ...m, currentHP: m.star * 200 + (m.level || 1) * 50 }));
    } else {
      match.defenderMercs = mercs.map(m => ({ ...m, currentHP: m.star * 200 + (m.level || 1) * 50 }));
    }

    socket.emit('siege_lineup_set', { matchId: data.matchId, count: mercs.length, role: isAttacker ? 'attacker' : 'defender' });
  });

  // 함정/구조물 배치 (방어자)
  socket.on('siege_place_defense', (data) => {
    const p = players[playerId];
    if (!p || !data?.matchId || !data?.placements) return;
    const match = ctx.siegeMatches[data.matchId];
    if (!match || p.clan !== match.defenderClan) return;

    for (const placement of data.placements) {
      const key = `${placement.x}_${placement.y}`;
      if (placement.type === 'trap') {
        match.defenderTraps[key] = { trapType: placement.trapType, level: placement.level || 1, x: placement.x, y: placement.y };
      } else {
        match.defenderStructures[key] = { structType: placement.structType, hp: placement.hp || 2000, x: placement.x, y: placement.y };
      }
    }
    socket.emit('siege_defense_placed', { matchId: data.matchId, trapCount: Object.keys(match.defenderTraps).length, structCount: Object.keys(match.defenderStructures).length });
  });

  // 전투 시작
  socket.on('siege_start_battle', (data) => {
    if (!data?.matchId) return;
    const match = ctx.siegeMatches[data.matchId];
    if (!match) return;

    match.phase = 3; // 출정
    match.phaseStarted = Date.now();
    match.battleStarted = Date.now();

    io.emit('siege_battle_start', {
      matchId: data.matchId,
      attacker: match.attackerClan,
      defender: match.defenderClan,
      mapTheme: data.mapTheme || 'plains',
    });

    // 자동 페이즈 진행
    let totalDelay = 5000; // 출정 5초
    for (let i = 4; i <= 6; i++) { // 외성→내성→왕좌
      const phase = SIEGE_PHASES[i];
      setTimeout(() => {
        match.phase = i;
        match.phaseStarted = Date.now();
        io.emit('siege_phase_change', { matchId: data.matchId, phase: i, name: phase.name });
      }, totalDelay);
      totalDelay += phase.duration;
    }

    // 최종 판정 (10분 후)
    setTimeout(() => {
      endSiegeBattle(data.matchId);
    }, totalDelay);
  });

  // 왕좌 공격
  socket.on('siege_attack_throne', (data) => {
    if (!data?.matchId || !data?.damage) return;
    const match = ctx.siegeMatches[data.matchId];
    if (!match) return;

    match.throneHP = Math.max(0, match.throneHP - data.damage);
    match.log.push({ time: Date.now(), event: `왕좌 피격! HP: ${match.throneHP}` });

    io.emit('siege_throne_update', { matchId: data.matchId, throneHP: match.throneHP });

    if (match.throneHP <= 0) {
      endSiegeBattle(data.matchId, 'attacker');
    }
  });

  function endSiegeBattle(matchId, forcedWinner) {
    const match = ctx.siegeMatches[matchId];
    if (!match || match.ended) return;
    match.ended = true;

    const winner = forcedWinner || (match.throneHP <= 0 ? 'attacker' : 'defender');
    match.phase = 9;

    // 보상 분배
    const winnerClan = winner === 'attacker' ? match.attackerClan : match.defenderClan;
    const loserClan = winner === 'attacker' ? match.defenderClan : match.attackerClan;

    for (const pid of Object.keys(players)) {
      const p = players[pid];
      if (!p) continue;
      if (p.clan === winnerClan) {
        p.gold = Math.min(999999999, (p.gold || 0) + 100000);
        if (!p.siegeWins) p.siegeWins = 0;
        p.siegeWins++;
        savePlayer(p);
      }
    }

    io.emit('siege_battle_end', {
      matchId,
      winner,
      winnerClan,
      loserClan,
      throneHP: match.throneHP,
      duration: Date.now() - match.battleStarted,
      log: match.log.slice(-20),
    });

    // 정리
    setTimeout(() => { delete ctx.siegeMatches[matchId]; }, 60000);
  }

  // 매치 상태 조회
  socket.on('siege_match_info', (data) => {
    if (!data?.matchId) return;
    const match = ctx.siegeMatches[data.matchId];
    if (!match) { socket.emit('siege_error', { reason: 'not_found' }); return; }
    socket.emit('siege_match_info', {
      matchId: data.matchId,
      phase: match.phase,
      phaseName: SIEGE_PHASES[match.phase]?.name,
      throneHP: match.throneHP,
      morale: match.morale,
      attacker: match.attackerClan,
      defender: match.defenderClan,
    });
  });
}

module.exports = { registerSiegeMatchHandlers };

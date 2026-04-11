// 공성전 IO 전투 — v3.0
// 도전자: 상하좌우 이동 + 오토배틀로 성 돌파
// 성주: 함정+용병 사전 배치 (타워디펜스)
// 왕좌 도달 = 도전자 승리, 시간초과/사망 = 성주 승리

const SIEGE_BATTLE_CONFIG = {
  mapWidth: 20,
  mapHeight: 15,
  timeLimit: 300,        // 5분
  attackerStartPos: { x: 10, y: 0 },
  thronePos: { x: 10, y: 14 },
  moveSpeed: 0.5,        // 틱당 이동
  autoAttackRange: 2,
  autoAttackCd: 800,
};

const activeSieges = {};

// 공성전 시작
function startSiegeBattle(attackerId, defenderId, players, io) {
  const attacker = players[attackerId];
  const defender = players[defenderId];
  if (!attacker || !defender) return { success: false, msg: '플레이어 없음' };
  if (!defender._castle) return { success: false, msg: '상대에게 성이 없습니다' };

  // 공격자 쿨다운 체크
  if (attacker._lastSiege && Date.now() - attacker._lastSiege < 3600000) {
    return { success: false, msg: '공성 쿨다운 중 (1시간)' };
  }

  const siegeId = 'siege_' + Date.now();
  const castle = defender._castle;

  // 공격자 캐릭터 (IO 방식 — 오토배틀)
  const mercSystem = require('./mercenary_system');
  const atkMercs = mercSystem.getPlayerMercs(attacker);
  const partyMercs = atkMercs.roster.filter(m => atkMercs.party.includes(m.uid));

  // 공격자 스탯 (본인 + 파티 용병 합산)
  let totalAtk = attacker.atk || 25;
  let totalDef = attacker.def || 10;
  let totalHp = attacker.maxHp || 200;
  for (const m of partyMercs) {
    totalAtk += Math.floor(m.atk * 0.3); // 용병 스탯의 30% 추가
    totalDef += Math.floor(m.def * 0.2);
    totalHp += Math.floor(m.hp * 0.2);
  }

  activeSieges[siegeId] = {
    id: siegeId,
    attackerId, defenderId,
    attackerName: attacker.displayName || attacker.className,
    defenderName: defender.displayName || defender.className,

    // 공격자 상태
    attacker: {
      x: SIEGE_BATTLE_CONFIG.attackerStartPos.x,
      y: SIEGE_BATTLE_CONFIG.attackerStartPos.y,
      hp: totalHp, maxHp: totalHp,
      atk: totalAtk, def: totalDef,
      alive: true,
      partyIcons: partyMercs.map(m => m.icon).join(''),
    },

    // 방어측 (함정 + 용병)
    traps: (castle.traps || []).map(t => ({ ...t, triggered: false })),
    defenders: (castle.defenders || []).map(d => ({ ...d, hp: d.hp, alive: true, lastAttack: 0 })),

    // 상태
    phase: 'active',
    startTime: Date.now(),
    elapsed: 0,
    result: null,
  };

  attacker._lastSiege = Date.now();

  if (io) {
    io.to(attackerId).emit('siege_battle_start', {
      siegeId, role: 'attacker',
      map: { w: SIEGE_BATTLE_CONFIG.mapWidth, h: SIEGE_BATTLE_CONFIG.mapHeight },
      traps: activeSieges[siegeId].traps.map(t => ({ icon: '?', x: t.x, y: t.y })), // 함정 위치는 보여주되 종류는 숨김
      defenders: activeSieges[siegeId].defenders.map(d => ({ icon: d.icon, name: d.name, x: d.x, y: d.y, hp: d.hp })),
      attacker: activeSieges[siegeId].attacker,
      timeLimit: SIEGE_BATTLE_CONFIG.timeLimit,
    });
    io.to(defenderId).emit('siege_battle_start', {
      siegeId, role: 'defender',
      map: { w: SIEGE_BATTLE_CONFIG.mapWidth, h: SIEGE_BATTLE_CONFIG.mapHeight },
      traps: activeSieges[siegeId].traps, // 성주는 전부 보임
      defenders: activeSieges[siegeId].defenders,
      attacker: activeSieges[siegeId].attacker,
      timeLimit: SIEGE_BATTLE_CONFIG.timeLimit,
    });
    io.emit('server_msg', { msg: '🏰 공성전! ' + (attacker.displayName||'') + ' → ' + (defender.displayName||'') + '의 성!', type: 'boss' });
  }

  // 틱 시작
  const tickInterval = setInterval(() => {
    const result = tickSiegeBattle(siegeId, io);
    if (!result || result.ended) clearInterval(tickInterval);
  }, 500);

  return { success: true, siegeId };
}

// 공성전 틱 (0.5초마다)
function tickSiegeBattle(siegeId, io) {
  const siege = activeSieges[siegeId];
  if (!siege || siege.phase !== 'active') return { ended: true };

  siege.elapsed = Math.floor((Date.now() - siege.startTime) / 1000);

  // 시간 초과 → 성주 승리
  if (siege.elapsed >= SIEGE_BATTLE_CONFIG.timeLimit) {
    return endSiegeBattle(siegeId, 'defender', '시간 초과', io);
  }

  const atk = siege.attacker;
  if (!atk.alive) return endSiegeBattle(siegeId, 'defender', '공격자 사망', io);

  // 함정 체크 (공격자 위치와 겹치면 발동)
  for (const trap of siege.traps) {
    if (trap.triggered) continue;
    if (Math.abs(atk.x - trap.x) < 1.5 && Math.abs(atk.y - trap.y) < 1.5) {
      trap.triggered = true;
      let msg = trap.icon + ' ' + trap.name + '!';
      if (trap.dmg) { atk.hp -= trap.dmg; msg += ' -' + trap.dmg + 'HP'; }
      if (trap.stun) msg += ' ' + trap.stun + '초 빙결!';
      if (trap.dot) msg += ' 독 ' + trap.dur + '초!';
      if (io) io.to(siege.attackerId).emit('siege_trap_triggered', { trap, msg, hp: atk.hp });
      if (atk.hp <= 0) { atk.alive = false; return endSiegeBattle(siegeId, 'defender', '함정으로 사망', io); }
    }
  }

  // 방어 용병 전투 (자동)
  const now = Date.now();
  for (const def of siege.defenders) {
    if (!def.alive) continue;
    const dx = atk.x - def.x, dy = atk.y - def.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < SIEGE_BATTLE_CONFIG.autoAttackRange && now - def.lastAttack > SIEGE_BATTLE_CONFIG.autoAttackCd) {
      def.lastAttack = now;
      // 방어 용병 공격
      const dmg = Math.max(1, def.atk - Math.floor(atk.def * 0.3));
      atk.hp -= dmg;

      // 공격자 반격 (오토배틀)
      const atkDmg = Math.max(1, atk.atk - Math.floor(def.def * 0.3));
      def.hp -= atkDmg;
      if (def.hp <= 0) def.alive = false;

      if (atk.hp <= 0) { atk.alive = false; return endSiegeBattle(siegeId, 'defender', '방어 용병에게 패배', io); }
    }
  }

  // 왕좌 도달 체크
  if (Math.abs(atk.x - SIEGE_BATTLE_CONFIG.thronePos.x) < 1.5 &&
      Math.abs(atk.y - SIEGE_BATTLE_CONFIG.thronePos.y) < 1.5) {
    return endSiegeBattle(siegeId, 'attacker', '왕좌 점령!', io);
  }

  // 상태 브로드캐스트 (1초마다)
  if (siege.elapsed % 1 === 0 && io) {
    const status = {
      siegeId, elapsed: siege.elapsed,
      remaining: SIEGE_BATTLE_CONFIG.timeLimit - siege.elapsed,
      attacker: { x: atk.x, y: atk.y, hp: atk.hp, maxHp: atk.maxHp },
      defenders: siege.defenders.map(d => ({ x: d.x, y: d.y, hp: d.hp, alive: d.alive, icon: d.icon })),
      trapsTriggered: siege.traps.filter(t => t.triggered).length,
    };
    io.to(siege.attackerId).emit('siege_battle_update', status);
    io.to(siege.defenderId).emit('siege_battle_update', status);
  }

  return {};
}

// 공격자 이동 (상하좌우)
function siegeMove(siegeId, dx, dy) {
  const siege = activeSieges[siegeId];
  if (!siege || siege.phase !== 'active') return;
  const atk = siege.attacker;
  if (!atk.alive) return;

  atk.x = Math.max(0, Math.min(SIEGE_BATTLE_CONFIG.mapWidth, atk.x + dx * SIEGE_BATTLE_CONFIG.moveSpeed));
  atk.y = Math.max(0, Math.min(SIEGE_BATTLE_CONFIG.mapHeight, atk.y + dy * SIEGE_BATTLE_CONFIG.moveSpeed));
}

function endSiegeBattle(siegeId, winner, reason, io) {
  const siege = activeSieges[siegeId];
  if (!siege) return { ended: true };

  siege.phase = 'ended';
  siege.result = { winner, reason };

  const isAttackerWin = winner === 'attacker';

  if (io) {
    const result = {
      siegeId, winner,
      winnerName: isAttackerWin ? siege.attackerName : siege.defenderName,
      loserName: isAttackerWin ? siege.defenderName : siege.attackerName,
      reason, elapsed: siege.elapsed,
      trapsTriggered: siege.traps.filter(t => t.triggered).length,
      defendersKilled: siege.defenders.filter(d => !d.alive).length,
    };

    io.to(siege.attackerId).emit('siege_battle_end', { ...result, role: 'attacker' });
    io.to(siege.defenderId).emit('siege_battle_end', { ...result, role: 'defender' });
    io.emit('server_msg', {
      msg: '🏰 공성전 ' + (isAttackerWin ? '함락!' : '방어 성공!') + ' ' + result.winnerName + ' 승리! (' + reason + ')',
      type: 'boss'
    });
  }

  // 보상 처리는 호출자에서
  setTimeout(() => delete activeSieges[siegeId], 10000);
  return { ended: true, ...siege.result };
}

function registerSiegeBattleHandlers(socket, playerId, players, io) {
  // 공성전 신청
  socket.on('siege_attack', (targetName) => {
    const target = Object.entries(players).find(([, p]) => p.displayName === targetName);
    if (!target) { socket.emit('siege_result', { success: false, msg: '대상 없음' }); return; }
    const result = startSiegeBattle(playerId, target[0], players, io);
    socket.emit('siege_result', result);
  });

  // 공성전 이동 (공격자)
  socket.on('siege_battle_move', (data) => {
    // 현재 참가 중인 공성전 찾기
    for (const [siegeId, siege] of Object.entries(activeSieges)) {
      if (siege.attackerId === playerId && siege.phase === 'active') {
        siegeMove(siegeId, data.dx || 0, data.dy || 0);
        break;
      }
    }
  });
}

module.exports = { startSiegeBattle, siegeMove, registerSiegeBattleHandlers };

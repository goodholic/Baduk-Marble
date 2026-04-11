// 친구 대전 시스템 — v2.58
// 1:1 친선 대전, 관전 모드, 베팅 대전

const DUEL_CONFIG = {
  timeLimit: 120, // 2분
  spectatorDelay: 3, // 3초 딜레이 관전
  betMin: 100,
  betMax: 50000,
};

let activeDuels = {};
let duelIdCounter = 0;

function challengeFriend(challenger, targetId, players, io, betAmount) {
  const target = players[targetId];
  if (!target) return { success: false, msg: '상대를 찾을 수 없습니다' };
  if (!target.isAlive || !challenger.isAlive) return { success: false, msg: '양쪽 모두 생존 상태여야 합니다' };
  if (challenger.level < 5 || target.level < 5) return { success: false, msg: 'Lv.5 이상만 대전 가능' };

  const bet = Math.max(0, Math.min(DUEL_CONFIG.betMax, parseInt(betAmount) || 0));
  if (bet > 0) {
    if ((challenger.gold || 0) < bet) return { success: false, msg: '골드가 부족합니다' };
    if ((target.gold || 0) < bet) return { success: false, msg: '상대 골드가 부족합니다' };
  }

  const duelId = 'fduel_' + (++duelIdCounter);

  // 상대에게 대전 신청 전송
  io.to(targetId).emit('friend_duel_request', {
    duelId,
    challengerName: challenger.displayName || challenger.className,
    challengerLevel: challenger.level,
    challengerClass: challenger.className,
    bet,
  });

  // 30초 대기
  activeDuels[duelId] = {
    challengerId: challenger.id || Object.keys(players).find(k => players[k] === challenger),
    targetId,
    bet,
    status: 'pending',
    spectators: [],
    createdAt: Date.now(),
  };

  setTimeout(() => {
    if (activeDuels[duelId] && activeDuels[duelId].status === 'pending') {
      delete activeDuels[duelId];
      io.to(targetId).emit('friend_duel_expired', { duelId });
    }
  }, 30000);

  return { success: true, msg: '대전 신청! 상대의 수락을 기다리는 중...', duelId };
}

function acceptDuel(duelId, players, io) {
  const duel = activeDuels[duelId];
  if (!duel || duel.status !== 'pending') return { success: false, msg: '유효하지 않은 대전' };

  const challenger = players[duel.challengerId];
  const target = players[duel.targetId];
  if (!challenger || !target) { delete activeDuels[duelId]; return { success: false, msg: '플레이어 이탈' }; }

  // 베팅 차감
  if (duel.bet > 0) {
    challenger.gold -= duel.bet;
    target.gold -= duel.bet;
  }

  duel.status = 'active';
  duel.startTime = Date.now();

  // HP 저장 + 풀 회복
  duel.challengerOrigHp = challenger.hp;
  duel.targetOrigHp = target.hp;
  challenger.hp = challenger.maxHp;
  target.hp = target.maxHp;

  // PvP 모드 전환
  challenger._friendDuel = duelId;
  target._friendDuel = duelId;

  io.to(duel.challengerId).emit('friend_duel_start', {
    duelId, opponent: target.displayName, opponentClass: target.className, opponentLevel: target.level, bet: duel.bet,
  });
  io.to(duel.targetId).emit('friend_duel_start', {
    duelId, opponent: challenger.displayName, opponentClass: challenger.className, opponentLevel: challenger.level, bet: duel.bet,
  });
  io.emit('server_msg', { msg: '⚔️ [친구 대전] ' + challenger.displayName + ' vs ' + target.displayName + (duel.bet > 0 ? ' (베팅: ' + duel.bet + 'G)' : ''), type: 'normal' });

  // 2분 타임아웃
  setTimeout(() => {
    if (activeDuels[duelId] && activeDuels[duelId].status === 'active') {
      endDuel(duelId, null, players, io, '시간 초과');
    }
  }, DUEL_CONFIG.timeLimit * 1000);

  return { success: true };
}

function endDuel(duelId, winnerId, players, io, reason) {
  const duel = activeDuels[duelId];
  if (!duel) return;

  const challenger = players[duel.challengerId];
  const target = players[duel.targetId];

  // 승자 결정 (winnerId가 없으면 HP 비율로)
  if (!winnerId && challenger && target) {
    const hp1 = challenger.hp / challenger.maxHp;
    const hp2 = target.hp / target.maxHp;
    winnerId = hp1 >= hp2 ? duel.challengerId : duel.targetId;
  }

  const loserId = winnerId === duel.challengerId ? duel.targetId : duel.challengerId;
  const winner = players[winnerId];
  const loser = players[loserId];

  // 베팅 정산
  if (duel.bet > 0 && winner) {
    winner.gold = (winner.gold || 0) + duel.bet * 2;
  }

  // HP 복원
  if (challenger) { challenger.hp = challenger.maxHp; delete challenger._friendDuel; }
  if (target) { target.hp = target.maxHp; delete target._friendDuel; }

  const result = {
    duelId, winnerId, loserId,
    winnerName: winner?.displayName || '?',
    loserName: loser?.displayName || '?',
    bet: duel.bet,
    reason: reason || 'KO',
  };

  io.to(duel.challengerId).emit('friend_duel_end', result);
  io.to(duel.targetId).emit('friend_duel_end', result);
  duel.spectators.forEach(sid => io.to(sid).emit('friend_duel_end', result));

  io.emit('server_msg', {
    msg: '⚔️ [친구 대전] ' + result.winnerName + ' 승리!' + (duel.bet > 0 ? ' (+' + duel.bet * 2 + 'G)' : '') + ' (' + result.reason + ')',
    type: 'normal'
  });

  delete activeDuels[duelId];
}

function spectate(duelId, spectatorId) {
  const duel = activeDuels[duelId];
  if (!duel || duel.status !== 'active') return { success: false, msg: '관전할 대전이 없습니다' };
  if (!duel.spectators.includes(spectatorId)) duel.spectators.push(spectatorId);
  return { success: true, msg: '관전 시작!' };
}

function registerFriendDuelHandlers(socket, playerId, players, io) {
  socket.on('friend_duel_challenge', (data) => {
    const p = players[playerId];
    if (!p) return;
    const targetName = data?.targetName;
    const target = Object.values(players).find(pp => pp.displayName === targetName && pp.id !== playerId);
    if (!target) { socket.emit('minigame_result', { success: false, msg: '플레이어를 찾을 수 없습니다' }); return; }
    const targetId = Object.keys(players).find(k => players[k] === target);
    const result = challengeFriend(p, targetId, players, io, data?.bet || 0);
    socket.emit('minigame_result', result);
  });

  socket.on('friend_duel_accept', (duelId) => {
    const result = acceptDuel(duelId, players, io);
    if (!result.success) socket.emit('minigame_result', result);
  });

  socket.on('friend_duel_decline', (duelId) => {
    if (activeDuels[duelId]) {
      const duel = activeDuels[duelId];
      io.to(duel.challengerId).emit('minigame_result', { success: false, msg: '대전이 거절되었습니다' });
      delete activeDuels[duelId];
    }
  });

  socket.on('friend_duel_spectate', (duelId) => {
    const result = spectate(duelId, playerId);
    socket.emit('minigame_result', result);
  });
}

module.exports = { registerFriendDuelHandlers, endDuel, activeDuels };

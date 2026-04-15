// ============================================
// 실시간 카드 교환 — 플레이어 간 직접 거래
// ============================================

const TRADE_TIMEOUT = 120000; // 2분 타임아웃
const MAX_CARDS_PER_TRADE = 5;
const MAX_GOLD_PER_TRADE = 50000;
const BASE_FEE_RATE = 0.02; // 기본 2% 수수료
const GOOD_REP_FEE_RATE = 0.01; // 좋은 평판 1%
const GOOD_REP_THRESHOLD = 20; // 성공 20건 이상이면 할인
const HISTORY_MAX = 20;

const activeTrades = {}; // { tradeId: TradeSession }

// ── 유틸 ─────────────────────────────────────
function getPlayerId(player) {
  return player.id || player.deviceId || 'unknown';
}

function generateTradeId() {
  return `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 카드가 farm / fortress / party 에 배치 중인지 확인 */
function isCardDeployed(player, cardId) {
  // 농장 배치
  if (player.farm) {
    for (const slot of Object.values(player.farm)) {
      if (slot && slot.cardId === cardId) return '농장';
    }
  }
  // 요새 수비대
  if (player.fortress && player.fortress.defenders) {
    for (const def of Object.values(player.fortress.defenders)) {
      if (def && def.cardId === cardId) return '요새';
    }
  }
  // IO 파티
  if (player.ioParty && player.ioParty.includes(cardId)) return '파티';
  if (player.party && player.party.includes(cardId)) return '파티';
  return null;
}

/** IO 매치 중인지 확인 */
function isInIOMatch(player) {
  // io_match_manager 의 currentMatch.players 에 소켓이 있으면 매치 중
  // 간접적으로 player 플래그 사용
  if (player._ioMatchActive) return true;
  if (player._currentIOMatchId) return true;
  return false;
}

/** 플레이어가 카드를 소유하고 있는지 확인 */
function ownsCard(player, cardId) {
  return (player.cards || []).some(c => c.id === cardId);
}

/** 거래 수수료율 산출 */
function getFeeRate(player) {
  const rep = getTradeReputation(player);
  return rep.feeRate;
}

// ── 거래 세션 구조 ───────────────────────────
function createTradeSession(initiator, target) {
  const initiatorId = getPlayerId(initiator);
  const targetId = getPlayerId(target);

  return {
    id: generateTradeId(),
    initiator: {
      id: initiatorId,
      name: initiator.displayName || initiator.name || '???',
      cardIds: [],
      gold: 0,
      confirmed: false,
    },
    target: {
      id: targetId,
      name: target.displayName || target.name || '???',
      cardIds: [],
      gold: 0,
      confirmed: false,
    },
    status: 'pending',    // pending → active → completed / cancelled / expired
    createdAt: Date.now(),
    expiresAt: Date.now() + TRADE_TIMEOUT,
    completedAt: null,
  };
}

// ── 교환 요청 ────────────────────────────────
function requestTrade(initiator, targetName, allPlayers) {
  const initiatorId = getPlayerId(initiator);

  // IO 매치 중이면 거래 불가
  if (isInIOMatch(initiator)) {
    return { ok: false, reason: 'IO 매치 중에는 거래할 수 없습니다' };
  }

  // 이미 진행 중인 거래가 있으면 불가
  const existing = Object.values(activeTrades).find(
    t => (t.initiator.id === initiatorId || t.target.id === initiatorId)
      && (t.status === 'pending' || t.status === 'active')
  );
  if (existing) {
    return { ok: false, reason: '이미 진행 중인 거래가 있습니다' };
  }

  // 대상 플레이어 찾기
  const target = Object.values(allPlayers).find(p => {
    const name = p.displayName || p.name || '';
    return name === targetName && getPlayerId(p) !== initiatorId;
  });
  if (!target) {
    return { ok: false, reason: `플레이어 "${targetName}"을(를) 찾을 수 없습니다` };
  }

  const targetId = getPlayerId(target);

  // 대상도 IO 매치 중이면 불가
  if (isInIOMatch(target)) {
    return { ok: false, reason: '상대방이 IO 매치 중입니다' };
  }

  // 대상도 다른 거래 중이면 불가
  const targetBusy = Object.values(activeTrades).find(
    t => (t.initiator.id === targetId || t.target.id === targetId)
      && (t.status === 'pending' || t.status === 'active')
  );
  if (targetBusy) {
    return { ok: false, reason: '상대방이 다른 거래 중입니다' };
  }

  const trade = createTradeSession(initiator, target);
  activeTrades[trade.id] = trade;

  // 타임아웃 자동 취소
  trade._timeout = setTimeout(() => {
    if (activeTrades[trade.id] && (trade.status === 'pending' || trade.status === 'active')) {
      trade.status = 'expired';
      delete activeTrades[trade.id];
    }
  }, TRADE_TIMEOUT);

  return { ok: true, tradeId: trade.id, trade: sanitizeTrade(trade), targetId };
}

// ── 거래 수락 (대상이 pending 상태에서 수락) ──
function acceptTrade(player, tradeId) {
  const trade = activeTrades[tradeId];
  if (!trade) return { ok: false, reason: '거래를 찾을 수 없습니다' };

  const playerId = getPlayerId(player);
  if (trade.target.id !== playerId) return { ok: false, reason: '거래 대상이 아닙니다' };
  if (trade.status !== 'pending') return { ok: false, reason: '수락 가능한 상태가 아닙니다' };

  if (isInIOMatch(player)) {
    return { ok: false, reason: 'IO 매치 중에는 거래할 수 없습니다' };
  }

  trade.status = 'active';
  return { ok: true, tradeId, trade: sanitizeTrade(trade) };
}

// ── 거래 거절 ────────────────────────────────
function declineTrade(player, tradeId) {
  const trade = activeTrades[tradeId];
  if (!trade) return { ok: false, reason: '거래를 찾을 수 없습니다' };

  const playerId = getPlayerId(player);
  if (trade.target.id !== playerId) return { ok: false, reason: '거래 대상이 아닙니다' };
  if (trade.status !== 'pending') return { ok: false, reason: '거절 가능한 상태가 아닙니다' };

  cleanupTrade(trade);
  trade.status = 'cancelled';
  return { ok: true, reason: '거래를 거절했습니다' };
}

// ── 카드/골드 제안 ───────────────────────────
function offerItems(player, tradeId, cardIds, gold) {
  const trade = activeTrades[tradeId];
  if (!trade) return { ok: false, reason: '거래를 찾을 수 없습니다' };
  if (trade.status !== 'active') return { ok: false, reason: '거래가 활성 상태가 아닙니다' };

  const playerId = getPlayerId(player);
  const side = getTradeSide(trade, playerId);
  if (!side) return { ok: false, reason: '이 거래의 참여자가 아닙니다' };

  // 제안 변경 시 양쪽 확인 리셋
  trade.initiator.confirmed = false;
  trade.target.confirmed = false;

  // 카드 유효성 검증
  const offeredCards = [];
  if (cardIds && cardIds.length > 0) {
    if (cardIds.length > MAX_CARDS_PER_TRADE) {
      return { ok: false, reason: `최대 ${MAX_CARDS_PER_TRADE}장까지 제안 가능` };
    }
    for (const cid of cardIds) {
      if (!ownsCard(player, cid)) {
        return { ok: false, reason: `소유하지 않은 카드입니다: ${cid}` };
      }
      const deployedAt = isCardDeployed(player, cid);
      if (deployedAt) {
        return { ok: false, reason: `배치 중인 카드는 거래 불가 (${deployedAt})` };
      }
      offeredCards.push(cid);
    }
  }

  // 골드 유효성 검증
  const offeredGold = Math.max(0, Math.min(gold || 0, MAX_GOLD_PER_TRADE));
  if (offeredGold > (player.gold || 0)) {
    return { ok: false, reason: `골드 부족 (보유: ${player.gold || 0}G)` };
  }

  // 제안 설정
  side.cardIds = offeredCards;
  side.gold = offeredGold;

  return { ok: true, trade: sanitizeTrade(trade) };
}

// ── 제안에서 카드 제거 ───────────────────────
function removeOffer(player, tradeId, cardId) {
  const trade = activeTrades[tradeId];
  if (!trade) return { ok: false, reason: '거래를 찾을 수 없습니다' };
  if (trade.status !== 'active') return { ok: false, reason: '거래가 활성 상태가 아닙니다' };

  const playerId = getPlayerId(player);
  const side = getTradeSide(trade, playerId);
  if (!side) return { ok: false, reason: '이 거래의 참여자가 아닙니다' };

  const idx = side.cardIds.indexOf(cardId);
  if (idx === -1) return { ok: false, reason: '제안에 해당 카드가 없습니다' };

  side.cardIds.splice(idx, 1);

  // 제안 변경 → 확인 리셋
  trade.initiator.confirmed = false;
  trade.target.confirmed = false;

  return { ok: true, trade: sanitizeTrade(trade) };
}

// ── 골드 제안 변경 ───────────────────────────
function updateGoldOffer(player, tradeId, gold) {
  const trade = activeTrades[tradeId];
  if (!trade) return { ok: false, reason: '거래를 찾을 수 없습니다' };
  if (trade.status !== 'active') return { ok: false, reason: '거래가 활성 상태가 아닙니다' };

  const playerId = getPlayerId(player);
  const side = getTradeSide(trade, playerId);
  if (!side) return { ok: false, reason: '이 거래의 참여자가 아닙니다' };

  const newGold = Math.max(0, Math.min(gold || 0, MAX_GOLD_PER_TRADE));
  if (newGold > (player.gold || 0)) {
    return { ok: false, reason: `골드 부족 (보유: ${player.gold || 0}G)` };
  }

  side.gold = newGold;

  // 제안 변경 → 확인 리셋
  trade.initiator.confirmed = false;
  trade.target.confirmed = false;

  return { ok: true, trade: sanitizeTrade(trade) };
}

// ── 확인 (양쪽 다 확인해야 완료) ─────────────
function confirmTrade(player, tradeId, allPlayers) {
  const trade = activeTrades[tradeId];
  if (!trade) return { ok: false, reason: '거래를 찾을 수 없습니다' };
  if (trade.status !== 'active') return { ok: false, reason: '거래가 활성 상태가 아닙니다' };

  const playerId = getPlayerId(player);
  const side = getTradeSide(trade, playerId);
  if (!side) return { ok: false, reason: '이 거래의 참여자가 아닙니다' };

  // 제안이 비어 있으면 확인 불가 (양쪽 다 최소 카드 1장 또는 골드 > 0)
  if (trade.initiator.cardIds.length === 0 && trade.initiator.gold === 0
    && trade.target.cardIds.length === 0 && trade.target.gold === 0) {
    return { ok: false, reason: '양쪽 모두 빈 제안입니다. 카드나 골드를 제안하세요' };
  }

  side.confirmed = true;

  // 양쪽 모두 확인 완료
  if (trade.initiator.confirmed && trade.target.confirmed) {
    // 실행 전 최종 검증
    const initiatorPlayer = findPlayerById(trade.initiator.id, allPlayers);
    const targetPlayer = findPlayerById(trade.target.id, allPlayers);

    if (!initiatorPlayer || !targetPlayer) {
      cleanupTrade(trade);
      trade.status = 'cancelled';
      return { ok: false, reason: '플레이어가 오프라인입니다' };
    }

    const result = executeTrade(trade, initiatorPlayer, targetPlayer);
    return result;
  }

  return { ok: true, msg: '확인 완료. 상대방의 확인을 기다리는 중...', trade: sanitizeTrade(trade) };
}

// ── 거래 취소 ────────────────────────────────
function cancelTrade(player, tradeId) {
  const trade = activeTrades[tradeId];
  if (!trade) return { ok: false, reason: '거래를 찾을 수 없습니다' };

  const playerId = getPlayerId(player);
  if (trade.initiator.id !== playerId && trade.target.id !== playerId) {
    return { ok: false, reason: '이 거래의 참여자가 아닙니다' };
  }

  if (trade.status === 'completed') {
    return { ok: false, reason: '이미 완료된 거래입니다' };
  }

  cleanupTrade(trade);
  trade.status = 'cancelled';

  // 취소 횟수 기록 (평판용)
  player._tradeCancels = (player._tradeCancels || 0) + 1;

  return { ok: true, reason: '거래가 취소되었습니다', cancelledBy: playerId };
}

// ── 거래 실행 ────────────────────────────────
function executeTrade(trade, initiatorPlayer, targetPlayer) {
  // 최종 소유권 + 배치 검증
  for (const cid of trade.initiator.cardIds) {
    if (!ownsCard(initiatorPlayer, cid)) {
      cleanupTrade(trade);
      trade.status = 'cancelled';
      return { ok: false, reason: `거래 실행 실패: 카드 소유 불일치 (${cid})` };
    }
    const dep = isCardDeployed(initiatorPlayer, cid);
    if (dep) {
      cleanupTrade(trade);
      trade.status = 'cancelled';
      return { ok: false, reason: `거래 실행 실패: 배치 중인 카드 (${dep})` };
    }
  }
  for (const cid of trade.target.cardIds) {
    if (!ownsCard(targetPlayer, cid)) {
      cleanupTrade(trade);
      trade.status = 'cancelled';
      return { ok: false, reason: `거래 실행 실패: 카드 소유 불일치 (${cid})` };
    }
    const dep = isCardDeployed(targetPlayer, cid);
    if (dep) {
      cleanupTrade(trade);
      trade.status = 'cancelled';
      return { ok: false, reason: `거래 실행 실패: 배치 중인 카드 (${dep})` };
    }
  }

  // 골드 검증
  if (trade.initiator.gold > (initiatorPlayer.gold || 0)) {
    cleanupTrade(trade);
    trade.status = 'cancelled';
    return { ok: false, reason: '거래 실행 실패: 골드 부족 (요청자)' };
  }
  if (trade.target.gold > (targetPlayer.gold || 0)) {
    cleanupTrade(trade);
    trade.status = 'cancelled';
    return { ok: false, reason: '거래 실행 실패: 골드 부족 (대상자)' };
  }

  // 수수료 계산 (골드에만 적용)
  const initiatorFeeRate = getFeeRate(initiatorPlayer);
  const targetFeeRate = getFeeRate(targetPlayer);
  const initiatorGoldFee = Math.floor(trade.initiator.gold * initiatorFeeRate);
  const targetGoldFee = Math.floor(trade.target.gold * targetFeeRate);

  // ── 카드 교환 실행 ──
  // 요청자 → 대상자 카드
  const initiatorGivenCards = [];
  for (const cid of trade.initiator.cardIds) {
    const cardIdx = initiatorPlayer.cards.findIndex(c => c.id === cid);
    if (cardIdx === -1) continue;
    const card = initiatorPlayer.cards.splice(cardIdx, 1)[0];
    initiatorGivenCards.push({ ...card });
    targetPlayer.cards.push(card);
  }

  // 대상자 → 요청자 카드
  const targetGivenCards = [];
  for (const cid of trade.target.cardIds) {
    const cardIdx = targetPlayer.cards.findIndex(c => c.id === cid);
    if (cardIdx === -1) continue;
    const card = targetPlayer.cards.splice(cardIdx, 1)[0];
    targetGivenCards.push({ ...card });
    initiatorPlayer.cards.push(card);
  }

  // ── 골드 교환 실행 (수수료 차감) ──
  // 요청자가 보내는 골드
  if (trade.initiator.gold > 0) {
    initiatorPlayer.gold = (initiatorPlayer.gold || 0) - trade.initiator.gold;
    targetPlayer.gold = (targetPlayer.gold || 0) + (trade.initiator.gold - initiatorGoldFee);
  }
  // 대상자가 보내는 골드
  if (trade.target.gold > 0) {
    targetPlayer.gold = (targetPlayer.gold || 0) - trade.target.gold;
    initiatorPlayer.gold = (initiatorPlayer.gold || 0) + (trade.target.gold - targetGoldFee);
  }

  // ── 거래 이력 기록 ──
  const historyEntry = {
    tradeId: trade.id,
    time: Date.now(),
    initiator: { id: trade.initiator.id, name: trade.initiator.name },
    target: { id: trade.target.id, name: trade.target.name },
    initiatorGave: {
      cards: initiatorGivenCards.map(c => ({ id: c.id, name: c.name, grade: c.grade, icon: c.icon })),
      gold: trade.initiator.gold,
      fee: initiatorGoldFee,
    },
    targetGave: {
      cards: targetGivenCards.map(c => ({ id: c.id, name: c.name, grade: c.grade, icon: c.icon })),
      gold: trade.target.gold,
      fee: targetGoldFee,
    },
  };

  // 양쪽 히스토리에 추가
  initiatorPlayer._tradeHistory = initiatorPlayer._tradeHistory || [];
  initiatorPlayer._tradeHistory.unshift(historyEntry);
  if (initiatorPlayer._tradeHistory.length > HISTORY_MAX) initiatorPlayer._tradeHistory.pop();

  targetPlayer._tradeHistory = targetPlayer._tradeHistory || [];
  targetPlayer._tradeHistory.unshift(historyEntry);
  if (targetPlayer._tradeHistory.length > HISTORY_MAX) targetPlayer._tradeHistory.pop();

  // 거래 성공 카운트
  initiatorPlayer._tradeSuccessCount = (initiatorPlayer._tradeSuccessCount || 0) + 1;
  targetPlayer._tradeSuccessCount = (targetPlayer._tradeSuccessCount || 0) + 1;

  // 완료 처리
  trade.status = 'completed';
  trade.completedAt = Date.now();
  cleanupTrade(trade);

  return {
    ok: true,
    msg: '거래 완료!',
    trade: sanitizeTrade(trade),
    initiatorResult: {
      receivedCards: targetGivenCards.map(c => ({ id: c.id, name: c.name, grade: c.grade, icon: c.icon })),
      receivedGold: trade.target.gold > 0 ? trade.target.gold - targetGoldFee : 0,
      sentCards: initiatorGivenCards.map(c => ({ id: c.id, name: c.name, grade: c.grade, icon: c.icon })),
      sentGold: trade.initiator.gold,
      fee: initiatorGoldFee,
    },
    targetResult: {
      receivedCards: initiatorGivenCards.map(c => ({ id: c.id, name: c.name, grade: c.grade, icon: c.icon })),
      receivedGold: trade.initiator.gold > 0 ? trade.initiator.gold - initiatorGoldFee : 0,
      sentCards: targetGivenCards.map(c => ({ id: c.id, name: c.name, grade: c.grade, icon: c.icon })),
      sentGold: trade.target.gold,
      fee: targetGoldFee,
    },
  };
}

// ── 거래 이력 ────────────────────────────────
function getTradeHistory(player) {
  return (player._tradeHistory || []).slice(0, HISTORY_MAX);
}

// ── 거래 평판 ────────────────────────────────
function getTradeReputation(player) {
  const successCount = player._tradeSuccessCount || 0;
  const cancelCount = player._tradeCancels || 0;
  const totalAttempts = successCount + cancelCount;
  const cancelRate = totalAttempts > 0 ? cancelCount / totalAttempts : 0;

  // 좋은 평판: 성공 20건 이상 + 취소율 10% 미만
  const isGoodRep = successCount >= GOOD_REP_THRESHOLD && cancelRate < 0.1;
  const feeRate = isGoodRep ? GOOD_REP_FEE_RATE : BASE_FEE_RATE;

  let rank;
  if (successCount >= 100) rank = '전설의 거래왕';
  else if (successCount >= 50) rank = '숙련 상인';
  else if (successCount >= 20) rank = '상인';
  else if (successCount >= 5) rank = '견습 상인';
  else rank = '초보 거래자';

  return {
    rank,
    successCount,
    cancelCount,
    cancelRate: Math.round(cancelRate * 100),
    feeRate,
    feePercent: `${Math.round(feeRate * 100)}%`,
    isGoodRep,
    nextMilestone: successCount < 5 ? 5 : successCount < 20 ? 20 : successCount < 50 ? 50 : successCount < 100 ? 100 : null,
  };
}

// ── 현재 거래 상태 조회 ──────────────────────
function getTradeStatus(player) {
  const playerId = getPlayerId(player);
  const trade = Object.values(activeTrades).find(
    t => (t.initiator.id === playerId || t.target.id === playerId)
      && (t.status === 'pending' || t.status === 'active')
  );
  if (!trade) return { ok: false, reason: '진행 중인 거래 없음' };
  return { ok: true, trade: sanitizeTrade(trade, playerId) };
}

// ── 헬퍼 함수들 ─────────────────────────────

function getTradeSide(trade, playerId) {
  if (trade.initiator.id === playerId) return trade.initiator;
  if (trade.target.id === playerId) return trade.target;
  return null;
}

function findPlayerById(playerId, allPlayers) {
  return Object.values(allPlayers).find(p => getPlayerId(p) === playerId) || null;
}

function cleanupTrade(trade) {
  if (trade._timeout) {
    clearTimeout(trade._timeout);
    trade._timeout = null;
  }
  delete activeTrades[trade.id];
}

/** 클라이언트에 전송용 — 카드 상세 정보 포함 */
function sanitizeTrade(trade, viewerId) {
  return {
    id: trade.id,
    status: trade.status,
    initiator: {
      id: trade.initiator.id,
      name: trade.initiator.name,
      cardIds: trade.initiator.cardIds,
      gold: trade.initiator.gold,
      confirmed: trade.initiator.confirmed,
    },
    target: {
      id: trade.target.id,
      name: trade.target.name,
      cardIds: trade.target.cardIds,
      gold: trade.target.gold,
      confirmed: trade.target.confirmed,
    },
    createdAt: trade.createdAt,
    expiresAt: trade.expiresAt,
    completedAt: trade.completedAt,
  };
}

/** 거래 정보에 카드 상세를 첨부해서 반환 */
function enrichTradeWithCards(trade, allPlayers) {
  const initiatorPlayer = findPlayerById(trade.initiator.id, allPlayers);
  const targetPlayer = findPlayerById(trade.target.id, allPlayers);

  const enrichSide = (side, player) => {
    const cards = player
      ? side.cardIds.map(cid => {
          const c = (player.cards || []).find(card => card.id === cid);
          return c ? { id: c.id, name: c.name, grade: c.grade, icon: c.icon, atk: c.atk, def: c.def, hp: c.hp, level: c.level } : { id: cid, name: '???' };
        })
      : side.cardIds.map(cid => ({ id: cid, name: '???' }));
    return { ...side, cards };
  };

  return {
    ...sanitizeTrade(trade),
    initiator: enrichSide(trade.initiator, initiatorPlayer),
    target: enrichSide(trade.target, targetPlayer),
  };
}

// ── 소켓 이벤트 등록 ─────────────────────────
function register(io, socket, player, allPlayers) {

  // 거래 요청 보내기
  socket.on('trade_request', (data) => {
    const targetName = data && data.targetName;
    if (!targetName) {
      socket.emit('trade_request', { ok: false, reason: '대상 이름을 지정하세요' });
      return;
    }

    const result = requestTrade(player, targetName, allPlayers);
    socket.emit('trade_request', result);

    // 대상에게 알림
    if (result.ok) {
      const targetPlayer = findPlayerById(result.targetId, allPlayers);
      if (targetPlayer && targetPlayer._socket) {
        targetPlayer._socket.emit('trade_incoming', {
          tradeId: result.tradeId,
          from: player.displayName || player.name || '???',
          fromId: getPlayerId(player),
          expiresAt: result.trade.expiresAt,
        });
      }
    }
  });

  // 거래 수락
  socket.on('trade_accept', (data) => {
    const result = acceptTrade(player, data && data.tradeId);
    socket.emit('trade_accept', result);

    if (result.ok) {
      // 요청자에게도 알림
      const initiatorPlayer = findPlayerById(result.trade.initiator.id, allPlayers);
      if (initiatorPlayer && initiatorPlayer._socket) {
        initiatorPlayer._socket.emit('trade_accepted', {
          tradeId: result.tradeId,
          trade: enrichTradeWithCards(activeTrades[result.tradeId], allPlayers),
        });
      }
      // 수락자에게 enriched 정보
      socket.emit('trade_status', {
        ok: true,
        trade: enrichTradeWithCards(activeTrades[result.tradeId], allPlayers),
      });
    }
  });

  // 거래 거절
  socket.on('trade_decline', (data) => {
    const tradeId = data && data.tradeId;
    const trade = activeTrades[tradeId];
    const result = declineTrade(player, tradeId);
    socket.emit('trade_decline', result);

    if (result.ok && trade) {
      const initiatorPlayer = findPlayerById(trade.initiator.id, allPlayers);
      if (initiatorPlayer && initiatorPlayer._socket) {
        initiatorPlayer._socket.emit('trade_declined', {
          tradeId,
          by: player.displayName || player.name || '???',
        });
      }
    }
  });

  // 아이템 제안
  socket.on('trade_offer', (data) => {
    const result = offerItems(player, data && data.tradeId, data && data.cardIds, data && data.gold);
    socket.emit('trade_offer', result);

    if (result.ok) {
      notifyOtherSide(data.tradeId, player, allPlayers, 'trade_updated', result.trade);
    }
  });

  // 제안에서 카드 제거
  socket.on('trade_remove_offer', (data) => {
    const result = removeOffer(player, data && data.tradeId, data && data.cardId);
    socket.emit('trade_remove_offer', result);

    if (result.ok) {
      notifyOtherSide(data.tradeId, player, allPlayers, 'trade_updated', result.trade);
    }
  });

  // 골드 제안 변경
  socket.on('trade_update_gold', (data) => {
    const result = updateGoldOffer(player, data && data.tradeId, data && data.gold);
    socket.emit('trade_update_gold', result);

    if (result.ok) {
      notifyOtherSide(data.tradeId, player, allPlayers, 'trade_updated', result.trade);
    }
  });

  // 확인
  socket.on('trade_confirm', (data) => {
    const result = confirmTrade(player, data && data.tradeId, allPlayers);
    socket.emit('trade_confirm', result);

    if (result.ok && result.trade) {
      const tradeData = result.trade;

      if (tradeData.status === 'completed') {
        // 거래 완료 — 양쪽에 결과 전송
        const initiatorPlayer = findPlayerById(tradeData.initiator.id, allPlayers);
        const targetPlayer = findPlayerById(tradeData.target.id, allPlayers);

        if (initiatorPlayer && initiatorPlayer._socket) {
          initiatorPlayer._socket.emit('trade_completed', {
            tradeId: tradeData.id,
            result: result.initiatorResult,
            cards: initiatorPlayer.cards,
            gold: initiatorPlayer.gold,
          });
        }
        if (targetPlayer && targetPlayer._socket) {
          targetPlayer._socket.emit('trade_completed', {
            tradeId: tradeData.id,
            result: result.targetResult,
            cards: targetPlayer.cards,
            gold: targetPlayer.gold,
          });
        }
      } else {
        // 한쪽만 확인 → 상대에게 알림
        notifyOtherSide(data.tradeId, player, allPlayers, 'trade_updated', tradeData);
      }
    }
  });

  // 거래 취소
  socket.on('trade_cancel', (data) => {
    const tradeId = data && data.tradeId;
    const trade = activeTrades[tradeId];
    const otherSideId = trade
      ? (trade.initiator.id === getPlayerId(player) ? trade.target.id : trade.initiator.id)
      : null;

    const result = cancelTrade(player, tradeId);
    socket.emit('trade_cancel', result);

    if (result.ok && otherSideId) {
      const otherPlayer = findPlayerById(otherSideId, allPlayers);
      if (otherPlayer && otherPlayer._socket) {
        otherPlayer._socket.emit('trade_cancelled', {
          tradeId,
          by: player.displayName || player.name || '???',
        });
      }
    }
  });

  // 거래 상태 조회
  socket.on('trade_status', () => {
    const status = getTradeStatus(player);
    if (status.ok) {
      socket.emit('trade_status', {
        ok: true,
        trade: enrichTradeWithCards(
          activeTrades[status.trade.id] || status.trade,
          allPlayers
        ),
      });
    } else {
      socket.emit('trade_status', status);
    }
  });

  // 거래 이력
  socket.on('trade_history', () => {
    socket.emit('trade_history', { history: getTradeHistory(player) });
  });

  // 거래 평판
  socket.on('trade_reputation', () => {
    socket.emit('trade_reputation', getTradeReputation(player));
  });
}

// ── 상대편에게 알림 헬퍼 ─────────────────────
function notifyOtherSide(tradeId, player, allPlayers, event, tradeData) {
  const trade = activeTrades[tradeId];
  if (!trade) return;

  const playerId = getPlayerId(player);
  const otherId = trade.initiator.id === playerId ? trade.target.id : trade.initiator.id;
  const otherPlayer = findPlayerById(otherId, allPlayers);

  if (otherPlayer && otherPlayer._socket) {
    otherPlayer._socket.emit(event, {
      tradeId,
      trade: enrichTradeWithCards(trade, allPlayers),
    });
  }
}

// ── 접속 해제 시 정리 ────────────────────────
function onDisconnect(player) {
  const playerId = getPlayerId(player);
  const trades = Object.values(activeTrades).filter(
    t => (t.initiator.id === playerId || t.target.id === playerId)
      && (t.status === 'pending' || t.status === 'active')
  );
  for (const trade of trades) {
    cleanupTrade(trade);
    trade.status = 'cancelled';
  }
  return trades.length;
}

module.exports = {
  requestTrade,
  acceptTrade,
  declineTrade,
  offerItems,
  removeOffer,
  updateGoldOffer,
  confirmTrade,
  cancelTrade,
  executeTrade,
  getTradeHistory,
  getTradeReputation,
  getTradeStatus,
  onDisconnect,
  register,
  activeTrades,
  TRADE_TIMEOUT,
  MAX_CARDS_PER_TRADE,
  MAX_GOLD_PER_TRADE,
};

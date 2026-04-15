// ============================================
// 카드 PK 시스템 (Player Kill — PvP 전투, 카르마, 현상금, 복수)
// ============================================

// ── 카르마 등급 ──
const KARMA_TIERS = [
  { min: -1000, name: '마왕😈', icon: '😈', color: '#FF0000', effect: { atkBonus: 0.15, shopBan: true, bountyMul: 3.0 } },
  { min: -500, name: '악인🔴', icon: '🔴', color: '#FF4444', effect: { atkBonus: 0.1, bountyMul: 2.0 } },
  { min: -100, name: '무법자🟠', icon: '🟠', color: '#FF8800', effect: { atkBonus: 0.05, bountyMul: 1.5 } },
  { min: -10, name: '중립⚪', icon: '⚪', color: '#CCCCCC', effect: {} },
  { min: 0, name: '선인🟢', icon: '🟢', color: '#44FF44', effect: { defBonus: 0.05 } },
  { min: 100, name: '영웅🔵', icon: '🔵', color: '#4444FF', effect: { defBonus: 0.1, shopDiscount: 0.1 } },
  { min: 500, name: '성자💛', icon: '💛', color: '#FFD700', effect: { defBonus: 0.15, shopDiscount: 0.15, healBonus: 0.2 } },
  { min: 1000, name: '수호자👑', icon: '👑', color: '#FFD700', effect: { defBonus: 0.2, shopDiscount: 0.2, healBonus: 0.3, reviveDiscount: 0.5 } },
];

// ── PK 지역 ──
const PK_ZONES = [
  { id: 'safe', name: '안전 지대🟢', pkAllowed: false, desc: '카드게임 메인 화면' },
  { id: 'normal', name: '일반 지역⚪', pkAllowed: true, karmaLoss: 20, desc: '기본 PK 규칙' },
  { id: 'chaos', name: '혼돈의 땅🔴', pkAllowed: true, karmaLoss: 5, lootMul: 2.0, desc: '약한 카르마 패널티, 높은 보상' },
  { id: 'arena', name: '결투장⚔️', pkAllowed: true, karmaLoss: 0, lootMul: 0, desc: '순수 대전, 약탈 없음, 랭킹만' },
  { id: 'outlaw', name: '무법지대💀', pkAllowed: true, karmaLoss: 0, lootMul: 3.0, desc: '카르마 무관, 최대 약탈!' },
];

// ── 현상금 게시판 (서버 전역) ──
const bountyBoard = [];

// ── 헬퍼: 카르마 등급 조회 ──
function getKarmaTier(karma) {
  // KARMA_TIERS는 min 오름차순; 마지막으로 만족하는 tier 반환
  let tier = KARMA_TIERS[0];
  for (const t of KARMA_TIERS) {
    if (karma >= t.min) tier = t;
  }
  return tier;
}

// ── 헬퍼: 카르마 이펙트 적용 ──
function applyKarmaEffect(player) {
  const tier = getKarmaTier(player.karma || 0);
  player._karmaTier = tier;
  return tier;
}

// ── 헬퍼: 파티 카드 상위 5장 ──
function getTopPartyCards(player, count = 5) {
  const cards = (player.cards || []).slice();
  // 전투력 내림차순
  cards.sort((a, b) => ((b.atk || 0) + (b.def || 0) + (b.hp || 0)) - ((a.atk || 0) + (a.def || 0) + (a.hp || 0)));
  return cards.slice(0, count);
}

// ── 헬퍼: 단일 라운드 전투 ──
function fightRound(cardA, cardB, roundNum) {
  const variance = () => 0.85 + Math.random() * 0.30; // ±15%
  const atkA = (cardA.atk || 30) * variance();
  const defB = (cardB.def || 20) * variance();
  const atkB = (cardB.atk || 30) * variance();
  const defA = (cardA.def || 20) * variance();

  const dmgA = Math.max(1, Math.floor(atkA - defB * 0.5));
  const dmgB = Math.max(1, Math.floor(atkB - defA * 0.5));

  // 순 피해 비교 — 더 큰 피해를 준 쪽이 라운드 승리
  const winnerSide = dmgA > dmgB ? 'A' : dmgA < dmgB ? 'B' : (Math.random() < 0.5 ? 'A' : 'B');

  return {
    round: roundNum,
    cardA: cardA.name || `카드A-${roundNum}`,
    cardB: cardB.name || `카드B-${roundNum}`,
    dmgA,
    dmgB,
    winner: winnerSide,
    desc: `${cardA.name || '???'} (${dmgA}dmg) vs ${cardB.name || '???'} (${dmgB}dmg) → ${winnerSide === 'A' ? '공격자 승' : '방어자 승'}`,
  };
}

// ──────────────────────────────────────────────
// 1) PK 전투 개시
// ──────────────────────────────────────────────
function initiatePK(attacker, defender, zone) {
  const zoneInfo = PK_ZONES.find(z => z.id === (zone || 'normal')) || PK_ZONES[1];

  // 안전 지대 체크
  if (!zoneInfo.pkAllowed) {
    return { success: false, reason: `${zoneInfo.name}에서는 PK가 불가합니다.` };
  }

  // 파티 카드 준비
  const atkCards = getTopPartyCards(attacker);
  const defCards = getTopPartyCards(defender);
  if (atkCards.length === 0) return { success: false, reason: '전투에 사용할 카드가 없습니다.' };
  if (defCards.length === 0) return { success: false, reason: '상대에게 카드가 없어 PK가 불가합니다.' };

  // 카르마 이펙트
  const atkTier = applyKarmaEffect(attacker);
  const defTier = applyKarmaEffect(defender);

  // 5라운드 전투
  const rounds = [];
  let winsA = 0;
  let winsB = 0;
  const maxRounds = Math.min(5, atkCards.length, defCards.length);

  for (let i = 0; i < maxRounds; i++) {
    const result = fightRound(atkCards[i], defCards[i], i + 1);
    rounds.push(result);
    if (result.winner === 'A') winsA++;
    else winsB++;
  }

  const attackerWins = winsA >= Math.ceil(maxRounds / 2);
  const winner = attackerWins ? attacker : defender;
  const loser = attackerWins ? defender : attacker;

  // ── 골드 약탈 ──
  const lootMul = zoneInfo.lootMul != null ? zoneInfo.lootMul : 1.0;
  let goldStolen = 0;
  if (lootMul > 0) {
    goldStolen = Math.min(Math.floor((loser.gold || 0) * 0.10), 5000);
    goldStolen = Math.floor(goldStolen * lootMul);
    loser.gold = (loser.gold || 0) - goldStolen;
    winner.gold = (winner.gold || 0) + goldStolen;
  }

  // ── 카르마 변동 ──
  const karmaLoss = zoneInfo.karmaLoss != null ? zoneInfo.karmaLoss : 20;
  let attackerKarmaChange = -karmaLoss;
  // 양성 카르마 플레이어를 공격하면 추가 패널티
  if ((defender.karma || 0) > 0 && karmaLoss > 0) {
    attackerKarmaChange -= 50;
  }
  attacker.karma = (attacker.karma || 0) + attackerKarmaChange;

  let defenderKarmaChange = 0;
  if (!attackerWins) {
    // 방어자가 이기면 자기 방어 카르마 보너스
    defenderKarmaChange = 10;
    defender.karma = (defender.karma || 0) + defenderKarmaChange;
  }

  // ── PK 기록 저장 ──
  const now = Date.now();
  const recordA = {
    opponent: defender.name || defender.id,
    result: attackerWins ? 'win' : 'lose',
    goldChange: attackerWins ? goldStolen : -goldStolen,
    karmaChange: attackerKarmaChange,
    time: now,
    zone: zoneInfo.id,
  };
  const recordD = {
    opponent: attacker.name || attacker.id,
    result: attackerWins ? 'lose' : 'win',
    goldChange: attackerWins ? -goldStolen : goldStolen,
    karmaChange: defenderKarmaChange,
    time: now,
    zone: zoneInfo.id,
  };
  if (!attacker._pkHistory) attacker._pkHistory = [];
  if (!defender._pkHistory) defender._pkHistory = [];
  attacker._pkHistory.unshift(recordA);
  defender._pkHistory.unshift(recordD);
  attacker._pkHistory = attacker._pkHistory.slice(0, 20);
  defender._pkHistory = defender._pkHistory.slice(0, 20);

  // PK 통계
  if (!attacker._pkStats) attacker._pkStats = { kills: 0, deaths: 0 };
  if (!defender._pkStats) defender._pkStats = { kills: 0, deaths: 0 };
  if (attackerWins) {
    attacker._pkStats.kills++;
    defender._pkStats.deaths++;
  } else {
    attacker._pkStats.deaths++;
    defender._pkStats.kills++;
  }

  return {
    success: true,
    attackerWins,
    winner: winner.name || winner.id,
    loser: loser.name || loser.id,
    rounds,
    winsA,
    winsB,
    goldStolen,
    attackerKarmaChange,
    defenderKarmaChange,
    zone: zoneInfo,
    attackerKarmaTier: getKarmaTier(attacker.karma || 0),
    defenderKarmaTier: getKarmaTier(defender.karma || 0),
  };
}

// ──────────────────────────────────────────────
// 2) 현상금 시스템
// ──────────────────────────────────────────────
function placeBounty(player, targetName, amount) {
  if (amount < 1000) return { success: false, reason: '최소 현상금은 1,000G입니다.' };
  if ((player.gold || 0) < amount) return { success: false, reason: '골드가 부족합니다.' };
  if ((player.name || player.id) === targetName) return { success: false, reason: '자기 자신에게 현상금을 걸 수 없습니다.' };

  player.gold -= amount;

  const bounty = {
    id: `bounty_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    placer: player.name || player.id,
    target: targetName,
    amount,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24시간
    claimed: false,
  };
  bountyBoard.push(bounty);

  return { success: true, bounty };
}

function claimBounty(killer, targetName) {
  const now = Date.now();
  const claimed = [];

  for (const b of bountyBoard) {
    if (b.target === targetName && !b.claimed && now < b.expiresAt) {
      b.claimed = true;
      b.claimedBy = killer.name || killer.id;
      b.claimedAt = now;
      killer.gold = (killer.gold || 0) + b.amount;
      claimed.push(b);
    }
  }

  // 음수 카르마 타겟을 잡으면 양성 카르마 보너스
  let karmaBonus = 0;
  if (claimed.length > 0) {
    karmaBonus = 15;
    killer.karma = (killer.karma || 0) + karmaBonus;
  }

  // 만료된 현상금 정리
  cleanExpiredBounties();

  return {
    success: claimed.length > 0,
    claimed,
    totalGold: claimed.reduce((s, b) => s + b.amount, 0),
    karmaBonus,
  };
}

function cleanExpiredBounties() {
  const now = Date.now();
  let i = bountyBoard.length;
  while (i--) {
    if (bountyBoard[i].claimed || now >= bountyBoard[i].expiresAt) {
      bountyBoard.splice(i, 1);
    }
  }
}

function getTopBounties(limit = 10) {
  cleanExpiredBounties();
  const sorted = bountyBoard.slice().sort((a, b) => b.amount - a.amount);
  return sorted.slice(0, limit).map(b => ({
    target: b.target,
    amount: b.amount,
    placer: b.placer,
    remainingMs: b.expiresAt - Date.now(),
  }));
}

function getBountiesOnPlayer(targetName) {
  cleanExpiredBounties();
  return bountyBoard.filter(b => b.target === targetName).reduce((s, b) => s + b.amount, 0);
}

// ──────────────────────────────────────────────
// 3) 복수 시스템
// ──────────────────────────────────────────────
function getPKHistory(player) {
  return (player._pkHistory || []).slice(0, 20);
}

function canRevenge(player, targetName) {
  const history = player._pkHistory || [];
  const now = Date.now();
  const revengeWindow = 24 * 60 * 60 * 1000; // 24시간

  return history.some(h =>
    h.opponent === targetName &&
    h.result === 'lose' &&
    (now - h.time) < revengeWindow
  );
}

function initiateRevengePK(attacker, defender, zone) {
  const targetName = defender.name || defender.id;

  if (!canRevenge(attacker, targetName)) {
    return { success: false, reason: '복수 조건을 만족하지 않습니다. (24시간 내 해당 플레이어에게 패배 기록 필요)' };
  }

  // 복수 PK: 카르마 패널티 없음 → arena 규칙 사용 후 골드 2배 적용
  const result = initiatePK(attacker, defender, 'arena');
  if (!result.success) return result;

  // 복수 전투에서는 카르마 손실 제거 (arena이므로 이미 0)
  // 대신 골드 약탈 2배 추가 적용
  if (result.attackerWins) {
    const extraGold = Math.min(Math.floor((defender.gold || 0) * 0.10), 5000);
    defender.gold = (defender.gold || 0) - extraGold;
    attacker.gold = (attacker.gold || 0) + extraGold;
    result.goldStolen += extraGold;
    result.revenge = true;
    result.revengeBonus = extraGold;
  }

  result.revenge = true;
  return result;
}

// ──────────────────────────────────────────────
// 4) PK 랭킹
// ──────────────────────────────────────────────
function getPKRanking(allPlayers, limit = 20) {
  const ranked = allPlayers
    .filter(p => p._pkStats && p._pkStats.kills > 0)
    .map(p => {
      const stats = p._pkStats;
      const total = stats.kills + stats.deaths;
      return {
        name: p.name || p.id,
        kills: stats.kills,
        deaths: stats.deaths,
        winRate: total > 0 ? Math.round((stats.kills / total) * 100) : 0,
        karmaTier: getKarmaTier(p.karma || 0),
      };
    })
    .sort((a, b) => b.kills - a.kills || b.winRate - a.winRate);

  return ranked.slice(0, limit);
}

// ──────────────────────────────────────────────
// 5) Socket 이벤트 등록
// ──────────────────────────────────────────────
function register(io, socket, player, allPlayers) {

  // PK 개시
  socket.on('pk_initiate', (data) => {
    const { targetId, zone } = data || {};
    const defender = allPlayers.find(p => (p.id === targetId || p.name === targetId) && p !== player);
    if (!defender) return socket.emit('pk_result', { success: false, reason: '대상을 찾을 수 없습니다.' });

    const result = initiatePK(player, defender, zone);
    socket.emit('pk_result', result);

    // 상대에게도 알림
    if (result.success && defender._socket) {
      defender._socket.emit('pk_attacked', {
        attacker: player.name || player.id,
        result: result.attackerWins ? 'lose' : 'win',
        goldChange: result.attackerWins ? -result.goldStolen : result.goldStolen,
        zone: result.zone,
      });
    }

    // 현상금 자동 처리
    if (result.success && result.attackerWins) {
      const bountyResult = claimBounty(player, defender.name || defender.id);
      if (bountyResult.success) {
        socket.emit('bounty_claimed', bountyResult);
      }
    }
  });

  // PK 기록 조회
  socket.on('pk_history', () => {
    socket.emit('pk_history_result', {
      history: getPKHistory(player),
      stats: player._pkStats || { kills: 0, deaths: 0 },
    });
  });

  // 카르마 상태 조회
  socket.on('pk_karma', () => {
    const tier = getKarmaTier(player.karma || 0);
    socket.emit('pk_karma_result', {
      karma: player.karma || 0,
      tier,
      totalBounty: getBountiesOnPlayer(player.name || player.id),
    });
  });

  // 현상금 걸기
  socket.on('bounty_place', (data) => {
    const { target, amount } = data || {};
    const result = placeBounty(player, target, amount || 0);
    socket.emit('bounty_place_result', result);

    // 타겟에게 알림
    if (result.success) {
      const targetPlayer = allPlayers.find(p => (p.name === target || p.id === target));
      if (targetPlayer && targetPlayer._socket) {
        targetPlayer._socket.emit('bounty_notice', {
          placer: player.name || player.id,
          amount,
          totalBounty: getBountiesOnPlayer(target),
        });
      }
    }
  });

  // 현상금 게시판 조회
  socket.on('bounty_board', () => {
    socket.emit('bounty_board_result', { bounties: getTopBounties() });
  });

  // 현상금 수동 수령 (자동 처리도 있지만 수동 확인용)
  socket.on('bounty_claim', (data) => {
    const { target } = data || {};
    const result = claimBounty(player, target);
    socket.emit('bounty_claim_result', result);
  });

  // PK 랭킹 조회
  socket.on('pk_ranking', () => {
    socket.emit('pk_ranking_result', { ranking: getPKRanking(allPlayers) });
  });

  // 복수 공격
  socket.on('pk_revenge', (data) => {
    const { targetId } = data || {};
    const defender = allPlayers.find(p => (p.id === targetId || p.name === targetId) && p !== player);
    if (!defender) return socket.emit('pk_result', { success: false, reason: '대상을 찾을 수 없습니다.' });

    const result = initiateRevengePK(player, defender);
    socket.emit('pk_result', result);

    if (result.success && defender._socket) {
      defender._socket.emit('pk_attacked', {
        attacker: player.name || player.id,
        result: result.attackerWins ? 'lose' : 'win',
        goldChange: result.attackerWins ? -result.goldStolen : result.goldStolen,
        revenge: true,
      });
    }
  });
}

// ──────────────────────────────────────────────
// 모듈 내보내기
// ──────────────────────────────────────────────
module.exports = {
  // 상수
  KARMA_TIERS,
  PK_ZONES,
  bountyBoard,

  // 카르마
  getKarmaTier,
  applyKarmaEffect,

  // PK 전투
  initiatePK,
  initiateRevengePK,

  // 현상금
  placeBounty,
  claimBounty,
  getTopBounties,
  getBountiesOnPlayer,
  cleanExpiredBounties,

  // 복수
  getPKHistory,
  canRevenge,

  // 랭킹
  getPKRanking,

  // 소켓 등록
  register,
};

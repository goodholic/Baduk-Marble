// ============================================
// 친구 시스템 — 친구 추가, 선물, 방문, 우정 포인트, 결투, 탐험
// ============================================

const MAX_FRIENDS = 50;
const DAILY_GIFT_LIMIT = 5;
const FRIEND_GIFT = { gold: 200, desc: '일일 친구 선물' };

// 친구 방문 보너스
const VISIT_BONUS = { gold: 100, exp: 20, desc: '친구 기지 방문 보상' };
const DAILY_VISIT_LIMIT = 10;

// --- 우정 포인트 레벨 ---
const FRIEND_LEVELS = [
  { min: 0, name: '지인', icon: '🤝', giftMul: 1.0 },
  { min: 100, name: '친구', icon: '💙', giftMul: 1.5 },
  { min: 300, name: '절친', icon: '💜', giftMul: 2.0 },
  { min: 1000, name: '영혼의 동반자', icon: '💛✨', giftMul: 3.0, specialGift: true },
];

function getFriendLevel(points) {
  let level = FRIEND_LEVELS[0];
  for (const l of FRIEND_LEVELS) {
    if (points >= l.min) level = l;
  }
  return level;
}

function addFriendPoints(player, friendName, amount) {
  player.friendPoints = player.friendPoints || {};
  const prev = player.friendPoints[friendName] || 0;
  const next = prev + amount;
  player.friendPoints[friendName] = next;

  const prevLevel = getFriendLevel(prev);
  const nextLevel = getFriendLevel(next);
  const levelUp = nextLevel.min > prevLevel.min;

  return {
    ok: true,
    friendName,
    points: next,
    added: amount,
    level: nextLevel,
    levelUp: levelUp ? `${prevLevel.name} → ${nextLevel.name}` : null,
  };
}

function getFriendInfo(player, friendName) {
  const points = (player.friendPoints || {})[friendName] || 0;
  const level = getFriendLevel(points);
  return { friendName, points, level };
}

// --- 기본 친구 기능 ---

function addFriend(player, friendName) {
  player.friends = player.friends || [];
  if (player.friends.length >= MAX_FRIENDS) return { ok: false, reason: `최대 ${MAX_FRIENDS}명` };
  if (player.friends.includes(friendName)) return { ok: false, reason: '이미 친구' };
  player.friends.push(friendName);
  return { ok: true, msg: `${friendName}을 친구로 추가!` };
}

function removeFriend(player, friendName) {
  player.friends = player.friends || [];
  player.friends = player.friends.filter(f => f !== friendName);
  return { ok: true, msg: `${friendName} 친구 삭제` };
}

function sendFriendGift(player, friendName) {
  const today = new Date().toDateString();
  if (player._giftDate !== today) { player._giftDate = today; player._giftsSent = 0; }
  if (player._giftsSent >= DAILY_GIFT_LIMIT) return { ok: false, reason: `일일 ${DAILY_GIFT_LIMIT}회 제한` };
  if (!(player.friends || []).includes(friendName)) return { ok: false, reason: '친구가 아님' };

  player._giftsSent++;

  // 우정 포인트 +10 (선물 발송 시)
  const pointResult = addFriendPoints(player, friendName, 10);
  const level = pointResult.level;
  const giftGold = Math.floor(FRIEND_GIFT.gold * level.giftMul);

  return {
    ok: true,
    msg: `${friendName}에게 선물 발송! (${giftGold}G, ${level.icon} ${level.name} 보너스 x${level.giftMul})`,
    giftGold,
    friendPoints: pointResult,
  };
}

function visitFriend(player, friendName) {
  const today = new Date().toDateString();
  if (player._visitDate !== today) { player._visitDate = today; player._visits = 0; }
  if (player._visits >= DAILY_VISIT_LIMIT) return { ok: false, reason: `일일 ${DAILY_VISIT_LIMIT}회 방문` };
  if (!(player.friends || []).includes(friendName)) return { ok: false, reason: '친구가 아님' };

  player._visits++;

  // 우정 포인트 +5 (방문 시)
  const pointResult = addFriendPoints(player, friendName, 5);
  const level = pointResult.level;
  const visitGold = Math.floor(VISIT_BONUS.gold * level.giftMul);

  player.gold = (player.gold || 0) + visitGold;

  return {
    ok: true,
    msg: `${friendName} 기지 방문! +${visitGold}G (${level.icon} ${level.name})`,
    gold: visitGold,
    friendPoints: pointResult,
  };
}

// --- 친구 결투 (Friend Duel) ---

function friendDuel(player, friendPlayer) {
  if (!(player.friends || []).includes(friendPlayer.name || friendPlayer.displayName)) {
    return { ok: false, reason: '친구가 아닙니다' };
  }

  // 간단한 카드 전투 시뮬레이션 (card_pvp 연동)
  const playerPower = (player.cards || []).reduce((s, c) => s + (c.atk || 0) + (c.hp || 0), 0);
  const friendPower = (friendPlayer.cards || []).reduce((s, c) => s + (c.atk || 0) + (c.hp || 0), 0);

  // 약간의 랜덤 요소 추가 (+-20%)
  const pRoll = playerPower * (0.8 + Math.random() * 0.4);
  const fRoll = friendPower * (0.8 + Math.random() * 0.4);
  const playerWin = pRoll >= fRoll;

  const friendName = friendPlayer.name || friendPlayer.displayName;

  // 우정 포인트 +20 (결투 참가)
  const pointResult = addFriendPoints(player, friendName, 20);

  // 승자 500G 보너스
  if (playerWin) {
    player.gold = (player.gold || 0) + 500;
  }

  // 양쪽 다 소환 포인트 200
  player.summonPoints = (player.summonPoints || 0) + 200;

  return {
    ok: true,
    win: playerWin,
    msg: playerWin
      ? `${friendName}과의 결투에서 승리! +500G, +200 소환 포인트`
      : `${friendName}과의 결투에서 패배... +200 소환 포인트`,
    goldBonus: playerWin ? 500 : 0,
    summonPoints: 200,
    friendPoints: pointResult,
    playerPower: Math.floor(pRoll),
    friendPower: Math.floor(fRoll),
  };
}

// --- 친구 공동 탐험 (Friend Co-op Expedition) ---

function friendExpedition(player, friendPlayer, zoneId) {
  const friendName = friendPlayer.name || friendPlayer.displayName;

  if (!(player.friends || []).includes(friendName)) {
    return { ok: false, reason: '친구가 아닙니다' };
  }

  // 합산 전투력
  const playerPower = (player.cards || []).reduce((s, c) => s + (c.atk || 0) + (c.hp || 0), 0);
  const friendPower = (friendPlayer.cards || []).reduce((s, c) => s + (c.atk || 0) + (c.hp || 0), 0);
  const combinedPower = playerPower + friendPower;

  // 존 난이도 (간단 계산)
  const zoneDifficulty = (zoneId || 1) * 500;
  const success = combinedPower >= zoneDifficulty;

  if (!success) {
    return {
      ok: true,
      success: false,
      msg: `탐험 실패... 합산 전투력 ${combinedPower} < 요구 ${zoneDifficulty}`,
      combinedPower,
      required: zoneDifficulty,
    };
  }

  // +100% 보상 (일반 탐험 대비)
  const baseGold = (zoneId || 1) * 300;
  const rewardGold = baseGold * 2; // 친구 탐험 +100%
  const rewardExp = (zoneId || 1) * 50;

  player.gold = (player.gold || 0) + rewardGold;

  // 우정 포인트 +50
  const pointResult = addFriendPoints(player, friendName, 50);

  return {
    ok: true,
    success: true,
    msg: `${friendName}과 Zone ${zoneId} 공동 탐험 성공! +${rewardGold}G (친구 보너스 +100%), +${rewardExp} EXP`,
    gold: rewardGold,
    exp: rewardExp,
    combinedPower,
    friendPoints: pointResult,
  };
}

// --- 친구 리더보드 ---

function getFriendLeaderboard(player, allPlayers) {
  const friendNames = player.friends || [];
  const friendData = (allPlayers || [])
    .filter(p => friendNames.includes(p.name || p.displayName))
    .map(p => ({
      name: p.name || p.displayName,
      level: p.level || 1,
      towerFloor: p.towerFloor || 0,
      pvpRank: p.pvpRank || 0,
      pvpRating: p.pvpRating || 1000,
      seasonPoints: p.seasonPoints || 0,
      friendLevel: getFriendInfo(player, p.name || p.displayName),
    }));

  // 시즌 포인트 기준 정렬
  friendData.sort((a, b) => b.seasonPoints - a.seasonPoints);

  // 내 정보도 포함
  const myData = {
    name: player.name || player.displayName || '나',
    level: player.level || 1,
    towerFloor: player.towerFloor || 0,
    pvpRank: player.pvpRank || 0,
    pvpRating: player.pvpRating || 1000,
    seasonPoints: player.seasonPoints || 0,
    isMe: true,
  };

  return {
    ok: true,
    me: myData,
    friends: friendData,
    total: friendData.length,
  };
}

function register(io, socket, player, allPlayers) {
  socket.on('friends_list', () => {
    const friendDetails = (player.friends || []).map(f => getFriendInfo(player, f));
    socket.emit('friends_list', {
      friends: player.friends || [],
      friendDetails,
      max: MAX_FRIENDS,
      giftLimit: DAILY_GIFT_LIMIT,
      visitLimit: DAILY_VISIT_LIMIT,
    });
  });
  socket.on('friend_add', (data) => {
    const result = addFriend(player, data.name);
    socket.emit('friend_add_result', result);
  });
  socket.on('friend_remove', (data) => {
    const result = removeFriend(player, data.name);
    socket.emit('friend_remove_result', result);
  });
  socket.on('friend_gift', (data) => {
    const result = sendFriendGift(player, data.name);
    socket.emit('friend_gift_result', result);
  });
  socket.on('friend_visit', (data) => {
    const result = visitFriend(player, data.name);
    socket.emit('friend_visit_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 우정 포인트 조회
  socket.on('friend_points', (data) => {
    const info = getFriendInfo(player, data.name);
    socket.emit('friend_points_result', info);
  });

  // 친구 결투
  socket.on('friend_duel', (data) => {
    // allPlayers에서 상대 찾기
    const friendPlayer = (allPlayers || []).find(p => (p.name || p.displayName) === data.name);
    if (!friendPlayer) {
      socket.emit('friend_duel_result', { ok: false, reason: '상대를 찾을 수 없음 (오프라인?)' });
      return;
    }
    const result = friendDuel(player, friendPlayer);
    socket.emit('friend_duel_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 친구 리더보드
  socket.on('friend_leaderboard', () => {
    const result = getFriendLeaderboard(player, allPlayers);
    socket.emit('friend_leaderboard_result', result);
  });
}

module.exports = {
  MAX_FRIENDS, DAILY_GIFT_LIMIT, FRIEND_GIFT, VISIT_BONUS,
  FRIEND_LEVELS, getFriendLevel,
  addFriend, removeFriend, sendFriendGift, visitFriend,
  addFriendPoints, getFriendInfo,
  friendDuel, friendExpedition, getFriendLeaderboard,
  register,
};

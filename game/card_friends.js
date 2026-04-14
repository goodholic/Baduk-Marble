// ============================================
// 친구 시스템 — 친구 추가, 선물, 방문
// ============================================

const MAX_FRIENDS = 50;
const DAILY_GIFT_LIMIT = 5;
const FRIEND_GIFT = { gold: 200, desc: '일일 친구 선물' };

// 친구 방문 보너스
const VISIT_BONUS = { gold: 100, exp: 20, desc: '친구 기지 방문 보상' };
const DAILY_VISIT_LIMIT = 10;

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
  // 실제로는 상대에게 시스템 우편으로 전달
  return { ok: true, msg: `${friendName}에게 선물 발송! (${FRIEND_GIFT.gold}G)` };
}

function visitFriend(player, friendName) {
  const today = new Date().toDateString();
  if (player._visitDate !== today) { player._visitDate = today; player._visits = 0; }
  if (player._visits >= DAILY_VISIT_LIMIT) return { ok: false, reason: `일일 ${DAILY_VISIT_LIMIT}회 방문` };
  if (!(player.friends || []).includes(friendName)) return { ok: false, reason: '친구가 아님' };

  player._visits++;
  player.gold = (player.gold || 0) + VISIT_BONUS.gold;

  return { ok: true, msg: `${friendName} 기지 방문! +${VISIT_BONUS.gold}G`, gold: VISIT_BONUS.gold };
}

function register(io, socket, player) {
  socket.on('friends_list', () => {
    socket.emit('friends_list', { friends: player.friends || [], max: MAX_FRIENDS, giftLimit: DAILY_GIFT_LIMIT, visitLimit: DAILY_VISIT_LIMIT });
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
}

module.exports = { MAX_FRIENDS, DAILY_GIFT_LIMIT, FRIEND_GIFT, VISIT_BONUS, addFriend, removeFriend, sendFriendGift, visitFriend, register };

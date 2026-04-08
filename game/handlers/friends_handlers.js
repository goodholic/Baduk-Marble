// 친구 소켓 핸들러 — v2.03
function registerFriendsHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, friends } = ctx;

  socket.on('friends_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('friends_status_result', friends.getStatus(p));
  });

  socket.on('friends_request', (targetId) => {
    const p = players[playerId]; if (!p) return;
    const target = players[targetId];
    if (!target) {
      socket.emit('friends_result', { success:false, msg:'대상 오프라인' });
      return;
    }
    const result = friends.sendRequest(p, target);
    if (result.success) { savePlayer(p); savePlayer(target); }
    socket.emit('friends_result', result);
  });

  socket.on('friends_accept', (requesterId) => {
    const p = players[playerId]; if (!p) return;
    const result = friends.acceptRequest(p, requesterId, players);
    if (result.success) {
      savePlayer(p);
      const r = players[requesterId]; if (r) savePlayer(r);
    }
    socket.emit('friends_result', result);
  });

  socket.on('friends_remove', (friendId) => {
    const p = players[playerId]; if (!p) return;
    const result = friends.removeFriend(p, friendId, players);
    if (result.success) {
      savePlayer(p);
      const f = players[friendId]; if (f) savePlayer(f);
    }
    socket.emit('friends_result', result);
  });

  socket.on('friends_gift', (friendId) => {
    const p = players[playerId]; if (!p) return;
    const result = friends.sendGift(p, friendId, players);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      const f = players[friendId]; if (f) savePlayer(f);
    }
    socket.emit('friends_result', result);
  });
}

module.exports = { registerFriendsHandlers };

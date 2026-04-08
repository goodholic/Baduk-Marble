// 미궁 소켓 핸들러 — v2.07
function registerLabyrinthHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, labyrinth } = ctx;

  socket.on('labyrinth_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('labyrinth_status_result', labyrinth.getStatus(p));
  });

  socket.on('labyrinth_move', (direction) => {
    const p = players[playerId]; if (!p) return;
    const result = labyrinth.move(p, direction);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.cleared) {
        io.emit('server_msg', {
          msg: `🏁 ${p.displayName}이(가) 오늘의 미궁 클리어!`,
          type: 'normal',
        });
      }
    }
    socket.emit('labyrinth_result', result);
  });
}

module.exports = { registerLabyrinthHandlers };

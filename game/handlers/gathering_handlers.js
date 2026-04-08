// 채집 소켓 핸들러 — v1.97
function registerGatheringHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, gathering } = ctx;

  socket.on('gathering_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('gathering_status_result', gathering.getStatus(p));
  });

  socket.on('gathering_buy_tool', (toolId) => {
    const p = players[playerId]; if (!p) return;
    const result = gathering.buyTool(p, toolId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('gathering_result', result);
  });

  socket.on('gathering_gather', (nodeId) => {
    const p = players[playerId]; if (!p) return;
    const result = gathering.gather(p, nodeId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    if (result.levelUp) {
      io.emit('server_msg', {
        msg: `🌿 ${p.displayName}의 채집 스킬 레벨업 → Lv${result.newLevel}`,
        type: 'normal',
      });
    }
    socket.emit('gathering_result', result);
  });
}

module.exports = { registerGatheringHandlers };

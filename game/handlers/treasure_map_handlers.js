// 보물 지도 소켓 핸들러 — v1.86
function registerTreasureMapHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, MAX_GOLD, MAX_DIAMONDS, treasureMap } = ctx;

  socket.on('treasure_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('treasure_status_result', {
      maps: treasureMap.getActiveMaps(p),
      grades: treasureMap.TREASURE_GRADES,
      maxMaps: treasureMap.TREASURE_CONFIG.maxActiveMaps,
      totalFound: p.treasureFound || 0,
    });
  });

  socket.on('treasure_hint', (mapId) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('treasure_hint_result', treasureMap.getProximityHint(p, mapId));
  });

  socket.on('treasure_dig', (mapId) => {
    const p = players[playerId];
    if (!p) return;
    const result = treasureMap.digTreasure(p, mapId);
    if (result.success) {
      if (p.gold > MAX_GOLD) p.gold = MAX_GOLD;
      if (p.diamonds > MAX_DIAMONDS) p.diamonds = MAX_DIAMONDS;
      savePlayer(p);
      io.emit('player_update', p);
      if (result.grade === 'legendary') {
        io.emit('server_msg', {
          msg: `[보물] ${p.displayName}이(가) 전설의 보물을 발견했습니다!`,
          type: 'rare',
        });
      }
    }
    socket.emit('treasure_dig_result', result);
  });
}

module.exports = { registerTreasureMapHandlers };

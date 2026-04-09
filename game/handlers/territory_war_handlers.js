// 전장 점령 소켓 핸들러 — v2.29

function registerTerritoryWarHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, territoryWar } = ctx;

    socket.on('territory_status', () => {
        socket.emit('territory_status', territoryWar.getStatus());
    });

    socket.on('territory_fortify', (zoneId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof zoneId !== 'string') return;
        const result = territoryWar.fortify(p, zoneId);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
            io.emit('territory_update', territoryWar.getStatus());
            io.emit('server_msg', { msg: `[전장] ${p.displayName}이(가) ${result.zone} 방어시설 ${result.level}단계 강화!`, type: 'normal' });
        }
        socket.emit('territory_result', result);
    });
}

module.exports = { registerTerritoryWarHandlers };

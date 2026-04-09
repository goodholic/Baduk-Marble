// 사냥꾼 소켓 핸들러 — v2.23

function registerBountyHunterHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, bountyHunter } = ctx;

    socket.on('hunter_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('hunter_status', bountyHunter.getStatus(p));
    });

    socket.on('hunter_claim', (missionId) => {
        const p = players[playerId]; if (!p) return;
        const result = bountyHunter.claimMissionReward(p, missionId);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
            io.emit('server_msg', { msg: `[사냥꾼] ${p.displayName} 의뢰 완료! (${result.rank})`, type: 'normal' });
        }
        socket.emit('hunter_result', result);
    });

    socket.on('hunter_buy_trap', (trapId) => {
        const p = players[playerId]; if (!p) return;
        const result = bountyHunter.buyTrap(p, trapId);
        if (result.success) savePlayer(p);
        socket.emit('hunter_result', result);
    });

    socket.on('hunter_place_trap', (trapId) => {
        const p = players[playerId]; if (!p || !p.isAlive) return;
        const result = bountyHunter.placeTrap(p, trapId);
        if (result.success) {
            savePlayer(p);
            io.emit('trap_placed', { playerId, trap: result.trap, position: result.position });
        }
        socket.emit('hunter_result', result);
    });

    socket.on('hunter_refresh', () => {
        const p = players[playerId]; if (!p) return;
        const result = bountyHunter.refreshDailyMissions(p);
        if (result.success) savePlayer(p);
        socket.emit('hunter_refresh_result', result);
    });
}

module.exports = { registerBountyHunterHandlers };

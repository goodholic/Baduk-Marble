// 신화 소환수 소켓 핸들러 — v2.33

function registerMythicSummonHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, mythicSummon } = ctx;

    socket.on('mythic_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('mythic_status', mythicSummon.getStatus(p));
    });

    socket.on('mythic_obtain', (summonId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof summonId !== 'string') return;
        const result = mythicSummon.obtain(p, summonId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[신화] ${p.displayName}이(가) ${result.summon.icon} ${result.summon.name} 획득!`, type: 'boss' });
            io.emit('player_update', p);
        }
        socket.emit('mythic_result', result);
    });

    socket.on('mythic_summon', (summonId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof summonId !== 'string') return;
        const result = mythicSummon.summon(p, summonId);
        if (result.success) {
            savePlayer(p);
            io.emit('skill_effect', { casterId: playerId, skillName: result.summon.name, type: 'mythic_summon', icon: result.summon.icon, targetX: p.x, targetY: p.y });
        }
        socket.emit('mythic_result', result);
    });

    socket.on('mythic_awaken', (summonId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof summonId !== 'string') return;
        const result = mythicSummon.awaken(p, summonId);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
            io.emit('server_msg', { msg: `[신화 각성] ${p.displayName}: ${result.icon} ${result.msg}`, type: 'rare' });
        }
        socket.emit('mythic_result', result);
    });
}

module.exports = { registerMythicSummonHandlers };

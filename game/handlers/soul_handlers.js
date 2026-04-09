// 영혼 소켓 핸들러 — v2.31

function registerSoulHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, soulSystem } = ctx;

    socket.on('soul_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('soul_status', soulSystem.getStatus(p));
    });

    socket.on('soul_equip', (idx) => {
        const p = players[playerId]; if (!p) return;
        const i = Math.floor(Number(idx));
        if (!Number.isFinite(i)) return;
        const result = soulSystem.equip(p, i);
        if (result.success) savePlayer(p);
        socket.emit('soul_result', result);
    });

    socket.on('soul_unequip', (idx) => {
        const p = players[playerId]; if (!p) return;
        const i = Math.floor(Number(idx));
        if (!Number.isFinite(i)) return;
        const result = soulSystem.unequip(p, i);
        if (result.success) savePlayer(p);
        socket.emit('soul_result', result);
    });

    socket.on('soul_synthesize', (soulId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof soulId !== 'string') return;
        const result = soulSystem.synthesize(p, soulId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[영혼] ${p.displayName} 영혼 합성 → Lv.${result.level}!`, type: 'normal' });
        }
        socket.emit('soul_result', result);
    });

    socket.on('soul_awaken', (idx) => {
        const p = players[playerId]; if (!p) return;
        const i = Math.floor(Number(idx));
        if (!Number.isFinite(i)) return;
        const result = soulSystem.awaken(p, i);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
            io.emit('server_msg', { msg: `[영혼 각성] ${p.displayName}: ${result.soul.icon} ${result.soul.name} 각성!`, type: 'rare' });
        }
        socket.emit('soul_result', result);
    });
}

module.exports = { registerSoulHandlers };

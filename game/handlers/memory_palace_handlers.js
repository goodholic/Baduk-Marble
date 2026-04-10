// 기억 궁전 소켓 핸들러 — v2.51

function registerMemoryPalaceHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, memoryPalace } = ctx;

    socket.on('memory_status', () => { const p = players[playerId]; if (!p) return; socket.emit('memory_status', memoryPalace.getStatus(p)); });

    socket.on('memory_enter', ({ memType, difficulty }) => {
        const p = players[playerId]; if (!p) return;
        if (typeof memType !== 'string' || typeof difficulty !== 'string') return;
        const r = memoryPalace.enterMemory(p, memType, difficulty);
        if (r.success) { savePlayer(p); io.emit('server_msg', { msg: `[기억 궁전] ${p.displayName}이(가) ${r.mem.icon} ${r.mem.name} (${r.diff.name})에 진입!`, type: 'normal' }); }
        socket.emit('memory_result', r);
    });

    socket.on('memory_fight', () => {
        const p = players[playerId]; if (!p) return;
        const r = memoryPalace.fightMemory(p);
        if (r.success) {
            savePlayer(p);
            if (r.type === 'complete') {
                const msgType = r.newInscription ? 'legendary' : 'rare';
                io.emit('server_msg', { msg: `[기억 궁전] ${p.displayName}: ${r.msg.split('\n')[0]}`, type: msgType });
            }
        }
        socket.emit('memory_result', r);
    });

    socket.on('memory_leave', () => { const p = players[playerId]; if (!p) return; const r = memoryPalace.leaveMemory(p); if (r.success) savePlayer(p); socket.emit('memory_result', r); });
}

module.exports = { registerMemoryPalaceHandlers };

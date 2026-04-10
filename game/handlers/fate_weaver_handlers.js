// 운명의 직공 소켓 핸들러 — v2.56
function registerFateWeaverHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, fateWeaver } = ctx;
    socket.on('fweave_status', () => { const p = players[playerId]; if (!p) return; socket.emit('fweave_status', fateWeaver.getStatus(p)); });
    socket.on('fweave_buy', ({ threadId, count }) => { const p = players[playerId]; if (!p) return; if (typeof threadId !== 'string') return; const r = fateWeaver.buyThread(p, threadId, count || 1); if (r.success) savePlayer(p); socket.emit('fweave_result', r); });
    socket.on('fweave_weave', ({ targetId, threadId }) => {
        const p = players[playerId]; if (!p) return;
        if (typeof targetId !== 'string' || typeof threadId !== 'string') return;
        const target = players[targetId]; if (!target) { socket.emit('fweave_result', { success: false, msg: '대상 없음' }); return; }
        const r = fateWeaver.weave(p, target, threadId);
        if (r.success) {
            savePlayer(p); savePlayer(target);
            const msgType = r.type === 'curse' ? 'normal' : 'rare';
            io.emit('server_msg', { msg: `[운명의 직공] ${p.displayName} → ${target.displayName}: ${r.thread.icon} ${r.thread.name}`, type: msgType });
        }
        socket.emit('fweave_result', r);
    });
    socket.on('fweave_self', (threadId) => { const p = players[playerId]; if (!p) return; if (typeof threadId !== 'string') return; const r = fateWeaver.selfBless(p, threadId); if (r.success) savePlayer(p); socket.emit('fweave_result', r); });
    socket.on('fweave_prophecy', () => { const p = players[playerId]; if (!p) return; const r = fateWeaver.readFate(p); if (r.success) savePlayer(p); socket.emit('fweave_result', r); });
}
module.exports = { registerFateWeaverHandlers };

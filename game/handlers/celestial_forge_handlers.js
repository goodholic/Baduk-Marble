// 천상 대장간 소켓 핸들러 — v2.53
function registerCelestialForgeHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, celestialForge } = ctx;
    socket.on('cforge_status', () => { const p = players[playerId]; if (!p) return; socket.emit('cforge_status', celestialForge.getStatus(p)); });
    socket.on('cforge_forge', (recipeId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof recipeId !== 'string') return;
        const r = celestialForge.forge(p, recipeId);
        if (r.success) {
            savePlayer(p);
            if (r.result.name === '신의 작품') io.emit('server_msg', { msg: `[천상 대장간] ${p.displayName}: 👑 신의 작품 "${r.item.name}" 탄생!`, type: 'legendary' });
            else if (r.result.name === '걸작') io.emit('server_msg', { msg: `[천상 대장간] ${p.displayName}: 🌟 걸작 제작!`, type: 'rare' });
        }
        socket.emit('cforge_result', r);
    });
}
module.exports = { registerCelestialForgeHandlers };

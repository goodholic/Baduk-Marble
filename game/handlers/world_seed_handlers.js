// 세계의 씨앗 소켓 핸들러 — v2.55
function registerWorldSeedHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, worldSeed } = ctx;
    socket.on('wseed_status', () => { const p = players[playerId]; if (!p) return; socket.emit('wseed_status', worldSeed.getStatus(p)); });
    socket.on('wseed_create', ({ biomeId, name }) => { const p = players[playerId]; if (!p) return; if (typeof biomeId !== 'string') return; const r = worldSeed.createWorld(p, biomeId, name); if (r.success) { savePlayer(p); io.emit('server_msg', { msg: `[세계의 씨앗] ${p.displayName}: "${p._worldSeed.worldName}" 탄생!`, type: 'rare' }); } socket.emit('wseed_result', r); });
    socket.on('wseed_monster', (id) => { const p = players[playerId]; if (!p) return; if (typeof id !== 'string') return; const r = worldSeed.placeMonster(p, id); if (r.success) savePlayer(p); socket.emit('wseed_result', r); });
    socket.on('wseed_build', (id) => { const p = players[playerId]; if (!p) return; if (typeof id !== 'string') return; const r = worldSeed.buildStructure(p, id); if (r.success) savePlayer(p); socket.emit('wseed_result', r); });
    socket.on('wseed_harvest', () => { const p = players[playerId]; if (!p) return; const r = worldSeed.harvest(p); if (r.success) savePlayer(p); socket.emit('wseed_result', r); });
    socket.on('wseed_invade', (targetId) => {
        const p = players[playerId]; if (!p) return; if (typeof targetId !== 'string') return;
        const target = players[targetId]; if (!target) { socket.emit('wseed_result', { success: false, msg: '대상 없음' }); return; }
        const r = worldSeed.invadeWorld(p, target);
        if (r.success) { savePlayer(p); savePlayer(target); if (r.victory) io.emit('server_msg', { msg: `[차원 침공] ${p.displayName}이(가) ${target.displayName}의 세계를 침공!`, type: 'rare' }); }
        socket.emit('wseed_result', r);
    });
}
module.exports = { registerWorldSeedHandlers };

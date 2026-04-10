// 거수 합체 소켓 핸들러 — v2.49

function registerBeastColossusHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, beastColossus } = ctx;

    socket.on('beast_status', () => { const p = players[playerId]; if (!p) return; socket.emit('beast_status', beastColossus.getStatus(p)); });

    socket.on('beast_fuse', ({ headId, bodyId, tailId, name }) => {
        const p = players[playerId]; if (!p) return;
        if (typeof headId !== 'string' || typeof bodyId !== 'string' || typeof tailId !== 'string') return;
        const r = beastColossus.fuseColossus(p, headId, bodyId, tailId, name);
        if (r.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[거수 합체] ${p.displayName}: "${r.colossus.name}" 탄생!${r.colossus.synergy ? ` 🔥 ${r.colossus.synergy.name}!` : ''}`, type: 'legendary' });
        }
        socket.emit('beast_result', r);
    });

    socket.on('beast_raid', (raidId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof raidId !== 'string') return;
        const r = beastColossus.raidBoss(p, raidId);
        if (r.success) { savePlayer(p); if (r.victory) io.emit('server_msg', { msg: `[거수 레이드] ${p.displayName}: ${r.raid.icon} ${r.raid.name} 격파!`, type: 'rare' }); }
        socket.emit('beast_result', r);
    });

    socket.on('beast_disassemble', () => {
        const p = players[playerId]; if (!p) return;
        const r = beastColossus.disassemble(p);
        if (r.success) savePlayer(p);
        socket.emit('beast_result', r);
    });
}

module.exports = { registerBeastColossusHandlers };

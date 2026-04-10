// 영혼 대장간 소켓 핸들러 — v2.44

function registerSpiritForgeHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, spiritForge } = ctx;

    socket.on('sforge_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('sforge_status', spiritForge.getStatus(p));
    });

    socket.on('sforge_inscribe', (soulId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof soulId !== 'string') return;
        const result = spiritForge.inscribeSoul(p, soulId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[영혼 대장간] ${p.displayName}: ${result.soul.icon} ${result.soul.name} 각인!`, type: 'normal' });
        }
        socket.emit('sforge_result', result);
    });

    socket.on('sforge_remove', (slotIdx) => {
        const p = players[playerId]; if (!p) return;
        if (typeof slotIdx !== 'number') return;
        const result = spiritForge.removeInscription(p, slotIdx);
        if (result.success) savePlayer(p);
        socket.emit('sforge_result', result);
    });

    socket.on('sforge_use_skill', (slotIdx) => {
        const p = players[playerId]; if (!p) return;
        if (typeof slotIdx !== 'number') return;
        const result = spiritForge.useSoulSkill(p, slotIdx);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[영혼 스킬] ${p.displayName}: ${result.msg}`, type: 'normal' });
        }
        socket.emit('sforge_result', result);
    });

    socket.on('sforge_chimera', (chimeraId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof chimeraId !== 'string') return;
        const result = spiritForge.forgeChimera(p, chimeraId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[키메라 합성] ${p.displayName}: ${result.chimera.icon} ${result.chimera.name} 탄생!`, type: 'legendary' });
        }
        socket.emit('sforge_result', result);
    });

    socket.on('sforge_dissolve', ({ soulId, count }) => {
        const p = players[playerId]; if (!p) return;
        if (typeof soulId !== 'string') return;
        const n = (typeof count === 'number' && count > 0) ? Math.floor(count) : 1;
        const result = spiritForge.dissolveSoul(p, soulId, n);
        if (result.success) savePlayer(p);
        socket.emit('sforge_result', result);
    });
}

module.exports = { registerSpiritForgeHandlers };

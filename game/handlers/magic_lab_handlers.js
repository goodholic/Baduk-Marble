// 마법 연구소 소켓 핸들러 — v2.37

function registerMagicLabHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, magicLab } = ctx;

    socket.on('lab_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('lab_status', magicLab.getStatus(p));
    });

    socket.on('lab_research', (researchId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof researchId !== 'string') return;
        const result = magicLab.startResearch(p, researchId);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
        }
        socket.emit('lab_result', result);
    });

    socket.on('lab_check', () => {
        const p = players[playerId]; if (!p) return;
        const result = magicLab.checkResearch(p);
        if (result.completed) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[마법 연구소] ${p.displayName}: ${result.research.icon} ${result.research.name} 연구 완료!`, type: 'rare' });
            if (result.leveledUp) {
                io.emit('server_msg', { msg: `[연구소] Lv.${result.labLevel} 승급! 연구 속도 증가!`, type: 'normal' });
            }
        }
        socket.emit('lab_check_result', result);
    });

    socket.on('lab_fuse', (fusionId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof fusionId !== 'string') return;
        const result = magicLab.fuseSkills(p, fusionId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[스킬 결합] ${p.displayName}: ${result.fusion.icon} ${result.fusion.name} 해금!`, type: 'rare' });
        }
        socket.emit('lab_result', result);
    });

    socket.on('lab_use_book', (bookId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof bookId !== 'string') return;
        const result = magicLab.useSpellBook(p, bookId);
        if (result.success) savePlayer(p);
        socket.emit('lab_result', result);
    });
}

module.exports = { registerMagicLabHandlers };

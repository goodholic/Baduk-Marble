// 금서의 도서관 소켓 핸들러 — v2.48

function registerForbiddenLibraryHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, forbiddenLibrary } = ctx;

    socket.on('flib_status', () => { const p = players[playerId]; if (!p) return; socket.emit('flib_status', forbiddenLibrary.getStatus(p)); });

    socket.on('flib_enter', (sectionId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof sectionId !== 'string') return;
        const r = forbiddenLibrary.enterSection(p, sectionId);
        if (r.success) savePlayer(p);
        socket.emit('flib_result', r);
    });

    socket.on('flib_read', (tomeId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof tomeId !== 'string') return;
        const r = forbiddenLibrary.readTome(p, tomeId);
        if (r.success) {
            savePlayer(p);
            if (r.spellLearned) io.emit('server_msg', { msg: `[금서 도서관] ${p.displayName}: ${r.spellLearned.icon} ${r.spellLearned.name} 습득!`, type: 'rare' });
            if (r.madnessTriggered) io.emit('server_msg', { msg: `[금서 도서관] ${p.displayName}의 정신이 광기에 물들었다...!`, type: 'legendary' });
        }
        socket.emit('flib_result', r);
    });

    socket.on('flib_madness_boss', () => {
        const p = players[playerId]; if (!p) return;
        const r = forbiddenLibrary.fightMadnessBoss(p);
        if (r.success) { savePlayer(p); if (r.victory) io.emit('server_msg', { msg: `[광기 극복] ${p.displayName}: ${r.msg.split('\n')[0]}`, type: 'legendary' }); }
        socket.emit('flib_result', r);
    });

    socket.on('flib_purify', () => { const p = players[playerId]; if (!p) return; const r = forbiddenLibrary.purify(p); if (r.success) savePlayer(p); socket.emit('flib_result', r); });
    socket.on('flib_cast', (spellId) => { const p = players[playerId]; if (!p) return; if (typeof spellId !== 'string') return; const r = forbiddenLibrary.castSpell(p, spellId); if (r.success) savePlayer(p); socket.emit('flib_result', r); });
    socket.on('flib_leave', () => { const p = players[playerId]; if (!p) return; const r = forbiddenLibrary.leaveSection(p); if (r.success) savePlayer(p); socket.emit('flib_result', r); });
}

module.exports = { registerForbiddenLibraryHandlers };

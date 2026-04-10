// 부유 요새 소켓 핸들러 — v2.40

function registerFortressHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, floatingFortress } = ctx;

    socket.on('fort_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('fort_status', floatingFortress.getStatus(p));
    });

    socket.on('fort_build', (name) => {
        const p = players[playerId]; if (!p) return;
        const result = floatingFortress.buildFortress(p, name);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[부유 요새] ${p.displayName}이(가) 하늘 위에 요새를 건설했다!`, type: 'rare' });
        }
        socket.emit('fort_result', result);
    });

    socket.on('fort_upgrade', (facilityId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof facilityId !== 'string') return;
        const result = floatingFortress.upgradeFacility(p, facilityId);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
        }
        socket.emit('fort_result', result);
    });

    socket.on('fort_collect', () => {
        const p = players[playerId]; if (!p) return;
        const result = floatingFortress.collectResources(p);
        if (result.success) savePlayer(p);
        socket.emit('fort_result', result);
    });

    socket.on('fort_defense_start', () => {
        const p = players[playerId]; if (!p) return;
        const result = floatingFortress.startDefense(p);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[요새 방어] ${p.displayName}의 요새에 ${result.wave.icon} ${result.wave.name}!`, type: 'normal' });
        }
        socket.emit('fort_result', result);
    });

    socket.on('fort_defend', () => {
        const p = players[playerId]; if (!p) return;
        const result = floatingFortress.defendFortress(p);
        if (result.success) {
            savePlayer(p);
            if (result.type === 'victory') {
                io.emit('server_msg', { msg: `[요새 방어] ${p.displayName}: ${result.wave.icon} 격퇴 성공!`, type: 'rare' });
            }
        }
        socket.emit('fort_result', result);
    });

    socket.on('fort_repair', () => {
        const p = players[playerId]; if (!p) return;
        const result = floatingFortress.repairWall(p);
        if (result.success) savePlayer(p);
        socket.emit('fort_result', result);
    });

    socket.on('fort_theme', (themeId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof themeId !== 'string') return;
        const result = floatingFortress.changeTheme(p, themeId);
        if (result.success) savePlayer(p);
        socket.emit('fort_result', result);
    });

    socket.on('fort_visit', (targetId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof targetId !== 'string') return;
        const target = players[targetId];
        if (!target) { socket.emit('fort_result', { success: false, msg: '플레이어를 찾을 수 없습니다.' }); return; }
        const result = floatingFortress.visitFortress(p, target);
        socket.emit('fort_result', result);
    });
}

module.exports = { registerFortressHandlers };

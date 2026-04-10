// 달빛 성역 소켓 핸들러 — v2.38

function registerMoonlightHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, moonSanctuary, getIsNight } = ctx;

    socket.on('moon_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('moon_status', moonSanctuary.getStatus(p, getIsNight()));
    });

    socket.on('moon_enter', (floorId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof floorId !== 'string') return;
        const result = moonSanctuary.enterSanctuary(p, floorId, getIsNight());
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[달빛 성역] ${p.displayName}이(가) ${result.floor.icon} ${result.floor.name}에 입장!`, type: 'normal' });
        }
        socket.emit('moon_result', result);
    });

    socket.on('moon_fight', () => {
        const p = players[playerId]; if (!p) return;
        const result = moonSanctuary.fightInSanctuary(p);
        if (result.success) {
            savePlayer(p);
            if (result.type === 'boss_clear') {
                io.emit('server_msg', { msg: `[달빛 성역] ${p.displayName}: ${result.msg}`, type: 'rare' });
            }
        }
        socket.emit('moon_result', result);
    });

    socket.on('moon_hidden_boss', (bossId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof bossId !== 'string') return;
        const result = moonSanctuary.challengeHiddenBoss(p, bossId);
        if (result.success) {
            savePlayer(p);
            if (result.victory) {
                io.emit('server_msg', { msg: `[보름달] ${p.displayName}: ${result.msg}`, type: 'legendary' });
            }
        }
        socket.emit('moon_result', result);
    });

    socket.on('moon_blessing', () => {
        const p = players[playerId]; if (!p) return;
        const result = moonSanctuary.moonBlessing(p);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[달의 축복] ${p.displayName}: ${result.blessing.name}`, type: 'normal' });
        }
        socket.emit('moon_result', result);
    });
}

module.exports = { registerMoonlightHandlers };

// 환영 투기장 소켓 핸들러 — v2.45

function registerPhantomColosseumHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, phantomColosseum } = ctx;

    socket.on('phantom_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('phantom_status', phantomColosseum.getStatus(p));
    });

    socket.on('phantom_challenge', ({ phantomId, tier }) => {
        const p = players[playerId]; if (!p) return;
        if (typeof phantomId !== 'string') return;
        const result = phantomColosseum.challenge(p, phantomId, tier || 'common');
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[환영 투기장] ${p.displayName}이(가) ${result.tier.icon}${result.phantom.icon} ${result.phantom.name}에 도전!`, type: 'normal' });
        }
        socket.emit('phantom_result', result);
    });

    socket.on('phantom_fight', () => {
        const p = players[playerId]; if (!p) return;
        const result = phantomColosseum.fight(p);
        if (result.success) {
            savePlayer(p);
            if (result.type === 'victory') {
                const msgType = result.skillLearned ? 'legendary' : (result.streak >= 10 ? 'rare' : 'normal');
                io.emit('server_msg', { msg: `[환영 투기장] ${p.displayName}: ${result.msg.split('\n')[0]}`, type: msgType });
            }
        }
        socket.emit('phantom_result', result);
    });

    socket.on('phantom_use_skill', (phantomId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof phantomId !== 'string') return;
        const result = phantomColosseum.useLearnedSkill(p, phantomId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[환영 스킬] ${p.displayName}: ${result.msg}`, type: 'normal' });
        }
        socket.emit('phantom_result', result);
    });

    socket.on('phantom_forfeit', () => {
        const p = players[playerId]; if (!p) return;
        const result = phantomColosseum.forfeit(p);
        if (result.success) savePlayer(p);
        socket.emit('phantom_result', result);
    });
}

module.exports = { registerPhantomColosseumHandlers };

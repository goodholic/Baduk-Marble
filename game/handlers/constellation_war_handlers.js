// 별자리 전쟁 소켓 핸들러 — v2.47

function registerConstellationWarHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, constellationWar } = ctx;

    socket.on('cwar_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('cwar_status', constellationWar.getStatus(p, players));
    });

    socket.on('cwar_choose', (zodiacId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof zodiacId !== 'string') return;
        const result = constellationWar.chooseZodiac(p, zodiacId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[별자리 전쟁] ${p.displayName}이(가) ${result.sign.icon} ${result.sign.name} 진영에 합류!`, type: 'normal' });
        }
        socket.emit('cwar_result', result);
    });

    socket.on('cwar_offering', (amount) => {
        const p = players[playerId]; if (!p) return;
        if (typeof amount !== 'number') return;
        const result = constellationWar.offering(p, amount);
        if (result.success) savePlayer(p);
        socket.emit('cwar_result', result);
    });

    socket.on('cwar_summon', () => {
        const p = players[playerId]; if (!p) return;
        const result = constellationWar.summonPatron(p);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[별자리 전쟁] ${result.sign.icon} ${result.patron.icon} ${result.patron.name} 소환! (by ${p.displayName})`, type: 'legendary' });
        }
        socket.emit('cwar_result', result);
    });

    socket.on('cwar_attack', (territoryId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof territoryId !== 'string') return;
        const result = constellationWar.attackTerritory(p, territoryId);
        if (result.success) {
            savePlayer(p);
            if (result.msg.includes('점령')) {
                io.emit('server_msg', { msg: `[성좌 점령] ${p.displayName}: ${result.msg.split('\n').pop()}`, type: 'rare' });
            }
        }
        socket.emit('cwar_result', result);
    });

    socket.on('cwar_claim_reward', () => {
        const p = players[playerId]; if (!p) return;
        const result = constellationWar.claimWarReward(p);
        if (result.success) savePlayer(p);
        socket.emit('cwar_result', result);
    });

    socket.on('cwar_buy', (itemId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof itemId !== 'string') return;
        const result = constellationWar.buyStardustItem(p, itemId);
        if (result.success) savePlayer(p);
        socket.emit('cwar_result', result);
    });
}

module.exports = { registerConstellationWarHandlers };

// 운명의 결투 소켓 핸들러 — v2.43

function registerFateDuelHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, fateDuel } = ctx;

    socket.on('fate_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('fate_status', fateDuel.getStatus(p));
    });

    socket.on('fate_open_pack', (packId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof packId !== 'string') return;
        const result = fateDuel.openPack(p, packId);
        if (result.success) {
            savePlayer(p);
            const hasTier4 = result.cards.some(c => c.tier >= 4);
            if (hasTier4) {
                io.emit('server_msg', { msg: `[운명의 카드] ${p.displayName}이(가) 전설 카드를 뽑았다!`, type: 'legendary' });
            }
        }
        socket.emit('fate_result', result);
    });

    socket.on('fate_edit_deck', (newDeck) => {
        const p = players[playerId]; if (!p) return;
        if (!Array.isArray(newDeck)) return;
        const result = fateDuel.editDeck(p, newDeck);
        if (result.success) savePlayer(p);
        socket.emit('fate_result', result);
    });

    socket.on('fate_start_duel', () => {
        const p = players[playerId]; if (!p) return;
        const result = fateDuel.startDuel(p);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[운명의 결투] ${p.displayName}이(가) 운명에 도전한다!`, type: 'normal' });
        }
        socket.emit('fate_result', result);
    });

    socket.on('fate_play_card', (cardId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof cardId !== 'string') return;
        const result = fateDuel.playCard(p, cardId);
        if (result.success) {
            savePlayer(p);
            if (result.type === 'victory' && result.winStreak >= 5) {
                io.emit('server_msg', { msg: `[운명의 결투] ${p.displayName}: ${result.winStreak}연승! 레이팅 ${result.rating}`, type: 'rare' });
            }
        }
        socket.emit('fate_result', result);
    });
}

module.exports = { registerFateDuelHandlers };

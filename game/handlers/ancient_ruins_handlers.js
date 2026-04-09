// 고대 유적 소켓 핸들러 — v2.34

function registerAncientRuinsHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, ancientRuins, trackQuest } = ctx;

    socket.on('ruins_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('ruins_status', ancientRuins.getStatus(p));
    });

    socket.on('ruins_enter', () => {
        const p = players[playerId]; if (!p || !p.isAlive) return;
        const result = ancientRuins.enterRuins(p);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[유적] ${p.displayName}이(가) 고대 유적에 입장!`, type: 'normal' });
        }
        socket.emit('ruins_result', result);
    });

    socket.on('ruins_move', (roomId) => {
        const p = players[playerId]; if (!p) return;
        const id = Math.floor(Number(roomId));
        if (!Number.isFinite(id)) return;
        const result = ancientRuins.moveToRoom(p, id);
        if (result.success) {
            if (result.newFloor) {
                io.emit('server_msg', { msg: `[유적] ${p.displayName} ${result.floor}층 도달!`, type: 'normal' });
            }
            savePlayer(p);
        }
        socket.emit('ruins_result', result);
    });

    socket.on('ruins_interact', (action) => {
        const p = players[playerId]; if (!p) return;
        const result = ancientRuins.interact(p, action);
        if (result.success) {
            if (result.cleared && result.reward) {
                if (trackQuest) trackQuest(p, 'dungeon_clear', 1);
            }
            savePlayer(p);
            io.emit('player_update', p);
        }
        socket.emit('ruins_result', result);
    });

    socket.on('ruins_buy', (itemIndex) => {
        const p = players[playerId]; if (!p) return;
        const idx = Math.floor(Number(itemIndex));
        if (!Number.isFinite(idx)) return;
        const result = ancientRuins.buyFromMerchant(p, idx);
        if (result.success) savePlayer(p);
        socket.emit('ruins_result', result);
    });

    socket.on('ruins_abandon', () => {
        const p = players[playerId]; if (!p) return;
        const result = ancientRuins.abandon(p);
        socket.emit('ruins_result', result);
    });
}

module.exports = { registerAncientRuinsHandlers };

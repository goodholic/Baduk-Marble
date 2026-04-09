// 유물 조합 소켓 핸들러 — v2.25

function registerRelicFusionHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, relicFusion } = ctx;

    socket.on('relic_fusion_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('relic_fusion_status', relicFusion.getStatus(p));
    });

    socket.on('relic_fuse', (data) => {
        const p = players[playerId]; if (!p) return;
        if (!data || !data.r1 || !data.r2 || !data.r3) { socket.emit('relic_fusion_result', { success: false, msg: '유물 3개 필요' }); return; }
        const result = relicFusion.fuseRelics(p, data.r1, data.r2, data.r3);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
            if (result.isHidden && result.isNewDiscovery) {
                io.emit('server_msg', { msg: `[히든 발견] ${p.displayName}이(가) ${result.result.icon} ${result.result.name} 발견!`, type: 'boss' });
            } else {
                io.emit('server_msg', { msg: `[유물 조합] ${p.displayName}: ${result.result.icon} ${result.result.name} 제작!`, type: 'rare' });
            }
        }
        socket.emit('relic_fusion_result', result);
    });

    socket.on('relic_fusion_equip', (recipeId) => {
        const p = players[playerId]; if (!p) return;
        const result = relicFusion.equipFusion(p, recipeId);
        if (result.success) savePlayer(p);
        socket.emit('relic_fusion_result', result);
    });

    socket.on('relic_fusion_unequip', (recipeId) => {
        const p = players[playerId]; if (!p) return;
        const result = relicFusion.unequipFusion(p, recipeId);
        if (result.success) savePlayer(p);
        socket.emit('relic_fusion_result', result);
    });

    socket.on('relic_fusion_book', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('relic_fusion_book', relicFusion.getRecipeBook(p));
    });
}

module.exports = { registerRelicFusionHandlers };

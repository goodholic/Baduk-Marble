// 소원 나무 소켓 핸들러 — v2.30

function registerWishTreeHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, wishTree } = ctx;

    socket.on('wish_tree_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('wish_tree_status', wishTree.getStatus(p));
    });

    socket.on('wish_tree_plant', (treeType) => {
        const p = players[playerId]; if (!p) return;
        if (typeof treeType !== 'string') return;
        const result = wishTree.plantTree(p, treeType);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[소원 나무] ${p.displayName}이(가) ${result.tree.icon} ${result.tree.name}를 심었습니다!`, type: 'morph' });
        }
        socket.emit('wish_tree_result', result);
    });

    socket.on('wish_tree_water', () => {
        const p = players[playerId]; if (!p) return;
        const result = wishTree.water(p);
        if (result.success) {
            savePlayer(p);
            if (result.leveledUp) {
                io.emit('server_msg', { msg: `[소원 나무] ${p.displayName}의 나무가 Lv.${result.level}로 성장!`, type: 'normal' });
            }
        }
        socket.emit('wish_tree_result', result);
    });

    socket.on('wish_tree_harvest', (fruitIndex) => {
        const p = players[playerId]; if (!p) return;
        const idx = Math.floor(Number(fruitIndex));
        if (!Number.isFinite(idx) || idx < 0) return;
        const result = wishTree.harvest(p, idx);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
            if (result.fruit.rarity === 'legendary') {
                io.emit('server_msg', { msg: `[소원 나무] ${p.displayName}이(가) ${result.fruit.icon} ${result.fruit.name} 수확!`, type: 'rare' });
            }
        }
        socket.emit('wish_tree_result', result);
    });

    socket.on('wish_tree_wish', (wishId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof wishId !== 'string') return;
        const result = wishTree.makeWish(p, wishId);
        if (result.success) savePlayer(p);
        socket.emit('wish_tree_result', result);
    });
}

module.exports = { registerWishTreeHandlers };

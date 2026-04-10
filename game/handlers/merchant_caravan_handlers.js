// 상인 캐러밴 소켓 핸들러 — v2.50

function registerMerchantCaravanHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, merchantCaravan } = ctx;

    socket.on('caravan_status', () => { const p = players[playerId]; if (!p) return; socket.emit('caravan_status', merchantCaravan.getStatus(p)); });

    socket.on('caravan_establish', (name) => {
        const p = players[playerId]; if (!p) return;
        const r = merchantCaravan.establish(p, name);
        if (r.success) { savePlayer(p); io.emit('server_msg', { msg: `[상인 캐러밴] ${p.displayName}: "${p._caravan.caravanName}" 상단 설립!`, type: 'normal' }); }
        socket.emit('caravan_result', r);
    });

    socket.on('caravan_upgrade', (upgradeId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof upgradeId !== 'string') return;
        const r = merchantCaravan.upgrade(p, upgradeId);
        if (r.success) savePlayer(p);
        socket.emit('caravan_result', r);
    });

    socket.on('caravan_buy', ({ cityId, count }) => {
        const p = players[playerId]; if (!p) return;
        if (typeof cityId !== 'string') return;
        const n = (typeof count === 'number' && count > 0) ? Math.floor(count) : 1;
        const r = merchantCaravan.buyGoods(p, cityId, n);
        if (r.success) savePlayer(p);
        socket.emit('caravan_result', r);
    });

    socket.on('caravan_depart', (destinationId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof destinationId !== 'string') return;
        const r = merchantCaravan.depart(p, destinationId);
        if (r.success) { savePlayer(p); io.emit('server_msg', { msg: `[캐러밴] ${p.displayName}의 상단이 ${r.destination.icon} ${r.destination.name}으로 출발!`, type: 'normal' }); }
        socket.emit('caravan_result', r);
    });

    socket.on('caravan_arrive', () => {
        const p = players[playerId]; if (!p) return;
        const r = merchantCaravan.arrive(p);
        if (r.success) { savePlayer(p); io.emit('server_msg', { msg: `[캐러밴] ${p.displayName}: 교역 완료! ${r.totalRevenue}G 수익`, type: 'normal' }); }
        socket.emit('caravan_result', r);
    });
}

module.exports = { registerMerchantCaravanHandlers };

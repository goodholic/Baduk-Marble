// 도전 과제 소켓 핸들러 — v2.27

function registerAchievementHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, achievements } = ctx;

    socket.on('achievement_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('achievement_status', achievements.getStatus(p));
    });

    socket.on('achievement_claim', (data) => {
        const p = players[playerId]; if (!p) return;
        if (!data || !data.id || !data.tier) return;
        const tier = Math.floor(Number(data.tier));
        if (!Number.isFinite(tier) || tier < 1 || tier > 5) return;
        const result = achievements.claimReward(p, data.id, tier);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
            if (tier >= 4) {
                io.emit('server_msg', { msg: `[업적] ${p.displayName} "${result.tierName}" 달성!`, type: 'rare' });
            }
        }
        socket.emit('achievement_result', result);
    });

    socket.on('achievement_set_frame', (frameId) => {
        const p = players[playerId]; if (!p) return;
        const state = p._achievements;
        if (!state) return;
        state.profileFrame = frameId || null;
        savePlayer(p);
        socket.emit('achievement_result', { success: true, msg: '프레임 변경' });
    });
}

module.exports = { registerAchievementHandlers };

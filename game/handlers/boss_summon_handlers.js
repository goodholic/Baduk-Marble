// 보스 소환 소켓 핸들러 — v2.20

function registerBossSummonHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, bossSummon } = ctx;

    socket.on('summon_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('summon_status', bossSummon.getStatus(p));
    });

    socket.on('summon_synthesize', (summonId) => {
        const p = players[playerId]; if (!p) return;
        const result = bossSummon.synthesize(p, summonId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[소환] ${p.displayName}이(가) ${result.creature.nickname} 소환!`, type: 'morph' });
        }
        socket.emit('summon_result', result);
    });

    socket.on('summon_evolve', (data) => {
        const p = players[playerId]; if (!p || !data) return;
        const result = bossSummon.evolve(p, data.id1, data.id2);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[소환] ${p.displayName}의 ${result.evolved.nickname} 진화!`, type: 'rare' });
        }
        socket.emit('summon_result', result);
    });

    socket.on('summon_set_active', (ids) => {
        const p = players[playerId]; if (!p) return;
        const result = bossSummon.setActive(p, Array.isArray(ids) ? ids : []);
        socket.emit('summon_active_result', result);
        if (result.success) savePlayer(p);
    });

    socket.on('summon_boss', (bossId) => {
        const p = players[playerId]; if (!p) return;
        const result = bossSummon.summonBoss(p, bossId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[보스 소환] ${p.displayName}이(가) ${result.boss.name} 소환! 모두 도전하세요!`, type: 'boss' });
            // 보스를 월드에 스폰 (io.emit으로 클라이언트에 알림)
            io.emit('summon_boss_spawn', {
                summonerId: playerId,
                summonerName: p.displayName,
                boss: result.boss,
                x: p.x, y: p.y,
            });
        }
        socket.emit('summon_result', result);
    });

    socket.on('summon_boss_claim', (bossId) => {
        const p = players[playerId]; if (!p) return;
        const result = bossSummon.claimBossReward(p, bossId);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
        }
        socket.emit('summon_claim_result', result);
    });
}

module.exports = { registerBossSummonHandlers };

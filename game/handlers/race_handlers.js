// 종족 소켓 핸들러 — v2.24

function registerRaceHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, raceSystem } = ctx;

    socket.on('race_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('race_status', raceSystem.getStatus(p));
    });

    socket.on('race_select', (raceId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof raceId !== 'string') return;
        const result = raceSystem.selectRace(p, raceId);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
            io.emit('server_msg', {
                msg: `[종족] ${p.displayName}이(가) ${result.race.icon} ${result.race.name} 종족을 선택!`,
                type: 'rare'
            });
        }
        socket.emit('race_result', result);
    });

    socket.on('race_skill', () => {
        const p = players[playerId]; if (!p || !p.isAlive) return;
        const result = raceSystem.useRaceSkill(p);
        if (result.success) {
            savePlayer(p);
            io.emit('skill_effect', {
                casterId: playerId, skillName: result.skill.name,
                type: 'race_skill', icon: result.skill.icon,
                targetX: p.x, targetY: p.y,
            });
            io.emit('player_update', p);
        }
        socket.emit('race_skill_result', result);
    });
}

module.exports = { registerRaceHandlers };

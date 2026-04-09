// 시간 여행 던전 소켓 핸들러 — v2.32

function registerTimeDungeonHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, timeDungeon, trackQuest } = ctx;

    socket.on('time_dungeon_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('time_dungeon_status', timeDungeon.getStatus(p));
    });

    socket.on('time_dungeon_enter', (eraId) => {
        const p = players[playerId]; if (!p || !p.isAlive) return;
        if (typeof eraId !== 'string') return;
        const result = timeDungeon.enter(p, eraId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[시간 던전] ${p.displayName} → ${result.era.icon} ${result.era.name}`, type: 'normal' });
        }
        socket.emit('time_dungeon_result', result);
    });

    socket.on('time_dungeon_kill', () => {
        const p = players[playerId]; if (!p) return;
        const result = timeDungeon.killMonster(p);
        if (result.success) {
            if (result.dungeonClear) {
                if (trackQuest) trackQuest(p, 'dungeon_clear', 1);
                savePlayer(p);
                io.emit('server_msg', { msg: `[시간 던전] ${p.displayName} ${result.msg}`, type: 'rare' });
                io.emit('player_update', p);
            } else if (result.stageClear) {
                savePlayer(p);
            }
        }
        socket.emit('time_dungeon_result', result);
    });

    socket.on('time_dungeon_abandon', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('time_dungeon_result', timeDungeon.abandon(p));
    });
}

module.exports = { registerTimeDungeonHandlers };

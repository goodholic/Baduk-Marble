// 날씨 던전 소켓 핸들러 — v2.21

function registerWeatherDungeonHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, weatherDungeon, getCurrentWeather, trackQuest } = ctx;

    socket.on('weather_dungeon_status', () => {
        const p = players[playerId]; if (!p) return;
        const w = getCurrentWeather();
        socket.emit('weather_dungeon_status', weatherDungeon.getStatus(p, w.id));
    });

    socket.on('weather_dungeon_enter', (dungeonId) => {
        const p = players[playerId]; if (!p || !p.isAlive) return;
        const w = getCurrentWeather();
        const result = weatherDungeon.enter(p, dungeonId, w.id);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[날씨 던전] ${p.displayName}이(가) ${result.dungeon.icon} ${result.dungeon.name} 입장!`, type: 'normal' });
        }
        socket.emit('weather_dungeon_result', result);
    });

    socket.on('weather_dungeon_kill', () => {
        const p = players[playerId]; if (!p) return;
        const result = weatherDungeon.killMonster(p);
        if (result.success) {
            if (result.dungeonClear) {
                if (trackQuest) trackQuest(p, 'dungeon_clear', 1);
                savePlayer(p);
                io.emit('server_msg', { msg: `[날씨 던전] ${p.displayName}이(가) 날씨 던전 클리어! (${result.clearTime}초)`, type: 'rare' });
                io.emit('player_update', p);
            } else if (result.stageClear) {
                savePlayer(p);
            }
        }
        socket.emit('weather_dungeon_result', result);
    });

    socket.on('weather_dungeon_abandon', () => {
        const p = players[playerId]; if (!p) return;
        const result = weatherDungeon.abandon(p);
        socket.emit('weather_dungeon_result', result);
    });
}

module.exports = { registerWeatherDungeonHandlers };

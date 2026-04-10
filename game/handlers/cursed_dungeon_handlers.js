// 저주받은 던전 소켓 핸들러 — v2.42

function registerCursedDungeonHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, cursedDungeon } = ctx;

    socket.on('cdung_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('cdung_status', cursedDungeon.getStatus(p));
    });

    socket.on('cdung_enter', () => {
        const p = players[playerId]; if (!p) return;
        const result = cursedDungeon.enterDungeon(p);
        if (result.success) {
            savePlayer(p);
            const curseCount = result.curses.length;
            io.emit('server_msg', { msg: `[저주 던전] ${p.displayName}이(가) 저주 ${curseCount}개를 안고 입장!${result.combo ? ' 🔥 저주 조합 발동!' : ''}`, type: 'normal' });
        }
        socket.emit('cdung_result', result);
    });

    socket.on('cdung_fight', () => {
        const p = players[playerId]; if (!p) return;
        const result = cursedDungeon.fight(p);
        if (result.success) {
            savePlayer(p);
            if (result.type === 'boss_clear') {
                io.emit('server_msg', { msg: `[저주 던전] ${p.displayName}: ${result.msg}`, type: 'legendary' });
            }
        }
        socket.emit('cdung_result', result);
    });

    socket.on('cdung_next_floor', (altarChoice) => {
        const p = players[playerId]; if (!p) return;
        if (altarChoice && typeof altarChoice !== 'string') return;
        const result = cursedDungeon.nextFloor(p, altarChoice);
        if (result.success) {
            savePlayer(p);
            if (result.type === 'boss_appear') {
                io.emit('server_msg', { msg: `[저주 던전] ${p.displayName}: 보스 조우! ${result.boss.icon} ${result.boss.name}`, type: 'rare' });
            }
        }
        socket.emit('cdung_result', result);
    });

    socket.on('cdung_abandon', () => {
        const p = players[playerId]; if (!p) return;
        const result = cursedDungeon.abandonDungeon(p);
        if (result.success) savePlayer(p);
        socket.emit('cdung_result', result);
    });
}

module.exports = { registerCursedDungeonHandlers };

// 꿈의 건축가 소켓 핸들러 — v2.46

function registerDreamArchitectHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, dreamArchitect } = ctx;

    // ── 건축 ──

    socket.on('darch_my_dungeon', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('darch_my_dungeon', dreamArchitect.getMyDungeon(p));
    });

    socket.on('darch_create', (name) => {
        const p = players[playerId]; if (!p) return;
        const result = dreamArchitect.createDungeon(p, name);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[꿈의 건축가] ${p.displayName}이(가) 꿈의 던전을 건설했다!`, type: 'rare' });
        }
        socket.emit('darch_result', result);
    });

    socket.on('darch_add_room', (themeId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof themeId !== 'string') return;
        const result = dreamArchitect.addRoom(p, themeId);
        if (result.success) savePlayer(p);
        socket.emit('darch_result', result);
    });

    socket.on('darch_set_theme', ({ roomIdx, themeId }) => {
        const p = players[playerId]; if (!p) return;
        if (typeof roomIdx !== 'number' || typeof themeId !== 'string') return;
        const result = dreamArchitect.setRoomTheme(p, roomIdx, themeId);
        if (result.success) savePlayer(p);
        socket.emit('darch_result', result);
    });

    socket.on('darch_place_trap', ({ roomIdx, trapId }) => {
        const p = players[playerId]; if (!p) return;
        if (typeof roomIdx !== 'number' || typeof trapId !== 'string') return;
        const result = dreamArchitect.placeTrap(p, roomIdx, trapId);
        if (result.success) savePlayer(p);
        socket.emit('darch_result', result);
    });

    socket.on('darch_remove_trap', ({ roomIdx, trapIdx }) => {
        const p = players[playerId]; if (!p) return;
        if (typeof roomIdx !== 'number' || typeof trapIdx !== 'number') return;
        const result = dreamArchitect.removeTrap(p, roomIdx, trapIdx);
        if (result.success) savePlayer(p);
        socket.emit('darch_result', result);
    });

    socket.on('darch_place_guardian', ({ roomIdx, guardianId }) => {
        const p = players[playerId]; if (!p) return;
        if (typeof roomIdx !== 'number' || typeof guardianId !== 'string') return;
        const result = dreamArchitect.placeGuardian(p, roomIdx, guardianId);
        if (result.success) savePlayer(p);
        socket.emit('darch_result', result);
    });

    socket.on('darch_remove_guardian', (roomIdx) => {
        const p = players[playerId]; if (!p) return;
        if (typeof roomIdx !== 'number') return;
        const result = dreamArchitect.removeGuardian(p, roomIdx);
        if (result.success) savePlayer(p);
        socket.emit('darch_result', result);
    });

    socket.on('darch_publish', () => {
        const p = players[playerId]; if (!p) return;
        const result = dreamArchitect.togglePublish(p);
        if (result.success) {
            savePlayer(p);
            if (result.published) {
                io.emit('server_msg', { msg: `[꿈의 던전] "${p._dreamArch.dungeonName}" (by ${p.displayName}) 공개!`, type: 'normal' });
            }
        }
        socket.emit('darch_result', result);
    });

    // ── 도전 ──

    socket.on('darch_challenge_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('darch_challenge_status', dreamArchitect.getChallengeStatus(p));
    });

    socket.on('darch_challenge', (targetId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof targetId !== 'string') return;
        const target = players[targetId];
        if (!target) { socket.emit('darch_result', { success: false, msg: '플레이어를 찾을 수 없습니다.' }); return; }
        const result = dreamArchitect.challengeDungeon(p, target);
        if (result.success) {
            savePlayer(p);
            savePlayer(target);
            io.emit('server_msg', { msg: `[꿈 도전] ${p.displayName}이(가) "${result.dungeonName}" (by ${result.ownerName})에 도전!`, type: 'normal' });
        }
        socket.emit('darch_result', result);
    });

    socket.on('darch_clear_room', () => {
        const p = players[playerId]; if (!p) return;
        const result = dreamArchitect.clearRoom(p);
        if (result.success) {
            savePlayer(p);
            if (result.type === 'dungeon_clear') {
                io.emit('server_msg', { msg: `[꿈 클리어] ${p.displayName}: "${result.dungeonName}" 완전 클리어! (${result.clearTime}초)`, type: 'rare' });
            } else if (result.type === 'death') {
                io.emit('server_msg', { msg: `[꿈 도전] ${p.displayName}: ${result.room}번 방에서 쓰러졌다...`, type: 'normal' });
            }
        }
        socket.emit('darch_result', result);
    });

    socket.on('darch_abandon', () => {
        const p = players[playerId]; if (!p) return;
        const result = dreamArchitect.abandonChallenge(p);
        if (result.success) savePlayer(p);
        socket.emit('darch_result', result);
    });

    socket.on('darch_rate', ({ targetId, score }) => {
        const p = players[playerId]; if (!p) return;
        if (typeof targetId !== 'string' || typeof score !== 'number') return;
        const target = players[targetId];
        if (!target || !target._dreamArch) { socket.emit('darch_result', { success: false, msg: '던전을 찾을 수 없습니다.' }); return; }
        const result = dreamArchitect.rateDungeon(p, target._dreamArch, score);
        if (result.success) savePlayer(target);
        socket.emit('darch_result', result);
    });

    // ── 공개 던전 목록 ──
    socket.on('darch_list', () => {
        const list = [];
        for (const pid in players) {
            const pl = players[pid];
            if (pl && pl._dreamArch && pl._dreamArch.hasDungeon && pl._dreamArch.published) {
                list.push({
                    ownerId: pid,
                    ownerName: pl.displayName,
                    dungeonName: pl._dreamArch.dungeonName,
                    rooms: pl._dreamArch.rooms.length,
                    rating: pl._dreamArch.rating,
                    ratingCount: pl._dreamArch.ratingCount,
                    likes: pl._dreamArch.likes,
                    challengers: pl._dreamArch.stats.totalChallengers,
                    clears: pl._dreamArch.stats.totalClears,
                    clearRate: pl._dreamArch.stats.totalChallengers > 0
                        ? Math.floor((pl._dreamArch.stats.totalClears / pl._dreamArch.stats.totalChallengers) * 100) : 0,
                });
            }
        }
        list.sort((a, b) => b.likes - a.likes);
        socket.emit('darch_list', list.slice(0, 20));
    });
}

module.exports = { registerDreamArchitectHandlers };

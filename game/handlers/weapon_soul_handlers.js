// 무기 영혼 각성 소켓 핸들러 — v2.39

function registerWeaponSoulHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, weaponSoul } = ctx;

    socket.on('wsoul_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('wsoul_status', weaponSoul.getStatus(p));
    });

    socket.on('wsoul_awaken', (soulTypeId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof soulTypeId !== 'string') return;
        const result = weaponSoul.awakenSoul(p, soulTypeId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[영혼 각성] ${p.displayName}의 무기에 ${result.soulType.icon} ${result.soulType.name}이(가) 깃들었다!`, type: 'rare' });
        }
        socket.emit('wsoul_result', result);
    });

    socket.on('wsoul_rename', (newName) => {
        const p = players[playerId]; if (!p) return;
        if (typeof newName !== 'string') return;
        const result = weaponSoul.renameSoul(p, newName);
        if (result.success) savePlayer(p);
        socket.emit('wsoul_result', result);
    });

    socket.on('wsoul_talk', (context) => {
        const p = players[playerId]; if (!p) return;
        const result = weaponSoul.talkToSoul(p, context || 'idle');
        if (result.success) savePlayer(p);
        socket.emit('wsoul_result', result);
    });

    socket.on('wsoul_skill', (skillId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof skillId !== 'string') return;
        const result = weaponSoul.unlockSoulSkill(p, skillId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[무기 영혼] ${p.displayName}: ${result.skill.icon} ${result.skill.name} 해금!`, type: 'normal' });
        }
        socket.emit('wsoul_result', result);
    });

    socket.on('wsoul_merge', () => {
        const p = players[playerId]; if (!p) return;
        const result = weaponSoul.soulMerge(p);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[영혼 합일] ${p.displayName}이(가) 무기와 하나가 되었다! (30초)`, type: 'legendary' });
        }
        socket.emit('wsoul_result', result);
    });
}

module.exports = { registerWeaponSoulHandlers };

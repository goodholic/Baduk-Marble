// 스킬 웨이브 소켓 핸들러 — v2.26

function registerSkillWaveHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, skillWave } = ctx;

    socket.on('skill_wave_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('skill_wave_status', skillWave.getStatus(p));
    });

    socket.on('skill_wave_book', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('skill_wave_book', skillWave.getWaveBook(p));
    });

    // 스킬 시전 시 자동 호출 (클라이언트에서 스킬 사용 후 emit)
    socket.on('skill_wave_record', (skillId) => {
        const p = players[playerId]; if (!p || !p.isAlive) return;
        if (typeof skillId !== 'string') return;
        const result = skillWave.recordSkill(p, skillId);
        if (result.triggered) {
            savePlayer(p);
            socket.emit('skill_wave_triggered', {
                wave: result.wave,
                comboStreak: result.comboStreak,
                isNewDiscovery: result.isNewDiscovery,
            });
            if (result.isHidden && result.isNewDiscovery) {
                io.emit('server_msg', {
                    msg: `[히든 웨이브] ${p.displayName}이(가) ${result.wave.icon} ${result.wave.name} 발견!`,
                    type: 'boss',
                });
            } else {
                io.emit('skill_effect', {
                    casterId: playerId,
                    skillName: result.wave.name,
                    type: 'skill_wave',
                    icon: result.wave.icon,
                    targetX: p.x, targetY: p.y,
                    radius: result.wave.effect.radius || 5,
                });
            }
            // 연쇄 보너스 알림
            if (result.comboStreak >= 3) {
                io.emit('server_msg', {
                    msg: `[웨이브 연쇄] ${p.displayName} ${result.comboStreak}연쇄!`,
                    type: 'rare',
                });
            }
        } else if (result.onCooldown) {
            socket.emit('skill_wave_cooldown', { waveId: result.waveId, remain: result.remain });
        }
    });
}

module.exports = { registerSkillWaveHandlers };

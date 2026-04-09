// 슈퍼 보스 소켓 핸들러 — v2.28

function registerSuperBossHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, superBoss, trackQuest } = ctx;

    socket.on('super_boss_status', () => {
        socket.emit('super_boss_status', superBoss.getStatus());
    });

    socket.on('super_boss_attack', () => {
        const p = players[playerId]; if (!p || !p.isAlive) return;
        const active = superBoss.getActiveBoss();
        if (!active) { socket.emit('super_boss_result', { msg: '활성 슈퍼 보스 없음' }); return; }

        // 플레이어 ATK 기반 데미지 (버프 포함)
        const baseDmg = Math.max(1, (p.atk || 10) * (p.dmgMulti || 1));
        const crit = Math.random() < (p.critRate || 0.1);
        const damage = Math.floor(baseDmg * (crit ? 2.0 : 1.0));

        const result = superBoss.dealDamage(playerId, damage);
        if (!result.success) return;

        socket.emit('super_boss_hit', { damage, crit, hp: result.hp, maxHp: result.maxHp });

        if (result.phaseChanged) {
            io.emit('super_boss_phase', { phase: result.phase, name: result.phaseName, mechanic: result.mechanic });
            io.emit('server_msg', { msg: `[슈퍼 보스] ${result.phaseName} 돌입!`, type: 'boss' });
        }

        if (result.dead) {
            const rewards = superBoss.distributeRewards();
            if (rewards) {
                io.emit('server_msg', {
                    msg: `[슈퍼 보스] ${rewards.bossIcon} ${rewards.bossName} 처치! ${rewards.clearTime}초, ${rewards.totalParticipants}명 참여!`,
                    type: 'boss',
                });
                // 보상 분배
                for (const [pid, data] of Object.entries(rewards.rewards)) {
                    const pp = players[pid]; if (!pp) continue;
                    const r = data.reward;
                    if (r.gold) pp.gold = Math.min(999999999, (pp.gold || 0) + r.gold);
                    if (r.exp) pp.exp = (pp.exp || 0) + r.exp;
                    if (r.diamonds) pp.diamonds = Math.min(9999999, (pp.diamonds || 0) + r.diamonds);
                    if (r.item) { if (!pp.inventory) pp.inventory = {}; pp.inventory[r.item] = (pp.inventory[r.item] || 0) + 1; }
                    if (r.title) { if (!pp.titles) pp.titles = []; if (!pp.titles.includes(r.title)) pp.titles.push(r.title); }
                    if (trackQuest) trackQuest(pp, 'worldboss_kill', 1);
                    if (data.tier === 'mvp' && trackQuest) trackQuest(pp, 'worldboss_mvp', 1);
                    savePlayer(pp);
                    io.to(pid).emit('super_boss_reward', { tier: data.tier, rank: data.rank, damage: data.damage, reward: r });
                    io.emit('player_update', pp);
                }
                if (rewards.mvp) {
                    const mvpP = players[rewards.mvp.playerId];
                    io.emit('server_msg', {
                        msg: `[MVP] ${mvpP?.displayName || '???'} — 데미지 ${rewards.mvp.damage.toLocaleString()} (${Math.floor(rewards.mvp.damage / rewards.totalDamage * 100)}%)`,
                        type: 'rare',
                    });
                }
            }
        }
    });
}

module.exports = { registerSuperBossHandlers };

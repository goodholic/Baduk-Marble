// 세계 보스 연대기 소켓 핸들러 — v2.35

function registerChronicleHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, chronicle, trackQuest } = ctx;

    socket.on('chronicle_status', () => {
        socket.emit('chronicle_status', chronicle.getStatus());
    });

    socket.on('chronicle_activate', () => {
        const result = chronicle.activateBoss();
        if (result.success) {
            io.emit('server_msg', { msg: `[연대기] ${result.stage} — ${result.boss.icon} ${result.boss.name} 출현! "${result.lore}"`, type: 'boss' });
            io.emit('chronicle_boss_spawn', result);
        }
        socket.emit('chronicle_result', result);
    });

    socket.on('chronicle_attack', () => {
        const p = players[playerId]; if (!p || !p.isAlive) return;
        const dmg = Math.max(1, Math.floor((p.atk || 10) * (p.dmgMulti || 1)));
        const crit = Math.random() < (p.critRate || 0.1);
        const damage = Math.floor(dmg * (crit ? 2 : 1));

        const result = chronicle.dealDamage(playerId, p.displayName, damage);
        if (!result.success) return;

        socket.emit('chronicle_hit', { damage, crit, hp: result.hp, maxHp: result.maxHp });

        if (result.dead) {
            const rewards = chronicle.distributeStageRewards();
            if (rewards) {
                io.emit('server_msg', { msg: `[연대기] ${rewards.bossName} 처치! ${rewards.totalParticipants}명 참여!`, type: 'boss' });
                for (const [pid, data] of Object.entries(rewards.rewards)) {
                    const pp = players[pid]; if (!pp) continue;
                    const r = data.reward;
                    if (r.gold) pp.gold = Math.min(999999999, (pp.gold || 0) + r.gold);
                    if (r.exp) pp.exp = (pp.exp || 0) + r.exp;
                    if (r.diamonds) pp.diamonds = Math.min(9999999, (pp.diamonds || 0) + r.diamonds);
                    if (r.item) { if (!pp.inventory) pp.inventory = {}; pp.inventory[r.item] = (pp.inventory[r.item] || 0) + 1; }
                    if (r.title) { if (!pp.titles) pp.titles = []; if (!pp.titles.includes(r.title)) pp.titles.push(r.title); }
                    if (trackQuest) trackQuest(pp, 'worldboss_kill', 1);
                    savePlayer(pp);
                    io.to(pid).emit('chronicle_reward', data);
                    io.emit('player_update', pp);
                }
                // 다음 스테이지 진행
                const advance = chronicle.advanceStage();
                if (advance.allCleared) {
                    io.emit('server_msg', { msg: `[연대기] 🎉 이번 주 연대기 완료! 모든 보스 처치!`, type: 'boss' });
                } else if (advance.advanced) {
                    const next = chronicle.getCurrentStage();
                    io.emit('server_msg', { msg: `[연대기] 다음 장: ${next.name} — ${next.boss.icon} ${next.boss.name} 대기 중`, type: 'rare' });
                }
            }
        }
    });
}

module.exports = { registerChronicleHandlers };

// PvP 매칭 소켓 핸들러 — v2.22

function registerPvpMatchHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, pvpMatch, trackQuest } = ctx;

    socket.on('pvp_match_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('pvp_match_status', pvpMatch.getStatus(p));
    });

    socket.on('pvp_match_join', (mode) => {
        const p = players[playerId]; if (!p || !p.isAlive) return;
        if (typeof mode !== 'string') return;
        const result = pvpMatch.joinQueue(p, mode);
        socket.emit('pvp_match_result', result);
        if (result.success) {
            io.emit('server_msg', { msg: `[매칭] ${p.displayName} ${mode} 대기열 참가 (${result.position}명)`, type: 'normal' });
        }
    });

    socket.on('pvp_match_leave', () => {
        const p = players[playerId]; if (!p) return;
        const result = pvpMatch.leaveQueue(p);
        socket.emit('pvp_match_result', result);
    });

    // 경기 결과 보고 (승리 팀 보고)
    socket.on('pvp_match_report_win', (matchId) => {
        const p = players[playerId]; if (!p) return;
        const match = pvpMatch.activeMatches[matchId];
        if (!match || match.status !== 'active') return;

        // 이 플레이어가 속한 팀 찾기
        const teamIdx = match.teams.findIndex(t => t.includes(playerId));
        if (teamIdx === -1) return;

        const result = pvpMatch.resolveMatch(matchId, teamIdx);
        if (!result) return;

        // 승자 보상
        for (const winnerId of result.winners) {
            const w = players[winnerId]; if (!w) continue;
            const r = pvpMatch.applyResult(w, true, result.eloGain, result.winReward);
            if (trackQuest) trackQuest(w, 'pvp_win', 1);
            savePlayer(w);
            io.to(winnerId).emit('pvp_match_end', {
                result: 'win', ...result.winReward,
                elo: r.elo, tier: r.tier, tierUp: r.tierUp, winStreak: r.winStreak,
            });
            if (r.tierUp) {
                io.emit('server_msg', { msg: `[PvP] ${w.displayName} ${r.tier.icon} ${r.tier.name} 티어 승급!`, type: 'rare' });
            }
            io.emit('player_update', w);
        }

        // 패자
        for (const loserId of result.losers) {
            const l = players[loserId]; if (!l) continue;
            const r = pvpMatch.applyResult(l, false, result.eloLoss, result.loseReward);
            savePlayer(l);
            io.to(loserId).emit('pvp_match_end', {
                result: 'lose', ...result.loseReward,
                elo: r.elo, tier: r.tier,
            });
            io.emit('player_update', l);
        }
    });
}

module.exports = { registerPvpMatchHandlers };

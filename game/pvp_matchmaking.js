// ==========================================
// PvP 매칭 시스템 — v2.22
// 1v1 / 3v3 자동 매칭, 시즌 랭킹, ELO 레이팅
// ==========================================

const MATCH_CONFIG = {
    modes: {
        '1v1': { players: 2, teamSize: 1, queueTimeout: 60000, eloK: 32, goldReward: 500, expReward: 300, diamondWin: 10 },
        '3v3': { players: 6, teamSize: 3, queueTimeout: 90000, eloK: 24, goldReward: 800, expReward: 500, diamondWin: 15 },
    },
    eloDefault: 1000,
    eloRangeStart: 100,    // 초기 매칭 범위 ±100
    eloRangeExpand: 50,    // 10초마다 범위 ±50 확장
    eloRangeMax: 500,      // 최대 범위 ±500
    seasonDuration: 7 * 24 * 60 * 60 * 1000, // 7일
    tierThresholds: [
        { name: '브론즈',     min: 0,    icon: '🥉', color: '#cd7f32' },
        { name: '실버',       min: 1100, icon: '🥈', color: '#c0c0c0' },
        { name: '골드',       min: 1300, icon: '🥇', color: '#ffd700' },
        { name: '플래티넘',   min: 1500, icon: '💎', color: '#44ddff' },
        { name: '다이아몬드', min: 1800, icon: '💠', color: '#44aaff' },
        { name: '마스터',     min: 2100, icon: '👑', color: '#ff4444' },
        { name: '그랜드마스터', min: 2500, icon: '🌟', color: '#ffd700' },
    ],
};

// ── 전역 매칭 큐 ──
const queues = { '1v1': [], '3v3': [] };
// { playerId, elo, joinedAt, level, className }

let matchIdCounter = 0;
const activeMatches = {};
// { matchId: { mode, teams, startTime, status, scores } }

// 시즌 랭킹
let seasonData = {
    startTime: Date.now(),
    leaderboard: {}, // { playerId: { elo, wins, losses, name, className } }
};

function _ensure(player) {
    if (!player._pvpMatch) {
        player._pvpMatch = {
            elo: MATCH_CONFIG.eloDefault,
            wins: 0, losses: 0,
            seasonWins: 0, seasonLosses: 0,
            winStreak: 0, bestStreak: 0,
            matchHistory: [],  // 최근 20경기
        };
    }
    return player._pvpMatch;
}

function getTier(elo) {
    let tier = MATCH_CONFIG.tierThresholds[0];
    for (const t of MATCH_CONFIG.tierThresholds) {
        if (elo >= t.min) tier = t;
    }
    return tier;
}

// ── 대기열 참가 ──
function joinQueue(player, mode) {
    if (!MATCH_CONFIG.modes[mode]) return { success: false, msg: '잘못된 모드' };
    const state = _ensure(player);

    // 이미 대기 중?
    for (const m of Object.keys(queues)) {
        if (queues[m].some(q => q.playerId === player.id)) {
            return { success: false, msg: '이미 대기 중' };
        }
    }
    // 이미 경기 중?
    for (const match of Object.values(activeMatches)) {
        if (match.teams.flat().includes(player.id)) {
            return { success: false, msg: '이미 경기 중' };
        }
    }

    queues[mode].push({
        playerId: player.id,
        elo: state.elo,
        joinedAt: Date.now(),
        level: player.level || 1,
        className: player.className || 'Warrior',
        displayName: player.displayName || player.className,
    });

    return { success: true, mode, position: queues[mode].length, msg: `${mode} 대기열 참가 (#${queues[mode].length})` };
}

// ── 대기열 취소 ──
function leaveQueue(player) {
    let removed = false;
    for (const mode of Object.keys(queues)) {
        const idx = queues[mode].findIndex(q => q.playerId === player.id);
        if (idx !== -1) { queues[mode].splice(idx, 1); removed = true; }
    }
    return { success: removed, msg: removed ? '대기열 취소' : '대기 중이 아닙니다' };
}

// ── 매칭 시도 (서버 틱에서 주기 호출) ──
function tryMatch() {
    const results = [];

    for (const [mode, config] of Object.entries(MATCH_CONFIG.modes)) {
        const queue = queues[mode];
        if (queue.length < config.players) continue;

        // ELO 범위 기반 매칭
        for (let i = 0; i < queue.length; i++) {
            const seeker = queue[i];
            const elapsed = Date.now() - seeker.joinedAt;
            const range = Math.min(
                MATCH_CONFIG.eloRangeMax,
                MATCH_CONFIG.eloRangeStart + Math.floor(elapsed / 10000) * MATCH_CONFIG.eloRangeExpand
            );

            // 범위 내 상대 찾기
            const candidates = queue.filter((q, j) => j !== i && Math.abs(q.elo - seeker.elo) <= range);

            if (candidates.length >= config.players - 1) {
                // 매칭 성공!
                const matched = [seeker, ...candidates.slice(0, config.players - 1)];
                matchIdCounter++;
                const matchId = 'match_' + matchIdCounter;

                // 팀 분배 (ELO 균형)
                matched.sort((a, b) => b.elo - a.elo);
                const teams = [[], []];
                for (let t = 0; t < matched.length; t++) {
                    teams[t % 2].push(matched[t].playerId);
                }

                activeMatches[matchId] = {
                    id: matchId,
                    mode,
                    teams,
                    players: matched.map(m => ({ id: m.playerId, name: m.displayName, elo: m.elo, className: m.className })),
                    startTime: Date.now(),
                    status: 'active',
                    scores: [0, 0],
                    config,
                };

                // 큐에서 제거
                for (const m of matched) {
                    const idx = queue.findIndex(q => q.playerId === m.playerId);
                    if (idx !== -1) queue.splice(idx, 1);
                }

                results.push({ matchId, mode, players: matched, teams });
                break; // 한 번에 한 매치만
            }
        }

        // 타임아웃 정리
        const now = Date.now();
        for (let i = queue.length - 1; i >= 0; i--) {
            if (now - queue[i].joinedAt > config.queueTimeout) {
                const removed = queue.splice(i, 1)[0];
                results.push({ timeout: true, playerId: removed.playerId, mode });
            }
        }
    }

    return results;
}

// ── 경기 결과 처리 ──
function resolveMatch(matchId, winningTeamIndex) {
    const match = activeMatches[matchId];
    if (!match || match.status !== 'active') return null;

    match.status = 'resolved';
    const losingTeamIndex = winningTeamIndex === 0 ? 1 : 0;
    const config = match.config;

    const result = {
        matchId,
        mode: match.mode,
        winners: match.teams[winningTeamIndex],
        losers: match.teams[losingTeamIndex],
        rewards: [],
        eloChanges: [],
    };

    // ELO 계산
    const avgWinElo = match.players.filter(p => match.teams[winningTeamIndex].includes(p.id)).reduce((s, p) => s + p.elo, 0) / match.teams[winningTeamIndex].length;
    const avgLoseElo = match.players.filter(p => match.teams[losingTeamIndex].includes(p.id)).reduce((s, p) => s + p.elo, 0) / match.teams[losingTeamIndex].length;

    const expectedWin = 1 / (1 + Math.pow(10, (avgLoseElo - avgWinElo) / 400));
    const eloGain = Math.round(config.eloK * (1 - expectedWin));
    const eloLoss = Math.round(config.eloK * expectedWin);

    result.eloGain = eloGain;
    result.eloLoss = eloLoss;

    // 보상 정보
    result.winReward = { gold: config.goldReward, exp: config.expReward, diamonds: config.diamondWin, eloGain };
    result.loseReward = { gold: Math.floor(config.goldReward * 0.3), exp: Math.floor(config.expReward * 0.3), eloLoss };

    // 정리
    setTimeout(() => { delete activeMatches[matchId]; }, 30000);

    return result;
}

// ── 플레이어 ELO/전적 업데이트 ──
function applyResult(player, isWin, eloChange, reward) {
    const state = _ensure(player);
    const prevTier = getTier(state.elo);

    if (isWin) {
        state.elo += eloChange;
        state.wins++;
        state.seasonWins++;
        state.winStreak++;
        if (state.winStreak > state.bestStreak) state.bestStreak = state.winStreak;
    } else {
        state.elo = Math.max(0, state.elo - eloChange);
        state.losses++;
        state.seasonLosses++;
        state.winStreak = 0;
    }

    // 보상 지급
    if (reward.gold) player.gold = Math.min(999999999, (player.gold || 0) + reward.gold);
    if (reward.exp) player.exp = (player.exp || 0) + reward.exp;
    if (reward.diamonds) player.diamonds = Math.min(9999999, (player.diamonds || 0) + reward.diamonds);

    // 전적 기록
    state.matchHistory.unshift({ time: Date.now(), win: isWin, eloAfter: state.elo });
    if (state.matchHistory.length > 20) state.matchHistory.pop();

    // 시즌 리더보드 업데이트
    seasonData.leaderboard[player.id] = {
        elo: state.elo, wins: state.seasonWins, losses: state.seasonLosses,
        name: player.displayName, className: player.className,
    };

    const newTier = getTier(state.elo);
    const tierUp = newTier.min > prevTier.min;

    return { elo: state.elo, tier: newTier, tierUp, prevTier, winStreak: state.winStreak };
}

// ── 시즌 리셋 ──
function checkSeasonReset() {
    if (Date.now() - seasonData.startTime > MATCH_CONFIG.seasonDuration) {
        const topPlayers = Object.entries(seasonData.leaderboard)
            .sort((a, b) => b[1].elo - a[1].elo)
            .slice(0, 100);
        seasonData = { startTime: Date.now(), leaderboard: {} };
        return { reset: true, topPlayers };
    }
    return { reset: false };
}

// ── 상태 조회 ──
function getStatus(player) {
    const state = _ensure(player);
    const tier = getTier(state.elo);
    const nextTier = MATCH_CONFIG.tierThresholds.find(t => t.min > state.elo);

    // 현재 큐 상태
    let inQueue = null;
    for (const [mode, queue] of Object.entries(queues)) {
        const entry = queue.find(q => q.playerId === player.id);
        if (entry) { inQueue = { mode, position: queue.indexOf(entry) + 1, elapsed: Date.now() - entry.joinedAt }; break; }
    }

    // 현재 경기
    let inMatch = null;
    for (const match of Object.values(activeMatches)) {
        if (match.teams.flat().includes(player.id)) { inMatch = match; break; }
    }

    // 리더보드 상위 10
    const leaderboard = Object.entries(seasonData.leaderboard)
        .sort((a, b) => b[1].elo - a[1].elo)
        .slice(0, 10)
        .map(([id, d], i) => ({ rank: i + 1, ...d }));

    return {
        elo: state.elo,
        tier, nextTier,
        wins: state.wins, losses: state.losses,
        seasonWins: state.seasonWins, seasonLosses: state.seasonLosses,
        winStreak: state.winStreak, bestStreak: state.bestStreak,
        matchHistory: state.matchHistory.slice(0, 10),
        inQueue, inMatch,
        leaderboard,
        queueSizes: { '1v1': queues['1v1'].length, '3v3': queues['3v3'].length },
    };
}

module.exports = {
    MATCH_CONFIG, queues, activeMatches, seasonData,
    joinQueue, leaveQueue, tryMatch, resolveMatch, applyResult,
    checkSeasonReset, getStatus, getTier,
};

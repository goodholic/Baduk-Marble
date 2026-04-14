// Server helper functions (extracted from server.js)

let $ = null;
let players, io, savePlayer, bossRush, codex, TRADE_GOODS, RANDOM_OPTIONS, MAX_GOLD, trackQuest;

function init(deps) {
    $ = deps;
    players = null; // use $.getPlayers() lazily
    io = null;
    savePlayer = deps.savePlayer;
    bossRush = deps.bossRush;
    codex = deps.codex;
    TRADE_GOODS = deps.TRADE_GOODS;
    RANDOM_OPTIONS = deps.RANDOM_OPTIONS;
    MAX_GOLD = deps.MAX_GOLD;
    trackQuest = deps.trackQuest;
}

// Lazy accessors
function _p() { return $.getPlayers(); }
function _io() { return $.getIo(); }

function handleRaidFinish(raidId, result) {
    if (!result.victory) {
        _io().emit('server_msg', { msg: '[레이드] 패배...', type: 'normal' });
        return;
    }
    _io().emit('server_msg', {
        msg: `[레이드] ${result.raidName} 격파! (${result.duration}초, 총 데미지 ${result.totalDamage.toLocaleString()})`,
        type: 'rare',
    });
    // 각 플레이어에게 보상 지급
    for (const [pid, data] of Object.entries(result.rewards)) {
        const p = _p()[pid];
        if (!p) continue;
        const r = data.reward;
        if (r.gold) p.gold = Math.min(MAX_GOLD, (p.gold || 0) + r.gold);
        if (r.exp) p.exp = (p.exp || 0) + r.exp;
        if (r.diamonds) p.diamonds = Math.min(9999999, (p.diamonds || 0) + r.diamonds);
        if (r.drop) {
            if (!p.inventory) p.inventory = {};
            p.inventory[r.drop] = (p.inventory[r.drop] || 0) + 1;
        }
        if (trackQuest) trackQuest(p, 'guild_raid', 1);
        savePlayer(p);
        try {
            _io().to(pid).emit('raid_finished', {
                tier: data.tier,
                rank: data.rank,
                damage: data.damage,
                reward: r,
            });
        } catch (e) { console.error(`[RaidFinish] Emit error for ${pid}:`, e.message); }
        if (data.tier === 'mvp') {
            _io().emit('server_msg', {
                msg: `[레이드 MVP] ${p.displayName} (데미지 ${data.damage.toLocaleString()})`,
                type: 'rare',
            });
        }
        _io().emit('player_update', p);
    }
}


function codexDiscover(p, category, entryId) {
    if (!p || p.isBot) return;
    const result = codex.discover(p, category, entryId);
    if (result && result.added && result.newMilestones && result.newMilestones.length) {
        for (const m of result.newMilestones) {
            try {
                _io().to(p.id).emit('codex_milestone', {
                    category, name: m.name, count: m.count, reward: m.reward,
                });
            } catch (e) { console.error('[ServerHelper] Emit error:', e.message); }
            _io().emit('server_msg', {
                msg: `[도감] ${p.displayName}이(가) "${m.name}" 마일스톤 달성! (영구 보너스 획득)`,
                type: 'normal',
            });
        }
    }
}


function finishBossRush(playerId, isFullClear) {
    const p = _p()[playerId];
    const session = $.getBossRushSessions()[playerId];
    if (!p || !session) return;
    const reachedWave = isFullClear ? bossRush.BOSS_RUSH_CONFIG.totalWaves : Math.max(0, session.currentWave - 1);
    const totalTime = Math.floor((Date.now() - session.startTime) / 1000);

    // 누적 보상
    const cumulative = bossRush.getCumulativeReward(reachedWave);
    p.gold = Math.min(MAX_GOLD, (p.gold || 0) + cumulative.gold);
    p.exp = (p.exp || 0) + cumulative.exp;
    p.diamonds = Math.min(9999999, (p.diamonds || 0) + cumulative.diamonds);
    if (!p.inventory) p.inventory = {};
    for (const [k, v] of Object.entries(cumulative.mats)) {
        p.inventory[k] = (p.inventory[k] || 0) + v;
    }

    // 최고 기록 갱신
    if (reachedWave > (p.bossRushBestWave || 0)) {
        p.bossRushBestWave = reachedWave;
    }

    // 랭킹 등재 (최고 웨이브 기준)
    $.bossRushRanking.push({
        playerId: p.id,
        name: p.displayName,
        maxWave: reachedWave,
        time: totalTime,
        finishedAt: Date.now(),
        fullClear: isFullClear,
    });
    $.bossRushRanking.sort((a, b) => b.maxWave - a.maxWave || a.time - b.time);
    if ($.bossRushRanking.length > 100) $.bossRushRanking = $.bossRushRanking.slice(0, 100);

    delete $.getBossRushSessions()[playerId];
    savePlayer(p);

    try {
        _io().to(playerId).emit('boss_rush_finished', {
            isFullClear,
            reachedWave,
            totalTime,
            cumulative,
        });
    } catch (e) { console.error('[ServerHelper] Emit error:', e.message); }

    if (isFullClear) {
        _io().emit('server_msg', {
            msg: `[보스 러시] ${p.displayName}이(가) 20웨이브 풀클리어! (${totalTime}초)`,
            type: 'rare',
        });
    } else if (reachedWave >= 10) {
        _io().emit('server_msg', {
            msg: `[보스 러시] ${p.displayName}이(가) 웨이브 ${reachedWave}까지 도달!`,
            type: 'normal',
        });
    }
    _io().emit('player_update', p);
}


function updateTownPrices() {
    const towns = ['aden', 'harbor', 'oasis', 'mountain', 'frontier', 'port_east', 'shrine', 'bazaar'];
    for (const town of towns) {
        $.townPrices[town] = {};
        for (const [id, good] of Object.entries(TRADE_GOODS)) {
            const mult = 0.5 + Math.random() * 1.5;
            $.townPrices[town][id] = {
                buyPrice: Math.floor(good.basePrice * mult),
                sellPrice: Math.floor(good.basePrice * mult * 0.9),
                name: good.name,
            };
        }
    }
}


function generateRandomOptions(count) {
    const opts = [];
    const shuffled = [...RANDOM_OPTIONS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        const opt = shuffled[i];
        const val = +(opt.min + Math.random() * (opt.max - opt.min)).toFixed(3);
        opts.push({ name: opt.name, stat: opt.stat, value: val });
    }
    return opts;
}


function logWorldEvent(msg, type) {
    $.worldEventLog.push({ time: Date.now(), msg, type });
    if ($.worldEventLog.length > 30) $.worldEventLog.shift();
}


module.exports = { init, handleRaidFinish, codexDiscover, finishBossRush, updateTownPrices, generateRandomOptions, logWorldEvent };

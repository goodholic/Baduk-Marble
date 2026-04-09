// ==========================================
// Game Loop Functions (extracted from server.js, Phase 4 refactor)
// ==========================================
// 사용법:
//   const loops = require('./game/loops');
//   loops.init({ getPlayers, getIo, ... });
//
// $ 객체를 통해 모든 외부 의존성을 lazy 접근합니다.

let $ = null;
let prevMonsterSync = {};

function init(deps) {
    $ = deps;
}

// ────────────────────────────────────────
// Phase 4a: expireMarketListings, destroyAxe, syncGameState
// ────────────────────────────────────────

function expireMarketListings() {
    const players = $.getPlayers();
    const io = $.getIo();
    const MARKET_FEE = $.MARKET_FEE;
    const marketListings = $.getMarketListings();
    const filtered = marketListings.filter(l => {
        const now = Date.now();
        if (l.expiresAt && now > l.expiresAt) {
            // 입찰자가 있으면 낙찰 처리
            if (l.bids && l.bids.length > 0) {
                const winBid = l.bids[l.bids.length - 1];
                const winner = players[winBid.bidderId];
                if (winner) {
                    if (!winner.inventory) winner.inventory = {};
                    winner.inventory[l.itemId] = (winner.inventory[l.itemId] || 0) + 1;
                    io.to(winBid.bidderId).emit('market_result', { msg: `${l.itemName} 낙찰! 경매장에서 획득` });
                }
                const seller = players[l.sellerId];
                if (seller) {
                    seller.gold += Math.floor(winBid.amount * (1 - MARKET_FEE));
                    io.to(l.sellerId).emit('market_result', { msg: `${l.itemName} 낙찰 완료! +${Math.floor(winBid.amount * (1-MARKET_FEE))}G` });
                }
            } else {
                // 입찰 없이 만료 → 판매자에게 반환
                const seller = players[l.sellerId];
                if (seller) {
                    if (!seller.inventory) seller.inventory = {};
                    seller.inventory[l.itemId] = (seller.inventory[l.itemId] || 0) + 1;
                    io.to(l.sellerId).emit('market_result', { msg: `${l.itemName} 만료 반환` });
                }
            }
            return false;
        }
        return true;
    });
    $.setMarketListings(filtered);
}

function destroyAxe(axeId) {
    const axes = $.getAxes();
    const io = $.getIo();
    if (axes[axeId]) {
        clearTimeout(axes[axeId].timer);
        io.emit('axe_destroy', axeId);
        delete axes[axeId];
    }
}

function syncGameState() {
    const players = $.getPlayers();
    const monsters = $.getMonsters();
    const io = $.getIo();
    const tickCounter = $.getTickCounter();

    if (Object.keys(players).length === 0) return;

    // 플레이어별 존 기반 sync (자기 존 + 인접 존만)
    const playersByZone = {};
    for (const pId in players) {
        if (!players[pId] || !players[pId].isAlive || players[pId].isBot) continue;
        const zone = $.getZone(players[pId].x, players[pId].y);
        const zId = zone?.id || 'plains';
        if (!playersByZone[zId]) playersByZone[zId] = [];
        playersByZone[zId].push(pId);
    }

    // 몬스터 델타 sync (변경된 것만)
    const fullSync = (tickCounter % 150 === 0); // 5초마다 풀 sync
    const monsterDelta = {};
    for (const mId in monsters) {
        const m = monsters[mId];
        const prev = prevMonsterSync[mId];
        if (fullSync || !prev || Math.abs(m.x - prev.x) > 0.1 || Math.abs(m.y - prev.y) > 0.1 || m.hp !== prev.hp) {
            if (fullSync || !prev) {
                monsterDelta[mId] = { x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, name: m.name, tier: m.tier, element: m.element, aiType: m.aiType };
            } else {
                monsterDelta[mId] = { x: m.x, y: m.y, hp: m.hp };
            }
            prevMonsterSync[mId] = { x: m.x, y: m.y, hp: m.hp };
        }
    }
    // 삭제된 몬스터 정리
    for (const mId in prevMonsterSync) {
        if (!monsters[mId]) { monsterDelta[mId] = null; delete prevMonsterSync[mId]; }
    }

    // 각 실제 플레이어에게 sync 전송
    for (const pId in players) {
        const p = players[pId];
        if (!p || p.isBot || !p.isAlive) continue;
        const zone = $.getZone(p.x, p.y);

        const playerCount = Object.values(players).filter(pp => !pp.isBot && pp.isAlive).length;
        const uptime = Math.floor((Date.now() - $.serverStartTime) / 1000);
        const syncData = {
            players: {}, monsters: monsterDelta,
            isNight: $.getIsNight(), weather: $.getCurrentWeather().id,
            worldTime: $.getWorldTime(), playerCount, uptime,
        };

        // 가시 범위 내 플레이어만 (거리 150 이내)
        for (const opId in players) {
            if (!players[opId] || !players[opId].isAlive) continue;
            const op = players[opId];
            if (Math.abs(op.x - p.x) < 150 && Math.abs(op.y - p.y) < 150) {
                const opZone = $.getZone(op.x, op.y);
                syncData.players[opId] = {
                    x: op.x, y: op.y, gold: op.gold, hp: op.hp, karma: op.karma,
                    zone: opZone?.id || '', diamonds: op.diamonds || 0, skin: op.activeSkin,
                    exp: op.exp || 0, maxExp: $.getExpRequired(op.level),
                    mp: op.mp || 0, maxMp: op.maxMp || 100,
                    maxHp: op.maxHp || 100, level: op.level || 1, killCount: op.killCount || 0
                };
            }
        }

        io.to(pId).volatile.emit('sync', syncData);
    }

    // 개별 소켓에 버프 상태 전송 (5틱마다 = ~166ms)
    if (tickCounter % 5 === 0) {
        for (const pId in players) {
            const p = players[pId];
            if (!p || p.isBot || !p.isAlive || !p.activeBuffs) continue;
            const buffs = [];
            const now = Date.now();
            for (const [bId, buff] of Object.entries(p.activeBuffs)) {
                const remaining = Math.max(0, Math.ceil((buff.endTime - now) / 1000));
                if (remaining > 0) {
                    buffs.push({ id: bId, name: buff.name, remaining, icon: buff.icon || 'buff' });
                }
            }
            if (buffs.length > 0 || p.lastBuffCount > 0) {
                io.to(pId).emit('buff_status', buffs);
                p.lastBuffCount = buffs.length;
            }
        }
    }
}

module.exports = {
    init,
    expireMarketListings, destroyAxe, syncGameState,
};

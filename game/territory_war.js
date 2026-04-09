// ==========================================
// 전장 점령 시스템 — v2.29
// 3진영 맵 점령지 쟁탈. 점령지 방어/공격, 자원 생산, 주간 정산
// ==========================================

// ── 점령 가능 지역 (8곳) ──
const CAPTURE_ZONES = {
    outpost_north:  { name: '북부 전초기지', x: -200, y: -350, baseGold: 100, baseExp: 50, defBonus: 0, icon: '🏰' },
    outpost_south:  { name: '남부 전초기지', x: -200, y: 250, baseGold: 100, baseExp: 50, defBonus: 0, icon: '🏰' },
    mine_crystal:   { name: '수정 광산', x: 100, y: -200, baseGold: 200, baseExp: 30, defBonus: 0, icon: '⛏️', resource: 'crystal' },
    mine_iron:      { name: '철광석 광산', x: 300, y: 100, baseGold: 150, baseExp: 40, defBonus: 0, icon: '⛏️', resource: 'iron' },
    fort_dragon:    { name: '용의 요새', x: 0, y: -400, baseGold: 300, baseExp: 100, defBonus: 20, icon: '🐉' },
    fort_abyss:     { name: '심연의 요새', x: 400, y: -300, baseGold: 250, baseExp: 80, defBonus: 15, icon: '🕳️' },
    tower_mage:     { name: '마법사의 탑', x: -300, y: 0, baseGold: 180, baseExp: 120, defBonus: 10, icon: '🗼', special: 'exp' },
    altar_ancient:  { name: '고대 제단', x: 200, y: 300, baseGold: 200, baseExp: 200, defBonus: 5, icon: '⛩️', special: 'blessing' },
};

// ── 진영 정의 (faction 시스템 연동) ──
const FACTIONS_MAP = {
    sun:  { name: '태양 기사단', color: '#ffd700', icon: '☀️' },
    moon: { name: '달빛 마법단', color: '#aaccff', icon: '🌙' },
    star: { name: '별의 수호자', color: '#ffaacc', icon: '⭐' },
};

// ── 점령 시스템 설정 ──
const WAR_CONFIG = {
    captureTime: 30,           // 점령에 30초 필요
    captureRadius: 15,         // 점령 범위 (유닛 거리)
    defenderBonus: 1.3,        // 방어측 전투력 1.3배
    resourceInterval: 300000,  // 5분마다 자원 생산
    weeklyReset: 7 * 24 * 60 * 60 * 1000,
    minCaptureLevel: 20,       // Lv.20부터 참여 가능
    fortifyMaxLevel: 5,        // 방어 시설 최대 5단계
    fortifyCost: { 1: 5000, 2: 15000, 3: 30000, 4: 60000, 5: 100000 },
    fortifyDefBonus: 10,       // 단계당 DEF +10
    guardCount: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 8 }, // 단계별 NPC 경비병 수
};

// ── 전장 상태 ──
let territoryState = {};
// { zoneId: { faction, capturedAt, fortifyLevel, capturedBy, defenders:Set, attackers:{faction:Set}, captureProgress:{faction:pct} } }

let warLog = []; // 최근 20건

// 초기화
function initTerritories() {
    for (const zoneId of Object.keys(CAPTURE_ZONES)) {
        if (!territoryState[zoneId]) {
            territoryState[zoneId] = {
                faction: null,
                capturedAt: 0,
                fortifyLevel: 0,
                capturedBy: null,
                defenders: new Set(),
                attackers: {},
                captureProgress: {},
                lastResourceTime: Date.now(),
            };
        }
    }
}
initTerritories();

// ── 점령 시도 (매 틱 호출) ──
function tickCapture(players) {
    const events = [];

    for (const [zoneId, zone] of Object.entries(CAPTURE_ZONES)) {
        const state = territoryState[zoneId];
        if (!state) continue;

        // 점령 범위 내 플레이어 탐색
        const nearby = {};  // { faction: [playerId, ...] }
        for (const pId in players) {
            const p = players[pId];
            if (!p || p.isBot || !p.isAlive || !p.faction) continue;
            if (p.level < WAR_CONFIG.minCaptureLevel) continue;
            const dist = Math.hypot(p.x - zone.x, p.y - zone.y);
            if (dist <= WAR_CONFIG.captureRadius) {
                if (!nearby[p.faction]) nearby[p.faction] = [];
                nearby[p.faction].push(pId);
            }
        }

        // 점령 진행
        for (const [faction, memberIds] of Object.entries(nearby)) {
            if (faction === state.faction) continue; // 이미 소유
            if (!state.captureProgress[faction]) state.captureProgress[faction] = 0;

            // 방어측 보너스: 방어측 인원 × 방어 보너스
            const defenderCount = nearby[state.faction]?.length || 0;
            const attackerCount = memberIds.length;
            const effectiveAttack = attackerCount;
            const effectiveDefense = defenderCount * WAR_CONFIG.defenderBonus + state.fortifyLevel * 0.5;

            if (effectiveAttack > effectiveDefense) {
                // 점령 진행 (초당 공격자 수 - 방어자 비례)
                const progress = (effectiveAttack - effectiveDefense) * (1 / WAR_CONFIG.captureTime) * 100;
                state.captureProgress[faction] = Math.min(100, state.captureProgress[faction] + progress);

                if (state.captureProgress[faction] >= 100) {
                    // 점령 성공!
                    const prevFaction = state.faction;
                    state.faction = faction;
                    state.capturedAt = Date.now();
                    state.capturedBy = memberIds[0]; // 첫 번째 참여자
                    state.fortifyLevel = 0; // 점령 시 방어시설 초기화
                    state.captureProgress = {};

                    const logEntry = {
                        time: Date.now(),
                        type: 'capture',
                        zone: zone.name,
                        zoneId,
                        faction,
                        prevFaction,
                        attackers: attackerCount,
                    };
                    warLog.unshift(logEntry);
                    if (warLog.length > 20) warLog.pop();

                    events.push({
                        type: 'captured',
                        zoneId,
                        zoneName: zone.name,
                        faction,
                        factionName: FACTIONS_MAP[faction]?.name,
                        factionIcon: FACTIONS_MAP[faction]?.icon,
                        prevFaction,
                    });
                }
            }
        }

        // 비어있는 진영의 진행도 감소
        for (const f of Object.keys(state.captureProgress)) {
            if (!nearby[f] || nearby[f].length === 0) {
                state.captureProgress[f] = Math.max(0, state.captureProgress[f] - 2);
                if (state.captureProgress[f] <= 0) delete state.captureProgress[f];
            }
        }
    }

    return events;
}

// ── 자원 생산 (5분마다) ──
function produceResources(players) {
    const rewards = [];
    const now = Date.now();

    for (const [zoneId, state] of Object.entries(territoryState)) {
        if (!state.faction) continue;
        if (now - state.lastResourceTime < WAR_CONFIG.resourceInterval) continue;
        state.lastResourceTime = now;

        const zone = CAPTURE_ZONES[zoneId];
        const fortBonus = 1 + state.fortifyLevel * 0.1;
        const gold = Math.floor(zone.baseGold * fortBonus);
        const exp = Math.floor(zone.baseExp * fortBonus);

        // 해당 진영 온라인 플레이어에게 분배
        for (const pId in players) {
            const p = players[pId];
            if (!p || p.isBot || !p.isAlive || p.faction !== state.faction) continue;
            const share = Math.floor(gold / Math.max(1, Object.values(players).filter(pp => pp && !pp.isBot && pp.isAlive && pp.faction === state.faction).length));
            p.gold = Math.min(999999999, (p.gold || 0) + share);
            p.exp = (p.exp || 0) + Math.floor(exp / 10);
            rewards.push({ playerId: pId, gold: share, exp: Math.floor(exp / 10), zone: zone.name });
        }
    }

    return rewards;
}

// ── 방어 시설 강화 ──
function fortify(player, zoneId) {
    const state = territoryState[zoneId];
    if (!state) return { success: false, msg: '존재하지 않는 지역' };
    if (state.faction !== player.faction) return { success: false, msg: '자기 진영 영토만 강화 가능' };
    if (state.fortifyLevel >= WAR_CONFIG.fortifyMaxLevel) return { success: false, msg: '최대 강화 (5단계)' };

    const nextLevel = state.fortifyLevel + 1;
    const cost = WAR_CONFIG.fortifyCost[nextLevel];
    if ((player.gold || 0) < cost) return { success: false, msg: `골드 부족 (${cost}G)` };

    player.gold -= cost;
    state.fortifyLevel = nextLevel;

    return {
        success: true,
        level: nextLevel,
        zone: CAPTURE_ZONES[zoneId]?.name,
        msg: `${CAPTURE_ZONES[zoneId]?.name} 방어시설 ${nextLevel}단계! (DEF +${nextLevel * WAR_CONFIG.fortifyDefBonus})`,
    };
}

// ── 전장 현황 ──
function getStatus() {
    const zones = {};
    for (const [zoneId, state] of Object.entries(territoryState)) {
        const zone = CAPTURE_ZONES[zoneId];
        zones[zoneId] = {
            ...zone,
            faction: state.faction,
            factionName: FACTIONS_MAP[state.faction]?.name || '미점령',
            factionIcon: FACTIONS_MAP[state.faction]?.icon || '⚪',
            factionColor: FACTIONS_MAP[state.faction]?.color || '#888',
            fortifyLevel: state.fortifyLevel,
            capturedAt: state.capturedAt,
            captureProgress: { ...state.captureProgress },
        };
    }

    // 진영별 점령 수
    const factionScores = {};
    for (const f of Object.keys(FACTIONS_MAP)) {
        factionScores[f] = {
            ...FACTIONS_MAP[f],
            zones: Object.values(territoryState).filter(s => s.faction === f).length,
            totalGoldPerCycle: Object.entries(territoryState)
                .filter(([, s]) => s.faction === f)
                .reduce((sum, [zId]) => sum + (CAPTURE_ZONES[zId]?.baseGold || 0), 0),
        };
    }

    return { zones, factionScores, warLog: warLog.slice(0, 10) };
}

module.exports = {
    CAPTURE_ZONES, FACTIONS_MAP, WAR_CONFIG,
    tickCapture, produceResources, fortify, getStatus,
    getTerritoryState: () => territoryState,
    setTerritoryState: (s) => { territoryState = s; },
};

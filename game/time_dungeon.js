// ==========================================
// 시간 여행 던전 — v2.32
// 과거/현재/미래 3시대. 각 시대 고유 몬스터/보상/기믹
// 시대 연결 퍼즐 + 시간 역설 보스
// ==========================================

const TIME_ERAS = {
    past: {
        name: '고대의 시대', icon: '🏛️', color: '#cd7f32',
        desc: '문명이 시작되던 태초의 시대. 원시 짐승과 고대 전사가 배회한다.',
        reqLevel: 25,
        stages: [
            { name: '원시의 숲', monsters: 6, hp: 400, atk: 25, def: 10, type: 'beast',
              gimmick: { type: 'fog', desc: '짙은 안개 — 시야 50% 감소, 기습 확률 30%', visionReduce: 0.5, ambushChance: 0.3 } },
            { name: '고대 신전', monsters: 4, hp: 800, atk: 40, def: 20, type: 'guardian',
              gimmick: { type: 'puzzle', desc: '석판 퍼즐 — 3개 석판을 순서대로 활성화', puzzleCount: 3, timeLimit: 30 } },
            { name: '시간의 문', monsters: 1, hp: 6000, atk: 80, def: 30, isBoss: true,
              bossName: '시간의 파수꾼', bossSkill: '시간 되감기: 10초마다 보스 HP 10% 회복',
              gimmick: { type: 'boss_heal', healPct: 0.1, interval: 10000, counter: '석판 파괴 시 회복 차단' } },
        ],
        rewards: {
            stage: { gold: 800, exp: 500 },
            complete: { gold: 10000, exp: 8000, diamonds: 50, item: 'relic_ancient_seal', itemName: '고대의 봉인' },
        },
        timeFragment: 'fragment_past',
    },
    present: {
        name: '현재의 시대', icon: '🏙️', color: '#4488ff',
        desc: '기술과 마법이 공존하는 현재. 기계화된 적과 마법 생물이 나타난다.',
        reqLevel: 35,
        stages: [
            { name: '기계 공장', monsters: 5, hp: 600, atk: 35, def: 25, type: 'mech',
              gimmick: { type: 'conveyor', desc: '컨베이어 벨트 — 5초마다 위치 강제 이동', interval: 5000 } },
            { name: '마법 연구소', monsters: 4, hp: 1000, atk: 50, def: 30, type: 'arcane',
              gimmick: { type: 'element_shift', desc: '원소 변환 — 10초마다 약점 원소 변경', interval: 10000 } },
            { name: '시간의 교차점', monsters: 1, hp: 10000, atk: 120, def: 40, isBoss: true,
              bossName: '시간 조율자', bossSkill: '시간 가속: 15초마다 자신 ATK/SPD 2배 5초',
              gimmick: { type: 'boss_haste', hasteMult: 2, interval: 15000, duration: 5000, counter: '둔화 스킬로 무력화' } },
        ],
        rewards: {
            stage: { gold: 1200, exp: 800 },
            complete: { gold: 18000, exp: 15000, diamonds: 80, item: 'relic_time_gear', itemName: '시간의 톱니' },
        },
        timeFragment: 'fragment_present',
    },
    future: {
        name: '미래의 시대', icon: '🚀', color: '#aa44ff',
        desc: '기술이 극한에 달한 먼 미래. 차원 기계와 인공 신이 지배한다.',
        reqLevel: 45,
        stages: [
            { name: '차원 터널', monsters: 4, hp: 1200, atk: 60, def: 35, type: 'dimension',
              gimmick: { type: 'portal', desc: '차원 포탈 — 적이 포탈로 순간이동', teleportInterval: 8000 } },
            { name: '인공 신전', monsters: 3, hp: 2000, atk: 80, def: 45, type: 'artificial',
              gimmick: { type: 'shield_rotate', desc: '회전 방패 — 5초마다 면역 방향 변경', interval: 5000 } },
            { name: '시간의 끝', monsters: 1, hp: 20000, atk: 200, def: 60, isBoss: true,
              bossName: '시간 역설 — 오메가', bossSkill: '역설 폭풍: 20초마다 3시대 기믹 동시 발동',
              gimmick: { type: 'paradox', desc: '안개+컨베이어+포탈 동시!', interval: 20000, counter: '3개 시간 파편 소모로 무력화' } },
        ],
        rewards: {
            stage: { gold: 2000, exp: 1500 },
            complete: { gold: 30000, exp: 25000, diamonds: 150, item: 'relic_omega_core', itemName: '오메가 코어' },
        },
        timeFragment: 'fragment_future',
    },
};

// ── 시간 파편 (3개 모으면 보너스 던전 해금) ──
const TIME_FRAGMENTS = {
    fragment_past: { name: '과거의 파편', icon: '🟤' },
    fragment_present: { name: '현재의 파편', icon: '🔵' },
    fragment_future: { name: '미래의 파편', icon: '🟣' },
};

// ── 보너스: 시간 역설 던전 (3파편 전부 보유 시 해금) ──
const PARADOX_DUNGEON = {
    name: '시간 역설 던전', icon: '⏳🌀',
    desc: '3시대의 시간이 뒤섞인 최종 던전. 모든 기믹이 동시에!',
    reqLevel: 50,
    reqFragments: ['fragment_past', 'fragment_present', 'fragment_future'],
    stages: [
        { name: '뒤섞인 시간', monsters: 8, hp: 1500, atk: 80, def: 40,
          gimmick: { type: 'mixed', desc: '3시대 기믹 랜덤 발동' } },
        { name: '역설의 심장', monsters: 1, hp: 50000, atk: 300, def: 80, isBoss: true,
          bossName: '시간의 심장', bossSkill: '시간 소멸: 30초마다 맵 절반 즉사 존 생성',
          gimmick: { type: 'death_zone', interval: 30000, safeRadius: 5 } },
    ],
    rewards: {
        stage: { gold: 5000, exp: 3000 },
        complete: { gold: 80000, exp: 60000, diamonds: 500, item: 'equip_time_lord_set', itemName: '시간 군주의 세트', title: 'title_time_lord' },
    },
    consumeFragments: true,
};

function _ensure(player) {
    if (!player._timeDungeon) {
        player._timeDungeon = {
            active: null,        // { eraId, stage, monstersLeft, startTime, isParadox }
            cooldowns: {},       // { eraId: lastClearTime }
            clears: {},          // { eraId: count }
            paradoxClears: 0,
            totalClears: 0,
            puzzlesSolved: 0,
        };
    }
    return player._timeDungeon;
}

const ERA_COOLDOWN = 3600000; // 1시간

// 입장 가능 여부
function getAvailable(player) {
    const state = _ensure(player);
    const now = Date.now();
    const available = {};

    for (const [eraId, era] of Object.entries(TIME_ERAS)) {
        const cd = state.cooldowns[eraId] || 0;
        const remaining = Math.max(0, ERA_COOLDOWN - (now - cd));
        available[eraId] = {
            ...era, eraId,
            unlocked: player.level >= era.reqLevel,
            onCooldown: remaining > 0,
            cooldownMin: Math.ceil(remaining / 60000),
            clears: state.clears[eraId] || 0,
        };
    }

    // 역설 던전
    const hasAll = PARADOX_DUNGEON.reqFragments.every(f => player.inventory?.[f] > 0);
    available.paradox = {
        ...PARADOX_DUNGEON,
        unlocked: player.level >= PARADOX_DUNGEON.reqLevel && hasAll,
        hasFragments: hasAll,
        clears: state.paradoxClears,
    };

    return available;
}

// 입장
function enter(player, eraId) {
    const state = _ensure(player);
    if (state.active) return { success: false, msg: '이미 진행 중' };

    const isParadox = eraId === 'paradox';
    const dungeon = isParadox ? PARADOX_DUNGEON : TIME_ERAS[eraId];
    if (!dungeon) return { success: false, msg: '존재하지 않는 시대' };
    if (player.level < dungeon.reqLevel) return { success: false, msg: `Lv.${dungeon.reqLevel} 필요` };

    if (isParadox) {
        const hasAll = PARADOX_DUNGEON.reqFragments.every(f => player.inventory?.[f] > 0);
        if (!hasAll) return { success: false, msg: '3개 시간 파편 필요' };
        // 파편 소모
        for (const f of PARADOX_DUNGEON.reqFragments) {
            player.inventory[f]--;
            if (player.inventory[f] <= 0) delete player.inventory[f];
        }
    } else {
        const cd = state.cooldowns[eraId] || 0;
        if (Date.now() - cd < ERA_COOLDOWN) return { success: false, msg: '쿨다운 중' };
    }

    state.active = {
        eraId, stage: 0, monstersLeft: dungeon.stages[0].monsters,
        startTime: Date.now(), isParadox,
    };

    return {
        success: true,
        era: { name: dungeon.name, icon: dungeon.icon },
        stage: dungeon.stages[0],
        msg: `${dungeon.icon} ${dungeon.name} 입장!`,
    };
}

// 몬스터 처치
function killMonster(player) {
    const state = _ensure(player);
    if (!state.active) return { success: false, msg: '진행 중인 던전 없음' };

    const dungeon = state.active.isParadox ? PARADOX_DUNGEON : TIME_ERAS[state.active.eraId];
    const stageInfo = dungeon.stages[state.active.stage];
    state.active.monstersLeft--;

    if (state.active.monstersLeft <= 0) {
        const stageReward = dungeon.rewards.stage;
        player.gold = Math.min(999999999, (player.gold || 0) + stageReward.gold);
        player.exp = (player.exp || 0) + stageReward.exp;

        const nextIdx = state.active.stage + 1;
        if (nextIdx < dungeon.stages.length) {
            state.active.stage = nextIdx;
            state.active.monstersLeft = dungeon.stages[nextIdx].monsters;
            return {
                success: true, stageClear: true,
                stageReward,
                nextStage: dungeon.stages[nextIdx],
                msg: `${stageInfo.name} 클리어!`,
            };
        } else {
            // 던전 클리어!
            const r = dungeon.rewards.complete;
            player.gold = Math.min(999999999, (player.gold || 0) + r.gold);
            player.exp = (player.exp || 0) + r.exp;
            if (r.diamonds) player.diamonds = Math.min(9999999, (player.diamonds || 0) + r.diamonds);
            if (r.item) {
                if (!player.inventory) player.inventory = {};
                player.inventory[r.item] = (player.inventory[r.item] || 0) + 1;
            }
            if (r.title) {
                if (!player.titles) player.titles = [];
                if (!player.titles.includes(r.title)) player.titles.push(r.title);
            }
            // 시간 파편 지급 (일반 시대만)
            if (!state.active.isParadox && dungeon.timeFragment) {
                if (!player.inventory) player.inventory = {};
                player.inventory[dungeon.timeFragment] = (player.inventory[dungeon.timeFragment] || 0) + 1;
            }

            const clearTime = Math.floor((Date.now() - state.active.startTime) / 1000);
            if (state.active.isParadox) state.paradoxClears++;
            else { state.clears[state.active.eraId] = (state.clears[state.active.eraId] || 0) + 1; state.cooldowns[state.active.eraId] = Date.now(); }
            state.totalClears++;
            state.active = null;

            return {
                success: true, dungeonClear: true,
                reward: r, clearTime,
                msg: `${dungeon.icon} ${dungeon.name} 클리어! (${clearTime}초)`,
            };
        }
    }

    return { success: true, monstersLeft: state.active.monstersLeft };
}

// 포기
function abandon(player) {
    const state = _ensure(player);
    if (!state.active) return { success: false };
    state.active = null;
    return { success: true, msg: '던전 포기' };
}

function getStatus(player) {
    const state = _ensure(player);
    return {
        active: state.active,
        available: getAvailable(player),
        totalClears: state.totalClears,
        paradoxClears: state.paradoxClears,
        fragments: {
            past: player.inventory?.fragment_past || 0,
            present: player.inventory?.fragment_present || 0,
            future: player.inventory?.fragment_future || 0,
        },
    };
}

module.exports = {
    TIME_ERAS, TIME_FRAGMENTS, PARADOX_DUNGEON,
    getAvailable, enter, killMonster, abandon, getStatus,
};

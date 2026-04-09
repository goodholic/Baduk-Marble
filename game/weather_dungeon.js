// ==========================================
// 날씨 던전 시스템 — v2.21
// 현재 월드 날씨에 따라 열리는 특수 던전
// 맑음/비/눈/폭풍 4종, 각 3스테이지
// ==========================================

const WEATHER_DUNGEONS = {
    clear: {
        name: '태양의 시련장', icon: '☀️', element: 'fire',
        desc: '맑은 날에만 열리는 화염의 시련',
        reqLevel: 15, cooldown: 1800000, // 30분
        stages: [
            { name: '작열의 통로', monsters: 5, monsterHp: 300, monsterAtk: 20, monsterDef: 8 },
            { name: '용암의 방', monsters: 4, monsterHp: 600, monsterAtk: 35, monsterDef: 12, hazard: { type: 'fire', dps: 5, msg: '바닥에서 불길이 솟아오른다!' } },
            { name: '태양신의 전당', monsters: 1, monsterHp: 3000, monsterAtk: 60, monsterDef: 20, isBoss: true, bossName: '태양의 수호자', bossSkill: '태양 플레어: 5초마다 전체 HP 10% 데미지' },
        ],
        rewards: {
            stage: { gold: 500, exp: 300 },
            complete: { gold: 5000, exp: 4000, diamonds: 30, item: 'relic_sun_shard', itemName: '태양의 파편' },
        },
        bonusCondition: { weather: 'clear', bonus: 1.5, desc: '맑은 날 보상 1.5배' },
    },
    rain: {
        name: '우천의 미궁', icon: '🌧️', element: 'water',
        desc: '비 오는 날에만 열리는 수중 미궁',
        reqLevel: 20, cooldown: 1800000,
        stages: [
            { name: '안개 낀 입구', monsters: 6, monsterHp: 350, monsterAtk: 18, monsterDef: 10, debuff: { stat: 'accuracy', value: -0.1, msg: '안개로 시야가 흐려진다' } },
            { name: '수몰된 회랑', monsters: 4, monsterHp: 700, monsterAtk: 30, monsterDef: 15, hazard: { type: 'drown', dps: 3, msg: '수위가 올라오고 있다!' } },
            { name: '폭포의 왕좌', monsters: 1, monsterHp: 4000, monsterAtk: 55, monsterDef: 25, isBoss: true, bossName: '폭포의 군주', bossSkill: '해일: 8초마다 넉백 + 3초 둔화' },
        ],
        rewards: {
            stage: { gold: 600, exp: 350 },
            complete: { gold: 6000, exp: 5000, diamonds: 40, item: 'relic_rain_crystal', itemName: '빗물 결정' },
        },
        bonusCondition: { weather: 'rain', bonus: 1.5, desc: '비 오는 날 보상 1.5배' },
    },
    snow: {
        name: '설원의 성채', icon: '❄️', element: 'water',
        desc: '눈 오는 날에만 열리는 얼음 성채',
        reqLevel: 25, cooldown: 1800000,
        stages: [
            { name: '얼어붙은 해자', monsters: 5, monsterHp: 500, monsterAtk: 25, monsterDef: 18, debuff: { stat: 'speed', value: -0.3, msg: '발밑이 미끄럽다!' } },
            { name: '빙결의 감옥', monsters: 3, monsterHp: 900, monsterAtk: 40, monsterDef: 22, hazard: { type: 'freeze', dps: 6, msg: '체온이 떨어지고 있다!' } },
            { name: '만년빙의 옥좌', monsters: 1, monsterHp: 5500, monsterAtk: 70, monsterDef: 30, isBoss: true, bossName: '서리 여왕', bossSkill: '절대 영도: 10초마다 전체 2초 빙결' },
        ],
        rewards: {
            stage: { gold: 800, exp: 500 },
            complete: { gold: 8000, exp: 7000, diamonds: 60, item: 'relic_frost_crown', itemName: '서리 왕관' },
        },
        bonusCondition: { weather: 'snow', bonus: 1.5, desc: '눈 오는 날 보상 1.5배' },
    },
    storm: {
        name: '뇌광의 탑', icon: '⛈️', element: 'wind',
        desc: '폭풍 칠 때만 열리는 번개의 탑',
        reqLevel: 30, cooldown: 1800000,
        stages: [
            { name: '번개의 회랑', monsters: 4, monsterHp: 600, monsterAtk: 35, monsterDef: 12, hazard: { type: 'lightning', dps: 10, interval: 5000, msg: '번개가 내리친다!' } },
            { name: '전기장 미로', monsters: 3, monsterHp: 1200, monsterAtk: 50, monsterDef: 18, debuff: { stat: 'def', value: -0.2, msg: '전기장이 방어력을 약화시킨다' } },
            { name: '뇌신의 제단', monsters: 1, monsterHp: 8000, monsterAtk: 100, monsterDef: 35, isBoss: true, bossName: '뇌신 라이쥬', bossSkill: '천둥 연쇄: 3초마다 3명에게 연쇄 번개' },
        ],
        rewards: {
            stage: { gold: 1200, exp: 800 },
            complete: { gold: 15000, exp: 12000, diamonds: 100, item: 'relic_thunder_orb', itemName: '뇌광 오브' },
        },
        bonusCondition: { weather: 'storm', bonus: 2.0, desc: '폭풍 시 보상 2배!' },
    },
};

// ── 날씨→던전 매핑 ──
const WEATHER_TO_DUNGEON = {
    clear: 'clear',
    rain: 'rain',
    snow: 'snow',
    storm: 'storm',
};

function _ensure(player) {
    if (!player._weatherDungeon) {
        player._weatherDungeon = {
            active: null,      // { dungeonId, stage, monstersLeft, startTime, hp }
            cooldowns: {},     // { dungeonId: lastClearTime }
            clears: {},        // { dungeonId: count }
            totalClears: 0,
        };
    }
    return player._weatherDungeon;
}

// 현재 날씨에서 입장 가능한 던전 조회
function getAvailable(player, currentWeatherId) {
    const state = _ensure(player);
    const dungeonId = WEATHER_TO_DUNGEON[currentWeatherId];
    if (!dungeonId || !WEATHER_DUNGEONS[dungeonId]) return { available: null, reason: '현재 날씨에 열린 던전 없음' };

    const dungeon = WEATHER_DUNGEONS[dungeonId];
    if (player.level < dungeon.reqLevel) return { available: null, reason: `Lv.${dungeon.reqLevel} 필요` };

    const lastClear = state.cooldowns[dungeonId] || 0;
    const remaining = Math.max(0, dungeon.cooldown - (Date.now() - lastClear));
    if (remaining > 0) return { available: null, reason: `재입장 대기: ${Math.ceil(remaining / 60000)}분` };

    if (state.active) return { available: null, reason: '이미 던전 진행 중' };

    const isBonus = currentWeatherId === dungeon.bonusCondition.weather;
    return {
        available: {
            id: dungeonId,
            name: dungeon.name,
            icon: dungeon.icon,
            desc: dungeon.desc,
            stages: dungeon.stages.length,
            reqLevel: dungeon.reqLevel,
            rewards: dungeon.rewards.complete,
            isBonus,
            bonusDesc: isBonus ? dungeon.bonusCondition.desc : null,
        },
    };
}

// 던전 입장
function enter(player, dungeonId, currentWeatherId) {
    const state = _ensure(player);
    const dungeon = WEATHER_DUNGEONS[dungeonId];
    if (!dungeon) return { success: false, msg: '존재하지 않는 던전' };
    if (state.active) return { success: false, msg: '이미 진행 중' };
    if (player.level < dungeon.reqLevel) return { success: false, msg: `Lv.${dungeon.reqLevel} 필요` };

    const mappedDungeon = WEATHER_TO_DUNGEON[currentWeatherId];
    if (mappedDungeon !== dungeonId) return { success: false, msg: '현재 날씨와 맞지 않음' };

    const lastClear = state.cooldowns[dungeonId] || 0;
    if (Date.now() - lastClear < dungeon.cooldown) return { success: false, msg: '쿨다운 중' };

    const stage = dungeon.stages[0];
    state.active = {
        dungeonId,
        stage: 0,
        monstersLeft: stage.monsters,
        startTime: Date.now(),
        hp: player.maxHp,
        isBonus: currentWeatherId === dungeon.bonusCondition.weather,
    };

    return {
        success: true,
        dungeon: { name: dungeon.name, icon: dungeon.icon },
        stage: { name: stage.name, monsters: stage.monsters, hazard: stage.hazard, debuff: stage.debuff },
        msg: `${dungeon.icon} ${dungeon.name} 입장!`,
    };
}

// 몬스터 처치
function killMonster(player) {
    const state = _ensure(player);
    if (!state.active) return { success: false, msg: '진행 중인 던전 없음' };

    const dungeon = WEATHER_DUNGEONS[state.active.dungeonId];
    const stageInfo = dungeon.stages[state.active.stage];

    state.active.monstersLeft--;

    if (state.active.monstersLeft <= 0) {
        // 스테이지 클리어
        const bonusMult = state.active.isBonus ? dungeon.bonusCondition.bonus : 1.0;
        const stageReward = dungeon.rewards.stage;
        player.gold = Math.min(999999999, (player.gold || 0) + Math.floor(stageReward.gold * bonusMult));
        player.exp = (player.exp || 0) + Math.floor(stageReward.exp * bonusMult);

        const nextStageIdx = state.active.stage + 1;
        if (nextStageIdx < dungeon.stages.length) {
            // 다음 스테이지
            const nextStage = dungeon.stages[nextStageIdx];
            state.active.stage = nextStageIdx;
            state.active.monstersLeft = nextStage.monsters;
            return {
                success: true, stageClear: true,
                stageReward: { gold: Math.floor(stageReward.gold * bonusMult), exp: Math.floor(stageReward.exp * bonusMult) },
                nextStage: { name: nextStage.name, monsters: nextStage.monsters, isBoss: nextStage.isBoss, bossName: nextStage.bossName, hazard: nextStage.hazard, debuff: nextStage.debuff },
                msg: `${stageInfo.name} 클리어! 다음: ${nextStage.name}`,
            };
        } else {
            // 던전 클리어!
            const completeReward = dungeon.rewards.complete;
            player.gold = Math.min(999999999, (player.gold || 0) + Math.floor(completeReward.gold * bonusMult));
            player.exp = (player.exp || 0) + Math.floor(completeReward.exp * bonusMult);
            if (completeReward.diamonds) player.diamonds = Math.min(9999999, (player.diamonds || 0) + Math.floor(completeReward.diamonds * bonusMult));
            if (completeReward.item) {
                if (!player.inventory) player.inventory = {};
                player.inventory[completeReward.item] = (player.inventory[completeReward.item] || 0) + 1;
            }

            state.cooldowns[state.active.dungeonId] = Date.now();
            state.clears[state.active.dungeonId] = (state.clears[state.active.dungeonId] || 0) + 1;
            state.totalClears++;
            const clearTime = Math.floor((Date.now() - state.active.startTime) / 1000);
            state.active = null;

            return {
                success: true, dungeonClear: true,
                reward: {
                    gold: Math.floor(completeReward.gold * bonusMult),
                    exp: Math.floor(completeReward.exp * bonusMult),
                    diamonds: Math.floor((completeReward.diamonds || 0) * bonusMult),
                    item: completeReward.item,
                    itemName: completeReward.itemName,
                },
                clearTime,
                isBonus: state.active?.isBonus,
                msg: `${dungeon.icon} ${dungeon.name} 클리어! (${clearTime}초)`,
            };
        }
    }

    return { success: true, monstersLeft: state.active.monstersLeft };
}

// 던전 포기
function abandon(player) {
    const state = _ensure(player);
    if (!state.active) return { success: false, msg: '진행 중인 던전 없음' };
    state.active = null;
    return { success: true, msg: '던전 포기' };
}

// 상태 조회
function getStatus(player, currentWeatherId) {
    const state = _ensure(player);
    return {
        active: state.active ? {
            ...state.active,
            dungeon: WEATHER_DUNGEONS[state.active.dungeonId],
            currentStage: WEATHER_DUNGEONS[state.active.dungeonId]?.stages[state.active.stage],
        } : null,
        available: getAvailable(player, currentWeatherId),
        clears: state.clears,
        totalClears: state.totalClears,
    };
}

module.exports = {
    WEATHER_DUNGEONS, WEATHER_TO_DUNGEON,
    getAvailable, enter, killMonster, abandon, getStatus,
};

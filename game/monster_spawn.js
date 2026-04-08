// 몬스터 스폰 로직 — v1.44 (함수 추출)
// server.js → game/monster_spawn.js
// 데이터는 game/data/ 모듈에서 require

const { MONSTER_TIERS } = require('./data/world_data');
const { ZONE_MONSTERS } = require('./data/zones');

// 가중치 기반 무작위 등급 선택 (전 지역 공통)
function pickMonsterTier() {
    const totalWeight = Object.values(MONSTER_TIERS).reduce((s, t) => s + t.spawnWeight, 0);
    let roll = Math.random() * totalWeight;
    for (const [key, tier] of Object.entries(MONSTER_TIERS)) {
        roll -= tier.spawnWeight;
        if (roll <= 0) return key;
    }
    return 'normal';
}

// 존별 등급 배합에 따른 무작위 선택 (없으면 전역으로 fallback)
function pickZoneTier(zoneId) {
    const zm = ZONE_MONSTERS[zoneId];
    if (!zm) return pickMonsterTier();
    const total = Object.values(zm.tiers).reduce((s, w) => s + w, 0);
    let roll = Math.random() * total;
    for (const [tier, weight] of Object.entries(zm.tiers)) {
        roll -= weight;
        if (roll <= 0) return tier;
    }
    return 'normal';
}

// 존 레벨에 따라 몬스터 스탯 스케일링 (존 Lv 5+ 부터 8%씩 강화)
function scaleMonster(tier, zoneLvl) {
    const base = MONSTER_TIERS[tier];
    if (!base) return MONSTER_TIERS.normal;
    const scale = 1 + Math.max(0, zoneLvl - 5) * 0.08;
    return {
        ...base,
        hp: Math.floor(base.hp * scale),
        atk: Math.floor(base.atk * scale),
        def: Math.floor(base.def * scale),
        expReward: Math.floor(base.expReward * scale),
        goldReward: Math.floor(base.goldReward * scale),
    };
}

module.exports = {
    pickMonsterTier,
    pickZoneTier,
    scaleMonster,
};

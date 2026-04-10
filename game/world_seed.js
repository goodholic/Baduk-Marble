// ==========================================
// 세계의 씨앗 — v2.55
// 포켓 차원 생성/육성 + 생태계 + 자원 수확 + 차원 침공
// ==========================================

const BIOMES = {
    void_plain:     { name: '공허 평원',     icon: '🕳️🌿', resources: { void_dust: 3 }, monsterCap: 5,  desc: '아무것도 없는 시작의 땅' },
    fire_volcano:   { name: '화산 지대',     icon: '🌋',     resources: { magma_ore: 5, fire_crystal: 2 }, monsterCap: 8, desc: '용암이 흐르는 뜨거운 땅' },
    ice_tundra:     { name: '빙하 동토',     icon: '❄️🏔️', resources: { frost_gem: 4, ice_shard: 3 }, monsterCap: 6, desc: '영원히 얼어붙은 세계' },
    sky_island:     { name: '하늘 섬',       icon: '☁️🏝️', resources: { cloud_silk: 4, sky_pearl: 2 }, monsterCap: 7, desc: '구름 위에 떠 있는 낙원' },
    shadow_forest:  { name: '그림자 숲',     icon: '🌑🌲', resources: { dark_wood: 5, shadow_sap: 3 }, monsterCap: 10, desc: '빛이 닿지 않는 원시림' },
    crystal_cave:   { name: '수정 동굴',     icon: '💎🕳️', resources: { rainbow_crystal: 6, mana_stone: 4 }, monsterCap: 6, desc: '거대한 수정이 자라는 동굴' },
    celestial_realm: { name: '천상계',       icon: '✨☁️', resources: { star_dust: 5, divine_essence: 2 }, monsterCap: 5, desc: '신들의 영역을 재현' },
};

const WORLD_MONSTERS = {
    seed_slime:     { name: '씨앗 슬라임',   icon: '🟢🌱', tier: 1, hp: 200,  atk: 20,  produce: { slime_gel: 2 }, cost: 500 },
    fire_sprite:    { name: '화염 정령',     icon: '🔥🧚', tier: 2, hp: 500,  atk: 60,  produce: { fire_crystal: 1 }, cost: 2000 },
    frost_golem:    { name: '서리 골렘',     icon: '❄️🗿', tier: 2, hp: 800,  atk: 40,  produce: { frost_gem: 1 }, cost: 2500 },
    shadow_wolf:    { name: '그림자 늑대',   icon: '🐺🌑', tier: 2, hp: 600,  atk: 80,  produce: { shadow_sap: 1 }, cost: 3000 },
    crystal_dragon: { name: '수정 드래곤',   icon: '🐉💎', tier: 3, hp: 2000, atk: 150, produce: { rainbow_crystal: 2 }, cost: 10000 },
    sky_phoenix:    { name: '하늘 불사조',   icon: '🐦☁️', tier: 3, hp: 1500, atk: 120, produce: { sky_pearl: 2 }, cost: 12000 },
    void_titan:     { name: '공허 거신',     icon: '🗿🕳️', tier: 4, hp: 5000, atk: 300, produce: { void_essence: 3 }, cost: 30000 },
    star_angel:     { name: '별의 천사',     icon: '👼⭐', tier: 4, hp: 3000, atk: 200, produce: { divine_essence: 2 }, cost: 25000 },
};

const WORLD_STRUCTURES = {
    mana_well:      { name: '마나 우물',     icon: '💧🔮', cost: 5000,  effect: { manaGen: 10 }, desc: '시간당 마나 +10 생성' },
    guardian_tower:  { name: '수호 탑',      icon: '🗼🛡️', cost: 8000,  effect: { defense: 200 }, desc: '침공 방어력 +200' },
    harvest_shrine: { name: '수확 신전',     icon: '⛩️🌾', cost: 10000, effect: { harvestMult: 1.5 }, desc: '자원 수확량 x1.5' },
    portal_gate:    { name: '차원문',        icon: '🌀🚪', cost: 20000, effect: { canInvade: true }, desc: '다른 세계 침공 가능' },
    world_tree:     { name: '세계수',        icon: '🌳✨', cost: 50000, effect: { allBonus: 0.1, worldLevel: true }, desc: '세계 레벨업! 모든 효과 +10%' },
};

function _ensure(player) {
    if (!player._worldSeed) {
        player._worldSeed = {
            hasWorld: false,
            worldName: '',
            biome: null,
            worldLevel: 1,
            monsters: [],
            structures: {},
            resources: {},
            mana: 0,
            maxMana: 100,
            defense: 100,
            lastHarvest: 0,
            totalHarvests: 0,
            invasionsDefended: 0,
            invasionsSent: 0,
        };
    }
    return player._worldSeed;
}

function createWorld(player, biomeId, name) {
    const state = _ensure(player);
    if (state.hasWorld) return { success: false, msg: '이미 세계가 있습니다.' };
    if ((player.level || 1) < 30) return { success: false, msg: 'Lv.30 이상 필요' };
    if ((player.gold || 0) < 30000) return { success: false, msg: '골드 부족 (30,000G)' };
    const biome = BIOMES[biomeId];
    if (!biome) return { success: false, msg: '알 수 없는 생태계' };

    player.gold -= 30000;
    state.hasWorld = true;
    state.worldName = (name && typeof name === 'string') ? name.slice(0, 16) : `${player.displayName}의 세계`;
    state.biome = biomeId;
    state.lastHarvest = Date.now();

    return { success: true, biome, msg: `🌱✨ 세계의 씨앗 발아! "${state.worldName}" (${biome.icon} ${biome.name}) 탄생!` };
}

function placeMonster(player, monsterId) {
    const state = _ensure(player);
    if (!state.hasWorld) return { success: false, msg: '세계가 없습니다.' };
    const monster = WORLD_MONSTERS[monsterId];
    if (!monster) return { success: false, msg: '알 수 없는 몬스터' };
    const biome = BIOMES[state.biome];
    if (state.monsters.length >= biome.monsterCap) return { success: false, msg: `생태계 최대 (${biome.monsterCap}마리)` };
    if ((player.gold || 0) < monster.cost) return { success: false, msg: `골드 부족 (${monster.cost}G)` };

    player.gold -= monster.cost;
    state.monsters.push({ type: monsterId, placedAt: Date.now() });
    return { success: true, monster, msg: `${monster.icon} ${monster.name} 배치! (-${monster.cost}G)` };
}

function buildStructure(player, structId) {
    const state = _ensure(player);
    if (!state.hasWorld) return { success: false, msg: '세계가 없습니다.' };
    const struct = WORLD_STRUCTURES[structId];
    if (!struct) return { success: false, msg: '알 수 없는 건물' };
    if (state.structures[structId]) return { success: false, msg: '이미 건설됨' };
    if ((player.gold || 0) < struct.cost) return { success: false, msg: `골드 부족 (${struct.cost}G)` };

    player.gold -= struct.cost;
    state.structures[structId] = Date.now();
    if (struct.effect.defense) state.defense += struct.effect.defense;
    if (struct.effect.manaGen) state.maxMana += 50;
    if (struct.effect.worldLevel) state.worldLevel++;

    return { success: true, struct, msg: `${struct.icon} ${struct.name} 건설! — ${struct.desc}` };
}

function harvest(player) {
    const state = _ensure(player);
    if (!state.hasWorld) return { success: false, msg: '세계가 없습니다.' };
    const hours = Math.floor((Date.now() - state.lastHarvest) / 3600000);
    if (hours < 1) return { success: false, msg: '1시간마다 수확 가능' };

    const h = Math.min(hours, 24);
    const biome = BIOMES[state.biome];
    const harvestMult = state.structures.harvest_shrine ? 1.5 : 1.0;
    const collected = {};

    // 바이옴 자원
    for (const [res, base] of Object.entries(biome.resources)) {
        const amount = Math.floor(base * h * harvestMult * state.worldLevel);
        collected[res] = amount;
        state.resources[res] = (state.resources[res] || 0) + amount;
    }

    // 몬스터 생산물
    for (const m of state.monsters) {
        const monster = WORLD_MONSTERS[m.type];
        if (!monster) continue;
        for (const [res, base] of Object.entries(monster.produce)) {
            const amount = Math.floor(base * h * harvestMult);
            collected[res] = (collected[res] || 0) + amount;
            state.resources[res] = (state.resources[res] || 0) + amount;
        }
    }

    state.lastHarvest = Date.now();
    state.totalHarvests++;
    state.mana = Math.min(state.maxMana, state.mana + h * (state.structures.mana_well ? 10 : 3));

    const summary = Object.entries(collected).map(([r, c]) => `${r}: +${c}`).join(', ');
    return { success: true, collected, hours: h, msg: `🌾 ${h}시간 수확! ${summary}` };
}

function invadeWorld(attacker, defender) {
    const aState = _ensure(attacker);
    const dState = _ensure(defender);
    if (!aState.hasWorld || !aState.structures.portal_gate) return { success: false, msg: '차원문이 필요합니다.' };
    if (!dState.hasWorld) return { success: false, msg: '상대에게 세계가 없습니다.' };

    const attackPower = aState.monsters.reduce((sum, m) => sum + (WORLD_MONSTERS[m.type]?.atk || 0), 0) + (attacker.atk || 10);
    const defendPower = dState.defense + dState.monsters.reduce((sum, m) => sum + (WORLD_MONSTERS[m.type]?.atk || 0), 0);

    const won = attackPower > defendPower * (0.7 + Math.random() * 0.6);
    aState.invasionsSent++;

    if (won) {
        // 자원 약탈
        const loot = {};
        for (const [res, amount] of Object.entries(dState.resources)) {
            const stolen = Math.floor(amount * 0.2);
            if (stolen > 0) {
                loot[res] = stolen;
                dState.resources[res] -= stolen;
                aState.resources[res] = (aState.resources[res] || 0) + stolen;
            }
        }
        dState.invasionsDefended--; // 카운터 역할
        const lootSummary = Object.entries(loot).map(([r, c]) => `${r}: +${c}`).join(', ');
        return { success: true, victory: true, loot, msg: `⚔️🌍 침공 성공! 자원 약탈: ${lootSummary}` };
    }

    return { success: true, victory: false, msg: `🛡️ 침공 실패! 상대의 방어가 너무 강합니다.` };
}

function getStatus(player) {
    const state = _ensure(player);
    return {
        hasWorld: state.hasWorld, worldName: state.worldName,
        biome: state.biome ? BIOMES[state.biome] : null, biomeId: state.biome,
        worldLevel: state.worldLevel, mana: state.mana, maxMana: state.maxMana, defense: state.defense,
        monsters: state.monsters.map(m => ({ ...m, info: WORLD_MONSTERS[m.type] })),
        monsterCap: state.biome ? BIOMES[state.biome].monsterCap : 0,
        structures: Object.entries(WORLD_STRUCTURES).map(([id, s]) => ({ id, ...s, built: !!state.structures[id] })),
        resources: state.resources,
        totalHarvests: state.totalHarvests, invasionsDefended: state.invasionsDefended,
        biomes: BIOMES, monsterTypes: WORLD_MONSTERS,
        harvestReady: Date.now() - state.lastHarvest >= 3600000,
    };
}

module.exports = { BIOMES, WORLD_MONSTERS, WORLD_STRUCTURES, createWorld, placeMonster, buildStructure, harvest, invadeWorld, getStatus };

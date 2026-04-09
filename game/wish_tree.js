// ==========================================
// 소원 나무 시스템 — v2.30
// 소원을 걸고 나무를 성장시키는 장기 육성 콘텐츠
// 열매 수확, 버프, 특수 아이템, 계절 이벤트
// ==========================================

// ── 나무 종류 (선택 1개) ──
const TREE_TYPES = {
    world_tree: {
        name: '세계수', icon: '🌳',
        desc: '균형 잡힌 성장. 모든 종류의 열매를 맺는다.',
        growthRate: 1.0,
        fruitPool: ['fruit_gold','fruit_exp','fruit_diamond','fruit_stat','fruit_heal'],
        specialFruit: 'fruit_rainbow',
        seasonBonus: { spring: 1.3, summer: 1.1, autumn: 1.5, winter: 0.8 },
    },
    fire_tree: {
        name: '화염수', icon: '🔥',
        desc: '공격 특화. 화염 열매와 전투 버프를 제공한다.',
        growthRate: 0.9,
        fruitPool: ['fruit_atk','fruit_crit','fruit_fire','fruit_gold','fruit_rage'],
        specialFruit: 'fruit_inferno',
        seasonBonus: { spring: 1.0, summer: 1.5, autumn: 1.0, winter: 0.7 },
    },
    frost_tree: {
        name: '서리수', icon: '❄️',
        desc: '방어 특화. 빙결 열매와 생존 버프를 제공한다.',
        growthRate: 0.9,
        fruitPool: ['fruit_def','fruit_hp','fruit_ice','fruit_heal','fruit_shield'],
        specialFruit: 'fruit_absolute_zero',
        seasonBonus: { spring: 0.8, summer: 0.7, autumn: 1.0, winter: 1.5 },
    },
    spirit_tree: {
        name: '정령수', icon: '✨',
        desc: '경험치 특화. 지혜의 열매와 성장 버프를 제공한다.',
        growthRate: 1.1,
        fruitPool: ['fruit_exp','fruit_diamond','fruit_wisdom','fruit_mp','fruit_luck'],
        specialFruit: 'fruit_enlightenment',
        seasonBonus: { spring: 1.5, summer: 1.0, autumn: 1.2, winter: 1.0 },
    },
};

// ── 열매 정의 ──
const FRUITS = {
    // 기본 열매
    fruit_gold:     { name: '황금 열매',     icon: '🍊', effect: { gold: 1000 }, rarity: 'common', growTime: 2 },
    fruit_exp:      { name: '경험의 열매',   icon: '🍇', effect: { exp: 500 }, rarity: 'common', growTime: 2 },
    fruit_diamond:  { name: '다이아 열매',   icon: '💎', effect: { diamonds: 5 }, rarity: 'uncommon', growTime: 4 },
    fruit_stat:     { name: '스탯 열매',     icon: '🍎', effect: { statPoints: 1 }, rarity: 'uncommon', growTime: 3 },
    fruit_heal:     { name: '회복 열매',     icon: '🍑', effect: { healPct: 1.0 }, rarity: 'common', growTime: 1 },
    // 전투 열매
    fruit_atk:      { name: '힘의 열매',     icon: '🌶️', effect: { buffAtk: 10, buffDur: 1800 }, rarity: 'uncommon', growTime: 3 },
    fruit_def:      { name: '수호의 열매',   icon: '🥝', effect: { buffDef: 10, buffDur: 1800 }, rarity: 'uncommon', growTime: 3 },
    fruit_crit:     { name: '날카로운 열매', icon: '🍒', effect: { buffCrit: 0.05, buffDur: 1800 }, rarity: 'uncommon', growTime: 3 },
    fruit_hp:       { name: '생명의 열매',   icon: '🍓', effect: { buffHp: 100, buffDur: 1800 }, rarity: 'uncommon', growTime: 3 },
    fruit_mp:       { name: '마나 열매',     icon: '🫐', effect: { mpRestore: 100 }, rarity: 'common', growTime: 2 },
    // 특수 열매
    fruit_fire:     { name: '화염 열매',     icon: '🔥', effect: { fireAtk: 20, buffDur: 3600 }, rarity: 'rare', growTime: 6 },
    fruit_ice:      { name: '빙결 열매',     icon: '🧊', effect: { freezeChance: 0.1, buffDur: 3600 }, rarity: 'rare', growTime: 6 },
    fruit_rage:     { name: '광분 열매',     icon: '😡', effect: { buffAtk: 25, buffDef: -10, buffDur: 600 }, rarity: 'rare', growTime: 5 },
    fruit_shield:   { name: '보호막 열매',   icon: '🛡️', effect: { shield: 500 }, rarity: 'rare', growTime: 5 },
    fruit_wisdom:   { name: '지혜의 열매',   icon: '📖', effect: { buffExp: 0.3, buffDur: 3600 }, rarity: 'rare', growTime: 6 },
    fruit_luck:     { name: '행운의 열매',   icon: '🍀', effect: { buffDrop: 0.2, buffDur: 3600 }, rarity: 'rare', growTime: 6 },
    // 전설 열매 (각 나무 특수)
    fruit_rainbow:       { name: '무지개 열매',   icon: '🌈', effect: { allStats: 5, buffDur: 7200 }, rarity: 'legendary', growTime: 24 },
    fruit_inferno:       { name: '지옥불 열매',   icon: '☄️', effect: { buffAtk: 50, fireAtk: 40, buffDur: 3600 }, rarity: 'legendary', growTime: 24 },
    fruit_absolute_zero: { name: '절대영도 열매', icon: '💠', effect: { buffDef: 50, freezeChance: 0.2, buffDur: 3600 }, rarity: 'legendary', growTime: 24 },
    fruit_enlightenment: { name: '깨달음의 열매', icon: '🌟', effect: { buffExp: 1.0, statPoints: 3, buffDur: 7200 }, rarity: 'legendary', growTime: 24 },
};

// ── 계절 (3개월 주기) ──
function getCurrentSeason() {
    const month = new Date().getMonth(); // 0-11
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
}

// ── 소원 (나무에 거는 소원 — 성장 방향 결정) ──
const WISHES = {
    wish_wealth:  { name: '부의 소원', icon: '💰', fruitBoost: ['fruit_gold','fruit_diamond'], growBoost: 0.1 },
    wish_power:   { name: '힘의 소원', icon: '⚔️', fruitBoost: ['fruit_atk','fruit_crit','fruit_fire'], growBoost: 0.1 },
    wish_guard:   { name: '수호의 소원', icon: '🛡️', fruitBoost: ['fruit_def','fruit_hp','fruit_shield'], growBoost: 0.1 },
    wish_wisdom:  { name: '지혜의 소원', icon: '📖', fruitBoost: ['fruit_exp','fruit_wisdom','fruit_luck'], growBoost: 0.1 },
    wish_miracle: { name: '기적의 소원', icon: '🌟', fruitBoost: [], growBoost: 0.0, specialChance: 0.1 },
};

function _ensure(player) {
    if (!player._wishTree) {
        player._wishTree = {
            treeType: null,
            level: 0,           // 나무 레벨 (0 = 씨앗, 1-10 = 성장, 10 = 만개)
            exp: 0,             // 성장 경험치
            totalWatered: 0,    // 총 물 준 횟수
            lastWatered: 0,     // 마지막 물 준 시간
            activeWish: null,   // 현재 소원
            fruits: [],         // 현재 열매 [{fruitId, growStart, ready}]
            maxFruits: 3,       // 동시 열매 슬롯
            harvestCount: 0,
            specialHarvests: 0,
        };
    }
    return player._wishTree;
}

const LEVEL_EXP = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500]; // 0→10

// 나무 심기
function plantTree(player, treeTypeId) {
    const state = _ensure(player);
    if (state.treeType) return { success: false, msg: `이미 ${TREE_TYPES[state.treeType]?.name}을(를) 키우고 있습니다` };
    if (!TREE_TYPES[treeTypeId]) return { success: false, msg: '알 수 없는 나무' };
    state.treeType = treeTypeId;
    state.level = 0;
    state.exp = 0;
    return { success: true, tree: TREE_TYPES[treeTypeId], msg: `${TREE_TYPES[treeTypeId].icon} ${TREE_TYPES[treeTypeId].name} 심기 완료!` };
}

// 물 주기 (하루 3회, 성장 경험치)
function water(player) {
    const state = _ensure(player);
    if (!state.treeType) return { success: false, msg: '나무를 먼저 심으세요' };
    const now = Date.now();
    const hoursSince = (now - state.lastWatered) / 3600000;
    if (hoursSince < 4) return { success: false, msg: `${Math.ceil(4 - hoursSince)}시간 후 다시 가능` };

    state.lastWatered = now;
    state.totalWatered++;

    const tree = TREE_TYPES[state.treeType];
    const season = getCurrentSeason();
    const seasonMult = tree.seasonBonus[season] || 1.0;
    const wishBoost = state.activeWish ? (WISHES[state.activeWish]?.growBoost || 0) : 0;
    const expGain = Math.floor(50 * tree.growthRate * seasonMult * (1 + wishBoost));

    state.exp += expGain;

    // 레벨업 체크
    let leveledUp = false;
    while (state.level < 10 && state.exp >= LEVEL_EXP[state.level + 1]) {
        state.level++;
        leveledUp = true;
        if (state.level >= 3) state.maxFruits = 4;
        if (state.level >= 6) state.maxFruits = 5;
        if (state.level >= 9) state.maxFruits = 6;
    }

    // 열매 생성 (레벨 1+ 시 물 줄 때마다 확률)
    let newFruit = null;
    if (state.level >= 1 && state.fruits.length < state.maxFruits) {
        const fruitChance = 0.4 + state.level * 0.05;
        if (Math.random() < fruitChance) {
            const pool = [...tree.fruitPool];
            // 소원 부스트
            const wish = state.activeWish ? WISHES[state.activeWish] : null;
            let pickedId;
            if (wish?.specialChance && Math.random() < wish.specialChance) {
                pickedId = tree.specialFruit;
            } else if (wish?.fruitBoost?.length > 0 && Math.random() < 0.4) {
                pickedId = wish.fruitBoost[Math.floor(Math.random() * wish.fruitBoost.length)];
            } else {
                pickedId = pool[Math.floor(Math.random() * pool.length)];
            }
            // 전설 열매 확률 (레벨 8+만)
            if (state.level >= 8 && Math.random() < 0.05) {
                pickedId = tree.specialFruit;
            }
            const fruit = FRUITS[pickedId];
            if (fruit) {
                const fruitEntry = { fruitId: pickedId, growStart: now, readyAt: now + fruit.growTime * 3600000 };
                state.fruits.push(fruitEntry);
                newFruit = { id: pickedId, ...fruit, readyAt: fruitEntry.readyAt };
            }
        }
    }

    return {
        success: true,
        expGain, season, seasonMult,
        level: state.level, exp: state.exp, nextLevelExp: LEVEL_EXP[Math.min(state.level + 1, 10)],
        leveledUp, newFruit,
        msg: `💧 물 주기! +${expGain} 성장 EXP${leveledUp ? ` 🌱 Lv.${state.level}!` : ''}${newFruit ? ` 🍎 ${newFruit.name} 열매 생성!` : ''}`,
    };
}

// 열매 수확
function harvest(player, fruitIndex) {
    const state = _ensure(player);
    if (!state.treeType) return { success: false, msg: '나무 없음' };
    if (fruitIndex < 0 || fruitIndex >= state.fruits.length) return { success: false, msg: '잘못된 열매' };

    const entry = state.fruits[fruitIndex];
    if (Date.now() < entry.readyAt) {
        const remain = Math.ceil((entry.readyAt - Date.now()) / 3600000);
        return { success: false, msg: `${remain}시간 후 수확 가능` };
    }

    const fruit = FRUITS[entry.fruitId];
    if (!fruit) return { success: false, msg: '알 수 없는 열매' };

    state.fruits.splice(fruitIndex, 1);
    state.harvestCount++;
    if (fruit.rarity === 'legendary') state.specialHarvests++;

    // 효과 적용
    const effects = fruit.effect;
    if (effects.gold) player.gold = Math.min(999999999, (player.gold || 0) + effects.gold);
    if (effects.exp) player.exp = (player.exp || 0) + effects.exp;
    if (effects.diamonds) player.diamonds = Math.min(9999999, (player.diamonds || 0) + effects.diamonds);
    if (effects.statPoints) player.statPoints = (player.statPoints || 0) + effects.statPoints;
    if (effects.healPct) player.hp = Math.min(player.maxHp || 100, (player.hp || 0) + Math.floor((player.maxHp || 100) * effects.healPct));
    if (effects.mpRestore) player.mp = Math.min(player.maxMp || 100, (player.mp || 0) + effects.mpRestore);

    return {
        success: true,
        fruit: { id: entry.fruitId, ...fruit },
        effects,
        harvestCount: state.harvestCount,
        msg: `${fruit.icon} ${fruit.name} 수확!`,
    };
}

// 소원 걸기
function makeWish(player, wishId) {
    const state = _ensure(player);
    if (!state.treeType) return { success: false, msg: '나무 없음' };
    if (!WISHES[wishId]) return { success: false, msg: '알 수 없는 소원' };
    const cost = 500; // 다이아 500
    if ((player.diamonds || 0) < cost) return { success: false, msg: `다이아 ${cost}개 필요` };
    player.diamonds -= cost;
    state.activeWish = wishId;
    return { success: true, wish: WISHES[wishId], msg: `${WISHES[wishId].icon} ${WISHES[wishId].name} 소원을 걸었습니다!` };
}

// 상태 조회
function getStatus(player) {
    const state = _ensure(player);
    const tree = state.treeType ? TREE_TYPES[state.treeType] : null;
    const season = getCurrentSeason();
    return {
        tree: tree ? { id: state.treeType, ...tree, seasonBonus: tree.seasonBonus[season] } : null,
        level: state.level,
        exp: state.exp,
        nextLevelExp: LEVEL_EXP[Math.min(state.level + 1, 10)],
        totalWatered: state.totalWatered,
        canWater: !state.lastWatered || (Date.now() - state.lastWatered) >= 4 * 3600000,
        activeWish: state.activeWish ? WISHES[state.activeWish] : null,
        fruits: state.fruits.map((f, i) => ({
            index: i, fruitId: f.fruitId, ...FRUITS[f.fruitId],
            ready: Date.now() >= f.readyAt,
            remainHours: Math.max(0, Math.ceil((f.readyAt - Date.now()) / 3600000)),
        })),
        maxFruits: state.maxFruits,
        harvestCount: state.harvestCount,
        specialHarvests: state.specialHarvests,
        season,
        availableTrees: Object.entries(TREE_TYPES).map(([id, t]) => ({ id, ...t })),
        availableWishes: Object.entries(WISHES).map(([id, w]) => ({ id, ...w })),
    };
}

module.exports = {
    TREE_TYPES, FRUITS, WISHES, getCurrentSeason,
    plantTree, water, harvest, makeWish, getStatus,
};

// ==========================================
// 천상 대장간 — v2.53
// 신의 재료 + 제작 미니게임 + 저주/유일 장비
// ==========================================

const DIVINE_MATERIALS = {
    star_iron:     { name: '별의 철',     icon: '⭐⚙️', tier: 1, source: '보스 드롭' },
    moon_silver:   { name: '달의 은',     icon: '🌙🥈', tier: 2, source: '달빛 성역' },
    sun_gold:      { name: '태양의 금',   icon: '☀️🥇', tier: 3, source: '별자리 전쟁' },
    void_crystal:  { name: '공허 수정',   icon: '🕳️💎', tier: 3, source: '심연 던전' },
    dragon_tear:   { name: '용의 눈물',   icon: '🐉💧', tier: 4, source: '거수 레이드' },
    god_fragment:  { name: '신의 파편',   icon: '✨🔮', tier: 5, source: '환영 투기장 신 등급' },
    chaos_essence: { name: '혼돈의 정수', icon: '🌀💜', tier: 5, source: '저주 던전 완전 저주 클리어' },
};

const CELESTIAL_RECIPES = {
    // 무기
    starfall_blade:    { name: '성락검',         icon: '⚔️⭐', slot: 'weapon', materials: { star_iron: 5, moon_silver: 3 }, baseStat: { atk: 100 }, tier: 'legendary', desc: '별빛이 깃든 검' },
    sunfire_staff:     { name: '태양화 지팡이',   icon: '🪄☀️', slot: 'weapon', materials: { sun_gold: 3, star_iron: 3 }, baseStat: { atk: 80, spellPower: 0.15 }, tier: 'legendary', desc: '태양의 불꽃이 타오르는 지팡이' },
    void_reaper:       { name: '공허의 낫',       icon: '⚔️🕳️', slot: 'weapon', materials: { void_crystal: 5, chaos_essence: 2 }, baseStat: { atk: 150, lifesteal: 0.1 }, tier: 'mythic', desc: '공허를 베는 사신의 무기' },
    gods_wrath:        { name: '신의 분노',       icon: '⚔️✨', slot: 'weapon', materials: { god_fragment: 3, dragon_tear: 2, sun_gold: 3 }, baseStat: { atk: 200, allStat: 10 }, tier: 'divine', desc: '신이 직접 벼린 무기' },
    // 방어구
    moonlight_armor:   { name: '월광 갑옷',       icon: '🛡️🌙', slot: 'armor', materials: { moon_silver: 5, star_iron: 3 }, baseStat: { def: 80, hp: 200 }, tier: 'legendary', desc: '달빛으로 짠 갑옷' },
    dragon_scale_mail: { name: '용린 갑옷',       icon: '🛡️🐉', slot: 'armor', materials: { dragon_tear: 3, void_crystal: 2 }, baseStat: { def: 120, hp: 500, fireRes: 0.2 }, tier: 'mythic', desc: '용의 비늘로 만든 갑옷' },
    // 장신구
    chaos_pendant:     { name: '혼돈의 펜던트',   icon: '📿🌀', slot: 'accessory', materials: { chaos_essence: 3, void_crystal: 3 }, baseStat: { allStat: 8, critRate: 0.08 }, tier: 'mythic', desc: '혼돈의 힘이 깃든 펜던트' },
    divine_crown:      { name: '신성한 왕관',     icon: '👑✨', slot: 'accessory', materials: { god_fragment: 5, sun_gold: 5, dragon_tear: 3 }, baseStat: { allStat: 20, divine: true }, tier: 'divine', desc: '신의 권능이 깃든 왕관' },
};

// 제작 미니게임 결과
const FORGE_RESULTS = {
    catastrophic: { name: '대폭발',     icon: '💥😱', mult: 0,    curse: true,  desc: '재료 소멸 + 저주 장비' },
    failure:      { name: '실패',       icon: '💔',   mult: 0.5,  curse: false, desc: '하급 장비 생성' },
    normal:       { name: '성공',       icon: '⚒️',   mult: 1.0,  curse: false, desc: '기본 스탯 장비' },
    great:        { name: '대성공',     icon: '✨⚒️', mult: 1.5,  curse: false, desc: '강화 스탯 장비' },
    masterpiece:  { name: '걸작',       icon: '🌟⚒️', mult: 2.0,  curse: false, desc: '최강 스탯 장비' },
    divine:       { name: '신의 작품',   icon: '👑⚒️', mult: 3.0,  curse: false, desc: '유일 장비! 세계에 하나!' },
};

function _ensure(player) {
    if (!player._celestialForge) {
        player._celestialForge = {
            forgeLevel: 1,
            forgeExp: 0,
            materials: {},
            forgedItems: [],
            totalForges: 0,
            masterpieces: 0,
            divineCreations: 0,
            cursedItems: 0,
        };
    }
    return player._celestialForge;
}

const FORGE_LEVEL_EXP = [0, 500, 1500, 4000, 8000, 15000, 25000, 40000, 60000, 100000];

function collectMaterial(player, materialId, count) {
    const state = _ensure(player);
    if (!DIVINE_MATERIALS[materialId]) return null;
    state.materials[materialId] = (state.materials[materialId] || 0) + (count || 1);
    return { materialId, count: state.materials[materialId] };
}

function forge(player, recipeId) {
    const state = _ensure(player);
    const recipe = CELESTIAL_RECIPES[recipeId];
    if (!recipe) return { success: false, msg: '알 수 없는 레시피' };

    // 재료 체크
    for (const [matId, need] of Object.entries(recipe.materials)) {
        if ((state.materials[matId] || 0) < need) {
            return { success: false, msg: `재료 부족: ${DIVINE_MATERIALS[matId]?.name || matId} (${state.materials[matId] || 0}/${need})` };
        }
    }

    // 제작비
    const cost = recipe.tier === 'divine' ? 200000 : recipe.tier === 'mythic' ? 100000 : 50000;
    if ((player.gold || 0) < cost) return { success: false, msg: `골드 부족 (${cost}G)` };

    // 재료 소모
    for (const [matId, need] of Object.entries(recipe.materials)) {
        state.materials[matId] -= need;
        if (state.materials[matId] <= 0) delete state.materials[matId];
    }
    player.gold -= cost;

    // 미니게임: 온도 + 타이밍 시뮬레이션
    const skillBonus = Math.min(0.3, state.forgeLevel * 0.03);
    const roll = Math.random() + skillBonus;

    let result;
    if (roll < 0.05)      result = FORGE_RESULTS.catastrophic;
    else if (roll < 0.20) result = FORGE_RESULTS.failure;
    else if (roll < 0.55) result = FORGE_RESULTS.normal;
    else if (roll < 0.80) result = FORGE_RESULTS.great;
    else if (roll < 0.95) result = FORGE_RESULTS.masterpiece;
    else                  result = FORGE_RESULTS.divine;

    state.totalForges++;
    state.forgeExp += (recipe.tier === 'divine' ? 500 : recipe.tier === 'mythic' ? 200 : 100);

    // 레벨업
    let leveledUp = false;
    while (state.forgeLevel < 9 && state.forgeExp >= FORGE_LEVEL_EXP[state.forgeLevel + 1]) {
        state.forgeLevel++;
        leveledUp = true;
    }

    // 장비 생성
    const finalStats = {};
    for (const [stat, val] of Object.entries(recipe.baseStat)) {
        finalStats[stat] = typeof val === 'number' ? Math.floor(val * result.mult) : val;
    }

    let item = null;
    if (result.curse) {
        state.cursedItems++;
        item = { name: `저주받은 ${recipe.name}`, icon: `${recipe.icon}💀`, stats: finalStats, cursed: true, tier: 'cursed' };
    } else if (result.mult > 0) {
        if (result === FORGE_RESULTS.divine) state.divineCreations++;
        if (result === FORGE_RESULTS.masterpiece) state.masterpieces++;
        item = { name: result === FORGE_RESULTS.divine ? `★ ${recipe.name} ★` : recipe.name, icon: recipe.icon, stats: finalStats, tier: recipe.tier, quality: result.name };
        state.forgedItems.push({ recipeId, quality: result.name, time: Date.now() });
    }

    return {
        success: true, result, item, leveledUp,
        msg: `${result.icon} ${result.name}! ${item ? `${item.icon} "${item.name}" 제작!\n스탯: ${JSON.stringify(finalStats)}` : '재료가 소멸했습니다...'}${leveledUp ? `\n대장간 Lv.${state.forgeLevel} 승급!` : ''}`,
    };
}

function getStatus(player) {
    const state = _ensure(player);
    return {
        forgeLevel: state.forgeLevel, forgeExp: state.forgeExp,
        nextLevelExp: state.forgeLevel < 9 ? FORGE_LEVEL_EXP[state.forgeLevel + 1] : null,
        materials: Object.entries(state.materials).map(([id, c]) => ({ id, count: c, ...DIVINE_MATERIALS[id] })),
        totalForges: state.totalForges, masterpieces: state.masterpieces,
        divineCreations: state.divineCreations, cursedItems: state.cursedItems,
        recipes: Object.entries(CELESTIAL_RECIPES).map(([id, r]) => ({
            id, ...r,
            canForge: Object.entries(r.materials).every(([m, n]) => (state.materials[m] || 0) >= n),
            materialStatus: Object.entries(r.materials).map(([m, n]) => ({ id: m, need: n, have: state.materials[m] || 0, ...DIVINE_MATERIALS[m] })),
        })),
        recentForges: state.forgedItems.slice(-5),
    };
}

module.exports = { DIVINE_MATERIALS, CELESTIAL_RECIPES, FORGE_RESULTS, collectMaterial, forge, getStatus };

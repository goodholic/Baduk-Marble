// ==========================================
// 유물 조합 시스템 — v2.25
// 유물 3개 조합 → 신규 효과. 50종 레시피 + 히든 조합
// ==========================================

// ── 유물 풀 (기존 relic.js의 유물 + 신규) ──
const RELIC_POOL = {
    // 기존 유물 (relic.js에서 가져옴)
    blade_of_chaos:     { name:'혼돈의 칼날',     tier:'rare',      stat:'atk',   value:10 },
    shield_of_eternity: { name:'영원의 방패',     tier:'rare',      stat:'def',   value:10 },
    heart_of_dragon:    { name:'용의 심장',       tier:'epic',      stat:'hp',    value:200 },
    crown_of_kings:     { name:'왕의 왕관',       tier:'epic',      stat:'exp',   value:15 },
    boots_of_wind:      { name:'바람의 부츠',     tier:'rare',      stat:'spd',   value:3 },
    eye_of_truth:       { name:'진실의 눈',       tier:'epic',      stat:'dodge', value:8 },
    phoenix_feather:    { name:'불사조 깃털',     tier:'legendary', stat:'fire',  value:20 },
    void_shard:         { name:'공허의 파편',     tier:'legendary', stat:'dark',  value:30 },
    star_of_destiny:    { name:'운명의 별',       tier:'legendary', stat:'all',   value:5 },
    primordial_orb:     { name:'태초의 구슬',     tier:'mythic',    stat:'all',   value:10 },
    // v2.25 신규 유물
    flame_core:         { name:'화염의 핵',       tier:'rare',      stat:'atk',   value:8 },
    frost_tear:         { name:'서리의 눈물',     tier:'rare',      stat:'def',   value:8 },
    thunder_fang:       { name:'번개의 송곳니',   tier:'rare',      stat:'crit',  value:5 },
    earth_root:         { name:'대지의 뿌리',     tier:'rare',      stat:'hp',    value:80 },
    shadow_pearl:       { name:'그림자 진주',     tier:'epic',      stat:'dodge', value:6 },
    holy_water:         { name:'성수',            tier:'epic',      stat:'heal',  value:10 },
    demon_horn:         { name:'악마의 뿔',       tier:'epic',      stat:'atk',   value:18 },
    ancient_scroll:     { name:'고대 두루마리',   tier:'epic',      stat:'exp',   value:12 },
    void_crystal:       { name:'공허 수정',       tier:'legendary', stat:'dark',  value:15 },
    celestial_feather:  { name:'천상의 깃털',     tier:'legendary', stat:'light', value:15 },
};

// ── 조합 레시피 (유물 3개 → 신규 효과) ──
const FUSION_RECIPES = {
    // ═══ 공격 계열 ═══
    inferno_blade: {
        name: '인페르노 블레이드', icon: '⚔️🔥',
        recipe: ['blade_of_chaos', 'flame_core', 'demon_horn'],
        tier: 'legendary',
        effects: { atk: 35, critDmg: 0.3, onHit: '10% 확률 화염 폭발 (ATK×0.5 범위)' },
        desc: '혼돈과 화염이 하나가 된 전설의 검',
    },
    storm_reaver: {
        name: '폭풍의 파괴자', icon: '⚡⚔️',
        recipe: ['thunder_fang', 'boots_of_wind', 'blade_of_chaos'],
        tier: 'legendary',
        effects: { atk: 25, spd: 5, crit: 10, onHit: '15% 확률 번개 연쇄 (3명)' },
        desc: '번개와 바람이 깃든 파괴의 무기',
    },
    void_devourer: {
        name: '공허의 포식자', icon: '🕳️⚔️',
        recipe: ['void_shard', 'void_crystal', 'demon_horn'],
        tier: 'mythic',
        effects: { atk: 50, lifesteal: 0.12, onKill: '처치 시 HP 15% 회복' },
        desc: '공허의 힘으로 생명을 빨아들이는 흉기',
    },

    // ═══ 방어 계열 ═══
    eternal_fortress: {
        name: '영원의 요새', icon: '🛡️✨',
        recipe: ['shield_of_eternity', 'earth_root', 'frost_tear'],
        tier: 'legendary',
        effects: { def: 40, hp: 300, dmgReduce: 0.08, onHit: 'HP 30%↓ 시 5초 무적 (3분 CD)' },
        desc: '절대 무너지지 않는 영원의 방패',
    },
    holy_guardian: {
        name: '성스러운 수호자', icon: '👼🛡️',
        recipe: ['holy_water', 'celestial_feather', 'shield_of_eternity'],
        tier: 'legendary',
        effects: { def: 30, healBonus: 0.25, partyDefAura: 10, onDeath: '사망 시 1회 부활 (HP 50%, 10분 CD)' },
        desc: '천상의 빛으로 모두를 지키는 성물',
    },

    // ═══ 유틸 계열 ═══
    crown_of_wisdom: {
        name: '지혜의 왕관', icon: '👑📖',
        recipe: ['crown_of_kings', 'ancient_scroll', 'eye_of_truth'],
        tier: 'legendary',
        effects: { exp: 30, goldBonus: 0.2, skillCdReduce: 0.15, onLevelUp: '레벨업 시 풀 HP 회복' },
        desc: '모든 지식을 꿰뚫는 왕의 왕관',
    },
    shadow_dancer: {
        name: '그림자 무용수', icon: '🌑💃',
        recipe: ['shadow_pearl', 'boots_of_wind', 'eye_of_truth'],
        tier: 'legendary',
        effects: { dodge: 18, spd: 8, crit: 8, onDodge: '회피 시 2초 투명 (공격 불가 상태)' },
        desc: '그림자 속에서 춤추는 암살자의 보물',
    },

    // ═══ 원소 계열 ═══
    phoenix_rebirth: {
        name: '불사조의 환생', icon: '🔥🐦',
        recipe: ['phoenix_feather', 'flame_core', 'holy_water'],
        tier: 'mythic',
        effects: { fireAtk: 40, fireResist: 0.5, autoRevive: 1, onRevive: '부활 시 주변 적 화염 폭발' },
        desc: '재에서 다시 태어나는 불사조의 힘',
    },
    frost_emperor: {
        name: '서리 황제', icon: '❄️👑',
        recipe: ['frost_tear', 'crown_of_kings', 'earth_root'],
        tier: 'legendary',
        effects: { def: 25, hp: 200, freezeOnHit: 0.08, aura: '주변 적 이동속도 -20%' },
        desc: '얼어붙은 대지를 지배하는 황제의 유물',
    },

    // ═══ 히든 조합 (레시피 비공개, 발견 시 업적) ═══
    primordial_god: {
        name: '태초신의 유물', icon: '🌟💎',
        recipe: ['primordial_orb', 'star_of_destiny', 'celestial_feather'],
        tier: 'mythic', hidden: true,
        effects: { allStats: 20, exp: 50, goldBonus: 0.5, dropRate: 0.3, cosmetic: '황금 오라 이펙트' },
        desc: '태초신의 힘이 깃든 궁극의 유물. 찾는 자에게 무한한 축복을.',
    },
    abyss_overlord: {
        name: '심연의 지배자', icon: '💀🔮',
        recipe: ['void_shard', 'demon_horn', 'shadow_pearl'],
        tier: 'mythic', hidden: true,
        effects: { atk: 45, lifesteal: 0.15, darkDmg: 0.4, onKill: '처치 시 30초 ATK +30% 버프' },
        desc: '심연의 끝에서 돌아온 자만이 쥘 수 있는 어둠의 힘.',
    },
};

const MAX_EQUIPPED_FUSIONS = 2; // 동시 장착 최대 2개

function _ensure(player) {
    if (!player._relicFusion) {
        player._relicFusion = {
            discovered: {},    // { recipeId: discoveredAt }
            crafted: {},       // { recipeId: craftedAt }
            equipped: [],      // [recipeId, recipeId]
            totalFusions: 0,
        };
    }
    return player._relicFusion;
}

// 조합 시도
function fuseRelics(player, relicId1, relicId2, relicId3) {
    const state = _ensure(player);
    if (!player.inventory) return { success: false, msg: '인벤토리 없음' };

    const ids = [relicId1, relicId2, relicId3].sort();
    // 재료 보유 확인
    for (const id of ids) {
        if (!player.inventory[id] || player.inventory[id] <= 0) {
            const relic = RELIC_POOL[id];
            return { success: false, msg: `${relic?.name || id} 보유하지 않음` };
        }
    }

    // 레시피 매칭
    let matched = null;
    for (const [recipeId, recipe] of Object.entries(FUSION_RECIPES)) {
        const sorted = [...recipe.recipe].sort();
        if (sorted[0] === ids[0] && sorted[1] === ids[1] && sorted[2] === ids[2]) {
            matched = { id: recipeId, ...recipe };
            break;
        }
    }

    if (!matched) return { success: false, msg: '알려진 조합법이 없습니다. 다른 조합을 시도해보세요.' };

    // 재료 소모
    for (const id of ids) {
        player.inventory[id]--;
        if (player.inventory[id] <= 0) delete player.inventory[id];
    }

    // 결과물 지급
    player.inventory[matched.id] = (player.inventory[matched.id] || 0) + 1;
    state.totalFusions++;

    // 히든 조합 발견
    const isNewDiscovery = !state.discovered[matched.id];
    state.discovered[matched.id] = state.discovered[matched.id] || Date.now();
    state.crafted[matched.id] = Date.now();

    return {
        success: true,
        result: matched,
        isHidden: matched.hidden || false,
        isNewDiscovery,
        msg: `${matched.icon} ${matched.name} 조합 성공!`,
    };
}

// 조합 유물 장착
function equipFusion(player, recipeId) {
    const state = _ensure(player);
    if (!player.inventory[recipeId]) return { success: false, msg: '보유하지 않음' };
    if (!FUSION_RECIPES[recipeId]) return { success: false, msg: '조합 유물이 아님' };
    if (state.equipped.includes(recipeId)) return { success: false, msg: '이미 장착 중' };
    if (state.equipped.length >= MAX_EQUIPPED_FUSIONS) return { success: false, msg: `최대 ${MAX_EQUIPPED_FUSIONS}개 장착 가능` };

    state.equipped.push(recipeId);
    return { success: true, equipped: state.equipped, msg: `${FUSION_RECIPES[recipeId].name} 장착!` };
}

// 조합 유물 해제
function unequipFusion(player, recipeId) {
    const state = _ensure(player);
    const idx = state.equipped.indexOf(recipeId);
    if (idx === -1) return { success: false, msg: '장착 중이 아님' };
    state.equipped.splice(idx, 1);
    return { success: true, msg: '해제 완료' };
}

// 장착된 조합 유물 효과 합산 (recalcStats에서 호출)
function getEquippedEffects(player) {
    const state = _ensure(player);
    const combined = {};
    for (const recipeId of state.equipped) {
        const recipe = FUSION_RECIPES[recipeId];
        if (!recipe) continue;
        for (const [key, val] of Object.entries(recipe.effects)) {
            if (typeof val === 'number') {
                combined[key] = (combined[key] || 0) + val;
            } else {
                combined[key] = val; // 문자열 효과는 마지막 값
            }
        }
    }
    return combined;
}

// 레시피 목록 (발견한 것만 표시, 히든은 ???)
function getRecipeBook(player) {
    const state = _ensure(player);
    return Object.entries(FUSION_RECIPES).map(([id, r]) => {
        const discovered = !!state.discovered[id];
        const crafted = !!state.crafted[id];
        if (r.hidden && !discovered) {
            return { id, name: '??? 히든 조합 ???', icon: '❓', tier: '???', discovered: false, crafted: false, hidden: true };
        }
        return {
            id, name: r.name, icon: r.icon, tier: r.tier,
            recipe: discovered ? r.recipe.map(rid => RELIC_POOL[rid]?.name || rid) : ['???','???','???'],
            effects: discovered ? r.effects : {},
            desc: discovered ? r.desc : '아직 발견하지 못한 조합',
            discovered, crafted, hidden: r.hidden || false,
        };
    });
}

// 상태
function getStatus(player) {
    const state = _ensure(player);
    return {
        equipped: state.equipped.map(id => ({ id, ...FUSION_RECIPES[id] })),
        totalFusions: state.totalFusions,
        discoveredCount: Object.keys(state.discovered).length,
        totalRecipes: Object.keys(FUSION_RECIPES).length,
        recipeBook: getRecipeBook(player),
        maxEquip: MAX_EQUIPPED_FUSIONS,
    };
}

module.exports = {
    RELIC_POOL, FUSION_RECIPES, MAX_EQUIPPED_FUSIONS,
    fuseRelics, equipFusion, unequipFusion, getEquippedEffects, getRecipeBook, getStatus,
};

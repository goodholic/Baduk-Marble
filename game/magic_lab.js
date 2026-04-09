// ==========================================
// 마법 연구소 — v2.37
// 스킬 연구 + 새 스킬 창조 + 스킬 결합 + 마법서 수집
// ==========================================

// ── 연구 가능 스킬 트리 ──
const RESEARCH_TREE = {
    // ═══ 화염 계열 ═══
    fire_mastery: { name: '화염 숙련', icon: '🔥', tier: 1, cost: { gold: 5000, mp: 50 }, time: 1800, effect: { fireAtk: 0.10 }, desc: '화염 데미지 +10%', prereq: null },
    fireball_enhance: { name: '파이어볼 강화', icon: '🔥+', tier: 2, cost: { gold: 15000, mp: 100 }, time: 3600, effect: { fireballMult: 0.3 }, desc: '파이어볼 데미지 +30%', prereq: 'fire_mastery' },
    meteor_rain: { name: '메테오 레인', icon: '☄️', tier: 3, cost: { gold: 50000, mp: 200, item: 'mat_dragon' }, time: 7200, effect: { newSkill: 'meteor_rain' }, desc: '신규 스킬: 메테오 레인 (5연속 낙하)', prereq: 'fireball_enhance' },
    inferno_aura: { name: '인페르노 오라', icon: '🔥🔥', tier: 4, cost: { gold: 100000, mp: 300, item: 'relic_sun_shard' }, time: 14400, effect: { aura: { type: 'fire', dps: 10, radius: 3 } }, desc: '상시 화염 오라 (주변 DPS 10)', prereq: 'meteor_rain' },

    // ═══ 빙결 계열 ═══
    ice_mastery: { name: '빙결 숙련', icon: '❄️', tier: 1, cost: { gold: 5000, mp: 50 }, time: 1800, effect: { iceAtk: 0.10 }, desc: '빙결 데미지 +10%', prereq: null },
    frost_armor: { name: '서리 갑옷', icon: '🧊', tier: 2, cost: { gold: 15000, mp: 100 }, time: 3600, effect: { frostDef: 15, slowOnHit: 0.1 }, desc: 'DEF +15, 피격 시 10% 둔화', prereq: 'ice_mastery' },
    blizzard: { name: '블리자드', icon: '🌨️', tier: 3, cost: { gold: 50000, mp: 200, item: 'relic_frost_crown' }, time: 7200, effect: { newSkill: 'blizzard' }, desc: '신규 스킬: 블리자드 (범위 빙결 3초)', prereq: 'frost_armor' },
    absolute_zero_field: { name: '절대 영도 필드', icon: '💠', tier: 4, cost: { gold: 100000, mp: 300, item: 'relic_rain_crystal' }, time: 14400, effect: { aura: { type: 'ice', slowPct: 0.3, radius: 5 } }, desc: '상시 빙결 필드 (주변 속도 -30%)', prereq: 'blizzard' },

    // ═══ 번개 계열 ═══
    thunder_mastery: { name: '번개 숙련', icon: '⚡', tier: 1, cost: { gold: 5000, mp: 50 }, time: 1800, effect: { thunderAtk: 0.10 }, desc: '번개 데미지 +10%', prereq: null },
    chain_lightning: { name: '체인 라이트닝', icon: '⚡⚡', tier: 2, cost: { gold: 15000, mp: 100 }, time: 3600, effect: { newSkill: 'chain_lightning' }, desc: '신규 스킬: 연쇄 번개 (3명 전이)', prereq: 'thunder_mastery' },
    thunder_god: { name: '뇌신의 권능', icon: '🌩️', tier: 3, cost: { gold: 50000, mp: 200, item: 'relic_thunder_orb' }, time: 7200, effect: { thunderCrit: 0.2, stunChance: 0.15 }, desc: '번개 크리 +20%, 15% 기절', prereq: 'chain_lightning' },
    ragnarok_bolt: { name: '라그나로크 볼트', icon: '⚡💀', tier: 4, cost: { gold: 100000, mp: 300, item: 'relic_omega_core' }, time: 14400, effect: { newSkill: 'ragnarok_bolt' }, desc: '신규 스킬: 궁극의 번개 (ATKx8 단일)', prereq: 'thunder_god' },

    // ═══ 암흑 계열 ═══
    dark_mastery: { name: '암흑 숙련', icon: '🌑', tier: 1, cost: { gold: 5000, mp: 50 }, time: 1800, effect: { darkAtk: 0.10 }, desc: '암흑 데미지 +10%', prereq: null },
    soul_drain: { name: '영혼 흡수', icon: '👻', tier: 2, cost: { gold: 15000, mp: 100 }, time: 3600, effect: { lifesteal: 0.05 }, desc: '흡혈 +5%', prereq: 'dark_mastery' },
    shadow_realm: { name: '그림자 영역', icon: '🕳️', tier: 3, cost: { gold: 50000, mp: 200, item: 'mat_soul' }, time: 7200, effect: { newSkill: 'shadow_realm' }, desc: '신규 스킬: 그림자 차원 (5초 은신+ATK2배)', prereq: 'soul_drain' },
    void_annihilation: { name: '공허 소멸', icon: '💀🕳️', tier: 4, cost: { gold: 100000, mp: 300 }, time: 14400, effect: { newSkill: 'void_annihilation' }, desc: '신규 스킬: 공허 소멸 (범위 HP 30% 삭감)', prereq: 'shadow_realm' },

    // ═══ 성광 계열 ═══
    holy_mastery: { name: '성광 숙련', icon: '✨', tier: 1, cost: { gold: 5000, mp: 50 }, time: 1800, effect: { healBonus: 0.10 }, desc: '힐량 +10%', prereq: null },
    divine_shield: { name: '신성 보호막', icon: '🛡️✨', tier: 2, cost: { gold: 15000, mp: 100 }, time: 3600, effect: { newSkill: 'divine_shield_spell' }, desc: '신규 스킬: 5초 무적 (CD 120초)', prereq: 'holy_mastery' },
    resurrection: { name: '부활', icon: '💫', tier: 3, cost: { gold: 50000, mp: 200 }, time: 7200, effect: { newSkill: 'resurrection' }, desc: '신규 스킬: 아군 1명 즉시 부활', prereq: 'divine_shield' },
    judgment_light: { name: '심판의 빛', icon: '🌟⚔️', tier: 4, cost: { gold: 100000, mp: 300 }, time: 14400, effect: { newSkill: 'judgment_light' }, desc: '신규 스킬: 성광 심판 (범위 ATKx5+힐)', prereq: 'resurrection' },
};

// ── 스킬 결합 (연구 완료 스킬 2개 → 합성 스킬) ──
const SKILL_FUSIONS = {
    volcanic_storm: { name: '화산 폭풍', icon: '🌋⚡', combo: ['meteor_rain', 'chain_lightning'], effect: { type: 'aoe', radius: 10, mult: 5, burn: 5, stun: 2 }, desc: '화염+번개 = 화산 폭풍 (범위10 x5 + 화상 + 기절)', cd: 180 },
    frozen_inferno: { name: '얼어붙은 지옥', icon: '❄️🔥', combo: ['blizzard', 'inferno_aura'], effect: { type: 'aoe', radius: 8, mult: 4, freezeBurn: true }, desc: '빙결+화염 = 대폭발 (동상+화상 동시)', cd: 150 },
    shadow_lightning: { name: '그림자 번개', icon: '🌑⚡', combo: ['shadow_realm', 'ragnarok_bolt'], effect: { type: 'single', mult: 12, ignoreDefense: true }, desc: '암흑+번개 = 방어 무시 12배 공격', cd: 200 },
    divine_apocalypse: { name: '신성한 종말', icon: '✨💀', combo: ['judgment_light', 'void_annihilation'], effect: { type: 'ultimate', radius: 15, hpCutPct: 0.4, healAllyPct: 0.5 }, desc: '성광+암흑 = 적 HP 40% 삭감 + 아군 50% 힐', cd: 300 },
};

// ── 마법서 수집 (몬스터 드롭 + 보스 보상) ──
const SPELL_BOOKS = {
    book_fire_basics: { name: '화염 기초 마법서', icon: '📕', tier: 1, exp: 100, element: 'fire' },
    book_ice_basics: { name: '빙결 기초 마법서', icon: '📘', tier: 1, exp: 100, element: 'ice' },
    book_thunder_basics: { name: '번개 기초 마법서', icon: '📗', tier: 1, exp: 100, element: 'thunder' },
    book_dark_basics: { name: '암흑 기초 마법서', icon: '📓', tier: 1, exp: 100, element: 'dark' },
    book_holy_basics: { name: '성광 기초 마법서', icon: '📒', tier: 1, exp: 100, element: 'holy' },
    book_advanced: { name: '고급 마법서', icon: '📙', tier: 2, exp: 300, element: 'any' },
    book_legendary: { name: '전설 마법서', icon: '📖✨', tier: 3, exp: 1000, element: 'any' },
};

function _ensure(player) {
    if (!player._magicLab) {
        player._magicLab = {
            researched: {},      // { researchId: completedAt }
            inProgress: null,    // { researchId, startTime, endTime }
            labLevel: 1,         // 연구소 레벨 (1-5)
            labExp: 0,
            spellBooks: {},      // { bookId: count }
            fusedSkills: {},     // { fusionId: unlockedAt }
            totalResearches: 0,
        };
    }
    return player._magicLab;
}

const LAB_LEVEL_EXP = [0, 500, 1500, 4000, 8000, 15000];
const LAB_SPEED_BONUS = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0]; // 레벨별 연구 속도

// 연구 시작
function startResearch(player, researchId) {
    const state = _ensure(player);
    const research = RESEARCH_TREE[researchId];
    if (!research) return { success: false, msg: '알 수 없는 연구' };
    if (state.researched[researchId]) return { success: false, msg: '이미 연구 완료' };
    if (state.inProgress) return { success: false, msg: '이미 연구 진행 중' };
    if (research.prereq && !state.researched[research.prereq]) return { success: false, msg: `선행 연구 필요: ${RESEARCH_TREE[research.prereq]?.name}` };

    // 비용 체크
    if ((player.gold || 0) < research.cost.gold) return { success: false, msg: `골드 부족 (${research.cost.gold}G)` };
    if ((player.mp || 0) < research.cost.mp) return { success: false, msg: `MP 부족 (${research.cost.mp})` };
    if (research.cost.item && (!player.inventory?.[research.cost.item] || player.inventory[research.cost.item] <= 0)) {
        return { success: false, msg: `재료 부족: ${research.cost.item}` };
    }

    // 비용 차감
    player.gold -= research.cost.gold;
    player.mp = Math.max(0, (player.mp || 0) - research.cost.mp);
    if (research.cost.item) {
        player.inventory[research.cost.item]--;
        if (player.inventory[research.cost.item] <= 0) delete player.inventory[research.cost.item];
    }

    const speedMult = LAB_SPEED_BONUS[state.labLevel] || 1;
    const duration = Math.floor(research.time * 1000 / speedMult);
    state.inProgress = { researchId, startTime: Date.now(), endTime: Date.now() + duration };

    return { success: true, research, duration, msg: `${research.icon} ${research.name} 연구 시작! (${Math.ceil(duration/60000)}분)` };
}

// 연구 완료 체크
function checkResearch(player) {
    const state = _ensure(player);
    if (!state.inProgress) return { completed: false };
    if (Date.now() < state.inProgress.endTime) {
        return { completed: false, remaining: Math.ceil((state.inProgress.endTime - Date.now()) / 1000), research: RESEARCH_TREE[state.inProgress.researchId] };
    }

    // 완료!
    const researchId = state.inProgress.researchId;
    const research = RESEARCH_TREE[researchId];
    state.researched[researchId] = Date.now();
    state.inProgress = null;
    state.totalResearches++;
    state.labExp += research.tier * 100;

    // 연구소 레벨업
    let leveledUp = false;
    while (state.labLevel < 5 && state.labExp >= LAB_LEVEL_EXP[state.labLevel + 1]) {
        state.labLevel++;
        leveledUp = true;
    }

    return { completed: true, research, researchId, leveledUp, labLevel: state.labLevel, msg: `${research.icon} ${research.name} 연구 완료!` };
}

// 스킬 결합
function fuseSkills(player, fusionId) {
    const state = _ensure(player);
    const fusion = SKILL_FUSIONS[fusionId];
    if (!fusion) return { success: false, msg: '알 수 없는 결합' };
    if (state.fusedSkills[fusionId]) return { success: false, msg: '이미 해금됨' };

    // 선행 연구 체크
    for (const req of fusion.combo) {
        if (!state.researched[req]) {
            const resName = RESEARCH_TREE[req]?.name || req;
            return { success: false, msg: `선행 연구 필요: ${resName}` };
        }
    }

    state.fusedSkills[fusionId] = Date.now();
    return { success: true, fusion, msg: `${fusion.icon} ${fusion.name} 해금! — ${fusion.desc}` };
}

// 마법서 사용 (연구소 EXP)
function useSpellBook(player, bookId) {
    const state = _ensure(player);
    if (!state.spellBooks[bookId] || state.spellBooks[bookId] <= 0) return { success: false, msg: '마법서 없음' };
    const book = SPELL_BOOKS[bookId];
    if (!book) return { success: false, msg: '알 수 없는 마법서' };

    state.spellBooks[bookId]--;
    if (state.spellBooks[bookId] <= 0) delete state.spellBooks[bookId];
    state.labExp += book.exp;

    let leveledUp = false;
    while (state.labLevel < 5 && state.labExp >= LAB_LEVEL_EXP[state.labLevel + 1]) {
        state.labLevel++;
        leveledUp = true;
    }

    return { success: true, exp: book.exp, labLevel: state.labLevel, leveledUp, msg: `${book.icon} ${book.name} 사용! +${book.exp} 연구 EXP` };
}

// 상태
function getStatus(player) {
    const state = _ensure(player);
    const check = checkResearch(player);
    return {
        labLevel: state.labLevel,
        labExp: state.labExp,
        nextLevelExp: LAB_LEVEL_EXP[Math.min(state.labLevel + 1, 5)],
        speedBonus: LAB_SPEED_BONUS[state.labLevel],
        inProgress: state.inProgress ? { ...state.inProgress, research: RESEARCH_TREE[state.inProgress.researchId], remaining: Math.max(0, Math.ceil((state.inProgress.endTime - Date.now()) / 1000)) } : null,
        researchTree: Object.entries(RESEARCH_TREE).map(([id, r]) => ({
            id, ...r,
            researched: !!state.researched[id],
            available: !state.researched[id] && (!r.prereq || !!state.researched[r.prereq]),
        })),
        fusionSkills: Object.entries(SKILL_FUSIONS).map(([id, f]) => ({
            id, ...f,
            unlocked: !!state.fusedSkills[id],
            available: f.combo.every(c => !!state.researched[c]) && !state.fusedSkills[id],
        })),
        spellBooks: state.spellBooks,
        totalResearches: state.totalResearches,
    };
}

module.exports = {
    RESEARCH_TREE, SKILL_FUSIONS, SPELL_BOOKS,
    startResearch, checkResearch, fuseSkills, useSpellBook, getStatus,
};

// ==========================================
// 신화 소환수 시스템 — v2.33
// 신화 등급 소환수 6종. 각성 → 신격화.
// 신화 보스 소환. 전용 스토리 + 퀘스트 연동.
// ==========================================

// ── 신화 소환수 정의 ──
const MYTHIC_SUMMONS = {
    fenrir: {
        name: '펜리르', icon: '🐺', element: 'dark', origin: '북유럽',
        lore: '세상을 집어삼킬 거대한 늑대. 사슬을 끊고 자유를 되찾았다.',
        baseStats: { atk: 80, def: 30, hp: 2000, spd: 25 },
        passive: { critRate: 0.15, lifesteal: 0.08, onKill: '처치 시 ATK +5% (누적 최대 50%, 사망 초기화)' },
        skills: [
            { name: '포식', desc: '단일 ATKx4 + HP 30% 흡수', cd: 30, type: 'single', mult: 4, drain: 0.3 },
            { name: '멸망의 울부짖음', desc: '범위 5, ATKx2 + 공포 3초', cd: 60, type: 'aoe', radius: 5, mult: 2, debuff: 'fear', debuffDur: 3000 },
        ],
        awakenSkill: { name: '라그나로크', desc: '전체 ATKx6 + 5초 불사 + ATK 3배', cd: 300, type: 'ultimate' },
        deifyPassive: { allStats: 15, lifesteal: 0.05, darkDmg: 0.25 },
        obtainMethod: '영혼 T4(어둠) 5개 + 태초 소환석 3개 + 100,000G',
    },
    bahamut: {
        name: '바하무트', icon: '🐉', element: 'fire', origin: '아라비안',
        lore: '천공과 심해를 가르는 태초의 용. 그 숨결은 세계를 태운다.',
        baseStats: { atk: 100, def: 40, hp: 2500, spd: 18 },
        passive: { fireAtk: 0.3, burnChance: 0.2, aura: '주변 5칸 아군 ATK +10%' },
        skills: [
            { name: '메가 플레어', desc: '범위 8, ATKx3 + 화상 5초', cd: 45, type: 'aoe', radius: 8, mult: 3, burn: 5 },
            { name: '용신의 포효', desc: '범위 10, 적 DEF -30% 8초 + 아군 ATK +20% 8초', cd: 90, type: 'buff_debuff', radius: 10 },
        ],
        awakenSkill: { name: '테라 플레어', desc: '전체 ATKx8 + 화염 면역 10초', cd: 300, type: 'ultimate' },
        deifyPassive: { allStats: 20, fireAtk: 0.2, burnDmg: 2.0 },
        obtainMethod: '드래곤 영혼 각성 + 바하무트의 비늘 (슈퍼보스 드롭) + 200,000G',
    },
    leviathan_god: {
        name: '레비아탄 신', icon: '🐋', element: 'water', origin: '히브리',
        lore: '깊은 바다에서 태어난 최초의 괴수. 그 분노는 해일이 된다.',
        baseStats: { atk: 60, def: 70, hp: 3500, spd: 12 },
        passive: { def: 20, hp: 500, freezeChance: 0.15, dmgReduce: 0.1 },
        skills: [
            { name: '심해 감옥', desc: '단일 적 8초 이동불가 + DoT ATKx0.5/초', cd: 40, type: 'cc', dur: 8000 },
            { name: '쓰나미', desc: '범위 12, ATKx2 + 넉백 + 3초 둔화', cd: 75, type: 'aoe', radius: 12, mult: 2, knockback: 8 },
        ],
        awakenSkill: { name: '심해의 심판', desc: '전체 5초 익사(HP -20%/초) + 자신 풀 힐', cd: 300, type: 'ultimate' },
        deifyPassive: { allStats: 15, def: 30, dmgReduce: 0.15, freezeChance: 0.1 },
        obtainMethod: '리바이어던 영혼 각성 + 심해의 눈물 (역설 던전 드롭) + 200,000G',
    },
    odin: {
        name: '오딘', icon: '👁️', element: 'light', origin: '북유럽',
        lore: '지혜를 위해 한 눈을 바친 신들의 왕. 모든 것을 꿰뚫어 본다.',
        baseStats: { atk: 70, def: 50, hp: 2200, spd: 20 },
        passive: { expBonus: 0.25, critRate: 0.1, cooldownReduce: 0.2, vision: 999 },
        skills: [
            { name: '군그니르', desc: '관통 ATKx5, 방어 무시, 크리 100%', cd: 50, type: 'pierce', mult: 5, ignoreDefense: true },
            { name: '지혜의 눈', desc: '30초간 전장 전체 시야 + 은신 감지', cd: 120, type: 'vision', dur: 30000 },
        ],
        awakenSkill: { name: '발할라 소환', desc: '전설 전사 5명 소환 30초 + 파티 불사', cd: 300, type: 'ultimate' },
        deifyPassive: { allStats: 18, expBonus: 0.15, cooldownReduce: 0.1 },
        obtainMethod: '크로노스 영혼 + 세계수 Lv.10 + 지혜의 열매 3개 + 300,000G',
    },
    thanatos: {
        name: '타나토스', icon: '💀', element: 'dark', origin: '그리스',
        lore: '죽음 그 자체. 그의 낫에 베인 자는 어떤 부활도 불가능하다.',
        baseStats: { atk: 90, def: 25, hp: 1800, spd: 22 },
        passive: { lifesteal: 0.12, executeThreshold: 0.2, onKill: '처치 시 쿨다운 전체 -5초' },
        skills: [
            { name: '죽음의 낫', desc: 'HP 30%↓ 적 즉사, 그 외 ATKx3', cd: 35, type: 'execute', threshold: 0.3, mult: 3 },
            { name: '영혼 수확', desc: '범위 6, 처치된 적 영혼 흡수 → 자신 ATK +15% 영구 (전투 중)', cd: 90, type: 'harvest', radius: 6 },
        ],
        awakenSkill: { name: '죽음의 문', desc: '전체 적 현재 HP 50% 삭감 + 10초 부활 불가', cd: 300, type: 'ultimate' },
        deifyPassive: { allStats: 12, lifesteal: 0.08, executeThreshold: 0.1 },
        obtainMethod: '리치 영혼 각성 + 아자토스 영혼 + 300,000G',
    },
    gaia: {
        name: '가이아', icon: '🌍', element: 'earth', origin: '그리스',
        lore: '대지의 어머니. 모든 생명을 품고, 모든 것을 치유한다.',
        baseStats: { atk: 40, def: 60, hp: 4000, spd: 10 },
        passive: { healAura: 0.03, partyDefAura: 15, hpRegen: 0.05, dmgReduce: 0.15 },
        skills: [
            { name: '대지의 축복', desc: '파티 전원 HP 40% 회복 + 디버프 해제', cd: 45, type: 'party_heal', healPct: 0.4, cleanse: true },
            { name: '자연의 방벽', desc: '파티 전원 15초 피해 40% 감소 + 독/화상 면역', cd: 100, type: 'party_shield', dur: 15000, dmgReduce: 0.4 },
        ],
        awakenSkill: { name: '생명의 기적', desc: '사망한 파티원 전부 부활 (HP 100%) + 30초 무적', cd: 300, type: 'ultimate' },
        deifyPassive: { allStats: 15, healBonus: 0.3, partyDefAura: 10 },
        obtainMethod: '불사조 영혼 각성 + 소원 나무 Lv.10 + 무지개 열매 + 300,000G',
    },
};

// ── 각성 단계 ──
const AWAKEN_STAGES = [
    { name: '일반', reqLevel: 1, statMult: 1.0, skillsUnlocked: 2, icon: '⭐' },
    { name: '각성', reqLevel: 30, statMult: 1.5, skillsUnlocked: 2, icon: '⭐⭐', reqMaterial: 'mat_soul', reqCount: 20, reqGold: 100000 },
    { name: '초월', reqLevel: 50, statMult: 2.0, skillsUnlocked: 3, icon: '⭐⭐⭐', reqMaterial: 'mat_dragon', reqCount: 15, reqGold: 200000 },
    { name: '신격화', reqLevel: 50, statMult: 3.0, skillsUnlocked: 3, icon: '🌟', reqMaterial: 'mat_primal', reqCount: 5, reqGold: 500000, deify: true },
];

// ── 신화 보스 (소환수 합체) ──
const MYTHIC_BOSSES = {
    world_serpent: {
        name: '세계의 뱀 요르문간드', icon: '🐍🌍',
        reqSummons: ['fenrir', 'leviathan_god'],
        hp: 200000, atk: 400, def: 100,
        phases: 3,
        reward: { gold: 100000, exp: 80000, diamonds: 500, item: 'equip_ragnarok_set', title: 'title_godslayer' },
        lore: '미드가르드를 감싸는 거대한 뱀. 라그나로크의 전조.',
    },
    chaos_dragon: {
        name: '혼돈의 용 티아마트', icon: '🐉🌀',
        reqSummons: ['bahamut', 'thanatos'],
        hp: 300000, atk: 500, def: 120,
        phases: 3,
        reward: { gold: 150000, exp: 100000, diamonds: 800, item: 'equip_chaos_crown', title: 'title_chaosconqueror' },
        lore: '창조와 파괴를 동시에 품은 최초의 용.',
    },
};

function _ensure(player) {
    if (!player._mythicSummon) {
        player._mythicSummon = {
            owned: {},       // { summonId: { level, awakenStage, exp } }
            active: null,    // 현재 소환 중인 신화 소환수
            totalSummoned: 0,
            bossKills: 0,
        };
    }
    return player._mythicSummon;
}

// 신화 소환수 획득
function obtain(player, summonId) {
    const state = _ensure(player);
    const summon = MYTHIC_SUMMONS[summonId];
    if (!summon) return { success: false, msg: '알 수 없는 소환수' };
    if (state.owned[summonId]) return { success: false, msg: '이미 보유 중' };

    // 비용 체크 (간략화 — 실제로는 obtainMethod 파싱)
    if ((player.gold || 0) < 100000) return { success: false, msg: '골드 부족 (최소 100,000G)' };
    player.gold -= 100000;

    state.owned[summonId] = { level: 1, awakenStage: 0, exp: 0 };
    state.totalSummoned++;

    return { success: true, summon, msg: `${summon.icon} ${summon.name} 획득! — "${summon.lore}"` };
}

// 소환 (전투에 배치)
function summon(player, summonId) {
    const state = _ensure(player);
    if (!state.owned[summonId]) return { success: false, msg: '보유하지 않음' };
    state.active = summonId;
    return { success: true, summon: MYTHIC_SUMMONS[summonId], msg: `${MYTHIC_SUMMONS[summonId].icon} ${MYTHIC_SUMMONS[summonId].name} 소환!` };
}

// 각성
function awaken(player, summonId) {
    const state = _ensure(player);
    const entry = state.owned[summonId];
    if (!entry) return { success: false, msg: '보유하지 않음' };
    const nextStage = AWAKEN_STAGES[entry.awakenStage + 1];
    if (!nextStage) return { success: false, msg: '최대 각성' };
    if (player.level < nextStage.reqLevel) return { success: false, msg: `Lv.${nextStage.reqLevel} 필요` };
    if (nextStage.reqGold && (player.gold || 0) < nextStage.reqGold) return { success: false, msg: `골드 부족 (${nextStage.reqGold}G)` };
    if (nextStage.reqMaterial) {
        if (!player.inventory?.[nextStage.reqMaterial] || player.inventory[nextStage.reqMaterial] < nextStage.reqCount) {
            return { success: false, msg: `${nextStage.reqMaterial} ${nextStage.reqCount}개 필요` };
        }
        player.inventory[nextStage.reqMaterial] -= nextStage.reqCount;
        if (player.inventory[nextStage.reqMaterial] <= 0) delete player.inventory[nextStage.reqMaterial];
    }
    if (nextStage.reqGold) player.gold -= nextStage.reqGold;

    entry.awakenStage++;
    const summon = MYTHIC_SUMMONS[summonId];
    const stageName = AWAKEN_STAGES[entry.awakenStage].name;

    return { success: true, stage: stageName, icon: AWAKEN_STAGES[entry.awakenStage].icon, msg: `${summon.icon} ${summon.name} ${stageName}! ${AWAKEN_STAGES[entry.awakenStage].icon}` };
}

// 장착 효과 계산
function getActiveEffects(player) {
    const state = _ensure(player);
    if (!state.active || !state.owned[state.active]) return {};
    const entry = state.owned[state.active];
    const summon = MYTHIC_SUMMONS[state.active];
    if (!summon) return {};

    const stageMult = AWAKEN_STAGES[entry.awakenStage]?.statMult || 1;
    const effects = {};

    // 패시브 적용
    for (const [k, v] of Object.entries(summon.passive)) {
        if (typeof v === 'number') effects[k] = v * stageMult;
        else effects[k] = v;
    }

    // 신격화 보너스
    if (AWAKEN_STAGES[entry.awakenStage]?.deify && summon.deifyPassive) {
        for (const [k, v] of Object.entries(summon.deifyPassive)) {
            if (typeof v === 'number') effects[k] = (effects[k] || 0) + v;
        }
    }

    return effects;
}

// 상태
function getStatus(player) {
    const state = _ensure(player);
    return {
        owned: Object.entries(state.owned).map(([id, entry]) => ({
            id, ...MYTHIC_SUMMONS[id],
            level: entry.level, awakenStage: entry.awakenStage,
            stageName: AWAKEN_STAGES[entry.awakenStage]?.name,
            stageIcon: AWAKEN_STAGES[entry.awakenStage]?.icon,
            nextAwaken: AWAKEN_STAGES[entry.awakenStage + 1] || null,
        })),
        active: state.active ? { id: state.active, ...MYTHIC_SUMMONS[state.active] } : null,
        activeEffects: getActiveEffects(player),
        available: Object.entries(MYTHIC_SUMMONS).filter(([id]) => !state.owned[id]).map(([id, s]) => ({ id, name: s.name, icon: s.icon, origin: s.origin, lore: s.lore, obtainMethod: s.obtainMethod })),
        bosses: Object.entries(MYTHIC_BOSSES).map(([id, b]) => ({ id, ...b })),
        totalSummoned: state.totalSummoned,
        bossKills: state.bossKills,
    };
}

module.exports = {
    MYTHIC_SUMMONS, AWAKEN_STAGES, MYTHIC_BOSSES,
    obtain, summon, awaken, getActiveEffects, getStatus,
};

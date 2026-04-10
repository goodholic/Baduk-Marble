// ==========================================
// 보스 소환 시스템 — v2.20
// 소환수 매칭 → 합성 → 진화 → 보스 소환
// ==========================================

// ── 소환석 정의 (몬스터 드롭 + 제작) ──
const SUMMON_STONES = {
    stone_fire:   { name:'화염 소환석',  element:'fire',   grade:'common',  dropWeight:30, icon:'🔴' },
    stone_water:  { name:'수빙 소환석',  element:'water',  grade:'common',  dropWeight:30, icon:'🔵' },
    stone_wind:   { name:'질풍 소환석',  element:'wind',   grade:'common',  dropWeight:30, icon:'🟢' },
    stone_earth:  { name:'대지 소환석',  element:'earth',  grade:'common',  dropWeight:30, icon:'🟤' },
    stone_dark:   { name:'암흑 소환석',  element:'dark',   grade:'uncommon', dropWeight:10, icon:'🟣' },
    stone_light:  { name:'성광 소환석',  element:'light',  grade:'uncommon', dropWeight:10, icon:'🟡' },
    stone_void:   { name:'공허 소환석',  element:'void',   grade:'rare',    dropWeight:3,  icon:'⚫' },
    stone_primal: { name:'태초 소환석',  element:'primal', grade:'epic',    dropWeight:1,  icon:'💎' },
};

// ── 소환수 정의 (소환석 3개 합성) ──
const SUMMONS = {
    // Tier 1: 기본 소환수 (같은 속성 3개)
    summon_fire_imp:    { name:'화염 임프',    tier:1, element:'fire',   recipe:['stone_fire','stone_fire','stone_fire'],     baseAtk:15, baseDef:5,  baseHp:200,  skill:'fireball',   skillDesc:'화염구 (ATK×1.5)', icon:'🔥' },
    summon_ice_golem:   { name:'빙결 골렘',    tier:1, element:'water',  recipe:['stone_water','stone_water','stone_water'],   baseAtk:8,  baseDef:18, baseHp:400,  skill:'freeze',     skillDesc:'빙결 (3초 둔화)', icon:'🧊' },
    summon_wind_hawk:   { name:'질풍 매',      tier:1, element:'wind',   recipe:['stone_wind','stone_wind','stone_wind'],      baseAtk:20, baseDef:3,  baseHp:150,  skill:'gust',       skillDesc:'돌풍 (넉백 + ATK×1.2)', icon:'🦅' },
    summon_earth_bear:  { name:'대지 곰',      tier:1, element:'earth',  recipe:['stone_earth','stone_earth','stone_earth'],   baseAtk:12, baseDef:15, baseHp:500,  skill:'quake',      skillDesc:'지진 (범위 ATK×0.8)', icon:'🐻' },

    // Tier 2: 혼합 소환수 (다른 속성 조합)
    summon_storm_drake: { name:'폭풍 드레이크', tier:2, element:'wind',   recipe:['stone_fire','stone_wind','stone_wind'],     baseAtk:25, baseDef:10, baseHp:350,  skill:'lightning',  skillDesc:'번개 (ATK×2, 30% 마비)', icon:'⚡' },
    summon_lava_titan:  { name:'용암 타이탄',   tier:2, element:'fire',   recipe:['stone_fire','stone_fire','stone_earth'],    baseAtk:18, baseDef:22, baseHp:600,  skill:'eruption',   skillDesc:'분화 (범위 ATK×1.5)', icon:'🌋' },
    summon_frost_fairy: { name:'서리 요정',     tier:2, element:'water',  recipe:['stone_water','stone_light','stone_wind'],    baseAtk:12, baseDef:8,  baseHp:250,  skill:'heal',       skillDesc:'힐 (소유자 HP 20% 회복)', icon:'❄️' },
    summon_shadow_wolf: { name:'그림자 늑대',   tier:2, element:'dark',   recipe:['stone_dark','stone_dark','stone_earth'],     baseAtk:30, baseDef:6,  baseHp:280,  skill:'ambush',     skillDesc:'기습 (ATK×3, 크리 100%)', icon:'🐺' },

    // Tier 3: 희귀 소환수 (희귀 소환석 포함)
    summon_void_serpent:{ name:'공허의 뱀',     tier:3, element:'void',   recipe:['stone_void','stone_dark','stone_dark'],     baseAtk:35, baseDef:12, baseHp:450,  skill:'devour',     skillDesc:'포식 (피해량의 50% HP 흡수)', icon:'🐍' },
    summon_holy_angel:  { name:'성스러운 천사',  tier:3, element:'light',  recipe:['stone_light','stone_light','stone_primal'], baseAtk:22, baseDef:20, baseHp:500,  skill:'divine',     skillDesc:'신성 (범위 힐 + ATK×1.5)', icon:'👼' },
    summon_primal_dragon:{ name:'태초의 용',    tier:3, element:'primal', recipe:['stone_primal','stone_void','stone_fire'],   baseAtk:50, baseDef:25, baseHp:800,  skill:'breath',     skillDesc:'브레스 (범위 ATK×2.5)', icon:'🐲' },
};

// ── 소환 보스 (소환수 3마리 합체) ──
const SUMMON_BOSSES = {
    boss_inferno:     { name:'인페르노',       tier:'boss',   reqTier:1, reqCount:3, reqElement:'fire',    hp:15000, atk:120, def:40,  reward:{gold:10000,exp:8000,diamonds:50},  special:'화염 폭발: 5초마다 주변 3칸 화염 데미지' },
    boss_leviathan:   { name:'레비아탄',       tier:'boss',   reqTier:1, reqCount:3, reqElement:'water',   hp:20000, atk:90,  def:60,  reward:{gold:12000,exp:10000,diamonds:60}, special:'빙결 파도: 8초마다 전체 둔화 2초' },
    boss_tempest:     { name:'템페스트',       tier:'boss',   reqTier:2, reqCount:3, reqElement:'any',     hp:30000, atk:150, def:50,  reward:{gold:20000,exp:15000,diamonds:100},special:'난기류: 플레이어 위치 랜덤 셔플' },
    boss_apocalypse:  { name:'아포칼립스',     tier:'legend', reqTier:3, reqCount:3, reqElement:'any',     hp:80000, atk:250, def:80,  reward:{gold:50000,exp:40000,diamonds:300,item:'equip_mythic_weapon'}, special:'종말의 심판: HP 50% 이하 시 ATK 2배' },
};

// ── 소환수 진화 (같은 소환수 2마리 합성) ──
const EVOLUTION_BONUS = { atk: 1.5, def: 1.5, hp: 1.5, skillMulti: 1.3 };
const MAX_EVOLUTION = 3; // 최대 3성 (★★★)

// ── 플레이어 소환수 관리 ──
function _ensure(player) {
    if (!player._summons) {
        player._summons = {
            stones: {},       // { stoneId: count }
            creatures: [],    // [{ id, summonId, evolution, nickname }]
            active: [],       // 전투 참여 소환수 id (최대 3)
            bossKills: 0,
        };
    }
    return player._summons;
}

// 소환석 획득
function addStone(player, stoneId) {
    const s = _ensure(player);
    if (!SUMMON_STONES[stoneId]) return { success: false, msg: '알 수 없는 소환석' };
    s.stones[stoneId] = (s.stones[stoneId] || 0) + 1;
    return { success: true, stone: SUMMON_STONES[stoneId], count: s.stones[stoneId] };
}

// 소환수 합성 (소환석 3개 → 소환수 1마리)
function synthesize(player, summonId) {
    const s = _ensure(player);
    const summon = SUMMONS[summonId];
    if (!summon) return { success: false, msg: '알 수 없는 소환수' };
    if (s.creatures.length >= 20) return { success: false, msg: '소환수 보관함 가득 (20마리)' };

    // 재료 확인
    const needed = {};
    for (const stone of summon.recipe) {
        needed[stone] = (needed[stone] || 0) + 1;
    }
    for (const [stoneId, qty] of Object.entries(needed)) {
        if ((s.stones[stoneId] || 0) < qty) {
            return { success: false, msg: `${SUMMON_STONES[stoneId]?.name || stoneId} ${qty}개 필요 (보유: ${s.stones[stoneId] || 0})` };
        }
    }

    // 재료 차감
    for (const [stoneId, qty] of Object.entries(needed)) {
        s.stones[stoneId] -= qty;
        if (s.stones[stoneId] <= 0) delete s.stones[stoneId];
    }

    // 소환수 생성
    const creature = {
        id: 'sc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        summonId,
        evolution: 0,
        nickname: summon.name,
        stats: { atk: summon.baseAtk, def: summon.baseDef, hp: summon.baseHp },
    };
    s.creatures.push(creature);

    return { success: true, creature, msg: `${summon.name} 소환 성공!` };
}

// 소환수 진화 (같은 종류 2마리 → 1마리 진화)
function evolve(player, creatureId1, creatureId2) {
    const s = _ensure(player);
    const idx1 = s.creatures.findIndex(c => c.id === creatureId1);
    const idx2 = s.creatures.findIndex(c => c.id === creatureId2);
    if (idx1 === -1 || idx2 === -1) return { success: false, msg: '소환수를 찾을 수 없음' };
    const c1 = s.creatures[idx1];
    const c2 = s.creatures[idx2];
    if (c1.summonId !== c2.summonId) return { success: false, msg: '같은 종류만 진화 가능' };
    if (c1.evolution >= MAX_EVOLUTION) return { success: false, msg: `최대 진화 (${MAX_EVOLUTION}★)` };

    // 진화 적용 (c1 강화, c2 제거)
    c1.evolution++;
    c1.stats.atk = Math.floor(c1.stats.atk * EVOLUTION_BONUS.atk);
    c1.stats.def = Math.floor(c1.stats.def * EVOLUTION_BONUS.def);
    c1.stats.hp = Math.floor(c1.stats.hp * EVOLUTION_BONUS.hp);
    c1.nickname = SUMMONS[c1.summonId].name + ' ★'.repeat(c1.evolution);

    // c2 제거
    s.creatures.splice(idx2 > idx1 ? idx2 : idx1, 1);
    // active에서 c2 제거
    s.active = s.active.filter(id => id !== creatureId2);

    return { success: true, evolved: c1, msg: `${c1.nickname} 진화 완료! (${c1.evolution}★)` };
}

// 전투 참여 소환수 설정 (최대 3마리)
function setActive(player, creatureIds) {
    const s = _ensure(player);
    const valid = creatureIds.filter(id => s.creatures.some(c => c.id === id)).slice(0, 3);
    s.active = valid;
    return { success: true, active: valid };
}

// 보스 소환 시도
function summonBoss(player, bossId) {
    const s = _ensure(player);
    const boss = SUMMON_BOSSES[bossId];
    if (!boss) return { success: false, msg: '알 수 없는 보스' };

    // 요구 소환수 확인 (active 중에서)
    const activeCreatures = s.active.map(id => s.creatures.find(c => c.id === id)).filter(Boolean);
    if (activeCreatures.length < boss.reqCount) {
        return { success: false, msg: `소환수 ${boss.reqCount}마리 필요 (현재 ${activeCreatures.length})` };
    }

    // 티어 확인
    const meetsTier = activeCreatures.every(c => {
        const summon = SUMMONS[c.summonId];
        return summon && summon.tier >= boss.reqTier;
    });
    if (!meetsTier) return { success: false, msg: `Tier ${boss.reqTier} 이상 소환수 필요` };

    // 속성 확인
    if (boss.reqElement !== 'any') {
        const meetsElement = activeCreatures.every(c => {
            const summon = SUMMONS[c.summonId];
            return summon && summon.element === boss.reqElement;
        });
        if (!meetsElement) return { success: false, msg: `${boss.reqElement} 속성 소환수만 가능` };
    }

    // 소환수 소모 (보스 소환 시 사용된 소환수 제거)
    for (const ac of activeCreatures.slice(0, boss.reqCount)) {
        const idx = s.creatures.findIndex(c => c.id === ac.id);
        if (idx !== -1) s.creatures.splice(idx, 1);
    }
    s.active = [];

    return {
        success: true,
        boss: {
            id: bossId,
            name: boss.name,
            hp: boss.hp,
            maxHp: boss.hp,
            atk: boss.atk,
            def: boss.def,
            reward: boss.reward,
            special: boss.special,
        },
        msg: `${boss.name} 소환! 전투 시작!`,
    };
}

// 보스 처치 보상
function claimBossReward(player, bossId) {
    const boss = SUMMON_BOSSES[bossId];
    if (!boss) return { success: false, msg: '알 수 없는 보스' };
    const s = _ensure(player);
    s.bossKills++;
    const r = boss.reward;
    if (r.gold) player.gold = Math.min(999999999, (player.gold || 0) + r.gold);
    if (r.exp) player.exp = (player.exp || 0) + r.exp;
    if (r.diamonds) player.diamonds = Math.min(9999999, (player.diamonds || 0) + r.diamonds);
    if (r.item) {
        if (!player.inventory) player.inventory = {};
        player.inventory[r.item] = (player.inventory[r.item] || 0) + 1;
    }
    return { success: true, reward: r, bossKills: s.bossKills };
}

// 소환수 현황
function getStatus(player) {
    const s = _ensure(player);
    return {
        stones: { ...s.stones },
        creatures: s.creatures.map(c => ({
            ...c,
            info: SUMMONS[c.summonId],
        })),
        active: s.active,
        bossKills: s.bossKills,
        availableSummons: Object.entries(SUMMONS).map(([id, sm]) => ({
            id, ...sm,
            canSynth: sm.recipe.every(stoneId => (s.stones[stoneId] || 0) >= sm.recipe.filter(r => r === stoneId).length),
        })),
        availableBosses: Object.entries(SUMMON_BOSSES).map(([id, b]) => ({ id, ...b })),
    };
}

module.exports = {
    SUMMON_STONES, SUMMONS, SUMMON_BOSSES,
    addStone, synthesize, evolve, setActive, summonBoss, claimBossReward, getStatus,
};

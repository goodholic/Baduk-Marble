// ==========================================
// 영혼 대장간 — v2.44
// 몬스터 영혼 수집 + 무기 각인 + 몬스터 스킬 사용 + 키메라 무기
// ==========================================

// ── 몬스터 영혼 ──
const MONSTER_SOULS = {
    // ─── 일반 (Tier 1) ───
    soul_goblin:    { name: '고블린 영혼',     icon: '👺',   tier: 1, skill: { name: '약탈', effect: { goldSteal: 50 }, cd: 30 }, desc: '공격 시 골드 +50' },
    soul_wolf:      { name: '늑대 영혼',       icon: '🐺',   tier: 1, skill: { name: '질주', effect: { speedBuff: 0.3, duration: 5 }, cd: 20 }, desc: '5초간 이동속도 +30%' },
    soul_skeleton:  { name: '해골 영혼',       icon: '💀',   tier: 1, skill: { name: '뼈 투척', effect: { dmg: 1.5, stun: 1 }, cd: 15 }, desc: 'ATK x1.5 + 1초 기절' },
    soul_slime:     { name: '슬라임 영혼',     icon: '🟢',   tier: 1, skill: { name: '분열', effect: { clone: 1, duration: 10 }, cd: 45 }, desc: '10초간 분신 1체 소환' },
    soul_bat:       { name: '박쥐 영혼',       icon: '🦇',   tier: 1, skill: { name: '흡혈 송곳니', effect: { lifesteal: 0.2, duration: 10 }, cd: 25 }, desc: '10초간 흡혈 +20%' },

    // ─── 중급 (Tier 2) ───
    soul_ogre:      { name: '오우거 영혼',     icon: '👹',   tier: 2, skill: { name: '분쇄', effect: { dmg: 2.5, armorBreak: 0.2 }, cd: 20 }, desc: 'ATK x2.5 + 방어 20% 무시' },
    soul_harpy:     { name: '하피 영혼',       icon: '🦅',   tier: 2, skill: { name: '폭풍 날개', effect: { aoe: true, dmg: 1.5, knockback: 3 }, cd: 25 }, desc: '범위 공격 + 밀치기' },
    soul_golem:     { name: '골렘 영혼',       icon: '🗿',   tier: 2, skill: { name: '암석 갑옷', effect: { defBuff: 50, duration: 15 }, cd: 30 }, desc: '15초간 DEF +50' },
    soul_wraith:    { name: '망령 영혼',       icon: '👻',   tier: 2, skill: { name: '공포', effect: { fear: true, atkReduce: 0.3, duration: 8 }, cd: 35 }, desc: '적 ATK -30% 8초' },
    soul_treant:    { name: '나무 정령 영혼',   icon: '🌳',   tier: 2, skill: { name: '자연의 치유', effect: { heal: 0.2, hpRegen: 5, duration: 15 }, cd: 40 }, desc: 'HP 20% 회복 + 15초 재생' },

    // ─── 상급 (Tier 3) ───
    soul_dragon:    { name: '용 영혼',         icon: '🐉',   tier: 3, skill: { name: '드래곤 브레스', effect: { aoe: true, dmg: 4.0, burn: 10 }, cd: 45 }, desc: '범위 ATK x4 + 화상' },
    soul_demon:     { name: '악마 영혼',       icon: '😈',   tier: 3, skill: { name: '악마의 계약', effect: { allBuff: 0.3, selfDmg: 0.1, duration: 20 }, cd: 60 }, desc: 'ALL +30% / HP -10% (20초)' },
    soul_phoenix:   { name: '불사조 영혼',     icon: '🔥🐦', tier: 3, skill: { name: '불사의 불꽃', effect: { revive: true, fireAura: 15 }, cd: 120 }, desc: '사망 시 부활 (1회)' },
    soul_leviathan: { name: '리바이어선 영혼', icon: '🐋',   tier: 3, skill: { name: '심해의 분노', effect: { aoe: true, dmg: 5.0, slow: 0.5 }, cd: 50 }, desc: '범위 ATK x5 + 50% 둔화' },
    soul_lich:      { name: '리치 영혼',       icon: '💀👑', tier: 3, skill: { name: '죽음의 손길', effect: { dmg: 3.0, mpDrain: 50, curse: true }, cd: 40 }, desc: 'ATK x3 + MP 흡수 + 저주' },

    // ─── 전설 (Tier 4) ───
    soul_ancient:   { name: '고대용 영혼',     icon: '🐲✨', tier: 4, skill: { name: '시간의 포효', effect: { timeStop: 3, dmg: 8.0 }, cd: 90 }, desc: '3초 시간 정지 + ATK x8' },
    soul_titan:     { name: '타이탄 영혼',     icon: '🗿⚡', tier: 4, skill: { name: '천지개벽', effect: { aoe: true, dmg: 10.0, terrainDestroy: true }, cd: 120 }, desc: '범위 ATK x10, 지형 파괴' },
    soul_void:      { name: '공허 군주 영혼',   icon: '🕳️👑', tier: 4, skill: { name: '차원 붕괴', effect: { hpCut: 0.3, defIgnore: true }, cd: 100 }, desc: '적 HP 30% 삭감 (방어 무시)' },
};

// ── 키메라 합성 (영혼 2개 → 합성 영혼) ──
const CHIMERA_RECIPES = {
    chimera_flame_wolf:     { name: '화염 늑대',       icon: '🐺🔥', souls: ['soul_wolf', 'soul_dragon'],     tier: 'chimera', skill: { name: '화염 질주', effect: { charge: true, dmg: 6.0, burn: 15, speed: 0.5 }, cd: 50 }, desc: '불타는 돌진! ATK x6 + 화상 + 가속' },
    chimera_death_golem:    { name: '죽음의 골렘',     icon: '🗿💀', souls: ['soul_golem', 'soul_lich'],       tier: 'chimera', skill: { name: '죽음의 요새', effect: { defBuff: 100, deathAura: 20, duration: 20 }, cd: 60 }, desc: 'DEF +100 + 주변 죽음 오라' },
    chimera_storm_phoenix:  { name: '폭풍 불사조',     icon: '🔥⚡', souls: ['soul_phoenix', 'soul_harpy'],    tier: 'chimera', skill: { name: '폭풍 부활', effect: { revive: true, aoe: true, dmg: 7.0, thunderBurn: true }, cd: 120 }, desc: '부활 시 범위 ATK x7 + 감전+화상' },
    chimera_void_demon:     { name: '공허 악마',       icon: '🕳️😈', souls: ['soul_void', 'soul_demon'],       tier: 'chimera', skill: { name: '차원 계약', effect: { hpCut: 0.2, allBuff: 0.5, selfDmg: 0.2, duration: 15 }, cd: 90 }, desc: '적 HP 20% 삭감 + ALL +50% / 자해 20%' },
    chimera_ancient_treant: { name: '고대 세계수',     icon: '🌳🐲', souls: ['soul_treant', 'soul_ancient'],   tier: 'chimera', skill: { name: '생명의 시간', effect: { fullHeal: true, timeStop: 2, teamHeal: 0.5 }, cd: 150 }, desc: 'HP 완전 회복 + 2초 시간정지 + 아군 50% 힐' },
    chimera_titan_leviathan:{ name: '심해 거신',       icon: '🗿🐋', souls: ['soul_titan', 'soul_leviathan'],  tier: 'chimera', skill: { name: '해저 지진', effect: { aoe: true, dmg: 15.0, tsunami: true, slow: 0.7 }, cd: 130 }, desc: '범위 ATK x15 + 쓰나미 + 70% 둔화' },
};

// ── 각인 슬롯 ──
const MAX_INSCRIPTIONS = 3;

function _ensure(player) {
    if (!player._spiritForge) {
        player._spiritForge = {
            souls: {},              // { soulId: count }
            inscriptions: [],       // [{ soulId, inscribedAt }]  최대 3개
            chimeras: {},           // { chimeraId: true }
            forgeLevel: 1,
            forgeExp: 0,
            totalForged: 0,
            totalSoulsCollected: 0,
            soulDust: 0,            // 분해로 얻는 영혼 가루
        };
    }
    return player._spiritForge;
}

const FORGE_LEVEL_EXP = [0, 300, 800, 2000, 5000, 10000, 18000, 30000, 50000, 80000];
const FORGE_MAX_LEVEL = 9;

// 영혼 수집 (몬스터 처치 후 호출)
function collectSoul(player, monsterTier) {
    const state = _ensure(player);
    // 드롭 확률: tier1=20%, tier2=10%, tier3=5%, tier4=1%
    const dropChances = { 1: 0.20, 2: 0.10, 3: 0.05, 4: 0.01 };

    const eligible = Object.entries(MONSTER_SOULS).filter(([, s]) => s.tier <= Math.min(4, monsterTier + 1));
    if (eligible.length === 0) return null;

    // 가장 높은 티어부터 드롭 시도
    for (let t = Math.min(4, monsterTier + 1); t >= 1; t--) {
        if (Math.random() < (dropChances[t] || 0)) {
            const tierSouls = eligible.filter(([, s]) => s.tier === t);
            if (tierSouls.length === 0) continue;
            const [soulId, soul] = tierSouls[Math.floor(Math.random() * tierSouls.length)];
            state.souls[soulId] = (state.souls[soulId] || 0) + 1;
            state.totalSoulsCollected++;
            return { soulId, soul };
        }
    }
    return null;
}

// 영혼 각인
function inscribeSoul(player, soulId) {
    const state = _ensure(player);
    const soul = MONSTER_SOULS[soulId] || CHIMERA_RECIPES[soulId.replace('soul_chimera_', 'chimera_')];
    if (!soul) return { success: false, msg: '알 수 없는 영혼' };

    // 일반 영혼 체크
    const isChimera = !!CHIMERA_RECIPES[soulId];
    if (!isChimera && (!state.souls[soulId] || state.souls[soulId] <= 0)) {
        return { success: false, msg: '해당 영혼을 보유하고 있지 않습니다.' };
    }
    if (isChimera && !state.chimeras[soulId]) {
        return { success: false, msg: '해당 키메라 영혼이 없습니다.' };
    }

    const maxSlots = Math.min(MAX_INSCRIPTIONS, 1 + Math.floor(state.forgeLevel / 3));
    if (state.inscriptions.length >= maxSlots) {
        return { success: false, msg: `각인 슬롯 부족 (${state.inscriptions.length}/${maxSlots}). 기존 각인을 제거하세요.` };
    }

    // 중복 체크
    if (state.inscriptions.some(i => i.soulId === soulId)) {
        return { success: false, msg: '이미 같은 영혼이 각인되어 있습니다.' };
    }

    if (!isChimera) {
        state.souls[soulId]--;
        if (state.souls[soulId] <= 0) delete state.souls[soulId];
    }

    state.inscriptions.push({ soulId, inscribedAt: Date.now() });
    state.totalForged++;
    state.forgeExp += (soul.tier || 3) * 50;

    // 레벨업 체크
    let leveledUp = false;
    while (state.forgeLevel < FORGE_MAX_LEVEL && state.forgeExp >= FORGE_LEVEL_EXP[state.forgeLevel + 1]) {
        state.forgeLevel++;
        leveledUp = true;
    }

    return {
        success: true, soul, leveledUp,
        slots: `${state.inscriptions.length}/${maxSlots}`,
        msg: `${soul.icon} ${soul.name} 각인 완료! 스킬: ${soul.skill.name} — ${soul.desc}${leveledUp ? ` | 대장간 Lv.${state.forgeLevel} 승급!` : ''}`,
    };
}

// 각인 제거
function removeInscription(player, slotIdx) {
    const state = _ensure(player);
    if (slotIdx < 0 || slotIdx >= state.inscriptions.length) {
        return { success: false, msg: '잘못된 슬롯 번호' };
    }

    const removed = state.inscriptions.splice(slotIdx, 1)[0];
    const soul = MONSTER_SOULS[removed.soulId] || CHIMERA_RECIPES[removed.soulId];

    // 영혼 가루로 변환
    const dustAmount = (soul?.tier || 1) * 10;
    state.soulDust += dustAmount;

    return {
        success: true,
        msg: `${soul?.icon || '👻'} ${soul?.name || '영혼'} 각인 해제! +${dustAmount} 영혼 가루`,
    };
}

// 영혼 스킬 사용
function useSoulSkill(player, slotIdx) {
    const state = _ensure(player);
    if (slotIdx < 0 || slotIdx >= state.inscriptions.length) {
        return { success: false, msg: '잘못된 슬롯 번호' };
    }

    const inscription = state.inscriptions[slotIdx];
    const soul = MONSTER_SOULS[inscription.soulId] || CHIMERA_RECIPES[inscription.soulId];
    if (!soul) return { success: false, msg: '영혼 정보 오류' };

    // 쿨다운 체크
    const cd = soul.skill.cd * 1000;
    if (inscription._lastUsed && Date.now() - inscription._lastUsed < cd) {
        const remain = Math.ceil((cd - (Date.now() - inscription._lastUsed)) / 1000);
        return { success: false, msg: `${soul.skill.name} 대기: ${remain}초` };
    }

    inscription._lastUsed = Date.now();

    // 스킬 효과 계산
    const effect = soul.skill.effect;
    let resultMsg = `${soul.icon} ${soul.skill.name} 발동!`;
    const results = {};

    if (effect.dmg) {
        const damage = Math.floor((player.atk || 10) * effect.dmg);
        results.damage = damage;
        resultMsg += ` ${damage} 데미지!`;
    }
    if (effect.heal) {
        const heal = Math.floor((player.maxHp || 100) * effect.heal);
        player.hp = Math.min(player.maxHp || 100, (player.hp || 100) + heal);
        results.heal = heal;
        resultMsg += ` HP +${heal}!`;
    }
    if (effect.fullHeal) {
        player.hp = player.maxHp || 100;
        resultMsg += ' HP 완전 회복!';
    }
    if (effect.defBuff) {
        results.defBuff = effect.defBuff;
        results.duration = effect.duration;
        resultMsg += ` DEF +${effect.defBuff} (${effect.duration}초)!`;
    }
    if (effect.allBuff) {
        results.allBuff = effect.allBuff;
        results.duration = effect.duration;
        resultMsg += ` ALL +${Math.floor(effect.allBuff * 100)}% (${effect.duration}초)!`;
    }
    if (effect.lifesteal) {
        results.lifesteal = effect.lifesteal;
        resultMsg += ` 흡혈 +${Math.floor(effect.lifesteal * 100)}%!`;
    }
    if (effect.goldSteal) {
        player.gold = Math.min((player.gold || 0) + effect.goldSteal, 999999999);
        resultMsg += ` +${effect.goldSteal}G!`;
    }
    if (effect.revive) {
        results.revive = true;
        resultMsg += ' 부활 효과 부여!';
    }
    if (effect.hpCut) {
        results.hpCut = effect.hpCut;
        resultMsg += ` 적 HP ${Math.floor(effect.hpCut * 100)}% 삭감!`;
    }
    if (effect.timeStop) {
        results.timeStop = effect.timeStop;
        resultMsg += ` ${effect.timeStop}초 시간 정지!`;
    }

    return {
        success: true, soul, skill: soul.skill, results,
        msg: resultMsg,
    };
}

// 키메라 합성
function forgeChimera(player, chimeraId) {
    const state = _ensure(player);
    const recipe = CHIMERA_RECIPES[chimeraId];
    if (!recipe) return { success: false, msg: '알 수 없는 키메라 레시피' };
    if (state.chimeras[chimeraId]) return { success: false, msg: '이미 합성한 키메라입니다.' };
    if (state.forgeLevel < 5) return { success: false, msg: '대장간 Lv.5 이상 필요' };

    // 재료 체크
    for (const soulId of recipe.souls) {
        if (!state.souls[soulId] || state.souls[soulId] <= 0) {
            const soul = MONSTER_SOULS[soulId];
            return { success: false, msg: `재료 부족: ${soul?.icon || ''} ${soul?.name || soulId}` };
        }
    }

    // 영혼 가루 비용
    const dustCost = 100;
    if (state.soulDust < dustCost) return { success: false, msg: `영혼 가루 부족 (${state.soulDust}/${dustCost})` };

    // 재료 소모
    for (const soulId of recipe.souls) {
        state.souls[soulId]--;
        if (state.souls[soulId] <= 0) delete state.souls[soulId];
    }
    state.soulDust -= dustCost;
    state.chimeras[chimeraId] = true;
    state.forgeExp += 500;

    let leveledUp = false;
    while (state.forgeLevel < FORGE_MAX_LEVEL && state.forgeExp >= FORGE_LEVEL_EXP[state.forgeLevel + 1]) {
        state.forgeLevel++;
        leveledUp = true;
    }

    return {
        success: true, chimera: recipe, leveledUp,
        msg: `${recipe.icon} 키메라 합성 성공! "${recipe.name}" — ${recipe.desc}`,
    };
}

// 영혼 분해 (가루로)
function dissolveSoul(player, soulId, count) {
    const state = _ensure(player);
    const soul = MONSTER_SOULS[soulId];
    if (!soul) return { success: false, msg: '알 수 없는 영혼' };
    const n = Math.min(count || 1, state.souls[soulId] || 0);
    if (n <= 0) return { success: false, msg: '영혼 부족' };

    state.souls[soulId] -= n;
    if (state.souls[soulId] <= 0) delete state.souls[soulId];
    const dust = soul.tier * 10 * n;
    state.soulDust += dust;

    return {
        success: true,
        msg: `${soul.icon} ${soul.name} x${n} 분해! +${dust} 영혼 가루 (보유: ${state.soulDust})`,
    };
}

// 상태 조회
function getStatus(player) {
    const state = _ensure(player);
    const maxSlots = Math.min(MAX_INSCRIPTIONS, 1 + Math.floor(state.forgeLevel / 3));
    return {
        forgeLevel: state.forgeLevel,
        forgeExp: state.forgeExp,
        nextLevelExp: state.forgeLevel < FORGE_MAX_LEVEL ? FORGE_LEVEL_EXP[state.forgeLevel + 1] : null,
        soulDust: state.soulDust,
        totalForged: state.totalForged,
        totalSoulsCollected: state.totalSoulsCollected,
        souls: Object.entries(state.souls).map(([id, count]) => ({ id, count, ...MONSTER_SOULS[id] })),
        inscriptions: state.inscriptions.map((ins, idx) => {
            const soul = MONSTER_SOULS[ins.soulId] || CHIMERA_RECIPES[ins.soulId];
            const cd = soul ? soul.skill.cd * 1000 : 0;
            const cooldownRemain = ins._lastUsed ? Math.max(0, Math.ceil((cd - (Date.now() - ins._lastUsed)) / 1000)) : 0;
            return { slot: idx, soulId: ins.soulId, soul, cooldownRemain };
        }),
        maxSlots,
        chimeras: Object.entries(CHIMERA_RECIPES).map(([id, r]) => ({
            id, ...r,
            forged: !!state.chimeras[id],
            available: !state.chimeras[id] && r.souls.every(s => (state.souls[s] || 0) > 0) && state.soulDust >= 100 && state.forgeLevel >= 5,
            materials: r.souls.map(s => ({ id: s, name: MONSTER_SOULS[s]?.name, have: state.souls[s] || 0 })),
        })),
        soulCatalog: MONSTER_SOULS,
    };
}

module.exports = {
    MONSTER_SOULS, CHIMERA_RECIPES,
    collectSoul, inscribeSoul, removeInscription, useSoulSkill,
    forgeChimera, dissolveSoul, getStatus,
};

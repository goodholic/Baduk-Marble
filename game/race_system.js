// ==========================================
// 종족 시스템 — v2.24
// 인간/엘프/드워프/악마 4종족
// 종족별 고유 패시브 + 액티브 스킬 + 외형 + 성장 보너스
// ==========================================

const RACES = {
    human: {
        name: '인간', icon: '🧑', color: '#ddd',
        desc: '균형 잡힌 만능형. 적응력이 뛰어나다.',
        lore: '다양한 환경에서 번성한 종족. 모든 직업에 적합하며, 빠른 성장이 특징이다.',
        passives: {
            expBonus: 0.15,       // EXP +15%
            adaptability: true,   // 모든 장비 착용 가능
        },
        growthBonus: { hpPerLevel: 2, atkPerLevel: 0.5, defPerLevel: 0.5 },
        activeSkill: {
            name: '인간의 의지', desc: '10초간 전 스탯 +20%',
            cooldown: 120, duration: 10000,
            effect: { type: 'allStatBuff', value: 0.2 },
            icon: '💪',
        },
        unlockLevel: 1,
    },
    elf: {
        name: '엘프', icon: '🧝', color: '#88ff88',
        desc: '민첩하고 마법에 뛰어난 숲의 종족.',
        lore: '고대 숲에서 태어난 장수 종족. 활과 마법에 능하며, 자연과 교감한다.',
        passives: {
            critBonus: 0.08,      // Crit +8%
            dodgeBonus: 0.05,     // Dodge +5%
            mpRegen: 0.02,        // MP 리젠 +2%/초
        },
        growthBonus: { hpPerLevel: 1, atkPerLevel: 0.3, defPerLevel: 0.3, spdPerLevel: 0.2 },
        activeSkill: {
            name: '자연의 축복', desc: '15초간 HP 리젠 + 독/화상 면역',
            cooldown: 90, duration: 15000,
            effect: { type: 'regenImmune', hpRegen: 0.05, immuneDebuffs: ['poison', 'burn'] },
            icon: '🌿',
        },
        unlockLevel: 1,
    },
    dwarf: {
        name: '드워프', icon: '⛏️', color: '#ffaa44',
        desc: '강인한 체력과 제작 능력의 산악 종족.',
        lore: '깊은 산 속 용광로에서 태어난 종족. 금속과 보석을 다루는 데 타의 추종을 불허한다.',
        passives: {
            defBonus: 10,         // DEF +10 고정
            hpBonus: 100,         // HP +100 고정
            craftBonus: 0.15,     // 제작 성공률 +15%
            enchantBonus: 0.10,   // 강화 성공률 +10%
        },
        growthBonus: { hpPerLevel: 4, atkPerLevel: 0.3, defPerLevel: 1.0 },
        activeSkill: {
            name: '대지의 방패', desc: '8초간 받는 피해 50% 감소 + 넉백 면역',
            cooldown: 100, duration: 8000,
            effect: { type: 'damageReduce', value: 0.5, knockbackImmune: true },
            icon: '🛡️',
        },
        unlockLevel: 1,
    },
    demon: {
        name: '악마', icon: '😈', color: '#ff4444',
        desc: '강력한 공격력의 어둠의 종족. 위험하지만 매력적.',
        lore: '심연에서 올라온 종족. 강대한 힘을 지녔으나, 그 힘에는 대가가 따른다.',
        passives: {
            atkBonus: 15,         // ATK +15 고정
            lifesteal: 0.05,      // 피해량의 5% HP 흡수
            karmaDecay: -0.5,     // 카르마 감소 속도 50% 감소
        },
        growthBonus: { hpPerLevel: 1.5, atkPerLevel: 1.0, defPerLevel: 0.2 },
        activeSkill: {
            name: '악마의 계약', desc: 'HP 20% 소모, 12초간 ATK 2배 + 흡혈 15%',
            cooldown: 150, duration: 12000,
            effect: { type: 'demonPact', hpCost: 0.2, atkMult: 2.0, lifesteal: 0.15 },
            icon: '🔥',
        },
        unlockLevel: 10, // Lv.10부터 선택 가능
    },
};

// ── 종족별 전용 칭호 ──
const RACE_TITLES = {
    human: [
        { name: '인류의 희망', req: { level: 30 }, bonus: { expBonus: 0.05 } },
        { name: '만능인', req: { level: 50, allClassAdvanced: true }, bonus: { allStats: 5 } },
    ],
    elf: [
        { name: '숲의 수호자', req: { level: 30 }, bonus: { dodge: 0.03 } },
        { name: '고대의 현자', req: { level: 50, mpTotal: 500 }, bonus: { mpRegen: 0.03 } },
    ],
    dwarf: [
        { name: '대장장이의 후예', req: { level: 30 }, bonus: { craftBonus: 0.1 } },
        { name: '산왕', req: { level: 50, enchantMax: 15 }, bonus: { def: 20 } },
    ],
    demon: [
        { name: '심연의 아이', req: { level: 30 }, bonus: { lifesteal: 0.03 } },
        { name: '마왕', req: { level: 50, pvpWins: 100 }, bonus: { atk: 25 } },
    ],
};

// ── 종족 호환성 보너스 (파티 시너지) ──
const PARTY_SYNERGY = {
    'human+elf': { name: '숲과 문명의 조화', bonus: { expBonus: 0.1 } },
    'human+dwarf': { name: '동맹의 힘', bonus: { def: 5, atk: 5 } },
    'elf+dwarf': { name: '고대의 약속', bonus: { craftBonus: 0.1, critBonus: 0.03 } },
    'demon+demon': { name: '어둠의 결속', bonus: { atkBonus: 10, lifesteal: 0.03 } },
    'all4': { name: '종족 대연합', bonus: { allStats: 8, expBonus: 0.15 } },
};

function _ensure(player) {
    if (!player._race) {
        player._race = {
            id: null,          // 선택한 종족
            selectedAt: null,
            raceTitles: [],    // 획득한 종족 칭호
            skillCooldown: 0,  // 종족 스킬 마지막 사용
            skillActive: false,
            skillExpiresAt: 0,
        };
    }
    return player._race;
}

// 종족 선택
function selectRace(player, raceId) {
    const state = _ensure(player);
    if (!RACES[raceId]) return { success: false, msg: '알 수 없는 종족' };
    if (state.id) return { success: false, msg: `이미 ${RACES[state.id].name} 종족입니다. 환생 시 변경 가능.` };
    if (player.level < RACES[raceId].unlockLevel) return { success: false, msg: `Lv.${RACES[raceId].unlockLevel} 필요` };

    state.id = raceId;
    state.selectedAt = Date.now();
    return { success: true, race: RACES[raceId], msg: `${RACES[raceId].icon} ${RACES[raceId].name} 종족 선택!` };
}

// 종족 변경 (환생 시)
function changeRace(player, newRaceId) {
    const state = _ensure(player);
    if (!RACES[newRaceId]) return { success: false, msg: '알 수 없는 종족' };
    state.id = newRaceId;
    state.selectedAt = Date.now();
    state.skillCooldown = 0;
    return { success: true, race: RACES[newRaceId] };
}

// 종족 패시브 스탯 계산 (recalcStats에서 호출)
function getRaceBonus(player) {
    const state = _ensure(player);
    if (!state.id) return {};
    const race = RACES[state.id];
    if (!race) return {};
    const bonus = { ...race.passives };
    // 레벨별 성장 보너스
    const lvl = player.level || 1;
    const gb = race.growthBonus;
    if (gb.hpPerLevel) bonus.bonusHp = (bonus.bonusHp || 0) + gb.hpPerLevel * lvl;
    if (gb.atkPerLevel) bonus.bonusAtk = (bonus.bonusAtk || 0) + Math.floor(gb.atkPerLevel * lvl);
    if (gb.defPerLevel) bonus.bonusDef = (bonus.bonusDef || 0) + Math.floor(gb.defPerLevel * lvl);
    if (gb.spdPerLevel) bonus.bonusSpd = (bonus.bonusSpd || 0) + gb.spdPerLevel * lvl;
    return bonus;
}

// 종족 액티브 스킬 사용
function useRaceSkill(player) {
    const state = _ensure(player);
    if (!state.id) return { success: false, msg: '종족을 선택하세요' };
    const race = RACES[state.id];
    const now = Date.now();
    if (now - state.skillCooldown < race.activeSkill.cooldown * 1000) {
        const remain = Math.ceil((race.activeSkill.cooldown * 1000 - (now - state.skillCooldown)) / 1000);
        return { success: false, msg: `쿨다운: ${remain}초` };
    }
    state.skillCooldown = now;
    state.skillActive = true;
    state.skillExpiresAt = now + race.activeSkill.duration;

    // 악마 계약: HP 소모
    if (race.activeSkill.effect.type === 'demonPact') {
        player.hp = Math.max(1, Math.floor(player.hp * (1 - race.activeSkill.effect.hpCost)));
    }

    return {
        success: true,
        skill: race.activeSkill,
        msg: `${race.activeSkill.icon} ${race.activeSkill.name} 발동!`,
        expiresAt: state.skillExpiresAt,
    };
}

// 파티 시너지 계산
function getPartySynergy(partyRaces) {
    const unique = [...new Set(partyRaces.filter(Boolean))];
    const bonuses = [];
    if (unique.length >= 4) {
        bonuses.push({ ...PARTY_SYNERGY['all4'] });
    } else {
        for (let i = 0; i < unique.length; i++) {
            for (let j = i + 1; j < unique.length; j++) {
                const key1 = unique[i] + '+' + unique[j];
                const key2 = unique[j] + '+' + unique[i];
                if (PARTY_SYNERGY[key1]) bonuses.push({ ...PARTY_SYNERGY[key1] });
                else if (PARTY_SYNERGY[key2]) bonuses.push({ ...PARTY_SYNERGY[key2] });
            }
        }
    }
    if (unique.length === 1 && unique[0] === 'demon' && partyRaces.length >= 2) {
        bonuses.push({ ...PARTY_SYNERGY['demon+demon'] });
    }
    return bonuses;
}

// 상태 조회
function getStatus(player) {
    const state = _ensure(player);
    const race = state.id ? RACES[state.id] : null;
    return {
        currentRace: race ? { id: state.id, ...race } : null,
        available: Object.entries(RACES).map(([id, r]) => ({
            id, name: r.name, icon: r.icon, desc: r.desc, lore: r.lore,
            unlockLevel: r.unlockLevel, unlocked: player.level >= r.unlockLevel,
            passives: r.passives, activeSkill: r.activeSkill,
        })),
        raceTitles: state.raceTitles,
        skillCooldown: state.skillCooldown,
        skillActive: state.skillActive && Date.now() < state.skillExpiresAt,
    };
}

module.exports = {
    RACES, RACE_TITLES, PARTY_SYNERGY,
    selectRace, changeRace, getRaceBonus, useRaceSkill, getPartySynergy, getStatus,
};

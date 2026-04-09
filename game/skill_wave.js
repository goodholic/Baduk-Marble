// ==========================================
// 스킬 웨이브 시스템 — v2.26
// 스킬 3개 연속 시전 → 스킬 웨이브 발동
// 20종 조합 + 연쇄 효과 + 히든 조합
// ==========================================

// ── 기본 스킬 ID 매핑 ──
const SKILL_IDS = {
    // 워리어 계열
    powerStrike: { name: '파워 스트라이크', icon: '⚔️', element: 'physical', class: 'Warrior' },
    shieldBash: { name: '실드 배쉬', icon: '🛡️', element: 'physical', class: 'Knight' },
    // 메이지 계열
    fireball: { name: '파이어볼', icon: '🔥', element: 'fire', class: 'Mage' },
    meteor: { name: '메테오', icon: '☄️', element: 'fire', class: 'Mage' },
    // 어쌔신 계열
    shadowStrike: { name: '쉐도우 스트라이크', icon: '🗡️', element: 'dark', class: 'Assassin' },
    // 클레릭 계열
    holyLight: { name: '홀리 라이트', icon: '✨', element: 'light', class: 'Cleric' },
    // 종족 스킬
    humanWill: { name: '인간의 의지', icon: '💪', element: 'neutral', class: 'any' },
    natureBless: { name: '자연의 축복', icon: '🌿', element: 'nature', class: 'any' },
    earthShield: { name: '대지의 방패', icon: '🛡️', element: 'earth', class: 'any' },
    demonPact: { name: '악마의 계약', icon: '🔥', element: 'dark', class: 'any' },
    // 범용 스킬
    heal: { name: '힐', icon: '💚', element: 'light', class: 'any' },
    dodge: { name: '회피', icon: '💨', element: 'wind', class: 'any' },
    rage: { name: '분노', icon: '😡', element: 'physical', class: 'any' },
};

// ── 스킬 웨이브 조합 (3스킬 연속 시전) ──
const SKILL_WAVES = {
    // ═══ 공격 웨이브 ═══
    inferno_storm: {
        name: '인페르노 스톰', icon: '🔥🌪️',
        combo: ['fireball', 'meteor', 'fireball'],
        tier: 'epic',
        effect: { type: 'aoe_damage', radius: 8, dmgMult: 3.5, element: 'fire', burn: 5 },
        desc: '3연속 화염으로 불의 폭풍을 일으킨다',
        cooldown: 60,
    },
    shadow_assault: {
        name: '그림자 난무', icon: '🗡️💀',
        combo: ['shadowStrike', 'shadowStrike', 'shadowStrike'],
        tier: 'epic',
        effect: { type: 'multi_hit', hits: 7, dmgMult: 0.8, critBoost: 1.0, element: 'dark' },
        desc: '7연타 그림자 공격. 전부 크리티컬.',
        cooldown: 45,
    },
    holy_judgment: {
        name: '성스러운 심판', icon: '✨⚡',
        combo: ['holyLight', 'holyLight', 'powerStrike'],
        tier: 'epic',
        effect: { type: 'aoe_damage', radius: 10, dmgMult: 2.5, element: 'light', heal: 0.3 },
        desc: '성스러운 빛으로 적을 심판하고 아군을 치유한다',
        cooldown: 75,
    },
    berserker_rage: {
        name: '광전사의 분노', icon: '😡⚔️',
        combo: ['rage', 'powerStrike', 'powerStrike'],
        tier: 'rare',
        effect: { type: 'self_buff', duration: 15000, atkMult: 2.0, spdMult: 1.5, defMult: 0.5 },
        desc: '광기에 빠져 공격력 2배, 방어력 절반',
        cooldown: 90,
    },

    // ═══ 방어 웨이브 ═══
    iron_fortress: {
        name: '철벽 요새', icon: '🛡️🏰',
        combo: ['shieldBash', 'earthShield', 'shieldBash'],
        tier: 'epic',
        effect: { type: 'party_shield', duration: 10000, dmgReduce: 0.6, reflectDmg: 0.2 },
        desc: '파티 전원 피해 60% 감소 + 반사 20%',
        cooldown: 120,
    },
    divine_protection: {
        name: '신성한 보호막', icon: '✨🛡️',
        combo: ['holyLight', 'heal', 'earthShield'],
        tier: 'epic',
        effect: { type: 'party_shield', duration: 8000, dmgReduce: 0.4, healPerSec: 0.03 },
        desc: '8초간 파티 보호막 + 초당 3% HP 회복',
        cooldown: 100,
    },

    // ═══ 유틸 웨이브 ═══
    wind_sprint: {
        name: '질풍 질주', icon: '💨💨',
        combo: ['dodge', 'dodge', 'dodge'],
        tier: 'rare',
        effect: { type: 'self_buff', duration: 10000, spdMult: 3.0, dodgeBonus: 0.5, invulnerable: 2000 },
        desc: '10초간 이동속도 3배 + 회피 50% + 2초 무적',
        cooldown: 60,
    },
    nature_miracle: {
        name: '자연의 기적', icon: '🌿🌸',
        combo: ['natureBless', 'heal', 'natureBless'],
        tier: 'epic',
        effect: { type: 'party_heal', healPct: 0.5, cleanse: true, regenDuration: 20000, regenPct: 0.02 },
        desc: '파티 전원 HP 50% 회복 + 디버프 해제 + 20초 리젠',
        cooldown: 120,
    },

    // ═══ 연쇄 웨이브 (2개 연속 발동 시 추가 효과) ═══
    chaos_combo: {
        name: '혼돈의 연쇄', icon: '🔥🗡️',
        combo: ['fireball', 'shadowStrike', 'meteor'],
        tier: 'legendary',
        effect: { type: 'chain', chainCount: 5, dmgMult: 2.0, elements: ['fire','dark'], debuff: 'chaos', debuffDur: 8000 },
        desc: '화염과 암흑이 5번 연쇄 폭발. 8초 혼란 부여.',
        cooldown: 90,
    },
    elemental_convergence: {
        name: '원소 융합', icon: '🔥💧🌪️',
        combo: ['fireball', 'heal', 'dodge'],
        tier: 'legendary',
        effect: { type: 'aoe_damage', radius: 12, dmgMult: 4.0, elements: ['fire','water','wind'], debuff: 'elementalBreak', debuffDur: 10000 },
        desc: '3원소 융합 대폭발. 원소 저항 무시.',
        cooldown: 120,
    },

    // ═══ 히든 웨이브 ═══
    demon_emperor: {
        name: '마왕의 강림', icon: '👑😈',
        combo: ['demonPact', 'shadowStrike', 'rage'],
        tier: 'mythic', hidden: true,
        effect: { type: 'transform', duration: 20000, atkMult: 3.0, lifesteal: 0.25, aura: { dps: 20, radius: 5 }, cosmetic: '악마 변신' },
        desc: '20초간 마왕으로 변신. ATK 3배, 흡혈 25%, 주변 DPS 오라.',
        cooldown: 180,
    },
    god_slayer: {
        name: '신살자', icon: '⚔️🌟',
        combo: ['humanWill', 'powerStrike', 'meteor'],
        tier: 'mythic', hidden: true,
        effect: { type: 'single_target', dmgMult: 10.0, ignoreDefense: true, executeThreshold: 0.3 },
        desc: '방어력 무시 10배 데미지. HP 30% 이하 적 즉사.',
        cooldown: 300,
    },
};

// ── 플레이어 스킬 웨이브 상태 ──
function _ensure(player) {
    if (!player._skillWave) {
        player._skillWave = {
            recentSkills: [],     // 최근 시전 스킬 3개 기록
            cooldowns: {},        // { waveId: lastUsedAt }
            discovered: {},       // { waveId: discoveredAt }
            totalWaves: 0,
            comboStreak: 0,       // 연속 웨이브 성공 수
        };
    }
    return player._skillWave;
}

// 스킬 시전 기록 + 웨이브 체크
function recordSkill(player, skillId) {
    const state = _ensure(player);
    state.recentSkills.push(skillId);
    if (state.recentSkills.length > 3) state.recentSkills.shift();

    // 3개 모이면 웨이브 체크
    if (state.recentSkills.length < 3) return { triggered: false };

    const combo = state.recentSkills.slice();
    const now = Date.now();

    for (const [waveId, wave] of Object.entries(SKILL_WAVES)) {
        // 조합 매칭 (순서 중요)
        if (combo[0] === wave.combo[0] && combo[1] === wave.combo[1] && combo[2] === wave.combo[2]) {
            // 쿨다운 체크
            if (state.cooldowns[waveId] && now - state.cooldowns[waveId] < wave.cooldown * 1000) {
                const remain = Math.ceil((wave.cooldown * 1000 - (now - state.cooldowns[waveId])) / 1000);
                return { triggered: false, onCooldown: true, waveId, remain };
            }

            // 웨이브 발동!
            state.cooldowns[waveId] = now;
            state.totalWaves++;
            state.comboStreak++;
            state.recentSkills = []; // 리셋

            const isNewDiscovery = !state.discovered[waveId];
            state.discovered[waveId] = state.discovered[waveId] || now;

            return {
                triggered: true,
                wave: { id: waveId, ...wave },
                isNewDiscovery,
                isHidden: wave.hidden || false,
                comboStreak: state.comboStreak,
            };
        }
    }

    // 매칭 안 됨 — 연쇄 리셋
    if (state.comboStreak > 0) state.comboStreak = 0;
    return { triggered: false };
}

// 조합 도감
function getWaveBook(player) {
    const state = _ensure(player);
    return Object.entries(SKILL_WAVES).map(([id, w]) => {
        const discovered = !!state.discovered[id];
        if (w.hidden && !discovered) {
            return { id, name: '??? 히든 웨이브 ???', icon: '❓', tier: '???', discovered: false, hidden: true };
        }
        return {
            id, name: w.name, icon: w.icon, tier: w.tier,
            combo: discovered ? w.combo.map(s => SKILL_IDS[s]?.name || s) : ['???','???','???'],
            desc: discovered ? w.desc : '미발견',
            cooldown: w.cooldown,
            discovered, hidden: w.hidden || false,
        };
    });
}

// 상태
function getStatus(player) {
    const state = _ensure(player);
    return {
        recentSkills: state.recentSkills.map(s => SKILL_IDS[s] || { name: s }),
        totalWaves: state.totalWaves,
        comboStreak: state.comboStreak,
        discoveredCount: Object.keys(state.discovered).length,
        totalRecipes: Object.keys(SKILL_WAVES).length,
        waveBook: getWaveBook(player),
    };
}

module.exports = {
    SKILL_IDS, SKILL_WAVES,
    recordSkill, getWaveBook, getStatus,
};

// ==========================================
// 금지된 마법서 (Forbidden Grimoire) — v2.39
// 고위험 고보상 마법 시스템
// 마법서 수집 → 해독 → 시전 (대가 지불)
// ==========================================

// ── 금지된 마법서 목록 ──
const GRIMOIRES = {
    // ═══ Tier 1: 고대 마법서 (드롭률 높음, 대가 낮음) ═══
    blood_pact: {
        name: '피의 서약', icon: '📕🩸', tier: 1, element: 'dark',
        desc: '자신의 피를 바쳐 공격력을 폭증시킨다',
        effect: { type: 'selfBuff', atkMulti: 2.0, duration: 15 },
        cost: { hpPct: 0.30 },  // 현재 HP 30% 소모
        cooldown: 60,
        decipherCost: { gold: 5000, time: 300 },
        dropRate: 0.02,  // 2%
        lore: '고대 혈맹 의식에서 유래한 금단의 마법. 자신의 피가 곧 힘이 된다.',
    },
    soul_burn: {
        name: '영혼 연소', icon: '📕👻', tier: 1, element: 'fire',
        desc: '영혼을 불태워 주변 적에게 화염 폭발',
        effect: { type: 'aoe', dmgMulti: 5.0, radius: 5, burn: { dps: 20, duration: 5 } },
        cost: { hpPct: 0.20, expLoss: 500 },
        cooldown: 45,
        decipherCost: { gold: 5000, time: 300 },
        dropRate: 0.02,
        lore: '영혼의 일부를 태우는 대가로 적들을 업화에 집어삼킨다.',
    },
    frost_curse: {
        name: '서리의 저주', icon: '📘❄️', tier: 1, element: 'ice',
        desc: '주변 적을 극한의 냉기로 빙결시킨다',
        effect: { type: 'aoe', radius: 6, freeze: { duration: 4 }, dmgMulti: 3.0 },
        cost: { hpPct: 0.15, spdDebuff: { value: 0.5, duration: 10 } },
        cooldown: 50,
        decipherCost: { gold: 4000, time: 240 },
        dropRate: 0.025,
        lore: '북극 마녀의 저주. 시전자마저 느려지는 극한의 냉기.',
    },
    wind_sacrifice: {
        name: '바람의 제물', icon: '📗💨', tier: 1, element: 'wind',
        desc: '바람에 몸을 맡겨 극한의 속도를 얻는다',
        effect: { type: 'selfBuff', spdMulti: 3.0, dodgeBonus: 0.5, duration: 10 },
        cost: { defDebuff: { value: 0.6, duration: 15 } },  // DEF 60% 감소 15초
        cooldown: 55,
        decipherCost: { gold: 4000, time: 240 },
        dropRate: 0.025,
        lore: '방어를 완전히 포기하는 대신 바람 그 자체가 되는 금단의 술법.',
    },

    // ═══ Tier 2: 금단의 마법서 (중간 드롭률, 중간 대가) ═══
    life_drain_field: {
        name: '생명력 착취', icon: '📓🔮', tier: 2, element: 'dark',
        desc: '주변 모든 생명체의 HP를 흡수한다',
        effect: { type: 'aoe', radius: 6, hpStealPct: 0.15, selfHealMulti: 2.0 },
        cost: { hpPct: 0.25, curse: { name: '생명력 감쇠', defReduce: 0.3, duration: 20 } },
        cooldown: 90,
        decipherCost: { gold: 15000, time: 600, item: 'mat_soul' },
        dropRate: 0.008,
        lore: '금지된 네크로맨시. 주변의 생명을 빼앗지만 시전자도 약해진다.',
    },
    chaos_meteor: {
        name: '혼돈의 유성', icon: '📓☄️', tier: 2, element: 'fire',
        desc: '하늘에서 혼돈의 불덩이를 소환한다',
        effect: { type: 'aoe', dmgMulti: 12.0, radius: 8, burn: { dps: 30, duration: 6 }, stun: 2 },
        cost: { hpPct: 0.40, selfStun: 3 },
        cooldown: 120,
        decipherCost: { gold: 20000, time: 900, item: 'mat_dragon' },
        dropRate: 0.006,
        lore: '차원의 틈에서 끌어낸 혼돈 에너지. 시전자마저 충격에 기절한다.',
    },
    time_reversal: {
        name: '시간 역행', icon: '📓⏳', tier: 2, element: 'arcane',
        desc: '시간을 5초 되돌려 HP와 위치를 복원한다',
        effect: { type: 'timeRewind', rewindSec: 5, healPct: 0.5, removeDebuffs: true },
        cost: { hpPct: 0.10, goldCost: 5000 },
        cooldown: 180,
        decipherCost: { gold: 25000, time: 1200 },
        dropRate: 0.005,
        lore: '시간의 흐름을 거스르는 절대 금기. 막대한 마나와 금화가 소모된다.',
    },
    phantom_army: {
        name: '환영 군단', icon: '📓👥', tier: 2, element: 'arcane',
        desc: '자신의 분신 5체를 소환하여 전투에 투입',
        effect: { type: 'summon', count: 5, hpRatio: 0.3, atkRatio: 0.5, duration: 20 },
        cost: { hpPct: 0.35, mpCost: 200 },
        cooldown: 150,
        decipherCost: { gold: 18000, time: 900, item: 'mat_soul' },
        dropRate: 0.007,
        lore: '자신의 영혼을 분리해 분신을 만드는 금단의 술법.',
    },

    // ═══ Tier 3: 금기의 마법서 (매우 희귀, 대가 치명적) ═══
    apocalypse: {
        name: '종말의 서', icon: '📖💀', tier: 3, element: 'dark',
        desc: '주변 모든 적에게 현재 HP의 50%를 삭감한다',
        effect: { type: 'aoe', radius: 10, hpCutPct: 0.50, ignoreDefense: true },
        cost: { hpPct: 0.50, levelDown: 1, curse: { name: '죽음의 그림자', atkReduce: 0.3, defReduce: 0.3, duration: 30 } },
        cooldown: 300,
        decipherCost: { gold: 100000, time: 3600, item: 'mat_dragon', itemCount: 3 },
        dropRate: 0.001,
        lore: '세계를 멸망시킬 수 있다는 최악의 금서. 사용자의 영혼까지 갉아먹는다.',
    },
    wish_distortion: {
        name: '왜곡된 소원', icon: '📖🌟', tier: 3, element: 'arcane',
        desc: '무작위 극강 버프 3개를 얻지만 극강 디버프 1개도 동시에 걸린다',
        effect: { type: 'chaosWish', buffCount: 3, debuffCount: 1, duration: 30 },
        cost: { hpPct: 0.20, diamondCost: 50 },
        cooldown: 600,
        decipherCost: { gold: 80000, time: 2400, item: 'mat_soul', itemCount: 5 },
        dropRate: 0.002,
        lore: '소원을 들어주는 대신 반드시 대가를 요구하는 사악한 마법서.',
    },
    dimension_break: {
        name: '차원 붕괴', icon: '📖🕳️', tier: 3, element: 'void',
        desc: '차원을 찢어 적을 다른 차원으로 추방한다 (보스 제외)',
        effect: { type: 'banish', radius: 5, duration: 10, dmgMulti: 20.0, bossMulti: 5.0 },
        cost: { hpPct: 0.60, selfBanish: 3 },
        cooldown: 360,
        decipherCost: { gold: 120000, time: 3600, item: 'mat_dragon', itemCount: 5 },
        dropRate: 0.001,
        lore: '차원의 벽 자체를 무너뜨리는 최상위 금기. 시전자도 잠시 차원에 갇힌다.',
    },
    god_slayer: {
        name: '신살의 마법', icon: '📖⚔️', tier: 3, element: 'holy',
        desc: '신을 죽이기 위해 만들어진 최종 병기. 단일 대상 초월적 데미지',
        effect: { type: 'single', dmgMulti: 50.0, ignoreDefense: true, bossMulti: 3.0 },
        cost: { hpPct: 0.80, levelDown: 2, goldCost: 50000 },
        cooldown: 600,
        decipherCost: { gold: 200000, time: 7200, item: 'mat_dragon', itemCount: 10 },
        dropRate: 0.0005,
        lore: '신조차 두려워했다는 궁극의 금서. 시전자의 모든 것을 대가로 요구한다.',
    },
};

// ── 해독 실패 시 저주 (랜덤) ──
const DECIPHER_CURSES = [
    { name: '마력 역류', desc: 'MP 0으로 감소', effect: { mpDrain: true } },
    { name: '기억 혼란', desc: 'EXP 1000 손실', effect: { expLoss: 1000 } },
    { name: '어둠의 속삭임', desc: '10초간 ATK -30%', effect: { atkReduce: 0.3, duration: 10 } },
    { name: '피의 대가', desc: 'HP 20% 손실', effect: { hpLossPct: 0.2 } },
    { name: '금화의 저주', desc: '골드 2000 손실', effect: { goldLoss: 2000 } },
];

// ── 마법서 숙련도 등급 ──
const MASTERY_LEVELS = [
    { level: 1, name: '초심자', expReq: 0, bonus: 0 },
    { level: 2, name: '수련자', expReq: 500, bonus: 0.05 },      // 대가 5% 감소
    { level: 3, name: '술사', expReq: 1500, bonus: 0.10 },
    { level: 4, name: '마도사', expReq: 4000, bonus: 0.15 },
    { level: 5, name: '대마도사', expReq: 10000, bonus: 0.20 },
    { level: 6, name: '금서의 주인', expReq: 25000, bonus: 0.30 },  // 대가 30% 감소
];

function _ensure(player) {
    if (!player._grimoire) {
        player._grimoire = {
            collected: {},       // { grimoireId: { found: timestamp, deciphered: bool, decipherStart: null, decipherEnd: null } }
            mastery: 0,          // 숙련도 EXP
            masteryLevel: 1,
            totalCasts: 0,
            cooldowns: {},       // { grimoireId: lastCastTime }
        };
    }
    return player._grimoire;
}

function _getMasteryBonus(state) {
    let bonus = 0;
    for (let i = MASTERY_LEVELS.length - 1; i >= 0; i--) {
        if (state.mastery >= MASTERY_LEVELS[i].expReq) {
            bonus = MASTERY_LEVELS[i].bonus;
            break;
        }
    }
    return bonus;
}

function _getMasteryLevel(state) {
    let lv = 1;
    for (let i = MASTERY_LEVELS.length - 1; i >= 0; i--) {
        if (state.mastery >= MASTERY_LEVELS[i].expReq) {
            lv = MASTERY_LEVELS[i].level;
            break;
        }
    }
    return lv;
}

// ── 마법서 획득 (몬스터 드롭 시 호출) ──
function tryDropGrimoire(player, monsterTier) {
    const state = _ensure(player);
    const tierMulti = { normal: 0.5, elite: 1.0, rare: 1.5, boss: 3.0 };
    const multi = tierMulti[monsterTier] || 0.5;

    for (const [id, g] of Object.entries(GRIMOIRES)) {
        if (state.collected[id]) continue;
        if (Math.random() < g.dropRate * multi) {
            state.collected[id] = { found: Date.now(), deciphered: false, decipherStart: null, decipherEnd: null };
            return { dropped: true, grimoire: g, grimoireId: id };
        }
    }
    return { dropped: false };
}

// ── 마법서 해독 시작 ──
function startDecipher(player, grimoireId) {
    const state = _ensure(player);
    const g = GRIMOIRES[grimoireId];
    if (!g) return { success: false, msg: '알 수 없는 마법서' };

    const entry = state.collected[grimoireId];
    if (!entry) return { success: false, msg: '보유하지 않은 마법서' };
    if (entry.deciphered) return { success: false, msg: '이미 해독 완료' };
    if (entry.decipherStart && Date.now() < entry.decipherEnd) {
        const remain = Math.ceil((entry.decipherEnd - Date.now()) / 1000);
        return { success: false, msg: `해독 진행 중 (${remain}초 남음)` };
    }

    // 비용 체크
    const cost = g.decipherCost;
    if ((player.gold || 0) < cost.gold) return { success: false, msg: `골드 부족 (${cost.gold}G 필요)` };
    if (cost.item) {
        const needed = cost.itemCount || 1;
        if (!player.inventory?.[cost.item] || player.inventory[cost.item] < needed) {
            return { success: false, msg: `재료 부족: ${cost.item} x${needed}` };
        }
    }

    // 비용 차감
    player.gold -= cost.gold;
    if (cost.item) {
        const needed = cost.itemCount || 1;
        player.inventory[cost.item] -= needed;
        if (player.inventory[cost.item] <= 0) delete player.inventory[cost.item];
    }

    const duration = cost.time * 1000;
    entry.decipherStart = Date.now();
    entry.decipherEnd = Date.now() + duration;

    return { success: true, grimoire: g, duration: cost.time, msg: `${g.icon} ${g.name} 해독 시작! (${Math.ceil(cost.time / 60)}분)` };
}

// ── 해독 완료 체크 ──
function checkDecipher(player, grimoireId) {
    const state = _ensure(player);
    const entry = state.collected[grimoireId];
    if (!entry || !entry.decipherStart) return { completed: false };
    if (Date.now() < entry.decipherEnd) {
        return { completed: false, remaining: Math.ceil((entry.decipherEnd - Date.now()) / 1000) };
    }

    // 해독 성공/실패 판정 (Tier가 높을수록 실패 확률 증가)
    const g = GRIMOIRES[grimoireId];
    const failChance = g.tier === 1 ? 0.05 : g.tier === 2 ? 0.15 : 0.25;
    const masteryBonus = _getMasteryBonus(state);

    if (Math.random() < failChance - masteryBonus * 0.5) {
        // 실패 → 랜덤 저주
        entry.decipherStart = null;
        entry.decipherEnd = null;
        const curse = DECIPHER_CURSES[Math.floor(Math.random() * DECIPHER_CURSES.length)];
        return { completed: true, failed: true, curse, msg: `해독 실패! ${curse.name}: ${curse.desc}` };
    }

    entry.deciphered = true;
    entry.decipherStart = null;
    entry.decipherEnd = null;
    state.mastery += g.tier * 100;
    state.masteryLevel = _getMasteryLevel(state);

    return { completed: true, failed: false, grimoire: g, msg: `${g.icon} ${g.name} 해독 완료! 이제 시전할 수 있습니다.` };
}

// ── 금지 마법 시전 ──
function castGrimoire(player, grimoireId) {
    const state = _ensure(player);
    const g = GRIMOIRES[grimoireId];
    if (!g) return { success: false, msg: '알 수 없는 마법서' };

    const entry = state.collected[grimoireId];
    if (!entry || !entry.deciphered) return { success: false, msg: '해독되지 않은 마법서' };

    // 쿨다운 체크
    const lastCast = state.cooldowns[grimoireId] || 0;
    const cdRemain = Math.ceil((lastCast + g.cooldown * 1000 - Date.now()) / 1000);
    if (cdRemain > 0) return { success: false, msg: `쿨다운 중 (${cdRemain}초)` };

    // 레벨 제한
    const minLevel = g.tier === 1 ? 15 : g.tier === 2 ? 30 : 40;
    if (player.level < minLevel) return { success: false, msg: `Lv.${minLevel} 이상 필요` };

    const masteryBonus = _getMasteryBonus(state);

    // ── 대가 지불 ──
    const penalties = [];
    const cost = g.cost;

    if (cost.hpPct) {
        const hpLoss = Math.floor(player.hp * cost.hpPct * (1 - masteryBonus));
        player.hp = Math.max(1, player.hp - hpLoss);
        penalties.push(`HP -${hpLoss}`);
    }
    if (cost.expLoss) {
        const loss = Math.floor(cost.expLoss * (1 - masteryBonus));
        player.exp = Math.max(0, (player.exp || 0) - loss);
        penalties.push(`EXP -${loss}`);
    }
    if (cost.goldCost) {
        const loss = Math.floor(cost.goldCost * (1 - masteryBonus));
        if ((player.gold || 0) < loss) return { success: false, msg: `골드 부족 (${loss}G)` };
        player.gold -= loss;
        penalties.push(`골드 -${loss}`);
    }
    if (cost.diamondCost) {
        if ((player.diamonds || 0) < cost.diamondCost) return { success: false, msg: `다이아 부족 (${cost.diamondCost})` };
        player.diamonds -= cost.diamondCost;
        penalties.push(`다이아 -${cost.diamondCost}`);
    }
    if (cost.levelDown) {
        const loss = Math.max(0, Math.floor(cost.levelDown * (1 - masteryBonus)));
        if (loss > 0 && player.level > 1) {
            player.level = Math.max(1, player.level - loss);
            penalties.push(`레벨 -${loss}`);
        }
    }
    if (cost.selfStun) {
        penalties.push(`자가 기절 ${cost.selfStun}초`);
    }

    // 쿨다운 등록
    state.cooldowns[grimoireId] = Date.now();
    state.totalCasts++;
    state.mastery += g.tier * 30;
    state.masteryLevel = _getMasteryLevel(state);

    return {
        success: true,
        grimoire: g,
        grimoireId,
        effect: g.effect,
        cost: g.cost,
        penalties,
        masteryBonus,
        msg: `${g.icon} ${g.name} 시전! [대가: ${penalties.join(', ')}]`,
    };
}

// ── 상태 조회 ──
function getStatus(player) {
    const state = _ensure(player);
    const now = Date.now();
    return {
        mastery: state.mastery,
        masteryLevel: state.masteryLevel,
        masteryName: MASTERY_LEVELS[state.masteryLevel - 1]?.name || '초심자',
        masteryBonus: Math.floor(_getMasteryBonus(state) * 100),
        nextMasteryExp: MASTERY_LEVELS[Math.min(state.masteryLevel, MASTERY_LEVELS.length - 1)]?.expReq || 99999,
        totalCasts: state.totalCasts,
        grimoires: Object.entries(GRIMOIRES).map(([id, g]) => {
            const entry = state.collected[id];
            const lastCast = state.cooldowns[id] || 0;
            const cdRemain = Math.max(0, Math.ceil((lastCast + g.cooldown * 1000 - now) / 1000));
            const minLevel = g.tier === 1 ? 15 : g.tier === 2 ? 30 : 40;
            return {
                id, name: g.name, icon: g.icon, tier: g.tier, element: g.element,
                desc: g.desc, lore: g.lore,
                collected: !!entry,
                deciphered: entry?.deciphered || false,
                deciphering: entry?.decipherStart && now < entry?.decipherEnd ? Math.ceil((entry.decipherEnd - now) / 1000) : 0,
                cooldown: cdRemain,
                minLevel,
                costDesc: _describeCost(g.cost),
                effectDesc: _describeEffect(g.effect),
            };
        }),
    };
}

function _describeCost(cost) {
    const parts = [];
    if (cost.hpPct) parts.push(`HP ${Math.floor(cost.hpPct * 100)}%`);
    if (cost.expLoss) parts.push(`EXP ${cost.expLoss}`);
    if (cost.goldCost) parts.push(`${cost.goldCost}G`);
    if (cost.diamondCost) parts.push(`${cost.diamondCost}D`);
    if (cost.levelDown) parts.push(`레벨 -${cost.levelDown}`);
    if (cost.selfStun) parts.push(`자가 기절 ${cost.selfStun}초`);
    if (cost.defDebuff) parts.push(`DEF -${Math.floor(cost.defDebuff.value * 100)}% ${cost.defDebuff.duration}초`);
    if (cost.spdDebuff) parts.push(`SPD -${Math.floor(cost.spdDebuff.value * 100)}% ${cost.spdDebuff.duration}초`);
    if (cost.curse) parts.push(`저주: ${cost.curse.name}`);
    return parts.join(' + ');
}

function _describeEffect(effect) {
    const parts = [];
    if (effect.type === 'selfBuff') {
        if (effect.atkMulti) parts.push(`ATK x${effect.atkMulti}`);
        if (effect.spdMulti) parts.push(`SPD x${effect.spdMulti}`);
        if (effect.dodgeBonus) parts.push(`회피 +${Math.floor(effect.dodgeBonus * 100)}%`);
        if (effect.duration) parts.push(`${effect.duration}초`);
    } else if (effect.type === 'aoe') {
        if (effect.dmgMulti) parts.push(`${effect.dmgMulti}배 데미지`);
        if (effect.radius) parts.push(`범위 ${effect.radius}`);
        if (effect.hpCutPct) parts.push(`HP ${Math.floor(effect.hpCutPct * 100)}% 삭감`);
        if (effect.hpStealPct) parts.push(`HP ${Math.floor(effect.hpStealPct * 100)}% 흡수`);
        if (effect.freeze) parts.push(`빙결 ${effect.freeze.duration}초`);
        if (effect.burn) parts.push(`화상 ${effect.burn.dps}DPS`);
        if (effect.stun) parts.push(`기절 ${effect.stun}초`);
    } else if (effect.type === 'single') {
        if (effect.dmgMulti) parts.push(`${effect.dmgMulti}배 단일`);
        if (effect.bossMulti) parts.push(`보스 x${effect.bossMulti}`);
        if (effect.ignoreDefense) parts.push('방어 무시');
    } else if (effect.type === 'summon') {
        parts.push(`분신 ${effect.count}체 (${effect.duration}초)`);
    } else if (effect.type === 'timeRewind') {
        parts.push(`시간 ${effect.rewindSec}초 역행`);
        if (effect.healPct) parts.push(`HP ${Math.floor(effect.healPct * 100)}% 회복`);
    } else if (effect.type === 'chaosWish') {
        parts.push(`버프 ${effect.buffCount}개 + 디버프 ${effect.debuffCount}개`);
    } else if (effect.type === 'banish') {
        parts.push(`차원 추방 ${effect.duration}초`);
        if (effect.dmgMulti) parts.push(`${effect.dmgMulti}배`);
    }
    return parts.join(', ');
}

module.exports = {
    GRIMOIRES, MASTERY_LEVELS, DECIPHER_CURSES,
    tryDropGrimoire, startDecipher, checkDecipher, castGrimoire, getStatus,
};

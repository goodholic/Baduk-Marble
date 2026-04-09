// ==========================================
// 영혼 시스템 — v2.31
// 몬스터 영혼 흡수 → 장착 → 합성 → 각성
// 영혼별 고유 능력 + 공명 보너스
// ==========================================

// ── 영혼 정의 (몬스터 처치 시 흡수) ──
const SOULS = {
    // Tier 1: 일반 몬스터 영혼
    soul_slime:     { name:'슬라임 영혼',     icon:'🟢', tier:1, element:'earth',  passive:{ hp:20 },                       active:null, dropRate:0.10 },
    soul_wolf:      { name:'늑대 영혼',       icon:'🐺', tier:1, element:'wind',   passive:{ atk:3 },                       active:null, dropRate:0.10 },
    soul_skeleton:  { name:'스켈레톤 영혼',   icon:'💀', tier:1, element:'dark',   passive:{ def:3 },                       active:null, dropRate:0.10 },
    soul_goblin:    { name:'고블린 영혼',     icon:'👹', tier:1, element:'earth',  passive:{ goldBonus:0.03 },               active:null, dropRate:0.10 },
    // Tier 2: 엘리트 몬스터 영혼
    soul_orc:       { name:'오크 전사 영혼',  icon:'🐗', tier:2, element:'fire',   passive:{ atk:8, hp:30 },                active:{ name:'전사의 함성', desc:'5초 ATK+20%', cd:60, dur:5000, buff:{atk:0.2} }, dropRate:0.05 },
    soul_harpy:     { name:'하피 영혼',       icon:'🦅', tier:2, element:'wind',   passive:{ spd:2, dodge:0.03 },           active:{ name:'질풍 비행', desc:'3초 이동속도 3배', cd:45, dur:3000, buff:{spd:3} }, dropRate:0.05 },
    soul_golem:     { name:'골렘 영혼',       icon:'🗿', tier:2, element:'earth',  passive:{ def:12, hp:50 },               active:{ name:'석화', desc:'4초 무적(이동불가)', cd:90, dur:4000, buff:{invuln:true} }, dropRate:0.05 },
    soul_mage:      { name:'다크메이지 영혼', icon:'🧙', tier:2, element:'dark',   passive:{ mp:20, expBonus:0.05 },        active:{ name:'마력 폭발', desc:'범위 ATKx2', cd:60, aoe:{radius:5,mult:2} }, dropRate:0.05 },
    // Tier 3: 보스 영혼
    soul_dragon:    { name:'드래곤 영혼',     icon:'🐲', tier:3, element:'fire',   passive:{ atk:20, fireAtk:15, hp:100 },  active:{ name:'용의 브레스', desc:'범위 ATKx3+화상', cd:120, aoe:{radius:8,mult:3,burn:5} }, dropRate:0.01 },
    soul_lich:      { name:'리치 영혼',       icon:'☠️', tier:3, element:'dark',   passive:{ lifesteal:0.08, mp:50 },       active:{ name:'죽음의 손길', desc:'단일 ATKx5+HP흡수50%', cd:90, single:{mult:5,drain:0.5} }, dropRate:0.01 },
    soul_phoenix:   { name:'불사조 영혼',     icon:'🔥', tier:3, element:'fire',   passive:{ hp:150, autoRevive:true },      active:{ name:'불사의 불꽃', desc:'부활+주변 화염폭발', cd:300, revive:{hpPct:0.5,aoeRadius:6,dmg:300} }, dropRate:0.008 },
    soul_leviathan: { name:'리바이어던 영혼', icon:'🐋', tier:3, element:'water',  passive:{ def:25, hp:200, slow:0.1 },    active:{ name:'해일', desc:'범위 넉백+둔화5초', cd:120, aoe:{radius:10,knockback:5,slow:0.5,dur:5000} }, dropRate:0.008 },
    // Tier 4: 전설 영혼 (슈퍼보스/히든)
    soul_kronos:    { name:'크로노스 영혼',   icon:'⏳', tier:4, element:'void',   passive:{ allStats:8, cooldownReduce:0.15 }, active:{ name:'시간 정지', desc:'3초 전체 정지(자신 제외)', cd:300, timeStop:{dur:3000} }, dropRate:0.002 },
    soul_azatoth:   { name:'아자토스 영혼',   icon:'🕳️', tier:4, element:'void',   passive:{ atk:30, lifesteal:0.1, darkDmg:0.2 }, active:{ name:'공허 삼키기', desc:'범위 HP 20% 즉사+흡수', cd:300, voidDevour:{radius:8,execPct:0.2} }, dropRate:0.001 },
};

// ── 영혼 공명 (같은 속성/티어 조합 시 추가 보너스) ──
const RESONANCE = {
    fire_2:   { name:'화염 공명',   req:{ element:'fire', count:2 },   bonus:{ fireAtk:10 } },
    fire_3:   { name:'화염 폭주',   req:{ element:'fire', count:3 },   bonus:{ fireAtk:25, burnChance:0.1 } },
    dark_2:   { name:'암흑 공명',   req:{ element:'dark', count:2 },   bonus:{ lifesteal:0.05 } },
    dark_3:   { name:'암흑 지배',   req:{ element:'dark', count:3 },   bonus:{ lifesteal:0.1, darkDmg:0.15 } },
    earth_2:  { name:'대지 공명',   req:{ element:'earth', count:2 },  bonus:{ hp:80, def:5 } },
    wind_2:   { name:'질풍 공명',   req:{ element:'wind', count:2 },   bonus:{ spd:3, dodge:0.05 } },
    water_2:  { name:'수빙 공명',   req:{ element:'water', count:2 },  bonus:{ def:10, freezeChance:0.05 } },
    void_2:   { name:'공허 공명',   req:{ element:'void', count:2 },   bonus:{ allStats:10, cooldownReduce:0.1 } },
    tier4_2:  { name:'전설의 공명', req:{ tier:4, count:2 },           bonus:{ allStats:15 } },
    mixed_3:  { name:'원소 조화',   req:{ uniqueElements:3 },          bonus:{ allStats:5, expBonus:0.1 } },
};

const MAX_EQUIPPED = 3;        // 동시 장착 최대 3개
const MAX_INVENTORY = 30;      // 보관함 최대 30개

// ── 합성 (같은 영혼 3개 → 1단계 상위) ──
const SYNTHESIS = {
    cost: 2000,                // 골드 비용
    sameRequired: 3,           // 같은 영혼 3개 필요
    statBoost: 1.5,            // 합성 시 스탯 1.5배
};

// ── 각성 (Tier 3+ 영혼, 특수 재료) ──
const AWAKENING = {
    reqTier: 3,
    reqMaterial: 'mat_soul',
    reqCount: 10,
    reqGold: 50000,
    statBoost: 2.0,
    activeBoost: 1.5,
};

function _ensure(player) {
    if (!player._soulSystem) {
        player._soulSystem = {
            inventory: [],    // [{ soulId, level, awakened }]
            equipped: [],     // [index in inventory] max 3
            totalAbsorbed: 0,
            totalSynthesized: 0,
            totalAwakened: 0,
        };
    }
    return player._soulSystem;
}

// 영혼 흡수 (몬스터 처치 시)
function absorbSoul(player, monsterTier) {
    const state = _ensure(player);
    if (state.inventory.length >= MAX_INVENTORY) return { success: false };

    // 티어별 드롭 풀
    const pool = Object.entries(SOULS).filter(([, s]) => {
        if (monsterTier === 'normal' && s.tier <= 1) return true;
        if (monsterTier === 'elite' && s.tier <= 2) return true;
        if ((monsterTier === 'rare' || monsterTier === 'boss') && s.tier <= 3) return true;
        if ((monsterTier === 'legendary' || monsterTier === 'mythic' || monsterTier === 'worldboss') && s.tier <= 4) return true;
        return false;
    });

    for (const [soulId, soul] of pool) {
        if (Math.random() < soul.dropRate) {
            state.inventory.push({ soulId, level: 1, awakened: false });
            state.totalAbsorbed++;
            return { success: true, soul: { id: soulId, ...soul }, msg: `${soul.icon} ${soul.name} 흡수!` };
        }
    }

    return { success: false };
}

// 영혼 장착
function equip(player, inventoryIndex) {
    const state = _ensure(player);
    if (inventoryIndex < 0 || inventoryIndex >= state.inventory.length) return { success: false, msg: '잘못된 인덱스' };
    if (state.equipped.length >= MAX_EQUIPPED) return { success: false, msg: `최대 ${MAX_EQUIPPED}개 장착` };
    if (state.equipped.includes(inventoryIndex)) return { success: false, msg: '이미 장착 중' };
    state.equipped.push(inventoryIndex);
    const s = state.inventory[inventoryIndex];
    return { success: true, soul: SOULS[s.soulId], msg: `${SOULS[s.soulId]?.icon} 장착!` };
}

// 영혼 해제
function unequip(player, inventoryIndex) {
    const state = _ensure(player);
    const idx = state.equipped.indexOf(inventoryIndex);
    if (idx === -1) return { success: false, msg: '장착 중이 아님' };
    state.equipped.splice(idx, 1);
    return { success: true, msg: '해제 완료' };
}

// 합성 (같은 영혼 3개 → 1개 강화)
function synthesize(player, soulId) {
    const state = _ensure(player);
    const matching = state.inventory.map((s, i) => ({ ...s, idx: i })).filter(s => s.soulId === soulId && !state.equipped.includes(s.idx));
    if (matching.length < SYNTHESIS.sameRequired) return { success: false, msg: `같은 영혼 ${SYNTHESIS.sameRequired}개 필요 (보유: ${matching.length})` };
    if ((player.gold || 0) < SYNTHESIS.cost) return { success: false, msg: `골드 부족 (${SYNTHESIS.cost}G)` };

    player.gold -= SYNTHESIS.cost;
    // 3개 중 첫 번째를 강화, 나머지 2개 제거
    const keep = matching[0];
    const remove = [matching[1].idx, matching[2].idx].sort((a, b) => b - a);
    for (const ri of remove) {
        state.equipped = state.equipped.filter(e => e !== ri).map(e => e > ri ? e - 1 : e);
        state.inventory.splice(ri, 1);
    }
    // 강화
    const kept = state.inventory.find((s, i) => s.soulId === soulId);
    if (kept) kept.level = Math.min(5, (kept.level || 1) + 1);
    state.totalSynthesized++;

    return { success: true, level: kept?.level, msg: `${SOULS[soulId]?.icon} ${SOULS[soulId]?.name} Lv.${kept?.level}!` };
}

// 각성 (Tier 3+ 영혼 특수 강화)
function awaken(player, inventoryIndex) {
    const state = _ensure(player);
    if (inventoryIndex < 0 || inventoryIndex >= state.inventory.length) return { success: false, msg: '잘못된 인덱스' };
    const entry = state.inventory[inventoryIndex];
    const soul = SOULS[entry.soulId];
    if (!soul || soul.tier < AWAKENING.reqTier) return { success: false, msg: 'Tier 3 이상만 각성 가능' };
    if (entry.awakened) return { success: false, msg: '이미 각성됨' };
    if ((player.gold || 0) < AWAKENING.reqGold) return { success: false, msg: `골드 부족 (${AWAKENING.reqGold}G)` };
    if (!player.inventory?.[AWAKENING.reqMaterial] || player.inventory[AWAKENING.reqMaterial] < AWAKENING.reqCount) {
        return { success: false, msg: `${AWAKENING.reqMaterial} ${AWAKENING.reqCount}개 필요` };
    }

    player.gold -= AWAKENING.reqGold;
    player.inventory[AWAKENING.reqMaterial] -= AWAKENING.reqCount;
    if (player.inventory[AWAKENING.reqMaterial] <= 0) delete player.inventory[AWAKENING.reqMaterial];
    entry.awakened = true;
    state.totalAwakened++;

    return { success: true, soul, msg: `✨ ${soul.icon} ${soul.name} 각성 완료! 스탯 2배!` };
}

// 장착 영혼 효과 합산
function getEquippedEffects(player) {
    const state = _ensure(player);
    const combined = {};
    const elements = [];

    for (const idx of state.equipped) {
        const entry = state.inventory[idx];
        if (!entry) continue;
        const soul = SOULS[entry.soulId];
        if (!soul) continue;
        elements.push({ element: soul.element, tier: soul.tier });

        const levelMult = 1 + (entry.level - 1) * 0.3;
        const awakenMult = entry.awakened ? AWAKENING.statBoost : 1;

        for (const [stat, val] of Object.entries(soul.passive)) {
            if (typeof val === 'number') {
                combined[stat] = (combined[stat] || 0) + val * levelMult * awakenMult;
            } else {
                combined[stat] = val;
            }
        }
    }

    // 공명 체크
    const resonances = [];
    for (const [rId, res] of Object.entries(RESONANCE)) {
        let met = false;
        if (res.req.element) {
            met = elements.filter(e => e.element === res.req.element).length >= res.req.count;
        } else if (res.req.tier) {
            met = elements.filter(e => e.tier >= res.req.tier).length >= res.req.count;
        } else if (res.req.uniqueElements) {
            met = new Set(elements.map(e => e.element)).size >= res.req.uniqueElements;
        }
        if (met) {
            resonances.push({ id: rId, ...res });
            for (const [stat, val] of Object.entries(res.bonus)) {
                if (typeof val === 'number') combined[stat] = (combined[stat] || 0) + val;
            }
        }
    }

    return { stats: combined, resonances };
}

// 상태 조회
function getStatus(player) {
    const state = _ensure(player);
    const effects = getEquippedEffects(player);
    return {
        inventory: state.inventory.map((s, i) => ({
            index: i, ...s, soul: SOULS[s.soulId],
            isEquipped: state.equipped.includes(i),
        })),
        equipped: state.equipped.map(i => ({ index: i, ...state.inventory[i], soul: SOULS[state.inventory[i]?.soulId] })),
        effects: effects.stats,
        resonances: effects.resonances,
        totalAbsorbed: state.totalAbsorbed,
        totalSynthesized: state.totalSynthesized,
        totalAwakened: state.totalAwakened,
        maxEquip: MAX_EQUIPPED,
        maxInventory: MAX_INVENTORY,
    };
}

module.exports = {
    SOULS, RESONANCE, SYNTHESIS, AWAKENING,
    absorbSoul, equip, unequip, synthesize, awaken, getEquippedEffects, getStatus,
};

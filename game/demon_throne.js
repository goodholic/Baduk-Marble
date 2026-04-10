// ==========================================
// 마왕의 옥좌 — v2.52
// 플레이어가 마왕이 됨 + 던전 지배 + 부하 배치 + 토벌전 + 왕좌 쟁탈
// ==========================================

const DEMON_SKILLS = {
    dark_aura:      { name: '암흑 오라',     icon: '🌑', tier: 1, cost: 0,   effect: { defBuff: 0.1, darkDmg: 0.05 }, desc: '부하 DEF +10%, 암속 +5%' },
    terror_shout:   { name: '공포의 외침',   icon: '😱', tier: 1, cost: 5,   effect: { fearAll: true, duration: 5 }, desc: '토벌대 5초 공포', cd: 60 },
    summon_elite:   { name: '정예 소환',     icon: '👹+', tier: 2, cost: 10,  effect: { summonElite: true }, desc: '정예 부하 즉시 소환', cd: 90 },
    death_tax:      { name: '죽음의 세금',   icon: '💀💰', tier: 2, cost: 15, effect: { taxRate: 0.05 }, desc: '토벌대 처치 시 골드 5% 강탈' },
    throne_barrier: { name: '옥좌의 결계',   icon: '🛡️👑', tier: 3, cost: 25, effect: { barrier: 5000 }, desc: '마왕 보호막 5000 HP', cd: 120 },
    apocalypse:     { name: '종말 선언',     icon: '💀🔥', tier: 4, cost: 50, effect: { dmg: 10.0, aoe: true }, desc: 'ATK x10 범위 공격', cd: 180 },
};

const MINION_TYPES = {
    imp:         { name: '임프',       icon: '👿', tier: 1, hp: 300,   atk: 40,  def: 10,  cost: 1000,  skill: null },
    skeleton:    { name: '스켈레톤',   icon: '💀', tier: 1, hp: 500,   atk: 50,  def: 30,  cost: 1500,  skill: null },
    dark_knight: { name: '암흑 기사',  icon: '🗡️🌑', tier: 2, hp: 1500, atk: 120, def: 80,  cost: 5000,  skill: '암흑 참격' },
    necromancer: { name: '네크로맨서', icon: '💀🔮', tier: 2, hp: 800,  atk: 150, def: 40,  cost: 6000,  skill: '언데드 소환' },
    demon_guard: { name: '악마 근위대', icon: '😈🛡️', tier: 3, hp: 3000, atk: 200, def: 150, cost: 15000, skill: '마왕 호위' },
    dragon:      { name: '흑룡',       icon: '🐉🌑', tier: 4, hp: 8000, atk: 400, def: 200, cost: 50000, skill: '암흑 브레스' },
};

const THRONE_REWARDS = {
    hourly_gold: 2000,
    hourly_exp: 500,
    tax_rate: 0.03,
};

function _ensure(player) {
    if (!player._demonThrone) {
        player._demonThrone = {
            isDemonKing: false,
            throneLevel: 0,
            demonPower: 0,
            skillPoints: 0,
            skills: {},
            minions: [],
            maxMinions: 5,
            totalReign: 0,
            totalDefenses: 0,
            totalTax: 0,
            throneHp: 0,
            throneMaxHp: 0,
            lastRewardClaim: 0,
            reignStart: 0,
            usurpations: 0,
        };
    }
    return player._demonThrone;
}

function claimThrone(player) {
    const state = _ensure(player);
    if (state.isDemonKing) return { success: false, msg: '이미 마왕입니다!' };
    if ((player.level || 1) < 40) return { success: false, msg: 'Lv.40 이상 필요' };
    if ((player.gold || 0) < 100000) return { success: false, msg: '골드 부족 (100,000G)' };

    player.gold -= 100000;
    state.isDemonKing = true;
    state.throneLevel = 1;
    state.demonPower = 100;
    state.skillPoints = 3;
    state.throneHp = 10000;
    state.throneMaxHp = 10000;
    state.maxMinions = 5;
    state.reignStart = Date.now();

    return { success: true, msg: `👑😈 마왕 즉위! 암흑의 옥좌에 올랐다! 부하를 배치하고 왕국을 지켜라!` };
}

function learnSkill(player, skillId) {
    const state = _ensure(player);
    if (!state.isDemonKing) return { success: false, msg: '마왕이 아닙니다.' };
    const skill = DEMON_SKILLS[skillId];
    if (!skill) return { success: false, msg: '알 수 없는 스킬' };
    if (state.skills[skillId]) return { success: false, msg: '이미 습득' };
    if (state.skillPoints < skill.cost) return { success: false, msg: `포인트 부족 (${state.skillPoints}/${skill.cost})` };
    state.skillPoints -= skill.cost;
    state.skills[skillId] = Date.now();
    return { success: true, skill, msg: `${skill.icon} ${skill.name} 습득! — ${skill.desc}` };
}

function hireMinion(player, minionType) {
    const state = _ensure(player);
    if (!state.isDemonKing) return { success: false, msg: '마왕이 아닙니다.' };
    const minion = MINION_TYPES[minionType];
    if (!minion) return { success: false, msg: '알 수 없는 부하' };
    if (state.minions.length >= state.maxMinions) return { success: false, msg: `부하 최대 (${state.maxMinions}명)` };
    if ((player.gold || 0) < minion.cost) return { success: false, msg: `골드 부족 (${minion.cost}G)` };

    player.gold -= minion.cost;
    state.minions.push({ type: minionType, hp: minion.hp, alive: true });
    return { success: true, minion, msg: `${minion.icon} ${minion.name} 고용! (-${minion.cost}G)` };
}

function defendThrone(player, attackerPower) {
    const state = _ensure(player);
    if (!state.isDemonKing) return { success: false, msg: '마왕이 아닙니다.' };

    const power = attackerPower || (500 + Math.floor(Math.random() * 1000));
    let remainingPower = power;

    // 부하 전투
    const battleLog = [];
    for (let i = 0; i < state.minions.length; i++) {
        if (!state.minions[i].alive) continue;
        const m = MINION_TYPES[state.minions[i].type];
        const minionPower = m.atk + m.def;
        if (remainingPower > minionPower) {
            remainingPower -= minionPower;
            state.minions[i].alive = false;
            battleLog.push(`${m.icon} ${m.name} 전사!`);
        } else {
            remainingPower = 0;
            battleLog.push(`${m.icon} ${m.name} 방어 성공!`);
            break;
        }
    }

    // 옥좌 데미지
    if (remainingPower > 0) {
        const barrier = state.skills.throne_barrier ? 5000 : 0;
        const actualDmg = Math.max(0, remainingPower - barrier);
        state.throneHp = Math.max(0, state.throneHp - actualDmg);
        battleLog.push(`옥좌 데미지: ${actualDmg} (HP: ${state.throneHp}/${state.throneMaxHp})`);
    }

    if (state.throneHp <= 0) {
        state.isDemonKing = false;
        state.throneLevel = 0;
        const reignTime = Math.floor((Date.now() - state.reignStart) / 60000);
        return { success: true, type: 'dethroned', battleLog, msg: `💔👑 옥좌 파괴! 마왕에서 퇴위... (통치: ${reignTime}분)` };
    }

    state.totalDefenses++;
    const taxGold = Math.floor(power * THRONE_REWARDS.tax_rate);
    player.gold = Math.min((player.gold || 0) + taxGold, 999999999);
    state.totalTax += taxGold;
    state.skillPoints += 1;

    return {
        success: true, type: 'defended', battleLog, taxGold,
        msg: `⚔️👑 토벌대 격퇴! ${battleLog.join(' | ')} +${taxGold}G 세금 +1 SP`,
    };
}

function claimReward(player) {
    const state = _ensure(player);
    if (!state.isDemonKing) return { success: false, msg: '마왕이 아닙니다.' };
    const hours = Math.floor((Date.now() - state.lastRewardClaim) / 3600000);
    if (hours < 1) return { success: false, msg: '1시간마다 수령 가능' };

    const h = Math.min(hours, 24);
    const gold = THRONE_REWARDS.hourly_gold * h;
    const exp = THRONE_REWARDS.hourly_exp * h;
    player.gold = Math.min((player.gold || 0) + gold, 999999999);
    player.exp = (player.exp || 0) + exp;
    state.lastRewardClaim = Date.now();
    state.totalReign += h;

    return { success: true, gold, exp, hours: h, msg: `👑 마왕 수익 (${h}시간): +${gold}G +${exp}EXP` };
}

function repairThrone(player) {
    const state = _ensure(player);
    if (!state.isDemonKing) return { success: false, msg: '마왕이 아닙니다.' };
    if (state.throneHp >= state.throneMaxHp) return { success: false, msg: '옥좌가 온전합니다.' };
    const cost = Math.floor((state.throneMaxHp - state.throneHp) * 3);
    if ((player.gold || 0) < cost) return { success: false, msg: `골드 부족 (${cost}G)` };
    player.gold -= cost;
    state.throneHp = state.throneMaxHp;
    return { success: true, msg: `🔧👑 옥좌 수리 완료! (-${cost}G)` };
}

function getStatus(player) {
    const state = _ensure(player);
    return {
        isDemonKing: state.isDemonKing, throneLevel: state.throneLevel,
        demonPower: state.demonPower, skillPoints: state.skillPoints,
        throneHp: state.throneHp, throneMaxHp: state.throneMaxHp,
        minions: state.minions.map(m => ({ ...m, info: MINION_TYPES[m.type] })),
        maxMinions: state.maxMinions,
        skills: Object.entries(DEMON_SKILLS).map(([id, s]) => ({ id, ...s, learned: !!state.skills[id] })),
        totalDefenses: state.totalDefenses, totalTax: state.totalTax, totalReign: state.totalReign,
        minionTypes: MINION_TYPES,
        reignMinutes: state.isDemonKing ? Math.floor((Date.now() - state.reignStart) / 60000) : 0,
    };
}

module.exports = { DEMON_SKILLS, MINION_TYPES, claimThrone, learnSkill, hireMinion, defendThrone, claimReward, repairThrone, getStatus };

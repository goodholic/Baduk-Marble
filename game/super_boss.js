// ==========================================
// 슈퍼 보스 시스템 — v2.28
// 서버 전체 협동 레이드. 50명 동시 참여.
// 3단계 페이즈 + 기여도 보상 + 주간 1회
// ==========================================

const SUPER_BOSSES = {
    titan_kronos: {
        name: '시간의 거신 크로노스', icon: '⏳',
        desc: '시간을 지배하는 태초의 거신. 서버 전원의 힘을 모아야 쓰러뜨릴 수 있다.',
        element: 'void',
        phases: [
            {
                name: 'Phase 1: 시간의 수호자', hpRatio: 0.4,
                atk: 300, def: 100,
                mechanic: { type: 'time_slow', desc: '매 15초 전체 속도 50% 감소 3초', interval: 15000, duration: 3000 },
                minions: { name: '시간의 파편', count: 5, hp: 2000, atk: 30 },
            },
            {
                name: 'Phase 2: 시간 역행', hpRatio: 0.35,
                atk: 450, def: 120,
                mechanic: { type: 'time_reverse', desc: '매 20초 랜덤 5명 HP를 10초 전으로 복원', interval: 20000, targets: 5 },
                minions: { name: '시간의 균열', count: 3, hp: 5000, atk: 50 },
                enrage: { atkMult: 1.5, msg: '크로노스가 분노한다! ATK 1.5배!' },
            },
            {
                name: 'Phase 3: 시간 정지', hpRatio: 0.25,
                atk: 600, def: 80,
                mechanic: { type: 'time_stop', desc: '매 30초 전체 3초 행동 불가 + 운석 낙하', interval: 30000, duration: 3000, meteorDmg: 500 },
                enrage: { atkMult: 2.0, defMult: 0.5, msg: '최후의 발악! ATK 2배, DEF 절반!' },
            },
        ],
        totalHp: 500000,
        reward: {
            participant: { gold: 5000, exp: 4000, diamonds: 30 },
            top10: { gold: 20000, exp: 15000, diamonds: 100, item: 'equip_kronos_ring' },
            mvp: { gold: 50000, exp: 30000, diamonds: 300, item: 'equip_kronos_weapon', title: 'title_timeslayer' },
        },
        spawnMsg: '⏳ [슈퍼 보스] 시간의 거신 크로노스가 시공간을 찢고 나타났다! 모든 전사여, 힘을 합쳐라!',
    },
    dragon_emperor: {
        name: '용제 이그니시아', icon: '🐉',
        desc: '모든 용의 위에 군림하는 불멸의 용제.',
        element: 'fire',
        phases: [
            {
                name: 'Phase 1: 불의 비', hpRatio: 0.4,
                atk: 350, def: 80,
                mechanic: { type: 'fire_rain', desc: '매 10초 랜덤 위치 5곳 화염 폭격', interval: 10000, count: 5, dmg: 300 },
                minions: { name: '화룡 수호병', count: 4, hp: 3000, atk: 40 },
            },
            {
                name: 'Phase 2: 용의 포효', hpRatio: 0.35,
                atk: 500, def: 100,
                mechanic: { type: 'roar', desc: '매 25초 전체 3초 공포(공격 불가) + DEF -30%', interval: 25000, duration: 3000 },
                minions: { name: '드래곤 알', count: 6, hp: 1500, atk: 0, hatches: true, hatchTime: 20000 },
            },
            {
                name: 'Phase 3: 불멸의 불꽃', hpRatio: 0.25,
                atk: 700, def: 60,
                mechanic: { type: 'immortal_flame', desc: 'HP 10% 이하 시 5초 무적 + 풀 힐 (1회만)', once: true },
                enrage: { atkMult: 2.5, msg: '이그니시아의 눈이 붉게 빛난다! 최종 분노!' },
            },
        ],
        totalHp: 600000,
        reward: {
            participant: { gold: 6000, exp: 5000, diamonds: 35 },
            top10: { gold: 25000, exp: 18000, diamonds: 120, item: 'equip_dragon_armor' },
            mvp: { gold: 60000, exp: 35000, diamonds: 400, item: 'equip_dragon_sword', title: 'title_dragonslayer' },
        },
        spawnMsg: '🐉 [슈퍼 보스] 용제 이그니시아가 용의 요람에서 각성했다! 전 서버의 힘을 모아라!',
    },
    void_god: {
        name: '공허신 아자토스', icon: '🕳️',
        desc: '현실과 공허의 경계를 파괴하는 존재. 가장 강력한 슈퍼 보스.',
        element: 'void',
        phases: [
            {
                name: 'Phase 1: 공허의 침식', hpRatio: 0.35,
                atk: 400, def: 120,
                mechanic: { type: 'void_drain', desc: '매 12초 가장 높은 DPS 3명 MP 전량 흡수', interval: 12000, targets: 3 },
                minions: { name: '공허 촉수', count: 8, hp: 2000, atk: 25, respawn: true, respawnTime: 30000 },
            },
            {
                name: 'Phase 2: 차원 붕괴', hpRatio: 0.35,
                atk: 550, def: 100,
                mechanic: { type: 'dimension_collapse', desc: '매 20초 맵 축소 (안전 영역 줄어듦)', interval: 20000 },
                minions: { name: '차원의 눈', count: 2, hp: 8000, atk: 60, shieldsMain: true },
            },
            {
                name: 'Phase 3: 현실 파괴', hpRatio: 0.30,
                atk: 800, def: 50,
                mechanic: { type: 'reality_break', desc: '매 15초 랜덤 10명 HP/MP 위치 교환', interval: 15000, targets: 10 },
                enrage: { atkMult: 3.0, msg: '아자토스: "이 현실을 집어삼키겠다!" ATK 3배!' },
            },
        ],
        totalHp: 800000,
        reward: {
            participant: { gold: 8000, exp: 6000, diamonds: 50 },
            top10: { gold: 35000, exp: 25000, diamonds: 200, item: 'equip_void_crown' },
            mvp: { gold: 80000, exp: 50000, diamonds: 500, item: 'equip_void_god_orb', title: 'title_voidconqueror' },
        },
        spawnMsg: '🕳️ [슈퍼 보스] 공허신 아자토스가 차원의 틈에서 나타났다! 이것은 생존을 위한 전쟁이다!',
    },
};

// ── 슈퍼 보스 상태 ──
let activeSuperBoss = null;
// { bossId, name, hp, maxHp, currentPhase, phaseHp, contributions:{playerId:dmg}, startTime, minions:[] }

const SUPER_BOSS_CONFIG = {
    weeklyReset: 7 * 24 * 60 * 60 * 1000,
    minPlayers: 5,            // 최소 5명 참여
    maxDuration: 600000,      // 10분 제한
    spawnSchedule: [6, 12, 18, 22], // 매일 6시, 12시, 18시, 22시 가능
};

function spawnSuperBoss(bossId) {
    if (activeSuperBoss) return { success: false, msg: '이미 슈퍼 보스 진행 중' };
    const boss = SUPER_BOSSES[bossId];
    if (!boss) return { success: false, msg: '알 수 없는 보스' };

    activeSuperBoss = {
        bossId,
        name: boss.name,
        icon: boss.icon,
        hp: boss.totalHp,
        maxHp: boss.totalHp,
        currentPhase: 0,
        phaseHps: boss.phases.map(p => Math.floor(boss.totalHp * p.hpRatio)),
        contributions: {},
        participants: new Set(),
        startTime: Date.now(),
        minions: [],
        enraged: false,
    };

    return { success: true, boss: activeSuperBoss, spawnMsg: boss.spawnMsg };
}

// 데미지 기여
function dealDamage(playerId, damage) {
    if (!activeSuperBoss) return { success: false };
    if (damage <= 0 || !Number.isFinite(damage)) return { success: false };

    activeSuperBoss.contributions[playerId] = (activeSuperBoss.contributions[playerId] || 0) + damage;
    activeSuperBoss.participants.add(playerId);
    activeSuperBoss.hp = Math.max(0, activeSuperBoss.hp - damage);

    // 페이즈 전환 체크
    let phaseChanged = false;
    const boss = SUPER_BOSSES[activeSuperBoss.bossId];
    let hpThreshold = activeSuperBoss.maxHp;
    for (let i = 0; i <= activeSuperBoss.currentPhase; i++) {
        hpThreshold -= activeSuperBoss.phaseHps[i];
    }
    if (activeSuperBoss.hp <= hpThreshold && activeSuperBoss.currentPhase < boss.phases.length - 1) {
        activeSuperBoss.currentPhase++;
        phaseChanged = true;
    }

    const dead = activeSuperBoss.hp <= 0;

    return {
        success: true,
        hp: activeSuperBoss.hp,
        maxHp: activeSuperBoss.maxHp,
        phase: activeSuperBoss.currentPhase,
        phaseChanged,
        phaseName: boss.phases[activeSuperBoss.currentPhase]?.name,
        mechanic: phaseChanged ? boss.phases[activeSuperBoss.currentPhase]?.mechanic : null,
        dead,
    };
}

// 보상 분배
function distributeRewards() {
    if (!activeSuperBoss || activeSuperBoss.hp > 0) return null;
    const boss = SUPER_BOSSES[activeSuperBoss.bossId];
    const clearTime = Math.floor((Date.now() - activeSuperBoss.startTime) / 1000);
    const sorted = Object.entries(activeSuperBoss.contributions).sort((a, b) => b[1] - a[1]);
    const totalDmg = sorted.reduce((s, [, d]) => s + d, 0);

    const rewards = {};
    for (let i = 0; i < sorted.length; i++) {
        const [pid, dmg] = sorted[i];
        let tier;
        if (i === 0) tier = 'mvp';
        else if (i < 10) tier = 'top10';
        else tier = 'participant';

        rewards[pid] = {
            tier,
            rank: i + 1,
            damage: dmg,
            ratio: totalDmg > 0 ? dmg / totalDmg : 0,
            reward: { ...boss.reward[tier] },
        };
    }

    const result = {
        bossName: boss.name,
        bossIcon: boss.icon,
        clearTime,
        totalParticipants: activeSuperBoss.participants.size,
        totalDamage: totalDmg,
        mvp: sorted[0] ? { playerId: sorted[0][0], damage: sorted[0][1] } : null,
        rewards,
    };

    activeSuperBoss = null;
    return result;
}

// 상태 조회
function getStatus() {
    if (!activeSuperBoss) return { active: false };
    const boss = SUPER_BOSSES[activeSuperBoss.bossId];
    return {
        active: true,
        bossId: activeSuperBoss.bossId,
        name: activeSuperBoss.name,
        icon: activeSuperBoss.icon,
        hp: activeSuperBoss.hp,
        maxHp: activeSuperBoss.maxHp,
        phase: activeSuperBoss.currentPhase,
        phaseName: boss.phases[activeSuperBoss.currentPhase]?.name,
        mechanic: boss.phases[activeSuperBoss.currentPhase]?.mechanic,
        participants: activeSuperBoss.participants.size,
        elapsed: Math.floor((Date.now() - activeSuperBoss.startTime) / 1000),
        topContributors: Object.entries(activeSuperBoss.contributions)
            .sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([pid, dmg], i) => ({ rank: i + 1, playerId: pid, damage: dmg })),
    };
}

// 시간 초과 체크
function checkTimeout() {
    if (!activeSuperBoss) return false;
    if (Date.now() - activeSuperBoss.startTime > SUPER_BOSS_CONFIG.maxDuration) {
        activeSuperBoss = null;
        return true;
    }
    return false;
}

module.exports = {
    SUPER_BOSSES, SUPER_BOSS_CONFIG,
    spawnSuperBoss, dealDamage, distributeRewards, getStatus, checkTimeout,
    getActiveBoss: () => activeSuperBoss,
};

// ==========================================
// 세계 보스 연대기 — v2.35
// 매주 3단계 연쇄 보스. 전 서버 협동 스토리.
// 1단계→2단계→3단계 순차 진행, 보상 누적.
// ==========================================

// ── 시즌 스토리 (매주 회전) ──
const CHRONICLE_SEASONS = [
    {
        id: 'season_ragnarok',
        name: '라그나로크의 서막', icon: '⚡🔥',
        lore: '세계수가 흔들리고, 거대한 그림자가 다가온다. 라그나로크가 시작된다.',
        stages: [
            {
                name: '제1장: 서리 거인의 습격',
                boss: { name: '흐림투르스', icon: '🧊👹', element: 'water', hp: 150000, atk: 200, def: 80 },
                mechanic: '빙결 파도: 20초마다 전체 3초 빙결 + DEF -20%',
                reward: { gold: 8000, exp: 6000, diamonds: 40 },
                lore: '북쪽에서 서리 거인 흐림투르스가 이끄는 군대가 몰려온다.',
            },
            {
                name: '제2장: 불꽃의 군주',
                boss: { name: '수르트', icon: '🔥⚔️', element: 'fire', hp: 250000, atk: 350, def: 100 },
                mechanic: '불의 검: 15초마다 맵 절반 화염 (즉사 존) + 화염 면역 적만 안전',
                reward: { gold: 15000, exp: 12000, diamonds: 80 },
                lore: '무스펠하임에서 불의 군주 수르트가 세계를 불태우러 왔다.',
                reqPrevClear: true,
            },
            {
                name: '최종장: 세계를 삼키는 뱀',
                boss: { name: '요르문간드', icon: '🐍🌊', element: 'water', hp: 500000, atk: 500, def: 120 },
                mechanic: '해일+독: 10초마다 전체 넉백, 5초마다 독 DPS 30, HP 30%↓ 시 분노 (ATK 3배)',
                reward: { gold: 30000, exp: 25000, diamonds: 200, item: 'equip_ragnarok_blade', title: 'title_ragnarok_survivor' },
                lore: '세계를 감싸는 뱀 요르문간드가 바다에서 솟아올랐다. 이것이 최후의 전투다.',
                reqPrevClear: true,
            },
        ],
    },
    {
        id: 'season_olympus',
        name: '올림포스의 분노', icon: '⚡🏛️',
        lore: '신들이 인간에게 분노했다. 올림포스 산이 진동하며 신들이 내려온다.',
        stages: [
            {
                name: '제1장: 바다의 진노',
                boss: { name: '포세이돈', icon: '🔱🌊', element: 'water', hp: 180000, atk: 250, def: 90 },
                mechanic: '삼지창 소용돌이: 15초마다 3개 소용돌이 생성 (접근 시 즉사)',
                reward: { gold: 10000, exp: 8000, diamonds: 50 },
                lore: '바다의 신 포세이돈이 해일을 일으키며 나타났다.',
            },
            {
                name: '제2장: 전쟁의 신',
                boss: { name: '아레스', icon: '⚔️🛡️', element: 'fire', hp: 300000, atk: 400, def: 130 },
                mechanic: '전쟁 광기: 주변 아군끼리 3초간 적으로 인식 (PvP 강제 전환)',
                reward: { gold: 18000, exp: 15000, diamonds: 100 },
                lore: '전쟁의 신 아레스가 광기의 주문을 걸었다. 동료를 조심하라!',
                reqPrevClear: true,
            },
            {
                name: '최종장: 천둥의 왕',
                boss: { name: '제우스', icon: '⚡👑', element: 'light', hp: 600000, atk: 600, def: 150 },
                mechanic: '번개 심판: 8초마다 DPS 1위에게 즉사 번개 + 전체 ATK -30% 5초',
                reward: { gold: 40000, exp: 30000, diamonds: 300, item: 'equip_zeus_aegis', title: 'title_godslayer_zeus' },
                lore: '신들의 왕 제우스가 직접 번개를 내린다. 인간의 의지를 보여줘라!',
                reqPrevClear: true,
            },
        ],
    },
    {
        id: 'season_eastern',
        name: '동방의 재앙', icon: '🐲🌸',
        lore: '동방의 봉인이 풀렸다. 고대의 요괴들이 깨어난다.',
        stages: [
            {
                name: '제1장: 구미호의 유혹',
                boss: { name: '구미호', icon: '🦊💜', element: 'dark', hp: 120000, atk: 180, def: 60 },
                mechanic: '매혹: 20초마다 5명 매혹 (10초간 보스 공격 불가 + 아군 공격)',
                reward: { gold: 7000, exp: 5000, diamonds: 35 },
                lore: '천 년 묵은 구미호가 인간 세상에 나타났다.',
            },
            {
                name: '제2장: 용왕의 진노',
                boss: { name: '용왕', icon: '🐲👑', element: 'water', hp: 280000, atk: 380, def: 110 },
                mechanic: '용궁 소환: 30초마다 맵이 수중으로 변환 (이동속도 -50%, 수속성 2배)',
                reward: { gold: 16000, exp: 13000, diamonds: 90 },
                lore: '바다 밑 용궁의 용왕이 지상으로 올라왔다.',
                reqPrevClear: true,
            },
            {
                name: '최종장: 태초의 혼돈',
                boss: { name: '혼돈', icon: '☯️🌀', element: 'void', hp: 700000, atk: 550, def: 140 },
                mechanic: '음양 전환: 15초마다 빛↔어둠 속성 반전 (잘못된 속성으로 공격 시 회복 시킴!)',
                reward: { gold: 50000, exp: 35000, diamonds: 350, item: 'equip_eastern_crown', title: 'title_chaos_tamer' },
                lore: '만물의 시작이자 끝, 태초의 혼돈이 깨어났다.',
                reqPrevClear: true,
            },
        ],
    },
];

// ── 시즌 상태 (서버 전역) ──
let chronicleState = {
    currentSeason: 0,
    currentStage: 0,
    seasonStartTime: Date.now(),
    stageCleared: [false, false, false],
    totalContributions: {},    // { playerId: totalDmg }
    stageContributions: {},    // { playerId: stageDmg }
    bossHp: 0,
    bossMaxHp: 0,
    bossActive: false,
    weeklyResetTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
};

const WEEKLY_DURATION = 7 * 24 * 60 * 60 * 1000;

function getCurrentSeason() {
    return CHRONICLE_SEASONS[chronicleState.currentSeason % CHRONICLE_SEASONS.length];
}

function getCurrentStage() {
    const season = getCurrentSeason();
    return season.stages[chronicleState.currentStage] || null;
}

// 보스 활성화
function activateBoss() {
    if (chronicleState.bossActive) return { success: false, msg: '이미 활성 중' };
    const stage = getCurrentStage();
    if (!stage) return { success: false, msg: '모든 스테이지 완료' };
    if (stage.reqPrevClear && chronicleState.currentStage > 0 && !chronicleState.stageCleared[chronicleState.currentStage - 1]) {
        return { success: false, msg: '이전 단계 미클리어' };
    }

    chronicleState.bossHp = stage.boss.hp;
    chronicleState.bossMaxHp = stage.boss.hp;
    chronicleState.bossActive = true;
    chronicleState.stageContributions = {};

    return { success: true, boss: stage.boss, stage: stage.name, lore: stage.lore };
}

// 데미지 기여
function dealDamage(playerId, playerName, damage) {
    if (!chronicleState.bossActive) return { success: false };
    if (damage <= 0 || !Number.isFinite(damage)) return { success: false };

    damage = Math.min(damage, 10000); // 틱당 최대 데미지 캡
    chronicleState.stageContributions[playerId] = (chronicleState.stageContributions[playerId] || 0) + damage;
    chronicleState.totalContributions[playerId] = (chronicleState.totalContributions[playerId] || 0) + damage;
    chronicleState.bossHp = Math.max(0, chronicleState.bossHp - damage);

    const dead = chronicleState.bossHp <= 0;
    if (dead) {
        chronicleState.bossActive = false;
        chronicleState.stageCleared[chronicleState.currentStage] = true;
    }

    return { success: true, hp: chronicleState.bossHp, maxHp: chronicleState.bossMaxHp, dead };
}

// 스테이지 보상 분배
function distributeStageRewards() {
    const stage = getCurrentStage();
    if (!stage) return null;

    const sorted = Object.entries(chronicleState.stageContributions).sort((a, b) => b[1] - a[1]);
    const totalDmg = sorted.reduce((s, [, d]) => s + d, 0);

    const rewards = {};
    for (let i = 0; i < sorted.length; i++) {
        const [pid, dmg] = sorted[i];
        const ratio = totalDmg > 0 ? dmg / totalDmg : 0;
        let tier;
        if (i === 0) tier = 'mvp';
        else if (i < 5) tier = 'top5';
        else if (i < 20) tier = 'top20';
        else tier = 'participant';

        const mult = tier === 'mvp' ? 3 : tier === 'top5' ? 2 : tier === 'top20' ? 1.5 : 1;
        rewards[pid] = {
            tier, rank: i + 1, damage: dmg, ratio,
            reward: {
                gold: Math.floor(stage.reward.gold * mult),
                exp: Math.floor(stage.reward.exp * mult),
                diamonds: Math.floor(stage.reward.diamonds * mult),
                item: tier === 'mvp' ? stage.reward.item : null,
                title: tier === 'mvp' ? stage.reward.title : null,
            },
        };
    }

    return { stageName: stage.name, bossName: stage.boss.name, rewards, totalParticipants: sorted.length };
}

// 다음 스테이지 진행
function advanceStage() {
    if (chronicleState.currentStage < 2) {
        chronicleState.currentStage++;
        return { advanced: true, stage: chronicleState.currentStage };
    }
    return { advanced: false, allCleared: true };
}

// 주간 리셋
function checkWeeklyReset() {
    if (Date.now() >= chronicleState.weeklyResetTime) {
        chronicleState.currentSeason = (chronicleState.currentSeason + 1) % CHRONICLE_SEASONS.length;
        chronicleState.currentStage = 0;
        chronicleState.stageCleared = [false, false, false];
        chronicleState.totalContributions = {};
        chronicleState.stageContributions = {};
        chronicleState.bossActive = false;
        chronicleState.weeklyResetTime = Date.now() + WEEKLY_DURATION;
        return { reset: true, newSeason: getCurrentSeason() };
    }
    return { reset: false };
}

// 상태 조회
function getStatus() {
    const season = getCurrentSeason();
    const stage = getCurrentStage();
    const timeLeft = Math.max(0, chronicleState.weeklyResetTime - Date.now());

    return {
        season: { id: season.id, name: season.name, icon: season.icon, lore: season.lore },
        currentStage: chronicleState.currentStage,
        stageInfo: stage ? { name: stage.name, boss: stage.boss, mechanic: stage.mechanic, lore: stage.lore } : null,
        stageCleared: [...chronicleState.stageCleared],
        bossActive: chronicleState.bossActive,
        bossHp: chronicleState.bossHp,
        bossMaxHp: chronicleState.bossMaxHp,
        timeLeftMs: timeLeft,
        timeLeftHours: Math.floor(timeLeft / 3600000),
        topContributors: Object.entries(chronicleState.totalContributions)
            .sort((a, b) => b[1] - a[1]).slice(0, 10)
            .map(([pid, dmg], i) => ({ rank: i + 1, playerId: pid, damage: dmg })),
        allStages: season.stages.map((s, i) => ({
            name: s.name, bossName: s.boss.name, bossIcon: s.boss.icon,
            cleared: chronicleState.stageCleared[i],
            current: i === chronicleState.currentStage,
        })),
    };
}

module.exports = {
    CHRONICLE_SEASONS,
    activateBoss, dealDamage, distributeStageRewards, advanceStage,
    checkWeeklyReset, getStatus, getCurrentSeason, getCurrentStage,
};

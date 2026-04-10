// ==========================================
// 무기 영혼 각성 — v2.39
// 무기에 영혼을 깨워 대화 + 무기 전용 스킬트리 + 영혼 성장
// ==========================================

// ── 무기 영혼 유형 ──
const SOUL_TYPES = {
    warrior:  { name: '전사의 영혼',   icon: '⚔️👻', personality: 'brave',   baseBonus: { atk: 0.05, critRate: 0.02 }, greeting: '나는 전장의 영혼... 함께 적을 베자!' },
    sage:     { name: '현자의 영혼',   icon: '📖👻', personality: 'wise',    baseBonus: { spellPower: 0.05, mp: 30 }, greeting: '지식을 갈망하는가... 내 지혜를 나누겠다.' },
    assassin: { name: '암살자의 영혼', icon: '🗡️👻', personality: 'cunning', baseBonus: { critDmg: 0.1, evasion: 0.03 }, greeting: '그림자 속에서 기다렸다... 어둠의 기술을 가르쳐주지.' },
    guardian: { name: '수호자의 영혼', icon: '🛡️👻', personality: 'stoic',   baseBonus: { def: 0.08, hp: 50 }, greeting: '지키고자 하는 것이 있는가... 나의 힘을 빌려주마.' },
    dragon:   { name: '용의 영혼',     icon: '🐉👻', personality: 'proud',   baseBonus: { allStat: 3, fireDmg: 0.1 }, greeting: '하찮은 인간이여... 내 불꽃을 감당할 수 있겠느냐!' },
    spirit:   { name: '정령의 영혼',   icon: '🧚👻', personality: 'playful', baseBonus: { healBonus: 0.08, expMult: 0.05 }, greeting: '안녕~ 재미있는 여행을 하자!' },
};

// ── 무기 영혼 스킬트리 ──
const SOUL_SKILL_TREE = {
    // 공통 1단계
    soul_bond:      { name: '영혼 결합', icon: '🔗', tier: 1, cost: 1,  effect: { bondBonus: 0.05 }, desc: '무기와의 유대 +5% 스탯', prereq: null },
    soul_speak:     { name: '영혼 대화', icon: '💬', tier: 1, cost: 1,  effect: { canSpeak: true }, desc: '무기 영혼과 대화 가능', prereq: null },

    // 2단계 — 공격 계열
    soul_strike:    { name: '영혼 타격', icon: '💥', tier: 2, cost: 3,  effect: { soulStrikeDmg: 0.15 }, desc: '10% 확률 추가 영혼 데미지 +15%', prereq: 'soul_bond' },
    soul_edge:      { name: '영혼의 날', icon: '🗡️✨', tier: 2, cost: 3, effect: { armorPen: 0.05 }, desc: '방어 관통 +5%', prereq: 'soul_bond' },

    // 2단계 — 방어 계열
    soul_shield:    { name: '영혼 방벽', icon: '🛡️✨', tier: 2, cost: 3, effect: { soulShield: 100 }, desc: '영혼 보호막 100 HP', prereq: 'soul_bond' },
    soul_regen:     { name: '영혼 재생', icon: '💚', tier: 2, cost: 3, effect: { hpRegen: 2 }, desc: '초당 HP 재생 +2', prereq: 'soul_bond' },

    // 3단계
    soul_burst:     { name: '영혼 폭발', icon: '💥💥', tier: 3, cost: 5, effect: { burstDmg: 0.3, cd: 60 }, desc: '액티브: 30% ATK 폭발 (60초 CD)', prereq: 'soul_strike' },
    soul_drain:     { name: '영혼 흡수', icon: '🩸', tier: 3, cost: 5,  effect: { lifesteal: 0.08 }, desc: '흡혈 +8%', prereq: 'soul_edge' },
    soul_fortress:  { name: '영혼 요새', icon: '🏰', tier: 3, cost: 5,  effect: { soulShield: 300, reflectDmg: 0.05 }, desc: '보호막 300 + 반사 5%', prereq: 'soul_shield' },
    soul_harmony:   { name: '영혼 조화', icon: '🎵', tier: 3, cost: 5,  effect: { allStat: 5, expMult: 0.1 }, desc: 'ALL +5, EXP +10%', prereq: 'soul_regen' },

    // 4단계 — 궁극기
    soul_awakening: { name: '완전 각성', icon: '🌟', tier: 4, cost: 10, effect: { fullAwaken: true, allBonus: 0.15, ultimateSkill: true }, desc: '영혼 완전 각성! ALL +15% + 궁극기 해금', prereq: 'soul_burst' },
    soul_merge:     { name: '영혼 합일', icon: '👤🔮', tier: 4, cost: 10, effect: { mergeForm: true, duration: 30, allBonus: 0.25 }, desc: '무기와 합체! 30초간 ALL +25%', prereq: 'soul_fortress' },
};

// ── 영혼 대화 (랜덤 대사) ──
const SOUL_DIALOGUES = {
    brave: {
        idle: ['더 강한 적은 없는가?', '검을 쉬게 하지 마라.', '전장이 그립군...', '네 성장이 느껴진다.'],
        battle: ['좋아! 피가 끓는다!', '이 정도면 준비운동이지!', '함께라면 두렵지 않다!'],
        levelup: ['강해지고 있군... 좋아!', '이 힘이면 더 깊은 곳으로 갈 수 있다.'],
        lowHp: ['물러나라, 아직 때가 아니다!', '포기하지 마! 우리는 아직 죽지 않았다!'],
    },
    wise: {
        idle: ['지식은 끝이 없지...', '이 세계의 비밀을 알고 싶지 않은가?', '명상으로 마음을 단련하라.'],
        battle: ['적의 약점을 분석 중이다.', '지혜로운 전투를 하자.', '마법의 흐름을 읽어라.'],
        levelup: ['지식이 쌓이는군. 계속 정진하라.', '이해의 폭이 넓어지고 있다.'],
        lowHp: ['전략적 후퇴도 지혜다.', '생존이 최우선이다.'],
    },
    cunning: {
        idle: ['그림자는 항상 기회를 엿본다...', '방심은 금물이야.', '뒤를 조심해.'],
        battle: ['급소를 노려!', '한 방에 끝내자.', '그림자에서 공격!'],
        levelup: ['더 은밀해지고 있어.', '이제 누구도 우리를 못 잡아.'],
        lowHp: ['도망칠 기회를 찾아!', '죽으면 끝이야, 빠져!'],
    },
    stoic: {
        idle: ['...', '지키는 것에 의미가 있다.', '인내는 힘이다.'],
        battle: ['앞장서겠다.', '내 방패를 믿어라.', '흔들리지 않는다.'],
        levelup: ['더 단단해졌군.', '철벽이 되어가고 있다.'],
        lowHp: ['아직... 무너지지 않는다.', '끝까지 지킨다.'],
    },
    proud: {
        idle: ['하찮은 인간이여...', '나를 소환한 것을 후회하지 마라.', '태양보다 뜨거운 불꽃이다.'],
        battle: ['불로 태워버리겠다!', '용의 힘을 보여주마!', '감히 나에게 덤비는가!'],
        levelup: ['흥, 조금은 인정해주지.', '인간치고는 쓸만하군.'],
        lowHp: ['이런... 용이 쓰러질 순 없다!', '분노의 불꽃이 타오른다!'],
    },
    playful: {
        idle: ['심심해~ 어디 가자!', '반짝반짝 빛나는 게 좋아!', '오늘 날씨 좋다~'],
        battle: ['야호~ 모험이다!', '반짝! 마법 공격~!', '이겼다! ...이긴 거 맞지?'],
        levelup: ['우와~ 강해졌어!', '축하해! 파티하자~!'],
        lowHp: ['아야아야... 아프다!', '도망가자 빨리빨리~!'],
    },
};

function _ensure(player) {
    if (!player._weaponSoul) {
        player._weaponSoul = {
            hasSoul: false,
            soulType: null,
            soulName: '',          // 영혼 이름 (플레이어 설정 가능)
            soulLevel: 0,
            soulExp: 0,
            soulPoints: 0,         // 스킬 포인트
            skills: {},            // { skillId: unlockedAt }
            affinity: 0,           // 친밀도 (0-100)
            dialogueHistory: [],   // 최근 대화 기록 (최대 10개)
            totalBattles: 0,
            awakened: false,
        };
    }
    return player._weaponSoul;
}

const SOUL_LEVEL_EXP = [0, 100, 300, 600, 1200, 2000, 3500, 5500, 8000, 12000, 18000]; // Lv 0-10
const SOUL_LEVEL_MAX = 10;

// 영혼 각성 (첫 부여)
function awakenSoul(player, soulTypeId) {
    const state = _ensure(player);
    if (state.hasSoul) return { success: false, msg: '이미 무기에 영혼이 깃들어 있습니다.' };
    if ((player.level || 1) < 20) return { success: false, msg: 'Lv.20 이상 필요합니다.' };

    const soulType = SOUL_TYPES[soulTypeId];
    if (!soulType) return { success: false, msg: '알 수 없는 영혼 유형' };

    // 비용: 50,000G
    if ((player.gold || 0) < 50000) return { success: false, msg: '골드 부족 (50,000G 필요)' };
    player.gold -= 50000;

    state.hasSoul = true;
    state.soulType = soulTypeId;
    state.soulName = soulType.name;
    state.soulLevel = 1;
    state.soulExp = 0;
    state.soulPoints = 1;
    state.affinity = 10;

    return {
        success: true, soulType,
        msg: `${soulType.icon} ${soulType.greeting}\n무기에 "${soulType.name}"이(가) 깃들었습니다!`,
    };
}

// 영혼 이름 변경
function renameSoul(player, newName) {
    const state = _ensure(player);
    if (!state.hasSoul) return { success: false, msg: '영혼이 없습니다.' };
    if (!newName || typeof newName !== 'string' || newName.length > 12) return { success: false, msg: '이름은 1~12자' };

    const oldName = state.soulName;
    state.soulName = newName;
    return { success: true, msg: `영혼 이름 변경: ${oldName} → ${newName}` };
}

// 영혼 대화
function talkToSoul(player, context) {
    const state = _ensure(player);
    if (!state.hasSoul) return { success: false, msg: '무기에 영혼이 없습니다.' };
    if (!state.skills.soul_speak) {
        return { success: false, msg: '영혼 대화 스킬을 먼저 해금하세요.' };
    }

    const soulType = SOUL_TYPES[state.soulType];
    const dialogues = SOUL_DIALOGUES[soulType.personality];
    const ctx = context || 'idle';
    const lines = dialogues[ctx] || dialogues.idle;
    const line = lines[Math.floor(Math.random() * lines.length)];

    // 친밀도 증가
    state.affinity = Math.min(100, state.affinity + 1);

    const entry = { time: Date.now(), context: ctx, line };
    state.dialogueHistory.push(entry);
    if (state.dialogueHistory.length > 10) state.dialogueHistory.shift();

    return {
        success: true,
        soulName: state.soulName,
        soulIcon: soulType.icon,
        line,
        affinity: state.affinity,
        msg: `${soulType.icon} ${state.soulName}: "${line}"`,
    };
}

// 영혼 경험치 획득 (전투 후 호출)
function gainSoulExp(player, amount) {
    const state = _ensure(player);
    if (!state.hasSoul) return null;
    if (state.soulLevel >= SOUL_LEVEL_MAX) return null;

    // 친밀도 보너스
    const affinityBonus = 1 + state.affinity * 0.005;
    state.soulExp += Math.floor(amount * affinityBonus);
    state.totalBattles++;

    let leveledUp = false;
    while (state.soulLevel < SOUL_LEVEL_MAX && state.soulExp >= SOUL_LEVEL_EXP[state.soulLevel + 1]) {
        state.soulLevel++;
        state.soulPoints += (state.soulLevel >= 8 ? 2 : 1);
        leveledUp = true;
    }

    if (leveledUp) {
        state.affinity = Math.min(100, state.affinity + 5);
    }

    return { leveledUp, soulLevel: state.soulLevel, soulExp: state.soulExp };
}

// 스킬 해금
function unlockSoulSkill(player, skillId) {
    const state = _ensure(player);
    if (!state.hasSoul) return { success: false, msg: '영혼이 없습니다.' };

    const skill = SOUL_SKILL_TREE[skillId];
    if (!skill) return { success: false, msg: '알 수 없는 스킬' };
    if (state.skills[skillId]) return { success: false, msg: '이미 해금됨' };
    if (skill.prereq && !state.skills[skill.prereq]) {
        return { success: false, msg: `선행 스킬 필요: ${SOUL_SKILL_TREE[skill.prereq]?.name}` };
    }
    if (state.soulPoints < skill.cost) {
        return { success: false, msg: `포인트 부족 (${state.soulPoints}/${skill.cost})` };
    }

    state.soulPoints -= skill.cost;
    state.skills[skillId] = Date.now();

    // 완전 각성 체크
    if (skill.effect.fullAwaken || skill.effect.mergeForm) {
        state.awakened = true;
    }

    return {
        success: true, skill,
        msg: `${skill.icon} ${skill.name} 해금! — ${skill.desc}`,
    };
}

// 영혼 합일 (궁극기, 30초 버프)
function soulMerge(player) {
    const state = _ensure(player);
    if (!state.hasSoul) return { success: false, msg: '영혼이 없습니다.' };
    if (!state.skills.soul_merge) return { success: false, msg: '영혼 합일 스킬이 필요합니다.' };

    // 쿨다운 5분
    if (state._lastMerge && Date.now() - state._lastMerge < 300000) {
        const remain = Math.ceil((300000 - (Date.now() - state._lastMerge)) / 1000);
        return { success: false, msg: `영혼 합일 대기: ${remain}초` };
    }

    state._lastMerge = Date.now();
    const soulType = SOUL_TYPES[state.soulType];

    return {
        success: true,
        duration: 30,
        bonus: 0.25,
        msg: `${soulType.icon} 영혼 합일! 30초간 무기와 하나가 됩니다! ALL +25%`,
    };
}

// 상태 조회
function getStatus(player) {
    const state = _ensure(player);
    const soulType = state.soulType ? SOUL_TYPES[state.soulType] : null;
    return {
        hasSoul: state.hasSoul,
        soulType: soulType,
        soulTypeId: state.soulType,
        soulName: state.soulName,
        soulLevel: state.soulLevel,
        soulExp: state.soulExp,
        nextLevelExp: state.soulLevel < SOUL_LEVEL_MAX ? SOUL_LEVEL_EXP[state.soulLevel + 1] : null,
        soulPoints: state.soulPoints,
        affinity: state.affinity,
        totalBattles: state.totalBattles,
        awakened: state.awakened,
        skills: Object.entries(SOUL_SKILL_TREE).map(([id, s]) => ({
            id, ...s,
            unlocked: !!state.skills[id],
            available: !state.skills[id] && (!s.prereq || !!state.skills[s.prereq]) && state.soulPoints >= s.cost,
        })),
        availableSoulTypes: !state.hasSoul ? Object.entries(SOUL_TYPES).map(([id, t]) => ({ id, ...t })) : [],
        dialogueHistory: state.dialogueHistory.slice(-5),
    };
}

module.exports = {
    SOUL_TYPES, SOUL_SKILL_TREE, SOUL_DIALOGUES,
    awakenSoul, renameSoul, talkToSoul, gainSoulExp,
    unlockSoulSkill, soulMerge, getStatus,
};

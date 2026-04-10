// ==========================================
// 운명의 직공 — v2.56
// 축복/저주 직조 + 운명의 실 + 반작용 + 운명 열람
// ==========================================

const FATE_THREADS = {
    // 축복 실
    thread_fortune:   { name: '행운의 실',     icon: '🧵🍀', type: 'blessing', tier: 1, cost: 2000,  effect: { goldBonus: 0.1, duration: 3600 }, backlash: { goldPenalty: 0.05 }, desc: '대상 골드 +10% (1시간)' },
    thread_vigor:     { name: '활력의 실',     icon: '🧵💪', type: 'blessing', tier: 1, cost: 3000,  effect: { atkBuff: 0.08, duration: 3600 }, backlash: { atkDebuff: 0.04 }, desc: '대상 ATK +8% (1시간)' },
    thread_wisdom:    { name: '지혜의 실',     icon: '🧵🧠', type: 'blessing', tier: 2, cost: 5000,  effect: { expMult: 0.15, duration: 3600 }, backlash: { expPenalty: 0.05 }, desc: '대상 EXP +15% (1시간)' },
    thread_guardian:  { name: '수호의 실',     icon: '🧵🛡️', type: 'blessing', tier: 2, cost: 6000,  effect: { defBuff: 0.12, hpRegen: 3, duration: 3600 }, backlash: { defDebuff: 0.05 }, desc: '대상 DEF +12%, 재생 +3 (1시간)' },
    thread_miracle:   { name: '기적의 실',     icon: '🧵🌟', type: 'blessing', tier: 3, cost: 15000, effect: { allStat: 8, duration: 7200 }, backlash: { allPenalty: 3 }, desc: '대상 ALL +8 (2시간)' },
    // 저주 실
    thread_misfortune:{ name: '불운의 실',     icon: '🧵💀', type: 'curse',    tier: 1, cost: 2000,  effect: { goldPenalty: 0.1, duration: 1800 }, backlash: { goldPenalty: 0.15 }, desc: '대상 골드 -10% (30분)', karmaLoss: 5 },
    thread_weakness:  { name: '쇠약의 실',     icon: '🧵😰', type: 'curse',    tier: 1, cost: 3000,  effect: { atkDebuff: 0.1, duration: 1800 }, backlash: { atkDebuff: 0.12 }, desc: '대상 ATK -10% (30분)', karmaLoss: 5 },
    thread_confusion: { name: '혼란의 실',     icon: '🧵🌀', type: 'curse',    tier: 2, cost: 5000,  effect: { accuracy: -0.15, duration: 1800 }, backlash: { accuracy: -0.2 }, desc: '대상 명중 -15% (30분)', karmaLoss: 10 },
    thread_decay:     { name: '부식의 실',     icon: '🧵🦠', type: 'curse',    tier: 3, cost: 12000, effect: { hpDrain: 2, defDebuff: 0.15, duration: 1800 }, backlash: { hpDrain: 3 }, desc: '대상 HP 드레인+DEF -15% (30분)', karmaLoss: 15 },
    // 운명 변조 (특수)
    thread_swap:      { name: '운명 교환',     icon: '🧵🔄', type: 'fate',     tier: 3, cost: 20000, effect: { swapBuff: true }, backlash: null, desc: '자신과 대상의 현재 버프/디버프 교환' },
    thread_mirror:    { name: '거울 운명',     icon: '🧵🪞', type: 'fate',     tier: 3, cost: 25000, effect: { mirrorFate: true, duration: 3600 }, backlash: null, desc: '대상이 받는 버프/디버프를 자신도 동시에 받음' },
};

const FATE_PROPHECIES = [
    '큰 전투가 다가온다. 준비하라.',
    '뜻밖의 행운이 찾아올 것이다.',
    '배신에 주의하라. 그림자가 움직인다.',
    '잃어버린 것을 되찾을 기회가 온다.',
    '강한 적을 만나겠지만, 그것이 성장의 기회다.',
    '누군가가 당신에게 운명의 실을 직고 있다.',
    '달이 뜰 때 숨겨진 보물이 드러난다.',
    '오래된 인연이 다시 나타난다.',
    '지금의 선택이 미래를 크게 바꾼다.',
    '공허의 그림자가 당신을 주시하고 있다.',
];

const WEAVER_RANKS = [
    { min: 0,   name: '실뽑기',     icon: '🧵' },
    { min: 10,  name: '견습 직공',   icon: '🧶' },
    { min: 30,  name: '운명 직공',   icon: '🪡' },
    { min: 60,  name: '운명 조종자', icon: '🕸️' },
    { min: 100, name: '운명의 지배자', icon: '👑🧵' },
];

function _ensure(player) {
    if (!player._fateWeaver) {
        player._fateWeaver = {
            threads: {},            // { threadId: count }
            weavings: 0,            // 직조 총 횟수
            blessingsGiven: 0,
            cursesGiven: 0,
            activeEffects: [],      // [{ type, effect, expiresAt, fromPlayer }]
            backlashActive: [],
            karma: 0,               // 운명 카르마 (저주 시 감소)
            prophecyToday: null,
            lastProphecy: 0,
        };
    }
    return player._fateWeaver;
}

function _getWeaverRank(weavings) {
    let rank = WEAVER_RANKS[0];
    for (const r of WEAVER_RANKS) { if (weavings >= r.min) rank = r; }
    return rank;
}

// 실 구매
function buyThread(player, threadId, count) {
    const state = _ensure(player);
    const thread = FATE_THREADS[threadId];
    if (!thread) return { success: false, msg: '알 수 없는 실' };
    const n = count || 1;
    const cost = thread.cost * n;
    if ((player.gold || 0) < cost) return { success: false, msg: `골드 부족 (${cost}G)` };

    player.gold -= cost;
    state.threads[threadId] = (state.threads[threadId] || 0) + n;
    return { success: true, msg: `${thread.icon} ${thread.name} x${n} 구매! (-${cost}G)` };
}

// 운명 직조 (다른 플레이어에게)
function weave(caster, target, threadId) {
    const cState = _ensure(caster);
    const tState = _ensure(target);
    const thread = FATE_THREADS[threadId];
    if (!thread) return { success: false, msg: '알 수 없는 실' };
    if (!cState.threads[threadId] || cState.threads[threadId] <= 0) return { success: false, msg: '실 부족' };

    cState.threads[threadId]--;
    if (cState.threads[threadId] <= 0) delete cState.threads[threadId];
    cState.weavings++;

    // 대상에게 효과 적용
    const expiresAt = Date.now() + (thread.effect.duration || 1800) * 1000;
    tState.activeEffects.push({
        threadId, type: thread.type,
        effect: thread.effect,
        expiresAt,
        fromPlayer: caster.displayName,
    });
    // 만료된 효과 정리
    tState.activeEffects = tState.activeEffects.filter(e => e.expiresAt > Date.now());

    // 반작용 (caster에게)
    if (thread.backlash) {
        cState.backlashActive.push({
            effect: thread.backlash,
            expiresAt: Date.now() + 1800000, // 30분
        });
    }

    if (thread.type === 'blessing') cState.blessingsGiven++;
    if (thread.type === 'curse') {
        cState.cursesGiven++;
        cState.karma -= (thread.karmaLoss || 5);
    }

    const typeLabel = thread.type === 'blessing' ? '축복' : thread.type === 'curse' ? '저주' : '운명';
    return {
        success: true, thread, type: thread.type,
        targetName: target.displayName,
        msg: `${thread.icon} ${target.displayName}에게 "${thread.name}" ${typeLabel} 직조!${thread.backlash ? ' (반작용 발생!)' : ''}`,
    };
}

// 자기 자신에게 축복
function selfBless(player, threadId) {
    const state = _ensure(player);
    const thread = FATE_THREADS[threadId];
    if (!thread || thread.type !== 'blessing') return { success: false, msg: '축복 실만 자신에게 사용 가능' };
    if (!state.threads[threadId] || state.threads[threadId] <= 0) return { success: false, msg: '실 부족' };

    state.threads[threadId]--;
    if (state.threads[threadId] <= 0) delete state.threads[threadId];
    state.weavings++;
    state.blessingsGiven++;

    const expiresAt = Date.now() + (thread.effect.duration || 1800) * 1000;
    state.activeEffects.push({ threadId, type: 'blessing', effect: thread.effect, expiresAt, fromPlayer: '자신' });
    state.activeEffects = state.activeEffects.filter(e => e.expiresAt > Date.now());

    return { success: true, thread, msg: `${thread.icon} 자신에게 "${thread.name}" 축복! — ${thread.desc}` };
}

// 운명 열람
function readFate(player) {
    const state = _ensure(player);
    const today = new Date().toDateString();
    if (state.lastProphecy === today) return { success: false, msg: '오늘은 이미 운명을 열람했습니다.' };

    state.lastProphecy = today;
    const prophecy = FATE_PROPHECIES[Math.floor(Math.random() * FATE_PROPHECIES.length)];
    state.prophecyToday = prophecy;

    return { success: true, prophecy, msg: `🔮 오늘의 운명: "${prophecy}"` };
}

function getStatus(player) {
    const state = _ensure(player);
    // 만료 정리
    state.activeEffects = state.activeEffects.filter(e => e.expiresAt > Date.now());
    state.backlashActive = state.backlashActive.filter(e => e.expiresAt > Date.now());

    return {
        threads: Object.entries(state.threads).map(([id, c]) => ({ id, count: c, ...FATE_THREADS[id] })),
        weavings: state.weavings,
        blessingsGiven: state.blessingsGiven,
        cursesGiven: state.cursesGiven,
        karma: state.karma,
        rank: _getWeaverRank(state.weavings),
        activeEffects: state.activeEffects.map(e => ({
            ...e, thread: FATE_THREADS[e.threadId], remainSec: Math.ceil((e.expiresAt - Date.now()) / 1000),
        })),
        backlashActive: state.backlashActive.map(e => ({ ...e, remainSec: Math.ceil((e.expiresAt - Date.now()) / 1000) })),
        prophecyToday: state.prophecyToday,
        shop: FATE_THREADS,
    };
}

module.exports = { FATE_THREADS, FATE_PROPHECIES, buyThread, weave, selfBless, readFate, getStatus };

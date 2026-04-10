// ==========================================
// 살아있는 마도서 — v2.54
// 자아 있는 마도서 동행 NPC + 보조 마법 + 친밀도 + 6권 수집
// ==========================================

const GRIMOIRES = {
    ignis:   { name: '이그니스',   icon: '📕🔥', element: 'fire',   personality: 'hot-headed', baseSpell: { name: '화염 보조', dmg: 1.5, element: 'fire' },   greeting: '뜨겁지? 나와 함께면 모든 걸 태울 수 있어!', color: 'red' },
    glacies: { name: '글라시스',   icon: '📘❄️', element: 'ice',    personality: 'calm',       baseSpell: { name: '빙결 보조', dmg: 1.2, slow: 0.2 },       greeting: '...차분하게 가자. 서두르면 실수해.', color: 'blue' },
    fulgur:  { name: '풀구르',     icon: '📗⚡', element: 'thunder', personality: 'energetic',  baseSpell: { name: '번개 보조', dmg: 1.8, stun: 1 },          greeting: '빠르게! 빠르게! 적을 감전시키자!', color: 'green' },
    umbra:   { name: '움브라',     icon: '📓🌑', element: 'dark',   personality: 'mysterious',  baseSpell: { name: '암흑 보조', dmg: 1.3, lifesteal: 0.1 },   greeting: '...그림자는 모든 것을 알고 있어.', color: 'purple' },
    lux:     { name: '룩스',       icon: '📒✨', element: 'light',  personality: 'cheerful',   baseSpell: { name: '성광 보조', dmg: 1.0, heal: 0.05 },       greeting: '안녕! 함께하면 어둠도 무섭지 않아~!', color: 'gold' },
    chaos:   { name: '카오스',     icon: '📙🌀', element: 'chaos',  personality: 'unstable',   baseSpell: { name: '혼돈 보조', dmg: 2.0, random: true },     greeting: '하하하... 뭐가 나올지 나도 몰라!', color: 'rainbow' },
};

const GRIMOIRE_PAGES = {
    // 레벨별 해금 페이지
    page_2:  { level: 2,  name: '원소 강화',     effect: { elementDmg: 0.1 }, desc: '원소 데미지 +10%' },
    page_3:  { level: 3,  name: '자동 시전',     effect: { autoCast: true }, desc: '자동으로 보조 마법 시전' },
    page_5:  { level: 5,  name: '방어 마법',     effect: { defSpell: true, def: 30 }, desc: '피격 시 방어 마법 발동' },
    page_7:  { level: 7,  name: '원소 폭발',     effect: { burstDmg: 3.0, cd: 45 }, desc: '원소 폭발 (ATK x3, 45초 CD)' },
    page_10: { level: 10, name: '금지된 장',     effect: { forbiddenSpell: true, dmg: 5.0, selfDmg: 0.1 }, desc: '금지 마법 해방 (ATK x5, 자해 10%)' },
};

const DIALOGUES = {
    'hot-headed': { idle: ['지루해... 뭐 태울 거 없어?', '내 불꽃이 꺼지기 전에 가자!'], battle: ['태워버려!', '뜨거운 맛을 보여줘!'], levelup: ['더 뜨거워졌어!', '화력 최강!'] },
    calm:         { idle: ['...조용한 게 좋아.', '천천히, 하지만 확실하게.'], battle: ['얼어붙어라.', '침착하게.'], levelup: ['...성장했군.', '냉정함이 힘이야.'] },
    energetic:    { idle: ['빨리빨리! 가자!', '감전될 준비 됐어?'], battle: ['찌릿! 감전!', '번개처럼 빠르게!'], levelup: ['전압 상승!', '파워업!'] },
    mysterious:   { idle: ['...', '그림자가 속삭여.', '비밀이 있어.'], battle: ['어둠이 삼켜라.', '...사라져.'], levelup: ['어둠이 깊어져.', '...더 강해졌어.'] },
    cheerful:     { idle: ['오늘도 좋은 날~!', '같이 모험하자!'], battle: ['빛이여!', '힘내!'], levelup: ['축하해~!', '더 빛나고 있어!'] },
    unstable:     { idle: ['...뭐지? 어디지? 누구지?', '하하하하!'], battle: ['뭐가 나올까~?', '혼돈이다!'], levelup: ['...진화? 퇴화? 모르겠어!', '카오스!'] },
};

const GRIMOIRE_MAX_LEVEL = 10;
const GRIMOIRE_EXP = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 18000];

function _ensure(player) {
    if (!player._livingGrimoire) {
        player._livingGrimoire = {
            activeGrimoire: null,
            grimoires: {},          // { grimoireId: { level, exp, affinity, pages } }
            totalBattles: 0,
        };
    }
    return player._livingGrimoire;
}

function bindGrimoire(player, grimoireId) {
    const state = _ensure(player);
    const grim = GRIMOIRES[grimoireId];
    if (!grim) return { success: false, msg: '알 수 없는 마도서' };
    if ((player.level || 1) < 15) return { success: false, msg: 'Lv.15 이상 필요' };
    if ((player.gold || 0) < 20000) return { success: false, msg: '골드 부족 (20,000G)' };

    player.gold -= 20000;
    if (!state.grimoires[grimoireId]) {
        state.grimoires[grimoireId] = { level: 1, exp: 0, affinity: 0, pages: {} };
    }
    state.activeGrimoire = grimoireId;

    return { success: true, grimoire: grim, msg: `${grim.icon} ${grim.name}: "${grim.greeting}"` };
}

function switchGrimoire(player, grimoireId) {
    const state = _ensure(player);
    if (!state.grimoires[grimoireId]) return { success: false, msg: '보유하지 않은 마도서' };
    state.activeGrimoire = grimoireId;
    const grim = GRIMOIRES[grimoireId];
    return { success: true, msg: `${grim.icon} ${grim.name}으로 교체!` };
}

function talkToGrimoire(player, context) {
    const state = _ensure(player);
    if (!state.activeGrimoire) return { success: false, msg: '마도서가 없습니다.' };
    const grim = GRIMOIRES[state.activeGrimoire];
    const gState = state.grimoires[state.activeGrimoire];
    const lines = DIALOGUES[grim.personality][context || 'idle'] || DIALOGUES[grim.personality].idle;
    const line = lines[Math.floor(Math.random() * lines.length)];
    gState.affinity = Math.min(100, gState.affinity + 1);
    return { success: true, grimoire: grim, line, affinity: gState.affinity, msg: `${grim.icon} ${grim.name}: "${line}"` };
}

function gainGrimoireExp(player, amount) {
    const state = _ensure(player);
    if (!state.activeGrimoire) return null;
    const gState = state.grimoires[state.activeGrimoire];
    if (gState.level >= GRIMOIRE_MAX_LEVEL) return null;

    const affinityBonus = 1 + gState.affinity * 0.005;
    gState.exp += Math.floor(amount * affinityBonus);
    state.totalBattles++;

    let leveledUp = false;
    let newPages = [];
    while (gState.level < GRIMOIRE_MAX_LEVEL && gState.exp >= GRIMOIRE_EXP[gState.level + 1]) {
        gState.level++;
        leveledUp = true;
        // 페이지 해금 체크
        for (const [pageId, page] of Object.entries(GRIMOIRE_PAGES)) {
            if (page.level === gState.level && !gState.pages[pageId]) {
                gState.pages[pageId] = true;
                newPages.push(page);
            }
        }
    }
    return { leveledUp, level: gState.level, newPages };
}

function castGrimoireSpell(player) {
    const state = _ensure(player);
    if (!state.activeGrimoire) return { success: false, msg: '마도서가 없습니다.' };
    const grim = GRIMOIRES[state.activeGrimoire];
    const gState = state.grimoires[state.activeGrimoire];
    const spell = grim.baseSpell;
    const dmg = Math.floor((player.atk || 10) * spell.dmg * (1 + gState.level * 0.1));
    return { success: true, grimoire: grim, damage: dmg, spell, msg: `${grim.icon} ${spell.name}! ${dmg} 데미지!` };
}

function getStatus(player) {
    const state = _ensure(player);
    const active = state.activeGrimoire;
    const gState = active ? state.grimoires[active] : null;
    return {
        activeGrimoire: active ? { id: active, ...GRIMOIRES[active], ...gState, nextExp: gState.level < GRIMOIRE_MAX_LEVEL ? GRIMOIRE_EXP[gState.level + 1] : null } : null,
        ownedGrimoires: Object.entries(state.grimoires).map(([id, g]) => ({ id, ...GRIMOIRES[id], ...g })),
        availableGrimoires: Object.entries(GRIMOIRES).filter(([id]) => !state.grimoires[id]).map(([id, g]) => ({ id, ...g })),
        totalBattles: state.totalBattles,
        pages: GRIMOIRE_PAGES,
    };
}

module.exports = { GRIMOIRES, GRIMOIRE_PAGES, bindGrimoire, switchGrimoire, talkToGrimoire, gainGrimoireExp, castGrimoireSpell, getStatus };

// ==========================================
// 금서의 도서관 — v2.48
// 금지된 지식 + 정신 오염 + 광기 보스 + 잊혀진 마법 복원
// ==========================================

// ── 금서 섹션 (도서관 구역) ──
const LIBRARY_SECTIONS = {
    hall_of_whispers:  { name: '속삭임의 전당',   icon: '🏛️👂', tier: 1, minLevel: 20, corruptionRate: 5,  desc: '벽에서 속삭임이 들린다. 초급 금서가 잠들어 있다.' },
    chamber_of_eyes:   { name: '눈의 방',         icon: '👁️📚', tier: 2, minLevel: 30, corruptionRate: 10, desc: '벽에 박힌 수천 개의 눈이 당신을 관찰한다.' },
    abyss_archive:     { name: '심연 서고',       icon: '🕳️📖', tier: 3, minLevel: 40, corruptionRate: 15, desc: '책장이 무한히 이어진다. 여기서 돌아오지 못한 자가 많다.' },
    throne_of_madness: { name: '광기의 옥좌',     icon: '👑🌀', tier: 4, minLevel: 50, corruptionRate: 25, desc: '도서관의 심장부. 지식의 끝이자 광기의 시작.' },
};

// ── 금서 (읽으면 강해지지만 오염 증가) ──
const FORBIDDEN_TOMES = {
    // Tier 1
    tome_shadow_words:    { name: '그림자 언어',       icon: '📕🌑', tier: 1, section: 'hall_of_whispers', corruption: 5,  reward: { darkAtk: 0.05 }, spell: null, desc: '어둠의 단어를 이해하게 된다' },
    tome_blood_letters:   { name: '피의 문자',         icon: '📕🩸', tier: 1, section: 'hall_of_whispers', corruption: 8,  reward: { lifesteal: 0.03 }, spell: null, desc: '피로 쓰인 원시 마법서' },
    tome_whisper_dead:    { name: '죽은 자의 속삭임',   icon: '📕💀', tier: 1, section: 'hall_of_whispers', corruption: 6,  reward: { mpRegen: 2 }, spell: 'death_whisper', desc: '망자와 대화하는 법을 배운다' },
    // Tier 2
    tome_mind_fracture:   { name: '정신 균열론',       icon: '📗🧠', tier: 2, section: 'chamber_of_eyes',  corruption: 12, reward: { spellPower: 0.08 }, spell: 'mind_shatter', desc: '정신을 공격하는 금지 마법' },
    tome_void_geometry:   { name: '공허 기하학',       icon: '📗🔮', tier: 2, section: 'chamber_of_eyes',  corruption: 15, reward: { evasion: 0.05 }, spell: 'spatial_tear', desc: '공간을 비트는 불가능한 수학' },
    tome_flesh_binding:   { name: '육체 속박술',       icon: '📗⛓️', tier: 2, section: 'chamber_of_eyes',  corruption: 10, reward: { def: 20 }, spell: null, desc: '살아있는 갑옷을 만드는 법' },
    // Tier 3
    tome_reality_rewrite: { name: '현실 개변서',       icon: '📘🌀', tier: 3, section: 'abyss_archive',    corruption: 20, reward: { allStat: 5 }, spell: 'reality_warp', desc: '현실의 법칙을 고쳐 쓴다' },
    tome_soul_harvest:    { name: '영혼 수확론',       icon: '📘👻', tier: 3, section: 'abyss_archive',    corruption: 18, reward: { critDmg: 0.12 }, spell: 'soul_reap', desc: '적의 영혼을 거두는 금술' },
    tome_time_paradox:    { name: '시간 모순론',       icon: '📘⏳', tier: 3, section: 'abyss_archive',    corruption: 22, reward: { cooldownReduce: 0.1 }, spell: 'time_paradox', desc: '시간의 흐름 자체를 왜곡' },
    // Tier 4
    tome_true_name:       { name: '만물의 진명',       icon: '📙✨', tier: 4, section: 'throne_of_madness', corruption: 30, reward: { allStat: 10, trueSight: true }, spell: 'true_name', desc: '모든 존재의 본명을 알면 지배할 수 있다' },
    tome_cosmic_truth:    { name: '우주의 진실',       icon: '📙🌌', tier: 4, section: 'throne_of_madness', corruption: 35, reward: { allBonus: 0.1 }, spell: 'cosmic_revelation', desc: '알아서는 안 될 우주의 비밀. 읽은 자는 돌아오지 못한다' },
};

// ── 복원 가능한 잊혀진 마법 ──
const FORGOTTEN_SPELLS = {
    death_whisper:     { name: '죽음의 속삭임',   icon: '💀💬', effect: { fear: 5, atkReduce: 0.2 }, cd: 30, desc: '적 5초 공포 + ATK -20%' },
    mind_shatter:      { name: '정신 분쇄',       icon: '🧠💥', effect: { dmg: 4.0, confuse: 3 }, cd: 25, desc: 'ATK x4 + 3초 혼란' },
    spatial_tear:      { name: '공간 찢기',       icon: '🌀🔪', effect: { dmg: 3.0, teleport: true }, cd: 20, desc: 'ATK x3 + 적 뒤로 순간이동' },
    reality_warp:      { name: '현실 왜곡',       icon: '🌀✨', effect: { invertDmg: true, duration: 5 }, cd: 60, desc: '5초간 받는 데미지→회복' },
    soul_reap:         { name: '영혼 수확',       icon: '👻⚔️', effect: { dmg: 5.0, soulCollect: true }, cd: 35, desc: 'ATK x5 + 영혼 수집' },
    time_paradox:      { name: '시간 역설',       icon: '⏳💥', effect: { rewindHp: true, extraTurn: true }, cd: 90, desc: 'HP를 10초 전으로 되돌림' },
    true_name:         { name: '진명 선언',       icon: '✨📜', effect: { defIgnore: true, dmg: 8.0, silence: 5 }, cd: 120, desc: '방어 무시 ATK x8 + 5초 침묵' },
    cosmic_revelation: { name: '우주적 계시',     icon: '🌌👁️', effect: { allBuff: 0.3, visionAll: true, duration: 15 }, cd: 180, desc: '15초 ALL +30% + 전체 맵 시야' },
};

// ── 오염 단계 ──
const CORRUPTION_STAGES = [
    { min: 0,   name: '정상',       icon: '😊', effect: null, desc: '정신이 멀쩡하다' },
    { min: 20,  name: '불안',       icon: '😰', effect: { accuracy: -0.05 }, desc: '가끔 환청이 들린다' },
    { min: 40,  name: '환각',       icon: '🌀', effect: { accuracy: -0.1, seeThings: true }, desc: '존재하지 않는 것이 보인다' },
    { min: 60,  name: '침식',       icon: '😱', effect: { accuracy: -0.15, hpDrain: 1 }, desc: '현실과 환상의 경계가 흐려진다' },
    { min: 80,  name: '광기 직전',   icon: '🤪', effect: { accuracy: -0.2, hpDrain: 3, atkBonus: 0.2 }, desc: '이성이 무너지기 직전. 하지만 힘이...' },
    { min: 100, name: '완전한 광기', icon: '💀🌀', effect: { madness: true }, desc: '광기의 군주가 깨어난다!' },
];

// ── 광기 보스 ──
const MADNESS_BOSS = {
    name: '광기의 군주 데멘시아', icon: '👁️‍🗨️💀',
    hp: 80000, atk: 800, def: 250,
    skills: ['현실 붕괴', '정신 폭풍', '기억 소거', '존재 부정'],
    phases: [
        { hp: 1.0, name: '각성', desc: '수많은 눈이 뜨인다', atkMult: 1.0 },
        { hp: 0.6, name: '분노', desc: '도서관 자체가 흔들린다', atkMult: 1.5 },
        { hp: 0.3, name: '광란', desc: '현실이 산산조각난다', atkMult: 2.0 },
    ],
    drops: ['tome_of_clarity', 'madness_crown', 'eye_of_truth'],
};

const MADNESS_DROPS = {
    tome_of_clarity: { name: '명석의 서',     icon: '📖✨', effect: { allStat: 15, corruptionImmune: true }, desc: '오염 면역 + ALL +15' },
    madness_crown:   { name: '광기의 왕관',   icon: '👑🌀', effect: { spellPower: 0.25, madnessControl: true }, desc: '마법 위력 +25%, 광기 제어 가능' },
    eye_of_truth:    { name: '진실의 눈',     icon: '👁️✨', effect: { trueSight: true, allStat: 8 }, desc: '모든 숨겨진 것을 본다 + ALL +8' },
};

function _ensure(player) {
    if (!player._forbiddenLib) {
        player._forbiddenLib = {
            corruption: 0,          // 정신 오염도 (0~100)
            tomesRead: {},          // { tomeId: readAt }
            spellsLearned: {},      // { spellId: true }
            knowledgeFragments: 0,  // 지식 조각 (마법 복원 재료)
            sectionsVisited: {},    // { sectionId: visitCount }
            madnessBossKills: 0,
            inSection: false,
            currentSection: null,
            totalReads: 0,
            purifications: 0,
            relics: {},             // 광기 보스 드롭
        };
    }
    return player._forbiddenLib;
}

function _getCorruptionStage(corruption) {
    let stage = CORRUPTION_STAGES[0];
    for (const s of CORRUPTION_STAGES) {
        if (corruption >= s.min) stage = s;
    }
    return stage;
}

// 도서관 입장
function enterSection(player, sectionId) {
    const state = _ensure(player);
    if (state.inSection) return { success: false, msg: '이미 도서관 안에 있습니다.' };

    const section = LIBRARY_SECTIONS[sectionId];
    if (!section) return { success: false, msg: '알 수 없는 구역' };
    if ((player.level || 1) < section.minLevel) return { success: false, msg: `Lv.${section.minLevel} 이상 필요` };

    state.inSection = true;
    state.currentSection = sectionId;
    state.sectionsVisited[sectionId] = (state.sectionsVisited[sectionId] || 0) + 1;

    // 입장만으로도 소량 오염
    state.corruption = Math.min(100, state.corruption + Math.floor(section.corruptionRate * 0.3));

    const stage = _getCorruptionStage(state.corruption);
    const availableTomes = Object.entries(FORBIDDEN_TOMES)
        .filter(([, t]) => t.section === sectionId && !state.tomesRead[t])
        .map(([id, t]) => ({ id, ...t }));

    return {
        success: true, section, stage,
        corruption: state.corruption,
        availableTomes,
        msg: `${section.icon} ${section.name} 입장... ${section.desc}\n정신 오염: ${stage.icon} ${state.corruption}% (${stage.name})`,
    };
}

// 금서 읽기
function readTome(player, tomeId) {
    const state = _ensure(player);
    if (!state.inSection) return { success: false, msg: '도서관 구역에 입장하세요.' };

    const tome = FORBIDDEN_TOMES[tomeId];
    if (!tome) return { success: false, msg: '알 수 없는 금서' };
    if (tome.section !== state.currentSection) return { success: false, msg: '이 구역에 없는 금서입니다.' };
    if (state.tomesRead[tomeId]) return { success: false, msg: '이미 읽은 금서입니다.' };

    // 오염 증가
    state.corruption = Math.min(100, state.corruption + tome.corruption);
    state.tomesRead[tomeId] = Date.now();
    state.totalReads++;
    state.knowledgeFragments += tome.tier * 3;

    // 마법 습득
    let spellLearned = null;
    if (tome.spell && !state.spellsLearned[tome.spell]) {
        state.spellsLearned[tome.spell] = true;
        spellLearned = FORGOTTEN_SPELLS[tome.spell];
    }

    const stage = _getCorruptionStage(state.corruption);

    // 광기 100% → 보스 등장
    let madnessTriggered = false;
    if (state.corruption >= 100) {
        madnessTriggered = true;
    }

    return {
        success: true, tome, stage,
        corruption: state.corruption,
        spellLearned,
        madnessTriggered,
        reward: tome.reward,
        msg: `${tome.icon} "${tome.name}" 열람! — ${tome.desc}\n오염 +${tome.corruption}% → ${stage.icon} ${state.corruption}% (${stage.name})${spellLearned ? `\n⚡ 잊혀진 마법 습득: ${spellLearned.icon} ${spellLearned.name}!` : ''}${madnessTriggered ? '\n💀🌀 광기의 군주가 깨어난다...!' : ''}`,
    };
}

// 광기 보스 전투
function fightMadnessBoss(player) {
    const state = _ensure(player);
    if (state.corruption < 100) return { success: false, msg: '오염 100%에서만 광기 보스에 도전할 수 있습니다.' };

    const boss = MADNESS_BOSS;
    const playerPower = ((player.atk || 10) + (player.level || 1) * 3) * (1 + Math.random() * 0.5);
    const spellCount = Object.keys(state.spellsLearned).length;
    const spellBonus = spellCount * 0.1; // 습득한 마법이 많을수록 유리
    const totalDmg = Math.floor(playerPower * 15 * (1 + spellBonus));

    const survived = (player.hp || 100) > boss.atk * 0.3;

    if (totalDmg >= boss.hp && survived) {
        state.madnessBossKills++;
        state.corruption = 30; // 오염 대폭 감소

        const goldReward = 80000;
        const expReward = 40000;
        player.gold = Math.min((player.gold || 0) + goldReward, 999999999);
        player.exp = (player.exp || 0) + expReward;

        // 드롭
        const dropKey = boss.drops[Math.floor(Math.random() * boss.drops.length)];
        const drop = MADNESS_DROPS[dropKey];
        state.relics[dropKey] = (state.relics[dropKey] || 0) + 1;

        return {
            success: true, victory: true,
            boss, goldReward, expReward, drop,
            msg: `${boss.icon} ${boss.name} 격파! 광기를 극복했다!\n+${goldReward}G +${expReward}EXP | 오염 → 30%\n${drop.icon} ${drop.name} 획득!`,
        };
    }

    // 패배
    state.corruption = Math.max(50, state.corruption - 10);
    return {
        success: true, victory: false,
        msg: `${boss.icon} ${boss.name}에게 패배... 오염이 약간 줄어들었다. (${state.corruption}%)`,
    };
}

// 정화 (오염 감소)
function purify(player, goldCost) {
    const state = _ensure(player);
    if (state.corruption <= 0) return { success: false, msg: '오염이 없습니다.' };

    const cost = goldCost || 10000;
    if ((player.gold || 0) < cost) return { success: false, msg: `골드 부족 (${cost}G)` };

    player.gold -= cost;
    const reduction = Math.min(state.corruption, 20);
    state.corruption -= reduction;
    state.purifications++;

    const stage = _getCorruptionStage(state.corruption);
    return {
        success: true,
        corruption: state.corruption, stage,
        msg: `✨ 정화 완료! 오염 -${reduction}% → ${stage.icon} ${state.corruption}% (${stage.name})`,
    };
}

// 마법 사용
function castSpell(player, spellId) {
    const state = _ensure(player);
    if (!state.spellsLearned[spellId]) return { success: false, msg: '습득하지 않은 마법' };

    const spell = FORGOTTEN_SPELLS[spellId];
    if (!spell) return { success: false, msg: '알 수 없는 마법' };

    if (state[`_cd_${spellId}`] && Date.now() - state[`_cd_${spellId}`] < spell.cd * 1000) {
        const remain = Math.ceil((spell.cd * 1000 - (Date.now() - state[`_cd_${spellId}`])) / 1000);
        return { success: false, msg: `${spell.name} 대기: ${remain}초` };
    }

    state[`_cd_${spellId}`] = Date.now();
    // 사용 시 소량 오염
    state.corruption = Math.min(100, state.corruption + 2);

    const results = {};
    let msg = `${spell.icon} ${spell.name} 발동!`;
    if (spell.effect.dmg) { results.damage = Math.floor((player.atk || 10) * spell.effect.dmg); msg += ` ${results.damage} 데미지!`; }
    if (spell.effect.allBuff) { results.allBuff = spell.effect.allBuff; msg += ` ALL +${Math.floor(spell.effect.allBuff * 100)}%!`; }
    if (spell.effect.rewindHp) { player.hp = player.maxHp || 100; msg += ' HP 완전 복원!'; }

    return { success: true, spell, results, msg };
}

// 퇴장
function leaveSection(player) {
    const state = _ensure(player);
    if (!state.inSection) return { success: false, msg: '도서관에 있지 않습니다.' };
    state.inSection = false;
    state.currentSection = null;
    return { success: true, msg: '📚 도서관에서 나왔습니다. 머릿속이 뒤숭숭하다...' };
}

// 상태
function getStatus(player) {
    const state = _ensure(player);
    const stage = _getCorruptionStage(state.corruption);
    return {
        corruption: state.corruption,
        stage,
        inSection: state.inSection,
        currentSection: state.currentSection ? LIBRARY_SECTIONS[state.currentSection] : null,
        tomesRead: Object.keys(state.tomesRead).length,
        totalTomes: Object.keys(FORBIDDEN_TOMES).length,
        knowledgeFragments: state.knowledgeFragments,
        spellsLearned: Object.keys(state.spellsLearned).map(id => ({ id, ...FORGOTTEN_SPELLS[id] })),
        madnessBossKills: state.madnessBossKills,
        relics: state.relics,
        totalReads: state.totalReads,
        sections: Object.entries(LIBRARY_SECTIONS).map(([id, s]) => ({ id, ...s, visits: state.sectionsVisited[id] || 0, available: (player.level || 1) >= s.minLevel })),
        tomes: Object.entries(FORBIDDEN_TOMES).map(([id, t]) => ({ id, ...t, read: !!state.tomesRead[id] })),
        corruptionStages: CORRUPTION_STAGES,
    };
}

module.exports = {
    LIBRARY_SECTIONS, FORBIDDEN_TOMES, FORGOTTEN_SPELLS, CORRUPTION_STAGES, MADNESS_BOSS,
    enterSection, readTome, fightMadnessBoss, purify, castSpell, leaveSection, getStatus,
};

// ==========================================
// 달빛 성역 — v2.38
// 밤에만 열리는 신비로운 던전 + 달의 위상 + 보름달 히든 보스
// ==========================================

// ── 달의 위상 (8단계, 현실 시간 기반 4시간 주기) ──
const MOON_PHASES = [
    { id: 'new_moon',        name: '신월',     icon: '🌑', rewardMult: 0.8,  special: null,           desc: '어둠 속 달빛이 사라진 밤' },
    { id: 'waxing_crescent',  name: '초승달',   icon: '🌒', rewardMult: 0.9,  special: 'dark_boost',   desc: '가느다란 달빛이 비추기 시작' },
    { id: 'first_quarter',    name: '상현달',   icon: '🌓', rewardMult: 1.0,  special: null,           desc: '반쪽 달빛이 대지를 비춘다' },
    { id: 'waxing_gibbous',   name: '상현망',   icon: '🌔', rewardMult: 1.1,  special: 'exp_boost',    desc: '달빛이 차오르며 기운이 넘친다' },
    { id: 'full_moon',        name: '보름달',   icon: '🌕', rewardMult: 1.5,  special: 'hidden_boss',  desc: '만월! 숨겨진 존재가 깨어난다' },
    { id: 'waning_gibbous',   name: '하현망',   icon: '🌖', rewardMult: 1.2,  special: 'rare_drop',    desc: '달빛이 서서히 물러간다' },
    { id: 'last_quarter',     name: '하현달',   icon: '🌗', rewardMult: 1.0,  special: null,           desc: '달이 반으로 갈라진 밤' },
    { id: 'waning_crescent',  name: '그믐달',   icon: '🌘', rewardMult: 0.9,  special: 'spirit_sight', desc: '희미한 달빛 속 영혼이 보인다' },
];

// ── 달빛 성역 층 ──
const SANCTUARY_FLOORS = {
    moonlit_garden:   { name: '달빛 정원',     icon: '🌿🌙', tier: 1, minLevel: 15, monsters: ['달빛 꽃요정', '은빛 나비', '야광 덩굴'], bossHp: 500, rewards: { gold: 2000, exp: 800 } },
    silver_corridor:  { name: '은빛 회랑',     icon: '🏛️🌙', tier: 2, minLevel: 25, monsters: ['달의 기사', '은빛 유령', '달빛 가고일'], bossHp: 1500, rewards: { gold: 5000, exp: 2000 } },
    lunar_temple:     { name: '달의 신전',     icon: '⛩️🌙', tier: 3, minLevel: 35, monsters: ['월광 사제', '달의 수호자', '은하 정령'], bossHp: 4000, rewards: { gold: 12000, exp: 5000 } },
    eclipse_sanctum:  { name: '일식의 성소',   icon: '🌑✨', tier: 4, minLevel: 45, monsters: ['일식 마도사', '개기 기사', '그림자 달'], bossHp: 10000, rewards: { gold: 30000, exp: 12000 } },
};

// ── 보름달 히든 보스 ──
const HIDDEN_BOSSES = {
    lunar_dragon: { name: '달의 용 루나리스', icon: '🐉🌕', hp: 50000, atk: 800, def: 300, skills: ['달빛 브레스', '은하 포효', '월식 장벽'], drops: ['lunar_scale', 'moonstone_heart', 'lunar_essence'] },
    moon_goddess: { name: '달의 여신 셀레네', icon: '👸🌕', hp: 80000, atk: 600, def: 500, skills: ['달빛 축복', '만월의 분노', '영원한 밤'], drops: ['selene_tear', 'goddess_robe', 'eternal_moonlight'] },
    eclipse_titan: { name: '일식의 거신 움브라', icon: '🗿🌑', hp: 120000, atk: 1200, def: 200, skills: ['일식 파동', '그림자 삼킴', '태양 소멸'], drops: ['umbra_core', 'eclipse_blade', 'titan_fragment'] },
};

// ── 달빛 고유 장비 ──
const LUNAR_EQUIPMENT = {
    lunar_scale:       { name: '달의 비늘 갑옷', icon: '🛡️🌙', slot: 'armor', stats: { def: 80, hp: 200, moonlightDef: 0.15 }, grade: 'legendary' },
    moonstone_heart:   { name: '문스톤 하트', icon: '💎🌙', slot: 'accessory', stats: { mp: 150, healBonus: 0.2, moonlightAtk: 0.1 }, grade: 'legendary' },
    lunar_essence:     { name: '달빛 정수', icon: '✨🌙', slot: 'material', stats: {}, grade: 'rare', desc: '달빛 장비 강화 재료' },
    selene_tear:       { name: '셀레네의 눈물', icon: '💧🌕', slot: 'accessory', stats: { allStat: 15, reviveOnce: true }, grade: 'mythic' },
    goddess_robe:      { name: '여신의 법의', icon: '👗✨', slot: 'armor', stats: { def: 50, mp: 300, spellPower: 0.25 }, grade: 'mythic' },
    eternal_moonlight: { name: '영원한 달빛', icon: '🌕✨', slot: 'weapon', stats: { atk: 120, critRate: 0.15, moonlightDmg: 0.3 }, grade: 'mythic' },
    umbra_core:        { name: '움브라 핵', icon: '🔮🌑', slot: 'accessory', stats: { atk: 60, darkAtk: 0.2, eclipseShield: 500 }, grade: 'mythic' },
    eclipse_blade:     { name: '일식검', icon: '⚔️🌑', slot: 'weapon', stats: { atk: 150, armorPen: 0.2, eclipseBurst: true }, grade: 'mythic' },
    titan_fragment:    { name: '거신의 파편', icon: '🗿', slot: 'material', stats: {}, grade: 'legendary', desc: '전설 장비 강화 재료 (+15 ALL)' },
};

// ── 달빛 버프 (성역 내 적용) ──
const LUNAR_BUFFS = {
    dark_boost:   { name: '암흑 강화', icon: '🌑', effect: { darkAtk: 0.2 }, duration: 600, desc: '신월~초승달: 암흑 데미지 +20%' },
    exp_boost:    { name: '달빛 축복', icon: '🌔', effect: { expMult: 0.3 }, duration: 600, desc: '상현망: EXP +30%' },
    rare_drop:    { name: '달빛 행운', icon: '🌖', effect: { dropRate: 0.25 }, duration: 600, desc: '하현망: 드롭률 +25%' },
    spirit_sight: { name: '영안', icon: '🌘', effect: { seeHidden: true }, duration: 600, desc: '그믐달: 숨겨진 NPC/보물 발견' },
};

function _ensure(player) {
    if (!player._moonSanctuary) {
        player._moonSanctuary = {
            totalClears: 0,
            floorClears: {},       // { floorId: clearCount }
            hiddenBossKills: {},   // { bossId: killCount }
            lunarTokens: 0,        // 달빛 토큰 (성역 전용 화폐)
            bestFloor: null,
            lastEntry: 0,
            inSanctuary: false,
            currentFloor: null,
            currentHp: 0,
            monstersDefeated: 0,
            bossDefeated: false,
            lunarEquipment: {},    // 보유 달빛 장비
            moonBlessCount: 0,     // 달의 축복 횟수
        };
    }
    return player._moonSanctuary;
}

// 현재 달의 위상 계산 (4시간 주기 = 32시간 만월 주기)
function getCurrentMoonPhase() {
    const cycleMs = 4 * 60 * 60 * 1000; // 4시간
    const totalCycleMs = cycleMs * 8;    // 32시간 전체 주기
    const phase = Math.floor((Date.now() % totalCycleMs) / cycleMs);
    return MOON_PHASES[phase];
}

// 성역 입장
function enterSanctuary(player, floorId, isNight) {
    const state = _ensure(player);
    if (!isNight) return { success: false, msg: '🌙 달빛 성역은 밤에만 열립니다...' };
    if (state.inSanctuary) return { success: false, msg: '이미 성역 안에 있습니다.' };

    const floor = SANCTUARY_FLOORS[floorId];
    if (!floor) return { success: false, msg: '알 수 없는 성역 층입니다.' };
    if ((player.level || 1) < floor.minLevel) return { success: false, msg: `Lv.${floor.minLevel} 이상 필요합니다.` };

    // 쿨다운 (10분)
    if (Date.now() - state.lastEntry < 600000) {
        const remain = Math.ceil((600000 - (Date.now() - state.lastEntry)) / 1000);
        return { success: false, msg: `성역 입장 대기: ${remain}초` };
    }

    state.inSanctuary = true;
    state.currentFloor = floorId;
    state.currentHp = floor.bossHp;
    state.monstersDefeated = 0;
    state.bossDefeated = false;
    state.lastEntry = Date.now();

    const moonPhase = getCurrentMoonPhase();

    return {
        success: true,
        floor,
        moonPhase,
        msg: `${floor.icon} ${floor.name}에 입장! 현재 달: ${moonPhase.icon} ${moonPhase.name} — ${moonPhase.desc}`,
    };
}

// 성역 전투
function fightInSanctuary(player) {
    const state = _ensure(player);
    if (!state.inSanctuary) return { success: false, msg: '성역에 있지 않습니다.' };

    const floor = SANCTUARY_FLOORS[state.currentFloor];
    if (!floor) return { success: false, msg: '층 정보 오류' };

    const moonPhase = getCurrentMoonPhase();
    const playerAtk = (player.atk || 10) + (player.level || 1) * 2;

    // 일반 몬스터 (3마리 처치 후 보스)
    if (state.monstersDefeated < 3) {
        const monsterName = floor.monsters[state.monstersDefeated % floor.monsters.length];
        const monsterHp = floor.bossHp * 0.3;
        const damage = Math.floor(playerAtk * (0.8 + Math.random() * 0.4));
        const killed = damage >= monsterHp;

        if (killed) {
            state.monstersDefeated++;
            const goldReward = Math.floor(floor.rewards.gold * 0.2 * moonPhase.rewardMult);
            const expReward = Math.floor(floor.rewards.exp * 0.15 * moonPhase.rewardMult);
            player.gold = Math.min((player.gold || 0) + goldReward, 999999999);
            player.exp = (player.exp || 0) + expReward;

            return {
                success: true, type: 'monster_kill',
                monsterName, damage, goldReward, expReward,
                progress: `${state.monstersDefeated}/3`,
                msg: `${moonPhase.icon} ${monsterName} 처치! +${goldReward}G +${expReward}EXP (${state.monstersDefeated}/3)`,
            };
        }
        return { success: true, type: 'monster_hit', monsterName, damage, msg: `${monsterName}에게 ${damage} 데미지!` };
    }

    // 보스 전투
    const bossDamage = Math.floor(playerAtk * (1.0 + Math.random() * 0.5));
    state.currentHp = Math.max(0, state.currentHp - bossDamage);

    if (state.currentHp <= 0) {
        state.bossDefeated = true;
        state.totalClears++;
        state.floorClears[state.currentFloor] = (state.floorClears[state.currentFloor] || 0) + 1;

        const goldReward = Math.floor(floor.rewards.gold * moonPhase.rewardMult);
        const expReward = Math.floor(floor.rewards.exp * moonPhase.rewardMult);
        const tokenReward = floor.tier * 5;
        player.gold = Math.min((player.gold || 0) + goldReward, 999999999);
        player.exp = (player.exp || 0) + expReward;
        state.lunarTokens += tokenReward;

        // 장비 드롭 (10% 기본, 달에 따라 보정)
        let drop = null;
        const dropChance = 0.10 + (moonPhase.special === 'rare_drop' ? 0.15 : 0);
        if (Math.random() < dropChance) {
            const dropKeys = ['lunar_essence', 'moonstone_heart', 'lunar_scale'];
            const dropKey = dropKeys[Math.floor(Math.random() * dropKeys.length)];
            drop = LUNAR_EQUIPMENT[dropKey];
            state.lunarEquipment[dropKey] = (state.lunarEquipment[dropKey] || 0) + 1;
        }

        state.inSanctuary = false;

        return {
            success: true, type: 'boss_clear',
            goldReward, expReward, tokenReward, drop,
            moonPhase,
            msg: `${floor.icon} ${floor.name} 보스 처치! +${goldReward}G +${expReward}EXP +${tokenReward} 달빛 토큰${drop ? ` — ${drop.icon} ${drop.name} 획득!` : ''}`,
        };
    }

    return {
        success: true, type: 'boss_hit',
        damage: bossDamage, remainHp: state.currentHp, maxHp: floor.bossHp,
        msg: `보스에게 ${bossDamage} 데미지! (HP: ${state.currentHp}/${floor.bossHp})`,
    };
}

// 보름달 히든 보스 도전
function challengeHiddenBoss(player, bossId) {
    const state = _ensure(player);
    const moonPhase = getCurrentMoonPhase();
    if (moonPhase.id !== 'full_moon') return { success: false, msg: '🌕 보름달에만 히든 보스에 도전할 수 있습니다.' };
    if ((player.level || 1) < 40) return { success: false, msg: 'Lv.40 이상 필요합니다.' };

    const boss = HIDDEN_BOSSES[bossId];
    if (!boss) return { success: false, msg: '알 수 없는 보스' };

    // 전투 시뮬레이션
    const playerPower = ((player.atk || 10) + (player.level || 1) * 3) * (1 + Math.random() * 0.5);
    const totalDamage = Math.floor(playerPower * 10);
    const bossAttack = Math.floor(boss.atk * (0.5 + Math.random() * 0.5));
    const playerSurvive = (player.hp || 100) > bossAttack;

    if (totalDamage >= boss.hp && playerSurvive) {
        state.hiddenBossKills[bossId] = (state.hiddenBossKills[bossId] || 0) + 1;
        const goldReward = 50000;
        const expReward = 20000;
        const tokenReward = 50;
        player.gold = Math.min((player.gold || 0) + goldReward, 999999999);
        player.exp = (player.exp || 0) + expReward;
        state.lunarTokens += tokenReward;

        // 히든 보스 전용 드롭
        const dropKey = boss.drops[Math.floor(Math.random() * boss.drops.length)];
        const drop = LUNAR_EQUIPMENT[dropKey];
        if (drop) state.lunarEquipment[dropKey] = (state.lunarEquipment[dropKey] || 0) + 1;

        return {
            success: true, victory: true,
            boss, goldReward, expReward, tokenReward, drop,
            msg: `${boss.icon} ${boss.name} 격파! +${goldReward}G +${expReward}EXP +${tokenReward} 토큰${drop ? ` — ${drop.icon} ${drop.name} 획득!` : ''}`,
        };
    }

    // 패배
    return {
        success: true, victory: false,
        boss, damage: totalDamage, bossHp: boss.hp,
        msg: `${boss.icon} ${boss.name}에게 패배... (${totalDamage}/${boss.hp} 데미지)`,
    };
}

// 달의 축복 (보름달 때 기도)
function moonBlessing(player) {
    const state = _ensure(player);
    const moonPhase = getCurrentMoonPhase();
    if (moonPhase.id !== 'full_moon') return { success: false, msg: '보름달에만 축복을 받을 수 있습니다.' };

    // 하루 1회 제한
    const today = new Date().toDateString();
    if (state._lastBlessingDay === today) return { success: false, msg: '오늘은 이미 축복을 받았습니다.' };
    state._lastBlessingDay = today;
    state.moonBlessCount++;

    const blessings = [
        { name: 'ATK +5% (1시간)', effect: { atk: 0.05 }, duration: 3600 },
        { name: 'EXP +20% (1시간)', effect: { expMult: 0.2 }, duration: 3600 },
        { name: '드롭률 +15% (1시간)', effect: { dropRate: 0.15 }, duration: 3600 },
        { name: 'HP 완전 회복', effect: { fullHeal: true }, duration: 0 },
        { name: '달빛 토큰 x10', effect: { tokens: 10 }, duration: 0 },
    ];
    const blessing = blessings[Math.floor(Math.random() * blessings.length)];

    if (blessing.effect.fullHeal) {
        player.hp = player.maxHp || 100;
    }
    if (blessing.effect.tokens) {
        state.lunarTokens += blessing.effect.tokens;
    }

    return {
        success: true, blessing,
        msg: `🌕 달의 축복! — ${blessing.name} (축복 횟수: ${state.moonBlessCount})`,
    };
}

// 상태 조회
function getStatus(player, isNight) {
    const state = _ensure(player);
    const moonPhase = getCurrentMoonPhase();
    return {
        moonPhase,
        isNight,
        isOpen: isNight,
        lunarTokens: state.lunarTokens,
        totalClears: state.totalClears,
        floorClears: state.floorClears,
        hiddenBossKills: state.hiddenBossKills,
        inSanctuary: state.inSanctuary,
        currentFloor: state.currentFloor ? SANCTUARY_FLOORS[state.currentFloor] : null,
        monstersDefeated: state.monstersDefeated,
        bossHpRemain: state.currentHp,
        lunarEquipment: state.lunarEquipment,
        moonBlessCount: state.moonBlessCount,
        floors: Object.entries(SANCTUARY_FLOORS).map(([id, f]) => ({
            id, ...f,
            cleared: state.floorClears[id] || 0,
            available: (player.level || 1) >= f.minLevel,
        })),
        hiddenBosses: Object.entries(HIDDEN_BOSSES).map(([id, b]) => ({
            id, ...b,
            kills: state.hiddenBossKills[id] || 0,
            available: moonPhase.id === 'full_moon' && (player.level || 1) >= 40,
        })),
    };
}

module.exports = {
    MOON_PHASES, SANCTUARY_FLOORS, HIDDEN_BOSSES, LUNAR_EQUIPMENT, LUNAR_BUFFS,
    getCurrentMoonPhase, enterSanctuary, fightInSanctuary,
    challengeHiddenBoss, moonBlessing, getStatus,
};

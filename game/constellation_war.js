// ==========================================
// 별자리 전쟁 — v2.47
// 12궁 진영 전쟁 + 수호신 소환 + 성좌 점령 + 계절 우세 + 성전 보상
// ==========================================

// ── 12궁 별자리 ──
const ZODIAC_SIGNS = {
    aries:       { name: '양자리',     icon: '♈🐏', element: 'fire',   season: 'spring', patron: '전쟁의 양 아리에스',   baseBonus: { atk: 0.08 },           desc: '돌격과 용기의 별자리' },
    taurus:      { name: '황소자리',   icon: '♉🐂', element: 'earth',  season: 'spring', patron: '대지의 소 타우루스',   baseBonus: { def: 0.10 },           desc: '인내와 수호의 별자리' },
    gemini:      { name: '쌍둥이자리', icon: '♊👥', element: 'wind',   season: 'spring', patron: '바람의 쌍둥이 제미니', baseBonus: { speed: 0.08 },         desc: '속도와 기만의 별자리' },
    cancer:      { name: '게자리',     icon: '♋🦀', element: 'water',  season: 'summer', patron: '달의 게 캔서',         baseBonus: { healBonus: 0.10 },     desc: '치유와 보호의 별자리' },
    leo:         { name: '사자자리',   icon: '♌🦁', element: 'fire',   season: 'summer', patron: '태양의 사자 레오',     baseBonus: { critRate: 0.05 },      desc: '위엄과 힘의 별자리' },
    virgo:       { name: '처녀자리',   icon: '♍🌾', element: 'earth',  season: 'summer', patron: '풍요의 여신 비르고',   baseBonus: { expMult: 0.08 },       desc: '지혜와 풍요의 별자리' },
    libra:       { name: '천칭자리',   icon: '♎⚖️', element: 'wind',   season: 'autumn', patron: '심판의 천칭 리브라',   baseBonus: { allStat: 2 },          desc: '균형과 정의의 별자리' },
    scorpio:     { name: '전갈자리',   icon: '♏🦂', element: 'water',  season: 'autumn', patron: '독의 전갈 스콜피오',   baseBonus: { critDmg: 0.10 },       desc: '독과 암습의 별자리' },
    sagittarius: { name: '궁수자리',   icon: '♐🏹', element: 'fire',   season: 'autumn', patron: '화살의 궁수 사지타리', baseBonus: { rangedDmg: 0.10 },     desc: '정확과 모험의 별자리' },
    capricorn:   { name: '염소자리',   icon: '♑🐐', element: 'earth',  season: 'winter', patron: '산의 염소 카프리콘',   baseBonus: { goldBonus: 0.08 },     desc: '근면과 야심의 별자리' },
    aquarius:    { name: '물병자리',   icon: '♒🏺', element: 'wind',   season: 'winter', patron: '혁신의 물병 아쿠아리', baseBonus: { mpRegen: 3 },          desc: '혁신과 자유의 별자리' },
    pisces:      { name: '물고기자리', icon: '♓🐟', element: 'water',  season: 'winter', patron: '몽환의 물고기 파이시', baseBonus: { evasion: 0.05 },       desc: '환상과 직감의 별자리' },
};

// ── 원소 상성 ──
const ELEMENT_ADV = { fire: 'wind', wind: 'earth', earth: 'water', water: 'fire' };

// ── 계절 (현실 시간 기반, 3일 주기) ──
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

function getCurrentSeason() {
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const idx = Math.floor(daysSinceEpoch / 3) % 4;
    return SEASONS[idx];
}

const SEASON_NAMES = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
const SEASON_ICONS = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };

// ── 수호신 소환 (별자리별 궁극 유닛) ──
const PATRON_GODS = {
    aries:       { name: '아리에스',   icon: '♈🔥', hp: 15000, atk: 600, skill: '화염 돌격',       skillEffect: { aoe: true, dmg: 5.0, charge: true }, cd: 60 },
    taurus:      { name: '타우루스',   icon: '♉🗿', hp: 25000, atk: 350, skill: '대지의 벽',       skillEffect: { shield: 5000, teamDef: 0.3 }, cd: 90 },
    gemini:      { name: '제미니',     icon: '♊💨', hp: 12000, atk: 500, skill: '분신술',           skillEffect: { clones: 2, duration: 15 }, cd: 45 },
    cancer:      { name: '캔서',       icon: '♋🌊', hp: 20000, atk: 300, skill: '달의 치유',       skillEffect: { teamHeal: 0.4, cleanse: true }, cd: 60 },
    leo:         { name: '레오',       icon: '♌☀️', hp: 18000, atk: 700, skill: '태양의 포효',     skillEffect: { aoe: true, dmg: 6.0, atkBuff: 0.2 }, cd: 75 },
    virgo:       { name: '비르고',     icon: '♍🌿', hp: 16000, atk: 400, skill: '풍요의 축복',     skillEffect: { teamBuff: { allStat: 10 }, duration: 30 }, cd: 90 },
    libra:       { name: '리브라',     icon: '♎⚖️', hp: 17000, atk: 450, skill: '심판의 균형',     skillEffect: { equalizeHp: true }, cd: 120 },
    scorpio:     { name: '스콜피오',   icon: '♏☠️', hp: 14000, atk: 650, skill: '맹독 꼬리',       skillEffect: { dmg: 4.0, poison: { dps: 50, duration: 15 } }, cd: 50 },
    sagittarius: { name: '사지타리',   icon: '♐🌟', hp: 13000, atk: 750, skill: '유성 화살',       skillEffect: { dmg: 8.0, piercing: true }, cd: 60 },
    capricorn:   { name: '카프리콘',   icon: '♑⛰️', hp: 22000, atk: 400, skill: '산사태',         skillEffect: { aoe: true, dmg: 4.0, stun: 3 }, cd: 70 },
    aquarius:    { name: '아쿠아리',   icon: '♒💧', hp: 15000, atk: 500, skill: '대홍수',           skillEffect: { aoe: true, dmg: 5.0, mpDrain: 100 }, cd: 80 },
    pisces:      { name: '파이시',     icon: '♓✨', hp: 11000, atk: 450, skill: '환상의 안개',     skillEffect: { confusion: 5, evasionBuff: 0.3, duration: 10 }, cd: 55 },
};

// ── 성좌 영역 (점령 대상) ──
const STAR_TERRITORIES = {
    northern_cross:  { name: '북십자 성좌',   icon: '✝️⭐', controlBonus: { expMult: 0.1 },     desc: '경험치 +10% (진영 전원)' },
    orion_belt:      { name: '오리온 벨트',   icon: '🌌⭐', controlBonus: { atk: 0.08 },        desc: 'ATK +8% (진영 전원)' },
    southern_crown:  { name: '남관 성좌',     icon: '👑⭐', controlBonus: { goldBonus: 0.1 },    desc: '골드 +10% (진영 전원)' },
    celestial_river: { name: '은하수 영역',   icon: '🌊⭐', controlBonus: { healBonus: 0.1 },    desc: '힐량 +10% (진영 전원)' },
    void_nebula:     { name: '공허 성운',     icon: '🕳️⭐', controlBonus: { critDmg: 0.08 },     desc: '크리 데미지 +8% (진영 전원)' },
    dawn_star:       { name: '새벽별',       icon: '🌟⭐', controlBonus: { allStat: 3 },         desc: 'ALL +3 (진영 전원)' },
};

// ── 성전 (전쟁 이벤트) ──
const WAR_PHASES = {
    peace:    { name: '평화',     icon: '🕊️', duration: 3600, desc: '전쟁 준비 기간. 헌납으로 전력 강화' },
    mobilize: { name: '동원',     icon: '📯', duration: 1800, desc: '수호신 소환 가능. 전투 준비' },
    battle:   { name: '전투',     icon: '⚔️', duration: 1800, desc: '성좌 영역 점령전!' },
    reward:   { name: '보상',     icon: '🏆', duration: 600,  desc: '전쟁 결과 정산' },
};

function _ensure(player) {
    if (!player._constellWar) {
        player._constellWar = {
            zodiac: null,           // 선택한 별자리
            joinedAt: 0,
            contribution: 0,        // 진영 기여도
            totalContribution: 0,
            warParticipation: 0,    // 참여 전쟁 수
            territoryCaptures: 0,
            patronSummons: 0,
            starDust: 0,            // 별의 먼지 (전용 화폐)
            offerings: 0,           // 헌납한 총 골드
            rank: 'recruit',        // 진영 내 등급
        };
    }
    return player._constellWar;
}

// ── 서버 전역 상태 (런타임) ──
let warState = {
    phase: 'peace',
    phaseStart: Date.now(),
    territories: {},     // { territoryId: { owner: zodiacId, contestPoints: {} } }
    factionPower: {},    // { zodiacId: power }
    patronActive: {},    // { zodiacId: { hp, summoner, summonedAt } }
    warLog: [],
    lastWarResult: null,
};

// 초기화
function _initTerritories() {
    for (const tid of Object.keys(STAR_TERRITORIES)) {
        if (!warState.territories[tid]) {
            warState.territories[tid] = { owner: null, contestPoints: {} };
        }
    }
}
_initTerritories();

// 별자리 선택
function chooseZodiac(player, zodiacId) {
    const state = _ensure(player);
    if (state.zodiac) return { success: false, msg: `이미 ${ZODIAC_SIGNS[state.zodiac].icon} ${ZODIAC_SIGNS[state.zodiac].name}에 소속되어 있습니다.` };
    if ((player.level || 1) < 15) return { success: false, msg: 'Lv.15 이상 필요' };

    const sign = ZODIAC_SIGNS[zodiacId];
    if (!sign) return { success: false, msg: '알 수 없는 별자리' };

    state.zodiac = zodiacId;
    state.joinedAt = Date.now();
    state.rank = 'recruit';

    // 진영 전력 증가
    warState.factionPower[zodiacId] = (warState.factionPower[zodiacId] || 0) + 1;

    return {
        success: true, sign,
        msg: `${sign.icon} ${sign.name} 진영 가입! "${sign.patron}" 수호신의 축복을 받습니다.\n기본 보너스: ${sign.desc}`,
    };
}

// 헌납 (진영 전력 강화)
function offering(player, goldAmount) {
    const state = _ensure(player);
    if (!state.zodiac) return { success: false, msg: '별자리를 먼저 선택하세요.' };
    if (typeof goldAmount !== 'number' || goldAmount < 1000) return { success: false, msg: '최소 1,000G 이상 헌납' };
    if ((player.gold || 0) < goldAmount) return { success: false, msg: '골드 부족' };

    player.gold -= goldAmount;
    const power = Math.floor(goldAmount / 1000);
    warState.factionPower[state.zodiac] = (warState.factionPower[state.zodiac] || 0) + power;
    state.contribution += power;
    state.totalContribution += power;
    state.offerings += goldAmount;
    state.starDust += Math.floor(power * 0.5);

    // 등급 업
    _updateRank(state);

    return {
        success: true, power,
        msg: `${ZODIAC_SIGNS[state.zodiac].icon} ${goldAmount}G 헌납! 진영 전력 +${power} | 별의 먼지 +${Math.floor(power * 0.5)}`,
    };
}

function _updateRank(state) {
    const c = state.totalContribution;
    if (c >= 500)      state.rank = 'constellation_master';
    else if (c >= 200) state.rank = 'star_commander';
    else if (c >= 100) state.rank = 'guardian';
    else if (c >= 50)  state.rank = 'warrior';
    else if (c >= 20)  state.rank = 'soldier';
    else               state.rank = 'recruit';
}

const RANK_NAMES = {
    recruit: '신병', soldier: '병사', warrior: '전사',
    guardian: '수호자', star_commander: '별의 사령관', constellation_master: '성좌 마스터',
};
const RANK_ICONS = {
    recruit: '⚪', soldier: '🟢', warrior: '🔵',
    guardian: '🟣', star_commander: '🟡', constellation_master: '👑',
};

// 수호신 소환
function summonPatron(player) {
    const state = _ensure(player);
    if (!state.zodiac) return { success: false, msg: '별자리를 먼저 선택하세요.' };
    if (warState.phase !== 'mobilize' && warState.phase !== 'battle') {
        return { success: false, msg: '동원/전투 단계에서만 수호신을 소환할 수 있습니다.' };
    }
    if (warState.patronActive[state.zodiac]) {
        return { success: false, msg: '이미 수호신이 소환되어 있습니다.' };
    }
    if (state.contribution < 10) return { success: false, msg: '기여도 10 이상 필요' };

    state.contribution -= 10;
    state.patronSummons++;
    const patron = PATRON_GODS[state.zodiac];
    warState.patronActive[state.zodiac] = {
        hp: patron.hp,
        maxHp: patron.hp,
        summoner: player.displayName,
        summonedAt: Date.now(),
    };

    const sign = ZODIAC_SIGNS[state.zodiac];
    return {
        success: true, patron, sign,
        msg: `${sign.icon} ${patron.icon} ${patron.name} 소환! HP: ${patron.hp} | ATK: ${patron.atk}\n"${patron.skill}" — 전장에 내려왔다!`,
    };
}

// 영역 점령 공격
function attackTerritory(player, territoryId) {
    const state = _ensure(player);
    if (!state.zodiac) return { success: false, msg: '별자리를 먼저 선택하세요.' };
    if (warState.phase !== 'battle') return { success: false, msg: '전투 단계에서만 공격할 수 있습니다.' };

    const territory = STAR_TERRITORIES[territoryId];
    if (!territory) return { success: false, msg: '알 수 없는 영역' };

    const tState = warState.territories[territoryId];
    const season = getCurrentSeason();
    const sign = ZODIAC_SIGNS[state.zodiac];

    // 계절 보너스
    const seasonBonus = sign.season === season ? 1.5 : 1.0;

    // 원소 상성 보너스
    let elementBonus = 1.0;
    if (tState.owner && ZODIAC_SIGNS[tState.owner]) {
        const defElement = ZODIAC_SIGNS[tState.owner].element;
        if (ELEMENT_ADV[sign.element] === defElement) elementBonus = 1.3;
        else if (ELEMENT_ADV[defElement] === sign.element) elementBonus = 0.7;
    }

    // 수호신 보너스
    const patronBonus = warState.patronActive[state.zodiac] ? 1.5 : 1.0;

    // 전투력 계산
    const attackPower = Math.floor(
        ((player.atk || 10) + (player.level || 1) * 2) * seasonBonus * elementBonus * patronBonus
    );

    // 점령 포인트 추가
    if (!tState.contestPoints[state.zodiac]) tState.contestPoints[state.zodiac] = 0;
    tState.contestPoints[state.zodiac] += attackPower;

    state.contribution += 1;
    state.starDust += 2;

    // 점령 판정 (가장 많은 포인트 보유 진영이 점령)
    let maxPoints = 0;
    let maxZodiac = null;
    for (const [zid, pts] of Object.entries(tState.contestPoints)) {
        if (pts > maxPoints) { maxPoints = pts; maxZodiac = zid; }
    }

    let captureMsg = '';
    if (maxZodiac !== tState.owner) {
        const oldOwner = tState.owner;
        tState.owner = maxZodiac;
        if (maxZodiac === state.zodiac) {
            state.territoryCaptures++;
            captureMsg = `\n🏴 ${territory.icon} ${territory.name} 점령! (${territory.desc})`;
        } else {
            captureMsg = `\n${territory.icon} ${ZODIAC_SIGNS[maxZodiac]?.icon || ''} ${ZODIAC_SIGNS[maxZodiac]?.name || ''}이(가) 점령!`;
        }
    }

    const bonuses = [];
    if (seasonBonus > 1) bonuses.push(`계절 x${seasonBonus}`);
    if (elementBonus > 1) bonuses.push(`상성 x${elementBonus}`);
    if (patronBonus > 1) bonuses.push('수호신 x1.5');

    return {
        success: true, attackPower, territory,
        bonuses: bonuses.length > 0 ? bonuses.join(', ') : null,
        msg: `${sign.icon} ${territory.icon} ${territory.name} 공격! 전투력 ${attackPower}${bonuses.length > 0 ? ` (${bonuses.join(', ')})` : ''}${captureMsg}`,
    };
}

// 전쟁 단계 전환 (게임 루프에서 호출)
function updateWarPhase() {
    const phases = ['peace', 'mobilize', 'battle', 'reward'];
    const durations = [WAR_PHASES.peace.duration, WAR_PHASES.mobilize.duration, WAR_PHASES.battle.duration, WAR_PHASES.reward.duration];

    const currentIdx = phases.indexOf(warState.phase);
    const elapsed = (Date.now() - warState.phaseStart) / 1000;

    if (elapsed >= durations[currentIdx]) {
        const nextIdx = (currentIdx + 1) % phases.length;

        // 보상 → 평화 전환 시 정산
        if (warState.phase === 'reward') {
            _settleWar();
        }

        // 전투 → 보상 전환 시 수호신 해산
        if (warState.phase === 'battle') {
            warState.patronActive = {};
        }

        warState.phase = phases[nextIdx];
        warState.phaseStart = Date.now();

        return { changed: true, newPhase: warState.phase, name: WAR_PHASES[warState.phase].name };
    }

    return { changed: false };
}

function _settleWar() {
    // 영역별 점령 포인트 리셋 (소유권은 유지)
    for (const tid of Object.keys(warState.territories)) {
        warState.territories[tid].contestPoints = {};
    }

    // 진영별 점령 영역 수 계산
    const controlCount = {};
    for (const [, tState] of Object.entries(warState.territories)) {
        if (tState.owner) {
            controlCount[tState.owner] = (controlCount[tState.owner] || 0) + 1;
        }
    }

    warState.lastWarResult = {
        time: Date.now(),
        controlCount,
        season: getCurrentSeason(),
    };

    warState.warLog.push(warState.lastWarResult);
    if (warState.warLog.length > 10) warState.warLog.shift();
}

// 전쟁 보상 수령
function claimWarReward(player) {
    const state = _ensure(player);
    if (!state.zodiac) return { success: false, msg: '별자리를 먼저 선택하세요.' };
    if (!warState.lastWarResult) return { success: false, msg: '아직 전쟁 결과가 없습니다.' };

    // 이미 수령 체크
    const warTime = warState.lastWarResult.time;
    if (state._lastRewardWar === warTime) return { success: false, msg: '이미 보상을 수령했습니다.' };
    state._lastRewardWar = warTime;

    const myControl = warState.lastWarResult.controlCount[state.zodiac] || 0;
    const goldReward = 5000 + myControl * 10000;
    const expReward = 3000 + myControl * 5000;
    const dustReward = 10 + myControl * 15;

    player.gold = Math.min((player.gold || 0) + goldReward, 999999999);
    player.exp = (player.exp || 0) + expReward;
    state.starDust += dustReward;
    state.warParticipation++;

    return {
        success: true,
        myControl, goldReward, expReward, dustReward,
        msg: `🏆 전쟁 보상! 점령 영역 ${myControl}개 | +${goldReward}G +${expReward}EXP +${dustReward} 별의 먼지`,
    };
}

// 별의 먼지 상점
const STARDUST_SHOP = {
    star_fragment:   { name: '별의 파편',       icon: '⭐', cost: 20,  effect: { expBoost: 0.15, duration: 3600 }, desc: '1시간 EXP +15%' },
    celestial_armor: { name: '성좌 갑옷',       icon: '🛡️⭐', cost: 100, effect: { def: 50, allStat: 5 }, desc: 'DEF +50, ALL +5 (영구)' },
    zodiac_weapon:   { name: '황도 무기',       icon: '⚔️⭐', cost: 150, effect: { atk: 80, zodiacDmg: 0.1 }, desc: 'ATK +80, 별자리전 데미지 +10%' },
    patron_charm:    { name: '수호신의 부적',   icon: '📿⭐', cost: 200, effect: { patronCooldown: -0.2 }, desc: '수호신 소환 쿨다운 -20%' },
    constellation_crown: { name: '성좌 왕관',   icon: '👑⭐', cost: 500, effect: { allStat: 15, cosmetic: 'crown' }, desc: 'ALL +15 + 왕관 외형' },
};

function buyStardustItem(player, itemId) {
    const state = _ensure(player);
    const item = STARDUST_SHOP[itemId];
    if (!item) return { success: false, msg: '알 수 없는 아이템' };
    if (state.starDust < item.cost) return { success: false, msg: `별의 먼지 부족 (${state.starDust}/${item.cost})` };

    state.starDust -= item.cost;
    return {
        success: true, item,
        msg: `${item.icon} ${item.name} 구매! — ${item.desc}`,
    };
}

// 상태 조회
function getStatus(player, allPlayers) {
    const state = _ensure(player);
    const season = getCurrentSeason();
    const phaseElapsed = Math.floor((Date.now() - warState.phaseStart) / 1000);
    const phaseDuration = WAR_PHASES[warState.phase]?.duration || 3600;
    const phaseRemain = Math.max(0, phaseDuration - phaseElapsed);

    // 진영별 인원수
    const factionMembers = {};
    if (allPlayers) {
        for (const pid in allPlayers) {
            const pl = allPlayers[pid];
            if (pl?._constellWar?.zodiac) {
                const z = pl._constellWar.zodiac;
                factionMembers[z] = (factionMembers[z] || 0) + 1;
            }
        }
    }

    return {
        zodiac: state.zodiac ? { id: state.zodiac, ...ZODIAC_SIGNS[state.zodiac] } : null,
        rank: state.rank,
        rankName: RANK_NAMES[state.rank],
        rankIcon: RANK_ICONS[state.rank],
        contribution: state.contribution,
        totalContribution: state.totalContribution,
        starDust: state.starDust,
        warParticipation: state.warParticipation,
        territoryCaptures: state.territoryCaptures,
        patronSummons: state.patronSummons,
        season: { id: season, name: SEASON_NAMES[season], icon: SEASON_ICONS[season] },
        seasonAdvantage: state.zodiac ? ZODIAC_SIGNS[state.zodiac].season === season : false,
        war: {
            phase: warState.phase,
            phaseName: WAR_PHASES[warState.phase].name,
            phaseIcon: WAR_PHASES[warState.phase].icon,
            phaseDesc: WAR_PHASES[warState.phase].desc,
            phaseRemain,
        },
        territories: Object.entries(STAR_TERRITORIES).map(([id, t]) => ({
            id, ...t,
            owner: warState.territories[id]?.owner || null,
            ownerSign: warState.territories[id]?.owner ? ZODIAC_SIGNS[warState.territories[id].owner] : null,
            points: warState.territories[id]?.contestPoints || {},
        })),
        patronActive: Object.entries(warState.patronActive).map(([zid, data]) => ({
            zodiac: ZODIAC_SIGNS[zid],
            patron: PATRON_GODS[zid],
            ...data,
        })),
        factionPower: warState.factionPower,
        factionMembers,
        lastWarResult: warState.lastWarResult,
        zodiacList: Object.entries(ZODIAC_SIGNS).map(([id, z]) => ({
            id, ...z,
            isSeason: z.season === season,
            members: factionMembers[id] || 0,
            power: warState.factionPower[id] || 0,
        })),
        shop: STARDUST_SHOP,
    };
}

// 서버 상태 getter (게임 루프용)
function getWarState() { return warState; }

module.exports = {
    ZODIAC_SIGNS, PATRON_GODS, STAR_TERRITORIES, WAR_PHASES, STARDUST_SHOP,
    getCurrentSeason, chooseZodiac, offering, summonPatron,
    attackTerritory, updateWarPhase, claimWarReward, buyStardustItem,
    getStatus, getWarState,
};

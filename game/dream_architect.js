// ==========================================
// 꿈의 건축가 — v2.46
// 꿈속 던전 설계 + 함정/몬스터 배치 + 도전/수익 + 클리어율 통계
// ==========================================

// ── 방 테마 ──
const ROOM_THEMES = {
    void_hall:      { name: '공허의 전당',     icon: '🕳️🏛️', defBonus: 0,   desc: '어둠이 지배하는 기본 방' },
    lava_pit:       { name: '용암 구덩이',     icon: '🌋',     defBonus: 0.1, desc: '바닥에서 용암이 솟구친다. 진입 시 화상' },
    frozen_chapel:  { name: '얼어붙은 예배당', icon: '❄️⛪',   defBonus: 0.1, desc: '얼어붙은 공간. 이동속도 -30%' },
    mirror_maze:    { name: '거울 미궁',       icon: '🪞🌀',   defBonus: 0.15, desc: '분신이 나타나 혼란을 준다' },
    blood_garden:   { name: '핏빛 정원',       icon: '🌹🩸',   defBonus: 0.1, desc: '가시덩굴이 움직인다. 지속 데미지' },
    storm_tower:    { name: '폭풍의 탑',       icon: '⛈️🗼',   defBonus: 0.15, desc: '번개가 랜덤 낙하. 회피 필요' },
    nightmare_den:  { name: '악몽의 소굴',     icon: '😱🕸️',   defBonus: 0.2, desc: '공포 효과 — 도전자 ATK -20%' },
    gravity_well:   { name: '중력의 우물',     icon: '🌀⬇️',   defBonus: 0.15, desc: '중력 변동. 랜덤 스탯 감소' },
    shadow_throne:  { name: '그림자 왕좌',     icon: '🪑🌑',   defBonus: 0.25, desc: '최종 보스 방. 모든 효과 중첩' },
};

// ── 배치 가능 함정 ──
const TRAPS = {
    spike_floor:    { name: '가시 바닥',       icon: '⬆️🔪', tier: 1, cost: 500,   dmg: 50,  effect: null, desc: '바닥 가시 — 50 고정 데미지' },
    poison_mist:    { name: '독 안개',         icon: '💨☠️', tier: 1, cost: 800,   dmg: 30,  effect: { dot: 10, duration: 10 }, desc: '10초간 초당 10 독 데미지' },
    flame_jet:      { name: '화염 분사',       icon: '🔥💨', tier: 2, cost: 1500,  dmg: 100, effect: { burn: 15 }, desc: '100 데미지 + 15초 화상' },
    ice_cage:       { name: '얼음 감옥',       icon: '🧊🔒', tier: 2, cost: 1500,  dmg: 30,  effect: { freeze: 3 }, desc: '3초 동결 + 30 데미지' },
    lightning_rune:  { name: '번개 룬',         icon: '⚡📜', tier: 2, cost: 2000,  dmg: 150, effect: { stun: 2 }, desc: '150 데미지 + 2초 기절' },
    gravity_crush:  { name: '중력 분쇄',       icon: '🌀💥', tier: 3, cost: 3000,  dmg: 200, effect: { slow: 0.5, duration: 8 }, desc: '200 데미지 + 8초 둔화' },
    soul_drain:     { name: '영혼 흡수진',     icon: '👻💜', tier: 3, cost: 4000,  dmg: 100, effect: { mpDrain: 50, atkReduce: 0.15 }, desc: 'MP -50, ATK -15%' },
    void_rift:      { name: '공허 균열',       icon: '🕳️💀', tier: 4, cost: 8000,  dmg: 300, effect: { hpCut: 0.1 }, desc: '300 데미지 + HP 10% 삭감' },
    time_loop:      { name: '시간 루프',       icon: '⏳🔄', tier: 4, cost: 10000, dmg: 0,   effect: { replayRoom: true }, desc: '이 방을 다시 한 번 반복!' },
    nightmare_eye:  { name: '악몽의 눈',       icon: '👁️😱', tier: 5, cost: 15000, dmg: 500, effect: { fear: 5, allDebuff: 0.2 }, desc: '500 데미지 + 5초 공포 + ALL -20%' },
};

// ── 배치 가능 수호 몬스터 ──
const GUARDIANS = {
    dream_goblin:    { name: '꿈 고블린',       icon: '👺💤', tier: 1, cost: 1000,  hp: 500,   atk: 50,  def: 20,  skill: null },
    sleep_walker:    { name: '몽유병자',         icon: '🧟💤', tier: 1, cost: 1200,  hp: 700,   atk: 40,  def: 30,  skill: null },
    nightmare_hound: { name: '악몽의 사냥개',   icon: '🐕‍🦺💀', tier: 2, cost: 2500,  hp: 1000,  atk: 80,  def: 40,  skill: { name: '추적', effect: 'speed+30%' } },
    phantom_knight:  { name: '환영 기사',       icon: '🛡️👻', tier: 2, cost: 3000,  hp: 1500,  atk: 70,  def: 80,  skill: { name: '방패벽', effect: 'block 1hit' } },
    dream_hydra:     { name: '꿈의 히드라',     icon: '🐉💤', tier: 3, cost: 5000,  hp: 2500,  atk: 120, def: 60,  skill: { name: '머리 재생', effect: 'heal 20%' } },
    mirror_doppel:   { name: '거울 도플갱어',   icon: '🪞👤', tier: 3, cost: 6000,  hp: 2000,  atk: 100, def: 50,  skill: { name: '복제', effect: 'copy challenger stats' } },
    void_sentinel:   { name: '공허 파수꾼',     icon: '🕳️🗿', tier: 4, cost: 10000, hp: 4000,  atk: 180, def: 120, skill: { name: '차원 차단', effect: 'silence 5s' } },
    dream_dragon:    { name: '꿈의 용',         icon: '🐲💤', tier: 4, cost: 15000, hp: 6000,  atk: 250, def: 150, skill: { name: '꿈의 브레스', effect: 'aoe sleep 3s' } },
    nightmare_lord:  { name: '악몽의 군주',     icon: '👑😈', tier: 5, cost: 25000, hp: 10000, atk: 400, def: 200, skill: { name: '악몽 구현', effect: 'all traps retrigger' } },
};

// ── 던전 등급 (방 수 기반) ──
const DUNGEON_GRADES = [
    { min: 3, max: 3, name: '소규모', icon: '🏠', maxTraps: 3,  maxGuardians: 2 },
    { min: 5, max: 5, name: '중규모', icon: '🏰', maxTraps: 6,  maxGuardians: 4 },
    { min: 7, max: 7, name: '대규모', icon: '🏯', maxTraps: 10, maxGuardians: 6 },
    { min: 9, max: 9, name: '거대',   icon: '⛩️', maxTraps: 15, maxGuardians: 9 },
];

const MAX_ROOMS = 9;
const BUILD_COST = 10000;

function _ensure(player) {
    if (!player._dreamArch) {
        player._dreamArch = {
            hasDungeon: false,
            dungeonName: '',
            rooms: [],              // [{ theme, traps: [trapId], guardian: guardianId|null }]
            published: false,
            totalInvestment: 0,     // 총 투자 골드
            stats: {
                totalChallengers: 0,
                totalClears: 0,
                totalDeaths: 0,
                revenue: 0,         // 수익 (도전자가 지불한 입장료)
                bestDefender: null, // 가장 많이 죽인 몬스터
                avgClearTime: 0,
            },
            rating: 0,              // 다른 플레이어들의 평점 (1~5)
            ratingCount: 0,
            likes: 0,
            // 도전 관련
            inChallenge: false,
            challengeState: null,
            challengesCompleted: 0,
            dreamTokens: 0,         // 꿈의 토큰 (도전 보상)
        };
    }
    return player._dreamArch;
}

// ============ 건축 시스템 ============

// 던전 생성
function createDungeon(player, name) {
    const state = _ensure(player);
    if (state.hasDungeon) return { success: false, msg: '이미 꿈의 던전이 있습니다.' };
    if ((player.level || 1) < 25) return { success: false, msg: 'Lv.25 이상 필요' };
    if ((player.gold || 0) < BUILD_COST) return { success: false, msg: `골드 부족 (${BUILD_COST}G)` };

    player.gold -= BUILD_COST;
    state.hasDungeon = true;
    state.dungeonName = (name && typeof name === 'string') ? name.slice(0, 20) : `${player.displayName}의 악몽`;
    state.totalInvestment = BUILD_COST;

    // 기본 3방 제공
    state.rooms = [
        { theme: 'void_hall', traps: [], guardian: null },
        { theme: 'void_hall', traps: [], guardian: null },
        { theme: 'shadow_throne', traps: [], guardian: null },
    ];

    return {
        success: true,
        msg: `🏗️💤 꿈의 던전 "${state.dungeonName}" 생성! 3개의 방이 준비되었습니다. 함정과 몬스터를 배치하세요!`,
    };
}

// 방 추가
function addRoom(player, themeId) {
    const state = _ensure(player);
    if (!state.hasDungeon) return { success: false, msg: '던전이 없습니다.' };
    if (state.rooms.length >= MAX_ROOMS) return { success: false, msg: `최대 ${MAX_ROOMS}방입니다.` };

    const theme = ROOM_THEMES[themeId];
    if (!theme) return { success: false, msg: '알 수 없는 테마' };

    const cost = 5000 * state.rooms.length;
    if ((player.gold || 0) < cost) return { success: false, msg: `골드 부족 (${cost}G)` };

    player.gold -= cost;
    state.totalInvestment += cost;
    // 보스 방 앞에 삽입
    state.rooms.splice(state.rooms.length - 1, 0, { theme: themeId, traps: [], guardian: null });

    return {
        success: true, roomCount: state.rooms.length, cost,
        msg: `${theme.icon} ${theme.name} 추가! (${state.rooms.length}방, -${cost}G)`,
    };
}

// 방 테마 변경
function setRoomTheme(player, roomIdx, themeId) {
    const state = _ensure(player);
    if (!state.hasDungeon) return { success: false, msg: '던전이 없습니다.' };
    if (roomIdx < 0 || roomIdx >= state.rooms.length) return { success: false, msg: '잘못된 방 번호' };

    const theme = ROOM_THEMES[themeId];
    if (!theme) return { success: false, msg: '알 수 없는 테마' };

    state.rooms[roomIdx].theme = themeId;
    return { success: true, msg: `${roomIdx + 1}번 방 → ${theme.icon} ${theme.name}` };
}

// 함정 배치
function placeTrap(player, roomIdx, trapId) {
    const state = _ensure(player);
    if (!state.hasDungeon) return { success: false, msg: '던전이 없습니다.' };
    if (roomIdx < 0 || roomIdx >= state.rooms.length) return { success: false, msg: '잘못된 방 번호' };

    const trap = TRAPS[trapId];
    if (!trap) return { success: false, msg: '알 수 없는 함정' };

    const room = state.rooms[roomIdx];
    const grade = _getGrade(state.rooms.length);
    const maxTrapsPerRoom = Math.ceil(grade.maxTraps / state.rooms.length) + 1;
    if (room.traps.length >= maxTrapsPerRoom) return { success: false, msg: `이 방에 함정 최대 ${maxTrapsPerRoom}개` };

    if ((player.gold || 0) < trap.cost) return { success: false, msg: `골드 부족 (${trap.cost}G)` };

    player.gold -= trap.cost;
    state.totalInvestment += trap.cost;
    room.traps.push(trapId);

    return {
        success: true, trap, cost: trap.cost,
        msg: `${trap.icon} ${trap.name} → ${roomIdx + 1}번 방 배치! (-${trap.cost}G)`,
    };
}

// 함정 제거
function removeTrap(player, roomIdx, trapIdx) {
    const state = _ensure(player);
    if (!state.hasDungeon) return { success: false, msg: '던전이 없습니다.' };
    const room = state.rooms[roomIdx];
    if (!room || trapIdx < 0 || trapIdx >= room.traps.length) return { success: false, msg: '잘못된 위치' };

    const removed = room.traps.splice(trapIdx, 1)[0];
    const trap = TRAPS[removed];
    // 50% 환불
    const refund = Math.floor((trap?.cost || 0) * 0.5);
    player.gold = Math.min((player.gold || 0) + refund, 999999999);

    return { success: true, msg: `${trap?.icon || ''} ${trap?.name || ''} 제거! +${refund}G 환불` };
}

// 수호 몬스터 배치
function placeGuardian(player, roomIdx, guardianId) {
    const state = _ensure(player);
    if (!state.hasDungeon) return { success: false, msg: '던전이 없습니다.' };
    if (roomIdx < 0 || roomIdx >= state.rooms.length) return { success: false, msg: '잘못된 방 번호' };

    const guardian = GUARDIANS[guardianId];
    if (!guardian) return { success: false, msg: '알 수 없는 수호 몬스터' };

    const room = state.rooms[roomIdx];
    if (room.guardian) return { success: false, msg: '이 방에 이미 수호 몬스터가 있습니다. 먼저 제거하세요.' };

    if ((player.gold || 0) < guardian.cost) return { success: false, msg: `골드 부족 (${guardian.cost}G)` };

    player.gold -= guardian.cost;
    state.totalInvestment += guardian.cost;
    room.guardian = guardianId;

    return {
        success: true, guardian, cost: guardian.cost,
        msg: `${guardian.icon} ${guardian.name} → ${roomIdx + 1}번 방 배치! (-${guardian.cost}G)`,
    };
}

// 수호 몬스터 제거
function removeGuardian(player, roomIdx) {
    const state = _ensure(player);
    if (!state.hasDungeon) return { success: false, msg: '던전이 없습니다.' };
    const room = state.rooms[roomIdx];
    if (!room || !room.guardian) return { success: false, msg: '수호 몬스터가 없습니다.' };

    const guardian = GUARDIANS[room.guardian];
    room.guardian = null;
    const refund = Math.floor((guardian?.cost || 0) * 0.5);
    player.gold = Math.min((player.gold || 0) + refund, 999999999);

    return { success: true, msg: `${guardian?.icon || ''} ${guardian?.name || ''} 해제! +${refund}G 환불` };
}

// 던전 공개/비공개
function togglePublish(player) {
    const state = _ensure(player);
    if (!state.hasDungeon) return { success: false, msg: '던전이 없습니다.' };

    // 최소 요건: 함정 1개 + 수호 몬스터 1마리
    if (!state.published) {
        const hasTrap = state.rooms.some(r => r.traps.length > 0);
        const hasGuardian = state.rooms.some(r => r.guardian);
        if (!hasTrap || !hasGuardian) return { success: false, msg: '최소 함정 1개 + 수호 몬스터 1마리가 필요합니다.' };
    }

    state.published = !state.published;
    return {
        success: true,
        published: state.published,
        msg: state.published ? '🌐 던전 공개! 다른 모험가들이 도전할 수 있습니다.' : '🔒 던전 비공개.',
    };
}

function _getGrade(roomCount) {
    for (let i = DUNGEON_GRADES.length - 1; i >= 0; i--) {
        if (roomCount >= DUNGEON_GRADES[i].min) return DUNGEON_GRADES[i];
    }
    return DUNGEON_GRADES[0];
}

// ============ 도전 시스템 ============

// 다른 플레이어 던전 도전 (서버에서 owner 객체 전달)
function challengeDungeon(challenger, owner) {
    const cState = _ensure(challenger);
    if (cState.inChallenge) return { success: false, msg: '이미 도전 중입니다.' };

    const oState = _ensure(owner);
    if (!oState.hasDungeon || !oState.published) return { success: false, msg: '공개된 던전이 아닙니다.' };

    // 입장료 (총 투자금의 5%)
    const fee = Math.max(1000, Math.floor(oState.totalInvestment * 0.05));
    if ((challenger.gold || 0) < fee) return { success: false, msg: `입장료 부족 (${fee}G)` };

    challenger.gold -= fee;
    oState.stats.revenue += fee;
    oState.stats.totalChallengers++;

    cState.inChallenge = true;
    cState.challengeState = {
        ownerId: owner.id || owner.socketId,
        ownerName: owner.displayName,
        dungeonName: oState.dungeonName,
        rooms: JSON.parse(JSON.stringify(oState.rooms)), // deep copy
        currentRoom: 0,
        playerHp: challenger.hp || 100,
        playerMaxHp: challenger.maxHp || 100,
        startTime: Date.now(),
        roomsCleared: 0,
        totalDmgTaken: 0,
        fee,
    };

    const firstRoom = oState.rooms[0];
    const theme = ROOM_THEMES[firstRoom.theme];

    return {
        success: true,
        dungeonName: oState.dungeonName,
        ownerName: owner.displayName,
        totalRooms: oState.rooms.length,
        fee,
        firstRoom: { theme, traps: firstRoom.traps.length, guardian: firstRoom.guardian ? GUARDIANS[firstRoom.guardian]?.name : null },
        msg: `💤🏰 "${oState.dungeonName}" (by ${owner.displayName}) 도전! 입장료 ${fee}G | ${oState.rooms.length}방`,
    };
}

// 방 공략
function clearRoom(challenger) {
    const cState = _ensure(challenger);
    if (!cState.inChallenge || !cState.challengeState) return { success: false, msg: '도전 중이 아닙니다.' };

    const cs = cState.challengeState;
    if (cs.currentRoom >= cs.rooms.length) return { success: false, msg: '모든 방을 클리어했습니다.' };

    const room = cs.rooms[cs.currentRoom];
    const theme = ROOM_THEMES[room.theme];
    const challengerAtk = (challenger.atk || 10) + (challenger.level || 1) * 2;
    let totalDmgTaken = 0;
    const events = [];

    // 테마 효과
    const themeDefBonus = theme?.defBonus || 0;

    // 함정 처리
    for (const trapId of room.traps) {
        const trap = TRAPS[trapId];
        if (!trap) continue;

        // 회피 판정 (30% 기본)
        const dodged = Math.random() < 0.3;
        if (dodged) {
            events.push(`${trap.icon} ${trap.name} 회피!`);
            continue;
        }

        const trapDmg = trap.dmg;
        totalDmgTaken += trapDmg;
        events.push(`${trap.icon} ${trap.name} 발동! -${trapDmg} HP`);

        // 시간 루프
        if (trap.effect?.replayRoom) {
            events.push('⏳🔄 시간 루프! 이 방을 다시 진행합니다!');
            // 함정 데미지 2배 적용
            totalDmgTaken += Math.floor(totalDmgTaken * 0.5);
        }
    }

    // 수호 몬스터 전투
    let guardianResult = null;
    if (room.guardian) {
        const g = GUARDIANS[room.guardian];
        if (g) {
            const gHp = Math.floor(g.hp * (1 + themeDefBonus));
            const gAtk = g.atk;
            const gDef = g.def;

            // 전투 시뮬레이션
            const turnsToKill = Math.max(1, Math.ceil(gHp / Math.max(1, challengerAtk - gDef)));
            const dmgFromGuardian = gAtk * turnsToKill * 0.6;
            totalDmgTaken += Math.floor(dmgFromGuardian);

            const won = challengerAtk > gDef * 0.5; // 충분한 공격력이 있으면 승리

            if (won) {
                events.push(`${g.icon} ${g.name} 격파! (${turnsToKill}턴, -${Math.floor(dmgFromGuardian)} HP)`);
                guardianResult = { won: true, name: g.name, turns: turnsToKill };
            } else {
                // 패배 — 큰 데미지
                totalDmgTaken += gHp;
                events.push(`${g.icon} ${g.name}에게 고전... 큰 피해!`);
                guardianResult = { won: false, name: g.name };
            }
        }
    }

    // HP 적용
    cs.playerHp = Math.max(0, cs.playerHp - totalDmgTaken);
    cs.totalDmgTaken += totalDmgTaken;

    // 사망 체크
    if (cs.playerHp <= 0) {
        cState.inChallenge = false;
        cState.challengeState = null;
        return {
            success: true, type: 'death',
            room: cs.currentRoom + 1, events,
            msg: `💀 ${cs.currentRoom + 1}번 방에서 사망! "${cs.dungeonName}" 도전 실패...`,
        };
    }

    cs.currentRoom++;
    cs.roomsCleared++;

    // 클리어 체크
    if (cs.currentRoom >= cs.rooms.length) {
        return _completeDungeon(challenger, cState, cs, events);
    }

    // HP 소량 회복
    cs.playerHp = Math.min(cs.playerMaxHp, cs.playerHp + Math.floor(cs.playerMaxHp * 0.05));

    const nextRoom = cs.rooms[cs.currentRoom];
    const nextTheme = ROOM_THEMES[nextRoom.theme];

    return {
        success: true, type: 'room_clear',
        room: cs.currentRoom, totalRooms: cs.rooms.length,
        events, hp: cs.playerHp, maxHp: cs.playerMaxHp,
        nextRoom: { theme: nextTheme, traps: nextRoom.traps.length, guardian: nextRoom.guardian ? GUARDIANS[nextRoom.guardian]?.name : null },
        msg: `${theme.icon} ${cs.currentRoom}/${cs.rooms.length}방 클리어! HP: ${cs.playerHp}/${cs.playerMaxHp}`,
    };
}

function _completeDungeon(challenger, cState, cs, events) {
    const elapsed = Math.floor((Date.now() - cs.startTime) / 1000);

    // 보상 (방 수 * 기본값 + 보너스)
    const roomCount = cs.rooms.length;
    const goldReward = roomCount * 3000;
    const expReward = roomCount * 1500;
    const tokenReward = roomCount * 2;

    challenger.gold = Math.min((challenger.gold || 0) + goldReward, 999999999);
    challenger.exp = (challenger.exp || 0) + expReward;
    cState.dreamTokens += tokenReward;
    cState.challengesCompleted++;

    cState.inChallenge = false;
    cState.challengeState = null;

    return {
        success: true, type: 'dungeon_clear',
        dungeonName: cs.dungeonName, ownerName: cs.ownerName,
        goldReward, expReward, tokenReward,
        clearTime: elapsed, roomsCleared: cs.roomsCleared,
        events,
        msg: `🎉 "${cs.dungeonName}" 완전 클리어! ${elapsed}초 | +${goldReward}G +${expReward}EXP +${tokenReward} 꿈 토큰`,
    };
}

// 도전 포기
function abandonChallenge(challenger) {
    const cState = _ensure(challenger);
    if (!cState.inChallenge) return { success: false, msg: '도전 중이 아닙니다.' };

    cState.inChallenge = false;
    cState.challengeState = null;
    return { success: true, msg: '🏳️ 도전 포기. 꿈에서 깨어났습니다...' };
}

// 평가 (1~5점)
function rateDungeon(player, ownerState, score) {
    if (typeof score !== 'number' || score < 1 || score > 5) return { success: false, msg: '1~5점으로 평가해주세요.' };
    const oState = ownerState;
    oState.rating = ((oState.rating * oState.ratingCount) + score) / (oState.ratingCount + 1);
    oState.ratingCount++;
    if (score >= 4) oState.likes++;

    return {
        success: true,
        msg: `⭐ ${score}점 평가 완료! (평균: ${oState.rating.toFixed(1)} / ${oState.ratingCount}명)`,
    };
}

// ============ 상태 ============

// 내 던전 상태
function getMyDungeon(player) {
    const state = _ensure(player);
    if (!state.hasDungeon) return { hasDungeon: false };

    const grade = _getGrade(state.rooms.length);
    return {
        hasDungeon: true,
        dungeonName: state.dungeonName,
        published: state.published,
        grade,
        totalInvestment: state.totalInvestment,
        rooms: state.rooms.map((r, idx) => ({
            index: idx,
            theme: ROOM_THEMES[r.theme],
            themeId: r.theme,
            traps: r.traps.map((t, ti) => ({ index: ti, id: t, ...TRAPS[t] })),
            guardian: r.guardian ? { id: r.guardian, ...GUARDIANS[r.guardian] } : null,
        })),
        stats: state.stats,
        rating: state.rating,
        ratingCount: state.ratingCount,
        likes: state.likes,
        dreamTokens: state.dreamTokens,
        challengesCompleted: state.challengesCompleted,
        availableThemes: ROOM_THEMES,
        availableTraps: TRAPS,
        availableGuardians: GUARDIANS,
    };
}

// 도전 상태
function getChallengeStatus(player) {
    const state = _ensure(player);
    if (!state.inChallenge || !state.challengeState) return { inChallenge: false };

    const cs = state.challengeState;
    const currentRoom = cs.rooms[cs.currentRoom];
    const theme = currentRoom ? ROOM_THEMES[currentRoom.theme] : null;

    return {
        inChallenge: true,
        dungeonName: cs.dungeonName,
        ownerName: cs.ownerName,
        currentRoom: cs.currentRoom + 1,
        totalRooms: cs.rooms.length,
        hp: cs.playerHp,
        maxHp: cs.playerMaxHp,
        roomInfo: currentRoom ? {
            theme,
            trapCount: currentRoom.traps.length,
            guardian: currentRoom.guardian ? GUARDIANS[currentRoom.guardian]?.name : null,
        } : null,
    };
}

module.exports = {
    ROOM_THEMES, TRAPS, GUARDIANS, DUNGEON_GRADES,
    createDungeon, addRoom, setRoomTheme,
    placeTrap, removeTrap, placeGuardian, removeGuardian,
    togglePublish, challengeDungeon, clearRoom, abandonChallenge,
    rateDungeon, getMyDungeon, getChallengeStatus,
};

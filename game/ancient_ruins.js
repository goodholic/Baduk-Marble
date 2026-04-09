// ==========================================
// 고대 유적 탐험 — v2.34
// 무작위 생성 던전. 매번 다른 구조.
// 함정/보물/비밀방/상인. 무한 탐험.
// ==========================================

// ── 방 타입 ──
const ROOM_TYPES = {
    empty:    { name: '빈 방',       icon: '⬜', weight: 20, desc: '아무것도 없는 텅 빈 방이다.' },
    monster:  { name: '몬스터 방',   icon: '👹', weight: 30, desc: '적이 기다리고 있다!' },
    treasure: { name: '보물 방',     icon: '💰', weight: 12, desc: '빛나는 상자가 보인다!' },
    trap:     { name: '함정 방',     icon: '⚠️', weight: 15, desc: '바닥에 수상한 문양이...' },
    puzzle:   { name: '퍼즐 방',     icon: '🧩', weight: 8,  desc: '고대 문자가 새겨진 석판이 있다.' },
    merchant: { name: '떠돌이 상인', icon: '🏪', weight: 5,  desc: '"어서 오게... 좋은 물건이 있다네."' },
    shrine:   { name: '신비의 제단', icon: '⛩️', weight: 5,  desc: '오래된 제단에서 신비로운 기운이 느껴진다.' },
    boss:     { name: '보스 방',     icon: '💀', weight: 0,  desc: '거대한 문 너머로 강한 기운이...' },
    secret:   { name: '비밀 방',     icon: '🔮', weight: 3,  desc: '벽 뒤에 숨겨진 공간을 발견했다!' },
    exit:     { name: '출구',        icon: '🚪', weight: 2,  desc: '다음 층으로 내려가는 계단이다.' },
};

// ── 함정 종류 ──
const TRAP_TYPES = [
    { name: '독침 함정',     dmgType: 'poison', dmg: 50, dot: 10, dotDur: 10, icon: '☠️' },
    { name: '화염 구덩이',   dmgType: 'fire',   dmg: 100, burn: 5, icon: '🔥' },
    { name: '낙석 함정',     dmgType: 'phys',   dmg: 150, stun: 2, icon: '🪨' },
    { name: '얼음 바닥',     dmgType: 'ice',    dmg: 30, slow: 0.5, slowDur: 8, icon: '🧊' },
    { name: '차원 함정',     dmgType: 'void',   dmg: 80, teleport: true, icon: '🌀' },
    { name: '저주 함정',     dmgType: 'curse',  dmg: 0, debuff: 'atk', debuffVal: -0.2, dur: 60, icon: '🪬' },
];

// ── 보물 테이블 (층 기반) ──
const TREASURE_TABLE = {
    common:    { gold: [200,500],   items: ['potion_hp','potion_mp','mat_magic'], diamondChance: 0 },
    uncommon:  { gold: [500,1500],  items: ['mat_soul','goods_gem','equip_ring_1'], diamondChance: 0.1 },
    rare:      { gold: [1500,5000], items: ['mat_dragon','equip_sword_3','rune_pack'], diamondChance: 0.3, diamonds: [5,15] },
    epic:      { gold: [5000,15000],items: ['equip_sword_4','equip_armor_4','relic_shard'], diamondChance: 0.5, diamonds: [15,50] },
    legendary: { gold: [15000,50000],items: ['equip_sword_5','equip_mythic_armor','relic_ancient'], diamondChance: 1.0, diamonds: [50,200] },
};

// ── 퍼즐 종류 ──
const PUZZLES = [
    { type: 'sequence', desc: '석판의 기호를 순서대로 누르세요 (3~5개)', difficulty: [3,4,5], reward: 'uncommon' },
    { type: 'riddle', desc: '수수께끼를 풀어라', choices: 3, reward: 'rare' },
    { type: 'memory', desc: '빛나는 타일을 기억하세요 (4~6개)', difficulty: [4,5,6], reward: 'rare' },
    { type: 'combat_puzzle', desc: '정해진 순서로 적을 처치하라', reward: 'epic' },
];

// ── 제단 효과 ──
const SHRINE_EFFECTS = [
    { name: '생명의 제단',   icon: '💚', effect: { healPct: 1.0 }, desc: 'HP 완전 회복!' },
    { name: '힘의 제단',     icon: '⚔️', effect: { buffAtk: 20, buffDur: 600 }, desc: 'ATK +20 (10분)' },
    { name: '지혜의 제단',   icon: '📖', effect: { buffExp: 0.5, buffDur: 600 }, desc: 'EXP +50% (10분)' },
    { name: '저주받은 제단', icon: '💀', effect: { cursed: true, dmg: 200, goldBonus: 2000 }, desc: 'HP -200, 골드 +2000' },
    { name: '행운의 제단',   icon: '🍀', effect: { luckBuff: true, buffDur: 600 }, desc: '보물 등급 1단계 상승 (10분)' },
    { name: '신비의 제단',   icon: '✨', effect: { revealMap: true }, desc: '현재 층 전체 맵 공개!' },
];

// ── 상인 상품 ──
const MERCHANT_STOCK = [
    { id: 'ruins_potion_hp', name: '유적 회복약', price: 300, effect: { healPct: 0.5 } },
    { id: 'ruins_torch', name: '고대 횃불', price: 500, effect: { visionBonus: 2, dur: 300 } },
    { id: 'ruins_key', name: '비밀 열쇠', price: 1000, effect: { openSecret: true } },
    { id: 'ruins_map', name: '유적 지도', price: 800, effect: { revealFloor: true } },
    { id: 'ruins_escape', name: '탈출 두루마리', price: 2000, effect: { escape: true } },
];

// ── 맵 생성 ──
function generateFloor(floorNum) {
    const roomCount = 8 + Math.floor(floorNum * 1.5); // 층마다 방 증가
    const rooms = [];
    const totalWeight = Object.values(ROOM_TYPES).reduce((s, r) => s + r.weight, 0);

    for (let i = 0; i < roomCount; i++) {
        let roll = Math.random() * totalWeight;
        let type = 'empty';
        for (const [t, r] of Object.entries(ROOM_TYPES)) {
            roll -= r.weight;
            if (roll <= 0) { type = t; break; }
        }
        rooms.push({
            id: i,
            type,
            explored: false,
            connected: [], // 인접 방 ID
            content: generateRoomContent(type, floorNum),
        });
    }

    // 연결 생성 (각 방에 1~3개 연결)
    for (let i = 0; i < rooms.length; i++) {
        const connections = 1 + Math.floor(Math.random() * 2);
        for (let c = 0; c < connections; c++) {
            const target = Math.floor(Math.random() * rooms.length);
            if (target !== i && !rooms[i].connected.includes(target)) {
                rooms[i].connected.push(target);
                rooms[target].connected.push(i);
            }
        }
    }

    // 보스 방 + 출구 강제 배치 (마지막)
    rooms[rooms.length - 2].type = 'boss';
    rooms[rooms.length - 2].content = generateRoomContent('boss', floorNum);
    rooms[rooms.length - 1].type = 'exit';
    rooms[rooms.length - 1].content = { desc: '다음 층 계단' };
    // 보스→출구 연결
    if (!rooms[rooms.length - 2].connected.includes(rooms.length - 1)) {
        rooms[rooms.length - 2].connected.push(rooms.length - 1);
        rooms[rooms.length - 1].connected.push(rooms.length - 2);
    }

    return { floorNum, rooms, bossDefeated: false };
}

function generateRoomContent(type, floor) {
    const scale = 1 + floor * 0.15;
    switch (type) {
        case 'monster':
            return { count: 2 + Math.floor(Math.random() * 3), hp: Math.floor(300 * scale), atk: Math.floor(20 * scale), def: Math.floor(8 * scale), goldReward: Math.floor(200 * scale), expReward: Math.floor(150 * scale) };
        case 'treasure':
            const grade = floor < 5 ? 'common' : floor < 10 ? 'uncommon' : floor < 20 ? 'rare' : floor < 30 ? 'epic' : 'legendary';
            const t = TREASURE_TABLE[grade];
            return { grade, gold: t.gold[0] + Math.floor(Math.random() * (t.gold[1] - t.gold[0])), item: t.items[Math.floor(Math.random() * t.items.length)], diamonds: t.diamondChance > 0 && Math.random() < t.diamondChance ? (t.diamonds ? t.diamonds[0] + Math.floor(Math.random() * (t.diamonds[1] - t.diamonds[0])) : 0) : 0 };
        case 'trap':
            return TRAP_TYPES[Math.floor(Math.random() * TRAP_TYPES.length)];
        case 'puzzle':
            return PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        case 'shrine':
            return SHRINE_EFFECTS[Math.floor(Math.random() * SHRINE_EFFECTS.length)];
        case 'merchant':
            return { stock: MERCHANT_STOCK.map(s => ({ ...s, price: Math.floor(s.price * scale) })) };
        case 'boss':
            return { name: `유적 수호자 Lv.${floor}`, hp: Math.floor(5000 * scale), atk: Math.floor(60 * scale), def: Math.floor(25 * scale), goldReward: Math.floor(3000 * scale), expReward: Math.floor(2000 * scale), diamonds: Math.floor(10 + floor * 2) };
        case 'secret':
            return { grade: floor < 15 ? 'rare' : 'epic', ...TREASURE_TABLE[floor < 15 ? 'rare' : 'epic'] };
        default:
            return {};
    }
}

function _ensure(player) {
    if (!player._ancientRuins) {
        player._ancientRuins = {
            active: null,     // { floor, currentRoom, hp, map }
            deepestFloor: 0,
            totalRooms: 0,
            totalBossKills: 0,
            puzzlesSolved: 0,
            secretsFound: 0,
        };
    }
    return player._ancientRuins;
}

// 탐험 시작 / 재개
function enterRuins(player) {
    const state = _ensure(player);
    if (state.active) return { success: false, msg: '이미 탐험 중 (continue 사용)' };
    const floor = generateFloor(1);
    state.active = { floor: 1, currentRoom: 0, hp: player.maxHp || 100, map: floor };
    floor.rooms[0].explored = true;
    return { success: true, floor: 1, room: floor.rooms[0], connections: floor.rooms[0].connected.map(i => ({ id: i, type: floor.rooms[i].explored ? floor.rooms[i].type : '?', icon: floor.rooms[i].explored ? ROOM_TYPES[floor.rooms[i].type]?.icon : '❓' })), msg: '🏛️ 고대 유적에 발을 들였다...' };
}

// 방 이동
function moveToRoom(player, roomId) {
    const state = _ensure(player);
    if (!state.active) return { success: false, msg: '탐험 중이 아닙니다' };
    const map = state.active.map;
    const currentRoom = map.rooms[state.active.currentRoom];
    if (!currentRoom.connected.includes(roomId)) return { success: false, msg: '연결되지 않은 방' };
    if (roomId < 0 || roomId >= map.rooms.length) return { success: false, msg: '잘못된 방' };

    state.active.currentRoom = roomId;
    const room = map.rooms[roomId];
    room.explored = true;
    state.totalRooms++;

    const result = { success: true, room: { ...room, content: room.content }, connections: room.connected.map(i => ({ id: i, type: map.rooms[i].explored ? map.rooms[i].type : '?', icon: map.rooms[i].explored ? ROOM_TYPES[map.rooms[i].type]?.icon : '❓' })) };

    // 출구 → 다음 층
    if (room.type === 'exit' && map.bossDefeated) {
        const nextFloor = state.active.floor + 1;
        if (nextFloor > state.deepestFloor) state.deepestFloor = nextFloor;
        const newMap = generateFloor(nextFloor);
        state.active.floor = nextFloor;
        state.active.map = newMap;
        state.active.currentRoom = 0;
        newMap.rooms[0].explored = true;
        result.newFloor = true;
        result.floor = nextFloor;
        result.room = newMap.rooms[0];
        result.connections = newMap.rooms[0].connected.map(i => ({ id: i, type: '?', icon: '❓' }));
        result.msg = `⬇️ ${nextFloor}층으로 내려간다...`;
    }

    return result;
}

// 방 상호작용 (전투, 보물 열기, 함정 처리, 퍼즐 풀기 등)
function interact(player, action) {
    const state = _ensure(player);
    if (!state.active) return { success: false, msg: '탐험 중이 아닙니다' };
    const room = state.active.map.rooms[state.active.currentRoom];

    switch (room.type) {
        case 'monster':
        case 'boss': {
            if (!room.content || room.content.count === 0 || room.content.hp <= 0) return { success: true, msg: '이미 처리됨' };
            const dmg = Math.max(1, (player.atk || 10) * (player.dmgMulti || 1) - (room.content.def || 0) * 0.3);
            room.content.hp -= dmg;
            if (room.content.hp <= 0) {
                player.gold = Math.min(999999999, (player.gold || 0) + room.content.goldReward);
                player.exp = (player.exp || 0) + room.content.expReward;
                if (room.content.diamonds) player.diamonds = Math.min(9999999, (player.diamonds || 0) + room.content.diamonds);
                if (room.type === 'boss') { state.active.map.bossDefeated = true; state.totalBossKills++; }
                return { success: true, cleared: true, reward: { gold: room.content.goldReward, exp: room.content.expReward, diamonds: room.content.diamonds || 0 }, msg: room.type === 'boss' ? '💀 보스 처치!' : '👹 적 처치!' };
            }
            return { success: true, hp: room.content.hp, msg: `공격! -${Math.floor(dmg)} (남은 HP: ${Math.floor(room.content.hp)})` };
        }
        case 'treasure': {
            if (room.content._looted) return { success: true, msg: '이미 열었음' };
            room.content._looted = true;
            player.gold = Math.min(999999999, (player.gold || 0) + room.content.gold);
            if (room.content.item) { if (!player.inventory) player.inventory = {}; player.inventory[room.content.item] = (player.inventory[room.content.item] || 0) + 1; }
            if (room.content.diamonds) player.diamonds = Math.min(9999999, (player.diamonds || 0) + room.content.diamonds);
            return { success: true, loot: room.content, msg: `💰 ${room.content.grade} 보물! +${room.content.gold}G` };
        }
        case 'shrine': {
            if (room.content._used) return { success: true, msg: '이미 사용됨' };
            room.content._used = true;
            if (room.content.effect.healPct) player.hp = Math.min(player.maxHp || 100, Math.floor((player.maxHp || 100) * room.content.effect.healPct));
            if (room.content.effect.goldBonus) player.gold = Math.min(999999999, (player.gold || 0) + room.content.effect.goldBonus);
            if (room.content.effect.dmg) player.hp = Math.max(1, (player.hp || 100) - room.content.effect.dmg);
            return { success: true, shrine: room.content, msg: `${room.content.icon} ${room.content.name}: ${room.content.desc}` };
        }
        case 'puzzle': {
            if (room.content._solved) return { success: true, msg: '이미 풀었음' };
            // 간단 확률 판정 (실제로는 클라이언트 UI)
            const success = Math.random() < 0.6;
            if (success) {
                room.content._solved = true;
                state.puzzlesSolved++;
                const grade = room.content.reward;
                const t = TREASURE_TABLE[grade];
                const gold = t.gold[0] + Math.floor(Math.random() * (t.gold[1] - t.gold[0]));
                player.gold = Math.min(999999999, (player.gold || 0) + gold);
                return { success: true, solved: true, reward: { gold, grade }, msg: `🧩 퍼즐 해결! +${gold}G` };
            }
            return { success: true, solved: false, msg: '🧩 퍼즐 실패... 다시 도전하세요' };
        }
        case 'trap': {
            if (room.content._triggered) return { success: true, msg: '이미 발동됨' };
            room.content._triggered = true;
            player.hp = Math.max(1, (player.hp || 100) - room.content.dmg);
            return { success: true, trap: room.content, msg: `${room.content.icon} ${room.content.name}! -${room.content.dmg} HP` };
        }
        case 'secret': {
            if (room.content._found) return { success: true, msg: '이미 발견됨' };
            room.content._found = true;
            state.secretsFound++;
            const t = TREASURE_TABLE[room.content.grade];
            const gold = t.gold[0] + Math.floor(Math.random() * (t.gold[1] - t.gold[0]));
            const item = t.items[Math.floor(Math.random() * t.items.length)];
            player.gold = Math.min(999999999, (player.gold || 0) + gold);
            if (!player.inventory) player.inventory = {};
            player.inventory[item] = (player.inventory[item] || 0) + 1;
            return { success: true, secret: { gold, item, grade: room.content.grade }, msg: `🔮 비밀 방! ${room.content.grade} 보물 발견!` };
        }
        default:
            return { success: true, msg: room.type === 'merchant' ? '상인에게 말을 걸어보자' : '아무것도 없다' };
    }
}

// 상인 구매
function buyFromMerchant(player, itemIndex) {
    const state = _ensure(player);
    if (!state.active) return { success: false };
    const room = state.active.map.rooms[state.active.currentRoom];
    if (room.type !== 'merchant') return { success: false, msg: '상인 방이 아닙니다' };
    const item = room.content.stock[itemIndex];
    if (!item) return { success: false, msg: '잘못된 상품' };
    if ((player.gold || 0) < item.price) return { success: false, msg: `골드 부족 (${item.price}G)` };
    player.gold -= item.price;
    return { success: true, item, msg: `${item.name} 구매! (-${item.price}G)` };
}

// 탐험 포기
function abandon(player) {
    const state = _ensure(player);
    if (!state.active) return { success: false };
    const floor = state.active.floor;
    state.active = null;
    return { success: true, msg: `유적 탈출 (${floor}층)` };
}

// 상태
function getStatus(player) {
    const state = _ensure(player);
    return {
        active: state.active ? { floor: state.active.floor, currentRoom: state.active.currentRoom, hp: state.active.hp, bossDefeated: state.active.map.bossDefeated, roomCount: state.active.map.rooms.length, exploredCount: state.active.map.rooms.filter(r => r.explored).length } : null,
        deepestFloor: state.deepestFloor,
        totalRooms: state.totalRooms,
        totalBossKills: state.totalBossKills,
        puzzlesSolved: state.puzzlesSolved,
        secretsFound: state.secretsFound,
    };
}

module.exports = {
    ROOM_TYPES, TRAP_TYPES, TREASURE_TABLE, PUZZLES, SHRINE_EFFECTS, MERCHANT_STOCK,
    enterRuins, moveToRoom, interact, buyFromMerchant, abandon, getStatus,
};

// v5.6 — IO 미궁 던전 모드
// 랜덤 생성 미궁을 IO 조작으로 탐험, 퍼즐+전투+보물

const MAZE_SIZES = {
  small:  { w: 15, h: 15, rooms: 8,  time: 180, diff: 'easy', reward: { gold: 5000 } },
  medium: { w: 25, h: 25, rooms: 15, time: 300, diff: 'normal', reward: { gold: 15000 } },
  large:  { w: 40, h: 40, rooms: 25, time: 480, diff: 'hard', reward: { gold: 40000 } },
  mega:   { w: 60, h: 60, rooms: 40, time: 600, diff: 'nightmare', reward: { gold: 80000, item: 'maze_relic' } },
};

// 방 유형 (미궁 내 랜덤 배치)
const ROOM_TYPES = [
  { id: 'monster', name: '몬스터 방', icon: '👹', chance: 0.30, desc: '전투 필수, 클리어 시 진행' },
  { id: 'treasure', name: '보물 방', icon: '💎', chance: 0.15, desc: '보물 상자 (골드/아이템)' },
  { id: 'puzzle', name: '퍼즐 방', icon: '🧩', chance: 0.12, desc: '퍼즐 풀면 보상, 실패 시 함정' },
  { id: 'trap', name: '함정 방', icon: '🪤', chance: 0.15, desc: '함정 회피 또는 피해' },
  { id: 'shop', name: '상점', icon: '🏪', chance: 0.08, desc: '미궁 내 상인, 아이템 구매' },
  { id: 'rest', name: '휴식처', icon: '⛺', chance: 0.08, desc: 'HP 30% 회복, 세이브 포인트' },
  { id: 'boss', name: '보스 방', icon: '💀👑', chance: 0.05, desc: '미니보스, 클리어 시 열쇠 획득' },
  { id: 'secret', name: '비밀 방', icon: '❓', chance: 0.05, desc: '숨겨진 방, 특수 보상' },
  { id: 'teleport', name: '전송 방', icon: '🌀', chance: 0.05, desc: '다른 방으로 순간이동' },
  { id: 'event', name: '이벤트 방', icon: '⭐', chance: 0.07, desc: '랜덤 이벤트 (행운/불운)' },
];

// 미궁 퍼즐 유형
const PUZZLE_TYPES = [
  { id: 'pattern', name: '패턴 기억', desc: '빛나는 타일 순서 기억', difficulty: 3 },
  { id: 'math', name: '수학 퍼즐', desc: '숫자 조합으로 문 열기', difficulty: 4 },
  { id: 'color', name: '색상 맞추기', desc: '올바른 색상 순서 입력', difficulty: 3 },
  { id: 'maze_in_maze', name: '미궁 속 미궁', desc: '미니 미궁 통과', difficulty: 5 },
  { id: 'riddle', name: '수수께끼', desc: 'NPC의 수수께끼에 정답', difficulty: 4 },
  { id: 'timing', name: '타이밍 퍼즐', desc: '정확한 타이밍에 버튼 누르기', difficulty: 3 },
];

// 미궁 보스
const MAZE_BOSSES = [
  { id: 'minotaur', name: '미노타우로스', icon: '🐂💀', hp: 30000, atk: 350, skill: '돌진(직선 범위)', drop: 'maze_key' },
  { id: 'sphinx', name: '스핑크스', icon: '🦁👤', hp: 25000, atk: 250, skill: '수수께끼(맞추면 약화, 틀리면 강화)', drop: 'wisdom_stone' },
  { id: 'medusa', name: '메두사', icon: '🐍👩', hp: 20000, atk: 400, skill: '석화 시선(정면 응시 시 석화)', drop: 'snake_eye' },
  { id: 'labyrinth_lord', name: '미궁의 군주', icon: '🌀👑', hp: 50000, atk: 500, skill: '미궁 변형(맵 재구성!)', drop: 'labyrinth_core', final: true },
];

// 미궁 아이템 (던전 내에서만 사용)
const MAZE_ITEMS = [
  { id: 'map_fragment', name: '지도 조각', icon: '🗺️', desc: '미궁 일부 공개', rarity: 'common' },
  { id: 'torch', name: '횃불', icon: '🔦', desc: '시야 확장 (30초)', rarity: 'common' },
  { id: 'teleport_stone', name: '전송석', icon: '🌀', desc: '휴식처로 즉시 이동', rarity: 'uncommon' },
  { id: 'trap_detector', name: '함정 탐지기', icon: '📡', desc: '인접 방 함정 표시', rarity: 'uncommon' },
  { id: 'skeleton_key', name: '만능 열쇠', icon: '🔑', desc: '잠긴 문 1개 열기', rarity: 'rare' },
  { id: 'compass', name: '나침반', icon: '🧭', desc: '출구 방향 표시', rarity: 'rare' },
  { id: 'time_crystal', name: '시간 결정', icon: '⏰💎', desc: '제한 시간 +60초', rarity: 'epic' },
  { id: 'ghost_form', name: '유체이탈 부적', icon: '👻', desc: '30초간 벽 통과 가능', rarity: 'epic' },
];

function generateMaze(size) {
  const config = MAZE_SIZES[size] || MAZE_SIZES.medium;
  const rooms = [];
  for (let i = 0; i < config.rooms; i++) {
    const roll = Math.random();
    let cum = 0;
    for (const rt of ROOM_TYPES) {
      cum += rt.chance;
      if (roll <= cum) { rooms.push({ ...rt, index: i, cleared: false }); break; }
    }
  }
  // 마지막 방은 항상 보스
  rooms.push({ ...ROOM_TYPES.find(r => r.id === 'boss'), index: rooms.length, cleared: false, finalBoss: true });
  return { config, rooms, created: Date.now() };
}

function register(io, socket, player) {
  socket.on('maze_start', (data) => {
    const maze = generateMaze(data.size || 'medium');
    player.activeMaze = maze;
    socket.emit('maze_start_result', { ok: true, maze });
  });
  socket.on('maze_enter_room', (data) => {
    const maze = player.activeMaze;
    if (!maze) return socket.emit('maze_room_result', { ok: false });
    const room = maze.rooms[data.roomIndex];
    if (!room) return socket.emit('maze_room_result', { ok: false });
    room.cleared = true;
    const puzzle = room.id === 'puzzle' ? PUZZLE_TYPES[Math.floor(Math.random() * PUZZLE_TYPES.length)] : null;
    const boss = room.id === 'boss' ? MAZE_BOSSES[Math.floor(Math.random() * MAZE_BOSSES.length)] : null;
    socket.emit('maze_room_result', { ok: true, room, puzzle, boss });
  });
  socket.on('maze_info', () => {
    socket.emit('maze_info', { sizes: MAZE_SIZES, rooms: ROOM_TYPES, puzzles: PUZZLE_TYPES, bosses: MAZE_BOSSES, items: MAZE_ITEMS });
  });
}

module.exports = { MAZE_SIZES, ROOM_TYPES, PUZZLE_TYPES, MAZE_BOSSES, MAZE_ITEMS, generateMaze, register };

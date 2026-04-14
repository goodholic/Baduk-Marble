// v6.8 — IO 중력 변환 모드
// 중력 방향이 바뀌는 IO! 벽걷기, 천장 전투, 무중력 구간

const MATCH_DURATION = 240;
const GRAVITY_SHIFT_INTERVAL = 30; // 30초마다 중력 변경

const GRAVITY_STATES = [
  { id: 'normal', name: '정상 중력', icon: '⬇️', dir: 'down', effect: {}, desc: '일반 상태' },
  { id: 'reverse', name: '역중력', icon: '⬆️', dir: 'up', effect: { invertY: true }, desc: '천장이 바닥! 모든 것이 위로!' },
  { id: 'left', name: '좌측 중력', icon: '⬅️', dir: 'left', effect: { rotateMap: 90 }, desc: '왼쪽이 아래!' },
  { id: 'right', name: '우측 중력', icon: '➡️', dir: 'right', effect: { rotateMap: -90 }, desc: '오른쪽이 아래!' },
  { id: 'zero', name: '무중력', icon: '🌀', dir: 'none', effect: { floating: true, moveFree: true }, desc: '자유 비행! 3D 이동!' },
  { id: 'heavy', name: '초중력', icon: '⬇️⬇️', dir: 'down', effect: { gravMul: 3.0, jumpDisable: true }, desc: '점프 불가! 납 같은 몸!' },
  { id: 'pulse', name: '펄스 중력', icon: '💫', dir: 'pulse', effect: { gravPulse: true }, desc: '2초마다 중력 반전! 멀미 주의!' },
  { id: 'selective', name: '선택적 중력', icon: '🎯⬇️', dir: 'selective', effect: { playerGravity: 'individual' }, desc: '플레이어마다 중력 다름!' },
];

// 중력 맵
const GRAVITY_MAPS = [
  { id: 'cube_arena', name: '큐브 아레나', icon: '🧊⚔️', desc: '6면 모두 전투 가능한 큐브!', surfaces: 6 },
  { id: 'floating_ruins', name: '부유 유적', icon: '🏛️🌀', desc: '무중력 공간에 떠다니는 플랫폼', zeroG: true },
  { id: 'gravity_tower', name: '중력 탑', icon: '🗼⬆️⬇️', desc: '층마다 중력 방향 변경!', floors: 10 },
  { id: 'mobius_strip', name: '뫼비우스 띠', icon: '♾️', desc: '끝없는 고리! 걸으면 중력 반전', loop: true },
  { id: 'asteroid_field', name: '소행성 지대', icon: '☄️🌀', desc: '우주 공간, 소행성 사이 전투', space: true },
];

// 중력 아이템
const GRAVITY_ITEMS = [
  { id: 'gravity_boots', name: '중력 부츠', icon: '👢⬇️', effect: '중력 변화 무시 (30초)', rarity: 'rare' },
  { id: 'gravity_gun', name: '중력총', icon: '🔫🌀', effect: '대상의 개인 중력 반전!', rarity: 'epic' },
  { id: 'black_hole_grenade', name: '블랙홀 수류탄', icon: '🌑💣', effect: '범위 흡인 + 무중력화', rarity: 'epic' },
  { id: 'anchor', name: '닻', icon: '⚓', effect: '현재 위치에 고정 (10초)', rarity: 'uncommon' },
  { id: 'wings', name: '중력 날개', icon: '🦋', effect: '무중력 상태 자유 비행 (20초)', rarity: 'rare' },
  { id: 'gravity_bomb', name: '중력 폭탄', icon: '💣⬇️⬆️', effect: '범위 초중력화 (적 움직임 -80%)', rarity: 'legendary' },
];

// 보상
const GRAVITY_REWARDS = {
  first:   { gold: 25000, exp: 2500, title: '중력의 지배자' },
  top3:    { gold: 12000, exp: 1200 },
  zero_g_kill: { gold: 5000, desc: '무중력 상태에서 킬' },
  ceiling_kill: { gold: 8000, desc: '천장에서 킬!' },
  multi_surface: { gold: 10000, title: '다면 전사', desc: '3개 이상 면에서 킬 달성' },
};

function register(io, socket, player) {
  socket.on('gravity_info', () => {
    socket.emit('gravity_info', { states: GRAVITY_STATES, maps: GRAVITY_MAPS, items: GRAVITY_ITEMS, rewards: GRAVITY_REWARDS, interval: GRAVITY_SHIFT_INTERVAL });
  });
  socket.on('gravity_join', (data) => {
    socket.emit('gravity_join_result', { ok: true, map: GRAVITY_MAPS.find(m => m.id === data.mapId) });
    io.emit('server_msg', `🌀⬆️⬇️ [중력 변환] ${player.name}이(가) 중력 전투 참가! 위아래가 바뀐다!`);
  });
}

module.exports = { GRAVITY_STATES, GRAVITY_MAPS, GRAVITY_ITEMS, GRAVITY_REWARDS, register };

// v6.2 — IO 숨바꼭질 모드
// 1명 술래 vs 나머지 숨는 사람, 오브젝트 변신, 시간 제한

const MAX_PLAYERS = 15;
const MATCH_DURATION = 180; // 3분
const SEEKER_DELAY = 15; // 15초 후 술래 시작

const HIDE_MAPS = [
  { id: 'castle', name: '거대한 성', icon: '🏰', size: 1500, objects: 80, desc: '방이 많은 성, 숨을 곳 풍부' },
  { id: 'village', name: '마을', icon: '🏘️', size: 1200, objects: 60, desc: '집/상점/골목 활용' },
  { id: 'forest', name: '숲', icon: '🌲', size: 1800, objects: 100, desc: '나무/덤불/동굴' },
  { id: 'dungeon', name: '던전', icon: '🕳️', size: 1000, objects: 50, desc: '좁은 통로, 어둠' },
  { id: 'market', name: '시장', icon: '🏪', size: 900, objects: 120, desc: '가판대/상자 많음!', desc2: '오브젝트 최다' },
];

// 변신 가능 오브젝트 (숨는 사람)
const DISGUISE_OBJECTS = [
  { id: 'barrel', name: '통', icon: '🪣', size: 'medium', commonIn: ['castle', 'village'] },
  { id: 'crate', name: '상자', icon: '📦', size: 'medium', commonIn: ['market', 'dungeon'] },
  { id: 'bush', name: '덤불', icon: '🌿', size: 'large', commonIn: ['forest', 'village'] },
  { id: 'statue', name: '석상', icon: '🗿', size: 'large', commonIn: ['castle', 'dungeon'] },
  { id: 'lantern', name: '가로등', icon: '🏮', size: 'small', commonIn: ['village', 'market'] },
  { id: 'chair', name: '의자', icon: '🪑', size: 'small', commonIn: ['castle', 'market'] },
  { id: 'mushroom', name: '버섯', icon: '🍄', size: 'small', commonIn: ['forest', 'dungeon'] },
  { id: 'cart', name: '수레', icon: '🛒', size: 'large', commonIn: ['market', 'village'] },
  { id: 'armor_stand', name: '갑옷 거치대', icon: '🛡️', size: 'medium', commonIn: ['castle'] },
  { id: 'pot', name: '항아리', icon: '🏺', size: 'small', commonIn: ['castle', 'village', 'market'] },
];

// 술래 능력
const SEEKER_ABILITIES = [
  { id: 'scan', name: '탐색', icon: '🔍', cooldown: 20, desc: '주변 30범위 숨는 사람 하이라이트 (2초)' },
  { id: 'sprint', name: '질주', icon: '💨', cooldown: 15, desc: '5초간 SPD 2배' },
  { id: 'reveal', name: '공개', icon: '👁️', cooldown: 60, desc: '전원 위치 3초 공개!' },
  { id: 'trap', name: '함정', icon: '🪤', cooldown: 30, desc: '설치, 밟으면 변신 해제+3초 이동불가' },
  { id: 'scream', name: '공포의 비명', icon: '😱', cooldown: 45, desc: '주변 적 공포 (3초간 통제 불능, 이동 랜덤)' },
];

// 숨는 사람 능력
const HIDER_ABILITIES = [
  { id: 'transform', name: '변신', icon: '🎭', cooldown: 5, desc: '오브젝트로 변신 (주변 오브젝트 복사)' },
  { id: 'decoy', name: '미끼', icon: '🪆', cooldown: 30, desc: '가짜 오브젝트 생성 (클릭하면 폭발!)' },
  { id: 'dash', name: '급속 이동', icon: '💨', cooldown: 20, desc: '짧은 거리 순간이동' },
  { id: 'taunt', name: '도발', icon: '😜', cooldown: 15, desc: '소리를 내서 술래를 유인 (위치는 안 드러남)' },
  { id: 'freeze', name: '정지', icon: '🧊', cooldown: 10, desc: '완전 정지 (3초간 탐색 무효)' },
];

// 보상
const HNS_REWARDS = {
  seeker_win: { gold: 15000, exp: 1500, title: '최고의 술래' },
  hider_survive: { gold: 10000, exp: 1000, title: '은신의 달인' },
  last_hider: { gold: 20000, title: '최후의 생존자' },
  first_found: { gold: 2000, desc: '가장 먼저 발견됨 (위로상)' },
};

function register(io, socket, player) {
  socket.on('hns_info', () => {
    socket.emit('hns_info', { maps: HIDE_MAPS, objects: DISGUISE_OBJECTS, seekerAbilities: SEEKER_ABILITIES, hiderAbilities: HIDER_ABILITIES, rewards: HNS_REWARDS });
  });
  socket.on('hns_join', (data) => {
    socket.emit('hns_join_result', { ok: true, map: HIDE_MAPS.find(m => m.id === data.mapId) });
    io.emit('server_msg', `🙈 [숨바꼭질] ${player.name}이(가) 숨바꼭질 참가!`);
  });
}

module.exports = { HIDE_MAPS, DISGUISE_OBJECTS, SEEKER_ABILITIES, HIDER_ABILITIES, HNS_REWARDS, register };

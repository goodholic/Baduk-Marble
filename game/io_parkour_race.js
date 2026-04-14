// v6.0 — IO 파쿠르 레이스 모드
// 장애물 달리기 경주, 부스터/함정, 최대 20인 동시 레이스

const MAX_RACERS = 20;
const RACE_LENGTH = 3000; // 총 거리

const RACE_TRACKS = [
  { id: 'forest_run', name: '숲 질주', icon: '🌲💨', length: 2000, obstacles: 15, difficulty: 2, theme: 'forest' },
  { id: 'lava_dash', name: '용암 대시', icon: '🌋💨', length: 2500, obstacles: 20, difficulty: 5, theme: 'volcanic' },
  { id: 'sky_bridge', name: '하늘 다리', icon: '☁️💨', length: 3000, obstacles: 25, difficulty: 7, theme: 'sky', fallDeath: true },
  { id: 'ice_slide', name: '빙판 슬라이드', icon: '❄️💨', length: 2800, obstacles: 18, difficulty: 6, theme: 'ice', slippery: true },
  { id: 'dungeon_escape', name: '던전 탈출', icon: '🕳️💨', length: 3500, obstacles: 30, difficulty: 8, theme: 'dungeon', chase: true },
  { id: 'rainbow_road', name: '무지개 도로', icon: '🌈💨', length: 4000, obstacles: 35, difficulty: 10, theme: 'cosmic', special: '구간마다 중력 변경!' },
];

// 장애물 유형
const OBSTACLES = [
  { id: 'spike', name: '가시', icon: '📌', dmg: 10, slow: 0, desc: '밟으면 데미지' },
  { id: 'pit', name: '구덩이', icon: '🕳️', dmg: 0, slow: 0, desc: '빠지면 리스폰' },
  { id: 'wall', name: '벽', icon: '🧱', dmg: 0, slow: 0, desc: '점프 또는 파괴' },
  { id: 'swinging_axe', name: '회전 도끼', icon: '🪓🔄', dmg: 30, slow: 0, desc: '타이밍 회피' },
  { id: 'fire_pillar', name: '화염 기둥', icon: '🔥', dmg: 20, slow: 0.3, desc: '화염+둔화' },
  { id: 'ice_floor', name: '빙판', icon: '❄️', dmg: 0, slow: 0, desc: '미끄러짐!' },
  { id: 'cannon', name: '대포', icon: '💣', dmg: 40, slow: 0, desc: '랜덤 포격' },
  { id: 'moving_platform', name: '이동 발판', icon: '➡️⬅️', dmg: 0, slow: 0, desc: '타이밍 점프' },
  { id: 'wind_blast', name: '돌풍', icon: '🌪️', dmg: 0, slow: 0, desc: '밀어내기' },
  { id: 'darkness', name: '암흑 구간', icon: '🌑', dmg: 0, slow: 0, desc: '5초간 안 보임' },
];

// 부스터 아이템 (레이스 중 획득)
const BOOSTERS = [
  { id: 'speed_boost', name: '속도 부스트', icon: '💨⬆️', effect: '3초간 SPD 2배', rarity: 'common' },
  { id: 'shield', name: '보호막', icon: '🔰', effect: '다음 장애물 1회 무시', rarity: 'common' },
  { id: 'rocket', name: '로켓', icon: '🚀', effect: '5초간 비행 (장애물 무시)', rarity: 'uncommon' },
  { id: 'banana', name: '바나나', icon: '🍌', effect: '뒤에 함정 설치 (추월자 둔화)', rarity: 'uncommon' },
  { id: 'teleport', name: '텔레포트', icon: '🌀', effect: '1등과의 거리 절반 단축', rarity: 'rare' },
  { id: 'lightning', name: '번개', icon: '⚡', effect: '1등 3초 기절!', rarity: 'rare' },
  { id: 'time_stop', name: '시간 정지', icon: '⏰', effect: '다른 전원 2초 정지', rarity: 'epic' },
  { id: 'warp', name: '워프', icon: '🌟', effect: '즉시 1등 위치로!', rarity: 'legendary' },
];

// 보상
const RACE_REWARDS = {
  first:  { gold: 15000, exp: 1500, title: '스피드 킹', item: 'speed_boots' },
  top3:   { gold: 8000, exp: 800 },
  top5:   { gold: 4000, exp: 400 },
  finish: { gold: 1000, exp: 100 },
};

// 용병 파쿠르 능력치 (달리기 특화)
const PARKOUR_STATS = {
  speed:    { desc: '이동 속도', weight: 0.4 },
  agility:  { desc: '점프/회피 능력', weight: 0.3 },
  stamina:  { desc: '지구력 (후반 속도 유지)', weight: 0.2 },
  luck:     { desc: '부스터 획득 확률', weight: 0.1 },
};

function register(io, socket, player) {
  socket.on('parkour_info', () => {
    socket.emit('parkour_info', { tracks: RACE_TRACKS, obstacles: OBSTACLES, boosters: BOOSTERS, rewards: RACE_REWARDS, stats: PARKOUR_STATS });
  });
  socket.on('parkour_join', (data) => {
    socket.emit('parkour_join_result', { ok: true, track: RACE_TRACKS.find(t => t.id === data.trackId) });
    io.emit('server_msg', `🏃💨 [파쿠르] ${player.name}이(가) 레이스 참가!`);
  });
}

module.exports = { RACE_TRACKS, OBSTACLES, BOOSTERS, RACE_REWARDS, PARKOUR_STATS, register };

// v5.6 — IO 감염 모드
// 좀비 감염 서바이벌: 1명이 감염자, 나머지 생존자, 감염 전파

const MATCH_DURATION = 180; // 3분
const INITIAL_INFECTED = 1;
const MAX_PLAYERS = 20;

// 감염자 능력
const INFECTED_STATS = {
  hpMul: 1.5, atkMul: 0.8, spdMul: 1.3,
  passives: ['접촉 시 감염 전파', '사망 후 5초 뒤 부활', 'HP 서서히 회복'],
  evolve: [
    { kills: 0, name: '좀비', icon: '🧟', bonus: {} },
    { kills: 3, name: '추적자', icon: '🧟💨', bonus: { spdMul: 1.2 } },
    { kills: 6, name: '감염왕', icon: '🧟👑', bonus: { spdMul: 1.3, atkMul: 1.2 } },
    { kills: 10, name: '좀비 군주', icon: '💀👑', bonus: { spdMul: 1.5, atkMul: 1.5, hpMul: 2.0 } },
  ],
};

// 생존자 능력
const SURVIVOR_STATS = {
  hpMul: 1.0, atkMul: 1.2, spdMul: 1.0,
  passives: ['무기 사용 가능', '소환 용병 가능 (1회)', '트랩 설치 가능'],
};

// 생존자 아이템 (맵에 랜덤 스폰)
const SURVIVAL_ITEMS = [
  { id: 'medkit', name: '구급상자', icon: '🩹', effect: 'HP 50% 회복', rarity: 'common' },
  { id: 'speed_boost', name: '속도 부스트', icon: '💨', effect: '10초간 SPD ×2', rarity: 'common' },
  { id: 'barricade', name: '바리케이드', icon: '🪵', effect: '설치 위치 5초간 통행 차단', rarity: 'uncommon' },
  { id: 'flare_gun', name: '조명탄', icon: '🔫💡', effect: '30초간 모든 감염자 위치 공개', rarity: 'uncommon' },
  { id: 'cure_syringe', name: '치료 주사기', icon: '💉✨', effect: '감염자 1명을 생존자로 역전환!', rarity: 'epic' },
  { id: 'nuke', name: '최종 병기', icon: '💣☢️', effect: '범위 내 감염자 전원 10초 기절', rarity: 'legendary' },
];

// 맵 유형 (감염 모드 전용)
const INFECTION_MAPS = [
  { id: 'abandoned_city', name: '버려진 도시', icon: '🏚️', size: 1200, features: ['건물 엄폐', '지하철 통로'], visibility: 0.7 },
  { id: 'dark_forest', name: '어둠의 숲', icon: '🌲🌑', size: 1000, features: ['나무 엄폐', '안개'], visibility: 0.4 },
  { id: 'space_station', name: '우주 정거장', icon: '🚀', size: 800, features: ['좁은 통로', '에어락 함정'], visibility: 0.8 },
  { id: 'castle_ruins', name: '성 폐허', icon: '🏰💀', size: 1100, features: ['성벽', '비밀 통로'], visibility: 0.6 },
];

// 보상
const INFECTION_REWARDS = {
  survivor_win:     { gold: 10000, exp: 1000, title: '최후의 생존자' },
  infected_win:     { gold: 5000, exp: 500 },
  last_survivor:    { gold: 30000, exp: 3000, title: '불사신', frame: 'zombie_slayer' },
  most_infections:  { gold: 8000, exp: 800, title: '감염왕' },
  cure_master:      { gold: 15000, exp: 1500, title: '구세주' },
};

function createInfectionMatch(mapId) {
  const map = INFECTION_MAPS.find(m => m.id === mapId) || INFECTION_MAPS[0];
  return {
    id: `inf_${Date.now()}`,
    map, duration: MATCH_DURATION,
    players: [], infected: [],
    items: SURVIVAL_ITEMS.map(i => ({ ...i, spawned: false })),
    startTime: Date.now(), status: 'waiting',
  };
}

function register(io, socket, player) {
  socket.on('infection_info', () => {
    socket.emit('infection_info', {
      infectedStats: INFECTED_STATS, survivorStats: SURVIVOR_STATS,
      items: SURVIVAL_ITEMS, maps: INFECTION_MAPS, rewards: INFECTION_REWARDS,
    });
  });
  socket.on('infection_create', (data) => {
    const match = createInfectionMatch(data.mapId);
    socket.emit('infection_create_result', { ok: true, match });
    io.emit('server_msg', `🧟 [감염 모드] ${player.name}이(가) 감염 서바이벌 매치 생성! (맵: ${match.map.name})`);
  });
  socket.on('infection_join', (data) => {
    socket.emit('infection_join_result', { ok: true });
  });
}

module.exports = { INFECTED_STATS, SURVIVOR_STATS, SURVIVAL_ITEMS, INFECTION_MAPS, INFECTION_REWARDS, createInfectionMatch, register };

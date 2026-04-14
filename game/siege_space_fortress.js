// v6.9 — 우주 요새 공성전
// 우주 공간에서 요새 공략, 무중력 전투, 우주선, 소행성 장애물

const SPACE_FORTRESSES = [
  { id: 'asteroid_base', name: '소행성 기지', icon: '☄️🏰', hp: 50000, shields: 2, desc: '소행성 위 기지, 불규칙 지형' },
  { id: 'orbital_station', name: '궤도 정거장', icon: '🛸🏰', hp: 80000, shields: 3, desc: '거대 우주 정거장, 다중 구역' },
  { id: 'moon_fortress', name: '달 요새', icon: '🌙🏰', hp: 100000, shields: 4, desc: '달 표면 요새, 저중력', lowGravity: true },
  { id: 'nebula_citadel', name: '성운 성채', icon: '🌌🏰', hp: 120000, shields: 5, desc: '성운 속 숨겨진 요새, 시야 제한' },
  { id: 'black_hole_keep', name: '블랙홀 요새', icon: '🕳️🏰', hp: 150000, shields: 6, desc: '블랙홀 근처! 중력+시공간 왜곡', extreme: true },
  { id: 'dyson_sphere', name: '다이슨 구체', icon: '☀️🏰', hp: 500000, shields: 10, desc: '태양을 감싼 최종 요새! 서버 최강', mythic: true },
];

// 우주선
const SPACESHIPS = [
  { id: 'fighter', name: '전투기', icon: '🛩️✨', hp: 3000, spd: 10, weapons: 2, cost: 20000, desc: '빠른 소형 전투기' },
  { id: 'bomber', name: '폭격기', icon: '💣✨', hp: 6000, spd: 5, weapons: 4, cost: 50000, desc: '요새 폭격 특화' },
  { id: 'battleship', name: '전함', icon: '🚀⚔️', hp: 15000, spd: 3, weapons: 8, cost: 100000, desc: '대형 전투 함선' },
  { id: 'mothership', name: '모선', icon: '🛸👑', hp: 30000, spd: 2, weapons: 12, carrier: true, cost: 200000, desc: '전투기 탑재+발진', legendary: true },
  { id: 'planet_destroyer', name: '행성 파괴선', icon: '🌍💥', hp: 50000, spd: 1, weapons: 1, cost: 500000, desc: '궁극 무기: 행성 파괴 빔!', mythic: true },
];

// 우주 위험
const SPACE_HAZARDS = [
  { id: 'asteroid_field', name: '소행성 지대', icon: '☄️☄️', effect: '랜덤 충돌 DMG', counter: '회피 기동' },
  { id: 'solar_flare', name: '태양 폭풍', icon: '☀️💥', effect: '전자 장비 마비 (5초 조작 불가)', counter: '실드 강화' },
  { id: 'black_hole', name: '블랙홀 인력', icon: '🕳️', effect: '끌려들어감! 탈출 어려움', counter: '부스터/워프' },
  { id: 'space_debris', name: '우주 파편', icon: '🪨💫', effect: '랜덤 DMG+실드 감소', counter: '포인트 디펜스' },
  { id: 'nebula_gas', name: '성운 가스', icon: '🌌💨', effect: '시야 -80%+레이더 교란', counter: '탐지 장치' },
  { id: 'cosmic_ray', name: '우주선', icon: '☢️💫', effect: '용병 돌연변이! (랜덤 스탯 ±20%)', counter: '차폐 장갑' },
],

// 보상
const SPACE_REWARDS = {
  attacker_win: { gold: 80000, item: 'star_alloy', title: '우주 정복자' },
  defender_win: { gold: 60000, title: '우주 수호자' },
  dyson_win: { gold: 500000, title: '은하의 지배자', frame: 'galactic_king', serverBuff: '서버 전체+5% (1주)', merc: 'space_commander' },
  space_ace: { gold: 30000, desc: '우주선 10킬', title: '스페이스 에이스' },
};

function register(io, socket, player) {
  socket.on('space_siege_info', () => {
    socket.emit('space_siege_info', { fortresses: SPACE_FORTRESSES, ships: SPACESHIPS, hazards: SPACE_HAZARDS, rewards: SPACE_REWARDS });
  });
  socket.on('space_siege_join', (data) => {
    const fort = SPACE_FORTRESSES.find(f => f.id === data.fortressId);
    socket.emit('space_siege_join_result', { ok: true, fortress: fort });
    io.emit('server_msg', `🚀🏰 [우주 공성] ${player.name}이(가) "${fort?.name}" 우주 공성 참가!`);
  });
}

module.exports = { SPACE_FORTRESSES, SPACESHIPS, SPACE_HAZARDS, SPACE_REWARDS, register };

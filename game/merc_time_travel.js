// v5.9 — 용병 시간 여행 시스템
// 과거/미래로 이동, 역사 변경, 시간선 분기, 시간 패러독스

const TIME_TRAVEL_COST = 30000;
const COOLDOWN = 86400; // 1일

// 시간대
const TIME_ERAS = [
  { id: 'ancient', name: '태초의 시대', icon: '🏛️⏰', year: -10000, difficulty: 5,
    enemies: '고대 드래곤/타이탄', loot: ['태초의 파편', '고대 룬'], boss: { name: '시간의 수호자', hp: 200000 },
    alteration: '이 시대의 유물을 가져오면 현재 연구 속도+20%', lore: '모든 것이 시작된 시대' },
  { id: 'golden_age', name: '황금 시대', icon: '👑⏰', year: -5000, difficulty: 4,
    enemies: '고대 기사/마법사', loot: ['황금시대 장비', '잃어버린 기술서'], boss: { name: '황금왕', hp: 150000 },
    alteration: '황금 기술을 가져오면 장비 제작 비용-30%', lore: '문명의 절정기' },
  { id: 'dark_age', name: '암흑 시대', icon: '🌑⏰', year: -2000, difficulty: 7,
    enemies: '역병 좀비/타락 기사', loot: ['저주받은 유물', '암흑 에센스'], boss: { name: '역병왕', hp: 250000 },
    alteration: '역병을 막으면 현재 HP 재생+50%', lore: '세계가 멸망 직전이었던 시대' },
  { id: 'war_age', name: '대전쟁 시대', icon: '⚔️⏰', year: -500, difficulty: 6,
    enemies: '전쟁 골렘/군단병', loot: ['전쟁 유물', '파괴의 결정'], boss: { name: '전쟁의 화신', hp: 300000 },
    alteration: '전쟁을 끝내면 현재 공성전 DEF+15%', lore: '4진영이 싸운 대전쟁' },
  { id: 'future_utopia', name: '미래: 유토피아', icon: '🌆⏰', year: 1000, difficulty: 8,
    enemies: '미래 로봇/AI 수호자', loot: ['미래 기술', '나노 부품'], boss: { name: '오메가 AI', hp: 400000 },
    alteration: '미래 기술을 가져오면 영지 생산+40%', lore: '기술이 극에 달한 미래' },
  { id: 'future_apocalypse', name: '미래: 종말', icon: '💀⏰', year: 2000, difficulty: 10,
    enemies: '종말 괴수/차원 파괴자', loot: ['종말의 무기', '시간 결정'], boss: { name: '종말의 수호자', hp: 600000 },
    alteration: '종말을 막으면 서버 전체 전스탯+3% (1주)', lore: '세계가 멸망한 미래, 이것을 바꿀 수 있는가?' },
];

// 시간 패러독스 (역사 변경 시 발생)
const PARADOXES = [
  { id: 'butterfly', name: '나비 효과', chance: 0.2, effect: '랜덤 스탯 ±15%', desc: '작은 변화가 큰 결과를' },
  { id: 'loop', name: '시간 루프', chance: 0.1, effect: '같은 전투 2번 반복', desc: '같은 순간이 반복된다' },
  { id: 'doppelganger', name: '도플갱어', chance: 0.08, effect: '과거의 자신과 전투!', desc: '과거의 나와 대면' },
  { id: 'timeline_split', name: '시간선 분기', chance: 0.05, effect: '2개 보상 중 택 1', desc: '평행 세계가 갈라진다' },
  { id: 'temporal_collapse', name: '시간 붕괴', chance: 0.02, effect: '강제 귀환 + 보상 2배 or 0', desc: '위험! 시간이 무너진다!' },
];

// 시간 여행자 칭호
const TIME_TITLES = [
  { travels: 1, title: '시간 여행자' },
  { travels: 5, title: '시간 탐험가' },
  { travels: 10, title: '시간의 방랑자' },
  { travels: 20, title: '시간의 지배자' },
  { travels: 50, title: '영원의 관찰자' },
];

function timeTravel(player, eraId, mercIds) {
  const era = TIME_ERAS.find(e => e.id === eraId);
  if (!era) return { ok: false, reason: '알 수 없는 시대' };
  if ((player.gold || 0) < TIME_TRAVEL_COST) return { ok: false, reason: '골드 부족' };
  player.gold -= TIME_TRAVEL_COST;
  player.timeTravels = (player.timeTravels || 0) + 1;
  const paradox = PARADOXES.find(p => Math.random() < p.chance);
  const title = [...TIME_TITLES].reverse().find(t => player.timeTravels >= t.travels);
  player.activeTimeTravel = { eraId, mercIds, startTime: Date.now(), paradox };
  return { ok: true, era, paradox, title, warning: paradox ? `⚠️ 패러독스: ${paradox.name}!` : null };
}

function register(io, socket, player) {
  socket.on('time_travel_info', () => {
    socket.emit('time_travel_info', { eras: TIME_ERAS, paradoxes: PARADOXES, titles: TIME_TITLES, cost: TIME_TRAVEL_COST, travels: player.timeTravels || 0 });
  });
  socket.on('time_travel_go', (data) => {
    const result = timeTravel(player, data.eraId, data.mercIds || []);
    socket.emit('time_travel_result', result);
    if (result.ok) io.emit('server_msg', `⏰ [시간 여행] ${player.name}이(가) "${result.era.name}"(으)로 시간 이동!${result.paradox ? ' ⚠️패러독스 발생!' : ''}`);
  });
}

module.exports = { TIME_ERAS, PARADOXES, TIME_TITLES, TIME_TRAVEL_COST, timeTravel, register };

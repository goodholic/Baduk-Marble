// v6.8 — 카지노 리조트 경영
// 대규모 도박+리조트 시설 건설+관광 수입+이벤트

const RESORT_FACILITIES = [
  { id: 'casino_floor', name: '카지노 플로어', icon: '🎰🏛️', cost: 50000, income: 5000, maxLv: 5, desc: '도박 시설 (슬롯/포커/룰렛)' },
  { id: 'hotel', name: '호텔', icon: '🏨', cost: 30000, income: 3000, maxLv: 5, desc: '숙박 시설, 방문자 증가' },
  { id: 'restaurant', name: '레스토랑', icon: '🍽️', cost: 20000, income: 2000, maxLv: 5, desc: '고급 레스토랑, 요리 버프' },
  { id: 'spa', name: '스파', icon: '♨️', cost: 25000, income: 2500, maxLv: 3, desc: '용병 컨디션 회복+친밀도↑' },
  { id: 'arena', name: '격투장', icon: '🏟️', cost: 40000, income: 4000, maxLv: 3, desc: '투기장+관전+베팅 수입' },
  { id: 'theater', name: '극장', icon: '🎭', cost: 35000, income: 3500, maxLv: 3, desc: '공연+밴드 무대' },
  { id: 'pool', name: '수영장', icon: '🏊', cost: 15000, income: 1500, maxLv: 3, desc: '레저 시설' },
  { id: 'vip_lounge', name: 'VIP 라운지', icon: '👑🛋️', cost: 100000, income: 10000, maxLv: 2, desc: '최고급! VIP 전용', premium: true },
];

// 리조트 등급
const RESORT_GRADES = [
  { grade: 1, name: '모텔', stars: '⭐', visitors: 50, desc: '시작 등급' },
  { grade: 2, name: '호텔', stars: '⭐⭐', visitors: 150, req: { facilities: 3 } },
  { grade: 3, name: '리조트', stars: '⭐⭐⭐', visitors: 400, req: { facilities: 5 } },
  { grade: 4, name: '5성 리조트', stars: '⭐⭐⭐⭐⭐', visitors: 800, req: { facilities: 7 } },
  { grade: 5, name: '카지노 제국', stars: '👑⭐⭐⭐⭐⭐', visitors: 2000, req: { facilities: 8, vip: true }, title: '카지노 황제' },
];

// 리조트 이벤트
const RESORT_EVENTS = [
  { id: 'high_roller', name: '하이롤러 방문', chance: 0.05, effect: '도박 수입 5배 (1시간)', desc: 'VIP 고객!' },
  { id: 'celebrity', name: '유명인 방문', chance: 0.03, effect: '방문자 3배 (1일)', desc: '서버 유명인이 방문!' },
  { id: 'jackpot', name: '연속 잭팟', chance: 0.02, effect: '서버 알림+방문자 폭증', desc: '연속 잭팟 발생!' },
  { id: 'inspection', name: '감사', chance: 0.04, effect: '수입 -50% (1시간)', desc: '위원회 감사...' },
  { id: 'heist', name: '카지노 강도!', chance: 0.03, effect: '수비 전투 발생! 성공 시 보상 2배', desc: '도둑이 카지노를 노린다!' },
  { id: 'tournament', name: '포커 토너먼트', chance: 0.06, effect: '특별 토너먼트 개최, 참가비 수입', desc: '대규모 포커 대회' },
];

// 불법 활동 (숨겨진 수입원)
const UNDERGROUND_ACTIVITIES = [
  { id: 'rigged_games', name: '조작 게임', income: 8000, risk: 0.1, karma: -5, desc: '도박 확률 조작 (발각 시 벌금)' },
  { id: 'money_laundering', name: '돈세탁', income: 15000, risk: 0.08, karma: -10, desc: '의심스러운 자금 세탁' },
  { id: 'fight_club', name: '지하 격투 클럽', income: 10000, risk: 0.05, karma: -3, desc: '불법 격투 도박' },
];

function buildFacility(player, facilityId) {
  const fac = RESORT_FACILITIES.find(f => f.id === facilityId);
  if (!fac) return { ok: false, reason: '알 수 없는 시설' };
  if ((player.gold || 0) < fac.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= fac.cost;
  player.resort = player.resort || { facilities: {}, grade: 1 };
  player.resort.facilities[facilityId] = (player.resort.facilities[facilityId] || 0) + 1;
  const totalFac = Object.keys(player.resort.facilities).length;
  const newGrade = [...RESORT_GRADES].reverse().find(g => totalFac >= (g.req?.facilities || 0));
  if (newGrade) player.resort.grade = newGrade.grade;
  return { ok: true, facility: fac.name, grade: newGrade };
}

function register(io, socket, player) {
  socket.on('casino_resort_info', () => {
    socket.emit('casino_resort_info', { facilities: RESORT_FACILITIES, grades: RESORT_GRADES, events: RESORT_EVENTS, underground: UNDERGROUND_ACTIVITIES, resort: player.resort });
  });
  socket.on('casino_resort_build', (data) => {
    const result = buildFacility(player, data.facilityId);
    socket.emit('casino_build_result', result);
    if (result.grade?.grade >= 5) io.emit('server_msg', `👑🎰 [카지노 제국] ${player.name}이(가) 카지노 제국을 건설!`);
  });
}

module.exports = { RESORT_FACILITIES, RESORT_GRADES, RESORT_EVENTS, UNDERGROUND_ACTIVITIES, buildFacility, register };

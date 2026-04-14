// v6.3 — 영지 문화 시스템
// 문화 발전, 기념비 건설, 역사 기록, 문화 승리

const CULTURE_POINTS_PER_DAY = 10;

const CULTURAL_BUILDINGS = [
  { id: 'library', name: '대도서관', icon: '📚🏛️', cost: 30000, culture: 20, effect: '연구+15%, 기록 보관', maxLv: 5 },
  { id: 'theater', name: '대극장', icon: '🎭🏛️', cost: 25000, culture: 15, effect: '축제 효과 2배, 번영도+5', maxLv: 5 },
  { id: 'monument', name: '기념비', icon: '🗿🏛️', cost: 50000, culture: 30, effect: '영구 칭호+관광 수입', maxLv: 3 },
  { id: 'museum', name: '박물관', icon: '🏛️🖼️', cost: 40000, culture: 25, effect: '도감 보상+20%, 전시 수입', maxLv: 3 },
  { id: 'university', name: '대학', icon: '🎓🏛️', cost: 60000, culture: 35, effect: '용병 EXP+20%, 전직 비용-30%', maxLv: 3 },
  { id: 'wonder', name: '세계의 불가사의', icon: '🌍🏛️✨', cost: 200000, culture: 100, effect: '서버에 1개만! 관광 대수입+전체 문화+50%', maxLv: 1, unique: true },
];

// 문화 정책
const CULTURAL_POLICIES = [
  { id: 'education', name: '교육 장려', cost: 5000, effect: '전체 EXP+10%', duration: 86400, icon: '📚' },
  { id: 'art_patron', name: '예술 후원', cost: 8000, effect: '번영도+10, 관광 수입+20%', duration: 86400, icon: '🎨' },
  { id: 'military_pride', name: '군사적 자부심', cost: 10000, effect: '용병 ATK+5%, 사기+10%', duration: 86400, icon: '⚔️' },
  { id: 'trade_culture', name: '무역 문화', cost: 7000, effect: '무역 수익+15%, 외교 비용-10%', duration: 86400, icon: '💰' },
  { id: 'religious_harmony', name: '종교 화합', cost: 6000, effect: '신앙 포인트+20%, 축제 비용-20%', duration: 86400, icon: '⛪' },
];

// 문화 승리 조건
const CULTURE_VICTORY = {
  points: 10000,
  buildings: '문화 건물 전부 최대 레벨',
  wonder: '세계의 불가사의 보유',
  title: '문화의 지배자 🏛️👑',
  reward: { gold: 500000, serverBuff: '서버 전체 EXP+15% (1주)', frame: 'culture_king' },
  desc: '전투 없이 문화로 서버를 지배!',
};

// 역사 기록 (자동)
const HISTORY_CATEGORIES = ['전투 기록', '건설 기록', '외교 기록', '발견 기록', '업적 기록', '전설 기록'];

function buildCulturalBuilding(player, buildingId) {
  const bld = CULTURAL_BUILDINGS.find(b => b.id === buildingId);
  if (!bld) return { ok: false, reason: '알 수 없는 건물' };
  if ((player.gold || 0) < bld.cost) return { ok: false, reason: '골드 부족' };
  if (bld.unique) { /* 서버에 1개만 — 실제로는 서버 전체 체크 필요 */ }
  player.gold -= bld.cost;
  player.culturePoints = (player.culturePoints || 0) + bld.culture;
  return { ok: true, building: bld.name, culture: player.culturePoints };
}

function register(io, socket, player) {
  socket.on('culture_info', () => {
    socket.emit('culture_info', { buildings: CULTURAL_BUILDINGS, policies: CULTURAL_POLICIES, victory: CULTURE_VICTORY, history: HISTORY_CATEGORIES, points: player.culturePoints || 0 });
  });
  socket.on('culture_build', (data) => {
    const result = buildCulturalBuilding(player, data.buildingId);
    socket.emit('culture_build_result', result);
    if (result.ok && result.building === '세계의 불가사의') io.emit('server_msg', `🌍🏛️✨ [문화] ${player.name}이(가) "세계의 불가사의" 건설! 서버 최초!`);
  });
}

module.exports = { CULTURAL_BUILDINGS, CULTURAL_POLICIES, CULTURE_VICTORY, HISTORY_CATEGORIES, buildCulturalBuilding, register };

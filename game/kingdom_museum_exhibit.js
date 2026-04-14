// v6.5 — 영지 박물관 전시 시스템
// 아이템/용병/업적을 전시, 관광 수입, 전시 경쟁, 평가

const MAX_EXHIBITS = 20;

const EXHIBIT_CATEGORIES = [
  { id: 'weapons', name: '무기관', icon: '⚔️🏛️', visitors: 100, desc: '명검/전설 무기 전시' },
  { id: 'mercs', name: '용병 명예관', icon: '🧑‍⚔️🏛️', visitors: 150, desc: '최강 용병 홍보' },
  { id: 'monsters', name: '몬스터관', icon: '🐲🏛️', visitors: 200, desc: '포획 몬스터 전시' },
  { id: 'history', name: '역사관', icon: '📜🏛️', visitors: 80, desc: '서버 역사/업적 기록' },
  { id: 'art', name: '예술관', icon: '🎨🏛️', visitors: 120, desc: '스킨/코스튬 전시' },
  { id: 'treasure', name: '보물관', icon: '💎🏛️', visitors: 250, desc: '희귀 아이템 전시, 최고 수입' },
];

// 전시 등급 (아이템 희귀도에 따라)
const EXHIBIT_GRADES = {
  common:    { visitors: 1, income: 100, desc: '일반 전시물' },
  uncommon:  { visitors: 3, income: 300, desc: '비일반' },
  rare:      { visitors: 5, income: 500, desc: '희귀 전시물' },
  epic:      { visitors: 10, income: 1000, desc: '에픽 전시물' },
  legend:    { visitors: 20, income: 3000, desc: '전설 전시물!' },
  myth:      { visitors: 50, income: 8000, desc: '신화 전시물!!' },
  transcend: { visitors: 100, income: 20000, desc: '초월 전시물!!!' },
};

// 전시 경쟁 (서버 랭킹)
const MUSEUM_RANKINGS = [
  { rank: 1, title: '최고의 박물관', reward: { gold: 100000, fame: 500, serverBuff: '관광 수입+20%' } },
  { rank: 2, title: '명품 박물관', reward: { gold: 60000, fame: 300 } },
  { rank: 3, title: '인기 박물관', reward: { gold: 30000, fame: 150 } },
];

// 특별 전시 이벤트
const SPECIAL_EXHIBITS = [
  { id: 'grand_opening', name: '대개관', effect: '방문자 3배 (1일)', cost: 20000, desc: '화려한 오프닝!' },
  { id: 'night_museum', name: '박물관의 밤', effect: '전시물 살아 움직임! 전투 이벤트', cost: 10000, desc: '밤에 전시물이 깨어난다...' },
  { id: 'exchange', name: '전시 교환전', effect: '다른 플레이어와 전시물 교환', cost: 5000, desc: '서로의 전시물 대여' },
  { id: 'auction', name: '전시물 경매', effect: '전시물을 경매에 출품', cost: 15000, desc: '고가 낙찰 기대!' },
];

// 가이드 NPC (전시 설명+버프)
const GUIDES = [
  { id: 'basic', name: '일반 가이드', cost: 1000, bonus: { visitors: 1.1 }, desc: '기본 설명' },
  { id: 'expert', name: '전문 가이드', cost: 5000, bonus: { visitors: 1.3, income: 1.1 }, desc: '상세 설명+팁' },
  { id: 'legendary', name: '전설의 학자', cost: 20000, bonus: { visitors: 1.5, income: 1.3, lore: true }, desc: '로어 해금+최고 수입' },
];

function addExhibit(player, itemId, category) {
  const exhibits = player.museumExhibits || [];
  if (exhibits.length >= MAX_EXHIBITS) return { ok: false, reason: '전시 슬롯 가득' };
  exhibits.push({ itemId, category, addedAt: Date.now() });
  player.museumExhibits = exhibits;
  return { ok: true, total: exhibits.length };
}

function register(io, socket, player) {
  socket.on('museum_info', () => {
    socket.emit('museum_info', { categories: EXHIBIT_CATEGORIES, grades: EXHIBIT_GRADES, rankings: MUSEUM_RANKINGS, specials: SPECIAL_EXHIBITS, guides: GUIDES, exhibits: player.museumExhibits || [] });
  });
  socket.on('museum_add_exhibit', (data) => {
    const result = addExhibit(player, data.itemId, data.category);
    socket.emit('museum_add_result', result);
  });
  socket.on('museum_special_event', (data) => {
    const event = SPECIAL_EXHIBITS.find(e => e.id === data.eventId);
    if (!event) return socket.emit('museum_event_result', { ok: false });
    if ((player.gold || 0) < event.cost) return socket.emit('museum_event_result', { ok: false, reason: '골드 부족' });
    player.gold -= event.cost;
    socket.emit('museum_event_result', { ok: true, event });
    if (event.id === 'night_museum') io.emit('server_msg', `🏛️🌙 [박물관의 밤] ${player.name}의 박물관에서 전시물이 살아 움직인다!`);
  });
}

module.exports = { EXHIBIT_CATEGORIES, EXHIBIT_GRADES, MUSEUM_RANKINGS, SPECIAL_EXHIBITS, GUIDES, addExhibit, register };

// v6.0 — 무역 제국 시스템
// 대규모 교역 네트워크, 상인 길드, 독점, 가격 전쟁

const MAX_TRADE_ROUTES = 10;

// 무역 도시 (교역 거점)
const TRADE_CITIES = [
  { id: 'port_royal', name: '왕립 항구', icon: '⚓👑', specialty: '해산물/보석', buyLow: ['철광석', '목재'], sellHigh: ['진주', '산호'], baseGold: 10000 },
  { id: 'desert_bazaar', name: '사막 바자르', icon: '🏜️🏪', specialty: '향신료/비단', buyLow: ['식량', '물'], sellHigh: ['향신료', '비단'], baseGold: 8000 },
  { id: 'mountain_forge', name: '산맥 대장간', icon: '⛰️🔨', specialty: '무기/갑옷', buyLow: ['보석', '가죽'], sellHigh: ['미스릴검', '강철갑옷'], baseGold: 12000 },
  { id: 'elven_market', name: '엘프 시장', icon: '🧝🏪', specialty: '마법 재료/약초', buyLow: ['금', '무기'], sellHigh: ['마법결정', '생명수'], baseGold: 15000 },
  { id: 'underground_city', name: '지하 도시', icon: '⛏️🏙️', specialty: '광물/보석', buyLow: ['식량', '목재'], sellHigh: ['다이아', '미스릴'], baseGold: 20000 },
  { id: 'sky_harbor', name: '하늘 항구', icon: '☁️⚓', specialty: '비행 재료/마법', buyLow: ['철', '가죽'], sellHigh: ['비행석', '구름실'], baseGold: 25000 },
  { id: 'demon_market', name: '마계 시장', icon: '😈🏪', specialty: '저주 아이템/영혼', buyLow: ['성수', '축복'], sellHigh: ['암흑결정', '영혼석'], baseGold: 30000, dangerous: true },
  { id: 'dragon_hoard', name: '용의 보물고', icon: '🐲💰', specialty: '전설 아이템', buyLow: ['희생품'], sellHigh: ['용의보물'], baseGold: 50000, dangerous: true },
];

// 상인 길드 등급
const MERCHANT_GUILD = [
  { rank: 1, name: '행상인', trades: 0, discount: 0, routes: 2 },
  { rank: 2, name: '상인', trades: 20, discount: 0.05, routes: 4 },
  { rank: 3, name: '대상인', trades: 50, discount: 0.10, routes: 6 },
  { rank: 4, name: '무역왕', trades: 100, discount: 0.15, routes: 8 },
  { rank: 5, name: '상업 황제', trades: 200, discount: 0.20, routes: 10, title: true },
];

// 독점 시스템
const MONOPOLY_RULES = {
  req: '특정 도시 거래량 70% 이상 점유',
  bonus: '해당 도시 가격 조작 가능 (±30%)',
  risk: '다른 플레이어의 무역 봉쇄/약탈 대상',
  antiMonopoly: '3일 후 가격 자동 정상화',
};

// 가격 변동 이벤트
const MARKET_EVENTS = [
  { id: 'boom', name: '호황', chance: 0.08, effect: '모든 가격 +20%', duration: 3600 },
  { id: 'crash', name: '폭락', chance: 0.05, effect: '모든 가격 -30%', duration: 3600 },
  { id: 'war_demand', name: '전쟁 수요', chance: 0.06, effect: '무기/갑옷 가격 2배', duration: 7200 },
  { id: 'plague', name: '역병', chance: 0.04, effect: '약초/성수 가격 3배', duration: 7200 },
  { id: 'gold_rush', name: '골드 러시', chance: 0.03, effect: '보석/광물 가격 절반', duration: 3600 },
  { id: 'festival_demand', name: '축제 수요', chance: 0.07, effect: '식량/음료 가격 +50%', duration: 3600 },
  { id: 'smuggle_crackdown', name: '밀수 단속', chance: 0.05, effect: '마계 시장 접근 불가 (1시간)', duration: 3600 },
  { id: 'dragon_hoard_open', name: '용의 보물고 개방', chance: 0.02, effect: '전설 아이템 거래 가능 (30분)', duration: 1800 },
];

// 무역 함대 (대규모 운송)
const FLEET_TYPES = [
  { id: 'caravan', name: '카라반', icon: '🐫', capacity: 100, spd: 3, risk: 0.1, cost: 5000 },
  { id: 'merchant_ship', name: '상선', icon: '🚢', capacity: 500, spd: 5, risk: 0.15, cost: 20000 },
  { id: 'armored_convoy', name: '무장 호위대', icon: '🛡️🐫', capacity: 200, spd: 2, risk: 0.02, cost: 30000 },
  { id: 'flying_caravan', name: '비행 카라반', icon: '🧞‍♂️📦', capacity: 300, spd: 8, risk: 0.05, cost: 50000 },
  { id: 'dimensional_trade', name: '차원 무역선', icon: '🌀📦', capacity: 1000, spd: 10, risk: 0.3, cost: 100000, desc: '고위험 고수익!' },
];

function register(io, socket, player) {
  socket.on('trade_empire_info', () => {
    const rank = [...MERCHANT_GUILD].reverse().find(r => (player.tradeCount||0) >= r.trades);
    socket.emit('trade_empire_info', { cities: TRADE_CITIES, guild: MERCHANT_GUILD, monopoly: MONOPOLY_RULES, events: MARKET_EVENTS, fleets: FLEET_TYPES, myRank: rank, trades: player.tradeCount || 0 });
  });
  socket.on('trade_empire_buy', (data) => {
    const city = TRADE_CITIES.find(c => c.id === data.cityId);
    if (!city) return socket.emit('trade_buy_result', { ok: false });
    player.tradeCount = (player.tradeCount || 0) + 1;
    socket.emit('trade_buy_result', { ok: true, city: city.name });
  });
}

module.exports = { TRADE_CITIES, MERCHANT_GUILD, MONOPOLY_RULES, MARKET_EVENTS, FLEET_TYPES, register };

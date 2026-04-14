// v5.7 — 영지 암시장 시스템
// 숨겨진 상점, 금지된 아이템, 밀수, 비합법 거래

const REFRESH_INTERVAL = 3600; // 1시간마다 상품 갱신

// 암시장 상품 풀
const BLACK_MARKET_GOODS = [
  { id: 'forbidden_potion', name: '금단의 영약', icon: '🧪💜', price: 30000, effect: '전체 스탯 +20% (10분), 부작용: 종료 후 -10% (5분)', rarity: 'epic' },
  { id: 'stolen_blueprint', name: '도난 설계도', icon: '📋🔓', price: 50000, effect: '랜덤 전설 장비 레시피 해금', rarity: 'epic' },
  { id: 'slave_contract', name: '노예 계약서', icon: '📜⛓️', price: 80000, effect: '적 포로 용병 1명 강제 영입', rarity: 'legendary', karma: -20 },
  { id: 'assassination_order', name: '암살 의뢰서', icon: '🗡️📜', price: 40000, effect: '지정 플레이어에게 NPC 암살자 파견', rarity: 'epic', karma: -15 },
  { id: 'counterfeit_gold', name: '위조 금화', icon: '🪙❌', price: 10000, effect: '50000G 획득 (30% 확률로 발각→벌금 100000G)', rarity: 'rare', risky: true },
  { id: 'cursed_weapon', name: '저주받은 무기', icon: '⚔️💀', price: 100000, effect: 'ATK +200, 하지만 매 전투 HP -5%', rarity: 'legendary' },
  { id: 'memory_eraser', name: '기억 소거제', icon: '🧠❌', price: 60000, effect: '용병 1명의 수배 기록 완전 삭제', rarity: 'epic' },
  { id: 'identity_change', name: '신분 변경', icon: '🎭', price: 150000, effect: '플레이어 이름 변경 + 현상금 초기화', rarity: 'legendary' },
  { id: 'dark_crystal_bulk', name: '암흑 결정 대량', icon: '💎🌑', price: 200000, effect: '암흑 결정 20개 (어둠의 대륙 재료)', rarity: 'legendary' },
  { id: 'divine_contraband', name: '신성 밀수품', icon: '✨🚫', price: 500000, effect: '신앙 포인트 1000 즉시 획득', rarity: 'mythic', karma: -30 },
];

// 밀수 시스템
const SMUGGLING_ROUTES = [
  { id: 'coastal', name: '해안 밀수', risk: 0.2, profit: 1.5, time: 600, desc: '비교적 안전한 해안 루트' },
  { id: 'mountain', name: '산악 밀수', risk: 0.35, profit: 2.0, time: 900, desc: '위험하지만 수익 높음' },
  { id: 'underground', name: '지하 밀수', risk: 0.15, profit: 1.3, time: 1200, desc: '터널을 통한 안전 루트' },
  { id: 'dimensional', name: '차원 밀수', risk: 0.5, profit: 3.0, time: 300, desc: '극위험! 차원문 통과, 최고 수익' },
];

// 암시장 VIP 등급
const VIP_TIERS = [
  { tier: 1, name: '단골', purchases: 5, discount: 0.05 },
  { tier: 2, name: '우수 고객', purchases: 15, discount: 0.10 },
  { tier: 3, name: '귀빈', purchases: 30, discount: 0.15, exclusive: true },
  { tier: 4, name: '파트너', purchases: 50, discount: 0.20, exclusive: true },
  { tier: 5, name: '보스', purchases: 100, discount: 0.30, exclusive: true, desc: '최고 등급, 전용 상품' },
];

function generateStock() {
  const stock = [];
  const count = 3 + Math.floor(Math.random() * 3); // 3~5개
  const pool = [...BLACK_MARKET_GOODS];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    stock.push(pool.splice(idx, 1)[0]);
  }
  return stock;
}

function buyItem(player, itemId) {
  const item = BLACK_MARKET_GOODS.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: '알 수 없는 상품' };
  if ((player.gold || 0) < item.price) return { ok: false, reason: '골드 부족' };
  player.gold -= item.price;
  player.blackMarketPurchases = (player.blackMarketPurchases || 0) + 1;
  if (item.karma) player.karma = (player.karma || 0) + item.karma;
  return { ok: true, item: item.name, karmaChange: item.karma || 0 };
}

function register(io, socket, player) {
  socket.on('black_market_stock', () => {
    const stock = generateStock();
    const vip = VIP_TIERS.filter(v => (player.blackMarketPurchases || 0) >= v.purchases).pop();
    socket.emit('black_market_stock', { stock, vip, smuggling: SMUGGLING_ROUTES, vipTiers: VIP_TIERS });
  });
  socket.on('black_market_buy', (data) => {
    const result = buyItem(player, data.itemId);
    socket.emit('black_market_buy_result', result);
  });
  socket.on('black_market_smuggle', (data) => {
    const route = SMUGGLING_ROUTES.find(r => r.id === data.routeId);
    if (!route) return socket.emit('smuggle_result', { ok: false });
    const success = Math.random() > route.risk;
    socket.emit('smuggle_result', { ok: true, success, route: route.name, profit: success ? route.profit : 0 });
  });
}

module.exports = { BLACK_MARKET_GOODS, SMUGGLING_ROUTES, VIP_TIERS, generateStock, buyItem, register };

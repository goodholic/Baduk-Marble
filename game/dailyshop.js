// 일일 상점 — v1.32
// 매일 자정 자동 갱신, 6개 슬롯에 무작위 아이템 + 무작위 할인율 (10~50%)
// 같은 날에는 같은 시드(날짜 문자열) → 모든 플레이어 동일한 상품
// 플레이어별 구매 기록은 외부에서 관리

const DAILY_SHOP_POOL = [
  // [id, name, basePrice, currency, category]
  { id:'pot_hp_l',         name:'상급 HP 물약', basePrice:300, currency:'gold',    category:'consumable' },
  { id:'pot_atk',          name:'공격 물약',    basePrice:500, currency:'gold',    category:'consumable' },
  { id:'mat_magic',        name:'마법재료',     basePrice:200, currency:'gold',    category:'mat' },
  { id:'mat_soul',         name:'영혼석',       basePrice:600, currency:'gold',    category:'mat' },
  { id:'mat_dragon',       name:'용재료',       basePrice:2500,currency:'gold',    category:'mat' },
  { id:'protect_scroll',   name:'보호 주문서',  basePrice:80,  currency:'diamond', category:'consumable' },
  { id:'bless_scroll',     name:'축복 주문서',  basePrice:40,  currency:'diamond', category:'consumable' },
  { id:'rare_box',         name:'희귀 상자',    basePrice:60,  currency:'diamond', category:'box' },
  { id:'mega_exp',         name:'메가 EXP 부스터', basePrice:100, currency:'diamond', category:'booster' },
  { id:'mega_gold',        name:'메가 골드 부스터', basePrice:100, currency:'diamond', category:'booster' },
  { id:'food_king',        name:'왕의 연회',    basePrice:1200,currency:'gold',    category:'food' },
  { id:'food_all',         name:'용의 만찬',    basePrice:600, currency:'gold',    category:'food' },
  { id:'goods_phoenix_feather', name:'불사조 깃털', basePrice:600, currency:'gold', category:'trade' },
  { id:'goods_void_essence',    name:'공허의 정수', basePrice:750, currency:'gold', category:'trade' },
  { id:'goods_celestial_silk',  name:'천공의 비단', basePrice:900, currency:'gold', category:'trade' },
];

const DAILY_SHOP_CONFIG = {
  slotCount: 6,
  minDiscount: 0.10,  // 10%
  maxDiscount: 0.50,  // 50%
  refreshHour: 0,     // 자정
  rerollPriceDiamond: 30, // 다이아 30개로 수동 갱신 가능 (개인용)
};

// 시드 기반 결정적 랜덤
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return function () {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

function getTodaySeed() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function generateDailyShop(seed = null) {
  const s = seed || getTodaySeed();
  const rng = seededRandom(s);
  const pool = [...DAILY_SHOP_POOL];
  // 셔플 (Fisher-Yates with seeded RNG)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const slots = pool.slice(0, DAILY_SHOP_CONFIG.slotCount).map(item => {
    const discount = DAILY_SHOP_CONFIG.minDiscount + rng() * (DAILY_SHOP_CONFIG.maxDiscount - DAILY_SHOP_CONFIG.minDiscount);
    const finalPrice = Math.max(1, Math.floor(item.basePrice * (1 - discount)));
    return {
      ...item,
      basePrice: item.basePrice,
      finalPrice,
      discount: Math.round(discount * 100), // 정수 %
    };
  });
  return { seed: s, slots };
}

function buyDailyShop(player, slotIdx, currentShop) {
  if (!currentShop || !currentShop.slots[slotIdx]) {
    return { success: false, msg: '존재하지 않는 슬롯' };
  }
  const item = currentShop.slots[slotIdx];
  // 같은 날 슬롯 중복 구매 방지
  player.dailyShopBought = player.dailyShopBought || {};
  const todaySeed = currentShop.seed;
  if (player.dailyShopBoughtSeed !== todaySeed) {
    player.dailyShopBought = {};
    player.dailyShopBoughtSeed = todaySeed;
  }
  if (player.dailyShopBought[slotIdx]) {
    return { success: false, msg: '이미 구매한 슬롯' };
  }

  // 비용 차감
  if (item.currency === 'gold') {
    if ((player.gold || 0) < item.finalPrice) return { success: false, msg: '골드 부족' };
    player.gold -= item.finalPrice;
  } else {
    if ((player.diamonds || 0) < item.finalPrice) return { success: false, msg: '다이아 부족' };
    player.diamonds -= item.finalPrice;
  }

  // 인벤토리 적용
  if (!player.inventory) player.inventory = {};
  player.inventory[item.id] = (player.inventory[item.id] || 0) + 1;

  player.dailyShopBought[slotIdx] = true;
  return { success: true, item, paid: item.finalPrice, currency: item.currency };
}

module.exports = {
  DAILY_SHOP_POOL,
  DAILY_SHOP_CONFIG,
  generateDailyShop,
  buyDailyShop,
  getTodaySeed,
};

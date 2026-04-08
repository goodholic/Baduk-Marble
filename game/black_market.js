// 암시장 시스템 — v1.51
// 6시간마다 갱신되는 미스터리 상점 — 일반 상점에 없는 한정 아이템
// 4슬롯, 등급별 가중치 (전설 5%, 영웅 25%, 희귀 70%)
// 결정적 시드 (날짜 + 6시간 윈도우) → 모든 플레이어 동일 상품

const BLACK_MARKET_POOL = [
  // 희귀 (rare) — 가장 흔함
  { id:'mat_dragon_pack', name:'용재료 패키지 ×10', price:300, currency:'diamond', rarity:'rare', desc:'용재료 10개 즉시 지급' },
  { id:'mat_soul_pack',   name:'영혼석 패키지 ×30', price:200, currency:'diamond', rarity:'rare', desc:'영혼석 30개 즉시 지급' },
  { id:'protect_x10',     name:'보호 주문서 ×10',   price:400, currency:'diamond', rarity:'rare', desc:'강화 보호 10장' },
  { id:'mega_exp_long',   name:'24시간 EXP 부스터', price:500, currency:'diamond', rarity:'rare', desc:'24시간 EXP ×3' },
  { id:'mega_gold_long',  name:'24시간 GOLD 부스터', price:500, currency:'diamond', rarity:'rare', desc:'24시간 GOLD ×3' },

  // 영웅 (epic)
  { id:'legendary_chest', name:'전설 장비 상자',     price:1500, currency:'diamond', rarity:'epic', desc:'전설급 장비 1개 무작위' },
  { id:'rune_pack_legendary', name:'전설 룬 패키지', price:1800, currency:'diamond', rarity:'epic', desc:'전설 등급 룬 3개' },
  { id:'rare_pet_voucher', name:'희귀 펫 교환권',    price:2000, currency:'diamond', rarity:'epic', desc:'희귀 펫 1마리 선택 획득' },
  { id:'mythic_relic_box', name:'신화 유물 상자',    price:3000, currency:'diamond', rarity:'epic', desc:'신화 유물 무작위 1개' },

  // 전설 (legendary) — 매우 희귀
  { id:'mythic_pet_voucher', name:'신화 펫 교환권',  price:5000, currency:'diamond', rarity:'legendary', desc:'신화급 펫 1마리 선택' },
  { id:'season_pass_skip',   name:'시즌 패스 스킵',  price:4000, currency:'diamond', rarity:'legendary', desc:'시즌 패스 만렙 즉시' },
  { id:'rebirth_blessing',   name:'환생의 축복',     price:8000, currency:'diamond', rarity:'legendary', desc:'레벨 손실 없이 환생' },
  { id:'time_crystal',       name:'시간의 결정',     price:6000, currency:'diamond', rarity:'legendary', desc:'농장/제작 쿨다운 즉시 완료' },
];

const RARITY_WEIGHTS = { rare: 70, epic: 25, legendary: 5 };

const BLACK_MARKET_CONFIG = {
  slotCount: 4,
  refreshIntervalHours: 6,
  rerollPriceDiamond: 100,
};

// 결정적 RNG
function _seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return function () {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

function _currentWindow() {
  const now = new Date();
  const hour = now.getHours();
  const window = Math.floor(hour / BLACK_MARKET_CONFIG.refreshIntervalHours);
  return `${now.toISOString().slice(0, 10)}_w${window}`;
}

function _pickByRarity(rng, pool) {
  // 가중치 기반 등급 선택
  const totalW = Object.values(RARITY_WEIGHTS).reduce((s, w) => s + w, 0);
  let roll = rng() * totalW;
  let chosenRarity;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) { chosenRarity = rarity; break; }
  }
  // 해당 등급에서 무작위 1개
  const candidates = pool.filter(item => item.rarity === chosenRarity);
  if (!candidates.length) return pool[Math.floor(rng() * pool.length)];
  return candidates[Math.floor(rng() * candidates.length)];
}

function generateMarket(seed = null) {
  const s = seed || _currentWindow();
  const rng = _seededRandom(s);
  const slots = [];
  const used = new Set();
  let attempts = 0;
  while (slots.length < BLACK_MARKET_CONFIG.slotCount && attempts < 50) {
    const item = _pickByRarity(rng, BLACK_MARKET_POOL);
    if (!used.has(item.id)) {
      slots.push(item);
      used.add(item.id);
    }
    attempts++;
  }
  return { seed: s, slots, expiresAt: _nextRefreshTime() };
}

function _nextRefreshTime() {
  const now = new Date();
  const hour = now.getHours();
  const nextWindow = (Math.floor(hour / BLACK_MARKET_CONFIG.refreshIntervalHours) + 1) * BLACK_MARKET_CONFIG.refreshIntervalHours;
  const next = new Date(now);
  next.setHours(nextWindow, 0, 0, 0);
  return next.getTime();
}

function buyItem(player, slotIdx, market) {
  if (!market || !market.slots[slotIdx]) {
    return { success: false, msg: '존재하지 않는 슬롯' };
  }
  const item = market.slots[slotIdx];
  // 같은 윈도우 중복 구매 방지
  player.blackMarketBought = player.blackMarketBought || {};
  if (player.blackMarketBoughtSeed !== market.seed) {
    player.blackMarketBought = {};
    player.blackMarketBoughtSeed = market.seed;
  }
  if (player.blackMarketBought[slotIdx]) {
    return { success: false, msg: '이미 구매한 슬롯' };
  }
  // 결제
  if ((player.diamonds || 0) < item.price) {
    return { success: false, msg: '다이아 부족' };
  }
  player.diamonds -= item.price;
  // 아이템 적용 — 단순화: 인벤토리에 토큰 저장
  if (!player.inventory) player.inventory = {};
  player.inventory[item.id] = (player.inventory[item.id] || 0) + 1;
  player.blackMarketBought[slotIdx] = true;
  return { success: true, item, paid: item.price };
}

function rerollMarket(player) {
  const cost = BLACK_MARKET_CONFIG.rerollPriceDiamond;
  if ((player.diamonds || 0) < cost) {
    return { success: false, msg: '다이아 부족' };
  }
  player.diamonds -= cost;
  player.blackMarketRerollCount = (player.blackMarketRerollCount || 0) + 1;
  const personalSeed = `${_currentWindow()}_${player.id}_${player.blackMarketRerollCount}`;
  const newMarket = generateMarket(personalSeed);
  player.blackMarketBought = {};
  player.blackMarketBoughtSeed = newMarket.seed;
  return { success: true, market: newMarket };
}

module.exports = {
  BLACK_MARKET_POOL,
  RARITY_WEIGHTS,
  BLACK_MARKET_CONFIG,
  generateMarket,
  buyItem,
  rerollMarket,
};

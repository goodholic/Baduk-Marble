// 행운의 룰렛 — v1.22
// 매일 무료 1회 스핀, 추가 스핀은 다이아 (50💎/회)
// 가중치 기반 무작위 보상 (총 합계 1000)

const LOTTERY_PRIZES = [
  // [id, name, weight, reward]
  { id: 'common_gold',   name: '100 골드',         weight: 350, reward: { gold: 100 },        rarity: 'common' },
  { id: 'common_mat',    name: '마법재료 ×3',      weight: 250, reward: { mat_magic: 3 },     rarity: 'common' },
  { id: 'uncommon_gold', name: '500 골드',         weight: 150, reward: { gold: 500 },        rarity: 'uncommon' },
  { id: 'uncommon_food', name: '용의 만찬 ×1',     weight: 80,  reward: { food_all: 1 },      rarity: 'uncommon' },
  { id: 'rare_diamond',  name: '20 다이아',        weight: 60,  reward: { diamonds: 20 },     rarity: 'rare' },
  { id: 'rare_soul',     name: '영혼석 ×5',        weight: 50,  reward: { mat_soul: 5 },      rarity: 'rare' },
  { id: 'epic_dragon',   name: '용재료 ×3',        weight: 30,  reward: { mat_dragon: 3 },    rarity: 'epic' },
  { id: 'epic_box',      name: '희귀 상자 ×1',     weight: 20,  reward: { rare_box: 1 },      rarity: 'epic' },
  { id: 'legend_diamond',name: '200 다이아',       weight: 8,   reward: { diamonds: 200 },    rarity: 'legendary' },
  { id: 'legend_equip',  name: '영웅 장비 상자',   weight: 2,   reward: { hero_box: 1 },      rarity: 'legendary' },
];

const TOTAL_WEIGHT = LOTTERY_PRIZES.reduce((s, p) => s + p.weight, 0); // 1000

const LOTTERY_CONFIG = {
  freeSpinsPerDay: 1,
  paidSpinPrice: 50, // 다이아
  bulkSpinPrice: 450, // 10회 (50 → 45로 할인)
  bulkSpinCount: 10,
};

function spinLottery() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const prize of LOTTERY_PRIZES) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return LOTTERY_PRIZES[0]; // fallback
}

function canFreeSpin(player) {
  const today = new Date().toISOString().slice(0, 10);
  return player.lotteryLastFreeDate !== today;
}

function consumeFreeSpin(player) {
  player.lotteryLastFreeDate = new Date().toISOString().slice(0, 10);
}

function paidSpin(player, count = 1) {
  count = Math.max(1, Math.min(Math.floor(count) || 1, 100)); // 1~100회 제한
  const cost = count >= LOTTERY_CONFIG.bulkSpinCount
    ? LOTTERY_CONFIG.bulkSpinPrice
    : LOTTERY_CONFIG.paidSpinPrice * count;
  if ((player.diamonds || 0) < cost) return { success: false, msg: '다이아 부족' };
  player.diamonds -= cost;
  const results = [];
  for (let i = 0; i < count; i++) results.push(spinLottery());
  player.lotteryTotalSpins = (player.lotteryTotalSpins || 0) + count;
  return { success: true, results, cost };
}

function getRarityColor(rarity) {
  return {
    common: '#cccccc',
    uncommon: '#44cc44',
    rare: '#4488ff',
    epic: '#aa44ff',
    legendary: '#ff8800',
  }[rarity] || '#ffffff';
}

module.exports = {
  LOTTERY_PRIZES,
  LOTTERY_CONFIG,
  TOTAL_WEIGHT,
  spinLottery,
  canFreeSpin,
  consumeFreeSpin,
  paidSpin,
  getRarityColor,
};

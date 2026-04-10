// 보스 러시 모드 — v1.23
// 솔로/파티 도전 — 20웨이브의 보스를 연속으로 격파
// 매 5웨이브마다 보상 / 클리어 시 랭킹 등재
// 입장료: 1000G 또는 다이아 30개 (1일 3회 무료)

const BOSS_RUSH_WAVES = (() => {
  const waves = [];
  for (let i = 1; i <= 20; i++) {
    const hp  = 1000 * Math.pow(1.35, i - 1);
    const atk = 30   * Math.pow(1.20, i - 1);
    const def = 10   * Math.pow(1.18, i - 1);
    const isBoss = i % 5 === 0;
    const isFinal = i === 20;
    waves.push({
      wave: i,
      name: isFinal ? '심연의 군주' :
            isBoss  ? `${i}웨이브 정예 보스` :
                      `${i}웨이브 보스`,
      hp: Math.floor(hp),
      atk: Math.floor(atk),
      def: Math.floor(def),
      timeLimit: 60 + i * 5,  // 65초 ~ 165초
      isBoss,
      isFinal,
      reward: {
        gold: 200 * i,
        exp:  300 * i,
        diamonds: isBoss ? (isFinal ? 200 : 30) : 0,
        mat: isFinal ? { mat_dragon: 5 } : (isBoss ? { mat_soul: 3 } : null),
      }
    });
  }
  return waves;
})();

const BOSS_RUSH_CONFIG = {
  freeEntriesPerDay: 3,
  goldEntryPrice: 1000,
  diamondEntryPrice: 30,
  totalWaves: 20,
  rankingTopRewards: {
    1: { diamonds: 500, title: 'rush_champion' },
    2: { diamonds: 300 },
    3: { diamonds: 200 },
  },
};

function canFreeEntry(player) {
  const today = new Date().toISOString().slice(0, 10);
  const used = (player.bossRushDate === today) ? (player.bossRushUsed || 0) : 0;
  return used < BOSS_RUSH_CONFIG.freeEntriesPerDay;
}

function consumeFreeEntry(player) {
  const today = new Date().toISOString().slice(0, 10);
  if (player.bossRushDate !== today) {
    player.bossRushDate = today;
    player.bossRushUsed = 0;
  }
  player.bossRushUsed = (player.bossRushUsed || 0) + 1;
}

function payEntry(player, currency = 'gold') {
  if (currency === 'gold') {
    if ((player.gold || 0) < BOSS_RUSH_CONFIG.goldEntryPrice) return { success: false, msg: '골드 부족' };
    player.gold -= BOSS_RUSH_CONFIG.goldEntryPrice;
  } else {
    if ((player.diamonds || 0) < BOSS_RUSH_CONFIG.diamondEntryPrice) return { success: false, msg: '다이아 부족' };
    player.diamonds -= BOSS_RUSH_CONFIG.diamondEntryPrice;
  }
  return { success: true };
}

function getWaveReward(waveNum) {
  const wave = BOSS_RUSH_WAVES.find(w => w.wave === waveNum);
  return wave ? wave.reward : null;
}

function getCumulativeReward(maxWave) {
  // 도달한 최고 웨이브까지 누적 보상 계산
  let totalGold = 0, totalExp = 0, totalDiamonds = 0;
  const mats = {};
  for (const w of BOSS_RUSH_WAVES) {
    if (w.wave > maxWave) break;
    totalGold += w.reward.gold;
    totalExp  += w.reward.exp;
    totalDiamonds += w.reward.diamonds || 0;
    if (w.reward.mat) {
      for (const [k, v] of Object.entries(w.reward.mat)) {
        mats[k] = (mats[k] || 0) + v;
      }
    }
  }
  return { gold: totalGold, exp: totalExp, diamonds: totalDiamonds, mats };
}

function getRankingReward(rank) {
  return BOSS_RUSH_CONFIG.rankingTopRewards[rank] || null;
}

module.exports = {
  BOSS_RUSH_WAVES,
  BOSS_RUSH_CONFIG,
  canFreeEntry,
  consumeFreeEntry,
  payEntry,
  getWaveReward,
  getCumulativeReward,
  getRankingReward,
};

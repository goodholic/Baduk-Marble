// 시즌 패스 (배틀 패스) — v1.20
// 30일 시즌 사이클, 무료 트랙 + 프리미엄 트랙 (다이아 1500)
// XP 획득: 일일 퀘스트 +200 / 주간 퀘스트 +800 / 보스 처치 +50 / PvP 승리 +30 / 월드 보스 +500

const SEASON_PASS_TIERS = [
  // [tier, xpRequired, freeReward, premiumReward]
  { tier: 1,  xp: 100,  free: { gold: 500 },                    premium: { diamonds: 50 } },
  { tier: 2,  xp: 250,  free: { mat_magic: 5 },                 premium: { mat_dragon: 2 } },
  { tier: 3,  xp: 500,  free: { gold: 1000 },                   premium: { skin: 'season_glow' } },
  { tier: 4,  xp: 800,  free: { exp_boost: 1 },                 premium: { mega_exp: 1 } },
  { tier: 5,  xp: 1200, free: { gold: 2000, diamonds: 30 },     premium: { rare_box: 1 } },
  { tier: 6,  xp: 1700, free: { mat_soul: 5 },                  premium: { mat_soul: 15 } },
  { tier: 7,  xp: 2300, free: { food_atk: 3 },                  premium: { food_king: 3 } },
  { tier: 8,  xp: 3000, free: { gold: 3000 },                   premium: { diamonds: 100 } },
  { tier: 9,  xp: 3800, free: { mat_dragon: 1 },                premium: { mat_dragon: 5 } },
  { tier: 10, xp: 4700, free: { gold: 5000, diamonds: 50 },     premium: { equip_armor_4: 1 } },
  { tier: 11, xp: 5700, free: { protect_scroll: 1 },            premium: { protect_scroll: 3 } },
  { tier: 12, xp: 6800, free: { mat_magic: 10 },                premium: { elixir_titan: 2 } },
  { tier: 13, xp: 8000, free: { gold: 8000 },                   premium: { equip_sword_4: 1 } },
  { tier: 14, xp: 9300, free: { diamonds: 80 },                 premium: { diamonds: 200 } },
  { tier: 15, xp: 10700,free: { gold: 15000, diamonds: 100 },   premium: { equip_mythic_ring: 1, title: 'season_legend' } },
];

const SEASON_XP_SOURCES = {
  daily_quest:   200,
  weekly_quest:  800,
  boss_kill:     50,
  pvp_win:       30,
  worldboss_kill: 500,
  dungeon_clear: 150,
  craft_success: 20,
};

const SEASON_PASS_PRICE = 1500; // 다이아
const SEASON_DURATION_DAYS = 30;

function addSeasonXp(player, source) {
  const xp = SEASON_XP_SOURCES[source] || 0;
  if (!xp) return { gained: 0, tier: 0, ready: [] };
  player.seasonXp = (player.seasonXp || 0) + xp;
  player.seasonClaimed = player.seasonClaimed || { free: [], premium: [] };

  // 도달한 티어 계산
  let currentTier = 0;
  for (const t of SEASON_PASS_TIERS) {
    if (player.seasonXp >= t.xp) currentTier = t.tier;
    else break;
  }
  return { gained: xp, tier: currentTier, totalXp: player.seasonXp };
}

function claimSeasonReward(player, tier, track) {
  if (!player.seasonClaimed) player.seasonClaimed = { free: [], premium: [] };
  const t = SEASON_PASS_TIERS.find(x => x.tier === tier);
  if (!t) return { success: false, msg: '존재하지 않는 티어' };
  if ((player.seasonXp || 0) < t.xp) return { success: false, msg: '티어 미달' };
  if (track === 'premium' && !player.hasSeasonPass) return { success: false, msg: '프리미엄 패스 미보유' };
  if (player.seasonClaimed[track].includes(tier)) return { success: false, msg: '이미 수령' };
  player.seasonClaimed[track].push(tier);
  const reward = track === 'premium' ? t.premium : t.free;
  return { success: true, reward };
}

function buySeasonPass(player) {
  if (player.hasSeasonPass) return { success: false, msg: '이미 보유 중' };
  if ((player.diamonds || 0) < SEASON_PASS_PRICE) return { success: false, msg: '다이아 부족' };
  player.diamonds -= SEASON_PASS_PRICE;
  player.hasSeasonPass = true;
  return { success: true, msg: '시즌 패스 구매 완료!' };
}

function resetSeason(player) {
  player.seasonXp = 0;
  player.seasonClaimed = { free: [], premium: [] };
  player.hasSeasonPass = false;
}

module.exports = {
  SEASON_PASS_TIERS,
  SEASON_XP_SOURCES,
  SEASON_PASS_PRICE,
  SEASON_DURATION_DAYS,
  addSeasonXp,
  claimSeasonReward,
  buySeasonPass,
  resetSeason,
};

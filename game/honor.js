// 명예(Honor) 시스템 — v1.78
// PvP/아레나/결투에서 얻는 명예 포인트 + 명예 상점
// 골드/다이아와 별개의 PvP 전용 화폐

const HONOR_SOURCES = {
  pvp_kill:           10,
  pvp_streak_5:       50,
  pvp_streak_10:      150,
  arena_win:          25,
  arena_top10:        100,
  arena_top3:         500,
  duel_win:           5,
  guild_war_kill:     20,
  guild_war_victory:  300,
  tournament_top4:    200,
  tournament_winner:  1000,
};

const HONOR_SHOP = {
  // 소비품
  pvp_potion: {
    name: 'PvP 물약', icon: '🧪',
    price: 50, desc: 'PvP 시 체력 회복',
    effect: 'pvp_heal',
  },
  invincibility_scroll: {
    name: '무적 주문서', icon: '✨',
    price: 200, desc: '5초 무적',
    effect: 'invincibility',
  },
  // 장비
  honor_blade: {
    name: '명예의 검', icon: '⚔️',
    price: 1500, desc: 'ATK +60 / 크리 +5%',
    effect: 'equip', value: 'equip_honor_blade',
  },
  honor_armor: {
    name: '명예의 갑옷', icon: '🛡️',
    price: 1500, desc: 'DEF +60 / HP +200',
    effect: 'equip', value: 'equip_honor_armor',
  },
  // 칭호
  pvp_lord_title: {
    name: 'PvP 군주 칭호', icon: '👑',
    price: 3000, desc: 'ATK +20 / 크리 +5%',
    effect: 'title', value: 'pvp_lord',
  },
  // 코스메틱
  blood_aura: {
    name: '혈류 오라', icon: '🩸',
    price: 2000, desc: '특수 시각 효과',
    effect: 'aura', value: 'blood_aura',
  },
  // 희귀
  immortal_token: {
    name: '불멸의 증표', icon: '💀',
    price: 5000, desc: '전 스탯 영구 +5',
    effect: 'permanent_stat', value: { atk: 5, def: 5, hp: 50 },
  },
};

const HONOR_RANKS = [
  { honor: 0,    name: '평범한 전사',    color: '#cccccc' },
  { honor: 100,  name: '신참 투사',      color: '#88cc88' },
  { honor: 500,  name: '숙련 검사',      color: '#44aaff' },
  { honor: 1500, name: '베테랑 전사',    color: '#aa44ff' },
  { honor: 5000, name: '전설의 전사',    color: '#ff8800' },
  { honor: 15000,name: '영웅',           color: '#ffd700' },
  { honor: 50000,name: '전설',           color: '#ff00ff' },
];

function _ensure(player) {
  if (!player.honor) player.honor = { points: 0, totalEarned: 0, lastTransaction: null };
  return player.honor;
}

function gainHonor(player, source) {
  const amount = HONOR_SOURCES[source];
  if (!amount) return null;
  const data = _ensure(player);
  data.points += amount;
  data.totalEarned += amount;
  data.lastTransaction = { source, amount, at: Date.now() };
  return { gained: amount, totalPoints: data.points, source };
}

function spendHonor(player, itemId) {
  const item = HONOR_SHOP[itemId];
  if (!item) return { success: false, msg: '존재하지 않는 아이템' };
  const data = _ensure(player);
  if (data.points < item.price) {
    return { success: false, msg: `명예 ${item.price} 필요` };
  }
  data.points -= item.price;

  // 효과 적용
  switch (item.effect) {
    case 'equip':
      if (!player.inventory) player.inventory = {};
      player.inventory[item.value] = (player.inventory[item.value] || 0) + 1;
      break;
    case 'title':
      if (!player.titles) player.titles = [];
      if (!player.titles.includes(item.value)) player.titles.push(item.value);
      break;
    case 'permanent_stat':
      if (!player.honorBonuses) player.honorBonuses = {};
      for (const [stat, val] of Object.entries(item.value)) {
        player.honorBonuses[stat] = (player.honorBonuses[stat] || 0) + val;
      }
      break;
    case 'aura':
      // aura 시스템 연계 (외부 처리)
      break;
    case 'pvp_heal':
    case 'invincibility':
      // 인벤토리에 토큰 저장
      if (!player.inventory) player.inventory = {};
      player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
      break;
  }

  return { success: true, item, remainingPoints: data.points };
}

function getRank(player) {
  const data = _ensure(player);
  let rank = HONOR_RANKS[0];
  for (const r of HONOR_RANKS) {
    if (data.points >= r.honor) rank = r;
  }
  return rank;
}

function getHonorBonus(player, stat) {
  return (player.honorBonuses && player.honorBonuses[stat]) || 0;
}

function getStatus(player) {
  const data = _ensure(player);
  const rank = getRank(player);
  const nextRank = HONOR_RANKS.find(r => r.honor > data.points);
  return {
    points: data.points,
    totalEarned: data.totalEarned,
    rank,
    nextRank,
    progress: nextRank ? Math.floor(((data.points - rank.honor) / (nextRank.honor - rank.honor)) * 100) : 100,
    sources: HONOR_SOURCES,
    shop: HONOR_SHOP,
    permanentBonuses: player.honorBonuses || {},
  };
}

module.exports = {
  HONOR_SOURCES,
  HONOR_SHOP,
  HONOR_RANKS,
  gainHonor,
  spendHonor,
  getRank,
  getHonorBonus,
  getStatus,
};

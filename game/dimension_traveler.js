// ==========================================
// 차원 여행자 (Dimension Traveler) — v2.54
// 평행 차원 6종 + 고유 룰/제약 + 전용 보상 + 차원석
// ==========================================

// ── 평행 차원 6종 ──
const DIMENSIONS = {
  mirror: {
    name: '거울 차원', icon: '🪞', color: '#88ccff',
    desc: '모든 것이 반전된 세계. 강한 자가 약해지고, 약한 자가 강해진다.',
    lore: '"거울 속 너는 너와 정반대의 존재다."',
    rules: { invertStats: true, desc: 'ATK↔DEF 반전, SPD 반전' },
    minLevel: 20,
    stages: 5,
    monsters: { hpMulti: 1.5, atkMulti: 1.5, defMulti: 0.5 },
    rewards: { dimStone: 3, gold: 5000, exp: 3000, specialDrop: 'dim_mirror_shard' },
    timeLimitSec: 180,
  },
  void: {
    name: '공허 차원', icon: '🕳️', color: '#6622cc',
    desc: '마나가 존재하지 않는 세계. 스킬 사용 불가, 오직 기본 공격만.',
    lore: '"마법이 사라진 세계��서, 진정한 전사의 가치가 드러난다."',
    rules: { noMagic: true, noSkills: true, desc: '스킬/마법 사용 불가, 기본 공격만' },
    minLevel: 25,
    stages: 6,
    monsters: { hpMulti: 2.0, atkMulti: 2.0, defMulti: 1.0 },
    rewards: { dimStone: 4, gold: 8000, exp: 5000, specialDrop: 'dim_void_crystal' },
    timeLimitSec: 240,
  },
  giant: {
    name: '거인 차원', icon: '🏔️', color: '#aa8844',
    desc: '모든 몬스터가 10배 크고 강하지만, 한 마리만 잡으면 클리어.',
    lore: '"거인의 세계에선 작은 자가 영웅이 된다."',
    rules: { singleBoss: true, bossMulti: 10, desc: '거대 보스 1체 처치 시 클리어' },
    minLevel: 30,
    stages: 1,
    monsters: { hpMulti: 10.0, atkMulti: 5.0, defMulti: 3.0 },
    rewards: { dimStone: 6, gold: 15000, exp: 10000, specialDrop: 'dim_giant_bone' },
    timeLimitSec: 300,
  },
  speed: {
    name: '가속 차원', icon: '⚡', color: '#ffdd00',
    desc: '시간이 3배 빠른 세계. 모든 것이 초고속으로 진행된다.',
    lore: '"눈 깜짝할 사이에 전투가 끝난다. 반응이 생사를 가른다."',
    rules: { speedMulti: 3.0, cdMulti: 0.3, desc: '모든 속도 x3, 쿨다운 70% 감소' },
    minLevel: 25,
    stages: 8,
    monsters: { hpMulti: 1.0, atkMulti: 3.0, defMulti: 0.8 },
    rewards: { dimStone: 4, gold: 7000, exp: 6000, specialDrop: 'dim_time_fragment' },
    timeLimitSec: 120,
  },
  undead: {
    name: '불사 차원', icon: '💀', color: '#44aa44',
    desc: '죽은 몬스터가 30초 후 부활하는 세계. 전부 동시에 죽여야 한다.',
    lore: '"죽음이 의미 없는 세계. 영원히 싸워야 한다... 아니면 한번에."',
    rules: { monsterRevive: true, reviveTimer: 30, desc: '몬스터 30초 후 부활, 전멸 시 클리어' },
    minLevel: 30,
    stages: 4,
    monsters: { hpMulti: 1.5, atkMulti: 1.8, defMulti: 1.2 },
    rewards: { dimStone: 5, gold: 10000, exp: 8000, specialDrop: 'dim_soul_ember' },
    timeLimitSec: 240,
  },
  paradise: {
    name: '낙원 차원', icon: '🌈', color: '#ff88ff',
    desc: '모든 드롭이 5배, 모든 경험치 5배. 하지만 HP가 1로 고정.',
    lore: '"낙원에는 대가가 따른다. 한 방에 죽는 대신, 모든 것을 얻는다."',
    rules: { fixedHp: 1, dropMulti: 5, expMulti: 5, desc: 'HP 1 고정, 드롭/EXP x5' },
    minLevel: 35,
    stages: 5,
    monsters: { hpMulti: 0.5, atkMulti: 1.0, defMulti: 0.3 },
    rewards: { dimStone: 8, gold: 25000, exp: 20000, specialDrop: 'dim_paradise_fruit' },
    timeLimitSec: 180,
  },
};

// ── 차원석 상점 ──
const DIM_SHOP = {
  dim_mirror_shard:   { name: '거울 파편', icon: '🪞', desc: '장비 스탯 반전 (ATK↔DEF)', price: 5, type: 'consumable' },
  dim_void_crystal:   { name: '공허 결정', icon: '🕳️', desc: '10초간 적 스킬 봉인', price: 8, type: 'consumable' },
  dim_giant_bone:     { name: '거인의 뼈', icon: '🦴', desc: 'HP +500, DEF +30 영구', price: 15, type: 'permanent', bonus: { maxHp: 500, def: 30 } },
  dim_time_fragment:  { name: '시간의 조각', icon: '⏱️', desc: 'SPD +8, 공격속도 +15% 영구', price: 12, type: 'permanent', bonus: { spd: 8, atkSpeed: 0.15 } },
  dim_soul_ember:     { name: '불사��� 잔불', icon: '🔥', desc: '사망 시 1회 부활 (HP 30%, 10분 CD)', price: 20, type: 'permanent', bonus: { autoRevive: true, reviveHp: 0.3 } },
  dim_paradise_fruit: { name: '낙원의 열매', icon: '🍎', desc: 'EXP +15%, 골드 +15% 영구', price: 10, type: 'permanent', bonus: { expBonus: 15, goldBonus: 15 } },
  dim_traveler_badge: { name: '차원 여행자 배지', icon: '🏅', desc: '모든 차원 보상 +20%', price: 30, type: 'permanent', bonus: { dimRewardMulti: 0.2 } },
  dim_portal_stone:   { name: '차원문 열쇠', icon: '🔑', desc: '일일 차원 입장 +1회', price: 25, type: 'permanent', bonus: { extraEntry: 1 } },
};

// 입장 제한
const DAILY_ENTRIES = 3;

function _ensure(player) {
  if (!player._dimTravel) {
    player._dimTravel = {
      dimStones: 0,
      totalClears: 0,
      totalFails: 0,
      dailyEntries: 0,
      lastEntryDate: null,
      clearHistory: {},    // { dimId: { clears, bestTime, firstClear } }
      purchased: {},       // { shopItemId: true }
      inDimension: null,   // { dimId, startTime, stage, stagesCleared }
    };
  }
  return player._dimTravel;
}

function _today() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

// ── 차원 입장 ──
function enterDimension(player, dimId) {
  const dt = _ensure(player);
  const dim = DIMENSIONS[dimId];
  if (!dim) return { success: false, msg: '알 수 없는 차원' };
  if (player.level < dim.minLevel) return { success: false, msg: `Lv.${dim.minLevel} 이상 필요` };
  if (dt.inDimension) return { success: false, msg: '이미 차원 탐험 중' };

  // 일일 입장 제한
  const today = _today();
  if (dt.lastEntryDate !== today) { dt.dailyEntries = 0; dt.lastEntryDate = today; }
  const maxEntries = DAILY_ENTRIES + (dt.purchased.dim_portal_stone ? 1 : 0);
  if (dt.dailyEntries >= maxEntries) return { success: false, msg: `일일 입장 한도 (${maxEntries}회)` };

  dt.dailyEntries++;
  dt.inDimension = { dimId, startTime: Date.now(), stage: 1, stagesCleared: 0 };

  return {
    success: true, dimension: dim,
    msg: `${dim.icon} ${dim.name} 진입! — ${dim.rules.desc} [${dim.stages}스테이지, ${dim.timeLimitSec}초]`,
  };
}

// ── 스테이지 클리어 ──
function clearStage(player) {
  const dt = _ensure(player);
  if (!dt.inDimension) return { success: false, msg: '차원 탐험 중이 아닙니다' };

  const dim = DIMENSIONS[dt.inDimension.dimId];
  if (!dim) return { success: false, msg: '오류' };

  // 시간 초과 체크
  const elapsed = Math.floor((Date.now() - dt.inDimension.startTime) / 1000);
  if (elapsed > dim.timeLimitSec) {
    dt.inDimension = null;
    dt.totalFails++;
    return { success: false, timeout: true, msg: `⏰ 시간 초과! ${dim.name} 실패...` };
  }

  dt.inDimension.stagesCleared++;
  dt.inDimension.stage++;

  // 전 스테이지 클리어?
  if (dt.inDimension.stagesCleared >= dim.stages) {
    return completeDimension(player);
  }

  return {
    success: true, cleared: false,
    stage: dt.inDimension.stage,
    remaining: dim.stages - dt.inDimension.stagesCleared,
    msg: `스테이지 ${dt.inDimension.stagesCleared}/${dim.stages} 클리어!`,
  };
}

// ── 차원 완료 ──
function completeDimension(player) {
  const dt = _ensure(player);
  if (!dt.inDimension) return { success: false, msg: '오류' };

  const dimId = dt.inDimension.dimId;
  const dim = DIMENSIONS[dimId];
  const elapsed = Math.floor((Date.now() - dt.inDimension.startTime) / 1000);

  // 보상 배율
  const rewardMulti = 1.0 + (dt.purchased.dim_traveler_badge ? 0.2 : 0);

  const rewards = {
    dimStones: Math.floor(dim.rewards.dimStone * rewardMulti),
    gold: Math.floor(dim.rewards.gold * rewardMulti),
    exp: Math.floor(dim.rewards.exp * rewardMulti),
    specialDrop: dim.rewards.specialDrop,
  };

  dt.dimStones += rewards.dimStones;
  player.gold = (player.gold || 0) + rewards.gold;
  player.exp = (player.exp || 0) + rewards.exp;

  // 특수 드롭
  if (!player.inventory) player.inventory = {};
  player.inventory[rewards.specialDrop] = (player.inventory[rewards.specialDrop] || 0) + 1;

  // 기록
  if (!dt.clearHistory[dimId]) dt.clearHistory[dimId] = { clears: 0, bestTime: 99999, firstClear: Date.now() };
  dt.clearHistory[dimId].clears++;
  if (elapsed < dt.clearHistory[dimId].bestTime) dt.clearHistory[dimId].bestTime = elapsed;
  dt.totalClears++;

  dt.inDimension = null;

  const dropName = DIM_SHOP[rewards.specialDrop]?.name || rewards.specialDrop;

  return {
    success: true, cleared: true, rewards, elapsed, dropName,
    msg: `${dim.icon} ${dim.name} 클리어! (${elapsed}초) — 차원석 +${rewards.dimStones}, ${dropName} 획득!`,
  };
}

// ── 탐험 포기 ──
function abandonDimension(player) {
  const dt = _ensure(player);
  if (!dt.inDimension) return { success: false, msg: '탐험 중이 아닙니다' };
  dt.inDimension = null;
  dt.totalFails++;
  return { success: true, msg: '차원 탐험 포기...' };
}

// ── 차원석 상점 구매 ──
function buyShopItem(player, itemId) {
  const dt = _ensure(player);
  const item = DIM_SHOP[itemId];
  if (!item) return { success: false, msg: '알 수 없는 아이템' };
  if (item.type === 'permanent' && dt.purchased[itemId]) return { success: false, msg: '이미 구매함' };
  if (dt.dimStones < item.price) return { success: false, msg: `차원석 부족 (${dt.dimStones}/${item.price})` };

  dt.dimStones -= item.price;

  if (item.type === 'permanent') {
    dt.purchased[itemId] = true;
  } else {
    if (!player.inventory) player.inventory = {};
    player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
  }

  return { success: true, item, msg: `${item.icon} ${item.name} 구매 완료!` };
}

// ── 영구 보너스 계산 ──
function getPassiveBonuses(player) {
  const dt = _ensure(player);
  const bonuses = {};
  for (const [itemId, purchased] of Object.entries(dt.purchased)) {
    if (!purchased) continue;
    const item = DIM_SHOP[itemId];
    if (!item?.bonus) continue;
    for (const [stat, val] of Object.entries(item.bonus)) {
      if (typeof val === 'boolean') bonuses[stat] = val;
      else bonuses[stat] = (bonuses[stat] || 0) + val;
    }
  }
  return bonuses;
}

// ── 상태 조회 ──
function getStatus(player) {
  const dt = _ensure(player);
  const today = _today();
  if (dt.lastEntryDate !== today) dt.dailyEntries = 0;
  const maxEntries = DAILY_ENTRIES + (dt.purchased.dim_portal_stone ? 1 : 0);

  const dimensions = Object.entries(DIMENSIONS).map(([id, dim]) => {
    const history = dt.clearHistory[id];
    return {
      id, name: dim.name, icon: dim.icon, color: dim.color,
      desc: dim.desc, lore: dim.lore,
      rules: dim.rules.desc,
      minLevel: dim.minLevel, stages: dim.stages, timeLimit: dim.timeLimitSec,
      canEnter: player.level >= dim.minLevel,
      clears: history?.clears || 0,
      bestTime: history?.bestTime < 99999 ? history.bestTime : null,
      rewards: { dimStone: dim.rewards.dimStone, gold: dim.rewards.gold, exp: dim.rewards.exp },
    };
  });

  const shop = Object.entries(DIM_SHOP).map(([id, item]) => ({
    id, ...item, owned: !!dt.purchased[id], canBuy: dt.dimStones >= item.price && !(item.type === 'permanent' && dt.purchased[id]),
  }));

  return {
    dimStones: dt.dimStones,
    totalClears: dt.totalClears,
    dailyEntries: dt.dailyEntries,
    maxEntries,
    inDimension: dt.inDimension ? {
      dimId: dt.inDimension.dimId,
      dim: DIMENSIONS[dt.inDimension.dimId],
      stage: dt.inDimension.stage,
      stagesCleared: dt.inDimension.stagesCleared,
      elapsed: Math.floor((Date.now() - dt.inDimension.startTime) / 1000),
    } : null,
    dimensions,
    shop,
  };
}

module.exports = {
  DIMENSIONS, DIM_SHOP,
  enterDimension, clearStage, completeDimension, abandonDimension,
  buyShopItem, getPassiveBonuses, getStatus,
};

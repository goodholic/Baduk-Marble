// 칭호 컬렉션 시스템 — v1.65
// 보유한 칭호 수에 따른 영구 메타 보너스 (calling card 시스템)
// game/buff.js의 TITLES와 별도 — 그건 칭호 자체, 이건 컬렉션 메타

const { TITLES } = require('./buff');

// 컬렉션 마일스톤 (보유 칭호 수 → 영구 보너스)
const COLLECTION_MILESTONES = [
  { count: 3,  reward: { atk: 5, def: 5 },                    name: '신참 수집가' },
  { count: 5,  reward: { atk: 10, def: 10, hp: 50 },           name: '수집가' },
  { count: 8,  reward: { atk: 15, def: 15, hp: 100, expBonus: 0.05 }, name: '명예 수집가' },
  { count: 12, reward: { atk: 25, def: 25, hp: 200, expBonus: 0.10, goldBonus: 0.05 }, name: '베테랑 수집가' },
  { count: 16, reward: { atk: 40, def: 40, hp: 400, expBonus: 0.15, goldBonus: 0.10, critRate: 0.03 }, name: '전설 수집가' },
  { count: 20, reward: { atk: 60, def: 60, hp: 600, expBonus: 0.20, goldBonus: 0.15, critRate: 0.05, dropRate: 0.10 }, name: '명장' },
  { count: 25, reward: { atk: 80, def: 80, hp: 800, expBonus: 0.25, goldBonus: 0.20, critRate: 0.08, dropRate: 0.15 }, name: '명예의 전당' },
  { count: 30, reward: { atk: 100, def: 100, hp: 1000, expBonus: 0.30, goldBonus: 0.25, critRate: 0.10, dropRate: 0.20, allMulti: 0.05 }, name: '칭호의 군주' },
];

// 카테고리별 컬렉션 (특정 종류 칭호 모으기)
const CATEGORY_COLLECTIONS = {
  combat: {
    name: '전투 칭호 컬렉션',
    titles: ['title_first_pk', 'title_slayer', 'title_warlord', 'title_dragon', 'title_dungeon'],
    bonusPerComplete: { atk: 30, critRate: 0.05 },
  },
  economy: {
    name: '경제 칭호 컬렉션',
    titles: ['title_merchant', 'title_millionaire', 'title_crafter'],
    bonusPerComplete: { goldBonus: 0.15, marketFee: -0.03 },
  },
  social: {
    name: '소셜 칭호 컬렉션',
    titles: ['title_tamer', 'title_arena_king', 'title_guild_master'],
    bonusPerComplete: { expBonus: 0.10, hp: 200 },
  },
  legendary: {
    name: '전설 칭호 컬렉션 (v1.9)',
    titles: ['title_void_walker', 'title_immortal', 'title_sky_lord'],
    bonusPerComplete: { allMulti: 0.05 },
  },
};

function _getOwnedTitles(player) {
  return player.titles || [];
}

function getCollectionBonus(player, stat) {
  const owned = _getOwnedTitles(player);
  const count = owned.length;
  let total = 0;

  // 마일스톤 보너스 (가장 높은 달성 마일스톤만)
  let highestMilestone = null;
  for (const m of COLLECTION_MILESTONES) {
    if (count >= m.count) highestMilestone = m;
  }
  if (highestMilestone && highestMilestone.reward[stat]) {
    total += highestMilestone.reward[stat];
  }

  // 카테고리 컬렉션 완성 보너스
  for (const cat of Object.values(CATEGORY_COLLECTIONS)) {
    const completed = cat.titles.every(t => owned.includes(t));
    if (completed && cat.bonusPerComplete[stat]) {
      total += cat.bonusPerComplete[stat];
    }
  }

  return total;
}

function getStatus(player) {
  const owned = _getOwnedTitles(player);
  const count = owned.length;

  // 다음 마일스톤
  const nextMilestone = COLLECTION_MILESTONES.find(m => m.count > count);

  // 카테고리별 진행도
  const categories = {};
  for (const [catId, cat] of Object.entries(CATEGORY_COLLECTIONS)) {
    const collected = cat.titles.filter(t => owned.includes(t));
    categories[catId] = {
      ...cat,
      collected: collected.length,
      total: cat.titles.length,
      complete: collected.length === cat.titles.length,
      missing: cat.titles.filter(t => !owned.includes(t)).map(t => ({
        id: t,
        name: TITLES[t]?.name || t,
      })),
    };
  }

  // 현재 활성 마일스톤
  let currentMilestone = null;
  for (const m of COLLECTION_MILESTONES) {
    if (count >= m.count) currentMilestone = m;
  }

  return {
    totalCollected: count,
    totalAvailable: Object.keys(TITLES).length,
    currentMilestone,
    nextMilestone,
    nextMilestoneRemaining: nextMilestone ? nextMilestone.count - count : 0,
    milestones: COLLECTION_MILESTONES,
    categories,
  };
}

module.exports = {
  COLLECTION_MILESTONES,
  CATEGORY_COLLECTIONS,
  getCollectionBonus,
  getStatus,
};

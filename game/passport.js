// 여행자의 여권 — v1.77
// 방문한 지역에 도장을 받음 + 지역(region) 완성 시 배지 + 마일스톤 보상
// 도감(codex)과 차이: codex는 단순 카운트, passport는 region별 그룹화 + 첫 방문 보상

const { ZONES } = require('./data/zones');

// 지역 그룹 (51 zones를 6개 region으로 그룹화)
const REGIONS = {
  central_west: {
    name: '중앙 서부',
    icon: '🏞️',
    zones: ['aden', 'forest', 'plains', 'meadow', 'swamp', 'cave', 'ruins'],
    completionBonus: { atk: 5, def: 5 },
  },
  central: {
    name: '중앙',
    icon: '🌍',
    zones: ['oasis', 'desert', 'volcano', 'darkforest', 'dragon', 'graveyard', 'glacier', 'ancient', 'chaos', 'warzone', 'castle', 'arena', 'mountain', 'frontier', 'magma_core'],
    completionBonus: { hp: 100, atk: 10 },
  },
  east_continent: {
    name: '동부 대륙',
    icon: '🌅',
    zones: ['harbor', 'coral', 'mushroom', 'port_east', 'riverbank', 'sandstorm', 'sunken', 'shadow', 'celestial', 'void_rift', 'fishing', 'blood_arena', 'colosseum', 'bazaar'],
    completionBonus: { dropRate: 0.05, expBonus: 0.05 },
  },
  west_continent: {
    name: '서부 대륙',
    icon: '🌄',
    zones: ['shrine', 'tundra', 'crystal_mine', 'toxic_marsh', 'haunted', 'sky_ruins', 'frozen_deep', 'demon', 'lawless', 'training'],
    completionBonus: { critRate: 0.03, hp: 100 },
  },
  endgame: {
    name: '엔드게임',
    icon: '🌌',
    zones: ['world_tree', 'fortress'],
    completionBonus: { atk: 30, allMulti: 0.03 },
  },
  new_zones: {
    name: '신규 지역 (v1.8)',
    icon: '✨',
    zones: ['mist_vale', 'obsidian', 'thunder'],
    completionBonus: { dropRate: 0.05 },
  },
};

const PASSPORT_MILESTONES = [
  { count: 10, reward: { gold: 1000, title: 'wanderer' },         name: '방랑자' },
  { count: 25, reward: { gold: 5000, diamonds: 50 },               name: '탐험가' },
  { count: 40, reward: { gold: 15000, diamonds: 150, item: 'mat_dragon', count: 3 }, name: '세계 여행자' },
  { count: 51, reward: { gold: 50000, diamonds: 500, title: 'world_traveler', allMulti: 0.05 }, name: '지도 정복자' },
];

function _ensure(player) {
  if (!player.passport) player.passport = { stamps: [], badges: [], milestonesClaimed: [] };
  return player.passport;
}

// 첫 방문 시 도장 + 보상
function visitZone(player, zoneId) {
  const zone = ZONES[zoneId];
  if (!zone) return { success: false, msg: '존재하지 않는 지역' };
  const data = _ensure(player);
  if (data.stamps.includes(zoneId)) {
    return { success: false, msg: '이미 방문' };
  }
  data.stamps.push(zoneId);

  // 첫 방문 보상 (지역 종류별)
  let firstVisitReward = { gold: 100, exp: 50 };
  if (!zone.safe) firstVisitReward = { gold: 200, exp: 100 };
  if (zone.lvl && zone.lvl[0] >= 30) firstVisitReward = { gold: 500, exp: 300 };

  player.gold = (player.gold || 0) + firstVisitReward.gold;
  player.exp = (player.exp || 0) + firstVisitReward.exp;

  // Region 완성 체크
  let newBadges = [];
  for (const [regionId, region] of Object.entries(REGIONS)) {
    if (data.badges.includes(regionId)) continue;
    if (region.zones.every(z => data.stamps.includes(z))) {
      data.badges.push(regionId);
      newBadges.push({ regionId, ...region });
    }
  }

  // 마일스톤 체크
  let newMilestones = [];
  for (const m of PASSPORT_MILESTONES) {
    if (data.stamps.length >= m.count && !data.milestonesClaimed.includes(m.count)) {
      data.milestonesClaimed.push(m.count);
      // 보상 적용
      if (m.reward.gold) player.gold += m.reward.gold;
      if (m.reward.diamonds) player.diamonds = (player.diamonds || 0) + m.reward.diamonds;
      if (m.reward.title) {
        if (!player.titles) player.titles = [];
        if (!player.titles.includes(m.reward.title)) player.titles.push(m.reward.title);
      }
      if (m.reward.item) {
        if (!player.inventory) player.inventory = {};
        player.inventory[m.reward.item] = (player.inventory[m.reward.item] || 0) + (m.reward.count || 1);
      }
      newMilestones.push(m);
    }
  }

  return {
    success: true,
    zoneId,
    zoneName: zone.name,
    firstVisitReward,
    newBadges,
    newMilestones,
    totalStamps: data.stamps.length,
  };
}

function getPassportBonus(player, stat) {
  const data = _ensure(player);
  let total = 0;

  // Region 배지 보너스
  for (const regionId of data.badges) {
    const bonus = REGIONS[regionId]?.completionBonus?.[stat];
    if (bonus) total += bonus;
  }

  // 마일스톤 보너스 (지도 정복자 등)
  for (const claimedCount of data.milestonesClaimed) {
    const m = PASSPORT_MILESTONES.find(mi => mi.count === claimedCount);
    if (m && m.reward[stat]) total += m.reward[stat];
  }

  return total;
}

function getStatus(player) {
  const data = _ensure(player);
  const totalZones = Object.keys(ZONES).length;
  return {
    stamps: data.stamps.length,
    totalZones,
    badges: data.badges.map(id => ({ id, ...REGIONS[id] })),
    milestonesClaimed: data.milestonesClaimed,
    nextMilestone: PASSPORT_MILESTONES.find(m => m.count > data.stamps.length),
    regions: Object.entries(REGIONS).map(([id, r]) => ({
      id, ...r,
      visited: r.zones.filter(z => data.stamps.includes(z)).length,
      total: r.zones.length,
      complete: data.badges.includes(id),
    })),
  };
}

module.exports = {
  REGIONS,
  PASSPORT_MILESTONES,
  visitZone,
  getPassportBonus,
  getStatus,
};

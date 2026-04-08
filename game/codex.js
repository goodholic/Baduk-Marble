// 도감 (Codex) 시스템 — v1.33
// 발견한 몬스터/아이템/지역을 자동 기록 → 카테고리 완성 시 영구 스탯 보너스
// 플레이어의 탐험 의욕을 자극하는 컬렉션 메타 게임

// 카테고리별 도감 정의
const CODEX_CATEGORIES = {
  monster: {
    name: '몬스터 도감',
    icon: '🐲',
    desc: '처치하거나 테이밍한 몬스터를 자동 기록',
    // 진척도 → 영구 보너스 (누적 적용)
    milestones: [
      { count: 10,  reward: { atk: 2 },  name: '초보 사냥꾼' },
      { count: 30,  reward: { atk: 5, def: 3 }, name: '숙련 사냥꾼' },
      { count: 60,  reward: { atk: 10, def: 5, hp: 50 }, name: '베테랑 헌터' },
      { count: 100, reward: { atk: 20, def: 10, hp: 150, critRate: 0.05 }, name: '전설의 헌터' },
    ],
  },
  zone: {
    name: '지역 도감',
    icon: '🗺️',
    desc: '방문한 지역을 자동 기록',
    milestones: [
      { count: 10, reward: { speed: 1 }, name: '여행자' },
      { count: 25, reward: { speed: 2, expBonus: 0.05 }, name: '탐험가' },
      { count: 40, reward: { speed: 3, expBonus: 0.10 }, name: '세계 여행자' },
      { count: 51, reward: { speed: 5, expBonus: 0.15, dropRate: 0.10 }, name: '지도 정복자' },
    ],
  },
  equip: {
    name: '장비 도감',
    icon: '⚔️',
    desc: '획득한 장비 종류를 자동 기록',
    milestones: [
      { count: 10, reward: { def: 3 }, name: '초보 수집가' },
      { count: 20, reward: { def: 8, hp: 50 }, name: '장비 수집가' },
      { count: 30, reward: { def: 15, hp: 150, atk: 5 }, name: '장비 마니아' },
      { count: 40, reward: { def: 25, hp: 300, atk: 12, critRate: 0.05 }, name: '아머리 마스터' },
    ],
  },
  fish: {
    name: '어종 도감',
    icon: '🐟',
    desc: '낚은 어종을 자동 기록 (v1.24 낚시 연동)',
    milestones: [
      { count: 3,  reward: { goldBonus: 0.03 }, name: '초보 낚시꾼' },
      { count: 6,  reward: { goldBonus: 0.05, dropRate: 0.05 }, name: '낚시 애호가' },
      { count: 9,  reward: { goldBonus: 0.10, dropRate: 0.10 }, name: '낚시 달인' },
      { count: 11, reward: { goldBonus: 0.15, dropRate: 0.15, expBonus: 0.10 }, name: '바다의 친구' },
    ],
  },
  pet: {
    name: '펫 도감',
    icon: '🐾',
    desc: '보유한 펫 종류를 자동 기록 (진화형 별도 카운트)',
    milestones: [
      { count: 3, reward: { hp: 50 }, name: '동물 친구' },
      { count: 5, reward: { hp: 100, expBonus: 0.05 }, name: '조련사' },
      { count: 7, reward: { hp: 200, expBonus: 0.10, atk: 5 }, name: '펫 마스터' },
      { count: 9, reward: { hp: 400, expBonus: 0.15, atk: 12, critRate: 0.03 }, name: '신화의 동반자' },
    ],
  },
};

function _ensure(player) {
  if (!player.codex) player.codex = {};
  for (const cat of Object.keys(CODEX_CATEGORIES)) {
    if (!player.codex[cat]) player.codex[cat] = { entries: [], claimedMilestones: [] };
  }
  return player.codex;
}

// 새 항목 발견 → true 반환 (이미 있으면 false)
function discover(player, category, entryId) {
  const codex = _ensure(player);
  if (!codex[category]) return { added: false };
  if (codex[category].entries.includes(entryId)) return { added: false };
  codex[category].entries.push(entryId);

  // 마일스톤 확인
  const cat = CODEX_CATEGORIES[category];
  const newMilestones = [];
  for (const m of cat.milestones) {
    if (codex[category].entries.length >= m.count && !codex[category].claimedMilestones.includes(m.count)) {
      codex[category].claimedMilestones.push(m.count);
      newMilestones.push(m);
      // 영구 스탯 보너스 적용 (legacyPerks 형태로 저장)
      if (!player.codexBonuses) player.codexBonuses = {};
      for (const [stat, value] of Object.entries(m.reward)) {
        player.codexBonuses[stat] = (player.codexBonuses[stat] || 0) + value;
      }
    }
  }
  return { added: true, count: codex[category].entries.length, newMilestones };
}

function getProgress(player) {
  const codex = _ensure(player);
  const result = {};
  for (const [catId, cat] of Object.entries(CODEX_CATEGORIES)) {
    const c = codex[catId];
    const nextMilestone = cat.milestones.find(m => !c.claimedMilestones.includes(m.count));
    result[catId] = {
      name: cat.name,
      icon: cat.icon,
      desc: cat.desc,
      count: c.entries.length,
      claimedMilestones: c.claimedMilestones,
      nextMilestone: nextMilestone ? { count: nextMilestone.count, reward: nextMilestone.reward, name: nextMilestone.name } : null,
      allMilestones: cat.milestones,
    };
  }
  return { categories: result, totalBonuses: player.codexBonuses || {} };
}

function getCodexBonus(player, stat) {
  return (player.codexBonuses && player.codexBonuses[stat]) || 0;
}

module.exports = {
  CODEX_CATEGORIES,
  discover,
  getProgress,
  getCodexBonus,
};

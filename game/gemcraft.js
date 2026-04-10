// 보석 세공 시스템 — v1.95
// 원석을 사서 세공 → 등급별 보석 획득 (실패 시 가루)
// 보석은 인벤토리에 저장, 추후 장비 장착 등에 활용 가능

const ROUGH_GEMS = {
  ruby_rough:    { name:'루비 원석',     stat:'atk',     buyPrice: 100 },
  sapphire_rough:{ name:'사파이어 원석', stat:'mp',      buyPrice: 100 },
  emerald_rough: { name:'에메랄드 원석', stat:'maxHp',   buyPrice: 120 },
  topaz_rough:   { name:'토파즈 원석',   stat:'crit',    buyPrice: 150 },
  diamond_rough: { name:'다이아몬드 원석', stat:'allStats', buyPrice: 500 },
};

// 세공 등급 — 성공시 어떤 등급으로 나올지 확률 가중치
const CUT_GRADES = {
  flawed:    { name:'결함 있는',  multiplier: 0.5, weight: 30 },
  fair:      { name:'평범한',    multiplier: 1.0, weight: 40 },
  fine:      { name:'정교한',    multiplier: 1.8, weight: 20 },
  brilliant: { name:'찬란한',    multiplier: 3.0, weight:  9 },
  perfect:   { name:'완벽한',    multiplier: 5.0, weight:  1 },
};

const GEM_BASE_VALUE = {
  atk: 5,
  mp: 15,
  maxHp: 25,
  crit: 2,
  allStats: 3,
};

const CUT_FAILURE_RATE = 0.15; // 15% 확률로 가루
const CUT_COST = 50;           // 세공 시도 골드

function _ensure(player) {
  if (!player.gemcraft) {
    player.gemcraft = {
      rough: {},      // {ruby_rough: count}
      cut: [],        // [{id, base, grade, stat, value, createdAt}]
      dust: 0,
      totalCuts: 0,
      perfects: 0,
    };
  }
  return player.gemcraft;
}

function _pickGrade() {
  const total = Object.values(CUT_GRADES).reduce((s, g) => s + g.weight, 0);
  let roll = Math.random() * total;
  for (const [id, g] of Object.entries(CUT_GRADES)) {
    roll -= g.weight;
    if (roll <= 0) return id;
  }
  return 'fair';
}

function getStatus(player) {
  const g = _ensure(player);
  return {
    rough: g.rough,
    cut: g.cut,
    dust: g.dust,
    totalCuts: g.totalCuts,
    perfects: g.perfects,
    roughTypes: ROUGH_GEMS,
    grades: CUT_GRADES,
    cutCost: CUT_COST,
  };
}

function buyRough(player, roughId, count) {
  const g = _ensure(player);
  const def = ROUGH_GEMS[roughId];
  if (!def) return { success:false, msg:'존재하지 않는 원석' };
  count = Math.max(1, Math.floor(count || 1));
  const totalCost = def.buyPrice * count;
  if ((player.gold || 0) < totalCost) return { success:false, msg:'골드 부족' };
  player.gold -= totalCost;
  g.rough[roughId] = (g.rough[roughId] || 0) + count;
  return { success:true, msg:`${def.name} ${count}개 구매 (${totalCost}G)`, cost: totalCost };
}

function cut(player, roughId) {
  const g = _ensure(player);
  const def = ROUGH_GEMS[roughId];
  if (!def) return { success:false, msg:'존재하지 않는 원석' };
  if ((g.rough[roughId] || 0) < 1) return { success:false, msg:'원석 없음' };
  if ((player.gold || 0) < CUT_COST) return { success:false, msg:`세공 비용 ${CUT_COST}G 부족` };

  g.rough[roughId] -= 1;
  player.gold -= CUT_COST;
  g.totalCuts += 1;

  if (Math.random() < CUT_FAILURE_RATE) {
    g.dust += 1;
    return { success:true, msg:`${def.name} 세공 실패 — 가루 +1`, failed:true };
  }

  const gradeId = _pickGrade();
  const grade = CUT_GRADES[gradeId];
  const baseValue = GEM_BASE_VALUE[def.stat] || 1;
  const finalValue = Math.max(1, Math.round(baseValue * grade.multiplier));
  if (gradeId === 'perfect') g.perfects += 1;

  const gem = {
    id: `gem_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    base: roughId,
    name: `${grade.name} ${def.name.replace(' 원석','')}`,
    grade: gradeId,
    stat: def.stat,
    value: finalValue,
    createdAt: Date.now(),
  };
  g.cut.push(gem);
  return {
    success:true,
    msg:`${gem.name} 획득! (+${finalValue} ${gem.stat})${gradeId==='perfect'?' ⭐ PERFECT':''}`,
    gem,
    perfect: gradeId === 'perfect',
  };
}

function sellGem(player, gemId) {
  const g = _ensure(player);
  const idx = g.cut.findIndex(x => x.id === gemId);
  if (idx < 0) return { success:false, msg:'보석 없음' };
  const gem = g.cut[idx];
  const gradeMul = CUT_GRADES[gem.grade]?.multiplier || 1;
  const price = Math.round(50 * gradeMul * gradeMul);
  g.cut.splice(idx, 1);
  player.gold = Math.min(999999999, (player.gold || 0) + price);
  return { success:true, msg:`${gem.name} 판매 (+${price}G)`, gold: price };
}

module.exports = {
  ROUGH_GEMS,
  CUT_GRADES,
  GEM_BASE_VALUE,
  CUT_COST,
  getStatus,
  buyRough,
  cut,
  sellGem,
};

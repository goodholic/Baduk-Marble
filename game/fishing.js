// 낚시 미니게임 — v1.24
// 낚시 만(fishing zone) 또는 강가(riverbank) 등 특정 존에서 사용
// 낚싯대 등급 + 미끼에 따라 잡히는 물고기 풀이 달라짐
// ach_fish50 업적과 연계 (물고기 50마리 처치)

const FISH_TYPES = {
  // 일반 (값싸지만 잘 잡힘)
  fish_minnow:    { name:'송사리',     rarity:'common',    value:10,   weight:50, expGain:5  },
  fish_carp:      { name:'잉어',       rarity:'common',    value:25,   weight:40, expGain:8  },
  fish_trout:     { name:'송어',       rarity:'common',    value:35,   weight:35, expGain:10 },
  // 고급
  fish_eel:       { name:'장어',       rarity:'uncommon',  value:80,   weight:25, expGain:18 },
  fish_salmon:    { name:'연어',       rarity:'uncommon',  value:120,  weight:20, expGain:25 },
  // 희귀
  fish_pike:      { name:'창꼬치',     rarity:'rare',      value:250,  weight:12, expGain:45 },
  fish_sturgeon:  { name:'철갑상어',   rarity:'rare',      value:400,  weight:8,  expGain:70 },
  // 영웅
  fish_swordfish: { name:'황새치',     rarity:'epic',      value:800,  weight:5,  expGain:120 },
  fish_marlin:    { name:'청새치',     rarity:'epic',      value:1200, weight:3,  expGain:180 },
  // 전설
  fish_legendary_koi: { name:'전설의 비단잉어', rarity:'legendary', value:5000, weight:1, expGain:500, special:'평생 행운 +5%' },
  // 신화 (밤에만, 낚시터 한정)
  fish_mythic_kraken: { name:'신화의 크라켄', rarity:'mythic', value:20000, weight:0.2, expGain:2000, nightOnly:true, zoneOnly:'fishing', special:'바다의 군주 칭호 획득' },
};

const FISHING_RODS = {
  rod_wooden:   { name:'나무 낚싯대',   tier:1, qualityMulti:1.0, rareBonus:0.00, price:{gold:200},  desc:'기본 낚싯대' },
  rod_iron:     { name:'철제 낚싯대',   tier:2, qualityMulti:1.2, rareBonus:0.05, price:{gold:1500}, desc:'희귀 어종 +5%' },
  rod_silver:   { name:'은제 낚싯대',   tier:3, qualityMulti:1.5, rareBonus:0.12, price:{gold:8000}, desc:'희귀 어종 +12%' },
  rod_mythril:  { name:'미스릴 낚싯대', tier:4, qualityMulti:2.0, rareBonus:0.20, price:{diamonds:200}, desc:'영웅 어종 가능, +20%' },
  rod_dragon:   { name:'드래곤 낚싯대', tier:5, qualityMulti:3.0, rareBonus:0.35, price:{diamonds:800}, desc:'전설/신화 어종 가능, +35%' },
};

const FISHING_BAIT = {
  bait_worm:     { name:'지렁이',     bonusWeight:{ common:1.5 },             price:5  },
  bait_shrimp:   { name:'새우',       bonusWeight:{ uncommon:1.5 },           price:30 },
  bait_squid:    { name:'오징어',     bonusWeight:{ rare:1.5, epic:1.2 },     price:150 },
  bait_glow:     { name:'발광 미끼',  bonusWeight:{ legendary:2.0, mythic:1.5 }, price:1000, desc:'밤 전용, 전설/신화급 확률 +' },
};

function getCatchablePool(rod, isNight = false, zoneId = null) {
  const rodTier = FISHING_RODS[rod]?.tier || 1;
  return Object.entries(FISH_TYPES).filter(([id, fish]) => {
    if (fish.nightOnly && !isNight) return false;
    if (fish.zoneOnly && zoneId !== fish.zoneOnly) return false;
    // 낚싯대 등급 제한: epic은 tier 4+, legendary/mythic은 tier 5
    if (fish.rarity === 'epic' && rodTier < 4) return false;
    if ((fish.rarity === 'legendary' || fish.rarity === 'mythic') && rodTier < 5) return false;
    return true;
  });
}

function catchFish(player, rod = 'rod_wooden', bait = null) {
  const isNight = (typeof globalThis !== 'undefined' && globalThis.isNight) || false;
  const zoneId = player.currentZone || null;
  const pool = getCatchablePool(rod, isNight, zoneId);
  if (!pool.length) return { success: false, msg: '잡을 수 있는 물고기가 없습니다' };

  const rodInfo = FISHING_RODS[rod] || FISHING_RODS.rod_wooden;
  const baitInfo = bait ? FISHING_BAIT[bait] : null;

  // 가중치 계산 (낚싯대 보너스 + 미끼 보너스)
  const weighted = pool.map(([id, fish]) => {
    let w = fish.weight;
    if (baitInfo?.bonusWeight?.[fish.rarity]) w *= baitInfo.bonusWeight[fish.rarity];
    if (fish.rarity !== 'common') w *= (1 + rodInfo.rareBonus);
    return { id, fish, w };
  });
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let roll = Math.random() * total;
  for (const x of weighted) {
    roll -= x.w;
    if (roll <= 0) {
      const value = Math.floor(x.fish.value * rodInfo.qualityMulti);
      player.fishCount = (player.fishCount || 0) + 1;
      return { success: true, fish: x.fish, value, expGain: x.fish.expGain };
    }
  }
  return { success: false, msg: '놓쳤다!' };
}

module.exports = {
  FISH_TYPES,
  FISHING_RODS,
  FISHING_BAIT,
  getCatchablePool,
  catchFish,
};

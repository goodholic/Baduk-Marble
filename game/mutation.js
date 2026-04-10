// ==========================================
// 몬스터 변이 (Mutation) — v2.47
// 필드 몬스터 돌연변이 + 특수 능력 + 전용 드롭 + 도감
// ==========================================

// ── 변이 유형 (14종) ──
const MUTATIONS = {
  // ═══ 원소 변이 (4종) ═══
  flame_infused: {
    name: '화염 주입체', prefix: '🔥', color: '#ff4400', tier: 1,
    desc: '몸에서 화염이 뿜어져 나온다',
    statMulti: { hp: 2.0, atk: 2.5, def: 1.2 },
    ability: { type: 'burnAura', dps: 10, range: 3, desc: '주변 3칸 화상 (10 DPS)' },
    dropBonus: { gold: 3, exp: 3, item: 'mut_flame_core' },
  },
  frost_infused: {
    name: '빙결 주입체', prefix: '❄️', color: '#44ccff', tier: 1,
    desc: '극한의 냉기를 품고 있다',
    statMulti: { hp: 2.5, atk: 1.5, def: 2.0 },
    ability: { type: 'slowAura', slowPct: 0.30, range: 4, desc: '주변 4칸 SPD -30%' },
    dropBonus: { gold: 3, exp: 3, item: 'mut_frost_core' },
  },
  thunder_infused: {
    name: '뇌전 주입체', prefix: '⚡', color: '#ffdd00', tier: 1,
    desc: '전신에서 번개가 튀긴다',
    statMulti: { hp: 1.8, atk: 3.0, def: 1.0 },
    ability: { type: 'chainLightning', dmgPct: 0.3, chainCount: 3, desc: '공격 시 3연쇄 번개 (30% 데미지)' },
    dropBonus: { gold: 3, exp: 3, item: 'mut_thunder_core' },
  },
  void_infused: {
    name: '공허 주입체', prefix: '🕳️', color: '#8822cc', tier: 1,
    desc: '차원의 틈에서 나온 존재',
    statMulti: { hp: 2.0, atk: 2.0, def: 1.5 },
    ability: { type: 'teleport', cd: 10, desc: '10초마다 랜덤 텔레포트' },
    dropBonus: { gold: 4, exp: 4, item: 'mut_void_core' },
  },

  // ═══ 특성 변이 (6종) ═══
  berserker: {
    name: '광폭체', prefix: '😡', color: '#cc0000', tier: 2,
    desc: 'HP가 낮을수록 미쳐 날뛴다',
    statMulti: { hp: 3.0, atk: 2.0, def: 0.8 },
    ability: { type: 'enrage', hpThreshold: 0.5, atkMulti: 2.0, desc: 'HP 50% 이하 시 ATK 2배' },
    dropBonus: { gold: 5, exp: 5, item: 'mut_rage_crystal' },
  },
  regenerator: {
    name: '재생체', prefix: '💚', color: '#44ff44', tier: 2,
    desc: '끊임없이 회복하는 몸',
    statMulti: { hp: 4.0, atk: 1.5, def: 1.5 },
    ability: { type: 'regen', healPct: 0.02, interval: 2, desc: '2초마다 HP 2% 재생' },
    dropBonus: { gold: 5, exp: 5, item: 'mut_life_crystal' },
  },
  mimic: {
    name: '흉내체', prefix: '🎭', color: '#ff88ff', tier: 2,
    desc: '상대의 능력을 복제한다',
    statMulti: { hp: 2.5, atk: 2.5, def: 1.5 },
    ability: { type: 'copyBuff', desc: '공격한 플레이어의 버프를 복제' },
    dropBonus: { gold: 5, exp: 5, item: 'mut_mirror_shard' },
  },
  splitter: {
    name: '분열체', prefix: '🧬', color: '#00ccaa', tier: 2,
    desc: '죽으면 둘로 나뉜다',
    statMulti: { hp: 2.0, atk: 2.0, def: 1.0 },
    ability: { type: 'splitOnDeath', splitCount: 2, splitStatRatio: 0.5, desc: '사망 시 2체로 분열 (50% 스탯)' },
    dropBonus: { gold: 6, exp: 6, item: 'mut_split_cell' },
  },
  phantom: {
    name: '유령체', prefix: '👻', color: '#aaaacc', tier: 2,
    desc: '물리 공격이 투과한다',
    statMulti: { hp: 1.5, atk: 2.5, def: 0.5 },
    ability: { type: 'phaseShift', evadeChance: 0.40, desc: '물리 공격 40% 회피' },
    dropBonus: { gold: 5, exp: 5, item: 'mut_ecto_essence' },
  },
  vampiric: {
    name: '흡혈체', prefix: '🧛', color: '#880044', tier: 2,
    desc: '공격할 때마다 체력을 빨아들인다',
    statMulti: { hp: 2.5, atk: 2.5, def: 1.2 },
    ability: { type: 'lifesteal', stealPct: 0.25, desc: '공격 시 데미지의 25% HP 회복' },
    dropBonus: { gold: 5, exp: 5, item: 'mut_blood_gem' },
  },

  // ═══ 전설 변이 (4종, 매우 희귀) ═══
  abomination: {
    name: '혼돈의 합성체', prefix: '☠️', color: '#ff00ff', tier: 3,
    desc: '여러 변이가 뒤섞인 공포의 존재',
    statMulti: { hp: 5.0, atk: 4.0, def: 3.0 },
    ability: { type: 'multiAbility', abilities: ['burnAura', 'regen', 'enrage'], desc: '화염+재생+광폭 동시 보유' },
    dropBonus: { gold: 15, exp: 15, item: 'mut_chaos_orb' },
  },
  golden: {
    name: '황금체', prefix: '✨', color: '#ffd700', tier: 3,
    desc: '온몸이 황금으로 빛난다. 잡으면 대박!',
    statMulti: { hp: 3.0, atk: 1.5, def: 5.0 },
    ability: { type: 'goldExplosion', goldMulti: 20, desc: '처치 시 골드 x20' },
    dropBonus: { gold: 20, exp: 10, item: 'mut_gold_nugget' },
  },
  shadow_lord: {
    name: '그림자 지배자', prefix: '🌑', color: '#220044', tier: 3,
    desc: '어둠 그 자체. 은신하며 기습한다',
    statMulti: { hp: 3.5, atk: 5.0, def: 1.5 },
    ability: { type: 'stealth', stealthDuration: 5, ambushMulti: 3.0, desc: '5초 은신 후 3배 기습 공격' },
    dropBonus: { gold: 12, exp: 15, item: 'mut_shadow_crystal' },
  },
  ancient_one: {
    name: '태초의 변이체', prefix: '🌟', color: '#ffffff', tier: 3,
    desc: '태초의 에너지가 깃든 궁극의 변이',
    statMulti: { hp: 6.0, atk: 5.0, def: 4.0 },
    ability: { type: 'allPowers', desc: '모든 변이 능력 랜덤 사용 (5초마다)' },
    dropBonus: { gold: 20, exp: 20, item: 'mut_primordial_shard' },
  },
};

// ── 변이 드롭 아이템 효과 ──
const MUTATION_ITEMS = {
  mut_flame_core:     { name: '화염 변이핵', desc: '장비 화속성 부여 재료', sellPrice: 500 },
  mut_frost_core:     { name: '빙결 변이핵', desc: '장비 빙속성 부여 재료', sellPrice: 500 },
  mut_thunder_core:   { name: '뇌전 변이핵', desc: '장비 뇌속성 부여 재료', sellPrice: 500 },
  mut_void_core:      { name: '공허 변이핵', desc: '장비 암속성 부여 재료', sellPrice: 600 },
  mut_rage_crystal:   { name: '분노의 결정', desc: 'ATK +5 영구 강화 재료', sellPrice: 800 },
  mut_life_crystal:   { name: '생명의 결정', desc: 'HP +30 영구 강화 재료', sellPrice: 800 },
  mut_mirror_shard:   { name: '거울 파편', desc: '랜덤 스탯 복제 재료', sellPrice: 800 },
  mut_split_cell:     { name: '분열 세포', desc: '소환수 분열 재료', sellPrice: 700 },
  mut_ecto_essence:   { name: '잔령의 정수', desc: '회피율 강화 재료', sellPrice: 800 },
  mut_blood_gem:      { name: '혈석', desc: '흡혈 강화 재료', sellPrice: 900 },
  mut_chaos_orb:      { name: '혼돈의 구슬', desc: '랜덤 전설 효과 부여', sellPrice: 3000 },
  mut_gold_nugget:    { name: '황금 덩어리', desc: '판매가 5000G', sellPrice: 5000 },
  mut_shadow_crystal: { name: '그림자 결정', desc: '은신 강화 재료', sellPrice: 2500 },
  mut_primordial_shard: { name: '태초의 파편', desc: '궁극 강화 재료', sellPrice: 8000 },
};

// ── 변이 출현 확률 (몬스터 등급별) ──
const MUTATION_RATES = {
  normal: 0.02,      // 2%
  elite: 0.05,       // 5%
  rare: 0.08,        // 8%
  boss: 0.12,        // 12%
  legendary: 0.20,   // 20%
};

// ── 변이 등급별 가중치 ──
const TIER_WEIGHTS = { 1: 60, 2: 30, 3: 10 };

function _ensure(player) {
  if (!player._mutationLog) {
    player._mutationLog = {
      discovered: {},    // { mutationId: { firstSeen, killCount } }
      totalMutantKills: 0,
      favoriteKill: null,
    };
  }
  return player._mutationLog;
}

// ── 몬스터 스폰 시 변이 체크 ──
function tryMutate(monster) {
  const rate = MUTATION_RATES[monster.tier] || 0.02;
  if (Math.random() >= rate) return null;

  // 등급 선택
  const totalWeight = Object.values(TIER_WEIGHTS).reduce((s, w) => s + w, 0);
  let roll = Math.random() * totalWeight;
  let selectedTier = 1;
  for (const [tier, weight] of Object.entries(TIER_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) { selectedTier = parseInt(tier); break; }
  }

  // 해당 등급 변이 중 랜덤 선택
  const candidates = Object.entries(MUTATIONS).filter(([, m]) => m.tier === selectedTier);
  if (candidates.length === 0) return null;
  const [mutId, mutation] = candidates[Math.floor(Math.random() * candidates.length)];

  // 몬스터에 변이 적용
  monster.isMutant = true;
  monster.mutationId = mutId;
  monster.mutationName = mutation.prefix + ' ' + mutation.name;
  monster.mutationColor = mutation.color;
  monster.mutationAbility = mutation.ability;
  monster.mutationTier = mutation.tier;

  // 스탯 강화
  monster.hp = Math.floor(monster.hp * mutation.statMulti.hp);
  monster.maxHp = monster.hp;
  monster.atk = Math.floor(monster.atk * mutation.statMulti.atk);
  monster.def = Math.floor(monster.def * (mutation.statMulti.def || 1));

  // 보상 강화
  monster.expReward = Math.floor(monster.expReward * mutation.dropBonus.exp);
  monster.goldReward = Math.floor(monster.goldReward * mutation.dropBonus.gold);
  monster.mutationDrop = mutation.dropBonus.item;

  // 이름 업데이트
  monster.name = mutation.prefix + ' ' + monster.name;
  monster.color = mutation.color;

  return { mutId, mutation };
}

// ── 변이체 처치 시 기록 ──
function onMutantKill(player, mutationId) {
  const log = _ensure(player);
  if (!log.discovered[mutationId]) {
    log.discovered[mutationId] = { firstSeen: Date.now(), killCount: 0 };
  }
  log.discovered[mutationId].killCount++;
  log.totalMutantKills++;

  const mutation = MUTATIONS[mutationId];
  // 변이 아이템 드롭
  const dropItem = mutation?.dropBonus?.item;
  if (dropItem) {
    if (!player.inventory) player.inventory = {};
    player.inventory[dropItem] = (player.inventory[dropItem] || 0) + 1;
  }

  return {
    mutationId,
    mutation,
    dropItem,
    dropName: MUTATION_ITEMS[dropItem]?.name,
    newDiscovery: log.discovered[mutationId].killCount === 1,
  };
}

// ── 변이 도감 상태 ──
function getStatus(player) {
  const log = _ensure(player);

  const codex = Object.entries(MUTATIONS).map(([id, m]) => {
    const disc = log.discovered[id];
    return {
      id, name: m.name, prefix: m.prefix, color: m.color, tier: m.tier,
      desc: m.desc,
      abilityDesc: m.ability.desc,
      statMulti: m.statMulti,
      discovered: !!disc,
      killCount: disc?.killCount || 0,
      dropItem: m.dropBonus.item,
      dropName: MUTATION_ITEMS[m.dropBonus.item]?.name || '',
    };
  });

  const discoveredCount = codex.filter(c => c.discovered).length;

  return {
    codex,
    discoveredCount,
    totalMutations: Object.keys(MUTATIONS).length,
    totalMutantKills: log.totalMutantKills,
    completionPct: Math.floor((discoveredCount / Object.keys(MUTATIONS).length) * 100),
    // 도감 완성 보너스
    completeBonus: discoveredCount >= Object.keys(MUTATIONS).length
      ? { name: '변이 사냥꾼', desc: '변이체 드롭률 +50%, 변이 아이템 2배', active: true }
      : { name: '변이 사냥꾼', desc: '변이체 드롭률 +50%, 변이 아이템 2배', active: false },
  };
}

module.exports = {
  MUTATIONS, MUTATION_ITEMS, MUTATION_RATES, TIER_WEIGHTS,
  tryMutate, onMutantKill, getStatus,
};

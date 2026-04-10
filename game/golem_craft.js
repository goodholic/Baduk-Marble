// ==========================================
// 마법 인형 (Golem Craft) — v2.50
// 4부위 조립 + 코어 시스템 + AI 동반 전투 + 진화
// ==========================================

// ── 부위별 파츠 ──
const PARTS = {
  // ═══ 머리 (HEAD) — 특수 능력 결정 ═══
  head: {
    stone_head:    { name: '석재 머리', icon: '🗿', tier: 1, cost: { gold: 5000 }, bonus: { def: 10 }, ability: null, desc: '단단한 돌 머리' },
    crystal_head:  { name: '수정 머리', icon: '🔮', tier: 2, cost: { gold: 20000, mat_soul: 3 }, bonus: { mp: 30, skillDmg: 0.05 }, ability: 'manaBeam', desc: '마력 빔 발사' },
    dragon_head:   { name: '용골 머리', icon: '🐉', tier: 3, cost: { gold: 80000, mat_dragon: 10 }, bonus: { atk: 20 }, ability: 'fireBreath', desc: '화염 브레스 (범위 5)' },
    void_head:     { name: '공허 머리', icon: '🕳️', tier: 3, cost: { gold: 100000, mut_void_core: 3 }, bonus: { atk: 15, def: 15 }, ability: 'voidPulse', desc: '공허 파동 (적 SPD -30%)' },
    ancient_head:  { name: '태초의 머리', icon: '🌟', tier: 4, cost: { gold: 200000, mut_primordial_shard: 2 }, bonus: { atk: 30, def: 20, mp: 50 }, ability: 'judgmentRay', desc: '심판의 빛 (ATK 8배 광역)' },
  },

  // ═══ 몸통 (BODY) — HP/DEF 결정 ═══
  body: {
    clay_body:     { name: '점토 몸통', icon: '🏺', tier: 1, cost: { gold: 5000 }, bonus: { maxHp: 200, def: 8 }, desc: '기본 점토 몸' },
    iron_body:     { name: '강철 몸통', icon: '⚙️', tier: 2, cost: { gold: 25000, mat_dragon: 2 }, bonus: { maxHp: 500, def: 20 }, desc: '단단한 강철 갑옷' },
    mithril_body:  { name: '미스릴 몸통', icon: '💎', tier: 3, cost: { gold: 80000, mat_dragon: 8 }, bonus: { maxHp: 1000, def: 35, dmgReduce: 0.05 }, desc: '가볍고 단단한 미스릴' },
    living_body:   { name: '생체 몸통', icon: '💚', tier: 3, cost: { gold: 100000, mut_life_crystal: 5 }, bonus: { maxHp: 800, def: 25, hpRegen: 0.03 }, desc: '자가 재생하는 생체 갑옷' },
    titan_body:    { name: '타이탄 몸통', icon: '🏔️', tier: 4, cost: { gold: 250000, mut_primordial_shard: 2, mat_dragon: 10 }, bonus: { maxHp: 2000, def: 50, dmgReduce: 0.10 }, desc: '거인의 몸체' },
  },

  // ═══ 팔 (ARMS) — ATK/스킬 결정 ═══
  arms: {
    wood_arms:     { name: '목재 팔', icon: '🪵', tier: 1, cost: { gold: 5000 }, bonus: { atk: 12 }, attackType: 'melee', desc: '나무 주먹' },
    blade_arms:    { name: '칼날 팔', icon: '⚔️', tier: 2, cost: { gold: 20000, mat_dragon: 2 }, bonus: { atk: 30, crit: 5 }, attackType: 'slash', desc: '날카로운 칼날 팔' },
    cannon_arms:   { name: '마력포 팔', icon: '💥', tier: 3, cost: { gold: 80000, mut_thunder_core: 5 }, bonus: { atk: 25 }, attackType: 'ranged', attackRange: 6, desc: '원거리 마력 포격' },
    chain_arms:    { name: '사슬 팔', icon: '⛓️', tier: 3, cost: { gold: 90000, mut_rage_crystal: 3 }, bonus: { atk: 35, crit: 8 }, attackType: 'chain', chainCount: 3, desc: '3연쇄 사슬 공격' },
    colossus_arms: { name: '거신의 팔', icon: '💪', tier: 4, cost: { gold: 200000, mut_chaos_orb: 2 }, bonus: { atk: 50, crit: 10 }, attackType: 'smash', aoeRange: 4, desc: '광역 분쇄 (범위 4)' },
  },

  // ═══ 다리 (LEGS) — SPD/이동 결정 ═══
  legs: {
    stone_legs:    { name: '석재 다리', icon: '🦿', tier: 1, cost: { gold: 5000 }, bonus: { spd: 3 }, desc: '느리지만 안정적' },
    spring_legs:   { name: '스프링 다리', icon: '🦘', tier: 2, cost: { gold: 20000, mat_soul: 3 }, bonus: { spd: 6, evasion: 5 }, desc: '탄력 있는 점프 다리' },
    hover_legs:    { name: '부유 장치', icon: '🛸', tier: 3, cost: { gold: 80000, mut_void_core: 3 }, bonus: { spd: 10, evasion: 8 }, desc: '공중 부유 이동' },
    shadow_legs:   { name: '그림자 다리', icon: '🌑', tier: 3, cost: { gold: 90000, mut_shadow_crystal: 2 }, bonus: { spd: 12, evasion: 12 }, desc: '그림자 이동 (초고속)' },
    divine_legs:   { name: '신성 다리', icon: '✨', tier: 4, cost: { gold: 200000, mut_primordial_shard: 1, mat_soul: 10 }, bonus: { spd: 15, evasion: 15 }, desc: '신의 발걸음' },
  },
};

// ── 코어 (골렘의 영혼) — AI 행동 패턴 결정 ═══
const CORES = {
  guard_core:    { name: '수호의 코어', icon: '🛡️', tier: 1, cost: { gold: 10000, mat_soul: 3 }, ai: 'guard', desc: '주인 주변을 지키며 적 요격', aiDesc: '방어 우선, 주인 근처 유지' },
  assault_core:  { name: '돌격의 코어', icon: '⚔️', tier: 1, cost: { gold: 10000, mat_dragon: 3 }, ai: 'assault', desc: '가장 가까운 적에게 돌진', aiDesc: '공격 우선, 적극적 추격' },
  support_core:  { name: '지원의 코어', icon: '💚', tier: 2, cost: { gold: 30000, mat_soul: 5 }, ai: 'support', desc: '주인 힐 + 버프 우선', aiDesc: '주인 HP 50% 이하 시 힐, 버프 시전' },
  hunter_core:   { name: '사냥의 코어', icon: '🎯', tier: 2, cost: { gold: 30000, mat_dragon: 5 }, ai: 'hunter', desc: '약한 적 우선 처리', aiDesc: 'HP 낮은 적 우선 타격, 보스 회피' },
  berserker_core:{ name: '광전사 코어', icon: '😡', tier: 3, cost: { gold: 80000, mut_rage_crystal: 3, mat_soul: 5 }, ai: 'berserker', desc: '자폭 각오로 전투', aiDesc: 'HP 무시 공격, 사망 시 자폭 (ATK 5배 광역)', selfDestruct: { dmgMulti: 5.0, range: 4 } },
  ancient_core:  { name: '태초의 코어', icon: '🌟', tier: 4, cost: { gold: 200000, mut_primordial_shard: 3 }, ai: 'ancient', desc: '모든 AI 패턴 복합', aiDesc: '상황 판단 — 공격/방어/힐 자동 전환' },
};

// ── 골렘 진화 (전체 Tier 합산 기준) ──
const GOLEM_RANKS = [
  { minTier: 5,  name: '석재 골렘', rank: 1, statMulti: 1.0, color: '#888888' },
  { minTier: 8,  name: '강철 골렘', rank: 2, statMulti: 1.3, color: '#44aaff' },
  { minTier: 11, name: '미스릴 골렘', rank: 3, statMulti: 1.6, color: '#aa44ff' },
  { minTier: 15, name: '전설 골렘', rank: 4, statMulti: 2.0, color: '#ffd700' },
  { minTier: 19, name: '태초의 골렘', rank: 5, statMulti: 2.5, color: '#ff4400' },
];

function _ensure(player) {
  if (!player._golem) {
    player._golem = {
      parts: { head: null, body: null, arms: null, legs: null },
      core: null,
      assembled: false,
      active: false,
      golemHp: 0,
      golemMaxHp: 0,
      totalAssemblies: 0,
    };
  }
  return player._golem;
}

// ── 파츠 장착 ──
function equipPart(player, slot, partId) {
  const g = _ensure(player);
  if (!PARTS[slot]) return { success: false, msg: '잘못된 슬롯' };
  const part = PARTS[slot][partId];
  if (!part) return { success: false, msg: '알 수 없는 파츠' };

  // 비용 체크
  if ((player.gold || 0) < part.cost.gold) return { success: false, msg: `골드 부족 (${part.cost.gold}G)` };
  for (const [item, count] of Object.entries(part.cost)) {
    if (item === 'gold') continue;
    if (!player.inventory?.[item] || player.inventory[item] < count) {
      return { success: false, msg: `재료 부족: ${item} x${count}` };
    }
  }

  // 비용 차감
  player.gold -= part.cost.gold;
  for (const [item, count] of Object.entries(part.cost)) {
    if (item === 'gold') continue;
    player.inventory[item] -= count;
    if (player.inventory[item] <= 0) delete player.inventory[item];
  }

  g.parts[slot] = partId;
  g.assembled = false; // 파츠 변경 시 재조립 필요
  return { success: true, part, msg: `${part.icon} ${part.name} 장착! [${slot}]` };
}

// ── 코어 장착 ──
function equipCore(player, coreId) {
  const g = _ensure(player);
  const core = CORES[coreId];
  if (!core) return { success: false, msg: '알 수 없는 코어' };

  if ((player.gold || 0) < core.cost.gold) return { success: false, msg: `골드 부족 (${core.cost.gold}G)` };
  for (const [item, count] of Object.entries(core.cost)) {
    if (item === 'gold') continue;
    if (!player.inventory?.[item] || player.inventory[item] < count) {
      return { success: false, msg: `재료 부족: ${item} x${count}` };
    }
  }

  player.gold -= core.cost.gold;
  for (const [item, count] of Object.entries(core.cost)) {
    if (item === 'gold') continue;
    player.inventory[item] -= count;
    if (player.inventory[item] <= 0) delete player.inventory[item];
  }

  g.core = coreId;
  g.assembled = false;
  return { success: true, core, msg: `${core.icon} ${core.name} 장착!` };
}

// ── 조립 (모든 파츠 + 코어 필요) ──
function assemble(player) {
  const g = _ensure(player);
  for (const slot of ['head', 'body', 'arms', 'legs']) {
    if (!g.parts[slot]) return { success: false, msg: `${slot} 파츠가 없습니다` };
  }
  if (!g.core) return { success: false, msg: '코어가 없습니다' };

  g.assembled = true;
  g.totalAssemblies++;

  // 스탯 계산
  const stats = _calcGolemStats(g);
  g.golemHp = stats.maxHp;
  g.golemMaxHp = stats.maxHp;

  return { success: true, stats, rank: stats.rank, msg: `⚙️ ${stats.rankName} 조립 완료! (HP:${stats.maxHp} ATK:${stats.atk} DEF:${stats.def})` };
}

// ── 골렘 소환/해제 ──
function toggleActive(player) {
  const g = _ensure(player);
  if (!g.assembled) return { success: false, msg: '먼저 골렘을 조립하세요' };

  g.active = !g.active;
  if (g.active) {
    g.golemHp = g.golemMaxHp;
    return { success: true, active: true, msg: '⚙️ 골렘 소환!' };
  }
  return { success: true, active: false, msg: '⚙️ 골렘 귀환' };
}

// ── 골렘 스탯 계산 ──
function _calcGolemStats(g) {
  let totalTier = 0;
  const bonus = { atk: 0, def: 0, maxHp: 0, spd: 0, crit: 0, evasion: 0, mp: 0 };

  for (const [slot, partId] of Object.entries(g.parts)) {
    if (!partId) continue;
    const part = PARTS[slot][partId];
    if (!part) continue;
    totalTier += part.tier;
    for (const [stat, val] of Object.entries(part.bonus)) {
      bonus[stat] = (bonus[stat] || 0) + val;
    }
  }

  const core = CORES[g.core];
  if (core) totalTier += core.tier;

  // 랭크 결정
  let rank = GOLEM_RANKS[0];
  for (const r of GOLEM_RANKS) {
    if (totalTier >= r.minTier) rank = r;
  }

  return {
    atk: Math.floor(bonus.atk * rank.statMulti),
    def: Math.floor(bonus.def * rank.statMulti),
    maxHp: Math.floor((bonus.maxHp || 500) * rank.statMulti),
    spd: Math.floor((bonus.spd || 5) * rank.statMulti),
    crit: bonus.crit || 0,
    evasion: bonus.evasion || 0,
    totalTier,
    rank: rank.rank,
    rankName: rank.name,
    rankColor: rank.color,
    statMulti: rank.statMulti,
    ai: core?.ai || 'guard',
    aiDesc: core?.aiDesc || '',
    headAbility: PARTS.head[g.parts.head]?.ability || null,
  };
}

// ── 상태 조회 ──
function getStatus(player) {
  const g = _ensure(player);

  const partsInfo = {};
  for (const [slot, options] of Object.entries(PARTS)) {
    partsInfo[slot] = {
      equipped: g.parts[slot] ? { id: g.parts[slot], ...options[g.parts[slot]] } : null,
      available: Object.entries(options).map(([id, p]) => ({ id, ...p })),
    };
  }

  const coreInfo = {
    equipped: g.core ? { id: g.core, ...CORES[g.core] } : null,
    available: Object.entries(CORES).map(([id, c]) => ({ id, ...c })),
  };

  let golemStats = null;
  if (g.assembled) {
    golemStats = _calcGolemStats(g);
    golemStats.currentHp = g.golemHp;
  }

  return {
    parts: partsInfo,
    core: coreInfo,
    assembled: g.assembled,
    active: g.active,
    golemStats,
    totalAssemblies: g.totalAssemblies,
  };
}

// ── 골렘 전투 보너스 (플레이어에게 적용) ──
function getGolemBonuses(player) {
  const g = _ensure(player);
  if (!g.assembled || !g.active) return {};
  const stats = _calcGolemStats(g);
  // 골렘 스탯의 20%가 플레이어에게 추가
  return {
    atk: Math.floor(stats.atk * 0.2),
    def: Math.floor(stats.def * 0.2),
    maxHp: Math.floor(stats.maxHp * 0.1),
  };
}

module.exports = {
  PARTS, CORES, GOLEM_RANKS,
  equipPart, equipCore, assemble, toggleActive,
  getGolemBonuses, getStatus,
};

// ==========================================
// 환생의 기억 (Past Life Memory) — v2.46
// 환생 시 전생의 직업/스킬/업적이 기억으로 남음
// 기억 조합으로 독특한 패시브 발현
// ==========================================

// ── 전생 기억 유형 (환생 시 자동 생성) ──
const MEMORY_TYPES = {
  // 직업 기억 (전생 클래스 기반)
  class_assassin:  { name: '암살자의 기억', icon: '🗡️', desc: '그림자 속에서 움직이던 기억', stat: 'crit', value: 3, color: '#ff6b6b' },
  class_warrior:   { name: '전사의 기억', icon: '⚔️', desc: '전장에서 검을 휘두르던 기억', stat: 'atk', value: 8, color: '#ffa500' },
  class_knight:    { name: '기사의 기억', icon: '🛡️', desc: '아군을 지키며 방벽이 되던 기억', stat: 'def', value: 10, color: '#44aaff' },
  class_mage:      { name: '마법사의 기억', icon: '🔮', desc: '마법의 심연을 들여다보던 기억', stat: 'mp', value: 25, color: '#aa44ff' },
  class_cleric:    { name: '사제의 기억', icon: '✝️', desc: '신의 빛으로 치유하던 기억', stat: 'healBonus', value: 0.05, color: '#ffd700' },

  // 행적 기억 (환생 시 달성 기록 기반)
  memory_slayer:   { name: '학살의 기억', icon: '💀', desc: '수많은 적을 쓰러뜨린 기억', stat: 'atk', value: 5, req: { killCount: 1000 } },
  memory_survivor: { name: '생존의 기억', icon: '❤️', desc: '수없이 죽음의 문턱에서 돌아온 기억', stat: 'maxHp', value: 50, req: { deathCount: 50 } },
  memory_wealthy:  { name: '부의 기억', icon: '💰', desc: '산더미 같은 금화를 쌓았던 기억', stat: 'goldBonus', value: 5, req: { totalGoldEarned: 100000 } },
  memory_explorer: { name: '탐험의 기억', icon: '🗺️', desc: '세계의 끝까지 걸었던 기억', stat: 'spd', value: 2, req: { discoveredZones: 15 } },
  memory_crafter:  { name: '장인의 기억', icon: '🔨', desc: '명작을 만들어내던 기억', stat: 'enchantSuccess', value: 0.03, req: { craftCount: 30 } },
  memory_pvp:      { name: '투사의 기억', icon: '🏟️', desc: '투기장에서 승리를 거머쥐던 기억', stat: 'crit', value: 4, req: { pvpWins: 50 } },
  memory_boss:     { name: '용사의 기억', icon: '🐉', desc: '거대한 보스를 쓰러뜨린 기억', stat: 'bossDmg', value: 0.08, req: { bossKills: 20 } },
  memory_healer:   { name: '치유사의 기억', icon: '💊', desc: '동료를 살린 빛나는 기억', stat: 'healBonus', value: 0.08, req: { totalHealing: 50000 } },
};

// ── 기억 조합 (2~3개 기억 → 특별 패시브) ──
const MEMORY_COMBOS = [
  { name: '전생의 전사왕', icon: '👑⚔️', memories: ['class_warrior', 'class_knight'],
    desc: 'ATK +20, DEF +20 — 전사와 기사, 두 전생의 힘', bonus: { atk: 20, def: 20 }, tier: 'rare' },
  { name: '어둠과 빛', icon: '🗡️✝️', memories: ['class_assassin', 'class_cleric'],
    desc: 'CRIT +8%, 힐 +15% — 상반된 전생의 조화', bonus: { crit: 8, healBonus: 0.15 }, tier: 'epic' },
  { name: '마법 검사', icon: '⚔️🔮', memories: ['class_warrior', 'class_mage'],
    desc: 'ATK +15, 스킬 데미지 +12% — 검과 마법의 융합', bonus: { atk: 15, skillDmg: 0.12 }, tier: 'rare' },
  { name: '철벽 마도사', icon: '🛡️🔮', memories: ['class_knight', 'class_mage'],
    desc: 'DEF +15, MP +50, 스킬 CD -10% — 방어와 마법의 결합', bonus: { def: 15, mp: 50, cdReduce: 0.10 }, tier: 'rare' },
  { name: '전생의 대학살자', icon: '💀💀', memories: ['memory_slayer', 'class_assassin'],
    desc: 'ATK +15, CRIT +10% — 전생에서도 학살자였다', bonus: { atk: 15, crit: 10 }, tier: 'epic' },
  { name: '불멸의 탐험가', icon: '❤️🗺️', memories: ['memory_survivor', 'memory_explorer'],
    desc: 'HP +200, SPD +5 — 죽어도 다시 일어나 걸었다', bonus: { maxHp: 200, spd: 5 }, tier: 'epic' },
  { name: '황금의 장인', icon: '💰🔨', memories: ['memory_wealthy', 'memory_crafter'],
    desc: '골드 +15%, 강화 성공 +5% — 부와 기술의 결합', bonus: { goldBonus: 15, enchantSuccess: 0.05 }, tier: 'rare' },
  { name: '전생의 영웅', icon: '🐉🏟️', memories: ['memory_boss', 'memory_pvp'],
    desc: '보스 데미지 +15%, CRIT +8% — 만물의 적', bonus: { bossDmg: 0.15, crit: 8 }, tier: 'epic' },
  { name: '윤회의 현자', icon: '🔮✝️💀', memories: ['class_mage', 'class_cleric', 'memory_slayer'],
    desc: '스킬 +15%, 힐 +20%, ATK +10 — 삼생의 지혜', bonus: { skillDmg: 0.15, healBonus: 0.20, atk: 10 }, tier: 'legendary' },
  { name: '전생의 완전체', icon: '⚔️🛡️🗡️', memories: ['class_warrior', 'class_knight', 'class_assassin'],
    desc: 'ATK +25, DEF +25, CRIT +8% — 세 전사의 기억', bonus: { atk: 25, def: 25, crit: 8 }, tier: 'legendary' },
  { name: '만물의 기억', icon: '🌟🌟🌟', memories: ['memory_slayer', 'memory_explorer', 'memory_boss'],
    desc: '올스탯 +15, EXP +10% — 모든 경험의 총합', bonus: { allStats: 15, expBonus: 10 }, tier: 'legendary' },
  { name: '운명의 순환자', icon: '♻️', memories: ['memory_survivor', 'class_cleric', 'memory_healer'],
    desc: 'HP +300, 힐 +30%, 사망 시 부활 1회 — 생과 사를 넘나든 자', bonus: { maxHp: 300, healBonus: 0.30, autoRevive: true }, tier: 'legendary' },
];

// ── 기억 강화 (같은 기억 중복 시 강화) ──
const MEMORY_ENHANCE_MULTI = [1.0, 1.3, 1.6, 2.0, 2.5]; // 1~5중첩

function _ensure(player) {
  if (!player._pastLife) {
    player._pastLife = {
      memories: {},        // { memoryId: { count, firstGained } }
      activeCombos: [],    // 현재 발동 중인 조합 이름들
      totalLives: 0,       // 총 환생 횟수 (이 시스템 기준)
      memorySlots: 3,      // 장착 가능 기억 슬롯 (기본 3, 최대 6)
      equipped: [],        // 장착된 기억 ID 목록
    };
  }
  return player._pastLife;
}

// ── 환생 시 기억 생성 (prestige 이벤트에서 호출) ──
function onPrestige(player) {
  const pl = _ensure(player);
  pl.totalLives++;
  const gained = [];

  // 1) 클래스 기억 (현재 클래스 기반)
  const classMap = {
    Assassin: 'class_assassin', Warrior: 'class_warrior', Knight: 'class_knight',
    Mage: 'class_mage', Cleric: 'class_cleric',
  };
  const baseClass = player.baseClassName || player.className;
  const classMemId = classMap[baseClass];
  if (classMemId) {
    pl.memories[classMemId] = pl.memories[classMemId] || { count: 0, firstGained: Date.now() };
    pl.memories[classMemId].count++;
    gained.push({ id: classMemId, ...MEMORY_TYPES[classMemId] });
  }

  // 2) 행적 기억 (달성 조건 기반)
  for (const [memId, mem] of Object.entries(MEMORY_TYPES)) {
    if (memId.startsWith('class_')) continue;
    if (!mem.req) continue;
    let qualified = true;
    for (const [stat, threshold] of Object.entries(mem.req)) {
      const playerVal = _getPlayerStat(player, stat);
      if (playerVal < threshold) { qualified = false; break; }
    }
    if (qualified) {
      pl.memories[memId] = pl.memories[memId] || { count: 0, firstGained: Date.now() };
      pl.memories[memId].count++;
      gained.push({ id: memId, ...mem });
    }
  }

  // 슬롯 확장 (환생 3/6/9회에 +1)
  if (pl.totalLives === 3 || pl.totalLives === 6 || pl.totalLives === 9) {
    pl.memorySlots = Math.min(6, pl.memorySlots + 1);
  }

  // 자동 장착 (빈 슬롯에)
  for (const g of gained) {
    if (pl.equipped.length < pl.memorySlots && !pl.equipped.includes(g.id)) {
      pl.equipped.push(g.id);
    }
  }

  // 조합 체크
  _updateCombos(pl);

  return {
    gained,
    totalMemories: Object.keys(pl.memories).length,
    slots: pl.memorySlots,
    combos: pl.activeCombos,
  };
}

function _getPlayerStat(player, stat) {
  if (stat === 'killCount') return player.killCount || 0;
  if (stat === 'deathCount') return player.deathCount || 0;
  if (stat === 'totalGoldEarned') return player.totalGoldEarned || (player.gold || 0);
  if (stat === 'discoveredZones') return (player.discoveredZones || []).length;
  if (stat === 'craftCount') return player.craftCount || 0;
  if (stat === 'pvpWins') return player.pvpWins || 0;
  if (stat === 'bossKills') return player.bossKills || 0;
  if (stat === 'totalHealing') return player.totalHealing || 0;
  return 0;
}

// ── 기억 장착/해제 ──
function equipMemory(player, memoryId) {
  const pl = _ensure(player);
  if (!pl.memories[memoryId]) return { success: false, msg: '보유하지 않은 기억' };
  if (pl.equipped.includes(memoryId)) return { success: false, msg: '이미 장착됨' };
  if (pl.equipped.length >= pl.memorySlots) return { success: false, msg: `슬롯 부족 (${pl.memorySlots}개)` };

  pl.equipped.push(memoryId);
  _updateCombos(pl);
  const mem = MEMORY_TYPES[memoryId];
  return { success: true, msg: `${mem.icon} ${mem.name} 장착!` };
}

function unequipMemory(player, memoryId) {
  const pl = _ensure(player);
  const idx = pl.equipped.indexOf(memoryId);
  if (idx === -1) return { success: false, msg: '장착되지 않은 기억' };

  pl.equipped.splice(idx, 1);
  _updateCombos(pl);
  const mem = MEMORY_TYPES[memoryId];
  return { success: true, msg: `${mem.icon} ${mem.name} 해제` };
}

// ── 조합 업데이트 ──
function _updateCombos(pl) {
  pl.activeCombos = [];
  for (const combo of MEMORY_COMBOS) {
    if (combo.memories.every(m => pl.equipped.includes(m))) {
      pl.activeCombos.push(combo.name);
    }
  }
}

// ── 패시브 보너스 계산 ──
function getPassiveBonuses(player) {
  const pl = _ensure(player);
  const bonuses = {};

  // 장착된 기억의 개별 보너스 (중첩 강화 적용)
  for (const memId of pl.equipped) {
    const mem = MEMORY_TYPES[memId];
    if (!mem) continue;
    const count = Math.min(pl.memories[memId]?.count || 1, 5);
    const multi = MEMORY_ENHANCE_MULTI[count - 1];
    const val = typeof mem.value === 'number' ? mem.value * multi : mem.value;
    if (typeof val === 'boolean') {
      bonuses[mem.stat] = val;
    } else {
      bonuses[mem.stat] = (bonuses[mem.stat] || 0) + val;
    }
  }

  // 조합 보너스
  for (const comboName of pl.activeCombos) {
    const combo = MEMORY_COMBOS.find(c => c.name === comboName);
    if (!combo) continue;
    for (const [stat, val] of Object.entries(combo.bonus)) {
      if (typeof val === 'boolean') {
        bonuses[stat] = val;
      } else {
        bonuses[stat] = (bonuses[stat] || 0) + val;
      }
    }
  }

  return bonuses;
}

// ── 상태 조회 ──
function getStatus(player) {
  const pl = _ensure(player);

  const memories = Object.entries(pl.memories).map(([id, data]) => {
    const mem = MEMORY_TYPES[id];
    if (!mem) return null;
    const count = Math.min(data.count, 5);
    const multi = MEMORY_ENHANCE_MULTI[count - 1];
    return {
      id, name: mem.name, icon: mem.icon, desc: mem.desc, color: mem.color || '#aaa',
      stat: mem.stat, baseValue: mem.value,
      count: data.count, multi: Math.floor(multi * 100),
      equipped: pl.equipped.includes(id),
    };
  }).filter(Boolean);

  const combos = MEMORY_COMBOS.map(c => ({
    name: c.name, icon: c.icon, desc: c.desc, tier: c.tier,
    memories: c.memories.map(m => ({ id: m, name: MEMORY_TYPES[m]?.name || m, icon: MEMORY_TYPES[m]?.icon || '?' })),
    active: pl.activeCombos.includes(c.name),
    available: c.memories.every(m => pl.equipped.includes(m)),
    hasAll: c.memories.every(m => !!pl.memories[m]),
  }));

  return {
    totalLives: pl.totalLives,
    memorySlots: pl.memorySlots,
    equippedCount: pl.equipped.length,
    memories,
    activeCombos: pl.activeCombos,
    combos,
    nextSlotAt: pl.memorySlots < 6 ? [3, 6, 9].find(n => n > pl.totalLives) || null : null,
  };
}

module.exports = {
  MEMORY_TYPES, MEMORY_COMBOS, MEMORY_ENHANCE_MULTI,
  onPrestige, equipMemory, unequipMemory, getPassiveBonuses, getStatus,
};

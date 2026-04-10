// ==========================================
// 저주받은 장비 (Cursed Equipment) — v2.48
// 3배 성능 + 해제 불가 저주 + 정화 퀘스트 → 전설 진화
// ==========================================

// ── 저주받은 장비 정의 ──
const CURSED_ITEMS = {
  // ═══ 무기 ═══
  cursed_blade_shadow: {
    name: '그림자에 물든 검', icon: '🗡️🌑', slot: 'weapon',
    stats: { atk: 150, def: 0 }, grade: 'cursed',
    curse: { name: '어둠의 침식', desc: 'HP 리젠 불가, 매 30초 HP -3%', hpRegenBlock: true, dotPct: 0.03, dotInterval: 30 },
    lore: '"이 검을 쥔 자의 생명력은 서서히 잠식당한다."',
    purified: { id: 'purified_shadow_blade', name: '정화된 그림자검', atk: 180, def: 20, special: '처치 시 HP 5% 회복' },
    purifyQuest: { kills: 500, bossKills: 10, gold: 100000 },
    dropSource: ['boss', 'legendary'], dropRate: 0.008,
  },
  cursed_blade_blood: {
    name: '피에 굶주린 도끼', icon: '🪓🩸', slot: 'weapon',
    stats: { atk: 180, def: -10 }, grade: 'cursed',
    curse: { name: '피의 갈증', desc: '30초 내 적 미처치 시 자신에게 데미지', noKillDmgPct: 0.05, noKillTimer: 30 },
    lore: '"피를 마시지 못하면 주인을 공격하는 저주받은 무기."',
    purified: { id: 'purified_blood_axe', name: '정화된 핏빛 도끼', atk: 200, def: 10, special: '흡혈 +10%' },
    purifyQuest: { kills: 800, pvpWins: 20, gold: 120000 },
    dropSource: ['boss', 'legendary'], dropRate: 0.006,
  },

  // ═══ 방어구 ═══
  cursed_armor_thorns: {
    name: '가시의 저주 갑옷', icon: '🛡️🌹', slot: 'armor',
    stats: { atk: 30, def: 150 }, grade: 'cursed',
    curse: { name: '고통의 가시', desc: '받는 힐 효율 -50%', healReduce: 0.50 },
    lore: '"수호하되 치유를 거부하는, 고통으로 단련된 갑옷."',
    purified: { id: 'purified_thorn_armor', name: '장미의 성갑', atk: 40, def: 180, special: '피격 시 반사 데미지 15%' },
    purifyQuest: { kills: 300, dungeonClears: 10, gold: 80000 },
    dropSource: ['boss', 'legendary'], dropRate: 0.008,
  },
  cursed_armor_chains: {
    name: '속박의 사슬 갑옷', icon: '🛡️⛓️', slot: 'armor',
    stats: { atk: 0, def: 200 }, grade: 'cursed',
    curse: { name: '영원한 속박', desc: 'SPD -5, 회피 불가', spdPenalty: 5, noEvasion: true },
    lore: '"움직일 수 없는 벽. 그러나 그 벽은 당신 자신이 된다."',
    purified: { id: 'purified_chain_armor', name: '해방된 사슬', atk: 20, def: 220, special: 'DEF의 10%를 ATK에 추가' },
    purifyQuest: { kills: 400, bossKills: 15, gold: 100000 },
    dropSource: ['legendary', 'worldboss'], dropRate: 0.005,
  },

  // ═══ 악세서리 ═══
  cursed_ring_greed: {
    name: '탐욕의 반지', icon: '💍💰', slot: 'ring',
    stats: { atk: 40, def: 40 }, grade: 'cursed',
    curse: { name: '끝없는 탐욕', desc: '사망 시 골드 30% 손실 (기본 10%)', deathGoldLoss: 0.30 },
    lore: '"황금에 눈이 먼 자의 손가락에서 빠지지 않는 반지."',
    purified: { id: 'purified_greed_ring', name: '축복받은 황금 반지', atk: 50, def: 50, special: '골드 +30%, 사망 골드 손실 면제' },
    purifyQuest: { totalGold: 500000, kills: 200, gold: 150000 },
    dropSource: ['boss', 'legendary'], dropRate: 0.007,
  },
  cursed_necklace_soul: {
    name: '영혼 포박의 목걸이', icon: '📿👻', slot: 'necklace',
    stats: { atk: 60, def: 30 }, grade: 'cursed',
    curse: { name: '영혼 구속', desc: 'EXP 획득 -30%', expPenalty: 0.30 },
    lore: '"성장을 멈추는 대신 강력한 힘을 부여하는 저주."',
    purified: { id: 'purified_soul_necklace', name: '해방된 영혼의 목걸이', atk: 80, def: 40, special: 'EXP +20%, 스킬 데미지 +10%' },
    purifyQuest: { kills: 600, bossKills: 20, gold: 120000 },
    dropSource: ['legendary', 'worldboss'], dropRate: 0.005,
  },

  // ═══ 궁극 저주 장비 ═══
  cursed_cape_abyss: {
    name: '심연의 망토', icon: '🧥🕳️', slot: 'cape',
    stats: { atk: 80, def: 80 }, grade: 'cursed',
    curse: { name: '심연의 속삭임', desc: '매 60초 랜덤 디버프 (ATK↓ or DEF↓ or SPD↓)', randomDebuff: true, debuffInterval: 60 },
    lore: '"심연을 오래 들여다보면, 심연도 당신을 들여다본다."',
    purified: { id: 'purified_abyss_cape', name: '심연을 삼킨 망토', atk: 120, def: 100, special: '피격 데미지 10% 감소, 암속성 면역' },
    purifyQuest: { kills: 1000, bossKills: 30, dungeonClears: 20, gold: 200000 },
    dropSource: ['legendary', 'worldboss'], dropRate: 0.003,
  },
  cursed_belt_fate: {
    name: '운명 사슬 벨트', icon: '🥋💀', slot: 'belt',
    stats: { atk: 50, def: 60 }, grade: 'cursed',
    curse: { name: '운명의 굴레', desc: '전직/각성 보너스 50% 감소', advanceBonusReduce: 0.50 },
    lore: '"운명에서 벗어나려는 자를 더 단단히 묶는 사슬."',
    purified: { id: 'purified_fate_belt', name: '운명을 끊은 벨트', atk: 70, def: 80, special: '모든 보너스 +15%' },
    purifyQuest: { kills: 700, pvpWins: 30, bossKills: 25, gold: 180000 },
    dropSource: ['worldboss'], dropRate: 0.003,
  },
};

function _ensure(player) {
  if (!player._cursedEquip) {
    player._cursedEquip = {
      owned: {},          // { cursedItemId: { equipped: bool, progress: { kills, bossKills, ... }, purified: bool } }
      purifiedCount: 0,
    };
  }
  return player._cursedEquip;
}

// ── 저주 장비 드롭 ──
function tryDropCursed(player, monsterTier) {
  const ce = _ensure(player);
  for (const [id, item] of Object.entries(CURSED_ITEMS)) {
    if (ce.owned[id]) continue;
    if (!item.dropSource.includes(monsterTier)) continue;
    if (Math.random() < item.dropRate) {
      ce.owned[id] = { equipped: false, progress: {}, purified: false };
      return { dropped: true, itemId: id, item };
    }
  }
  return { dropped: false };
}

// ── 저주 장비 장착 (한번 장착하면 해제 불가!) ──
function equipCursed(player, cursedItemId) {
  const ce = _ensure(player);
  const item = CURSED_ITEMS[cursedItemId];
  if (!item) return { success: false, msg: '알 수 없는 장비' };
  const owned = ce.owned[cursedItemId];
  if (!owned) return { success: false, msg: '보유하지 않음' };
  if (owned.equipped) return { success: false, msg: '이미 장착됨 (해제 불가!)' };
  if (owned.purified) return { success: false, msg: '이미 정화됨' };

  // 같은 슬롯에 다른 저주 장비가 있는지 체크
  for (const [otherId, otherOwned] of Object.entries(ce.owned)) {
    if (otherId === cursedItemId) continue;
    if (otherOwned.equipped && CURSED_ITEMS[otherId]?.slot === item.slot) {
      return { success: false, msg: `${item.slot} 슬롯에 이미 저주 장비가 있습니다` };
    }
  }

  owned.equipped = true;
  return {
    success: true, item,
    msg: `⚠️ ${item.icon} ${item.name} 장착! — 저주: ${item.curse.name} (해제 불가!)`,
  };
}

// ── 정화 진행도 업데이트 ──
function updateProgress(player, type, amount) {
  const ce = _ensure(player);
  const updated = [];
  for (const [id, owned] of Object.entries(ce.owned)) {
    if (!owned.equipped || owned.purified) continue;
    if (!owned.progress) owned.progress = {};
    owned.progress[type] = (owned.progress[type] || 0) + (amount || 1);
    updated.push(id);
  }
  return updated;
}

// ── 정화 시도 ──
function purify(player, cursedItemId) {
  const ce = _ensure(player);
  const item = CURSED_ITEMS[cursedItemId];
  if (!item) return { success: false, msg: '알 수 없는 장비' };
  const owned = ce.owned[cursedItemId];
  if (!owned || !owned.equipped) return { success: false, msg: '장착된 저주 장비가 아님' };
  if (owned.purified) return { success: false, msg: '이미 정화됨' };

  // 퀘스트 조건 확인
  const quest = item.purifyQuest;
  const prog = owned.progress || {};
  const missing = [];

  if (quest.kills && (prog.kills || 0) < quest.kills) missing.push(`처치 ${prog.kills || 0}/${quest.kills}`);
  if (quest.bossKills && (prog.bossKills || 0) < quest.bossKills) missing.push(`보스 ${prog.bossKills || 0}/${quest.bossKills}`);
  if (quest.pvpWins && (prog.pvpWins || 0) < quest.pvpWins) missing.push(`PvP승 ${prog.pvpWins || 0}/${quest.pvpWins}`);
  if (quest.dungeonClears && (prog.dungeonClears || 0) < quest.dungeonClears) missing.push(`던전 ${prog.dungeonClears || 0}/${quest.dungeonClears}`);
  if (quest.totalGold && (player.gold || 0) < quest.totalGold) missing.push(`보유골드 ${player.gold || 0}/${quest.totalGold}`);
  if (quest.gold && (player.gold || 0) < quest.gold) missing.push(`정화비용 ${quest.gold}G`);

  if (missing.length > 0) {
    return { success: false, msg: `정화 조건 미충족: ${missing.join(', ')}` };
  }

  // 골드 소모
  if (quest.gold) player.gold -= quest.gold;

  owned.purified = true;
  owned.equipped = false; // 저주 해제
  ce.purifiedCount++;

  // 정화된 장비를 인벤에 추가
  const purified = item.purified;
  if (!player.inventory) player.inventory = {};
  player.inventory[purified.id] = (player.inventory[purified.id] || 0) + 1;

  return {
    success: true, item, purified,
    msg: `✨ ${item.name} → ${purified.name} 정화 완료! — ${purified.special}`,
  };
}

// ── 저주 효과 가져오기 (recalcStats에서 사용) ──
function getActiveCurses(player) {
  const ce = _ensure(player);
  const curses = [];
  const statBonus = { atk: 0, def: 0 };

  for (const [id, owned] of Object.entries(ce.owned)) {
    if (!owned.equipped || owned.purified) continue;
    const item = CURSED_ITEMS[id];
    if (!item) continue;
    statBonus.atk += item.stats.atk || 0;
    statBonus.def += item.stats.def || 0;
    curses.push({ id, curse: item.curse, slot: item.slot });
  }

  return { curses, statBonus };
}

// ── 상태 조회 ──
function getStatus(player) {
  const ce = _ensure(player);

  const items = Object.entries(ce.owned).map(([id, owned]) => {
    const item = CURSED_ITEMS[id];
    if (!item) return null;
    const quest = item.purifyQuest;
    const prog = owned.progress || {};

    // 정화 진행도
    const conditions = [];
    if (quest.kills) conditions.push({ name: '처치', current: prog.kills || 0, goal: quest.kills });
    if (quest.bossKills) conditions.push({ name: '보스', current: prog.bossKills || 0, goal: quest.bossKills });
    if (quest.pvpWins) conditions.push({ name: 'PvP승', current: prog.pvpWins || 0, goal: quest.pvpWins });
    if (quest.dungeonClears) conditions.push({ name: '던전', current: prog.dungeonClears || 0, goal: quest.dungeonClears });
    if (quest.gold) conditions.push({ name: '골드', current: Math.min(player.gold || 0, quest.gold), goal: quest.gold });

    const allMet = conditions.every(c => c.current >= c.goal);

    return {
      id, name: item.name, icon: item.icon, slot: item.slot, lore: item.lore,
      stats: item.stats,
      curse: item.curse,
      equipped: owned.equipped,
      purified: owned.purified,
      purifiedName: item.purified.name,
      purifiedSpecial: item.purified.special,
      conditions, allMet,
    };
  }).filter(Boolean);

  // 미발견 저주 장비
  const undiscovered = Object.keys(CURSED_ITEMS).filter(id => !ce.owned[id]).length;

  return {
    items,
    purifiedCount: ce.purifiedCount,
    totalCursed: Object.keys(CURSED_ITEMS).length,
    undiscovered,
  };
}

module.exports = {
  CURSED_ITEMS,
  tryDropCursed, equipCursed, updateProgress, purify, getActiveCurses, getStatus,
};

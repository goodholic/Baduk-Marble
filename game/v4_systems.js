// ==========================================
// v4.0 시스템 — 혈통 / 연합 스킬 / 영지 자원 / 공성 시즌 / 무역 제국 / 전생
// 거상 스타일 확장: 용병을 더 깊이 키우고, 영지를 경영하고, 무역 제국을 세운다
// ==========================================

// ═══════════════════════════════════════════
//  1. 용병 혈통 시스템 (Mercenary Bloodline)
// ═══════════════════════════════════════════

const BLOODLINES = {
  DRAGON:  { name: '용의 혈통',   icon: '🐲', statBonus: { atk: 0.12, hp: 0.08 },  awakenBonus3: { atk: 0.10, critRate: 5 },  awakenBonus5: { atk: 0.20, critRate: 10, skill_dmg: 0.15 } },
  ANGEL:   { name: '천사의 혈통', icon: '👼', statBonus: { def: 0.10, hp: 0.12 },  awakenBonus3: { def: 0.10, healBonus: 0.15 }, awakenBonus5: { def: 0.20, healBonus: 0.30, reviveChance: 0.10 } },
  DEMON:   { name: '악마의 혈통', icon: '😈', statBonus: { atk: 0.15, spd: 0.05 }, awakenBonus3: { atk: 0.12, lifesteal: 0.08 }, awakenBonus5: { atk: 0.25, lifesteal: 0.15, piercing: 0.10 } },
  SPIRIT:  { name: '정령의 혈통', icon: '🌿', statBonus: { spd: 0.10, hp: 0.10 },  awakenBonus3: { spd: 0.08, evasion: 5 },  awakenBonus5: { spd: 0.15, evasion: 12, manaRegen: 0.20 } },
  ANCIENT: { name: '고대의 혈통', icon: '🏛️', statBonus: { atk: 0.08, def: 0.08, hp: 0.08 }, awakenBonus3: { atk: 0.06, def: 0.06, hp: 0.06 }, awakenBonus5: { atk: 0.12, def: 0.12, hp: 0.12, allSkillCd: -0.10 } },
};

const BLOODLINE_KEYS = Object.keys(BLOODLINES);

// 혈통 비용
const BLOODLINE_AWAKEN_COST = {
  3: { gold: 50000, material: 30, dragon_tear: 1 },
  5: { gold: 200000, material: 100, dragon_tear: 5 },
};

const BLOODLINE_FUSE_COST = { gold: 100000, material: 50, dragon_tear: 3 };

function getBloodline(merc) {
  if (!merc) return null;
  return merc._bloodline || null;
}

function _initBloodline(merc) {
  if (!merc._bloodline) {
    // 최초 할당: 등급 2(희귀) 이상이면 랜덤 혈통 부여
    if ((merc.grade || 0) >= 2) {
      merc._bloodline = {
        type: BLOODLINE_KEYS[Math.floor(Math.random() * BLOODLINE_KEYS.length)],
        awakened: 0,  // 0 = 미각성, 3 = 1차, 5 = 2차
      };
    }
  }
  return merc._bloodline;
}

function awakenBloodline(player, mercUid) {
  const mercs = player._mercs;
  if (!mercs) return { success: false, msg: '용병 시스템을 먼저 활성화하세요.' };

  const merc = mercs.roster.find(m => m.uid === mercUid);
  if (!merc) return { success: false, msg: '해당 용병을 찾을 수 없습니다.' };

  const bl = _initBloodline(merc);
  if (!bl) return { success: false, msg: '이 용병은 혈통을 보유하고 있지 않습니다. (희귀 등급 이상 필요)' };

  if (bl.awakened >= 5) return { success: false, msg: '이미 최종 각성 상태입니다.' };

  const targetStar = bl.awakened < 3 ? 3 : 5;
  if ((merc.star || 0) < targetStar) {
    return { success: false, msg: `혈통 각성에는 ★${targetStar} 이상이 필요합니다. (현재 ★${merc.star || 0})` };
  }

  const cost = BLOODLINE_AWAKEN_COST[targetStar];
  if ((player.gold || 0) < cost.gold) return { success: false, msg: `골드가 부족합니다. (필요: ${cost.gold})` };
  if ((player.material || 0) < cost.material) return { success: false, msg: `재료가 부족합니다. (필요: ${cost.material})` };
  const resources = player._territory_resources || {};
  if ((resources.dragon_tear || 0) < cost.dragon_tear) return { success: false, msg: `용의 눈물이 부족합니다. (필요: ${cost.dragon_tear})` };

  player.gold -= cost.gold;
  player.material -= cost.material;
  resources.dragon_tear = (resources.dragon_tear || 0) - cost.dragon_tear;
  bl.awakened = targetStar;

  const info = BLOODLINES[bl.type];
  return {
    success: true,
    msg: `${info.icon} ${merc.name}의 ${info.name} ${targetStar === 3 ? '1차' : '최종'} 각성 완료!`,
    bloodline: bl,
  };
}

function fuseBloodline(player, mercUid, targetBloodline) {
  if (!BLOODLINES[targetBloodline]) return { success: false, msg: '존재하지 않는 혈통입니다.' };

  const mercs = player._mercs;
  if (!mercs) return { success: false, msg: '용병 시스템을 먼저 활성화하세요.' };

  const merc = mercs.roster.find(m => m.uid === mercUid);
  if (!merc) return { success: false, msg: '해당 용병을 찾을 수 없습니다.' };

  const bl = _initBloodline(merc);
  if (!bl) return { success: false, msg: '이 용병은 혈통을 보유하고 있지 않습니다.' };
  if (bl.type === targetBloodline) return { success: false, msg: '이미 같은 혈통입니다.' };

  const cost = BLOODLINE_FUSE_COST;
  if ((player.gold || 0) < cost.gold) return { success: false, msg: `골드가 부족합니다. (필요: ${cost.gold})` };
  if ((player.material || 0) < cost.material) return { success: false, msg: `재료가 부족합니다. (필요: ${cost.material})` };
  const resources = player._territory_resources || {};
  if ((resources.dragon_tear || 0) < cost.dragon_tear) return { success: false, msg: `용의 눈물이 부족합니다. (필요: ${cost.dragon_tear})` };

  player.gold -= cost.gold;
  player.material -= cost.material;
  resources.dragon_tear = (resources.dragon_tear || 0) - cost.dragon_tear;

  bl.type = targetBloodline;
  bl.awakened = 0; // 혈통 변경 시 각성 리셋

  const info = BLOODLINES[targetBloodline];
  return {
    success: true,
    msg: `${info.icon} ${merc.name}의 혈통이 ${info.name}(으)로 변환되었습니다! (각성 초기화)`,
    bloodline: bl,
  };
}

// ═══════════════════════════════════════════
//  2. 연합 스킬 (Combination Skills)
// ═══════════════════════════════════════════

const COMBO_SKILLS = {
  holy_judgment: {
    name: '성스러운 심판', icon: '✝️⚡', pair: ['merc_paladin', 'merc_priest'],
    dmg: 6.0, healAll: 60, cd: 30,
    desc: '성기사+사제: 적 전체 6배 피해 + 아군 전체 60 회복',
  },
  shadow_blade: {
    name: '그림자 칼날', icon: '🌑🗡️', pair: ['merc_assassin', 'merc_shadow_lord'],
    dmg: 8.0, critGuarantee: true, cd: 25,
    desc: '암살자+그림자 군주: 확정 크리 8배 단일 피해',
  },
  dragon_storm: {
    name: '드래곤 폭풍', icon: '🐲🌪️', pair: ['merc_dragon_knight', 'merc_archmage'],
    dmg: 7.0, aoe: true, burn: 5, cd: 28,
    desc: '드래곤나이트+대마법사: 광역 7배 + 화상 5초',
  },
  iron_bastion: {
    name: '철벽 방진', icon: '🛡️⚔️', pair: ['merc_knight', 'merc_spearman'],
    defBuff: 0.50, duration: 15, cd: 35,
    desc: '기사+창병: 아군 전체 방어력 50% 증가 15초',
  },
  death_embrace: {
    name: '죽음의 포옹', icon: '💀☠️', pair: ['merc_death_knight', 'merc_warlock'],
    dmg: 9.0, lifesteal: 0.30, aoe: true, cd: 35,
    desc: '죽음의 기사+흑마법사: 광역 9배 + 흡혈 30%',
  },
  wild_hunt: {
    name: '야생의 사냥', icon: '🐴🌿', pair: ['merc_cavalry', 'merc_ranger'],
    dmg: 5.0, hits: 3, cd: 22,
    desc: '기마병+레인저: 랜덤 3회 각 5배 피해',
  },
};

const TRINITY_SKILLS = {
  apocalypse: {
    name: '종말의 심판', icon: '🔥💀⚡', trio: ['merc_bahamut', 'merc_death_knight', 'merc_archmage'],
    dmg: 15.0, aoe: true, cd: 60,
    desc: '바하무트+죽음의 기사+대마법사: 전체 15배 종말 피해',
  },
  celestial_grace: {
    name: '천상의 은총', icon: '👼✝️🌟', trio: ['merc_seraph', 'merc_paladin', 'merc_priest'],
    healAll: 200, reviveAll: true, cd: 90,
    desc: '세라핌+성기사+사제: 아군 전체 200 회복 + 전원 부활',
  },
  void_annihilation: {
    name: '공허 소멸', icon: '🌑😈🕳️', trio: ['merc_shadow_lord', 'merc_warlock', 'merc_assassin'],
    dmg: 12.0, execute: 0.20, cd: 50,
    desc: '그림자 군주+흑마법사+암살자: 전체 12배 + HP 20% 이하 즉사',
  },
};

const PARTY_ULTIMATE = {
  ragnarok: {
    name: '라그나로크', icon: '🌋⚡🔥💀🌊🌑',
    requiredSize: 6, // 6인 풀파티
    dmg: 25.0, aoe: true, healAll: 300, buffAll: { atk: 0.50, def: 0.50, spd: 0.30 }, duration: 20, cd: 120,
    desc: '6인 전원 궁극기: 전체 25배 + 전원 300 회복 + 전 능력치 대폭 강화 20초',
  },
};

function checkComboSkills(party) {
  if (!party || !Array.isArray(party)) return [];
  const partyIds = party.map(m => m.id || m.mercId);
  const available = [];

  // 2인 콤보
  for (const [comboId, combo] of Object.entries(COMBO_SKILLS)) {
    if (combo.pair.every(id => partyIds.includes(id))) {
      available.push({ type: 'combo', id: comboId, ...combo });
    }
  }

  // 3인 콤보
  for (const [comboId, combo] of Object.entries(TRINITY_SKILLS)) {
    if (combo.trio.every(id => partyIds.includes(id))) {
      available.push({ type: 'trinity', id: comboId, ...combo });
    }
  }

  // 궁극기
  if (party.length >= PARTY_ULTIMATE.ragnarok.requiredSize) {
    available.push({ type: 'ultimate', id: 'ragnarok', ...PARTY_ULTIMATE.ragnarok });
  }

  return available;
}

function executeCombo(player, comboId) {
  if (!player._combo_cd) player._combo_cd = {};
  const now = Date.now();

  // 콤보 검색
  let combo = COMBO_SKILLS[comboId] || TRINITY_SKILLS[comboId] || (comboId === 'ragnarok' ? PARTY_ULTIMATE.ragnarok : null);
  if (!combo) return { success: false, msg: '존재하지 않는 연합 스킬입니다.' };

  // 쿨다운 확인
  const lastUsed = player._combo_cd[comboId] || 0;
  const cdMs = (combo.cd || 30) * 1000;
  if (now - lastUsed < cdMs) {
    const remaining = Math.ceil((cdMs - (now - lastUsed)) / 1000);
    return { success: false, msg: `연합 스킬 재사용 대기 중입니다. (${remaining}초)` };
  }

  // 파티 검증
  const mercs = player._mercs;
  if (!mercs) return { success: false, msg: '용병 시스템을 먼저 활성화하세요.' };

  const partyMercs = mercs.roster.filter(m => mercs.party.includes(m.uid));
  const partyIds = partyMercs.map(m => m.id || m.mercId);

  const required = combo.pair || combo.trio || [];
  if (required.length > 0 && !required.every(id => partyIds.includes(id))) {
    return { success: false, msg: '필요한 용병이 파티에 편성되어 있지 않습니다.' };
  }
  if (comboId === 'ragnarok' && partyMercs.length < 6) {
    return { success: false, msg: '라그나로크는 6인 풀파티가 필요합니다.' };
  }

  player._combo_cd[comboId] = now;

  return {
    success: true,
    msg: `${combo.icon} 연합 스킬 [${combo.name}] 발동!`,
    effect: {
      dmg: combo.dmg || 0,
      aoe: combo.aoe || false,
      healAll: combo.healAll || 0,
      buffAll: combo.buffAll || null,
      duration: combo.duration || 0,
    },
  };
}

// ═══════════════════════════════════════════
//  3. 영지 자원 시스템 (Territory Resources)
// ═══════════════════════════════════════════

const TERRITORY_RESOURCES = {
  gold:       { name: '골드',       icon: '💰', baseRate: 100 },
  wood:       { name: '목재',       icon: '🪵', baseRate: 60 },
  iron:       { name: '철광석',     icon: '⛏️', baseRate: 40 },
  mana_stone: { name: '마나석',     icon: '💎', baseRate: 20 },
  food:       { name: '식량',       icon: '🌾', baseRate: 80 },
  dragon_tear:{ name: '용의 눈물',  icon: '🐲💧', baseRate: 2 },
};

const PRODUCTION_BUILDINGS = {
  gold_mine:     { name: '금광',       icon: '💰⛏️', resource: 'gold',       baseProd: 100,  upgradeCost: [2000, 5000, 12000, 30000, 80000],  prodPerLevel: [100, 220, 380, 600, 1000], maxWorkers: [1, 2, 3, 4, 5] },
  lumber_mill:   { name: '제재소',     icon: '🪵🏭', resource: 'wood',       baseProd: 60,   upgradeCost: [1500, 4000, 10000, 25000, 65000],  prodPerLevel: [60, 130, 230, 380, 600],   maxWorkers: [1, 2, 2, 3, 4] },
  iron_forge:    { name: '제련소',     icon: '⛏️🔥', resource: 'iron',       baseProd: 40,   upgradeCost: [2500, 6000, 15000, 40000, 100000], prodPerLevel: [40, 90, 160, 280, 450],    maxWorkers: [1, 1, 2, 3, 3] },
  mana_well:     { name: '마나 우물',  icon: '💎🕳️', resource: 'mana_stone', baseProd: 20,   upgradeCost: [5000, 12000, 30000, 75000, 200000],prodPerLevel: [20, 45, 80, 140, 250],     maxWorkers: [1, 1, 2, 2, 3] },
  farmland:      { name: '농경지',     icon: '🌾🏡', resource: 'food',       baseProd: 80,   upgradeCost: [1000, 3000, 8000, 20000, 50000],   prodPerLevel: [80, 170, 300, 500, 800],   maxWorkers: [2, 3, 4, 5, 6] },
  dragon_shrine: { name: '용의 제단',  icon: '🐲🏛️', resource: 'dragon_tear',baseProd: 2,    upgradeCost: [20000, 50000, 120000, 300000, 800000], prodPerLevel: [2, 5, 10, 18, 30],    maxWorkers: [1, 1, 1, 2, 2] },
};

const WORKER_BONUS_PER_MERC = 0.15; // 용병 1명 배치 시 생산량 15% 증가
const COLLECT_INTERVAL_MS = 5 * 60 * 1000; // 5분마다 수집 가능

function _initTerritory(player) {
  if (!player._territory) {
    player._territory = {
      buildings: {},
      workers: {},        // { buildingId: [mercUid, ...] }
      lastCollect: 0,
    };
    // 기본 건물 초기화 (모두 레벨 1)
    for (const bId of Object.keys(PRODUCTION_BUILDINGS)) {
      player._territory.buildings[bId] = { level: 1 };
    }
  }
  if (!player._territory_resources) {
    player._territory_resources = {};
    for (const rId of Object.keys(TERRITORY_RESOURCES)) {
      player._territory_resources[rId] = 0;
    }
  }
  return player._territory;
}

function assignWorker(player, mercUid, buildingId) {
  const terr = _initTerritory(player);
  const bConfig = PRODUCTION_BUILDINGS[buildingId];
  if (!bConfig) return { success: false, msg: '존재하지 않는 건물입니다.' };

  const mercs = player._mercs;
  if (!mercs) return { success: false, msg: '용병 시스템을 먼저 활성화하세요.' };

  const merc = mercs.roster.find(m => m.uid === mercUid);
  if (!merc) return { success: false, msg: '해당 용병을 찾을 수 없습니다.' };

  // 이미 다른 건물에 배치된 용병인지 확인
  for (const [bId, workers] of Object.entries(terr.workers)) {
    if (workers.includes(mercUid)) {
      return { success: false, msg: `이 용병은 이미 ${PRODUCTION_BUILDINGS[bId]?.name || bId}에 배치되어 있습니다.` };
    }
  }

  // 파티에 편성된 용병은 건물에 배치 불가
  if (mercs.party.includes(mercUid)) {
    return { success: false, msg: '파티에 편성된 용병은 건물에 배치할 수 없습니다. 파티에서 먼저 제외하세요.' };
  }

  if (!terr.workers[buildingId]) terr.workers[buildingId] = [];

  const bLevel = (terr.buildings[buildingId]?.level || 1) - 1;
  const maxW = bConfig.maxWorkers[bLevel] || 1;
  if (terr.workers[buildingId].length >= maxW) {
    return { success: false, msg: `${bConfig.name}의 최대 배치 인원(${maxW}명)을 초과합니다.` };
  }

  terr.workers[buildingId].push(mercUid);
  return {
    success: true,
    msg: `${merc.name}이(가) ${bConfig.name}에 배치되었습니다. (${terr.workers[buildingId].length}/${maxW})`,
  };
}

function removeWorker(player, mercUid, buildingId) {
  const terr = _initTerritory(player);
  if (!terr.workers[buildingId]) return { success: false, msg: '해당 건물에 배치된 용병이 없습니다.' };

  const idx = terr.workers[buildingId].indexOf(mercUid);
  if (idx === -1) return { success: false, msg: '이 용병은 해당 건물에 배치되어 있지 않습니다.' };

  terr.workers[buildingId].splice(idx, 1);
  return { success: true, msg: '용병이 건물에서 철수했습니다.' };
}

function collectResources(player) {
  const terr = _initTerritory(player);
  const now = Date.now();

  if (now - terr.lastCollect < COLLECT_INTERVAL_MS) {
    const remaining = Math.ceil((COLLECT_INTERVAL_MS - (now - terr.lastCollect)) / 1000);
    return { success: false, msg: `자원 수집 대기 중입니다. (${remaining}초 후 가능)` };
  }

  const collected = {};
  for (const [bId, bConfig] of Object.entries(PRODUCTION_BUILDINGS)) {
    const bLevel = (terr.buildings[bId]?.level || 1) - 1;
    let prod = bConfig.prodPerLevel[bLevel] || bConfig.baseProd;

    // 배치된 용병 보너스
    const workers = terr.workers[bId] || [];
    const workerBonus = 1 + workers.length * WORKER_BONUS_PER_MERC;
    prod = Math.floor(prod * workerBonus);

    const resId = bConfig.resource;
    if (!player._territory_resources) player._territory_resources = {};
    player._territory_resources[resId] = (player._territory_resources[resId] || 0) + prod;
    collected[resId] = prod;
  }

  // 골드는 플레이어 메인 골드에도 추가
  if (collected.gold) {
    player.gold = (player.gold || 0) + collected.gold;
  }

  terr.lastCollect = now;
  return {
    success: true,
    msg: '자원을 수집했습니다!',
    collected,
    total: { ...player._territory_resources },
  };
}

function upgradeBuilding(player, buildingId) {
  const terr = _initTerritory(player);
  const bConfig = PRODUCTION_BUILDINGS[buildingId];
  if (!bConfig) return { success: false, msg: '존재하지 않는 건물입니다.' };

  const currentLevel = terr.buildings[buildingId]?.level || 1;
  if (currentLevel >= 5) return { success: false, msg: `${bConfig.name}은(는) 이미 최대 레벨(5)입니다.` };

  const cost = bConfig.upgradeCost[currentLevel - 1]; // 현재 레벨에서 다음 레벨로 비용
  if ((player.gold || 0) < cost) {
    return { success: false, msg: `골드가 부족합니다. (필요: ${cost}, 보유: ${player.gold || 0})` };
  }

  player.gold -= cost;
  terr.buildings[buildingId].level = currentLevel + 1;

  const nextProd = bConfig.prodPerLevel[currentLevel] || 0;
  return {
    success: true,
    msg: `${bConfig.icon} ${bConfig.name} Lv.${currentLevel + 1} 업그레이드 완료! (생산량: ${nextProd}/회)`,
    building: { id: buildingId, level: currentLevel + 1, production: nextProd },
  };
}

function getTerritoryStatus(player) {
  const terr = _initTerritory(player);
  const buildings = {};
  for (const [bId, bConfig] of Object.entries(PRODUCTION_BUILDINGS)) {
    const lv = terr.buildings[bId]?.level || 1;
    const workers = terr.workers[bId] || [];
    const maxW = bConfig.maxWorkers[lv - 1] || 1;
    buildings[bId] = {
      name: bConfig.name, icon: bConfig.icon, level: lv,
      production: bConfig.prodPerLevel[lv - 1] || bConfig.baseProd,
      workers: workers.length, maxWorkers: maxW,
      resource: bConfig.resource,
    };
  }
  return {
    buildings,
    resources: { ...player._territory_resources },
    nextCollect: Math.max(0, COLLECT_INTERVAL_MS - (Date.now() - (terr.lastCollect || 0))),
  };
}

// ═══════════════════════════════════════════
//  4. 공성전 시즌 시스템 (Siege Season)
// ═══════════════════════════════════════════

const SIEGE_LEAGUES = {
  BRONZE:  { name: '브론즈', icon: '🥉', minScore: 0,    rewardGold: 5000,   rewardMaterial: 10, rewardDragonTear: 0 },
  SILVER:  { name: '실버',   icon: '🥈', minScore: 500,  rewardGold: 15000,  rewardMaterial: 30, rewardDragonTear: 1 },
  GOLD:    { name: '골드',   icon: '🥇', minScore: 1500, rewardGold: 40000,  rewardMaterial: 80, rewardDragonTear: 3 },
  DIAMOND: { name: '다이아', icon: '💎', minScore: 4000, rewardGold: 100000, rewardMaterial: 200, rewardDragonTear: 10 },
};

const SIEGE_LEAGUE_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'];

// 글로벌 시즌 상태 (서버 단위)
let _siegeSeason = {
  week: 1,
  startedAt: Date.now(),
  throneOwner: null,      // 왕좌 소유 플레이어 ID
  throneWarActive: false,
};

function _initSiegeProfile(player) {
  if (!player._siege) {
    player._siege = {
      score: 0,
      wins: 0,
      losses: 0,
      weeklyRewardClaimed: false,
      lastSeasonWeek: 0,
    };
  }
  return player._siege;
}

function getSiegeRank(player) {
  const s = _initSiegeProfile(player);
  let league = 'BRONZE';
  for (const key of SIEGE_LEAGUE_ORDER) {
    if (s.score >= SIEGE_LEAGUES[key].minScore) league = key;
  }
  const info = SIEGE_LEAGUES[league];
  return {
    league, name: info.name, icon: info.icon,
    score: s.score, wins: s.wins, losses: s.losses,
    nextLeague: SIEGE_LEAGUE_ORDER[SIEGE_LEAGUE_ORDER.indexOf(league) + 1] || null,
    nextLeagueScore: SIEGE_LEAGUES[SIEGE_LEAGUE_ORDER[SIEGE_LEAGUE_ORDER.indexOf(league) + 1]]?.minScore || null,
  };
}

function addSiegeScore(player, delta, isWin) {
  const s = _initSiegeProfile(player);
  s.score = Math.max(0, s.score + delta);
  if (isWin) s.wins++;
  else s.losses++;
  return getSiegeRank(player);
}

function claimSiegeReward(player) {
  const s = _initSiegeProfile(player);
  if (s.weeklyRewardClaimed) return { success: false, msg: '이번 주 보상을 이미 수령했습니다.' };

  const rank = getSiegeRank(player);
  const reward = SIEGE_LEAGUES[rank.league];

  player.gold = (player.gold || 0) + reward.rewardGold;
  player.material = (player.material || 0) + reward.rewardMaterial;
  if (reward.rewardDragonTear > 0) {
    _initTerritory(player);
    player._territory_resources.dragon_tear = (player._territory_resources.dragon_tear || 0) + reward.rewardDragonTear;
  }

  s.weeklyRewardClaimed = true;
  s.lastSeasonWeek = _siegeSeason.week;

  return {
    success: true,
    msg: `${rank.icon} ${rank.name} 리그 주간 보상 수령! 골드 +${reward.rewardGold}, 재료 +${reward.rewardMaterial}${reward.rewardDragonTear > 0 ? `, 용의 눈물 +${reward.rewardDragonTear}` : ''}`,
    reward: { gold: reward.rewardGold, material: reward.rewardMaterial, dragonTear: reward.rewardDragonTear },
  };
}

function startThroneWar() {
  if (_siegeSeason.throneWarActive) return { success: false, msg: '왕좌 쟁탈전이 이미 진행 중입니다.' };
  _siegeSeason.throneWarActive = true;
  return { success: true, msg: '👑 왕좌 쟁탈전이 시작되었습니다! 최고 점수 획득자가 왕좌를 차지합니다.' };
}

function endThroneWar(winnerId) {
  _siegeSeason.throneWarActive = false;
  _siegeSeason.throneOwner = winnerId;
  return { success: true, msg: `👑 왕좌 쟁탈전 종료! 새로운 왕: ${winnerId}` };
}

function advanceSiegeWeek(players) {
  _siegeSeason.week++;
  // 주간 보상 수령 상태 리셋
  for (const pid of Object.keys(players)) {
    if (players[pid]._siege) {
      players[pid]._siege.weeklyRewardClaimed = false;
    }
  }
  return { week: _siegeSeason.week };
}

function getSiegeSeasonInfo() {
  return { ..._siegeSeason };
}

// ═══════════════════════════════════════════
//  5. 무역 제국 (Trade Empire)
// ═══════════════════════════════════════════

const TRADE_GOODS = {
  silk:       { name: '명주',       icon: '🧵', basePrice: 100 },
  spice:      { name: '향신료',     icon: '🌶️', basePrice: 150 },
  gemstone:   { name: '보석',       icon: '💎', basePrice: 300 },
  potion:     { name: '영약',       icon: '🧪', basePrice: 200 },
  rune_scroll:{ name: '룬 두루마리',icon: '📜', basePrice: 250 },
  dragon_scale:{ name: '용린',      icon: '🐲', basePrice: 500 },
  starlight:  { name: '별빛 정수',  icon: '✨', basePrice: 400 },
  mithril:    { name: '미스릴',     icon: '⚙️', basePrice: 350 },
};

const FLEET_BASE_COST = 10000;
const FLEET_COST_MULT = 1.5;  // 함대 추가 시마다 비용 1.5배
const MAX_FLEET_SIZE = 10;
const MONOPOLY_COST = 50000;
const MONOPOLY_PRICE_BOOST = 0.40; // 독점 시 판매가 40% 증가

function _initTradeEmpire(player) {
  if (!player._tradeEmpire) {
    player._tradeEmpire = {
      companyName: null,
      fleet: [],               // [{ id, name, capacity, status }]
      monopolies: [],          // [goodsId, ...]
      totalProfit: 0,
      tradeCount: 0,
    };
  }
  return player._tradeEmpire;
}

function createTradeCompany(player, name) {
  const te = _initTradeEmpire(player);
  if (te.companyName) return { success: false, msg: `이미 무역 회사 [${te.companyName}]를 운영하고 있습니다.` };

  if (!name || name.length < 2 || name.length > 20) {
    return { success: false, msg: '회사 이름은 2~20자 사이여야 합니다.' };
  }

  const createCost = 20000;
  if ((player.gold || 0) < createCost) return { success: false, msg: `골드가 부족합니다. (필요: ${createCost})` };

  player.gold -= createCost;
  te.companyName = name;
  // 첫 캐러밴 무료 지급
  te.fleet.push({ id: 'fleet_1', name: '초보 캐러밴', capacity: 50, status: 'idle' });

  return {
    success: true,
    msg: `🏢 무역 회사 [${name}] 설립 완료! 초보 캐러밴 1대가 지급되었습니다.`,
    company: { name: te.companyName, fleetSize: te.fleet.length },
  };
}

function addFleet(player) {
  const te = _initTradeEmpire(player);
  if (!te.companyName) return { success: false, msg: '무역 회사를 먼저 설립하세요.' };
  if (te.fleet.length >= MAX_FLEET_SIZE) return { success: false, msg: `함대 최대 보유 수(${MAX_FLEET_SIZE})에 도달했습니다.` };

  const cost = Math.floor(FLEET_BASE_COST * Math.pow(FLEET_COST_MULT, te.fleet.length));
  if ((player.gold || 0) < cost) return { success: false, msg: `골드가 부족합니다. (필요: ${cost})` };

  player.gold -= cost;
  const fleetNum = te.fleet.length + 1;
  const newFleet = {
    id: `fleet_${fleetNum}`,
    name: `${te.companyName} ${fleetNum}호`,
    capacity: 50 + (fleetNum - 1) * 10,
    status: 'idle',
  };
  te.fleet.push(newFleet);

  return {
    success: true,
    msg: `🚢 [${newFleet.name}] 함대 추가! (${te.fleet.length}/${MAX_FLEET_SIZE})`,
    fleet: newFleet,
  };
}

function setMonopoly(player, goodsId) {
  const te = _initTradeEmpire(player);
  if (!te.companyName) return { success: false, msg: '무역 회사를 먼저 설립하세요.' };
  if (!TRADE_GOODS[goodsId]) return { success: false, msg: '존재하지 않는 교역품입니다.' };
  if (te.monopolies.includes(goodsId)) return { success: false, msg: `이미 ${TRADE_GOODS[goodsId].name}을(를) 독점하고 있습니다.` };

  if ((player.gold || 0) < MONOPOLY_COST) return { success: false, msg: `골드가 부족합니다. (필요: ${MONOPOLY_COST})` };

  player.gold -= MONOPOLY_COST;
  te.monopolies.push(goodsId);

  const goods = TRADE_GOODS[goodsId];
  const boostedPrice = Math.floor(goods.basePrice * (1 + MONOPOLY_PRICE_BOOST));
  return {
    success: true,
    msg: `🏦 ${goods.icon} ${goods.name} 독점 확보! 판매가 ${goods.basePrice} → ${boostedPrice} (+${Math.floor(MONOPOLY_PRICE_BOOST * 100)}%)`,
    monopoly: { goodsId, name: goods.name, boostedPrice },
  };
}

function getTradeEmpireStatus(player) {
  const te = _initTradeEmpire(player);
  return {
    companyName: te.companyName,
    fleetSize: te.fleet.length,
    maxFleet: MAX_FLEET_SIZE,
    fleet: te.fleet,
    monopolies: te.monopolies.map(gId => ({ id: gId, ...TRADE_GOODS[gId] })),
    totalProfit: te.totalProfit,
    tradeCount: te.tradeCount,
    availableGoods: Object.entries(TRADE_GOODS).map(([id, g]) => ({
      id,
      ...g,
      monopolized: te.monopolies.includes(id),
      effectivePrice: te.monopolies.includes(id) ? Math.floor(g.basePrice * (1 + MONOPOLY_PRICE_BOOST)) : g.basePrice,
    })),
  };
}

// ═══════════════════════════════════════════
//  6. 용병 전생 (Mercenary Reincarnation)
// ═══════════════════════════════════════════

const MAX_REINCARNATION_TIER = 10;
const REINCARNATION_STAT_BONUS = 0.05;  // 전생 1회당 영구 스탯 5% 증가
const REINCARNATION_LEVEL_REQ = 100;     // 전생 가능 레벨 (MAX_LEVEL)
const TRANSCENDENCE_TIER = 10;

const REINCARNATION_COST_PER_TIER = [
  { gold: 10000,  material: 20 },   // 1전생
  { gold: 25000,  material: 40 },   // 2전생
  { gold: 50000,  material: 70 },   // 3전생
  { gold: 100000, material: 120 },  // 4전생
  { gold: 200000, material: 200 },  // 5전생
  { gold: 350000, material: 300 },  // 6전생
  { gold: 500000, material: 450 },  // 7전생
  { gold: 750000, material: 600 },  // 8전생
  { gold: 1000000, material: 800 }, // 9전생
  { gold: 2000000, material: 1500 },// 10전생 (초월)
];

function _initReincarnation(merc) {
  if (!merc._reincarnation) {
    merc._reincarnation = {
      tier: 0,
      totalBonusPct: 0,
      transcended: false,
    };
  }
  return merc._reincarnation;
}

function reincarnateMerc(player, mercUid) {
  const mercs = player._mercs;
  if (!mercs) return { success: false, msg: '용병 시스템을 먼저 활성화하세요.' };

  const merc = mercs.roster.find(m => m.uid === mercUid);
  if (!merc) return { success: false, msg: '해당 용병을 찾을 수 없습니다.' };

  const ri = _initReincarnation(merc);
  if (ri.tier >= MAX_REINCARNATION_TIER) return { success: false, msg: '이미 최대 전생(초월) 단계에 도달했습니다.' };
  if ((merc.level || 1) < REINCARNATION_LEVEL_REQ) {
    return { success: false, msg: `전생에는 Lv.${REINCARNATION_LEVEL_REQ}이 필요합니다. (현재 Lv.${merc.level || 1})` };
  }

  const cost = REINCARNATION_COST_PER_TIER[ri.tier];
  if ((player.gold || 0) < cost.gold) return { success: false, msg: `골드가 부족합니다. (필요: ${cost.gold})` };
  if ((player.material || 0) < cost.material) return { success: false, msg: `재료가 부족합니다. (필요: ${cost.material})` };

  player.gold -= cost.gold;
  player.material -= cost.material;

  // 레벨 리셋, 영구 스탯 보너스 누적
  merc.level = 1;
  merc.exp = 0;
  ri.tier++;
  ri.totalBonusPct = ri.tier * REINCARNATION_STAT_BONUS;

  if (ri.tier >= TRANSCENDENCE_TIER) {
    ri.transcended = true;
  }

  const bonusPctDisplay = Math.floor(ri.totalBonusPct * 100);
  const isTranscended = ri.transcended;

  return {
    success: true,
    msg: isTranscended
      ? `🌟✨ ${merc.name} 초월 달성! 전 능력치 영구 +${bonusPctDisplay}%! 전설을 초월한 존재가 되었습니다!`
      : `🔄 ${merc.name} ${ri.tier}차 전생 완료! Lv.1로 리셋, 전 능력치 영구 +${bonusPctDisplay}%`,
    reincarnation: { tier: ri.tier, bonusPct: ri.totalBonusPct, transcended: ri.transcended },
  };
}

function getReincarnationStatus(player, mercUid) {
  const mercs = player._mercs;
  if (!mercs) return null;

  const merc = mercs.roster.find(m => m.uid === mercUid);
  if (!merc) return null;

  const ri = _initReincarnation(merc);
  const nextCost = ri.tier < MAX_REINCARNATION_TIER ? REINCARNATION_COST_PER_TIER[ri.tier] : null;

  return {
    mercName: merc.name,
    tier: ri.tier,
    maxTier: MAX_REINCARNATION_TIER,
    bonusPct: ri.totalBonusPct,
    transcended: ri.transcended,
    canReincarnate: (merc.level || 1) >= REINCARNATION_LEVEL_REQ && ri.tier < MAX_REINCARNATION_TIER,
    nextCost,
  };
}

// ═══════════════════════════════════════════
//  7. 소켓 핸들러 등록
// ═══════════════════════════════════════════

function registerV4Handlers(io, socket, player, players, clans) {
  const playerId = player?.id || socket.id;

  function getPlayer() {
    return players[playerId];
  }

  // ── 혈통 시스템 ──
  socket.on('v4_bloodline_status', (data) => {
    const p = getPlayer();
    if (!p) return;
    const mercs = p._mercs;
    if (!mercs) { socket.emit('v4_result', { system: 'bloodline', success: false, msg: '용병 시스템을 먼저 활성화하세요.' }); return; }
    const merc = mercs.roster.find(m => m.uid === data?.uid);
    if (!merc) { socket.emit('v4_result', { system: 'bloodline', success: false, msg: '해당 용병을 찾을 수 없습니다.' }); return; }
    _initBloodline(merc);
    socket.emit('v4_bloodline_status', {
      uid: merc.uid, name: merc.name,
      bloodline: merc._bloodline,
      bloodlineInfo: merc._bloodline ? BLOODLINES[merc._bloodline.type] : null,
    });
  });

  socket.on('v4_bloodline_awaken', (data) => {
    const p = getPlayer();
    if (!p) return;
    const result = awakenBloodline(p, data?.uid);
    socket.emit('v4_result', { system: 'bloodline', action: 'awaken', ...result });
    if (result.success) {
      io.emit('server_msg', { msg: `🩸 ${p.displayName || p.className || playerId}의 용병 혈통 각성!`, type: 'rare' });
    }
  });

  socket.on('v4_bloodline_fuse', (data) => {
    const p = getPlayer();
    if (!p) return;
    const result = fuseBloodline(p, data?.uid, data?.targetBloodline);
    socket.emit('v4_result', { system: 'bloodline', action: 'fuse', ...result });
  });

  // ── 연합 스킬 ──
  socket.on('v4_combo_check', () => {
    const p = getPlayer();
    if (!p || !p._mercs) { socket.emit('v4_result', { system: 'combo', success: false, msg: '용병 시스템을 먼저 활성화하세요.' }); return; }
    const partyMercs = p._mercs.roster.filter(m => p._mercs.party.includes(m.uid));
    const combos = checkComboSkills(partyMercs);
    socket.emit('v4_combo_list', { available: combos });
  });

  socket.on('v4_combo_execute', (data) => {
    const p = getPlayer();
    if (!p) return;
    const result = executeCombo(p, data?.comboId);
    socket.emit('v4_result', { system: 'combo', action: 'execute', ...result });
    if (result.success) {
      io.emit('server_msg', { msg: `⚡ ${p.displayName || p.className || playerId} — 연합 스킬 발동!`, type: 'combo' });
    }
  });

  // ── 영지 자원 ──
  socket.on('v4_territory_status', () => {
    const p = getPlayer();
    if (!p) return;
    socket.emit('v4_territory_status', getTerritoryStatus(p));
  });

  socket.on('v4_territory_assign_worker', (data) => {
    const p = getPlayer();
    if (!p) return;
    const result = assignWorker(p, data?.mercUid, data?.buildingId);
    socket.emit('v4_result', { system: 'territory', action: 'assign', ...result });
  });

  socket.on('v4_territory_remove_worker', (data) => {
    const p = getPlayer();
    if (!p) return;
    const result = removeWorker(p, data?.mercUid, data?.buildingId);
    socket.emit('v4_result', { system: 'territory', action: 'remove', ...result });
  });

  socket.on('v4_territory_collect', () => {
    const p = getPlayer();
    if (!p) return;
    const result = collectResources(p);
    socket.emit('v4_result', { system: 'territory', action: 'collect', ...result });
  });

  socket.on('v4_territory_upgrade', (data) => {
    const p = getPlayer();
    if (!p) return;
    const result = upgradeBuilding(p, data?.buildingId);
    socket.emit('v4_result', { system: 'territory', action: 'upgrade', ...result });
  });

  // ── 공성전 시즌 ──
  socket.on('v4_siege_rank', () => {
    const p = getPlayer();
    if (!p) return;
    socket.emit('v4_siege_rank', getSiegeRank(p));
  });

  socket.on('v4_siege_claim_reward', () => {
    const p = getPlayer();
    if (!p) return;
    const result = claimSiegeReward(p);
    socket.emit('v4_result', { system: 'siege', action: 'claim', ...result });
  });

  socket.on('v4_siege_season_info', () => {
    socket.emit('v4_siege_season_info', getSiegeSeasonInfo());
  });

  socket.on('v4_siege_throne_war', () => {
    // 왕좌전 시작 (관리자 권한 또는 조건 충족 시)
    const p = getPlayer();
    if (!p) return;
    const rank = getSiegeRank(p);
    if (rank.league !== 'DIAMOND') {
      socket.emit('v4_result', { system: 'siege', success: false, msg: '왕좌 쟁탈전은 다이아몬드 리그만 참가할 수 있습니다.' });
      return;
    }
    const result = startThroneWar();
    if (result.success) {
      io.emit('server_msg', { msg: result.msg, type: 'siege' });
    }
    socket.emit('v4_result', { system: 'siege', action: 'throne_war', ...result });
  });

  // ── 무역 제국 ──
  socket.on('v4_trade_status', () => {
    const p = getPlayer();
    if (!p) return;
    socket.emit('v4_trade_status', getTradeEmpireStatus(p));
  });

  socket.on('v4_trade_create_company', (data) => {
    const p = getPlayer();
    if (!p) return;
    const result = createTradeCompany(p, data?.name);
    socket.emit('v4_result', { system: 'trade', action: 'create', ...result });
    if (result.success) {
      io.emit('server_msg', { msg: `🏢 ${p.displayName || p.className || playerId}이(가) 무역 회사 [${data.name}]을 설립했습니다!`, type: 'trade' });
    }
  });

  socket.on('v4_trade_add_fleet', () => {
    const p = getPlayer();
    if (!p) return;
    const result = addFleet(p);
    socket.emit('v4_result', { system: 'trade', action: 'fleet', ...result });
  });

  socket.on('v4_trade_set_monopoly', (data) => {
    const p = getPlayer();
    if (!p) return;
    const result = setMonopoly(p, data?.goodsId);
    socket.emit('v4_result', { system: 'trade', action: 'monopoly', ...result });
    if (result.success) {
      io.emit('server_msg', { msg: `🏦 ${p.displayName || p.className || playerId}이(가) ${TRADE_GOODS[data.goodsId]?.name} 시장을 독점했습니다!`, type: 'trade' });
    }
  });

  // ── 용병 전생 ──
  socket.on('v4_reincarnation_status', (data) => {
    const p = getPlayer();
    if (!p) return;
    const status = getReincarnationStatus(p, data?.uid);
    if (!status) { socket.emit('v4_result', { system: 'reincarnation', success: false, msg: '해당 용병을 찾을 수 없습니다.' }); return; }
    socket.emit('v4_reincarnation_status', status);
  });

  socket.on('v4_reincarnation_execute', (data) => {
    const p = getPlayer();
    if (!p) return;
    const result = reincarnateMerc(p, data?.uid);
    socket.emit('v4_result', { system: 'reincarnation', action: 'execute', ...result });
    if (result.success && result.reincarnation?.transcended) {
      io.emit('server_msg', { msg: `🌟 ${p.displayName || p.className || playerId}의 용병이 초월에 도달했습니다!`, type: 'mythic' });
    }
  });
}

// ═══════════════════════════════════════════
//  Module Exports
// ═══════════════════════════════════════════

module.exports = {
  // 혈통
  BLOODLINES, getBloodline, awakenBloodline, fuseBloodline,
  // 연합 스킬
  COMBO_SKILLS, TRINITY_SKILLS, PARTY_ULTIMATE, checkComboSkills, executeCombo,
  // 영지 자원
  TERRITORY_RESOURCES, PRODUCTION_BUILDINGS, assignWorker, removeWorker, collectResources, upgradeBuilding, getTerritoryStatus,
  // 공성전 시즌
  SIEGE_LEAGUES, getSiegeRank, addSiegeScore, claimSiegeReward, startThroneWar, endThroneWar, advanceSiegeWeek, getSiegeSeasonInfo,
  // 무역 제국
  TRADE_GOODS, createTradeCompany, addFleet, setMonopoly, getTradeEmpireStatus,
  // 전생
  reincarnateMerc, getReincarnationStatus,
  // 핸들러
  registerV4Handlers,
};

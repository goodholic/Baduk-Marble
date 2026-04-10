// ==========================================
// 정령 계약 (Spirit Pact) — v2.52
// 4원소 정령 계약 + 레벨업 + 합체(빛/어둠) + 동반 전투
// ==========================================

// ── 기본 정령 4종 ──
const SPIRITS = {
  fire: {
    name: '이프리트', icon: '🔥', element: 'fire', color: '#ff4400',
    desc: '화염의 정령. 강력한 공격력과 화상.',
    lore: '"불꽃은 파괴하지만, 그 재에서 새로운 것이 태어난다."',
    baseStats: { atk: 40, def: 10, spd: 12 },
    passivePerLevel: { atk: 8, fireAtk: 0.02 },
    skills: [
      { level: 1, name: '화염구', desc: '불꽃 투사체 (ATK 3배)', dmgMulti: 3.0, range: 5, cd: 8 },
      { level: 3, name: '화염 폭풍', desc: '광역 화염 (ATK 5배, 범위 6)', dmgMulti: 5.0, aoe: true, range: 6, cd: 20 },
      { level: 5, name: '인페르노', desc: '지옥불 (ATK 10배 + 화상 8초)', dmgMulti: 10.0, aoe: true, range: 8, burn: { dps: 20, dur: 8 }, cd: 60 },
    ],
    contractCost: { gold: 20000, mat_soul: 5 },
  },
  water: {
    name: '운디네', icon: '💧', element: 'water', color: '#44aaff',
    desc: '물의 정령. 치유와 보호의 힘.',
    lore: '"물은 모든 것을 감싸안고, 모든 상처를 씻어낸다."',
    baseStats: { atk: 15, def: 25, spd: 10 },
    passivePerLevel: { def: 5, healBonus: 0.03 },
    skills: [
      { level: 1, name: '치유의 물결', desc: '주인 HP 20% 회복', healPct: 0.20, cd: 12 },
      { level: 3, name: '빙결 방벽', desc: '5초 보호막 + 적 둔화', shieldPct: 0.15, slow: 0.3, duration: 5, range: 5, cd: 25 },
      { level: 5, name: '대해일', desc: '쓰나미 (ATK 8배 + 넉백 + 빙결)', dmgMulti: 8.0, aoe: true, range: 8, freeze: 3, cd: 55 },
    ],
    contractCost: { gold: 20000, mat_soul: 5 },
  },
  wind: {
    name: '실프', icon: '💨', element: 'wind', color: '#44ff88',
    desc: '바람의 정령. 극한의 속도와 회피.',
    lore: '"바람은 잡을 수 없다. 하지만 바람은 모든 곳에 있다."',
    baseStats: { atk: 25, def: 8, spd: 25 },
    passivePerLevel: { spd: 3, evasion: 2 },
    skills: [
      { level: 1, name: '칼바람', desc: '고속 연타 (ATK 1.5배 x3)', dmgMulti: 1.5, hits: 3, range: 4, cd: 6 },
      { level: 3, name: '질풍 오라', desc: '주인 SPD x1.5 + 회피 +20% (15초)', buff: { spdMulti: 1.5, dodge: 0.20 }, duration: 15, cd: 30 },
      { level: 5, name: '태풍의 눈', desc: '거대 회오리 (ATK 7배 + 흡인 + 기절)', dmgMulti: 7.0, aoe: true, range: 10, stun: 3, cd: 50 },
    ],
    contractCost: { gold: 20000, mat_soul: 5 },
  },
  earth: {
    name: '노움', icon: '🪨', element: 'earth', color: '#aa8844',
    desc: '대지의 정령. 압도적인 방어와 생명력.',
    lore: '"대지는 흔들리지 않는다. 산이 무너져도 땅은 남는다."',
    baseStats: { atk: 20, def: 40, spd: 6 },
    passivePerLevel: { def: 8, maxHp: 30 },
    skills: [
      { level: 1, name: '바위 투척', desc: '바위 던지기 (ATK 4배, 넉백)', dmgMulti: 4.0, range: 6, knockback: true, cd: 10 },
      { level: 3, name: '대지의 방벽', desc: '주인 DEF +50% (10초)', buff: { defMulti: 1.5 }, duration: 10, cd: 25 },
      { level: 5, name: '지진', desc: '대지 분쇄 (ATK 9배 + 기절 4초 + 광역)', dmgMulti: 9.0, aoe: true, range: 7, stun: 4, cd: 55 },
    ],
    contractCost: { gold: 20000, mat_soul: 5 },
  },
};

// ── 상위 정령 (합체) ──
const FUSION_SPIRITS = {
  light: {
    name: '루미엘', icon: '✨', element: 'light', color: '#ffd700',
    desc: '빛의 대정령. 성스러운 힘으로 아군을 수호하고 적을 정화.',
    lore: '"어둠이 깊을수록 빛은 더 밝게 빛난다."',
    fusion: ['fire', 'water'],  // 화 + 수 = 빛
    baseStats: { atk: 50, def: 40, spd: 15 },
    passivePerLevel: { atk: 10, def: 8, healBonus: 0.03 },
    skills: [
      { level: 1, name: '성광 화살', desc: '빛의 화살 (ATK 6배, 방어 무시 50%)', dmgMulti: 6.0, ignoreDefPct: 0.5, range: 7, cd: 10 },
      { level: 3, name: '빛의 세례', desc: '광역 힐 30% + 디버프 정화', healPct: 0.30, cleanse: true, range: 8, cd: 30 },
      { level: 5, name: '천상의 심판', desc: '빛 폭발 (ATK 15배 + 아군 회복 20%)', dmgMulti: 15.0, aoe: true, healAllyPct: 0.20, range: 10, cd: 90 },
    ],
    fusionCost: { gold: 100000, mat_dragon: 10, mat_soul: 10 },
  },
  dark: {
    name: '아비스', icon: '🌑', element: 'dark', color: '#6622aa',
    desc: '어둠의 대정령. 공포와 파멸로 적을 삼킨다.',
    lore: '"심연을 들여다보는 자, 심연에게 삼켜지리라."',
    fusion: ['wind', 'earth'],  // 풍 + 지 = 어둠
    baseStats: { atk: 60, def: 30, spd: 18 },
    passivePerLevel: { atk: 12, crit: 2, lifesteal: 0.01 },
    skills: [
      { level: 1, name: '어둠의 손', desc: '생명력 흡수 (ATK 5배 + HP 30% 흡수)', dmgMulti: 5.0, hpSteal: 0.30, range: 5, cd: 10 },
      { level: 3, name: '공포의 안개', desc: '광역 공포 + ATK/SPD -40% (8초)', fearDuration: 8, debuff: { atk: 0.4, spd: 0.4 }, range: 7, cd: 30 },
      { level: 5, name: '심연 포식', desc: '적 HP 40% 삭감 + 동량 흡수 (광역)', hpCutPct: 0.40, selfHeal: true, aoe: true, range: 9, cd: 90 },
    ],
    fusionCost: { gold: 100000, mat_dragon: 10, mat_soul: 10 },
  },
};

// ── 원소 시너지 (정령 + 플레이어 원소 일치 시) ──
const ELEMENT_SYNERGY = {
  fire:  { name: '화염 공명', desc: '화속성 데미지 +20%', bonus: { fireAtk: 0.20 } },
  water: { name: '물결 공명', desc: '힐 효율 +20%, 빙결 저항', bonus: { healBonus: 0.20, freezeResist: true } },
  wind:  { name: '질풍 공명', desc: 'SPD +8, 회피 +10%', bonus: { spd: 8, evasion: 10 } },
  earth: { name: '대지 공명', desc: 'DEF +30, HP +200', bonus: { def: 30, maxHp: 200 } },
  light: { name: '성광 공명', desc: '올스탯 +10, 힐 +15%', bonus: { allStats: 10, healBonus: 0.15 } },
  dark:  { name: '심연 공명', desc: 'ATK +25, 흡혈 +8%', bonus: { atk: 25, lifesteal: 0.08 } },
};

// 정령 레벨 경험치 테이블
const SPIRIT_LEVEL_EXP = [0, 100, 300, 600, 1200, 2500]; // Lv.1~6 (max 5+fusion=6)
const SPIRIT_MAX_LEVEL = 5;
const FUSION_MAX_LEVEL = 6;

function _ensure(player) {
  if (!player._spiritPact) {
    player._spiritPact = {
      contracts: {},      // { spiritId: { level, exp } }
      fusions: {},        // { fusionId: { level, exp } }
      active: null,       // 현재 소환된 정령 id
      activeType: null,   // 'base' | 'fusion'
      totalContracts: 0,
    };
  }
  return player._spiritPact;
}

// ── 정령 계약 ──
function contractSpirit(player, spiritId) {
  const sp = _ensure(player);
  if (!SPIRITS[spiritId]) return { success: false, msg: '알 수 없는 정령' };
  if (sp.contracts[spiritId]) return { success: false, msg: '이미 계약됨' };

  const spirit = SPIRITS[spiritId];
  if ((player.gold || 0) < spirit.contractCost.gold) return { success: false, msg: `골드 부족 (${spirit.contractCost.gold}G)` };
  for (const [item, count] of Object.entries(spirit.contractCost)) {
    if (item === 'gold') continue;
    if (!player.inventory?.[item] || player.inventory[item] < count) return { success: false, msg: `재료 부족: ${item} x${count}` };
  }

  player.gold -= spirit.contractCost.gold;
  for (const [item, count] of Object.entries(spirit.contractCost)) {
    if (item === 'gold') continue;
    player.inventory[item] -= count;
    if (player.inventory[item] <= 0) delete player.inventory[item];
  }

  sp.contracts[spiritId] = { level: 1, exp: 0 };
  sp.totalContracts++;
  return { success: true, spirit, msg: `${spirit.icon} ${spirit.name}과(와) 계약 성공!` };
}

// ── 정령 합체 ──
function fuseSpirits(player, fusionId) {
  const sp = _ensure(player);
  const fusion = FUSION_SPIRITS[fusionId];
  if (!fusion) return { success: false, msg: '알 수 없는 합체' };
  if (sp.fusions[fusionId]) return { success: false, msg: '이미 합체됨' };

  // 필요 정령 레벨 3 이상
  for (const reqId of fusion.fusion) {
    if (!sp.contracts[reqId] || sp.contracts[reqId].level < 3) {
      return { success: false, msg: `${SPIRITS[reqId].name} Lv.3 이상 필요` };
    }
  }

  // 비용
  if ((player.gold || 0) < fusion.fusionCost.gold) return { success: false, msg: `골드 부족` };
  for (const [item, count] of Object.entries(fusion.fusionCost)) {
    if (item === 'gold') continue;
    if (!player.inventory?.[item] || player.inventory[item] < count) return { success: false, msg: `재료 부족: ${item} x${count}` };
  }

  player.gold -= fusion.fusionCost.gold;
  for (const [item, count] of Object.entries(fusion.fusionCost)) {
    if (item === 'gold') continue;
    player.inventory[item] -= count;
    if (player.inventory[item] <= 0) delete player.inventory[item];
  }

  sp.fusions[fusionId] = { level: 1, exp: 0 };
  return { success: true, fusion, msg: `${fusion.icon} ${fusion.name} 합체 성공! — ${fusion.desc}` };
}

// ── 정령 소환/해제 ──
function summonSpirit(player, spiritId, type) {
  const sp = _ensure(player);
  if (type === 'fusion') {
    if (!sp.fusions[spiritId]) return { success: false, msg: '합체되지 않은 정령' };
  } else {
    if (!sp.contracts[spiritId]) return { success: false, msg: '계약되지 않은 정령' };
  }

  sp.active = spiritId;
  sp.activeType = type || 'base';
  const info = type === 'fusion' ? FUSION_SPIRITS[spiritId] : SPIRITS[spiritId];
  return { success: true, spirit: info, msg: `${info.icon} ${info.name} 소환!` };
}

function dismissSpirit(player) {
  const sp = _ensure(player);
  sp.active = null;
  sp.activeType = null;
  return { success: true, msg: '정령 귀환' };
}

// ── 정령 경험치 ──
function grantSpiritExp(player, amount) {
  const sp = _ensure(player);
  if (!sp.active) return null;

  const data = sp.activeType === 'fusion' ? sp.fusions[sp.active] : sp.contracts[sp.active];
  if (!data) return null;

  const maxLv = sp.activeType === 'fusion' ? FUSION_MAX_LEVEL : SPIRIT_MAX_LEVEL;
  data.exp += amount;

  let leveledUp = false;
  while (data.level < maxLv && data.exp >= SPIRIT_LEVEL_EXP[data.level]) {
    data.exp -= SPIRIT_LEVEL_EXP[data.level];
    data.level++;
    leveledUp = true;
  }

  return leveledUp ? { leveledUp: true, level: data.level } : null;
}

// ── 활성 정령 보너스 ──
function getActiveBonuses(player) {
  const sp = _ensure(player);
  if (!sp.active) return {};

  const isFusion = sp.activeType === 'fusion';
  const info = isFusion ? FUSION_SPIRITS[sp.active] : SPIRITS[sp.active];
  const data = isFusion ? sp.fusions[sp.active] : sp.contracts[sp.active];
  if (!info || !data) return {};

  const bonuses = {};
  const level = data.level;

  // 기본 스탯 + 레벨 보너스
  for (const [stat, val] of Object.entries(info.passivePerLevel)) {
    bonuses[stat] = (bonuses[stat] || 0) + val * level;
  }

  // 원소 시너지
  const synergy = ELEMENT_SYNERGY[info.element];
  if (synergy) {
    for (const [stat, val] of Object.entries(synergy.bonus)) {
      if (typeof val === 'boolean') bonuses[stat] = val;
      else bonuses[stat] = (bonuses[stat] || 0) + val;
    }
  }

  return bonuses;
}

// ── 상태 조회 ──
function getStatus(player) {
  const sp = _ensure(player);

  const baseSpirits = Object.entries(SPIRITS).map(([id, s]) => {
    const contract = sp.contracts[id];
    return {
      id, name: s.name, icon: s.icon, element: s.element, color: s.color,
      desc: s.desc, lore: s.lore,
      contracted: !!contract,
      level: contract?.level || 0,
      exp: contract?.exp || 0,
      nextExp: contract ? (SPIRIT_LEVEL_EXP[contract.level] || 999) : 0,
      isActive: sp.active === id && sp.activeType === 'base',
      skills: s.skills.map(sk => ({ ...sk, unlocked: contract && contract.level >= sk.level })),
      cost: s.contractCost,
    };
  });

  const fusionSpirits = Object.entries(FUSION_SPIRITS).map(([id, f]) => {
    const fused = sp.fusions[id];
    const reqMet = f.fusion.every(r => sp.contracts[r] && sp.contracts[r].level >= 3);
    return {
      id, name: f.name, icon: f.icon, element: f.element, color: f.color,
      desc: f.desc, lore: f.lore,
      fused: !!fused,
      level: fused?.level || 0,
      exp: fused?.exp || 0,
      nextExp: fused ? (SPIRIT_LEVEL_EXP[fused.level] || 999) : 0,
      isActive: sp.active === id && sp.activeType === 'fusion',
      fusionReq: f.fusion.map(r => ({ id: r, name: SPIRITS[r].name, icon: SPIRITS[r].icon, met: sp.contracts[r] && sp.contracts[r].level >= 3 })),
      reqMet,
      skills: f.skills.map(sk => ({ ...sk, unlocked: fused && fused.level >= sk.level })),
      cost: f.fusionCost,
    };
  });

  return {
    baseSpirits,
    fusionSpirits,
    active: sp.active,
    activeType: sp.activeType,
    activeInfo: sp.active ? (sp.activeType === 'fusion' ? FUSION_SPIRITS[sp.active] : SPIRITS[sp.active]) : null,
    totalContracts: sp.totalContracts,
  };
}

module.exports = {
  SPIRITS, FUSION_SPIRITS, ELEMENT_SYNERGY,
  contractSpirit, fuseSpirits, summonSpirit, dismissSpirit,
  grantSpiritExp, getActiveBonuses, getStatus,
};

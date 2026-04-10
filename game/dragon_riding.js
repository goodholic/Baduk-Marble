// ==========================================
// 드래곤 라이딩 시스템 (Dragon Riding) — v2.57
// 용의 알 획득 → 부화 → 성장 → 비행 전투 + 드래곤 레이드
// ==========================================

// ── 드래곤 종류 8종 ──
const DRAGON_TYPES = {
  fire: {
    name: '화염룡 이그니스', icon: '🔥', color: '#ff4400',
    element: 'fire', lore: '"태초의 불꽃에서 태어난 용. 그 숨결은 산을 녹인다."',
    baseStats: { hp: 800, atk: 120, def: 60, spd: 14 },
    breathType: 'fireball', breathDesc: '화염 브레스 — 전방 적에게 ATK x3 화염 데미지',
    passiveDesc: '탑승 시 화(火) 속성 데미지 +30%',
    passive: { fireDmg: 0.30 },
    rarity: 'rare',
  },
  ice: {
    name: '빙결룡 프로스트', icon: '❄️', color: '#88ddff',
    element: 'ice', lore: '"영원의 빙하 깊은 곳에서 잠들어 있던 고대의 용."',
    baseStats: { hp: 900, atk: 90, def: 100, spd: 11 },
    breathType: 'icebreath', breathDesc: '냉기 브레스 — 전방 적 동결 3초 + ATK x2 빙결 데미지',
    passiveDesc: '탑승 시 빙(氷) 저항 +50%, 적 이동속도 -20%',
    passive: { iceResist: 0.50, slowAura: 0.20 },
    rarity: 'rare',
  },
  thunder: {
    name: '뇌전룡 볼텍스', icon: '⚡', color: '#ffdd00',
    element: 'lightning', lore: '"번개 구름 위를 나는 용. 그 포효는 하늘을 가른다."',
    baseStats: { hp: 700, atk: 140, def: 50, spd: 20 },
    breathType: 'thunderbolt', breathDesc: '뇌전 브레스 — 랜덤 3체에 ATK x2.5 번개 데미지',
    passiveDesc: '탑승 시 공격속도 +40%, 크리티컬 +15%',
    passive: { atkSpeed: 0.40, critRate: 0.15 },
    rarity: 'rare',
  },
  shadow: {
    name: '암흑룡 네크로스', icon: '🌑', color: '#8844aa',
    element: 'dark', lore: '"죽음의 그림자에서 태어난 용. 보는 자에게 공포를."',
    baseStats: { hp: 850, atk: 110, def: 80, spd: 13 },
    breathType: 'shadowbreath', breathDesc: '암흑 브레스 — 전방 적에게 HP흡수(ATK x2) + 공포 2초',
    passiveDesc: '탑승 시 암(暗) 속성 데미지 +25%, HP흡수 +10%',
    passive: { darkDmg: 0.25, lifesteal: 0.10 },
    rarity: 'epic',
  },
  holy: {
    name: '성룡 아우렐리우스', icon: '✨', color: '#ffd700',
    element: 'light', lore: '"천상의 빛을 수호하는 용. 신들의 기사가 타던 전설."',
    baseStats: { hp: 1000, atk: 100, def: 90, spd: 15 },
    breathType: 'holybreath', breathDesc: '성광 브레스 — ATK x2 광역 + 아군 전체 HP 15% 회복',
    passiveDesc: '탑승 시 광(光) 속성 데미지 +20%, 자동 회복 3%/초',
    passive: { lightDmg: 0.20, hpRegen: 0.03 },
    rarity: 'epic',
  },
  earth: {
    name: '대지룡 테라', icon: '🌍', color: '#88aa44',
    element: 'earth', lore: '"대지의 심장에서 깨어난 용. 발걸음마다 대지가 흔들린다."',
    baseStats: { hp: 1200, atk: 80, def: 130, spd: 9 },
    breathType: 'earthquake', breathDesc: '지진 브레스 — 주변 전체 ATK x2 + 스턴 2초',
    passiveDesc: '탑승 시 DEF +40%, 넉백 면역',
    passive: { defBonus: 0.40, knockbackImmune: true },
    rarity: 'rare',
  },
  void: {
    name: '공허룡 아비스', icon: '🕳️', color: '#6622cc',
    element: 'void', lore: '"차원의 틈에서 나타나는 존재. 현실을 삼키는 용."',
    baseStats: { hp: 750, atk: 160, def: 40, spd: 18 },
    breathType: 'voidrip', breathDesc: '공허 브레스 — 대상의 현재 HP 20% 삭제 (고정 데미지)',
    passiveDesc: '탑승 시 모든 속성 저항 +15%, 회피 +10%',
    passive: { allResist: 0.15, dodge: 0.10 },
    rarity: 'legendary',
  },
  chaos: {
    name: '혼돈룡 카오스', icon: '🌀', color: '#ff00ff',
    element: 'chaos', lore: '"만물의 시작이자 끝. 이 용을 타는 자는 세계의 법칙을 거스른다."',
    baseStats: { hp: 1000, atk: 130, def: 70, spd: 16 },
    breathType: 'chaosbreath', breathDesc: '혼돈 브레스 — 랜덤 속성 ATK x4 + 랜덤 버프/디버프',
    passiveDesc: '탑승 시 전체 스탯 +15%, 매 10초 랜덤 강력 버프',
    passive: { allStats: 0.15, randomBuff: true },
    rarity: 'mythic',
  },
};

// ── 드래곤 알 획득 방법 ──
const EGG_SOURCES = {
  fire:    { source: '용의 둥지 (화산 지역) 보스 드롭', dropRate: 0.08 },
  ice:     { source: '빙하 동굴 보스 드롭', dropRate: 0.08 },
  thunder: { source: '뇌운 봉우리 보스 드롭', dropRate: 0.08 },
  shadow:  { source: '암흑 심연 보스 드롭', dropRate: 0.05 },
  holy:    { source: '천상 신전 보스 드롭', dropRate: 0.05 },
  earth:   { source: '대지의 심장 보스 드롭', dropRate: 0.08 },
  void:    { source: '차원의 틈 보스 드롭 (Lv.40+)', dropRate: 0.03 },
  chaos:   { source: '7종 드래곤 만렙 달성 보상', dropRate: 0 },
};

// ── 드래곤 성장 단계 ──
const GROWTH_STAGES = [
  { name: '알',     level: 0,  statMulti: 0,    icon: '🥚', feedCount: 0,  desc: '부화를 기다리는 알' },
  { name: '해츨링', level: 1,  statMulti: 0.3,  icon: '🐣', feedCount: 10, desc: '갓 태어난 아기 용' },
  { name: '유룡',   level: 5,  statMulti: 0.5,  icon: '🐉', feedCount: 30, desc: '날개가 자라기 시작한 어린 용' },
  { name: '성룡',   level: 15, statMulti: 0.8,  icon: '🐲', feedCount: 60, desc: '하늘을 나는 성체 용' },
  { name: '고대룡', level: 30, statMulti: 1.0,  icon: '👑', feedCount: 100,desc: '수천 년을 살아온 고대의 존재' },
  { name: '신룡',   level: 50, statMulti: 1.5,  icon: '⭐', feedCount: 200,desc: '신의 영역에 도달한 전설의 용' },
];

// ── 먹이 아이템 ──
const DRAGON_FOOD = {
  dragon_meat:    { name: '용의 고기', exp: 50,  gold: 500,  desc: '기본 먹이' },
  dragon_crystal: { name: '마력 결정', exp: 150, gold: 2000, desc: '마력이 응축된 결정' },
  dragon_heart:   { name: '드래곤 하트', exp: 500, gold: 10000, desc: '보스 드래곤의 심장' },
  dragon_stardust:{ name: '별의 먼지', exp: 1000, gold: 0, desc: '최상급 먹이 (이벤트/레이드 보상)' },
};

// ── 비행 전투 스킬 ──
const FLIGHT_SKILLS = {
  divebomb:    { name: '급강하 폭격', cooldown: 15, desc: 'ATK x5 단일 대상 + 스턴 2초', minStage: 2 },
  wingblade:   { name: '날개 칼바람', cooldown: 10, desc: '주변 ATK x2 광역', minStage: 1 },
  skydance:    { name: '하늘춤',     cooldown: 20, desc: '5초간 무적 + 회피 100%', minStage: 3 },
  dragonroar:  { name: '용의 포효',  cooldown: 30, desc: '주변 적 전원 공포 3초 + DEF 30% 감소', minStage: 4 },
  dracosurge:  { name: '드래곤 서지', cooldown: 60, desc: '30초간 드래곤 스탯 2배 + 브레스 강화', minStage: 5 },
};

// ── 드래곤 레이드 보스 ──
const DRAGON_RAID_BOSSES = {
  ancient_wyrm: {
    name: '태고의 대사(大蛇) 요르문간드', icon: '🐍',
    hp: 500000, atk: 800, def: 300,
    mechanics: ['독 안개(주기적 전체 DOT)', '꼬리 휩쓸기(넉백)', '삼킴(랜덤 1인 즉사 판정)'],
    rewards: { gold: 50000, dimStone: 20, specialDrop: 'wyrm_scale_armor' },
    minDragons: 3, desc: '3마리 이상의 드래곤이 필요',
  },
  sky_titan: {
    name: '하늘의 왕 바하무트', icon: '👑',
    hp: 800000, atk: 1200, def: 500,
    mechanics: ['메가 플레어(카운트다운 후 전체 공격)', '차원 이동(페이즈 변경)', '브레스 반사'],
    rewards: { gold: 100000, dimStone: 40, specialDrop: 'bahamut_wing' },
    minDragons: 5, desc: '5마리 이상의 드래곤이 필요한 최종 레이드',
  },
  void_dragon: {
    name: '차원포식자 니드호그', icon: '🕳️',
    hp: 1000000, atk: 1500, def: 400,
    mechanics: ['차원 붕괴(맵 축소)', '존재 삭제(HP 비율 삭감)', '공허 폭발(패턴 회피 필수)'],
    rewards: { gold: 200000, dimStone: 80, specialDrop: 'nidhogg_fang' },
    minDragons: 7, desc: '7종 드래곤 전원 필요 — 최고 난이도',
  },
};

// ── 드래곤 장비 (보상) ──
const DRAGON_EQUIPMENT = {
  wyrm_scale_armor: { name: '요르문간드의 비늘 갑옷', stats: { def: 80, hp: 300, poisonResist: 0.5 }, desc: '독 저항 +50%' },
  bahamut_wing:     { name: '바하무트의 날개', stats: { spd: 10, atk: 50, allDmg: 0.15 }, desc: '비행 속도 +50%, 전체 데미지 +15%' },
  nidhogg_fang:     { name: '니드호그의 이빨', stats: { atk: 100, critDmg: 0.30 }, desc: '크리티컬 데미지 +30%' },
};

// ── 모듈 상태 ──
let _deps = {};

function init(deps) {
  _deps = deps;
}

// ── 드래곤 알 부화 ──
function hatchEgg(player, dragonType) {
  if (!DRAGON_TYPES[dragonType]) return { success: false, msg: '존재하지 않는 드래곤 종류' };
  if (!player.inventory) player.inventory = {};
  const eggId = `dragon_egg_${dragonType}`;
  if ((player.inventory[eggId] || 0) < 1) return { success: false, msg: '드래곤 알을 보유하고 있지 않습니다' };

  if (!player.dragons) player.dragons = {};
  if (player.dragons[dragonType]) return { success: false, msg: '이미 같은 종류의 드래곤을 보유 중입니다' };

  player.inventory[eggId]--;
  if (player.inventory[eggId] <= 0) delete player.inventory[eggId];

  const dt = DRAGON_TYPES[dragonType];
  player.dragons[dragonType] = {
    type: dragonType,
    name: dt.name,
    level: 1,
    exp: 0,
    feedCount: 0,
    stageIndex: 1, // 해츨링
    bond: 0,       // 친밀도 (0~100)
    skills: [],
    equippedAt: null,
  };

  return { success: true, msg: `${dt.icon} ${dt.name}이(가) 알에서 부화했습니다!`, dragon: player.dragons[dragonType] };
}

// ── 드래곤 먹이 주기 ──
function feedDragon(player, dragonType, foodId) {
  if (!player.dragons || !player.dragons[dragonType]) return { success: false, msg: '해당 드래곤을 보유하고 있지 않습니다' };
  const food = DRAGON_FOOD[foodId];
  if (!food) return { success: false, msg: '존재하지 않는 먹이' };
  if (!player.inventory) player.inventory = {};
  if ((player.inventory[foodId] || 0) < 1) return { success: false, msg: `${food.name}이(가) 부족합니다` };
  if (food.gold > 0 && (player.gold || 0) < food.gold) return { success: false, msg: `골드 부족 (${food.gold}G 필요)` };

  // 차감
  player.inventory[foodId]--;
  if (player.inventory[foodId] <= 0) delete player.inventory[foodId];
  if (food.gold > 0) player.gold -= food.gold;

  const dragon = player.dragons[dragonType];
  dragon.exp += food.exp;
  dragon.feedCount++;
  dragon.bond = Math.min(100, (dragon.bond || 0) + 1);

  // 레벨업 체크
  const expNeeded = dragon.level * 100 + 50;
  let leveledUp = false;
  while (dragon.exp >= expNeeded) {
    dragon.exp -= expNeeded;
    dragon.level++;
    leveledUp = true;
  }

  // 성장 단계 체크
  let stageChanged = false;
  for (let i = GROWTH_STAGES.length - 1; i >= 0; i--) {
    if (dragon.level >= GROWTH_STAGES[i].level && dragon.feedCount >= GROWTH_STAGES[i].feedCount) {
      if (dragon.stageIndex < i) {
        dragon.stageIndex = i;
        stageChanged = true;
      }
      break;
    }
  }

  // 스킬 해금 체크
  for (const [skillId, skill] of Object.entries(FLIGHT_SKILLS)) {
    if (dragon.stageIndex >= skill.minStage && !dragon.skills.includes(skillId)) {
      dragon.skills.push(skillId);
    }
  }

  // 혼돈룡 해금 체크 (7종 만렙)
  if (player.dragons && Object.keys(player.dragons).length >= 7) {
    const allMaxLevel = Object.values(player.dragons).every(d => d.level >= 50);
    if (allMaxLevel && !player.dragons.chaos) {
      if (!player.inventory.dragon_egg_chaos) player.inventory.dragon_egg_chaos = 0;
      player.inventory.dragon_egg_chaos++;
    }
  }

  const stage = GROWTH_STAGES[dragon.stageIndex];
  let msg = `${food.name}을(를) 먹였습니다! (EXP +${food.exp})`;
  if (leveledUp) msg += ` Lv.${dragon.level} 달성!`;
  if (stageChanged) msg += ` ${stage.icon} [${stage.name}] 단계로 성장!`;

  return { success: true, msg, dragon, leveledUp, stageChanged };
}

// ── 드래곤 탑승/하강 ──
function mountDragon(player, dragonType) {
  if (!player.dragons || !player.dragons[dragonType]) return { success: false, msg: '해당 드래곤을 보유하고 있지 않습니다' };
  const dragon = player.dragons[dragonType];
  if (dragon.stageIndex < 2) return { success: false, msg: '유룡 단계 이상부터 탑승 가능합니다 (Lv.5+)' };

  player.ridingDragon = dragonType;
  const dt = DRAGON_TYPES[dragonType];
  const stage = GROWTH_STAGES[dragon.stageIndex];

  return {
    success: true,
    msg: `${dt.icon} ${dt.name} ${stage.icon}[${stage.name}]에 탑승했습니다!`,
    passive: dt.passive,
    stats: getDragonStats(dragon),
  };
}

function dismountDragon(player) {
  if (!player.ridingDragon) return { success: false, msg: '현재 드래곤에 탑승하고 있지 않습니다' };
  const dt = DRAGON_TYPES[player.ridingDragon];
  player.ridingDragon = null;
  return { success: true, msg: `${dt.name}에서 내렸습니다.` };
}

// ── 브레스 공격 ──
function useBreath(player) {
  if (!player.ridingDragon) return { success: false, msg: '드래곤에 탑승 중이 아닙니다' };
  const dragon = player.dragons[player.ridingDragon];
  const dt = DRAGON_TYPES[player.ridingDragon];
  const stats = getDragonStats(dragon);
  const dmg = Math.floor(stats.atk * 3);

  return { success: true, type: dt.breathType, dmg, desc: dt.breathDesc, element: dt.element };
}

// ── 비행 스킬 사용 ──
function useFlightSkill(player, skillId) {
  if (!player.ridingDragon) return { success: false, msg: '드래곤에 탑승 중이 아닙니다' };
  const dragon = player.dragons[player.ridingDragon];
  if (!dragon.skills.includes(skillId)) return { success: false, msg: '해금되지 않은 스킬입니다' };
  const skill = FLIGHT_SKILLS[skillId];
  if (!skill) return { success: false, msg: '존재하지 않는 스킬' };

  return { success: true, skill: skillId, name: skill.name, desc: skill.desc, cooldown: skill.cooldown };
}

// ── 스탯 계산 ──
function getDragonStats(dragon) {
  const dt = DRAGON_TYPES[dragon.type];
  const stage = GROWTH_STAGES[dragon.stageIndex];
  const levelMulti = 1 + (dragon.level - 1) * 0.03;
  const bondMulti = 1 + (dragon.bond || 0) * 0.002;

  return {
    hp:  Math.floor(dt.baseStats.hp  * stage.statMulti * levelMulti * bondMulti),
    atk: Math.floor(dt.baseStats.atk * stage.statMulti * levelMulti * bondMulti),
    def: Math.floor(dt.baseStats.def * stage.statMulti * levelMulti * bondMulti),
    spd: Math.floor(dt.baseStats.spd * stage.statMulti * levelMulti),
  };
}

// ── 드래곤 정보 ──
function getDragonInfo(player, dragonType) {
  if (!player.dragons || !player.dragons[dragonType]) return null;
  const dragon = player.dragons[dragonType];
  const dt = DRAGON_TYPES[dragonType];
  const stage = GROWTH_STAGES[dragon.stageIndex];
  const stats = getDragonStats(dragon);
  const nextStage = dragon.stageIndex < GROWTH_STAGES.length - 1 ? GROWTH_STAGES[dragon.stageIndex + 1] : null;

  return {
    ...dragon,
    typeName: dt.name,
    icon: dt.icon,
    color: dt.color,
    element: dt.element,
    rarity: dt.rarity,
    lore: dt.lore,
    stageName: stage.name,
    stageIcon: stage.icon,
    stageDesc: stage.desc,
    stats,
    breathDesc: dt.breathDesc,
    passiveDesc: dt.passiveDesc,
    nextStage: nextStage ? { name: nextStage.name, level: nextStage.level, feedCount: nextStage.feedCount } : null,
    skills: dragon.skills.map(s => ({ id: s, ...FLIGHT_SKILLS[s] })),
  };
}

// ── 전체 드래곤 목록 ──
function getPlayerDragons(player) {
  if (!player.dragons) return [];
  return Object.keys(player.dragons).map(t => getDragonInfo(player, t)).filter(Boolean);
}

// ── 보너스 집계 연동 ──
function getActiveBonuses(player) {
  if (!player.ridingDragon || !player.dragons) return {};
  const dragon = player.dragons[player.ridingDragon];
  if (!dragon) return {};
  const dt = DRAGON_TYPES[player.ridingDragon];
  if (!dt) return {};
  const stage = GROWTH_STAGES[dragon.stageIndex];
  const bonuses = {};
  for (const [key, val] of Object.entries(dt.passive)) {
    if (typeof val === 'number') {
      bonuses[key] = +(val * stage.statMulti).toFixed(3);
    }
  }
  // 친밀도 보너스 (전체 스탯)
  if (dragon.bond >= 50) bonuses.allStats = +((dragon.bond - 50) * 0.001).toFixed(3);
  return bonuses;
}

module.exports = {
  DRAGON_TYPES, EGG_SOURCES, GROWTH_STAGES, DRAGON_FOOD, FLIGHT_SKILLS,
  DRAGON_RAID_BOSSES, DRAGON_EQUIPMENT,
  init, hatchEgg, feedDragon, mountDragon, dismountDragon,
  useBreath, useFlightSkill, getDragonStats, getDragonInfo, getPlayerDragons,
  getActiveBonuses,
};

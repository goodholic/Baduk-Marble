// ============================================
// IO 클래스 빌드 — 매치 중 레벨업 스킬 선택
// ============================================

// 5 클래스, 각 3개 빌드 경로, 각 5단계 스킬
const IO_CLASS_BUILDS = {
  Warrior: {
    name: '워리어', icon: '⚔️',
    paths: [
      { id: 'berserker', name: '광전사🔥', desc: '공격 특화, HP 낮을수록 강해짐',
        skills: [
          { lv: 1, name: '분노', icon: '💢', effect: { atk: 0.1 }, desc: 'ATK +10%' },
          { lv: 3, name: '광기', icon: '👹', effect: { atk: 0.15, def: -0.05 }, desc: 'ATK +15%, DEF -5%' },
          { lv: 5, name: '피의 갈증', icon: '🩸', effect: { lifesteal: 0.1 }, desc: '흡혈 10%' },
          { lv: 7, name: '불굴', icon: '💪', effect: { lowHpAtk: 0.5 }, desc: 'HP 30% 이하 시 ATK +50%' },
          { lv: 10, name: '궁극: 버서커', icon: '🔥⚔️', effect: { atkMul: 2.0, defMul: 0.5, duration: 10 }, desc: '10초간 ATK 2배, DEF 절반!', ultimate: true },
        ]},
      { id: 'guardian', name: '수호자🛡️', desc: '방어 특화, 아군 보호',
        skills: [
          { lv: 1, name: '강철 피부', icon: '🛡️', effect: { def: 0.15 }, desc: 'DEF +15%' },
          { lv: 3, name: '도발', icon: '😤', effect: { taunt: true, def: 0.1 }, desc: '적 어그로 + DEF +10%' },
          { lv: 5, name: '반격', icon: '⚔️🛡️', effect: { reflect: 0.2 }, desc: '받은 데미지 20% 반사' },
          { lv: 7, name: '불멸', icon: '♾️', effect: { surviveLethal: true }, desc: '치명타 1회 생존 (HP 1)' },
          { lv: 10, name: '궁극: 성벽', icon: '🏰🛡️', effect: { invincible: 5, teamDef: 0.3 }, desc: '5초 무적 + 주변 아군 DEF +30%', ultimate: true },
        ]},
      { id: 'warlord', name: '전쟁군주👑', desc: '균형형, 지휘 시너지',
        skills: [
          { lv: 1, name: '전투 함성', icon: '📢', effect: { teamAtk: 0.05 }, desc: '주변 아군 ATK +5%' },
          { lv: 3, name: '장군의 위엄', icon: '👑', effect: { atk: 0.08, def: 0.08 }, desc: 'ATK/DEF +8%' },
          { lv: 5, name: '전술 지휘', icon: '🗺️', effect: { teamAll: 0.1 }, desc: '주변 아군 전 스탯 +10%' },
          { lv: 7, name: '사기 충전', icon: '⚡', effect: { teamHeal: 0.2, cooldown: 60 }, desc: '아군 HP 20% 회복 (60초 쿨)' },
          { lv: 10, name: '궁극: 대진격', icon: '⚔️👑', effect: { teamAtkMul: 1.5, charge: true, duration: 8 }, desc: '8초간 아군 ATK 1.5배 + 돌진', ultimate: true },
        ]},
    ],
  },
  Assassin: {
    name: '어쌔신', icon: '🗡️',
    paths: [
      { id: 'shadow', name: '그림자🌑', desc: '은신+암살, 크리티컬',
        skills: [
          { lv: 1, name: '은신', icon: '🌑', effect: { stealth: 3 }, desc: '3초 은신' },
          { lv: 3, name: '급소 공격', icon: '🗡️💥', effect: { critRate: 0.15 }, desc: '크리율 +15%' },
          { lv: 5, name: '그림자 밟기', icon: '👤🌑', effect: { teleport: true, backstab: 1.5 }, desc: '적 뒤로 순간이동 + DMG 1.5배' },
          { lv: 7, name: '치명적 독', icon: '☠️', effect: { poisonOnCrit: true, dot: 0.05 }, desc: '크리 시 독 부여 (5%/초)' },
          { lv: 10, name: '궁극: 암살', icon: '💀🗡️', effect: { execute: 0.3 }, desc: 'HP 30% 이하 적 즉사!', ultimate: true },
        ]},
      { id: 'ninja', name: '닌자🥷', desc: '속도+분신, 회피',
        skills: [
          { lv: 1, name: '질풍', icon: '💨', effect: { spd: 0.2 }, desc: 'SPD +20%' },
          { lv: 3, name: '수리검', icon: '🌟', effect: { rangedAtk: true, range: 5 }, desc: '원거리 표창 공격' },
          { lv: 5, name: '분신술', icon: '👥', effect: { clone: 1, cloneDmg: 0.3 }, desc: '분신 1체 소환 (30% DMG)' },
          { lv: 7, name: '잔상', icon: '💨💨', effect: { eva: 0.25 }, desc: '회피율 +25%' },
          { lv: 10, name: '궁극: 천살', icon: '🥷⚔️', effect: { multiHit: 10, eachDmg: 0.3 }, desc: '0.5초간 10회 연속 공격!', ultimate: true },
        ]},
      { id: 'poison', name: '독술사☠️', desc: 'DOT+약화, 지속 데미지',
        skills: [
          { lv: 1, name: '독 바르기', icon: '☠️', effect: { poisonAtk: 0.03 }, desc: '공격 시 독 3%/초' },
          { lv: 3, name: '약화 독', icon: '💀', effect: { weakenOnHit: 0.1 }, desc: '적 DEF -10%' },
          { lv: 5, name: '독안개', icon: '🌫️☠️', effect: { poisonAoe: true, range: 3 }, desc: '주변 적 독 부여' },
          { lv: 7, name: '맹독', icon: '☠️☠️', effect: { poisonDmg: 2.0 }, desc: '독 데미지 2배' },
          { lv: 10, name: '궁극: 역병', icon: '☠️🌍', effect: { plagueAoe: true, spreadOnKill: true }, desc: '전체 독 + 킬 시 전이!', ultimate: true },
        ]},
    ],
  },
  Mage: {
    name: '메이지', icon: '🔮',
    paths: [
      { id: 'fire', name: '화염술사🔥', desc: '화염 AoE, 고데미지',
        skills: [
          { lv: 1, name: '파이어볼', icon: '🔥', effect: { fireDmg: 0.15 }, desc: '화염 DMG +15%' },
          { lv: 3, name: '화염 방벽', icon: '🔥🛡️', effect: { fireShield: true, burnTouch: 0.1 }, desc: '접근 적에게 화상' },
          { lv: 5, name: '화염 폭풍', icon: '🔥🌪️', effect: { fireAoe: true, range: 4 }, desc: '범위 화염 공격' },
          { lv: 7, name: '불의 지배', icon: '🔥👑', effect: { fireMastery: 0.3 }, desc: '화염 DMG +30%' },
          { lv: 10, name: '궁극: 메테오', icon: '☄️💥', effect: { meteorDmg: 5.0, aoeRange: 6 }, desc: '거대 메테오! ATK×5 범위 공격!', ultimate: true },
        ]},
      { id: 'ice', name: '빙결술사❄️', desc: '빙결+둔화, CC 특화',
        skills: [
          { lv: 1, name: '아이스 볼트', icon: '❄️', effect: { iceDmg: 0.1, slow: 0.15 }, desc: '빙 DMG +10%, 둔화 15%' },
          { lv: 3, name: '동결', icon: '❄️🧊', effect: { freezeChance: 0.1 }, desc: '10% 확률 2초 빙결' },
          { lv: 5, name: '빙벽', icon: '🧊🛡️', effect: { iceWall: true }, desc: '빙벽 생성 (5초간 통과 불가)' },
          { lv: 7, name: '절대영도', icon: '❄️💀', effect: { slow: 0.3, iceDmg: 0.2 }, desc: '둔화 30% + 빙 DMG +20%' },
          { lv: 10, name: '궁극: 빙하기', icon: '❄️🌍', effect: { globalFreeze: 3, iceDmg: 3.0 }, desc: '3초간 주변 전체 빙결!', ultimate: true },
        ]},
      { id: 'arcane', name: '비전술사🌀', desc: '순수 마법, 마나 특화',
        skills: [
          { lv: 1, name: '마력 증폭', icon: '🔮', effect: { matk: 0.12 }, desc: '마공 +12%' },
          { lv: 3, name: '마력 방패', icon: '🔰', effect: { manaShield: 0.3 }, desc: '피해 30%를 마나로 흡수' },
          { lv: 5, name: '비전 탄', icon: '🌀', effect: { arcaneMissile: 3 }, desc: '유도 마법탄 3발' },
          { lv: 7, name: '마력 폭주', icon: '🌀💥', effect: { matkMul: 1.5, selfDot: 0.02 }, desc: '마공 1.5배, 자해 2%/초' },
          { lv: 10, name: '궁극: 차원 파괴', icon: '🌀🌟', effect: { dimensionRift: true, trueDmg: 4.0 }, desc: '방무 ATK×4 + 공간 왜곡!', ultimate: true },
        ]},
    ],
  },
  Knight: {
    name: '나이트', icon: '🛡️',
    paths: [
      { id: 'paladin', name: '팔라딘✨', desc: '신성+치유, 서포트 탱커', skills: [
        { lv: 1, name: '신성 오라', icon: '✨', effect: { teamDef: 0.05, teamHpRegen: 0.01 }, desc: '아군 DEF+5%, 재생+1%' },
        { lv: 3, name: '치유의 빛', icon: '💚✨', effect: { heal: 0.15, cooldown: 30 }, desc: '자신 HP 15% 회복' },
        { lv: 5, name: '신성 방패', icon: '🛡️✨', effect: { holyShield: true, blockRate: 0.2 }, desc: '20% 확률 공격 완전 차단' },
        { lv: 7, name: '정화', icon: '✨🌟', effect: { purify: true, removeDebuff: true }, desc: '디버프 전부 해제' },
        { lv: 10, name: '궁극: 대천사', icon: '👼✨', effect: { reviveAll: true, invincible: 3 }, desc: '주변 아군 부활 + 3초 무적', ultimate: true },
      ]},
      { id: 'darkKnight', name: '암흑기사🖤', desc: '희생+흡수, 공격 탱커', skills: [
        { lv: 1, name: '어둠의 힘', icon: '🖤', effect: { atk: 0.1, darkDmg: 0.1 }, desc: 'ATK+10%, 암속성+10%' },
        { lv: 3, name: '생명 흡수', icon: '🩸🖤', effect: { lifesteal: 0.12 }, desc: '흡혈 12%' },
        { lv: 5, name: '공포의 오라', icon: '😱', effect: { fearAoe: true, enemyAtk: -0.1 }, desc: '주변 적 ATK -10%' },
        { lv: 7, name: '영혼 수확', icon: '💀', effect: { killHeal: 0.2 }, desc: '킬 시 HP 20% 회복' },
        { lv: 10, name: '궁극: 암흑 폭발', icon: '🖤💥', effect: { darkExplosion: 4.0, selfDmg: 0.2 }, desc: 'ATK×4 범위 + 자해 20%', ultimate: true },
      ]},
      { id: 'ironwall', name: '철벽🗿', desc: '극 방어, CC 면역', skills: [
        { lv: 1, name: '중갑', icon: '🗿', effect: { def: 0.2, spd: -0.1 }, desc: 'DEF+20%, SPD-10%' },
        { lv: 3, name: 'CC 면역', icon: '🔰', effect: { ccImmune: true }, desc: '상태이상 면역' },
        { lv: 5, name: '가시갑옷', icon: '🌵', effect: { thornsDmg: 0.25 }, desc: '받은 DMG 25% 반사' },
        { lv: 7, name: '대지의 힘', icon: '🗿💪', effect: { hpMul: 1.5 }, desc: 'HP 1.5배' },
        { lv: 10, name: '궁극: 요새', icon: '🏰🗿', effect: { fortress: true, defMul: 3, immobile: 8 }, desc: '8초간 이동불가, DEF 3배!', ultimate: true },
      ]},
    ],
  },
  Cleric: {
    name: '클레릭', icon: '💚',
    paths: [
      { id: 'priest', name: '사제💚', desc: '치유 특화, 팀 서포트', skills: [
        { lv: 1, name: '치유의 손', icon: '💚', effect: { healPow: 0.15 }, desc: '치유력 +15%' },
        { lv: 3, name: '재생 오라', icon: '💚🌀', effect: { teamRegen: 0.02 }, desc: '아군 HP 2%/초 재생' },
        { lv: 5, name: '대치유', icon: '💚💚', effect: { bigHeal: 0.4, cooldown: 45 }, desc: '아군 전원 HP 40% 회복' },
        { lv: 7, name: '부활', icon: '💫', effect: { revive: true, cooldown: 120 }, desc: '아군 1명 부활 (2분 쿨)' },
        { lv: 10, name: '궁극: 성역', icon: '💚✨🌟', effect: { sanctuary: true, healZone: 0.1, duration: 10 }, desc: '10초간 치유 구역 (10%/초)', ultimate: true },
      ]},
      { id: 'warpriest', name: '전투사제⚔️💚', desc: '공격+치유 하이브리드', skills: [
        { lv: 1, name: '신성 타격', icon: '✨⚔️', effect: { holyDmg: 0.1, selfHeal: 0.05 }, desc: '공격 시 자힐 5%' },
        { lv: 3, name: '심판', icon: '⚡', effect: { smite: true, stunChance: 0.1 }, desc: '10% 스턴 + 신성 DMG' },
        { lv: 5, name: '전투 축복', icon: '✨💪', effect: { atk: 0.1, healPow: 0.1 }, desc: 'ATK/치유 +10%' },
        { lv: 7, name: '성전사', icon: '⚔️✨', effect: { holyAtk: 0.2, healOnHit: 0.03 }, desc: '공격 시 3% 치유' },
        { lv: 10, name: '궁극: 천벌', icon: '⚡👑', effect: { divineStrike: 3.0, teamHeal: 0.3 }, desc: 'ATK×3 + 아군 30% 치유', ultimate: true },
      ]},
      { id: 'oracle', name: '예언자🔮💚', desc: '버프+디버프, 전략 서포트', skills: [
        { lv: 1, name: '예지', icon: '🔮', effect: { foresight: true, eva: 0.1 }, desc: '회피 +10%' },
        { lv: 3, name: '축복', icon: '✨', effect: { teamBuff: 0.08 }, desc: '아군 전 스탯 +8%' },
        { lv: 5, name: '저주', icon: '💀🔮', effect: { curseEnemy: 0.15 }, desc: '적 전 스탯 -15%' },
        { lv: 7, name: '운명 조작', icon: '🔮👑', effect: { luckBuff: 0.3, critTeam: 0.1 }, desc: '팀 크리율 +10%' },
        { lv: 10, name: '궁극: 예언', icon: '🔮🌟', effect: { prophecy: true, dodgeAll: 5 }, desc: '5초간 모든 공격 회피!', ultimate: true },
      ]},
    ],
  },
};

// IO 매치 중 레벨업 (EXP 기반)
const IO_LEVEL_TABLE = [
  { level: 1, exp: 0 },
  { level: 2, exp: 100 },
  { level: 3, exp: 250 },
  { level: 4, exp: 500 },
  { level: 5, exp: 800 },
  { level: 6, exp: 1200 },
  { level: 7, exp: 1800 },
  { level: 8, exp: 2500 },
  { level: 9, exp: 3500 },
  { level: 10, exp: 5000 },
];

// EXP sources
const IO_EXP_SOURCES = {
  monsterKill: 20,
  playerKill: 100,
  assist: 30,
  surviveMinute: 10,
  supplyPickup: 15,
  bossKill: 200,
};

/* ── Helper: find class data by name ── */
function _getClassData(className) {
  const cls = IO_CLASS_BUILDS[className];
  if (!cls) return null;
  return cls;
}

/* ── Helper: find path data within a class ── */
function _getPathData(className, pathId) {
  const cls = _getClassData(className);
  if (!cls) return null;
  return cls.paths.find(p => p.id === pathId) || null;
}

/* ── Helper: level from exp ── */
function _levelFromExp(exp) {
  let lv = 1;
  for (const row of IO_LEVEL_TABLE) {
    if (exp >= row.exp) lv = row.level;
    else break;
  }
  return lv;
}

/* ── Helper: exp needed for next level ── */
function _expForNextLevel(currentLevel) {
  const next = IO_LEVEL_TABLE.find(r => r.level === currentLevel + 1);
  return next ? next.exp : null; // null = max level
}

/* ── Helper: pick N random items from array without replacement ── */
function _pickRandom(arr, n) {
  const copy = arr.slice();
  const result = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

// ============================================
// Core API
// ============================================

/**
 * Initialize build state for a new IO match.
 * @param {object} player - Player object (will be mutated to add ioBuild)
 * @param {string} className - One of: Warrior, Assassin, Mage, Knight, Cleric
 * @returns {{ ok: boolean, error?: string }}
 */
function initIOBuild(player, className) {
  const cls = _getClassData(className);
  if (!cls) return { ok: false, error: `Unknown class: ${className}` };

  player.ioBuild = {
    className,
    classIcon: cls.icon,
    level: 1,
    exp: 0,
    pathId: null,          // chosen build path (locked after lv 2)
    chosenSkills: [],      // array of skill objects the player picked
    pendingChoices: null,   // { type: 'path'|'skill', options: [...] } when waiting for player pick
    ultimateUsed: false,
    ultimateCooldownUntil: 0, // timestamp ms
    kills: 0,
    assists: 0,
  };

  return { ok: true, className, classIcon: cls.icon };
}

/**
 * Add EXP from a source. Check for level up.
 * @param {object} player
 * @param {string} source - key from IO_EXP_SOURCES
 * @returns {{ ok, expGained, totalExp, levelUp?, newLevel?, choices? }}
 */
function addIOExp(player, source) {
  const b = player.ioBuild;
  if (!b) return { ok: false, error: 'No IO build initialized' };

  const expAmount = IO_EXP_SOURCES[source];
  if (expAmount == null) return { ok: false, error: `Unknown EXP source: ${source}` };

  b.exp += expAmount;

  // Track kills/assists
  if (source === 'playerKill') b.kills++;
  if (source === 'assist') b.assists++;

  const oldLevel = b.level;
  const newLevel = _levelFromExp(b.exp);

  const result = {
    ok: true,
    expGained: expAmount,
    totalExp: b.exp,
    source,
  };

  if (newLevel > oldLevel) {
    b.level = newLevel;
    result.levelUp = true;
    result.oldLevel = oldLevel;
    result.newLevel = newLevel;
    result.nextLevelExp = _expForNextLevel(newLevel);

    // Generate choices for the player
    const choices = levelUp(player);
    result.choices = choices;
  }

  return result;
}

/**
 * When leveling up, generate skill choices.
 * If path not chosen yet (lv 1-2), offer 3 build paths.
 * If path is chosen, offer 3 skills from that path the player hasn't picked yet.
 * @param {object} player
 * @returns {{ type: 'path'|'skill', options: array }}
 */
function levelUp(player) {
  const b = player.ioBuild;
  if (!b) return { type: 'error', error: 'No IO build' };

  const cls = _getClassData(b.className);
  if (!cls) return { type: 'error', error: 'Bad class' };

  // If no path chosen yet, offer paths
  if (!b.pathId) {
    const pathOptions = cls.paths.map(p => ({
      id: p.id,
      name: p.name,
      desc: p.desc,
      previewSkills: p.skills.map(s => ({ lv: s.lv, name: s.name, icon: s.icon })),
    }));
    b.pendingChoices = { type: 'path', options: pathOptions };
    return b.pendingChoices;
  }

  // Path chosen: offer available skills
  const path = _getPathData(b.className, b.pathId);
  if (!path) return { type: 'error', error: 'Bad path' };

  const chosenIds = new Set(b.chosenSkills.map(s => s.name));

  // Filter skills the player qualifies for (lv <= current) and hasn't picked
  const available = path.skills.filter(s => s.lv <= b.level && !chosenIds.has(s.name));

  if (available.length === 0) {
    // All available skills already picked, no choices to make
    b.pendingChoices = null;
    return { type: 'none', msg: 'All available skills already chosen' };
  }

  // Offer up to 3 choices
  const offered = _pickRandom(available, Math.min(3, available.length));
  b.pendingChoices = {
    type: 'skill',
    options: offered.map((s, i) => ({
      index: i,
      lv: s.lv,
      name: s.name,
      icon: s.icon,
      desc: s.desc,
      effect: s.effect,
      ultimate: !!s.ultimate,
    })),
    _rawSkills: offered, // internal ref for chooseSkill
  };
  return { type: 'skill', options: b.pendingChoices.options };
}

/**
 * Lock in a build path. Can only be done at level 1-2, and only when path choices are pending.
 * @param {object} player
 * @param {string} pathId
 * @returns {{ ok, path?, error? }}
 */
function chooseBuildPath(player, pathId) {
  const b = player.ioBuild;
  if (!b) return { ok: false, error: 'No IO build initialized' };
  if (b.pathId) return { ok: false, error: `Path already chosen: ${b.pathId}` };
  if (b.level > 2) return { ok: false, error: 'Too late to choose path (max lv 2)' };

  if (!b.pendingChoices || b.pendingChoices.type !== 'path') {
    return { ok: false, error: 'No path choice pending' };
  }

  const cls = _getClassData(b.className);
  const path = cls.paths.find(p => p.id === pathId);
  if (!path) return { ok: false, error: `Invalid path: ${pathId}` };

  b.pathId = pathId;
  b.pendingChoices = null;

  // Immediately generate skill choices for the current level
  const choices = levelUp(player);

  return {
    ok: true,
    path: { id: path.id, name: path.name, desc: path.desc },
    nextChoices: choices,
  };
}

/**
 * Pick one of the offered skills on level up.
 * @param {object} player
 * @param {number} skillIndex - 0, 1, or 2
 * @returns {{ ok, skill?, error? }}
 */
function chooseSkill(player, skillIndex) {
  const b = player.ioBuild;
  if (!b) return { ok: false, error: 'No IO build initialized' };
  if (!b.pendingChoices || b.pendingChoices.type !== 'skill') {
    return { ok: false, error: 'No skill choice pending' };
  }

  const raw = b.pendingChoices._rawSkills;
  if (skillIndex < 0 || skillIndex >= raw.length) {
    return { ok: false, error: `Invalid index: ${skillIndex}. Range: 0-${raw.length - 1}` };
  }

  const chosen = raw[skillIndex];
  b.chosenSkills.push(chosen);
  b.pendingChoices = null;

  return {
    ok: true,
    skill: {
      name: chosen.name,
      icon: chosen.icon,
      desc: chosen.desc,
      effect: chosen.effect,
      ultimate: !!chosen.ultimate,
    },
    totalSkills: b.chosenSkills.length,
  };
}

/**
 * Return all chosen skills and their effects.
 * @param {object} player
 * @returns {Array<{ name, icon, desc, effect, ultimate }>}
 */
function getActiveSkills(player) {
  const b = player.ioBuild;
  if (!b) return [];
  return b.chosenSkills.map(s => ({
    name: s.name,
    icon: s.icon,
    desc: s.desc,
    effect: s.effect,
    ultimate: !!s.ultimate,
  }));
}

/**
 * Activate ultimate skill (level 10). One-time use per match with cooldown.
 * @param {object} player
 * @returns {{ ok, ultimate?, error? }}
 */
function useUltimate(player) {
  const b = player.ioBuild;
  if (!b) return { ok: false, error: 'No IO build initialized' };
  if (b.level < 10) return { ok: false, error: `Level 10 required (current: ${b.level})` };

  // Find the ultimate skill among chosen skills
  const ult = b.chosenSkills.find(s => s.ultimate);
  if (!ult) return { ok: false, error: 'No ultimate skill learned yet' };

  const now = Date.now();
  if (b.ultimateCooldownUntil > now) {
    const remaining = Math.ceil((b.ultimateCooldownUntil - now) / 1000);
    return { ok: false, error: `Ultimate on cooldown (${remaining}s remaining)` };
  }

  if (b.ultimateUsed) {
    return { ok: false, error: 'Ultimate already used this match (one-time)' };
  }

  b.ultimateUsed = true;
  // Set cooldown based on duration in effect, default 60s
  const duration = (ult.effect && ult.effect.duration) || 10;
  b.ultimateCooldownUntil = now + duration * 1000;

  return {
    ok: true,
    ultimate: {
      name: ult.name,
      icon: ult.icon,
      desc: ult.desc,
      effect: ult.effect,
      duration,
    },
  };
}

/**
 * Current build state: level, exp, path, skills, ultimate available.
 * @param {object} player
 * @returns {object}
 */
function getIOBuildStatus(player) {
  const b = player.ioBuild;
  if (!b) return { ok: false, error: 'No IO build initialized' };

  const cls = _getClassData(b.className);
  const path = b.pathId ? _getPathData(b.className, b.pathId) : null;
  const nextExp = _expForNextLevel(b.level);
  const now = Date.now();

  return {
    ok: true,
    className: b.className,
    classLocalName: cls ? cls.name : b.className,
    classIcon: b.classIcon,
    level: b.level,
    exp: b.exp,
    nextLevelExp: nextExp,
    expProgress: nextExp ? `${b.exp}/${nextExp}` : 'MAX',
    path: path ? { id: path.id, name: path.name, desc: path.desc } : null,
    skills: getActiveSkills(player),
    skillCount: b.chosenSkills.length,
    ultimateAvailable: b.level >= 10 && !b.ultimateUsed && b.chosenSkills.some(s => s.ultimate),
    ultimateOnCooldown: b.ultimateCooldownUntil > now,
    ultimateCooldownRemaining: b.ultimateCooldownUntil > now ? Math.ceil((b.ultimateCooldownUntil - now) / 1000) : 0,
    pendingChoice: b.pendingChoices ? b.pendingChoices.type : null,
    kills: b.kills,
    assists: b.assists,
    bonuses: calcBuildBonuses(player),
  };
}

/**
 * Aggregate all chosen skill effects into a single bonus object.
 * Numeric values are summed, booleans are OR'd, special keys kept as-is.
 * @param {object} player
 * @returns {object} Merged bonus object
 */
function calcBuildBonuses(player) {
  const b = player.ioBuild;
  if (!b) return {};

  const bonuses = {};

  for (const skill of b.chosenSkills) {
    if (!skill.effect) continue;
    for (const [key, val] of Object.entries(skill.effect)) {
      if (typeof val === 'number') {
        bonuses[key] = (bonuses[key] || 0) + val;
      } else if (typeof val === 'boolean') {
        bonuses[key] = bonuses[key] || val;
      } else {
        // Keep last value for non-numeric/non-boolean
        bonuses[key] = val;
      }
    }
  }

  return bonuses;
}

/**
 * Register socket events for IO build system.
 * Events: io_build_status, io_build_choose_path, io_build_choose_skill,
 *         io_build_ultimate, io_build_add_exp
 * @param {object} io - Socket.IO server
 * @param {object} socket - Individual socket
 * @param {object} player - Player object
 */
function register(io, socket, player) {
  // Get current build status
  socket.on('io_build_status', (_, ack) => {
    const cb = typeof ack === 'function' ? ack : (typeof _ === 'function' ? _ : null);
    const status = getIOBuildStatus(player);
    if (cb) cb(status);
    socket.emit('io_build_status', status);
  });

  // Choose build path (early game)
  socket.on('io_build_choose_path', (data, ack) => {
    const cb = typeof ack === 'function' ? ack : null;
    const { pathId } = data || {};
    if (!pathId) {
      const err = { ok: false, error: 'pathId required' };
      if (cb) cb(err);
      return;
    }
    const result = chooseBuildPath(player, pathId);
    if (cb) cb(result);
    socket.emit('io_build_path_chosen', result);
    if (result.ok) {
      // Broadcast to room that player chose a path
      socket.broadcast.emit('io_build_player_update', {
        playerId: player.id,
        className: player.ioBuild.className,
        path: result.path,
        level: player.ioBuild.level,
      });
    }
  });

  // Choose skill on level up
  socket.on('io_build_choose_skill', (data, ack) => {
    const cb = typeof ack === 'function' ? ack : null;
    const { skillIndex } = data || {};
    if (skillIndex == null) {
      const err = { ok: false, error: 'skillIndex required' };
      if (cb) cb(err);
      return;
    }
    const result = chooseSkill(player, skillIndex);
    if (cb) cb(result);
    socket.emit('io_build_skill_chosen', result);
    if (result.ok) {
      socket.broadcast.emit('io_build_player_update', {
        playerId: player.id,
        className: player.ioBuild.className,
        level: player.ioBuild.level,
        newSkill: result.skill,
      });
    }
  });

  // Use ultimate ability
  socket.on('io_build_ultimate', (_, ack) => {
    const cb = typeof ack === 'function' ? ack : (typeof _ === 'function' ? _ : null);
    const result = useUltimate(player);
    if (cb) cb(result);
    socket.emit('io_build_ultimate_result', result);
    if (result.ok) {
      // Broadcast ultimate usage to all players
      io.emit('io_build_ultimate_used', {
        playerId: player.id,
        className: player.ioBuild.className,
        ultimate: result.ultimate,
      });
    }
  });

  // Add EXP (server-side triggered, but also exposable)
  socket.on('io_build_add_exp', (data, ack) => {
    const cb = typeof ack === 'function' ? ack : null;
    const { source } = data || {};
    if (!source) {
      const err = { ok: false, error: 'source required' };
      if (cb) cb(err);
      return;
    }
    const result = addIOExp(player, source);
    if (cb) cb(result);
    socket.emit('io_build_exp_update', result);
    if (result.levelUp) {
      socket.emit('io_build_level_up', {
        newLevel: result.newLevel,
        choices: result.choices,
      });
      // Broadcast level up to others
      socket.broadcast.emit('io_build_player_update', {
        playerId: player.id,
        className: player.ioBuild.className,
        level: result.newLevel,
      });
    }
  });
}

// ============================================
// Exports
// ============================================
module.exports = {
  IO_CLASS_BUILDS,
  IO_LEVEL_TABLE,
  IO_EXP_SOURCES,
  initIOBuild,
  addIOExp,
  levelUp,
  chooseBuildPath,
  chooseSkill,
  getActiveSkills,
  useUltimate,
  getIOBuildStatus,
  calcBuildBonuses,
  register,
};

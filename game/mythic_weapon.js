// ==========================================
// 신화 무기 각성 (Mythic Weapon Soul) — v2.53
// 전설 무기에 영혼이 깃들어 성장 + 대화 + 스킬 해금
// ==========================================

// ── 신화 무기 영혼 8종 ──
const WEAPON_SOULS = {
  excalibur: {
    name: '엑스칼리버', icon: '⚔️✨', element: 'holy', color: '#ffd700',
    personality: '고결', desc: '성스러운 빛의 검. 정의를 수호하는 왕의 검.',
    dialogues: {
      greeting: '"나는 엑스칼리버. 정의의 검이 너를 선택했다."',
      battle: ['"빛이여, 적을 심판하라!"', '"왕의 검은 물러서지 않는다!"', '"정의는 반드시 승리한다!"'],
      levelUp: '"좋아, 네 안에서 빛이 더 강해지고 있다."',
      maxLevel: '"우리는 하나가 되었다. 이제 누구도 막을 수 없다."',
    },
    baseStats: { atk: 50, def: 20 },
    perLevelBonus: { atk: 12, def: 4 },
    skills: [
      { bond: 20,  name: '성광 일섬', desc: 'ATK 5배 신성 데미지 (방어 30% 무시)', dmgMulti: 5.0, ignoreDefPct: 0.3, cd: 15 },
      { bond: 50,  name: '엑스칼리버 오라', desc: '주변 아군 ATK +20% (15초)', buff: { allyAtkMulti: 0.2 }, duration: 15, cd: 40 },
      { bond: 100, name: '약속된 승리의 검', desc: '**ATK 20배** 성광 폭발 (광역 10)', dmgMulti: 20.0, aoe: true, range: 10, holyDmg: true, cd: 120 },
    ],
    awakenCost: { gold: 100000, mat_dragon: 10, mat_soul: 10 },
  },
  muramasa: {
    name: '무라마사', icon: '🗡️🩸', element: 'dark', color: '#cc0000',
    personality: '광기', desc: '피에 굶주린 요도. 주인의 생명을 갉아먹는다.',
    dialogues: {
      greeting: '"크크크... 피... 더 많은 피를 원한다..."',
      battle: ['"죽여라... 더 죽여라!"', '"피의 향연이 시작된다!"', '"네 피도... 맛있겠군..."'],
      levelUp: '"좋아... 더 강해지고 있어... 더 많이 죽일 수 있겠군."',
      maxLevel: '"완벽하다... 이제 우리는 최강의 살인마다."',
    },
    baseStats: { atk: 80, def: -10 },
    perLevelBonus: { atk: 18, crit: 2 },
    skills: [
      { bond: 20,  name: '피의 일섬', desc: '크리 100% + ATK 6배 (자신 HP -5%)', dmgMulti: 6.0, critGuarantee: true, selfDmgPct: 0.05, cd: 12 },
      { bond: 50,  name: '살의', desc: '15초간 ATK +50%, 흡혈 +15%', buff: { atkMulti: 0.5, lifesteal: 0.15 }, duration: 15, cd: 45 },
      { bond: 100, name: '요도 해방', desc: '**ATK 25배** (HP 20% 소모, 적 즉사 확률 10%)', dmgMulti: 25.0, selfHpCost: 0.2, instantKill: 0.1, cd: 150 },
    ],
    awakenCost: { gold: 100000, mat_soul: 15, mut_blood_gem: 3 },
  },
  aegis: {
    name: '아이기스', icon: '🛡️⚡', element: 'thunder', color: '#44aaff',
    personality: '수호', desc: '신의 방패. 주인을 절대적으로 수호한다.',
    dialogues: {
      greeting: '"나는 아이기스, 신의 방패. 너를 지키겠다."',
      battle: ['"내 뒤에 서라!"', '"이 방패는 깨지지 않는다!"', '"번개의 심판을 받아라!"'],
      levelUp: '"더 단단해지고 있다. 어떤 공격도 막아내겠다."',
      maxLevel: '"완벽한 수호. 이제 너에게 닿을 공격은 없다."',
    },
    baseStats: { atk: 20, def: 60 },
    perLevelBonus: { def: 12, maxHp: 40 },
    skills: [
      { bond: 20,  name: '번개 방벽', desc: '5초 무적 + 반격 번개', invincible: 5, counterDmg: 3.0, cd: 30 },
      { bond: 50,  name: '수호의 서약', desc: 'DEF +60%, 피해 40% 감소 (12초)', buff: { defMulti: 0.6, dmgReduce: 0.4 }, duration: 12, cd: 40 },
      { bond: 100, name: '절대 방어', desc: '10초 무적 + 주변 아군 보호막 (HP 30%)', invincible: 10, allyShield: 0.3, range: 8, cd: 180 },
    ],
    awakenCost: { gold: 100000, mat_dragon: 10, mut_thunder_core: 5 },
  },
  yggdrasil_staff: {
    name: '이그드라실 지팡이', icon: '🌳🪄', element: 'nature', color: '#44ff44',
    personality: '자비', desc: '세계수의 가지로 만든 지팡이. 생명을 다스린다.',
    dialogues: {
      greeting: '"나는 세계수의 의지. 생명의 흐름을 느낄 수 있니?"',
      battle: ['"자연의 분노를 느껴라!"', '"대지여, 힘을 빌려다오."', '"치유의 바람이여!"'],
      levelUp: '"세계수의 뿌리가 더 깊어지고 있어."',
      maxLevel: '"세계수와 하나가 되었다. 생과 사를 관장하리라."',
    },
    baseStats: { atk: 30, def: 30 },
    perLevelBonus: { atk: 6, healBonus: 0.04, mp: 10 },
    skills: [
      { bond: 20,  name: '생명의 씨앗', desc: '자신+주변 아군 HP 25% 회복', healPct: 0.25, range: 6, cd: 18 },
      { bond: 50,  name: '세계수의 가호', desc: '20초간 HP 리젠 +5%, 디버프 면역', buff: { hpRegen: 0.05, debuffImmune: true }, duration: 20, cd: 50 },
      { bond: 100, name: '세계수의 기적', desc: '아군 전원 **완전 회복 + 사망자 부활** + 15초 리젠', healAll: true, revive: true, regenDuration: 15, range: 12, cd: 200 },
    ],
    awakenCost: { gold: 100000, mat_soul: 15, mut_life_crystal: 5 },
  },
  gungnir: {
    name: '궁니르', icon: '🔱💫', element: 'wind', color: '#88ccff',
    personality: '지혜', desc: '오딘의 창. 던지면 반드시 명중한다.',
    dialogues: {
      greeting: '"나는 궁니르. 절대 빗나가지 않는 창이다."',
      battle: ['"표적 포착... 발사!"', '"바람이여, 길을 열어라!"', '"한 번의 일격으로 끝낸다!"'],
      levelUp: '"바람의 정밀도가 더 높아지고 있다."',
      maxLevel: '"만물을 꿰뚫는 궁극의 창. 피할 수 있는 것은 없다."',
    },
    baseStats: { atk: 60, def: 10 },
    perLevelBonus: { atk: 14, spd: 2 },
    skills: [
      { bond: 20,  name: '필중', desc: '회피 무시 ATK 7배 (단일)', dmgMulti: 7.0, ignoreEvasion: true, cd: 15 },
      { bond: 50,  name: '폭풍 투창', desc: '관통 투사체 (ATK 5배, 직선 모든 적)', dmgMulti: 5.0, pierce: true, range: 12, cd: 25 },
      { bond: 100, name: '오딘의 심판', desc: '하늘에서 **무수한 창** 낙하 (ATK 15배 광역 12)', dmgMulti: 15.0, aoe: true, range: 12, cd: 120 },
    ],
    awakenCost: { gold: 100000, mat_dragon: 12, mut_void_core: 3 },
  },
  pandora: {
    name: '판도라의 상자', icon: '📦🌀', element: 'chaos', color: '#ff44ff',
    personality: '장난', desc: '열면 무엇이 나올지 모르는 혼돈의 무기.',
    dialogues: {
      greeting: '"히히! 나를 열어볼 용기가 있어~?"',
      battle: ['"오늘은 뭐가 나올까~?"', '"깜짝이야~! 놀랐지?"', '"혼돈이 좋아~! 히히!"'],
      levelUp: '"우와~ 점점 더 재밌어지고 있어!"',
      maxLevel: '"이제 완전한 혼돈이야! 무엇이든 가능해~!"',
    },
    baseStats: { atk: 45, def: 15 },
    perLevelBonus: { atk: 10, crit: 3 },
    skills: [
      { bond: 20,  name: '랜덤 선물', desc: '랜덤 효과 (데미지/힐/버프/디버프 중 1)', random: true, cd: 10 },
      { bond: 50,  name: '혼돈의 주사위', desc: '1~6배 랜덤 데미지 (6이면 20배!)', randomMulti: { min: 1, max: 6, jackpot: 20 }, cd: 20 },
      { bond: 100, name: '판도라 해방', desc: '랜덤 **3~5가지 효과** 동시 발동 (극강~재앙)', randomEffects: { min: 3, max: 5 }, cd: 120 },
    ],
    awakenCost: { gold: 80000, mut_chaos_orb: 3, mat_soul: 10 },
  },
  frostmourne: {
    name: '서리한', icon: '❄️💀', element: 'ice', color: '#88ddff',
    personality: '냉혹', desc: '얼어붙은 영혼을 가두는 죽음의 검.',
    dialogues: {
      greeting: '"...고요하다. 네 영혼도 곧 이 안에 갇히겠지."',
      battle: ['"얼어붙어라."', '"...죽음은 고요하다."', '"영원한 겨울이 온다."'],
      levelUp: '"...서리가 더 깊어진다."',
      maxLevel: '"영원한 겨울. 이제 모든 것이 멈춘다."',
    },
    baseStats: { atk: 65, def: 15 },
    perLevelBonus: { atk: 15, lifesteal: 0.02 },
    skills: [
      { bond: 20,  name: '서리 일격', desc: 'ATK 5배 + 빙결 3초', dmgMulti: 5.0, freeze: 3, cd: 14 },
      { bond: 50,  name: '영혼 수확', desc: '적 처치 시 영구 ATK +2 (최대 +40)', killAtkBonus: 2, maxBonus: 40, cd: 0 },
      { bond: 100, name: '영원한 겨울', desc: '범위 10 **전원 빙결 6초** + ATK 12배', dmgMulti: 12.0, aoe: true, range: 10, freezeAll: 6, cd: 150 },
    ],
    awakenCost: { gold: 120000, mut_frost_core: 5, mat_soul: 10 },
  },
  mjolnir: {
    name: '묠니르', icon: '🔨⚡', element: 'thunder', color: '#ffdd00',
    personality: '호쾌', desc: '천둥의 신의 망치. 던지면 반드시 돌아온다.',
    dialogues: {
      greeting: '"하하! 나를 들 수 있다면 자격이 있는 거다!"',
      battle: ['"천둥이다!"', '"하하하! 부숴버려!"', '"번개를 맞아라!"'],
      levelUp: '"하하! 더 무거워졌다! 그만큼 강해졌다는 뜻이지!"',
      maxLevel: '"천둥신의 힘이 완성됐다! 가자, 전장으로!"',
    },
    baseStats: { atk: 55, def: 25 },
    perLevelBonus: { atk: 13, def: 5 },
    skills: [
      { bond: 20,  name: '망치 투척', desc: '투척 후 귀환 (ATK 4배 x2)', dmgMulti: 4.0, hits: 2, range: 8, cd: 12 },
      { bond: 50,  name: '번개 소환', desc: '광역 낙뢰 (ATK 6배 + 기절 3초)', dmgMulti: 6.0, aoe: true, range: 7, stun: 3, cd: 30 },
      { bond: 100, name: '라그나로크', desc: '**천상의 번개 폭풍** (ATK 18배 범위 12 + 5초 마비)', dmgMulti: 18.0, aoe: true, range: 12, stun: 5, cd: 150 },
    ],
    awakenCost: { gold: 120000, mut_thunder_core: 5, mat_dragon: 8 },
  },
};

// ── 친밀도(Bond) 등급 ──
const BOND_RANKS = [
  { bond: 0,   name: '낯선 사이', icon: '❓', multi: 1.0 },
  { bond: 20,  name: '인식', icon: '👋', multi: 1.1 },
  { bond: 50,  name: '신뢰', icon: '🤝', multi: 1.25 },
  { bond: 80,  name: '유대', icon: '💪', multi: 1.4 },
  { bond: 100, name: '혼연일체', icon: '❤️‍🔥', multi: 1.6 },
];

function _ensure(player) {
  if (!player._mythicWeapon) {
    player._mythicWeapon = {
      weapon: null,         // 선택한 무기 ID
      bond: 0,              // 친밀도 (0~100)
      level: 1,             // 무기 레벨 (1~10)
      exp: 0,
      awakened: false,
      killBonusStacks: 0,   // 서리한 전용
      lastDialogue: null,
    };
  }
  return player._mythicWeapon;
}

function _getBondRank(bond) {
  for (let i = BOND_RANKS.length - 1; i >= 0; i--) {
    if (bond >= BOND_RANKS[i].bond) return BOND_RANKS[i];
  }
  return BOND_RANKS[0];
}

// ── 무기 각성 (선택) ──
function awakenWeapon(player, weaponId) {
  const mw = _ensure(player);
  if (!WEAPON_SOULS[weaponId]) return { success: false, msg: '알 수 없는 무기' };
  if (mw.weapon) return { success: false, msg: `이미 ${WEAPON_SOULS[mw.weapon].name}을(를) 각성했습니다` };

  const weapon = WEAPON_SOULS[weaponId];
  const cost = weapon.awakenCost;
  if ((player.gold || 0) < cost.gold) return { success: false, msg: `골드 부족 (${cost.gold}G)` };
  for (const [item, count] of Object.entries(cost)) {
    if (item === 'gold') continue;
    if (!player.inventory?.[item] || player.inventory[item] < count) return { success: false, msg: `재료 부족: ${item} x${count}` };
  }

  player.gold -= cost.gold;
  for (const [item, count] of Object.entries(cost)) {
    if (item === 'gold') continue;
    player.inventory[item] -= count;
    if (player.inventory[item] <= 0) delete player.inventory[item];
  }

  mw.weapon = weaponId;
  mw.awakened = true;
  mw.bond = 0;
  mw.level = 1;
  mw.exp = 0;

  return {
    success: true, weapon,
    dialogue: weapon.dialogues.greeting,
    msg: `${weapon.icon} ${weapon.name} 각성! — ${weapon.dialogues.greeting}`,
  };
}

// ── 전투 시 친밀도/경험치 획득 ──
function onCombat(player, monsterTier) {
  const mw = _ensure(player);
  if (!mw.weapon) return null;

  const expGain = { normal: 1, elite: 3, rare: 5, boss: 10, legendary: 20, worldboss: 50 };
  const bondGain = { normal: 0, elite: 1, rare: 1, boss: 2, legendary: 3, worldboss: 5 };

  mw.exp += expGain[monsterTier] || 1;
  mw.bond = Math.min(100, mw.bond + (bondGain[monsterTier] || 0));

  // 레벨업 체크
  const expTable = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500];
  let leveledUp = false;
  while (mw.level < 10 && mw.exp >= expTable[mw.level]) {
    mw.exp -= expTable[mw.level];
    mw.level++;
    leveledUp = true;
  }

  const weapon = WEAPON_SOULS[mw.weapon];

  // 랜덤 전투 대사 (5% 확률)
  let dialogue = null;
  if (Math.random() < 0.05 && weapon.dialogues.battle) {
    dialogue = weapon.dialogues.battle[Math.floor(Math.random() * weapon.dialogues.battle.length)];
  }
  if (leveledUp) {
    dialogue = mw.level >= 10 ? weapon.dialogues.maxLevel : weapon.dialogues.levelUp;
  }

  return { leveledUp, level: mw.level, bond: mw.bond, dialogue };
}

// ── 대화 (친밀도 +3) ──
function talk(player) {
  const mw = _ensure(player);
  if (!mw.weapon) return { success: false, msg: '각성한 무기가 없습니다' };

  mw.bond = Math.min(100, mw.bond + 3);
  const weapon = WEAPON_SOULS[mw.weapon];
  const rank = _getBondRank(mw.bond);

  // 친밀도 기반 대사
  const dialogues = [
    weapon.dialogues.greeting,
    ...weapon.dialogues.battle,
    weapon.dialogues.levelUp,
  ];
  const line = dialogues[Math.floor(Math.random() * dialogues.length)];

  return { success: true, dialogue: line, bond: mw.bond, rank, msg: `${weapon.icon} ${line} (친밀도 +3)` };
}

// ── 패시브 보너스 ──
function getPassiveBonuses(player) {
  const mw = _ensure(player);
  if (!mw.weapon) return {};

  const weapon = WEAPON_SOULS[mw.weapon];
  const rank = _getBondRank(mw.bond);
  const bonuses = {};

  // 기본 스탯 + 레벨 보너스 * 친밀도 배율
  for (const [stat, val] of Object.entries(weapon.baseStats)) {
    bonuses[stat] = Math.floor(val * rank.multi);
  }
  for (const [stat, val] of Object.entries(weapon.perLevelBonus)) {
    bonuses[stat] = (bonuses[stat] || 0) + Math.floor(val * mw.level * rank.multi);
  }

  // 서리한 킬 스택
  if (mw.weapon === 'frostmourne' && mw.killBonusStacks > 0) {
    bonuses.atk = (bonuses.atk || 0) + mw.killBonusStacks;
  }

  return bonuses;
}

// ── 상태 조회 ──
function getStatus(player) {
  const mw = _ensure(player);

  if (!mw.weapon) {
    return {
      hasWeapon: false,
      available: Object.entries(WEAPON_SOULS).map(([id, w]) => ({
        id, name: w.name, icon: w.icon, element: w.element, color: w.color,
        personality: w.personality, desc: w.desc, lore: w.dialogues.greeting,
        baseStats: w.baseStats, cost: w.awakenCost,
      })),
    };
  }

  const weapon = WEAPON_SOULS[mw.weapon];
  const rank = _getBondRank(mw.bond);
  const expTable = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500];

  return {
    hasWeapon: true,
    weaponId: mw.weapon,
    name: weapon.name, icon: weapon.icon, element: weapon.element, color: weapon.color,
    personality: weapon.personality, desc: weapon.desc,
    level: mw.level, exp: mw.exp, nextExp: expTable[mw.level] || 999,
    bond: mw.bond, bondRank: rank,
    statMulti: rank.multi,
    skills: weapon.skills.map(sk => ({
      ...sk, unlocked: mw.bond >= sk.bond,
    })),
    passives: getPassiveBonuses(player),
    killStacks: mw.weapon === 'frostmourne' ? mw.killBonusStacks : undefined,
  };
}

module.exports = {
  WEAPON_SOULS, BOND_RANKS,
  awakenWeapon, onCombat, talk, getPassiveBonuses, getStatus,
};

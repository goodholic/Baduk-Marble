// 서바이벌 IO 모드 — v2.60
// 매판 리셋, 웨이브 생존, 레벨업 업그레이드 선택
// Vampire Survivors + .io 스타일

const SURVIVAL_CONFIG = {
  startHp: 100,
  startAtk: 10,
  startDef: 3,
  startSpeed: 8,
  expPerKill: 10,
  expScaling: 1.15,
  waveInterval: 20,
  maxWave: 30,
  monsterScaling: { hpMult: 1.12, atkMult: 1.10, countAdd: 1 },
  bossEveryWave: 5,
};

// ═══ RPG 클래스별 시작 스탯 + 고유 패시브 ═══
const CLASS_PRESETS = {
  Warrior:  { hp: 130, atk: 12, def: 6, critRate: 8,  dodge: 3,  passive: 'rage',       passiveDesc: '분노: HP 30% 이하 시 ATK 2배', icon: '⚔️' },
  Assassin: { hp: 80,  atk: 15, def: 2, critRate: 20, dodge: 15, passive: 'stealth',    passiveDesc: '은신: 3킬마다 다음 공격 3배', icon: '🗡️' },
  Knight:   { hp: 180, atk: 8,  def: 10,critRate: 5,  dodge: 2,  passive: 'fortify',    passiveDesc: '요새화: DEF가 ATK에 30% 추가', icon: '🛡️' },
  Mage:     { hp: 70,  atk: 18, def: 2, critRate: 12, dodge: 5,  passive: 'arcane',     passiveDesc: '마력 폭발: 5킬마다 전체 데미지', icon: '🔮' },
  Cleric:   { hp: 110, atk: 9,  def: 5, critRate: 6,  dodge: 4,  passive: 'holy_aura',  passiveDesc: '신성 오라: 초당 HP 3% 회복', icon: '✨' },
};

// ═══ 장비 드롭 (웨이브 중 랜덤) ═══
const SURVIVAL_DROPS = [
  { id: 'drop_sword',    name: '낡은 검',       icon: '🗡️', grade: 'normal',   weight: 30, effect: { atk: 3 } },
  { id: 'drop_shield',   name: '나무 방패',     icon: '🛡️', grade: 'normal',   weight: 25, effect: { def: 3 } },
  { id: 'drop_ring',     name: '마력 반지',     icon: '💍', grade: 'uncommon', weight: 15, effect: { critRate: 4, atk: 2 } },
  { id: 'drop_armor',    name: '강철 갑옷',     icon: '🦺', grade: 'uncommon', weight: 15, effect: { def: 5, maxHp: 20 } },
  { id: 'drop_boots',    name: '바람의 장화',   icon: '👢', grade: 'rare',     weight: 8,  effect: { dodge: 6, speed: 2 } },
  { id: 'drop_amulet',   name: '흡혈의 부적',   icon: '📿', grade: 'rare',     weight: 8,  effect: { lifesteal: 5, atk: 4 } },
  { id: 'drop_crown',    name: '왕의 왕관',     icon: '👑', grade: 'epic',     weight: 3,  effect: { atk: 10, def: 5, maxHp: 50 } },
  { id: 'drop_excalibur',name: '엑스칼리버',    icon: '⚔️', grade: 'legendary',weight: 1,  effect: { atk: 25, critRate: 10 } },
];

// ═══ 스킬 (레벨 5/10/15에 해금) ═══
const SURVIVAL_SKILLS = {
  Warrior: [
    { lv: 5,  id: 'whirlwind',  name: '회전 베기',   icon: '🌪️', desc: '주변 전체 ATK×2', cooldown: 15 },
    { lv: 10, id: 'warcry',     name: '전투 함성',   icon: '📯', desc: 'ATK +50% (10초)', cooldown: 30 },
    { lv: 15, id: 'berserk',    name: '광전사',      icon: '😤', desc: 'ATK 3배, DEF 0 (8초)', cooldown: 45 },
  ],
  Assassin: [
    { lv: 5,  id: 'backstab',   name: '급소 공격',   icon: '🎯', desc: '확정 크리티컬 ×3', cooldown: 12 },
    { lv: 10, id: 'smokescreen', name: '연막탄',     icon: '💨', desc: '5초 무적', cooldown: 30 },
    { lv: 15, id: 'deathmark',  name: '죽음의 표식', icon: '💀', desc: '타겟 즉사 (보스: 20% HP)', cooldown: 45 },
  ],
  Knight: [
    { lv: 5,  id: 'shieldbash', name: '방패 강타',   icon: '🛡️', desc: '스턴 + ATK×2', cooldown: 12 },
    { lv: 10, id: 'bulwark',    name: '철벽',        icon: '🏰', desc: 'DEF 3배 (8초)', cooldown: 25 },
    { lv: 15, id: 'holy_shield',name: '신성 방벽',   icon: '✝️', desc: '10초 무적 + HP 50% 회복', cooldown: 50 },
  ],
  Mage: [
    { lv: 5,  id: 'fireball',   name: '파이어볼',    icon: '🔥', desc: 'ATK×3 + 화상 DOT', cooldown: 10 },
    { lv: 10, id: 'blizzard',   name: '블리자드',    icon: '❄️', desc: '전체 빙결 3초 + 데미지', cooldown: 25 },
    { lv: 15, id: 'meteor',     name: '메테오',      icon: '☄️', desc: 'ATK×10 광역', cooldown: 45 },
  ],
  Cleric: [
    { lv: 5,  id: 'heal',       name: '치유',        icon: '💚', desc: 'HP 40% 회복', cooldown: 15 },
    { lv: 10, id: 'smite',      name: '천벌',        icon: '⚡', desc: 'ATK×4 신성 데미지', cooldown: 20 },
    { lv: 15, id: 'resurrection',name: '부활',       icon: '👼', desc: '사망 시 자동 부활 (1회)', cooldown: 60 },
  ],
};

// 레벨업 시 선택 가능한 업그레이드
const UPGRADES = [
  // 공격
  { id: 'atk_1', name: 'ATK +5', icon: '⚔️', cat: 'atk', effect: { atk: 5 }, weight: 20 },
  { id: 'atk_2', name: 'ATK +12', icon: '⚔️', cat: 'atk', effect: { atk: 12 }, weight: 8, minLv: 5 },
  { id: 'crit_1', name: 'CRIT +5%', icon: '💥', cat: 'atk', effect: { critRate: 5 }, weight: 15 },
  { id: 'crit_2', name: 'CRIT +12%', icon: '💥', cat: 'atk', effect: { critRate: 12 }, weight: 5, minLv: 8 },
  { id: 'aspd_1', name: '공속 +15%', icon: '⚡', cat: 'atk', effect: { atkSpeed: 15 }, weight: 12 },
  { id: 'multi', name: '멀티샷', icon: '🔱', cat: 'atk', effect: { multishot: 1 }, weight: 4, minLv: 10 },
  { id: 'pierce', name: '관통', icon: '🏹', cat: 'atk', effect: { pierce: true }, weight: 5, minLv: 7 },

  // 방어/생존
  { id: 'hp_1', name: 'HP +30', icon: '❤️', cat: 'def', effect: { maxHp: 30 }, weight: 18 },
  { id: 'hp_2', name: 'HP +80', icon: '❤️', cat: 'def', effect: { maxHp: 80 }, weight: 6, minLv: 5 },
  { id: 'def_1', name: 'DEF +4', icon: '🛡️', cat: 'def', effect: { def: 4 }, weight: 15 },
  { id: 'regen', name: 'HP 재생 +2/초', icon: '💚', cat: 'def', effect: { hpRegen: 2 }, weight: 12 },
  { id: 'dodge', name: '회피 +8%', icon: '💨', cat: 'def', effect: { dodge: 8 }, weight: 10 },
  { id: 'shield', name: '보호막 50', icon: '🔮', cat: 'def', effect: { shield: 50 }, weight: 5, minLv: 6 },
  { id: 'lifesteal', name: '흡혈 +8%', icon: '🩸', cat: 'def', effect: { lifesteal: 8 }, weight: 7, minLv: 5 },

  // 특수
  { id: 'magnet', name: '자석 (경험치 흡수 범위↑)', icon: '🧲', cat: 'util', effect: { magnet: 30 }, weight: 10 },
  { id: 'gold_1', name: '골드 보너스 +20%', icon: '💰', cat: 'util', effect: { goldBonus: 20 }, weight: 8 },
  { id: 'bomb', name: '화면 폭탄 (즉시)', icon: '💣', cat: 'util', effect: { bomb: true }, weight: 6, minLv: 3 },
  { id: 'freeze', name: '전체 빙결 3초', icon: '❄️', cat: 'util', effect: { freezeAll: 3 }, weight: 4, minLv: 8 },

  // 궁극 (매우 희귀)
  { id: 'ult_fire', name: '화염 오라', icon: '🔥', cat: 'ult', effect: { fireAura: 5 }, weight: 2, minLv: 12 },
  { id: 'ult_thunder', name: '낙뢰', icon: '⚡', cat: 'ult', effect: { thunderStrike: 30 }, weight: 2, minLv: 15 },
  { id: 'ult_revive', name: '부활 1회', icon: '👼', cat: 'ult', effect: { revive: 1 }, weight: 1, minLv: 10 },
];

// ═══ v3.0: SLG → IO 보너스 적용 ═══
function applySLGBonus(player, session) {
  // 1. 용병 파티 → 스탯 보너스
  let mercSystem;
  try { mercSystem = require('./mercenary_system'); } catch(e) { return; }

  const mercs = mercSystem.getPlayerMercs(player);
  const party = mercs.roster.filter(m => mercs.party.includes(m.uid));

  if (party.length > 0) {
    let mercAtk = 0, mercDef = 0, mercHp = 0;
    const mercIcons = [];
    for (const m of party) {
      mercAtk += Math.floor(m.atk * 0.3);  // 용병 ATK의 30%
      mercDef += Math.floor(m.def * 0.2);   // 용병 DEF의 20%
      mercHp += Math.floor(m.hp * 0.2);     // 용병 HP의 20%
      mercIcons.push(m.icon);
    }
    session.atk += mercAtk;
    session.def += mercDef;
    session.maxHp += mercHp;
    session.hp += mercHp;
    session._mercBonus = { atk: mercAtk, def: mercDef, hp: mercHp, icons: mercIcons.join(''), count: party.length };
  }

  // 2. 성 시설 → 시작 보너스
  const castle = player._castle;
  if (castle && castle.buildings) {
    for (const b of castle.buildings) {
      if (b === 'barracks') session._mercBonus = session._mercBonus || {}; // 병영: 용병 슬롯 (이미 반영)
      if (b === 'smithy') session.atk += Math.floor(session.atk * 0.1);   // 대장간: 무기DMG +10%
      if (b === 'temple') session.maxHp += Math.floor(session.maxHp * 0.1); // 신전: HP +10%
    }
  }

  // 3. 전투력 기반 추가 보너스
  if (session._mercBonus) {
    const totalPower = party.reduce((s, m) => s + mercSystem.calcCombatPower(m), 0);
    const atkBonus = Math.floor(totalPower / 1000) * 5; // 전투력 1000당 ATK +5
    session.atk += atkBonus;
    session._mercBonus.powerBonus = atkBonus;
    session._mercBonus.totalPower = totalPower;
  }
}

// ═══ 서바이벌 세션 ═══
const activeSessions = {};

function startSurvival(playerId, playerName, className) {
  if (activeSessions[playerId]) return { success: false, msg: '이미 진행 중' };

  const cls = CLASS_PRESETS[className] || CLASS_PRESETS.Warrior;
  const clsName = className || 'Warrior';

  activeSessions[playerId] = {
    playerId,
    playerName,
    className: clsName,
    classIcon: cls.icon,
    passive: cls.passive,
    passiveDesc: cls.passiveDesc,
    level: 1,
    exp: 0,
    expToNext: 30,
    wave: 0,
    kills: 0,
    gold: 0,
    time: 0,
    alive: true,

    // 클래스별 시작 스탯
    hp: cls.hp,
    maxHp: cls.hp,
    atk: cls.atk,
    def: cls.def,
    speed: SURVIVAL_CONFIG.startSpeed,
    critRate: cls.critRate,
    dodge: cls.dodge,
    hpRegen: cls.passive === 'holy_aura' ? 3 : 0,
    lifesteal: 0,
    atkSpeed: 100,
    multishot: 0,
    pierce: false,
    shield: 0,
    fireAura: 0,
    thunderStrike: 0,
    revive: 0,
    magnet: 0,
    goldBonus: 0,

    // RPG 요소
    equipment: [],     // 장착 장비
    skills: [],        // 해금된 스킬
    skillCooldowns: {},
    stealthNextHit: 0, // 어쌔신 은신 카운터
    arcaneCounter: 0,  // 메이지 마력 폭발 카운터

    upgrades: [],
    startTime: Date.now(),
    lastWaveTime: Date.now(),
    pendingLevelUp: false,
    monstersAlive: 0,
  };

  // 스킬 해금 체크 (Lv1이므로 없음)
  return {
    success: true,
    session: getSessionStatus(playerId),
    classInfo: { name: clsName, icon: cls.icon, passive: cls.passiveDesc },
    availableClasses: Object.entries(CLASS_PRESETS).map(([id, c]) => ({ id, icon: c.icon, passive: c.passiveDesc })),
  };
}

function tickSurvival(playerId) {
  const s = activeSessions[playerId];
  if (!s || !s.alive) return null;

  s.time = Math.floor((Date.now() - s.startTime) / 1000);

  // HP 재생
  if (s.hpRegen > 0) s.hp = Math.min(s.maxHp, s.hp + s.hpRegen);

  // 화염 오라 데미지 (주변 적 자동 처리)
  let auraKills = 0;
  if (s.fireAura > 0) {
    auraKills = Math.floor(Math.random() * 2); // 0~1 자동 킬
  }

  // 낙뢰
  let thunderKills = 0;
  if (s.thunderStrike > 0 && Math.random() < 0.15) {
    thunderKills = 1;
  }

  // 자동 킬 처리
  const autoKills = auraKills + thunderKills;
  for (let i = 0; i < autoKills; i++) processKill(s);

  // 웨이브 체크
  const timeSinceWave = (Date.now() - s.lastWaveTime) / 1000;
  let newWave = null;
  if (timeSinceWave >= SURVIVAL_CONFIG.waveInterval && s.wave < SURVIVAL_CONFIG.maxWave) {
    s.wave++;
    s.lastWaveTime = Date.now();
    const isBoss = s.wave % SURVIVAL_CONFIG.bossEveryWave === 0;
    const monsterCount = 3 + s.wave + (isBoss ? 0 : Math.floor(s.wave / 3));
    s.monstersAlive += monsterCount;

    newWave = {
      wave: s.wave,
      isBoss,
      monsterCount,
      bossName: isBoss ? getWaveBossName(s.wave) : null,
    };
  }

  return { session: getSessionStatus(playerId), newWave };
}

function processKill(s) {
  s.kills++;
  s.monstersAlive = Math.max(0, s.monstersAlive - 1);

  // EXP
  const expGain = SURVIVAL_CONFIG.expPerKill + Math.floor(s.wave * 2);
  s.exp += expGain;

  // 골드
  const goldGain = 5 + s.wave * 3;
  s.gold += Math.floor(goldGain * (1 + s.goldBonus / 100));

  // 레벨업 체크
  if (s.exp >= s.expToNext) {
    s.exp -= s.expToNext;
    s.level++;
    s.expToNext = Math.floor(s.expToNext * SURVIVAL_CONFIG.expScaling);
    s.pendingLevelUp = true;
    s.hp = Math.min(s.maxHp, s.hp + Math.floor(s.maxHp * 0.1));

    // RPG: 스킬 해금 체크
    const classSkills = SURVIVAL_SKILLS[s.className] || [];
    for (const sk of classSkills) {
      if (s.level >= sk.lv && !s.skills.find(x => x.id === sk.id)) {
        s.skills.push({ ...sk, lastUsed: 0 });
        s._newSkill = sk; // 클라이언트에 알림
      }
    }
  }

  // RPG: 장비 드롭 (10% 확률)
  s._droppedItem = null;
  if (Math.random() < 0.10) {
    const totalW = SURVIVAL_DROPS.reduce((sum, d) => sum + d.weight, 0);
    let roll = Math.random() * totalW;
    for (const drop of SURVIVAL_DROPS) {
      roll -= drop.weight;
      if (roll <= 0) {
        s.equipment.push(drop);
        for (const [k, v] of Object.entries(drop.effect)) {
          if (k === 'maxHp') { s.maxHp += v; s.hp += v; }
          else if (s[k] !== undefined) s[k] += v;
        }
        s._droppedItem = drop;
        break;
      }
    }
  }
}

function survivalAttack(playerId) {
  const s = activeSessions[playerId];
  if (!s || !s.alive || s.pendingLevelUp) return null;
  if (s.monstersAlive <= 0) return { msg: '적이 없습니다' };

  // 전투 계산
  const isBossWave = s.wave % SURVIVAL_CONFIG.bossEveryWave === 0;
  const enemyMult = isBossWave && s.monstersAlive <= 1 ? 3 : 1;
  const enemyAtk = Math.floor((5 + s.wave * 3) * enemyMult * Math.pow(SURVIVAL_CONFIG.monsterScaling.atkMult, s.wave));
  const enemyDef = Math.floor((2 + s.wave) * enemyMult);

  // RPG 패시브 적용
  let atkBonus = 1.0;
  // 워리어: 분노 (HP 30% 이하 시 ATK 2배)
  if (s.passive === 'rage' && s.hp < s.maxHp * 0.3) atkBonus = 2.0;
  // 나이트: 요새화 (DEF의 30%를 ATK에 추가)
  if (s.passive === 'fortify') atkBonus += s.def * 0.3 / Math.max(1, s.atk);
  // 어쌔신: 은신 (3킬마다 다음 공격 3배)
  let stealthBonus = 1.0;
  if (s.passive === 'stealth') {
    s.stealthNextHit = (s.stealthNextHit || 0) + 1;
    if (s.stealthNextHit >= 3) { stealthBonus = 3.0; s.stealthNextHit = 0; }
  }

  const isCrit = Math.random() * 100 < s.critRate;
  const shots = 1 + s.multishot;
  let totalDmg = 0;
  for (let i = 0; i < shots; i++) {
    totalDmg += Math.max(1, Math.floor(s.atk * atkBonus * stealthBonus * (isCrit ? 2 : 1) - enemyDef * 0.3));
  }

  // 메이지: 마력 폭발 (5킬마다 전체 데미지)
  let arcaneBlast = false;
  if (s.passive === 'arcane') {
    s.arcaneCounter = (s.arcaneCounter || 0) + 1;
    if (s.arcaneCounter >= 5) {
      s.arcaneCounter = 0;
      arcaneBlast = true;
      const blastKills = Math.min(s.monstersAlive, 3);
      for (let i = 0; i < blastKills; i++) processKill(s);
    }
  }

  // 적 처치 (간소화)
  processKill(s);

  // 흡혈
  if (s.lifesteal > 0) s.hp = Math.min(s.maxHp, s.hp + Math.floor(totalDmg * s.lifesteal / 100));

  // 적 반격
  const dodged = Math.random() * 100 < s.dodge;
  if (!dodged) {
    let dmgTaken = Math.max(1, enemyAtk - Math.floor(s.def * 0.4));
    if (s.shield > 0) { s.shield -= dmgTaken; if (s.shield < 0) { dmgTaken = -s.shield; s.shield = 0; } else dmgTaken = 0; }
    s.hp -= dmgTaken;
  }

  // 사망 체크
  if (s.hp <= 0) {
    if (s.revive > 0) {
      s.revive--;
      s.hp = Math.floor(s.maxHp * 0.5);
      return { killed: true, revived: true, damage: totalDmg, isCrit, session: getSessionStatus(playerId) };
    }
    return endSurvival(playerId, 'death');
  }

  return { killed: true, damage: totalDmg, isCrit, dodged, session: getSessionStatus(playerId) };
}

function getLevelUpChoices(playerId) {
  const s = activeSessions[playerId];
  if (!s || !s.pendingLevelUp) return null;

  const available = UPGRADES.filter(u => !u.minLv || s.level >= u.minLv);
  const totalWeight = available.reduce((sum, u) => sum + u.weight, 0);

  const choices = [];
  const used = new Set();
  while (choices.length < 3 && choices.length < available.length) {
    let roll = Math.random() * totalWeight;
    for (const u of available) {
      if (used.has(u.id)) continue;
      roll -= u.weight;
      if (roll <= 0) {
        choices.push(u);
        used.add(u.id);
        break;
      }
    }
    if (choices.length === 0) break; // 안전장치
  }

  return choices;
}

function selectUpgrade(playerId, upgradeId) {
  const s = activeSessions[playerId];
  if (!s || !s.pendingLevelUp) return { success: false };

  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return { success: false };

  // 효과 적용
  for (const [key, val] of Object.entries(upgrade.effect)) {
    if (key === 'bomb') {
      // 즉시 효과: 화면 클리어
      const bombKills = Math.min(s.monstersAlive, 5 + s.wave);
      for (let i = 0; i < bombKills; i++) processKill(s);
    } else if (key === 'freezeAll') {
      // 빙결은 일시적 — 시간 벌기
    } else if (key === 'maxHp') {
      s.maxHp += val; s.hp += val;
    } else if (key === 'pierce' || key === 'revive') {
      s[key] = (s[key] || 0) + (typeof val === 'boolean' ? 1 : val);
    } else if (s[key] !== undefined) {
      s[key] += val;
    }
  }

  s.upgrades.push({ id: upgrade.id, name: upgrade.name, icon: upgrade.icon });
  s.pendingLevelUp = false;

  return { success: true, upgrade, session: getSessionStatus(playerId) };
}

function endSurvival(playerId, cause) {
  const s = activeSessions[playerId];
  if (!s) return null;

  s.alive = false;
  const score = s.kills * 10 + s.wave * 100 + s.level * 50 + s.time;

  // 영구 계정 보상 (실제 플레이어에게) — v3.0 SLG 연동
  const rewards = {
    gold: Math.floor(s.gold * 0.5),
    exp: s.kills * 5 + s.wave * 50,
    diamonds: Math.floor(s.wave / 5) * 5,
    score,
    // v3.0: 용병 카드 & 재료
    mercCard: null,     // 용병 카드 (보스킬 30%, 1위 100%)
    material: Math.floor(s.wave * 0.5), // 웨이브당 재료 0.5개
  };
  // 보스킬 시 30% 확률 용병 카드
  if (s.wave >= 5 && Math.random() < 0.3) {
    try {
      const mercSystem = require('./mercenary_system');
      const pool = mercSystem.MERCENARIES;
      // 웨이브에 따라 등급 결정
      let grade = 0;
      if (s.wave >= 25) grade = Math.random() < 0.1 ? 4 : 3;
      else if (s.wave >= 15) grade = Math.random() < 0.2 ? 3 : 2;
      else if (s.wave >= 10) grade = 2;
      else grade = Math.random() < 0.5 ? 1 : 0;
      const gradePool = pool.filter(m => m.grade === grade);
      if (gradePool.length > 0) {
        rewards.mercCard = gradePool[Math.floor(Math.random() * gradePool.length)].id;
      }
    } catch(e) {}
  }

  const result = {
    type: 'game_over',
    cause,
    score,
    wave: s.wave,
    level: s.level,
    kills: s.kills,
    time: s.time,
    upgrades: s.upgrades,
    rewards,
  };

  delete activeSessions[playerId];
  return { success: true, ...result };
}

function getSessionStatus(playerId) {
  const s = activeSessions[playerId];
  if (!s) return null;
  return {
    level: s.level, exp: s.exp, expToNext: s.expToNext,
    wave: s.wave, kills: s.kills, gold: s.gold, time: s.time,
    hp: s.hp, maxHp: s.maxHp, atk: s.atk, def: s.def,
    critRate: s.critRate, speed: s.speed, alive: s.alive,
    monstersAlive: s.monstersAlive,
    pendingLevelUp: s.pendingLevelUp,
    upgradeCount: s.upgrades.length,
    shield: s.shield, revive: s.revive,
    // RPG 정보
    className: s.className, classIcon: s.classIcon,
    passive: s.passiveDesc,
    equipment: (s.equipment || []).map(e => ({ name: e.name, icon: e.icon, grade: e.grade })),
    skills: (s.skills || []).map(sk => ({ id: sk.id, name: sk.name, icon: sk.icon, lv: sk.lv })),
    droppedItem: s._droppedItem ? { name: s._droppedItem.name, icon: s._droppedItem.icon, grade: s._droppedItem.grade } : null,
    newSkill: s._newSkill ? { name: s._newSkill.name, icon: s._newSkill.icon, desc: s._newSkill.desc } : null,
    mercBonus: s._mercBonus || null, // v3.0: SLG 용병 보너스 정보
  };
}

function getWaveBossName(wave) {
  const bosses = ['슬라임 킹', '골렘 로드', '드래곤 사제', '암흑 기사단장', '마왕의 그림자', '혼돈의 수호자'];
  return bosses[Math.floor(wave / 5) - 1] || '심연의 군주';
}

function registerSurvivalHandlers(socket, playerId, players, io) {
  socket.on('survival_start', () => {
    const p = players[playerId];
    if (!p) return;
    const result = startSurvival(playerId, p.displayName || p.className, p.className);
    if (result.success) {
      // v3.0: SLG 용병 파티 → IO 보너스 적용
      const s = activeSessions[playerId];
      if (s) applySLGBonus(p, s);
      result.session = getSessionStatus(playerId);
      io.emit('server_msg', { msg: '🎮 ' + (p.displayName||p.className) + '님이 서바이벌 IO 시작!', type: 'normal' });
    }
    socket.emit('survival_result', result);
  });

  socket.on('survival_attack', () => {
    const result = survivalAttack(playerId);
    if (result) {
      socket.emit('survival_result', result);
      if (result.type === 'game_over') {
        // 영구 보상 지급
        const p = players[playerId];
        if (p && result.rewards) {
          p.gold = (p.gold || 0) + result.rewards.gold;
          if (p.exp !== undefined) p.exp += result.rewards.exp;
          p.diamonds = (p.diamonds || 0) + result.rewards.diamonds;
          // v3.0: 용병 카드 자동 추가
          if (result.rewards.mercCard) {
            try {
              const mercSystem = require('./mercenary_system');
              const cardResult = mercSystem.addMercenary(p, result.rewards.mercCard);
              if (cardResult.success) {
                socket.emit('merc_result', cardResult);
                result.rewards.mercCardName = cardResult.merc?.name || result.rewards.mercCard;
              }
            } catch(e) {}
          }
        }
        io.emit('server_msg', { msg: '💀 서바이벌 종료! ' + (p?.displayName||'') + ' — 웨이브 ' + result.wave + ', ' + result.kills + '킬, 점수 ' + result.score + (result.rewards?.mercCardName ? ' 🎴 ' + result.rewards.mercCardName + ' 획득!' : ''), type: 'normal' });
      }
    }
  });

  socket.on('survival_tick', () => {
    const result = tickSurvival(playerId);
    if (result) socket.emit('survival_tick', result);
  });

  socket.on('survival_levelup_choices', () => {
    const choices = getLevelUpChoices(playerId);
    socket.emit('survival_choices', { choices });
  });

  socket.on('survival_select_upgrade', (upgradeId) => {
    const result = selectUpgrade(playerId, upgradeId);
    socket.emit('survival_result', result);
  });

  socket.on('survival_status', () => {
    socket.emit('survival_status', getSessionStatus(playerId));
  });

  // RPG: 스킬 사용
  socket.on('survival_use_skill', (skillId) => {
    const s = activeSessions[playerId];
    if (!s || !s.alive) return;
    const skill = s.skills.find(sk => sk.id === skillId);
    if (!skill) return;
    const now = Date.now();
    if (now - (s.skillCooldowns[skillId] || 0) < skill.cooldown * 1000) {
      socket.emit('survival_result', { msg: '쿨다운 중! (' + Math.ceil((skill.cooldown * 1000 - (now - (s.skillCooldowns[skillId]||0))) / 1000) + '초)' });
      return;
    }
    s.skillCooldowns[skillId] = now;

    let result = { skillUsed: true, skill: skill.name, icon: skill.icon };
    // 스킬 효과
    switch (skillId) {
      case 'whirlwind': case 'fireball': case 'shieldbash': case 'smite': {
        const mult = skillId === 'fireball' ? 3 : skillId === 'smite' ? 4 : 2;
        const kills = Math.min(s.monstersAlive, skillId === 'whirlwind' ? 5 : 2);
        for (let i = 0; i < kills; i++) processKill(s);
        result.kills = kills;
        break;
      }
      case 'backstab': case 'deathmark': {
        const kills = Math.min(s.monstersAlive, skillId === 'deathmark' ? 3 : 1);
        for (let i = 0; i < kills; i++) processKill(s);
        result.kills = kills;
        break;
      }
      case 'warcry': s.atk = Math.floor(s.atk * 1.5); setTimeout(() => { if (activeSessions[playerId]) activeSessions[playerId].atk = Math.floor(activeSessions[playerId].atk / 1.5); }, 10000); result.buff = 'ATK +50%'; break;
      case 'berserk': { const oldDef = s.def; s.atk *= 3; s.def = 0; setTimeout(() => { if (activeSessions[playerId]) { activeSessions[playerId].atk = Math.floor(activeSessions[playerId].atk / 3); activeSessions[playerId].def = oldDef; } }, 8000); result.buff = 'ATK 3배!'; break; }
      case 'smokescreen': case 'holy_shield': s.shield += 9999; setTimeout(() => { if (activeSessions[playerId]) activeSessions[playerId].shield = Math.max(0, activeSessions[playerId].shield - 9999); }, skillId === 'holy_shield' ? 10000 : 5000); result.buff = '무적!'; break;
      case 'bulwark': s.def *= 3; setTimeout(() => { if (activeSessions[playerId]) activeSessions[playerId].def = Math.floor(activeSessions[playerId].def / 3); }, 8000); result.buff = 'DEF 3배!'; break;
      case 'blizzard': { const kills = Math.min(s.monstersAlive, 8); for (let i = 0; i < kills; i++) processKill(s); result.kills = kills; break; }
      case 'meteor': { const kills = Math.min(s.monstersAlive, 15); for (let i = 0; i < kills; i++) processKill(s); result.kills = kills; break; }
      case 'heal': s.hp = Math.min(s.maxHp, s.hp + Math.floor(s.maxHp * 0.4)); result.heal = Math.floor(s.maxHp * 0.4); break;
      case 'resurrection': s.revive++; result.buff = '부활 +1'; break;
    }
    result.session = getSessionStatus(playerId);
    socket.emit('survival_skill_result', result);
  });
}

// ═══ 멀티플레이어 코옵 서바이벌 ═══
const coopRooms = {};
let coopIdCounter = 0;

function createCoopRoom(hostId, hostName, className) {
  const roomId = 'coop_' + (++coopIdCounter);
  coopRooms[roomId] = {
    id: roomId,
    host: hostId,
    players: {},
    wave: 0,
    monstersAlive: 0,
    totalKills: 0,
    startTime: null,
    phase: 'waiting', // waiting → active → ended
    lastWaveTime: 0,
    maxPlayers: 4,
  };
  joinCoopRoom(roomId, hostId, hostName, className);
  return { success: true, roomId, msg: '코옵 방 생성! 코드: ' + roomId };
}

function joinCoopRoom(roomId, playerId, playerName, className) {
  const room = coopRooms[roomId];
  if (!room) return { success: false, msg: '방을 찾을 수 없습니다' };
  if (room.phase !== 'waiting') return { success: false, msg: '이미 게임 진행 중' };
  if (Object.keys(room.players).length >= room.maxPlayers) return { success: false, msg: '정원 초과 (최대 ' + room.maxPlayers + '명)' };

  room.players[playerId] = {
    name: playerName,
    className,
    level: 1, exp: 0, expToNext: 30,
    hp: SURVIVAL_CONFIG.startHp,
    maxHp: SURVIVAL_CONFIG.startHp,
    atk: SURVIVAL_CONFIG.startAtk,
    def: SURVIVAL_CONFIG.startDef,
    critRate: 5, dodge: 0, hpRegen: 0, lifesteal: 0,
    multishot: 0, shield: 0, revive: 0,
    kills: 0, alive: true,
    upgrades: [],
    pendingLevelUp: false,
  };

  return { success: true, roomId, players: getCoopPlayerList(roomId) };
}

function startCoopGame(roomId, io) {
  const room = coopRooms[roomId];
  if (!room || room.phase !== 'waiting') return { success: false };
  if (Object.keys(room.players).length < 1) return { success: false, msg: '최소 1명 필요' };

  room.phase = 'active';
  room.startTime = Date.now();
  room.lastWaveTime = Date.now();
  room.wave = 0;

  if (io) {
    for (const pid of Object.keys(room.players)) {
      io.to(pid).emit('coop_started', { roomId, players: getCoopPlayerList(roomId) });
    }
    io.emit('server_msg', { msg: '🎮 코옵 서바이벌 시작! ' + Object.values(room.players).map(p => p.name).join(', '), type: 'boss' });
  }

  return { success: true };
}

function tickCoopRoom(roomId, io) {
  const room = coopRooms[roomId];
  if (!room || room.phase !== 'active') return null;

  const elapsed = Math.floor((Date.now() - room.startTime) / 1000);

  // HP 재생
  for (const p of Object.values(room.players)) {
    if (p.alive && p.hpRegen > 0) p.hp = Math.min(p.maxHp, p.hp + p.hpRegen);
  }

  // 웨이브 체크
  let newWave = null;
  const timeSinceWave = (Date.now() - room.lastWaveTime) / 1000;
  if (timeSinceWave >= SURVIVAL_CONFIG.waveInterval && room.wave < SURVIVAL_CONFIG.maxWave) {
    room.wave++;
    room.lastWaveTime = Date.now();
    const isBoss = room.wave % SURVIVAL_CONFIG.bossEveryWave === 0;
    const playerCount = Object.values(room.players).filter(p => p.alive).length;
    const monsterCount = Math.floor((3 + room.wave * 1.5) * (1 + playerCount * 0.3)); // 인원수에 비례
    room.monstersAlive += monsterCount;

    newWave = { wave: room.wave, isBoss, monsterCount, bossName: isBoss ? getWaveBossName(room.wave) : null };

    if (io) {
      for (const pid of Object.keys(room.players)) {
        io.to(pid).emit('coop_wave', newWave);
      }
    }
  }

  // 전원 사망 체크
  const aliveCount = Object.values(room.players).filter(p => p.alive).length;
  if (aliveCount === 0 && room.wave > 0) {
    return endCoopGame(roomId, io);
  }

  // 상태 브로드캐스트
  if (io && elapsed % 2 === 0) {
    const status = getCoopStatus(roomId);
    for (const pid of Object.keys(room.players)) {
      io.to(pid).emit('coop_update', status);
    }
  }

  return { tick: true };
}

function coopAttack(roomId, playerId) {
  const room = coopRooms[roomId];
  if (!room || room.phase !== 'active') return null;
  const player = room.players[playerId];
  if (!player || !player.alive || player.pendingLevelUp) return null;
  if (room.monstersAlive <= 0) return null;

  // 전투
  const isBossWave = room.wave % SURVIVAL_CONFIG.bossEveryWave === 0;
  const enemyMult = isBossWave && room.monstersAlive <= 1 ? 3 : 1;
  const enemyAtk = Math.floor((5 + room.wave * 3) * enemyMult * Math.pow(SURVIVAL_CONFIG.monsterScaling.atkMult, room.wave));
  const enemyDef = Math.floor((2 + room.wave) * enemyMult);

  const isCrit = Math.random() * 100 < player.critRate;
  const shots = 1 + (player.multishot || 0);
  let totalDmg = 0;
  for (let i = 0; i < shots; i++) {
    totalDmg += Math.max(1, Math.floor(player.atk * (isCrit ? 2 : 1) - enemyDef * 0.3));
  }

  // 킬
  room.monstersAlive--;
  room.totalKills++;
  player.kills++;

  // EXP
  const expGain = SURVIVAL_CONFIG.expPerKill + room.wave * 2;
  player.exp += expGain;
  if (player.exp >= player.expToNext) {
    player.exp -= player.expToNext;
    player.level++;
    player.expToNext = Math.floor(player.expToNext * SURVIVAL_CONFIG.expScaling);
    player.pendingLevelUp = true;
    player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.1));
  }

  // 흡혈
  if (player.lifesteal > 0) player.hp = Math.min(player.maxHp, player.hp + Math.floor(totalDmg * player.lifesteal / 100));

  // 적 반격
  const dodged = Math.random() * 100 < player.dodge;
  if (!dodged) {
    let dmg = Math.max(1, enemyAtk - Math.floor(player.def * 0.4));
    if (player.shield > 0) { player.shield -= dmg; if (player.shield < 0) { dmg = -player.shield; player.shield = 0; } else dmg = 0; }
    player.hp -= dmg;
  }

  if (player.hp <= 0) {
    if (player.revive > 0) { player.revive--; player.hp = Math.floor(player.maxHp * 0.5); }
    else { player.alive = false; }
  }

  return { killed: true, damage: totalDmg, isCrit, playerHp: player.hp, playerAlive: player.alive };
}

function coopSelectUpgrade(roomId, playerId, upgradeId) {
  const room = coopRooms[roomId];
  if (!room) return { success: false };
  const player = room.players[playerId];
  if (!player || !player.pendingLevelUp) return { success: false };

  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return { success: false };

  for (const [key, val] of Object.entries(upgrade.effect)) {
    if (key === 'maxHp') { player.maxHp += val; player.hp += val; }
    else if (key === 'bomb') { room.monstersAlive = Math.max(0, room.monstersAlive - (5 + room.wave)); room.totalKills += 5; player.kills += 5; }
    else if (player[key] !== undefined) player[key] += (typeof val === 'boolean' ? 1 : val);
  }
  player.upgrades.push({ id: upgrade.id, name: upgrade.name, icon: upgrade.icon });
  player.pendingLevelUp = false;

  return { success: true, upgrade };
}

function endCoopGame(roomId, io) {
  const room = coopRooms[roomId];
  if (!room) return null;
  room.phase = 'ended';

  const elapsed = Math.floor((Date.now() - room.startTime) / 1000);
  const results = Object.entries(room.players).map(([pid, p]) => ({
    id: pid, name: p.name, level: p.level, kills: p.kills,
    alive: p.alive, upgrades: p.upgrades.length,
    score: p.kills * 10 + room.wave * 100 + p.level * 50,
  })).sort((a, b) => b.score - a.score);

  if (io) {
    for (const pid of Object.keys(room.players)) {
      io.to(pid).emit('coop_end', { wave: room.wave, totalKills: room.totalKills, time: elapsed, results });
    }
    io.emit('server_msg', { msg: '🏆 코옵 서바이벌 종료! 웨이브 ' + room.wave + ', 총 ' + room.totalKills + '킬', type: 'boss' });
  }

  setTimeout(() => { delete coopRooms[roomId]; }, 10000);
  return { type: 'game_over', wave: room.wave, results };
}

function getCoopPlayerList(roomId) {
  const room = coopRooms[roomId];
  if (!room) return [];
  return Object.entries(room.players).map(([pid, p]) => ({
    id: pid, name: p.name, level: p.level, hp: p.hp, maxHp: p.maxHp,
    kills: p.kills, alive: p.alive, className: p.className,
  }));
}

function getCoopStatus(roomId) {
  const room = coopRooms[roomId];
  if (!room) return null;
  return {
    roomId, phase: room.phase, wave: room.wave, monstersAlive: room.monstersAlive,
    totalKills: room.totalKills,
    time: room.startTime ? Math.floor((Date.now() - room.startTime) / 1000) : 0,
    players: getCoopPlayerList(roomId),
  };
}

function getCoopRoomList() {
  return Object.values(coopRooms)
    .filter(r => r.phase === 'waiting')
    .map(r => ({ id: r.id, host: r.players[r.host]?.name || '?', playerCount: Object.keys(r.players).length, maxPlayers: r.maxPlayers }));
}

// 핸들러 확장
const _origRegister = registerSurvivalHandlers;
function registerSurvivalHandlersV2(socket, playerId, players, io) {
  _origRegister(socket, playerId, players, io);

  socket.on('coop_create', () => {
    const p = players[playerId];
    if (!p) return;
    const result = createCoopRoom(playerId, p.displayName || p.className, p.className);
    socket.emit('coop_result', result);
  });

  socket.on('coop_join', (roomId) => {
    const p = players[playerId];
    if (!p) return;
    const result = joinCoopRoom(roomId, playerId, p.displayName || p.className, p.className);
    socket.emit('coop_result', result);
    if (result.success && io) {
      for (const pid of Object.keys(coopRooms[roomId]?.players || {})) {
        io.to(pid).emit('coop_player_joined', { name: p.displayName, players: result.players });
      }
    }
  });

  socket.on('coop_start', (roomId) => {
    const room = coopRooms[roomId];
    if (!room || room.host !== playerId) return;
    const result = startCoopGame(roomId, io);
    if (result.success) {
      // 코옵 틱 시작
      const tickInterval = setInterval(() => {
        const r = tickCoopRoom(roomId, io);
        if (!r || r.type === 'game_over') clearInterval(tickInterval);
      }, 1000);
    }
  });

  socket.on('coop_attack', (roomId) => {
    const result = coopAttack(roomId, playerId);
    if (result) socket.emit('coop_attack_result', result);
  });

  socket.on('coop_upgrade', (data) => {
    const result = coopSelectUpgrade(data.roomId, playerId, data.upgradeId);
    socket.emit('coop_upgrade_result', result);
  });

  socket.on('coop_rooms', () => {
    socket.emit('coop_rooms', { rooms: getCoopRoomList() });
  });

  socket.on('coop_status', (roomId) => {
    socket.emit('coop_status', getCoopStatus(roomId));
  });
}

module.exports = { registerSurvivalHandlers: registerSurvivalHandlersV2, SURVIVAL_CONFIG };

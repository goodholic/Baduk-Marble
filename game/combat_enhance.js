// 전투 강화 시스템 — v2.58
// 콤보, 상태이상, 궁극기 게이지, 장비 세트 추가

// ═══ 상태이상 정의 ═══
const STATUS_EFFECTS = {
  burn: {
    name: '화상', icon: '🔥', color: '#ff6622',
    dotPerSec: 8, duration: 5, element: 'fire',
    desc: '초당 8 화염 데미지',
    onApply: (target) => { target.def = Math.max(0, (target.def || 0) - 5); },
    onExpire: (target) => { target.def = (target.def || 0) + 5; },
  },
  freeze: {
    name: '빙결', icon: '❄', color: '#66ddff',
    dotPerSec: 0, duration: 3, element: 'ice',
    desc: '3초간 이동 불가, DEF -30%',
    onApply: (target) => { target._frozenSpeed = target.speed; target.speed = 0; target.def = Math.floor((target.def || 0) * 0.7); },
    onExpire: (target) => { if (target._frozenSpeed) target.speed = target._frozenSpeed; target.def = Math.floor((target.def || 0) / 0.7); },
  },
  bleed: {
    name: '출혈', icon: '🩸', color: '#cc2222',
    dotPerSec: 12, duration: 6, element: 'normal',
    desc: '초당 12 출혈 데미지, 회복량 -50%',
    stackable: true, maxStacks: 3,
  },
  curse: {
    name: '저주', icon: '☠', color: '#9933ff',
    dotPerSec: 5, duration: 8, element: 'dark',
    desc: '초당 5 데미지, ATK -20%',
    onApply: (target) => { target.atk = Math.floor((target.atk || 0) * 0.8); },
    onExpire: (target) => { target.atk = Math.floor((target.atk || 0) / 0.8); },
  },
  stun: {
    name: '기절', icon: '💫', color: '#ffee44',
    dotPerSec: 0, duration: 2, element: 'lightning',
    desc: '2초간 행동 불가',
    onApply: (target) => { target._stunned = true; },
    onExpire: (target) => { target._stunned = false; },
  },
  poison: {
    name: '중독', icon: '🐍', color: '#88ff44',
    dotPerSec: 6, duration: 10, element: 'poison',
    desc: '초당 6 독 데미지',
    stackable: true, maxStacks: 5,
  },
};

// ═══ 스킬 콤보 정의 ═══
const SKILL_COMBOS = {
  // 어쌔신 콤보
  assassin_chain: {
    name: '암살 연쇄', class: 'Assassin',
    sequence: ['그림자 일격', '독 바르기', '연속 베기'],
    bonus: { dmgMultiplier: 2.5, effect: 'bleed', msg: '암살 연쇄! 적이 피를 흘린다!' },
    icon: '🗡️', color: '#ff6b6b',
  },
  assassin_execute: {
    name: '그림자 처형', class: 'Assassin',
    sequence: ['은신', '그림자 일격'],
    bonus: { dmgMultiplier: 3.0, critGuarantee: true, msg: '은신에서 기습! 치명적 일격!' },
    icon: '💀', color: '#cc0000',
  },
  // 워리어 콤보
  warrior_fury: {
    name: '광전사의 분노', class: 'Warrior',
    sequence: ['전투 함성', '파워 스트라이크', '회전 베기'],
    bonus: { dmgMultiplier: 2.0, effect: 'stun', msg: '광전사의 분노! 적이 기절했다!' },
    icon: '⚔️', color: '#ffa500',
  },
  warrior_combo: {
    name: '연속 강타', class: 'Warrior',
    sequence: ['파워 스트라이크', '회전 베기'],
    bonus: { dmgMultiplier: 1.8, msg: '연속 강타!' },
    icon: '💥', color: '#ff8800',
  },
  // 나이트 콤보
  knight_wall: {
    name: '철벽 반격', class: 'Knight',
    sequence: ['철벽 방어', '방패 강타'],
    bonus: { dmgMultiplier: 2.2, effect: 'stun', msg: '철벽에서 반격! 적이 기절!' },
    icon: '🛡️', color: '#44aaff',
  },
  knight_guardian: {
    name: '수호자의 심판', class: 'Knight',
    sequence: ['도발', '수호 오라', '방패 강타'],
    bonus: { dmgMultiplier: 2.5, selfHeal: 100, msg: '수호자의 심판! HP 회복!' },
    icon: '✝', color: '#4488ff',
  },
  // 메이지 콤보
  mage_elemental: {
    name: '원소 폭풍', class: 'Mage',
    sequence: ['아이스 볼트', '파이어볼', '체인 라이트닝'],
    bonus: { dmgMultiplier: 3.0, effect: 'burn', aoe: true, msg: '원소 폭풍! 3속성 연쇄 폭발!' },
    icon: '🌀', color: '#aa44ff',
  },
  mage_freeze: {
    name: '절대영도', class: 'Mage',
    sequence: ['아이스 볼트', '아이스 볼트'],
    bonus: { dmgMultiplier: 1.5, effect: 'freeze', msg: '절대영도! 적이 얼어붙었다!' },
    icon: '❄', color: '#66ddff',
  },
  // 클레릭 콤보
  cleric_holy: {
    name: '신성 심판', class: 'Cleric',
    sequence: ['홀리 라이트', '축복', '정화'],
    bonus: { dmgMultiplier: 2.0, selfHeal: 200, allyHeal: 100, msg: '신성 심판! 아군 회복!' },
    icon: '✨', color: '#ffd700',
  },
};

// ═══ 궁극기 시스템 ═══
const ULTIMATE_CONFIG = {
  maxGauge: 1000,
  gainPerHit: 15,        // 타격당 게이지 획득
  gainPerKill: 100,      // 처치당 게이지 획득
  gainPerDamageTaken: 0.5, // 받은 데미지의 0.5배만큼 게이지
  decayPerSec: 2,        // 비전투 시 초당 감소
};

const ULTIMATES = {
  Assassin: {
    name: '사신의 낫', icon: '💀',
    desc: '주변 모든 적에게 ATK×10 암흑 데미지 + 5초 출혈',
    dmgMultiplier: 10, element: 'dark', effect: 'bleed', aoe: true, range: 150,
    animation: 'dark', duration: 2000,
  },
  Warrior: {
    name: '대지의 분노', icon: '🌋',
    desc: '광역 ATK×8 데미지 + 기절 3초 + 화면 흔들림',
    dmgMultiplier: 8, element: 'fire', effect: 'stun', aoe: true, range: 200,
    animation: 'fire', duration: 2500,
  },
  Knight: {
    name: '신성 방벽', icon: '🛡️',
    desc: '10초간 무적 + 주변 아군 HP 50% 회복 + 적 밀어내기',
    dmgMultiplier: 5, element: 'holy', selfBuff: { invincible: 10 }, allyHeal: 0.5, aoe: true, range: 180,
    animation: 'holy', duration: 3000,
  },
  Mage: {
    name: '메테오 스톰', icon: '☄️',
    desc: '하늘에서 운석 소나기! ATK×12 화염 데미지 + 화상',
    dmgMultiplier: 12, element: 'fire', effect: 'burn', aoe: true, range: 250,
    animation: 'fire', duration: 3000,
  },
  Cleric: {
    name: '대천사 강림', icon: '👼',
    desc: '모든 아군 부활 + 전체 HP 회복 + 10초 신성 축복',
    dmgMultiplier: 6, element: 'holy', allyRevive: true, allyHeal: 1.0, aoe: true, range: 300,
    animation: 'holy', duration: 4000,
  },
};

// ═══ 추가 장비 세트 ═══
const EXTRA_SETS = {
  shadow: {
    name: '그림자 세트', pieces: ['equip_shadow_dagger','equip_shadow_armor','equip_shadow_boots','equip_shadow_cloak','equip_shadow_ring'],
    bonuses: {
      2: { atk: 15, desc: 'ATK +15' },
      3: { atk: 30, critRate: 10, desc: 'ATK +30, 크리티컬 +10%' },
      5: { atk: 50, critRate: 15, dodge: 10, special: 'shadow_strike', desc: 'ATK +50, 크리 +15%, 회피 +10%, 그림자 일격 강화' },
    },
  },
  frost: {
    name: '서리 세트', pieces: ['equip_frost_staff','equip_frost_robe','equip_frost_crown','equip_frost_gloves','equip_frost_ring'],
    bonuses: {
      2: { def: 15, hp: 100, desc: 'DEF +15, HP +100' },
      3: { def: 25, hp: 300, special: 'frost_aura', desc: 'DEF +25, HP +300, 서리 오라 (적 감속)' },
      5: { def: 40, hp: 600, special: 'absolute_zero', desc: 'DEF +40, HP +600, 피격 시 10% 확률 빙결' },
    },
  },
  thunder: {
    name: '뇌전 세트', pieces: ['equip_thunder_blade','equip_thunder_armor','equip_thunder_helm','equip_thunder_boots','equip_thunder_necklace'],
    bonuses: {
      2: { atk: 20, desc: 'ATK +20' },
      3: { atk: 35, atkSpeed: 20, desc: 'ATK +35, 공격속도 +20%' },
      5: { atk: 60, atkSpeed: 30, special: 'chain_lightning', desc: 'ATK +60, 공속 +30%, 공격 시 20% 확률 연쇄 번개' },
    },
  },
  holy: {
    name: '신성 세트', pieces: ['equip_holy_mace','equip_holy_plate','equip_holy_shield','equip_holy_circlet','equip_holy_ring'],
    bonuses: {
      2: { def: 20, hp: 200, desc: 'DEF +20, HP +200' },
      3: { def: 35, hp: 500, healBonus: 30, desc: 'DEF +35, HP +500, 회복량 +30%' },
      5: { def: 50, hp: 1000, special: 'divine_protection', desc: 'DEF +50, HP +1000, 치명타 무효화 25%' },
    },
  },
};

// ═══ 콤보 추적기 ═══
function createComboTracker() {
  return {
    recentSkills: [],   // [{name, time}]
    comboWindow: 5000,  // 5초 내 스킬 연계
    ultimateGauge: 0,
    statusEffects: [],  // [{type, stacks, expiresAt, appliedAt}]
  };
}

// 스킬 사용 시 콤보 체크
function checkCombo(player, skillName) {
  if (!player._comboTracker) player._comboTracker = createComboTracker();
  const tracker = player._comboTracker;
  const now = Date.now();

  // 오래된 스킬 제거
  tracker.recentSkills = tracker.recentSkills.filter(s => now - s.time < tracker.comboWindow);
  tracker.recentSkills.push({ name: skillName, time: now });

  const recentNames = tracker.recentSkills.map(s => s.name);
  const className = player.className || '';

  // 모든 콤보 체크
  for (const [comboId, combo] of Object.entries(SKILL_COMBOS)) {
    if (combo.class && !className.includes(combo.class) &&
        !className.includes(combo.class.toLowerCase())) continue;

    const seq = combo.sequence;
    if (recentNames.length < seq.length) continue;

    // 최근 스킬에서 시퀀스 매칭
    const tail = recentNames.slice(-seq.length);
    let match = true;
    for (let i = 0; i < seq.length; i++) {
      if (tail[i] !== seq[i]) { match = false; break; }
    }

    if (match) {
      // 콤보 성공! 최근 스킬 초기화
      tracker.recentSkills = [];
      return { comboId, ...combo };
    }
  }

  return null;
}

// 상태이상 적용
function applyStatusEffect(target, effectType, stacks) {
  const effectDef = STATUS_EFFECTS[effectType];
  if (!effectDef) return;

  if (!target._comboTracker) target._comboTracker = createComboTracker();
  const effects = target._comboTracker.statusEffects;
  const existing = effects.find(e => e.type === effectType);

  if (existing) {
    if (effectDef.stackable) {
      existing.stacks = Math.min((existing.stacks || 1) + (stacks || 1), effectDef.maxStacks || 1);
      existing.expiresAt = Date.now() + effectDef.duration * 1000;
    } else {
      // 갱신
      existing.expiresAt = Date.now() + effectDef.duration * 1000;
    }
  } else {
    if (effectDef.onApply) effectDef.onApply(target);
    effects.push({
      type: effectType,
      stacks: stacks || 1,
      expiresAt: Date.now() + effectDef.duration * 1000,
      appliedAt: Date.now(),
    });
  }

  return {
    type: effectType,
    name: effectDef.name,
    icon: effectDef.icon,
    color: effectDef.color,
    duration: effectDef.duration,
    stacks: existing ? existing.stacks : 1,
  };
}

// 상태이상 틱 처리 (1초마다 호출)
function tickStatusEffects(target) {
  if (!target._comboTracker) return [];
  const effects = target._comboTracker.statusEffects;
  const now = Date.now();
  const results = [];

  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    const def = STATUS_EFFECTS[e.type];
    if (!def) { effects.splice(i, 1); continue; }

    // 만료 체크
    if (now >= e.expiresAt) {
      if (def.onExpire) def.onExpire(target);
      effects.splice(i, 1);
      results.push({ type: e.type, event: 'expire' });
      continue;
    }

    // DoT 데미지
    if (def.dotPerSec > 0) {
      const dmg = def.dotPerSec * (e.stacks || 1);
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      results.push({
        type: e.type, event: 'dot',
        damage: dmg, element: def.element,
        icon: def.icon,
      });
    }
  }

  return results;
}

// 궁극기 게이지 업데이트
function updateUltimateGauge(player, action, value) {
  if (!player._comboTracker) player._comboTracker = createComboTracker();
  const tracker = player._comboTracker;
  const cfg = ULTIMATE_CONFIG;

  switch (action) {
    case 'hit':
      tracker.ultimateGauge = Math.min(cfg.maxGauge, tracker.ultimateGauge + cfg.gainPerHit);
      break;
    case 'kill':
      tracker.ultimateGauge = Math.min(cfg.maxGauge, tracker.ultimateGauge + cfg.gainPerKill);
      break;
    case 'damage_taken':
      tracker.ultimateGauge = Math.min(cfg.maxGauge, tracker.ultimateGauge + Math.floor(value * cfg.gainPerDamageTaken));
      break;
    case 'decay':
      tracker.ultimateGauge = Math.max(0, tracker.ultimateGauge - cfg.decayPerSec);
      break;
    case 'use':
      tracker.ultimateGauge = 0;
      break;
  }

  return tracker.ultimateGauge;
}

// 궁극기 발동
function useUltimate(player) {
  if (!player._comboTracker) return null;
  if (player._comboTracker.ultimateGauge < ULTIMATE_CONFIG.maxGauge) return null;

  const baseClass = (player.className || 'Warrior').split(' ')[0];
  const ultimate = ULTIMATES[baseClass] || ULTIMATES.Warrior;

  player._comboTracker.ultimateGauge = 0;

  return {
    ...ultimate,
    playerAtk: player.atk || 25,
    totalDamage: Math.floor((player.atk || 25) * ultimate.dmgMultiplier),
  };
}

// 장비 세트 효과 계산
function calcExtraSetBonus(player) {
  if (!player.equipped) return { bonuses: {}, activeSets: [] };
  const equippedIds = Object.values(player.equipped).filter(Boolean);
  const activeSets = [];
  const bonuses = { atk: 0, def: 0, hp: 0, critRate: 0, dodge: 0, atkSpeed: 0, healBonus: 0 };

  for (const [setId, set] of Object.entries(EXTRA_SETS)) {
    const count = set.pieces.filter(p => equippedIds.includes(p)).length;
    if (count < 2) continue;

    for (const [threshold, bonus] of Object.entries(set.bonuses)) {
      if (count >= parseInt(threshold)) {
        for (const [stat, val] of Object.entries(bonus)) {
          if (stat !== 'desc' && stat !== 'special' && bonuses[stat] !== undefined) {
            bonuses[stat] += val;
          }
        }
        activeSets.push({ setName: set.name, pieces: count, desc: bonus.desc, special: bonus.special });
      }
    }
  }

  return { bonuses, activeSets };
}

module.exports = {
  STATUS_EFFECTS,
  SKILL_COMBOS,
  ULTIMATE_CONFIG,
  ULTIMATES,
  EXTRA_SETS,
  createComboTracker,
  checkCombo,
  applyStatusEffect,
  tickStatusEffects,
  updateUltimateGauge,
  useUltimate,
  calcExtraSetBonus,
};

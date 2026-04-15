// ============================================
// 카드 합체 변신 — 2장 합체 -> 초강력 유닛!
// 드래곤볼 퓨전처럼 일시적 합체 (1전투 or 60초)
// ============================================

// ── 합체 유형 ──
const FUSION_TYPES = {
  // 같은 종족 합체 (스탯 합산 x 1.5)
  same_race:  { name: '종족 합체', multiplier: 1.5, duration: 60, cooldown: 300, icon: '🔄' },
  // 같은 직업 합체 (해당 직업 특화 x 1.8)
  same_class: { name: '직업 합체', multiplier: 1.8, duration: 45, cooldown: 300, icon: '⚔️🔄' },
  // 상반 속성 합체 (빛+어둠, 화+빙 등, x 2.0!)
  opposite:   { name: '대극 합체', multiplier: 2.0, duration: 30, cooldown: 600, icon: '☯️' },
};

// ── 특수 합체 조합 (이름이 매칭되면 전용 합체폼) ──
const SPECIAL_FUSIONS = [
  { cards: ['전설의 검성', '대마도사'], result: { name: '마검신', icon: '⚔️🔮👑', atk: 500, def: 200, hp: 3000, skill: { name: '차원 절단', desc: '전체 ATK x6 + 3초 시간정지', dmg: 6.0 } }, desc: '검과 마법의 궁극 합일!' },
  { cards: ['불사조', '용왕'], result: { name: '불멸의 용신', icon: '🔥🐲👑', atk: 600, def: 300, hp: 4000, skill: { name: '용의 업화', desc: '전체 화염 ATK x8 + 부활', dmg: 8.0, revive: true } }, desc: '불사의 새와 용의 왕이 하나로!' },
  { cards: ['신검의 주인', '차원의 현자'], result: { name: '태초의 영웅', icon: '🌟⚔️🔮👑', atk: 800, def: 400, hp: 5000, skill: { name: '창세의 일격', desc: '적 전원 즉사 (보스: HP 50%)', dmg: 99.0 } }, desc: '두 각성자의 궁극 합체!' },
  { cards: ['암흑기사', '빛의 천사'], result: { name: '균형의 수호자', icon: '⚔️☯️👼', atk: 450, def: 350, hp: 3500, skill: { name: '빛과 어둠', desc: '아군 전원 회복 + 적 전원 공포', dmg: 4.0, heal: 0.5 } }, desc: '빛과 어둠의 완벽한 균형!' },
  { cards: ['용기사', '드래곤 블레이드'], result: { name: '드래곤 황제', icon: '🐲🐲👑', atk: 700, def: 350, hp: 4500, skill: { name: '드래곤 브레스 MAX', desc: '전체 화염 ATK x10', dmg: 10.0 } }, desc: '용의 힘을 극한까지!' },
  { cards: ['네크로맨서', '치유사'], result: { name: '생사의 지배자', icon: '💀💚👑', atk: 400, def: 300, hp: 3000, skill: { name: '생사 역전', desc: '아군 부활 + 적 HP<->DEF 교환', revive: true, swap: true } }, desc: '삶과 죽음을 다루는 자!' },
  { cards: ['야수왕', '정령사'], result: { name: '자연의 왕', icon: '🐺🌀👑', atk: 550, def: 250, hp: 3500, skill: { name: '자연의 분노', desc: '넝쿨+야수+번개 연속공격', dmg: 7.0 } }, desc: '자연의 모든 힘을 결집!' },
  { cards: ['워머신', '마왕'], result: { name: '종말 병기', icon: '🤖😈👑', atk: 900, def: 200, hp: 3000, skill: { name: '종말', desc: '적 필드 전부 파괴 + 영웅 HP 50%', dmg: 50.0, selfDmg: 0.3 } }, desc: '기계와 악마의 금지된 합체!' },
];

// ── 반대 속성 쌍 ──
const OPPOSITE_PAIRS = [
  ['fire', 'water'], ['light', 'dark'], ['earth', 'wind'],
];

// ── 합체 비용 ──
const FUSION_COST = 2000;
const CARD_COOLDOWN_MS = 5 * 60 * 1000; // 합체 후 카드 쿨다운 5분
const MAX_HISTORY = 10;

// ============================================
// 유틸 함수
// ============================================

/** 두 속성이 반대 속성인지 확인 */
function _isOpposite(elemA, elemB) {
  if (!elemA || !elemB) return false;
  const a = elemA.toLowerCase();
  const b = elemB.toLowerCase();
  return OPPOSITE_PAIRS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/** 특수 합체 레시피 매칭 (순서 무관) */
function _findSpecialFusion(nameA, nameB) {
  return SPECIAL_FUSIONS.find(f =>
    (f.cards[0] === nameA && f.cards[1] === nameB) ||
    (f.cards[0] === nameB && f.cards[1] === nameA)
  ) || null;
}

/** 카드가 합체 쿨다운 중인지 확인 */
function _isOnCooldown(card) {
  if (!card._fusionCooldownUntil) return false;
  return Date.now() < card._fusionCooldownUntil;
}

/** 일반 합체 유형 판별 (opposite > same_class > same_race) */
function _determineFusionType(cardA, cardB) {
  // 상반 속성 체크
  if (_isOpposite(cardA.element, cardB.element)) {
    return { type: 'opposite', ...FUSION_TYPES.opposite };
  }
  // 같은 직업 체크
  if (cardA.class && cardB.class && cardA.class === cardB.class) {
    return { type: 'same_class', ...FUSION_TYPES.same_class };
  }
  // 같은 종족 체크
  if (cardA.race && cardB.race && cardA.race === cardB.race) {
    return { type: 'same_race', ...FUSION_TYPES.same_race };
  }
  return null;
}

/** 일반 합체 시 합산 스탯 계산 */
function _calcFusedStats(cardA, cardB, multiplier) {
  const atk = Math.floor(((cardA.atk || 0) + (cardB.atk || 0)) * multiplier);
  const def = Math.floor(((cardA.def || 0) + (cardB.def || 0)) * multiplier);
  const hp  = Math.floor(((cardA.hp  || 0) + (cardB.hp  || 0)) * multiplier);
  return { atk, def, hp };
}

/** 일반 합체 자동 스킬 생성 */
function _generateFusionSkill(cardA, cardB, fusionType) {
  const base = (cardA.atk || 0) + (cardB.atk || 0);
  if (fusionType === 'opposite') {
    return { name: '대극 폭발', desc: '상반 속성 폭발 ATK x4', dmg: 4.0 };
  }
  if (fusionType === 'same_class') {
    const cls = cardA.class || '전사';
    return { name: `${cls} 극의`, desc: `${cls} 특화 ATK x3`, dmg: 3.0 };
  }
  // same_race
  const race = cardA.race || '인간';
  return { name: `${race}의 결속`, desc: `${race} 합체 ATK x2.5`, dmg: 2.5 };
}

// ============================================
// 메인 API 함수
// ============================================

/**
 * canFuse — 두 카드 합체 가능 여부 확인
 * @returns {{ canFuse: boolean, fusionInfo?: object, reason?: string }}
 */
function canFuse(player, cardIdA, cardIdB) {
  const cards = player.cards || [];
  const cardA = cards.find(c => c.id === cardIdA);
  const cardB = cards.find(c => c.id === cardIdB);

  if (!cardA) return { canFuse: false, reason: `카드A(${cardIdA}) 를 보유하고 있지 않습니다` };
  if (!cardB) return { canFuse: false, reason: `카드B(${cardIdB}) 를 보유하고 있지 않습니다` };
  if (cardIdA === cardIdB) return { canFuse: false, reason: '같은 카드끼리는 합체할 수 없습니다' };

  // 이미 합체 중인지
  if (player._fusedUnit && player._fusedUnit.active) {
    return { canFuse: false, reason: '이미 합체 중입니다. 현재 합체를 해제하세요' };
  }

  // 카드 쿨다운 체크
  if (_isOnCooldown(cardA)) {
    const remain = Math.ceil((cardA._fusionCooldownUntil - Date.now()) / 1000);
    return { canFuse: false, reason: `${cardA.name} 합체 쿨다운 중 (${remain}초 남음)` };
  }
  if (_isOnCooldown(cardB)) {
    const remain = Math.ceil((cardB._fusionCooldownUntil - Date.now()) / 1000);
    return { canFuse: false, reason: `${cardB.name} 합체 쿨다운 중 (${remain}초 남음)` };
  }

  // 골드 체크
  if ((player.gold || 0) < FUSION_COST) {
    return { canFuse: false, reason: `골드 부족 (필요: ${FUSION_COST}G, 보유: ${player.gold || 0}G)` };
  }

  // 특수 합체 확인 (최우선)
  const special = _findSpecialFusion(cardA.name, cardB.name);
  if (special) {
    return {
      canFuse: true,
      fusionInfo: {
        type: 'special',
        name: special.result.name,
        icon: special.result.icon,
        desc: special.desc,
        stats: { atk: special.result.atk, def: special.result.def, hp: special.result.hp },
        skill: special.result.skill,
        duration: 60,
        cooldown: 600,
        cost: FUSION_COST,
      },
    };
  }

  // 일반 합체 유형 판별
  const fusionType = _determineFusionType(cardA, cardB);
  if (!fusionType) {
    return { canFuse: false, reason: '합체 조건을 만족하지 않습니다 (같은 종족/직업 또는 상반 속성 필요)' };
  }

  const stats = _calcFusedStats(cardA, cardB, fusionType.multiplier);
  const skill = _generateFusionSkill(cardA, cardB, fusionType.type);

  return {
    canFuse: true,
    fusionInfo: {
      type: fusionType.type,
      name: `${fusionType.name}: ${cardA.name} + ${cardB.name}`,
      icon: fusionType.icon,
      desc: `${fusionType.name} (x${fusionType.multiplier})`,
      stats,
      skill,
      duration: fusionType.duration,
      cooldown: fusionType.cooldown,
      cost: FUSION_COST,
    },
  };
}

/**
 * fuseCards — 합체 실행
 * @returns {{ ok: boolean, fusedUnit?: object, reason?: string }}
 */
function fuseCards(player, cardIdA, cardIdB) {
  const check = canFuse(player, cardIdA, cardIdB);
  if (!check.canFuse) return { ok: false, reason: check.reason };

  const cards = player.cards || [];
  const cardA = cards.find(c => c.id === cardIdA);
  const cardB = cards.find(c => c.id === cardIdB);
  const info = check.fusionInfo;

  // 골드 차감
  player.gold = (player.gold || 0) - FUSION_COST;

  // 합체 유닛 생성
  const now = Date.now();
  const duration = info.duration * 1000;
  const fusedUnit = {
    active: true,
    type: info.type,
    name: info.name,
    icon: info.icon,
    desc: info.desc,
    atk: info.stats.atk,
    def: info.stats.def,
    hp: info.stats.hp,
    maxHp: info.stats.hp,
    skill: { ...info.skill, used: false },
    sourceCards: [cardIdA, cardIdB],
    sourceNames: [cardA.name, cardB.name],
    startedAt: now,
    expiresAt: now + duration,
    duration: info.duration,
    cooldownDuration: info.cooldown,
    battleUsed: false,
  };

  player._fusedUnit = fusedUnit;

  // 소스 카드 사용 불가 표시
  cardA._fusionLocked = true;
  cardB._fusionLocked = true;

  // 자동 만료 타이머
  if (player._fusionTimer) clearTimeout(player._fusionTimer);
  player._fusionTimer = setTimeout(() => {
    endFusion(player);
  }, duration);

  // 히스토리 기록
  if (!player._fusionHistory) player._fusionHistory = [];
  player._fusionHistory.unshift({
    type: info.type,
    name: info.name,
    icon: info.icon,
    cardA: cardA.name,
    cardB: cardB.name,
    stats: { ...info.stats },
    skill: info.skill.name,
    timestamp: now,
  });
  if (player._fusionHistory.length > MAX_HISTORY) {
    player._fusionHistory = player._fusionHistory.slice(0, MAX_HISTORY);
  }

  // 특수 합체 발견 기록
  if (info.type === 'special') {
    if (!player._discoveredFusions) player._discoveredFusions = [];
    if (!player._discoveredFusions.includes(info.name)) {
      player._discoveredFusions.push(info.name);
    }
  }

  return { ok: true, fusedUnit };
}

/**
 * getFusedUnit — 현재 활성 합체 유닛 반환
 * @returns {object|null}
 */
function getFusedUnit(player) {
  const fu = player._fusedUnit;
  if (!fu || !fu.active) return null;

  // 만료 확인
  if (Date.now() >= fu.expiresAt) {
    endFusion(player);
    return null;
  }

  const remaining = Math.ceil((fu.expiresAt - Date.now()) / 1000);
  return {
    ...fu,
    remainingSec: remaining,
  };
}

/**
 * useFusionSkill — 합체 유닛 궁극기 사용 (1회 한정)
 * @returns {{ ok: boolean, skill?: object, damage?: number, effects?: object, reason?: string }}
 */
function useFusionSkill(player) {
  const fu = player._fusedUnit;
  if (!fu || !fu.active) return { ok: false, reason: '합체 유닛이 없습니다' };

  // 만료 확인
  if (Date.now() >= fu.expiresAt) {
    endFusion(player);
    return { ok: false, reason: '합체 시간이 만료되었습니다' };
  }

  if (fu.skill.used) return { ok: false, reason: '이미 궁극기를 사용했습니다 (합체당 1회)' };

  // 스킬 사용 처리
  fu.skill.used = true;

  const baseDmg = fu.atk * (fu.skill.dmg || 1.0);
  const effects = {};

  // 부활 효과
  if (fu.skill.revive) effects.revive = true;
  // 치유 효과
  if (fu.skill.heal) effects.heal = Math.floor(fu.maxHp * fu.skill.heal);
  // 스왑 효과
  if (fu.skill.swap) effects.swapHpDef = true;
  // 자해 데미지
  if (fu.skill.selfDmg) {
    const selfDamage = Math.floor(fu.maxHp * fu.skill.selfDmg);
    fu.hp = Math.max(1, fu.hp - selfDamage);
    effects.selfDamage = selfDamage;
  }

  return {
    ok: true,
    skill: { name: fu.skill.name, desc: fu.skill.desc },
    damage: Math.floor(baseDmg),
    effects,
  };
}

/**
 * endFusion — 합체 해제 (수동 또는 만료)
 * @returns {{ ok: boolean, returned?: string[] }}
 */
function endFusion(player) {
  const fu = player._fusedUnit;
  if (!fu) return { ok: false, reason: '합체 유닛이 없습니다' };

  // 타이머 정리
  if (player._fusionTimer) {
    clearTimeout(player._fusionTimer);
    player._fusionTimer = null;
  }

  // 소스 카드 잠금 해제 + 쿨다운 부여
  const cards = player.cards || [];
  const returned = [];
  for (const cid of (fu.sourceCards || [])) {
    const card = cards.find(c => c.id === cid);
    if (card) {
      card._fusionLocked = false;
      card._fusionCooldownUntil = Date.now() + CARD_COOLDOWN_MS;
      returned.push(card.name);
    }
  }

  // 합체 유닛 비활성화
  fu.active = false;
  player._fusedUnit = null;

  return { ok: true, returned };
}

/**
 * getFusionRecipes — 특수 합체 레시피 목록 (발견/미발견 구분)
 * @returns {{ recipes: object[] }}
 */
function getFusionRecipes(player) {
  const discovered = player._discoveredFusions || [];
  const recipes = SPECIAL_FUSIONS.map(f => {
    const isDiscovered = discovered.includes(f.result.name);
    if (isDiscovered) {
      return {
        cards: f.cards,
        result: f.result.name,
        icon: f.result.icon,
        desc: f.desc,
        stats: { atk: f.result.atk, def: f.result.def, hp: f.result.hp },
        skill: f.result.skill.name,
        discovered: true,
      };
    }
    return {
      cards: ['???', '???'],
      result: '??? 합체',
      icon: '❓',
      desc: '아직 발견하지 못한 합체입니다',
      stats: null,
      skill: null,
      discovered: false,
    };
  });

  const discoveredCount = recipes.filter(r => r.discovered).length;
  return {
    recipes,
    total: SPECIAL_FUSIONS.length,
    discovered: discoveredCount,
    progress: `${discoveredCount}/${SPECIAL_FUSIONS.length}`,
  };
}

/**
 * getFusionHistory — 최근 합체 기록 (최대 10건)
 * @returns {{ history: object[] }}
 */
function getFusionHistory(player) {
  const history = (player._fusionHistory || []).map(h => ({
    type: h.type,
    name: h.name,
    icon: h.icon,
    cardA: h.cardA,
    cardB: h.cardB,
    stats: h.stats,
    skill: h.skill,
    time: new Date(h.timestamp).toLocaleString('ko-KR'),
    ago: _timeAgo(h.timestamp),
  }));
  return { history, count: history.length };
}

/** 상대 시간 텍스트 */
function _timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

// ============================================
// Socket.io 이벤트 등록
// ============================================

function register(io, socket, player) {
  // 합체 가능 여부 체크
  socket.on('fusion_check', (data) => {
    const { cardIdA, cardIdB } = data || {};
    if (!cardIdA || !cardIdB) {
      return socket.emit('fusion_check', { canFuse: false, reason: '카드 ID 2개를 지정하세요' });
    }
    const result = canFuse(player, cardIdA, cardIdB);
    socket.emit('fusion_check', result);
  });

  // 합체 실행
  socket.on('fusion_execute', (data) => {
    const { cardIdA, cardIdB } = data || {};
    if (!cardIdA || !cardIdB) {
      return socket.emit('fusion_execute', { ok: false, reason: '카드 ID 2개를 지정하세요' });
    }
    const result = fuseCards(player, cardIdA, cardIdB);
    socket.emit('fusion_execute', result);

    // 합체 성공 시 전체 공지 (특수 합체만)
    if (result.ok && result.fusedUnit && result.fusedUnit.type === 'special') {
      io.emit('fusion_announce', {
        player: player.name || player.id,
        fusionName: result.fusedUnit.name,
        icon: result.fusedUnit.icon,
        desc: result.fusedUnit.desc,
      });
    }
  });

  // 합체 궁극기 사용
  socket.on('fusion_skill', () => {
    const result = useFusionSkill(player);
    socket.emit('fusion_skill', result);

    // 궁극기 사용 시 전체 이펙트 알림
    if (result.ok) {
      io.emit('fusion_skill_effect', {
        player: player.name || player.id,
        skillName: result.skill.name,
        damage: result.damage,
        effects: result.effects,
      });
    }
  });

  // 합체 해제
  socket.on('fusion_end', () => {
    const result = endFusion(player);
    socket.emit('fusion_end', result);
  });

  // 특수 합체 레시피 목록
  socket.on('fusion_recipes', () => {
    const result = getFusionRecipes(player);
    socket.emit('fusion_recipes', result);
  });

  // 합체 기록
  socket.on('fusion_history', () => {
    const result = getFusionHistory(player);
    socket.emit('fusion_history', result);
  });
}

// ============================================
// 모듈 export
// ============================================
module.exports = {
  FUSION_TYPES,
  SPECIAL_FUSIONS,
  OPPOSITE_PAIRS,
  canFuse,
  fuseCards,
  getFusedUnit,
  useFusionSkill,
  endFusion,
  getFusionRecipes,
  getFusionHistory,
  register,
};

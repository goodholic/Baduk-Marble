// ==========================================
// 고대 언어 (Ancient Language) — v2.44
// 6개 원초 문자 조합으로 마법 직접 생성
// 2~4 문자 조합, 순서에 따라 효과 변화
// ==========================================

// ── 6개 원초 문자 ──
const GLYPHS = {
  ignis:  { name: '이그니스', icon: '🔥', element: 'fire',    desc: '불꽃의 문자', color: '#ff4400' },
  aqua:   { name: '아쿠아',   icon: '💧', element: 'water',   desc: '물결의 문자', color: '#44aaff' },
  terra:  { name: '테라',     icon: '🪨', element: 'earth',   desc: '대지의 문자', color: '#aa8844' },
  ventus: { name: '벤투스',   icon: '💨', element: 'wind',    desc: '바람의 문자', color: '#44ff88' },
  lux:    { name: '룩스',     icon: '✨', element: 'light',   desc: '빛의 문자',   color: '#ffd700' },
  nox:    { name: '녹스',     icon: '🌑', element: 'dark',    desc: '어둠의 문자', color: '#8844cc' },
};

// ── 알려진 주문 (2~4문자 조합) ──
// 키: 문자 ID를 '-'로 연결 (순서 중요!)
const KNOWN_SPELLS = {
  // ═══ 2문자 기본 주문 ═══
  'ignis-ignis':     { name: '화염 폭발', icon: '🔥🔥', tier: 1, type: 'attack', dmgMulti: 4.0, aoe: true, range: 5, burn: { dps: 10, dur: 4 }, cd: 20, mpCost: 40, desc: '이중 화염 — 광역 화염 폭발 + 화상' },
  'aqua-aqua':       { name: '치유의 비', icon: '💧💧', tier: 1, type: 'heal', healPct: 0.30, aoe: true, range: 6, cd: 25, mpCost: 50, desc: '이중 물결 — 주변 아군 HP 30% 회복' },
  'terra-terra':     { name: '대지의 갑옷', icon: '🪨🪨', tier: 1, type: 'buff', defBonus: 30, hpBonus: 200, duration: 15, cd: 30, mpCost: 40, desc: '이중 대지 — DEF +30, HP +200 (15초)' },
  'ventus-ventus':   { name: '질풍 가속', icon: '💨💨', tier: 1, type: 'buff', spdMulti: 2.0, dodgeBonus: 0.20, duration: 10, cd: 20, mpCost: 35, desc: '이중 바람 — SPD x2, 회피 +20% (10초)' },
  'lux-lux':         { name: '심판의 빛', icon: '✨✨', tier: 1, type: 'attack', dmgMulti: 5.0, aoe: true, range: 6, holyDmg: true, cd: 25, mpCost: 55, desc: '이중 빛 — 신성 광역 데미지 (방어 50% 무시)' },
  'nox-nox':         { name: '어둠의 장막', icon: '🌑🌑', tier: 1, type: 'debuff', atkReduce: 0.30, spdReduce: 0.30, range: 6, duration: 8, cd: 25, mpCost: 45, desc: '이중 어둠 — 범위 적 ATK/SPD -30% (8초)' },

  // 대비 원소 조합 (강력하지만 불안정)
  'ignis-aqua':      { name: '증기 폭풍', icon: '🔥💧', tier: 1, type: 'attack', dmgMulti: 3.5, aoe: true, range: 7, blind: 3, cd: 20, mpCost: 45, desc: '불+물 — 뜨거운 증기 (시야 차단 3초)' },
  'aqua-ignis':      { name: '끓는 파도', icon: '💧🔥', tier: 1, type: 'attack', dmgMulti: 4.5, aoe: true, range: 5, burn: { dps: 15, dur: 3 }, cd: 22, mpCost: 50, desc: '물+불 — 끓는 파도 (더 강한 화상)' },
  'lux-nox':         { name: '황혼의 검', icon: '✨🌑', tier: 1, type: 'attack', dmgMulti: 6.0, range: 3, ignoreDefPct: 0.5, cd: 20, mpCost: 50, desc: '빛+어둠 — 방어 50% 무시 단일 일격' },
  'nox-lux':         { name: '여명의 폭발', icon: '🌑✨', tier: 1, type: 'attack', dmgMulti: 3.0, aoe: true, range: 8, stun: 2, cd: 22, mpCost: 55, desc: '어둠+빛 — 광역 기절 2초 + 데미지' },
  'terra-ventus':    { name: '모래 폭풍', icon: '🪨💨', tier: 1, type: 'attack', dmgMulti: 3.0, aoe: true, range: 6, blind: 4, spdReduce: 0.2, cd: 20, mpCost: 40, desc: '대지+바람 — 모래 폭풍 (시야 차단 + 둔화)' },
  'ventus-terra':    { name: '바위 투사', icon: '💨🪨', tier: 1, type: 'attack', dmgMulti: 5.0, range: 8, knockback: true, cd: 18, mpCost: 45, desc: '바람+대지 — 바위를 날려 원거리 일격' },

  // ═══ 3문자 상위 주문 ═══
  'ignis-ignis-ignis':   { name: '인페르노', icon: '🔥🔥🔥', tier: 2, type: 'attack', dmgMulti: 10.0, aoe: true, range: 8, burn: { dps: 25, dur: 6 }, cd: 60, mpCost: 120, desc: '삼중 화염 — 지옥불 (범위 8, 화상 6초)' },
  'aqua-aqua-aqua':      { name: '대해일', icon: '💧💧💧', tier: 2, type: 'attack', dmgMulti: 8.0, aoe: true, range: 10, knockback: true, slow: 0.5, cd: 55, mpCost: 110, desc: '삼중 물결 — 쓰나미 (범위 10, 넉백 + 둔화)' },
  'lux-lux-lux':         { name: '천상의 심판', icon: '✨✨✨', tier: 2, type: 'attack', dmgMulti: 12.0, aoe: true, range: 7, holyDmg: true, healAllyPct: 0.20, cd: 70, mpCost: 150, desc: '삼중 빛 — 적에게 12배 + 아군 20% 회복' },
  'nox-nox-nox':         { name: '심연의 구속', icon: '🌑🌑🌑', tier: 2, type: 'debuff', hpCutPct: 0.20, silence: 5, range: 8, cd: 65, mpCost: 130, desc: '삼중 어둠 — 적 HP 20% 삭감 + 5초 침묵' },
  'ignis-ventus-terra':  { name: '화산 폭발', icon: '🔥💨🪨', tier: 2, type: 'attack', dmgMulti: 9.0, aoe: true, range: 7, burn: { dps: 20, dur: 5 }, stun: 2, cd: 55, mpCost: 120, desc: '불+바람+대지 — 화산 폭발 (화상 + 기절)' },
  'aqua-lux-ventus':     { name: '무지개 축복', icon: '💧✨💨', tier: 2, type: 'buff', allStats: 20, healPct: 0.40, duration: 20, cd: 60, mpCost: 100, desc: '물+빛+바람 — 올스탯 +20 + HP 40% 회복' },
  'nox-ignis-nox':       { name: '지옥의 업화', icon: '🌑🔥🌑', tier: 2, type: 'attack', dmgMulti: 11.0, aoe: true, range: 6, lifesteal: 0.30, cd: 65, mpCost: 140, desc: '어둠+불+어둠 — 암흑 화염 (데미지 30% 흡수)' },
  'terra-lux-aqua':      { name: '생명의 정원', icon: '🪨✨💧', tier: 2, type: 'heal', healPct: 0.60, regenPct: 0.05, regenDuration: 15, range: 8, cd: 50, mpCost: 110, desc: '대지+빛+물 — 60% 즉시 회복 + 15초 리젠' },
  'ventus-nox-ignis':    { name: '흑염룡', icon: '💨🌑🔥', tier: 2, type: 'attack', dmgMulti: 8.0, aoe: true, range: 6, burn: { dps: 30, dur: 4 }, fearDuration: 3, cd: 55, mpCost: 130, desc: '바람+어둠+불 — 흑염룡 소환 (화상 + 공포)' },

  // ═══ 4문자 궁극 주문 (매우 강력) ═══
  'ignis-aqua-terra-ventus': { name: '원소의 조화', icon: '🔥💧🪨💨', tier: 3, type: 'attack', dmgMulti: 15.0, aoe: true, range: 10, allElements: true, stun: 3, cd: 120, mpCost: 250, desc: '4원소 — 원소 대폭발 (15배 + 전 상태이상)' },
  'lux-nox-lux-nox':         { name: '혼돈과 질서', icon: '✨🌑✨🌑', tier: 3, type: 'attack', dmgMulti: 20.0, aoe: true, range: 8, ignoreDefPct: 0.8, cd: 150, mpCost: 300, desc: '빛어둠빛어둠 — 방어 80% 무시 20배 광역' },
  'nox-nox-nox-nox':         { name: '영원한 어둠', icon: '🌑🌑🌑🌑', tier: 3, type: 'debuff', hpCutPct: 0.40, silence: 8, fearDuration: 5, range: 10, cd: 180, mpCost: 280, desc: '4중 어둠 — HP 40% 삭감 + 침묵 + 공포' },
  'lux-lux-lux-lux':         { name: '창세의 빛', icon: '✨✨✨✨', tier: 3, type: 'ultimate', dmgMulti: 25.0, aoe: true, range: 12, healAllyPct: 0.50, reviveAlly: true, cd: 300, mpCost: 400, desc: '4중 빛 — 25배 + 아군 50% 힐 + 사망자 부활' },
  'ignis-nox-aqua-lux':      { name: '세계의 균열', icon: '🔥🌑💧✨', tier: 3, type: 'attack', dmgMulti: 18.0, aoe: true, range: 9, banish: 5, cd: 160, mpCost: 320, desc: '화암수광 — 차원 균열 (18배 + 5초 추방)' },
};

// ── 랜덤 실험 결과 (알려지지 않은 조합) ──
const EXPERIMENT_RESULTS = [
  { name: '마력 역류', type: 'backfire', desc: '주문 폭발! HP -20%', effect: { hpLossPct: 0.20 } },
  { name: '불안정한 폭발', type: 'backfire', desc: '랜덤 방향 폭발 (ATK 3배)', effect: { dmgMulti: 3.0, randomDir: true } },
  { name: '일시적 강화', type: 'buff', desc: '10초간 ATK +30', effect: { atk: 30, duration: 10 } },
  { name: '원소 흡수', type: 'heal', desc: 'MP 50 회복', effect: { mpHeal: 50 } },
  { name: '차원의 메아리', type: 'special', desc: '랜덤 위치로 텔레포트', effect: { teleport: true } },
  { name: '문자의 공명', type: 'special', desc: '별가루 +20', effect: { stardust: 20 } },
  { name: '고대의 지식', type: 'special', desc: 'EXP +500', effect: { exp: 500 } },
];

// ── 문자 숙련도 ──
const MASTERY_LEVELS = [
  { level: 1, name: '문자 해독자', exp: 0, bonus: 0 },
  { level: 2, name: '주문 수습생', exp: 200, bonus: 0.05 },
  { level: 3, name: '주문사', exp: 600, bonus: 0.10 },
  { level: 4, name: '대주문사', exp: 1500, bonus: 0.15 },
  { level: 5, name: '언어의 현자', exp: 4000, bonus: 0.20 },
  { level: 6, name: '고대어의 지배자', exp: 10000, bonus: 0.30 },
];

function _ensure(player) {
  if (!player._ancientLang) {
    player._ancientLang = {
      glyphs: {},          // { glyphId: count }
      discoveredSpells: {}, // { spellKey: { firstCast, castCount } }
      mastery: 0,
      masteryLevel: 1,
      cooldowns: {},       // { spellKey: lastCastTime }
      totalCasts: 0,
      totalExperiments: 0,
      favoriteSpell: null,
    };
  }
  return player._ancientLang;
}

function _getMasteryLevel(mastery) {
  for (let i = MASTERY_LEVELS.length - 1; i >= 0; i--) {
    if (mastery >= MASTERY_LEVELS[i].exp) return MASTERY_LEVELS[i];
  }
  return MASTERY_LEVELS[0];
}

// ── 문자 획득 (몬스터 드롭) ──
function tryDropGlyph(player, monsterTier) {
  const al = _ensure(player);
  const rates = { normal: 0.03, elite: 0.08, rare: 0.12, boss: 0.20, legendary: 0.35, worldboss: 0.50 };
  const rate = rates[monsterTier] || 0.03;
  if (Math.random() >= rate) return null;

  const glyphIds = Object.keys(GLYPHS);
  // 빛/어둠은 희귀
  const weights = glyphIds.map(g => (g === 'lux' || g === 'nox') ? 1 : 3);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  let roll = Math.random() * totalWeight;
  let chosen = glyphIds[0];
  for (let i = 0; i < glyphIds.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { chosen = glyphIds[i]; break; }
  }

  al.glyphs[chosen] = (al.glyphs[chosen] || 0) + 1;
  return { glyphId: chosen, glyph: GLYPHS[chosen] };
}

// ── 주문 시전 (문자 조합) ──
function castSpell(player, glyphSequence) {
  const al = _ensure(player);
  if (!Array.isArray(glyphSequence) || glyphSequence.length < 2 || glyphSequence.length > 4) {
    return { success: false, msg: '2~4개 문자를 조합하세요' };
  }

  // 문자 보유 체크
  const needed = {};
  for (const gId of glyphSequence) {
    if (!GLYPHS[gId]) return { success: false, msg: `잘못된 문자: ${gId}` };
    needed[gId] = (needed[gId] || 0) + 1;
  }
  for (const [gId, count] of Object.entries(needed)) {
    if ((al.glyphs[gId] || 0) < count) {
      return { success: false, msg: `${GLYPHS[gId].name} 부족 (${al.glyphs[gId] || 0}/${count})` };
    }
  }

  const spellKey = glyphSequence.join('-');
  const spell = KNOWN_SPELLS[spellKey];

  // 쿨다운 체크 (알려진 주문만)
  if (spell) {
    const now = Date.now();
    const lastCast = al.cooldowns[spellKey] || 0;
    const cdRemain = Math.ceil((lastCast + spell.cd * 1000 - now) / 1000);
    if (cdRemain > 0) return { success: false, msg: `쿨다운 (${cdRemain}초)` };

    // MP 체크
    if (spell.mpCost && (player.mp || 0) < spell.mpCost) {
      return { success: false, msg: `MP 부족 (${spell.mpCost})` };
    }
  }

  // 문자 소모
  for (const [gId, count] of Object.entries(needed)) {
    al.glyphs[gId] -= count;
    if (al.glyphs[gId] <= 0) delete al.glyphs[gId];
  }

  if (spell) {
    // 알려진 주문 시전
    if (spell.mpCost) player.mp = Math.max(0, (player.mp || 0) - spell.mpCost);
    al.cooldowns[spellKey] = Date.now();
    al.totalCasts++;

    // 숙련도 EXP
    const expGain = spell.tier === 1 ? 15 : spell.tier === 2 ? 40 : 100;
    al.mastery += expGain;
    al.masteryLevel = _getMasteryLevel(al.mastery).level;

    // 발견 기록
    if (!al.discoveredSpells[spellKey]) {
      al.discoveredSpells[spellKey] = { firstCast: Date.now(), castCount: 0 };
    }
    al.discoveredSpells[spellKey].castCount++;

    const masteryBonus = _getMasteryLevel(al.mastery).bonus;
    const enhancedMulti = spell.dmgMulti ? spell.dmgMulti * (1 + masteryBonus) : undefined;

    return {
      success: true, known: true, spell, spellKey, enhancedMulti,
      msg: `${spell.icon} ${spell.name}! — ${spell.desc}`,
      newDiscovery: al.discoveredSpells[spellKey].castCount === 1,
    };
  } else {
    // 알려지지 않은 조합 → 실험
    al.totalExperiments++;
    al.mastery += 5;
    al.masteryLevel = _getMasteryLevel(al.mastery).level;

    const result = EXPERIMENT_RESULTS[Math.floor(Math.random() * EXPERIMENT_RESULTS.length)];
    return {
      success: true, known: false, experiment: result,
      msg: `⚗️ 미지의 조합! ${result.name}: ${result.desc}`,
    };
  }
}

// ── 주문서 확인 (발견한 조합 목록) ──
function getSpellbook(player) {
  const al = _ensure(player);
  const discovered = [];
  const undiscovered = [];
  const now = Date.now();

  for (const [key, spell] of Object.entries(KNOWN_SPELLS)) {
    const disc = al.discoveredSpells[key];
    const lastCast = al.cooldowns[key] || 0;
    const cdRemain = Math.max(0, Math.ceil((lastCast + spell.cd * 1000 - now) / 1000));
    if (disc) {
      discovered.push({
        key, ...spell, castCount: disc.castCount, cdRemain,
        glyphs: key.split('-').map(g => GLYPHS[g]),
      });
    } else {
      undiscovered.push({ tier: spell.tier, glyphCount: key.split('-').length });
    }
  }

  return { discovered, undiscovered };
}

// ── 상태 조회 ──
function getStatus(player) {
  const al = _ensure(player);
  const ml = _getMasteryLevel(al.mastery);
  const nextMl = MASTERY_LEVELS[Math.min(ml.level, MASTERY_LEVELS.length - 1)];
  const spellbook = getSpellbook(player);

  return {
    glyphs: Object.entries(al.glyphs).map(([id, count]) => ({
      id, count, ...GLYPHS[id],
    })),
    allGlyphs: Object.entries(GLYPHS).map(([id, g]) => ({
      id, ...g, count: al.glyphs[id] || 0,
    })),
    mastery: al.mastery,
    masteryLevel: ml.level,
    masteryName: ml.name,
    masteryBonus: Math.floor(ml.bonus * 100),
    nextMasteryExp: nextMl.exp,
    totalCasts: al.totalCasts,
    totalExperiments: al.totalExperiments,
    discoveredCount: spellbook.discovered.length,
    totalSpells: Object.keys(KNOWN_SPELLS).length,
    discovered: spellbook.discovered,
    undiscoveredByTier: {
      1: spellbook.undiscovered.filter(u => u.tier === 1).length,
      2: spellbook.undiscovered.filter(u => u.tier === 2).length,
      3: spellbook.undiscovered.filter(u => u.tier === 3).length,
    },
  };
}

module.exports = {
  GLYPHS, KNOWN_SPELLS, EXPERIMENT_RESULTS, MASTERY_LEVELS,
  tryDropGlyph, castSpell, getSpellbook, getStatus,
};

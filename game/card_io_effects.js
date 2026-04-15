// ============================================
// IO 전투 중 카드 효과 발동 시스템
// 카드게임에서 세팅한 카드가 IO 전투에 영향
// IO<->Card 핵심 루프: 카드 = 전략 허브, IO = 액션 모드
// ============================================

const MAX_IO_PARTY = 5;
const SWAP_COOLDOWN = 300000; // 5분
const GRADE_ORDER = ['normal', 'rare', 'epic', 'legend', 'myth'];
const ELEMENT_TYPES = ['fire', 'ice', 'thunder', 'holy', 'void', 'nature'];

// ============================================
// IO 중 발동 가능한 카드 효과 (25+)
// ============================================
const IO_CARD_EFFECTS = [
  // ─── Match Start Buffs (IO 시작 시 자동 적용) ───
  { trigger: 'match_start', name: '전사의 기운', req: { partyType: 'warrior', count: 2 }, effect: { atk: 1.15 }, icon: '⚔️', desc: '전사 카드 2장 이상 -> ATK+15%' },
  { trigger: 'match_start', name: '마법사의 지혜', req: { partyType: 'mage', count: 2 }, effect: { matk: 1.2 }, icon: '🔮', desc: '마법사 카드 2장 이상 -> 마공+20%' },
  { trigger: 'match_start', name: '수호의 결의', req: { partyGrade: 'epic', count: 3 }, effect: { def: 1.2 }, icon: '🛡️', desc: '에픽+ 카드 3장 이상 -> DEF+20%' },
  { trigger: 'match_start', name: '전설의 힘', req: { partyGrade: 'legend', count: 1 }, effect: { atk: 1.2, def: 1.2, hp: 1.2, matk: 1.2, spd: 1.2 }, icon: '👑', desc: '전설+ 카드 보유 -> 전스탯+20%' },
  { trigger: 'match_start', name: '각성자의 위엄', req: { awakened: true, count: 1 }, effect: { atk: 1.3, hp: 1.2 }, icon: '🌟', desc: '각성 카드 보유 -> ATK+30%, HP+20%' },
  { trigger: 'match_start', name: '인챈트 공명', req: { enchantedCount: 3 }, effect: { enchantDouble: true }, icon: '✨✨', desc: '인챈트 카드 3장+ -> 인챈트 효과 2배' },
  { trigger: 'match_start', name: '인연의 힘', req: { activeBond: true }, effect: { bondBonus: 1.5 }, icon: '💞', desc: '활성 인연 -> 인연 보너스 IO에서 +50%' },
  { trigger: 'match_start', name: '운명의 가호', req: { destiny: 'destiny_hero' }, effect: { teamAtk: 1.1 }, icon: '⭐', desc: '"영웅의 운명" 보유 -> 팀 ATK+10%' },

  // ─── On Kill Effects (킬 시 발동) ───
  { trigger: 'on_kill', name: '전리품 사냥', req: { hasSkill: 'sk_lifesteal' }, effect: { goldPerKill: 50 }, icon: '💰', desc: '흡혈 스킬 보유 -> 킬당 골드+50' },
  { trigger: 'on_kill', name: '연쇄 처형', req: { hasSkill: 'sk_backstab' }, effect: { critNext: true }, icon: '💥', desc: '급소공격 스킬 -> 킬 후 다음 공격 크리 확정' },
  { trigger: 'on_kill', name: '영혼 수집', req: { partyGrade: 'epic', count: 1 }, effect: { cardDropChance: 0.01 }, icon: '👻', desc: '에픽+ 카드 보유 -> 킬당 1% 확률 카드 획득' },
  { trigger: 'on_kill', name: '약탈자', req: { partyType: 'assassin', count: 1 }, effect: { stealGold: 100 }, icon: '🗡️💰', desc: '암살자 카드 보유 -> 킬 시 상대에게서 100G 약탈' },
  { trigger: 'on_kill', name: '연쇄 폭발', req: { partyType: 'mage', count: 1 }, effect: { chainExplosion: true, chainWindow: 10000, chainThreshold: 3 }, icon: '💥💥💥', desc: '마법사 카드 보유 -> 10초 내 3킬 시 AoE 폭발' },
  { trigger: 'on_kill', name: '처형자', req: { partyGrade: 'legend', count: 1 }, effect: { stealKillStreak: true }, icon: '⚔️👑', desc: '전설+ 카드 -> 나보다 많은 킬 가진 적 처치 시 킬 스트릭 버프 훔침' },

  // ─── On Death / Low HP (사망/저체력 시) ───
  { trigger: 'on_low_hp', name: '불사조의 깃털', req: { hasEquip: 'eq_phoenix_feather' }, effect: { revive: true }, icon: '🔥🪶', desc: '불사조 깃털 장착 -> HP 20% 이하 시 1회 부활' },
  { trigger: 'on_low_hp', name: '최후의 저항', req: { partyType: 'warrior', count: 1 }, effect: { lastStandAtk: 2.0, lastStandDuration: 5000 }, icon: '🔥⚔️', desc: '전사 카드 보유 -> HP<10% 시 ATK 2배 (5초)' },
  { trigger: 'on_death', name: '용서받은 자', req: { enchantType: 'enc_eternity' }, effect: { deathRevive: true, reviveHp: 0.3 }, icon: '👼✨', desc: '영원 인챈트 보유 -> 사망 시 HP 30% 부활 (매치당 1회)' },
  { trigger: 'on_death', name: '분노의 유산', req: { partyGrade: 'epic', count: 2 }, effect: { deathExplosion: true, explosionDmg: 0.5 }, icon: '💀💥', desc: '에픽+ 2장 -> 사망 시 ATK 50% 범위 폭발' },

  // ─── Passive Effects (항시 적용) ───
  { trigger: 'passive', name: '골드 자석', req: { hasBuilding: 'fb_mine', level: 3 }, effect: { goldPickupRange: 2.0 }, icon: '🧲💰', desc: '금광 Lv.3+ -> 골드 수집 범위 2배' },
  { trigger: 'passive', name: '경험의 서', req: { hasBuilding: 'fb_lab', level: 2 }, effect: { expMul: 1.15 }, icon: '📚', desc: '연구소 Lv.2+ -> IO 경험치 +15%' },
  { trigger: 'passive', name: '카드 마스터', req: { partySize: 5 }, effect: { allEffectBonus: 1.15 }, icon: '🃏👑', desc: '파티 5장 -> 모든 카드 효과 +15%' },
  { trigger: 'passive', name: '기지 연동', req: { hasBuilding: 'fb_fortress', level: 3 }, effect: { autoTurret: true }, icon: '🏰🔫', desc: '요새 Lv.3+ -> IO 스폰 근처 자동 터렛 설치' },
  { trigger: 'passive', name: '무역왕의 직감', req: { tradeReputation: '대상인' }, effect: { shopDiscount: 0.2 }, icon: '🏪💎', desc: '무역 평판 대상인+ -> IO 상점 가격 -20%' },
  { trigger: 'passive', name: '각성 오라', req: { awakened: true, count: 2 }, effect: { allyAtkAura: 0.05, auraRange: 200 }, icon: '🌟🌟', desc: '각성 카드 2장+ -> 주변 아군 ATK+5% 오라' },

  // ─── Summon Effects (소환) ───
  { trigger: 'summon', name: '용병 소환', req: { partySize: 3 }, effect: { summonMerc: true, duration: 30 }, icon: '📜⚔️', desc: '파티 3장+ -> 30초간 용병 1명 소환 (쿨 3분)' },
  { trigger: 'summon', name: '전설 소환', req: { partyGrade: 'legend', count: 1 }, effect: { summonLegend: true, duration: 20 }, icon: '🌟⚔️', desc: '전설 카드 보유 -> 20초간 전설 용병 소환 (쿨 5분)' },
  { trigger: 'summon', name: '군단 소환', req: { partySize: 5 }, effect: { summonAll: true, duration: 15, cooldown: 600000 }, icon: '⚔️⚔️⚔️', desc: '파티 5장 -> 전원 AI 용병 소환 15초 (쿨 10분)' },
  { trigger: 'summon', name: '각성 소환', req: { awakened: true, count: 1 }, effect: { summonAwakened: true, duration: 20, cooldown: 300000 }, icon: '🌟⚔️✨', desc: '각성 카드 -> 각성 폼 소환 20초 (쿨 5분)' },
  { trigger: 'summon', name: '드래곤 소환', req: { partyRace: 'dragon', count: 1 }, effect: { summonDragon: true, duration: 30, flying: true, cooldown: 600000 }, icon: '🐲🔥', desc: '용족 카드 -> 드래곤 마운트 30초 (비행!)' },
];

// ============================================
// IO 시작 시 플레이어 카드 효과 계산
// ============================================
function calcIOCardEffects(player) {
  const effects = [];
  const partyIds = player.ioParty || [];
  const partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
  const fort = player.fortress || { buildings: {} };

  for (const eff of IO_CARD_EFFECTS) {
    let active = false;

    // 파티 크기 조건
    if (eff.req.partySize && partyCards.length >= eff.req.partySize) active = true;

    // 직업 타입 조건
    if (eff.req.partyType) {
      const count = partyCards.filter(c => c.classId === eff.req.partyType || c.className === eff.req.partyType).length;
      if (count >= (eff.req.count || 1)) active = true;
    }

    // 등급 조건
    if (eff.req.partyGrade) {
      const minIdx = GRADE_ORDER.indexOf(eff.req.partyGrade);
      const count = partyCards.filter(c => GRADE_ORDER.indexOf(c.grade) >= minIdx).length;
      if (count >= (eff.req.count || 1)) active = true;
    }

    // 스킬 보유 조건
    if (eff.req.hasSkill) {
      if (partyCards.some(c => (c.skills || []).some(s => s.id === eff.req.hasSkill))) active = true;
    }

    // 장비 보유 조건
    if (eff.req.hasEquip) {
      if (partyCards.some(c => Object.values(c.equipment || {}).some(e => e.id === eff.req.hasEquip))) active = true;
    }

    // 건물 조건
    if (eff.req.hasBuilding) {
      const bLv = fort.buildings[eff.req.hasBuilding] || 0;
      if (bLv >= (eff.req.level || 1)) active = true;
    }

    // 각성 카드 조건
    if (eff.req.awakened) {
      const awakenedCount = partyCards.filter(c => c.awakened).length;
      if (awakenedCount >= (eff.req.count || 1)) active = true;
    }

    // 인챈트 카드 수 조건
    if (eff.req.enchantedCount) {
      const enchCount = partyCards.filter(c => (c.enchants || []).length > 0).length;
      if (enchCount >= eff.req.enchantedCount) active = true;
    }

    // 특정 인챈트 타입 조건
    if (eff.req.enchantType) {
      if (partyCards.some(c => (c.enchants || []).some(e => e.id === eff.req.enchantType))) active = true;
    }

    // 활성 인연 조건
    if (eff.req.activeBond) {
      if (player._activeBonds && player._activeBonds.length > 0) active = true;
    }

    // 운명 조건
    if (eff.req.destiny) {
      if (partyCards.some(c => c.destiny === eff.req.destiny)) active = true;
    }

    // 종족 조건
    if (eff.req.partyRace) {
      const raceCount = partyCards.filter(c => c.race === eff.req.partyRace).length;
      if (raceCount >= (eff.req.count || 1)) active = true;
    }

    // 무역 평판 조건
    if (eff.req.tradeReputation) {
      const rep = (player.tradeReputation || '');
      const repOrder = ['초보상인', '행상인', '상인', '대상인', '무역왕'];
      const reqIdx = repOrder.indexOf(eff.req.tradeReputation);
      const curIdx = repOrder.indexOf(rep);
      if (curIdx >= reqIdx && reqIdx >= 0) active = true;
    }

    if (active) effects.push(eff);
  }

  // '카드 마스터' 효과: 모든 효과에 +15% 적용
  const hasMaster = effects.some(e => e.effect.allEffectBonus);
  if (hasMaster) {
    for (const eff of effects) {
      if (eff.effect.allEffectBonus) continue; // 자기 자신은 스킵
      eff._boosted = true;
    }
  }

  return effects;
}

// ============================================
// IO 킬 시 효과 체크
// ============================================
function onIOKill(player, effects, killedPlayer) {
  const results = [];
  const now = Date.now();

  for (const eff of effects) {
    if (eff.trigger !== 'on_kill') continue;

    if (eff.effect.goldPerKill) {
      player.gold = (player.gold || 0) + eff.effect.goldPerKill;
      results.push({ name: eff.name, msg: `+${eff.effect.goldPerKill}G` });
    }

    if (eff.effect.critNext) {
      player._nextCrit = true;
      results.push({ name: eff.name, msg: '다음 공격 크리 확정!' });
    }

    if (eff.effect.stealGold && killedPlayer) {
      const stolen = Math.min(eff.effect.stealGold, killedPlayer.gold || 0);
      if (stolen > 0) {
        killedPlayer.gold = (killedPlayer.gold || 0) - stolen;
        player.gold = (player.gold || 0) + stolen;
        results.push({ name: eff.name, msg: `${stolen}G 약탈!` });
      }
    }

    if (eff.effect.cardDropChance) {
      if (Math.random() < eff.effect.cardDropChance) {
        const droppedCard = _generateDropCard(killedPlayer);
        if (droppedCard) {
          player.cards = player.cards || [];
          player.cards.push(droppedCard);
          results.push({ name: eff.name, msg: `영혼 수집! ${droppedCard.name} 획득!` });
        }
      }
    }

    // 연쇄 폭발 트래킹
    if (eff.effect.chainExplosion) {
      player._killTimestamps = player._killTimestamps || [];
      player._killTimestamps.push(now);
      // 윈도우 내 킬만 유지
      player._killTimestamps = player._killTimestamps.filter(t => now - t < eff.effect.chainWindow);
      if (player._killTimestamps.length >= eff.effect.chainThreshold) {
        player._killTimestamps = [];
        results.push({ name: eff.name, msg: '연쇄 폭발 발동! AoE!', aoe: true, aoeDmg: (player.atk || 100) * 0.8 });
      }
    }

    // 처형자: 킬 스트릭 훔치기
    if (eff.effect.stealKillStreak && killedPlayer) {
      const myKills = player._ioKills || 0;
      const theirKills = killedPlayer._ioKills || 0;
      if (theirKills > myKills) {
        player._stolenStreakBuff = true;
        player._stolenStreakValue = theirKills;
        results.push({ name: eff.name, msg: `킬 스트릭 버프 탈취! (${theirKills}킬 기반)` });
      }
    }
  }

  // 킬 카운트 증가
  player._ioKills = (player._ioKills || 0) + 1;

  return results;
}

// 킬 시 카드 드롭 생성 (간단)
function _generateDropCard(killedPlayer) {
  if (!killedPlayer) return null;
  const pool = killedPlayer.ioParty || [];
  const cards = (killedPlayer.cards || []).filter(c => pool.includes(c.id));
  if (cards.length === 0) return null;
  const src = cards[Math.floor(Math.random() * cards.length)];
  return {
    id: `drop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: src.name,
    grade: 'normal', // 드롭 카드는 항상 normal 등급으로
    level: 1,
    stars: 0,
    race: src.race,
    classId: src.classId,
    origin: 'io_soul_collect',
  };
}

// ============================================
// 저체력/사망 효과 체크
// ============================================
function onLowHP(player, effects, hpRatio) {
  const results = [];

  for (const eff of effects) {
    if (eff.trigger !== 'on_low_hp') continue;

    if (eff.effect.revive && hpRatio <= 0.2 && !player._phoenixUsed) {
      player._phoenixUsed = true;
      results.push({ name: eff.name, msg: '불사조 부활!', revive: true, healRatio: 0.5 });
    }

    if (eff.effect.lastStandAtk && hpRatio <= 0.1 && !player._lastStandUsed) {
      player._lastStandUsed = true;
      results.push({
        name: eff.name,
        msg: `최후의 저항! ATK x${eff.effect.lastStandAtk} (${eff.effect.lastStandDuration / 1000}초)`,
        atkMul: eff.effect.lastStandAtk,
        duration: eff.effect.lastStandDuration,
      });
    }
  }

  return results;
}

function onDeath(player, effects) {
  const results = [];

  for (const eff of effects) {
    if (eff.trigger !== 'on_death') continue;

    if (eff.effect.deathRevive && !player._deathReviveUsed) {
      player._deathReviveUsed = true;
      results.push({
        name: eff.name,
        msg: `용서받은 자! HP ${eff.effect.reviveHp * 100}%로 부활!`,
        revive: true,
        healRatio: eff.effect.reviveHp,
      });
    }

    if (eff.effect.deathExplosion) {
      results.push({
        name: eff.name,
        msg: '분노의 유산! 범위 폭발!',
        aoe: true,
        aoeDmg: (player.atk || 100) * eff.effect.explosionDmg,
      });
    }
  }

  return results;
}

// ============================================
// Party Setup System — 전략적 파티 관리
// ============================================
function setIOParty(player, cardIds) {
  if (!Array.isArray(cardIds)) return { ok: false, reason: '카드 ID 배열이 필요합니다' };
  if (cardIds.length > MAX_IO_PARTY) return { ok: false, reason: `최대 ${MAX_IO_PARTY}장까지 가능합니다` };
  if (cardIds.length === 0) return { ok: false, reason: '최소 1장의 카드가 필요합니다' };

  const allCards = player.cards || [];
  const partyCards = [];
  for (const id of cardIds) {
    const card = allCards.find(c => c.id === id);
    if (!card) return { ok: false, reason: `카드 [${id}] 을 찾을 수 없습니다` };
    partyCards.push(card);
  }

  // 중복 체크
  const unique = new Set(cardIds);
  if (unique.size !== cardIds.length) return { ok: false, reason: '중복 카드는 불가합니다' };

  player.ioParty = cardIds;

  // 파티 파워 스코어 계산
  const powerScore = _calcPartyPower(partyCards);

  // 시너지 체크
  const synergies = _checkSynergies(partyCards, player);

  // 원소 커버리지
  const elements = _checkElementCoverage(partyCards);

  // 추천사항
  const recommendations = _getRecommendations(partyCards, allCards, player);

  return {
    ok: true,
    party: cardIds,
    partySize: cardIds.length,
    powerScore,
    synergies,
    elements,
    recommendations,
    msg: `IO 파티 설정 완료! 파워: ${powerScore}`,
  };
}

function getPartyAnalysis(player) {
  const partyIds = player.ioParty || [];
  const allCards = player.cards || [];
  const partyCards = allCards.filter(c => partyIds.includes(c.id));

  if (partyCards.length === 0) {
    return { ok: false, reason: 'IO 파티가 설정되지 않았습니다', suggestion: '먼저 io_set_party로 파티를 설정하세요' };
  }

  const powerScore = _calcPartyPower(partyCards);
  const activeEffects = calcIOCardEffects(player);
  const synergies = _checkSynergies(partyCards, player);
  const elements = _checkElementCoverage(partyCards);
  const weaknesses = _findWeaknesses(partyCards);
  const recommendations = _getRecommendations(partyCards, allCards, player);
  const optimalParty = _suggestOptimalParty(allCards, player);

  return {
    ok: true,
    totalPower: powerScore,
    partyCards: partyCards.map(c => ({
      id: c.id, name: c.name, grade: c.grade, level: c.level || 1,
      race: c.race, classId: c.classId, awakened: !!c.awakened,
      enchants: (c.enchants || []).length,
    })),
    activeEffects: activeEffects.map(e => ({ name: e.name, icon: e.icon, desc: e.desc })),
    activeBonds: synergies.bonds,
    elementCoverage: elements,
    weaknesses,
    recommendations,
    optimalSuggestion: optimalParty,
  };
}

function _calcPartyPower(cards) {
  let power = 0;
  for (const c of cards) {
    const gradeBonus = { normal: 1, rare: 1.5, epic: 2.5, legend: 4, myth: 7 };
    const base = (c.atk || 10) + (c.def || 5) + (c.hp || 50) + (c.matk || 0);
    const gradeMul = gradeBonus[c.grade] || 1;
    const levelMul = 1 + ((c.level || 1) - 1) * 0.05;
    const starMul = 1 + (c.stars || 0) * 0.1;
    const awakenMul = c.awakened ? 2.0 : 1.0;
    power += Math.floor(base * gradeMul * levelMul * starMul * awakenMul);
  }
  return power;
}

function _checkSynergies(partyCards, player) {
  const result = { bonds: [], raceSynergy: [], classSynergy: [] };

  // 인연 체크
  if (player._activeBonds) {
    result.bonds = player._activeBonds.map(b => ({ name: b.name, icon: b.icon }));
  }

  // 종족 시너지
  const raceCounts = {};
  for (const c of partyCards) {
    if (c.race) raceCounts[c.race] = (raceCounts[c.race] || 0) + 1;
  }
  for (const [race, count] of Object.entries(raceCounts)) {
    if (count >= 2) result.raceSynergy.push({ race, count, bonus: `+${count * 5}% 종족 보너스` });
  }

  // 직업 시너지
  const classCounts = {};
  for (const c of partyCards) {
    if (c.classId) classCounts[c.classId] = (classCounts[c.classId] || 0) + 1;
  }
  for (const [cls, count] of Object.entries(classCounts)) {
    if (count >= 2) result.classSynergy.push({ classId: cls, count, bonus: `+${count * 5}% 직업 보너스` });
  }

  return result;
}

function _checkElementCoverage(partyCards) {
  const covered = new Set();
  for (const c of partyCards) {
    for (const enc of (c.enchants || [])) {
      if (enc.id === 'enc_flame') covered.add('fire');
      if (enc.id === 'enc_frost') covered.add('ice');
      if (enc.id === 'enc_thunder') covered.add('thunder');
      if (enc.id === 'enc_holy') covered.add('holy');
      if (enc.id === 'enc_void') covered.add('void');
    }
    if (c.element) covered.add(c.element);
  }
  return {
    covered: [...covered],
    missing: ELEMENT_TYPES.filter(e => !covered.has(e)),
    coverage: `${covered.size}/${ELEMENT_TYPES.length}`,
  };
}

function _findWeaknesses(partyCards) {
  const weaknesses = [];
  const hasHealer = partyCards.some(c => c.classId === 'healer');
  const hasTank = partyCards.some(c => c.classId === 'warrior' || c.classId === 'golem');
  const hasDps = partyCards.some(c => ['mage', 'ranger', 'assassin'].includes(c.classId));

  if (!hasHealer && partyCards.length >= 3) weaknesses.push('치유사 부재 - 지속력 부족');
  if (!hasTank) weaknesses.push('탱커 부재 - 생존력 취약');
  if (!hasDps) weaknesses.push('딜러 부재 - 화력 부족');

  const avgLevel = partyCards.reduce((s, c) => s + (c.level || 1), 0) / (partyCards.length || 1);
  if (avgLevel < 10) weaknesses.push('평균 레벨 낮음 - 카드 육성 필요');

  const legendCount = partyCards.filter(c => GRADE_ORDER.indexOf(c.grade) >= 3).length;
  if (legendCount === 0 && partyCards.length >= 3) weaknesses.push('고급 카드 부재 - 전설+ 카드 추가 권장');

  return weaknesses;
}

function _getRecommendations(partyCards, allCards, player) {
  const recs = [];
  const partyIds = new Set(partyCards.map(c => c.id));
  const available = allCards.filter(c => !partyIds.has(c.id));

  if (partyCards.length < MAX_IO_PARTY && available.length > 0) {
    // 가장 강한 미사용 카드 추천
    const sorted = [...available].sort((a, b) => {
      const ga = GRADE_ORDER.indexOf(a.grade) || 0;
      const gb = GRADE_ORDER.indexOf(b.grade) || 0;
      return gb - ga || (b.level || 1) - (a.level || 1);
    });
    const top = sorted[0];
    if (top) recs.push(`[${top.name}](${top.grade}) 추가 추천 - 슬롯 여유 있음`);
  }

  // 각성 카드 추천
  const awakenedAvail = available.filter(c => c.awakened);
  if (awakenedAvail.length > 0 && !partyCards.some(c => c.awakened)) {
    recs.push(`각성 카드 [${awakenedAvail[0].name}] 추가하면 '각성자의 위엄' 효과 발동`);
  }

  // 인챈트 추천
  const enchParty = partyCards.filter(c => (c.enchants || []).length > 0).length;
  if (enchParty < 3) {
    const enchAvail = available.filter(c => (c.enchants || []).length > 0);
    if (enchAvail.length > 0) recs.push(`인챈트 카드 추가하면 '인챈트 공명' 발동 가능 (현재 ${enchParty}/3)`);
  }

  return recs;
}

function _suggestOptimalParty(allCards, player) {
  if (allCards.length <= MAX_IO_PARTY) {
    return { suggestion: allCards.map(c => c.id), reason: '보유 카드가 5장 이하 - 전부 편성 추천' };
  }

  // 등급+레벨 기준 상위 5장
  const sorted = [...allCards].sort((a, b) => {
    const ga = GRADE_ORDER.indexOf(a.grade) || 0;
    const gb = GRADE_ORDER.indexOf(b.grade) || 0;
    if (gb !== ga) return gb - ga;
    if ((b.awakened ? 1 : 0) !== (a.awakened ? 1 : 0)) return (b.awakened ? 1 : 0) - (a.awakened ? 1 : 0);
    return (b.level || 1) - (a.level || 1);
  });

  const top5 = sorted.slice(0, MAX_IO_PARTY);
  return {
    suggestion: top5.map(c => ({ id: c.id, name: c.name, grade: c.grade })),
    reason: '등급/각성/레벨 기준 최적 파티',
  };
}

// ============================================
// IO Battle Results -> Card Rewards
// ============================================
function processIORewards(player, matchResult) {
  const { rank, kills, survivalTime, totalPlayers } = matchResult;
  const partyIds = player.ioParty || [];
  const partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
  const rewards = { exp: 0, gold: 0, diamonds: 0, awakenStones: 0, seasonPoints: 0, cardDrops: [], loyalty: 0 };
  const breakdown = [];

  // ─── Base Rewards by Rank ───
  const rankRatio = 1 - (rank - 1) / (totalPlayers || 10);
  const baseGold = Math.floor(100 + rankRatio * 400); // 100~500G
  const baseExp = Math.floor(50 + rankRatio * 200);   // 50~250 EXP
  rewards.gold += baseGold;
  rewards.exp += baseExp;
  breakdown.push(`순위 ${rank}/${totalPlayers} -> +${baseGold}G, +${baseExp} EXP`);

  // ─── Kill Rewards ───
  const killGold = kills * 30;
  const killExp = kills * 20;
  rewards.gold += killGold;
  rewards.exp += killExp;
  if (kills > 0) breakdown.push(`${kills}킬 -> +${killGold}G, +${killExp} EXP`);

  // ─── Survival Time Bonus ───
  const survivalMin = Math.floor((survivalTime || 0) / 60000);
  const survivalBonus = survivalMin * 10;
  rewards.gold += survivalBonus;
  if (survivalBonus > 0) breakdown.push(`생존 ${survivalMin}분 -> +${survivalBonus}G`);

  // ─── Top 3 Finish Bonuses ───
  if (rank === 1) {
    rewards.diamonds += 50;
    rewards.awakenStones += 1;
    rewards.seasonPoints += 100;
    breakdown.push('1위! +50 다이아, +1 각성석, +100 시즌포인트');
  } else if (rank === 2) {
    rewards.diamonds += 30;
    rewards.seasonPoints += 70;
    breakdown.push('2위! +30 다이아, +70 시즌포인트');
  } else if (rank === 3) {
    rewards.diamonds += 15;
    rewards.seasonPoints += 50;
    breakdown.push('3위! +15 다이아, +50 시즌포인트');
  } else {
    rewards.seasonPoints += Math.max(10, Math.floor(50 * rankRatio));
  }

  // ─── Card EXP Distribution ───
  if (partyCards.length > 0) {
    const cardExp = Math.floor(rewards.exp / partyCards.length);
    for (const card of partyCards) {
      card.exp = (card.exp || 0) + cardExp;
      // 레벨업 체크
      const expForNext = (card.level || 1) * 100;
      let leveled = false;
      while (card.exp >= expForNext && (card.level || 1) < 30) {
        card.exp -= expForNext;
        card.level = (card.level || 1) + 1;
        leveled = true;
      }
      if (leveled) breakdown.push(`${card.name} 레벨업! -> Lv.${card.level}`);
    }
    breakdown.push(`파티 카드 ${partyCards.length}장에 각 ${cardExp} EXP 분배`);
  }

  // ─── Performance Card Drop ───
  const dropChance = 0.05 + kills * 0.02 + (rank <= 3 ? 0.1 : 0);
  if (Math.random() < dropChance) {
    const grades = ['normal', 'normal', 'normal', 'rare', 'rare', 'epic'];
    const droppedGrade = rank === 1 ? 'epic' : grades[Math.floor(Math.random() * grades.length)];
    const drop = {
      id: `reward_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `IO 전리품 카드`,
      grade: droppedGrade,
      level: 1,
      stars: 0,
      origin: 'io_reward',
    };
    player.cards = player.cards || [];
    player.cards.push(drop);
    rewards.cardDrops.push(drop);
    breakdown.push(`카드 드롭! [${drop.name}] (${drop.grade})`);
  }

  // ─── Loyalty ───
  for (const card of partyCards) {
    card.loyalty = (card.loyalty || 0) + 1;
  }
  rewards.loyalty = 1;
  if (partyCards.length > 0) breakdown.push(`파티 카드 충성도 +1`);

  // ─── Apply Rewards ───
  player.gold = (player.gold || 0) + rewards.gold;
  player.diamonds = (player.diamonds || 0) + rewards.diamonds;
  player.awakenStones = (player.awakenStones || 0) + rewards.awakenStones;
  player.seasonPoints = (player.seasonPoints || 0) + rewards.seasonPoints;

  return {
    ok: true,
    rewards,
    breakdown,
    msg: `IO 보상: ${rewards.gold}G, ${rewards.diamonds} 다이아, ${rewards.exp} EXP` +
         (rewards.awakenStones > 0 ? `, ${rewards.awakenStones} 각성석` : '') +
         (rewards.cardDrops.length > 0 ? `, 카드 ${rewards.cardDrops.length}장 드롭!` : ''),
  };
}

// ============================================
// In-match Card Swap — IO 중 카드 교체
// ============================================
function swapIOCard(player, removeCardId, addCardId) {
  const partyIds = player.ioParty || [];
  const allCards = player.cards || [];

  // 검증
  if (!partyIds.includes(removeCardId)) {
    return { ok: false, reason: '제거할 카드가 현재 파티에 없습니다' };
  }
  if (partyIds.includes(addCardId)) {
    return { ok: false, reason: '추가할 카드가 이미 파티에 있습니다' };
  }
  if (!allCards.find(c => c.id === addCardId)) {
    return { ok: false, reason: '추가할 카드를 보유하고 있지 않습니다' };
  }

  // 쿨다운 체크
  const now = Date.now();
  if (player._lastIOSwap && now - player._lastIOSwap < SWAP_COOLDOWN) {
    const remain = Math.ceil((SWAP_COOLDOWN - (now - player._lastIOSwap)) / 1000);
    return { ok: false, reason: `교체 쿨다운 중 (${remain}초 남음)` };
  }

  // 교체 실행
  const idx = partyIds.indexOf(removeCardId);
  partyIds[idx] = addCardId;
  player.ioParty = partyIds;
  player._lastIOSwap = now;

  // 효과 재계산
  const newEffects = calcIOCardEffects(player);
  player._ioEffects = newEffects;

  const removedCard = allCards.find(c => c.id === removeCardId);
  const addedCard = allCards.find(c => c.id === addCardId);

  return {
    ok: true,
    removed: { id: removeCardId, name: removedCard ? removedCard.name : removeCardId },
    added: { id: addCardId, name: addedCard ? addedCard.name : addCardId },
    newEffects: newEffects.map(e => ({ name: e.name, icon: e.icon })),
    nextSwapAvailable: now + SWAP_COOLDOWN,
    msg: `카드 교체 완료! [${removedCard ? removedCard.name : '?'}] -> [${addedCard ? addedCard.name : '?'}]`,
  };
}

// ============================================
// Socket Event Registration
// ============================================
function register(io, socket, player) {
  // IO 시작 시 카드 효과 계산
  socket.on('io_calc_effects', () => {
    const effects = calcIOCardEffects(player);
    player._ioEffects = effects;
    // IO 매치 상태 초기화
    player._ioKills = 0;
    player._killTimestamps = [];
    player._phoenixUsed = false;
    player._lastStandUsed = false;
    player._deathReviveUsed = false;
    player._stolenStreakBuff = false;
    socket.emit('io_card_effects', { effects });
  });

  // IO 킬 시 효과 체크
  socket.on('io_kill_check', (data) => {
    const killedPlayer = data ? data.killedPlayer : null;
    const results = onIOKill(player, player._ioEffects || [], killedPlayer);
    if (results.length > 0) socket.emit('io_kill_effects', { results });
  });

  // IO 저체력 체크
  socket.on('io_low_hp_check', (data) => {
    const hpRatio = data ? data.hpRatio : 1;
    const results = onLowHP(player, player._ioEffects || [], hpRatio);
    if (results.length > 0) socket.emit('io_low_hp_effects', { results });
  });

  // IO 사망 체크
  socket.on('io_death_check', () => {
    const results = onDeath(player, player._ioEffects || []);
    socket.emit('io_death_effects', { results });
  });

  // IO 중 용병 소환 요청
  socket.on('io_summon_from_card', () => {
    const effects = player._ioEffects || [];
    const summonEffects = effects.filter(e => e.trigger === 'summon');
    if (summonEffects.length === 0) {
      return socket.emit('io_summon_card_result', { ok: false, reason: '소환 효과 없음' });
    }

    const now = Date.now();
    // 가장 강력한 소환 효과 선택
    const best = summonEffects.reduce((a, b) => (b.effect.duration || 0) > (a.effect.duration || 0) ? b : a);
    const cooldown = best.effect.cooldown || 180000;

    if (player._lastCardSummon && now - player._lastCardSummon < cooldown) {
      const remain = Math.ceil((cooldown - (now - player._lastCardSummon)) / 1000);
      return socket.emit('io_summon_card_result', { ok: false, reason: `쿨다운 중 (${remain}초)` });
    }

    player._lastCardSummon = now;
    socket.emit('io_summon_card_result', {
      ok: true,
      effect: best.name,
      duration: best.effect.duration || 30,
      flying: best.effect.flying || false,
      summonAll: best.effect.summonAll || false,
      msg: `${best.name} 발동! ${best.effect.duration}초!`,
    });
  });

  // IO 파티 설정
  socket.on('io_set_party', (data) => {
    const cardIds = data ? data.cardIds : [];
    const result = setIOParty(player, cardIds);
    socket.emit('io_set_party_result', result);
  });

  // IO 파티 분석
  socket.on('io_party_analysis', () => {
    const result = getPartyAnalysis(player);
    socket.emit('io_party_analysis_result', result);
  });

  // IO 중 카드 교체
  socket.on('io_swap_card', (data) => {
    if (!data || !data.removeCardId || !data.addCardId) {
      return socket.emit('io_swap_card_result', { ok: false, reason: 'removeCardId, addCardId 필요' });
    }
    const result = swapIOCard(player, data.removeCardId, data.addCardId);
    socket.emit('io_swap_card_result', result);
  });

  // IO 매치 종료 보상 처리
  socket.on('io_process_rewards', (data) => {
    if (!data) return socket.emit('io_process_rewards_result', { ok: false, reason: '매치 결과 데이터 필요' });
    const result = processIORewards(player, data);
    socket.emit('io_process_rewards_result', result);
  });
}

// ============================================
// Module Exports
// ============================================
module.exports = {
  IO_CARD_EFFECTS,
  MAX_IO_PARTY,
  SWAP_COOLDOWN,
  calcIOCardEffects,
  onIOKill,
  onLowHP,
  onDeath,
  setIOParty,
  getPartyAnalysis,
  processIORewards,
  swapIOCard,
  register,
};

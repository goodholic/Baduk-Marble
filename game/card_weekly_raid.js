// ============================================
// 주간 레이드 보스 — 4주 로테이션, 페이즈별 패턴
// ============================================

const { sendSystemMail } = require('./card_mail');

// ═══ 보스 정의 ═══
const WEEKLY_BOSSES = [
  {
    id: 'wb_hydra', name: '히드라🐍', element: 'water',
    phases: [
      { hp: 500000, atk: 300, def: 100, mechanic: 'multi_head', desc: '머리 3개! 동시에 3회 공격', effect: { hits: 3 } },
      { hp: 300000, atk: 500, def: 80, mechanic: 'regen', desc: '절단된 머리 재생! 매 턴 HP 5% 회복', effect: { regen: 0.05 } },
      { hp: 200000, atk: 800, def: 60, mechanic: 'poison', desc: '독액 분사! 공격자 DOT 3턴', effect: { dot: 0.1, turns: 3 } },
    ],
    totalHp: 1000000,
    reward: { top1: { gold: 50000, diamonds: 100, card: 'myth' }, top3: { gold: 30000, diamonds: 60, card: 'legend' }, top10: { gold: 15000, diamonds: 30, card: 'epic' }, all: { gold: 5000, diamonds: 10 } },
  },
  {
    id: 'wb_phoenix', name: '불사조 황제🔥🐦', element: 'fire',
    phases: [
      { hp: 600000, atk: 400, def: 80, mechanic: 'burn', desc: '화염 오라! 공격 시 역화상', effect: { burnback: 0.15 } },
      { hp: 300000, atk: 600, def: 100, mechanic: 'rebirth', desc: '부활! HP 0이 되면 50%로 1회 부활', effect: { revive: 0.5 } },
      { hp: 100000, atk: 1000, def: 50, mechanic: 'enrage', desc: '광폭화! ATK 2배, 5분 타이머', effect: { enrage: 2.0, timer: 300 } },
    ],
    totalHp: 1000000,
    reward: { top1: { gold: 60000, diamonds: 120, card: 'myth' }, top3: { gold: 35000, diamonds: 70, card: 'legend' }, top10: { gold: 18000, diamonds: 35, card: 'epic' }, all: { gold: 6000, diamonds: 12 } },
  },
  {
    id: 'wb_titan', name: '타이탄🗿⚡', element: 'earth',
    phases: [
      { hp: 800000, atk: 250, def: 200, mechanic: 'armor', desc: '강철 갑옷! DEF 2배 (첫 5턴)', effect: { armorTurns: 5, defMul: 2 } },
      { hp: 500000, atk: 400, def: 150, mechanic: 'earthquake', desc: '지진! 전체 HP 15% 데미지', effect: { aoePct: 0.15 } },
      { hp: 200000, atk: 700, def: 100, mechanic: 'titan_punch', desc: '타이탄 펀치! 최고 ATK 카드 즉사', effect: { instakill: 'highest_atk' } },
    ],
    totalHp: 1500000,
    reward: { top1: { gold: 70000, diamonds: 150, card: 'myth' }, top3: { gold: 40000, diamonds: 80, card: 'legend' }, top10: { gold: 20000, diamonds: 40, card: 'epic' }, all: { gold: 7000, diamonds: 15 } },
  },
  {
    id: 'wb_void_lord', name: '공허의 군주🌀👑', element: 'dark',
    phases: [
      { hp: 600000, atk: 350, def: 120, mechanic: 'void_zone', desc: '공허 지대! 랜덤 카드 1장 봉인', effect: { sealCard: 1 } },
      { hp: 400000, atk: 500, def: 100, mechanic: 'dimension', desc: '차원 전환! 매 3턴 속성 변경', effect: { elementShift: 3 } },
      { hp: 300000, atk: 800, def: 80, mechanic: 'devour', desc: '흡수! 받은 데미지의 30% 회복', effect: { absorb: 0.3 } },
      { hp: 200000, atk: 1200, def: 50, mechanic: 'apocalypse', desc: '종말! 모든 버프 제거 + ATK 3배', effect: { purge: true, atkMul: 3 } },
    ],
    totalHp: 1500000,
    reward: { top1: { gold: 100000, diamonds: 200, card: 'myth' }, top3: { gold: 50000, diamonds: 100, card: 'myth' }, top10: { gold: 25000, diamonds: 50, card: 'legend' }, all: { gold: 10000, diamonds: 20 } },
  },
];

const ATTACK_COOLDOWN = 30000; // 30초

// ═══ 속성 상성 ═══
const ELEMENT_TABLE = {
  fire:  { strong: 'wind',  weak: 'water' },
  water: { strong: 'fire',  weak: 'earth' },
  earth: { strong: 'water', weak: 'wind' },
  wind:  { strong: 'earth', weak: 'fire' },
  light: { strong: 'dark',  weak: 'dark' },
  dark:  { strong: 'light', weak: 'light' },
};

const SHIFTED_ELEMENTS = ['fire', 'water', 'earth', 'wind', 'light', 'dark'];

// ═══ 서버 상태 ═══
let currentBossState = null;   // 현재 보스 인스턴스
let raidHistory = [];          // 과거 레이드 기록 (최대 20)

// ============================================
// 유틸리티
// ============================================
function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

function getWeekEndTime() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const daysUntilMonday = day === 0 ? 1 : (8 - day);
  const end = new Date(now);
  end.setUTCDate(now.getUTCDate() + daysUntilMonday);
  end.setUTCHours(0, 0, 0, 0);
  return end.getTime();
}

function getElementMult(atkElement, defElement) {
  if (!atkElement || !defElement) return 1.0;
  const el = ELEMENT_TABLE[atkElement];
  if (!el) return 1.0;
  if (el.strong === defElement) return 1.5;
  if (el.weak === defElement) return 0.7;
  return 1.0;
}

function getPlayerPartyCards(player) {
  const party = player.party || player.deck || [];
  const cards = player.cards || player.mercenaries || [];
  if (party.length > 0) {
    return party.map(id => cards.find(c => (c.id || c.mercId) === id)).filter(Boolean);
  }
  // 파티 미설정 시 상위 5장
  return cards.slice().sort((a, b) => (b.atk || 0) - (a.atk || 0)).slice(0, 5);
}

// ============================================
// getCurrentBoss — 현재 주간 보스 가져오기
// ============================================
function getCurrentBoss() {
  const week = getWeekNumber();
  const bossIndex = week % WEEKLY_BOSSES.length;
  const bossDef = WEEKLY_BOSSES[bossIndex];

  // 같은 주의 보스가 이미 존재하면 반환
  if (currentBossState && currentBossState.week === week) {
    return currentBossState;
  }

  // 이전 보스가 남아있으면 히스토리에 기록
  if (currentBossState && currentBossState.week !== week) {
    _archiveBoss(currentBossState);
  }

  // 새 보스 초기화
  currentBossState = {
    week,
    bossId: bossDef.id,
    name: bossDef.name,
    element: bossDef.element,
    totalHp: bossDef.totalHp,
    currentPhase: 0,
    phases: bossDef.phases.map(p => ({
      ...p,
      currentHp: p.hp,
      maxHp: p.hp,
      turnCount: 0,
      revived: false,       // rebirth 1회 추적
      enrageStart: null,    // enrage 시작 시간
      armorTurnsLeft: p.effect.armorTurns || 0,
      currentElement: bossDef.element, // dimension shift용
    })),
    alive: true,
    startedAt: Date.now(),
    weekEnd: getWeekEndTime(),
    contributions: {},   // { playerId: { name, damage, attacks, lastAttack } }
    attackLog: [],        // 최근 50개 로그
    defeated: false,
    defeatedAt: null,
    rewardsDistributed: false,
  };

  return currentBossState;
}

function _archiveBoss(bossState) {
  raidHistory.unshift({
    week: bossState.week,
    bossId: bossState.bossId,
    name: bossState.name,
    defeated: bossState.defeated,
    defeatedAt: bossState.defeatedAt,
    topContributors: _getTopContributors(bossState, 10),
    totalDamage: Object.values(bossState.contributions).reduce((s, c) => s + c.damage, 0),
  });
  if (raidHistory.length > 20) raidHistory.length = 20;
}

function _getTopContributors(bossState, limit) {
  return Object.entries(bossState.contributions)
    .map(([pid, c]) => ({ playerId: pid, name: c.name, damage: c.damage, attacks: c.attacks }))
    .sort((a, b) => b.damage - a.damage)
    .slice(0, limit);
}

// ============================================
// attackBoss — 플레이어가 보스 공격
// ============================================
function attackBoss(player) {
  const boss = getCurrentBoss();
  if (!boss.alive) return { ok: false, reason: '보스가 이미 처치되었습니다.' };

  const pid = player.id || player.deviceId;
  const now = Date.now();

  // 쿨다운 체크
  const contrib = boss.contributions[pid];
  if (contrib && (now - contrib.lastAttack) < ATTACK_COOLDOWN) {
    const remain = Math.ceil((ATTACK_COOLDOWN - (now - contrib.lastAttack)) / 1000);
    return { ok: false, reason: `쿨다운 ${remain}초 남음`, cooldown: remain };
  }

  // 파티 카드 가져오기
  const partyCards = getPlayerPartyCards(player);
  if (partyCards.length === 0) return { ok: false, reason: '출전할 용병이 없습니다.' };

  const phase = boss.phases[boss.currentPhase];
  if (!phase || phase.currentHp <= 0) return { ok: false, reason: '페이즈 전환 중입니다.' };

  phase.turnCount++;
  const log = [];
  let totalDamage = 0;
  let playerDamageTaken = 0;
  const survivingCards = [...partyCards]; // 사본

  // ── 페이즈 메카닉: 선공 효과 (보스 턴) ──
  const mechResult = _applyPreAttackMechanic(phase, boss, survivingCards, log);
  playerDamageTaken += mechResult.playerDmg;

  // ── 플레이어 공격 ──
  for (const card of survivingCards) {
    if (card._killed) continue; // instakill/seal 처리됨

    const cardAtk = card.atk || card.attack || 10;
    const cardElement = card.element || 'fire';

    // 속성 상성 (dimension shift 고려)
    const bossElement = phase.currentElement || boss.element;
    const elMult = getElementMult(cardElement, bossElement);

    // 기본 데미지 계산
    const effectiveDef = _getEffectiveDef(phase);
    let dmg = Math.max(1, Math.floor(cardAtk * elMult - effectiveDef * 0.5));

    // 크리티컬 (10% 확률)
    const isCrit = Math.random() < (card.crit || 0.1);
    if (isCrit) dmg = Math.floor(dmg * 1.5);

    // absorb 메카닉 (devour)
    let absorbed = 0;
    if (phase.mechanic === 'devour' && phase.effect.absorb) {
      absorbed = Math.floor(dmg * phase.effect.absorb);
      phase.currentHp = Math.min(phase.maxHp, phase.currentHp + absorbed);
    }

    phase.currentHp -= dmg;
    totalDamage += dmg;

    const cardName = card.name || card.id || '???';
    let logLine = `${cardName}(${cardElement}) → ${dmg} 데미지${isCrit ? ' 💥크리!' : ''}${elMult > 1 ? ' 속성유리!' : elMult < 1 ? ' 속성불리' : ''}`;
    if (absorbed > 0) logLine += ` (보스 ${absorbed} 흡수)`;
    log.push(logLine);

    // ── 페이즈 메카닉: 반격 효과 ──
    const counterDmg = _applyCounterMechanic(phase, card, dmg, log);
    playerDamageTaken += counterDmg;
  }

  // ── 페이즈 메카닉: 턴 종료 효과 ──
  _applyEndTurnMechanic(phase, boss, log);

  // HP 하한
  if (phase.currentHp < 0) phase.currentHp = 0;

  // 기여도 업데이트
  if (!boss.contributions[pid]) {
    boss.contributions[pid] = { name: player.displayName || player.name || '???', damage: 0, attacks: 0, lastAttack: 0, dotStacks: [] };
  }
  boss.contributions[pid].damage += totalDamage;
  boss.contributions[pid].attacks++;
  boss.contributions[pid].lastAttack = now;

  // DOT 처리 (poison 메카닉)
  if (phase.mechanic === 'poison' && phase.effect.dot) {
    boss.contributions[pid].dotStacks = boss.contributions[pid].dotStacks || [];
    boss.contributions[pid].dotStacks.push({ pct: phase.effect.dot, turnsLeft: phase.effect.turns });
    log.push(`☠️ 독 DOT ${phase.effect.turns}턴 부여! (매 공격 시 HP ${phase.effect.dot * 100}% 감소)`);
  }

  // 기존 DOT 적용
  const dotInfo = _applyDotDamage(boss.contributions[pid], player);
  if (dotInfo.dmg > 0) {
    playerDamageTaken += dotInfo.dmg;
    log.push(`☠️ 독 데미지: ${dotInfo.dmg} (남은 DOT ${dotInfo.remaining}스택)`);
  }

  // 공격 로그 기록
  boss.attackLog.push({
    player: player.displayName || player.name,
    damage: totalDamage,
    phase: boss.currentPhase,
    time: now,
  });
  if (boss.attackLog.length > 50) boss.attackLog.shift();

  // 페이즈 전환 체크
  const transition = checkPhaseTransition(boss);
  if (transition.transitioned) {
    log.push(`\n🔥 === 페이즈 ${transition.newPhase + 1} 돌입! === 🔥`);
    log.push(`📢 ${boss.phases[transition.newPhase].desc}`);
  }
  if (transition.defeated) {
    log.push('\n🎉🎉🎉 보스 처치!! 🎉🎉🎉');
  }

  return {
    ok: true,
    damage: totalDamage,
    playerDamageTaken,
    bossHp: phase.currentHp,
    bossMaxHp: phase.maxHp,
    phase: boss.currentPhase,
    phaseDesc: boss.phases[boss.currentPhase]?.desc || '처치 완료',
    log,
    defeated: boss.defeated,
    contribution: boss.contributions[pid],
    cooldownMs: ATTACK_COOLDOWN,
  };
}

// ── 선공 메카닉 (보스 턴 시작) ──
function _applyPreAttackMechanic(phase, boss, cards, log) {
  let playerDmg = 0;

  switch (phase.mechanic) {
    case 'multi_head': {
      // 보스가 랜덤 카드에 다중 공격
      const hits = phase.effect.hits || 3;
      const bossAtk = phase.atk;
      for (let i = 0; i < hits; i++) {
        const target = cards[Math.floor(Math.random() * cards.length)];
        if (target && !target._killed) {
          const dmg = Math.floor(bossAtk * (0.8 + Math.random() * 0.4));
          playerDmg += dmg;
          log.push(`🐍 히드라 머리 ${i + 1}: ${target.name || target.id} 에게 ${dmg} 데미지!`);
        }
      }
      break;
    }
    case 'earthquake': {
      // 전체 파티에 % 기반 데미지
      const pct = phase.effect.aoePct || 0.15;
      for (const card of cards) {
        const cardHp = card.hp || card.maxHp || 100;
        const dmg = Math.floor(cardHp * pct);
        playerDmg += dmg;
      }
      log.push(`🌍 지진! 전체 파티 HP ${pct * 100}% 데미지 (총 ${playerDmg})`);
      break;
    }
    case 'void_zone': {
      // 랜덤 카드 봉인
      const sealCount = phase.effect.sealCard || 1;
      const available = cards.filter(c => !c._killed);
      for (let i = 0; i < sealCount && available.length > 0; i++) {
        const idx = Math.floor(Math.random() * available.length);
        available[idx]._killed = true;
        log.push(`🌀 공허 봉인! ${available[idx].name || available[idx].id} 이번 턴 행동 불가`);
        available.splice(idx, 1);
      }
      break;
    }
    case 'titan_punch': {
      // 최고 ATK 카드 즉사
      let highest = null;
      let highAtk = -1;
      for (const card of cards) {
        const a = card.atk || card.attack || 0;
        if (a > highAtk) { highAtk = a; highest = card; }
      }
      if (highest) {
        highest._killed = true;
        log.push(`👊 타이탄 펀치! ${highest.name || highest.id}(ATK ${highAtk}) 즉사!`);
      }
      break;
    }
    case 'apocalypse': {
      // 모든 버프 제거 + ATK 극대화 (데미지)
      const atkMul = phase.effect.atkMul || 3;
      const bossAtk = phase.atk * atkMul;
      if (phase.effect.purge) {
        for (const card of cards) {
          card._buffPurged = true;
          // 버프 제거 → 크리/속성보너스 무효
          card.crit = 0;
        }
        log.push('💀 종말! 모든 버프 제거!');
      }
      // 전체 공격
      const dmg = Math.floor(bossAtk * (0.9 + Math.random() * 0.2));
      playerDmg += dmg;
      log.push(`💀 종말 공격! 전체 ${dmg} 데미지 (ATK×${atkMul})`);
      break;
    }
    case 'enrage': {
      // 광폭화 타이머 체크
      if (!phase.enrageStart) phase.enrageStart = Date.now();
      const elapsed = (Date.now() - phase.enrageStart) / 1000;
      const timer = phase.effect.timer || 300;
      if (elapsed > timer) {
        // 시간 초과 → 전멸 (이번 공격 무효화)
        for (const card of cards) card._killed = true;
        log.push(`⏰ 광폭화 타이머 만료! (${timer}초) 전멸!`);
        playerDmg += 99999;
      } else {
        const bossAtk = phase.atk * (phase.effect.enrage || 2.0);
        const dmg = Math.floor(bossAtk * (0.8 + Math.random() * 0.4));
        playerDmg += dmg;
        log.push(`🔥 광폭화! ATK×${phase.effect.enrage} → ${dmg} 데미지 (남은 시간: ${Math.floor(timer - elapsed)}초)`);
      }
      break;
    }
    case 'dimension': {
      // 매 N턴마다 속성 변경
      const interval = phase.effect.elementShift || 3;
      if (phase.turnCount % interval === 0) {
        const oldEl = phase.currentElement;
        let newEl;
        do {
          newEl = SHIFTED_ELEMENTS[Math.floor(Math.random() * SHIFTED_ELEMENTS.length)];
        } while (newEl === oldEl);
        phase.currentElement = newEl;
        log.push(`🌀 차원 전환! 보스 속성: ${oldEl} → ${newEl}`);
      }
      break;
    }
    // armor, regen, burn, poison, rebirth, devour → 다른 타이밍에 적용
  }

  return { playerDmg };
}

// ── 반격 메카닉 (카드별 공격 후) ──
function _applyCounterMechanic(phase, card, dmgDealt, log) {
  let counterDmg = 0;

  switch (phase.mechanic) {
    case 'burn': {
      // 공격 시 역화상
      const burnPct = phase.effect.burnback || 0.15;
      counterDmg = Math.floor(dmgDealt * burnPct);
      log.push(`🔥 역화상! ${card.name || card.id}에게 ${counterDmg} 반사 데미지`);
      break;
    }
  }

  return counterDmg;
}

// ── 턴 종료 메카닉 ──
function _applyEndTurnMechanic(phase, boss, log) {
  switch (phase.mechanic) {
    case 'regen': {
      // HP 회복
      const regenAmt = Math.floor(phase.maxHp * (phase.effect.regen || 0.05));
      const before = phase.currentHp;
      phase.currentHp = Math.min(phase.maxHp, phase.currentHp + regenAmt);
      const healed = phase.currentHp - before;
      if (healed > 0) {
        log.push(`💚 머리 재생! HP ${healed} 회복 (${phase.currentHp}/${phase.maxHp})`);
      }
      break;
    }
    case 'armor': {
      // 아머 턴 차감
      if (phase.armorTurnsLeft > 0) {
        phase.armorTurnsLeft--;
        if (phase.armorTurnsLeft === 0) {
          log.push('🛡️ 강철 갑옷 효과 종료!');
        } else {
          log.push(`🛡️ 강철 갑옷 ${phase.armorTurnsLeft}턴 남음 (DEF ×${phase.effect.defMul})`);
        }
      }
      break;
    }
  }
}

// ── DEF 보정 ──
function _getEffectiveDef(phase) {
  let def = phase.def;
  if (phase.mechanic === 'armor' && phase.armorTurnsLeft > 0) {
    def = Math.floor(def * (phase.effect.defMul || 2));
  }
  return def;
}

// ── DOT 처리 ──
function _applyDotDamage(contrib, player) {
  if (!contrib.dotStacks || contrib.dotStacks.length === 0) return { dmg: 0, remaining: 0 };

  let totalDmg = 0;
  const maxHp = player.hp || player.maxHp || 1000;

  contrib.dotStacks = contrib.dotStacks.filter(dot => {
    if (dot.turnsLeft <= 0) return false;
    const dmg = Math.floor(maxHp * dot.pct);
    totalDmg += dmg;
    dot.turnsLeft--;
    return dot.turnsLeft > 0;
  });

  return { dmg: totalDmg, remaining: contrib.dotStacks.length };
}

// ============================================
// checkPhaseTransition — 페이즈 전환 체크
// ============================================
function checkPhaseTransition(boss) {
  const phase = boss.phases[boss.currentPhase];
  if (!phase) return { transitioned: false, defeated: false };

  if (phase.currentHp > 0) return { transitioned: false, defeated: false };

  // rebirth 메카닉 처리 (부활)
  if (phase.mechanic === 'rebirth' && !phase.revived && phase.effect.revive) {
    phase.revived = true;
    phase.currentHp = Math.floor(phase.maxHp * phase.effect.revive);
    return { transitioned: false, defeated: false, revived: true };
  }

  // 다음 페이즈로
  const nextPhase = boss.currentPhase + 1;
  if (nextPhase >= boss.phases.length) {
    // 보스 처치!
    boss.alive = false;
    boss.defeated = true;
    boss.defeatedAt = Date.now();
    return { transitioned: true, defeated: true, newPhase: boss.currentPhase };
  }

  boss.currentPhase = nextPhase;
  return { transitioned: true, defeated: false, newPhase: nextPhase };
}

// ============================================
// getBossStatus — 보스 상태 조회
// ============================================
function getBossStatus() {
  const boss = getCurrentBoss();
  const phase = boss.phases[boss.currentPhase];
  const totalCurrentHp = boss.phases.reduce((s, p) => s + Math.max(0, p.currentHp), 0);
  const topContrib = _getTopContributors(boss, 10);

  return {
    bossId: boss.bossId,
    name: boss.name,
    element: boss.element,
    alive: boss.alive,
    defeated: boss.defeated,
    totalHp: boss.totalHp,
    totalCurrentHp,
    phase: {
      index: boss.currentPhase,
      total: boss.phases.length,
      hp: phase ? phase.currentHp : 0,
      maxHp: phase ? phase.maxHp : 0,
      mechanic: phase ? phase.mechanic : null,
      desc: phase ? phase.desc : '처치 완료',
      currentElement: phase ? phase.currentElement : boss.element,
      turnCount: phase ? phase.turnCount : 0,
      enrageRemaining: phase && phase.mechanic === 'enrage' && phase.enrageStart
        ? Math.max(0, (phase.effect.timer || 300) - (Date.now() - phase.enrageStart) / 1000)
        : null,
      armorTurnsLeft: phase ? phase.armorTurnsLeft : 0,
    },
    weekEnd: boss.weekEnd,
    timeRemaining: Math.max(0, boss.weekEnd - Date.now()),
    topContributors: topContrib,
    totalAttacks: Object.values(boss.contributions).reduce((s, c) => s + c.attacks, 0),
    recentLog: boss.attackLog.slice(-10),
  };
}

// ============================================
// getContributionRanking — 기여도 랭킹 (상위 50)
// ============================================
function getContributionRanking() {
  const boss = getCurrentBoss();
  return _getTopContributors(boss, 50).map((c, i) => ({
    rank: i + 1,
    ...c,
  }));
}

// ============================================
// distributeBossRewards — 보스 처치 보상 배분
// ============================================
function distributeBossRewards(io, allPlayers) {
  const boss = currentBossState;
  if (!boss || !boss.defeated || boss.rewardsDistributed) return { ok: false, reason: '배분 대상 없음' };

  const bossDef = WEEKLY_BOSSES.find(b => b.id === boss.bossId);
  if (!bossDef) return { ok: false, reason: '보스 정의 없음' };

  const ranking = _getTopContributors(boss, Infinity);
  if (ranking.length === 0) return { ok: false, reason: '참여자 없음' };

  const rewardResult = [];

  // 플레이어 맵 구축
  const playerMap = {};
  if (allPlayers) {
    for (const p of (Array.isArray(allPlayers) ? allPlayers : Object.values(allPlayers))) {
      const pid = p.id || p.deviceId;
      if (pid) playerMap[pid] = p;
    }
  }

  ranking.forEach((entry, idx) => {
    const player = playerMap[entry.playerId];
    if (!player) return;

    let tier;
    let reward;
    if (idx === 0) {
      tier = 'top1';
      reward = bossDef.reward.top1;
    } else if (idx < 3) {
      tier = 'top3';
      reward = bossDef.reward.top3;
    } else if (idx < 10) {
      tier = 'top10';
      reward = bossDef.reward.top10;
    } else {
      tier = 'all';
      reward = bossDef.reward.all;
    }

    // 시스템 우편으로 보상 발송
    const title = `🐲 주간 레이드 보상 — ${boss.name}`;
    const msg = `${boss.name} 처치 완료!\n순위: ${idx + 1}위 (${tier})\n총 데미지: ${entry.damage.toLocaleString()}\n공격 횟수: ${entry.attacks}회`;
    sendSystemMail(player, title, { gold: reward.gold, diamonds: reward.diamonds, card: reward.card || null }, msg);

    // 골드/다이아 직접 지급
    player.gold = (player.gold || 0) + (reward.gold || 0);
    player.diamonds = (player.diamonds || 0) + (reward.diamonds || 0);

    rewardResult.push({ playerId: entry.playerId, name: entry.name, tier, reward, rank: idx + 1 });
  });

  boss.rewardsDistributed = true;

  // 히스토리에 아카이브
  _archiveBoss(boss);

  // 전체 알림
  if (io) {
    io.emit('weekly_raid_complete', {
      bossName: boss.name,
      totalDamage: ranking.reduce((s, r) => s + r.damage, 0),
      participants: ranking.length,
      topPlayer: ranking[0]?.name || '???',
      topDamage: ranking[0]?.damage || 0,
    });
  }

  return { ok: true, distributed: rewardResult.length, results: rewardResult };
}

// ============================================
// getWeeklyRaidHistory — 과거 레이드 기록
// ============================================
function getWeeklyRaidHistory(player) {
  const pid = player.id || player.deviceId;

  // 현재 보스 참여 정보
  let currentParticipation = null;
  if (currentBossState) {
    const contrib = currentBossState.contributions[pid];
    if (contrib) {
      const ranking = _getTopContributors(currentBossState, Infinity);
      const rank = ranking.findIndex(r => r.playerId === pid) + 1;
      currentParticipation = {
        bossName: currentBossState.name,
        bossId: currentBossState.bossId,
        damage: contrib.damage,
        attacks: contrib.attacks,
        rank,
        alive: currentBossState.alive,
        defeated: currentBossState.defeated,
      };
    }
  }

  // 히스토리에서 해당 플레이어 참여 기록 (아카이브에는 top10만 남으므로 이름으로 매칭)
  const pastRaids = raidHistory.map(h => ({
    week: h.week,
    bossName: h.name,
    defeated: h.defeated,
    totalDamage: h.totalDamage,
    topContributors: h.topContributors.slice(0, 3),
    myRank: h.topContributors.findIndex(c => c.playerId === pid) + 1 || null,
    myDamage: h.topContributors.find(c => c.playerId === pid)?.damage || null,
  }));

  return { current: currentParticipation, history: pastRaids };
}

// ============================================
// register — 소켓 이벤트 등록
// ============================================
function register(io, socket, player) {
  // 보스 상태 조회
  socket.on('weekly_raid_status', () => {
    socket.emit('weekly_raid_status', getBossStatus());
  });

  // 보스 공격
  socket.on('weekly_raid_attack', () => {
    const result = attackBoss(player);
    socket.emit('weekly_raid_attack', result);

    if (result.ok) {
      // 전체 브로드캐스트: 간략 정보
      socket.broadcast.emit('weekly_raid_update', {
        attacker: player.displayName || player.name || '???',
        damage: result.damage,
        bossHp: result.bossHp,
        bossMaxHp: result.bossMaxHp,
        phase: result.phase,
        defeated: result.defeated,
      });

      // 보스 처치 시 보상 배분
      if (result.defeated) {
        // io.sockets에서 전체 플레이어 수집
        const allPlayers = [];
        const sockets = io.sockets?.sockets || io.of('/')?.sockets;
        if (sockets) {
          for (const [, s] of sockets) {
            if (s.player) allPlayers.push(s.player);
          }
        }
        const distResult = distributeBossRewards(io, allPlayers);
        if (distResult.ok) {
          io.emit('weekly_raid_rewards', distResult);
        }
      }
    }
  });

  // 랭킹 조회
  socket.on('weekly_raid_ranking', () => {
    socket.emit('weekly_raid_ranking', getContributionRanking());
  });

  // 개인 히스토리 조회
  socket.on('weekly_raid_history', () => {
    socket.emit('weekly_raid_history', getWeeklyRaidHistory(player));
  });
}

// ============================================
// Exports
// ============================================
module.exports = {
  // Data
  WEEKLY_BOSSES,
  ATTACK_COOLDOWN,
  // Core
  getCurrentBoss,
  attackBoss,
  checkPhaseTransition,
  getBossStatus,
  getContributionRanking,
  distributeBossRewards,
  getWeeklyRaidHistory,
  // Socket
  register,
};

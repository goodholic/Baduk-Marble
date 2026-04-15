// ============================================
// 도전의 탑 — 100층 + 무한탑, 보스 메카닉, 특수층, 주간 도전, 소탕
// ============================================

const MAX_FLOOR = 100;
const DAILY_ATTEMPTS = 5;

// ── 보스 메카닉 (10층마다) ──
const BOSS_MECHANICS = {
  10: { name: '고블린 왕👺👑', mechanic: 'summon', desc: '매 3턴 부하 소환 (ATK+50%)', effect: { summonTurn: 3, atkBoost: 0.5 } },
  20: { name: '리치 로드💀🔮', mechanic: 'drain', desc: '공격 시 HP 흡수 (데미지의 30%)', effect: { lifesteal: 0.3 } },
  30: { name: '용의 아이🐲', mechanic: 'breath', desc: '매 5턴 브레스 (전체 HP 20% 데미지)', effect: { breathTurn: 5, breathDmg: 0.2 } },
  40: { name: '암흑 기사🖤⚔️', mechanic: 'reflect', desc: '받는 데미지 20% 반사', effect: { reflect: 0.2 } },
  50: { name: '거대 골렘🗿', mechanic: 'armor', desc: '첫 5턴 데미지 50% 감소', effect: { armorTurns: 5, armorRate: 0.5 } },
  60: { name: '뱀파이어 여왕🧛‍♀️', mechanic: 'charm', desc: '매 4턴 아군 1명 매혹 (적으로 전환)', effect: { charmTurn: 4 } },
  70: { name: '불사조🔥🐦', mechanic: 'rebirth', desc: '처치 시 50% HP로 1회 부활', effect: { reviveHp: 0.5 } },
  80: { name: '시간 마법사⏳🔮', mechanic: 'timeloop', desc: '매 6턴 HP 30% 회복', effect: { healTurn: 6, healRate: 0.3 } },
  90: { name: '혼돈의 군주🌀😈', mechanic: 'chaos', desc: '매 턴 랜덤 효과 (버프/디버프/소환/회복)', effect: { chaosEachTurn: true } },
  100: { name: '태초의 존재🌟👑', mechanic: 'ultimate', desc: '모든 메카닉 조합 + HP 3배 + 광폭화', effect: { allMechanics: true, hpMul: 3, enrage: true } },
};

// ── 특수층 모디파이어 ──
const FLOOR_MODIFIERS = [
  { floors: [5, 15, 25], name: '보물층💰', effect: { goldMul: 3.0 }, desc: '골드 보상 3배!' },
  { floors: [13, 33, 53], name: '저주의 층💀', effect: { playerAtkDown: 0.7 }, desc: 'ATK 30% 감소!' },
  { floors: [21, 42, 63], name: '축복의 층✨', effect: { playerAll: 1.2 }, desc: '전스탯 +20%!' },
  { floors: [37, 67, 97], name: '미스터리층❓', effect: { randomAll: true }, desc: '무작위 극단적 효과!' },
  { floors: [44, 77, 88], name: '엘리트층🔴', effect: { enemyDouble: true }, desc: '적 2명 동시 출현!' },
  { floors: [55], name: '숨겨진 상점🏪', effect: { shop: true }, desc: '희귀 아이템 구매 가능!' },
];

// ── 주간 타워 챌린지 ──
const TOWER_CHALLENGES = [
  { id: 'tc_solo', name: '솔로 도전', desc: '카드 1장으로 도전', rule: { maxCards: 1 }, reward: { diamonds: 20 } },
  { id: 'tc_no_legend', name: '서민 도전', desc: '레어 이하 카드만', rule: { maxGrade: 'rare' }, reward: { diamonds: 30 } },
  { id: 'tc_speedrun', name: '스피드런', desc: '10층을 3분 안에', rule: { timeLimit: 180 }, reward: { diamonds: 50 } },
  { id: 'tc_no_heal', name: '무회복', desc: 'HP 회복 없이 20층', rule: { noHeal: true, targetFloor: 20 }, reward: { card: 'epic' } },
];

// ── 층별 모디파이어 조회 ──
function getFloorModifier(floor) {
  for (const mod of FLOOR_MODIFIERS) {
    if (mod.floors.includes(floor)) return mod;
  }
  return null;
}

// ── 층별 적 스케일링 ──
function getFloorEnemy(floor) {
  const baseHp = 100 + floor * 50;
  const baseAtk = 15 + floor * 8;
  const baseDef = 10 + floor * 5;
  const names = ['슬라임', '고블린', '오크 전사', '스켈레톤', '다크 나이트', '리치', '드래곤 해츨링', '마왕 부하', '고대 골렘', '차원의 수호자'];
  const icons = ['🟢', '👺', '👹', '💀', '🖤⚔️', '💀🔮', '🐲', '😈', '🗿', '🌀'];
  const tier = Math.min(Math.floor((floor - 1) / 10), names.length - 1);
  const isBoss = floor % 10 === 0 && floor <= MAX_FLOOR;
  const boss = isBoss ? BOSS_MECHANICS[floor] : null;

  const hpMul = isBoss ? (boss && boss.effect.hpMul ? boss.effect.hpMul : 3) : 1;

  return {
    name: boss ? boss.name : names[tier],
    icon: boss ? undefined : icons[tier],
    hp: Math.floor(baseHp * hpMul),
    atk: isBoss ? baseAtk * 2 : baseAtk,
    def: baseDef,
    floor,
    isBoss,
    boss,
  };
}

// ── 무한탑 적 (101층+) ──
function getInfiniteFloorEnemy(floor) {
  const scale = Math.pow(1.08, floor - 100); // exponential scaling
  const hp = Math.floor((100 + floor * 50) * scale);
  const atk = Math.floor((15 + floor * 8) * scale);
  const def = Math.floor((10 + floor * 5) * scale);
  const isBoss = floor % 10 === 0;

  return {
    name: isBoss ? `심연의 군주 Lv.${floor}🌑👑` : `심연의 존재 Lv.${floor}🌑`,
    hp: isBoss ? hp * 3 : hp,
    atk: isBoss ? atk * 2 : atk,
    def,
    floor,
    isBoss,
    boss: null,
  };
}

// ── 층별 보상 ──
function getFloorReward(floor) {
  const mod = getFloorModifier(floor);
  const goldMul = (mod && mod.effect.goldMul) ? mod.effect.goldMul : 1;

  const gold = Math.floor((200 + floor * 100) * goldMul);
  const exp = 50 + floor * 20;
  const reward = { gold, exp };

  if (floor % 10 === 0) {
    reward.diamonds = 5 + Math.floor(floor / 10) * 3;
    if (floor >= 50) reward.card = floor >= 90 ? 'legend' : floor >= 70 ? 'epic' : 'rare';
  }
  if (floor === 100) {
    reward.gold = 100000;
    reward.diamonds = 200;
    reward.card = 'myth';
    reward.title = '탑의 정복자';
  }
  if (mod) reward.modifier = mod.name;

  return reward;
}

// ── 무한탑 보상 ──
function getInfiniteFloorReward(floor) {
  const gold = Math.floor((200 + floor * 100) * 1.5);
  const exp = 50 + floor * 25;
  const reward = { gold, exp };

  if (floor % 10 === 0) {
    reward.diamonds = 10 + Math.floor((floor - 100) / 10) * 5;
    reward.card = 'epic';
    if (floor % 50 === 0) reward.card = 'legend';
  }

  return reward;
}

// ── 보스 메카닉 적용 전투 ──
function battleFloor(playerCards, floor, opts) {
  opts = opts || {};
  const isInfinite = floor > MAX_FLOOR;
  const enemy = isInfinite ? getInfiniteFloorEnemy(floor) : getFloorEnemy(floor);
  const mod = isInfinite ? null : getFloorModifier(floor);

  let totalAtk = playerCards.reduce((s, c) => s + (c.atk || 30), 0);
  let totalDef = playerCards.reduce((s, c) => s + (c.def || 20), 0);
  let totalHp = playerCards.reduce((s, c) => s + (c.hp || 100), 0);
  let activeCards = playerCards.length;

  // 특수층 효과 적용
  if (mod) {
    if (mod.effect.playerAtkDown) totalAtk = Math.floor(totalAtk * mod.effect.playerAtkDown);
    if (mod.effect.playerAll) {
      totalAtk = Math.floor(totalAtk * mod.effect.playerAll);
      totalDef = Math.floor(totalDef * mod.effect.playerAll);
      totalHp = Math.floor(totalHp * mod.effect.playerAll);
    }
    if (mod.effect.randomAll) {
      const roll = 0.5 + Math.random() * 1.5; // 0.5x ~ 2.0x
      totalAtk = Math.floor(totalAtk * roll);
      totalDef = Math.floor(totalDef * roll);
      totalHp = Math.floor(totalHp * (0.5 + Math.random() * 1.5));
    }
  }

  // 챌린지 룰 적용
  if (opts.noHeal) { /* handled in heal prevention below */ }

  let playerHp = totalHp;
  let enemyHp = enemy.hp;
  let enemyMaxHp = enemy.hp;
  const log = [];

  // 엘리트층: 적 2명 → HP/ATK 2배
  let effectiveEnemyAtk = enemy.atk;
  if (mod && mod.effect.enemyDouble) {
    enemyHp *= 2;
    enemyMaxHp *= 2;
    effectiveEnemyAtk *= 2;
  }

  // 보스 상태
  const boss = enemy.boss;
  let bossEffect = boss ? boss.effect : null;
  let summonAtk = 0; // 소환 부하의 추가 ATK
  let revived = false;
  let charmedCards = 0; // 매혹된 아군 수

  // floor 100 ultimate: 모든 메카닉 통합
  let ultimateEffects = null;
  if (bossEffect && bossEffect.allMechanics) {
    ultimateEffects = {
      summonTurn: 3, atkBoost: 0.5,
      lifesteal: 0.3,
      breathTurn: 5, breathDmg: 0.2,
      reflect: 0.2,
      armorTurns: 5, armorRate: 0.5,
      charmTurn: 4,
      reviveHp: 0.5,
      healTurn: 6, healRate: 0.3,
      chaosEachTurn: true,
      enrage: true,
    };
    bossEffect = ultimateEffects;
  }

  const MAX_TURNS = 30;
  let enraged = false;

  for (let turn = 1; turn <= MAX_TURNS && playerHp > 0 && enemyHp > 0; turn++) {
    let turnLog = { turn, events: [] };

    // ── 보스 메카닉: 턴 시작 ──
    if (bossEffect) {
      // 소환 (summon)
      if (bossEffect.summonTurn && turn % bossEffect.summonTurn === 0) {
        summonAtk += Math.floor(enemy.atk * bossEffect.atkBoost);
        turnLog.events.push(`부하 소환! 추가 ATK +${Math.floor(enemy.atk * bossEffect.atkBoost)}`);
      }

      // 브레스 (breath)
      if (bossEffect.breathTurn && turn % bossEffect.breathTurn === 0) {
        const breathDmg = Math.floor(totalHp * bossEffect.breathDmg);
        playerHp -= breathDmg;
        turnLog.events.push(`브레스! ${breathDmg} 데미지`);
      }

      // 매혹 (charm)
      if (bossEffect.charmTurn && turn % bossEffect.charmTurn === 0 && charmedCards < activeCards - 1) {
        charmedCards++;
        const atkLoss = Math.floor(totalAtk / activeCards);
        totalAtk = Math.max(10, totalAtk - atkLoss);
        turnLog.events.push(`매혹! 아군 1명 전환, ATK -${atkLoss}`);
      }

      // 시간 회복 (timeloop)
      if (bossEffect.healTurn && turn % bossEffect.healTurn === 0) {
        const heal = Math.floor(enemyMaxHp * bossEffect.healRate);
        enemyHp = Math.min(enemyMaxHp, enemyHp + heal);
        turnLog.events.push(`시간 회복! HP +${heal}`);
      }

      // 혼돈 (chaos) — 매 턴 랜덤 효과
      if (bossEffect.chaosEachTurn) {
        const chaosRoll = Math.random();
        if (chaosRoll < 0.25) {
          effectiveEnemyAtk = Math.floor(effectiveEnemyAtk * 1.15);
          turnLog.events.push('혼돈: 적 ATK 증가!');
        } else if (chaosRoll < 0.5) {
          totalAtk = Math.max(10, Math.floor(totalAtk * 0.9));
          turnLog.events.push('혼돈: 아군 ATK 감소!');
        } else if (chaosRoll < 0.75) {
          const chaosSummon = Math.floor(enemy.atk * 0.3);
          summonAtk += chaosSummon;
          turnLog.events.push(`혼돈: 적 소환! +${chaosSummon} ATK`);
        } else {
          const chaosHeal = Math.floor(enemyMaxHp * 0.1);
          enemyHp = Math.min(enemyMaxHp, enemyHp + chaosHeal);
          turnLog.events.push(`혼돈: 적 회복 +${chaosHeal}`);
        }
      }

      // 광폭화 (enrage) — HP 50% 이하 시 ATK 2배
      if (bossEffect.enrage && !enraged && enemyHp < enemyMaxHp * 0.5) {
        enraged = true;
        effectiveEnemyAtk *= 2;
        turnLog.events.push('광폭화! 적 ATK 2배!');
      }

      // 아머 (armor) — 첫 N턴 데미지 감소
      // handled in damage calc below
    }

    // ── 플레이어 공격 ──
    let pDmg = Math.max(5, Math.floor(totalAtk * (0.9 + Math.random() * 0.2) - enemy.def * 0.3));

    // 아머 감소
    if (bossEffect && bossEffect.armorTurns && turn <= bossEffect.armorTurns) {
      pDmg = Math.floor(pDmg * (1 - bossEffect.armorRate));
      turnLog.events.push(`아머 활성! 데미지 ${Math.floor(bossEffect.armorRate * 100)}% 감소`);
    }

    // 반사 (reflect)
    if (bossEffect && bossEffect.reflect) {
      const reflectDmg = Math.floor(pDmg * bossEffect.reflect);
      playerHp -= reflectDmg;
      turnLog.events.push(`반사! ${reflectDmg} 데미지 반사`);
    }

    enemyHp -= pDmg;

    // ── 적 공격 ──
    const eDmg = Math.max(5, Math.floor((effectiveEnemyAtk + summonAtk) * (0.9 + Math.random() * 0.2) - totalDef * 0.3));
    playerHp -= eDmg;

    // 흡혈 (drain)
    if (bossEffect && bossEffect.lifesteal) {
      const heal = Math.floor(eDmg * bossEffect.lifesteal);
      enemyHp = Math.min(enemyMaxHp, enemyHp + heal);
      turnLog.events.push(`흡혈! HP +${heal}`);
    }

    turnLog.pDmg = pDmg;
    turnLog.eDmg = eDmg;
    turnLog.playerHp = Math.max(0, playerHp);
    turnLog.enemyHp = Math.max(0, enemyHp);
    log.push(turnLog);

    // ── 부활 체크 (rebirth) ──
    if (enemyHp <= 0 && bossEffect && bossEffect.reviveHp && !revived) {
      revived = true;
      enemyHp = Math.floor(enemyMaxHp * bossEffect.reviveHp);
      log.push({ turn, events: ['부활! HP 50%로 재생!'], pDmg: 0, eDmg: 0, playerHp: Math.max(0, playerHp), enemyHp });
    }
  }

  return { win: enemyHp <= 0, log, enemy, remainHp: Math.max(0, playerHp), modifier: getFloorModifier(floor) };
}

// ── 일반 층 도전 ──
function attemptFloor(player) {
  const today = new Date().toDateString();
  if (player._towerDate !== today) { player._towerDate = today; player._towerAttempts = 0; }
  if ((player._towerAttempts || 0) >= DAILY_ATTEMPTS) return { ok: false, reason: `일일 ${DAILY_ATTEMPTS}회 도전 소진` };

  player._towerAttempts++;
  const floor = (player.towerFloor || 0) + 1;
  if (floor > MAX_FLOOR) return { ok: false, reason: '이미 100층 클리어! 무한탑에 도전하세요.' };

  const partyIds = player.ioParty || (player.cards || []).slice(0, 5).map(c => c.id);
  const partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
  if (partyCards.length === 0) return { ok: false, reason: '파티 카드 필요' };

  const result = battleFloor(partyCards, floor);
  const mod = getFloorModifier(floor);

  if (result.win) {
    player.towerFloor = floor;
    const reward = getFloorReward(floor);
    player.gold = (player.gold || 0) + reward.gold;
    if (reward.diamonds) player.diamonds = (player.diamonds || 0) + reward.diamonds;
    if (reward.exp) partyCards.forEach(c => c.exp = (c.exp || 0) + Math.floor(reward.exp / partyCards.length));
    if (reward.title) { player.titles = player.titles || []; player.titles.push(reward.title); }

    return {
      ok: true, win: true, floor, reward, battle: result,
      modifier: mod ? { name: mod.name, desc: mod.desc } : null,
      attemptsLeft: DAILY_ATTEMPTS - player._towerAttempts,
      msg: `${floor}층 클리어! +${reward.gold}G${reward.diamonds ? ' +' + reward.diamonds + '💎' : ''}${mod ? ' [' + mod.name + ']' : ''}`,
    };
  }

  return {
    ok: true, win: false, floor, battle: result,
    modifier: mod ? { name: mod.name, desc: mod.desc } : null,
    attemptsLeft: DAILY_ATTEMPTS - player._towerAttempts,
    msg: `${floor}층 실패... (남은 도전: ${DAILY_ATTEMPTS - player._towerAttempts}회)`,
  };
}

// ── 무한탑 도전 (101층+) ──
function attemptInfiniteFloor(player) {
  if ((player.towerFloor || 0) < MAX_FLOOR) {
    return { ok: false, reason: '100층을 먼저 클리어해야 무한탑에 진입할 수 있습니다.' };
  }

  const floor = (player.infiniteTowerFloor || 100) + 1;

  const partyIds = player.ioParty || (player.cards || []).slice(0, 5).map(c => c.id);
  const partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
  if (partyCards.length === 0) return { ok: false, reason: '파티 카드 필요' };

  const result = battleFloor(partyCards, floor);

  if (result.win) {
    player.infiniteTowerFloor = floor;
    const reward = getInfiniteFloorReward(floor);
    player.gold = (player.gold || 0) + reward.gold;
    if (reward.diamonds) player.diamonds = (player.diamonds || 0) + reward.diamonds;
    if (reward.exp) partyCards.forEach(c => c.exp = (c.exp || 0) + Math.floor(reward.exp / partyCards.length));

    return {
      ok: true, win: true, floor, reward, battle: result,
      msg: `무한탑 ${floor}층 클리어! +${reward.gold}G${reward.diamonds ? ' +' + reward.diamonds + '💎' : ''}`,
    };
  }

  return {
    ok: true, win: false, floor, battle: result,
    msg: `무한탑 ${floor}층 실패...`,
  };
}

// ── 타워 리더보드 ──
function getTowerLeaderboard(allPlayers) {
  const entries = [];
  for (const pid in allPlayers) {
    const p = allPlayers[pid];
    const highestFloor = Math.max(p.towerFloor || 0, p.infiniteTowerFloor || 0);
    if (highestFloor > 0) {
      entries.push({
        name: p.displayName || p.nickname || '???',
        floor: highestFloor,
        isInfinite: (p.infiniteTowerFloor || 0) > MAX_FLOOR,
      });
    }
  }
  entries.sort((a, b) => b.floor - a.floor);
  return entries.slice(0, 20);
}

// ── 주간 챌린지 ──
function getCurrentChallenge() {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return TOWER_CHALLENGES[weekNum % TOWER_CHALLENGES.length];
}

function attemptChallenge(player) {
  const challenge = getCurrentChallenge();
  const today = new Date().toDateString();

  // 이미 완료한 챌린지 체크
  player._challengeDone = player._challengeDone || {};
  if (player._challengeDone[challenge.id]) {
    return { ok: false, reason: '이번 주 챌린지를 이미 완료했습니다.' };
  }

  const partyIds = player.ioParty || (player.cards || []).slice(0, 5).map(c => c.id);
  let partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
  if (partyCards.length === 0) return { ok: false, reason: '파티 카드 필요' };

  // 챌린지 룰 적용
  const rule = challenge.rule;
  if (rule.maxCards) partyCards = partyCards.slice(0, rule.maxCards);
  if (rule.maxGrade) {
    const gradeOrder = ['common', 'uncommon', 'rare', 'epic', 'legend', 'myth'];
    const maxIdx = gradeOrder.indexOf(rule.maxGrade);
    partyCards = partyCards.filter(c => gradeOrder.indexOf(c.grade || 'common') <= maxIdx);
    if (partyCards.length === 0) return { ok: false, reason: '조건에 맞는 카드가 없습니다.' };
  }

  const targetFloor = rule.targetFloor || 10;
  const results = [];
  let totalWins = 0;
  const startTime = Date.now();

  for (let f = 1; f <= targetFloor; f++) {
    if (rule.timeLimit && (Date.now() - startTime) / 1000 > rule.timeLimit) {
      return { ok: true, win: false, challenge, floorsCleared: totalWins, msg: '시간 초과!' };
    }
    const res = battleFloor(partyCards, f, { noHeal: rule.noHeal });
    results.push(res);
    if (!res.win) {
      return { ok: true, win: false, challenge, floorsCleared: totalWins, msg: `챌린지 실패 (${f}층에서 패배)` };
    }
    totalWins++;
  }

  // 챌린지 클리어!
  player._challengeDone[challenge.id] = true;
  const reward = challenge.reward;
  if (reward.diamonds) player.diamonds = (player.diamonds || 0) + reward.diamonds;

  return {
    ok: true, win: true, challenge, floorsCleared: totalWins, reward,
    msg: `챌린지 [${challenge.name}] 완료! ${reward.diamonds ? '+' + reward.diamonds + '💎' : ''}${reward.card ? ' +' + reward.card + ' 카드' : ''}`,
  };
}

// ── 소탕 (Sweep) ──
function sweepFloors(player, targetFloor) {
  const highestFloor = player.towerFloor || 0;
  const sweepLimit = Math.max(0, highestFloor - 10);

  if (targetFloor > sweepLimit) {
    return { ok: false, reason: `소탕 가능 범위: 1~${sweepLimit}층 (최고기록 - 10)` };
  }
  if (targetFloor < 1) return { ok: false, reason: '유효한 층을 지정하세요.' };

  const today = new Date().toDateString();
  if (player._towerDate !== today) { player._towerDate = today; player._towerAttempts = 0; }
  if ((player._towerAttempts || 0) >= DAILY_ATTEMPTS) {
    return { ok: false, reason: `일일 ${DAILY_ATTEMPTS}회 도전 소진` };
  }

  player._towerAttempts++;

  // 소탕: 50% 보상률
  let totalGold = 0;
  let totalExp = 0;
  let totalDiamonds = 0;

  for (let f = 1; f <= targetFloor; f++) {
    const reward = getFloorReward(f);
    totalGold += Math.floor(reward.gold * 0.5);
    totalExp += Math.floor(reward.exp * 0.5);
    if (reward.diamonds) totalDiamonds += Math.floor(reward.diamonds * 0.5);
  }

  player.gold = (player.gold || 0) + totalGold;
  if (totalDiamonds > 0) player.diamonds = (player.diamonds || 0) + totalDiamonds;

  const partyIds = player.ioParty || (player.cards || []).slice(0, 5).map(c => c.id);
  const partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
  if (partyCards.length > 0 && totalExp > 0) {
    partyCards.forEach(c => c.exp = (c.exp || 0) + Math.floor(totalExp / partyCards.length));
  }

  return {
    ok: true, floorsSwept: targetFloor,
    reward: { gold: totalGold, exp: totalExp, diamonds: totalDiamonds },
    attemptsLeft: DAILY_ATTEMPTS - player._towerAttempts,
    msg: `${targetFloor}층까지 소탕 완료! +${totalGold}G${totalDiamonds ? ' +' + totalDiamonds + '💎' : ''} (보상 50%)`,
  };
}

// ── 소켓 등록 ──
function register(io, socket, player, allPlayers) {
  socket.on('tower_info', () => {
    const floor = player.towerFloor || 0;
    const nextEnemy = floor < MAX_FLOOR ? getFloorEnemy(floor + 1) : null;
    const nextReward = floor < MAX_FLOOR ? getFloorReward(floor + 1) : null;
    const nextMod = floor < MAX_FLOOR ? getFloorModifier(floor + 1) : null;
    const infiniteFloor = player.infiniteTowerFloor || 0;

    socket.emit('tower_info', {
      floor, maxFloor: MAX_FLOOR, nextEnemy, nextReward,
      nextModifier: nextMod ? { name: nextMod.name, desc: nextMod.desc } : null,
      infiniteFloor,
      attemptsLeft: DAILY_ATTEMPTS - (player._towerAttempts || 0),
    });
  });

  socket.on('tower_attempt', () => {
    const result = attemptFloor(player);
    socket.emit('tower_result', result);
    if (result.ok && result.win) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      if (result.floor % 10 === 0) io.emit('server_msg', `🗼 [도전의 탑] ${player.displayName || '???'}이(가) ${result.floor}층 보스 격파!`);
      if (result.floor === 100) io.emit('server_msg', `🗼👑 [도전의 탑] ${player.displayName || '???'}이(가) 100층 완전 정복!!!`);
    }
  });

  socket.on('tower_challenge_info', () => {
    const challenge = getCurrentChallenge();
    const done = player._challengeDone && player._challengeDone[challenge.id];
    socket.emit('tower_challenge_info', { challenge, completed: !!done });
  });

  socket.on('tower_challenge_attempt', () => {
    const result = attemptChallenge(player);
    socket.emit('tower_challenge_result', result);
    if (result.ok && result.win) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      io.emit('server_msg', `🗼🏆 [타워 챌린지] ${player.displayName || '???'}이(가) [${result.challenge.name}] 완료!`);
    }
  });

  socket.on('tower_infinite', () => {
    const result = attemptInfiniteFloor(player);
    socket.emit('tower_infinite_result', result);
    if (result.ok && result.win) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      if (result.floor % 10 === 0) {
        io.emit('server_msg', `🗼🌑 [무한탑] ${player.displayName || '???'}이(가) ${result.floor}층 돌파!`);
      }
    }
  });

  socket.on('tower_leaderboard', () => {
    const board = getTowerLeaderboard(allPlayers || {});
    socket.emit('tower_leaderboard', { leaderboard: board });
  });

  socket.on('tower_sweep', (data) => {
    const targetFloor = (data && data.targetFloor) || Math.max(0, (player.towerFloor || 0) - 10);
    const result = sweepFloors(player, targetFloor);
    socket.emit('tower_sweep_result', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });
}

module.exports = {
  MAX_FLOOR, DAILY_ATTEMPTS,
  BOSS_MECHANICS, FLOOR_MODIFIERS, TOWER_CHALLENGES,
  getFloorEnemy, getFloorReward, getFloorModifier,
  getInfiniteFloorEnemy, getInfiniteFloorReward,
  battleFloor, attemptFloor, attemptInfiniteFloor,
  getTowerLeaderboard, getCurrentChallenge, attemptChallenge,
  sweepFloors, register,
};

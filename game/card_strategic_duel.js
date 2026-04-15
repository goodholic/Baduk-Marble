// ============================================
// 전략 카드 대결 — 턴제 마나 기반 카드 배틀
// ============================================

// 마나 시스템: 턴마다 +1 마나 (최대 10)
const MAX_MANA = 10;
const STARTING_HP = 30;
const HAND_SIZE = 5;
const DECK_SIZE = 15;
const MAX_HAND = 7;
const MAX_FIELD = 4;

// 대결 등급 (별도 랭킹)
const DUEL_RANKS = [
  { rank: 'trainee',      name: '수련생',       icon: '📘', minPoints: 0 },
  { rank: 'fighter',      name: '카드 파이터',  icon: '⚔️', minPoints: 100 },
  { rank: 'master',       name: '카드 마스터',  icon: '🏆', minPoints: 500 },
  { rank: 'king',         name: '카드 킹',      icon: '👑', minPoints: 1500 },
  { rank: 'god',          name: '카드 갓',      icon: '🌟', minPoints: 5000 },
];

// 대결 보상
const DUEL_REWARDS = {
  win:  { gold: 3000, duelPoints: 40, desc: '승리 보상' },
  lose: { gold: 500,  duelPoints: 5,  desc: '패배 위로금' },
};

// 등급별 마나 코스트
const MANA_COSTS = { normal: 1, common: 1, uncommon: 1, rare: 2, epic: 3, legend: 5, myth: 7 };

// ============================================
// 카드 변환
// ============================================

function convertToDuelCard(mercCard) {
  const manaCost = MANA_COSTS[mercCard.grade] || MANA_COSTS[_gradeIndexToName(mercCard.grade)] || 2;
  return {
    id: mercCard.id,
    name: mercCard.name,
    icon: mercCard.icon || '⚔️',
    manaCost,
    atk: Math.max(1, Math.floor((mercCard.atk || 30) / 10)),
    hp: Math.max(1, Math.floor((mercCard.hp || 100) / 50)),
    maxHp: Math.max(1, Math.floor((mercCard.hp || 100) / 50)),
    grade: mercCard.grade,
    race: mercCard.race || mercCard.element || null,
    class: mercCard.class || mercCard.role || null,
    ability: getDuelAbility(mercCard),
    canAttack: false,   // 배치 턴에는 공격 불가 (rush 제외)
    stealthActive: false,
  };
}

function _gradeIndexToName(grade) {
  if (typeof grade === 'number') {
    return ['normal', 'uncommon', 'rare', 'epic', 'legend', 'myth'][grade] || 'normal';
  }
  return grade;
}

// 클래스별 특수 능력
function getDuelAbility(card) {
  const cls = (card.class || card.role || '').toLowerCase();
  const abilities = {
    warrior:  { name: '도발',       effect: 'taunt',   desc: '적이 이 카드를 먼저 공격해야 함' },
    '전사':   { name: '도발',       effect: 'taunt',   desc: '적이 이 카드를 먼저 공격해야 함' },
    mage:     { name: '마법 공격',   effect: 'spell',   desc: '배치 시 적 전체에 1 데미지' },
    '마법':   { name: '마법 공격',   effect: 'spell',   desc: '배치 시 적 전체에 1 데미지' },
    ranger:   { name: '선제 공격',   effect: 'rush',    desc: '배치한 턴에 즉시 공격 가능' },
    '사수':   { name: '선제 공격',   effect: 'rush',    desc: '배치한 턴에 즉시 공격 가능' },
    healer:   { name: '치유',       effect: 'heal',    desc: '매 턴 아군 1명 HP+1 회복' },
    '치유':   { name: '치유',       effect: 'heal',    desc: '매 턴 아군 1명 HP+1 회복' },
    assassin: { name: '은신',       effect: 'stealth', desc: '첫 공격 시 데미지 2배' },
    '암살':   { name: '은신',       effect: 'stealth', desc: '첫 공격 시 데미지 2배' },
  };
  return abilities[cls] || { name: '일반', effect: 'none', desc: '특수 능력 없음' };
}

// ============================================
// 덱 빌드
// ============================================

function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDuelDeck(player) {
  // 용병 카드 목록에서 상위 15장 선택 (스탯 합산 기준)
  const mercs = (player.mercenaries || player.cards || []).slice();
  mercs.sort((a, b) => {
    const scoreA = (a.atk || 0) + (a.hp || 0) + (a.def || 0);
    const scoreB = (b.atk || 0) + (b.hp || 0) + (b.def || 0);
    return scoreB - scoreA;
  });
  const top = mercs.slice(0, DECK_SIZE);
  // 부족하면 기본 카드로 채움
  while (top.length < DECK_SIZE) {
    top.push({
      id: `basic_${top.length}`,
      name: '수련병',
      icon: '🗡️',
      grade: 'normal',
      atk: 10 + Math.floor(Math.random() * 10),
      hp: 50 + Math.floor(Math.random() * 30),
      role: ['warrior', 'mage', 'ranger', 'healer', 'assassin'][Math.floor(Math.random() * 5)],
    });
  }
  const duelCards = top.map(m => convertToDuelCard(m));
  return _shuffle(duelCards);
}

// ============================================
// 대결 상태 초기화
// ============================================

function _createSide(player, deck) {
  return {
    playerId: player.id || player.name || 'unknown',
    playerName: player.name || 'Player',
    hp: STARTING_HP,
    maxHp: STARTING_HP,
    mana: 1,
    maxMana: 1,
    deck: [...deck],
    hand: [],
    field: [],
    fatigueDmg: 0,
    isBot: false,
  };
}

function startDuel(playerA, playerB) {
  const deckA = buildDuelDeck(playerA);
  const deckB = buildDuelDeck(playerB);

  const state = {
    id: `duel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sideA: _createSide(playerA, deckA),
    sideB: _createSide(playerB, deckB),
    turn: 1,
    currentSide: 'A', // A가 선공
    phase: 'playing',  // playing | finished
    winner: null,
    log: [],
    startTime: Date.now(),
  };

  // 각 플레이어 초기 3장 드로우
  for (let i = 0; i < 3; i++) {
    drawCard(state, 'A');
    drawCard(state, 'B');
  }

  state.log.push({ type: 'start', msg: `대결 시작! ${state.sideA.playerName} vs ${state.sideB.playerName}` });
  return state;
}

// ============================================
// 봇 대결
// ============================================

function _generateBotDeck(playerLevel) {
  const gradePool = ['normal', 'normal', 'rare', 'rare', 'epic'];
  if (playerLevel > 20) gradePool.push('legend');
  if (playerLevel > 50) gradePool.push('myth');

  const roles = ['warrior', 'mage', 'ranger', 'healer', 'assassin'];
  const names = {
    warrior: ['돌격병', '방패수', '철갑전사', '무쇠기사'],
    mage: ['화염술사', '빙결마법사', '번개마도사', '어둠주술사'],
    ranger: ['정찰병', '명사수', '사냥꾼', '바람궁수'],
    healer: ['수습사제', '치유사', '성직자', '빛의사도'],
    assassin: ['그림자', '독침', '야행자', '사신'],
  };
  const icons = { warrior: '⚔️', mage: '🔮', ranger: '🏹', healer: '💚', assassin: '🗡️' };

  const deck = [];
  for (let i = 0; i < DECK_SIZE; i++) {
    const role = roles[Math.floor(Math.random() * roles.length)];
    const grade = gradePool[Math.floor(Math.random() * gradePool.length)];
    const namePool = names[role];
    const baseMult = MANA_COSTS[grade] || 1;
    deck.push({
      id: `bot_card_${i}`,
      name: namePool[Math.floor(Math.random() * namePool.length)],
      icon: icons[role],
      grade,
      atk: 10 + baseMult * 8 + Math.floor(Math.random() * 10),
      hp: 50 + baseMult * 20 + Math.floor(Math.random() * 30),
      role,
    });
  }
  return deck.map(m => convertToDuelCard(m));
}

function startDuelVsBot(player) {
  const playerDeck = buildDuelDeck(player);
  const level = player.level || player.lv || 1;
  const botDeck = _shuffle(_generateBotDeck(level));

  const bot = { id: 'bot', name: 'AI 대전자', level };

  const state = {
    id: `duel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sideA: _createSide(player, playerDeck),
    sideB: _createSide(bot, botDeck),
    turn: 1,
    currentSide: 'A',
    phase: 'playing',
    winner: null,
    log: [],
    startTime: Date.now(),
  };
  state.sideB.isBot = true;

  for (let i = 0; i < 3; i++) {
    drawCard(state, 'A');
    drawCard(state, 'B');
  }

  state.log.push({ type: 'start', msg: `대결 시작! ${state.sideA.playerName} vs AI 대전자` });
  return state;
}

// ============================================
// 드로우
// ============================================

function drawCard(duelState, side) {
  const s = side === 'A' ? duelState.sideA : duelState.sideB;
  if (s.hand.length >= MAX_HAND) {
    duelState.log.push({ type: 'overdraw', side, msg: `${s.playerName}: 손패 가득! 카드 소멸` });
    s.deck.shift(); // 카드 버림
    return null;
  }
  if (s.deck.length === 0) {
    // 피로 데미지
    s.fatigueDmg += 1;
    s.hp -= s.fatigueDmg;
    duelState.log.push({ type: 'fatigue', side, msg: `${s.playerName}: 덱 소진! 피로 데미지 ${s.fatigueDmg}` });
    checkWinner(duelState);
    return null;
  }
  const card = s.deck.shift();
  card.canAttack = false;
  card.stealthActive = false;
  s.hand.push(card);
  duelState.log.push({ type: 'draw', side, msg: `${s.playerName}: ${card.name} 드로우` });
  return card;
}

// ============================================
// 카드 내기 (배치)
// ============================================

function playCard(duelState, side, handIndex, fieldPosition) {
  if (duelState.phase !== 'playing') return { ok: false, error: '대결이 이미 종료됨' };
  if (duelState.currentSide !== side) return { ok: false, error: '상대 턴입니다' };

  const s = side === 'A' ? duelState.sideA : duelState.sideB;
  const opp = side === 'A' ? duelState.sideB : duelState.sideA;

  if (handIndex < 0 || handIndex >= s.hand.length) return { ok: false, error: '잘못된 카드 인덱스' };
  if (s.field.length >= MAX_FIELD) return { ok: false, error: '필드가 가득 참 (최대 4장)' };

  const card = s.hand[handIndex];
  if (s.mana < card.manaCost) return { ok: false, error: `마나 부족 (필요: ${card.manaCost}, 보유: ${s.mana})` };

  // 마나 소비
  s.mana -= card.manaCost;
  // 손에서 제거
  s.hand.splice(handIndex, 1);
  // 필드에 배치
  card.canAttack = false; // 배치 턴에는 공격 불가
  card.stealthActive = false;

  // 필드 위치 (0~3)
  const pos = (fieldPosition != null && fieldPosition >= 0 && fieldPosition <= MAX_FIELD) ? fieldPosition : s.field.length;
  if (pos >= s.field.length) {
    s.field.push(card);
  } else {
    s.field.splice(pos, 0, card);
    if (s.field.length > MAX_FIELD) s.field.length = MAX_FIELD;
  }

  duelState.log.push({ type: 'play', side, msg: `${s.playerName}: ${card.name} 배치 (마나 ${card.manaCost} 소비)` });

  // 배치 효과 (battlecry)
  _applyBattlecry(duelState, side, card, s, opp);

  checkWinner(duelState);
  return { ok: true, card };
}

function _applyBattlecry(duelState, side, card, self, opp) {
  const effect = card.ability ? card.ability.effect : 'none';

  switch (effect) {
    case 'spell': {
      // 마법사: 적 필드 전체에 1 데미지
      const killed = [];
      for (const target of opp.field) {
        target.hp -= 1;
        if (target.hp <= 0) killed.push(target);
      }
      if (killed.length > 0) {
        opp.field = opp.field.filter(c => c.hp > 0);
        duelState.log.push({ type: 'ability', side, msg: `${card.name}: 마법 공격! 적 전체에 1 데미지 (${killed.map(k => k.name).join(', ')} 처치)` });
      } else if (opp.field.length > 0) {
        duelState.log.push({ type: 'ability', side, msg: `${card.name}: 마법 공격! 적 전체에 1 데미지` });
      }
      break;
    }
    case 'rush': {
      // 레인저: 배치 즉시 공격 가능
      card.canAttack = true;
      duelState.log.push({ type: 'ability', side, msg: `${card.name}: 선제 공격! 즉시 공격 가능` });
      break;
    }
    case 'stealth': {
      // 암살자: 은신 활성화
      card.stealthActive = true;
      duelState.log.push({ type: 'ability', side, msg: `${card.name}: 은신 발동! 첫 공격 시 2배 데미지` });
      break;
    }
    case 'taunt': {
      duelState.log.push({ type: 'ability', side, msg: `${card.name}: 도발! 적이 이 카드를 먼저 공격해야 합니다` });
      break;
    }
    case 'heal': {
      duelState.log.push({ type: 'ability', side, msg: `${card.name}: 치유사 배치. 매 턴 아군 1명 HP+1` });
      break;
    }
    default:
      break;
  }
}

// ============================================
// 공격
// ============================================

function attackWithCard(duelState, side, attackerIdx, targetIdx) {
  if (duelState.phase !== 'playing') return { ok: false, error: '대결이 이미 종료됨' };
  if (duelState.currentSide !== side) return { ok: false, error: '상대 턴입니다' };

  const self = side === 'A' ? duelState.sideA : duelState.sideB;
  const opp = side === 'A' ? duelState.sideB : duelState.sideA;

  if (attackerIdx < 0 || attackerIdx >= self.field.length) return { ok: false, error: '잘못된 공격자 인덱스' };

  const attacker = self.field[attackerIdx];
  if (!attacker.canAttack) return { ok: false, error: `${attacker.name}은(는) 이번 턴에 공격할 수 없습니다` };

  // 도발 체크: 상대 필드에 도발 카드가 있으면 그 카드를 먼저 공격해야 함
  const tauntCards = opp.field
    .map((c, i) => ({ card: c, idx: i }))
    .filter(({ card }) => card.ability && card.ability.effect === 'taunt' && card.hp > 0);

  // targetIdx === -1 이면 영웅 직접 공격
  const isHeroAttack = targetIdx === -1 || targetIdx === null || targetIdx === undefined;

  if (tauntCards.length > 0) {
    if (isHeroAttack) {
      return { ok: false, error: '도발 카드가 있어 영웅을 직접 공격할 수 없습니다' };
    }
    const targetCard = opp.field[targetIdx];
    if (!targetCard || (targetCard.ability && targetCard.ability.effect !== 'taunt')) {
      // 도발 카드가 아닌 대상 공격 시도
      const isTauntTarget = tauntCards.some(t => t.idx === targetIdx);
      if (!isTauntTarget) {
        return { ok: false, error: '도발 카드를 먼저 공격해야 합니다' };
      }
    }
  }

  // 은신 보너스
  let atkDmg = attacker.atk;
  if (attacker.stealthActive) {
    atkDmg *= 2;
    attacker.stealthActive = false;
    duelState.log.push({ type: 'ability', side, msg: `${attacker.name}: 은신 해제! 2배 데미지!` });
  }

  if (isHeroAttack) {
    // 영웅 직접 공격
    if (opp.field.length > 0 && tauntCards.length === 0) {
      // 필드에 카드가 있어도 도발이 없으면 영웅 공격 가능
    }
    opp.hp -= atkDmg;
    attacker.canAttack = false;
    duelState.log.push({ type: 'attack_hero', side, msg: `${attacker.name} → ${opp.playerName}에게 ${atkDmg} 데미지! (HP: ${opp.hp})` });
    checkWinner(duelState);
    return { ok: true, type: 'hero', damage: atkDmg, targetHp: opp.hp };
  }

  // 카드 대 카드 전투
  if (targetIdx < 0 || targetIdx >= opp.field.length) return { ok: false, error: '잘못된 대상 인덱스' };

  // 은신 카드는 공격 대상 불가 (스텔스 카드를 타겟으로 지정 불가)
  const target = opp.field[targetIdx];
  if (target.stealthActive) return { ok: false, error: '은신 상태의 카드는 공격할 수 없습니다' };

  // 상호 데미지
  target.hp -= atkDmg;
  attacker.hp -= target.atk;
  attacker.canAttack = false;

  duelState.log.push({
    type: 'attack_card', side,
    msg: `${attacker.name}(ATK ${atkDmg}) ↔ ${target.name}(ATK ${target.atk}) 전투! → ${attacker.name} HP:${attacker.hp}, ${target.name} HP:${target.hp}`,
  });

  // 사망 처리
  const deadAttacker = attacker.hp <= 0;
  const deadTarget = target.hp <= 0;

  if (deadAttacker) {
    self.field.splice(self.field.indexOf(attacker), 1);
    duelState.log.push({ type: 'death', side, msg: `${attacker.name} 전사!` });
  }
  if (deadTarget) {
    opp.field.splice(opp.field.indexOf(target), 1);
    duelState.log.push({ type: 'death', side: side === 'A' ? 'B' : 'A', msg: `${target.name} 전사!` });
  }

  checkWinner(duelState);
  return { ok: true, type: 'card', atkDmg, defDmg: target.atk, attackerDead: deadAttacker, targetDead: deadTarget };
}

// ============================================
// 턴 종료
// ============================================

function endTurn(duelState, side) {
  if (duelState.phase !== 'playing') return { ok: false, error: '대결이 이미 종료됨' };
  if (duelState.currentSide !== side) return { ok: false, error: '상대 턴입니다' };

  const self = side === 'A' ? duelState.sideA : duelState.sideB;
  const oppSide = side === 'A' ? 'B' : 'A';
  const opp = side === 'A' ? duelState.sideB : duelState.sideA;

  // 턴 종료 효과
  processTurn(duelState, side);

  // 상대 턴 시작
  duelState.currentSide = oppSide;
  duelState.turn += 1;

  // 상대 마나 증가 (최대 10)
  opp.maxMana = Math.min(MAX_MANA, opp.maxMana + 1);
  opp.mana = opp.maxMana;

  // 상대 카드 드로우
  drawCard(duelState, oppSide);

  // 상대 필드 카드 공격 가능으로 전환
  for (const card of opp.field) {
    card.canAttack = true;
  }

  duelState.log.push({ type: 'turn', side: oppSide, msg: `${opp.playerName}의 턴 (턴 ${duelState.turn}, 마나 ${opp.mana}/${opp.maxMana})` });

  // 봇이면 자동 플레이
  if (opp.isBot && duelState.phase === 'playing') {
    _botPlay(duelState, oppSide);
  }

  checkWinner(duelState);
  return { ok: true, turn: duelState.turn, currentSide: duelState.currentSide };
}

// ============================================
// 턴 종료 처리 (힐러 등)
// ============================================

function processTurn(duelState, side) {
  const self = side === 'A' ? duelState.sideA : duelState.sideB;

  // 힐러 능력: 아군 중 가장 HP 낮은 카드 1명 HP+1
  const healers = self.field.filter(c => c.ability && c.ability.effect === 'heal');
  if (healers.length > 0 && self.field.length > 0) {
    // HP가 가장 낮은 아군 카드 찾기 (maxHp 미만인 것만)
    const wounded = self.field.filter(c => c.hp < c.maxHp).sort((a, b) => a.hp - b.hp);
    if (wounded.length > 0) {
      const target = wounded[0];
      const healAmount = healers.length; // 힐러 수만큼 회복
      target.hp = Math.min(target.maxHp, target.hp + healAmount);
      duelState.log.push({
        type: 'heal', side,
        msg: `치유사 효과: ${target.name} HP +${healAmount} (현재 HP: ${target.hp}/${target.maxHp})`,
      });
    }
  }
}

// ============================================
// 봇 AI
// ============================================

function _botPlay(duelState, botSide) {
  const bot = botSide === 'A' ? duelState.sideA : duelState.sideB;
  const oppSide = botSide === 'A' ? 'B' : 'A';
  const opp = botSide === 'A' ? duelState.sideB : duelState.sideA;

  // 1. 카드 배치: 마나가 허용하는 한 비용 높은 카드부터 배치
  const playable = bot.hand
    .map((c, i) => ({ card: c, idx: i }))
    .filter(({ card }) => card.manaCost <= bot.mana && bot.field.length < MAX_FIELD)
    .sort((a, b) => b.card.manaCost - a.card.manaCost);

  for (const { idx } of playable) {
    // 인덱스가 변할 수 있으므로 매번 현재 손패에서 찾기
    const currentIdx = bot.hand.findIndex(c => c === playable.find(p => p.idx === idx)?.card);
    if (currentIdx === -1) continue;
    const card = bot.hand[currentIdx];
    if (bot.mana < card.manaCost || bot.field.length >= MAX_FIELD) continue;
    playCard(duelState, botSide, currentIdx, null);
  }

  // 2. 공격: 공격 가능한 카드로 최적 대상 공격
  for (let i = 0; i < bot.field.length; i++) {
    const attacker = bot.field[i];
    if (!attacker || !attacker.canAttack) continue;

    // 도발 카드 우선
    const tauntIdx = opp.field.findIndex(c => c.ability && c.ability.effect === 'taunt' && c.hp > 0);
    if (tauntIdx !== -1) {
      attackWithCard(duelState, botSide, i, tauntIdx);
      // 공격자가 죽었을 수 있으므로 인덱스 재조정
      i--;
      continue;
    }

    // 처치 가능한 카드 우선
    const killable = opp.field
      .map((c, idx) => ({ card: c, idx }))
      .filter(({ card }) => card.hp <= attacker.atk && !card.stealthActive)
      .sort((a, b) => b.card.atk - a.card.atk);

    if (killable.length > 0) {
      attackWithCard(duelState, botSide, i, killable[0].idx);
      i--;
      continue;
    }

    // 적 필드가 비어 있으면 영웅 공격
    if (opp.field.length === 0 || opp.field.every(c => c.stealthActive)) {
      attackWithCard(duelState, botSide, i, -1);
      i--;
      continue;
    }

    // 가장 약한 적 카드 공격
    const weakest = opp.field
      .map((c, idx) => ({ card: c, idx }))
      .filter(({ card }) => !card.stealthActive)
      .sort((a, b) => a.card.hp - b.card.hp);
    if (weakest.length > 0) {
      attackWithCard(duelState, botSide, i, weakest[0].idx);
      i--;
      continue;
    }
  }

  // 3. 턴 종료
  if (duelState.phase === 'playing' && duelState.currentSide === botSide) {
    // 봇 턴 종료 → 플레이어 턴으로
    const playerSide = botSide === 'A' ? 'B' : 'A';
    const player = botSide === 'A' ? duelState.sideB : duelState.sideA;

    processTurn(duelState, botSide);

    duelState.currentSide = playerSide;
    duelState.turn += 1;

    player.maxMana = Math.min(MAX_MANA, player.maxMana + 1);
    player.mana = player.maxMana;

    drawCard(duelState, playerSide);

    for (const card of player.field) {
      card.canAttack = true;
    }

    duelState.log.push({ type: 'turn', side: playerSide, msg: `${player.playerName}의 턴 (턴 ${duelState.turn}, 마나 ${player.mana}/${player.maxMana})` });
  }
}

// ============================================
// 승리 판정
// ============================================

function checkWinner(duelState) {
  if (duelState.phase !== 'playing') return duelState.winner;

  const aAlive = duelState.sideA.hp > 0;
  const bAlive = duelState.sideB.hp > 0;

  if (!aAlive && !bAlive) {
    duelState.phase = 'finished';
    duelState.winner = 'draw';
    duelState.log.push({ type: 'end', msg: '무승부!' });
  } else if (!aAlive) {
    duelState.phase = 'finished';
    duelState.winner = 'B';
    duelState.log.push({ type: 'end', msg: `${duelState.sideB.playerName} 승리!` });
  } else if (!bAlive) {
    duelState.phase = 'finished';
    duelState.winner = 'A';
    duelState.log.push({ type: 'end', msg: `${duelState.sideA.playerName} 승리!` });
  }

  return duelState.winner;
}

// ============================================
// 보상
// ============================================

function getDuelRewards(winner, loser) {
  const winReward = { ...DUEL_REWARDS.win };
  const loseReward = { ...DUEL_REWARDS.lose };

  // 승자 보상 적용
  winner.gold = (winner.gold || 0) + winReward.gold;
  winner.duelPoints = (winner.duelPoints || 0) + winReward.duelPoints;
  winner.duelWins = (winner.duelWins || 0) + 1;
  winner.duelGames = (winner.duelGames || 0) + 1;

  // 패자 보상 적용
  loser.gold = (loser.gold || 0) + loseReward.gold;
  loser.duelPoints = (loser.duelPoints || 0) + loseReward.duelPoints;
  loser.duelLosses = (loser.duelLosses || 0) + 1;
  loser.duelGames = (loser.duelGames || 0) + 1;

  // 랭크 갱신
  winner.duelRank = _getDuelRank(winner.duelPoints);
  loser.duelRank = _getDuelRank(loser.duelPoints);

  return {
    winner: { ...winReward, rank: winner.duelRank, totalPoints: winner.duelPoints },
    loser: { ...loseReward, rank: loser.duelRank, totalPoints: loser.duelPoints },
  };
}

function _getDuelRank(points) {
  let rank = DUEL_RANKS[0];
  for (const r of DUEL_RANKS) {
    if (points >= r.minPoints) rank = r;
  }
  return rank;
}

// ============================================
// 상태 조회 (상대 손패 숨김)
// ============================================

function getDuelState(duelState, playerSide) {
  if (!duelState) return null;

  const self = playerSide === 'A' ? duelState.sideA : duelState.sideB;
  const opp = playerSide === 'A' ? duelState.sideB : duelState.sideA;

  return {
    id: duelState.id,
    turn: duelState.turn,
    currentSide: duelState.currentSide,
    isMyTurn: duelState.currentSide === playerSide,
    phase: duelState.phase,
    winner: duelState.winner,
    me: {
      name: self.playerName,
      hp: self.hp,
      maxHp: self.maxHp,
      mana: self.mana,
      maxMana: self.maxMana,
      hand: self.hand,
      field: self.field,
      deckSize: self.deck.length,
      fatigueDmg: self.fatigueDmg,
    },
    opponent: {
      name: opp.playerName,
      hp: opp.hp,
      maxHp: opp.maxHp,
      mana: opp.mana,
      maxMana: opp.maxMana,
      handSize: opp.hand.length,  // 상대 손패는 수만 보여줌
      field: opp.field,
      deckSize: opp.deck.length,
      fatigueDmg: opp.fatigueDmg,
    },
    log: duelState.log.slice(-20), // 최근 20개 로그만
  };
}

// ============================================
// 대결 기록
// ============================================

function _ensureDuelData(player) {
  if (!player._strategicDuel) {
    player._strategicDuel = {
      history: [],
      activeDuel: null,
    };
  }
  return player._strategicDuel;
}

function saveDuelHistory(player, record) {
  const data = _ensureDuelData(player);
  data.history.unshift(record);
  if (data.history.length > 50) data.history.length = 50;
}

function getDuelHistory(player) {
  const data = _ensureDuelData(player);
  return data.history.slice(0, 10);
}

// ============================================
// 랭킹
// ============================================

function getDuelRanking(allPlayers) {
  const ranked = allPlayers
    .filter(p => (p.duelPoints || 0) > 0)
    .map(p => ({
      name: p.name || 'Unknown',
      duelPoints: p.duelPoints || 0,
      duelWins: p.duelWins || 0,
      duelLosses: p.duelLosses || 0,
      duelGames: p.duelGames || 0,
      rank: _getDuelRank(p.duelPoints || 0),
      winRate: p.duelGames ? Math.round((p.duelWins || 0) / p.duelGames * 100) : 0,
    }))
    .sort((a, b) => b.duelPoints - a.duelPoints)
    .slice(0, 20);

  return ranked.map((p, i) => ({ position: i + 1, ...p }));
}

// ============================================
// 활성 대결 관리 (인메모리)
// ============================================

const activeDuels = new Map(); // playerId → duelState

function _getPlayerDuel(playerId) {
  return activeDuels.get(playerId) || null;
}

function _setPlayerDuel(playerId, duelState) {
  activeDuels.set(playerId, duelState);
}

function _clearPlayerDuel(playerId) {
  activeDuels.delete(playerId);
}

// ============================================
// 소켓 이벤트 등록
// ============================================

function register(io, socket, player, players) {
  // --- 봇 대결 시작 ---
  socket.on('duel_start_bot', () => {
    // 이미 진행 중인 대결 확인
    const existing = _getPlayerDuel(player.id || player.name);
    if (existing && existing.phase === 'playing') {
      socket.emit('duel_start_bot', { ok: false, error: '이미 진행 중인 대결이 있습니다' });
      return;
    }

    const duelState = startDuelVsBot(player);
    _setPlayerDuel(player.id || player.name, duelState);
    _ensureDuelData(player).activeDuel = duelState.id;

    socket.emit('duel_start_bot', {
      ok: true,
      state: getDuelState(duelState, 'A'),
      msg: 'AI 대결 시작!',
    });
  });

  // --- 카드 배치 ---
  socket.on('duel_play_card', (data) => {
    const duelState = _getPlayerDuel(player.id || player.name);
    if (!duelState) {
      socket.emit('duel_play_card', { ok: false, error: '진행 중인 대결 없음' });
      return;
    }

    const { handIndex, fieldPosition } = data || {};
    const result = playCard(duelState, 'A', handIndex, fieldPosition);

    socket.emit('duel_play_card', {
      ...result,
      state: getDuelState(duelState, 'A'),
    });

    // 대결 종료 처리
    if (duelState.phase === 'finished') {
      _finishDuel(duelState, player, socket);
    }
  });

  // --- 공격 ---
  socket.on('duel_attack', (data) => {
    const duelState = _getPlayerDuel(player.id || player.name);
    if (!duelState) {
      socket.emit('duel_attack', { ok: false, error: '진행 중인 대결 없음' });
      return;
    }

    const { attackerIdx, targetIdx } = data || {};
    const result = attackWithCard(duelState, 'A', attackerIdx, targetIdx);

    socket.emit('duel_attack', {
      ...result,
      state: getDuelState(duelState, 'A'),
    });

    if (duelState.phase === 'finished') {
      _finishDuel(duelState, player, socket);
    }
  });

  // --- 턴 종료 ---
  socket.on('duel_end_turn', () => {
    const duelState = _getPlayerDuel(player.id || player.name);
    if (!duelState) {
      socket.emit('duel_end_turn', { ok: false, error: '진행 중인 대결 없음' });
      return;
    }

    const result = endTurn(duelState, 'A');

    socket.emit('duel_end_turn', {
      ...result,
      state: getDuelState(duelState, 'A'),
    });

    if (duelState.phase === 'finished') {
      _finishDuel(duelState, player, socket);
    }
  });

  // --- 현재 상태 조회 ---
  socket.on('duel_state', () => {
    const duelState = _getPlayerDuel(player.id || player.name);
    if (!duelState) {
      socket.emit('duel_state', { ok: false, error: '진행 중인 대결 없음' });
      return;
    }

    socket.emit('duel_state', {
      ok: true,
      state: getDuelState(duelState, 'A'),
    });
  });

  // --- 대결 기록 ---
  socket.on('duel_history', () => {
    const history = getDuelHistory(player);
    socket.emit('duel_history', {
      ok: true,
      history,
      stats: {
        wins: player.duelWins || 0,
        losses: player.duelLosses || 0,
        games: player.duelGames || 0,
        points: player.duelPoints || 0,
        rank: _getDuelRank(player.duelPoints || 0),
        winRate: player.duelGames ? Math.round((player.duelWins || 0) / player.duelGames * 100) : 0,
      },
    });
  });

  // --- 랭킹 ---
  socket.on('duel_ranking', () => {
    const allPlayers = players ? (typeof players.values === 'function' ? [...players.values()] : Object.values(players)) : [];
    const ranking = getDuelRanking(allPlayers);
    socket.emit('duel_ranking', {
      ok: true,
      ranking,
      myRank: {
        points: player.duelPoints || 0,
        rank: _getDuelRank(player.duelPoints || 0),
        wins: player.duelWins || 0,
        games: player.duelGames || 0,
      },
    });
  });
}

// 대결 종료 처리 헬퍼
function _finishDuel(duelState, player, socket) {
  const playerSide = 'A';
  const isWin = duelState.winner === playerSide;
  const isDraw = duelState.winner === 'draw';

  // 봇 플레이어 객체 (보상 계산용 더미)
  const botPlayer = {
    id: 'bot',
    name: 'AI 대전자',
    gold: 0,
    duelPoints: 0,
    duelWins: 0,
    duelLosses: 0,
    duelGames: 0,
  };

  let rewards;
  if (isDraw) {
    // 무승부: 양쪽 패자 보상
    rewards = {
      winner: { ...DUEL_REWARDS.lose, rank: _getDuelRank(player.duelPoints || 0), totalPoints: player.duelPoints || 0 },
      loser: { ...DUEL_REWARDS.lose },
    };
    player.gold = (player.gold || 0) + DUEL_REWARDS.lose.gold;
    player.duelPoints = (player.duelPoints || 0) + DUEL_REWARDS.lose.duelPoints;
    player.duelGames = (player.duelGames || 0) + 1;
    player.duelRank = _getDuelRank(player.duelPoints);
  } else if (isWin) {
    rewards = getDuelRewards(player, botPlayer);
  } else {
    rewards = getDuelRewards(botPlayer, player);
  }

  // 기록 저장
  saveDuelHistory(player, {
    duelId: duelState.id,
    opponent: duelState.sideB.playerName,
    result: isDraw ? 'draw' : (isWin ? 'win' : 'lose'),
    turns: duelState.turn,
    myHp: duelState.sideA.hp,
    oppHp: duelState.sideB.hp,
    rewards: isWin ? rewards.winner : rewards.loser,
    time: Date.now(),
  });

  // 활성 대결 제거
  _clearPlayerDuel(player.id || player.name);

  socket.emit('duel_finished', {
    ok: true,
    result: isDraw ? 'draw' : (isWin ? 'win' : 'lose'),
    rewards: isWin ? rewards.winner : rewards.loser,
    state: getDuelState(duelState, 'A'),
  });
}

// ============================================
// 모듈 내보내기
// ============================================

module.exports = {
  MAX_MANA,
  STARTING_HP,
  HAND_SIZE,
  DECK_SIZE,
  MAX_FIELD,
  MAX_HAND,
  DUEL_RANKS,
  DUEL_REWARDS,
  convertToDuelCard,
  getDuelAbility,
  buildDuelDeck,
  startDuel,
  startDuelVsBot,
  drawCard,
  playCard,
  attackWithCard,
  endTurn,
  processTurn,
  checkWinner,
  getDuelRewards,
  getDuelState,
  getDuelHistory,
  getDuelRanking,
  register,
};

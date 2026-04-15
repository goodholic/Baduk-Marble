// ============================================
// 로그라이크 카드 던전 — 랜덤 탐험 + 선택의 재미
// ============================================
// 플레이어의 카드 덱을 기반으로 던전을 탐험하며
// 매 방마다 선택지를 고르는 로그라이크 모드

const DUNGEON_CONFIG = {
  entryFee: 1000,
  maxRooms: 15,
  bossInterval: 5,       // 5, 10, 15층 보스
  topCardCount: 5,       // 상위 카드 5장 사용
  maxHistory: 10,
  deathGoldKeep: 0.3,    // 사망 시 30% 골드 보존
  abandonGoldKeep: 0.15, // 포기 시 15% 골드 보존
};

const DUNGEON_ROOMS = [
  // 전투 방 (6종)
  { type: 'combat', id: 'room_slime', name: '슬라임 무리🟢', enemy: { name: '슬라임', atk: 20, def: 10, hp: 100 }, reward: { gold: 300 }, difficulty: 1 },
  { type: 'combat', id: 'room_skeleton', name: '해골 병사💀', enemy: { name: '스켈레톤', atk: 40, def: 25, hp: 200 }, reward: { gold: 600 }, difficulty: 2 },
  { type: 'combat', id: 'room_orc', name: '오크 전사👹', enemy: { name: '오크', atk: 60, def: 35, hp: 350 }, reward: { gold: 1000 }, difficulty: 3 },
  { type: 'combat', id: 'room_dragon', name: '젊은 드래곤🐲', enemy: { name: '드래곤', atk: 100, def: 50, hp: 600 }, reward: { gold: 2000, diamonds: 3 }, difficulty: 5 },
  { type: 'combat', id: 'room_demon', name: '악마 소환사😈', enemy: { name: '악마', atk: 80, def: 40, hp: 500, mechanic: 'summon' }, reward: { gold: 1500, diamonds: 2 }, difficulty: 4 },
  { type: 'combat', id: 'room_golem', name: '고대 골렘🗿', enemy: { name: '골렘', atk: 50, def: 80, hp: 800, mechanic: 'armor' }, reward: { gold: 1200 }, difficulty: 4 },

  // 이벤트 방 (8종)
  { type: 'event', id: 'room_treasure', name: '보물 상자📦', choices: [
    { name: '열기', effect: { gold: [1000, 5000] }, risk: 0 },
    { name: '함정 확인 후 열기', effect: { gold: [500, 3000] }, risk: 0 },
    { name: '무시', effect: {}, risk: 0 },
  ]},
  { type: 'event', id: 'room_merchant', name: '떠돌이 상인🧑‍💼', choices: [
    { name: '체력 포션 구매 (500G)', effect: { healPercent: 0.3 }, cost: 500 },
    { name: '공격 버프 (1000G)', effect: { tempAtk: 0.2 }, cost: 1000 },
    { name: '랜덤 카드 (2000G)', effect: { randomCard: true }, cost: 2000 },
    { name: '떠나기', effect: {}, cost: 0 },
  ]},
  { type: 'event', id: 'room_fountain', name: '치유의 샘💧', choices: [
    { name: '마시기', effect: { healPercent: 0.5 }, risk: 0 },
    { name: '깊이 마시기', effect: { healPercent: 1.0, poisonChance: 0.3 }, risk: 0.3 },
  ]},
  { type: 'event', id: 'room_gamble', name: '도박꾼의 방🎲', choices: [
    { name: '1000G 배팅', effect: { gamble: 1000 }, cost: 1000 },
    { name: '5000G 배팅', effect: { gamble: 5000 }, cost: 5000 },
    { name: '전재산 배팅', effect: { gambleAll: true } },
    { name: '무시', effect: {} },
  ]},
  { type: 'event', id: 'room_altar', name: '신비한 제단🔮', choices: [
    { name: 'HP 30% 희생 → ATK 영구+20', effect: { sacrifice: 0.3, permAtk: 20 } },
    { name: 'ATK 20% 희생 → HP 영구+100', effect: { sacrificeAtk: 0.2, permHp: 100 } },
    { name: '기도 (랜덤)', effect: { randomBlessing: true } },
  ]},
  { type: 'event', id: 'room_trap', name: '함정 방⚠️', choices: [
    { name: '조심히 통과', effect: { damage: [0, 50] }, risk: 0.3 },
    { name: '강행 돌파', effect: { damage: [50, 150] }, risk: 0 },
    { name: '해제 시도', effect: { disarm: true, failDamage: 200 }, risk: 0.5 },
  ]},
  { type: 'event', id: 'room_chest', name: '미믹!😱', choices: [
    { name: '싸우기 (ATK 기반)', effect: { mimicFight: true } },
    { name: '도망', effect: { damage: 50 } },
  ]},
  { type: 'event', id: 'room_rest', name: '캠프파이어🔥', choices: [
    { name: '휴식 (+30% HP)', effect: { healPercent: 0.3 } },
    { name: '훈련 (+10 ATK)', effect: { permAtk: 10 } },
    { name: '명상 (+50 HP 최대치)', effect: { permHp: 50 } },
  ]},

  // 보스 방 (3종 - 5/10/15층마다)
  { type: 'boss', id: 'boss_troll_king', name: '트롤 왕🧌👑', enemy: { name: '트롤 왕', atk: 120, def: 60, hp: 1000, mechanic: 'regen' }, reward: { gold: 5000, diamonds: 10, cardChance: 0.5 }, difficulty: 6 },
  { type: 'boss', id: 'boss_lich', name: '리치 로드💀🔮', enemy: { name: '리치', atk: 150, def: 40, hp: 800, mechanic: 'drain' }, reward: { gold: 8000, diamonds: 20, cardChance: 0.7 }, difficulty: 8 },
  { type: 'boss', id: 'boss_ancient', name: '태초의 존재🌟', enemy: { name: '태초의 존재', atk: 200, def: 100, hp: 2000, mechanic: 'all' }, reward: { gold: 20000, diamonds: 50, cardChance: 1.0, cardGrade: 'legend' }, difficulty: 10 },
];

// ── 유틸 ──

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function pickWeighted(items, weightFn) {
  const total = items.reduce((s, it) => s + weightFn(it), 0);
  let roll = Math.random() * total;
  for (const it of items) {
    roll -= weightFn(it);
    if (roll <= 0) return it;
  }
  return items[items.length - 1];
}

// ── 카드 스탯 계산 ──

function getTopCards(player, count) {
  const cards = player.cards || [];
  if (cards.length === 0) return [];
  // 파워 = atk + def + hp/10 으로 상위 N장
  const sorted = [...cards].sort((a, b) => {
    const pa = (a.atk || 0) + (a.def || 0) + Math.floor((a.hp || 0) / 10);
    const pb = (b.atk || 0) + (b.def || 0) + Math.floor((b.hp || 0) / 10);
    return pb - pa;
  });
  return sorted.slice(0, count);
}

function calcBaseStats(topCards) {
  if (topCards.length === 0) {
    return { atk: 25, def: 10, hp: 300, maxHp: 300 };
  }
  const totalAtk = topCards.reduce((s, c) => s + (c.atk || 30), 0);
  const totalDef = topCards.reduce((s, c) => s + (c.def || 15), 0);
  const totalHp  = topCards.reduce((s, c) => s + (c.hp || 150), 0);
  // 카드 합산의 60%를 기본 스탯으로 사용 (밸런스 조정)
  const atk = Math.floor(totalAtk * 0.6);
  const def = Math.floor(totalDef * 0.6);
  const hp  = Math.floor(totalHp * 0.6);
  return { atk, def, hp, maxHp: hp };
}

// ── 던전 런 시작 ──

function startRun(player) {
  if (player._roguelikeRun) {
    return { success: false, msg: '이미 카드 로그라이크 진행 중입니다.' };
  }
  if ((player.gold || 0) < DUNGEON_CONFIG.entryFee) {
    return { success: false, msg: `골드 부족 (필요: ${DUNGEON_CONFIG.entryFee}G, 보유: ${player.gold || 0}G)` };
  }

  const topCards = getTopCards(player, DUNGEON_CONFIG.topCardCount);
  if (topCards.length === 0) {
    return { success: false, msg: '카드가 없습니다. 카드를 먼저 획득하세요.' };
  }

  player.gold -= DUNGEON_CONFIG.entryFee;

  const base = calcBaseStats(topCards);
  player._roguelikeRun = {
    roomNum: 0,
    hp: base.hp,
    maxHp: base.maxHp,
    atk: base.atk,
    def: base.def,
    baseAtk: base.atk,
    baseDef: base.def,
    gold: 0,
    diamonds: 0,
    kills: 0,
    tempAtkBuff: 0,        // 일시 ATK 버프 (비율)
    permAtkBonus: 0,       // 영구 ATK 추가
    permHpBonus: 0,        // 영구 HP 최대치 추가
    usedCards: topCards.map(c => ({ id: c.id, name: c.name, grade: c.grade })),
    combatLog: [],
    currentRoom: null,
    startedAt: Date.now(),
    roomsVisited: [],
    cardsWon: [],
  };

  const run = player._roguelikeRun;
  // 첫 번째 방 자동 생성
  const room = generateRoom(run);
  run.currentRoom = room;

  return {
    success: true,
    msg: `카드 로그라이크 던전 진입! (${DUNGEON_CONFIG.entryFee}G 소모)`,
    cards: run.usedCards,
    stats: { hp: run.hp, maxHp: run.maxHp, atk: run.atk, def: run.def },
    room: sanitizeRoom(room),
    run: getRunStatus(player),
  };
}

// ── 방 생성 ──

function generateRoom(run) {
  const nextRoom = run.roomNum + 1;

  // 보스 방: 5, 10, 15층
  if (nextRoom % DUNGEON_CONFIG.bossInterval === 0) {
    const bosses = DUNGEON_ROOMS.filter(r => r.type === 'boss');
    const bossIndex = Math.floor((nextRoom / DUNGEON_CONFIG.bossInterval) - 1);
    const boss = bosses[clamp(bossIndex, 0, bosses.length - 1)];
    // 층수에 따른 스케일링
    const scale = 1 + (nextRoom - 5) * 0.15;
    return {
      ...boss,
      enemy: {
        ...boss.enemy,
        atk: Math.floor(boss.enemy.atk * scale),
        def: Math.floor(boss.enemy.def * scale),
        hp: Math.floor(boss.enemy.hp * scale),
      },
      roomNum: nextRoom,
    };
  }

  // 일반 방 — 전투 vs 이벤트, 깊이에 따라 전투 비중 증가
  const combatRooms = DUNGEON_ROOMS.filter(r => r.type === 'combat');
  const eventRooms  = DUNGEON_ROOMS.filter(r => r.type === 'event');

  // 깊이가 깊을수록 전투 확률 증가 (40% → 70%)
  const combatChance = 0.4 + (nextRoom / DUNGEON_CONFIG.maxRooms) * 0.3;
  const isCombat = Math.random() < combatChance;

  if (isCombat) {
    // 난이도 가중치: 현재 깊이에 가까운 difficulty 선호
    const targetDifficulty = Math.ceil(nextRoom / 3);
    const room = pickWeighted(combatRooms, (r) => {
      const diff = Math.abs(r.difficulty - targetDifficulty);
      return Math.max(1, 10 - diff * 3);
    });
    // 층수에 따른 스케일링
    const scale = 1 + (nextRoom - 1) * 0.08;
    return {
      ...room,
      enemy: {
        ...room.enemy,
        atk: Math.floor(room.enemy.atk * scale),
        def: Math.floor(room.enemy.def * scale),
        hp: Math.floor(room.enemy.hp * scale),
      },
      reward: {
        ...room.reward,
        gold: Math.floor((room.reward.gold || 0) * scale),
      },
      roomNum: nextRoom,
    };
  } else {
    // 이벤트 방 — 랜덤 선택
    const room = eventRooms[Math.floor(Math.random() * eventRooms.length)];
    return { ...room, choices: room.choices.map(c => ({ ...c })), roomNum: nextRoom };
  }
}

function sanitizeRoom(room) {
  // 클라이언트에 보낼 정보 (적 상세 HP 숨기기)
  const out = { type: room.type, id: room.id, name: room.name, roomNum: room.roomNum };
  if (room.type === 'combat' || room.type === 'boss') {
    out.enemy = { name: room.enemy.name, difficulty: room.difficulty };
    if (room.enemy.mechanic) out.enemy.mechanic = room.enemy.mechanic;
  }
  if (room.choices) {
    out.choices = room.choices.map((c, i) => ({
      index: i,
      name: c.name,
      cost: c.cost || 0,
    }));
  }
  return out;
}

// ── 전투 시뮬레이션 ──

function combatRoom(run, enemy) {
  const log = [];
  let eHp = enemy.hp;
  const eName = enemy.name;
  const mechanic = enemy.mechanic || null;

  // 플레이어 실효 스탯
  const pAtk = run.atk + run.permAtkBonus + Math.floor(run.atk * run.tempAtkBuff);
  const pDef = run.def;
  let pHp = run.hp;
  const maxHp = run.maxHp;

  let turn = 0;
  const maxTurns = 50;

  // 소환수 (summon 메카닉)
  let summonHp = 0;
  let summonAtk = 0;
  if (mechanic === 'summon') {
    summonHp = Math.floor(enemy.hp * 0.3);
    summonAtk = Math.floor(enemy.atk * 0.4);
    log.push(`${eName}이(가) 소환수를 불러냈다! (HP: ${summonHp})`);
  }

  while (eHp > 0 && pHp > 0 && turn < maxTurns) {
    turn++;

    // ─ 플레이어 공격 ─
    const critRoll = Math.random();
    const isCrit = critRoll < 0.15; // 기본 크리티컬 15%
    let rawDmg = pAtk * (isCrit ? 2.0 : 1.0);

    // 골렘 armor 메카닉: 방어력 2배
    const effectiveDef = mechanic === 'armor' ? enemy.def * 2 : enemy.def;
    let dmg = Math.max(1, Math.floor(rawDmg - effectiveDef * 0.4));

    // 소환수 먼저 공격
    if (summonHp > 0) {
      summonHp -= dmg;
      if (summonHp <= 0) {
        log.push(`[${turn}턴] 소환수 처치!${isCrit ? ' 💥크리티컬!' : ''}`);
        summonHp = 0;
      } else {
        log.push(`[${turn}턴] 소환수에게 ${dmg} 피해${isCrit ? ' 💥크리티컬!' : ''} (소환수 HP: ${summonHp})`);
      }
    } else {
      eHp -= dmg;
      log.push(`[${turn}턴] ${eName}에게 ${dmg} 피해${isCrit ? ' 💥크리티컬!' : ''} (적 HP: ${Math.max(0, eHp)})`);
    }

    if (eHp <= 0) break;

    // ─ 적 공격 ─
    let eDmg = Math.max(1, Math.floor(enemy.atk - pDef * 0.4));

    // 드레인 메카닉: 데미지의 30% 회복
    if (mechanic === 'drain') {
      const drain = Math.floor(eDmg * 0.3);
      eHp = Math.min(enemy.hp, eHp + drain);
      log.push(`  ${eName}이(가) ${drain} HP 흡수!`);
    }

    // 리젠 메카닉: 매 턴 HP 5% 회복
    if (mechanic === 'regen') {
      const regen = Math.floor(enemy.hp * 0.05);
      eHp = Math.min(enemy.hp, eHp + regen);
      log.push(`  ${eName}이(가) ${regen} HP 재생!`);
    }

    // all 메카닉: 드레인 + 리젠 + 추가 공격
    if (mechanic === 'all') {
      const drain = Math.floor(eDmg * 0.2);
      const regen = Math.floor(enemy.hp * 0.03);
      eHp = Math.min(enemy.hp, eHp + drain + regen);
      eDmg = Math.floor(eDmg * 1.2); // 20% 추가 데미지
    }

    pHp -= eDmg;
    log.push(`  ${eName}의 공격! ${eDmg} 피해 (내 HP: ${Math.max(0, pHp)})`);

    // 소환수 추가 공격
    if (summonHp > 0) {
      const sDmg = Math.max(1, Math.floor(summonAtk - pDef * 0.3));
      pHp -= sDmg;
      log.push(`  소환수의 공격! ${sDmg} 피해 (내 HP: ${Math.max(0, pHp)})`);
    }
  }

  const won = eHp <= 0 && pHp > 0;
  const result = {
    won,
    turns: turn,
    hpBefore: run.hp,
    hpAfter: Math.max(0, pHp),
    log: log.slice(-20), // 마지막 20줄만 반환
  };

  // HP 업데이트
  run.hp = Math.max(0, pHp);

  return result;
}

// ── 방 선택 처리 ──

function processRoomChoice(player, choiceIndex) {
  const run = player._roguelikeRun;
  if (!run) return { success: false, msg: '진행 중인 런이 없습니다.' };
  if (!run.currentRoom) return { success: false, msg: '현재 방이 없습니다.' };

  const room = run.currentRoom;
  let result;

  if (room.type === 'combat' || room.type === 'boss') {
    result = handleCombatRoom(player, run, room);
  } else if (room.type === 'event') {
    result = handleEventRoom(player, run, room, choiceIndex);
  } else {
    result = { success: false, msg: '알 수 없는 방 타입' };
  }

  if (!result.success) return result;

  // 사망 체크
  if (run.hp <= 0) {
    const endResult = endRun(player, 'death');
    return { ...result, ended: true, endResult };
  }

  // 방 방문 기록
  run.roomsVisited.push({ id: room.id, name: room.name, roomNum: room.roomNum });
  run.roomNum = room.roomNum;

  // 일시 버프 매 방마다 감소
  if (run.tempAtkBuff > 0) {
    run.tempAtkBuff = Math.max(0, run.tempAtkBuff - 0.05);
  }

  // 최대 방 도달 체크
  if (run.roomNum >= DUNGEON_CONFIG.maxRooms) {
    const endResult = endRun(player, 'clear');
    return { ...result, ended: true, endResult };
  }

  // 다음 방 생성
  const nextRoom = generateRoom(run);
  run.currentRoom = nextRoom;

  result.nextRoom = sanitizeRoom(nextRoom);
  result.run = getRunStatus(player);
  return result;
}

function handleCombatRoom(player, run, room) {
  const combatResult = combatRoom(run, room.enemy);

  if (!combatResult.won) {
    run.combatLog.push({ room: room.name, result: 'defeat', turns: combatResult.turns });
    return { success: true, type: 'combat', won: false, combat: combatResult };
  }

  // 승리 보상
  run.kills++;
  const reward = room.reward || {};
  const goldEarned = reward.gold || 0;
  run.gold += goldEarned;
  if (reward.diamonds) run.diamonds += reward.diamonds;

  // 카드 보상 (보스)
  let cardReward = null;
  if (reward.cardChance && Math.random() < reward.cardChance) {
    cardReward = generateRewardCard(reward.cardGrade || 'rare');
    run.cardsWon.push(cardReward);
  }

  run.combatLog.push({ room: room.name, result: 'victory', turns: combatResult.turns, gold: goldEarned });

  return {
    success: true,
    type: 'combat',
    won: true,
    combat: combatResult,
    reward: { gold: goldEarned, diamonds: reward.diamonds || 0, card: cardReward },
  };
}

function handleEventRoom(player, run, room, choiceIndex) {
  if (!room.choices || choiceIndex < 0 || choiceIndex >= room.choices.length) {
    return { success: false, msg: '잘못된 선택입니다.' };
  }

  const choice = room.choices[choiceIndex];
  const effect = choice.effect || {};
  const messages = [];
  let totalGold = 0;
  let totalDamage = 0;

  // 비용 체크
  if (choice.cost && choice.cost > 0) {
    const totalPlayerGold = (player.gold || 0) + run.gold;
    if (totalPlayerGold < choice.cost) {
      return { success: false, msg: `골드 부족 (필요: ${choice.cost}G)` };
    }
    // 런 골드에서 먼저 차감
    if (run.gold >= choice.cost) {
      run.gold -= choice.cost;
    } else {
      const remainder = choice.cost - run.gold;
      run.gold = 0;
      player.gold = (player.gold || 0) - remainder;
    }
    messages.push(`${choice.cost}G 사용`);
  }

  // 치유
  if (effect.healPercent) {
    // 독 확률 체크
    if (effect.poisonChance && Math.random() < effect.poisonChance) {
      const poisonDmg = Math.floor(run.maxHp * 0.2);
      run.hp -= poisonDmg;
      totalDamage += poisonDmg;
      messages.push(`독에 걸렸다! ${poisonDmg} 피해!`);
    } else {
      const healAmt = Math.floor(run.maxHp * effect.healPercent);
      run.hp = Math.min(run.maxHp, run.hp + healAmt);
      messages.push(`HP ${healAmt} 회복! (HP: ${run.hp}/${run.maxHp})`);
    }
  }

  // 골드 범위 보상
  if (Array.isArray(effect.gold)) {
    const goldAmt = randInt(effect.gold[0], effect.gold[1]);
    run.gold += goldAmt;
    totalGold += goldAmt;
    messages.push(`${goldAmt}G 획득!`);
  }

  // 데미지 (고정 or 범위)
  if (effect.damage !== undefined) {
    let dmg;
    if (Array.isArray(effect.damage)) {
      // 리스크 체크: risk가 있으면 확률로 피해 무시
      if (choice.risk && Math.random() > choice.risk) {
        dmg = 0;
        messages.push('무사히 통과!');
      } else {
        dmg = randInt(effect.damage[0], effect.damage[1]);
      }
    } else {
      dmg = effect.damage;
    }
    if (dmg > 0) {
      run.hp -= dmg;
      totalDamage += dmg;
      messages.push(`${dmg} 피해를 받았다! (HP: ${Math.max(0, run.hp)})`);
    }
  }

  // 함정 해제
  if (effect.disarm) {
    if (Math.random() > choice.risk) {
      const goldReward = randInt(500, 2000);
      run.gold += goldReward;
      totalGold += goldReward;
      messages.push(`함정 해제 성공! ${goldReward}G 발견!`);
    } else {
      const dmg = effect.failDamage || 100;
      run.hp -= dmg;
      totalDamage += dmg;
      messages.push(`해제 실패! ${dmg} 피해! (HP: ${Math.max(0, run.hp)})`);
    }
  }

  // 미믹 전투
  if (effect.mimicFight) {
    const mimicEnemy = {
      name: '미믹',
      atk: 40 + run.roomNum * 8,
      def: 20 + run.roomNum * 3,
      hp: 200 + run.roomNum * 30,
    };
    const combatResult = combatRoom(run, mimicEnemy);
    if (combatResult.won) {
      const loot = randInt(1000, 4000);
      run.gold += loot;
      totalGold += loot;
      messages.push(`미믹 처치! ${loot}G 획득!`);
      run.kills++;
    } else {
      messages.push('미믹에게 패배...');
    }
    return { success: true, type: 'event', choice: choice.name, messages, combat: combatResult, goldEarned: totalGold };
  }

  // ATK 임시 버프
  if (effect.tempAtk) {
    run.tempAtkBuff += effect.tempAtk;
    messages.push(`ATK ${Math.floor(effect.tempAtk * 100)}% 버프! (${Math.floor(run.tempAtkBuff * 100)}% 총 버프)`);
  }

  // 영구 ATK 보너스
  if (effect.permAtk) {
    run.permAtkBonus += effect.permAtk;
    messages.push(`ATK 영구 +${effect.permAtk}! (총 보너스: +${run.permAtkBonus})`);
  }

  // 영구 HP 보너스
  if (effect.permHp) {
    run.permHpBonus += effect.permHp;
    run.maxHp += effect.permHp;
    run.hp += effect.permHp;
    messages.push(`HP 최대치 영구 +${effect.permHp}! (최대 HP: ${run.maxHp})`);
  }

  // HP 희생 → ATK
  if (effect.sacrifice) {
    const sacHp = Math.floor(run.hp * effect.sacrifice);
    run.hp -= sacHp;
    totalDamage += sacHp;
    messages.push(`HP ${sacHp} 희생!`);
  }

  // ATK 희생 → HP
  if (effect.sacrificeAtk) {
    const sacAtk = Math.floor(run.atk * effect.sacrificeAtk);
    run.atk -= sacAtk;
    messages.push(`ATK ${sacAtk} 희생!`);
  }

  // 도박
  if (effect.gamble) {
    if (Math.random() < 0.5) {
      const winnings = effect.gamble * 2;
      run.gold += winnings;
      totalGold += winnings;
      messages.push(`도박 승리! ${winnings}G 획득!`);
    } else {
      messages.push('도박 패배... 배팅금 잃음!');
    }
  }

  // 전재산 도박
  if (effect.gambleAll) {
    const bet = run.gold;
    if (bet <= 0) {
      messages.push('배팅할 골드가 없다!');
    } else if (Math.random() < 0.4) { // 40% 성공
      run.gold = bet * 3;
      totalGold += bet * 2;
      messages.push(`전재산 도박 대성공! ${bet * 3}G! (3배!)`);
    } else {
      run.gold = 0;
      messages.push(`전재산 ${bet}G 잃음...`);
    }
  }

  // 랜덤 축복
  if (effect.randomBlessing) {
    const blessings = [
      () => { run.permAtkBonus += 15; return 'ATK 영구 +15!'; },
      () => { run.maxHp += 80; run.hp += 80; run.permHpBonus += 80; return 'HP 최대치 영구 +80!'; },
      () => { run.hp = run.maxHp; return 'HP 완전 회복!'; },
      () => { const g = randInt(2000, 8000); run.gold += g; totalGold += g; return `${g}G 획득!`; },
      () => { run.def += 10; return 'DEF 영구 +10!'; },
    ];
    const blessing = blessings[Math.floor(Math.random() * blessings.length)];
    messages.push('신의 축복: ' + blessing());
  }

  // 랜덤 카드
  if (effect.randomCard) {
    const grades = ['normal', 'rare', 'epic'];
    const weights = [0.5, 0.35, 0.15];
    let roll = Math.random();
    let grade = 'normal';
    for (let i = 0; i < grades.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { grade = grades[i]; break; }
    }
    const card = generateRewardCard(grade);
    run.cardsWon.push(card);
    messages.push(`${card.grade.toUpperCase()} 카드 "${card.name}" 획득!`);
  }

  return {
    success: true,
    type: 'event',
    choice: choice.name,
    messages,
    goldEarned: totalGold,
    damageTaken: totalDamage,
  };
}

// ── 보상 카드 생성 ──

function generateRewardCard(grade) {
  const gradeMultipliers = {
    normal: 1,
    rare: 1.5,
    epic: 2.2,
    legend: 3.5,
    myth: 5.0,
  };
  const names = {
    normal: ['던전 전사', '동굴 궁수', '암흑 마법사'],
    rare: ['엘리트 기사', '정밀 사수', '폭풍 술사'],
    epic: ['용기사', '암살자', '대마도사'],
    legend: ['드래곤 슬레이어', '그림자 군주', '아크메이지'],
    myth: ['신의 전사', '운명의 궁수', '차원의 마법사'],
  };

  const mult = gradeMultipliers[grade] || 1;
  const namePool = names[grade] || names.normal;
  const name = namePool[Math.floor(Math.random() * namePool.length)];

  return {
    id: `card_rl_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    name,
    icon: grade === 'myth' ? '🌟' : grade === 'legend' ? '👑' : grade === 'epic' ? '💎' : grade === 'rare' ? '🔵' : '⚪',
    grade,
    atk: Math.floor(randInt(25, 45) * mult),
    def: Math.floor(randInt(15, 30) * mult),
    hp: Math.floor(randInt(120, 220) * mult),
    level: 1,
    desc: '카드 로그라이크 던전에서 획득',
  };
}

// ── 런 종료 ──

function endRun(player, reason) {
  const run = player._roguelikeRun;
  if (!run) return { success: false, msg: '진행 중인 런이 없습니다.' };

  let goldMultiplier = 1;
  let msg = '';

  switch (reason) {
    case 'clear':
      msg = '던전 클리어! 모든 방을 정복했습니다!';
      goldMultiplier = 1.0;
      break;
    case 'death':
      msg = '사망... 던전에서 쓰러졌습니다.';
      goldMultiplier = DUNGEON_CONFIG.deathGoldKeep;
      break;
    case 'abandon':
      msg = '포기... 던전을 떠났습니다.';
      goldMultiplier = DUNGEON_CONFIG.abandonGoldKeep;
      break;
    default:
      msg = '런 종료';
      goldMultiplier = DUNGEON_CONFIG.deathGoldKeep;
  }

  const finalGold = Math.floor(run.gold * goldMultiplier);
  const finalDiamonds = reason === 'clear' ? run.diamonds : Math.floor(run.diamonds * 0.5);

  // 플레이어에 보상 지급
  player.gold = (player.gold || 0) + finalGold;
  player.diamonds = (player.diamonds || 0) + finalDiamonds;

  // 획득 카드 플레이어 덱에 추가
  if (run.cardsWon.length > 0) {
    if (!player.cards) player.cards = [];
    for (const card of run.cardsWon) {
      player.cards.push(card);
    }
  }

  // 기록 저장
  const record = {
    reason,
    roomsCleared: run.roomNum,
    kills: run.kills,
    goldEarned: finalGold,
    diamondsEarned: finalDiamonds,
    cardsWon: run.cardsWon.length,
    usedCards: run.usedCards,
    duration: Date.now() - run.startedAt,
    date: Date.now(),
  };

  if (!player._roguelikeHistory) player._roguelikeHistory = [];
  player._roguelikeHistory.unshift(record);
  if (player._roguelikeHistory.length > DUNGEON_CONFIG.maxHistory) {
    player._roguelikeHistory = player._roguelikeHistory.slice(0, DUNGEON_CONFIG.maxHistory);
  }

  // 최고 기록 갱신
  if (!player._roguelikeBest || run.roomNum > (player._roguelikeBest.roomsCleared || 0)) {
    player._roguelikeBest = { ...record };
  }

  // 런 데이터 삭제
  delete player._roguelikeRun;

  return {
    success: true,
    reason,
    msg,
    goldEarned: finalGold,
    diamondsEarned: finalDiamonds,
    cardsWon: run.cardsWon,
    roomsCleared: run.roomNum,
    kills: run.kills,
    best: player._roguelikeBest,
  };
}

// ── 상태 조회 ──

function getRunStatus(player) {
  const run = player._roguelikeRun;
  if (!run) return null;
  return {
    roomNum: run.roomNum,
    maxRooms: DUNGEON_CONFIG.maxRooms,
    hp: run.hp,
    maxHp: run.maxHp,
    atk: run.atk + run.permAtkBonus + Math.floor(run.atk * run.tempAtkBuff),
    def: run.def,
    gold: run.gold,
    diamonds: run.diamonds,
    kills: run.kills,
    tempAtkBuff: Math.floor(run.tempAtkBuff * 100),
    permAtkBonus: run.permAtkBonus,
    permHpBonus: run.permHpBonus,
    usedCards: run.usedCards,
    cardsWon: run.cardsWon.length,
    currentRoom: run.currentRoom ? sanitizeRoom(run.currentRoom) : null,
  };
}

function getRunHistory(player) {
  return {
    history: (player._roguelikeHistory || []).slice(0, DUNGEON_CONFIG.maxHistory),
    best: player._roguelikeBest || null,
    totalRuns: (player._roguelikeHistory || []).length,
  };
}

// ── 소켓 등록 ──

function register(io, socket, player) {
  // 던전 시작
  socket.on('roguelike_start', () => {
    if (!player) return;
    const result = startRun(player);
    socket.emit('roguelike_result', result);
    if (result.success) {
      io.emit('server_msg', {
        msg: `🗡️ ${player.displayName || player.className || '모험가'}님이 카드 로그라이크 던전에 진입!`,
        type: 'dungeon',
      });
    }
  });

  // 다음 방 진행 (전투방은 자동 전투, 이벤트방은 선택 필요)
  socket.on('roguelike_room', () => {
    if (!player) return;
    const run = player._roguelikeRun;
    if (!run || !run.currentRoom) {
      socket.emit('roguelike_result', { success: false, msg: '진행 중인 런이 없습니다.' });
      return;
    }
    const room = run.currentRoom;
    // 전투방은 바로 전투 처리
    if (room.type === 'combat' || room.type === 'boss') {
      const result = processRoomChoice(player, 0);
      socket.emit('roguelike_result', result);
      if (result.ended) {
        emitEndMessage(io, player, result.endResult);
      }
    } else {
      // 이벤트방은 선택지 표시
      socket.emit('roguelike_result', {
        success: true,
        type: 'event_pending',
        room: sanitizeRoom(room),
        run: getRunStatus(player),
      });
    }
  });

  // 선택지 선택
  socket.on('roguelike_choose', (choiceIndex) => {
    if (!player) return;
    const idx = typeof choiceIndex === 'number' ? choiceIndex : parseInt(choiceIndex, 10);
    if (isNaN(idx)) {
      socket.emit('roguelike_result', { success: false, msg: '잘못된 선택 인덱스' });
      return;
    }
    const result = processRoomChoice(player, idx);
    socket.emit('roguelike_result', result);
    if (result.ended) {
      emitEndMessage(io, player, result.endResult);
    }
  });

  // 상태 조회
  socket.on('roguelike_status', () => {
    if (!player) return;
    socket.emit('roguelike_status', {
      active: !!player._roguelikeRun,
      run: getRunStatus(player),
    });
  });

  // 기록 조회
  socket.on('roguelike_history', () => {
    if (!player) return;
    socket.emit('roguelike_history', getRunHistory(player));
  });

  // 포기
  socket.on('roguelike_abandon', () => {
    if (!player) return;
    if (!player._roguelikeRun) {
      socket.emit('roguelike_result', { success: false, msg: '진행 중인 런이 없습니다.' });
      return;
    }
    const result = endRun(player, 'abandon');
    socket.emit('roguelike_result', result);
    emitEndMessage(io, player, result);
  });
}

function emitEndMessage(io, player, endResult) {
  if (!endResult) return;
  const name = player.displayName || player.className || '모험가';
  if (endResult.reason === 'clear') {
    io.emit('server_msg', {
      msg: `🏆 ${name}님이 카드 로그라이크 던전 ${endResult.roomsCleared}층 클리어! (${endResult.kills}킬)`,
      type: 'boss',
    });
  } else if (endResult.reason === 'death') {
    io.emit('server_msg', {
      msg: `💀 ${name}님이 카드 로그라이크 ${endResult.roomsCleared}층에서 쓰러졌다...`,
      type: 'dungeon',
    });
  }
}

module.exports = { register, startRun, generateRoom, processRoomChoice, combatRoom, endRun, getRunStatus, getRunHistory };

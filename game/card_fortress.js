// ============================================
// 카드 기지(성) 시스템 — 건설 + 다른 플레이어 공략
// 카드게임 내에서 "성 공략"의 재미
// ============================================

// 기지 시설 (카드로 건설)
const FORTRESS_BUILDINGS = [
  { id: 'fb_wall', name: '성벽', icon: '🧱', cost: { gold: 2000 }, hp: 500, def: 50, desc: '기본 방어', maxLv: 10 },
  { id: 'fb_tower', name: '감시탑', icon: '🗼', cost: { gold: 3000 }, hp: 300, atk: 30, desc: '자동 공격', maxLv: 5 },
  { id: 'fb_barracks', name: '병영', icon: '🏕️', cost: { gold: 4000 }, effect: { mercSlot: 1 }, desc: '수비 용병 +1', maxLv: 5 },
  { id: 'fb_mine', name: '금광', icon: '⛏️💰', cost: { gold: 5000 }, effect: { goldPerHour: 200 }, desc: '시간당 골드 생산', maxLv: 10 },
  { id: 'fb_lab', name: '연구소', icon: '🔬', cost: { gold: 6000 }, effect: { cardExpBonus: 0.1 }, desc: '카드 EXP +10%/Lv', maxLv: 5 },
  { id: 'fb_market', name: '시장', icon: '🏪', cost: { gold: 4000 }, effect: { tradeMul: 1.1 }, desc: '무역 수익 +10%/Lv', maxLv: 5 },
  { id: 'fb_shrine', name: '신전', icon: '⛪', cost: { gold: 8000 }, effect: { diamondPerDay: 3 }, desc: '일일 다이아 +3/Lv', maxLv: 3 },
  { id: 'fb_vault', name: '금고', icon: '🏦', cost: { gold: 3000 }, effect: { raidProtect: 0.1 }, desc: '약탈 방어 +10%/Lv', maxLv: 10 },
];

// 기지 레벨 (총 건물 수 기준)
const FORTRESS_LEVELS = [
  { level: 1, name: '야영지', buildings: 0, icon: '⛺' },
  { level: 2, name: '마을', buildings: 3, icon: '🏘️' },
  { level: 3, name: '요새', buildings: 6, icon: '🏰' },
  { level: 4, name: '성채', buildings: 10, icon: '🏰🌟' },
  { level: 5, name: '왕성', buildings: 15, icon: '🏰👑' },
];

// 수비 배치 포지션별 보너스
const DEFENDER_POSITIONS = {
  gate:       { name: '정문', bonusStat: 'def', bonusMul: 0.20, desc: 'DEF +20%' },
  wall_left:  { name: '좌측 성벽', bonusStat: 'def', bonusMul: 0.15, desc: 'DEF +15%' },
  wall_right: { name: '우측 성벽', bonusStat: 'def', bonusMul: 0.15, desc: 'DEF +15%' },
  tower:      { name: '감시탑', bonusStat: 'atk', bonusMul: 0.30, desc: 'ATK +30%' },
  throne:     { name: '왕좌실', bonusStat: 'hp',  bonusMul: 0.25, desc: 'HP +25%' },
};

// NPC 요새 (10단계)
const NPC_FORTRESSES = [
  {
    name: '산적 소굴🏚️', level: 1, wallLv: 1, towerLv: 0, gold: 2000,
    defenders: [],
    reward: { gold: 1000, exp: 100 },
  },
  {
    name: '고블린 요새🏰', level: 2, wallLv: 3, towerLv: 1, gold: 5000,
    defenders: [{ name: '고블린 전사', atk: 40, def: 20, hp: 200 }],
    reward: { gold: 2500, exp: 200 },
  },
  {
    name: '늑대인간 은신처🐺', level: 3, wallLv: 4, towerLv: 2, gold: 8000,
    defenders: [
      { name: '늑대인간 파수꾼', atk: 55, def: 30, hp: 300 },
      { name: '늑대인간 돌격병', atk: 70, def: 15, hp: 250 },
    ],
    reward: { gold: 4000, exp: 350 },
  },
  {
    name: '해적 거점🏴‍☠️', level: 4, wallLv: 5, towerLv: 2, gold: 12000,
    defenders: [
      { name: '해적 부선장', atk: 80, def: 35, hp: 400 },
      { name: '해적 포병', atk: 90, def: 20, hp: 300 },
    ],
    reward: { gold: 6000, exp: 500 },
  },
  {
    name: '오크 전쟁캠프⚔️', level: 5, wallLv: 6, towerLv: 3, gold: 18000,
    defenders: [
      { name: '오크 대장', atk: 100, def: 50, hp: 600 },
      { name: '오크 주술사', atk: 60, def: 40, hp: 350 },
      { name: '오크 광전사', atk: 120, def: 20, hp: 400 },
    ],
    reward: { gold: 9000, exp: 700 },
  },
  {
    name: '언데드 성채💀', level: 6, wallLv: 7, towerLv: 3, gold: 25000,
    defenders: [
      { name: '데스나이트', atk: 130, def: 60, hp: 700 },
      { name: '리치', atk: 110, def: 45, hp: 500 },
      { name: '스켈레톤 궁수', atk: 80, def: 30, hp: 350 },
    ],
    reward: { gold: 12000, exp: 1000, diamonds: 5 },
  },
  {
    name: '드래곤 둥지🐉', level: 7, wallLv: 8, towerLv: 4, gold: 35000,
    defenders: [
      { name: '어린 드래곤', atk: 150, def: 70, hp: 900 },
      { name: '드래곤 수호자', atk: 100, def: 90, hp: 800 },
      { name: '화염 정령', atk: 120, def: 40, hp: 500 },
    ],
    reward: { gold: 16000, exp: 1500, diamonds: 10 },
  },
  {
    name: '악마의 탑😈', level: 8, wallLv: 9, towerLv: 4, gold: 50000,
    defenders: [
      { name: '악마 장군', atk: 180, def: 80, hp: 1100 },
      { name: '서큐버스', atk: 140, def: 50, hp: 700 },
      { name: '지옥 기사', atk: 160, def: 70, hp: 900 },
      { name: '임프 폭탄병', atk: 200, def: 10, hp: 300 },
    ],
    reward: { gold: 20000, exp: 2000, diamonds: 15 },
  },
  {
    name: '고대 신전🏛️✨', level: 9, wallLv: 10, towerLv: 5, gold: 70000,
    defenders: [
      { name: '석상 수호자', atk: 200, def: 120, hp: 1500 },
      { name: '대신관', atk: 160, def: 80, hp: 1000 },
      { name: '성기사', atk: 180, def: 100, hp: 1200 },
      { name: '빛의 정령', atk: 150, def: 60, hp: 800 },
    ],
    reward: { gold: 25000, exp: 3000, diamonds: 20, card: 'epic' },
  },
  {
    name: '마왕성🏰👑', level: 10, wallLv: 10, towerLv: 5, gold: 100000,
    defenders: [
      { name: '마왕 근위대장', atk: 250, def: 130, hp: 1800 },
      { name: '암흑 마법사', atk: 220, def: 70, hp: 1200 },
      { name: '지옥의 용', atk: 280, def: 100, hp: 2000 },
      { name: '타락한 영웅', atk: 200, def: 110, hp: 1500 },
      { name: '마왕', atk: 350, def: 150, hp: 3000 },
    ],
    reward: { gold: 25000, exp: 5000, diamonds: 30, card: 'legend' },
  },
];

// 일일 공성 제한
const DAILY_SIEGE_LIMIT = 5;

// ============================================
// 수비 용병 배치
// ============================================

function assignDefender(player, cardId, position) {
  if (!DEFENDER_POSITIONS[position]) return { ok: false, reason: '잘못된 배치 위치' };

  player.fortress = player.fortress || { buildings: {}, level: 1 };
  player.fortress.defenders = player.fortress.defenders || {};

  // 병영 레벨에 따른 최대 수비 슬롯
  const barracksLv = player.fortress.buildings['fb_barracks'] || 0;
  const maxDefenders = Math.min(5, barracksLv);
  const currentCount = Object.keys(player.fortress.defenders).length;

  if (currentCount >= maxDefenders && !player.fortress.defenders[position]) {
    return { ok: false, reason: `수비 슬롯 부족 (병영 Lv.${barracksLv}, 최대 ${maxDefenders}명)` };
  }

  // 카드 확인
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '보유하지 않은 카드' };

  // 이미 다른 포지션에 배치된 카드인지 확인
  for (const [pos, def] of Object.entries(player.fortress.defenders)) {
    if (def.cardId === cardId && pos !== position) {
      return { ok: false, reason: `이미 ${DEFENDER_POSITIONS[pos].name}에 배치된 카드입니다` };
    }
  }

  const posInfo = DEFENDER_POSITIONS[position];
  const baseAtk = card.atk || 30;
  const baseDef = card.def || 20;
  const baseHp = card.hp || 200;

  // 포지션 보너스 적용
  const bonused = { atk: baseAtk, def: baseDef, hp: baseHp };
  if (posInfo.bonusStat === 'atk') bonused.atk = Math.floor(baseAtk * (1 + posInfo.bonusMul));
  if (posInfo.bonusStat === 'def') bonused.def = Math.floor(baseDef * (1 + posInfo.bonusMul));
  if (posInfo.bonusStat === 'hp')  bonused.hp  = Math.floor(baseHp  * (1 + posInfo.bonusMul));

  player.fortress.defenders[position] = {
    cardId,
    cardName: card.name || '용병',
    position,
    positionName: posInfo.name,
    atk: bonused.atk,
    def: bonused.def,
    hp: bonused.hp,
    bonus: posInfo.desc,
  };

  return {
    ok: true,
    msg: `${card.name || '용병'}을(를) ${posInfo.name}에 배치! (${posInfo.desc})`,
    defenders: player.fortress.defenders,
  };
}

function removeDefender(player, position) {
  if (!player.fortress || !player.fortress.defenders || !player.fortress.defenders[position]) {
    return { ok: false, reason: '해당 위치에 수비 용병이 없습니다' };
  }
  const removed = player.fortress.defenders[position];
  delete player.fortress.defenders[position];
  return { ok: true, msg: `${removed.cardName}을(를) ${removed.positionName}에서 철수!`, defenders: player.fortress.defenders };
}

// ============================================
// 강화된 공성전 (멀티 페이즈)
// ============================================

function siegeBattle(attacker, defenderFort) {
  const log = [];
  const fort = defenderFort.fortress || { buildings: {}, level: 1 };

  // 공격측 파티 카드 수집
  const partyIds = attacker.ioParty || [];
  const partyCards = (attacker.cards || []).filter(c => partyIds.includes(c.id));
  if (partyCards.length === 0) {
    // 파티가 없으면 기본 공격력
    partyCards.push({ name: '모험가', atk: 50, def: 30, hp: 300 });
  }

  const totalAtk = partyCards.reduce((s, c) => s + (c.atk || 30), 0);
  const totalDef = partyCards.reduce((s, c) => s + (c.def || 20), 0);
  let attackerHp = partyCards.reduce((s, c) => s + (c.hp || 200), 0);

  const wallLv = fort.buildings ? (fort.buildings['fb_wall'] || 0) : (defenderFort.wallLv || 0);
  const towerLv = fort.buildings ? (fort.buildings['fb_tower'] || 0) : (defenderFort.towerLv || 0);
  const defenders = fort.defenders
    ? Object.values(fort.defenders)
    : (defenderFort.defenders || []);

  // ---------- Phase 1: 성벽 돌파 ----------
  let wallHp = wallLv * 500;
  const wallDef = wallLv * 50;
  let phase1Rounds = 0;

  log.push({ phase: 1, msg: `=== Phase 1: 성벽 돌파 (성벽 HP: ${wallHp}) ===`, attackerHp, wallHp });

  while (wallHp > 0 && attackerHp > 0 && phase1Rounds < 10) {
    phase1Rounds++;
    const dmgToWall = Math.max(10, Math.floor(totalAtk * (0.8 + Math.random() * 0.4) - wallDef * 0.3));
    wallHp = Math.max(0, wallHp - dmgToWall);
    log.push({ phase: 1, msg: `성벽에 ${dmgToWall} 데미지! (남은 성벽 HP: ${wallHp})`, attackerHp, wallHp });

    if (wallHp <= 0) {
      log.push({ phase: 1, msg: '성벽 돌파 성공!', attackerHp, wallHp: 0 });
      break;
    }

    // 성벽 반격 (끓는 기름 등)
    const wallCounter = Math.floor(wallDef * 0.3 * (0.5 + Math.random() * 0.5));
    if (wallCounter > 0) {
      attackerHp = Math.max(0, attackerHp - wallCounter);
      log.push({ phase: 1, msg: `성벽 방어로 ${wallCounter} 반격 데미지!`, attackerHp, wallHp });
    }
  }

  if (attackerHp <= 0) {
    log.push({ phase: 1, msg: '공격대 전멸! 공성 실패...', attackerHp: 0, wallHp });
    return { ok: true, win: false, log, msg: '성벽을 돌파하지 못하고 패배했습니다!' };
  }

  // ---------- Phase 2: 감시탑 공격 회피 ----------
  if (towerLv > 0) {
    const towerAtk = towerLv * 30;
    const towerShots = towerLv + 2;
    log.push({ phase: 2, msg: `=== Phase 2: 감시탑 방어 (Lv.${towerLv}, ${towerShots}발 공격) ===`, attackerHp, towerShots });

    for (let i = 0; i < towerShots && attackerHp > 0; i++) {
      const dodgeChance = Math.min(0.6, totalDef / (totalDef + 200));
      if (Math.random() < dodgeChance) {
        log.push({ phase: 2, msg: `감시탑 화살 회피!`, attackerHp, towerShots: towerShots - i - 1 });
      } else {
        const towerDmg = Math.floor(towerAtk * (0.7 + Math.random() * 0.6));
        attackerHp = Math.max(0, attackerHp - towerDmg);
        log.push({ phase: 2, msg: `감시탑에서 ${towerDmg} 데미지!`, attackerHp, towerShots: towerShots - i - 1 });
      }
    }

    if (attackerHp <= 0) {
      log.push({ phase: 2, msg: '감시탑 공격에 공격대 전멸!', attackerHp: 0 });
      return { ok: true, win: false, log, msg: '감시탑 공격을 견디지 못하고 패배했습니다!' };
    }

    log.push({ phase: 2, msg: '감시탑 구역 돌파 성공!', attackerHp });
  }

  // ---------- Phase 3: 수비 용병과 전투 ----------
  if (defenders.length > 0) {
    log.push({ phase: 3, msg: `=== Phase 3: 수비 용병 전투 (${defenders.length}명) ===`, attackerHp, defenderCount: defenders.length });

    for (let i = 0; i < defenders.length && attackerHp > 0; i++) {
      const d = defenders[i];
      let dHp = d.hp || 300;
      const dAtk = d.atk || 40;
      const dDef = d.def || 30;
      const dName = d.name || d.cardName || '수비병';

      log.push({ phase: 3, msg: `${dName} 등장! (ATK:${dAtk} DEF:${dDef} HP:${dHp})`, attackerHp, defenderHp: dHp });

      let duelRounds = 0;
      while (dHp > 0 && attackerHp > 0 && duelRounds < 15) {
        duelRounds++;
        // 공격측 공격
        const atkDmg = Math.max(5, Math.floor(totalAtk * (0.6 + Math.random() * 0.4) / partyCards.length - dDef * 0.3));
        dHp = Math.max(0, dHp - atkDmg);

        // 수비측 반격
        const defDmg = Math.max(5, Math.floor(dAtk * (0.6 + Math.random() * 0.4) - totalDef * 0.1));
        attackerHp = Math.max(0, attackerHp - defDmg);

        log.push({
          phase: 3,
          msg: `${dName}에게 ${atkDmg} 데미지 / ${dName}의 반격 ${defDmg} 데미지`,
          attackerHp, defenderHp: dHp,
        });
      }

      if (dHp <= 0) {
        log.push({ phase: 3, msg: `${dName} 처치!`, attackerHp });
      }
    }

    if (attackerHp <= 0) {
      log.push({ phase: 3, msg: '수비 용병에게 공격대 전멸!', attackerHp: 0 });
      return { ok: true, win: false, log, msg: '수비 용병을 돌파하지 못하고 패배했습니다!' };
    }
  }

  // ---------- Phase 4: 왕좌실 점령 ----------
  log.push({ phase: 4, msg: '=== Phase 4: 왕좌실 점령! ===', attackerHp });

  // 최종 보스 (있는 경우) 또는 함락
  const fortLevel = fort.level || defenderFort.level || 1;
  const throneHp = fortLevel * 100;
  let remaining = throneHp;

  while (remaining > 0 && attackerHp > 0) {
    const smash = Math.floor(totalAtk * (0.5 + Math.random() * 0.5));
    remaining = Math.max(0, remaining - smash);
    log.push({ phase: 4, msg: `왕좌실에 ${smash} 데미지! (남은 HP: ${remaining})`, attackerHp, throneHp: remaining });
  }

  if (remaining <= 0) {
    log.push({ phase: 4, msg: '왕좌실 점령 성공! 승리!', attackerHp });
    return { ok: true, win: true, log, msg: '공성 대성공! 적 요새를 함락시켰습니다!', attackerHpLeft: attackerHp };
  }

  log.push({ phase: 4, msg: '왕좌실 점령 실패...', attackerHp: 0 });
  return { ok: true, win: false, log, msg: '왕좌실까지 갔지만 패배했습니다!' };
}

// ============================================
// 기존 공성 (PvP) - siegeBattle 기반으로 강화
// ============================================

function attackFortress(attacker, defender) {
  if (!attacker || !defender) return { ok: false, reason: '대상 없음' };

  const result = siegeBattle(attacker, defender);
  if (!result.win) return result;

  // 승리 시 약탈
  const fort = defender.fortress || { buildings: {} };
  const vaultLv = (fort.buildings && fort.buildings['fb_vault']) || 0;
  const protectRate = Math.min(0.9, vaultLv * 0.1);
  const loot = Math.floor((defender.gold || 0) * 0.1 * (1 - protectRate));

  if (defender.gold !== undefined) {
    defender.gold = Math.max(0, (defender.gold || 0) - loot);
  }
  attacker.gold = (attacker.gold || 0) + loot;

  // 공격 기록 남기기 (수비측)
  if (defender._attackedBy) {
    defender._attackedBy.unshift({
      attackerName: attacker.nickname || attacker.name || '???',
      attackerId: attacker.id || null,
      time: Date.now(),
      result: 'lose',
      loot,
    });
    if (defender._attackedBy.length > 10) defender._attackedBy.length = 10;
  }

  result.loot = loot;
  result.msg = `공략 성공! ${loot}G 약탈!`;
  return result;
}

// ============================================
// NPC 요새 공격
// ============================================

function attackNpcFortress(player, tier) {
  if (tier < 1 || tier > NPC_FORTRESSES.length) {
    return { ok: false, reason: `1~${NPC_FORTRESSES.length} 단계만 가능합니다` };
  }

  // 일일 공성 제한 확인
  const limitCheck = checkDailySiegeLimit(player);
  if (!limitCheck.ok) return limitCheck;

  const npc = NPC_FORTRESSES[tier - 1];

  // NPC를 defender 형태로 변환
  const npcDefender = {
    fortress: {
      buildings: { fb_wall: npc.wallLv, fb_tower: npc.towerLv },
      level: npc.level,
      defenders: npc.defenders,  // array 형태 그대로 전달
    },
    gold: npc.gold,
    wallLv: npc.wallLv,
    towerLv: npc.towerLv,
    defenders: npc.defenders,
    level: npc.level,
  };

  const result = siegeBattle(player, npcDefender);

  // 공성 횟수 차감
  player._siegeCountToday = (player._siegeCountToday || 0) + 1;

  if (result.win) {
    // 보상 지급
    const reward = npc.reward;
    player.gold = (player.gold || 0) + (reward.gold || 0);
    if (reward.diamonds) player.diamonds = (player.diamonds || 0) + reward.diamonds;
    if (reward.exp) player.exp = (player.exp || 0) + reward.exp;

    // NPC 최고 클리어 기록
    player._npcFortressCleared = Math.max(player._npcFortressCleared || 0, tier);

    result.reward = reward;
    result.msg = `${npc.name} 함락! 보상: ${reward.gold}G` +
      (reward.diamonds ? ` + ${reward.diamonds} 다이아` : '') +
      (reward.exp ? ` + ${reward.exp} EXP` : '') +
      (reward.card ? ` + ${reward.card} 등급 카드!` : '');
  } else {
    result.msg = `${npc.name} 공략 실패! 더 강해져서 다시 도전하세요!`;
  }

  result.npcName = npc.name;
  result.tier = tier;
  result.siegesLeft = DAILY_SIEGE_LIMIT - (player._siegeCountToday || 0);
  return result;
}

// ============================================
// 일일 공성 제한
// ============================================

function checkDailySiegeLimit(player) {
  const now = new Date();
  const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  if (player._siegeDay !== today) {
    player._siegeDay = today;
    player._siegeCountToday = 0;
  }

  if ((player._siegeCountToday || 0) >= DAILY_SIEGE_LIMIT) {
    return { ok: false, reason: `일일 공성 횟수 소진! (${DAILY_SIEGE_LIMIT}/${DAILY_SIEGE_LIMIT})` };
  }

  return { ok: true, remaining: DAILY_SIEGE_LIMIT - (player._siegeCountToday || 0) };
}

// ============================================
// 복수 시스템
// ============================================

function getAttackLog(player) {
  player._attackedBy = player._attackedBy || [];
  return { ok: true, attacks: player._attackedBy };
}

function revengeAttack(attacker, allPlayers, targetName) {
  attacker._attackedBy = attacker._attackedBy || [];
  const record = attacker._attackedBy.find(a => a.attackerName === targetName);
  if (!record) return { ok: false, reason: '복수 대상을 찾을 수 없습니다' };

  // 일일 제한 확인
  const limitCheck = checkDailySiegeLimit(attacker);
  if (!limitCheck.ok) return limitCheck;

  // 대상 플레이어 찾기
  const target = allPlayers.find(p =>
    (p.nickname || p.name) === targetName || p.id === record.attackerId
  );

  if (!target) {
    // 대상이 오프라인이면 봇으로 대체
    const botFort = {
      fortress: {
        buildings: { fb_wall: 3, fb_tower: 2, fb_vault: 2 },
        level: 2,
        defenders: {},
      },
      gold: record.loot * 2 || 5000,
    };
    const result = attackFortress(attacker, botFort);
    attacker._siegeCountToday = (attacker._siegeCountToday || 0) + 1;
    result.revenge = true;
    result.targetName = targetName;
    result.siegesLeft = DAILY_SIEGE_LIMIT - (attacker._siegeCountToday || 0);
    if (result.win) {
      // 복수 완료 마크
      record.revenged = true;
      result.msg = `${targetName}에게 복수 성공! ${result.loot}G 약탈!`;
    }
    return result;
  }

  // 실제 PvP 복수
  const result = attackFortress(attacker, target);
  attacker._siegeCountToday = (attacker._siegeCountToday || 0) + 1;
  result.revenge = true;
  result.targetName = targetName;
  result.siegesLeft = DAILY_SIEGE_LIMIT - (attacker._siegeCountToday || 0);

  if (result.win) {
    record.revenged = true;
    result.msg = `${targetName}에게 복수 성공! ${result.loot}G 약탈!`;
  } else {
    result.msg = `${targetName}에게 복수 실패... 더 강해져야 합니다!`;
  }

  return result;
}

// ============================================
// 요새 랭킹
// ============================================

function getFortressRanking(allPlayers) {
  const rankings = (allPlayers || [])
    .filter(p => p.fortress && p.fortress.buildings)
    .map(p => {
      const totalLv = Object.values(p.fortress.buildings).reduce((s, v) => s + v, 0);
      const defenderCount = p.fortress.defenders ? Object.keys(p.fortress.defenders).length : 0;
      const levelInfo = [...FORTRESS_LEVELS].reverse().find(l => totalLv >= l.buildings) || FORTRESS_LEVELS[0];
      return {
        name: p.nickname || p.name || '???',
        level: levelInfo.level,
        levelName: levelInfo.name,
        icon: levelInfo.icon,
        totalBuildingLv: totalLv,
        defenderCount,
        npcCleared: p._npcFortressCleared || 0,
      };
    })
    .sort((a, b) => b.totalBuildingLv - a.totalBuildingLv)
    .slice(0, 20);

  return { ok: true, rankings };
}

// ============================================
// 건설 (기존)
// ============================================

function buildFortress(player, buildingId) {
  const bld = FORTRESS_BUILDINGS.find(b => b.id === buildingId);
  if (!bld) return { ok: false, reason: '알 수 없는 건물' };
  if ((player.gold || 0) < bld.cost.gold) return { ok: false, reason: '골드 부족' };

  player.fortress = player.fortress || { buildings: {}, level: 1 };
  const current = player.fortress.buildings[buildingId] || 0;
  if (current >= bld.maxLv) return { ok: false, reason: '최대 레벨' };

  player.gold -= bld.cost.gold;
  player.fortress.buildings[buildingId] = current + 1;

  // 레벨 갱신
  const totalBuildings = Object.values(player.fortress.buildings).reduce((s, v) => s + v, 0);
  const newLevel = [...FORTRESS_LEVELS].reverse().find(l => totalBuildings >= l.buildings) || FORTRESS_LEVELS[0];
  player.fortress.level = newLevel.level;

  return { ok: true, msg: `${bld.name} Lv.${current + 1} 건설! (기지: ${newLevel.icon} ${newLevel.name})`, fortress: player.fortress };
}

// 기지 수입 수집 (기존)
function collectFortressIncome(player) {
  const fort = player.fortress;
  if (!fort) return { ok: false, reason: '기지 없음' };
  const now = Date.now();
  const lastCollect = player._lastFortressCollect || now;
  const hours = Math.min(24, (now - lastCollect) / 3600000); // 최대 24시간
  if (hours < 0.1) return { ok: false, reason: '아직 수집할 수입 없음' };

  const mineLv = fort.buildings['fb_mine'] || 0;
  const gold = Math.floor(mineLv * 200 * hours);
  player.gold = (player.gold || 0) + gold;
  player._lastFortressCollect = now;

  return { ok: true, msg: `${Math.floor(hours)}시간 수입: ${gold}G 수집!`, gold };
}

// ============================================
// Socket 이벤트 등록
// ============================================

function register(io, socket, player, allPlayersObj) {
  // Helper: lazily resolve players list (allPlayersObj may be a live dict)
  function getAllPlayers() {
    return Array.isArray(allPlayersObj) ? allPlayersObj : Object.values(allPlayersObj || {});
  }
  // 기존 이벤트
  socket.on('fortress_info', () => {
    socket.emit('fortress_info', {
      buildings: FORTRESS_BUILDINGS,
      levels: FORTRESS_LEVELS,
      positions: DEFENDER_POSITIONS,
      npcTiers: NPC_FORTRESSES.map(n => ({ name: n.name, level: n.level, reward: n.reward })),
      myFortress: player.fortress || { buildings: {}, level: 1, defenders: {} },
      dailySiegeLimit: DAILY_SIEGE_LIMIT,
      siegesLeft: DAILY_SIEGE_LIMIT - (player._siegeCountToday || 0),
    });
  });

  socket.on('fortress_build', (data) => {
    const result = buildFortress(player, data.buildingId);
    socket.emit('fortress_build_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('fortress_collect', () => {
    const result = collectFortressIncome(player);
    socket.emit('fortress_collect_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('fortress_attack', (data) => {
    // 일일 제한 확인
    const limitCheck = checkDailySiegeLimit(player);
    if (!limitCheck.ok) {
      socket.emit('fortress_attack_result', limitCheck);
      return;
    }

    // 봇 상대 공략 (기존 호환)
    const botFort = {
      fortress: {
        buildings: {
          fb_wall: Math.floor(Math.random() * 5),
          fb_tower: Math.floor(Math.random() * 3),
          fb_vault: Math.floor(Math.random() * 3),
        },
        level: 2,
        defenders: {},
      },
      gold: 5000 + Math.floor(Math.random() * 10000),
      _attackedBy: [],
    };
    const result = attackFortress(player, botFort);
    player._siegeCountToday = (player._siegeCountToday || 0) + 1;
    result.siegesLeft = DAILY_SIEGE_LIMIT - (player._siegeCountToday || 0);
    socket.emit('fortress_attack_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // --- 신규 이벤트 ---

  // 수비 용병 배치
  socket.on('fortress_assign_defender', (data) => {
    const result = assignDefender(player, data.cardId, data.position);
    socket.emit('fortress_assign_defender_result', result);
  });

  // 수비 용병 철수
  socket.on('fortress_remove_defender', (data) => {
    const result = removeDefender(player, data.position);
    socket.emit('fortress_remove_defender_result', result);
  });

  // NPC 요새 공격
  socket.on('fortress_attack_npc', (data) => {
    const result = attackNpcFortress(player, data.tier);
    socket.emit('fortress_attack_npc_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 공격 기록 조회
  socket.on('fortress_attack_log', () => {
    const result = getAttackLog(player);
    socket.emit('fortress_attack_log_result', result);
  });

  // 복수 공격
  socket.on('fortress_revenge', (data) => {
    const result = revengeAttack(player, getAllPlayers(), data.targetName);
    socket.emit('fortress_revenge_result', result);
    if (result.ok && result.win) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 요새 랭킹
  socket.on('fortress_ranking', () => {
    const result = getFortressRanking(getAllPlayers());
    socket.emit('fortress_ranking_result', result);
  });
}

module.exports = {
  FORTRESS_BUILDINGS,
  FORTRESS_LEVELS,
  DEFENDER_POSITIONS,
  NPC_FORTRESSES,
  DAILY_SIEGE_LIMIT,
  buildFortress,
  attackFortress,
  collectFortressIncome,
  assignDefender,
  removeDefender,
  siegeBattle,
  attackNpcFortress,
  checkDailySiegeLimit,
  getAttackLog,
  revengeAttack,
  getFortressRanking,
  register,
};

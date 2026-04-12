// 공성전 IO 전투 — v3.0 완성
// 도전자: 상하좌우 이동 + 오토배틀로 성 돌파
// 성주: 함정+용병 사전 배치 (타워디펜스)
// 왕좌 도달 = 도전자 승리, 시간초과/사망 = 성주 승리

const SIEGE_CFG = {
  mapWidth: 25,
  mapHeight: 20,
  timeLimit: 300,           // 5분
  attackerStart: { x: 12, y: 0 },
  thronePos: { x: 12, y: 19 },
  moveSpeed: 0.5,           // 틱당 이동량 (기본)
  autoAttackRange: 2.5,
  autoAttackCd: 800,        // ms
  tickRate: 500,             // 0.5초마다 틱
  trapTriggerRadius: 1.5,
  throneRadius: 1.5,
};

// 맵 장애물 (벽) — 5개 벽으로 우회 강제
const WALLS = [
  { x1: 3, y1: 5, x2: 10, y2: 5 },    // 좌측 수평 벽
  { x1: 15, y1: 5, x2: 22, y2: 5 },   // 우측 수평 벽
  { x1: 5, y1: 10, x2: 5, y2: 14 },   // 좌측 수직 벽
  { x1: 20, y1: 10, x2: 20, y2: 14 }, // 우측 수직 벽
  { x1: 8, y1: 15, x2: 17, y2: 15 },  // 왕좌 전 수평 벽 (가운데 통로 열림)
];

// 특수 구역
const ZONES = [
  { type: 'heal', x: 12, y: 8, radius: 2, hpPerTick: 5 },       // 회복 지대
  { type: 'slow', x: 6, y: 12, radius: 2.5, slowRate: 0.5 },    // 감속 지대
  { type: 'slow', x: 18, y: 12, radius: 2.5, slowRate: 0.5 },   // 감속 지대
  { type: 'dark', x: 12, y: 16, radius: 3 },                     // 어둠 구역 (시야 차단)
];

const activeSieges = {};

// ── 벽 충돌 체크 ──
function isWallBlocking(x, y) {
  for (const w of WALLS) {
    const minX = Math.min(w.x1, w.x2) - 0.4;
    const maxX = Math.max(w.x1, w.x2) + 0.4;
    const minY = Math.min(w.y1, w.y2) - 0.4;
    const maxY = Math.max(w.y1, w.y2) + 0.4;
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) return true;
  }
  return false;
}

// ── 거리 계산 ──
function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }

// ── 데미지 공식 ──
function calcDmg(atkStat, defStat) {
  return Math.max(1, Math.floor(atkStat * (100 / (100 + defStat))));
}

// ══════ 용병 스킬 AI ══════
// 방어 용병이 쿨다운 해제 시 스킬 자동 사용
function tryDefenderSkill(def, atk, siege, now) {
  if (!def.skill || now < (def.skillCd || 0)) return null;

  const sk = def.skill;
  const cd = (sk.cd || 15) * 1000;
  def.skillCd = now + cd;

  const events = [];

  // 데미지 스킬
  if (sk.dmg) {
    const skillDmg = calcDmg(def.atk * sk.dmg, atk.def);
    if (sk.aoe) {
      // 광역: 공격자 + 소환수 전체
      atk.hp -= skillDmg;
      events.push({ type: 'skill', icon: def.icon, name: sk.name || sk.desc, dmg: skillDmg, aoe: true });
    } else {
      atk.hp -= skillDmg;
      events.push({ type: 'skill', icon: def.icon, name: sk.name || sk.desc, dmg: skillDmg });
    }
  }

  // 스턴 스킬 (빙결/정지)
  if (sk.stun) {
    atk.stunUntil = Math.max(atk.stunUntil || 0, now + sk.stun * 1000);
    events.push({ type: 'stun', icon: def.icon, dur: sk.stun, msg: `${def.icon} ${sk.name}: ${sk.stun}초 빙결!` });
  }

  // DOT 스킬
  if (sk.dot) {
    atk.dotDmg = Math.max(atk.dotDmg || 0, sk.dot);
    atk.dotUntil = Math.max(atk.dotUntil || 0, now + 5000);
    events.push({ type: 'dot', icon: def.icon, dmg: sk.dot });
  }

  // 디버프 스킬 (ATK 감소 등)
  if (sk.debuff) {
    // 단순화: 공격자 ATK 임시 감소 10초
    if (!atk._debuffs) atk._debuffs = [];
    atk._debuffs.push({ type: sk.debuff, until: now + 10000 });
    events.push({ type: 'debuff', icon: def.icon, debuff: sk.debuff });
  }

  // 치유 스킬 (자힐)
  if (sk.heal && !sk.healAll) {
    def.hp = Math.min(def.maxHp || def.hp, def.hp + sk.heal);
    events.push({ type: 'heal', icon: def.icon, amount: sk.heal });
  }

  // 전체 치유
  if (sk.healAll) {
    for (const d of siege.defenders) {
      if (d.alive) d.hp = Math.min(d.maxHp || d.hp, d.hp + sk.healAll);
    }
    events.push({ type: 'healAll', icon: def.icon, amount: sk.healAll });
  }

  // 소환 스킬
  if (sk.summon) {
    for (let i = 0; i < sk.summon; i++) {
      siege.summons.push({
        id: 'summon_' + now + '_' + i,
        icon: '💀', name: '소환수',
        atk: Math.floor(def.atk * 0.4), def: 3, hp: 40, maxHp: 40,
        x: def.x + (Math.random() - 0.5) * 3,
        y: def.y + (Math.random() - 0.5) * 2,
        alive: true, lastAttack: 0,
      });
    }
    events.push({ type: 'summon', icon: def.icon, count: sk.summon });
  }

  // 보호막
  if (sk.shield) {
    for (const d of siege.defenders) {
      if (d.alive) d.hp += sk.shield; // 간이 보호막 = HP 추가
    }
    events.push({ type: 'shield', icon: def.icon, amount: sk.shield });
  }

  // 부활 스킬
  if (sk.revive) {
    const dead = siege.defenders.find(d => !d.alive);
    if (dead) {
      dead.alive = true;
      dead.hp = Math.floor((dead.maxHp || 100) * 0.5);
      events.push({ type: 'revive', icon: def.icon, target: dead.icon + ' ' + dead.name });
    }
  }

  return events.length > 0 ? events : null;
}

// ── 공성전 시작 ──
function startSiegeBattle(attackerId, defenderId, players, io) {
  const attacker = players[attackerId];
  const defender = players[defenderId];
  if (!attacker || !defender) return { success: false, msg: '플레이어 없음' };
  if (!defender._castle) return { success: false, msg: '상대에게 성이 없습니다' };

  // 쿨다운 체크 (1시간)
  if (attacker._lastSiege && Date.now() - attacker._lastSiege < 3600000) {
    const remain = Math.ceil((3600000 - (Date.now() - attacker._lastSiege)) / 60000);
    return { success: false, msg: `공성 쿨다운 중 (${remain}분 남음)` };
  }

  // 자기 자신 공격 방지
  if (attackerId === defenderId) return { success: false, msg: '자신의 성은 공격할 수 없습니다' };

  const siegeId = 'siege_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const castle = defender._castle;

  // 공격자 스탯 (본인 + 파티 용병 합산)
  let mercSystem;
  try { mercSystem = require('./mercenary_system'); } catch(e) {}

  let totalAtk = attacker.atk || 25;
  let totalDef = attacker.def || 10;
  let totalHp = attacker.maxHp || 200;
  let partyMercs = [];

  if (mercSystem) {
    const atkMercs = mercSystem.getPlayerMercs(attacker);
    partyMercs = atkMercs.roster.filter(m => atkMercs.party.includes(m.uid));
    for (const m of partyMercs) {
      totalAtk += Math.floor(m.atk * 0.3);
      totalDef += Math.floor(m.def * 0.2);
      totalHp += Math.floor(m.hp * 0.2);
    }
  }

  const siege = {
    id: siegeId,
    attackerId, defenderId,
    attackerName: attacker.displayName || attacker.className,
    defenderName: defender.displayName || defender.className,

    attacker: {
      x: SIEGE_CFG.attackerStart.x,
      y: SIEGE_CFG.attackerStart.y,
      hp: totalHp, maxHp: totalHp,
      atk: totalAtk, def: totalDef,
      alive: true,
      partyIcons: partyMercs.map(m => m.icon).join(''),
      // 상태이상
      stunUntil: 0,      // 스턴 종료 시각 (ms)
      slowUntil: 0,      // 감속 종료 시각
      slowRate: 1.0,      // 이동속도 배율 (1.0 = 정상)
      dotDmg: 0,          // 틱당 독 데미지
      dotUntil: 0,        // 독 종료 시각
      lastAutoAtk: 0,     // 마지막 오토 공격 시각
    },

    // 방어측 함정 — 종류별 로직 분기
    traps: (castle.traps || []).map(t => ({
      ...t,
      triggered: false,
      // 화살탑/마법장벽은 지속형
      isArrowTower: t.id === 'arrow_tower',
      isBarrier: t.id === 'magic_barrier',
      barrierHp: t.id === 'magic_barrier' ? 500 : 0,
      lastShot: 0,
    })),

    // 방어 용병
    defenders: (castle.defenders || []).map(d => ({
      ...d,
      hp: d.hp || 100,
      maxHp: d.hp || 100,
      alive: true,
      lastAttack: 0,
      skillCd: 0,   // 스킬 쿨다운 종료 시각
    })),

    // 소환된 유닛 (소환 함정에 의해 생성)
    summons: [],

    phase: 'active',
    startTime: Date.now(),
    elapsed: 0,
    result: null,
    spectators: [],
    tickTimer: null,
  };

  activeSieges[siegeId] = siege;
  attacker._lastSiege = Date.now();

  // 클라이언트에 전송
  if (io) {
    const mapInfo = {
      w: SIEGE_CFG.mapWidth, h: SIEGE_CFG.mapHeight,
      walls: WALLS, zones: ZONES,
      throne: SIEGE_CFG.thronePos,
    };
    // 공격자: 함정 위치만 보임 (종류 숨김)
    io.to(attackerId).emit('siege_battle_start', {
      siegeId, role: 'attacker', map: mapInfo,
      traps: siege.traps.map(t => ({ icon: t.isBarrier ? '🔮' : '?', x: t.x, y: t.y })),
      defenders: siege.defenders.map(d => ({ icon: d.icon, name: d.name, x: d.x, y: d.y, hp: d.hp })),
      attacker: { x: siege.attacker.x, y: siege.attacker.y, hp: siege.attacker.hp, maxHp: siege.attacker.maxHp },
      timeLimit: SIEGE_CFG.timeLimit,
    });
    // 성주: 모든 정보 보임
    io.to(defenderId).emit('siege_battle_start', {
      siegeId, role: 'defender', map: mapInfo,
      traps: siege.traps,
      defenders: siege.defenders,
      attacker: { x: siege.attacker.x, y: siege.attacker.y, hp: siege.attacker.hp, maxHp: siege.attacker.maxHp },
      timeLimit: SIEGE_CFG.timeLimit,
    });
    io.emit('server_msg', {
      msg: `🏰 공성전! ${siege.attackerName} → ${siege.defenderName}의 성!`,
      type: 'boss',
    });
  }

  // 틱 루프 시작
  siege.tickTimer = setInterval(() => {
    const result = tickSiegeBattle(siegeId, io, players);
    if (!result || result.ended) {
      clearInterval(siege.tickTimer);
      siege.tickTimer = null;
    }
  }, SIEGE_CFG.tickRate);

  return { success: true, siegeId };
}

// ══════ 공성전 틱 (0.5초마다) ══════
function tickSiegeBattle(siegeId, io, players) {
  const siege = activeSieges[siegeId];
  if (!siege || siege.phase !== 'active') return { ended: true };

  const now = Date.now();
  siege.elapsed = Math.floor((now - siege.startTime) / 1000);

  // 시간 초과 → 성주 승리
  if (siege.elapsed >= SIEGE_CFG.timeLimit) {
    return endSiegeBattle(siegeId, 'defender', '시간 초과', io, players);
  }

  const atk = siege.attacker;
  if (!atk.alive) return endSiegeBattle(siegeId, 'defender', '공격자 사망', io, players);

  // ── 1. DOT (독 데미지) ──
  if (atk.dotDmg > 0 && now < atk.dotUntil) {
    atk.hp -= atk.dotDmg;
    if (atk.hp <= 0) { atk.alive = false; return endSiegeBattle(siegeId, 'defender', '독 데미지로 사망', io, players); }
  } else if (now >= atk.dotUntil) {
    atk.dotDmg = 0;
  }

  // ── 2. 감속 지대 체크 ──
  let inSlowZone = false;
  for (const zone of ZONES) {
    if (zone.type === 'slow' && dist(atk, zone) < zone.radius) {
      inSlowZone = true;
      break;
    }
  }

  // ── 3. 회복 지대 체크 ──
  for (const zone of ZONES) {
    if (zone.type === 'heal' && dist(atk, zone) < zone.radius) {
      atk.hp = Math.min(atk.maxHp, atk.hp + zone.hpPerTick);
    }
  }

  // ── 4. 함정 체크 ──
  for (const trap of siege.traps) {
    if (trap.triggered && !trap.isArrowTower) continue;

    // 화살탑: 지속 사격 (사거리 4, 2초 간격)
    if (trap.isArrowTower && !trap.triggered) {
      if (dist(atk, trap) < 4 && now - trap.lastShot > 2000) {
        trap.lastShot = now;
        const dmg = trap.dmg || 30;
        atk.hp -= dmg;
        emitToSiege(io, siege, 'siege_event', { type: 'arrow', x: trap.x, y: trap.y, dmg, msg: `🏹 화살탑! -${dmg}HP` });
        if (atk.hp <= 0) { atk.alive = false; return endSiegeBattle(siegeId, 'defender', '화살탑에 의해 사망', io, players); }
      }
      continue;
    }

    // 마법 장벽: 통과 불가 (HP 소진 시 파괴)
    if (trap.isBarrier && !trap.triggered) {
      if (dist(atk, trap) < SIEGE_CFG.trapTriggerRadius) {
        // 공격자가 장벽 공격
        const dmg = calcDmg(atk.atk, 0);
        trap.barrierHp -= dmg;
        if (trap.barrierHp <= 0) {
          trap.triggered = true;
          emitToSiege(io, siege, 'siege_event', { type: 'barrier_break', x: trap.x, y: trap.y, msg: '🔮 마법 장벽 파괴!' });
        } else {
          // 장벽에 막혀서 밀려남
          atk.y = Math.max(0, atk.y - 1);
          emitToSiege(io, siege, 'siege_event', { type: 'barrier_block', x: trap.x, y: trap.y, hp: trap.barrierHp, msg: `🔮 장벽! (${trap.barrierHp}HP 남음)` });
        }
      }
      continue;
    }

    // 일반 함정: 근접 시 1회 발동
    if (trap.triggered) continue;
    if (dist(atk, trap) < SIEGE_CFG.trapTriggerRadius) {
      trap.triggered = true;
      let msg = `${trap.icon} ${trap.name}!`;

      switch (trap.id) {
        case 'spike_trap':    // 가시 — 즉시 데미지
        case 'fire_trap':     // 화염 — 범위 데미지
        case 'bomb_trap':     // 폭탄 — 대폭발
          atk.hp -= (trap.dmg || 50);
          msg += ` -${trap.dmg}HP`;
          break;

        case 'ice_trap':      // 빙결 — 스턴
          atk.stunUntil = now + (trap.stun || 3) * 1000;
          msg += ` ${trap.stun || 3}초 빙결!`;
          break;

        case 'poison_trap':   // 독 — DOT
          atk.dotDmg = trap.dot || 10;
          atk.dotUntil = now + (trap.dur || 5) * 1000;
          msg += ` 독 ${trap.dot}×${trap.dur}초!`;
          break;

        case 'slow_trap':     // 감속 — 이동속도 반감
          atk.slowUntil = now + 5000;
          atk.slowRate = 0.5;
          msg += ` 5초 감속!`;
          break;

        case 'teleport_trap': // 텔레포트 — 시작점 귀환
          atk.x = SIEGE_CFG.attackerStart.x;
          atk.y = SIEGE_CFG.attackerStart.y;
          msg += ` 시작점으로 강제 이동!`;
          break;

        case 'summon_trap':   // 소환 — 해골 3체
          for (let i = 0; i < 3; i++) {
            siege.summons.push({
              id: 'skeleton_' + now + '_' + i,
              icon: '💀', name: '해골',
              atk: 15, def: 5, hp: 50, maxHp: 50,
              x: trap.x + (i - 1) * 1.5, y: trap.y,
              alive: true, lastAttack: 0,
            });
          }
          msg += ` 해골 3체 소환!`;
          break;

        default:
          atk.hp -= (trap.dmg || 30);
          msg += ` -${trap.dmg || 30}HP`;
      }

      emitToSiege(io, siege, 'siege_trap_triggered', { trap: { id: trap.id, icon: trap.icon, x: trap.x, y: trap.y }, msg, hp: atk.hp });
      if (atk.hp <= 0) { atk.alive = false; return endSiegeBattle(siegeId, 'defender', '함정으로 사망', io, players); }
    }
  }

  // ── 5. 방어 용병 + 소환수 전투 ──
  const allDefenders = [...siege.defenders, ...siege.summons].filter(d => d.alive);

  for (const def of allDefenders) {
    const d = dist(atk, def);

    // 방어 용병 이동 — 사거리 밖이면 공격자쪽으로 천천히 이동
    if (d > SIEGE_CFG.autoAttackRange && d < 8) {
      const dx = atk.x - def.x;
      const dy = atk.y - def.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      def.x += (dx / len) * 0.2;
      def.y += (dy / len) * 0.2;
    }

    // 오토배틀 (사거리 내)
    if (d < SIEGE_CFG.autoAttackRange && now - def.lastAttack > SIEGE_CFG.autoAttackCd) {
      def.lastAttack = now;

      // 스킬 사용 시도 (쿨다운 해제 시)
      const skillEvents = tryDefenderSkill(def, atk, siege, now);
      if (skillEvents) {
        emitToSiege(io, siege, 'siege_skill', { defIcon: def.icon, defName: def.name, events: skillEvents });
      } else {
        // 기본 공격
        const defDmg = calcDmg(def.atk, atk.def);
        atk.hp -= defDmg;
      }

      // 공격자 → 방어 용병 반격 (스턴 중이면 반격 불가)
      if (now >= atk.stunUntil) {
        const atkDmg = calcDmg(atk.atk, def.def || 0);
        def.hp -= atkDmg;
        if (def.hp <= 0) {
          def.alive = false;
          emitToSiege(io, siege, 'siege_event', { type: 'defender_kill', icon: def.icon, name: def.name, msg: `${def.icon} ${def.name} 처치!` });
        }
      }

      if (atk.hp <= 0) { atk.alive = false; return endSiegeBattle(siegeId, 'defender', '방어 용병에게 패배', io, players); }
    }
  }

  // 소환수 정리
  siege.summons = siege.summons.filter(s => s.alive);

  // ── 6. 왕좌 도달 체크 ──
  if (dist(atk, SIEGE_CFG.thronePos) < SIEGE_CFG.throneRadius) {
    return endSiegeBattle(siegeId, 'attacker', '왕좌 점령!', io, players);
  }

  // ── 7. 상태 브로드캐스트 (매 틱) ──
  const status = {
    siegeId, elapsed: siege.elapsed,
    remaining: SIEGE_CFG.timeLimit - siege.elapsed,
    attacker: {
      x: atk.x, y: atk.y, hp: atk.hp, maxHp: atk.maxHp,
      stunned: now < atk.stunUntil,
      poisoned: atk.dotDmg > 0 && now < atk.dotUntil,
      slowed: now < atk.slowUntil || inSlowZone,
    },
    defenders: siege.defenders.map(d => ({ x: d.x, y: d.y, hp: d.hp, alive: d.alive, icon: d.icon })),
    summons: siege.summons.map(s => ({ x: s.x, y: s.y, hp: s.hp, alive: s.alive, icon: s.icon })),
    trapsTriggered: siege.traps.filter(t => t.triggered).length,
  };
  emitToSiege(io, siege, 'siege_battle_update', status);

  return {};
}

// ── 공격자 이동 ──
function siegeMove(siegeId, dx, dy) {
  const siege = activeSieges[siegeId];
  if (!siege || siege.phase !== 'active') return;
  const atk = siege.attacker;
  if (!atk.alive) return;

  // 스턴 중이면 이동 불가
  if (Date.now() < atk.stunUntil) return;

  // 감속 적용
  let speed = SIEGE_CFG.moveSpeed;
  if (Date.now() < atk.slowUntil) speed *= atk.slowRate;
  // 감속 지대 체크
  for (const zone of ZONES) {
    if (zone.type === 'slow' && dist(atk, zone) < zone.radius) {
      speed *= zone.slowRate;
      break;
    }
  }

  const newX = Math.max(0, Math.min(SIEGE_CFG.mapWidth, atk.x + dx * speed));
  const newY = Math.max(0, Math.min(SIEGE_CFG.mapHeight, atk.y + dy * speed));

  // 벽 충돌 체크
  if (!isWallBlocking(newX, newY)) {
    // 마법 장벽 충돌 체크
    let blocked = false;
    for (const trap of siege.traps) {
      if (trap.isBarrier && !trap.triggered && dist({ x: newX, y: newY }, trap) < 1.2) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      atk.x = newX;
      atk.y = newY;
    }
  }
}

// ── 공성전 종료 + 보상 ──
function endSiegeBattle(siegeId, winner, reason, io, players) {
  const siege = activeSieges[siegeId];
  if (!siege || siege.phase === 'ended') return { ended: true };

  siege.phase = 'ended';
  if (siege.tickTimer) { clearInterval(siege.tickTimer); siege.tickTimer = null; }

  const isAttackerWin = winner === 'attacker';
  const atkPlayer = players ? players[siege.attackerId] : null;
  const defPlayer = players ? players[siege.defenderId] : null;

  // ── 보상 계산 ──
  const rewards = { winner: {}, loser: {} };
  if (isAttackerWin) {
    // 공격자 승리: 10,000G + 100💎 + 상대 자원 20% 약탈
    const lootGold = defPlayer ? Math.floor((defPlayer.gold || 0) * 0.2) : 0;
    rewards.winner = { gold: 10000 + lootGold, diamonds: 100, lootGold };
    rewards.loser = { goldLost: lootGold };
    if (atkPlayer) { atkPlayer.gold = (atkPlayer.gold || 0) + 10000 + lootGold; atkPlayer.diamonds = (atkPlayer.diamonds || 0) + 100; }
    if (defPlayer) { defPlayer.gold = Math.max(0, (defPlayer.gold || 0) - lootGold); }
  } else {
    // 방어 성공: 5,000G + 50💎
    rewards.winner = { gold: 5000, diamonds: 50 };
    rewards.loser = { gold: 1000 }; // 공격자도 위로금
    if (defPlayer) { defPlayer.gold = (defPlayer.gold || 0) + 5000; defPlayer.diamonds = (defPlayer.diamonds || 0) + 50; }
    if (atkPlayer) { atkPlayer.gold = (atkPlayer.gold || 0) + 1000; }
  }

  const result = {
    siegeId, winner, reason, elapsed: siege.elapsed,
    attackerName: siege.attackerName, defenderName: siege.defenderName,
    winnerName: isAttackerWin ? siege.attackerName : siege.defenderName,
    loserName: isAttackerWin ? siege.defenderName : siege.attackerName,
    trapsTriggered: siege.traps.filter(t => t.triggered).length,
    defendersKilled: siege.defenders.filter(d => !d.alive).length,
    rewards,
  };

  if (io) {
    io.to(siege.attackerId).emit('siege_battle_end', { ...result, role: 'attacker', myReward: isAttackerWin ? rewards.winner : rewards.loser });
    io.to(siege.defenderId).emit('siege_battle_end', { ...result, role: 'defender', myReward: isAttackerWin ? rewards.loser : rewards.winner });
    for (const sid of siege.spectators || []) {
      io.to(sid).emit('siege_battle_end', { ...result, role: 'spectator' });
    }
    io.emit('server_msg', {
      msg: `🏰 공성전 ${isAttackerWin ? '함락!' : '방어 성공!'} ${result.winnerName} 승리! (${reason})`,
      type: 'boss',
    });
  }

  // 정리 (10초 후 삭제)
  setTimeout(() => { delete activeSieges[siegeId]; }, 10000);
  return { ended: true, ...result };
}

// ── 유틸: 공성전 참가자 전원에게 emit ──
function emitToSiege(io, siege, event, data) {
  if (!io) return;
  io.to(siege.attackerId).emit(event, data);
  io.to(siege.defenderId).emit(event, data);
  for (const sid of siege.spectators || []) {
    io.to(sid).emit(event, data);
  }
}

// ── 관전 ──
function siegeSpectate(siegeId, spectatorId) {
  const siege = activeSieges[siegeId];
  if (!siege) return { success: false, msg: '진행 중인 공성전 없음' };
  if (!siege.spectators) siege.spectators = [];
  if (!siege.spectators.includes(spectatorId)) siege.spectators.push(spectatorId);
  return {
    success: true, msg: '공성전 관전 시작!',
    data: {
      siegeId, role: 'spectator',
      map: { w: SIEGE_CFG.mapWidth, h: SIEGE_CFG.mapHeight, walls: WALLS, zones: ZONES, throne: SIEGE_CFG.thronePos },
      attacker: siege.attacker,
      defenders: siege.defenders,
      traps: siege.traps.map(t => ({ icon: '?', x: t.x, y: t.y, triggered: t.triggered })),
      elapsed: siege.elapsed, timeLimit: SIEGE_CFG.timeLimit,
    },
  };
}

// ── 관전 채팅 ──
function siegeChat(siegeId, senderId, senderName, msg) {
  const siege = activeSieges[siegeId];
  if (!siege) return;
  const chatMsg = { from: senderName, msg: msg.substring(0, 100), time: Date.now() };
  const targets = [siege.attackerId, siege.defenderId, ...(siege.spectators || [])];
  return { targets, chatMsg };
}

// ── 활성 공성전 목록 (관전용) ──
function getActiveSiegeList() {
  return Object.values(activeSieges)
    .filter(s => s.phase === 'active')
    .map(s => ({
      siegeId: s.id,
      attacker: s.attackerName,
      defender: s.defenderName,
      elapsed: s.elapsed,
      remaining: SIEGE_CFG.timeLimit - s.elapsed,
    }));
}

// ══════ 소켓 핸들러 ══════
function registerSiegeBattleHandlers(socket, playerId, players, io) {
  // 공성전 신청
  socket.on('siege_attack', (targetName) => {
    const target = Object.entries(players).find(([, p]) => (p.displayName || p.className) === targetName && !p.isBot);
    if (!target) { socket.emit('siege_result', { success: false, msg: '대상 없음' }); return; }
    const result = startSiegeBattle(playerId, target[0], players, io);
    socket.emit('siege_result', result);
  });

  // 공격자 이동 (WASD)
  socket.on('siege_battle_move', (data) => {
    for (const [siegeId, siege] of Object.entries(activeSieges)) {
      if (siege.attackerId === playerId && siege.phase === 'active') {
        siegeMove(siegeId, data.dx || 0, data.dy || 0);
        break;
      }
    }
  });

  // 관전
  socket.on('siege_spectate', (siegeId) => {
    const result = siegeSpectate(siegeId, playerId);
    socket.emit('siege_spectate_result', result);
  });

  // 활성 공성전 목록
  socket.on('siege_list', () => {
    socket.emit('siege_list_result', getActiveSiegeList());
  });

  // 관전 채팅
  socket.on('siege_chat', (data) => {
    const p = players[playerId];
    const chatResult = siegeChat(data.siegeId, playerId, p?.displayName || '?', data.msg);
    if (chatResult) {
      chatResult.targets.forEach(tid => io.to(tid).emit('siege_chat_msg', chatResult.chatMsg));
    }
  });
}

module.exports = { startSiegeBattle, siegeMove, siegeSpectate, siegeChat, getActiveSiegeList, registerSiegeBattleHandlers, activeSieges };

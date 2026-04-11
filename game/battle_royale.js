// 배틀로얄 모드 — v2.58
// 최대 20명 자유 전투, 안전지대 축소, 최후 1인 승리
// 입장료: 2000G (상금 풀에 적립)
// 5분마다 자동 개최 (최소 6명 필요)

const BATTLE_ROYALE_CONFIG = {
  minPlayers: 6,
  maxPlayers: 20,
  entryFee: 2000,
  registrationTimeSec: 60,         // 등록 대기 시간
  matchDurationSec: 300,           // 최대 5분
  safeZoneShrinkIntervalSec: 30,   // 30초마다 안전지대 축소
  safeZoneDamagePerSec: 15,        // 밖에서 초당 15 데미지
  safeZoneMinRadius: 50,           // 최소 안전지대 반경
  safeZoneStartRadius: 400,        // 시작 안전지대 반경
  respawnDisabled: true,
  // 보상 (상금 풀의 %)
  rewards: {
    1: { poolPct: 50, diamonds: 200, title: 'royale_champion', exp: 10000 },
    2: { poolPct: 25, diamonds: 100, exp: 6000 },
    3: { poolPct: 15, diamonds: 50, exp: 4000 },
    // 나머지 10%는 참가 보상으로 분배
  },
  // 맵 중심 좌표 (아레나 존)
  mapCenter: { x: 500, y: 500 },
  // 보급 상자
  supplyDropInterval: 45,          // 45초마다 보급 투하
  supplyDrops: [
    { name: '체력 회복', effect: 'heal', value: 200 },
    { name: '공격력 부스트', effect: 'atk_boost', value: 30, duration: 30 },
    { name: '방어력 부스트', effect: 'def_boost', value: 20, duration: 30 },
    { name: '이동속도 부스트', effect: 'spd_boost', value: 10, duration: 30 },
    { name: '투명화', effect: 'stealth', duration: 10 },
    { name: '광역 폭발', effect: 'aoe_bomb', value: 150, radius: 80 },
  ],
};

// 배틀로얄 상태
let brState = {
  phase: 'idle',        // idle | registration | countdown | active | finished
  players: {},          // { playerId: { hp, maxHp, atk, def, x, y, alive, kills, damageDealt } }
  registeredIds: [],
  prizePool: 0,
  safeZone: { x: 500, y: 500, radius: 400 },
  startTime: 0,
  elapsed: 0,
  shrinkCount: 0,
  supplyBoxes: [],      // [{ id, x, y, item, claimed }]
  placements: [],       // 탈락 순서 (역순 = 순위)
  matchId: 0,
};

let _brInterval = null;
let _brIo = null;
let _brGetPlayer = null;
let _brPlayers = null;

function initBattleRoyale(io, getPlayer, playersRef) {
  _brIo = io;
  _brGetPlayer = getPlayer;
  _brPlayers = playersRef;
}

// 등록 시작 (서버에서 자동 또는 수동 호출)
function startRegistration() {
  if (brState.phase !== 'idle') return { success: false, msg: '이미 배틀로얄 진행 중' };

  brState = {
    phase: 'registration',
    players: {},
    registeredIds: [],
    prizePool: 0,
    safeZone: { ...BATTLE_ROYALE_CONFIG.mapCenter, radius: BATTLE_ROYALE_CONFIG.safeZoneStartRadius },
    startTime: 0,
    elapsed: 0,
    shrinkCount: 0,
    supplyBoxes: [],
    placements: [],
    matchId: Date.now(),
  };

  // 서버 공지
  if (_brIo) {
    _brIo.emit('server_msg', { msg: '⚔️ 배틀로얄 참가 등록 시작! (60초간 등록 가능, 참가비 2,000G)', type: 'boss' });
    _brIo.emit('battle_royale_status', getPublicState());
  }

  // 등록 시간 후 시작
  setTimeout(() => {
    if (brState.phase === 'registration') {
      if (brState.registeredIds.length >= BATTLE_ROYALE_CONFIG.minPlayers) {
        startMatch();
      } else {
        // 인원 부족 — 환불
        refundAll();
        brState.phase = 'idle';
        if (_brIo) {
          _brIo.emit('server_msg', { msg: '배틀로얄 인원 부족으로 취소 (최소 ' + BATTLE_ROYALE_CONFIG.minPlayers + '명 필요)', type: 'normal' });
          _brIo.emit('battle_royale_status', getPublicState());
        }
      }
    }
  }, BATTLE_ROYALE_CONFIG.registrationTimeSec * 1000);

  return { success: true, msg: '배틀로얄 등록이 시작되었습니다!' };
}

// 참가 등록
function registerPlayer(playerId) {
  if (brState.phase !== 'registration') return { success: false, msg: '현재 등록 기간이 아닙니다' };
  if (brState.registeredIds.includes(playerId)) return { success: false, msg: '이미 등록했습니다' };
  if (brState.registeredIds.length >= BATTLE_ROYALE_CONFIG.maxPlayers) return { success: false, msg: '정원 초과 (최대 ' + BATTLE_ROYALE_CONFIG.maxPlayers + '명)' };

  const player = _brGetPlayer ? _brGetPlayer(playerId) : (_brPlayers && _brPlayers[playerId]);
  if (!player) return { success: false, msg: '플레이어를 찾을 수 없습니다' };
  if ((player.level || 1) < 10) return { success: false, msg: 'Lv.10 이상만 참가 가능' };
  if ((player.gold || 0) < BATTLE_ROYALE_CONFIG.entryFee) return { success: false, msg: '골드가 부족합니다 (필요: ' + BATTLE_ROYALE_CONFIG.entryFee + 'G)' };

  // 참가비 차감
  player.gold -= BATTLE_ROYALE_CONFIG.entryFee;
  brState.prizePool += BATTLE_ROYALE_CONFIG.entryFee;
  brState.registeredIds.push(playerId);

  if (_brIo) {
    _brIo.emit('server_msg', {
      msg: '⚔️ ' + (player.displayName || player.className) + '님 배틀로얄 참가! (' + brState.registeredIds.length + '/' + BATTLE_ROYALE_CONFIG.maxPlayers + ')',
      type: 'normal'
    });
    _brIo.emit('battle_royale_status', getPublicState());
  }

  return { success: true, msg: '배틀로얄 등록 완료! 참가비 -' + BATTLE_ROYALE_CONFIG.entryFee + 'G (현재 ' + brState.registeredIds.length + '명)' };
}

// 매치 시작
function startMatch() {
  brState.phase = 'active';
  brState.startTime = Date.now();

  // 참가자 초기화 — 원형으로 배치
  const count = brState.registeredIds.length;
  brState.registeredIds.forEach((pid, i) => {
    const player = _brGetPlayer ? _brGetPlayer(pid) : (_brPlayers && _brPlayers[pid]);
    if (!player) return;

    const angle = (Math.PI * 2 / count) * i;
    const spawnR = BATTLE_ROYALE_CONFIG.safeZoneStartRadius * 0.7;
    const sx = BATTLE_ROYALE_CONFIG.mapCenter.x + Math.cos(angle) * spawnR;
    const sy = BATTLE_ROYALE_CONFIG.mapCenter.y + Math.sin(angle) * spawnR;

    // PvP 스탯 기반 (장비 보정 포함)
    const baseHp = player.maxHp || 200;
    const baseAtk = player.atk || 25;
    const baseDef = player.def || 10;

    brState.players[pid] = {
      name: player.displayName || player.className || 'Player',
      className: player.className || 'Warrior',
      level: player.level || 1,
      hp: Math.floor(baseHp * 1.5),  // 배틀로얄 보정
      maxHp: Math.floor(baseHp * 1.5),
      atk: baseAtk,
      def: baseDef,
      x: Math.floor(sx),
      y: Math.floor(sy),
      alive: true,
      kills: 0,
      damageDealt: 0,
      buffs: [],
      stealthUntil: 0,
    };
  });

  if (_brIo) {
    _brIo.emit('server_msg', {
      msg: '🏟️ 배틀로얄 시작! ' + count + '명의 전사가 격돌합니다! 상금: ' + brState.prizePool + 'G',
      type: 'boss'
    });
    _brIo.emit('battle_royale_start', {
      matchId: brState.matchId,
      playerCount: count,
      prizePool: brState.prizePool,
      safeZone: brState.safeZone,
    });
  }

  // 게임 루프 시작
  _brInterval = setInterval(() => tickBattleRoyale(), 1000);
}

// 1초마다 실행되는 게임 틱
function tickBattleRoyale() {
  if (brState.phase !== 'active') { clearInterval(_brInterval); return; }

  brState.elapsed = Math.floor((Date.now() - brState.startTime) / 1000);

  // 안전지대 축소
  const shrinkInterval = BATTLE_ROYALE_CONFIG.safeZoneShrinkIntervalSec;
  const newShrinkCount = Math.floor(brState.elapsed / shrinkInterval);
  if (newShrinkCount > brState.shrinkCount) {
    brState.shrinkCount = newShrinkCount;
    const shrinkAmount = 30 + newShrinkCount * 10;
    brState.safeZone.radius = Math.max(
      BATTLE_ROYALE_CONFIG.safeZoneMinRadius,
      brState.safeZone.radius - shrinkAmount
    );
    // 중심 약간 이동 (긴장감)
    brState.safeZone.x += Math.floor(Math.random() * 40 - 20);
    brState.safeZone.y += Math.floor(Math.random() * 40 - 20);

    if (_brIo) {
      _brIo.emit('battle_royale_zone_shrink', {
        safeZone: brState.safeZone,
        shrinkCount: brState.shrinkCount,
      });
      _brIo.emit('server_msg', {
        msg: '⚠️ 안전지대 축소! 반경 ' + brState.safeZone.radius,
        type: 'danger'
      });
    }
  }

  // 안전지대 밖 데미지
  for (const pid of Object.keys(brState.players)) {
    const p = brState.players[pid];
    if (!p.alive) continue;

    const dx = p.x - brState.safeZone.x;
    const dy = p.y - brState.safeZone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > brState.safeZone.radius) {
      const dmg = BATTLE_ROYALE_CONFIG.safeZoneDamagePerSec;
      p.hp -= dmg;
      // 클라이언트에 알림
      if (_brIo) {
        _brIo.to(pid).emit('battle_royale_zone_damage', { damage: dmg, hp: p.hp, maxHp: p.maxHp });
      }
      if (p.hp <= 0) {
        eliminatePlayer(pid, null, 'zone');
      }
    }

    // 버프 만료 체크
    p.buffs = p.buffs.filter(b => Date.now() < b.expiresAt);
  }

  // 보급 상자 투하
  if (brState.elapsed > 0 && brState.elapsed % BATTLE_ROYALE_CONFIG.supplyDropInterval === 0) {
    spawnSupplyDrop();
  }

  // 자동 전투 (AI 대행 — 가장 가까운 적 자동 공격)
  autoFight();

  // 생존자 체크
  const alive = Object.keys(brState.players).filter(pid => brState.players[pid].alive);
  if (alive.length <= 1) {
    endMatch(alive[0] || null);
    return;
  }

  // 시간 초과
  if (brState.elapsed >= BATTLE_ROYALE_CONFIG.matchDurationSec) {
    // HP 가장 높은 플레이어 승리
    let bestPid = null, bestHpPct = -1;
    for (const pid of alive) {
      const pct = brState.players[pid].hp / brState.players[pid].maxHp;
      if (pct > bestHpPct) { bestHpPct = pct; bestPid = pid; }
    }
    endMatch(bestPid);
    return;
  }

  // 상태 브로드캐스트 (2초마다)
  if (brState.elapsed % 2 === 0 && _brIo) {
    _brIo.emit('battle_royale_update', getPublicState());
  }
}

// 자동 전투 처리
function autoFight() {
  const alivePids = Object.keys(brState.players).filter(pid => brState.players[pid].alive);

  for (const pid of alivePids) {
    const attacker = brState.players[pid];
    if (attacker.stealthUntil > Date.now()) continue; // 은신 중 공격 안 함

    // 가장 가까운 적 찾기
    let nearest = null, nearestDist = Infinity;
    for (const tid of alivePids) {
      if (tid === pid) continue;
      const target = brState.players[tid];
      if (target.stealthUntil > Date.now()) continue;
      const dx = attacker.x - target.x;
      const dy = attacker.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) { nearestDist = dist; nearest = tid; }
    }

    if (!nearest || nearestDist > 120) {
      // 안전지대 중심으로 이동
      const dx = brState.safeZone.x - attacker.x;
      const dy = brState.safeZone.y - attacker.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 10) {
        const spd = 3 + Math.random() * 2;
        attacker.x += Math.floor(dx / mag * spd);
        attacker.y += Math.floor(dy / mag * spd);
      }
      continue;
    }

    // 가까우면 공격
    if (nearestDist <= 120) {
      const target = brState.players[nearest];
      // 접근
      if (nearestDist > 40) {
        const dx = target.x - attacker.x;
        const dy = target.y - attacker.y;
        const mag = Math.sqrt(dx * dx + dy * dy);
        const spd = 4 + Math.random() * 2;
        attacker.x += Math.floor(dx / mag * spd);
        attacker.y += Math.floor(dy / mag * spd);
      }

      // 공격 (1초마다)
      const atkBuff = attacker.buffs.filter(b => b.type === 'atk_boost').reduce((s, b) => s + b.value, 0);
      const defBuff = target.buffs.filter(b => b.type === 'def_boost').reduce((s, b) => s + b.value, 0);
      const rawDmg = (attacker.atk + atkBuff) - Math.floor((target.def + defBuff) * 0.4);
      const isCrit = Math.random() < 0.15;
      const dmg = Math.max(1, Math.floor(rawDmg * (0.8 + Math.random() * 0.4) * (isCrit ? 2 : 1)));

      target.hp -= dmg;
      attacker.damageDealt += dmg;

      // 클라이언트에 전투 이벤트
      if (_brIo) {
        _brIo.emit('battle_royale_combat', {
          attacker: pid, attackerName: attacker.name,
          target: nearest, targetName: target.name,
          damage: dmg, isCrit,
          targetHp: target.hp, targetMaxHp: target.maxHp,
        });
      }

      if (target.hp <= 0) {
        eliminatePlayer(nearest, pid, 'kill');
      }
    }
  }
}

// 보급 상자 투하
function spawnSupplyDrop() {
  const cfg = BATTLE_ROYALE_CONFIG;
  const drops = cfg.supplyDrops;
  const item = drops[Math.floor(Math.random() * drops.length)];
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * brState.safeZone.radius * 0.8;

  const box = {
    id: 'supply_' + Date.now(),
    x: Math.floor(brState.safeZone.x + Math.cos(angle) * dist),
    y: Math.floor(brState.safeZone.y + Math.sin(angle) * dist),
    item: { ...item },
    claimed: false,
  };

  brState.supplyBoxes.push(box);

  if (_brIo) {
    _brIo.emit('battle_royale_supply', { id: box.id, x: box.x, y: box.y, name: item.name });
    _brIo.emit('server_msg', { msg: '📦 보급 상자 투하!', type: 'rare' });
  }

  // 가장 가까운 생존자가 자동 획득 (30px 이내)
  setTimeout(() => claimNearbySupplies(), 3000);
}

function claimNearbySupplies() {
  for (const box of brState.supplyBoxes) {
    if (box.claimed) continue;
    for (const pid of Object.keys(brState.players)) {
      const p = brState.players[pid];
      if (!p.alive) continue;
      const dx = p.x - box.x;
      const dy = p.y - box.y;
      if (Math.sqrt(dx * dx + dy * dy) < 50) {
        box.claimed = true;
        applySupplyEffect(pid, box.item);
        if (_brIo) {
          _brIo.to(pid).emit('battle_royale_pickup', { item: box.item.name });
          _brIo.emit('server_msg', { msg: p.name + '님이 ' + box.item.name + ' 획득!', type: 'normal' });
        }
        break;
      }
    }
  }
}

function applySupplyEffect(pid, item) {
  const p = brState.players[pid];
  if (!p || !p.alive) return;

  switch (item.effect) {
    case 'heal':
      p.hp = Math.min(p.maxHp, p.hp + item.value);
      break;
    case 'atk_boost':
    case 'def_boost':
    case 'spd_boost':
      p.buffs.push({ type: item.effect, value: item.value, expiresAt: Date.now() + (item.duration || 30) * 1000 });
      break;
    case 'stealth':
      p.stealthUntil = Date.now() + (item.duration || 10) * 1000;
      break;
    case 'aoe_bomb': {
      // 주변 적에게 광역 데미지
      for (const tid of Object.keys(brState.players)) {
        if (tid === pid) continue;
        const t = brState.players[tid];
        if (!t.alive) continue;
        const dx = t.x - p.x;
        const dy = t.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) <= (item.radius || 80)) {
          t.hp -= item.value;
          p.damageDealt += item.value;
          if (t.hp <= 0) eliminatePlayer(tid, pid, 'kill');
        }
      }
      break;
    }
  }
}

// 플레이어 탈락
function eliminatePlayer(victimId, killerId, cause) {
  const victim = brState.players[victimId];
  if (!victim || !victim.alive) return;

  victim.alive = false;
  victim.hp = 0;

  const alive = Object.keys(brState.players).filter(pid => brState.players[pid].alive);
  const placement = alive.length + 1; // 현재 생존자 + 1 = 탈락 순위

  brState.placements.unshift({ id: victimId, name: victim.name, placement, kills: victim.kills, damageDealt: victim.damageDealt });

  if (killerId && brState.players[killerId]) {
    brState.players[killerId].kills++;
    // 킬 보상: 약간의 HP 회복
    brState.players[killerId].hp = Math.min(brState.players[killerId].maxHp, brState.players[killerId].hp + 30);
  }

  if (_brIo) {
    const killerName = killerId && brState.players[killerId] ? brState.players[killerId].name : '안전지대';
    _brIo.emit('battle_royale_eliminate', {
      victim: victimId, victimName: victim.name,
      killer: killerId, killerName,
      cause,
      placement,
      remaining: alive.length,
    });

    if (alive.length <= 5) {
      _brIo.emit('server_msg', {
        msg: '🔥 ' + victim.name + ' 탈락! 생존자 ' + alive.length + '명',
        type: 'danger'
      });
    }
  }
}

// 매치 종료
function endMatch(winnerId) {
  brState.phase = 'finished';
  if (_brInterval) { clearInterval(_brInterval); _brInterval = null; }

  // 우승자를 placements 최상단에 추가
  if (winnerId && brState.players[winnerId]) {
    const w = brState.players[winnerId];
    brState.placements.unshift({ id: winnerId, name: w.name, placement: 1, kills: w.kills, damageDealt: w.damageDealt });
  }

  // 보상 지급
  const results = [];
  for (let i = 0; i < brState.placements.length; i++) {
    const entry = brState.placements[i];
    const rank = i + 1;
    const rewardCfg = BATTLE_ROYALE_CONFIG.rewards[rank];

    let goldReward = 0, diamondReward = 0, expReward = 0, title = null;

    if (rewardCfg) {
      goldReward = Math.floor(brState.prizePool * rewardCfg.poolPct / 100);
      diamondReward = rewardCfg.diamonds || 0;
      expReward = rewardCfg.exp || 0;
      title = rewardCfg.title || null;
    } else {
      // 참가 보상 (나머지 10% 분배)
      const remainPool = Math.floor(brState.prizePool * 0.1);
      const remainCount = Math.max(1, brState.placements.length - 3);
      goldReward = Math.floor(remainPool / remainCount);
      expReward = 1000;
    }

    // 실제 플레이어에게 보상 지급
    const player = _brGetPlayer ? _brGetPlayer(entry.id) : (_brPlayers && _brPlayers[entry.id]);
    if (player) {
      player.gold = (player.gold || 0) + goldReward;
      player.diamonds = (player.diamonds || 0) + diamondReward;
      if (player.exp !== undefined) player.exp += expReward;
      if (title) player.title = title;
    }

    results.push({
      rank,
      id: entry.id,
      name: entry.name,
      kills: entry.kills,
      damageDealt: entry.damageDealt,
      goldReward,
      diamondReward,
      expReward,
      title,
    });
  }

  // 최다 킬 보너스
  let topKiller = null, topKills = 0;
  for (const entry of brState.placements) {
    if (entry.kills > topKills) { topKills = entry.kills; topKiller = entry; }
  }

  if (_brIo) {
    const winner = brState.placements[0];
    _brIo.emit('server_msg', {
      msg: '🏆 배틀로얄 우승: ' + (winner ? winner.name : '없음') + '! (킬: ' + (winner ? winner.kills : 0) + ', 상금: ' + Math.floor(brState.prizePool * 0.5) + 'G)',
      type: 'boss'
    });
    _brIo.emit('battle_royale_end', {
      matchId: brState.matchId,
      results,
      topKiller: topKiller ? { name: topKiller.name, kills: topKiller.kills } : null,
      prizePool: brState.prizePool,
    });
  }

  // 5초 후 상태 리셋
  setTimeout(() => { brState.phase = 'idle'; }, 5000);
}

// 환불
function refundAll() {
  for (const pid of brState.registeredIds) {
    const player = _brGetPlayer ? _brGetPlayer(pid) : (_brPlayers && _brPlayers[pid]);
    if (player) player.gold = (player.gold || 0) + BATTLE_ROYALE_CONFIG.entryFee;
  }
}

// 공개 상태 (클라이언트용)
function getPublicState() {
  const playerList = Object.entries(brState.players).map(([pid, p]) => ({
    id: pid,
    name: p.name,
    className: p.className,
    level: p.level,
    hp: p.hp,
    maxHp: p.maxHp,
    alive: p.alive,
    kills: p.kills,
    x: p.alive ? p.x : undefined,
    y: p.alive ? p.y : undefined,
  }));

  return {
    phase: brState.phase,
    playerCount: brState.registeredIds.length,
    maxPlayers: BATTLE_ROYALE_CONFIG.maxPlayers,
    prizePool: brState.prizePool,
    safeZone: brState.safeZone,
    elapsed: brState.elapsed,
    maxDuration: BATTLE_ROYALE_CONFIG.matchDurationSec,
    players: playerList,
    aliveCount: playerList.filter(p => p.alive).length,
    supplyBoxes: brState.supplyBoxes.filter(b => !b.claimed).map(b => ({ id: b.id, x: b.x, y: b.y, name: b.item.name })),
    placements: brState.placements.slice(0, 10),
  };
}

// 소켓 핸들러 등록
function registerBattleRoyaleHandlers(socket, playerId) {
  socket.on('br_register', () => {
    const result = registerPlayer(playerId);
    socket.emit('br_result', result);
  });

  socket.on('br_status', () => {
    socket.emit('battle_royale_status', getPublicState());
  });

  socket.on('br_start_manual', () => {
    // GM 또는 자동 호출
    const result = startRegistration();
    socket.emit('br_result', result);
  });
}

// 자동 개최 (5분마다)
function startAutoSchedule() {
  setInterval(() => {
    if (brState.phase === 'idle') {
      // 최소 접속자가 있을 때만
      if (_brPlayers && Object.keys(_brPlayers).length >= BATTLE_ROYALE_CONFIG.minPlayers) {
        startRegistration();
      }
    }
  }, 5 * 60 * 1000);
}

module.exports = {
  BATTLE_ROYALE_CONFIG,
  initBattleRoyale,
  startRegistration,
  registerPlayer,
  registerBattleRoyaleHandlers,
  startAutoSchedule,
  getPublicState,
  brState,
};

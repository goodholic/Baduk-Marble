// 월드 레이드 & 시즌 이벤트 시스템 — v2.58
// 서버 전체 협력 보스, 시즌 이벤트, 한정 보상

// ═══ 월드 레이드 보스 정의 ═══
const WORLD_RAID_BOSSES = {
  ancient_dragon: {
    name: '태고의 용왕 바하무트', icon: '🐲', element: 'fire',
    hp: 500000, atk: 200, def: 80,
    minPlayers: 5, timeLimit: 600, // 10분
    desc: '하늘을 뒤덮는 거대한 용. 서버 전원의 힘을 모아야 쓰러뜨릴 수 있다!',
    phases: [
      { hpPct: 1.0, name: '1페이즈: 화염의 군주', atkMult: 1.0, defMult: 1.0,
        pattern: { type: 'breath', interval: 8, damage: 150, msg: '🔥 바하무트의 화염 브레스!' } },
      { hpPct: 0.7, name: '2페이즈: 분노의 날개', atkMult: 1.3, defMult: 0.9,
        pattern: { type: 'wing_storm', interval: 10, damage: 200, aoe: true, msg: '🌪️ 날개 폭풍! 전원 피해!' } },
      { hpPct: 0.4, name: '3페이즈: 용의 심판', atkMult: 1.6, defMult: 0.8,
        pattern: { type: 'meteor', interval: 6, damage: 300, msg: '☄️ 메테오! 즉시 회피!' },
        summon: { name: '드래곤 새끼', hp: 5000, atk: 80, count: 3 } },
      { hpPct: 0.15, name: '최종 페이즈: 멸망의 화염', atkMult: 2.5, defMult: 0.5,
        pattern: { type: 'apocalypse', interval: 5, damage: 500, msg: '💀 멸망의 화염! 전원 위험!' } },
    ],
    rewards: {
      mvp: { gold: 100000, diamonds: 500, item: { id: 'equip_bahamut_fang', name: '바하무트의 송곳니', grade: 'legendary' }, title: 'dragon_slayer' },
      top10: { gold: 50000, diamonds: 200, item: { id: 'mat_dragon_heart', name: '용의 심장' } },
      participant: { gold: 10000, diamonds: 50, exp: 30000 },
    },
  },
  void_emperor: {
    name: '공허의 황제 오메가', icon: '👿', element: 'dark',
    hp: 800000, atk: 250, def: 100,
    minPlayers: 10, timeLimit: 900,
    desc: '차원의 틈에서 나타난 절대자. 공허의 힘으로 모든 것을 소멸시킨다.',
    phases: [
      { hpPct: 1.0, name: '1페이즈: 공허의 칼날', atkMult: 1.0, defMult: 1.0,
        pattern: { type: 'void_slash', interval: 7, damage: 200, msg: '🌀 공허의 칼날!' } },
      { hpPct: 0.6, name: '2페이즈: 차원 왜곡', atkMult: 1.4, defMult: 1.2,
        pattern: { type: 'dimension_rift', interval: 12, damage: 250, debuff: 'curse', msg: '☠ 차원 왜곡! 저주 부여!' } },
      { hpPct: 0.3, name: '3페이즈: 소멸의 광선', atkMult: 2.0, defMult: 0.6,
        pattern: { type: 'annihilation', interval: 5, damage: 400, msg: '⚡ 소멸의 광선!' },
        summon: { name: '공허의 파편', hp: 8000, atk: 100, count: 5 } },
      { hpPct: 0.1, name: '최종 페이즈: 절대 소멸', atkMult: 3.0, defMult: 0.3,
        pattern: { type: 'extinction', interval: 3, damage: 800, msg: '💥 절대 소멸! 세계가 무너진다!' } },
    ],
    rewards: {
      mvp: { gold: 200000, diamonds: 1000, item: { id: 'equip_void_crown', name: '공허의 왕관', grade: 'legendary' }, title: 'void_conqueror' },
      top10: { gold: 80000, diamonds: 400, item: { id: 'mat_void_essence', name: '공허의 정수' } },
      participant: { gold: 20000, diamonds: 100, exp: 50000 },
    },
  },
  world_tree_guardian: {
    name: '세계수의 수호자 이그드라실', icon: '🌳', element: 'holy',
    hp: 300000, atk: 150, def: 120,
    minPlayers: 3, timeLimit: 480,
    desc: '세계수를 지키는 고대 정령. 치유와 방어에 특화되어 오래 걸리는 전투.',
    phases: [
      { hpPct: 1.0, name: '1페이즈: 자연의 분노', atkMult: 1.0, defMult: 1.5,
        pattern: { type: 'root_bind', interval: 10, damage: 100, stun: 2, msg: '🌿 뿌리 속박! 2초 기절!' } },
      { hpPct: 0.5, name: '2페이즈: 생명의 숲', atkMult: 1.2, defMult: 2.0,
        pattern: { type: 'heal_pulse', interval: 15, heal: 30000, msg: '💚 생명의 맥동! 보스 HP 회복!' } },
      { hpPct: 0.2, name: '최종 페이즈: 정령의 심판', atkMult: 2.0, defMult: 1.0,
        pattern: { type: 'spirit_judgment', interval: 8, damage: 250, msg: '✨ 정령의 심판!' } },
    ],
    rewards: {
      mvp: { gold: 60000, diamonds: 300, item: { id: 'equip_yggdrasil_staff', name: '이그드라실의 지팡이', grade: 'legendary' }, title: 'nature_champion' },
      top10: { gold: 30000, diamonds: 150, item: { id: 'mat_world_leaf', name: '세계수의 잎' } },
      participant: { gold: 8000, diamonds: 30, exp: 20000 },
    },
  },
};

// ═══ 시즌 이벤트 정의 ═══
const SEASONAL_EVENTS = {
  blood_moon: {
    name: '핏빛 달의 밤', icon: '🌑', duration: 3600,
    desc: '핏빛 달이 뜨면 모든 몬스터가 강화되지만 보상도 2배!',
    effects: { monsterHpMult: 1.5, monsterAtkMult: 1.3, goldMult: 2.0, expMult: 2.0, dropMult: 1.5 },
    announce: '🌑 핏빛 달이 떠오릅니다! 몬스터 강화 + 보상 2배!',
  },
  treasure_rain: {
    name: '황금비', icon: '🌧️', duration: 1800,
    desc: '하늘에서 보물이 쏟아진다! 골드 획득량 3배!',
    effects: { goldMult: 3.0, expMult: 1.5 },
    announce: '🌧️ 황금비가 내립니다! 골드 3배!',
  },
  spirit_festival: {
    name: '정령 축제', icon: '🧚', duration: 2400,
    desc: '정령들이 축복을 내린다. EXP 2.5배 + 드롭률 UP!',
    effects: { expMult: 2.5, dropMult: 2.0 },
    announce: '🧚 정령 축제 시작! EXP 2.5배 + 드롭률 2배!',
  },
  chaos_rift: {
    name: '혼돈의 균열', icon: '🌀', duration: 2700,
    desc: '차원의 균열이 열려 강력한 몬스터가 출현! 희귀 아이템 드롭률 UP!',
    effects: { monsterHpMult: 2.0, monsterAtkMult: 1.5, dropMult: 3.0, rareDrop: true },
    announce: '🌀 혼돈의 균열! 강화 몬스터 + 희귀 드롭 3배!',
  },
  pvp_carnival: {
    name: 'PvP 카니발', icon: '⚔️', duration: 3600,
    desc: 'PvP 보상 3배! 킬 시 추가 골드/EXP! 아레나 입장 무료!',
    effects: { pvpGoldMult: 3.0, pvpExpMult: 3.0, arenaFree: true },
    announce: '⚔️ PvP 카니발! PvP 보상 3배 + 아레나 무료!',
  },
};

// ═══ 레이드 인스턴스 ═══
let activeRaid = null;
let _raidIo = null;
let _raidPlayers = null;
let _raidInterval = null;

function initWorldRaid(io, players) {
  _raidIo = io;
  _raidPlayers = players;
}

// 레이드 시작
function startWorldRaid(bossId) {
  if (activeRaid) return { success: false, msg: '이미 레이드가 진행 중입니다.' };
  const boss = WORLD_RAID_BOSSES[bossId];
  if (!boss) return { success: false, msg: '존재하지 않는 보스입니다.' };

  activeRaid = {
    bossId,
    bossName: boss.name,
    hp: boss.hp,
    maxHp: boss.hp,
    atk: boss.atk,
    def: boss.def,
    currentPhase: 0,
    startTime: Date.now(),
    timeLimit: boss.timeLimit,
    participants: {},  // { playerId: { damage, hits, name, className } }
    lastPattern: 0,
    alive: true,
  };

  if (_raidIo) {
    _raidIo.emit('server_msg', { msg: boss.icon + ' [월드 레이드] ' + boss.name + ' 출현! 전원 공격하라! (' + (boss.timeLimit/60) + '분)', type: 'boss' });
    _raidIo.emit('world_raid_start', {
      bossId, name: boss.name, icon: boss.icon,
      hp: boss.hp, maxHp: boss.hp,
      timeLimit: boss.timeLimit,
      desc: boss.desc,
      phases: boss.phases.map(p => ({ name: p.name, hpPct: p.hpPct })),
    });
  }

  // 보스 패턴 타이머
  _raidInterval = setInterval(() => tickWorldRaid(), 1000);

  return { success: true };
}

// 레이드 틱 (1초마다)
function tickWorldRaid() {
  if (!activeRaid || !activeRaid.alive) { clearInterval(_raidInterval); return; }

  const boss = WORLD_RAID_BOSSES[activeRaid.bossId];
  const elapsed = Math.floor((Date.now() - activeRaid.startTime) / 1000);

  // 시간 초과
  if (elapsed >= activeRaid.timeLimit) {
    endWorldRaid(false);
    return;
  }

  // 페이즈 체크
  const hpPct = activeRaid.hp / activeRaid.maxHp;
  for (let i = boss.phases.length - 1; i >= 0; i--) {
    if (hpPct <= boss.phases[i].hpPct && activeRaid.currentPhase < i) {
      activeRaid.currentPhase = i;
      const phase = boss.phases[i];
      activeRaid.atk = Math.floor(boss.atk * phase.atkMult);
      activeRaid.def = Math.floor(boss.def * phase.defMult);
      if (_raidIo) {
        _raidIo.emit('world_raid_phase', { phase: phase.name, hpPct: Math.floor(hpPct * 100) });
        _raidIo.emit('server_msg', { msg: '⚠️ [레이드] ' + phase.name + ' — ' + (phase.pattern?.msg || ''), type: 'danger' });
      }
      // 소환수
      if (phase.summon) {
        if (_raidIo) _raidIo.emit('server_msg', { msg: '👹 ' + phase.summon.name + ' ' + phase.summon.count + '체 소환!', type: 'danger' });
      }
      break;
    }
  }

  // 보스 패턴 공격 (참가자에게 데미지)
  const phase = boss.phases[activeRaid.currentPhase] || boss.phases[0];
  if (phase.pattern && Date.now() - activeRaid.lastPattern > (phase.pattern.interval || 10) * 1000) {
    activeRaid.lastPattern = Date.now();
    if (_raidIo) {
      _raidIo.emit('world_raid_attack', {
        msg: phase.pattern.msg,
        damage: phase.pattern.damage,
        type: phase.pattern.type,
      });
    }
    // 참가자에게 실제 데미지
    for (const pid of Object.keys(activeRaid.participants)) {
      const p = _raidPlayers && _raidPlayers[pid];
      if (p && p.isAlive) {
        const dmg = Math.floor(phase.pattern.damage * (0.3 + Math.random() * 0.4));
        p.hp = Math.max(1, p.hp - dmg);
      }
    }
  }

  // 5초마다 상태 브로드캐스트
  if (elapsed % 5 === 0 && _raidIo) {
    _raidIo.emit('world_raid_update', getRaidStatus());
  }
}

// 레이드 타격
function hitWorldRaid(playerId, player) {
  if (!activeRaid || !activeRaid.alive) return null;

  const playerAtk = player.atk || 25;
  const isCrit = Math.random() < ((player.critRate || 10) / 100);
  const rawDmg = Math.max(1, playerAtk - Math.floor(activeRaid.def * 0.2));
  const dmg = Math.floor(rawDmg * (0.8 + Math.random() * 0.4) * (isCrit ? 2 : 1));

  activeRaid.hp = Math.max(0, activeRaid.hp - dmg);

  // 참가 기록
  if (!activeRaid.participants[playerId]) {
    activeRaid.participants[playerId] = { damage: 0, hits: 0, name: player.displayName || player.className, className: player.className };
  }
  activeRaid.participants[playerId].damage += dmg;
  activeRaid.participants[playerId].hits++;

  // 보스 처치
  if (activeRaid.hp <= 0) {
    activeRaid.alive = false;
    endWorldRaid(true);
  }

  return { damage: dmg, isCrit, bossHp: activeRaid.hp, bossMaxHp: activeRaid.maxHp };
}

// 레이드 종료
function endWorldRaid(victory) {
  if (_raidInterval) { clearInterval(_raidInterval); _raidInterval = null; }
  if (!activeRaid) return;

  const boss = WORLD_RAID_BOSSES[activeRaid.bossId];
  const participants = Object.entries(activeRaid.participants)
    .map(([pid, data]) => ({ id: pid, ...data }))
    .sort((a, b) => b.damage - a.damage);

  const results = [];

  if (victory) {
    // 보상 분배
    participants.forEach((p, i) => {
      const player = _raidPlayers && _raidPlayers[p.id];
      if (!player) return;

      let reward;
      if (i === 0) reward = boss.rewards.mvp;
      else if (i < 10) reward = boss.rewards.top10;
      else reward = boss.rewards.participant;

      player.gold = (player.gold || 0) + reward.gold;
      player.diamonds = (player.diamonds || 0) + reward.diamonds;
      if (player.exp !== undefined) player.exp += (reward.exp || 0);
      if (reward.item) {
        if (!player.inventory) player.inventory = {};
        player.inventory[reward.item.id] = (player.inventory[reward.item.id] || 0) + 1;
      }
      if (reward.title) player.title = reward.title;

      results.push({
        rank: i + 1, name: p.name, className: p.className,
        damage: p.damage, hits: p.hits,
        reward: { gold: reward.gold, diamonds: reward.diamonds, item: reward.item?.name, title: reward.title },
      });
    });
  }

  if (_raidIo) {
    if (victory) {
      const mvp = participants[0];
      _raidIo.emit('server_msg', {
        msg: '🏆 [월드 레이드] ' + boss.name + ' 처치 완료! MVP: ' + (mvp?.name || '없음') + ' (' + (mvp?.damage || 0).toLocaleString() + ' 데미지)',
        type: 'boss'
      });
    } else {
      _raidIo.emit('server_msg', { msg: '💀 [월드 레이드] ' + boss.name + ' — 시간 초과! 레이드 실패...', type: 'danger' });
    }
    _raidIo.emit('world_raid_end', {
      victory, bossName: boss.name, icon: boss.icon,
      results: results.slice(0, 20),
      totalParticipants: participants.length,
      totalDamage: participants.reduce((s, p) => s + p.damage, 0),
    });
  }

  activeRaid = null;
}

function getRaidStatus() {
  if (!activeRaid) return { active: false };
  const boss = WORLD_RAID_BOSSES[activeRaid.bossId];
  const elapsed = Math.floor((Date.now() - activeRaid.startTime) / 1000);
  const phase = boss.phases[activeRaid.currentPhase] || boss.phases[0];
  const participants = Object.entries(activeRaid.participants)
    .map(([pid, d]) => ({ name: d.name, damage: d.damage }))
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 10);

  return {
    active: true,
    bossId: activeRaid.bossId,
    bossName: boss.name,
    icon: boss.icon,
    hp: activeRaid.hp,
    maxHp: activeRaid.maxHp,
    hpPct: Math.floor(activeRaid.hp / activeRaid.maxHp * 100),
    phase: phase.name,
    elapsed,
    timeLimit: activeRaid.timeLimit,
    remaining: Math.max(0, activeRaid.timeLimit - elapsed),
    participantCount: Object.keys(activeRaid.participants).length,
    topDamage: participants,
  };
}

// ═══ 시즌 이벤트 관리 ═══
let activeEvent = null;
let _eventTimeout = null;

function startSeasonalEvent(eventId) {
  if (activeEvent) return { success: false, msg: '이미 이벤트 진행 중: ' + activeEvent.name };
  const ev = SEASONAL_EVENTS[eventId];
  if (!ev) return { success: false, msg: '존재하지 않는 이벤트' };

  activeEvent = { id: eventId, ...ev, startTime: Date.now(), endsAt: Date.now() + ev.duration * 1000 };

  if (_raidIo) {
    _raidIo.emit('server_msg', { msg: ev.announce, type: 'boss' });
    _raidIo.emit('world_event_start', { id: eventId, name: ev.name, icon: ev.icon, desc: ev.desc, duration: ev.duration, effects: ev.effects });
  }

  _eventTimeout = setTimeout(() => {
    if (_raidIo) {
      _raidIo.emit('server_msg', { msg: ev.icon + ' ' + ev.name + ' 이벤트가 종료되었습니다.', type: 'normal' });
      _raidIo.emit('world_event_end', { id: eventId });
    }
    activeEvent = null;
  }, ev.duration * 1000);

  return { success: true };
}

function getActiveEvent() { return activeEvent; }
function getEventMultipliers() {
  if (!activeEvent) return { goldMult: 1, expMult: 1, dropMult: 1 };
  return activeEvent.effects || {};
}

// 소켓 핸들러
function registerWorldRaidHandlers(socket, playerId, players, io) {
  socket.on('raid_status', () => {
    socket.emit('world_raid_status', getRaidStatus());
  });

  socket.on('raid_hit', () => {
    const p = players[playerId];
    if (!p || !p.isAlive) return;
    const result = hitWorldRaid(playerId, p);
    if (result) socket.emit('raid_hit_result', result);
  });

  socket.on('raid_start_manual', (bossId) => {
    const result = startWorldRaid(bossId || 'ancient_dragon');
    if (!result.success) socket.emit('npc_result', { msg: result.msg });
  });

  socket.on('event_start_manual', (eventId) => {
    const result = startSeasonalEvent(eventId || 'blood_moon');
    if (!result.success) socket.emit('npc_result', { msg: result.msg });
  });

  socket.on('world_events_status', () => {
    socket.emit('world_events_info', {
      raid: getRaidStatus(),
      event: activeEvent ? { id: activeEvent.id, name: activeEvent.name, icon: activeEvent.icon, remaining: Math.max(0, Math.floor((activeEvent.endsAt - Date.now()) / 1000)), effects: activeEvent.effects } : null,
      availableRaids: Object.entries(WORLD_RAID_BOSSES).map(([id, b]) => ({ id, name: b.name, icon: b.icon, hp: b.hp, minPlayers: b.minPlayers, desc: b.desc })),
      availableEvents: Object.entries(SEASONAL_EVENTS).map(([id, e]) => ({ id, name: e.name, icon: e.icon, desc: e.desc })),
    });
  });
}

// 자동 이벤트 스케줄 (30분마다 랜덤 이벤트)
function startAutoEvents() {
  setInterval(() => {
    if (!activeEvent && _raidPlayers && Object.keys(_raidPlayers).length >= 1) {
      const eventIds = Object.keys(SEASONAL_EVENTS);
      const randomEvent = eventIds[Math.floor(Math.random() * eventIds.length)];
      startSeasonalEvent(randomEvent);
    }
  }, 30 * 60 * 1000);

  // 2시간마다 랜덤 월드 레이드
  setInterval(() => {
    if (!activeRaid && _raidPlayers && Object.keys(_raidPlayers).length >= 3) {
      const bossIds = Object.keys(WORLD_RAID_BOSSES);
      const randomBoss = bossIds[Math.floor(Math.random() * bossIds.length)];
      startWorldRaid(randomBoss);
    }
  }, 2 * 60 * 60 * 1000);
}

module.exports = {
  WORLD_RAID_BOSSES,
  SEASONAL_EVENTS,
  initWorldRaid,
  startWorldRaid,
  hitWorldRaid,
  getRaidStatus,
  startSeasonalEvent,
  getActiveEvent,
  getEventMultipliers,
  registerWorldRaidHandlers,
  startAutoEvents,
};

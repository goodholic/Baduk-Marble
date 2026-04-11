// 드래곤 레이스 & 공중전 이벤트 — v2.58
// 드래곤 탑승 레이스 + 공중 PvP + 드래곤 관리 소켓 핸들러

const dragonRiding = require('./dragon_riding');

// ═══ 드래곤 레이스 ═══
const RACE_CONFIG = {
  minPlayers: 3,
  maxPlayers: 10,
  registrationTime: 45,  // 45초 등록
  raceDistance: 1000,     // 1000m 코스
  entryFee: 1000,
  checkpoints: [250, 500, 750, 1000],
  obstacles: [
    { pos: 150, type: 'gust', name: '돌풍', effect: 'slow', value: -3, duration: 3, msg: '💨 돌풍! 속도 감소!' },
    { pos: 350, type: 'lightning', name: '번개', effect: 'stun', duration: 1, msg: '⚡ 벼락! 잠시 정지!' },
    { pos: 550, type: 'fireball', name: '화염 기둥', effect: 'damage', value: 50, msg: '🔥 화염 기둥! 데미지!' },
    { pos: 700, type: 'narrow', name: '좁은 협곡', effect: 'dodge_check', chance: 0.4, msg: '⛰️ 좁은 협곡! 충돌 위험!' },
    { pos: 900, type: 'boost', name: '마력 기류', effect: 'boost', value: 5, duration: 3, msg: '✨ 마력 기류! 가속!' },
  ],
  rewards: {
    1: { gold: 20000, diamonds: 100, title: 'sky_racer' },
    2: { gold: 10000, diamonds: 50 },
    3: { gold: 5000, diamonds: 25 },
  },
};

let raceState = { phase: 'idle', players: {}, registeredIds: [], prizePool: 0, startTime: 0 };
let _raceInterval = null;
let _raceIo = null;
let _racePlayers = null;

function initDragonRace(io, players) {
  _raceIo = io;
  _racePlayers = players;
}

function startRaceRegistration() {
  if (raceState.phase !== 'idle') return { success: false, msg: '이미 레이스 진행 중' };

  raceState = { phase: 'registration', players: {}, registeredIds: [], prizePool: 0, startTime: 0 };

  if (_raceIo) {
    _raceIo.emit('server_msg', { msg: '🐲 드래곤 레이스 참가 등록 시작! (' + RACE_CONFIG.registrationTime + '초, 참가비 ' + RACE_CONFIG.entryFee + 'G)', type: 'boss' });
    _raceIo.emit('dragon_race_status', getRaceStatus());
  }

  setTimeout(() => {
    if (raceState.phase === 'registration') {
      if (raceState.registeredIds.length >= RACE_CONFIG.minPlayers) startRace();
      else {
        refundRace();
        raceState.phase = 'idle';
        if (_raceIo) _raceIo.emit('server_msg', { msg: '드래곤 레이스 인원 부족으로 취소', type: 'normal' });
      }
    }
  }, RACE_CONFIG.registrationTime * 1000);

  return { success: true, msg: '드래곤 레이스 등록 시작!' };
}

function registerForRace(playerId, player) {
  if (raceState.phase !== 'registration') return { success: false, msg: '등록 기간이 아닙니다' };
  if (raceState.registeredIds.includes(playerId)) return { success: false, msg: '이미 등록했습니다' };
  if (raceState.registeredIds.length >= RACE_CONFIG.maxPlayers) return { success: false, msg: '정원 초과' };
  if ((player.gold || 0) < RACE_CONFIG.entryFee) return { success: false, msg: '골드 부족 (필요: ' + RACE_CONFIG.entryFee + 'G)' };

  // 드래곤 체크
  const dragons = dragonRiding.getPlayerDragons(player);
  const mountable = dragons.find(d => d.stage >= 2); // 유룡 이상
  if (!mountable) return { success: false, msg: '탑승 가능한 드래곤이 없습니다 (유룡 이상 필요)' };

  player.gold -= RACE_CONFIG.entryFee;
  raceState.prizePool += RACE_CONFIG.entryFee;
  raceState.registeredIds.push(playerId);

  // 가장 강한 드래곤 자동 선택
  const bestDragon = dragons.sort((a, b) => b.level - a.level)[0];

  raceState.players[playerId] = {
    name: player.displayName || player.className,
    dragon: bestDragon,
    position: 0,
    speed: bestDragon.stats.spd || 12,
    baseSpeed: bestDragon.stats.spd || 12,
    checkpoint: 0,
    finished: false,
    finishTime: 0,
    stunUntil: 0,
  };

  return { success: true, msg: '레이스 등록! 드래곤: ' + bestDragon.name + ' (' + raceState.registeredIds.length + '/' + RACE_CONFIG.maxPlayers + ')' };
}

function startRace() {
  raceState.phase = 'active';
  raceState.startTime = Date.now();

  if (_raceIo) {
    _raceIo.emit('server_msg', { msg: '🏁 드래곤 레이스 출발! ' + raceState.registeredIds.length + '명 참가!', type: 'boss' });
    _raceIo.emit('dragon_race_start', { playerCount: raceState.registeredIds.length, distance: RACE_CONFIG.raceDistance });
  }

  _raceInterval = setInterval(() => tickRace(), 1000);
}

function tickRace() {
  if (raceState.phase !== 'active') { clearInterval(_raceInterval); return; }

  const now = Date.now();
  const finishOrder = [];

  for (const [pid, racer] of Object.entries(raceState.players)) {
    if (racer.finished) continue;
    if (now < racer.stunUntil) continue; // 스턴 중

    // 이동 (스피드 + 약간의 랜덤)
    const moveSpeed = Math.max(1, racer.speed + (Math.random() * 4 - 2));
    racer.position = Math.min(RACE_CONFIG.raceDistance, racer.position + moveSpeed);

    // 장애물 체크
    for (const obs of RACE_CONFIG.obstacles) {
      if (Math.abs(racer.position - obs.pos) < 5 && !racer['_obs_' + obs.pos]) {
        racer['_obs_' + obs.pos] = true;
        switch (obs.effect) {
          case 'slow': racer.speed = Math.max(3, racer.speed + obs.value); setTimeout(() => { racer.speed = racer.baseSpeed; }, (obs.duration || 3) * 1000); break;
          case 'stun': racer.stunUntil = now + (obs.duration || 1) * 1000; break;
          case 'damage': break; // 시각 효과만
          case 'dodge_check': if (Math.random() < obs.chance) { racer.stunUntil = now + 2000; } break;
          case 'boost': racer.speed += obs.value; setTimeout(() => { racer.speed = racer.baseSpeed; }, (obs.duration || 3) * 1000); break;
        }
        if (_raceIo) _raceIo.emit('dragon_race_obstacle', { player: pid, name: racer.name, obstacle: obs.name, msg: obs.msg });
      }
    }

    // 체크포인트
    const nextCp = RACE_CONFIG.checkpoints[racer.checkpoint];
    if (nextCp && racer.position >= nextCp) {
      racer.checkpoint++;
      if (_raceIo) _raceIo.emit('dragon_race_checkpoint', { name: racer.name, checkpoint: racer.checkpoint, total: RACE_CONFIG.checkpoints.length });
    }

    // 골인
    if (racer.position >= RACE_CONFIG.raceDistance) {
      racer.finished = true;
      racer.finishTime = Date.now() - raceState.startTime;
      finishOrder.push(pid);
    }
  }

  // 브로드캐스트
  if (_raceIo) _raceIo.emit('dragon_race_update', getRaceStatus());

  // 전원 완주 체크
  const allFinished = Object.values(raceState.players).every(r => r.finished);
  const elapsed = (Date.now() - raceState.startTime) / 1000;
  if (allFinished || elapsed > 120) {
    endRace();
  }
}

function endRace() {
  clearInterval(_raceInterval);
  raceState.phase = 'finished';

  const rankings = Object.entries(raceState.players)
    .sort((a, b) => {
      if (a[1].finished && !b[1].finished) return -1;
      if (!a[1].finished && b[1].finished) return 1;
      return a[1].finishTime - b[1].finishTime;
    })
    .map(([pid, r], i) => ({
      rank: i + 1, id: pid, name: r.name,
      dragon: r.dragon.name, time: r.finishTime,
      finished: r.finished,
    }));

  // 보상 지급
  rankings.forEach(r => {
    const player = _racePlayers && _racePlayers[r.id];
    if (!player) return;
    const reward = RACE_CONFIG.rewards[r.rank];
    if (reward) {
      player.gold = (player.gold || 0) + reward.gold;
      player.diamonds = (player.diamonds || 0) + (reward.diamonds || 0);
      if (reward.title) player.title = reward.title;
    } else {
      // 참가 보상
      player.gold = (player.gold || 0) + Math.floor(raceState.prizePool * 0.05);
    }
  });

  if (_raceIo) {
    const winner = rankings[0];
    _raceIo.emit('server_msg', { msg: '🏆 드래곤 레이스 우승: ' + (winner ? winner.name + ' (' + winner.dragon + ')' : '없음') + '!', type: 'boss' });
    _raceIo.emit('dragon_race_end', { rankings, prizePool: raceState.prizePool });
  }

  setTimeout(() => { raceState.phase = 'idle'; }, 5000);
}

function refundRace() {
  for (const pid of raceState.registeredIds) {
    const p = _racePlayers && _racePlayers[pid];
    if (p) p.gold = (p.gold || 0) + RACE_CONFIG.entryFee;
  }
}

function getRaceStatus() {
  return {
    phase: raceState.phase,
    playerCount: raceState.registeredIds.length,
    maxPlayers: RACE_CONFIG.maxPlayers,
    prizePool: raceState.prizePool,
    distance: RACE_CONFIG.raceDistance,
    players: Object.entries(raceState.players).map(([pid, r]) => ({
      name: r.name, dragon: r.dragon?.name, position: Math.floor(r.position),
      checkpoint: r.checkpoint, finished: r.finished, speed: Math.floor(r.speed),
    })),
  };
}

// ═══ 드래곤 관리 소켓 핸들러 ═══
function registerDragonHandlers(socket, playerId, players, io) {
  // 드래곤 목록
  socket.on('dragon_list', () => {
    const p = players[playerId];
    if (!p) return;
    const dragons = dragonRiding.getPlayerDragons(p);
    const allTypes = Object.entries(dragonRiding.DRAGON_TYPES).map(([id, d]) => ({
      id, name: d.name, icon: d.icon, element: d.element, rarity: d.rarity,
      breathDesc: d.breathDesc, passiveDesc: d.passiveDesc, lore: d.lore,
    }));
    socket.emit('dragon_list', {
      owned: dragons,
      allTypes,
      mounted: p._mountedDragon || null,
      activeBonuses: dragonRiding.getActiveBonuses(p),
    });
  });

  // 부화
  socket.on('dragon_hatch', (dragonType) => {
    const p = players[playerId];
    if (!p) return;
    const result = dragonRiding.hatchEgg(p, dragonType);
    socket.emit('dragon_result', { action: 'hatch', ...result });
    if (result.success) {
      io.emit('server_msg', { msg: '🥚 ' + (p.displayName||p.className) + '님이 드래곤을 부화시켰습니다!', type: 'rare' });
    }
  });

  // 먹이
  socket.on('dragon_feed', (data) => {
    const p = players[playerId];
    if (!p) return;
    const result = dragonRiding.feedDragon(p, data.dragonType, data.foodId);
    socket.emit('dragon_result', { action: 'feed', ...result });
  });

  // 탑승/하차
  socket.on('dragon_mount', (dragonType) => {
    const p = players[playerId];
    if (!p) return;
    const result = dragonRiding.mountDragon(p, dragonType);
    socket.emit('dragon_result', { action: 'mount', ...result });
    if (result.success) {
      io.emit('server_msg', { msg: '🐲 ' + (p.displayName||p.className) + '님이 드래곤에 탑승!', type: 'normal' });
    }
  });

  socket.on('dragon_dismount', () => {
    const p = players[playerId];
    if (!p) return;
    dragonRiding.dismountDragon(p);
    socket.emit('dragon_result', { action: 'dismount', success: true, msg: '드래곤에서 하차했습니다.' });
  });

  // 브레스
  socket.on('dragon_breath', () => {
    const p = players[playerId];
    if (!p) return;
    const result = dragonRiding.useBreath(p);
    socket.emit('dragon_result', { action: 'breath', ...result });
    if (result.success) {
      io.emit('server_msg', { msg: '🔥 ' + (p.displayName||p.className) + '의 드래곤이 브레스를 발사!', type: 'danger' });
    }
  });

  // 비행 스킬
  socket.on('dragon_flight_skill', (skillId) => {
    const p = players[playerId];
    if (!p) return;
    const result = dragonRiding.useFlightSkill(p, skillId);
    socket.emit('dragon_result', { action: 'skill', ...result });
  });

  // 드래곤 레이스
  socket.on('dragon_race_register', () => {
    const p = players[playerId];
    if (!p) return;
    const result = registerForRace(playerId, p);
    socket.emit('dragon_result', { action: 'race_register', ...result });
  });

  socket.on('dragon_race_start_manual', () => {
    const result = startRaceRegistration();
    if (!result.success) socket.emit('dragon_result', { action: 'race', ...result });
  });

  socket.on('dragon_race_status', () => {
    socket.emit('dragon_race_status', getRaceStatus());
  });
}

// 자동 레이스 스케줄 (1시간마다)
function startAutoRace() {
  setInterval(() => {
    if (raceState.phase === 'idle' && _racePlayers && Object.keys(_racePlayers).length >= RACE_CONFIG.minPlayers) {
      startRaceRegistration();
    }
  }, 60 * 60 * 1000);
}

module.exports = {
  RACE_CONFIG,
  initDragonRace,
  startRaceRegistration,
  registerForRace,
  registerDragonHandlers,
  startAutoRace,
  getRaceStatus,
};

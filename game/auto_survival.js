// 오토배틀 서바이벌 IO — v2.60
// 이동만 조작, 공격은 자동. 무기 중첩, 웨이브 생존, 멀티플레이어
// Vampire Survivors + .io 하이브리드

const CONFIG = {
  matchDuration: 600,     // 10분
  waveInterval: 15,       // 15초마다 웨이브
  maxWave: 40,
  autoAttackInterval: 800,// 0.8초마다 자동 공격
  expPerKill: 12,
  expScaling: 1.13,
  pickupRadius: 40,
  gemMagnetBase: 30,
};

// ═══ 무기 시스템 (중첩 가능!) ═══
const WEAPONS = {
  sword:    { name: '회전 검',    icon: '🗡️', type: 'orbit',   baseDmg: 8,  range: 40, cd: 1200, desc: '주변을 도는 검' },
  fireball: { name: '파이어볼',   icon: '🔥', type: 'projectile',baseDmg: 12, range: 120, cd: 1500, desc: '전방 화염구' },
  lightning:{ name: '낙뢰',       icon: '⚡', type: 'random',   baseDmg: 15, range: 100, cd: 2000, desc: '랜덤 위치 번개' },
  icering:  { name: '얼음 고리',  icon: '❄️', type: 'aoe',      baseDmg: 6,  range: 60,  cd: 1800, desc: '주변 원형 빙결' },
  arrow:    { name: '연속 화살',  icon: '🏹', type: 'multi',    baseDmg: 5,  range: 100, cd: 600,  desc: '빠른 연사' },
  holy:     { name: '신성 폭발',  icon: '✨', type: 'nova',     baseDmg: 20, range: 80,  cd: 3000, desc: '전방위 폭발' },
  poison:   { name: '독 안개',    icon: '☠️', type: 'dot',      baseDmg: 3,  range: 50,  cd: 2500, desc: '지속 데미지 장판' },
  shield:   { name: '가시 방패',  icon: '🛡️', type: 'reflect',  baseDmg: 4,  range: 30,  cd: 0,    desc: '피격 시 반사' },
};

// 패시브 아이템 (스탯 강화)
const PASSIVES = {
  might:    { name: '완력',       icon: '💪', effect: { dmgMult: 10 }, desc: '데미지 +10%' },
  armor:    { name: '갑옷',       icon: '🦺', effect: { def: 3 }, desc: 'DEF +3' },
  speed:    { name: '장화',       icon: '👢', effect: { spd: 1 }, desc: '이동속도 +1' },
  maxhp:    { name: '생명력',     icon: '❤️', effect: { maxHp: 25 }, desc: 'HP +25' },
  regen:    { name: '재생',       icon: '💚', effect: { hpRegen: 1 }, desc: 'HP재생 +1/초' },
  luck:     { name: '행운',       icon: '🍀', effect: { luck: 5 }, desc: '드롭률 +5%' },
  magnet:   { name: '자석',       icon: '🧲', effect: { magnet: 15 }, desc: '경험치 흡수 범위↑' },
  cooldown: { name: '쿨다운',     icon: '⏱️', effect: { cdReduction: 8 }, desc: '쿨다운 -8%' },
};

// 웨이브별 몬스터
function getWaveMonsters(wave, playerCount) {
  const count = Math.floor((5 + wave * 2) * Math.max(1, playerCount * 0.7));
  const hp = Math.floor(20 + wave * 8);
  const atk = Math.floor(3 + wave * 2);
  const exp = 8 + wave;
  const isBoss = wave % 5 === 0;

  return {
    wave, count, isBoss,
    monster: isBoss ? {
      name: getBossName(wave), hp: hp * 10, atk: atk * 3, exp: exp * 10, icon: '👹',
    } : {
      name: '웨이브 ' + wave, hp, atk, exp, icon: wave > 20 ? '👿' : wave > 10 ? '💀' : '👾',
    },
  };
}

function getBossName(wave) {
  const names = ['슬라임 킹','골렘 로드','드래곤 사제','암흑 기사단장','마왕의 그림자','심연의 군주','혼돈의 화신','최종: 세계의 적'];
  return names[Math.floor(wave/5) - 1] || '???';
}

// ═══ 매치 관리 ═══
let match = null;
let matchTick = null;
let _io = null, _players = null;

function init(io, players) { _io = io; _players = players; }

function getOrCreate() {
  if (match && match.phase === 'active') return match;
  match = {
    id: 'as_' + Date.now(),
    phase: 'active',
    startTime: Date.now(),
    wave: 0, lastWave: Date.now(),
    players: {},
    gems: [],       // 바닥 경험치 보석
    monstersAlive: 0,
    totalKills: 0,
  };
  if (matchTick) clearInterval(matchTick);
  matchTick = setInterval(() => tick(), 1000);
  if (_io) _io.emit('server_msg', { msg: '🎮 오토배틀 서바이벌 시작! 이동만 하세요, 공격은 자동!', type: 'boss' });
  return match;
}

function join(playerId, name, classId) {
  const m = getOrCreate();
  if (m.players[playerId]) return { success: true, session: getStatus(playerId) };

  m.players[playerId] = {
    id: playerId, name,
    level: 1, exp: 0, expToNext: 30,
    hp: 120, maxHp: 120, def: 3, spd: 8,
    hpRegen: 0, luck: 0, magnet: CONFIG.gemMagnetBase,
    dmgMult: 100, cdReduction: 0,
    kills: 0, score: 0,
    alive: true, revive: 0,
    weapons: [{ ...WEAPONS.sword, lv: 1 }], // 시작 무기: 회전 검
    passives: [],
    x: Math.random() * 600 - 300,
    y: Math.random() * 600 - 300,
    pendingChoice: false,
    lastAutoAttack: {},
  };

  return { success: true, session: getStatus(playerId), weapons: Object.values(WEAPONS).map(w => ({ id: Object.keys(WEAPONS).find(k => WEAPONS[k] === w), ...w })) };
}

function tick() {
  if (!match || match.phase !== 'active') return;
  const elapsed = Math.floor((Date.now() - match.startTime) / 1000);

  // 매치 종료
  if (elapsed >= CONFIG.matchDuration) { endMatch(); return; }

  // 전원 사망 체크
  const aliveCount = Object.values(match.players).filter(p => p.alive).length;
  if (aliveCount === 0 && Object.keys(match.players).length > 0) { endMatch(); return; }

  // HP 재생
  for (const p of Object.values(match.players)) {
    if (p.alive && p.hpRegen > 0) p.hp = Math.min(p.maxHp, p.hp + p.hpRegen);
  }

  // 웨이브
  if (Date.now() - match.lastWave > CONFIG.waveInterval * 1000 && match.wave < CONFIG.maxWave) {
    match.wave++;
    match.lastWave = Date.now();
    const playerCount = Object.keys(match.players).length;
    const waveData = getWaveMonsters(match.wave, playerCount);
    match.monstersAlive += waveData.count;

    if (_io) {
      _io.emit('as_wave', {
        wave: match.wave, count: waveData.count, isBoss: waveData.isBoss,
        monster: waveData.monster,
      });
    }
  }

  // 자동 전투 (각 플레이어)
  for (const p of Object.values(match.players)) {
    if (!p.alive || p.pendingChoice) continue;
    autoFight(p);
    pickupGems(p);
  }

  // 브로드캐스트 (2초마다)
  if (elapsed % 2 === 0 && _io) {
    const board = Object.values(match.players)
      .map(p => ({ name: p.name, level: p.level, kills: p.kills, score: p.score, alive: p.alive, weaponCount: p.weapons.length }))
      .sort((a, b) => b.score - a.score).slice(0, 10);

    _io.emit('as_update', {
      wave: match.wave, elapsed,
      remaining: CONFIG.matchDuration - elapsed,
      monstersAlive: match.monstersAlive,
      totalKills: match.totalKills,
      leaderboard: board,
    });

    // 개인 상태
    for (const pid of Object.keys(match.players)) {
      _io.to(pid).emit('as_status', getStatus(pid));
    }
  }
}

function autoFight(player) {
  if (match.monstersAlive <= 0) return;
  const now = Date.now();

  // 각 무기별 자동 공격
  for (const weapon of player.weapons) {
    const weaponId = Object.keys(WEAPONS).find(k => WEAPONS[k].name === weapon.name) || 'sword';
    const cd = Math.floor(weapon.cd * (1 - player.cdReduction / 100));
    if (now - (player.lastAutoAttack[weaponId] || 0) < cd) continue;
    player.lastAutoAttack[weaponId] = now;

    const dmg = Math.floor(weapon.baseDmg * weapon.lv * player.dmgMult / 100);
    const hits = weapon.type === 'multi' ? 3 : weapon.type === 'aoe' || weapon.type === 'nova' ? Math.min(match.monstersAlive, 3 + weapon.lv) : 1;

    for (let i = 0; i < hits; i++) {
      if (match.monstersAlive <= 0) break;
      match.monstersAlive--;
      match.totalKills++;
      player.kills++;
      player.score += 10 + match.wave;

      // EXP 보석 드롭
      match.gems.push({
        x: player.x + (Math.random() * 60 - 30),
        y: player.y + (Math.random() * 60 - 30),
        exp: CONFIG.expPerKill + match.wave,
        time: now,
      });
    }
  }

  // 적 반격 (간소화)
  if (match.monstersAlive > 0 && Math.random() < 0.3) {
    const enemyAtk = 3 + match.wave * 2;
    const dmg = Math.max(0, enemyAtk - player.def);
    player.hp -= dmg;
    if (player.hp <= 0) {
      if (player.revive > 0) { player.revive--; player.hp = Math.floor(player.maxHp * 0.3); }
      else { player.alive = false; player.score += match.wave * 50; }
    }
  }
}

function pickupGems(player) {
  const now = Date.now();
  for (let i = match.gems.length - 1; i >= 0; i--) {
    const gem = match.gems[i];
    const dx = gem.x - player.x, dy = gem.y - player.y;
    if (Math.sqrt(dx*dx+dy*dy) < player.magnet) {
      player.exp += gem.exp;
      match.gems.splice(i, 1);
      checkLevelUp(player);
    }
    // 60초 후 소멸
    if (now - gem.time > 60000) match.gems.splice(i, 1);
  }
}

function checkLevelUp(player) {
  while (player.exp >= player.expToNext) {
    player.exp -= player.expToNext;
    player.level++;
    player.expToNext = Math.floor(player.expToNext * CONFIG.expScaling);
    player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.1));
    player.pendingChoice = true;
  }
}

function getChoices(playerId) {
  const p = match?.players[playerId];
  if (!p) return [];

  const choices = [];

  // 새 무기 (아직 없는 것)
  const ownedWeapons = new Set(p.weapons.map(w => w.name));
  const newWeapons = Object.entries(WEAPONS).filter(([, w]) => !ownedWeapons.has(w.name));
  if (newWeapons.length > 0) {
    const [id, w] = newWeapons[Math.floor(Math.random() * newWeapons.length)];
    choices.push({ type: 'weapon_new', id, name: w.name, icon: w.icon, desc: w.desc + ' (신규!)', data: w });
  }

  // 무기 강화 (이미 있는 것)
  if (p.weapons.length > 0) {
    const w = p.weapons[Math.floor(Math.random() * p.weapons.length)];
    choices.push({ type: 'weapon_up', id: w.name, name: w.name + ' Lv.' + (w.lv+1), icon: w.icon, desc: '데미지 +' + w.baseDmg + ', 범위↑' });
  }

  // 패시브 (랜덤 2개)
  const passiveKeys = Object.keys(PASSIVES);
  for (let i = 0; i < 2 && choices.length < 4; i++) {
    const key = passiveKeys[Math.floor(Math.random() * passiveKeys.length)];
    const pas = PASSIVES[key];
    if (!choices.find(c => c.id === key)) {
      choices.push({ type: 'passive', id: key, name: pas.name, icon: pas.icon, desc: pas.desc });
    }
  }

  return choices.slice(0, 4);
}

function selectChoice(playerId, choiceType, choiceId) {
  const p = match?.players[playerId];
  if (!p || !p.pendingChoice) return { success: false };

  if (choiceType === 'weapon_new') {
    const w = WEAPONS[choiceId];
    if (w) p.weapons.push({ ...w, lv: 1 });
  } else if (choiceType === 'weapon_up') {
    const w = p.weapons.find(wp => wp.name === choiceId);
    if (w) { w.lv++; w.baseDmg = Math.floor(w.baseDmg * 1.3); w.range += 5; }
  } else if (choiceType === 'passive') {
    const pas = PASSIVES[choiceId];
    if (pas) {
      p.passives.push({ id: choiceId, ...pas });
      for (const [k, v] of Object.entries(pas.effect)) {
        if (k === 'maxHp') { p.maxHp += v; p.hp += v; }
        else if (k === 'dmgMult') p.dmgMult += v;
        else if (p[k] !== undefined) p[k] += v;
      }
    }
  }

  p.pendingChoice = false;
  return { success: true };
}

function endMatch() {
  if (!match) return;
  match.phase = 'ended';
  if (matchTick) { clearInterval(matchTick); matchTick = null; }

  const rankings = Object.values(match.players)
    .map(p => ({ id: p.id, name: p.name, level: p.level, kills: p.kills, score: p.score, weapons: p.weapons.map(w => w.icon).join(''), wave: match.wave }))
    .sort((a, b) => b.score - a.score);

  // 보상
  const rewards = [{ gold: 10000, diamonds: 100 },{ gold: 7000, diamonds: 70 },{ gold: 5000, diamonds: 50 }];
  rankings.forEach((r, i) => {
    const reward = rewards[Math.min(i, rewards.length-1)] || { gold: 1000, diamonds: 10 };
    if (_players && _players[r.id]) {
      _players[r.id].gold = (_players[r.id].gold || 0) + reward.gold;
      _players[r.id].diamonds = (_players[r.id].diamonds || 0) + reward.diamonds;
    }
  });

  if (_io) {
    _io.emit('as_end', { rankings, wave: match.wave, totalKills: match.totalKills });
    _io.emit('server_msg', { msg: '🏆 서바이벌 종료! 1위: ' + (rankings[0]?.name||'') + ' (웨이브 ' + match.wave + ', ' + (rankings[0]?.kills||0) + '킬)', type: 'boss' });
  }

  setTimeout(() => { match = null; }, 5000);
}

function getStatus(playerId) {
  const p = match?.players[playerId];
  if (!p) return null;
  return {
    level: p.level, exp: p.exp, expToNext: p.expToNext,
    hp: p.hp, maxHp: p.maxHp, def: p.def, spd: p.spd,
    kills: p.kills, score: p.score, alive: p.alive,
    wave: match.wave,
    remaining: CONFIG.matchDuration - Math.floor((Date.now() - match.startTime) / 1000),
    weapons: p.weapons.map(w => ({ name: w.name, icon: w.icon, lv: w.lv })),
    passives: p.passives.map(ps => ({ name: ps.name, icon: ps.icon })),
    pendingChoice: p.pendingChoice,
    monstersAlive: match.monstersAlive,
  };
}

function registerHandlers(socket, playerId, players, io) {
  socket.on('as_join', () => {
    const p = players[playerId];
    if (!p) return;
    const result = join(playerId, p.displayName || p.className);
    socket.emit('as_joined', result);
  });

  socket.on('as_choices', () => {
    socket.emit('as_choices', { choices: getChoices(playerId) });
  });

  socket.on('as_select', (data) => {
    const result = selectChoice(playerId, data.type, data.id);
    socket.emit('as_selected', result);
    if (result.success) socket.emit('as_status', getStatus(playerId));
  });

  socket.on('as_move', (data) => {
    const p = match?.players[playerId];
    if (!p || !p.alive) return;
    p.x += (data.dx || 0) * p.spd * 0.5;
    p.y += (data.dy || 0) * p.spd * 0.5;
    // 맵 범위 제한
    p.x = Math.max(-500, Math.min(500, p.x));
    p.y = Math.max(-500, Math.min(500, p.y));
  });

  socket.on('as_status', () => {
    socket.emit('as_status', getStatus(playerId));
  });
}

module.exports = { init, registerHandlers, CONFIG, WEAPONS, PASSIVES };

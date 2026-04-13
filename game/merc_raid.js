// 혈맹 레이드 보스 — v3.0
// 혈맹원 5~15명이 협동하여 대형 보스 처치
// 역할 분담: 탱커(어그로)/딜러(DPS)/힐러(생존)

const RAID_BOSSES = [
  {
    id: 'ignis', name: '🔥 고대 화룡 이그니스', hp: 50000, atk: 120, def: 40,
    minPlayers: 5, maxPlayers: 8, cooldown: 3600 * 12, // 12시간 쿨
    phases: [
      { hpPct: 100, pattern: '꼬리 치기 — 후방 200DMG', interval: 5000 },
      { hpPct: 50,  pattern: '비행+화염탄 5발 — 각 150DMG', interval: 4000 },
      { hpPct: 20,  pattern: '분노 — ATK 3배, 패턴 가속', interval: 2000 },
    ],
    weakness: 'ice', weakBonus: 1.5,
    rewards: { gold: 10000, material: 5, cardChance: 0.1, cardGrade: 3 },
  },
  {
    id: 'abadon', name: '💀 심연의 군주 아바돈', hp: 120000, atk: 180, def: 60,
    minPlayers: 8, maxPlayers: 12, cooldown: 3600 * 24,
    phases: [
      { hpPct: 100, pattern: '어둠 속 추적 — 시야 0, 소리로 판단', interval: 6000 },
      { hpPct: 40,  pattern: '그림자 분신 4체 — 본체만 데미지', interval: 4000 },
      { hpPct: 15,  pattern: '영혼 흡수 — 가장 강한 1명 3초 속박', interval: 3000 },
    ],
    weakness: 'light', weakBonus: 1.5,
    rewards: { gold: 30000, material: 15, cardChance: 0.3, cardGrade: 4, awakenStone: 0.1 },
  },
  {
    id: 'yggdrasil', name: '🌳 세계수 수호자', hp: 200000, atk: 100, def: 80,
    minPlayers: 10, maxPlayers: 15, cooldown: 3600 * 24,
    phases: [
      { hpPct: 100, pattern: '뿌리 속박 — 랜덤 3명 5초 이동불가', interval: 8000 },
      { hpPct: 60,  pattern: '자힐 — 30초마다 HP 20% 회복 (뿌리 4개 파괴로 차단)', interval: 30000 },
      { hpPct: 25,  pattern: '열매 폭탄 — 범위 300DMG + 먹으면 버프', interval: 5000 },
    ],
    weakness: 'fire', weakBonus: 1.3,
    rewards: { gold: 50000, material: 30, cardChance: 0.3, cardGrade: 4, mythicMat: 0.03 },
  },
  {
    id: 'thor', name: '⚡ 천둥신 토르', hp: 500000, atk: 250, def: 50,
    minPlayers: 10, maxPlayers: 15, cooldown: 3600 * 24 * 7, // 주 1회
    phases: [
      { hpPct: 100, pattern: '번개 체인 — 뭉치면 연쇄 피해 200×인원수', interval: 7000 },
      { hpPct: 50,  pattern: '망치 투척 — 추적형 500DMG, 유인역 필요', interval: 5000 },
      { hpPct: 20,  pattern: '천둥 폭풍 — 전체 300DMG/초 10초', interval: 3000 },
    ],
    weakness: 'earth', weakBonus: 1.3,
    rewards: { gold: 100000, material: 50, diamonds: 50, cardChance: 0.5, cardGrade: 5, mythicMat: 0.1, awakenStone: 0.3 },
  },
];

const activeRaids = {};

function startRaid(clanName, bossId, participants, players, io) {
  if (activeRaids[clanName]) return { success: false, msg: '이미 레이드 진행 중' };

  const boss = RAID_BOSSES.find(b => b.id === bossId);
  if (!boss) return { success: false, msg: '보스 없음' };

  const validParticipants = participants.filter(pid => players[pid]).slice(0, boss.maxPlayers);
  if (validParticipants.length < boss.minPlayers) return { success: false, msg: `최소 ${boss.minPlayers}명 필요 (현재 ${validParticipants.length}명)` };

  // 참가자 전투력 합산
  let mercSystem;
  try { mercSystem = require('./mercenary_system'); } catch(e) {}

  const raidParty = validParticipants.map(pid => {
    const p = players[pid];
    let power = (p.atk || 20) + (p.def || 10) + (p.maxHp || 100);
    let partyMercs = [];
    if (mercSystem) {
      const mercs = mercSystem.getPlayerMercs(p);
      partyMercs = mercs.roster.filter(m => mercs.party.includes(m.uid));
      power += partyMercs.reduce((s, m) => s + mercSystem.calcCombatPower(m), 0);
    }
    return {
      id: pid, name: p.displayName || p.className,
      power, hp: 1000 + power, maxHp: 1000 + power,
      atk: (p.atk || 20) + partyMercs.reduce((s, m) => s + Math.floor(m.atk * 0.3), 0),
      alive: true, totalDmg: 0, totalHeal: 0,
    };
  });

  const raid = {
    id: 'raid_' + Date.now(),
    clanName, bossId,
    boss: { ...boss, currentHp: boss.hp, phase: 0 },
    participants: raidParty,
    startTime: Date.now(),
    elapsed: 0,
    phase: 'active',
    log: [],
    tickTimer: null,
  };

  activeRaids[clanName] = raid;

  // 알림
  if (io) {
    for (const p of raidParty) {
      io.to(p.id).emit('raid_start', {
        raidId: raid.id, boss: { name: boss.name, hp: boss.hp, atk: boss.atk },
        team: raidParty.map(r => ({ name: r.name, power: r.power })),
      });
    }
    io.emit('server_msg', { msg: `⚔️ 혈맹 [${clanName}] ${boss.name} 레이드 시작! (${raidParty.length}명)`, type: 'boss' });
  }

  // 전투 틱 (2초마다)
  raid.tickTimer = setInterval(() => {
    const result = tickRaid(clanName, io, players);
    if (result && result.ended) { clearInterval(raid.tickTimer); raid.tickTimer = null; }
  }, 2000);

  return { success: true, raidId: raid.id };
}

function tickRaid(clanName, io, players) {
  const raid = activeRaids[clanName];
  if (!raid || raid.phase !== 'active') return { ended: true };

  const now = Date.now();
  raid.elapsed = Math.floor((now - raid.startTime) / 1000);
  const boss = raid.boss;
  const bossData = RAID_BOSSES.find(b => b.id === raid.bossId);

  // 10분 타임아웃
  if (raid.elapsed >= 600) return endRaid(clanName, false, '시간 초과', io, players);

  const alive = raid.participants.filter(p => p.alive);
  if (alive.length === 0) return endRaid(clanName, false, '전멸', io, players);

  // 현재 페이즈 결정
  const hpPct = (boss.currentHp / bossData.hp) * 100;
  for (let i = bossData.phases.length - 1; i >= 0; i--) {
    if (hpPct <= bossData.phases[i].hpPct) { boss.phase = i; break; }
  }

  // 보스 공격 (현재 페이즈 패턴)
  const phase = bossData.phases[boss.phase] || bossData.phases[0];
  const target = alive[Math.floor(Math.random() * alive.length)];
  if (target) {
    const phaseMult = boss.phase === bossData.phases.length - 1 ? 2.0 : 1.0; // 최종 페이즈 2배
    const bossDmg = Math.floor(bossData.atk * phaseMult * (0.8 + Math.random() * 0.4));
    target.hp -= bossDmg;
    if (target.hp <= 0) { target.alive = false; target.hp = 0; }
    raid.log.push({ t: raid.elapsed, type: 'boss_atk', target: target.name, dmg: bossDmg, pattern: phase.pattern });
  }

  // 참가자 공격 (각자 DPS)
  for (const p of alive) {
    const dmg = Math.max(1, Math.floor(p.atk * (100 / (100 + bossData.def)) * (0.8 + Math.random() * 0.4)));
    boss.currentHp -= dmg;
    p.totalDmg += dmg;
  }

  // 보스 처치 체크
  if (boss.currentHp <= 0) {
    boss.currentHp = 0;
    return endRaid(clanName, true, '보스 처치!', io, players);
  }

  // 상태 브로드캐스트 (매 틱)
  if (io) {
    const status = {
      elapsed: raid.elapsed, remaining: 600 - raid.elapsed,
      bossHp: boss.currentHp, bossMaxHp: bossData.hp, bossPhase: boss.phase + 1,
      team: raid.participants.map(p => ({ name: p.name, hp: p.hp, maxHp: p.maxHp, alive: p.alive, dmg: p.totalDmg })),
      lastLog: raid.log.slice(-3),
    };
    for (const p of raid.participants) {
      io.to(p.id).emit('raid_update', status);
    }
  }

  return {};
}

function endRaid(clanName, victory, reason, io, players) {
  const raid = activeRaids[clanName];
  if (!raid) return { ended: true };

  raid.phase = 'ended';
  if (raid.tickTimer) { clearInterval(raid.tickTimer); raid.tickTimer = null; }

  const bossData = RAID_BOSSES.find(b => b.id === raid.bossId);
  const rewards = victory ? { ...bossData.rewards } : { gold: Math.floor(bossData.rewards.gold * 0.1) };

  // MVP (최다 데미지)
  const mvp = [...raid.participants].sort((a, b) => b.totalDmg - a.totalDmg)[0];

  // 보상 지급
  if (players) {
    for (const p of raid.participants) {
      const player = players[p.id];
      if (!player) continue;
      const isVP = p === mvp;
      player.gold = (player.gold || 0) + rewards.gold * (isVP ? 2 : 1);
      if (rewards.diamonds) player.diamonds = (player.diamonds || 0) + rewards.diamonds * (isVP ? 2 : 1);

      // 용병 카드 드롭
      if (victory && rewards.cardChance && Math.random() < rewards.cardChance) {
        try {
          const mercSystem = require('./mercenary_system');
          const pool = mercSystem.MERCENARIES.filter(m => m.grade <= rewards.cardGrade);
          const card = pool[Math.floor(Math.random() * pool.length)];
          if (card) mercSystem.addMercenary(player, card.id);
        } catch(e) {}
      }
    }
  }

  const result = {
    victory, reason, elapsed: raid.elapsed,
    bossName: bossData.name,
    mvp: mvp ? { name: mvp.name, dmg: mvp.totalDmg } : null,
    rewards,
    team: raid.participants.map(p => ({ name: p.name, dmg: p.totalDmg, alive: p.alive })),
  };

  if (io) {
    for (const p of raid.participants) {
      io.to(p.id).emit('raid_end', { ...result, isMvp: p === mvp });
    }
    io.emit('server_msg', {
      msg: victory
        ? `🏆 [${clanName}] ${bossData.name} 처치! MVP: ${mvp?.name} (${mvp?.totalDmg}DMG)`
        : `💀 [${clanName}] ${bossData.name} 레이드 실패... (${reason})`,
      type: 'boss',
    });
  }

  setTimeout(() => { delete activeRaids[clanName]; }, 10000);
  return { ended: true };
}

function registerRaidHandlers(socket, playerId, players, io) {
  socket.on('raid_start', (data) => {
    const p = players[playerId];
    if (!p || !p.clanName) { socket.emit('raid_result', { success: false, msg: '혈맹 소속이 아닙니다' }); return; }

    // 같은 혈맹 온라인 멤버 수집
    const clanMembers = Object.entries(players)
      .filter(([, pl]) => pl.clanName === p.clanName && !pl.isBot)
      .map(([id]) => id);

    const result = startRaid(p.clanName, data.bossId, clanMembers, players, io);
    socket.emit('raid_result', result);
  });

  socket.on('raid_bosses', () => {
    socket.emit('raid_bosses', {
      bosses: RAID_BOSSES.map(b => ({
        id: b.id, name: b.name, hp: b.hp, atk: b.atk,
        minPlayers: b.minPlayers, maxPlayers: b.maxPlayers,
        rewards: b.rewards, weakness: b.weakness,
      })),
    });
  });
}

module.exports = { registerRaidHandlers, RAID_BOSSES, activeRaids };

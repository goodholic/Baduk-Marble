// 현상금 & 암살 의뢰 확장 시스템 — v3.7
function registerBountyExtendedHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  const BOUNTY_RANKS = [
    { rank: 'D', name: '견습',  minPts: 0,    stealthBonus: 0 },
    { rank: 'C', name: '정식',  minPts: 100,  stealthBonus: 0.2 },
    { rank: 'B', name: '숙련',  minPts: 500,  stealthBonus: 0.3 },
    { rank: 'A', name: '달인',  minPts: 1500, stealthBonus: 0.5 },
    { rank: 'S', name: '마스터', minPts: 5000, stealthBonus: 0.7 },
    { rank: 'SS', name: '전설', minPts: 10000, stealthBonus: 1.0 },
  ];

  const BOUNTY_TYPES = {
    monster_hunt:   { grade: 'D', reward: 1000,   timeLimit: 86400e3, karmaChange: 0 },
    boss_kill:      { grade: 'C', reward: 5000,   timeLimit: 43200e3, karmaChange: 0 },
    pk_hunter:      { grade: 'B', reward: 20000,  timeLimit: 21600e3, karmaChange: -5 },
    assassination:  { grade: 'A', reward: 50000,  timeLimit: 10800e3, karmaChange: 10 },
    clan_leader:    { grade: 'S', reward: 200000, timeLimit: 3600e3,  karmaChange: 30 },
    server_first:   { grade: 'SS', reward: 1000000, timeLimit: 1800e3, karmaChange: 50 },
    world_boss:     { grade: '★', reward: 10000,  timeLimit: 7200e3,  karmaChange: -10 },
    wanted:         { grade: '★', reward: 0,      timeLimit: 0,       karmaChange: -20 },
    revenge:        { grade: '★', reward: 5000,   timeLimit: 172800e3, karmaChange: -10 },
    escort:         { grade: '★', reward: 0,      timeLimit: 0,       karmaChange: 0 },
  };

  function getAssassinRank(pts) {
    for (let i = BOUNTY_RANKS.length - 1; i >= 0; i--) {
      if (pts >= BOUNTY_RANKS[i].minPts) return BOUNTY_RANKS[i];
    }
    return BOUNTY_RANKS[0];
  }

  // 의뢰 게시판 조회
  socket.on('bounty_board', () => {
    const p = players[playerId];
    if (!p) return;
    const rank = getAssassinRank(p.assassinPoints || 0);

    // 사용 가능한 의뢰 목록 생성
    const available = [];
    const gradeOrder = ['D', 'C', 'B', 'A', 'S', 'SS'];
    const maxGradeIdx = gradeOrder.indexOf(rank.rank);

    for (const [type, config] of Object.entries(BOUNTY_TYPES)) {
      const gradeIdx = gradeOrder.indexOf(config.grade);
      if (gradeIdx <= maxGradeIdx || config.grade === '★') {
        available.push({
          type,
          ...config,
          available: true,
        });
      }
    }

    // 현상수배 플레이어 목록
    const wantedList = Object.values(players)
      .filter(p2 => (p2.karma || 0) >= 200 && p2.id !== playerId)
      .map(p2 => ({ name: p2.name, karma: p2.karma, bounty: Math.floor(p2.karma * 100) }))
      .sort((a, b) => b.karma - a.karma)
      .slice(0, 10);

    socket.emit('bounty_board', {
      rank: rank.rank,
      rankName: rank.name,
      points: p.assassinPoints || 0,
      available,
      wantedList,
      activeBounties: p.activeBounties || [],
    });
  });

  // 의뢰 수락
  socket.on('bounty_accept', (data) => {
    const p = players[playerId];
    if (!p || !data?.type) return;
    const config = BOUNTY_TYPES[data.type];
    if (!config) return;

    if (!p.activeBounties) p.activeBounties = [];
    if (p.activeBounties.length >= 3) {
      socket.emit('bounty_error', { reason: 'max_active_bounties' });
      return;
    }

    const bounty = {
      id: `bounty_${Date.now()}`,
      type: data.type,
      target: data.target || null,
      reward: config.reward + (data.clientFunds || 0),
      accepted: Date.now(),
      deadline: config.timeLimit > 0 ? Date.now() + config.timeLimit : 0,
      grade: config.grade,
    };

    p.activeBounties.push(bounty);
    savePlayer(p);
    socket.emit('bounty_accepted', bounty);
  });

  // 의뢰 완료
  socket.on('bounty_complete', (data) => {
    const p = players[playerId];
    if (!p || !data?.bountyId) return;
    if (!p.activeBounties) return;

    const idx = p.activeBounties.findIndex(b => b.id === data.bountyId);
    if (idx === -1) return;

    const bounty = p.activeBounties[idx];
    const config = BOUNTY_TYPES[bounty.type];

    // 시간 초과 체크
    if (bounty.deadline > 0 && Date.now() > bounty.deadline) {
      p.activeBounties.splice(idx, 1);
      p.karma = (p.karma || 0) + Math.abs(config.karmaChange);
      savePlayer(p);
      socket.emit('bounty_failed', { bountyId: bounty.id, reason: 'timeout' });
      return;
    }

    // 보상 지급
    p.gold = Math.min(999999999, (p.gold || 0) + bounty.reward);
    p.assassinPoints = (p.assassinPoints || 0) + (bounty.grade === 'SS' ? 500 : bounty.grade === 'S' ? 200 : bounty.grade === 'A' ? 50 : bounty.grade === 'B' ? 20 : 5);
    p.karma = Math.max(0, (p.karma || 0) + config.karmaChange);

    p.activeBounties.splice(idx, 1);
    if (!p.completedBounties) p.completedBounties = 0;
    p.completedBounties++;

    const newRank = getAssassinRank(p.assassinPoints);
    savePlayer(p);

    socket.emit('bounty_completed', {
      bountyId: bounty.id,
      reward: bounty.reward,
      pointsGained: bounty.grade === 'SS' ? 500 : bounty.grade === 'S' ? 200 : 50,
      newRank: newRank.rank,
      totalCompleted: p.completedBounties,
    });

    // SS 달성 시 서버 공지
    if (newRank.rank === 'SS' && (p.assassinPoints - 500) < 10000) {
      io.emit('server_toast', { msg: `☠️ 전설의 암살자 [${p.name}]이(가) 탄생했습니다! 모두 조심하세요!` });
    }
  });

  // 복수 의뢰 (자동 생성)
  socket.on('bounty_revenge', (data) => {
    const p = players[playerId];
    if (!p || !data?.killerName) return;

    const revenge = {
      id: `revenge_${Date.now()}`,
      type: 'revenge',
      target: data.killerName,
      reward: 5000,
      accepted: Date.now(),
      deadline: Date.now() + 172800e3,
      grade: '★',
    };

    if (!p.activeBounties) p.activeBounties = [];
    p.activeBounties.push(revenge);
    savePlayer(p);
    socket.emit('bounty_revenge_created', revenge);
  });

  // 암살자 랭킹
  socket.on('assassin_ranking', () => {
    const ranking = Object.values(players)
      .filter(p => (p.assassinPoints || 0) > 0)
      .map(p => ({
        name: p.name,
        points: p.assassinPoints,
        rank: getAssassinRank(p.assassinPoints).rank,
        completed: p.completedBounties || 0,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 30);
    socket.emit('assassin_ranking', ranking);
  });
}

module.exports = { registerBountyExtendedHandlers };

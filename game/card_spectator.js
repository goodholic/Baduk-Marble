// ============================================
// 관전 & 리플레이 -- 실시간 관전 + 전투 기록
// ============================================

const MAX_REPLAY_STORAGE = 50; // 서버 최대 50개 리플레이 보관
const MAX_SPECTATORS = 20;     // 매치당 최대 관전자
const MAX_HIGHLIGHTS = 100;    // 하이라이트 최대 보관
const MAX_MY_REPLAYS = 20;     // 개인 리플레이 조회 최대

const serverReplays = []; // 서버 전체 리플레이 저장소
let replayIdCounter = 1;
let highlightIdCounter = 1;

// 리플레이 유형
const REPLAY_TYPES = {
  pvp:          { name: 'PvP 대전',       icon: '⚔️',    keepDuration: 86400000 },    // 24시간
  chess:        { name: '오토체스',       icon: '♟️',    keepDuration: 86400000 },
  duel:         { name: '카드 대결',      icon: '🃏',    keepDuration: 86400000 },
  tournament:   { name: '토너먼트',       icon: '🏆',    keepDuration: 604800000 },   // 7일
  io_highlight: { name: 'IO 하이라이트',  icon: '⚔️🌟',  keepDuration: 604800000 },
  boss_raid:    { name: '보스 레이드',    icon: '🐲',    keepDuration: 259200000 },   // 3일
};

// 관전 중인 매치 목록
const liveMatches = {}; // { matchId: { type, players, spectators: Set, startTime } }

// 하이라이트 저장소
const highlights = []; // { id, matchId, player, momentData, likes: Set, views, createdAt }

/* ── 유틸 ── */

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return '방금 전';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return `${Math.floor(diff / 86400000)}일 전`;
}

function cleanupExpiredReplays() {
  const now = Date.now();
  for (let i = serverReplays.length - 1; i >= 0; i--) {
    const r = serverReplays[i];
    const typeDef = REPLAY_TYPES[r.type];
    const keep = typeDef ? typeDef.keepDuration : 86400000;
    if (now - r.timestamp > keep) {
      serverReplays.splice(i, 1);
    }
  }
  // 용량 초과 시 오래된 것부터 제거
  while (serverReplays.length > MAX_REPLAY_STORAGE) {
    serverReplays.shift();
  }
}

function cleanupExpiredHighlights() {
  const now = Date.now();
  // 하이라이트는 7일 보관
  for (let i = highlights.length - 1; i >= 0; i--) {
    if (now - highlights[i].createdAt > 604800000) {
      highlights.splice(i, 1);
    }
  }
  while (highlights.length > MAX_HIGHLIGHTS) {
    highlights.shift();
  }
}

/* ── 리플레이 ── */

function recordReplay(type, data) {
  cleanupExpiredReplays();

  if (!REPLAY_TYPES[type]) return { success: false, msg: `알 수 없는 리플레이 유형: ${type}` };
  if (!data || !data.players || !data.result) {
    return { success: false, msg: '리플레이 데이터 불완전 (players, result 필수)' };
  }

  const replay = {
    id: `replay_${replayIdCounter++}`,
    type,
    players: data.players,           // [{ id, name, level?, cards? }]
    rounds: data.rounds || [],       // 라운드별 로그
    log: data.log || [],             // 전체 전투 로그
    result: data.result,             // { winner, loser, score, ... }
    timestamp: data.timestamp || Date.now(),
    views: 0,
  };

  serverReplays.push(replay);

  // 용량 초과 시 오래된 것부터 제거
  while (serverReplays.length > MAX_REPLAY_STORAGE) {
    serverReplays.shift();
  }

  return { success: true, replayId: replay.id };
}

function getReplayList(filter) {
  cleanupExpiredReplays();

  let list = [...serverReplays];

  // 타입 필터
  if (filter && filter.type && REPLAY_TYPES[filter.type]) {
    list = list.filter(r => r.type === filter.type);
  }

  // 최신순 정렬
  list.sort((a, b) => b.timestamp - a.timestamp);

  return list.map(r => {
    const typeDef = REPLAY_TYPES[r.type] || {};
    return {
      id: r.id,
      type: r.type,
      typeName: typeDef.name || r.type,
      typeIcon: typeDef.icon || '',
      players: r.players.map(p => ({ name: p.name, level: p.level })),
      result: r.result,
      timeAgo: timeAgo(r.timestamp),
      timestamp: r.timestamp,
      views: r.views,
    };
  });
}

function watchReplay(player, replayId) {
  const replay = serverReplays.find(r => r.id === replayId);
  if (!replay) return { success: false, msg: '리플레이를 찾을 수 없습니다' };

  replay.views++;

  return {
    success: true,
    replay: {
      id: replay.id,
      type: replay.type,
      typeName: (REPLAY_TYPES[replay.type] || {}).name || replay.type,
      players: replay.players,
      rounds: replay.rounds,
      log: replay.log,
      result: replay.result,
      timestamp: replay.timestamp,
      views: replay.views,
    },
  };
}

function getMyReplays(player) {
  cleanupExpiredReplays();

  const pid = player.id || player.odid;
  if (!pid) return [];

  return serverReplays
    .filter(r => r.players.some(p => p.id === pid))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_MY_REPLAYS)
    .map(r => {
      const typeDef = REPLAY_TYPES[r.type] || {};
      return {
        id: r.id,
        type: r.type,
        typeName: typeDef.name || r.type,
        typeIcon: typeDef.icon || '',
        players: r.players.map(p => ({ name: p.name, level: p.level })),
        result: r.result,
        timeAgo: timeAgo(r.timestamp),
        timestamp: r.timestamp,
        views: r.views,
      };
    });
}

/* ── 라이브 관전 ── */

function registerLiveMatch(matchId, type, playerNames) {
  if (liveMatches[matchId]) return { success: false, msg: '이미 등록된 매치' };

  liveMatches[matchId] = {
    type: type || 'pvp',
    players: playerNames || [],
    spectators: new Set(),
    startTime: Date.now(),
  };

  return { success: true, matchId };
}

function joinSpectator(player, matchId) {
  const match = liveMatches[matchId];
  if (!match) return { success: false, msg: '매치를 찾을 수 없습니다' };

  const pid = player.id || player.odid;
  if (!pid) return { success: false, msg: '플레이어 정보 없음' };

  // 이미 참가 중인 플레이어는 관전 불가
  if (match.players.some(p => p === pid || p.id === pid)) {
    return { success: false, msg: '참가 중인 매치는 관전할 수 없습니다' };
  }

  if (match.spectators.size >= MAX_SPECTATORS) {
    return { success: false, msg: `관전자 수 초과 (최대 ${MAX_SPECTATORS}명)` };
  }

  if (match.spectators.has(pid)) {
    return { success: false, msg: '이미 관전 중입니다' };
  }

  match.spectators.add(pid);

  return {
    success: true,
    matchId,
    type: match.type,
    players: match.players,
    spectatorCount: match.spectators.size,
  };
}

function leaveSpectator(player, matchId) {
  const match = liveMatches[matchId];
  if (!match) return { success: false, msg: '매치를 찾을 수 없습니다' };

  const pid = player.id || player.odid;
  if (!pid) return { success: false, msg: '플레이어 정보 없음' };

  if (!match.spectators.has(pid)) {
    return { success: false, msg: '관전 중이 아닙니다' };
  }

  match.spectators.delete(pid);

  return { success: true, matchId, spectatorCount: match.spectators.size };
}

function broadcastToSpectators(matchId, event, data) {
  const match = liveMatches[matchId];
  if (!match) return;

  // io 인스턴스가 필요하므로 register에서 캐시된 io 사용
  if (!_cachedIo) return;

  for (const pid of match.spectators) {
    const socketId = _playerSocketMap[pid];
    if (socketId) {
      _cachedIo.to(socketId).emit(event, data);
    }
  }
}

function getLiveMatches() {
  const list = [];
  for (const [matchId, match] of Object.entries(liveMatches)) {
    const typeDef = REPLAY_TYPES[match.type] || {};
    list.push({
      matchId,
      type: match.type,
      typeName: typeDef.name || match.type,
      typeIcon: typeDef.icon || '',
      players: match.players,
      spectatorCount: match.spectators.size,
      elapsed: timeAgo(match.startTime),
      startTime: match.startTime,
    });
  }
  // 관전자 많은 순 정렬
  list.sort((a, b) => b.spectatorCount - a.spectatorCount);
  return list;
}

function getSpectatorCount(matchId) {
  const match = liveMatches[matchId];
  return match ? match.spectators.size : 0;
}

function endLiveMatch(matchId) {
  const match = liveMatches[matchId];
  if (!match) return { success: false, msg: '매치를 찾을 수 없습니다' };

  // 관전자에게 매치 종료 알림
  if (_cachedIo) {
    for (const pid of match.spectators) {
      const socketId = _playerSocketMap[pid];
      if (socketId) {
        _cachedIo.to(socketId).emit('spectate_match_ended', { matchId });
      }
    }
  }

  delete liveMatches[matchId];
  return { success: true, matchId };
}

/* ── 하이라이트 ── */

function saveHighlight(player, matchId, momentData) {
  const pid = player.id || player.odid;
  if (!pid) return { success: false, msg: '플레이어 정보 없음' };
  if (!momentData) return { success: false, msg: '하이라이트 데이터 필요' };

  cleanupExpiredHighlights();

  const hl = {
    id: `hl_${highlightIdCounter++}`,
    matchId: matchId || null,
    playerId: pid,
    playerName: player.displayName || player.name || '알 수 없음',
    momentData,         // { title, description, snapshot, round, action, ... }
    likes: new Set(),
    views: 0,
    createdAt: Date.now(),
  };

  highlights.push(hl);

  while (highlights.length > MAX_HIGHLIGHTS) {
    highlights.shift();
  }

  return { success: true, highlightId: hl.id };
}

function getHighlights() {
  cleanupExpiredHighlights();

  // 인기순: likes + views 가중 정렬
  const sorted = [...highlights].sort((a, b) => {
    const scoreA = a.likes.size * 3 + a.views;
    const scoreB = b.likes.size * 3 + b.views;
    return scoreB - scoreA;
  });

  return sorted.slice(0, 30).map(hl => ({
    id: hl.id,
    matchId: hl.matchId,
    playerName: hl.playerName,
    momentData: hl.momentData,
    likes: hl.likes.size,
    views: hl.views,
    timeAgo: timeAgo(hl.createdAt),
    createdAt: hl.createdAt,
  }));
}

function likeHighlight(player, highlightId) {
  const pid = player.id || player.odid;
  if (!pid) return { success: false, msg: '플레이어 정보 없음' };

  const hl = highlights.find(h => h.id === highlightId);
  if (!hl) return { success: false, msg: '하이라이트를 찾을 수 없습니다' };

  if (hl.likes.has(pid)) {
    // 좋아요 취소 (토글)
    hl.likes.delete(pid);
    return { success: true, liked: false, likes: hl.likes.size };
  }

  hl.likes.add(pid);
  return { success: true, liked: true, likes: hl.likes.size };
}

/* ── 소켓 등록 ── */

let _cachedIo = null;
const _playerSocketMap = {}; // { playerId: socketId }

function register(io, socket, player) {
  _cachedIo = io;

  const pid = player.id || player.odid;
  if (pid) {
    _playerSocketMap[pid] = socket.id;
  }

  // 소켓 종료 시 맵 정리 + 관전 자동 해제
  socket.on('disconnect', () => {
    if (pid) {
      delete _playerSocketMap[pid];
      // 모든 라이브 매치에서 관전자 제거
      for (const match of Object.values(liveMatches)) {
        match.spectators.delete(pid);
      }
    }
  });

  // ─── 리플레이 ───

  socket.on('replay_list', (data) => {
    const filter = data || {};
    const list = getReplayList(filter);
    socket.emit('replay_list', { replays: list, types: Object.entries(REPLAY_TYPES).map(([k, v]) => ({ id: k, ...v })) });
  });

  socket.on('replay_watch', (data) => {
    if (!data || !data.replayId) {
      return socket.emit('replay_watch', { success: false, msg: 'replayId 필요' });
    }
    const result = watchReplay(player, data.replayId);
    socket.emit('replay_watch', result);
  });

  socket.on('my_replays', () => {
    const list = getMyReplays(player);
    socket.emit('my_replays', { replays: list });
  });

  // ─── 관전 ───

  socket.on('spectate_list', () => {
    const list = getLiveMatches();
    socket.emit('spectate_list', { matches: list });
  });

  socket.on('spectate_join', (data) => {
    if (!data || !data.matchId) {
      return socket.emit('spectate_join', { success: false, msg: 'matchId 필요' });
    }
    const result = joinSpectator(player, data.matchId);
    socket.emit('spectate_join', result);

    // 관전자 수 변경 알림
    if (result.success) {
      broadcastToSpectators(data.matchId, 'spectate_count', {
        matchId: data.matchId,
        count: result.spectatorCount,
      });
    }
  });

  socket.on('spectate_leave', (data) => {
    if (!data || !data.matchId) {
      return socket.emit('spectate_leave', { success: false, msg: 'matchId 필요' });
    }
    const result = leaveSpectator(player, data.matchId);
    socket.emit('spectate_leave', result);

    if (result.success) {
      broadcastToSpectators(data.matchId, 'spectate_count', {
        matchId: data.matchId,
        count: result.spectatorCount,
      });
    }
  });

  // ─── 하이라이트 ───

  socket.on('highlight_save', (data) => {
    if (!data) return socket.emit('highlight_save', { success: false, msg: '데이터 필요' });
    const result = saveHighlight(player, data.matchId, data.momentData);
    socket.emit('highlight_save', result);
  });

  socket.on('highlight_list', () => {
    const list = getHighlights();
    socket.emit('highlight_list', { highlights: list });
  });

  socket.on('highlight_like', (data) => {
    if (!data || !data.highlightId) {
      return socket.emit('highlight_like', { success: false, msg: 'highlightId 필요' });
    }
    const result = likeHighlight(player, data.highlightId);
    socket.emit('highlight_like', result);
  });
}

module.exports = {
  REPLAY_TYPES,
  MAX_REPLAY_STORAGE,
  MAX_SPECTATORS,
  liveMatches,
  serverReplays,
  highlights,
  recordReplay,
  getReplayList,
  watchReplay,
  getMyReplays,
  registerLiveMatch,
  joinSpectator,
  leaveSpectator,
  broadcastToSpectators,
  getLiveMatches,
  getSpectatorCount,
  endLiveMatch,
  saveHighlight,
  getHighlights,
  likeHighlight,
  register,
};

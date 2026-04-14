// v5.5 — 전투 리플레이 & 하이라이트 시스템
// 명장면 자동 감지, 리플레이 저장, 공유, 투표, 명예의 전당

const MAX_REPLAYS = 20;
const HIGHLIGHT_TYPES = {
  clutch:      { name: '역전극', icon: '🔥', desc: 'HP 10% 이하에서 승리', score: 100 },
  perfect:     { name: '퍼펙트', icon: '✨', desc: '무피격 보스 클리어', score: 150 },
  multi_kill:  { name: '멀티킬', icon: '💀💀💀', desc: '5초 내 3킬 이상', score: 80 },
  fusion:      { name: '합체 연출', icon: '⚡🔗', desc: '합체 소환 성공', score: 120 },
  transform:   { name: '변신 장면', icon: '🐲', desc: '용병 변신 발동', score: 110 },
  god_form:    { name: '신 변신!', icon: '🌟👑', desc: '히든 신 폼 변신', score: 300 },
  one_shot:    { name: '원샷', icon: '💥', desc: '보스를 한 방에 처치', score: 200 },
  sacrifice:   { name: '희생', icon: '💔', desc: '동료를 위해 대신 사망', score: 130 },
  comeback:    { name: '대역전', icon: '🔄', desc: 'HP 5% → 풀HP로 회복 후 승리', score: 180 },
  speed_kill:  { name: '속전속결', icon: '⚡', desc: '보스를 10초 내 처치', score: 160 },
};

// 리플레이 데이터 구조
function createReplay(player, battleData, highlightType) {
  return {
    id: `rp_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    playerId: player.id,
    playerName: player.name,
    highlight: HIGHLIGHT_TYPES[highlightType] || null,
    battleSummary: {
      type: battleData.type, // 'io', 'siege', 'raid', 'arena'
      result: battleData.result,
      duration: battleData.duration,
      damage: battleData.damage,
      mercsUsed: battleData.mercsUsed,
    },
    votes: 0,
    views: 0,
    createdAt: Date.now(),
    featured: false,
  };
}

// 명예의 전당 카테고리
const HALL_OF_FAME = {
  most_votes:   { name: '인기상', icon: '❤️', desc: '가장 많은 투표를 받은 리플레이' },
  best_clutch:  { name: '역전왕', icon: '🔥', desc: '가장 극적인 역전극' },
  speed_demon:  { name: '스피드 킹', icon: '⚡', desc: '가장 빠른 보스 클리어' },
  perfectionist:{ name: '완벽주의자', icon: '✨', desc: '가장 많은 퍼펙트 클리어' },
  entertainer:  { name: '엔터테이너', icon: '🎭', desc: '가장 재미있는 전투' },
  weekly_best:  { name: '이번 주 최고', icon: '🏆', desc: '주간 최다 투표' },
};

function register(io, socket, player) {
  socket.on('replay_save', (data) => {
    const replays = player.replays = player.replays || [];
    if (replays.length >= MAX_REPLAYS) replays.shift();
    const replay = createReplay(player, data.battleData, data.highlightType);
    replays.push(replay);
    socket.emit('replay_save_result', { ok: true, replay });
  });
  socket.on('replay_list', () => {
    socket.emit('replay_list', { replays: player.replays || [], highlights: HIGHLIGHT_TYPES, hallOfFame: HALL_OF_FAME });
  });
  socket.on('replay_vote', (data) => {
    // 글로벌 투표 (간략화)
    socket.emit('replay_vote_result', { ok: true, replayId: data.replayId });
  });
}

module.exports = { HIGHLIGHT_TYPES, HALL_OF_FAME, MAX_REPLAYS, createReplay, register };

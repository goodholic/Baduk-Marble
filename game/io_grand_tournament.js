// v5.9 — IO 그랜드 토너먼트 (최종 대회)
// 모든 IO 모드를 합친 최종 토너먼트, 서버 최강 결정전

const TOURNAMENT_PHASES = [
  { phase: 1, name: '예선: 서바이벌', icon: '⚔️', mode: 'survival', players: 64, eliminate: 32, desc: '기본 IO 서바이벌, 상위 32명 진출' },
  { phase: 2, name: '본선: 팀 데스매치', icon: '⚔️⚔️', mode: 'tdm', players: 32, eliminate: 16, desc: '4팀 8인, 상위 2팀(16명) 진출' },
  { phase: 3, name: '준결승: 보스 러시', icon: '👹', mode: 'boss_rush', players: 16, eliminate: 8, desc: '보스 러시 타임어택, 상위 8명' },
  { phase: 4, name: '4강: 로그라이크', icon: '🌀', mode: 'roguelike', players: 8, eliminate: 4, desc: '로그라이크 모드 최고 웨이브' },
  { phase: 5, name: '준결승: 1v1 결투', icon: '⚔️🏅', mode: 'duel', players: 4, eliminate: 2, desc: '1v1 결투 토너먼트' },
  { phase: 6, name: '결승: 왕관 쟁탈전', icon: '👑🏆', mode: 'crown', players: 2, eliminate: 1, desc: '최종 2인 왕관 쟁탈! 서버 최강 결정!' },
];

// 서버 최강 보상
const CHAMPION_REWARDS = {
  first:  { gold: 1000000, diamonds: 2000, title: '서버 챔피언 👑🏆', frame: 'grand_champion', merc: 'champion_legend', allStat: 1.05, serverBuff: '서버 전체 EXP+10% (1주)' },
  second: { gold: 500000, diamonds: 1000, title: '그랜드 결투사', frame: 'grand_silver' },
  third:  { gold: 250000, diamonds: 500, title: '그랜드 전사' },
  top8:   { gold: 100000, diamonds: 200 },
  top16:  { gold: 50000, diamonds: 100 },
  top32:  { gold: 25000, diamonds: 50 },
};

// 토너먼트 특수 규칙
const TOURNAMENT_RULES = {
  banPick: true,
  mercSummon: true,
  weatherRandom: true,
  spectating: true,
  betting: true,
  commentary: true,
  replay: true,
};

// 토너먼트 시즌 보상 (역대 챔피언)
const SEASON_HALL_OF_FAME = {
  recordTypes: ['최다 챔피언', '최다 킬', '최고 웨이브', '최빠른 보스 클리어', '최다 관전'],
};

// 관전+베팅 시스템
const SPECTATOR_SYSTEM = {
  maxSpectators: 1000,
  betPool: true,
  liveCommentary: true,
  highlights: true,
  emoteReactions: ['👏', '🔥', '😱', '💀', '👑', '😭'],
};

function register(io, socket, player) {
  socket.on('grand_tournament_info', () => {
    socket.emit('grand_tournament_info', {
      phases: TOURNAMENT_PHASES, rewards: CHAMPION_REWARDS,
      rules: TOURNAMENT_RULES, hallOfFame: SEASON_HALL_OF_FAME,
      spectator: SPECTATOR_SYSTEM,
    });
  });
  socket.on('grand_tournament_join', () => {
    socket.emit('grand_tournament_join_result', { ok: true });
    io.emit('server_msg', `🏆👑 [그랜드 토너먼트] ${player.name}이(가) 서버 최강 결정전에 참가!`);
  });
  socket.on('grand_tournament_spectate', () => {
    socket.emit('grand_tournament_spectate_result', { ok: true, emotes: SPECTATOR_SYSTEM.emoteReactions });
  });
}

module.exports = { TOURNAMENT_PHASES, CHAMPION_REWARDS, TOURNAMENT_RULES, SEASON_HALL_OF_FAME, SPECTATOR_SYSTEM, register };

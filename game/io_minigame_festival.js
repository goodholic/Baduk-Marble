// v6.7 — IO 미니게임 축제 모드
// 랜덤 미니게임 연속 플레이, 종합 점수, 파티 게임

const MAX_PLAYERS = 16;
const ROUNDS = 5;

const MINIGAMES = [
  { id: 'obstacle_race', name: '장애물 달리기', icon: '🏃🪤', duration: 60, scoring: 'time', desc: '가장 빨리 결승선에!' },
  { id: 'sumo', name: '스모 배틀', icon: '🤼', duration: 45, scoring: 'last_standing', desc: '상대를 밀어내라! 밖으로 떨어지면 탈락' },
  { id: 'hot_potato', name: '폭탄 돌리기', icon: '💣🔄', duration: 30, scoring: 'survival', desc: '폭탄을 안 들고 있으면 생존!' },
  { id: 'target_shoot', name: '사격장', icon: '🎯🔫', duration: 40, scoring: 'accuracy', desc: '과녁 맞추기! 정확도 경쟁' },
  { id: 'memory_match', name: '기억력 게임', icon: '🧠🃏', duration: 60, scoring: 'matches', desc: '카드 짝 맞추기' },
  { id: 'dance_off', name: '댄스 배틀', icon: '💃🕺', duration: 30, scoring: 'rhythm', desc: '리듬에 맞춰 춤! (방향키 입력)' },
  { id: 'fishing_contest', name: '낚시 대회', icon: '🎣🏆', duration: 90, scoring: 'weight', desc: '가장 큰 물고기를 잡아라!' },
  { id: 'cooking_race', name: '요리 경쟁', icon: '👨‍🍳⏰', duration: 60, scoring: 'quality', desc: '시간 내 최고 요리 완성!' },
  { id: 'hide_seek', name: '미니 숨바꼭질', icon: '🙈', duration: 45, scoring: 'survival', desc: '축소판 숨바꼭질' },
  { id: 'king_hill', name: '미니 언덕왕', icon: '⛰️👑', duration: 60, scoring: 'hold_time', desc: '축소판 언덕의 왕' },
  { id: 'trivia', name: '퀴즈쇼', icon: '❓🎤', duration: 60, scoring: 'correct', desc: '게임 지식 퀴즈!' },
  { id: 'maze_race', name: '미로 탈출', icon: '🌀🏁', duration: 90, scoring: 'time', desc: '랜덤 미로 탈출 경쟁' },
];

// 축제 보상
const FESTIVAL_REWARDS = {
  first:     { gold: 30000, exp: 3000, title: '축제왕', crown: true },
  top3:      { gold: 15000, exp: 1500 },
  top5:      { gold: 8000, exp: 800 },
  participate:{ gold: 3000, exp: 300 },
  perfect:   { gold: 50000, title: '미니게임 마스터', desc: '전 라운드 1위!' },
};

// 응원 시스템 (관전자)
const CHEER_EFFECTS = [
  { id: 'confetti', name: '폭죽', icon: '🎉', effect: '시각 효과만' },
  { id: 'speed_cheer', name: '속도 응원', icon: '💨👏', effect: '대상 SPD+10% (5초)' },
  { id: 'heal_cheer', name: '치유 응원', icon: '💚👏', effect: '대상 HP+5%' },
  { id: 'sabotage', name: '방해', icon: '😈👏', effect: '대상 SPD-10% (5초)', desc: '방해도 전략!' },
];

function selectMinigames(count) {
  const pool = [...MINIGAMES];
  const selected = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected;
}

function register(io, socket, player) {
  socket.on('minigame_festival_info', () => {
    socket.emit('minigame_festival_info', { games: MINIGAMES, rewards: FESTIVAL_REWARDS, cheers: CHEER_EFFECTS, rounds: ROUNDS });
  });
  socket.on('minigame_festival_join', () => {
    const games = selectMinigames(ROUNDS);
    socket.emit('minigame_festival_join_result', { ok: true, games });
    io.emit('server_msg', `🎪🎮 [미니게임 축제] ${player.name}이(가) 참가! ${ROUNDS}라운드 시작!`);
  });
}

module.exports = { MINIGAMES, FESTIVAL_REWARDS, CHEER_EFFECTS, ROUNDS, selectMinigames, register };

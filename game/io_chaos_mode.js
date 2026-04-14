// v7.0 — IO 카오스 모드 (모든 모드 랜덤 믹스!)
// 매 라운드 다른 IO 모드 규칙 적용, 예측 불가, 최종 종합 모드

const ROUNDS = 7;
const ROUND_DURATION = 60; // 각 라운드 1분

// 믹스 가능한 IO 모드 풀
const MODE_POOL = [
  { id: 'survival', name: '서바이벌', icon: '⚔️', rule: '기본 IO 전투', from: 'v1.0' },
  { id: 'infection', name: '감염', icon: '🧟', rule: '1명 감염자+전파', from: 'v5.3' },
  { id: 'battle_royale', name: '배틀로얄', icon: '🏆', rule: '자기장 수축', from: 'v5.7' },
  { id: 'dodgeball', name: '피구', icon: '⚾', rule: '공 던지기+피하기', from: 'v7.0' },
  { id: 'soccer', name: '전투 축구', icon: '⚽', rule: '골 넣기+PvP', from: 'v6.5' },
  { id: 'capture_flag', name: '깃발 쟁탈', icon: '🚩', rule: '깃발 탈취', from: 'v6.6' },
  { id: 'king_of_hill', name: '언덕왕', icon: '⛰️👑', rule: '언덕 점령', from: 'v6.2' },
  { id: 'paintball', name: '페인트볼', icon: '🎨', rule: '영역 칠하기', from: 'v6.9' },
  { id: 'hide_seek', name: '숨바꼭질', icon: '🙈', rule: '변신+숨기', from: 'v6.2' },
  { id: 'death_race', name: '데스 레이스', icon: '🏎️💀', rule: '무장 차량 경주', from: 'v6.5' },
  { id: 'musical_chairs', name: '뮤지컬 체어', icon: '🪑🎵', rule: '의자 뺏기', from: 'v6.8' },
  { id: 'roguelike', name: '로그라이크', icon: '🌀', rule: '랜덤 강화+웨이브', from: 'v5.4' },
  { id: 'rhythm', name: '리듬 전투', icon: '🎵', rule: '음악+타이밍 공격', from: 'v6.4' },
  { id: 'gravity', name: '중력 변환', icon: '🌀⬆️', rule: '중력 방향 변경', from: 'v6.8' },
  { id: 'horror', name: '호러', icon: '😱', rule: '공포+생존', from: 'v6.1' },
  { id: 'treasure', name: '보물찾기', icon: '💎', rule: '보물 경쟁 수집', from: 'v6.3' },
  { id: 'last_stand', name: '최후의 항전', icon: '🛡️🏰', rule: '타워디펜스+수비', from: 'v6.4' },
  { id: 'crafting', name: '크래프팅', icon: '🪵', rule: '맨손 시작+제작', from: 'v6.7' },
  { id: 'parkour', name: '파쿠르', icon: '🏃', rule: '장애물 레이스', from: 'v6.0' },
  { id: 'escort', name: '호위', icon: '🛡️🧑', rule: 'VIP 호위', from: 'v6.3' },
];

// 카오스 수식어 (각 라운드에 추가 변수)
const CHAOS_MODIFIERS = [
  { id: 'big_head', name: '빅헤드', effect: '머리 5배+크리 확정', icon: '🤕' },
  { id: 'low_gravity', name: '저중력', effect: '점프 5배', icon: '🌙' },
  { id: 'double_speed', name: '배속', effect: '모든 속도 2배', icon: '⏩' },
  { id: 'one_hit', name: '원히트', effect: '전원 HP 1!', icon: '💀' },
  { id: 'giant', name: '거인', effect: '캐릭터 3배 크기', icon: '🗿' },
  { id: 'tiny', name: '꼬마', effect: '캐릭터 0.3배 크기', icon: '🔬' },
  { id: 'mirror', name: '거울', effect: '조작 좌우 반전!', icon: '🪞' },
  { id: 'random_weapon', name: '랜덤 무기', effect: '10초마다 무기 변경', icon: '🔄' },
  { id: 'merc_madness', name: '용병 폭주', effect: '전원 용병 자동 소환!', icon: '⚔️🌀' },
  { id: 'all_ultimate', name: '궁극기 폭발', effect: '전원 궁극기 쿨다운 0!', icon: '💥💥' },
];

// 카오스 보상
const CHAOS_REWARDS = {
  first:     { gold: 40000, exp: 4000, title: '카오스 마스터', frame: 'chaos_king' },
  top3:      { gold: 20000, exp: 2000 },
  most_adaptable: { gold: 15000, title: '적응의 왕', desc: '가장 다양한 모드에서 TOP3' },
  chaos_survivor: { gold: 10000, desc: '전 라운드 생존' },
};

function selectRounds() {
  const pool = [...MODE_POOL];
  const rounds = [];
  for (let i = 0; i < ROUNDS && pool.length > 0; i++) {
    const modeIdx = Math.floor(Math.random() * pool.length);
    const modIdx = Math.floor(Math.random() * CHAOS_MODIFIERS.length);
    rounds.push({ mode: pool.splice(modeIdx, 1)[0], modifier: CHAOS_MODIFIERS[modIdx], round: i + 1 });
  }
  return rounds;
}

function register(io, socket, player) {
  socket.on('chaos_mode_info', () => {
    socket.emit('chaos_mode_info', { modes: MODE_POOL, modifiers: CHAOS_MODIFIERS, rewards: CHAOS_REWARDS, rounds: ROUNDS });
  });
  socket.on('chaos_mode_join', () => {
    const rounds = selectRounds();
    socket.emit('chaos_mode_join_result', { ok: true, rounds });
    io.emit('server_msg', `🌀💥 [카오스 모드] ${player.name}이(가) 참가! ${ROUNDS}라운드 랜덤 모드 시작!`);
  });
}

module.exports = { MODE_POOL, CHAOS_MODIFIERS, CHAOS_REWARDS, ROUNDS, selectRounds, register };

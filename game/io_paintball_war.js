// v6.9 — IO 페인트볼 전쟁
// 2~4팀 페인트 전투, 영역 칠하기 + 적 태그, 스플래툰 감성

const MAX_PLAYERS = 16;
const TEAMS = 4;
const MATCH_DURATION = 240;

const PAINT_COLORS = [
  { id: 'red', name: '레드팀', icon: '🔴', color: '#ff0000' },
  { id: 'blue', name: '블루팀', icon: '🔵', color: '#0000ff' },
  { id: 'green', name: '그린팀', icon: '🟢', color: '#00ff00' },
  { id: 'yellow', name: '옐로우팀', icon: '🟡', color: '#ffff00' },
];

const PAINT_WEAPONS = [
  { id: 'paint_gun', name: '페인트건', icon: '🔫🎨', range: 150, rate: 5, spread: 2, desc: '기본 페인트 발사' },
  { id: 'paint_roller', name: '페인트 롤러', icon: '🖌️', range: 30, rate: 0, spread: 5, desc: '넓은 범위 칠하기! 근접' },
  { id: 'paint_sniper', name: '스나이퍼', icon: '🎯🎨', range: 400, rate: 1, spread: 1, desc: '장거리 정밀 사격' },
  { id: 'paint_shotgun', name: '샷건', icon: '💥🎨', range: 80, rate: 3, spread: 8, desc: '근거리 넓은 범위' },
  { id: 'paint_bomb', name: '페인트 폭탄', icon: '💣🎨', range: 0, aoe: 10, cooldown: 15, desc: '넓은 범위 폭발!' },
  { id: 'paint_stream', name: '스프레이', icon: '💨🎨', range: 100, rate: 10, spread: 3, desc: '연속 분사! 빠른 칠하기' },
  { id: 'mega_roller', name: '메가 롤러', icon: '🖌️👑', range: 50, rate: 0, spread: 10, desc: '초대형 롤러! 느리지만 광범위', ultimate: true },
];

// 페인트 특수 능력
const PAINT_ABILITIES = [
  { id: 'swim', name: '페인트 수영', icon: '🏊🎨', desc: '자기 팀 색 위에서 이동 2배+은신', passive: true },
  { id: 'splat_bomb', name: '스플랫 폭탄', icon: '💥🎨', cooldown: 20, desc: '범위 페인트 폭발+적 태그' },
  { id: 'super_jump', name: '슈퍼 점프', icon: '🦘🎨', cooldown: 30, desc: '아군 위치로 즉시 점프!' },
  { id: 'ink_armor', name: '잉크 갑옷', icon: '🛡️🎨', cooldown: 45, desc: '팀 전체 보호막 (1회 피격 방지)' },
  { id: 'kraken_form', name: '크라켄 모드', icon: '🦑🎨', cooldown: 60, desc: '10초간 무적+초대형 칠하기!', ultimate: true },
];

// 승리 조건: 영역 비율
const WIN_CONDITION = { type: 'territory_percent', desc: '매치 종료 시 가장 많은 영역 = 승리' };

// 보상
const PAINT_REWARDS = {
  winner_team: { gold: 20000, exp: 2000, paint: 100 },
  mvp: { gold: 30000, title: '페인트 마스터', frame: 'paint_king' },
  most_paint: { gold: 15000, desc: '가장 넓은 영역 칠함' },
  most_tags: { gold: 10000, desc: '가장 많이 태그함' },
};

function register(io, socket, player) {
  socket.on('paintball_info', () => {
    socket.emit('paintball_info', { colors: PAINT_COLORS, weapons: PAINT_WEAPONS, abilities: PAINT_ABILITIES, winCondition: WIN_CONDITION, rewards: PAINT_REWARDS });
  });
  socket.on('paintball_join', (data) => {
    socket.emit('paintball_join_result', { ok: true, team: PAINT_COLORS.find(c => c.id === data.team) });
    io.emit('server_msg', `🎨⚔️ [페인트볼] ${player.name}이(가) ${data.team}팀으로 참가! 칠해라!`);
  });
}

module.exports = { PAINT_COLORS, PAINT_WEAPONS, PAINT_ABILITIES, WIN_CONDITION, PAINT_REWARDS, register };

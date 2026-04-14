// v7.0 — IO 피구 전쟁 (Dodgeball)
// 2팀 피구, 공 던지기+피하기+캐치, 파워볼+특수볼

const PLAYERS_PER_TEAM = 6;
const MATCH_DURATION = 180;
const BALLS_PER_ROUND = 3;

const BALL_TYPES = [
  { id: 'normal', name: '일반 공', icon: '⚾', dmg: 100, spd: 8, desc: '기본 피구공' },
  { id: 'fire_ball', name: '화염 공', icon: '🔥⚾', dmg: 150, spd: 7, effect: '맞으면 3초 화상', rarity: 'uncommon' },
  { id: 'ice_ball', name: '빙결 공', icon: '❄️⚾', dmg: 80, spd: 6, effect: '맞으면 2초 빙결', rarity: 'uncommon' },
  { id: 'thunder_ball', name: '번개 공', icon: '⚡⚾', dmg: 120, spd: 12, effect: '초고속! 피하기 어려움', rarity: 'rare' },
  { id: 'gravity_ball', name: '중력 공', icon: '🌑⚾', dmg: 200, spd: 4, effect: '느리지만 추적! 유도탄', rarity: 'rare' },
  { id: 'split_ball', name: '분열 공', icon: '⚾⚾⚾', dmg: 60, spd: 7, effect: '3개로 분열!', rarity: 'epic' },
  { id: 'mega_ball', name: '메가 공', icon: '🏐💥', dmg: 300, spd: 5, effect: '거대! 범위 피해', rarity: 'epic' },
  { id: 'phantom_ball', name: '유령 공', icon: '👻⚾', dmg: 150, spd: 8, effect: '투명 공! 보이지 않음!', rarity: 'legendary' },
];

// 피구 스킬
const DODGE_SKILLS = [
  { id: 'power_throw', name: '파워 스로우', icon: '💪⚾', cooldown: 10, desc: '초강력 투구 (DMG 2배)' },
  { id: 'curve_throw', name: '커브 스로우', icon: '🌀⚾', cooldown: 8, desc: '휘어지는 공!' },
  { id: 'catch', name: '캐치', icon: '🤲', cooldown: 5, desc: '공 잡기! 성공 시 던진 자 아웃' },
  { id: 'dodge_roll', name: '구르기 회피', icon: '💨', cooldown: 3, desc: '빠른 회피 구르기' },
  { id: 'shield_block', name: '방어막', icon: '🛡️', cooldown: 15, desc: '1회 공 차단' },
  { id: 'multi_throw', name: '연속 투구', icon: '⚾⚾⚾', cooldown: 20, desc: '3발 연속 투구!' },
  { id: 'team_ultimate', name: '팀 궁극기', icon: '⚾💥🔥', cooldown: 60, desc: '팀 전원 동시 투구! 피할 수 없다!', ultimate: true },
];

// 보상
const DODGE_REWARDS = {
  winner: { gold: 15000, exp: 1500, title: '피구왕' },
  mvp: { gold: 25000, title: '피구 MVP', desc: '최다 아웃시킴' },
  catch_king: { gold: 10000, title: '캐치 마스터', desc: '최다 캐치' },
  untouchable: { gold: 20000, title: '무적의 몸', desc: '한 번도 안 맞음!' },
};

function register(io, socket, player) {
  socket.on('dodgeball_info', () => {
    socket.emit('dodgeball_info', { balls: BALL_TYPES, skills: DODGE_SKILLS, rewards: DODGE_REWARDS, teamSize: PLAYERS_PER_TEAM });
  });
  socket.on('dodgeball_join', () => {
    socket.emit('dodgeball_join_result', { ok: true });
    io.emit('server_msg', `⚾💥 [피구 전쟁] ${player.name}이(가) 피구 참가! 피해라!`);
  });
}

module.exports = { BALL_TYPES, DODGE_SKILLS, DODGE_REWARDS, register };

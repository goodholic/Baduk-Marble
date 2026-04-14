// v6.5 — IO 전투 축구 모드
// 축구+전투! 공 차기+상대 공격, 골 넣기+킬, 용병 포지션

const MAX_PLAYERS = 10; // 5v5
const MATCH_DURATION = 300; // 5분 (전후반 각 2.5분)
const FIELD_SIZE = { w: 1200, h: 800 };

const POSITIONS = {
  striker:    { name: '공격수', icon: '⚽⚔️', bonus: { shootPow: 1.3, spd: 1.1 }, desc: '골 넣기 특화' },
  midfielder:{ name: '미드필더', icon: '⚽🔄', bonus: { passAcc: 1.2, allStat: 1.05 }, desc: '균형 잡힌 올라운더' },
  defender:  { name: '수비수', icon: '⚽🛡️', bonus: { tackle: 1.3, def: 1.2 }, desc: '태클+방어 특화' },
  goalkeeper:{ name: '골키퍼', icon: '⚽🧤', bonus: { saveRate: 1.5, hp: 1.3 }, desc: '골문 수호! 세이브 특화' },
  captain:   { name: '주장', icon: '⚽👑', bonus: { teamBuff: 1.08, shootPow: 1.1 }, desc: '팀 전체 버프+리더' },
};

// 축구 스킬 (전투+축구 하이브리드)
const SOCCER_SKILLS = [
  { id: 'power_shot', name: '파워 슛', icon: '⚽💥', effect: '초강력 슈팅 (골키퍼 뚫기 60%)', cooldown: 20, type: 'shot' },
  { id: 'curve_shot', name: '커브 슛', icon: '⚽🌀', effect: '벽을 휘는 슈팅 (골키퍼 혼란)', cooldown: 15, type: 'shot' },
  { id: 'header', name: '헤딩', icon: '⚽🤕', effect: '공중볼 헤딩 슈팅', cooldown: 10, type: 'shot' },
  { id: 'tackle', name: '슬라이딩 태클', icon: '⚽🦶', effect: '상대+공 동시 공격', cooldown: 12, type: 'defense' },
  { id: 'through_pass', name: '쓰루패스', icon: '⚽➡️', effect: '수비 뚫는 킬패스', cooldown: 15, type: 'pass' },
  { id: 'bicycle_kick', name: '바이시클 킥', icon: '⚽🔄🦶', effect: '오버헤드 킥! 골 확률 80%!', cooldown: 60, type: 'shot', ultimate: true },
  { id: 'wall_pass', name: '벽 패스', icon: '⚽🧱', effect: '원투 패스로 수비 돌파', cooldown: 10, type: 'pass' },
  { id: 'body_check', name: '몸싸움', icon: '⚽💪', effect: '상대 밀어내기 (공 탈취)', cooldown: 8, type: 'defense' },
];

// 용병 소환 (전반전에 1회)
const MERC_SUMMON_RULES = { perHalf: 1, duration: 30, desc: '전반/후반 각 1회, 30초간 용병 소환!' };

// 골 이벤트 (골 넣으면 발동)
const GOAL_EVENTS = [
  { goals: 1, name: '선제골!', effect: '팀 전체 사기+10%', icon: '⚽🎉' },
  { goals: 3, name: '해트트릭!', effect: '슛 파워+30%', icon: '⚽⚽⚽' },
  { goals: 5, name: '대학살!', effect: '팀 전체+15%', icon: '⚽💀', serverAnnounce: true },
];

// 보상
const SOCCER_REWARDS = {
  winner: { gold: 20000, exp: 2000, title: '축구왕' },
  mvp: { gold: 30000, exp: 3000, title: 'MVP', frame: 'soccer_mvp' },
  hat_trick: { gold: 15000, title: '해트트릭 히어로' },
  best_goalkeeper: { gold: 10000, title: '철벽 골키퍼' },
  loser: { gold: 5000, exp: 500 },
};

function register(io, socket, player) {
  socket.on('soccer_info', () => {
    socket.emit('soccer_info', { positions: POSITIONS, skills: SOCCER_SKILLS, summon: MERC_SUMMON_RULES, goalEvents: GOAL_EVENTS, rewards: SOCCER_REWARDS, field: FIELD_SIZE });
  });
  socket.on('soccer_join', (data) => {
    player.soccerPosition = data.position || 'midfielder';
    socket.emit('soccer_join_result', { ok: true, position: POSITIONS[player.soccerPosition] });
    io.emit('server_msg', `⚽ [전투 축구] ${player.name}이(가) ${POSITIONS[player.soccerPosition]?.name}으로 참가!`);
  });
}

module.exports = { POSITIONS, SOCCER_SKILLS, MERC_SUMMON_RULES, GOAL_EVENTS, SOCCER_REWARDS, register };

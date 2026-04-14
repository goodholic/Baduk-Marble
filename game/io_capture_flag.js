// v6.6 — IO 깃발 쟁탈전 모드
// 2팀, 상대 깃발 탈취 후 자기 진영으로 복귀, IO 전투+전략

const TEAMS = 2;
const PLAYERS_PER_TEAM = 8;
const MATCH_DURATION = 360;
const CAPTURES_TO_WIN = 3;

const CTF_MAPS = [
  { id: 'twin_forts', name: '쌍둥이 요새', icon: '🏰🏰', size: 1500, features: ['3개 통로', '중앙 파워업'], desc: '대칭 맵, 3경로 전략' },
  { id: 'river_crossing', name: '강 횡단', icon: '🌊🚩', size: 1200, features: ['강(수영 느림)', '다리 2개', '비밀 통로'], desc: '강을 건너라!' },
  { id: 'forest_maze', name: '숲 미로', icon: '🌲🚩', size: 1800, features: ['미로 구조', '안개', '지름길'], desc: '길을 잃으면 끝!' },
  { id: 'sky_islands', name: '하늘 섬', icon: '☁️🚩', size: 1400, features: ['떨어지면 리스폰', '텔레포터', '이동 발판'], desc: '공중 섬 사이 이동' },
  { id: 'lava_field', name: '용암 지대', icon: '🌋🚩', size: 1000, features: ['용암 지역', '안전 경로 좁음', '화산 폭발'], desc: '좁은 안전 구간+용암!' },
];

// 역할
const CTF_ROLES = {
  runner:   { name: '러너', icon: '🏃🚩', bonus: { spd: 1.3, flagCarrySpd: 1.0 }, desc: '깃발 운반 특화' },
  defender: { name: '수비수', icon: '🛡️🚩', bonus: { def: 1.2, flagZoneBuff: 1.15 }, desc: '깃발 지역 방어' },
  attacker: { name: '공격수', icon: '⚔️🚩', bonus: { atk: 1.2 }, desc: '적 깃발 지역 돌파' },
  sniper:   { name: '저격수', icon: '🎯🚩', bonus: { range: 1.5, critDmg: 1.3 }, desc: '원거리 깃발 운반자 저격' },
  support:  { name: '서포터', icon: '💚🚩', bonus: { healPow: 1.3, teamBuff: 1.05 }, desc: '러너 호위+치유' },
  saboteur: { name: '파괴공작', icon: '💣🚩', bonus: { trapPow: 1.3 }, desc: '적 경로에 함정 설치' },
};

// 깃발 운반 규칙
const FLAG_RULES = {
  carryPenalty: { spdMul: 0.7, noStealth: true, visible: true }, // 깃발 들면 느려짐+은신불가+위치공개
  dropOnDeath: true,
  flagReturn: { method: '아군이 터치하면 복귀', timer: 30 }, // 30초 후 자동 복귀
  score: { capture: 1, kill: 0.1, flagReturn: 0.3 },
};

// 파워업 (맵에 스폰)
const POWERUPS = [
  { id: 'speed_flag', name: '깃발 부스트', icon: '🚩💨', effect: '깃발 운반 패널티 해제 10초', rarity: 'rare' },
  { id: 'invisibility', name: '투명화', icon: '👻', effect: '10초 은신 (깃발 든 채로!)', rarity: 'epic' },
  { id: 'teleport_base', name: '기지 귀환', icon: '🌀🏠', effect: '즉시 자기 기지로! (깃발 포함)', rarity: 'legendary' },
  { id: 'shield', name: '보호막', icon: '🔰', effect: '다음 피격 1회 무효', rarity: 'common' },
  { id: 'double_points', name: '더블 점수', icon: '×2️⃣', effect: '다음 깃발 캡처 2점!', rarity: 'epic' },
];

// 보상
const CTF_REWARDS = {
  winner: { gold: 25000, exp: 2500, title: '깃발의 왕' },
  mvp:    { gold: 35000, title: 'CTF MVP', frame: 'ctf_champion' },
  most_captures: { gold: 15000, title: '깃발 사냥꾼' },
  most_returns:  { gold: 10000, title: '수호자' },
  loser:  { gold: 5000, exp: 500 },
};

function register(io, socket, player) {
  socket.on('ctf_info', () => {
    socket.emit('ctf_info', { maps: CTF_MAPS, roles: CTF_ROLES, flagRules: FLAG_RULES, powerups: POWERUPS, rewards: CTF_REWARDS, capturesToWin: CAPTURES_TO_WIN });
  });
  socket.on('ctf_join', (data) => {
    player.ctfRole = data.role || 'attacker';
    socket.emit('ctf_join_result', { ok: true, role: CTF_ROLES[player.ctfRole] });
    io.emit('server_msg', `🚩 [깃발 쟁탈] ${player.name}이(가) ${CTF_ROLES[player.ctfRole]?.name}으로 참가!`);
  });
}

module.exports = { CTF_MAPS, CTF_ROLES, FLAG_RULES, POWERUPS, CTF_REWARDS, CAPTURES_TO_WIN, register };

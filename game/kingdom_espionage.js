// v5.8 — 영지 첩보 조직 시스템
// 첩보 요원 양성, 적 영지 잠입, 정보 수집, 교란, 반첩

const MAX_AGENTS = 5;

// 첩보 요원 등급
const AGENT_RANKS = [
  { rank: 1, name: '견습 요원', icon: '🕵️', skills: ['기본 정찰'], cost: 3000, trainTime: 300 },
  { rank: 2, name: '요원', icon: '🕵️‍♂️', skills: ['정보 수집', '미행'], cost: 8000, trainTime: 600 },
  { rank: 3, name: '특수 요원', icon: '🕵️‍♂️⭐', skills: ['교란 공작', '위장 침투'], cost: 20000, trainTime: 1200 },
  { rank: 4, name: '마스터 요원', icon: '🕵️‍♂️🌟', skills: ['암살', '정보 조작', '이중간첩'], cost: 50000, trainTime: 2400 },
  { rank: 5, name: '그림자 수장', icon: '🕵️‍♂️👑', skills: ['조직 장악', '쿠데타 지원'], cost: 100000, trainTime: 3600 },
];

// 첩보 임무
const ESPIONAGE_MISSIONS = [
  { id: 'recon', name: '정찰', rank: 1, duration: 300, success: 0.8, reward: '적 영지 건물/자원 정보', risk: '발각 시 요원 1일 부재' },
  { id: 'steal_tech', name: '기술 탈취', rank: 2, duration: 600, success: 0.5, reward: '적 연구 1개 복사', risk: '발각 시 외교 관계 악화' },
  { id: 'sabotage', name: '파괴 공작', rank: 3, duration: 900, success: 0.4, reward: '적 건물 1개 레벨 -1', risk: '발각 시 전쟁 선포 가능' },
  { id: 'propaganda', name: '선전 공작', rank: 2, duration: 600, success: 0.6, reward: '적 영지 번영도 -10', risk: '발각 시 요원 체포' },
  { id: 'recruit_spy', name: '내통자 포섭', rank: 3, duration: 1200, success: 0.3, reward: '적 영지 실시간 정보 3일', risk: '발각 시 역스파이 당함' },
  { id: 'assassination', name: '요인 암살', rank: 4, duration: 1800, success: 0.2, reward: '적 핵심 용병 1명 부상 (3일)', risk: '발각 시 요원 사망 + 전쟁' },
  { id: 'coup', name: '쿠데타 지원', rank: 5, duration: 3600, success: 0.1, reward: '적 길드 분열 (길드원 탈퇴 유도)', risk: '실패 시 요원 영구 손실 + 서버 공지' },
];

// 반첩 시스템
const COUNTER_ESPIONAGE = [
  { id: 'patrol', name: '순찰 강화', cost: 2000, effect: '침투 성공률 -15%', duration: 3600 },
  { id: 'cctv', name: '감시 마법진', cost: 5000, effect: '요원 침입 시 즉시 알림', duration: 7200 },
  { id: 'double_agent', name: '이중 요원', cost: 10000, effect: '적 요원 포획 → 역정보 제공', duration: 3600 },
  { id: 'safe_room', name: '기밀실', cost: 15000, effect: '핵심 정보 탈취 불가', permanent: true },
  { id: 'purge', name: '숙청', cost: 8000, effect: '내통자 전원 제거 (5% 확률 무고한 시민 피해)', oneTime: true },
];

function trainAgent(player) {
  const agents = player.agents || [];
  if (agents.length >= MAX_AGENTS) return { ok: false, reason: `최대 ${MAX_AGENTS}명` };
  const rank = AGENT_RANKS[0];
  if ((player.gold || 0) < rank.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= rank.cost;
  agents.push({ id: `agent_${Date.now()}`, rank: 1, status: 'ready', trained: Date.now() });
  player.agents = agents;
  return { ok: true, agent: rank };
}

function register(io, socket, player) {
  socket.on('espionage_info', () => {
    socket.emit('espionage_info', { ranks: AGENT_RANKS, missions: ESPIONAGE_MISSIONS, counter: COUNTER_ESPIONAGE, agents: player.agents || [] });
  });
  socket.on('espionage_train', () => {
    const result = trainAgent(player);
    socket.emit('espionage_train_result', result);
  });
  socket.on('espionage_mission', (data) => {
    const mission = ESPIONAGE_MISSIONS.find(m => m.id === data.missionId);
    if (!mission) return socket.emit('espionage_mission_result', { ok: false });
    const success = Math.random() < mission.success;
    socket.emit('espionage_mission_result', { ok: true, success, mission: mission.name, reward: success ? mission.reward : null, risk: !success ? mission.risk : null });
    if (success && mission.rank >= 4) io.emit('server_msg', `🕵️ [첩보] 누군가의 비밀 임무가 성공했다...`);
  });
}

module.exports = { AGENT_RANKS, ESPIONAGE_MISSIONS, COUNTER_ESPIONAGE, MAX_AGENTS, trainAgent, register };

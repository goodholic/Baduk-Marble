// v6.9 — 감정 진화 시스템
// 감정이 극한에 달하면 새로운 상위 감정으로 진화, 궁극 감정

const EVOLVED_EMOTIONS = [
  { id: 'nirvana', name: '열반', icon: '🧘✨', from: ['calm', 'inspired'], req: { calmTurns: 100 },
    stats: { allStat: 1.2, immune: ['fear', 'despair', 'berserk'] }, skill: '완전한 평화(전장 정지 5초)',
    desc: '모든 감정을 초월한 궁극의 평온', tier: 'ultimate' },
  { id: 'divine_rage', name: '신의 분노', icon: '⚡👑', from: ['rage', 'berserk'], req: { rageTurns: 80 },
    stats: { atk: 1.5, spd: 1.3, def: 0.7 }, skill: '천벌(맵 전체 번개, HP 40%)',
    desc: '분노가 극에 달해 신의 경지', tier: 'ultimate' },
  { id: 'absolute_zero', name: '절대영도', icon: '❄️💀', from: ['fear', 'despair'], req: { despairTurns: 60 },
    stats: { def: 1.4, freezeAura: true }, skill: '절대영도(주변 전원 빙결 5초)',
    desc: '공포와 절망을 넘어선 극한의 냉정', tier: 'ultimate' },
  { id: 'euphoria', name: '황홀경', icon: '🌈💫', from: ['joy', 'inspired'], req: { joyTurns: 70 },
    stats: { allStat: 1.15, teamBuff: 1.1 }, skill: '축복의 파동(아군 전원 전체+15%)',
    desc: '기쁨이 극에 달한 황홀한 상태', tier: 'ultimate' },
  { id: 'void_mind', name: '공허의 마음', icon: '🌀🧠', from: ['calm', 'despair'], req: { emotionChanges: 50 },
    stats: { penetration: 0.3, trueDmg: 100 }, skill: '존재 소거(단일 대상, 방어 무시 HP 50%)',
    desc: '감정이 사라진 텅 빈 상태, 오히려 최강', tier: 'ultimate', hidden: true },
];

// 감정 진화 조건
const EVOLUTION_TRIGGERS = [
  { emotion: 'calm', turns: 100, desc: '100턴 연속 평온 유지 → 열반' },
  { emotion: 'rage', turns: 80, desc: '80턴 연속 분노/광폭 → 신의 분노' },
  { emotion: 'despair', turns: 60, desc: '60턴 절망 유지 → 절대영도' },
  { emotion: 'joy', turns: 70, desc: '70턴 기쁨/영감 → 황홀경' },
  { emotion: 'mixed', changes: 50, desc: '50회 감정 변화 → 공허의 마음 (히든!)', hidden: true },
];

// 감정 진화 보상
const EVOLUTION_REWARDS = {
  first_evolution: { gold: 50000, exp: 5000, title: '감정의 초월자' },
  all_evolved:     { gold: 200000, title: '감정의 신', frame: 'emotion_god', desc: '5종 진화 감정 모두 해금' },
  hidden_found:    { gold: 100000, title: '공허의 발견자', desc: '히든 감정 발견!' },
};

// 진화 감정 → 이면 연동
const ALTER_SYNERGY = {
  nirvana: { alterBoost: 'light', desc: '열반+빛의 이면 = 성스러운 존재' },
  divine_rage: { alterBoost: 'dark', desc: '신의 분노+어둠 이면 = 파멸의 신' },
  absolute_zero: { alterBoost: 'chaos', desc: '절대영도+혼돈 이면 = 엔트로피' },
  euphoria: { alterBoost: 'light', desc: '황홀경+빛 이면 = 천사의 환희' },
  void_mind: { alterBoost: 'chaos', desc: '공허+혼돈 = 차원의 종말자' },
};

function checkEvolution(merc) {
  const emotion = merc.emotion || 'calm';
  const turns = merc.emotionTurns || 0;
  const changes = merc.emotionChanges || 0;
  for (const evo of EVOLVED_EMOTIONS) {
    if (evo.from.includes(emotion) && turns >= (evo.req.calmTurns || evo.req.rageTurns || evo.req.despairTurns || evo.req.joyTurns || 999)) {
      return { canEvolve: true, evolution: evo };
    }
    if (evo.req.emotionChanges && changes >= evo.req.emotionChanges) {
      return { canEvolve: true, evolution: evo };
    }
  }
  return { canEvolve: false };
}

function evolveEmotion(merc, evoId) {
  const evo = EVOLVED_EMOTIONS.find(e => e.id === evoId);
  if (!evo) return { ok: false, reason: '알 수 없는 진화 감정' };
  merc.evolvedEmotion = evoId;
  merc.emotion = evoId;
  return { ok: true, evolution: evo };
}

function register(io, socket, player) {
  socket.on('emotion_evolution_info', () => {
    socket.emit('emotion_evolution_info', { evolutions: EVOLVED_EMOTIONS, triggers: EVOLUTION_TRIGGERS, rewards: EVOLUTION_REWARDS, alterSynergy: ALTER_SYNERGY });
  });
  socket.on('emotion_evolve', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('emotion_evolve_result', { ok: false });
    const result = evolveEmotion(merc, data.evoId);
    socket.emit('emotion_evolve_result', result);
    if (result.ok) io.emit('server_msg', `🧘✨ [감정 진화!] ${merc.name}의 감정이 "${result.evolution.name}"(으)로 진화!`);
  });
}

module.exports = { EVOLVED_EMOTIONS, EVOLUTION_TRIGGERS, EVOLUTION_REWARDS, ALTER_SYNERGY, checkEvolution, evolveEmotion, register };

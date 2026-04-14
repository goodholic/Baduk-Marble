// v6.8 — 메아리(Echo) 시스템
// 과거 전투 기록이 NPC 고스트로 재현, 자기 고스트와 대결

const MAX_ECHOES = 10;

const ECHO_TYPES = [
  { id: 'personal', name: '나의 메아리', icon: '👤🔮', desc: '과거 최고 기록의 나 자신과 대결!', source: 'my_best' },
  { id: 'rival', name: '라이벌의 메아리', icon: '⚔️🔮', desc: '다른 플레이어의 최고 기록과 대결', source: 'other_best' },
  { id: 'legend', name: '전설의 메아리', icon: '👑🔮', desc: '서버 역대 TOP10의 고스트와 대결!', source: 'server_top' },
  { id: 'boss', name: '보스의 메아리', icon: '👹🔮', desc: '과거에 처치한 보스가 더 강해져서 재등장', source: 'past_boss' },
  { id: 'future', name: '미래의 메아리', icon: '⏰🔮', desc: '현재보다 20% 강한 자신! 미래를 이겨라', source: 'future_self' },
];

// 메아리 대결 보상
const ECHO_REWARDS = {
  beat_self:    { gold: 10000, exp: 1000, desc: '과거의 나를 넘어섬!', title: '자기 초월' },
  beat_rival:   { gold: 15000, exp: 1500, desc: '라이벌 메아리 격파!' },
  beat_legend:  { gold: 30000, exp: 3000, title: '전설에 도전한 자', desc: 'TOP10 메아리 격파!' },
  beat_boss:    { gold: 20000, exp: 2000, item: 'echo_shard', desc: '강화 보스 메아리 격파' },
  beat_future:  { gold: 25000, exp: 2500, title: '미래를 앞선 자', desc: '미래의 나를 이김!' },
  lose_to_self: { gold: 3000, desc: '과거의 나에게 패배... 더 강해지자', motivation: true },
};

// 메아리 강화 (대결할수록 강해지는 고스트)
const ECHO_SCALING = {
  perDefeat: 0.05,    // 고스트에게 질 때마다 고스트 +5%
  perVictory: -0.02,  // 이기면 고스트 -2% (약간 약해짐)
  maxScale: 2.0,      // 최대 2배
  minScale: 0.8,      // 최소 0.8배
};

// 메아리 수집 (고스트 데이터 저장)
const ECHO_COLLECTION = [
  { count: 5, name: '메아리 수집가', bonus: { exp: 1.05 } },
  { count: 15, name: '시간의 관찰자', bonus: { exp: 1.1, echoInsight: true } },
  { count: 30, name: '메아리 마스터', bonus: { exp: 1.15, echoSummon: true }, desc: '전투에서 메아리를 아군으로 소환!' },
  { count: 50, name: '시간의 지배자', bonus: { exp: 1.2, echoFusion: true }, desc: '메아리와 합체 가능!', title: true },
];

// 메아리 소환 (마스터리 30+ 달성 시)
const ECHO_SUMMON = {
  duration: 20,
  statRatio: 0.6,  // 본체의 60%
  cooldown: 300,
  desc: '과거의 자신을 아군으로 소환!',
};

function createEcho(player) {
  return {
    id: `echo_${Date.now()}`,
    name: `${player.name}의 메아리`,
    level: player.level || 1,
    stats: { hp: player.hp || 500, atk: player.atk || 50, def: player.def || 30 },
    recorded: Date.now(),
    scale: 1.0,
  };
}

function battleEcho(player, echoType) {
  const eType = ECHO_TYPES.find(e => e.id === echoType);
  if (!eType) return { ok: false, reason: '알 수 없는 메아리' };
  player.echoBattles = (player.echoBattles || 0) + 1;
  const collection = [...ECHO_COLLECTION].reverse().find(c => player.echoBattles >= c.count);
  return { ok: true, echoType: eType, collection, battles: player.echoBattles };
}

function register(io, socket, player) {
  socket.on('echo_info', () => {
    socket.emit('echo_info', { types: ECHO_TYPES, rewards: ECHO_REWARDS, scaling: ECHO_SCALING, collection: ECHO_COLLECTION, summon: ECHO_SUMMON, battles: player.echoBattles || 0 });
  });
  socket.on('echo_battle', (data) => {
    const result = battleEcho(player, data.echoType);
    socket.emit('echo_result', result);
    if (result.ok) io.emit('server_msg', `🔮 [메아리] ${player.name}이(가) "${result.echoType.name}"와 대결!`);
  });
  socket.on('echo_record', () => {
    const echo = createEcho(player);
    player.echoRecords = player.echoRecords || [];
    if (player.echoRecords.length >= MAX_ECHOES) player.echoRecords.shift();
    player.echoRecords.push(echo);
    socket.emit('echo_record_result', { ok: true, echo });
  });
}

module.exports = { ECHO_TYPES, ECHO_REWARDS, ECHO_SCALING, ECHO_COLLECTION, ECHO_SUMMON, createEcho, battleEcho, register };

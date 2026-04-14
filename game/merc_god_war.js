// v5.6 — 신들의 전쟁 시스템
// 6신 진영 중 하나 선택 → 진영 간 대전쟁 → 신의 축복/분노

const GOD_FACTIONS = [
  { id: 'sol', name: '태양신 솔', icon: '☀️', element: 'fire', domain: '힘과 정의',
    blessing: { atk: 1.15, fireDmg: 1.3 }, wrath: { burn: true, desc: '배신 시 화상 지속' },
    champion: { name: '태양의 기사', stats: { hp: 12000, atk: 500 } },
    followers: '전사/기사 계열 선호', lore: '만물을 밝히는 태양, 정의의 심판자' },
  { id: 'luna', name: '달의 여신 루나', icon: '🌙', element: 'ice', domain: '지혜와 마법',
    blessing: { matk: 1.2, mpRegen: 2.0 }, wrath: { silence: true, desc: '배신 시 침묵(마법 불가)' },
    champion: { name: '달빛 마녀', stats: { hp: 8000, atk: 400, matk: 600 } },
    followers: '마법사 계열 선호', lore: '밤을 다스리는 신비의 여신' },
  { id: 'terra', name: '대지신 테라', icon: '🌍', element: 'earth', domain: '풍요와 수호',
    blessing: { def: 1.2, hp: 1.15 }, wrath: { petrify: true, desc: '배신 시 석화 3초' },
    champion: { name: '대지의 수호자', stats: { hp: 20000, atk: 300, def: 500 } },
    followers: '탱커/수호자 계열 선호', lore: '모든 생명의 어머니' },
  { id: 'tempest', name: '폭풍신 템페스트', icon: '⛈️', element: 'thunder', domain: '속도와 파괴',
    blessing: { spd: 1.25, critDmg: 1.3 }, wrath: { stun: true, desc: '배신 시 번개 낙하' },
    champion: { name: '폭풍의 전령', stats: { hp: 9000, atk: 450, spd: 12 } },
    followers: '암살자/궁수 계열 선호', lore: '분노하면 세계가 흔들리는 폭풍의 왕' },
  { id: 'mortis', name: '죽음신 모르티스', icon: '💀', element: 'dark', domain: '죽음과 부활',
    blessing: { lifeSteal: 0.15, revive: true }, wrath: { curse: true, desc: '배신 시 HP 서서히 감소' },
    champion: { name: '사신', stats: { hp: 10000, atk: 550 } },
    followers: '네크로맨서/암살자 선호', lore: '삶과 죽음의 경계를 관장하는 자' },
  { id: 'aurora', name: '빛의 여신 오로라', icon: '✨', element: 'holy', domain: '치유와 기적',
    blessing: { healPow: 1.4, shieldOnHeal: true }, wrath: { blind: true, desc: '배신 시 실명 5초' },
    champion: { name: '빛의 천사', stats: { hp: 11000, atk: 350, healPow: 800 } },
    followers: '힐러/성직자 계열 선호', lore: '희망의 빛, 절망 속 기적을 내리는 여신' },
];

// 신전 전쟁 (주간 이벤트)
const GOD_WAR_PHASES = [
  { phase: 1, name: '선교', duration: 2, desc: '신도 모집, 진영 확장', objective: '최다 신도 진영 보너스' },
  { phase: 2, name: '성전', duration: 3, desc: '진영 간 IO 전투, 영토 쟁탈', objective: '영토 점령으로 점수' },
  { phase: 3, name: '신의 시련', duration: 1, desc: '각 진영 보스 레이드', objective: '진영 보스 처치 시간 경쟁' },
  { phase: 4, name: '최종 결전', duration: 1, desc: '상위 2진영 최종 대결', objective: '승리 진영 = 시즌 축복' },
];

// 신앙 포인트 (기여도)
const FAITH_ACTIONS = [
  { action: 'io_win', points: 10, desc: 'IO 매치 승리' },
  { action: 'siege_win', points: 30, desc: '공성전 승리' },
  { action: 'boss_kill', points: 20, desc: '보스 처치' },
  { action: 'convert', points: 5, desc: '다른 플레이어 개종 (선교)' },
  { action: 'donation', points: 1, desc: '1000G당 1포인트 (헌금)' },
  { action: 'daily_prayer', points: 3, desc: '매일 기도 (1일 1회)' },
];

// 신앙 레벨 → 축복 강도
const FAITH_LEVELS = [
  { level: 1, name: '신도', req: 0, blessingPow: 0.5 },
  { level: 2, name: '사제', req: 100, blessingPow: 0.75 },
  { level: 3, name: '고위 사제', req: 300, blessingPow: 1.0 },
  { level: 4, name: '대사제', req: 700, blessingPow: 1.25 },
  { level: 5, name: '신의 대리자', req: 1500, blessingPow: 1.5 },
  { level: 6, name: '반신', req: 3000, blessingPow: 2.0, special: '신 폼 변신 가능 (자기 신 전용)' },
];

// 배교 시스템 (진영 이탈)
const APOSTASY = {
  cost: 50000,
  cooldown: 7, // 7일
  wrathDuration: 3, // 3일 신의 분노
  desc: '진영 이탈 시: 골드 5만 + 7일 쿨다운 + 3일간 이전 신의 분노',
};

function joinFaction(player, factionId) {
  const faction = GOD_FACTIONS.find(f => f.id === factionId);
  if (!faction) return { ok: false, reason: '알 수 없는 신' };
  if (player.godFaction) return { ok: false, reason: '이미 진영 가입됨 (배교 후 재가입)' };
  player.godFaction = { id: factionId, faith: 0, level: 1, joinedAt: Date.now() };
  return { ok: true, faction: faction.name, blessing: faction.blessing };
}

function addFaith(player, action) {
  if (!player.godFaction) return { ok: false };
  const fa = FAITH_ACTIONS.find(a => a.action === action);
  if (!fa) return { ok: false };
  player.godFaction.faith += fa.points;
  const newLevel = [...FAITH_LEVELS].reverse().find(l => player.godFaction.faith >= l.req);
  if (newLevel && newLevel.level > player.godFaction.level) {
    player.godFaction.level = newLevel.level;
    return { ok: true, levelUp: true, newLevel: newLevel.name, faith: player.godFaction.faith };
  }
  return { ok: true, levelUp: false, faith: player.godFaction.faith };
}

function register(io, socket, player) {
  socket.on('god_war_info', () => {
    socket.emit('god_war_info', { factions: GOD_FACTIONS, phases: GOD_WAR_PHASES, faithActions: FAITH_ACTIONS, levels: FAITH_LEVELS, apostasy: APOSTASY, current: player.godFaction });
  });
  socket.on('god_war_join', (data) => {
    const result = joinFaction(player, data.factionId);
    socket.emit('god_war_join_result', result);
    if (result.ok) io.emit('server_msg', `⛪ [신들의 전쟁] ${player.name}이(가) "${result.faction}" 진영에 합류!`);
  });
  socket.on('god_war_pray', () => {
    const result = addFaith(player, 'daily_prayer');
    socket.emit('god_war_pray_result', result);
    if (result.levelUp) io.emit('server_msg', `✨ [신앙] ${player.name}이(가) "${result.newLevel}"(으)로 승급!`);
  });
}

module.exports = { GOD_FACTIONS, GOD_WAR_PHASES, FAITH_ACTIONS, FAITH_LEVELS, APOSTASY, joinFaction, addFaith, register };

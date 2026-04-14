// v5.3 — 용병 챔피언십 (실시간 용병 vs 용병 자동전투 관전+베팅)
// 토너먼트 + 관전 + 베팅 + 해설 시스템

const CHAMPIONSHIP_BRACKET = 16;
const ROUND_DURATION = 30; // 초

// 챔피언십 등급
const CHAMPIONSHIP_TIERS = [
  { id: 'rookie', name: '루키컵', icon: '🌱', entry: 0, reward: { gold: 5000, trophy: 1 }, mercMaxLv: 20 },
  { id: 'bronze', name: '브론즈컵', icon: '🥉', entry: 1000, reward: { gold: 20000, trophy: 3 }, mercMaxLv: 30 },
  { id: 'silver', name: '실버컵', icon: '🥈', entry: 5000, reward: { gold: 50000, trophy: 5 }, mercMaxLv: 40 },
  { id: 'gold', name: '골드컵', icon: '🏅', entry: 15000, reward: { gold: 100000, trophy: 10, skin: true }, mercMaxLv: 50 },
  { id: 'champion', name: '챔피언컵', icon: '🏆', entry: 50000, reward: { gold: 300000, trophy: 25, title: true, frame: true }, mercMaxLv: 99 },
  { id: 'legend', name: '전설의 대전', icon: '👑🏆', entry: 100000, reward: { gold: 500000, trophy: 50, title: true, merc: 'arena_legend' }, mercMaxLv: 99 },
];

// 전투 AI 전략 (자동전투 시 용병 AI)
const BATTLE_STRATEGIES = {
  aggressive: { name: '공격 집중', atkMul: 1.2, defMul: 0.85, desc: '공격 우선 전략' },
  defensive:  { name: '방어 우선', atkMul: 0.85, defMul: 1.2, desc: '버티기 전략' },
  balanced:   { name: '균형', atkMul: 1.0, defMul: 1.0, desc: '표준 전략' },
  burst:      { name: '폭딜', atkMul: 1.4, defMul: 0.7, desc: '개전 초반 집중 공격' },
  counter:    { name: '역습', atkMul: 0.9, defMul: 1.1, counterRate: 0.3, desc: '맞고 반격' },
  assassin:   { name: '암살', atkMul: 1.1, defMul: 0.9, targetWeak: true, desc: '약한 적 우선 처치' },
};

// 베팅 시스템
const BET_ODDS_BASE = {
  underdog: 3.5,  // 약체 승리 시 3.5배
  even:     2.0,  // 대등한 매치
  favorite: 1.3,  // 강체 승리 시 1.3배
};

// 해설 텍스트 (전투 상황별)
const COMMENTARY = {
  round_start: ['전투가 시작되었습니다!', '양 진영이 격돌합니다!', '긴장감이 최고조!'],
  critical:    ['크리티컬 히트!!! 엄청난 데미지!', '치명타! 관중이 열광합니다!'],
  near_death:  ['위험합니다! HP가 거의 바닥!', '아슬아슬! 한 방이면 끝!'],
  comeback:    ['역전이다!! 기적의 역전극!', '불사조처럼 되살아났다!'],
  finish:      ['끝났습니다! 승자가 결정!', '완벽한 승리!', 'KO! 압도적!'],
  skill_use:   ['궁극기 발동!', '필살기가 작렬합니다!', '스킬 발동! 판세가 바뀝니다!'],
};

function simulateMatch(mercA, mercB) {
  let hpA = mercA.hp || 500, hpB = mercB.hp || 500;
  const atkA = (mercA.atk || 50), atkB = (mercB.atk || 50);
  const defA = (mercA.def || 30), defB = (mercB.def || 30);
  const log = [];
  let turn = 0;
  while (hpA > 0 && hpB > 0 && turn < 20) {
    turn++;
    const dmgToB = Math.max(1, Math.floor(atkA * (1 + Math.random() * 0.3) - defB * 0.5));
    const dmgToA = Math.max(1, Math.floor(atkB * (1 + Math.random() * 0.3) - defA * 0.5));
    hpB -= dmgToB; hpA -= dmgToA;
    const crit = Math.random() < 0.15;
    log.push({ turn, dmgToB: crit ? dmgToB * 2 : dmgToB, dmgToA, hpA: Math.max(0, hpA), hpB: Math.max(0, hpB), crit });
  }
  return { winner: hpA > hpB ? 'A' : 'B', log, turns: turn, finalHpA: Math.max(0, hpA), finalHpB: Math.max(0, hpB) };
}

function register(io, socket, player) {
  socket.on('arena_championship_info', () => {
    socket.emit('arena_championship_info', { tiers: CHAMPIONSHIP_TIERS, strategies: BATTLE_STRATEGIES, betOdds: BET_ODDS_BASE });
  });

  socket.on('arena_championship_enter', (data) => {
    const tier = CHAMPIONSHIP_TIERS.find(t => t.id === data.tierId);
    if (!tier) return socket.emit('arena_champ_result', { ok: false, reason: '등급 없음' });
    if ((player.gold || 0) < tier.entry) return socket.emit('arena_champ_result', { ok: false, reason: '참가비 부족' });
    player.gold -= tier.entry;
    socket.emit('arena_champ_result', { ok: true, tier, message: '참가 완료!' });
  });

  socket.on('arena_championship_bet', (data) => {
    const { matchId, targetMercId, amount } = data;
    if ((player.gold || 0) < amount) return socket.emit('arena_bet_result', { ok: false, reason: '골드 부족' });
    player.gold -= amount;
    player.pendingBets = player.pendingBets || [];
    player.pendingBets.push({ matchId, targetMercId, amount, time: Date.now() });
    socket.emit('arena_bet_result', { ok: true, amount });
  });

  socket.on('arena_championship_simulate', (data) => {
    const mercs = player.mercenaries || [];
    const mercA = mercs.find(m => m.id === data.mercAId);
    const mercB = mercs.find(m => m.id === data.mercBId);
    if (!mercA || !mercB) return socket.emit('arena_sim_result', { ok: false });
    const result = simulateMatch(mercA, mercB);
    socket.emit('arena_sim_result', { ok: true, ...result, commentary: COMMENTARY });
  });
}

module.exports = { CHAMPIONSHIP_TIERS, BATTLE_STRATEGIES, BET_ODDS_BASE, COMMENTARY, simulateMatch, register };

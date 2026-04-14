// ============================================
// 카드게임 이벤트/퀘스트 시스템
// ============================================

// 일일 퀘스트 (매일 3개 자동 생성)
const DAILY_QUESTS = [
  { id: 'dq_upgrade3', name: '카드 강화 3회', icon: '⬆️', goal: 3, reward: { gold: 1500, diamonds: 5 }, track: 'upgrades' },
  { id: 'dq_action5', name: '행동 카드 5회 사용', icon: '🎴', goal: 5, reward: { gold: 1000, diamonds: 3 }, track: 'actions' },
  { id: 'dq_pvp3', name: 'PvP 대전 3회', icon: '⚔️', goal: 3, reward: { gold: 2000, diamonds: 8 }, track: 'pvpBattles' },
  { id: 'dq_summon1', name: '소환 1회', icon: '📜', goal: 1, reward: { gold: 500, diamonds: 10 }, track: 'summons' },
  { id: 'dq_trade3', name: '무역 카드 3회 사용', icon: '💰', goal: 3, reward: { gold: 2000 }, track: 'trades' },
  { id: 'dq_io_join', name: 'IO 출전 1회', icon: '⚔️🏆', goal: 1, reward: { gold: 3000, diamonds: 15 }, track: 'ioJoins' },
  { id: 'dq_evolve1', name: '용병 진화 1회', icon: '🔥', goal: 1, reward: { gold: 2000, diamonds: 10 }, track: 'evolves' },
  { id: 'dq_promote1', name: '용병 진급 1회', icon: '⭐', goal: 1, reward: { gold: 1500, diamonds: 8 }, track: 'promotes' },
  { id: 'dq_login', name: '출석 체크', icon: '📅', goal: 1, reward: { gold: 500, diamonds: 3 }, track: 'logins' },
  { id: 'dq_collect5', name: '카드 5장 보유', icon: '🃏', goal: 5, reward: { gold: 1000 }, track: 'cardCount' },
];

// 주간 이벤트 (랜덤)
const WEEKLY_EVENTS = [
  { id: 'we_double_gold', name: '💰 골드 2배 주간', duration: 7, effect: { goldMul: 2.0 }, desc: '모든 골드 획득 2배!' },
  { id: 'we_summon_up', name: '📜 소환 확률 UP', duration: 7, effect: { summonRateUp: 1.5 }, desc: '전설 이상 확률 1.5배!' },
  { id: 'we_pvp_season', name: '⚔️ PvP 시즌', duration: 7, effect: { pvpPointsMul: 2.0 }, desc: 'PvP 포인트 2배!' },
  { id: 'we_exp_boost', name: '📈 경험치 부스트', duration: 7, effect: { expMul: 2.0 }, desc: '카드 강화 효과 2배!' },
  { id: 'we_trade_fest', name: '🏪 무역 축제', duration: 7, effect: { tradeMul: 2.0 }, desc: '무역 수익 2배!' },
];

// 특별 이벤트 (서버 전체)
const SPECIAL_EVENTS = [
  { id: 'se_boss_raid', name: '🐲 카드 보스 레이드', desc: '서버 전원이 보스 카드에 데미지를 합산! 처치 시 전원 보상',
    boss: { name: '드래곤 황제', hp: 1000000, icon: '🐲👑' }, reward: { gold: 5000, diamonds: 20, card: true } },
  { id: 'se_lottery', name: '🎰 카드 복권', desc: '매일 무료 1회, 신화 카드 당첨 확률!',
    prizes: [{ name: '신화 카드', chance: 0.001 }, { name: '전설 카드', chance: 0.01 }, { name: '1000G', chance: 0.1 }, { name: '100G', chance: 0.5 }] },
  { id: 'se_tournament', name: '🏆 카드 토너먼트', desc: '32강 카드 대전! 우승자 한정 카드',
    format: '32인 토너먼트', reward: { gold: 50000, diamonds: 100, card: 'tournament_champion' } },
];

// 출석 보상 (연속 출석)
const ATTENDANCE_REWARDS = [
  { day: 1, reward: { gold: 500 } },
  { day: 2, reward: { gold: 800 } },
  { day: 3, reward: { gold: 1000, diamonds: 5 } },
  { day: 5, reward: { gold: 2000, diamonds: 10 } },
  { day: 7, reward: { gold: 3000, diamonds: 20, card: 'rare' } },
  { day: 14, reward: { gold: 5000, diamonds: 30, card: 'epic' } },
  { day: 30, reward: { gold: 10000, diamonds: 50, card: 'legend' } },
];

function generateDailyQuests() {
  const pool = [...DAILY_QUESTS];
  const quests = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    quests.push({ ...pool.splice(idx, 1)[0], progress: 0 });
  }
  return quests;
}

function checkAttendance(player) {
  const now = new Date();
  const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (player._lastAttendance === today) return { ok: false, reason: '이미 출석 완료' };

  player._lastAttendance = today;
  player.attendanceDays = (player.attendanceDays || 0) + 1;
  const reward = ATTENDANCE_REWARDS.filter(a => player.attendanceDays >= a.day).pop();
  if (reward) {
    player.gold = (player.gold || 0) + (reward.reward.gold || 0);
    player.diamonds = (player.diamonds || 0) + (reward.reward.diamonds || 0);
  }
  return { ok: true, day: player.attendanceDays, reward };
}

function register(io, socket, player) {
  socket.on('daily_quests_request', () => {
    if (!player._dailyQuests || player._dailyQuestDate !== new Date().toDateString()) {
      player._dailyQuests = generateDailyQuests();
      player._dailyQuestDate = new Date().toDateString();
    }
    socket.emit('daily_quests', { quests: player._dailyQuests, attendance: player.attendanceDays || 0 });
  });

  socket.on('attendance_check', () => {
    const result = checkAttendance(player);
    socket.emit('attendance_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('weekly_event_request', () => {
    const weekNum = Math.floor(Date.now() / (7 * 86400000));
    const event = WEEKLY_EVENTS[weekNum % WEEKLY_EVENTS.length];
    socket.emit('weekly_event', event);
  });

  socket.on('special_events_request', () => {
    socket.emit('special_events', SPECIAL_EVENTS);
  });
}

module.exports = { DAILY_QUESTS, WEEKLY_EVENTS, SPECIAL_EVENTS, ATTENDANCE_REWARDS, generateDailyQuests, checkAttendance, register };

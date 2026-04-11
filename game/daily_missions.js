// 일일/주간 미션 보드 — v2.59
// 매일 갱신되는 미션 3개 + 주간 미션 2개

const DAILY_POOL = [
  { id: 'd_hunt',    name: '사냥꾼',      icon: '💀', desc: '몬스터 30마리 처치', target: 'kill', goal: 30, reward: { gold: 1000, exp: 800 } },
  { id: 'd_elite',   name: '엘리트 사냥', icon: '⚔️', desc: '엘리트+ 몬스터 5마리', target: 'kill_elite', goal: 5, reward: { gold: 2000, exp: 1500 } },
  { id: 'd_gold',    name: '골드 수집가', icon: '💰', desc: '골드 3000 획득', target: 'earn_gold', goal: 3000, reward: { diamonds: 15 } },
  { id: 'd_dungeon', name: '던전 탐험',   icon: '🏰', desc: '던전 1회 클리어', target: 'dungeon_clear', goal: 1, reward: { gold: 3000, diamonds: 10 } },
  { id: 'd_fish',    name: '낚시꾼',      icon: '🎣', desc: '물고기 5마리 낚기', target: 'fish', goal: 5, reward: { gold: 1500 } },
  { id: 'd_craft',   name: '제작 장인',   icon: '🔨', desc: '아이템 3개 제작', target: 'craft', goal: 3, reward: { gold: 1000, exp: 500 } },
  { id: 'd_pvp',     name: 'PvP 도전',    icon: '⚔️', desc: 'PvP 2회 참여', target: 'pvp_fight', goal: 2, reward: { gold: 2000, diamonds: 10 } },
  { id: 'd_explore', name: '탐험가',      icon: '🗺️', desc: '3개 존 방문', target: 'zone_visit', goal: 3, reward: { gold: 1000, exp: 600 } },
  { id: 'd_boss',    name: '보스 사냥',   icon: '🐲', desc: '보스급 몬스터 1마리', target: 'kill_boss', goal: 1, reward: { gold: 3000, diamonds: 20 } },
  { id: 'd_quiz',    name: '지식왕',      icon: '❓', desc: '퀴즈 3회 정답', target: 'quiz_correct', goal: 3, reward: { gold: 800, exp: 400 } },
];

const WEEKLY_POOL = [
  { id: 'w_hunt',    name: '주간 대학살', icon: '☠️', desc: '몬스터 300마리 처치', target: 'kill', goal: 300, reward: { gold: 10000, diamonds: 50 } },
  { id: 'w_dungeon', name: '던전 마스터', icon: '🏰', desc: '던전 5회 클리어', target: 'dungeon_clear', goal: 5, reward: { gold: 15000, diamonds: 80 } },
  { id: 'w_pvp',     name: 'PvP 전사',   icon: '⚔️', desc: 'PvP 10회 참여', target: 'pvp_fight', goal: 10, reward: { gold: 8000, diamonds: 60 } },
  { id: 'w_level',   name: '성장의 길',   icon: '📈', desc: '5레벨 상승', target: 'level_gain', goal: 5, reward: { gold: 20000, diamonds: 100 } },
  { id: 'w_gold',    name: '부자 되기',   icon: '💰', desc: '골드 50000 획득', target: 'earn_gold', goal: 50000, reward: { diamonds: 150 } },
];

function getDailyMissions(player) {
  const today = new Date().toISOString().slice(0, 10);
  if (!player._dailyMissions || player._dailyMissions.date !== today) {
    // 랜덤 3개 선택
    const shuffled = [...DAILY_POOL].sort(() => Math.random() - 0.5);
    player._dailyMissions = {
      date: today,
      missions: shuffled.slice(0, 3).map(m => ({ ...m, progress: 0, claimed: false })),
    };
  }
  return player._dailyMissions.missions;
}

function getWeeklyMissions(player) {
  const week = getWeekId();
  if (!player._weeklyMissions || player._weeklyMissions.week !== week) {
    const shuffled = [...WEEKLY_POOL].sort(() => Math.random() - 0.5);
    player._weeklyMissions = {
      week,
      missions: shuffled.slice(0, 2).map(m => ({ ...m, progress: 0, claimed: false })),
    };
  }
  return player._weeklyMissions.missions;
}

function getWeekId() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  return d.getFullYear() + '-W' + Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
}

function progressMission(player, target, amount) {
  let updates = [];
  const dailies = getDailyMissions(player);
  const weeklies = getWeeklyMissions(player);

  [...dailies, ...weeklies].forEach(m => {
    if (m.claimed || m.target !== target) return;
    m.progress = Math.min(m.goal, m.progress + (amount || 1));
    if (m.progress >= m.goal) updates.push({ id: m.id, name: m.name, icon: m.icon, completed: true });
  });

  return updates;
}

function claimMission(player, missionId) {
  const all = [...getDailyMissions(player), ...getWeeklyMissions(player)];
  const m = all.find(x => x.id === missionId);
  if (!m) return { success: false, msg: '미션을 찾을 수 없습니다' };
  if (m.claimed) return { success: false, msg: '이미 수령했습니다' };
  if (m.progress < m.goal) return { success: false, msg: '아직 완료하지 않았습니다 (' + m.progress + '/' + m.goal + ')' };

  m.claimed = true;
  if (m.reward.gold) player.gold = (player.gold || 0) + m.reward.gold;
  if (m.reward.exp && player.exp !== undefined) player.exp += m.reward.exp;
  if (m.reward.diamonds) player.diamonds = (player.diamonds || 0) + m.reward.diamonds;

  return { success: true, msg: m.icon + ' ' + m.name + ' 보상 수령!', reward: m.reward };
}

function registerMissionHandlers(socket, playerId, players, io) {
  socket.on('mission_board', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('mission_board', {
      daily: getDailyMissions(p),
      weekly: getWeeklyMissions(p),
    });
  });

  socket.on('mission_claim', (missionId) => {
    const p = players[playerId];
    if (!p) return;
    const result = claimMission(p, missionId);
    socket.emit('mission_claim_result', result);
  });
}

module.exports = { getDailyMissions, getWeeklyMissions, progressMission, claimMission, registerMissionHandlers };

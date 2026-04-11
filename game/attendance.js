// 출석 체크 & 연속 접속 보상 — v2.59
// 30일 캘린더 + 연속 접속 보너스 + 복귀 유저 보상

const DAILY_REWARDS = [
  { day: 1,  reward: { gold: 500 },              special: false },
  { day: 2,  reward: { gold: 800 },              special: false },
  { day: 3,  reward: { gold: 1000, exp: 500 },   special: false },
  { day: 4,  reward: { gold: 1200 },             special: false },
  { day: 5,  reward: { gold: 1500, diamonds: 10 }, special: false },
  { day: 6,  reward: { gold: 2000 },             special: false },
  { day: 7,  reward: { gold: 3000, diamonds: 30, item: 'pot_hp_l' }, special: true },
  { day: 8,  reward: { gold: 1500 },             special: false },
  { day: 9,  reward: { gold: 2000 },             special: false },
  { day: 10, reward: { gold: 2500, diamonds: 15 }, special: false },
  { day: 11, reward: { gold: 2000 },             special: false },
  { day: 12, reward: { gold: 2500 },             special: false },
  { day: 13, reward: { gold: 3000 },             special: false },
  { day: 14, reward: { gold: 5000, diamonds: 50, item: 'mat_dragon' }, special: true },
  { day: 15, reward: { gold: 3000 },             special: false },
  { day: 16, reward: { gold: 3000, exp: 2000 },  special: false },
  { day: 17, reward: { gold: 3500 },             special: false },
  { day: 18, reward: { gold: 3500, diamonds: 20 }, special: false },
  { day: 19, reward: { gold: 4000 },             special: false },
  { day: 20, reward: { gold: 4000 },             special: false },
  { day: 21, reward: { gold: 8000, diamonds: 80, item: 'mat_soul' }, special: true },
  { day: 22, reward: { gold: 4000 },             special: false },
  { day: 23, reward: { gold: 4500 },             special: false },
  { day: 24, reward: { gold: 5000, diamonds: 30 }, special: false },
  { day: 25, reward: { gold: 5000 },             special: false },
  { day: 26, reward: { gold: 5500 },             special: false },
  { day: 27, reward: { gold: 6000 },             special: false },
  { day: 28, reward: { gold: 10000, diamonds: 100 }, special: true },
  { day: 29, reward: { gold: 8000, diamonds: 50 }, special: false },
  { day: 30, reward: { gold: 20000, diamonds: 200, item: 'equip_attendance_ring', title: 'faithful' }, special: true },
];

const STREAK_BONUSES = [
  { streak: 3,  bonus: { gold: 2000 }, msg: '3일 연속!' },
  { streak: 7,  bonus: { gold: 5000, diamonds: 20 }, msg: '7일 연속! 대단해요!' },
  { streak: 14, bonus: { gold: 10000, diamonds: 50 }, msg: '14일 연속! 충성스럽군요!' },
  { streak: 30, bonus: { gold: 30000, diamonds: 300, title: 'devoted' }, msg: '30일 연속! 전설의 충성!' },
];

function getAttendance(player) {
  if (!player._attendance) {
    player._attendance = { totalDays: 0, streak: 0, lastDate: null, claimedDays: [], monthStart: getMonthKey() };
  }
  // 월 리셋
  if (player._attendance.monthStart !== getMonthKey()) {
    player._attendance = { totalDays: 0, streak: 0, lastDate: player._attendance.lastDate, claimedDays: [], monthStart: getMonthKey() };
  }
  return player._attendance;
}

function getMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1);
}

function checkIn(player) {
  const att = getAttendance(player);
  const today = new Date().toISOString().slice(0, 10);

  if (att.lastDate === today) return { success: false, msg: '오늘 이미 출석했습니다!' };

  // 연속 접속 체크
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (att.lastDate === yesterday) {
    att.streak++;
  } else if (att.lastDate) {
    att.streak = 1; // 연속 끊김
  } else {
    att.streak = 1;
  }

  att.lastDate = today;
  att.totalDays++;
  att.claimedDays.push(att.totalDays);

  // 일일 보상
  const dayReward = DAILY_REWARDS[Math.min(att.totalDays - 1, DAILY_REWARDS.length - 1)];
  const rewards = { ...dayReward.reward };

  // 보상 지급
  if (rewards.gold) player.gold = (player.gold || 0) + rewards.gold;
  if (rewards.exp && player.exp !== undefined) player.exp += rewards.exp;
  if (rewards.diamonds) player.diamonds = (player.diamonds || 0) + rewards.diamonds;
  if (rewards.item) {
    if (!player.inventory) player.inventory = {};
    player.inventory[rewards.item] = (player.inventory[rewards.item] || 0) + 1;
  }
  if (rewards.title) player.title = rewards.title;

  // 연속 접속 보너스
  let streakBonus = null;
  for (const sb of STREAK_BONUSES) {
    if (att.streak === sb.streak) {
      streakBonus = sb;
      if (sb.bonus.gold) player.gold += sb.bonus.gold;
      if (sb.bonus.diamonds) player.diamonds = (player.diamonds || 0) + sb.bonus.diamonds;
      if (sb.bonus.title) player.title = sb.bonus.title;
      break;
    }
  }

  return {
    success: true,
    day: att.totalDays,
    streak: att.streak,
    reward: rewards,
    isSpecial: dayReward.special,
    streakBonus,
  };
}

function getAttendanceStatus(player) {
  const att = getAttendance(player);
  const today = new Date().toISOString().slice(0, 10);
  return {
    totalDays: att.totalDays,
    streak: att.streak,
    canClaim: att.lastDate !== today,
    claimedDays: att.claimedDays,
    calendar: DAILY_REWARDS,
    streakBonuses: STREAK_BONUSES,
    nextStreak: STREAK_BONUSES.find(s => s.streak > att.streak),
  };
}

function registerAttendanceHandlers(socket, playerId, players, io) {
  socket.on('attendance_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('attendance_status', getAttendanceStatus(p));
  });

  socket.on('attendance_checkin', () => {
    const p = players[playerId];
    if (!p) return;
    const result = checkIn(p);
    socket.emit('attendance_result', result);
    if (result.success) {
      io.emit('server_msg', { msg: '📅 ' + (p.displayName||p.className) + '님 출석! (연속 ' + result.streak + '일)', type: 'normal' });
    }
  });
}

module.exports = { checkIn, getAttendanceStatus, registerAttendanceHandlers };

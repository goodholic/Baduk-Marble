// v6.1 — 타임 캡슐+ 시스템
// 현재 상태를 저장 → 미래에 개봉 → 성장도에 따라 보상, 편지

const CAPSULE_DURATIONS = [
  { id: 'week', name: '1주 캡슐', icon: '📦⏰', duration: 7, baseLootMul: 1.2, desc: '짧은 기다림, 적은 보상' },
  { id: 'month', name: '1개월 캡슐', icon: '📦📅', duration: 30, baseLootMul: 1.8, desc: '적당한 기다림, 좋은 보상' },
  { id: 'season', name: '시즌 캡슐', icon: '📦🌸', duration: 90, baseLootMul: 3.0, desc: '긴 기다림, 풍부한 보상' },
  { id: 'year', name: '1년 캡슐', icon: '📦🎆', duration: 365, baseLootMul: 10.0, desc: '극한의 기다림, 최고 보상!', legendary: true },
];

// 캡슐 내용물 (저장 시점 기록)
const CAPSULE_CONTENTS = [
  '현재 레벨', '보유 골드 스냅샷', '최강 용병 스탯', '업적 달성 수',
  '플레이어에게 보내는 편지 (자유 작성)', '현재 칭호', '소유 영토 수',
];

// 개봉 시 보상 (성장도 비교)
const GROWTH_REWARDS = [
  { growth: 'level+10', name: '성장 보상', reward: { gold: 10000, exp: 1000 }, desc: '레벨 10 이상 성장' },
  { growth: 'level+20', name: '대성장 보상', reward: { gold: 30000, exp: 3000, item: '성장의 증표' }, desc: '레벨 20 이상' },
  { growth: 'merc+10', name: '용병 수집 보상', reward: { gold: 20000, item: '용병 소환권' }, desc: '용병 10명 이상 증가' },
  { growth: 'prestige', name: '프레스티지 보상', reward: { gold: 100000, item: '프레스티지 토큰 ×5' }, desc: '프레스티지 1회 이상' },
  { growth: 'territory+3', name: '영토 확장 보상', reward: { gold: 50000, item: '정복 훈장' }, desc: '영토 3개 이상 증가' },
];

// 타임 캡슐 편지 (과거의 나에게/미래의 나에게)
const LETTER_SYSTEM = {
  maxLength: 500,
  readOnOpen: true,
  keepForever: true,
  desc: '캡슐에 편지를 넣을 수 있습니다. 미래의 자신에게 보내는 메시지.',
};

function createCapsule(player, durationType, letter) {
  const dur = CAPSULE_DURATIONS.find(d => d.id === durationType);
  if (!dur) return { ok: false, reason: '알 수 없는 기간' };

  const capsule = {
    id: `cap_${Date.now()}`,
    type: durationType,
    createdAt: Date.now(),
    openAt: Date.now() + dur.duration * 86400000,
    snapshot: {
      level: player.level || 1,
      gold: player.gold || 0,
      mercCount: (player.mercenaries || []).length,
      prestige: player.prestige || 0,
      territories: (player.ownedRegions || []).length,
      achievements: player.achievementCount || 0,
    },
    letter: (letter || '').slice(0, LETTER_SYSTEM.maxLength),
    lootMul: dur.baseLootMul,
    opened: false,
  };

  player.timeCapsules = player.timeCapsules || [];
  player.timeCapsules.push(capsule);
  return { ok: true, capsule, openDate: new Date(capsule.openAt).toLocaleDateString() };
}

function openCapsule(player, capsuleId) {
  const capsules = player.timeCapsules || [];
  const cap = capsules.find(c => c.id === capsuleId);
  if (!cap) return { ok: false, reason: '캡슐 없음' };
  if (cap.opened) return { ok: false, reason: '이미 개봉' };
  if (Date.now() < cap.openAt) return { ok: false, reason: `아직 개봉 시간 아님 (${new Date(cap.openAt).toLocaleDateString()})` };

  cap.opened = true;
  const growth = {
    levelGrowth: (player.level || 1) - cap.snapshot.level,
    mercGrowth: (player.mercenaries || []).length - cap.snapshot.mercCount,
    prestigeGrowth: (player.prestige || 0) - cap.snapshot.prestige,
    territoryGrowth: (player.ownedRegions || []).length - cap.snapshot.territories,
  };

  const rewards = GROWTH_REWARDS.filter(r => {
    if (r.growth === 'level+10' && growth.levelGrowth >= 10) return true;
    if (r.growth === 'level+20' && growth.levelGrowth >= 20) return true;
    if (r.growth === 'merc+10' && growth.mercGrowth >= 10) return true;
    if (r.growth === 'prestige' && growth.prestigeGrowth >= 1) return true;
    if (r.growth === 'territory+3' && growth.territoryGrowth >= 3) return true;
    return false;
  });

  return { ok: true, letter: cap.letter, snapshot: cap.snapshot, growth, rewards, lootMul: cap.lootMul };
}

function register(io, socket, player) {
  socket.on('time_capsule_info', () => {
    socket.emit('time_capsule_info', { durations: CAPSULE_DURATIONS, contents: CAPSULE_CONTENTS, growthRewards: GROWTH_REWARDS, letterSystem: LETTER_SYSTEM, myCapsules: player.timeCapsules || [] });
  });
  socket.on('time_capsule_create', (data) => {
    const result = createCapsule(player, data.duration, data.letter);
    socket.emit('time_capsule_create_result', result);
    if (result.ok) io.emit('server_msg', `📦⏰ [타임 캡슐] ${player.name}이(가) 타임 캡슐 봉인! 개봉일: ${result.openDate}`);
  });
  socket.on('time_capsule_open', (data) => {
    const result = openCapsule(player, data.capsuleId);
    socket.emit('time_capsule_open_result', result);
    if (result.ok) io.emit('server_msg', `📦🎉 [타임 캡슐] ${player.name}이(가) 과거의 캡슐을 개봉!`);
  });
}

module.exports = { CAPSULE_DURATIONS, GROWTH_REWARDS, LETTER_SYSTEM, createCapsule, openCapsule, register };

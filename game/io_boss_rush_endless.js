// v5.5 — IO 보스 러시 무한 모드
// 보스만 연속 등장, 타임어택, 패턴 암기, 리더보드

const TIME_PER_BOSS = 60; // 보스당 60초 제한
const DIFFICULTY_SCALE = 0.2; // 보스마다 20% 강화

// 보스 풀 (순환 등장)
const BOSS_POOL = [
  { id: 'goblin_king', name: '고블린 왕', icon: '👺👑', baseHp: 10000, baseAtk: 150, patterns: ['돌진', '부하 소환 3마리', '분노(HP 50%↓ ATK 2배)'], tier: 1 },
  { id: 'ice_golem', name: '아이스 골렘', icon: '❄️🗿', baseHp: 20000, baseAtk: 200, patterns: ['냉기 파동', '빙결 장판', '자폭(HP 10%↓)'], tier: 2 },
  { id: 'fire_dragon', name: '화염 드래곤', icon: '🐲🔥', baseHp: 35000, baseAtk: 300, patterns: ['브레스(직선)', '비행(5초 무적)', '화염비'], tier: 3 },
  { id: 'shadow_assassin', name: '그림자 암살자', icon: '👤🗡️', baseHp: 25000, baseAtk: 400, patterns: ['순간이동', '배후 습격(3배 DMG)', '분신 5체'], tier: 3 },
  { id: 'storm_giant', name: '폭풍 거인', icon: '⛈️🗿', baseHp: 50000, baseAtk: 350, patterns: ['지진(전체 기절 2초)', '번개 낙하 5발', '바위 투척'], tier: 4 },
  { id: 'lich_king', name: '리치 킹', icon: '💀👑', baseHp: 60000, baseAtk: 250, patterns: ['언데드 소환 10마리', '저주(ATK-30% 10초)', '영혼 흡수(HP 회복)'], tier: 4 },
  { id: 'world_serpent', name: '세계뱀', icon: '🐍🌍', baseHp: 80000, baseAtk: 500, patterns: ['몸체 감싸기(맵 축소)', '독구름(전체 DOT)', '삼킴(3초)'], tier: 5 },
  { id: 'demon_lord', name: '마왕', icon: '😈👑', baseHp: 100000, baseAtk: 600, patterns: ['지배(아군 전환)', '지옥불(전체 HP 30%)', '3페이즈 변신'], tier: 5 },
  { id: 'cosmic_horror', name: '우주적 공포', icon: '👁️🌌', baseHp: 150000, baseAtk: 700, patterns: ['정신 공격(랜덤 혼란)', '촉수 8개', '차원 붕괴'], tier: 6 },
  { id: 'primordial', name: '태초의 존재', icon: '🌟💀', baseHp: 200000, baseAtk: 800, patterns: ['전 패턴 랜덤 사용', '소멸 카운트(30초)', '불멸(3회 부활)'], tier: 6 },
];

// 보스 러시 특수 보상
const RUSH_REWARDS = [
  { bossCount: 5, reward: { gold: 10000, title: '보스 사냥꾼' } },
  { bossCount: 10, reward: { gold: 30000, item: '보스 결정 ×5' } },
  { bossCount: 15, reward: { gold: 60000, item: '전설 장비 상자' } },
  { bossCount: 20, reward: { gold: 100000, item: '신화 장비 상자', title: '보스 마스터' } },
  { bossCount: 30, reward: { gold: 200000, item: '초월 재료', title: '보스 러시 전설' } },
  { bossCount: 50, reward: { gold: 500000, merc: 'rush_champion', title: '보스 러시 신' } },
];

// 보스 러시 버프 (매 보스 클리어 시 선택)
const RUSH_BUFFS = [
  { id: 'atk_rush', name: 'ATK+10%', icon: '⚔️' },
  { id: 'hp_rush', name: 'HP+15%', icon: '❤️' },
  { id: 'speed_rush', name: '이동속도+10%', icon: '💨' },
  { id: 'heal_rush', name: '체력 20% 회복', icon: '💚' },
  { id: 'crit_rush', name: '크리율+8%', icon: '💥' },
  { id: 'time_rush', name: '다음 보스 시간+15초', icon: '⏰' },
];

function scaleBoss(boss, bossNumber) {
  const scale = 1 + (bossNumber - 1) * DIFFICULTY_SCALE;
  return {
    ...boss,
    hp: Math.floor(boss.baseHp * scale),
    atk: Math.floor(boss.baseAtk * scale),
    bossNumber,
    scale: Math.round(scale * 100) / 100,
  };
}

function register(io, socket, player) {
  socket.on('boss_rush_start', () => {
    player.bossRushState = { bossNumber: 0, buffs: [], startTime: Date.now(), totalTime: 0 };
    socket.emit('boss_rush_start', { ok: true });
  });
  socket.on('boss_rush_next', () => {
    const state = player.bossRushState;
    if (!state) return socket.emit('boss_rush_next', { ok: false });
    state.bossNumber++;
    const boss = BOSS_POOL[(state.bossNumber - 1) % BOSS_POOL.length];
    const scaled = scaleBoss(boss, state.bossNumber);
    const buffs = [];
    for (let i = 0; i < 3; i++) buffs.push(RUSH_BUFFS[Math.floor(Math.random() * RUSH_BUFFS.length)]);
    const reward = RUSH_REWARDS.filter(r => state.bossNumber >= r.bossCount).pop();
    socket.emit('boss_rush_next', { ok: true, boss: scaled, buffChoices: buffs, reward, timeLimit: TIME_PER_BOSS });
  });
  socket.on('boss_rush_defeat', () => {
    const state = player.bossRushState;
    if (!state) return;
    const reward = RUSH_REWARDS.filter(r => state.bossNumber >= r.bossCount).pop();
    socket.emit('boss_rush_end', { bossesDefeated: state.bossNumber, reward, totalTime: Date.now() - state.startTime });
    if (state.bossNumber >= 20) io.emit('server_msg', `🏆 [보스 러시] ${player.name}이(가) ${state.bossNumber}연속 보스 격파!`);
    player.bossRushState = null;
  });
  socket.on('boss_rush_info', () => {
    socket.emit('boss_rush_info', { bosses: BOSS_POOL, rewards: RUSH_REWARDS, buffs: RUSH_BUFFS });
  });
}

module.exports = { BOSS_POOL, RUSH_REWARDS, RUSH_BUFFS, TIME_PER_BOSS, scaleBoss, register };

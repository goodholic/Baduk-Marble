// v5.5 — 계절 이벤트 시스템
// 봄/여름/가을/겨울 특수 IO 맵, 보스, 보상, 한정 콘텐츠

const SEASONS = {
  spring: {
    name: '봄 축제', icon: '🌸', months: [3, 4, 5],
    mapTheme: { color: '#ffccee', particles: 'cherry_blossom', ambient: 'birds' },
    specialBoss: { name: '벚꽃 정령', icon: '🌸👻', hp: 80000, atk: 300, skill: '꽃비(전체 매혹 3초 + 서서히 치유)', drop: 'spring_petal' },
    events: ['꽃놀이 대회 (최다 수집)', '봄의 여신 등장 (힐+50%)', '씨앗 심기 (수확 보너스)'],
    reward: { item: '벚꽃 장비 세트', skin: '봄 스킨', title: '봄의 전사' },
    buff: { healBonus: 1.3, expBonus: 1.2, desc: '봄의 축복: 치유+30%, EXP+20%' },
  },
  summer: {
    name: '여름 해변', icon: '🏖️', months: [6, 7, 8],
    mapTheme: { color: '#88ddff', particles: 'water_splash', ambient: 'waves' },
    specialBoss: { name: '크라켄 해왕', icon: '🦑👑', hp: 120000, atk: 450, skill: '해일(맵 절반 수몰 + 수속성 DMG 2배)', drop: 'ocean_pearl' },
    events: ['수영 대회 (스피드 레이스)', '해적 습격 (PvP 이벤트)', '보물 다이빙 (수중 탐사)'],
    reward: { item: '바다 장비 세트', skin: '여름 스킨', title: '바다의 전사' },
    buff: { waterDmg: 1.5, movSpd: 1.1, desc: '여름의 축복: 수속성+50%, 이동+10%' },
  },
  autumn: {
    name: '가을 수확', icon: '🍂', months: [9, 10, 11],
    mapTheme: { color: '#dd8844', particles: 'falling_leaves', ambient: 'wind' },
    specialBoss: { name: '풍요의 거인', icon: '🍂🗿', hp: 100000, atk: 350, skill: '낙엽 폭풍(시야 차단 + 랜덤 보물 드롭)', drop: 'autumn_gem' },
    events: ['수확제 (골드 2배)', '할로윈 던전 (언데드 특수맵)', '단풍 사진전 (스크린샷 이벤트)'],
    reward: { item: '단풍 장비 세트', skin: '가을 스킨', title: '가을의 전사' },
    buff: { goldBonus: 1.5, dropRate: 1.3, desc: '가을의 축복: 골드+50%, 드롭+30%' },
  },
  winter: {
    name: '겨울 축전', icon: '❄️', months: [12, 1, 2],
    mapTheme: { color: '#ccddff', particles: 'snowfall', ambient: 'bells' },
    specialBoss: { name: '서리 여왕', icon: '❄️👑', hp: 150000, atk: 500, skill: '절대영도(전원 빙결 5초 + 빙결 상태 DMG 3배)', drop: 'frost_crown' },
    events: ['눈싸움 대전 (특수 PvP)', '크리스마스 선물 교환', '빙하 레이스 (장애물 달리기)'],
    reward: { item: '빙하 장비 세트', skin: '겨울 스킨', title: '겨울의 전사' },
    buff: { iceDmg: 1.5, defBonus: 1.2, desc: '겨울의 축복: 빙속성+50%, DEF+20%' },
  },
};

// 4계절 수집 보상 (4계절 모두 참여)
const ALL_SEASON_REWARD = {
  requirement: '4계절 보스 모두 처치 + 4세트 모두 수집',
  reward: { title: '사계의 지배자 🌸🏖️🍂❄️', merc: 'season_guardian', frame: 'four_seasons', allStat: 1.05 },
  desc: '4계절을 정복한 자에게 주어지는 최고의 영예',
};

// 한정 가챠 (계절별)
const SEASONAL_GACHA = {
  spring: { mercs: ['벚꽃 무사', '꽃의 정령', '봄의 요정'], rates: { normal: 0.7, rare: 0.2, legend: 0.08, myth: 0.02 } },
  summer: { mercs: ['바다 전사', '인어 마법사', '해적왕'], rates: { normal: 0.7, rare: 0.2, legend: 0.08, myth: 0.02 } },
  autumn: { mercs: ['수확의 기사', '할로윈 마녀', '단풍 궁수'], rates: { normal: 0.7, rare: 0.2, legend: 0.08, myth: 0.02 } },
  winter: { mercs: ['빙결 기사', '눈의 여왕', '산타 전사'], rates: { normal: 0.7, rare: 0.2, legend: 0.08, myth: 0.02 } },
};

function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  for (const [key, s] of Object.entries(SEASONS)) {
    if (s.months.includes(month)) return { id: key, ...s };
  }
  return { id: 'spring', ...SEASONS.spring };
}

function register(io, socket, player) {
  socket.on('seasonal_event', () => {
    const current = getCurrentSeason();
    socket.emit('seasonal_event', { current, allSeasons: SEASONS, allReward: ALL_SEASON_REWARD, gacha: SEASONAL_GACHA[current.id] });
  });
  socket.on('seasonal_boss_info', () => {
    const current = getCurrentSeason();
    socket.emit('seasonal_boss_info', current.specialBoss);
  });
}

module.exports = { SEASONS, ALL_SEASON_REWARD, SEASONAL_GACHA, getCurrentSeason, register };

// ============================================
// 날씨 & 시간 시스템 — 동적 전투/수집 보너스
// ============================================

// 날씨 (2시간마다 변경)
const WEATHER_TYPES = [
  { id: 'sunny', name: '맑음☀️', effect: { fireDmg: 0.1, farmGold: 0.1 }, desc: '화염 DMG+10%, 농장 수입+10%' },
  { id: 'rainy', name: '비🌧️', effect: { waterDmg: 0.15, farmExp: 0.15 }, desc: '수속성+15%, 농장 EXP+15%' },
  { id: 'snowy', name: '눈❄️', effect: { iceDmg: 0.15, spd: -0.1 }, desc: '빙속성+15%, 전체 SPD-10%' },
  { id: 'stormy', name: '폭풍⛈️', effect: { thunderDmg: 0.2, critRate: 0.05 }, desc: '뇌속성+20%, 크리율+5%' },
  { id: 'foggy', name: '안개🌫️', effect: { eva: 0.1, accuracy: -0.1 }, desc: '회피+10%, 명중-10%' },
  { id: 'windy', name: '바람🌬️', effect: { windDmg: 0.15, spd: 0.1 }, desc: '풍속성+15%, SPD+10%' },
  { id: 'eclipse', name: '일식🌑', effect: { darkDmg: 0.2, lightDmg: -0.1 }, desc: '암속성+20%, 광속성-10%', rare: true },
  { id: 'aurora', name: '오로라🌌', effect: { allDmg: 0.1, exp: 0.2 }, desc: '전 속성+10%, EXP+20%', rare: true },
];

// 시간대 (실제 시간 기반, 4구간)
const TIME_PERIODS = [
  { id: 'dawn', name: '새벽🌅', hours: [5, 6, 7, 8], effect: { exp: 0.1, healPow: 0.1 }, desc: 'EXP+10%, 치유+10%' },
  { id: 'day', name: '낮☀️', hours: [9, 10, 11, 12, 13, 14, 15, 16], effect: { atk: 0.05, gold: 0.05 }, desc: 'ATK+5%, 골드+5%' },
  { id: 'evening', name: '저녁🌆', hours: [17, 18, 19, 20], effect: { pvpReward: 0.15, tradeBonus: 0.1 }, desc: 'PvP+15%, 무역+10%' },
  { id: 'night', name: '밤🌙', hours: [21, 22, 23, 0, 1, 2, 3, 4], effect: { critRate: 0.05, darkDmg: 0.1, monsterStr: 0.15 }, desc: '크리+5%, 암속성+10%, 몬스터 강화+15%' },
];

// 계절 (실제 월 기반)
const SEASONS = [
  { id: 'spring', name: '봄🌸', months: [3, 4, 5], effect: { healPow: 0.1, farmGold: 0.15 }, desc: '치유+10%, 농장+15%', specialEvent: '벚꽃 축제' },
  { id: 'summer', name: '여름🌻', months: [6, 7, 8], effect: { fireDmg: 0.1, spd: 0.05 }, desc: '화염+10%, SPD+5%', specialEvent: '해변 이벤트' },
  { id: 'autumn', name: '가을🍂', months: [9, 10, 11], effect: { gold: 0.1, exp: 0.1 }, desc: '골드+10%, EXP+10%', specialEvent: '추수 축제' },
  { id: 'winter', name: '겨울⛄', months: [12, 1, 2], effect: { iceDmg: 0.1, def: 0.05 }, desc: '빙속성+10%, DEF+5%', specialEvent: '겨울 축제' },
];

// 특수 날씨 이벤트 (랜덤, 매우 희귀)
const WEATHER_EVENTS = [
  { id: 'meteor_shower', name: '유성우☄️', chance: 0.02, duration: 1800, effect: { allDmg: 0.2, cardDrop: 0.1 }, desc: '전 속성+20%, 카드 드롭+10%!' },
  { id: 'blood_moon', name: '블러드문🔴🌙', chance: 0.01, duration: 3600, effect: { atk: 0.3, def: -0.1 }, desc: 'ATK+30%, DEF-10%!' },
  { id: 'rainbow', name: '무지개🌈', chance: 0.03, duration: 1200, effect: { gold: 0.3, exp: 0.3 }, desc: '골드+30%, EXP+30%!' },
  { id: 'divine_light', name: '신성한 빛✨', chance: 0.01, duration: 1800, effect: { healPow: 0.5, lightDmg: 0.3 }, desc: '치유+50%, 광속성+30%!' },
];

// --- 내부 상태 ---
let currentWeather = null;
let currentWeatherBlock = -1;
let activeWeatherEvent = null;
let weatherEventExpiry = 0;
let lastWeatherBroadcast = null;

// 시드 기반 의사 난수 (동일 블록에 모든 클라이언트가 같은 날씨를 봄)
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * 현재 2시간 블록 인덱스 (0~11, 하루 12블록)
 * 날짜도 시드에 반영하여 매일 다른 패턴
 */
function getWeatherBlock(now) {
  const d = now || new Date();
  const daysSinceEpoch = Math.floor(d.getTime() / 86400000);
  const hourBlock = Math.floor(d.getHours() / 2);
  return { daysSinceEpoch, hourBlock, combined: daysSinceEpoch * 12 + hourBlock };
}

/**
 * getCurrentWeather — 2시간 블록 기반 날씨 결정
 * 시드 난수로 결정적(deterministic) + 희귀 날씨는 낮은 확률
 */
function getCurrentWeather(now) {
  const d = now || new Date();
  const block = getWeatherBlock(d);

  // 같은 블록이면 캐시 반환
  if (currentWeather && block.combined === currentWeatherBlock) {
    return currentWeather;
  }

  const rand = seededRandom(block.combined * 7919); // 소수 곱으로 분산

  // 희귀 날씨 체크 (각각 ~5% 확률)
  const rareWeathers = WEATHER_TYPES.filter(w => w.rare);
  const normalWeathers = WEATHER_TYPES.filter(w => !w.rare);

  let chosen;
  if (rand < 0.05) {
    // 희귀 날씨 중 하나
    const rareIdx = Math.floor(seededRandom(block.combined * 1301) * rareWeathers.length);
    chosen = rareWeathers[rareIdx];
  } else {
    // 일반 날씨
    const normIdx = Math.floor(seededRandom(block.combined * 4217) * normalWeathers.length);
    chosen = normalWeathers[normIdx];
  }

  currentWeather = { ...chosen };
  currentWeatherBlock = block.combined;

  // 다음 변경까지 남은 시간 (초)
  const nextBlockHour = (Math.floor(d.getHours() / 2) + 1) * 2;
  const nextChange = new Date(d);
  if (nextBlockHour >= 24) {
    nextChange.setDate(nextChange.getDate() + 1);
    nextChange.setHours(0, 0, 0, 0);
  } else {
    nextChange.setHours(nextBlockHour, 0, 0, 0);
  }
  currentWeather.nextChangeAt = nextChange.getTime();
  currentWeather.remainingSec = Math.max(0, Math.floor((nextChange.getTime() - d.getTime()) / 1000));

  return currentWeather;
}

/**
 * getCurrentTime — 현재 시간대 반환
 */
function getCurrentTime(now) {
  const d = now || new Date();
  const hour = d.getHours();
  const period = TIME_PERIODS.find(p => p.hours.includes(hour));
  return {
    ...period,
    currentHour: hour,
    minutesInPeriod: (hour - Math.min(...period.hours)) * 60 + d.getMinutes(),
  };
}

/**
 * getCurrentSeason — 현재 계절 반환
 */
function getCurrentSeason(now) {
  const d = now || new Date();
  const month = d.getMonth() + 1; // 1~12
  const season = SEASONS.find(s => s.months.includes(month));
  return { ...season, currentMonth: month };
}

/**
 * getActiveWeatherEvent — 현재 활성 특수 날씨 이벤트 확인
 * weatherTick에서 호출되어 갱신됨
 */
function getActiveWeatherEvent() {
  if (!activeWeatherEvent) return null;
  const now = Date.now();
  if (now > weatherEventExpiry) {
    activeWeatherEvent = null;
    weatherEventExpiry = 0;
    return null;
  }
  return {
    ...activeWeatherEvent,
    remainingSec: Math.max(0, Math.floor((weatherEventExpiry - now) / 1000)),
  };
}

/**
 * 특수 이벤트 롤 (내부) — 30초 틱마다 호출
 * 이미 이벤트 활성 중이면 스킵
 */
function rollWeatherEvent() {
  if (activeWeatherEvent && Date.now() < weatherEventExpiry) return false;

  for (const evt of WEATHER_EVENTS) {
    // chance는 1시간 기준 → 30초 틱이면 /120 보정
    const adjustedChance = evt.chance / 120;
    if (Math.random() < adjustedChance) {
      activeWeatherEvent = { ...evt };
      weatherEventExpiry = Date.now() + evt.duration * 1000;
      return true;
    }
  }
  return false;
}

/**
 * getAllEffects — 날씨 + 시간대 + 계절 + 특수이벤트 보너스 합산
 * 반환: { fireDmg: 0.2, gold: 0.15, ... } (합산 보너스 맵)
 */
function getAllEffects(now) {
  const sources = [
    getCurrentWeather(now).effect,
    getCurrentTime(now).effect,
    getCurrentSeason(now).effect,
  ];

  const evt = getActiveWeatherEvent();
  if (evt) sources.push(evt.effect);

  const merged = {};
  for (const src of sources) {
    for (const [key, val] of Object.entries(src)) {
      merged[key] = (merged[key] || 0) + val;
    }
  }
  return merged;
}

/**
 * getWeatherForecast — 다음 3개 날씨 블록 예측
 */
function getWeatherForecast(now) {
  const d = now || new Date();
  const forecast = [];

  for (let i = 1; i <= 3; i++) {
    const futureTime = new Date(d.getTime() + i * 2 * 3600 * 1000);
    // 캐시 우회를 위해 직접 계산
    const block = getWeatherBlock(futureTime);
    const rand = seededRandom(block.combined * 7919);

    const rareWeathers = WEATHER_TYPES.filter(w => w.rare);
    const normalWeathers = WEATHER_TYPES.filter(w => !w.rare);

    let chosen;
    if (rand < 0.05) {
      const rareIdx = Math.floor(seededRandom(block.combined * 1301) * rareWeathers.length);
      chosen = rareWeathers[rareIdx];
    } else {
      const normIdx = Math.floor(seededRandom(block.combined * 4217) * normalWeathers.length);
      chosen = normalWeathers[normIdx];
    }

    const blockStartHour = Math.floor(futureTime.getHours() / 2) * 2;
    const blockStart = new Date(futureTime);
    blockStart.setHours(blockStartHour, 0, 0, 0);

    forecast.push({
      id: chosen.id,
      name: chosen.name,
      desc: chosen.desc,
      effect: chosen.effect,
      rare: chosen.rare || false,
      startsAt: blockStart.getTime(),
      startsIn: Math.max(0, Math.floor((blockStart.getTime() - d.getTime()) / 1000)),
    });
  }
  return forecast;
}

/**
 * applyWeatherToStats — 스탯 블록에 날씨/시간/계절 보정 적용
 * baseStats = { atk: 100, def: 80, spd: 50, ... }
 * 반환: 수정된 사본 (원본 불변)
 */
function applyWeatherToStats(baseStats, now) {
  const effects = getAllEffects(now);
  const result = { ...baseStats };

  // 직접 매핑되는 스탯 키
  const directStatKeys = ['atk', 'def', 'spd', 'critRate', 'eva', 'accuracy', 'healPow'];

  for (const key of directStatKeys) {
    if (effects[key] !== undefined && result[key] !== undefined) {
      result[key] = Math.round(result[key] * (1 + effects[key]));
    }
  }

  // 속성 데미지 보너스는 별도 필드로 첨부
  const dmgKeys = ['fireDmg', 'waterDmg', 'iceDmg', 'thunderDmg', 'windDmg', 'darkDmg', 'lightDmg', 'allDmg'];
  result.weatherDmgBonus = {};
  for (const key of dmgKeys) {
    if (effects[key] !== undefined) {
      result.weatherDmgBonus[key] = effects[key];
    }
  }

  // 수익 보너스 (골드, 경험치, 농장 등)
  result.weatherRewardBonus = {};
  const rewardKeys = ['gold', 'exp', 'farmGold', 'farmExp', 'pvpReward', 'tradeBonus', 'cardDrop', 'monsterStr'];
  for (const key of rewardKeys) {
    if (effects[key] !== undefined) {
      result.weatherRewardBonus[key] = effects[key];
    }
  }

  return result;
}

/**
 * 날씨 상태 요약 (브로드캐스트용)
 */
function getWeatherSummary(now) {
  const weather = getCurrentWeather(now);
  const time = getCurrentTime(now);
  const season = getCurrentSeason(now);
  const evt = getActiveWeatherEvent();

  return {
    weather: { id: weather.id, name: weather.name, desc: weather.desc, effect: weather.effect, rare: weather.rare || false, remainingSec: weather.remainingSec },
    time: { id: time.id, name: time.name, desc: time.desc, effect: time.effect, currentHour: time.currentHour },
    season: { id: season.id, name: season.name, desc: season.desc, effect: season.effect, specialEvent: season.specialEvent },
    event: evt ? { id: evt.id, name: evt.name, desc: evt.desc, effect: evt.effect, remainingSec: evt.remainingSec } : null,
    allEffects: getAllEffects(now),
  };
}

/**
 * weatherTick — 30초마다 호출. 날씨 변경 감지 및 브로드캐스트
 */
let tickInterval = null;

function weatherTick(io) {
  const now = new Date();
  const summary = getWeatherSummary(now);

  // 특수 이벤트 롤
  const newEvent = rollWeatherEvent();
  if (newEvent) {
    const evt = getActiveWeatherEvent();
    if (io) {
      io.emit('weather_event_start', { event: evt });
    }
    console.log(`[WeatherTime] 특수 이벤트 발생: ${evt.name}`);
  }

  // 날씨 변경 감지
  const broadcastKey = `${summary.weather.id}_${summary.time.id}`;
  if (broadcastKey !== lastWeatherBroadcast) {
    lastWeatherBroadcast = broadcastKey;
    if (io) {
      io.emit('weather_update', summary);
    }
    console.log(`[WeatherTime] ${summary.season.name} | ${summary.time.name} | ${summary.weather.name}${summary.event ? ' | ' + summary.event.name : ''}`);
  }
}

/**
 * startWeatherLoop — 자동 틱 시작 (30초 간격)
 */
function startWeatherLoop(io) {
  if (tickInterval) clearInterval(tickInterval);
  // 즉시 1회 실행
  weatherTick(io);
  tickInterval = setInterval(() => weatherTick(io), 30000);
  console.log('[WeatherTime] 날씨 시스템 시작 (30초 간격)');
}

function stopWeatherLoop() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

/**
 * register — 소켓 이벤트 등록
 */
function register(io, socket, player) {
  // 접속 시 현재 날씨 정보 전송
  socket.emit('weather_info', getWeatherSummary());

  // 클라이언트 요청: 현재 날씨 정보
  socket.on('weather_info', () => {
    socket.emit('weather_info', getWeatherSummary());
  });

  // 클라이언트 요청: 날씨 예보
  socket.on('weather_forecast', () => {
    socket.emit('weather_forecast', {
      current: getWeatherSummary(),
      forecast: getWeatherForecast(),
    });
  });

  // 클라이언트 요청: 현재 적용 중인 효과
  socket.on('weather_effects', () => {
    socket.emit('weather_effects', {
      allEffects: getAllEffects(),
      breakdown: {
        weather: getCurrentWeather(),
        time: getCurrentTime(),
        season: getCurrentSeason(),
        event: getActiveWeatherEvent(),
      },
    });
  });
}

module.exports = {
  WEATHER_TYPES,
  TIME_PERIODS,
  SEASONS,
  WEATHER_EVENTS,
  getCurrentWeather,
  getCurrentTime,
  getCurrentSeason,
  getActiveWeatherEvent,
  getAllEffects,
  getWeatherForecast,
  applyWeatherToStats,
  getWeatherSummary,
  weatherTick,
  startWeatherLoop,
  stopWeatherLoop,
  register,
};

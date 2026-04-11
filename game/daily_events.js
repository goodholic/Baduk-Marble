// 요일별 특수 이벤트 + 날씨 전투 보너스 — v2.59
// 매일 다른 보너스, 플레이어에게 매일 접속 동기 부여

const DAY_EVENTS = {
  0: { name: '일요일: 휴식의 날',     icon: '☀️', bonus: { expMult: 1.5, healBonus: 50 }, desc: 'EXP +50%, 회복량 +50' },
  1: { name: '월요일: 사냥꾼의 날',   icon: '🗡️', bonus: { dropMult: 2.0 }, desc: '드롭률 2배!' },
  2: { name: '화요일: 대장장이의 날', icon: '🔨', bonus: { enchantBonus: 10, craftDiscount: 0.5 }, desc: '강화 확률 +10%, 제작비 -50%' },
  3: { name: '수요일: 상인의 날',     icon: '💰', bonus: { goldMult: 2.0, shopDiscount: 0.3 }, desc: '골드 2배, 상점 -30%' },
  4: { name: '목요일: 전사의 날',     icon: '⚔️', bonus: { pvpRewardMult: 2.0, atkBonus: 10 }, desc: 'PvP 보상 2배, ATK +10' },
  5: { name: '금요일: 모험가의 날',   icon: '🗺️', bonus: { expMult: 1.3, dungeonRewardMult: 1.5 }, desc: 'EXP +30%, 던전 보상 +50%' },
  6: { name: '토요일: 축제의 날',     icon: '🎉', bonus: { expMult: 2.0, goldMult: 1.5, dropMult: 1.5 }, desc: 'EXP 2배, 골드 +50%, 드롭 +50%!' },
};

const WEATHER_COMBAT_BONUS = {
  clear:  { name: '맑음',   icon: '☀️', bonus: { critBonus: 5 }, desc: '크리티컬 +5%' },
  rain:   { name: '비',     icon: '🌧️', bonus: { expMult: 1.2 }, desc: 'EXP +20% (비를 맞으며 수련)' },
  snow:   { name: '눈',     icon: '❄️', bonus: { defBonus: 8 }, desc: 'DEF +8 (방한)' },
  fog:    { name: '안개',   icon: '🌫️', bonus: { dodgeBonus: 8 }, desc: '회피 +8% (은신)' },
  storm:  { name: '폭풍',   icon: '⛈️', bonus: { atkBonus: 15, defPenalty: -5 }, desc: 'ATK +15, DEF -5 (광기)' },
};

function getTodayEvent() {
  const day = new Date().getDay();
  return DAY_EVENTS[day];
}

function getWeatherBonus(weatherId) {
  return WEATHER_COMBAT_BONUS[weatherId] || WEATHER_COMBAT_BONUS.clear;
}

function getDailyEventStatus(player, weatherId) {
  const today = getTodayEvent();
  const weather = getWeatherBonus(weatherId);
  return {
    dayEvent: today,
    weatherBonus: weather,
    combinedDesc: today.icon + ' ' + today.desc + '\n' + weather.icon + ' ' + weather.desc,
  };
}

function registerDailyEventHandlers(socket, playerId, players, io) {
  socket.on('daily_event_status', () => {
    const p = players[playerId];
    if (!p) return;
    // 현재 날씨는 서버에서 가져와야 하지만 간단히 처리
    socket.emit('daily_event_status', getDailyEventStatus(p, 'clear'));
  });
}

module.exports = { DAY_EVENTS, WEATHER_COMBAT_BONUS, getTodayEvent, getWeatherBonus, getDailyEventStatus, registerDailyEventHandlers };

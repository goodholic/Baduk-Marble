// v5.8 — 공성전 날씨 전쟁 시스템
// 성주/공격자가 날씨를 조작, 날씨 무기, 날씨 기반 전략

const WEATHER_CONTROL_COST = 5000;
const WEATHER_DURATION = 60; // 60초

// 조작 가능한 날씨
const SIEGE_WEATHERS = [
  { id: 'inferno', name: '지옥불', icon: '🔥🔥', effect: { fireDmg: 2.0, movSpd: 0.8, visibility: 0.7 }, offense: true, desc: '화염 속성 대폭↑, 이동↓' },
  { id: 'blizzard', name: '대빙하', icon: '❄️❄️', effect: { iceDmg: 2.0, movSpd: 0.5, freezeChance: 0.15 }, defense: true, desc: '이동 대폭↓, 빙결 확률' },
  { id: 'hurricane', name: '허리케인', icon: '🌪️🌪️', effect: { knockback: 3, rangedDmg: 0.3, meleeDmg: 1.5 }, offense: true, desc: '원거리 무효, 넉백 강화' },
  { id: 'eclipse', name: '개기일식', icon: '🌑🌑', effect: { visibility: 0.1, darkDmg: 2.0, stealthTime: 3 }, defense: true, desc: '거의 안 보임! 암살 특화' },
  { id: 'meteor_rain', name: '유성우', icon: '☄️☄️', effect: { randomMeteor: true, dmg: 300, interval: 5 }, offense: true, desc: '5초마다 유성! 양측 위험' },
  { id: 'holy_light', name: '성광', icon: '✨✨', effect: { healAll: 0.03, visibility: 1.5, darkDmg: 0.3 }, defense: true, desc: '시야 최대, 회복, 암속성↓' },
  { id: 'sandstorm', name: '대모래폭풍', icon: '🏜️🌪️', effect: { visibility: 0.2, rangedDmg: 0.4, trapStealth: true }, defense: true, desc: '함정 완전 은폐!' },
  { id: 'acid_rain', name: '산성비', icon: '☢️🌧️', effect: { armorReduce: 0.3, dot: 10 }, offense: true, desc: '방어구 효과 -30% + 지속 DMG' },
];

// 날씨 무기 (날씨와 조합 시 강화)
const WEATHER_WEAPONS = [
  { id: 'sun_cannon', name: '태양포', icon: '☀️💣', reqWeather: 'inferno', bonus: 'DMG 3배', desc: '지옥불+태양포 = 최강 화력' },
  { id: 'frost_barrier', name: '빙결 장벽', icon: '❄️🧱', reqWeather: 'blizzard', bonus: '성벽 HP 2배', desc: '대빙하+빙결장벽 = 철벽' },
  { id: 'wind_blade', name: '바람 칼날', icon: '🌪️🗡️', reqWeather: 'hurricane', bonus: '범위+300%', desc: '허리케인+바람칼날 = 광역' },
  { id: 'shadow_bomb', name: '그림자 폭탄', icon: '🌑💣', reqWeather: 'eclipse', bonus: '은신 폭발', desc: '개기일식+그림자폭탄 = 기습' },
  { id: 'star_rod', name: '별의 지팡이', icon: '⭐🪄', reqWeather: 'meteor_rain', bonus: '유성 조준 가능', desc: '유성을 원하는 곳에!' },
  { id: 'holy_shield', name: '성스러운 방패', icon: '✨🛡️', reqWeather: 'holy_light', bonus: '팀 전체 무적 5초', desc: '성광+성방패 = 무적' },
];

// 날씨 전환 타이밍 전략
const WEATHER_COMBOS = [
  { seq: ['inferno', 'blizzard'], name: '극과 극', effect: '온도차 폭발! 전체 DMG 500', desc: '화→빙 연속으로 추가 DMG' },
  { seq: ['eclipse', 'holy_light'], name: '빛과 어둠', effect: '전원 혼란 5초 + 시야 정상화', desc: '극적 반전' },
  { seq: ['hurricane', 'meteor_rain'], name: '천재지변', effect: '유성이 바람에 날려 범위 3배', desc: '최악의 재앙' },
];

function changeWeather(player, weatherId) {
  const weather = SIEGE_WEATHERS.find(w => w.id === weatherId);
  if (!weather) return { ok: false, reason: '알 수 없는 날씨' };
  if ((player.gold || 0) < WEATHER_CONTROL_COST) return { ok: false, reason: '골드 부족' };
  player.gold -= WEATHER_CONTROL_COST;
  player.activeSiegeWeather = { ...weather, startTime: Date.now(), duration: WEATHER_DURATION };
  return { ok: true, weather };
}

function register(io, socket, player) {
  socket.on('siege_weather_info', () => {
    socket.emit('siege_weather_info', { weathers: SIEGE_WEATHERS, weapons: WEATHER_WEAPONS, combos: WEATHER_COMBOS, active: player.activeSiegeWeather });
  });
  socket.on('siege_weather_change', (data) => {
    const result = changeWeather(player, data.weatherId);
    socket.emit('siege_weather_result', result);
    if (result.ok) io.to(data.room || 'siege').emit('siege_weather_changed', { weather: result.weather, by: player.name });
  });
}

module.exports = { SIEGE_WEATHERS, WEATHER_WEAPONS, WEATHER_COMBOS, changeWeather, register };

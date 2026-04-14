// v5.4 — IO 날씨 전투 시스템
// IO 매치에 동적 날씨가 전투에 극적인 영향, 날씨 무기/스킬 조합

const WEATHER_CYCLE = 120; // 2분마다 날씨 변경

const IO_WEATHERS = [
  { id: 'clear', name: '맑음', icon: '☀️', effect: {}, desc: '표준 조건', rarity: 'common' },
  { id: 'rain', name: '폭우', icon: '🌧️', effect: { fireDmg: 0.5, waterDmg: 1.5, visibility: 0.8, movSpd: 0.9 }, desc: '화속성↓ 수속성↑', rarity: 'common' },
  { id: 'thunder', name: '뇌우', icon: '⛈️', effect: { thunderDmg: 2.0, metalArmor: 0.7, randomStrike: true }, desc: '번개 무작위 낙하! 금속 갑옷 위험', rarity: 'uncommon' },
  { id: 'blizzard', name: '눈보라', icon: '🌨️', effect: { iceDmg: 1.5, movSpd: 0.6, visibility: 0.5, freezeChance: 0.1 }, desc: '이동속도↓↓ 빙결 확률', rarity: 'uncommon' },
  { id: 'sandstorm', name: '모래폭풍', icon: '🏜️💨', effect: { visibility: 0.3, rangedDmg: 0.6, meleeDmg: 1.2 }, desc: '원거리↓↓ 근접↑ 시야 극감', rarity: 'uncommon' },
  { id: 'eclipse', name: '일식', icon: '🌑☀️', effect: { darkDmg: 2.0, lightDmg: 0.5, visibility: 0.4, undeadBuff: 1.3 }, desc: '암속성 대폭↑ 언데드 강화', rarity: 'rare' },
  { id: 'aurora', name: '오로라', icon: '🌌✨', effect: { allMagic: 1.3, healBonus: 1.5, mpRegen: 2.0 }, desc: '마법+치유 대폭 강화', rarity: 'rare' },
  { id: 'meteor_shower', name: '유성우', icon: '☄️', effect: { randomMeteor: true, meteorDmg: 200, meteorInterval: 10 }, desc: '10초마다 랜덤 유성 낙하!', rarity: 'epic' },
  { id: 'blood_moon', name: '핏빛 달', icon: '🌙🩸', effect: { atkAll: 1.3, defAll: 0.7, lifeSteal: 0.1 }, desc: '전원 공격↑ 방어↓ 흡혈 부여', rarity: 'epic' },
  { id: 'divine_light', name: '신의 빛', icon: '🌟', effect: { healAll: 0.02, holyDmg: 2.0, darkDmg: 0.3 }, desc: '전원 HP 서서히 회복, 성속성↑↑', rarity: 'legendary' },
  { id: 'void_storm', name: '공허 폭풍', icon: '🌀💜', effect: { allDmg: 1.5, allDef: 0.5, randomTeleport: true }, desc: '전원 DMG↑ DEF↓ 랜덤 이동!', rarity: 'legendary' },
  { id: 'ragnarok', name: '라그나로크', icon: '🔥❄️⚡', effect: { allDmg: 2.0, randomElement: true, bossSpawn: true }, desc: '전 원소 랜덤 폭발+숨겨진 보스!', rarity: 'mythic' },
];

// 날씨 무기 시너지
const WEATHER_SYNERGIES = [
  { weather: 'rain', weapon: 'thunder_axe', bonus: '번개 연쇄 100% 확률', name: '뇌우의 도끼' },
  { weather: 'blizzard', weapon: 'frost_blade', bonus: '빙결 확률 50%', name: '절대영도' },
  { weather: 'eclipse', weapon: 'shadow_dagger', bonus: '크리 DMG 3배', name: '어둠의 칼날' },
  { weather: 'blood_moon', weapon: 'blood_ring', bonus: '흡혈 50%', name: '핏빛 갈증' },
  { weather: 'aurora', weapon: 'divine_staff', bonus: '힐 범위 2배', name: '천상의 축복' },
  { weather: 'ragnarok', weapon: 'abyss_weapon', bonus: '진정한 DMG 3배', name: '종말의 무기' },
];

// 날씨 예보 (매치 시작 전 3개 날씨 미리 공개)
function generateForecast() {
  const forecast = [];
  for (let i = 0; i < 3; i++) {
    const weights = IO_WEATHERS.map(w => w.rarity === 'common' ? 30 : w.rarity === 'uncommon' ? 20 : w.rarity === 'rare' ? 10 : w.rarity === 'epic' ? 5 : w.rarity === 'legendary' ? 2 : 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let j = 0; j < IO_WEATHERS.length; j++) {
      r -= weights[j];
      if (r <= 0) { forecast.push(IO_WEATHERS[j]); break; }
    }
  }
  return forecast;
}

function register(io, socket, player) {
  socket.on('io_weather_forecast', () => {
    socket.emit('io_weather_forecast', generateForecast());
  });
  socket.on('io_weather_info', () => {
    socket.emit('io_weather_info', { weathers: IO_WEATHERS, synergies: WEATHER_SYNERGIES });
  });
}

module.exports = { IO_WEATHERS, WEATHER_SYNERGIES, WEATHER_CYCLE, generateForecast, register };

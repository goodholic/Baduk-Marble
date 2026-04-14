// v6.4 — 날씨 기계 (공성전 날씨 생성 장치)
// 건설하여 원하는 날씨를 만들어냄, 업그레이드, 날씨 조합

const MACHINE_LEVELS = [
  { lv: 1, name: '기초 날씨 장치', cost: 20000, weathers: 2, duration: 60, cooldown: 300, desc: '2종 날씨 생성' },
  { lv: 2, name: '개량 날씨 장치', cost: 50000, weathers: 4, duration: 90, cooldown: 240, desc: '4종+지속↑' },
  { lv: 3, name: '고급 날씨 장치', cost: 100000, weathers: 6, duration: 120, cooldown: 180, desc: '6종+콤보 가능' },
  { lv: 4, name: '마법 날씨 엔진', cost: 200000, weathers: 8, duration: 150, cooldown: 120, desc: '8종+강화 날씨' },
  { lv: 5, name: '신의 날씨 장치', cost: 500000, weathers: 10, duration: 180, cooldown: 60, desc: '전 날씨+라그나로크 생성!', legendary: true },
];

// 생성 가능 날씨 (레벨별 해금)
const MACHINE_WEATHERS = [
  { id: 'rain', name: '비', icon: '🌧️', reqLv: 1, effect: '화-50%, 수+50%' },
  { id: 'fog', name: '안개', icon: '🌫️', reqLv: 1, effect: '시야 -60%' },
  { id: 'storm', name: '폭풍', icon: '⛈️', reqLv: 2, effect: '번개 낙하+넉백' },
  { id: 'blizzard', name: '눈보라', icon: '🌨️', reqLv: 2, effect: '이동-40%+빙결' },
  { id: 'sandstorm', name: '모래폭풍', icon: '🏜️💨', reqLv: 3, effect: '원거리-40%+시야↓' },
  { id: 'eclipse', name: '일식', icon: '🌑', reqLv: 3, effect: '암+100%+시야↓↓' },
  { id: 'meteor', name: '유성우', icon: '☄️', reqLv: 4, effect: '랜덤 유성 낙하!' },
  { id: 'aurora', name: '오로라', icon: '🌌', reqLv: 4, effect: '마법+힐 대폭↑' },
  { id: 'blood_moon', name: '핏빛 달', icon: '🌙🩸', reqLv: 5, effect: 'ATK↑+흡혈' },
  { id: 'ragnarok', name: '라그나로크', icon: '🔥❄️⚡', reqLv: 5, effect: '전 원소 폭발+보스!', legendary: true },
];

// 날씨 연료 (소모 재료)
const FUEL_TYPES = [
  { id: 'water_crystal', name: '수정 결정', icon: '💧💎', produces: ['rain', 'blizzard', 'aurora'], cost: 1000 },
  { id: 'fire_crystal', name: '화염 결정', icon: '🔥💎', produces: ['sandstorm', 'meteor', 'blood_moon'], cost: 1500 },
  { id: 'dark_crystal', name: '암흑 결정', icon: '🌑💎', produces: ['fog', 'eclipse', 'ragnarok'], cost: 2000 },
  { id: 'storm_crystal', name: '폭풍 결정', icon: '⚡💎', produces: ['storm', 'meteor'], cost: 1500 },
];

// 날씨 조합 (2개 동시 생성 시 특수 효과)
const WEATHER_COMBOS = [
  { a: 'rain', b: 'storm', name: '뇌우', effect: '번개 DMG 2배+수몰', icon: '⛈️⛈️' },
  { a: 'blizzard', b: 'eclipse', name: '영원의 밤', effect: '빙결+암흑 동시, 이동-60%', icon: '❄️🌑' },
  { a: 'sandstorm', b: 'meteor', name: '천재지변', effect: '유성+모래폭풍, 전체 혼란', icon: '☄️🏜️' },
  { a: 'aurora', b: 'blood_moon', name: '마력 폭주', effect: '마법+흡혈 극대화', icon: '🌌🩸' },
  { a: 'meteor', b: 'ragnarok', name: '종말의 날', effect: '맵 전체 파괴! 양측 대피해', icon: '☄️🔥❄️⚡', ultimate: true },
];

function buildMachine(player) {
  const current = player.weatherMachine?.level || 0;
  const next = MACHINE_LEVELS[current];
  if (!next) return { ok: false, reason: '최대 레벨' };
  if ((player.gold || 0) < next.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= next.cost;
  player.weatherMachine = { level: current + 1, builtAt: Date.now() };
  return { ok: true, machine: next };
}

function register(io, socket, player) {
  socket.on('weather_machine_info', () => {
    socket.emit('weather_machine_info', { levels: MACHINE_LEVELS, weathers: MACHINE_WEATHERS, fuels: FUEL_TYPES, combos: WEATHER_COMBOS, current: player.weatherMachine });
  });
  socket.on('weather_machine_build', () => {
    const result = buildMachine(player);
    socket.emit('weather_machine_result', result);
    if (result.ok && result.machine.legendary) io.emit('server_msg', `⛈️👑 [날씨 기계] ${player.name}이(가) "신의 날씨 장치" 건설!`);
  });
}

module.exports = { MACHINE_LEVELS, MACHINE_WEATHERS, FUEL_TYPES, WEATHER_COMBOS, buildMachine, register };

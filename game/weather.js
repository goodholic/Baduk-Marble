// 기상 시스템 — v1.94
// 글로벌 날씨 — 시간대 기반 결정론적 회전 (모든 플레이어 동일)
// 4시간마다 변화

const WEATHERS = [
  { id:'clear',     name:'맑음',     icon:'☀️', effects:{ goldBonus: 5  }, desc:'기분 좋은 햇살' },
  { id:'cloudy',    name:'흐림',     icon:'☁️', effects:{ defBonus: 5  }, desc:'잿빛 하늘' },
  { id:'rain',      name:'비',       icon:'🌧️', effects:{ fishingLuck: 20 }, desc:'고기가 잘 잡히는 날씨' },
  { id:'storm',     name:'폭풍우',   icon:'⛈️', effects:{ critBonus: 5  }, desc:'전기가 흐르는 공기' },
  { id:'snow',      name:'눈',       icon:'❄️', effects:{ defBonus: 10 }, desc:'고요한 백색의 세계' },
  { id:'fog',       name:'안개',     icon:'🌫️', effects:{ evasionBonus: 8 }, desc:'시야 제한' },
  { id:'aurora',    name:'오로라',   icon:'🌌', effects:{ expBonus: 15 }, desc:'희귀한 빛의 향연' },
  { id:'meteor',    name:'유성우',   icon:'☄️', effects:{ rareDropBonus: 20 }, desc:'별이 떨어지는 밤' },
];

const SLOT_HOURS = 4;
const RARE_WEATHERS = ['aurora','meteor'];

function _slotIndex() {
  return Math.floor(Date.now() / (SLOT_HOURS * 60 * 60 * 1000));
}

function _seededPick(slot) {
  // 결정론적 의사난수 (uint32 유지)
  let h = (slot * 2654435761) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  // 5% 확률로 희귀 날씨
  if ((h % 100) < 5) {
    return WEATHERS.find(w => w.id === RARE_WEATHERS[h % RARE_WEATHERS.length]);
  }
  // 일반 6종 중 선택
  const normal = WEATHERS.filter(w => !RARE_WEATHERS.includes(w.id));
  return normal[h % normal.length];
}

function getCurrent() {
  const slot = _slotIndex();
  const w = _seededPick(slot);
  const startMs = slot * SLOT_HOURS * 60 * 60 * 1000;
  const endMs = startMs + SLOT_HOURS * 60 * 60 * 1000;
  return {
    ...w,
    isRare: RARE_WEATHERS.includes(w.id),
    startMs,
    endMs,
    secondsLeft: Math.max(0, Math.ceil((endMs - Date.now()) / 1000)),
  };
}

function getForecast(hours = 24) {
  const slots = Math.ceil(hours / SLOT_HOURS);
  const out = [];
  const baseSlot = _slotIndex();
  for (let i = 0; i < slots; i++) {
    const w = _seededPick(baseSlot + i);
    out.push({
      slotOffset: i,
      startMs: (baseSlot + i) * SLOT_HOURS * 60 * 60 * 1000,
      ...w,
      isRare: RARE_WEATHERS.includes(w.id),
    });
  }
  return out;
}

function getStatus(player) {
  const current = getCurrent();
  const forecast = getForecast(24);
  const witnessed = (player && player.weatherWitnessed) || {};
  return {
    current,
    forecast,
    witnessed,
    witnessedCount: Object.keys(witnessed).length,
    totalCount: WEATHERS.length,
  };
}

function witness(player) {
  if (!player.weatherWitnessed) player.weatherWitnessed = {};
  const current = getCurrent();
  const wasFirst = !player.weatherWitnessed[current.id];
  player.weatherWitnessed[current.id] = Date.now();
  return {
    success: true,
    msg: `${current.icon} ${current.name} 기록!${wasFirst ? ' (첫 관측)' : ''}`,
    weather: current,
    firstTime: wasFirst,
    completed: Object.keys(player.weatherWitnessed).length >= WEATHERS.length,
  };
}

function getActiveBonuses() {
  return getCurrent().effects || {};
}

module.exports = {
  WEATHERS,
  SLOT_HOURS,
  getCurrent,
  getForecast,
  getStatus,
  witness,
  getActiveBonuses,
};

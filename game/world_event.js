// 월드 이벤트 시스템 — v1.60 (60번째 패치 마일스톤)
// 서버 전체에 영향 주는 동적 이벤트
// 6종 이벤트 + 자동 트리거 + 글로벌 알림

const WORLD_EVENTS = {
  golden_hour: {
    name: '황금 시간',
    icon: '💰',
    desc: '전 서버 골드 보상 ×2',
    duration: 30 * 60 * 1000, // 30분
    weight: 30,
    color: '#ffd700',
    effects: { goldBonus: 1.0 }, // ×2 = +100%
    announcement: '🎉 황금 시간이 시작되었습니다! 30분간 모든 골드 보상 2배!',
  },
  exp_burst: {
    name: '경험치 폭발',
    icon: '⭐',
    desc: '전 서버 경험치 ×2',
    duration: 30 * 60 * 1000,
    weight: 30,
    color: '#88ccff',
    effects: { expBonus: 1.0 },
    announcement: '⭐ 경험치 폭발! 30분간 모든 EXP 2배!',
  },
  dragon_invasion: {
    name: '드래곤 침공',
    icon: '🐉',
    desc: '전 지역에 드래곤 출현 (특별 드롭)',
    duration: 20 * 60 * 1000,
    weight: 15,
    color: '#ff4444',
    effects: { dropRate: 0.5 },
    spawnMonster: { tier: 'boss', name: '침공 드래곤', count: 10 },
    announcement: '🐉 드래곤 침공! 전 지역에 드래곤이 출몰합니다! (20분)',
  },
  meteor_shower: {
    name: '운석우',
    icon: '☄️',
    desc: '운석에서 희귀 재료 드롭',
    duration: 15 * 60 * 1000,
    weight: 10,
    color: '#ff8800',
    effects: { dropRate: 0.3 },
    specialDrop: { items: ['mat_dragon', 'mat_soul', 'goods_star_dust'], chance: 0.05 },
    announcement: '☄️ 운석우가 떨어지고 있습니다! 별의 가루를 모으세요! (15분)',
  },
  treasure_rain: {
    name: '보물 비',
    icon: '🌟',
    desc: '맵 곳곳에 보물 상자 등장',
    duration: 15 * 60 * 1000,
    weight: 10,
    color: '#ffaa00',
    spawnTreasure: { count: 50, mapId: 'common' },
    announcement: '🌟 보물 비! 맵 곳곳에 보물 상자가 나타납니다! (15분)',
  },
  blood_moon: {
    name: '혈월',
    icon: '🌙',
    desc: 'PvP 보상 ×3, 모든 몬스터 강화',
    duration: 60 * 60 * 1000, // 1시간
    weight: 5,
    color: '#aa0000',
    effects: { pvpReward: 2.0, monsterAtk: 0.5, monsterHp: 0.5 },
    announcement: '🌙 혈월이 떠올랐습니다! 1시간 동안 PvP 보상 3배, 몬스터 강화!',
  },
};

const WORLD_EVENT_CONFIG = {
  cooldownBetweenEventsMs: 15 * 60 * 1000, // 이벤트 종료 후 다음까지 15분 쿨다운
  autoTriggerProbability: 0.2, // 쿨다운 종료 후 5분마다 20% 확률로 트리거
};

// 활성 이벤트 (메모리)
let activeEvent = null;
let eventEndedAt = 0;

const TOTAL_WEIGHT = Object.values(WORLD_EVENTS).reduce((s, e) => s + e.weight, 0);

function _rollEvent() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const [id, event] of Object.entries(WORLD_EVENTS)) {
    roll -= event.weight;
    if (roll <= 0) return { id, ...event };
  }
  return { id: 'golden_hour', ...WORLD_EVENTS.golden_hour };
}

function startEvent(forceId = null) {
  if (activeEvent) return { success: false, msg: '이미 활성 이벤트 있음' };
  let event;
  if (forceId && WORLD_EVENTS[forceId]) {
    event = { id: forceId, ...WORLD_EVENTS[forceId] };
  } else {
    event = _rollEvent();
  }
  activeEvent = {
    ...event,
    startedAt: Date.now(),
    endsAt: Date.now() + event.duration,
  };
  return { success: true, event: activeEvent };
}

function endEvent() {
  if (!activeEvent) return { success: false };
  const ended = activeEvent;
  activeEvent = null;
  eventEndedAt = Date.now();
  return { success: true, ended };
}

function getActiveEvent() {
  if (activeEvent && Date.now() >= activeEvent.endsAt) {
    endEvent();
    return null;
  }
  return activeEvent;
}

function tryAutoTrigger() {
  if (activeEvent) return null;
  if ((Date.now() - eventEndedAt) < WORLD_EVENT_CONFIG.cooldownBetweenEventsMs) return null;
  if (Math.random() > WORLD_EVENT_CONFIG.autoTriggerProbability) return null;
  return startEvent();
}

function getEventBonus(stat) {
  const e = getActiveEvent();
  if (!e || !e.effects) return 0;
  return e.effects[stat] || 0;
}

function getStatus() {
  const event = getActiveEvent();
  return {
    active: event,
    cooldownRemaining: activeEvent ? 0 : Math.max(0, WORLD_EVENT_CONFIG.cooldownBetweenEventsMs - (Date.now() - eventEndedAt)),
    eventTypes: WORLD_EVENTS,
    nextAttemptIn: 5 * 60 * 1000, // 5분
  };
}

// 통계 (관리자용)
function getEventStats() {
  return {
    totalEvents: Object.keys(WORLD_EVENTS).length,
    weights: Object.fromEntries(Object.entries(WORLD_EVENTS).map(([id, e]) => [id, e.weight])),
    expectedDistribution: Object.fromEntries(
      Object.entries(WORLD_EVENTS).map(([id, e]) => [id, ((e.weight / TOTAL_WEIGHT) * 100).toFixed(1) + '%'])
    ),
  };
}

module.exports = {
  WORLD_EVENTS,
  WORLD_EVENT_CONFIG,
  startEvent,
  endEvent,
  getActiveEvent,
  tryAutoTrigger,
  getEventBonus,
  getStatus,
  getEventStats,
};

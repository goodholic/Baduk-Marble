// 보물 지도 시스템 — v1.46
// 다양한 출처에서 보물 지도 획득 → 좌표 단서 따라 보물 발견 → 보상 수령
// 5개 등급 (일반/고급/희귀/영웅/전설) × 등급별 보상 풀

const { ZONES } = require('./data/zones');

const TREASURE_GRADES = {
  common: {
    name: '일반 보물 지도',
    color: '#cccccc',
    rewardPool: { gold: [500, 1500], diamonds: [0, 0], items: ['mat_magic', 'goods_herb'], itemCount: [2, 5] },
    radius: 30, // 좌표 ±30 범위
    expireMinutes: 60,
  },
  uncommon: {
    name: '고급 보물 지도',
    color: '#44cc44',
    rewardPool: { gold: [1500, 4000], diamonds: [5, 15], items: ['mat_magic', 'mat_soul'], itemCount: [3, 8] },
    radius: 25,
    expireMinutes: 60,
  },
  rare: {
    name: '희귀 보물 지도',
    color: '#4488ff',
    rewardPool: { gold: [4000, 10000], diamonds: [20, 50], items: ['mat_soul', 'goods_gem'], itemCount: [5, 10] },
    radius: 20,
    expireMinutes: 90,
  },
  epic: {
    name: '영웅 보물 지도',
    color: '#aa44ff',
    rewardPool: { gold: [10000, 30000], diamonds: [50, 150], items: ['mat_dragon', 'goods_gold_bar'], itemCount: [3, 6] },
    radius: 15,
    expireMinutes: 120,
  },
  legendary: {
    name: '전설 보물 지도',
    color: '#ff8800',
    rewardPool: { gold: [30000, 80000], diamonds: [200, 500], items: ['mat_dragon', 'goods_dragon_eye'], itemCount: [5, 10] },
    radius: 10,
    expireMinutes: 180,
  },
};

const TREASURE_CONFIG = {
  maxActiveMaps: 5, // 플레이어당 동시 보유 한도
  proximityToReveal: 5, // 좌표 5단위 이내 → 자동 발견
};

let mapIdCounter = 1;

function _ensure(player) {
  if (!player.treasureMaps) player.treasureMaps = [];
  return player.treasureMaps;
}

function _pickRandomZone() {
  const safeZones = Object.entries(ZONES).filter(([id, z]) => !z.safe && !z.isArena && !z.isCastle);
  return safeZones[Math.floor(Math.random() * safeZones.length)];
}

function _randomCoord(zone, radius) {
  // 존 안의 무작위 위치 (radius만큼 가장자리 안쪽으로)
  const x = zone.x + radius + Math.random() * Math.max(1, zone.w - 2 * radius);
  const y = zone.y + radius + Math.random() * Math.max(1, zone.h - 2 * radius);
  return { x: Math.floor(x), y: Math.floor(y) };
}

function grantMap(player, grade = 'common') {
  const list = _ensure(player);
  if (list.length >= TREASURE_CONFIG.maxActiveMaps) {
    return { success: false, msg: `보물 지도 한도 초과 (${TREASURE_CONFIG.maxActiveMaps}개)` };
  }
  const tg = TREASURE_GRADES[grade];
  if (!tg) return { success: false, msg: '존재하지 않는 등급' };

  const [zoneId, zone] = _pickRandomZone();
  const coord = _randomCoord(zone, tg.radius);

  const map = {
    id: `map_${mapIdCounter++}`,
    grade,
    name: tg.name,
    color: tg.color,
    zoneId,
    zoneName: zone.name,
    targetX: coord.x,
    targetY: coord.y,
    radius: tg.radius,
    grantedAt: Date.now(),
    expiresAt: Date.now() + tg.expireMinutes * 60 * 1000,
    found: false,
  };
  list.push(map);
  return { success: true, map };
}

function getActiveMaps(player) {
  const list = _ensure(player);
  const now = Date.now();
  // 만료 정리
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].expiresAt < now && !list[i].found) list.splice(i, 1);
  }
  return list;
}

function getProximityHint(player, mapId) {
  const list = _ensure(player);
  const map = list.find(m => m.id === mapId);
  if (!map) return { success: false, msg: '지도 없음' };
  if (map.found) return { success: false, msg: '이미 발견된 보물' };

  const dx = (player.x || 0) - map.targetX;
  const dy = (player.y || 0) - map.targetY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  let hint;
  if (dist < 5) hint = '🔥 바로 여기다!';
  else if (dist < 15) hint = '🌡️ 매우 뜨겁다';
  else if (dist < 30) hint = '☀️ 따뜻하다';
  else if (dist < 60) hint = '😐 미지근하다';
  else if (dist < 100) hint = '❄️ 차갑다';
  else hint = '🧊 너무 멀다';

  return {
    success: true,
    hint,
    distance: Math.floor(dist),
    targetZone: map.zoneName,
    canDig: dist < TREASURE_CONFIG.proximityToReveal,
  };
}

function digTreasure(player, mapId) {
  const list = _ensure(player);
  const map = list.find(m => m.id === mapId);
  if (!map) return { success: false, msg: '지도 없음' };
  if (map.found) return { success: false, msg: '이미 발견됨' };
  if (Date.now() > map.expiresAt) return { success: false, msg: '만료된 지도' };

  const dx = (player.x || 0) - map.targetX;
  const dy = (player.y || 0) - map.targetY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > TREASURE_CONFIG.proximityToReveal) {
    return { success: false, msg: `너무 멀다 (${Math.floor(dist)}유닛 떨어짐)` };
  }

  // 보상 생성
  const tg = TREASURE_GRADES[map.grade];
  const pool = tg.rewardPool;
  const gold = Math.floor(pool.gold[0] + Math.random() * (pool.gold[1] - pool.gold[0]));
  const diamonds = pool.diamonds[1] > 0
    ? Math.floor(pool.diamonds[0] + Math.random() * (pool.diamonds[1] - pool.diamonds[0]))
    : 0;
  const itemId = pool.items[Math.floor(Math.random() * pool.items.length)];
  const itemCount = Math.floor(pool.itemCount[0] + Math.random() * (pool.itemCount[1] - pool.itemCount[0]));

  // 적용
  player.gold = (player.gold || 0) + gold;
  if (diamonds) player.diamonds = (player.diamonds || 0) + diamonds;
  if (!player.inventory) player.inventory = {};
  player.inventory[itemId] = (player.inventory[itemId] || 0) + itemCount;
  player.treasureFound = (player.treasureFound || 0) + 1;

  map.found = true;

  return {
    success: true,
    grade: map.grade,
    reward: { gold, diamonds, itemId, itemCount },
    totalFound: player.treasureFound,
  };
}

module.exports = {
  TREASURE_GRADES,
  TREASURE_CONFIG,
  grantMap,
  getActiveMaps,
  getProximityHint,
  digTreasure,
};

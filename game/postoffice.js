// 우체국 (택배 운송) 시스템 — v1.59
// 마을 ↔ 마을 패키지 운송 계약
// 거리/위험도에 따른 보상 차등 + 배송 시간 제한 + PK존 통과 위험

const { ZONES } = require('./data/zones');

// 패키지 종류
const PACKAGE_TYPES = {
  letter: {
    name: '편지', icon: '📜', baseReward: 100,
    weightFactor: 1.0, // 이동속도 영향
    desc: '가벼운 편지 — 빠르게 배송',
  },
  parcel: {
    name: '소포', icon: '📦', baseReward: 300,
    weightFactor: 0.95,
    desc: '작은 소포',
  },
  fragile: {
    name: '깨지기 쉬운 물건', icon: '🥚', baseReward: 800,
    weightFactor: 0.90,
    desc: '주의해서 운반 — 사망 시 손실',
    fragile: true,
  },
  precious: {
    name: '귀중품', icon: '💎', baseReward: 2000,
    weightFactor: 0.85,
    desc: 'PK 위험 — 약탈 가능',
    valuable: true,
  },
  royal: {
    name: '왕실 봉인 화물', icon: '👑', baseReward: 5000,
    weightFactor: 0.80,
    desc: '왕실 의뢰 — 최고 보상',
    royal: true,
  },
};

const POSTOFFICE_CONFIG = {
  maxActiveContracts: 3,
  rewardMultiplier: 1.5, // 거리당 추가 보너스
  timeLimit: 30 * 60 * 1000, // 30분 제한
  failurePenalty: 0.5, // 실패 시 절반만 보상
};

let contractIdCounter = 1;

function _ensure(player) {
  if (!player.deliveries) player.deliveries = { active: [], completed: 0 };
  return player.deliveries;
}

function _getTowns() {
  return Object.entries(ZONES).filter(([id, z]) => z.safe && !z.isArena);
}

function _calcDistance(zone1, zone2) {
  const dx = (zone1.x + zone1.w / 2) - (zone2.x + zone2.w / 2);
  const dy = (zone1.y + zone1.h / 2) - (zone2.y + zone2.h / 2);
  return Math.sqrt(dx * dx + dy * dy);
}

// 무작위 계약 생성
function generateContract(type = null) {
  const towns = _getTowns();
  if (towns.length < 2) return null;

  const [fromId, fromZone] = towns[Math.floor(Math.random() * towns.length)];
  let toId, toZone;
  let attempts = 0;
  do {
    [toId, toZone] = towns[Math.floor(Math.random() * towns.length)];
    attempts++;
  } while (toId === fromId && attempts < 10);
  if (toId === fromId) return null;

  const distance = _calcDistance(fromZone, toZone);

  // 패키지 종류 선택 (지정 또는 거리 기반)
  let packageType = type;
  if (!packageType) {
    if (distance > 1500) packageType = Math.random() < 0.3 ? 'royal' : 'precious';
    else if (distance > 1000) packageType = Math.random() < 0.5 ? 'precious' : 'fragile';
    else if (distance > 500) packageType = Math.random() < 0.5 ? 'fragile' : 'parcel';
    else packageType = Math.random() < 0.5 ? 'parcel' : 'letter';
  }
  const pkg = PACKAGE_TYPES[packageType];
  if (!pkg) return null;

  const distanceBonus = Math.floor(distance / 100) * pkg.baseReward * 0.1;
  const totalReward = Math.floor(pkg.baseReward + distanceBonus);

  return {
    id: `delivery_${contractIdCounter++}`,
    type: packageType,
    package: pkg,
    fromZone: fromId,
    fromName: fromZone.name,
    toZone: toId,
    toName: toZone.name,
    distance: Math.floor(distance),
    reward: totalReward,
    expReward: Math.floor(totalReward * 0.5),
  };
}

function acceptContract(player, contract) {
  const d = _ensure(player);
  if (d.active.length >= POSTOFFICE_CONFIG.maxActiveContracts) {
    return { success: false, msg: `최대 ${POSTOFFICE_CONFIG.maxActiveContracts}개 동시 진행` };
  }
  // 출발지에 있어야 수락 가능
  d.active.push({
    ...contract,
    acceptedAt: Date.now(),
    expiresAt: Date.now() + POSTOFFICE_CONFIG.timeLimit,
    delivered: false,
  });
  return { success: true, contractId: contract.id };
}

function deliverPackage(player, contractId) {
  const d = _ensure(player);
  const idx = d.active.findIndex(c => c.id === contractId);
  if (idx < 0) return { success: false, msg: '존재하지 않는 계약' };
  const contract = d.active[idx];
  if (Date.now() > contract.expiresAt) {
    // 시간 초과
    d.active.splice(idx, 1);
    return { success: false, msg: '배송 시간 초과 — 실패' };
  }
  // 실제 게임에서는 player.currentZone이 contract.toZone과 일치해야 함
  // 여기서는 검증을 server.js에서 수행
  d.active.splice(idx, 1);
  d.completed++;

  player.gold = Math.min(999999999, (player.gold || 0) + contract.reward);
  player.exp = (player.exp || 0) + contract.expReward;

  return {
    success: true,
    reward: contract.reward,
    expReward: contract.expReward,
    package: contract.package.name,
  };
}

function failDelivery(player, contractId, reason = '실패') {
  const d = _ensure(player);
  const idx = d.active.findIndex(c => c.id === contractId);
  if (idx < 0) return { success: false };
  const contract = d.active[idx];
  d.active.splice(idx, 1);
  // 부분 보상
  if (!contract.package.fragile && !contract.package.valuable) {
    const partial = Math.floor(contract.reward * POSTOFFICE_CONFIG.failurePenalty);
    player.gold = Math.min(999999999, (player.gold || 0) + partial);
    return { success: true, partial, reason };
  }
  return { success: true, partial: 0, reason };
}

function getStatus(player) {
  const d = _ensure(player);
  // 만료 청소
  const now = Date.now();
  d.active = d.active.filter(c => c.expiresAt > now);

  // 새 계약 3개 생성 (보드)
  const board = [];
  for (let i = 0; i < 5; i++) {
    const c = generateContract();
    if (c) board.push(c);
  }

  return {
    active: d.active,
    completed: d.completed,
    maxActive: POSTOFFICE_CONFIG.maxActiveContracts,
    timeLimit: POSTOFFICE_CONFIG.timeLimit,
    board,
    packageTypes: PACKAGE_TYPES,
  };
}

module.exports = {
  PACKAGE_TYPES,
  POSTOFFICE_CONFIG,
  generateContract,
  acceptContract,
  deliverPackage,
  failDelivery,
  getStatus,
};

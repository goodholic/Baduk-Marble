// 펫 교배 시스템 — v1.48
// 2개의 펫을 교배해 하이브리드 자손 생성
// 자손은 부모 양쪽의 효과를 약화 버전으로 계승 + 희귀 변이 가능
// 교배 쿨다운 24시간 + 다이아 비용

const { PETS } = require('./pet');

// 교배 시 등장 가능한 하이브리드 풀 (특별한 조합)
const HYBRID_PETS = {
  // 슬라임 + 늑대 = 슬라임 늑대
  slime_wolf: {
    parents: ['pet_slime', 'pet_wolf'],
    name: '슬라임 늑대',
    effect: 'hpRegen', value: 0.06,
    desc: '슬라임의 재생력과 늑대의 공격성',
  },
  // 요정 + 드래곤 = 빛의 드래곤
  light_dragon: {
    parents: ['pet_fairy', 'pet_dragon'],
    name: '빛의 드래곤',
    effect: 'expBonus', value: 0.25,
    desc: '요정의 경험치 + 드래곤의 위엄',
  },
  // 천사 + 불사조 = 성스러운 불사조
  holy_phoenix: {
    parents: ['pet_angel', 'pet_phoenix'],
    name: '성스러운 불사조',
    effect: 'autoRevive', value: 2,
    desc: '천사의 부활과 불사조의 화염',
  },
  // 유니콘 + 페어리 = 빛의 유니콘
  light_unicorn: {
    parents: ['pet_unicorn', 'pet_fairy'],
    name: '빛의 유니콘',
    effect: 'dodgeBonus', value: 0.15,
    desc: '유니콘의 회피와 요정의 축복',
  },
};

const BREEDING_CONFIG = {
  cooldownHours: 24,
  goldCost: 10000,
  diamondCost: 50,
  mutationChance: 0.10, // 10% 확률로 부모 값 +50% 보너스
  hybridChance: 0.30,   // 30% 확률로 특별 하이브리드 (조합 매칭 시)
};

function _ensure(player) {
  if (!player.breeding) player.breeding = { lastBredAt: 0, totalBred: 0 };
  return player.breeding;
}

function canBreed(player) {
  const b = _ensure(player);
  const now = Date.now();
  const cooldownMs = BREEDING_CONFIG.cooldownHours * 3600 * 1000;
  return (now - b.lastBredAt) >= cooldownMs;
}

function getRemainingCooldown(player) {
  const b = _ensure(player);
  const now = Date.now();
  const cooldownMs = BREEDING_CONFIG.cooldownHours * 3600 * 1000;
  return Math.max(0, cooldownMs - (now - b.lastBredAt));
}

function _findHybrid(parent1Id, parent2Id) {
  for (const [hybridId, hybrid] of Object.entries(HYBRID_PETS)) {
    const [a, b] = hybrid.parents;
    if ((a === parent1Id && b === parent2Id) || (a === parent2Id && b === parent1Id)) {
      return { id: hybridId, ...hybrid };
    }
  }
  return null;
}

function breed(player, parent1Id, parent2Id) {
  if (!player.pets) return { success: false, msg: '보유한 펫 없음' };
  if (parent1Id === parent2Id) return { success: false, msg: '서로 다른 펫 필요' };
  if (!player.pets.includes(parent1Id) || !player.pets.includes(parent2Id)) {
    return { success: false, msg: '두 펫 모두 보유 필요' };
  }
  if (!canBreed(player)) {
    const remainMs = getRemainingCooldown(player);
    const hours = Math.ceil(remainMs / 3600000);
    return { success: false, msg: `교배 쿨다운 중 (${hours}시간 남음)` };
  }
  const goldCost = BREEDING_CONFIG.goldCost;
  const diamondCost = BREEDING_CONFIG.diamondCost;
  if ((player.gold || 0) < goldCost) return { success: false, msg: `골드 ${goldCost} 필요` };
  if ((player.diamonds || 0) < diamondCost) return { success: false, msg: `다이아 ${diamondCost} 필요` };

  player.gold -= goldCost;
  player.diamonds -= diamondCost;

  const b = _ensure(player);
  b.lastBredAt = Date.now();
  b.totalBred++;

  // 1순위: 특별 하이브리드 조합 매칭
  const hybrid = _findHybrid(parent1Id, parent2Id);
  if (hybrid && Math.random() < BREEDING_CONFIG.hybridChance) {
    // 특별 하이브리드 등장!
    return {
      success: true,
      type: 'hybrid',
      offspring: {
        id: hybrid.id,
        name: hybrid.name,
        effect: hybrid.effect,
        value: hybrid.value,
        desc: hybrid.desc,
        parents: hybrid.parents,
      },
    };
  }

  // 2순위: 일반 자손 (부모 효과 약화 계승 + 변이)
  const parent1 = PETS[parent1Id];
  const parent2 = PETS[parent2Id];
  if (!parent1 || !parent2) return { success: false, msg: '존재하지 않는 부모' };

  // 효과: 둘 중 더 강한 부모의 효과 (50% 약화)
  const stronger = (parent1.value || 0) >= (parent2.value || 0) ? parent1 : parent2;
  let baseValue = (stronger.value || 0) * 0.5;

  // 변이 체크 (10% 확률 +50% 보너스)
  const mutated = Math.random() < BREEDING_CONFIG.mutationChance;
  if (mutated) baseValue *= 1.5;

  return {
    success: true,
    type: mutated ? 'mutation' : 'normal',
    offspring: {
      name: `${parent1.name.slice(0,2)}${parent2.name.slice(-2)}`,
      effect: stronger.effect,
      value: +baseValue.toFixed(3),
      parents: [parent1.name, parent2.name],
      mutated,
    },
  };
}

function getStatus(player) {
  const b = _ensure(player);
  return {
    canBreed: canBreed(player),
    remainingMs: getRemainingCooldown(player),
    totalBred: b.totalBred,
    goldCost: BREEDING_CONFIG.goldCost,
    diamondCost: BREEDING_CONFIG.diamondCost,
    cooldownHours: BREEDING_CONFIG.cooldownHours,
    hybridPool: HYBRID_PETS,
  };
}

module.exports = {
  HYBRID_PETS,
  BREEDING_CONFIG,
  canBreed,
  breed,
  getStatus,
};

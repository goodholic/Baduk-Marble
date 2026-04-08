// 시간 캡슐 — v1.80 (80번째 패치 마일스톤)
// 골드/아이템을 일정 기간 묻어두면 이자 + 보너스 받고 회수
// 장기 저축 게임플레이 + 인내심 보상

const CAPSULE_TIERS = {
  short: {
    name: '단기 저축',
    days: 7,
    interestRate: 0.10,    // 10%
    minGold: 1000,
    maxGold: 100000,
    earlyWithdrawPenalty: 0.50, // 50% 손실
  },
  medium: {
    name: '중기 저축',
    days: 30,
    interestRate: 0.50,    // 50%
    minGold: 5000,
    maxGold: 500000,
    earlyWithdrawPenalty: 0.40,
  },
  long: {
    name: '장기 저축',
    days: 90,
    interestRate: 1.50,    // 150% (2.5배)
    minGold: 20000,
    maxGold: 5000000,
    earlyWithdrawPenalty: 0.30,
  },
  legendary: {
    name: '전설 저축',
    days: 365,
    interestRate: 5.00,    // 500% (6배)
    minGold: 100000,
    maxGold: 999999999,
    earlyWithdrawPenalty: 0.20,
  },
};

const CAPSULE_CONFIG = {
  maxActiveCapsules: 5,
  weekendBonusRate: 0.05, // 주말 만기 시 추가 5%
};

let capsuleIdCounter = 1;

function _ensure(player) {
  if (!player.timeCapsules) player.timeCapsules = [];
  return player.timeCapsules;
}

function depositCapsule(player, tierKey, goldAmount) {
  const tier = CAPSULE_TIERS[tierKey];
  if (!tier) return { success: false, msg: '존재하지 않는 등급' };

  const capsules = _ensure(player);
  if (capsules.length >= CAPSULE_CONFIG.maxActiveCapsules) {
    return { success: false, msg: `최대 ${CAPSULE_CONFIG.maxActiveCapsules}개 캡슐` };
  }

  if (goldAmount < tier.minGold) return { success: false, msg: `최소 ${tier.minGold}G 필요` };
  if (goldAmount > tier.maxGold) return { success: false, msg: `최대 ${tier.maxGold}G` };
  if ((player.gold || 0) < goldAmount) return { success: false, msg: '골드 부족' };

  player.gold -= goldAmount;

  const now = Date.now();
  const capsule = {
    id: `capsule_${capsuleIdCounter++}`,
    tier: tierKey,
    tierName: tier.name,
    deposited: goldAmount,
    interestRate: tier.interestRate,
    depositedAt: now,
    maturityAt: now + tier.days * 24 * 3600 * 1000,
    days: tier.days,
  };
  capsules.push(capsule);

  return {
    success: true,
    capsule,
    expectedReturn: Math.floor(goldAmount * (1 + tier.interestRate)),
  };
}

function withdrawCapsule(player, capsuleId) {
  const capsules = _ensure(player);
  const idx = capsules.findIndex(c => c.id === capsuleId);
  if (idx < 0) return { success: false, msg: '존재하지 않는 캡슐' };

  const capsule = capsules[idx];
  const tier = CAPSULE_TIERS[capsule.tier];
  const now = Date.now();
  const isMatured = now >= capsule.maturityAt;

  let payout;
  let earlyWithdraw = false;

  if (isMatured) {
    // 만기 회수 — 원금 + 이자
    let totalRate = capsule.interestRate;
    // 주말 보너스
    const day = new Date(capsule.maturityAt).getDay();
    if (day === 0 || day === 6) {
      totalRate += CAPSULE_CONFIG.weekendBonusRate;
    }
    payout = Math.floor(capsule.deposited * (1 + totalRate));
  } else {
    // 조기 회수 — 페널티 적용
    earlyWithdraw = true;
    payout = Math.floor(capsule.deposited * (1 - tier.earlyWithdrawPenalty));
  }

  player.gold = (player.gold || 0) + payout;
  capsules.splice(idx, 1);

  return {
    success: true,
    capsule,
    payout,
    earlyWithdraw,
    profit: payout - capsule.deposited,
  };
}

function getStatus(player) {
  const capsules = _ensure(player);
  const now = Date.now();
  return {
    capsules: capsules.map(c => ({
      ...c,
      isMatured: now >= c.maturityAt,
      remainingMs: Math.max(0, c.maturityAt - now),
      expectedPayout: Math.floor(c.deposited * (1 + c.interestRate)),
    })),
    activeCount: capsules.length,
    maxCapsules: CAPSULE_CONFIG.maxActiveCapsules,
    tiers: CAPSULE_TIERS,
  };
}

module.exports = {
  CAPSULE_TIERS,
  CAPSULE_CONFIG,
  depositCapsule,
  withdrawCapsule,
  getStatus,
};

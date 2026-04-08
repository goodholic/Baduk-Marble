// 장비 보험 시스템 — v1.56
// 고가 장비가 사망/강화 실패로 손실되는 것을 방지
// 등급별 프리미엄 + 7일 만료 + 자동 갱신 옵션

const { EQUIP_STATS } = require('./data/equipment');

// 등급별 보험 프리미엄 (7일 기준 골드)
const PREMIUM_BY_GRADE = {
  normal:    100,    // 7일 100G
  uncommon:  500,    // 7일 500G
  rare:      2000,   // 7일 2000G
  epic:      8000,   // 7일 8000G
  legendary: 30000,  // 7일 30000G
};

const INSURANCE_CONFIG = {
  duration: 7 * 24 * 3600 * 1000, // 7일
  autoRenewDiscount: 0.10,         // 자동 갱신 시 10% 할인
  deathPayoutPct: 1.0,             // 사망 시 100% 보상 (재구매 가능)
  enhanceFailPayoutPct: 0.5,       // 강화 실패 시 50% 보상
};

function _ensure(player) {
  if (!player.insurance) player.insurance = { policies: {}, totalClaims: 0 };
  return player.insurance;
}

function getPremium(equipId) {
  const equip = EQUIP_STATS[equipId];
  if (!equip) return null;
  const grade = equip.grade || 'normal';
  return PREMIUM_BY_GRADE[grade] || 0;
}

function buyInsurance(player, equipId, autoRenew = false) {
  const equip = EQUIP_STATS[equipId];
  if (!equip) return { success: false, msg: '존재하지 않는 장비' };
  if (!player.inventory || !player.inventory[equipId]) {
    return { success: false, msg: '보유하지 않은 장비' };
  }
  let premium = getPremium(equipId);
  if (autoRenew) premium = Math.floor(premium * (1 - INSURANCE_CONFIG.autoRenewDiscount));
  if ((player.gold || 0) < premium) {
    return { success: false, msg: `골드 ${premium} 필요` };
  }

  const ins = _ensure(player);
  if (ins.policies[equipId]) {
    // 갱신 — 만료 시각 연장
    ins.policies[equipId].expiresAt = Math.max(
      ins.policies[equipId].expiresAt,
      Date.now()
    ) + INSURANCE_CONFIG.duration;
    ins.policies[equipId].autoRenew = autoRenew;
  } else {
    ins.policies[equipId] = {
      grade: equip.grade,
      premium,
      autoRenew,
      purchasedAt: Date.now(),
      expiresAt: Date.now() + INSURANCE_CONFIG.duration,
    };
  }

  player.gold -= premium;
  return { success: true, equipId, premium, expiresAt: ins.policies[equipId].expiresAt };
}

function isInsured(player, equipId) {
  const ins = _ensure(player);
  const policy = ins.policies[equipId];
  return !!(policy && policy.expiresAt > Date.now());
}

function claimDeath(player, equipId) {
  const ins = _ensure(player);
  const policy = ins.policies[equipId];
  if (!policy || policy.expiresAt < Date.now()) {
    return { success: false, msg: '보험 없음' };
  }
  // 사망 시 보상: 장비 동일 ID로 인벤토리 1개 환급
  if (!player.inventory) player.inventory = {};
  player.inventory[equipId] = (player.inventory[equipId] || 0) + 1;
  ins.totalClaims++;
  // 보험 1회 사용 후 만료
  delete ins.policies[equipId];
  return { success: true, payout: '장비 환급', equipId };
}

function claimEnhanceFail(player, equipId) {
  const ins = _ensure(player);
  const policy = ins.policies[equipId];
  if (!policy || policy.expiresAt < Date.now()) {
    return { success: false, msg: '보험 없음' };
  }
  // 강화 실패 시 보상: 골드 50% 환급 (프리미엄 기준)
  const refund = Math.floor(policy.premium * INSURANCE_CONFIG.enhanceFailPayoutPct);
  player.gold = (player.gold || 0) + refund;
  ins.totalClaims++;
  return { success: true, payout: refund };
}

function autoRenewExpired(player) {
  const ins = _ensure(player);
  const renewed = [];
  const now = Date.now();
  for (const [equipId, policy] of Object.entries(ins.policies)) {
    if (policy.expiresAt < now && policy.autoRenew) {
      let premium = getPremium(equipId);
      premium = Math.floor(premium * (1 - INSURANCE_CONFIG.autoRenewDiscount));
      if ((player.gold || 0) >= premium) {
        player.gold -= premium;
        policy.expiresAt = now + INSURANCE_CONFIG.duration;
        policy.purchasedAt = now;
        renewed.push({ equipId, premium });
      }
    }
  }
  // 만료된 비자동 갱신 정책 삭제
  for (const equipId of Object.keys(ins.policies)) {
    if (ins.policies[equipId].expiresAt < now && !ins.policies[equipId].autoRenew) {
      delete ins.policies[equipId];
    }
  }
  return renewed;
}

function getStatus(player) {
  const ins = _ensure(player);
  autoRenewExpired(player); // 만료 정책 청소
  return {
    policies: ins.policies,
    totalClaims: ins.totalClaims,
    premiumByGrade: PREMIUM_BY_GRADE,
    config: INSURANCE_CONFIG,
  };
}

module.exports = {
  PREMIUM_BY_GRADE,
  INSURANCE_CONFIG,
  getPremium,
  buyInsurance,
  isInsured,
  claimDeath,
  claimEnhanceFail,
  autoRenewExpired,
  getStatus,
};

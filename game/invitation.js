// 초대 시스템 — v1.79
// 플레이어가 친구를 초대 → 양쪽 모두 마일스톤 보상
// 친구 레벨에 따라 단계별 보상 지급

const INVITATION_REWARDS = {
  level_5: {
    name: '첫걸음',
    inviterReward: { gold: 1000, exp: 500 },
    inviteeReward: { gold: 500, exp: 200, item: 'starter_pack' },
  },
  level_10: {
    name: '진정한 동료',
    inviterReward: { gold: 3000, diamonds: 30 },
    inviteeReward: { gold: 1000, diamonds: 10 },
  },
  level_20: {
    name: '전직 축하',
    inviterReward: { gold: 8000, diamonds: 80, item: 'rare_box' },
    inviteeReward: { gold: 3000, diamonds: 30 },
  },
  level_30: {
    name: '영웅의 길',
    inviterReward: { gold: 15000, diamonds: 150 },
    inviteeReward: { gold: 5000, diamonds: 50 },
  },
  level_50: {
    name: '전설의 동료',
    inviterReward: { gold: 50000, diamonds: 500, title: 'mentor' },
    inviteeReward: { gold: 10000, diamonds: 100 },
  },
};

const INVITATION_CONFIG = {
  codeLength: 8,
  maxInvitesPerPlayer: 50,
};

let invitationCodes = {}; // { code: { inviterId, createdAt, used: 0 } }
let referralLinks = {}; // { inviteeId: inviterId }

function _generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < INVITATION_CONFIG.codeLength; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateCode(player) {
  // 중복 방지 — 이미 코드 있으면 재사용
  if (player.invitationCode) {
    return { success: true, code: player.invitationCode, isNew: false };
  }
  let code;
  let attempts = 0;
  do {
    code = _generateCode();
    attempts++;
  } while (invitationCodes[code] && attempts < 10);
  invitationCodes[code] = { inviterId: player.id, createdAt: Date.now(), used: 0 };
  player.invitationCode = code;
  return { success: true, code, isNew: true };
}

function applyCode(invitee, code) {
  const codeData = invitationCodes[code];
  if (!codeData) return { success: false, msg: '잘못된 초대 코드' };
  if (codeData.inviterId === invitee.id) return { success: false, msg: '자기 코드 사용 불가' };
  if (referralLinks[invitee.id]) return { success: false, msg: '이미 다른 코드 사용함' };
  if ((invitee.level || 1) > 5) return { success: false, msg: '레벨 5 이하만 사용 가능' };

  referralLinks[invitee.id] = codeData.inviterId;
  codeData.used++;
  invitee.invitedBy = codeData.inviterId;

  return {
    success: true,
    inviterId: codeData.inviterId,
    msg: '초대 코드 적용 완료! 마일스톤 도달 시 양쪽 모두 보상',
  };
}

// 초대받은 플레이어가 레벨 도달 시 호출 (서버에서 자동)
function checkMilestone(invitee, players) {
  const inviterId = referralLinks[invitee.id];
  if (!inviterId) return null;
  const inviter = players[inviterId];
  if (!inviter) return null;

  if (!invitee.invitationMilestonesGiven) invitee.invitationMilestonesGiven = [];

  const level = invitee.level || 1;
  const triggered = [];

  for (const [milestoneKey, milestone] of Object.entries(INVITATION_REWARDS)) {
    const requiredLevel = parseInt(milestoneKey.split('_')[1]);
    if (level >= requiredLevel && !invitee.invitationMilestonesGiven.includes(milestoneKey)) {
      invitee.invitationMilestonesGiven.push(milestoneKey);

      // 양쪽 보상 지급
      if (milestone.inviterReward.gold) inviter.gold = Math.min(999999999, (inviter.gold || 0) + milestone.inviterReward.gold);
      if (milestone.inviterReward.diamonds) inviter.diamonds = Math.min(999999999, (inviter.diamonds || 0) + milestone.inviterReward.diamonds);
      if (milestone.inviterReward.title) {
        if (!inviter.titles) inviter.titles = [];
        if (!inviter.titles.includes(milestone.inviterReward.title)) inviter.titles.push(milestone.inviterReward.title);
      }
      if (milestone.inviterReward.item) {
        if (!inviter.inventory) inviter.inventory = {};
        inviter.inventory[milestone.inviterReward.item] = (inviter.inventory[milestone.inviterReward.item] || 0) + 1;
      }

      if (milestone.inviteeReward.gold) invitee.gold = Math.min(999999999, (invitee.gold || 0) + milestone.inviteeReward.gold);
      if (milestone.inviteeReward.diamonds) invitee.diamonds = Math.min(999999999, (invitee.diamonds || 0) + milestone.inviteeReward.diamonds);
      if (milestone.inviteeReward.item) {
        if (!invitee.inventory) invitee.inventory = {};
        invitee.inventory[milestone.inviteeReward.item] = (invitee.inventory[milestone.inviteeReward.item] || 0) + 1;
      }

      triggered.push({ milestoneKey, milestone });
    }
  }

  return triggered.length > 0 ? triggered : null;
}

function getStatus(player) {
  const code = player.invitationCode || null;
  const myCodeData = code ? invitationCodes[code] : null;
  const inviterId = referralLinks[player.id] || null;
  return {
    myCode: code,
    invitesUsed: myCodeData?.used || 0,
    maxInvites: INVITATION_CONFIG.maxInvitesPerPlayer,
    invitedBy: inviterId,
    milestonesGiven: player.invitationMilestonesGiven || [],
    rewards: INVITATION_REWARDS,
  };
}

module.exports = {
  INVITATION_REWARDS,
  INVITATION_CONFIG,
  generateCode,
  applyCode,
  checkMilestone,
  getStatus,
};

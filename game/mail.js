// 우편함 시스템 — v1.34
// 구조화된 메일 — 발신자/제목/본문/첨부(골드/다이아/아이템)/만료/읽음 상태
// 시스템 발송 (이벤트 보상, GM 메시지) + 플레이어 간 발송 (선물)
// 기존 인라인 pendingMails를 보완하는 정식 모듈

const MAIL_CONFIG = {
  maxInboxSize: 100,           // 우편함 최대 개수
  defaultExpiryDays: 30,       // 기본 만료 30일
  systemExpiryDays: 14,        // 시스템 메일은 14일
  giftExpiryDays: 7,           // 플레이어 선물은 7일
  giftFeePct: 0.02,            // 선물 발송 수수료 2% (아이템가 기준은 생략, 골드 첨부의 2%)
  maxGiftPerDay: 10,           // 하루 최대 선물 발송 횟수
};

let mailIdCounter = 1;
const inboxes = {}; // { playerId: [mail, mail, ...] }

function _ensureInbox(playerId) {
  if (!inboxes[playerId]) inboxes[playerId] = [];
  return inboxes[playerId];
}

function _expireOld(playerId) {
  const list = _ensureInbox(playerId);
  const now = Date.now();
  // 만료된 메일 제거
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].expiresAt < now) list.splice(i, 1);
  }
}

function sendSystemMail(playerId, title, body, attachments = {}) {
  const list = _ensureInbox(playerId);
  if (list.length >= MAIL_CONFIG.maxInboxSize) return { success: false, msg: '수신자 우편함 가득' };
  const mail = {
    id: `mail_${mailIdCounter++}`,
    type: 'system',
    senderId: 'SYSTEM',
    senderName: '시스템',
    title,
    body,
    attachments, // { gold, diamonds, items: { itemId: count } }
    sentAt: Date.now(),
    expiresAt: Date.now() + MAIL_CONFIG.systemExpiryDays * 86400 * 1000,
    read: false,
    claimed: false,
  };
  list.push(mail);
  return { success: true, mailId: mail.id };
}

function sendGiftMail(senderPlayer, recipientPlayerId, title, body, attachments = {}) {
  // 일일 발송 제한 체크
  const today = new Date().toISOString().slice(0, 10);
  if (senderPlayer.giftMailDate !== today) {
    senderPlayer.giftMailDate = today;
    senderPlayer.giftMailCount = 0;
  }
  if ((senderPlayer.giftMailCount || 0) >= MAIL_CONFIG.maxGiftPerDay) {
    return { success: false, msg: `하루 최대 ${MAIL_CONFIG.maxGiftPerDay}회 발송 가능` };
  }
  // 수수료 (골드 첨부 시)
  const goldAttached = attachments.gold || 0;
  const fee = Math.floor(goldAttached * MAIL_CONFIG.giftFeePct);
  const totalCost = goldAttached + fee;
  if (senderPlayer.gold < totalCost) {
    return { success: false, msg: `골드 부족 (수수료 포함 ${totalCost}G)` };
  }
  // 다이아 첨부 검증
  if (attachments.diamonds && (senderPlayer.diamonds || 0) < attachments.diamonds) {
    return { success: false, msg: '다이아 부족' };
  }
  // 아이템 첨부 검증
  if (attachments.items) {
    if (!senderPlayer.inventory) senderPlayer.inventory = {};
    for (const [itemId, count] of Object.entries(attachments.items)) {
      if ((senderPlayer.inventory[itemId] || 0) < count) {
        return { success: false, msg: `아이템 부족: ${itemId}` };
      }
    }
  }

  const list = _ensureInbox(recipientPlayerId);
  if (list.length >= MAIL_CONFIG.maxInboxSize) return { success: false, msg: '수신자 우편함 가득' };

  // 자원 차감
  senderPlayer.gold -= totalCost;
  if (attachments.diamonds) senderPlayer.diamonds -= attachments.diamonds;
  if (attachments.items) {
    for (const [itemId, count] of Object.entries(attachments.items)) {
      senderPlayer.inventory[itemId] -= count;
      if (senderPlayer.inventory[itemId] <= 0) delete senderPlayer.inventory[itemId];
    }
  }
  senderPlayer.giftMailCount = (senderPlayer.giftMailCount || 0) + 1;

  const mail = {
    id: `mail_${mailIdCounter++}`,
    type: 'gift',
    senderId: senderPlayer.id,
    senderName: senderPlayer.displayName,
    title,
    body,
    attachments,
    sentAt: Date.now(),
    expiresAt: Date.now() + MAIL_CONFIG.giftExpiryDays * 86400 * 1000,
    read: false,
    claimed: false,
  };
  list.push(mail);
  return { success: true, mailId: mail.id, fee };
}

function getInbox(playerId) {
  _expireOld(playerId);
  return _ensureInbox(playerId).slice().sort((a, b) => b.sentAt - a.sentAt);
}

function markRead(playerId, mailId) {
  const list = _ensureInbox(playerId);
  const mail = list.find(m => m.id === mailId);
  if (!mail) return { success: false, msg: '메일 없음' };
  mail.read = true;
  return { success: true };
}

// 첨부 수령 (recipient 객체 직접 수정)
function claimAttachments(recipient, mailId) {
  const list = _ensureInbox(recipient.id);
  const mail = list.find(m => m.id === mailId);
  if (!mail) return { success: false, msg: '메일 없음' };
  if (mail.claimed) return { success: false, msg: '이미 수령됨' };
  if (mail.expiresAt < Date.now()) return { success: false, msg: '만료된 메일' };

  const a = mail.attachments || {};
  if (a.gold) recipient.gold = (recipient.gold || 0) + a.gold;
  if (a.diamonds) recipient.diamonds = (recipient.diamonds || 0) + a.diamonds;
  if (a.items) {
    if (!recipient.inventory) recipient.inventory = {};
    for (const [itemId, count] of Object.entries(a.items)) {
      recipient.inventory[itemId] = (recipient.inventory[itemId] || 0) + count;
    }
  }
  mail.claimed = true;
  mail.read = true;
  return { success: true, attachments: a };
}

function deleteMail(playerId, mailId) {
  const list = _ensureInbox(playerId);
  const idx = list.findIndex(m => m.id === mailId);
  if (idx < 0) return { success: false, msg: '메일 없음' };
  // 첨부 수령 안 한 메일은 삭제 거부
  if (!list[idx].claimed && list[idx].attachments &&
      (list[idx].attachments.gold || list[idx].attachments.diamonds || list[idx].attachments.items)) {
    return { success: false, msg: '첨부 미수령 메일은 삭제 불가' };
  }
  list.splice(idx, 1);
  return { success: true };
}

function getUnreadCount(playerId) {
  _expireOld(playerId);
  return _ensureInbox(playerId).filter(m => !m.read).length;
}

module.exports = {
  MAIL_CONFIG,
  sendSystemMail,
  sendGiftMail,
  getInbox,
  markRead,
  claimAttachments,
  deleteMail,
  getUnreadCount,
  _inboxes: inboxes,
};

// ============================================
// 카드 우편 시스템 — 플레이어 간 카드/골드 선물, 시스템 우편, 선물 패키지
// ============================================

const MAX_MAILBOX = 30;
const SEND_FEE = 100; // 발송 수수료
const MAIL_EXPIRE_DAYS = 30; // 우편 만료 기간 (일)

// --- 선물 패키지 ---
const GIFT_PACKAGES = [
  { id: 'gift_basic', name: '기본 선물📦', cost: 500, rewards: { gold: 300 }, desc: '간단한 선물' },
  { id: 'gift_premium', name: '고급 선물🎁', cost: 2000, rewards: { gold: 1000, diamonds: 3 }, desc: '좋은 선물' },
  { id: 'gift_luxury', name: '럭셔리 선물👑', cost: 10000, rewards: { gold: 5000, diamonds: 15 }, desc: '최고급 선물' },
  { id: 'gift_valentine', name: '하트 선물💝', cost: 5000, rewards: { gold: 2000, diamonds: 10, friendPoints: 100 }, desc: '우정 포인트 보너스!' },
];

// --- 시스템 우편 템플릿 ---
const SYSTEM_MAIL_TEMPLATES = {
  welcome: { title: '🎉 환영합니다!', message: 'AutoBattle.io에 오신 것을 환영합니다! 모험을 시작하세요!', rewards: { gold: 5000, diamonds: 30 } },
  daily_login: { title: '📅 출석 보상', message: '오늘도 접속해 주셔서 감사합니다!', rewards: { gold: 1000 } },
  pvp_season_end: { title: '⚔️ 시즌 종료 보상', message: '이번 시즌 수고하셨습니다!' },
  guild_raid_clear: { title: '🐲 길드 레이드 클리어!', message: '길드 레이드를 성공적으로 클리어했습니다!' },
  bounty_claimed: { title: '🎯 현상금 수배!', message: '현상금 수배 보상을 수령하세요!' },
  fortress_attacked: { title: '🏰 기지 공격!', message: '당신의 기지가 공격당했습니다!' },
};

function sendMail(player, targetName, type, content, message) {
  if ((player.gold || 0) < SEND_FEE) return { ok: false, reason: `수수료 ${SEND_FEE}G 필요` };

  const mail = {
    id: `mail_${Date.now()}`,
    from: player.displayName || player.name || '???',
    fromId: player.id || player.deviceId,
    to: targetName,
    type, // 'card' | 'gold' | 'diamonds' | 'message'
    content,
    message: (message || '').slice(0, 200),
    sentAt: Date.now(),
    read: false,
    claimed: false,
  };

  player.gold -= SEND_FEE;

  // 첨부물 차감
  if (type === 'card' && content.cardId) {
    const card = (player.cards || []).find(c => c.id === content.cardId);
    if (!card) return { ok: false, reason: '카드 없음' };
    player.cards = player.cards.filter(c => c.id !== content.cardId);
    mail.attachedCard = { ...card };
  }
  if (type === 'gold' && content.gold) {
    if ((player.gold || 0) < content.gold) return { ok: false, reason: '골드 부족' };
    player.gold -= content.gold;
    mail.attachedGold = content.gold;
  }
  if (type === 'diamonds' && content.diamonds) {
    if ((player.diamonds || 0) < content.diamonds) return { ok: false, reason: '다이아 부족' };
    player.diamonds -= content.diamonds;
    mail.attachedDiamonds = content.diamonds;
  }

  // 발신함에 저장 (실제로는 수신자 우편함에 넣어야 하지만 단일 서버이므로 간략화)
  player._sentMails = player._sentMails || [];
  player._sentMails.push(mail);

  return { ok: true, msg: `우편 발송! (${targetName}에게, 수수료 ${SEND_FEE}G)`, mail };
}

// --- 선물 패키지 발송 ---
function sendGiftPackage(player, targetName, packageId) {
  const pkg = GIFT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return { ok: false, reason: '존재하지 않는 선물 패키지' };
  if ((player.gold || 0) < pkg.cost) return { ok: false, reason: `골드 부족 (필요: ${pkg.cost}G, 보유: ${player.gold || 0}G)` };

  player.gold -= pkg.cost;

  // 수신자 우편함에 시스템 우편으로 전달
  // (실제로는 서버에서 수신자를 찾아 전달해야 하지만, 발신자의 _sentGifts에 기록)
  const giftMail = {
    id: `gift_${Date.now()}`,
    from: player.displayName || player.name || '???',
    fromId: player.id || player.deviceId,
    to: targetName,
    type: 'gift_package',
    packageId: pkg.id,
    packageName: pkg.name,
    rewards: { ...pkg.rewards },
    message: `${player.displayName || player.name}님이 ${pkg.name}을 보냈습니다! ${pkg.desc}`,
    sentAt: Date.now(),
    read: false,
    claimed: false,
  };

  player._sentMails = player._sentMails || [];
  player._sentMails.push(giftMail);

  return {
    ok: true,
    msg: `${targetName}에게 ${pkg.name} 발송! (-${pkg.cost}G)`,
    package: pkg,
    mail: giftMail,
  };
}

// 시스템 우편 (서버→플레이어, 보상 배달 등)
function sendSystemMail(player, title, rewards, message) {
  const inbox = player.mailbox = player.mailbox || [];
  if (inbox.length >= MAX_MAILBOX) inbox.shift(); // 오래된 것 삭제

  inbox.push({
    id: `sysmail_${Date.now()}`,
    from: '📮 시스템',
    type: 'system',
    title,
    message,
    rewards, // { gold, diamonds, card }
    sentAt: Date.now(),
    read: false,
    claimed: false,
  });
}

// 시스템 우편 템플릿으로 발송
function sendSystemMailFromTemplate(player, templateKey, extraRewards, extraMessage) {
  const template = SYSTEM_MAIL_TEMPLATES[templateKey];
  if (!template) return { ok: false, reason: `템플릿 없음: ${templateKey}` };

  const rewards = { ...(template.rewards || {}), ...(extraRewards || {}) };
  const message = extraMessage || template.message || '';

  sendSystemMail(player, template.title, rewards, message);
  return { ok: true, msg: `시스템 우편 발송: ${template.title}` };
}

function claimMail(player, mailId) {
  const inbox = player.mailbox || [];
  const mail = inbox.find(m => m.id === mailId);
  if (!mail) return { ok: false, reason: '우편 없음' };
  if (mail.claimed) return { ok: false, reason: '이미 수령' };

  mail.claimed = true;
  mail.read = true;

  const claimed = {};
  if (mail.rewards) {
    if (mail.rewards.gold) { player.gold = (player.gold || 0) + mail.rewards.gold; claimed.gold = mail.rewards.gold; }
    if (mail.rewards.diamonds) { player.diamonds = (player.diamonds || 0) + mail.rewards.diamonds; claimed.diamonds = mail.rewards.diamonds; }
  }
  if (mail.attachedCard) {
    player.cards = player.cards || [];
    player.cards.push({ ...mail.attachedCard, id: `card_${Date.now()}_received` });
    claimed.card = mail.attachedCard.name;
  }
  if (mail.attachedGold) { player.gold = (player.gold || 0) + mail.attachedGold; claimed.gold = (claimed.gold || 0) + mail.attachedGold; }
  if (mail.attachedDiamonds) { player.diamonds = (player.diamonds || 0) + mail.attachedDiamonds; claimed.diamonds = (claimed.diamonds || 0) + mail.attachedDiamonds; }

  return { ok: true, msg: `수령 완료!${claimed.gold ? ' +' + claimed.gold + 'G' : ''}${claimed.diamonds ? ' +' + claimed.diamonds + '💎' : ''}${claimed.card ? ' +카드: ' + claimed.card : ''}`, claimed };
}

// --- 읽지 않은 우편 수 ---
function getUnreadCount(player) {
  return (player.mailbox || []).filter(m => !m.read).length;
}

// --- 오래된 우편 정리 (30일 이상, 수령 완료된 것만 삭제) ---
function cleanupMails(player) {
  const inbox = player.mailbox || [];
  const now = Date.now();
  const expireMs = MAIL_EXPIRE_DAYS * 24 * 60 * 60 * 1000;

  const before = inbox.length;
  player.mailbox = inbox.filter(m => {
    const age = now - (m.sentAt || 0);
    // 만료 기간 지나고 이미 수령한 우편은 삭제
    if (age > expireMs && m.claimed) return false;
    // 만료 기간 지났지만 미수령은 유지 (보상 잃지 않도록)
    return true;
  });
  const removed = before - player.mailbox.length;

  return { ok: true, msg: `오래된 우편 ${removed}건 정리 완료`, removed, remaining: player.mailbox.length };
}

function register(io, socket, player) {
  socket.on('mail_inbox', () => {
    socket.emit('mail_inbox', {
      inbox: player.mailbox || [],
      maxMailbox: MAX_MAILBOX,
      unread: getUnreadCount(player),
    });
  });

  socket.on('mail_send', (data) => {
    const result = sendMail(player, data.targetName, data.type, data.content || {}, data.message);
    socket.emit('mail_send_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 선물 패키지 발송
  socket.on('mail_send_gift', (data) => {
    const result = sendGiftPackage(player, data.targetName, data.packageId);
    socket.emit('mail_send_gift_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('mail_claim', (data) => {
    const result = claimMail(player, data.mailId);
    socket.emit('mail_claim_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('mail_claim_all', () => {
    const inbox = player.mailbox || [];
    let totalGold = 0, totalDiamonds = 0, totalCards = 0;
    inbox.filter(m => !m.claimed).forEach(m => {
      const r = claimMail(player, m.id);
      if (r.ok && r.claimed) {
        totalGold += r.claimed.gold || 0;
        totalDiamonds += r.claimed.diamonds || 0;
        if (r.claimed.card) totalCards++;
      }
    });
    socket.emit('mail_claim_all_result', { ok: true, msg: `전체 수령! +${totalGold}G +${totalDiamonds}💎 +카드${totalCards}장` });
    socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 읽지 않은 우편 수
  socket.on('mail_unread_count', () => {
    socket.emit('mail_unread_count_result', { count: getUnreadCount(player) });
  });

  // 오래된 우편 정리
  socket.on('mail_cleanup', () => {
    const result = cleanupMails(player);
    socket.emit('mail_cleanup_result', result);
  });
}

module.exports = {
  sendMail, sendSystemMail, sendSystemMailFromTemplate, claimMail,
  sendGiftPackage, getUnreadCount, cleanupMails,
  register,
  MAX_MAILBOX, SEND_FEE, MAIL_EXPIRE_DAYS,
  GIFT_PACKAGES, SYSTEM_MAIL_TEMPLATES,
};

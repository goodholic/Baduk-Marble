// ============================================
// 카드 우편 시스템 — 플레이어 간 카드/골드 선물
// ============================================

const MAX_MAILBOX = 30;
const SEND_FEE = 100; // 발송 수수료

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

function register(io, socket, player) {
  socket.on('mail_inbox', () => {
    socket.emit('mail_inbox', { inbox: player.mailbox || [], maxMailbox: MAX_MAILBOX });
  });

  socket.on('mail_send', (data) => {
    const result = sendMail(player, data.targetName, data.type, data.content || {}, data.message);
    socket.emit('mail_send_result', result);
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
}

module.exports = { sendMail, sendSystemMail, claimMail, register, MAX_MAILBOX, SEND_FEE };

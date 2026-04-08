// 우편함 소켓 핸들러 — v1.85
function registerMailHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, MAX_GOLD, MAX_DIAMONDS, mailbox } = ctx;

  socket.on('mail_inbox', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('mail_inbox_result', {
      mails: mailbox.getInbox(p.id),
      unreadCount: mailbox.getUnreadCount(p.id),
      maxSize: mailbox.MAIL_CONFIG.maxInboxSize,
      giftLeft: Math.max(0, mailbox.MAIL_CONFIG.maxGiftPerDay - (p.giftMailDate === new Date().toISOString().slice(0,10) ? (p.giftMailCount||0) : 0)),
    });
  });

  socket.on('mail_read', (mailId) => {
    const p = players[playerId];
    if (!p) return;
    const result = mailbox.markRead(p.id, mailId);
    socket.emit('mail_read_result', result);
  });

  socket.on('mail_claim', (mailId) => {
    const p = players[playerId];
    if (!p) return;
    const result = mailbox.claimAttachments(p, mailId);
    if (result.success) {
      if (p.gold > MAX_GOLD) p.gold = MAX_GOLD;
      if (p.diamonds > MAX_DIAMONDS) p.diamonds = MAX_DIAMONDS;
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('mail_claim_result', result);
  });

  socket.on('mail_delete', (mailId) => {
    const p = players[playerId];
    if (!p) return;
    const result = mailbox.deleteMail(p.id, mailId);
    socket.emit('mail_delete_result', result);
  });

  socket.on('mail_send_gift', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || !data.recipientName || !data.title) {
      socket.emit('mail_send_result', { success: false, msg: '필수 정보 누락' });
      return;
    }
    let recipientId = null;
    for (const [pid, pl] of Object.entries(players)) {
      if (!pl.isBot && pl.displayName === data.recipientName) {
        recipientId = pid;
        break;
      }
    }
    if (!recipientId) {
      socket.emit('mail_send_result', { success: false, msg: '수신자를 찾을 수 없음 (접속 중인 플레이어만 가능)' });
      return;
    }
    const result = mailbox.sendGiftMail(p, recipientId, data.title, data.body || '', data.attachments || {});
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      try {
        io.to(recipientId).emit('mail_received', {
          mailId: result.mailId,
          senderName: p.displayName,
          title: data.title,
        });
      } catch (_) {}
    }
    socket.emit('mail_send_result', result);
  });
}

module.exports = { registerMailHandlers };

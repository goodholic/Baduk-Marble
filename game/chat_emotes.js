// 채팅 이모티콘 & 소셜 시스템 — v2.59
// 커스텀 이모트, 칭찬/신고, 길드 채팅, 귓속말

const EMOTE_PACKS = {
  basic: {
    name: '기본', unlocked: true,
    emotes: [
      { id: ':gg:', text: 'GG!', icon: '🤝' },
      { id: ':hi:', text: '안녕!', icon: '👋' },
      { id: ':thx:', text: '감사!', icon: '❤️' },
      { id: ':sorry:', text: '미안!', icon: '😅' },
      { id: ':lol:', text: 'ㅋㅋㅋ', icon: '😂' },
      { id: ':cry:', text: 'ㅠㅠ', icon: '😢' },
      { id: ':wow:', text: '와!', icon: '😮' },
      { id: ':angry:', text: '화남', icon: '😤' },
    ],
  },
  battle: {
    name: '전투', unlockLevel: 10,
    emotes: [
      { id: ':fight:', text: '덤벼라!', icon: '⚔️' },
      { id: ':run:', text: '도망쳐!', icon: '🏃' },
      { id: ':heal:', text: '힐 좀!', icon: '💚' },
      { id: ':boss:', text: '보스다!', icon: '🐲' },
      { id: ':tank:', text: '탱 부탁', icon: '🛡️' },
      { id: ':ult:', text: '궁극기!', icon: '⚡' },
    ],
  },
  premium: {
    name: '프리미엄', unlockDiamonds: 100,
    emotes: [
      { id: ':flex:', text: '💪', icon: '💪' },
      { id: ':crown:', text: '왕이다', icon: '👑' },
      { id: ':fire:', text: '불타오르네', icon: '🔥' },
      { id: ':skull:', text: 'RIP', icon: '💀' },
      { id: ':star:', text: '⭐⭐⭐', icon: '⭐' },
      { id: ':party:', text: '파티!', icon: '🎉' },
    ],
  },
};

// 채팅 메시지에서 이모트 코드를 아이콘으로 변환
function processEmotes(message) {
  let processed = message;
  for (const pack of Object.values(EMOTE_PACKS)) {
    for (const emote of pack.emotes) {
      processed = processed.replace(new RegExp(emote.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emote.icon);
    }
  }
  return processed;
}

// 칭찬/신고 시스템
const SOCIAL_ACTIONS = {
  praise: { name: '칭찬', icon: '👍', cooldown: 60000 },
  report: { name: '신고', icon: '⚠️', cooldown: 300000 },
};

function praisePlayer(fromPlayer, targetPlayer, io) {
  if (!targetPlayer) return { success: false, msg: '대상을 찾을 수 없습니다' };
  const now = Date.now();
  if (!fromPlayer._lastPraise) fromPlayer._lastPraise = 0;
  if (now - fromPlayer._lastPraise < SOCIAL_ACTIONS.praise.cooldown) return { success: false, msg: '칭찬은 1분에 1번!' };

  fromPlayer._lastPraise = now;
  if (!targetPlayer._praiseCount) targetPlayer._praiseCount = 0;
  targetPlayer._praiseCount++;

  if (io) {
    io.emit('chat_msg', {
      type: 'system',
      msg: '👍 ' + (fromPlayer.displayName||fromPlayer.className) + '님이 ' + (targetPlayer.displayName||targetPlayer.className) + '님을 칭찬했습니다!',
    });
  }

  return { success: true, msg: (targetPlayer.displayName||targetPlayer.className) + '님을 칭찬했습니다! (총 ' + targetPlayer._praiseCount + '회)' };
}

function registerChatEmoteHandlers(socket, playerId, players, io) {
  // 이모트 팩 목록
  socket.on('get_emote_packs', () => {
    const p = players[playerId];
    if (!p) return;
    const packs = Object.entries(EMOTE_PACKS).map(([id, pack]) => {
      let unlocked = pack.unlocked || false;
      if (pack.unlockLevel && (p.level || 1) >= pack.unlockLevel) unlocked = true;
      if (pack.unlockDiamonds && p._unlockedPacks && p._unlockedPacks.includes(id)) unlocked = true;
      return { id, name: pack.name, emotes: pack.emotes, unlocked, unlockLevel: pack.unlockLevel, unlockDiamonds: pack.unlockDiamonds };
    });
    socket.emit('emote_packs', { packs });
  });

  // 이모트 팩 구매
  socket.on('buy_emote_pack', (packId) => {
    const p = players[playerId];
    if (!p) return;
    const pack = EMOTE_PACKS[packId];
    if (!pack || !pack.unlockDiamonds) return socket.emit('minigame_result', { success: false, msg: '구매 불가' });
    if ((p.diamonds || 0) < pack.unlockDiamonds) return socket.emit('minigame_result', { success: false, msg: '다이아 부족' });
    p.diamonds -= pack.unlockDiamonds;
    if (!p._unlockedPacks) p._unlockedPacks = [];
    if (!p._unlockedPacks.includes(packId)) p._unlockedPacks.push(packId);
    socket.emit('minigame_result', { success: true, msg: pack.name + ' 이모트 팩 구매 완료!' });
  });

  // 칭찬
  socket.on('praise_player', (targetName) => {
    const p = players[playerId];
    if (!p) return;
    const target = Object.values(players).find(pp => pp.displayName === targetName);
    const result = praisePlayer(p, target, io);
    socket.emit('minigame_result', result);
  });

  // 귓속말
  socket.on('whisper', (data) => {
    const p = players[playerId];
    if (!p) return;
    const target = Object.entries(players).find(([, pp]) => pp.displayName === data.to);
    if (!target) { socket.emit('whisper_result', { success: false, msg: '대상을 찾을 수 없습니다' }); return; }
    const msg = (data.msg || '').substring(0, 200);
    io.to(target[0]).emit('whisper_received', { from: p.displayName || p.className, msg });
    socket.emit('whisper_result', { success: true, to: data.to, msg });
  });
}

module.exports = { EMOTE_PACKS, processEmotes, praisePlayer, registerChatEmoteHandlers };

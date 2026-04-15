// ============================================
// 업적 쇼케이스 -- 자랑 + 방문 + 좋아요
// ============================================

// 쇼케이스 슬롯 (최대 8개 전시)
const MAX_SHOWCASE_SLOTS = 8;

// 전시 가능 유형
const SHOWCASE_TYPES = {
  card:        { name: '최강 카드', icon: '🃏', desc: '가장 강한 카드 전시' },
  achievement: { name: '업적',     icon: '🏅', desc: '달성한 업적 전시' },
  title:       { name: '칭호',     icon: '🏷️', desc: '획득한 칭호 전시' },
  record:      { name: '기록',     icon: '📊', desc: '최고 기록 전시 (탑/IO/PvP 등)' },
  pet:         { name: '펫',       icon: '🐲', desc: '자랑 펫 전시' },
  skin:        { name: '스킨',     icon: '🎨', desc: '희귀 스킨 전시' },
};

// 전시 보상 (좋아요 수에 따라)
const LIKE_MILESTONES = [
  { likes: 10,  reward: { gold: 1000 },                                   name: '주목받는 쇼케이스' },
  { likes: 50,  reward: { gold: 5000,  diamonds: 10 },                    name: '인기 쇼케이스' },
  { likes: 100, reward: { gold: 10000, diamonds: 30, title: '인기인' },   name: '스타 쇼케이스' },
  { likes: 500, reward: { gold: 50000, diamonds: 100, title: '전설적 쇼케이스' }, name: '전설 쇼케이스' },
];

const MAX_MESSAGE_LENGTH = 100;
const VISIT_REWARD_GOLD = 50;
const LIKE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1일

// ── 초기화 ──

function _ensure(player) {
  if (!player.showcase) {
    player.showcase = {
      slots: new Array(MAX_SHOWCASE_SLOTS).fill(null),
      message: '',
      totalLikes: 0,
      totalVisits: 0,
      likedBy: {},          // { visitorId: lastLikeTimestamp }
      visitedBy: {},        // { visitorId: lastVisitTimestamp }
      claimedMilestones: [], // milestone indices
    };
  }
  return player.showcase;
}

// ── 아이템 소유 검증 ──

function _validateOwnership(player, type, itemId) {
  switch (type) {
    case 'card': {
      const cards = player.cards || player.deck || [];
      if (Array.isArray(cards)) return cards.some(c => (c.id || c) === itemId);
      return !!(cards[itemId]);
    }
    case 'achievement': {
      const ach = player.achievements || {};
      const prog = ach.progress || ach;
      return !!(prog[itemId]);
    }
    case 'title': {
      const titles = player.titles || player.unlockedTitles || [];
      if (Array.isArray(titles)) return titles.includes(itemId);
      return !!(titles[itemId]);
    }
    case 'record':
      // 기록은 자유 전시 (서버가 수치를 자동 채움)
      return true;
    case 'pet': {
      const pets = player.pets || player.petList || [];
      if (Array.isArray(pets)) return pets.some(p => (p.id || p) === itemId);
      return !!(pets[itemId]);
    }
    case 'skin': {
      const skins = player.skins || player.unlockedSkins || [];
      if (Array.isArray(skins)) return skins.includes(itemId);
      return !!(skins[itemId]);
    }
    default:
      return false;
  }
}

// ── 아이템 상세 정보 빌드 ──

function _buildItemDetail(player, type, itemId) {
  const meta = SHOWCASE_TYPES[type];
  if (!meta) return null;
  return {
    type,
    itemId,
    typeName: meta.name,
    typeIcon: meta.icon,
    displayName: itemId, // 클라이언트가 itemId 기반으로 풀네임 렌더링
  };
}

// ── 핵심 함수들 ──

function setShowcaseItem(player, slotIndex, type, itemId) {
  const sc = _ensure(player);
  if (slotIndex < 0 || slotIndex >= MAX_SHOWCASE_SLOTS) {
    return { success: false, msg: `슬롯 범위 초과 (0~${MAX_SHOWCASE_SLOTS - 1})` };
  }
  if (!SHOWCASE_TYPES[type]) {
    return { success: false, msg: `알 수 없는 전시 유형: ${type}` };
  }
  if (!_validateOwnership(player, type, itemId)) {
    return { success: false, msg: '해당 아이템을 소유하고 있지 않습니다' };
  }
  sc.slots[slotIndex] = { type, itemId, setAt: Date.now() };
  return { success: true, msg: `슬롯 ${slotIndex}에 ${SHOWCASE_TYPES[type].name} 전시 완료` };
}

function removeShowcaseItem(player, slotIndex) {
  const sc = _ensure(player);
  if (slotIndex < 0 || slotIndex >= MAX_SHOWCASE_SLOTS) {
    return { success: false, msg: `슬롯 범위 초과 (0~${MAX_SHOWCASE_SLOTS - 1})` };
  }
  if (!sc.slots[slotIndex]) {
    return { success: false, msg: '해당 슬롯이 비어있습니다' };
  }
  sc.slots[slotIndex] = null;
  return { success: true, msg: `슬롯 ${slotIndex} 비움` };
}

function getShowcase(player) {
  const sc = _ensure(player);
  const slots = sc.slots.map((slot, i) => {
    if (!slot) return { index: i, empty: true };
    return {
      index: i,
      empty: false,
      ...slot,
      detail: _buildItemDetail(player, slot.type, slot.itemId),
    };
  });
  return {
    displayName: player.displayName || player.name || 'Unknown',
    message: sc.message || '',
    slots,
    totalLikes: sc.totalLikes,
    totalVisits: sc.totalVisits,
  };
}

function visitShowcase(visitor, hostName, allPlayers) {
  if (!visitor || !hostName) {
    return { success: false, msg: '방문 대상을 찾을 수 없습니다' };
  }
  // 호스트 찾기 (displayName 기반)
  const host = _findPlayerByName(hostName, allPlayers);
  if (!host) {
    return { success: false, msg: `'${hostName}' 플레이어를 찾을 수 없습니다` };
  }
  if (host.id === visitor.id) {
    // 자기 쇼케이스 방문은 보상 없이 조회만
    return { success: true, msg: '내 쇼케이스', showcase: getShowcase(host), self: true };
  }
  const hsc = _ensure(host);
  hsc.totalVisits += 1;
  hsc.visitedBy[visitor.id] = Date.now();

  // 방문자에게 골드 지급
  visitor.gold = (visitor.gold || 0) + VISIT_REWARD_GOLD;

  return {
    success: true,
    msg: `${host.displayName || hostName}의 쇼케이스 방문! +${VISIT_REWARD_GOLD}G`,
    showcase: getShowcase(host),
    goldEarned: VISIT_REWARD_GOLD,
  };
}

function likeShowcase(visitor, hostName, allPlayers) {
  if (!visitor || !hostName) {
    return { success: false, msg: '대상을 찾을 수 없습니다' };
  }
  const host = _findPlayerByName(hostName, allPlayers);
  if (!host) {
    return { success: false, msg: `'${hostName}' 플레이어를 찾을 수 없습니다` };
  }
  if (host.id === visitor.id) {
    return { success: false, msg: '자기 쇼케이스에 좋아요를 누를 수 없습니다' };
  }
  const hsc = _ensure(host);
  const now = Date.now();
  const lastLike = hsc.likedBy[visitor.id] || 0;
  if (now - lastLike < LIKE_COOLDOWN_MS) {
    const remaining = LIKE_COOLDOWN_MS - (now - lastLike);
    const hours = Math.ceil(remaining / (60 * 60 * 1000));
    return { success: false, msg: `이미 좋아요를 눌렀습니다. ${hours}시간 후 가능` };
  }
  hsc.likedBy[visitor.id] = now;
  hsc.totalLikes += 1;

  // 마일스톤 자동 확인
  const milestoneResult = checkLikeMilestones(host);

  return {
    success: true,
    msg: `${host.displayName || hostName}의 쇼케이스에 좋아요! (총 ${hsc.totalLikes})`,
    totalLikes: hsc.totalLikes,
    milestones: milestoneResult.claimed,
  };
}

function getShowcaseMessage(player) {
  const sc = _ensure(player);
  return sc.message || '';
}

function setShowcaseMessage(player, message) {
  const sc = _ensure(player);
  if (typeof message !== 'string') {
    return { success: false, msg: '문자열이 필요합니다' };
  }
  sc.message = message.slice(0, MAX_MESSAGE_LENGTH);
  return { success: true, msg: `인사말 설정 완료 (${sc.message.length}자)` };
}

function getTopShowcases(allPlayers) {
  const list = [];
  const players = _iteratePlayers(allPlayers);
  for (const p of players) {
    if (!p.showcase) continue;
    const sc = p.showcase;
    const filledSlots = sc.slots.filter(s => s !== null).length;
    if (filledSlots === 0) continue;
    list.push({
      displayName: p.displayName || p.name || 'Unknown',
      playerId: p.id,
      totalLikes: sc.totalLikes || 0,
      totalVisits: sc.totalVisits || 0,
      filledSlots,
      message: sc.message || '',
    });
  }
  list.sort((a, b) => b.totalLikes - a.totalLikes);
  return list.slice(0, 50);
}

function checkLikeMilestones(player) {
  const sc = _ensure(player);
  const claimed = [];
  for (let i = 0; i < LIKE_MILESTONES.length; i++) {
    if (sc.claimedMilestones.includes(i)) continue;
    const ms = LIKE_MILESTONES[i];
    if (sc.totalLikes >= ms.likes) {
      sc.claimedMilestones.push(i);
      // 보상 지급
      if (ms.reward.gold) player.gold = (player.gold || 0) + ms.reward.gold;
      if (ms.reward.diamonds) player.diamonds = (player.diamonds || 0) + ms.reward.diamonds;
      if (ms.reward.title) {
        if (!player.titles) player.titles = [];
        if (Array.isArray(player.titles)) {
          if (!player.titles.includes(ms.reward.title)) player.titles.push(ms.reward.title);
        }
      }
      claimed.push({ index: i, name: ms.name, reward: ms.reward });
    }
  }
  return { claimed };
}

function getShowcaseStats(player) {
  const sc = _ensure(player);
  return {
    totalVisits: sc.totalVisits,
    totalLikes: sc.totalLikes,
    filledSlots: sc.slots.filter(s => s !== null).length,
    maxSlots: MAX_SHOWCASE_SLOTS,
    claimedMilestones: sc.claimedMilestones.map(i => LIKE_MILESTONES[i]).filter(Boolean),
    nextMilestone: _nextMilestone(sc),
  };
}

function generateShareCard(player) {
  const name = player.displayName || player.name || 'Player';
  const title = player.activeTitle || player.title || '모험가';
  const power = _formatNumber(player.power || player.combatPower || 0);
  const ioWins = player.ioWins || player.pvpWins || 0;
  const pvpTier = player.pvpTier || player.arenaTier || '없음';
  const towerFloor = player.towerFloor || player.maxTowerFloor || 0;
  const awakenings = player.awakenings || player.awakenCount || 0;
  const prestige = player.prestigeCount || player.prestige || 0;

  const padName = _centerPad(` ⚔️ ${name} ⚔️ `, 24);
  const lines = [
    '╔══════════════════════╗',
    `║${padName}║`,
    `║ 칭호: ${_rPad(title, 15)}║`,
    `║ 파워: ${_rPad(power, 15)}║`,
    `║ IO 승: ${_rPad(`${ioWins} | PvP: ${pvpTier}`, 13)}║`,
    `║ 탑: ${_rPad(`${towerFloor}층 | 각성: ${awakenings}종`, 16)}║`,
    `║ 환생: ${_rPad(`${prestige}회`, 15)}║`,
    '╚══════════════════════╝',
  ];
  return lines.join('\n');
}

// ── 소켓 등록 ──

function register(io, socket, player, allPlayers) {
  socket.on('showcase_get', () => {
    if (!player) return;
    socket.emit('showcase_get_result', getShowcase(player));
  });

  socket.on('showcase_set', (data) => {
    if (!player) return;
    const { slotIndex, type, itemId } = data || {};
    const result = setShowcaseItem(player, slotIndex, type, itemId);
    socket.emit('showcase_set_result', result);
    if (result.success) io.emit('player_update', player);
  });

  socket.on('showcase_remove', (data) => {
    if (!player) return;
    const { slotIndex } = data || {};
    const result = removeShowcaseItem(player, slotIndex);
    socket.emit('showcase_remove_result', result);
    if (result.success) io.emit('player_update', player);
  });

  socket.on('showcase_visit', (data) => {
    if (!player) return;
    const { hostName } = data || {};
    const result = visitShowcase(player, hostName, allPlayers);
    socket.emit('showcase_visit_result', result);
    if (result.success && !result.self) io.emit('player_update', player);
  });

  socket.on('showcase_like', (data) => {
    if (!player) return;
    const { hostName } = data || {};
    const result = likeShowcase(player, hostName, allPlayers);
    socket.emit('showcase_like_result', result);
    if (result.success) {
      const host = _findPlayerByName(hostName, allPlayers);
      if (host) io.emit('player_update', host);
    }
  });

  socket.on('showcase_message', (data) => {
    if (!player) return;
    const { message } = data || {};
    const result = setShowcaseMessage(player, message);
    socket.emit('showcase_message_result', result);
  });

  socket.on('showcase_top', () => {
    socket.emit('showcase_top_result', getTopShowcases(allPlayers));
  });

  socket.on('showcase_stats', () => {
    if (!player) return;
    socket.emit('showcase_stats_result', getShowcaseStats(player));
  });

  socket.on('showcase_share', () => {
    if (!player) return;
    socket.emit('showcase_share_result', { card: generateShareCard(player) });
  });
}

// ── 유틸리티 ──

function _findPlayerByName(name, allPlayers) {
  if (!name) return null;
  const players = _iteratePlayers(allPlayers);
  const lower = name.toLowerCase();
  for (const p of players) {
    const dn = (p.displayName || p.name || '').toLowerCase();
    if (dn === lower) return p;
  }
  return null;
}

function _iteratePlayers(allPlayers) {
  if (!allPlayers) return [];
  if (Array.isArray(allPlayers)) return allPlayers;
  return Object.values(allPlayers);
}

function _nextMilestone(sc) {
  for (let i = 0; i < LIKE_MILESTONES.length; i++) {
    if (!sc.claimedMilestones.includes(i)) {
      return {
        ...LIKE_MILESTONES[i],
        remaining: LIKE_MILESTONES[i].likes - sc.totalLikes,
      };
    }
  }
  return null; // 모든 마일스톤 달성
}

function _formatNumber(n) {
  if (typeof n !== 'number') return '0';
  return n.toLocaleString('ko-KR');
}

function _rPad(str, len) {
  str = String(str);
  while (str.length < len) str += ' ';
  return str.slice(0, len);
}

function _centerPad(str, len) {
  str = String(str);
  if (str.length >= len) return str.slice(0, len);
  const left = Math.floor((len - str.length) / 2);
  const right = len - str.length - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

module.exports = {
  MAX_SHOWCASE_SLOTS,
  SHOWCASE_TYPES,
  LIKE_MILESTONES,
  setShowcaseItem,
  removeShowcaseItem,
  getShowcase,
  visitShowcase,
  likeShowcase,
  getShowcaseMessage,
  setShowcaseMessage,
  getTopShowcases,
  checkLikeMilestones,
  getShowcaseStats,
  generateShareCard,
  register,
};

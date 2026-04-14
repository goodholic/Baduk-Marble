// ============================================
// 카드 거래소 — 플레이어 간 실시간 카드 교환/판매
// ============================================

const MARKET_FEE = 0.05; // 5% 수수료
const MAX_LISTINGS = 5;

// 거래소 등록
function listCard(player, cardId, price) {
  if (!cardId || !price || price < 100) return { ok: false, reason: '최소 가격 100G' };
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };

  player._marketListings = player._marketListings || [];
  if (player._marketListings.length >= MAX_LISTINGS) return { ok: false, reason: `최대 ${MAX_LISTINGS}개 등록 가능` };

  // 카드를 인벤토리에서 제거 (거래소에 올림)
  player.cards = player.cards.filter(c => c.id !== cardId);
  const listing = {
    id: `listing_${Date.now()}`,
    card: { ...card },
    price,
    sellerId: player.id || player.deviceId,
    sellerName: player.displayName || player.name || '???',
    listedAt: Date.now(),
  };
  player._marketListings.push(listing);

  return { ok: true, msg: `"${card.name}" ${price}G에 등록!`, listing };
}

// 거래소에서 구매 (간략화: 봇 리스팅에서 구매)
function buyFromMarket(player, listingId) {
  // 글로벌 마켓에서 찾기 (간략화: 자신의 리스팅은 불가)
  // 실제로는 서버 전체 리스팅 풀에서 검색
  const listing = (player._availableMarket || []).find(l => l.id === listingId);
  if (!listing) return { ok: false, reason: '매물 없음' };
  if ((player.gold || 0) < listing.price) return { ok: false, reason: '골드 부족' };

  player.gold -= listing.price;
  player.cards = player.cards || [];
  player.cards.push({ ...listing.card, id: `card_${Date.now()}_bought` });
  player._availableMarket = player._availableMarket.filter(l => l.id !== listingId);

  return { ok: true, msg: `"${listing.card.name}" 구매 완료! (-${listing.price}G)` };
}

// 봇 거래소 목록 생성 (실제 플레이어 간 거래 전 임시)
function generateBotMarket() {
  const gradeNames = {
    normal: ['병사', '궁수', '도적', '수습생'],
    rare: ['정예 전사', '마법 궁수', '암살자', '사제'],
    epic: ['영웅 검사', '대마도사', '성기사', '용기사'],
    legend: ['전설의 검성', '불사조', '빛의 천사', '용왕'],
  };
  const icons = { normal: '⚔️', rare: '🛡️', epic: '💎', legend: '🌟' };
  const listings = [];

  for (let i = 0; i < 8; i++) {
    const grades = ['normal', 'normal', 'normal', 'rare', 'rare', 'epic', 'epic', 'legend'];
    const grade = grades[i];
    const names = gradeNames[grade] || gradeNames.normal;
    const name = names[Math.floor(Math.random() * names.length)];
    const basePrice = { normal: 500, rare: 2000, epic: 8000, legend: 30000 }[grade] || 500;
    const price = basePrice + Math.floor(Math.random() * basePrice * 0.5);
    const baseAtk = { normal: 30, rare: 60, epic: 100, legend: 180 }[grade] || 30;

    listings.push({
      id: `bot_listing_${Date.now()}_${i}`,
      card: {
        name, icon: icons[grade], grade,
        atk: baseAtk + Math.floor(Math.random() * 20),
        def: Math.floor(baseAtk * 0.6 + Math.random() * 15),
        hp: Math.floor(baseAtk * 4 + Math.random() * 50),
        level: 1 + Math.floor(Math.random() * 10),
      },
      price,
      sellerName: ['상인 A', '상인 B', '용병상', '떠돌이', '고물상', '보석상', '기사단', '마법사'][i],
      listedAt: Date.now(),
    });
  }
  return listings;
}

function register(io, socket, player) {
  socket.on('market_browse', () => {
    // 봇 마켓 + 자기 리스팅
    player._availableMarket = generateBotMarket();
    socket.emit('market_browse', {
      listings: player._availableMarket,
      myListings: player._marketListings || [],
      fee: MARKET_FEE,
      maxListings: MAX_LISTINGS,
    });
  });

  socket.on('market_list_card', (data) => {
    const result = listCard(player, data.cardId, data.price);
    socket.emit('market_list_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('market_buy', (data) => {
    const result = buyFromMarket(player, data.listingId);
    socket.emit('market_buy_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });
}

module.exports = { listCard, buyFromMarket, generateBotMarket, register, MARKET_FEE };

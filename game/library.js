// 도서관 시스템 — v1.68
// 던전/지역에서 발견하는 책 → 읽으면 영구 스탯 보너스 + 로어
// game/wisdom.js의 'book_read' 소스와 연계

const BOOKS = {
  warriors_codex: {
    name: '전사의 강령',
    icon: '📕',
    rarity: 'common',
    pages: 5,
    bonus: { atk: 3 },
    location: '달그림자 유적',
    excerpt: '"검은 마음을 따라야 한다. 마음이 흔들리면 검도 흔들린다." — 무명 전사',
  },
  guardians_oath: {
    name: '수호자의 맹세',
    icon: '📘',
    rarity: 'common',
    pages: 5,
    bonus: { def: 3 },
    location: '하늘의 성채',
    excerpt: '"방패는 나를 위한 것이 아니라, 등 뒤의 사람을 위한 것이다." — 첫 수호자',
  },
  alchemists_journal: {
    name: '연금술사의 일지',
    icon: '📗',
    rarity: 'rare',
    pages: 12,
    bonus: { craftSuccess: 0.05 },
    location: '수정 동굴',
    excerpt: '"진정한 연금술은 황금이 아니라 영혼의 변화다." — 시그문드의 일지',
  },
  star_atlas: {
    name: '별의 지도',
    icon: '🌌',
    rarity: 'rare',
    pages: 20,
    bonus: { critRate: 0.03 },
    location: '천공의 정상',
    excerpt: '"별들은 우리의 운명을 지켜본다. 우리는 그들을 향해 손을 뻗을 뿐." — 셀레스테',
  },
  dragon_lore: {
    name: '용의 전승',
    icon: '🐲',
    rarity: 'epic',
    pages: 30,
    bonus: { atk: 10, fireDmg: 0.10 },
    location: '용의 요람',
    excerpt: '"용은 단순한 짐승이 아니다. 그들은 시간 그 자체의 화신이다." — 고대 학자',
  },
  void_tome: {
    name: '공허의 서',
    icon: '📔',
    rarity: 'epic',
    pages: 25,
    bonus: { critDmg: 0.15 },
    location: '공허의 균열',
    excerpt: '"공허를 응시하면 공허도 너를 응시한다." — 익명',
  },
  primordial_text: {
    name: '태초의 문서',
    icon: '📜',
    rarity: 'legendary',
    pages: 50,
    bonus: { atk: 20, def: 20, hp: 200, expBonus: 0.15 },
    location: '세계수 (보스 처치 후)',
    excerpt: '"세상은 빛과 어둠 이전부터 존재했다. 우리는 그 메아리일 뿐이다." — 태초의 존재',
  },
  forbidden_grimoire: {
    name: '금단의 마도서',
    icon: '🔮',
    rarity: 'legendary',
    pages: 40,
    bonus: { atk: 15, critRate: 0.08, allMulti: 0.05 },
    location: '마왕성 (보스 처치 후)',
    excerpt: '"이 책을 읽는 자, 모든 힘을 얻으나 모든 평화를 잃으리." — 봉인된 경고',
  },
};

function _ensure(player) {
  if (!player.library) player.library = { read: [], inventory: [] };
  return player.library;
}

function findBook(player, bookId) {
  const book = BOOKS[bookId];
  if (!book) return { success: false, msg: '존재하지 않는 책' };
  const lib = _ensure(player);
  if (lib.inventory.includes(bookId) || lib.read.includes(bookId)) {
    return { success: false, msg: '이미 발견한 책' };
  }
  lib.inventory.push(bookId);
  return { success: true, book };
}

function readBook(player, bookId) {
  const book = BOOKS[bookId];
  if (!book) return { success: false, msg: '존재하지 않는 책' };
  const lib = _ensure(player);
  if (!lib.inventory.includes(bookId)) {
    return { success: false, msg: '발견하지 않은 책' };
  }
  if (lib.read.includes(bookId)) {
    return { success: false, msg: '이미 읽은 책' };
  }

  // 인벤토리에서 제거 → 읽음 목록에
  lib.inventory = lib.inventory.filter(id => id !== bookId);
  lib.read.push(bookId);

  return {
    success: true,
    book,
    bonus: book.bonus,
    excerpt: book.excerpt,
  };
}

function getLibraryBonus(player, stat) {
  const lib = _ensure(player);
  let total = 0;
  for (const bookId of lib.read) {
    const book = BOOKS[bookId];
    if (book && book.bonus[stat]) {
      total += book.bonus[stat];
    }
  }
  return total;
}

function getStatus(player) {
  const lib = _ensure(player);
  return {
    inventory: lib.inventory.map(id => ({ id, ...BOOKS[id], status: 'unread' })),
    read: lib.read.map(id => ({ id, ...BOOKS[id], status: 'read' })),
    available: Object.entries(BOOKS).map(([id, book]) => ({
      id,
      ...book,
      status: lib.read.includes(id) ? 'read' : (lib.inventory.includes(id) ? 'unread' : 'undiscovered'),
    })),
    totalRead: lib.read.length,
    totalAvailable: Object.keys(BOOKS).length,
  };
}

module.exports = {
  BOOKS,
  findBook,
  readBook,
  getLibraryBonus,
  getStatus,
};

// 동료(Companion) 시스템 — v1.61
// 펫/용병과 다른 카테고리: 영구 동료 NPC, 개성/대사/특수 패시브
// 6명의 유니크 동료 — 1명만 활성화 가능
// 호감도 시스템 (대화/선물로 상승) → 호감도별 추가 보너스

const COMPANIONS = {
  aria: {
    id: 'aria',
    name: '아리아',
    title: '바람의 음유시인',
    icon: '🎵',
    personality: '쾌활한 음악가',
    desc: '여행자들의 사기를 북돋는 음유시인. 노래로 모험을 도와준다.',
    passive: { expBonus: 0.10, atkSpeed: 0.05 },
    affection_bonus: { expBonus: 0.005, atkSpeed: 0.002 }, // 호감도당
    quotes: [
      '오늘도 멋진 모험이네요!',
      '제가 노래를 불러드릴까요?',
      '바람이 우리를 이끌어줄 거예요.',
    ],
    favorite_gift: 'goods_silk',
    unlock: '레벨 10 + 별빛 항구 첫 방문',
  },
  brutus: {
    id: 'brutus',
    name: '브루투스',
    title: '강철의 검사',
    icon: '⚔️',
    personality: '과묵한 전사',
    desc: '말이 없는 베테랑 검사. 그의 침묵이 가장 큰 위협이다.',
    passive: { atk: 25, critRate: 0.05 },
    affection_bonus: { atk: 1, critRate: 0.001 },
    quotes: [
      '...',
      '가자.',
      '적이 보인다.',
    ],
    favorite_gift: 'goods_iron',
    unlock: '레벨 20 + PvP 10승',
  },
  celeste: {
    id: 'celeste',
    name: '셀레스테',
    title: '별빛의 마법사',
    icon: '✨',
    personality: '신비로운 학자',
    desc: '별의 비밀을 연구하는 학자. 천문학적 지식이 풍부하다.',
    passive: { critDmg: 0.20, expBonus: 0.15 },
    affection_bonus: { critDmg: 0.005, expBonus: 0.005 },
    quotes: [
      '오늘 밤하늘이 특별하네요.',
      '운명은 정해져 있지만, 선택은 우리의 몫이에요.',
      '별이 당신을 안내할 거예요.',
    ],
    favorite_gift: 'goods_crystal',
    unlock: '레벨 25 + 점쟁이 NPC와 5회 대화',
  },
  drago: {
    id: 'drago',
    name: '드라고',
    title: '용의 후예',
    icon: '🐲',
    personality: '오만한 귀족',
    desc: '드래곤의 피가 흐르는 자칭 귀족. 화염을 다룬다.',
    passive: { atk: 30, fireDmg: 0.20 },
    affection_bonus: { atk: 1, fireDmg: 0.005 },
    quotes: [
      '내 앞에서 무릎을 꿇어라!',
      '...뭐, 너도 제법이군.',
      '드래곤의 분노를 보여주마!',
    ],
    favorite_gift: 'mat_dragon',
    unlock: '드래곤 보스 10회 처치',
  },
  ember: {
    id: 'ember',
    name: '엠버',
    title: '재의 도둑',
    icon: '🔥',
    personality: '능청스러운 도둑',
    desc: '불꽃산 출신의 능숙한 도둑. 손가락이 빠르다.',
    passive: { goldBonus: 0.20, dropRate: 0.10 },
    affection_bonus: { goldBonus: 0.005, dropRate: 0.002 },
    quotes: [
      '어서 와요, 친구!',
      '뭐, 골드라면 얼마든지!',
      '이건 우리만의 비밀이야.',
    ],
    favorite_gift: 'goods_gem',
    unlock: '교역 이익 10만G',
  },
  seraphina: {
    id: 'seraphina',
    name: '세라피나',
    title: '천공의 수호자',
    icon: '👼',
    personality: '온화한 사제',
    desc: '천사의 가호를 받은 사제. 모든 것을 치유한다.',
    passive: { hp: 200, hpRegen: 0.30, dmgReduce: 0.05 },
    affection_bonus: { hp: 5, hpRegen: 0.005 },
    quotes: [
      '당신에게 평화가 함께하길.',
      '상처는 곧 치유될 거예요.',
      '빛이 우리를 인도할 거예요.',
    ],
    favorite_gift: 'food_king',
    unlock: '천공의 수호자 레이드 클리어',
  },
};

const COMPANION_CONFIG = {
  maxAffection: 100,
  affectionPerGift: 10,
  affectionPerFavorite: 25, // 최애 선물
  affectionPerTalk: 1,
  giftCooldownHours: 6,
  talkCooldownMinutes: 30,
};

function _ensure(player) {
  if (!player.companions) player.companions = { unlocked: [], active: null, affection: {}, lastGift: {}, lastTalk: {} };
  return player.companions;
}

function unlockCompanion(player, companionId) {
  const c = COMPANIONS[companionId];
  if (!c) return { success: false, msg: '존재하지 않는 동료' };
  const data = _ensure(player);
  if (data.unlocked.includes(companionId)) return { success: false, msg: '이미 해금됨' };
  data.unlocked.push(companionId);
  if (!data.active) data.active = companionId;
  data.affection[companionId] = 0;
  return { success: true, companion: c };
}

function setActive(player, companionId) {
  const data = _ensure(player);
  if (!data.unlocked.includes(companionId)) return { success: false, msg: '해금되지 않은 동료' };
  data.active = companionId;
  return { success: true };
}

function giveGift(player, companionId, itemId) {
  const c = COMPANIONS[companionId];
  if (!c) return { success: false, msg: '존재하지 않는 동료' };
  const data = _ensure(player);
  if (!data.unlocked.includes(companionId)) return { success: false, msg: '해금되지 않은 동료' };

  // 쿨다운 체크
  const now = Date.now();
  const lastGiftAt = data.lastGift[companionId] || 0;
  const cooldown = COMPANION_CONFIG.giftCooldownHours * 3600 * 1000;
  if ((now - lastGiftAt) < cooldown) {
    const remainHours = Math.ceil((cooldown - (now - lastGiftAt)) / 3600000);
    return { success: false, msg: `쿨다운 중 (${remainHours}시간 남음)` };
  }

  // 아이템 보유 체크
  if (!player.inventory || !player.inventory[itemId]) {
    return { success: false, msg: '보유하지 않은 아이템' };
  }
  player.inventory[itemId]--;
  if (player.inventory[itemId] <= 0) delete player.inventory[itemId];

  // 호감도 증가
  const isFavorite = itemId === c.favorite_gift;
  const gain = isFavorite ? COMPANION_CONFIG.affectionPerFavorite : COMPANION_CONFIG.affectionPerGift;
  data.affection[companionId] = Math.min(COMPANION_CONFIG.maxAffection, (data.affection[companionId] || 0) + gain);
  data.lastGift[companionId] = now;

  return {
    success: true,
    gain,
    isFavorite,
    newAffection: data.affection[companionId],
    response: isFavorite ? `${c.name}이(가) 매우 기뻐합니다!` : `${c.name}이(가) 고맙다고 합니다.`,
  };
}

function talk(player, companionId) {
  const c = COMPANIONS[companionId];
  if (!c) return { success: false, msg: '존재하지 않는 동료' };
  const data = _ensure(player);
  if (!data.unlocked.includes(companionId)) return { success: false, msg: '해금되지 않은 동료' };

  const now = Date.now();
  const lastTalkAt = data.lastTalk[companionId] || 0;
  const cooldown = COMPANION_CONFIG.talkCooldownMinutes * 60 * 1000;
  if ((now - lastTalkAt) < cooldown) {
    return { success: false, msg: '잠시 후 다시 말을 걸어주세요' };
  }

  data.affection[companionId] = Math.min(COMPANION_CONFIG.maxAffection, (data.affection[companionId] || 0) + COMPANION_CONFIG.affectionPerTalk);
  data.lastTalk[companionId] = now;

  const quote = c.quotes[Math.floor(Math.random() * c.quotes.length)];
  return {
    success: true,
    quote: `${c.icon} ${c.name}: "${quote}"`,
    newAffection: data.affection[companionId],
  };
}

function getActiveBonus(player, stat) {
  const data = _ensure(player);
  if (!data.active) return 0;
  const c = COMPANIONS[data.active];
  if (!c) return 0;
  const baseValue = c.passive[stat] || 0;
  const affection = data.affection[data.active] || 0;
  const bonusPerPoint = c.affection_bonus[stat] || 0;
  return baseValue + (bonusPerPoint * affection);
}

function getStatus(player) {
  const data = _ensure(player);
  return {
    unlocked: data.unlocked.map(id => ({ id, ...COMPANIONS[id], affection: data.affection[id] || 0 })),
    active: data.active,
    affection: data.affection,
    available: Object.entries(COMPANIONS).map(([id, c]) => ({ id, ...c, owned: data.unlocked.includes(id) })),
    config: COMPANION_CONFIG,
  };
}

module.exports = {
  COMPANIONS,
  COMPANION_CONFIG,
  unlockCompanion,
  setActive,
  giveGift,
  talk,
  getActiveBonus,
  getStatus,
};

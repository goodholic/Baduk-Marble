// ============================================
// 카드 인연/운명 — 특정 카드 조합이면 스토리+보너스
// ============================================

// 인연 조합 (파티에 2장 이상 있으면 발동)
const BOND_PAIRS = [
  { cards: ['견습 전사', '견습 궁수'], name: '소꿉친구', icon: '👫', bonus: { atk: 1.08, def: 1.05 },
    story: '어린 시절 같은 마을에서 자란 두 사람. 서로의 등을 지켜주겠다고 약속했다.' },
  { cards: ['견습 전사', '견습 마법사'], name: '검과 마법', icon: '⚔️🔮', bonus: { atk: 1.1 },
    story: '전사는 앞에서 길을 열고, 마법사는 뒤에서 불꽃을 뿌린다.' },
  { cards: ['정예 전사', '정예 궁수', '정예 마법사'], name: '삼총사', icon: '🤝🤝🤝', bonus: { all: 1.1 },
    story: '세 사람이 만나면 두려울 것이 없다. 왕국 최강의 삼총사.' },
  { cards: ['영웅 검사', '대마도사'], name: '빛과 불꽃', icon: '✨🔥', bonus: { atk: 1.12, matk: 1.12 },
    story: '성검의 빛과 마법의 불꽃. 둘이 합치면 어둠조차 물러간다.' },
  { cards: ['전설의 검성', '불사조'], name: '불멸의 동맹', icon: '⚔️🔥', bonus: { atk: 1.15, revive: true },
    story: '죽지 않는 새와 쓰러지지 않는 검사. 그들 앞에 끝은 없다.' },
  { cards: ['마검사', '그림자 사수'], name: '어둠의 형제', icon: '🌑🌑', bonus: { critRate: 0.1, critDmg: 1.3 },
    story: '빛을 등지고 걷는 두 형제. 적은 그림자만 보고 쓰러진다.' },
  { cards: ['드래곤 블레이드', '대천사 마도사'], name: '창세의 기사', icon: '🐲👼', bonus: { all: 1.15 },
    story: '용의 힘과 천사의 마법. 세계를 다시 만들 수 있는 힘.' },
  { cards: ['신검의 주인', '차원의 현자'], name: '전설의 끝', icon: '👑👑', bonus: { all: 1.2 },
    story: '두 각성자가 만났다. 세계의 운명이 바뀌기 시작한다.', legendary: true },

  // 종족 인연
  { races: ['elf', 'elf'], name: '엘프의 화합', icon: '🧝🧝', bonus: { spd: 1.1, matk: 1.08 },
    story: '엘프끼리의 교감은 말보다 빠르다.' },
  { races: ['dragon', 'dragon'], name: '쌍룡', icon: '🐲🐲', bonus: { atk: 1.15, def: 1.1 },
    story: '두 용의 포효가 울리면 대지가 떤다.' },
  { races: ['angel', 'demon'], name: '빛과 어둠', icon: '👼😈', bonus: { atk: 1.12, def: 1.12 },
    story: '대립하면서도 서로를 필요로 하는 숙명.' },
  { races: ['human', 'elf', 'dwarf', 'orc', 'beast'], name: '다섯 종족 연합', icon: '🌍', bonus: { all: 1.12 },
    story: '세계의 다섯 종족이 손을 잡았다. 이제 막을 수 없다.', legendary: true },
];

// 운명 카드 (랜덤으로 용병에게 부여되는 운명)
const DESTINIES = [
  { id: 'destiny_hero', name: '영웅의 운명', icon: '🦸⭐', bonus: { atk: 1.1 }, desc: '태어날 때부터 영웅이 될 운명', chance: 0.1 },
  { id: 'destiny_sage', name: '현자의 운명', icon: '📚⭐', bonus: { matk: 1.1, exp: 1.2 }, desc: '지식을 향한 끝없는 갈증', chance: 0.1 },
  { id: 'destiny_guardian', name: '수호자의 운명', icon: '🛡️⭐', bonus: { def: 1.15, hp: 1.1 }, desc: '소중한 것을 지키는 운명', chance: 0.1 },
  { id: 'destiny_wanderer', name: '방랑자의 운명', icon: '🗺️⭐', bonus: { spd: 1.15, goldBonus: 1.1 }, desc: '세계를 떠도는 영원한 방랑자', chance: 0.08 },
  { id: 'destiny_cursed', name: '저주받은 운명', icon: '💀⭐', bonus: { atk: 1.2, def: 0.9 }, desc: '강하지만 언제나 위험이 따른다', chance: 0.05 },
  { id: 'destiny_blessed', name: '축복받은 운명', icon: '✨⭐', bonus: { all: 1.08, luckBonus: 1.2 }, desc: '신에게 사랑받는 자', chance: 0.03 },
  { id: 'destiny_king', name: '왕의 운명', icon: '👑⭐', bonus: { all: 1.1, teamBuff: 1.05 }, desc: '태어나면서부터 왕관을 쓸 자', chance: 0.01 },
];

function checkBonds(partyCards) {
  const activeBonds = [];
  const cardNames = partyCards.map(c => (c.name || '').replace(/[★+\d]+$/, '').trim());
  const cardRaces = partyCards.map(c => c.race).filter(Boolean);

  for (const bond of BOND_PAIRS) {
    if (bond.cards) {
      if (bond.cards.every(name => cardNames.includes(name))) {
        activeBonds.push(bond);
      }
    }
    if (bond.races) {
      if (bond.races.every(race => cardRaces.includes(race))) {
        activeBonds.push(bond);
      }
    }
  }
  return activeBonds;
}

function assignDestiny(card) {
  if (card.destiny) return; // 이미 부여됨
  for (const d of DESTINIES) {
    if (Math.random() < d.chance) {
      card.destiny = d;
      return d;
    }
  }
  return null;
}

function register(io, socket, player) {
  socket.on('card_bonds_check', () => {
    const partyIds = player.ioParty || (player.cards || []).slice(0, 5).map(c => c.id);
    const partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
    const bonds = checkBonds(partyCards);
    socket.emit('card_bonds', { bonds, allBonds: BOND_PAIRS.map(b => ({ name: b.name, icon: b.icon, cards: b.cards, races: b.races, bonus: b.bonus, legendary: b.legendary })) });
  });

  socket.on('card_destiny_info', () => {
    const cardsWithDestiny = (player.cards || []).filter(c => c.destiny);
    socket.emit('card_destiny_info', { cards: cardsWithDestiny, allDestinies: DESTINIES });
  });

  // 소환 시 운명 자동 부여 (card_system에서 호출용)
  socket.on('card_assign_destiny', (data) => {
    const card = (player.cards || []).find(c => c.id === data.cardId);
    if (card) {
      const destiny = assignDestiny(card);
      if (destiny) socket.emit('card_destiny_assigned', { cardId: card.id, destiny, msg: `✨ "${card.name}"에게 "${destiny.name}" 부여!` });
    }
  });
}

module.exports = { BOND_PAIRS, DESTINIES, checkBonds, assignDestiny, register };

// v5.6 — 용병 카드 배틀 시스템
// 용병을 카드로 변환, TCG 스타일 전략 카드 대전

const HAND_SIZE = 5;
const DECK_SIZE = 20;
const MAX_MANA = 10;

// 카드 유형
const CARD_TYPES = {
  unit:    { name: '유닛', icon: '⚔️', desc: '필드에 소환, 공격/방어' },
  spell:   { name: '주문', icon: '🔮', desc: '즉시 효과 발동' },
  trap:    { name: '함정', icon: '🪤', desc: '뒤집어 놓고 조건 충족 시 발동' },
  equip:   { name: '장비', icon: '🛡️', desc: '유닛에 장착, 스탯 강화' },
};

// 용병 → 카드 변환 (용병 스탯 기반 카드 자동 생성)
function mercToCard(merc) {
  const atk = Math.floor((merc.atk || 50) / 10);
  const def = Math.floor((merc.def || 30) / 10);
  const cost = Math.max(1, Math.min(10, Math.floor(((merc.atk || 50) + (merc.def || 30)) / 30)));
  return {
    id: `card_${merc.id}`,
    name: merc.name,
    icon: merc.icon || '⚔️',
    type: 'unit',
    atk, def, cost,
    grade: merc.grade || 'normal',
    ability: merc.uniqueSkill?.name || null,
    abilityDesc: merc.uniqueSkill?.desc || null,
    generation: merc.generation || 1,
    awakened: merc.awakened || false,
  };
}

// 기본 주문 카드
const SPELL_CARDS = [
  { id: 'fireball', name: '파이어볼', icon: '🔥', type: 'spell', cost: 3, effect: '적 유닛 1체에 DMG 4', grade: 'common' },
  { id: 'heal', name: '치유', icon: '💚', type: 'spell', cost: 2, effect: '아군 유닛 1체 HP +3', grade: 'common' },
  { id: 'lightning', name: '번개', icon: '⚡', type: 'spell', cost: 4, effect: '적 전체 DMG 2', grade: 'uncommon' },
  { id: 'resurrection', name: '부활', icon: '💫', type: 'spell', cost: 6, effect: '묘지 유닛 1체 부활', grade: 'rare' },
  { id: 'meteor', name: '메테오', icon: '☄️', type: 'spell', cost: 8, effect: '적 전체 DMG 5 + 필드 파괴', grade: 'epic' },
  { id: 'time_stop', name: '시간 정지', icon: '⏰', type: 'spell', cost: 7, effect: '적 1턴 행동 불가', grade: 'legendary' },
  { id: 'god_wrath', name: '신의 분노', icon: '⚡👑', type: 'spell', cost: 10, effect: '적 전체 DMG 10 + 아군 전체 회복', grade: 'mythic' },
];

// 함정 카드
const TRAP_CARDS = [
  { id: 'mirror_force', name: '거울의 힘', icon: '🪞', type: 'trap', cost: 3, trigger: '공격 받을 때', effect: '공격 유닛 파괴', grade: 'rare' },
  { id: 'counter_spell', name: '주문 무효화', icon: '🚫🔮', type: 'trap', cost: 2, trigger: '주문 사용 시', effect: '주문 무효', grade: 'uncommon' },
  { id: 'ambush', name: '매복', icon: '🌿', type: 'trap', cost: 4, trigger: '유닛 소환 시', effect: '소환된 유닛에 DMG 3', grade: 'uncommon' },
  { id: 'revival_trap', name: '부활의 함정', icon: '💀💫', type: 'trap', cost: 5, trigger: '아군 유닛 파괴 시', effect: '즉시 부활 (ATK+2)', grade: 'epic' },
];

// 카드 배틀 보상
const CARD_BATTLE_REWARDS = {
  win:  { gold: 3000, cardPack: 1, rating: 25 },
  lose: { gold: 500, cardPack: 0, rating: -10 },
  draw: { gold: 1500, cardPack: 0, rating: 5 },
};

// 카드 등급에 따른 레어도
const CARD_PACK_RATES = {
  common: 0.50, uncommon: 0.25, rare: 0.15, epic: 0.07, legendary: 0.025, mythic: 0.005,
};

function buildDeck(player, cardIds) {
  if (cardIds.length !== DECK_SIZE) return { ok: false, reason: `덱은 정확히 ${DECK_SIZE}장` };
  player.cardDeck = cardIds;
  return { ok: true, deckSize: DECK_SIZE };
}

function register(io, socket, player) {
  socket.on('card_battle_info', () => {
    const mercCards = (player.mercenaries || []).map(m => mercToCard(m));
    socket.emit('card_battle_info', {
      mercCards, spells: SPELL_CARDS, traps: TRAP_CARDS,
      deck: player.cardDeck || [], rewards: CARD_BATTLE_REWARDS,
      packRates: CARD_PACK_RATES, handSize: HAND_SIZE, deckSize: DECK_SIZE, maxMana: MAX_MANA,
    });
  });
  socket.on('card_battle_build_deck', (data) => {
    socket.emit('card_build_result', buildDeck(player, data.cardIds || []));
  });
  socket.on('card_battle_start', () => {
    socket.emit('card_battle_start', { ok: true, hand: (player.cardDeck || []).slice(0, HAND_SIZE) });
    io.emit('server_msg', `🃏 [카드 배틀] ${player.name}이(가) 카드 대전 참가!`);
  });
}

module.exports = { CARD_TYPES, SPELL_CARDS, TRAP_CARDS, CARD_BATTLE_REWARDS, CARD_PACK_RATES, mercToCard, buildDeck, register };

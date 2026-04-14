// ============================================
// 카드 관리 시스템 — 장비, 스킬, 편성, 상점, IO 연동
// ============================================

// ═══ 1. 카드 장비 시스템 ═══
const EQUIPMENT_SLOTS = ['weapon', 'armor', 'accessory'];
const EQUIPMENT_POOL = {
  weapon: [
    { id: 'eq_rusty_sword', name: '녹슨 검', icon: '🗡️', grade: 'normal', stat: { atk: 8 }, desc: '기본 무기' },
    { id: 'eq_steel_blade', name: '강철 검', icon: '⚔️', grade: 'rare', stat: { atk: 20 }, desc: '단단한 검' },
    { id: 'eq_flame_sword', name: '화염검', icon: '🔥⚔️', grade: 'epic', stat: { atk: 40, fireDmg: 15 }, desc: '불꽃을 두른 검' },
    { id: 'eq_holy_blade', name: '성검', icon: '✨⚔️', grade: 'legend', stat: { atk: 70, holyDmg: 25 }, desc: '신성한 빛의 검' },
    { id: 'eq_star_staff', name: '별의 지팡이', icon: '🌟🪄', grade: 'legend', stat: { atk: 60, matk: 40 }, desc: '별의 힘' },
    { id: 'eq_death_scythe', name: '죽음의 낫', icon: '💀🔪', grade: 'myth', stat: { atk: 100, critRate: 0.2 }, desc: '사신의 무기' },
  ],
  armor: [
    { id: 'eq_leather', name: '가죽 갑옷', icon: '🧥', grade: 'normal', stat: { def: 8 }, desc: '기본 방어구' },
    { id: 'eq_chainmail', name: '쇠사슬 갑옷', icon: '🛡️', grade: 'rare', stat: { def: 18, hp: 30 }, desc: '든든한 갑옷' },
    { id: 'eq_dragon_armor', name: '용린 갑옷', icon: '🐲🛡️', grade: 'epic', stat: { def: 35, hp: 80 }, desc: '용의 비늘' },
    { id: 'eq_divine_plate', name: '신성 갑주', icon: '✨🛡️', grade: 'legend', stat: { def: 60, hp: 150 }, desc: '빛의 방어' },
    { id: 'eq_void_cloak', name: '공허 망토', icon: '🌀🧥', grade: 'myth', stat: { def: 80, eva: 0.15 }, desc: '차원의 외투' },
  ],
  accessory: [
    { id: 'eq_copper_ring', name: '구리 반지', icon: '💍', grade: 'normal', stat: { hp: 20 }, desc: '기본 장신구' },
    { id: 'eq_ruby_pendant', name: '루비 펜던트', icon: '💎', grade: 'rare', stat: { atk: 10, hp: 30 }, desc: '붉은 보석' },
    { id: 'eq_phoenix_feather', name: '불사조 깃털', icon: '🔥🪶', grade: 'epic', stat: { hp: 60, revive: true }, desc: '1회 부활' },
    { id: 'eq_crown', name: '왕관', icon: '👑', grade: 'legend', stat: { atk: 25, def: 25, hp: 100 }, desc: '왕의 위엄' },
    { id: 'eq_infinity_gem', name: '무한의 보석', icon: '💎🌟', grade: 'myth', stat: { atk: 40, def: 40, hp: 200 }, desc: '만물의 힘' },
  ],
};

// ═══ 2. 카드 스킬 시스템 ═══
const SKILLS = [
  { id: 'sk_slash', name: '베기', icon: '⚔️', dmg: 1.2, cooldown: 0, type: 'active', desc: '기본 공격 1.2배', grade: 'normal' },
  { id: 'sk_fireball', name: '파이어볼', icon: '🔥', dmg: 1.8, cooldown: 3, type: 'active', element: 'fire', desc: '화염 데미지', grade: 'rare' },
  { id: 'sk_heal', name: '치유', icon: '💚', heal: 0.3, cooldown: 4, type: 'active', desc: '아군 HP 30% 회복', grade: 'rare' },
  { id: 'sk_shield', name: '방벽', icon: '🛡️', shield: 0.2, cooldown: 5, type: 'active', desc: 'DEF +20% (3턴)', grade: 'rare' },
  { id: 'sk_backstab', name: '급소 공격', icon: '🗡️💥', dmg: 2.5, cooldown: 5, type: 'active', desc: '크리 확정 2.5배', grade: 'epic' },
  { id: 'sk_meteor', name: '메테오', icon: '☄️', dmg: 3.0, cooldown: 8, type: 'active', aoe: true, desc: '전체 3배 데미지', grade: 'legend' },
  { id: 'sk_revive', name: '부활', icon: '💫', revive: true, cooldown: 10, type: 'active', desc: '쓰러진 아군 1명 부활', grade: 'legend' },
  // 패시브
  { id: 'sk_berserker', name: '광전사', icon: '👹', atkBonus: 0.15, type: 'passive', desc: 'ATK +15%', grade: 'rare' },
  { id: 'sk_iron_wall', name: '철벽', icon: '🧱', defBonus: 0.2, type: 'passive', desc: 'DEF +20%', grade: 'rare' },
  { id: 'sk_lifesteal', name: '흡혈', icon: '🩸', lifeSteal: 0.1, type: 'passive', desc: '데미지의 10% 회복', grade: 'epic' },
  { id: 'sk_dodge', name: '회피 본능', icon: '💨', evaBonus: 0.1, type: 'passive', desc: '회피율 +10%', grade: 'epic' },
  { id: 'sk_aura', name: '지휘 오라', icon: '✨', teamBuff: 0.08, type: 'passive', desc: '팀 전체 스탯 +8%', grade: 'legend' },
];

// ═══ 3. 파티 편성 (IO 출전용) ═══
const MAX_PARTY = 5;

function setParty(player, cardIds) {
  if (!cardIds || cardIds.length > MAX_PARTY) return { ok: false, reason: `최대 ${MAX_PARTY}장` };
  const cards = (player.cards || []).filter(c => cardIds.includes(c.id));
  if (cards.length === 0) return { ok: false, reason: '유효한 카드 없음' };
  player.ioParty = cardIds;
  // 시너지 계산
  const synergies = calcPartySynergy(cards);
  return { ok: true, party: cards, synergies, msg: `파티 ${cards.length}장 편성 완료` };
}

function calcPartySynergy(cards) {
  // 간단한 시너지: 같은 등급 2장 이상이면 보너스
  const grades = {};
  cards.forEach(c => { grades[c.grade] = (grades[c.grade] || 0) + 1; });
  const synergies = [];
  for (const [grade, count] of Object.entries(grades)) {
    if (count >= 2) synergies.push({ name: `${grade.toUpperCase()} x${count}`, bonus: { atk: 1 + count * 0.05, def: 1 + count * 0.03 } });
  }
  if (cards.length >= 5) synergies.push({ name: '풀 파티', bonus: { all: 1.1 } });
  return synergies;
}

// ═══ 4. 상점 ═══
const SHOP_ITEMS = [
  { id: 'shop_equip_box_normal', name: '일반 장비 상자', icon: '📦', price: { gold: 1000 }, content: 'random_equip_normal' },
  { id: 'shop_equip_box_rare', name: '희귀 장비 상자', icon: '📦🔵', price: { gold: 5000 }, content: 'random_equip_rare' },
  { id: 'shop_equip_box_epic', name: '에픽 장비 상자', icon: '📦💜', price: { diamonds: 30 }, content: 'random_equip_epic' },
  { id: 'shop_skill_scroll', name: '스킬 두루마리', icon: '📜⚔️', price: { gold: 3000 }, content: 'random_skill' },
  { id: 'shop_gold_pack', name: '골드 팩', icon: '💰', price: { diamonds: 10 }, content: { gold: 5000 } },
  { id: 'shop_diamond_pack', name: '다이아 팩', icon: '💎', price: { gold: 50000 }, content: { diamonds: 30 } },
  { id: 'shop_revive_ticket', name: 'IO 부활권', icon: '💫🎫', price: { diamonds: 40 }, content: { reviveTicket: 1 } },
];

function buyShopItem(player, itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: '상품 없음' };
  if (item.price.gold && (player.gold || 0) < item.price.gold) return { ok: false, reason: '골드 부족' };
  if (item.price.diamonds && (player.diamonds || 0) < item.price.diamonds) return { ok: false, reason: '다이아 부족' };

  if (item.price.gold) player.gold -= item.price.gold;
  if (item.price.diamonds) player.diamonds -= item.price.diamonds;

  let reward = null;
  if (typeof item.content === 'string' && item.content.startsWith('random_equip')) {
    const grade = item.content.split('_')[2] || 'normal';
    const slots = Object.keys(EQUIPMENT_POOL);
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const pool = EQUIPMENT_POOL[slot].filter(e => e.grade === grade || (grade === 'normal'));
    reward = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    if (reward) {
      player.equipment = player.equipment || [];
      player.equipment.push({ ...reward, uid: `eq_${Date.now()}` });
    }
  } else if (item.content === 'random_skill') {
    const pool = SKILLS.filter(s => s.grade !== 'myth');
    reward = pool[Math.floor(Math.random() * pool.length)];
    if (reward) {
      player.skillScrolls = player.skillScrolls || [];
      player.skillScrolls.push({ ...reward, uid: `sk_${Date.now()}` });
    }
  } else if (typeof item.content === 'object') {
    if (item.content.gold) player.gold = (player.gold || 0) + item.content.gold;
    if (item.content.diamonds) player.diamonds = (player.diamonds || 0) + item.content.diamonds;
    if (item.content.reviveTicket) player.reviveTickets = (player.reviveTickets || 0) + item.content.reviveTicket;
    reward = item.content;
  }

  return { ok: true, msg: `구매: ${item.name}`, reward };
}

// ═══ 5. 카드에 장비/스킬 장착 ═══
function equipToCard(player, cardId, equipUid) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };
  const equip = (player.equipment || []).find(e => e.uid === equipUid);
  if (!equip) return { ok: false, reason: '장비 없음' };

  card.equipment = card.equipment || {};
  // 기존 장비 반환
  const slotKey = EQUIPMENT_SLOTS.find(s => EQUIPMENT_POOL[s]?.some(e => e.id === equip.id)) || 'accessory';
  if (card.equipment[slotKey]) {
    player.equipment.push(card.equipment[slotKey]); // 기존 장비 인벤토리로
  }
  card.equipment[slotKey] = equip;
  player.equipment = player.equipment.filter(e => e.uid !== equipUid);

  return { ok: true, msg: `${card.name}에 ${equip.name} 장착!` };
}

function learnSkill(player, cardId, skillUid) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };
  const skill = (player.skillScrolls || []).find(s => s.uid === skillUid);
  if (!skill) return { ok: false, reason: '스킬 두루마리 없음' };

  card.skills = card.skills || [];
  if (card.skills.length >= 3) return { ok: false, reason: '스킬 슬롯 최대 3개' };
  card.skills.push(skill);
  player.skillScrolls = player.skillScrolls.filter(s => s.uid !== skillUid);

  return { ok: true, msg: `${card.name}에 "${skill.name}" 스킬 학습!` };
}

// ═══ 6. IO 보상 → 카드 연동 ═══
function applyIORewardToCards(player, ioResult) {
  const expGain = Math.floor((ioResult.survivalTime || 60) * 0.5 + (ioResult.kills || 0) * 20);
  const goldGain = Math.floor((ioResult.rank <= 3 ? 3000 : ioResult.rank <= 10 ? 1500 : 500) + (ioResult.kills || 0) * 100);

  // 파티 카드에 경험치 분배
  const partyIds = player.ioParty || [];
  const partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
  const expPerCard = partyCards.length > 0 ? Math.floor(expGain / partyCards.length) : 0;

  partyCards.forEach(c => {
    c.exp = (c.exp || 0) + expPerCard;
    const reqExp = (c.level || 1) * 100;
    while (c.exp >= reqExp) {
      c.exp -= reqExp;
      c.level = (c.level || 1) + 1;
      c.atk = Math.floor((c.atk || 30) * 1.03);
      c.def = Math.floor((c.def || 20) * 1.02);
      c.hp = Math.floor((c.hp || 200) * 1.02);
    }
  });

  player.gold = (player.gold || 0) + goldGain;

  return { expGain, goldGain, expPerCard, levelUps: partyCards.filter(c => c.exp === 0).length };
}

function register(io, socket, player) {
  // 장비 장착
  socket.on('card_equip', (data) => {
    const result = equipToCard(player, data.cardId, data.equipUid);
    socket.emit('card_equip_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 스킬 학습
  socket.on('card_learn_skill', (data) => {
    const result = learnSkill(player, data.cardId, data.skillUid);
    socket.emit('card_learn_skill_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 파티 편성
  socket.on('card_set_party', (data) => {
    const result = setParty(player, data.cardIds);
    socket.emit('card_set_party_result', result);
  });

  // 상점
  socket.on('shop_list', () => {
    socket.emit('shop_list', { items: SHOP_ITEMS, equipment: player.equipment || [], skills: player.skillScrolls || [] });
  });
  socket.on('shop_buy', (data) => {
    const result = buyShopItem(player, data.itemId);
    socket.emit('shop_buy_result', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      socket.emit('shop_list', { items: SHOP_ITEMS, equipment: player.equipment || [], skills: player.skillScrolls || [] });
    }
  });

  // IO 보상 연동
  socket.on('io_reward_apply', (data) => {
    const result = applyIORewardToCards(player, data);
    socket.emit('io_reward_applied', result);
    socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });
}

module.exports = {
  EQUIPMENT_POOL, SKILLS, SHOP_ITEMS, MAX_PARTY,
  equipToCard, learnSkill, setParty, buyShopItem, applyIORewardToCards,
  register,
};

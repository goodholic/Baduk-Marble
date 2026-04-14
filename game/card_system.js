// ============================================
// 카드 시스템 — 메인 화면의 핵심 (용병 카드 관리)
// ============================================

const CARD_GRADES = ['normal', 'rare', 'epic', 'legend', 'myth'];
const UPGRADE_COST = { normal: 500, rare: 2000, epic: 8000, legend: 30000, myth: 100000 };
const FUSE_COUNT = 3; // 동일 등급 3장 → 상위 1장

// 초기 카드 덱 (신규 플레이어용)
const STARTER_CARDS = [
  { id: 'starter_warrior', name: '견습 전사', icon: '⚔️', grade: 'normal', atk: 30, def: 20, hp: 200, level: 1, desc: '기본 전사 카드' },
  { id: 'starter_archer', name: '견습 궁수', icon: '🏹', grade: 'normal', atk: 35, def: 15, hp: 150, level: 1, desc: '기본 궁수 카드' },
  { id: 'starter_mage', name: '견습 마법사', icon: '🔮', grade: 'normal', atk: 40, def: 10, hp: 120, level: 1, desc: '기본 마법사 카드' },
];

// IO 보상 카드 풀
const IO_REWARD_CARDS = {
  top1:  { grades: { myth: 0.05, legend: 0.2, epic: 0.4, rare: 0.35 }, count: 3 },
  top3:  { grades: { legend: 0.1, epic: 0.3, rare: 0.4, normal: 0.2 }, count: 2 },
  top10: { grades: { epic: 0.15, rare: 0.35, normal: 0.5 }, count: 1 },
  other: { grades: { rare: 0.2, normal: 0.8 }, count: 1 },
};

function getPlayerCards(player) {
  if (!player.cards || player.cards.length === 0) {
    player.cards = STARTER_CARDS.map((c, i) => ({ ...c, id: `card_${Date.now()}_${i}` }));
  }
  return player.cards;
}

function getCardById(player, cardId) {
  return (player.cards || []).find(c => c.id === cardId);
}

function upgradeCard(player, cardId) {
  const card = getCardById(player, cardId);
  if (!card) return { ok: false, reason: '카드 없음' };
  const cost = UPGRADE_COST[card.grade] || 500;
  if ((player.gold || 0) < cost) return { ok: false, reason: `골드 부족 (${cost}G 필요)` };

  player.gold -= cost;
  card.level = (card.level || 1) + 1;
  card.atk = Math.floor((card.atk || 30) * 1.08);
  card.def = Math.floor((card.def || 20) * 1.06);
  card.hp = Math.floor((card.hp || 200) * 1.05);

  return { ok: true, msg: `${card.name} Lv.${card.level}로 강화! (${cost}G)`, card };
}

function fuseCards(player, cardIds) {
  if (!cardIds || cardIds.length < FUSE_COUNT) return { ok: false, reason: `${FUSE_COUNT}장 필요` };

  const cards = cardIds.map(id => getCardById(player, id)).filter(Boolean);
  if (cards.length < FUSE_COUNT) return { ok: false, reason: '유효한 카드 부족' };

  const grade = cards[0].grade;
  if (!cards.every(c => c.grade === grade)) return { ok: false, reason: '같은 등급만 합성 가능' };

  const gradeIdx = CARD_GRADES.indexOf(grade);
  if (gradeIdx >= CARD_GRADES.length - 1) return { ok: false, reason: '최고 등급은 합성 불가' };

  // 재료 카드 제거
  player.cards = player.cards.filter(c => !cardIds.includes(c.id));

  // 상위 카드 생성
  const newGrade = CARD_GRADES[gradeIdx + 1];
  const newCard = {
    id: `card_${Date.now()}_fused`,
    name: `${cards[0].name}+`,
    icon: cards[0].icon,
    grade: newGrade,
    atk: Math.floor(cards.reduce((s, c) => s + c.atk, 0) * 0.6),
    def: Math.floor(cards.reduce((s, c) => s + c.def, 0) * 0.6),
    hp: Math.floor(cards.reduce((s, c) => s + c.hp, 0) * 0.6),
    level: 1,
    desc: `${grade} 3장 합성으로 탄생`,
  };

  player.cards.push(newCard);
  return { ok: true, msg: `합성 성공! ${newGrade.toUpperCase()} "${newCard.name}" 획득!`, card: newCard };
}

function generateRewardCard(rank, totalPlayers) {
  let tier = 'other';
  if (rank === 1) tier = 'top1';
  else if (rank <= 3) tier = 'top3';
  else if (rank <= 10) tier = 'top10';

  const config = IO_REWARD_CARDS[tier];
  const cards = [];

  for (let i = 0; i < config.count; i++) {
    const roll = Math.random();
    let cum = 0;
    let grade = 'normal';
    for (const [g, prob] of Object.entries(config.grades)) {
      cum += prob;
      if (roll <= cum) { grade = g; break; }
    }

    const names = {
      normal: ['전사', '궁수', '마법사', '도적', '기사'],
      rare: ['정예 전사', '풍수사', '성기사', '암살자', '드루이드'],
      epic: ['영웅 검사', '대마법사', '용기사', '사신', '성녀'],
      legend: ['전설의 검성', '불사조', '암흑기사', '빛의 천사', '용왕'],
      myth: ['신의 대리자', '세계의 수호자', '운명의 파괴자', '태초의 존재', '차원의 지배자'],
    };
    const icons = { normal: '⚔️', rare: '🛡️', epic: '💎', legend: '🌟', myth: '👑' };
    const pool = names[grade] || names.normal;
    const name = pool[Math.floor(Math.random() * pool.length)];
    const baseAtk = { normal: 30, rare: 60, epic: 100, legend: 180, myth: 300 }[grade] || 30;

    cards.push({
      id: `card_${Date.now()}_${i}_reward`,
      name, icon: icons[grade] || '⚔️', grade,
      atk: baseAtk + Math.floor(Math.random() * baseAtk * 0.3),
      def: Math.floor(baseAtk * 0.7 + Math.random() * 20),
      hp: Math.floor(baseAtk * 5 + Math.random() * 100),
      level: 1,
      desc: `IO #${rank}위 보상`,
    });
  }

  return cards;
}

function register(io, socket, player) {
  socket.on('card_list_request', () => {
    const cards = getPlayerCards(player);
    socket.emit('card_list', { cards, gold: player.gold || 0, diamonds: player.diamonds || 0 });
  });

  socket.on('card_detail_request', (data) => {
    const card = getCardById(player, data.cardId);
    if (card) socket.emit('card_detail', { card });
  });

  socket.on('card_upgrade', (data) => {
    const result = upgradeCard(player, data.cardId);
    socket.emit('card_upgrade_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('card_fuse', (data) => {
    const result = fuseCards(player, data.cardIds);
    socket.emit('card_fuse_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // ── 행동 카드: 하단에서 카드 선택 → 행동 수행 ──
  socket.on('action_card_draw', () => {
    const hand = drawActionCards(player);
    socket.emit('action_card_hand', { cards: hand });
  });

  socket.on('action_card_play', (data) => {
    const result = playActionCard(player, data.cardId);
    socket.emit('action_card_result', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // ── 소환 (가챠) ──
  socket.on('card_summon', (data) => {
    const result = summonCard(player, data.type);
    socket.emit('card_summon_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // ── 진급 ──
  socket.on('card_promote', (data) => {
    const result = promoteCard(player, data.cardId);
    socket.emit('card_promote_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // ── 진화 ──
  socket.on('card_evolve', (data) => {
    const result = evolveCard(player, data.cardId);
    socket.emit('card_evolve_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });
}

// ═══════════════════════════════════════════
// 행동 카드 시스템 — 카드 선택 → 행동 수행
// ═══════════════════════════════════════════

const ACTION_CARDS = [
  // 자원 카드
  { id: 'ac_gold_mine', name: '금광 발견', icon: '⛏️💰', type: 'resource', effect: { gold: 500 }, desc: '골드 500 획득', rarity: 'common' },
  { id: 'ac_treasure', name: '보물 상자', icon: '📦💎', type: 'resource', effect: { gold: 1000, diamonds: 5 }, desc: '골드 1000 + 다이아 5', rarity: 'uncommon' },
  { id: 'ac_jackpot', name: '대박!', icon: '🎰💰', type: 'resource', effect: { gold: 5000 }, desc: '골드 5000!', rarity: 'rare' },

  // 용병 강화 카드
  { id: 'ac_train', name: '훈련', icon: '⚔️📈', type: 'buff', effect: { randomCardAtk: 10 }, desc: '랜덤 용병 ATK+10', rarity: 'common' },
  { id: 'ac_meditate', name: '수련', icon: '🧘📈', type: 'buff', effect: { randomCardDef: 10 }, desc: '랜덤 용병 DEF+10', rarity: 'common' },
  { id: 'ac_elixir', name: '엘릭서', icon: '🧪✨', type: 'buff', effect: { randomCardAll: 15 }, desc: '랜덤 용병 전스탯+15', rarity: 'rare' },
  { id: 'ac_awakening', name: '각성의 빛', icon: '🌟📈', type: 'buff', effect: { randomCardLevel: 3 }, desc: '랜덤 용병 Lv+3', rarity: 'epic' },

  // 소환 카드
  { id: 'ac_summon_normal', name: '일반 소환서', icon: '📜⚔️', type: 'summon', effect: { summonGrade: 'normal' }, desc: '일반 용병 1장 소환', rarity: 'common' },
  { id: 'ac_summon_rare', name: '희귀 소환서', icon: '📜🔵', type: 'summon', effect: { summonGrade: 'rare' }, desc: '희귀 용병 1장 소환', rarity: 'uncommon' },
  { id: 'ac_summon_legend', name: '전설 소환서', icon: '📜🌟', type: 'summon', effect: { summonGrade: 'legend' }, desc: '전설 용병 1장!', rarity: 'epic' },

  // 이벤트 카드
  { id: 'ac_merchant', name: '떠돌이 상인', icon: '🧑‍💼💰', type: 'event', effect: { shopDiscount: 0.5 }, desc: '다음 강화 비용 50% 할인', rarity: 'uncommon' },
  { id: 'ac_thief', name: '도적 습격', icon: '🏴‍☠️', type: 'event', effect: { goldLoss: 300 }, desc: '골드 300 손실!', rarity: 'common', negative: true },
  { id: 'ac_blessing', name: '신의 축복', icon: '✨🙏', type: 'event', effect: { allCardsHp: 50 }, desc: '모든 용병 HP+50', rarity: 'rare' },
  { id: 'ac_disaster', name: '재앙', icon: '🌋😱', type: 'event', effect: { randomCardLoss: true }, desc: '랜덤 용병 1장 소멸!', rarity: 'uncommon', negative: true },
  { id: 'ac_miracle', name: '기적', icon: '🌈✨', type: 'event', effect: { duplicateBest: true }, desc: '최강 용병 카드 복제!', rarity: 'legend' },

  // 무역 카드
  { id: 'ac_trade_silk', name: '비단 무역', icon: '🧶💰', type: 'trade', effect: { gold: 800 }, desc: '비단 판매로 골드 800', rarity: 'common' },
  { id: 'ac_trade_spice', name: '향신료 무역', icon: '🌶️💰', type: 'trade', effect: { gold: 1500 }, desc: '향신료로 골드 1500', rarity: 'uncommon' },
  { id: 'ac_trade_jewel', name: '보석 무역', icon: '💎💰', type: 'trade', effect: { gold: 3000, diamonds: 10 }, desc: '보석 거래 대박!', rarity: 'rare' },

  // PK 카드
  { id: 'ac_raid', name: '약탈', icon: '⚔️🏴', type: 'pk', effect: { stealGold: 500 }, desc: '다른 플레이어 골드 500 약탈', rarity: 'uncommon' },
  { id: 'ac_duel', name: '결투 신청', icon: '⚔️🔥', type: 'pk', effect: { duelBonus: true }, desc: '다음 IO에서 ATK+20%', rarity: 'rare' },
];

// 카드 5장 뽑기 (매 턴 or 시간마다)
function drawActionCards(player) {
  const hand = [];
  for (let i = 0; i < 5; i++) {
    const roll = Math.random();
    let pool;
    if (roll < 0.05) pool = ACTION_CARDS.filter(c => c.rarity === 'legend');
    else if (roll < 0.2) pool = ACTION_CARDS.filter(c => c.rarity === 'epic');
    else if (roll < 0.45) pool = ACTION_CARDS.filter(c => c.rarity === 'rare');
    else if (roll < 0.7) pool = ACTION_CARDS.filter(c => c.rarity === 'uncommon');
    else pool = ACTION_CARDS.filter(c => c.rarity === 'common');
    if (pool.length === 0) pool = ACTION_CARDS;
    hand.push({ ...pool[Math.floor(Math.random() * pool.length)], drawId: `draw_${Date.now()}_${i}` });
  }
  player._actionHand = hand;
  return hand;
}

// 행동 카드 사용
function playActionCard(player, drawId) {
  const hand = player._actionHand || [];
  const card = hand.find(c => c.drawId === drawId);
  if (!card) return { ok: false, reason: '카드 없음' };

  // 사용 후 핸드에서 제거
  player._actionHand = hand.filter(c => c.drawId !== drawId);

  switch (card.type) {
    case 'resource':
      if (card.effect.gold) player.gold = (player.gold || 0) + card.effect.gold;
      if (card.effect.diamonds) player.diamonds = (player.diamonds || 0) + card.effect.diamonds;
      return { ok: true, msg: `${card.name}: 골드+${card.effect.gold || 0}${card.effect.diamonds ? ', 다이아+' + card.effect.diamonds : ''}` };

    case 'buff': {
      const cards = player.cards || [];
      if (cards.length === 0) return { ok: false, reason: '용병 카드 없음' };
      const target = cards[Math.floor(Math.random() * cards.length)];
      if (card.effect.randomCardAtk) target.atk = (target.atk || 0) + card.effect.randomCardAtk;
      if (card.effect.randomCardDef) target.def = (target.def || 0) + card.effect.randomCardDef;
      if (card.effect.randomCardAll) { target.atk += card.effect.randomCardAll; target.def += card.effect.randomCardAll; target.hp = (target.hp || 0) + card.effect.randomCardAll * 3; }
      if (card.effect.randomCardLevel) target.level = (target.level || 1) + card.effect.randomCardLevel;
      return { ok: true, msg: `${card.name}: "${target.name}" 강화됨!` };
    }

    case 'summon': {
      const newCards = generateRewardCard(card.effect.summonGrade === 'legend' ? 1 : card.effect.summonGrade === 'rare' ? 5 : 20, 100);
      if (newCards.length > 0) {
        player.cards = player.cards || [];
        player.cards.push(newCards[0]);
        return { ok: true, msg: `${card.name}: "${newCards[0].name}" (${newCards[0].grade}) 소환!`, card: newCards[0] };
      }
      return { ok: false, reason: '소환 실패' };
    }

    case 'trade':
      if (card.effect.gold) player.gold = (player.gold || 0) + card.effect.gold;
      if (card.effect.diamonds) player.diamonds = (player.diamonds || 0) + card.effect.diamonds;
      return { ok: true, msg: `${card.name}: 무역 성공! 골드+${card.effect.gold || 0}` };

    case 'event': {
      if (card.effect.goldLoss) { player.gold = Math.max(0, (player.gold || 0) - card.effect.goldLoss); return { ok: true, msg: `${card.name}: 골드 -${card.effect.goldLoss}!`, negative: true }; }
      if (card.effect.allCardsHp) { (player.cards || []).forEach(c => c.hp = (c.hp || 0) + card.effect.allCardsHp); return { ok: true, msg: `${card.name}: 모든 용병 HP+${card.effect.allCardsHp}` }; }
      if (card.effect.randomCardLoss) {
        const cards = player.cards || [];
        if (cards.length > 0) { const idx = Math.floor(Math.random() * cards.length); const lost = cards.splice(idx, 1)[0]; return { ok: true, msg: `${card.name}: "${lost.name}" 소멸!`, negative: true }; }
      }
      if (card.effect.duplicateBest) {
        const cards = player.cards || [];
        if (cards.length > 0) { const best = cards.reduce((a, b) => (a.atk || 0) > (b.atk || 0) ? a : b); const copy = { ...best, id: `card_${Date.now()}_copy` }; cards.push(copy); return { ok: true, msg: `${card.name}: "${best.name}" 복제!` }; }
      }
      return { ok: true, msg: `${card.name} 발동` };
    }

    case 'pk':
      if (card.effect.stealGold) { player.gold = (player.gold || 0) + card.effect.stealGold; return { ok: true, msg: `${card.name}: 골드 +${card.effect.stealGold} 약탈!` }; }
      if (card.effect.duelBonus) { player._ioBuff = { atk: 1.2, expires: Date.now() + 3600000 }; return { ok: true, msg: `${card.name}: 다음 IO에서 ATK+20%!` }; }
      return { ok: true, msg: card.name };

    default:
      return { ok: false, reason: '알 수 없는 카드' };
  }
}

// ═══════════════════════════════════════════
// 용병 소환 (가챠)
// ═══════════════════════════════════════════

const SUMMON_COST = { single: { diamonds: 30 }, ten: { diamonds: 270 } };
const SUMMON_RATES = { myth: 0.02, legend: 0.08, epic: 0.2, rare: 0.35, normal: 0.35 };

function summonCard(player, type) {
  const cost = SUMMON_COST[type];
  if (!cost) return { ok: false, reason: '알 수 없는 소환 유형' };
  if ((player.diamonds || 0) < cost.diamonds) return { ok: false, reason: `다이아 부족 (필요: ${cost.diamonds})` };
  player.diamonds -= cost.diamonds;

  const count = type === 'ten' ? 10 : 1;
  const results = [];
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    let cum = 0, grade = 'normal';
    for (const [g, rate] of Object.entries(SUMMON_RATES)) {
      cum += rate;
      if (roll <= cum) { grade = g; break; }
    }
    const newCards = generateRewardCard(grade === 'myth' ? 1 : grade === 'legend' ? 2 : grade === 'epic' ? 5 : 15, 100);
    if (newCards[0]) {
      newCards[0].grade = grade; // 보정
      player.cards = player.cards || [];
      player.cards.push(newCards[0]);
      results.push(newCards[0]);
    }
  }
  return { ok: true, msg: `${count}회 소환 완료! (${results.filter(c => c.grade === 'legend' || c.grade === 'myth').length}장 전설+)`, cards: results };
}

// ═══════════════════════════════════════════
// 용병 진급 (같은 카드 2장 → 1단계 진급)
// ═══════════════════════════════════════════

function promoteCard(player, cardId) {
  const cards = player.cards || [];
  const card = cards.find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };

  // 같은 이름+등급 카드 찾기
  const duplicate = cards.find(c => c.id !== cardId && c.name === card.name && c.grade === card.grade);
  if (!duplicate) return { ok: false, reason: `같은 카드("${card.name}") 1장 더 필요` };

  // 재료 카드 제거
  player.cards = cards.filter(c => c.id !== duplicate.id);

  // 진급 (★ 추가)
  card.stars = (card.stars || 0) + 1;
  card.atk = Math.floor((card.atk || 30) * 1.15);
  card.def = Math.floor((card.def || 20) * 1.12);
  card.hp = Math.floor((card.hp || 200) * 1.1);
  card.name = card.name.replace(/★+$/, '') + '★'.repeat(card.stars);

  return { ok: true, msg: `진급! "${card.name}" (★${card.stars}) — ATK/DEF/HP 대폭 상승!`, card };
}

// ═══════════════════════════════════════════
// 용병 진화 (Lv.10+ → 상위 형태)
// ═══════════════════════════════════════════

const EVOLUTION_TREE = {
  '견습 전사': { evolveTo: '정예 전사', icon: '⚔️🔥', reqLevel: 10, cost: 3000 },
  '정예 전사': { evolveTo: '영웅 검사', icon: '⚔️💎', reqLevel: 20, cost: 10000 },
  '영웅 검사': { evolveTo: '전설의 검성', icon: '⚔️🌟', reqLevel: 30, cost: 30000 },
  '견습 궁수': { evolveTo: '정예 궁수', icon: '🏹🔥', reqLevel: 10, cost: 3000 },
  '정예 궁수': { evolveTo: '영웅 사수', icon: '🏹💎', reqLevel: 20, cost: 10000 },
  '견습 마법사': { evolveTo: '정예 마법사', icon: '🔮🔥', reqLevel: 10, cost: 3000 },
  '정예 마법사': { evolveTo: '대마도사', icon: '🔮💎', reqLevel: 20, cost: 10000 },
};

function evolveCard(player, cardId) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };

  const baseName = card.name.replace(/★+$/, '').replace(/\+$/, '');
  const evo = EVOLUTION_TREE[baseName];
  if (!evo) return { ok: false, reason: `"${baseName}"은 진화할 수 없습니다` };
  if ((card.level || 1) < evo.reqLevel) return { ok: false, reason: `Lv.${evo.reqLevel} 필요 (현재 Lv.${card.level || 1})` };
  if ((player.gold || 0) < evo.cost) return { ok: false, reason: `골드 ${evo.cost} 필요` };

  player.gold -= evo.cost;
  card.name = evo.evolveTo;
  card.icon = evo.icon;
  card.atk = Math.floor((card.atk || 30) * 1.3);
  card.def = Math.floor((card.def || 20) * 1.25);
  card.hp = Math.floor((card.hp || 200) * 1.2);
  const gradeIdx = Math.min(CARD_GRADES.indexOf(card.grade) + 1, CARD_GRADES.length - 1);
  card.grade = CARD_GRADES[gradeIdx];

  return { ok: true, msg: `진화! "${card.name}" — 등급 ${card.grade.toUpperCase()}로 상승!`, card };
}

module.exports = {
  getPlayerCards, upgradeCard, fuseCards, generateRewardCard, register, STARTER_CARDS,
  drawActionCards, playActionCard, summonCard, promoteCard, evolveCard,
  ACTION_CARDS, SUMMON_COST, SUMMON_RATES, EVOLUTION_TREE,
};

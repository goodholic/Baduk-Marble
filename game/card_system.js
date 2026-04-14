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
}

module.exports = { getPlayerCards, upgradeCard, fuseCards, generateRewardCard, register, STARTER_CARDS };

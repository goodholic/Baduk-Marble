// ============================================
// 방치형 농장 — 카드 배치 → 자동 골드/EXP 수집
// ============================================

const MAX_FARM_SLOTS = 6;

// 농장 구역
const FARM_ZONES = [
  { id: 'fz_meadow', name: '초원', icon: '🌿', goldPerMin: 5, expPerMin: 2, reqLevel: 1, desc: '평화로운 초원. 기본 수입.' },
  { id: 'fz_forest', name: '숲', icon: '🌲', goldPerMin: 10, expPerMin: 5, reqLevel: 5, desc: '나무가 우거진 숲. 적당한 수입.' },
  { id: 'fz_mine', name: '광산', icon: '⛏️', goldPerMin: 20, expPerMin: 8, reqLevel: 10, desc: '금광! 골드 수입 높음.' },
  { id: 'fz_ruins', name: '유적', icon: '🏛️', goldPerMin: 15, expPerMin: 15, reqLevel: 15, desc: '경험치 높은 유적지.' },
  { id: 'fz_volcano', name: '화산', icon: '🌋', goldPerMin: 30, expPerMin: 12, reqLevel: 20, desc: '위험하지만 보상 높음.' },
  { id: 'fz_abyss', name: '심연', icon: '🌑', goldPerMin: 50, expPerMin: 20, reqLevel: 25, desc: '최고 수입! 강한 카드 필요.' },
];

// 농장 보너스 (카드 수에 따라)
const FARM_BONUSES = [
  { slots: 1, bonus: 1.0 },
  { slots: 3, bonus: 1.1, desc: '3슬롯: 수입 +10%' },
  { slots: 5, bonus: 1.2, desc: '5슬롯: 수입 +20%' },
  { slots: 6, bonus: 1.35, desc: '풀 슬롯: 수입 +35%!' },
];

// 농장 이벤트 (수집 시 랜덤)
const FARM_EVENTS = [
  { id: 'fe_jackpot', name: '대박!', chance: 0.05, goldMul: 3.0, icon: '💰💰💰', desc: '골드 3배!' },
  { id: 'fe_bonus_exp', name: '깨달음', chance: 0.08, expMul: 2.0, icon: '📚✨', desc: 'EXP 2배!' },
  { id: 'fe_card_find', name: '카드 발견!', chance: 0.03, cardReward: true, icon: '🃏✨', desc: '랜덤 카드 1장!' },
  { id: 'fe_diamond', name: '보석 발견', chance: 0.04, diamondReward: 3, icon: '💎', desc: '다이아 3개!' },
  { id: 'fe_thief', name: '도둑!', chance: 0.05, goldMul: 0.5, icon: '🏴‍☠️', desc: '골드 50% 손실!', negative: true },
  { id: 'fe_storm', name: '폭풍', chance: 0.03, expMul: 0, icon: '⛈️', desc: 'EXP 0!', negative: true },
];

function deployToFarm(player, cardId, zoneId) {
  const zone = FARM_ZONES.find(z => z.id === zoneId);
  if (!zone) return { ok: false, reason: '알 수 없는 구역' };
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };
  if ((card.level || 1) < zone.reqLevel) return { ok: false, reason: `Lv.${zone.reqLevel} 필요` };

  player.farm = player.farm || {};
  const deployed = Object.keys(player.farm).length;
  if (deployed >= MAX_FARM_SLOTS) return { ok: false, reason: `최대 ${MAX_FARM_SLOTS}슬롯` };
  if (player.farm[cardId]) return { ok: false, reason: '이미 배치됨' };

  player.farm[cardId] = { zoneId, deployTime: Date.now(), cardName: card.name };
  return { ok: true, msg: `${card.name}을 ${zone.name}에 배치! (${zone.goldPerMin}G/분)` };
}

function collectFarm(player) {
  if (!player.farm || Object.keys(player.farm).length === 0) return { ok: false, reason: '배치된 카드 없음' };

  const now = Date.now();
  let totalGold = 0, totalExp = 0, totalDiamonds = 0;
  const events = [];
  const slotCount = Object.keys(player.farm).length;
  const bonus = ([...FARM_BONUSES].reverse().find(b => slotCount >= b.slots) || FARM_BONUSES[0]).bonus;

  for (const [cardId, info] of Object.entries(player.farm)) {
    const zone = FARM_ZONES.find(z => z.id === info.zoneId);
    if (!zone) continue;
    const minutes = Math.min(480, (now - info.deployTime) / 60000); // 최대 8시간
    if (minutes < 1) continue;

    let gold = Math.floor(zone.goldPerMin * minutes * bonus);
    let exp = Math.floor(zone.expPerMin * minutes * bonus);

    // 랜덤 이벤트
    const event = FARM_EVENTS.find(e => Math.random() < e.chance);
    if (event) {
      events.push(event);
      if (event.goldMul !== undefined) gold = Math.floor(gold * event.goldMul);
      if (event.expMul !== undefined) exp = Math.floor(exp * event.expMul);
      if (event.diamondReward) totalDiamonds += event.diamondReward;
      if (event.cardReward) {
        const { generateRewardCard } = require('./card_system');
        const cards = generateRewardCard(20, 100);
        if (cards[0]) { player.cards = player.cards || []; player.cards.push(cards[0]); events.push({ name: `카드: ${cards[0].name}`, icon: '🃏' }); }
      }
    }

    totalGold += gold;
    totalExp += exp;

    // 해당 카드에 EXP
    const card = (player.cards || []).find(c => c.id === cardId);
    if (card) card.exp = (card.exp || 0) + exp;

    info.deployTime = now; // 수집 시간 리셋
  }

  player.gold = (player.gold || 0) + totalGold;
  if (totalDiamonds > 0) player.diamonds = (player.diamonds || 0) + totalDiamonds;

  return {
    ok: true,
    msg: `농장 수집! +${totalGold}G +EXP${totalExp}${totalDiamonds ? ' +' + totalDiamonds + '💎' : ''}`,
    gold: totalGold, exp: totalExp, diamonds: totalDiamonds,
    events: events.map(e => ({ name: e.name, icon: e.icon })),
    bonus: Math.round((bonus - 1) * 100) + '%',
  };
}

function removeFarmCard(player, cardId) {
  if (!player.farm || !player.farm[cardId]) return { ok: false, reason: '배치되지 않은 카드' };
  delete player.farm[cardId];
  return { ok: true, msg: '농장에서 회수!' };
}

function register(io, socket, player) {
  socket.on('farm_info', () => {
    socket.emit('farm_info', {
      zones: FARM_ZONES, bonuses: FARM_BONUSES, maxSlots: MAX_FARM_SLOTS,
      deployed: player.farm || {},
    });
  });

  socket.on('farm_deploy', (data) => {
    const result = deployToFarm(player, data.cardId, data.zoneId);
    socket.emit('farm_deploy_result', result);
  });

  socket.on('farm_collect', () => {
    const result = collectFarm(player);
    socket.emit('farm_collect_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('farm_remove', (data) => {
    const result = removeFarmCard(player, data.cardId);
    socket.emit('farm_remove_result', result);
  });
}

module.exports = { FARM_ZONES, FARM_BONUSES, FARM_EVENTS, MAX_FARM_SLOTS, deployToFarm, collectFarm, register };

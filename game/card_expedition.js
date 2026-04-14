// ============================================
// 카드 원정/탐험 시스템 — 카드 파견 → 시간 경과 → 보상
// ============================================

const MAX_EXPEDITIONS = 3;

// 원정지 목록
const EXPEDITION_ZONES = [
  { id: 'exp_forest', name: '고대 숲', icon: '🌲', difficulty: 1, duration: 300, // 5분
    rewards: { gold: [300, 800], exp: [50, 100], cardChance: 0.1 },
    desc: '평화로운 숲. 쉬운 탐험.', reqCards: 1 },
  { id: 'exp_cave', name: '수정 동굴', icon: '💎', difficulty: 3, duration: 600,
    rewards: { gold: [800, 2000], exp: [100, 250], cardChance: 0.2, diamondChance: 0.1 },
    desc: '보석이 빛나는 동굴. 몬스터 주의.', reqCards: 2 },
  { id: 'exp_ruins', name: '고대 유적', icon: '🏛️', difficulty: 5, duration: 1200,
    rewards: { gold: [2000, 5000], exp: [200, 500], cardChance: 0.3, equipChance: 0.15 },
    desc: '고대 문명의 유적. 함정과 보물.', reqCards: 3 },
  { id: 'exp_volcano', name: '화산 지대', icon: '🌋', difficulty: 7, duration: 1800,
    rewards: { gold: [4000, 10000], exp: [400, 800], cardChance: 0.4, equipChance: 0.2, diamondChance: 0.15 },
    desc: '뜨거운 용암 사이로. 강력한 보상.', reqCards: 3 },
  { id: 'exp_abyss', name: '심연', icon: '🌑', difficulty: 9, duration: 3600,
    rewards: { gold: [8000, 20000], exp: [800, 1500], cardChance: 0.5, equipChance: 0.3, diamondChance: 0.2, legendChance: 0.05 },
    desc: '어둠의 심연. 최고 보상, 최고 위험.', reqCards: 4 },
  { id: 'exp_heaven', name: '천상의 탑', icon: '🌟', difficulty: 10, duration: 7200,
    rewards: { gold: [15000, 40000], exp: [1500, 3000], cardChance: 0.6, equipChance: 0.4, diamondChance: 0.3, legendChance: 0.1, mythChance: 0.02 },
    desc: '전설의 탑. 2시간 대탐험.', reqCards: 5 },
];

// 원정 이벤트 (진행 중 랜덤)
const EXPEDITION_EVENTS = [
  { id: 'ee_treasure', name: '숨겨진 보물!', chance: 0.15, effect: { goldMul: 2.0 }, icon: '💰✨', desc: '골드 보상 2배!' },
  { id: 'ee_ambush', name: '매복!', chance: 0.1, effect: { cardLoss: true }, icon: '⚠️', desc: '파견 카드 1장 부상 (EXP -50)', negative: true },
  { id: 'ee_ally', name: '동료 발견!', chance: 0.08, effect: { bonusCard: true }, icon: '🤝', desc: '추가 카드 1장 획득!' },
  { id: 'ee_boss', name: '보스 조우!', chance: 0.05, effect: { bossReward: true }, icon: '🐲', desc: '보스 처치 시 에픽+ 장비!' },
  { id: 'ee_shortcut', name: '지름길 발견!', chance: 0.1, effect: { timeCut: 0.5 }, icon: '💨', desc: '원정 시간 50% 단축!' },
  { id: 'ee_curse', name: '저주!', chance: 0.05, effect: { rewardCut: 0.5 }, icon: '💀', desc: '보상 50% 감소...', negative: true },
  { id: 'ee_miracle', name: '기적!', chance: 0.02, effect: { allRewardMul: 3.0 }, icon: '🌈✨', desc: '모든 보상 3배!!!' },
];

function startExpedition(player, zoneId, cardIds) {
  const zone = EXPEDITION_ZONES.find(z => z.id === zoneId);
  if (!zone) return { ok: false, reason: '알 수 없는 원정지' };

  const exps = player.expeditions || [];
  if (exps.filter(e => e.status === 'active').length >= MAX_EXPEDITIONS) {
    return { ok: false, reason: `최대 ${MAX_EXPEDITIONS}개 동시 원정 가능` };
  }

  if (!cardIds || cardIds.length < zone.reqCards) {
    return { ok: false, reason: `카드 ${zone.reqCards}장 필요` };
  }

  // 카드 파워 계산
  const cards = (player.cards || []).filter(c => cardIds.includes(c.id));
  const power = cards.reduce((s, c) => s + (c.atk || 30) + (c.def || 20), 0);

  // 랜덤 이벤트 결정
  const events = EXPEDITION_EVENTS.filter(e => Math.random() < e.chance);

  const expedition = {
    id: `exp_${Date.now()}`,
    zoneId, zoneName: zone.name,
    cardIds,
    power,
    startTime: Date.now(),
    endTime: Date.now() + zone.duration * 1000,
    events,
    status: 'active',
    difficulty: zone.difficulty,
  };

  // 시간 단축 이벤트 적용
  const shortcut = events.find(e => e.effect.timeCut);
  if (shortcut) {
    expedition.endTime = Date.now() + Math.floor(zone.duration * shortcut.effect.timeCut) * 1000;
  }

  exps.push(expedition);
  player.expeditions = exps;

  return { ok: true, expedition, events: events.map(e => ({ name: e.name, icon: e.icon, desc: e.desc })), msg: `${zone.name} 원정 시작! (${Math.floor(zone.duration / 60)}분)` };
}

function collectExpedition(player, expId) {
  const exps = player.expeditions || [];
  const exp = exps.find(e => e.id === expId);
  if (!exp) return { ok: false, reason: '원정 없음' };
  if (exp.status !== 'active') return { ok: false, reason: '이미 수집됨' };
  if (Date.now() < exp.endTime) {
    const remaining = Math.ceil((exp.endTime - Date.now()) / 1000);
    return { ok: false, reason: `아직 ${remaining}초 남음` };
  }

  exp.status = 'completed';
  const zone = EXPEDITION_ZONES.find(z => z.id === exp.zoneId);
  if (!zone) return { ok: false, reason: '존 데이터 없음' };

  // 보상 계산
  let goldMul = 1.0;
  exp.events.forEach(e => {
    if (e.effect.goldMul) goldMul *= e.effect.goldMul;
    if (e.effect.allRewardMul) goldMul *= e.effect.allRewardMul;
    if (e.effect.rewardCut) goldMul *= e.effect.rewardCut;
  });

  const r = zone.rewards;
  const gold = Math.floor((r.gold[0] + Math.random() * (r.gold[1] - r.gold[0])) * goldMul);
  const expGain = Math.floor(r.exp[0] + Math.random() * (r.exp[1] - r.exp[0]));

  player.gold = (player.gold || 0) + gold;
  // 파견 카드에 EXP
  const partyCards = (player.cards || []).filter(c => exp.cardIds.includes(c.id));
  partyCards.forEach(c => { c.exp = (c.exp || 0) + Math.floor(expGain / partyCards.length); });

  let bonusCard = null;
  if (Math.random() < (r.cardChance || 0)) {
    const { generateRewardCard } = require('./card_system');
    const cards = generateRewardCard(Math.random() < (r.legendChance || 0) ? 1 : 10, 100);
    if (cards[0]) { player.cards.push(cards[0]); bonusCard = cards[0]; }
  }

  let diamonds = 0;
  if (Math.random() < (r.diamondChance || 0)) {
    diamonds = 3 + Math.floor(Math.random() * 10);
    player.diamonds = (player.diamonds || 0) + diamonds;
  }

  return {
    ok: true,
    msg: `${zone.name} 원정 완료! +${gold}G${diamonds ? ' +' + diamonds + '💎' : ''}${bonusCard ? ' +카드: ' + bonusCard.name : ''}`,
    gold, diamonds, expGain, bonusCard,
    events: exp.events.map(e => e.name),
  };
}

function register(io, socket, player) {
  socket.on('expedition_zones', () => {
    socket.emit('expedition_zones', {
      zones: EXPEDITION_ZONES,
      active: (player.expeditions || []).filter(e => e.status === 'active'),
      maxExpeditions: MAX_EXPEDITIONS,
    });
  });

  socket.on('expedition_start', (data) => {
    const result = startExpedition(player, data.zoneId, data.cardIds);
    socket.emit('expedition_start_result', result);
  });

  socket.on('expedition_collect', (data) => {
    const result = collectExpedition(player, data.expId);
    socket.emit('expedition_collect_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('expedition_status', () => {
    const active = (player.expeditions || []).filter(e => e.status === 'active');
    const now = Date.now();
    socket.emit('expedition_status', {
      expeditions: active.map(e => ({
        ...e,
        timeLeft: Math.max(0, Math.ceil((e.endTime - now) / 1000)),
        ready: now >= e.endTime,
      })),
    });
  });
}

module.exports = { EXPEDITION_ZONES, EXPEDITION_EVENTS, MAX_EXPEDITIONS, startExpedition, collectExpedition, register };

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

// ============================================
// 농장 업그레이드
// ============================================
const FARM_UPGRADES = {
  fz_meadow:  { maxLv: 10, costPerLv: 1000, goldBonus: 2, expBonus: 1 },
  fz_forest:  { maxLv: 10, costPerLv: 2000, goldBonus: 4, expBonus: 2 },
  fz_mine:    { maxLv: 10, costPerLv: 4000, goldBonus: 8, expBonus: 3 },
  fz_ruins:   { maxLv: 10, costPerLv: 5000, goldBonus: 5, expBonus: 6 },
  fz_volcano: { maxLv: 10, costPerLv: 8000, goldBonus: 12, expBonus: 5 },
  fz_abyss:   { maxLv: 10, costPerLv: 15000, goldBonus: 20, expBonus: 8 },
};

function upgradeFarmZone(player, zoneId) {
  const upg = FARM_UPGRADES[zoneId];
  if (!upg) return { ok: false, reason: '알 수 없는 구역' };

  player.farmUpgrades = player.farmUpgrades || {};
  const curLv = player.farmUpgrades[zoneId] || 0;
  if (curLv >= upg.maxLv) return { ok: false, reason: `이미 최대 레벨 (${upg.maxLv})` };

  const cost = upg.costPerLv * (curLv + 1);
  if ((player.gold || 0) < cost) return { ok: false, reason: `골드 부족 (${cost}G 필요)` };

  player.gold -= cost;
  player.farmUpgrades[zoneId] = curLv + 1;
  const newLv = curLv + 1;

  const zone = FARM_ZONES.find(z => z.id === zoneId);
  const totalGoldBonus = upg.goldBonus * newLv;
  const totalExpBonus = upg.expBonus * newLv;

  return {
    ok: true,
    msg: `${zone ? zone.name : zoneId} Lv.${newLv}! (+${totalGoldBonus}G/분, +${totalExpBonus}EXP/분)`,
    level: newLv, cost,
    goldPerMin: (zone ? zone.goldPerMin : 0) + totalGoldBonus,
    expPerMin: (zone ? zone.expPerMin : 0) + totalExpBonus,
  };
}

/** 업그레이드 보너스 적용된 구역 스탯 계산 */
function getZoneStats(player, zoneId) {
  const zone = FARM_ZONES.find(z => z.id === zoneId);
  if (!zone) return null;
  const upg = FARM_UPGRADES[zoneId];
  const lv = (player.farmUpgrades || {})[zoneId] || 0;
  return {
    goldPerMin: zone.goldPerMin + (upg ? upg.goldBonus * lv : 0),
    expPerMin: zone.expPerMin + (upg ? upg.expBonus * lv : 0),
    level: lv,
  };
}

// ============================================
// 계절 작물
// ============================================
const SEASONAL_CROPS = [
  { id: 'crop_spring', name: '봄꽃🌸', season: 'spring', duration: 1800, reward: { gold: 3000, diamonds: 5 }, desc: '봄 한정! 다이아 보너스' },
  { id: 'crop_summer', name: '수박🍉', season: 'summer', duration: 2400, reward: { gold: 5000, exp: 500 }, desc: '여름 한정! 대량 EXP' },
  { id: 'crop_autumn', name: '단풍🍁', season: 'autumn', duration: 3600, reward: { gold: 8000, cardChance: 0.3 }, desc: '가을 한정! 카드 찬스' },
  { id: 'crop_winter', name: '눈꽃❄️', season: 'winter', duration: 1200, reward: { gold: 2000, diamonds: 10 }, desc: '겨울 한정! 빠른 수확' },
];

function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function plantCrop(player, cropId) {
  const crop = SEASONAL_CROPS.find(c => c.id === cropId);
  if (!crop) return { ok: false, reason: '알 수 없는 작물' };

  const season = getCurrentSeason();
  if (crop.season !== season) return { ok: false, reason: `${crop.name}은(는) ${crop.season} 시즌에만 심을 수 있습니다 (현재: ${season})` };

  player.farmCrop = player.farmCrop || {};
  if (player.farmCrop.id) return { ok: false, reason: `이미 ${player.farmCrop.name}을(를) 재배 중!` };

  player.farmCrop = { id: crop.id, name: crop.name, plantedAt: Date.now(), duration: crop.duration };
  return { ok: true, msg: `${crop.name} 심기 완료! ${crop.duration}초 후 수확 가능`, desc: crop.desc };
}

function harvestCrop(player) {
  if (!player.farmCrop || !player.farmCrop.id) return { ok: false, reason: '재배 중인 작물 없음' };

  const elapsed = (Date.now() - player.farmCrop.plantedAt) / 1000;
  if (elapsed < player.farmCrop.duration) {
    const remaining = Math.ceil(player.farmCrop.duration - elapsed);
    return { ok: false, reason: `아직 ${remaining}초 남음!` };
  }

  const crop = SEASONAL_CROPS.find(c => c.id === player.farmCrop.id);
  if (!crop) { player.farmCrop = {}; return { ok: false, reason: '작물 데이터 오류' }; }

  const reward = crop.reward;
  const result = { ok: true, msg: `${crop.name} 수확!`, rewards: {} };

  if (reward.gold) { player.gold = (player.gold || 0) + reward.gold; result.rewards.gold = reward.gold; }
  if (reward.diamonds) { player.diamonds = (player.diamonds || 0) + reward.diamonds; result.rewards.diamonds = reward.diamonds; }
  if (reward.exp) { result.rewards.exp = reward.exp; }
  if (reward.cardChance && Math.random() < reward.cardChance) {
    const { generateRewardCard } = require('./card_system');
    const cards = generateRewardCard(20, 100);
    if (cards[0]) {
      player.cards = player.cards || [];
      player.cards.push(cards[0]);
      result.rewards.card = cards[0].name;
    }
  }

  player.farmCrop = {};
  return result;
}

// ============================================
// 특산물 교역
// ============================================
const SPECIALTY_PRODUCTS = [
  { zoneId: 'fz_meadow', name: '약초 다발🌿', value: 500, tradeBonus: 1.5 },
  { zoneId: 'fz_mine', name: '금괴⛏️💰', value: 2000, tradeBonus: 1.3 },
  { zoneId: 'fz_volcano', name: '용암 결정🌋💎', value: 5000, tradeBonus: 1.4 },
  { zoneId: 'fz_abyss', name: '심연의 눈물🌑💧', value: 10000, tradeBonus: 1.6 },
];

function collectSpecialty(player) {
  if (!player.farm || Object.keys(player.farm).length === 0) return { ok: false, reason: '배치된 카드 없음' };

  const now = Date.now();
  const collected = [];

  for (const [cardId, info] of Object.entries(player.farm)) {
    const hoursDeployed = (now - info.deployTime) / 3600000;
    if (hoursDeployed < 4) continue;

    const product = SPECIALTY_PRODUCTS.find(p => p.zoneId === info.zoneId);
    if (!product) continue;

    player.specialties = player.specialties || [];
    player.specialties.push({ ...product, obtainedAt: now, cardId });
    collected.push(product.name);
  }

  if (collected.length === 0) return { ok: false, reason: '4시간 이상 배치된 카드가 없거나 해당 구역에 특산물 없음' };
  return { ok: true, msg: `특산물 획득: ${collected.join(', ')}`, items: collected };
}

function sellSpecialty(player, specialtyIndex) {
  if (!player.specialties || player.specialties.length === 0) return { ok: false, reason: '보유 특산물 없음' };
  if (specialtyIndex < 0 || specialtyIndex >= player.specialties.length) return { ok: false, reason: '잘못된 인덱스' };

  const item = player.specialties[specialtyIndex];
  const sellPrice = Math.floor(item.value * item.tradeBonus);
  player.gold = (player.gold || 0) + sellPrice;
  player.specialties.splice(specialtyIndex, 1);

  // 농장 실적 누적 (업적용)
  player.farmStats = player.farmStats || { totalGold: 0 };
  player.farmStats.totalGold += sellPrice;

  return { ok: true, msg: `${item.name} 판매! +${sellPrice}G (x${item.tradeBonus} 보너스)`, gold: sellPrice };
}

// ============================================
// 농장 일꾼 시스템
// ============================================
const FARM_WORKERS = [
  { id: 'fw_goblin', name: '고블린 일꾼👺', cost: 5000, efficiency: 0.5, desc: '50% 효율, 저렴' },
  { id: 'fw_dwarf', name: '드워프 광부⛏️', cost: 15000, efficiency: 0.8, desc: '80% 효율, 광산 특화' },
  { id: 'fw_elf', name: '엘프 정원사🧝', cost: 20000, efficiency: 1.0, desc: '100% 효율!' },
  { id: 'fw_golem', name: '골렘 노동자🗿', cost: 30000, efficiency: 1.2, desc: '120% 효율! 최고!' },
];

const MAX_WORKERS = 2;

function hireWorker(player, workerId) {
  const worker = FARM_WORKERS.find(w => w.id === workerId);
  if (!worker) return { ok: false, reason: '알 수 없는 일꾼' };

  player.farmWorkers = player.farmWorkers || [];
  if (player.farmWorkers.length >= MAX_WORKERS) return { ok: false, reason: `최대 ${MAX_WORKERS}명까지 고용 가능` };
  if (player.farmWorkers.find(w => w.id === workerId)) return { ok: false, reason: '이미 고용한 일꾼' };

  if ((player.gold || 0) < worker.cost) return { ok: false, reason: `골드 부족 (${worker.cost}G 필요)` };

  player.gold -= worker.cost;
  player.farmWorkers.push({ id: worker.id, name: worker.name, efficiency: worker.efficiency, hiredAt: Date.now() });

  return { ok: true, msg: `${worker.name} 고용! (효율 ${worker.efficiency * 100}%)`, worker: worker.name };
}

/** 일꾼 자동 수집 효율 계산 */
function getWorkerEfficiency(player) {
  if (!player.farmWorkers || player.farmWorkers.length === 0) return 0;
  return player.farmWorkers.reduce((sum, w) => sum + w.efficiency, 0) / player.farmWorkers.length;
}

// ============================================
// 농장 업적
// ============================================
const FARM_MILESTONES = [
  { totalGold: 10000, name: '초보 농부', reward: { gold: 2000 }, icon: '🌱' },
  { totalGold: 50000, name: '숙련 농부', reward: { gold: 5000, diamonds: 10 }, icon: '🌾' },
  { totalGold: 200000, name: '농장왕', reward: { gold: 15000, diamonds: 30, title: '농장왕' }, icon: '🏆🌾' },
  { totalGold: 1000000, name: '전설의 농부', reward: { gold: 50000, diamonds: 100, card: 'legend' }, icon: '👑🌾' },
];

function checkFarmMilestones(player) {
  player.farmStats = player.farmStats || { totalGold: 0 };
  player.farmMilestonesCleared = player.farmMilestonesCleared || [];

  const newlyCleared = [];
  for (const ms of FARM_MILESTONES) {
    if (player.farmStats.totalGold >= ms.totalGold && !player.farmMilestonesCleared.includes(ms.name)) {
      player.farmMilestonesCleared.push(ms.name);

      if (ms.reward.gold) player.gold = (player.gold || 0) + ms.reward.gold;
      if (ms.reward.diamonds) player.diamonds = (player.diamonds || 0) + ms.reward.diamonds;
      if (ms.reward.title) player.title = ms.reward.title;
      if (ms.reward.card === 'legend') {
        const { generateRewardCard } = require('./card_system');
        const cards = generateRewardCard(80, 100);
        if (cards[0]) { player.cards = player.cards || []; player.cards.push(cards[0]); }
      }

      newlyCleared.push({ name: ms.name, icon: ms.icon, reward: ms.reward });
    }
  }
  return newlyCleared;
}

// ============================================
// 자동 판매 모드
// ============================================
function setAutoSell(player, enabled) {
  player.farmAutoSell = !!enabled;
  return { ok: true, msg: `자동 판매 ${player.farmAutoSell ? 'ON' : 'OFF'}`, autoSell: player.farmAutoSell };
}

// ============================================
// 핵심 함수 (기존 + 업그레이드/일꾼 반영)
// ============================================

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

  const stats = getZoneStats(player, zoneId);
  player.farm[cardId] = { zoneId, deployTime: Date.now(), cardName: card.name };
  return { ok: true, msg: `${card.name}을 ${zone.name}에 배치! (${stats.goldPerMin}G/분, Lv.${stats.level})` };
}

function collectFarm(player) {
  if (!player.farm || Object.keys(player.farm).length === 0) return { ok: false, reason: '배치된 카드 없음' };

  const now = Date.now();
  let totalGold = 0, totalExp = 0, totalDiamonds = 0;
  const events = [];
  const slotCount = Object.keys(player.farm).length;
  const bonus = ([...FARM_BONUSES].reverse().find(b => slotCount >= b.slots) || FARM_BONUSES[0]).bonus;
  const workerEff = getWorkerEfficiency(player);

  for (const [cardId, info] of Object.entries(player.farm)) {
    const stats = getZoneStats(player, info.zoneId);
    if (!stats) continue;
    const minutes = Math.min(480, (now - info.deployTime) / 60000); // 최대 8시간
    if (minutes < 1) continue;

    let gold = Math.floor(stats.goldPerMin * minutes * bonus);
    let exp = Math.floor(stats.expPerMin * minutes * bonus);

    // 일꾼 보너스 (자동수집 효율 추가 적용)
    if (workerEff > 0) {
      gold = Math.floor(gold * (1 + workerEff * 0.1));
      exp = Math.floor(exp * (1 + workerEff * 0.1));
    }

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

  // 농장 실적 누적
  player.farmStats = player.farmStats || { totalGold: 0 };
  player.farmStats.totalGold += totalGold;

  // 자동 판매: 특산물 자동 수집 + 판매
  let autoSellGold = 0;
  if (player.farmAutoSell) {
    const specResult = collectSpecialty(player);
    if (specResult.ok && player.specialties) {
      while (player.specialties.length > 0) {
        const item = player.specialties[0];
        const sellPrice = Math.floor(item.value * item.tradeBonus);
        player.gold += sellPrice;
        player.farmStats.totalGold += sellPrice;
        autoSellGold += sellPrice;
        player.specialties.shift();
      }
    }
  }

  // 업적 체크
  const milestones = checkFarmMilestones(player);

  return {
    ok: true,
    msg: `농장 수집! +${totalGold}G +EXP${totalExp}${totalDiamonds ? ' +' + totalDiamonds + '💎' : ''}${autoSellGold ? ' (자동판매 +' + autoSellGold + 'G)' : ''}`,
    gold: totalGold, exp: totalExp, diamonds: totalDiamonds,
    autoSellGold,
    events: events.map(e => ({ name: e.name, icon: e.icon })),
    bonus: Math.round((bonus - 1) * 100) + '%',
    workerBonus: workerEff > 0 ? Math.round(workerEff * 10) + '%' : null,
    milestones: milestones.length > 0 ? milestones : undefined,
  };
}

function removeFarmCard(player, cardId) {
  if (!player.farm || !player.farm[cardId]) return { ok: false, reason: '배치되지 않은 카드' };
  delete player.farm[cardId];
  return { ok: true, msg: '농장에서 회수!' };
}

// ============================================
// Socket 등록
// ============================================
function register(io, socket, player) {
  socket.on('farm_info', () => {
    const zoneStats = {};
    for (const z of FARM_ZONES) { zoneStats[z.id] = getZoneStats(player, z.id); }
    socket.emit('farm_info', {
      zones: FARM_ZONES, bonuses: FARM_BONUSES, maxSlots: MAX_FARM_SLOTS,
      deployed: player.farm || {},
      upgrades: player.farmUpgrades || {},
      zoneStats,
      workers: player.farmWorkers || [],
      crop: player.farmCrop || {},
      specialties: player.specialties || [],
      autoSell: player.farmAutoSell || false,
      season: getCurrentSeason(),
      milestones: FARM_MILESTONES,
      milestonesCleared: player.farmMilestonesCleared || [],
      farmStats: player.farmStats || { totalGold: 0 },
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

  // 농장 업그레이드
  socket.on('farm_upgrade', (data) => {
    const result = upgradeFarmZone(player, data.zoneId);
    socket.emit('farm_upgrade_result', result);
    if (result.ok) socket.emit('gold_update', { gold: player.gold });
  });

  // 계절 작물
  socket.on('farm_plant_crop', (data) => {
    const result = plantCrop(player, data.cropId);
    socket.emit('farm_plant_crop_result', result);
  });

  socket.on('farm_harvest_crop', () => {
    const result = harvestCrop(player);
    socket.emit('farm_harvest_crop_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 특산물
  socket.on('farm_specialty', () => {
    const result = collectSpecialty(player);
    socket.emit('farm_specialty_result', result);
  });

  socket.on('farm_sell_specialty', (data) => {
    const result = sellSpecialty(player, data.index);
    socket.emit('farm_sell_specialty_result', result);
    if (result.ok) socket.emit('gold_update', { gold: player.gold });
  });

  // 일꾼 고용
  socket.on('farm_hire_worker', (data) => {
    const result = hireWorker(player, data.workerId);
    socket.emit('farm_hire_worker_result', result);
    if (result.ok) socket.emit('gold_update', { gold: player.gold });
  });

  // 업적 확인
  socket.on('farm_milestones', () => {
    socket.emit('farm_milestones_result', {
      milestones: FARM_MILESTONES,
      cleared: player.farmMilestonesCleared || [],
      stats: player.farmStats || { totalGold: 0 },
    });
  });

  // 자동 판매
  socket.on('farm_auto_sell', (data) => {
    const result = setAutoSell(player, data.enabled);
    socket.emit('farm_auto_sell_result', result);
  });
}

module.exports = {
  FARM_ZONES, FARM_BONUSES, FARM_EVENTS, MAX_FARM_SLOTS,
  FARM_UPGRADES, SEASONAL_CROPS, SPECIALTY_PRODUCTS, FARM_WORKERS, FARM_MILESTONES,
  deployToFarm, collectFarm, removeFarmCard,
  upgradeFarmZone, getZoneStats,
  plantCrop, harvestCrop, getCurrentSeason,
  collectSpecialty, sellSpecialty,
  hireWorker, getWorkerEfficiency,
  checkFarmMilestones, setAutoSell,
  register,
};

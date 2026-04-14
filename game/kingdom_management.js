// v5.2 — 영지 경영 시뮬레이션 (거상 스타일)
// 건물 건설, 자원 생산, 주민 관리, 세금, 번영도

const TICK_INTERVAL = 60; // 60초마다 생산

// 건설 가능한 건물
const BUILDINGS = {
  gold_mine:    { name: '금광', icon: '⛏️💰', maxLv: 10, baseCost: 2000, prod: { gold: 100 }, desc: '골드 생산', buildTime: 60 },
  lumber_mill:  { name: '제재소', icon: '🪵', maxLv: 10, baseCost: 1500, prod: { wood: 80 }, desc: '목재 생산', buildTime: 45 },
  iron_forge:   { name: '제철소', icon: '⚒️', maxLv: 10, baseCost: 3000, prod: { iron: 50 }, desc: '철광 생산', buildTime: 90 },
  farm:         { name: '농장', icon: '🌾', maxLv: 10, baseCost: 1000, prod: { food: 120 }, desc: '식량 생산', buildTime: 30 },
  barracks:     { name: '병영', icon: '🏕️', maxLv: 5, baseCost: 5000, prod: { mercSlot: 1 }, desc: '용병 슬롯+1', buildTime: 120 },
  academy:      { name: '아카데미', icon: '📚', maxLv: 5, baseCost: 8000, prod: { expBonus: 0.05 }, desc: '용병 EXP+5%/Lv', buildTime: 180 },
  market:       { name: '시장', icon: '🏪', maxLv: 5, baseCost: 4000, prod: { tradeBonus: 0.1 }, desc: '무역 수익+10%/Lv', buildTime: 90 },
  wall:         { name: '성벽', icon: '🧱', maxLv: 10, baseCost: 6000, prod: { defBonus: 50 }, desc: '공성전 DEF+50/Lv', buildTime: 150 },
  temple:       { name: '신전', icon: '⛪', maxLv: 3, baseCost: 15000, prod: { blessingSlot: 1 }, desc: '축복 슬롯+1', buildTime: 300 },
  tavern:       { name: '주점', icon: '🍺', maxLv: 5, baseCost: 3000, prod: { mercRecruit: 0.05 }, desc: '희귀 용병 등장률+5%/Lv', buildTime: 60 },
  tower:        { name: '마법탑', icon: '🗼', maxLv: 5, baseCost: 10000, prod: { researchSpd: 0.1 }, desc: '연구 속도+10%/Lv', buildTime: 240 },
  warehouse:    { name: '창고', icon: '🏚️', maxLv: 10, baseCost: 2000, prod: { storage: 5000 }, desc: '자원 저장량+5000/Lv', buildTime: 45 },
};

// 주민 시스템
const CITIZEN_TYPES = {
  farmer:    { name: '농부', icon: '👨‍🌾', bonus: { food: 1.1 }, cost: 100 },
  miner:     { name: '광부', icon: '⛏️', bonus: { gold: 1.1, iron: 1.1 }, cost: 150 },
  merchant:  { name: '상인', icon: '🧑‍💼', bonus: { tradeBonus: 1.05 }, cost: 200 },
  scholar:   { name: '학자', icon: '🧑‍🔬', bonus: { expBonus: 1.05 }, cost: 300 },
  soldier:   { name: '병사', icon: '💂', bonus: { defBonus: 1.1 }, cost: 250 },
  priest:    { name: '사제', icon: '🧑‍⚕️', bonus: { happiness: 5 }, cost: 400 },
};

// 번영도 시스템: 번영도가 높을수록 보너스
const PROSPERITY_TIERS = [
  { min: 0,   name: '폐허', bonus: 0.8, desc: '모든 생산 -20%' },
  { min: 20,  name: '마을', bonus: 1.0, desc: '표준' },
  { min: 50,  name: '도시', bonus: 1.15, desc: '모든 생산 +15%' },
  { min: 80,  name: '대도시', bonus: 1.3, desc: '모든 생산 +30%' },
  { min: 100, name: '수도', bonus: 1.5, desc: '모든 생산 +50%, 특수 이벤트 해금' },
];

// 영지 이벤트 (랜덤)
const KINGDOM_EVENTS = [
  { id: 'harvest', name: '풍년', chance: 0.08, effect: { food: 2.0 }, dur: 300, desc: '식량 생산 2배! (5분)' },
  { id: 'gold_rush', name: '금맥 발견', chance: 0.05, effect: { gold: 2.5 }, dur: 300, desc: '골드 생산 2.5배! (5분)' },
  { id: 'plague', name: '역병', chance: 0.04, effect: { happiness: -20 }, dur: 600, desc: '번영도 -20 (10분)' },
  { id: 'festival', name: '축제', chance: 0.06, effect: { happiness: 15, gold: 0.8 }, dur: 300, desc: '번영도+15, 골드-20%' },
  { id: 'bandit_raid', name: '도적 습격', chance: 0.05, effect: { gold: 0.5, iron: 0.5 }, dur: 180, desc: '자원 -50% (3분), 병사로 방어 가능' },
  { id: 'merchant_caravan', name: '상단 방문', chance: 0.07, effect: { tradeBonus: 2.0 }, dur: 300, desc: '무역 수익 2배! (5분)' },
  { id: 'wandering_merc', name: '떠돌이 용병', chance: 0.03, effect: { freeRecruit: true }, dur: 60, desc: '무료 용병 1명 영입 기회!' },
  { id: 'earthquake', name: '지진', chance: 0.02, effect: { buildDmg: 0.1 }, dur: 0, desc: '건물 내구도 10% 손실' },
];

// 세금 시스템
const TAX_RATES = {
  none:   { rate: 0,    happiness: 5,  goldMul: 0,   desc: '무세: 번영도↑ 수입0' },
  low:    { rate: 0.05, happiness: 2,  goldMul: 1.0, desc: '저세율: 약간 수입' },
  normal: { rate: 0.10, happiness: 0,  goldMul: 1.0, desc: '보통: 표준 수입' },
  high:   { rate: 0.20, happiness: -5, goldMul: 1.0, desc: '고세율: 수입↑ 번영도↓' },
  extreme:{ rate: 0.35, happiness: -15,goldMul: 1.0, desc: '착취: 최대 수입, 번영도 급락' },
};

function getKingdom(player) {
  if (!player.kingdom) {
    player.kingdom = {
      buildings: {},
      citizens: {},
      resources: { gold: 0, wood: 0, iron: 0, food: 0 },
      prosperity: 20,
      taxRate: 'normal',
      events: [],
      lastTick: Date.now(),
    };
  }
  return player.kingdom;
}

function buildOrUpgrade(player, buildingId) {
  const kingdom = getKingdom(player);
  const bld = BUILDINGS[buildingId];
  if (!bld) return { ok: false, reason: '알 수 없는 건물' };
  const current = kingdom.buildings[buildingId] || { level: 0 };
  if (current.level >= bld.maxLv) return { ok: false, reason: '최대 레벨' };
  const cost = bld.baseCost * (current.level + 1);
  if ((player.gold || 0) < cost) return { ok: false, reason: `골드 부족 (${cost}G 필요)` };
  player.gold -= cost;
  current.level++;
  kingdom.buildings[buildingId] = current;
  return { ok: true, building: buildingId, level: current.level, cost };
}

function collectResources(player) {
  const kingdom = getKingdom(player);
  const now = Date.now();
  const elapsed = Math.floor((now - kingdom.lastTick) / (TICK_INTERVAL * 1000));
  if (elapsed <= 0) return { ok: false, reason: '아직 생산 시간 안됨' };

  const prosTier = PROSPERITY_TIERS.filter(t => kingdom.prosperity >= t.min).pop() || PROSPERITY_TIERS[0];
  const produced = { gold: 0, wood: 0, iron: 0, food: 0 };

  for (const [id, bld] of Object.entries(kingdom.buildings)) {
    const def = BUILDINGS[id];
    if (!def || !def.prod) continue;
    for (const [res, amount] of Object.entries(def.prod)) {
      if (produced[res] !== undefined) {
        produced[res] += Math.floor(amount * bld.level * elapsed * prosTier.bonus);
      }
    }
  }

  // 세금 수입
  const tax = TAX_RATES[kingdom.taxRate] || TAX_RATES.normal;
  const taxIncome = Math.floor(produced.gold * tax.rate);
  produced.gold += taxIncome;
  kingdom.prosperity = Math.max(0, Math.min(100, kingdom.prosperity + tax.happiness * elapsed * 0.01));

  for (const [res, amount] of Object.entries(produced)) {
    kingdom.resources[res] = (kingdom.resources[res] || 0) + amount;
  }
  kingdom.lastTick = now;

  return { ok: true, produced, prosperity: Math.round(kingdom.prosperity), tier: prosTier.name, ticks: elapsed };
}

function register(io, socket, player) {
  socket.on('kingdom_status', () => {
    const kingdom = getKingdom(player);
    const prosTier = PROSPERITY_TIERS.filter(t => kingdom.prosperity >= t.min).pop();
    socket.emit('kingdom_status', { ...kingdom, prosTier, buildingDefs: BUILDINGS, citizenTypes: CITIZEN_TYPES, taxRates: TAX_RATES });
  });

  socket.on('kingdom_build', (data) => {
    const result = buildOrUpgrade(player, data.buildingId);
    socket.emit('kingdom_build_result', result);
  });

  socket.on('kingdom_collect', () => {
    const result = collectResources(player);
    socket.emit('kingdom_collect_result', result);
  });

  socket.on('kingdom_set_tax', (data) => {
    const kingdom = getKingdom(player);
    if (TAX_RATES[data.rate]) {
      kingdom.taxRate = data.rate;
      socket.emit('kingdom_set_tax_result', { ok: true, rate: data.rate });
    }
  });
}

module.exports = {
  BUILDINGS, CITIZEN_TYPES, PROSPERITY_TIERS, KINGDOM_EVENTS, TAX_RATES,
  getKingdom, buildOrUpgrade, collectResources, register,
};

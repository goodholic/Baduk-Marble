// SLG 뷰 시스템 — v3.0
// IO 단판과 완전히 분리된 "키우는 재미" 화면
// 용병 진급/진화/소환 + 성 관리 + 무역 + 이벤트

// ═══ SLG 모드 상태 ═══
// 플레이어는 IO 모드 ↔ SLG 모드를 자유롭게 전환
// IO에서 벌고, SLG에서 키우고, 다시 IO에서 활용

// ── 용병 진급 시스템 (병사 → 장군) ──
const PROMOTION_TREE = {
  // 전사 계열
  merc_soldier: {
    name: '보병', promotions: [
      { lv: 10, to: 'merc_veteran',    name: '베테랑 전사',  icon: '⚔️', cost: { gold: 2000, material: 5 },  statBoost: { atk: 8, def: 5, hp: 50 } },
      { lv: 25, to: 'merc_champion',   name: '챔피언',       icon: '🏆', cost: { gold: 10000, material: 20 }, statBoost: { atk: 20, def: 15, hp: 150 } },
      { lv: 50, to: 'merc_warlord',    name: '전쟁군주',     icon: '👑', cost: { gold: 50000, material: 50 }, statBoost: { atk: 40, def: 30, hp: 300 } },
    ],
  },
  merc_archer: {
    name: '궁수', promotions: [
      { lv: 10, to: 'merc_sniper',     name: '저격수',       icon: '🎯', cost: { gold: 2000, material: 5 },  statBoost: { atk: 10, spd: 3 } },
      { lv: 25, to: 'merc_marksman',   name: '명사수',       icon: '🏹', cost: { gold: 10000, material: 20 }, statBoost: { atk: 25, critRate: 10 } },
      { lv: 50, to: 'merc_hawkeye',    name: '매의 눈',      icon: '🦅', cost: { gold: 50000, material: 50 }, statBoost: { atk: 45, critRate: 20, spd: 5 } },
    ],
  },
  merc_wizard: {
    name: '마법사', promotions: [
      { lv: 10, to: 'merc_sorcerer',   name: '주술사',       icon: '🔮', cost: { gold: 3000, material: 8 },  statBoost: { atk: 12 } },
      { lv: 25, to: 'merc_archmage',   name: '대마도사',     icon: '🌟', cost: { gold: 15000, material: 25 }, statBoost: { atk: 30, aoe: true } },
      { lv: 50, to: 'merc_grand_wizard',name:'현자',          icon: '📖', cost: { gold: 60000, material: 60 }, statBoost: { atk: 55, aoe: true } },
    ],
  },
};

// ── 용병 진화 (합성) ──
const EVOLUTION_RECIPES = [
  { name: '기사 진화',     inputs: ['merc_soldier','merc_soldier','merc_soldier'], output: 'merc_knight',  cost: { gold: 5000 }, desc: '보병 3명 → 기사' },
  { name: '성기사 진화',   inputs: ['merc_knight','merc_acolyte'],                 output: 'merc_paladin', cost: { gold: 15000 }, desc: '기사 + 사제 → 성기사' },
  { name: '흑마법사 진화', inputs: ['merc_wizard','merc_wizard'],                   output: 'merc_warlock', cost: { gold: 12000 }, desc: '마법사 2명 → 흑마법사' },
  { name: '드래곤나이트',  inputs: ['merc_knight','merc_paladin','merc_dragon_egg'],output: 'merc_dragon_knight', cost: { gold: 50000 }, desc: '기사+성기사+용알 → 드래곤나이트' },
  { name: '죽음의 기사',   inputs: ['merc_warlock','merc_shadow_lord'],             output: 'merc_death_knight', cost: { gold: 100000 }, desc: '흑마+그림자 → 죽음의 기사' },
  // v3.0 추가 진화
  { name: '닌자 진화',     inputs: ['merc_rogue','merc_ranger'],                   output: 'merc_ninja',    cost: { gold: 10000 }, desc: '도적+레인저 → 닌자' },
  { name: '발키리 진화',   inputs: ['merc_knight','merc_acolyte','merc_archer'],    output: 'merc_valkyrie', cost: { gold: 15000 }, desc: '기사+사제+궁수 → 발키리' },
  { name: '불사조 기사',   inputs: ['merc_paladin','merc_phoenix_feather'],         output: 'merc_phoenix',  cost: { gold: 40000 }, desc: '성기사+불사조깃털 → 불사조 기사' },
  { name: '서리 여왕',     inputs: ['merc_warlock','merc_wizard','merc_wizard'],    output: 'merc_frost_queen',cost:{ gold: 45000 }, desc: '흑마+마법사×2 → 서리 여왕' },
  { name: '천상의 기사',   inputs: ['merc_dragon_knight','merc_seraph'],            output: 'merc_celestial',cost: { gold: 150000 }, desc: '드래곤나이트+세라핌 → 천상의 기사' },
  { name: '용왕',          inputs: ['merc_dragon_knight','merc_dragon_knight','merc_celestial'], output: 'merc_bahamut', cost: { gold: 500000 }, desc: '드래곤×2+천상 → 바하무트!' },
];

// ── SLG 이벤트 (기존 이벤트 연동) ──
const SLG_EVENTS = [
  { id: 'merc_tournament', name: '용병 대회',     icon: '🏟️', interval: 3600,  desc: '용병끼리 토너먼트! 1위 보상 대박', reward: { gold: 20000, diamonds: 100 } },
  { id: 'trade_festival',  name: '무역 축제',     icon: '💰', interval: 7200,  desc: '모든 교역 이윤 2배!', effect: { tradeProfitMult: 2 } },
  { id: 'siege_season',    name: '공성 시즌',     icon: '🏰', interval: 14400, desc: '공성 보상 3배! 전원 참여!', effect: { siegeRewardMult: 3 } },
  { id: 'merc_recruit',    name: '용병 모집 축제', icon: '🎴', interval: 10800, desc: '소환 시 등급 +1 보장!', effect: { gradeBoost: 1 } },
  { id: 'boss_invasion',   name: '보스 침공',     icon: '👹', interval: 5400,  desc: '월드 보스가 모든 성을 공격! 협동 방어!', reward: { gold: 30000, mercCard: true } },
  { id: 'treasure_hunt',   name: '보물 사냥',     icon: '🗺️', interval: 3600,  desc: '맵에 보물이 숨겨짐! 찾으면 희귀 용병!', reward: { mercCard: true } },
  // v3.0 추가 이벤트
  { id: 'merc_war',       name: '용병 대전쟁',   icon: '⚔️', interval: 7200,  desc: '서버 전체 용병 전쟁! 최강 부대 결정!', reward: { gold: 50000, diamonds: 200 } },
  { id: 'dragon_invasion',name: '드래곤 침공',   icon: '🐲', interval: 10800, desc: '드래곤 군단이 모든 성을 공격! 협동 방어!', reward: { mercCard: true, gold: 30000 } },
  { id: 'black_market',   name: '암시장 오픈',   icon: '🌑', interval: 5400,  desc: '희귀 용병/장비를 할인 구매!', effect: { gachaDiscount: 50 } },
  { id: 'double_exp',     name: '경험치 폭풍',   icon: '📈', interval: 3600,  desc: '용병 EXP 2배! 빠른 성장!', effect: { mercExpMult: 2 } },
  { id: 'guild_rally',    name: '혈맹 집결',     icon: '🏴', interval: 14400, desc: '혈맹 공성 보상 5배! 전원 참여!', effect: { siegeRewardMult: 5 } },
];

// ═══ SLG 이벤트 활성 시스템 (v3.8) ═══
let activeSlgEvent = null; // { event, activatedAt, expiresAt }

function tickSlgEvents() {
  const now = Date.now();

  // 이미 활성 이벤트가 있으면 만료 체크
  if (activeSlgEvent) {
    if (now >= activeSlgEvent.expiresAt) {
      const expired = activeSlgEvent;
      activeSlgEvent = null;
      return { type: 'expired', event: expired.event };
    }
    return null; // 아직 활성 중, 변화 없음
  }

  // 10% 확률로 랜덤 이벤트 활성화
  if (Math.random() < 0.10) {
    const evt = SLG_EVENTS[Math.floor(Math.random() * SLG_EVENTS.length)];
    activeSlgEvent = {
      event: evt,
      activatedAt: now,
      expiresAt: now + 5 * 60 * 1000, // 5분간 지속
    };
    return { type: 'activated', event: evt, expiresAt: activeSlgEvent.expiresAt };
  }

  return null;
}

function getActiveEvent() {
  if (!activeSlgEvent) return null;
  if (Date.now() >= activeSlgEvent.expiresAt) {
    activeSlgEvent = null;
    return null;
  }
  const remaining = Math.ceil((activeSlgEvent.expiresAt - Date.now()) / 1000);
  return { ...activeSlgEvent.event, remaining, expiresAt: activeSlgEvent.expiresAt };
}

function checkEventEffect(eventId, effectType) {
  if (!activeSlgEvent || activeSlgEvent.event.id !== eventId) return null;
  if (Date.now() >= activeSlgEvent.expiresAt) { activeSlgEvent = null; return null; }

  const evt = activeSlgEvent.event;

  // 직접 effect 필드에서 반환
  if (evt.effect && evt.effect[effectType] !== undefined) {
    return evt.effect[effectType];
  }

  // boss_invasion 특수 처리: spawn flag
  if (eventId === 'boss_invasion' && effectType === 'spawnBoss') {
    return true;
  }

  return null;
}

// ── 공성전 배치 시스템 (성주 방어) ──
const SIEGE_PLACEMENT = {
  maxTraps: 10,
  maxDefenders: 8,
  trapTypes: [
    { id: 'spike_trap',   name: '가시 함정',   icon: '⚠️', dmg: 50,  cost: 500,  desc: '밟으면 데미지' },
    { id: 'fire_trap',    name: '화염 함정',   icon: '🔥', dmg: 80,  cost: 1000, desc: '범위 화염' },
    { id: 'ice_trap',     name: '빙결 함정',   icon: '❄️', stun: 3,  cost: 800,  desc: '3초 빙결' },
    { id: 'poison_trap',  name: '독 함정',     icon: '☠️', dot: 10,  dur: 5, cost: 700, desc: '독 5초' },
    { id: 'bomb_trap',    name: '폭탄 함정',   icon: '💣', dmg: 200, cost: 2000, desc: '대폭발' },
    { id: 'arrow_tower',  name: '화살 탑',     icon: '🏹', dmg: 30,  rate: 2, cost: 3000, desc: '자동 사격' },
    { id: 'magic_barrier',name: '마법 장벽',   icon: '🔮', hp: 500,  cost: 4000, desc: '통로 차단' },
    { id: 'slow_trap',    name: '감속 덫',     icon: '🕸️', slow: 50, cost: 600,  desc: '이동속도 -50%' },
    { id: 'teleport_trap',name: '텔레포트 함정',icon: '🌀', cost: 3000, desc: '시작점으로 강제 이동' },
    { id: 'summon_trap',  name: '소환 함정',   icon: '👹', summon: 3, cost: 5000, desc: '해골 3체 소환' },
  ],
  // 공성전 맵 구조 (v3.0 복잡화)
  mapLayout: {
    size: { w: 25, h: 20 },
    lanes: 5,            // 5개 통로 (좌/좌중/중/우중/우)
    gatePosition: { x: 12, y: 0 },
    thronePosition: { x: 12, y: 19 },
    // 지형 장애물 (벽)
    walls: [
      { x: 5, y: 5, w: 3, h: 1 }, { x: 17, y: 5, w: 3, h: 1 },
      { x: 8, y: 10, w: 9, h: 1 }, // 중앙 벽 (우회 필요)
      { x: 3, y: 14, w: 4, h: 1 }, { x: 18, y: 14, w: 4, h: 1 },
    ],
    // 특수 지형
    healZone: { x: 12, y: 7, radius: 2 }, // 회복 지대
    slowZone: { x: 6, y: 12, radius: 3 },  // 감속 지대
    darkZone: { x: 18, y: 8, radius: 3 },  // 시야 차단 지대
  },
};

// ── 공성전 진행 (IO 단판 방식!) ──
// 도전자: 상하좌우로 이동하며 함정을 피하고, 방어 용병을 처치하며 왕좌까지 돌파
// 성주: 사전에 함정+용병을 배치 (배치 후 실시간 관전)
// 도전자가 왕좌에 도달하면 승리, 시간 초과(5분) 또는 사망하면 성주 승리

function getSlgStatus(player) {
  const mercSystem = require('./mercenary_system');
  const mercs = mercSystem.getMercStatus(player);

  return {
    mode: 'slg',
    // 성 정보
    castle: player._castle || { level: 1, name: '캠프', buildings: [], traps: [] },
    // 용병 정보
    mercs: mercs,
    // 진급 가능 목록
    promotions: getAvailablePromotions(player),
    // 진화 가능 목록
    evolutions: getAvailableEvolutions(player),
    // 교역 상태
    trade: player._tradeState || { activeRoutes: [], gold: 0 },
    // 이벤트
    events: SLG_EVENTS.map(e => {
      const active = activeSlgEvent && activeSlgEvent.event.id === e.id && Date.now() < activeSlgEvent.expiresAt;
      return { ...e, active, remaining: active ? Math.ceil((activeSlgEvent.expiresAt - Date.now()) / 1000) : 0 };
    }),
    activeEvent: getActiveEvent(),
  };
}

function getAvailablePromotions(player) {
  const mercSystem = require('./mercenary_system');
  const mercs = mercSystem.getPlayerMercs(player);
  const available = [];

  for (const merc of mercs.roster) {
    const tree = PROMOTION_TREE[merc.id];
    if (!tree) continue;
    for (const promo of tree.promotions) {
      if (merc.level >= promo.lv && !merc._promoted?.includes(promo.to)) {
        available.push({ mercUid: merc.uid, mercName: merc.name, ...promo });
      }
    }
  }
  return available;
}

function getAvailableEvolutions(player) {
  const mercSystem = require('./mercenary_system');
  const mercs = mercSystem.getPlayerMercs(player);
  const available = [];

  for (const recipe of EVOLUTION_RECIPES) {
    // 필요한 용병이 모두 있는지 체크
    const inputCounts = {};
    for (const inputId of recipe.inputs) inputCounts[inputId] = (inputCounts[inputId] || 0) + 1;

    let canEvolve = true;
    for (const [id, count] of Object.entries(inputCounts)) {
      const owned = mercs.roster.filter(m => m.id === id).length;
      if (owned < count) { canEvolve = false; break; }
    }

    if (canEvolve && (player.gold || 0) >= recipe.cost.gold) {
      available.push(recipe);
    }
  }
  return available;
}

function promoteMerc(player, mercUid, promotionTo) {
  const mercSystem = require('./mercenary_system');
  const mercs = mercSystem.getPlayerMercs(player);
  const merc = mercs.roster.find(m => m.uid === mercUid);
  if (!merc) return { success: false, msg: '용병을 찾을 수 없습니다' };

  const tree = PROMOTION_TREE[merc.id];
  if (!tree) return { success: false, msg: '진급 불가능한 용병' };

  const promo = tree.promotions.find(p => p.to === promotionTo);
  if (!promo) return { success: false, msg: '진급 경로 없음' };
  if (merc.level < promo.lv) return { success: false, msg: 'Lv.' + promo.lv + ' 필요' };
  if ((player.gold || 0) < promo.cost.gold) return { success: false, msg: '골드 부족' };

  player.gold -= promo.cost.gold;
  if (!merc._promoted) merc._promoted = [];
  merc._promoted.push(promo.to);

  // 스탯 적용
  for (const [k, v] of Object.entries(promo.statBoost)) {
    if (merc[k] !== undefined) merc[k] += v;
  }
  merc.name = promo.name;
  merc.icon = promo.icon;

  return { success: true, msg: '🎖️ ' + promo.name + '(으)로 진급!', merc };
}

function evolveMercs(player, recipeIdx) {
  const recipe = EVOLUTION_RECIPES[recipeIdx];
  if (!recipe) return { success: false, msg: '레시피 없음' };

  const mercSystem = require('./mercenary_system');
  const mercs = mercSystem.getPlayerMercs(player);

  if ((player.gold || 0) < recipe.cost.gold) return { success: false, msg: '골드 부족' };

  // 재료 용병 소모
  for (const inputId of recipe.inputs) {
    const idx = mercs.roster.findIndex(m => m.id === inputId);
    if (idx === -1) return { success: false, msg: inputId + ' 부족' };
    mercs.roster.splice(idx, 1);
  }

  player.gold -= recipe.cost.gold;

  // 결과 용병 추가
  const result = mercSystem.addMercenary(player, recipe.output);

  return { success: true, msg: '🧬 진화 완료! ' + recipe.desc, merc: result.merc };
}

// 성 함정 배치
function placeTrap(player, trapId, x, y) {
  if (!player._castle) player._castle = { level: 1, traps: [], defenders: [] };
  const trap = SIEGE_PLACEMENT.trapTypes.find(t => t.id === trapId);
  if (!trap) return { success: false, msg: '함정 없음' };
  if (player._castle.traps.length >= SIEGE_PLACEMENT.maxTraps) return { success: false, msg: '함정 최대' };
  if ((player.gold || 0) < trap.cost) return { success: false, msg: '골드 부족' };

  player.gold -= trap.cost;
  player._castle.traps.push({ ...trap, x, y });

  return { success: true, msg: trap.icon + ' ' + trap.name + ' 배치! (' + x + ',' + y + ')' };
}

// 성 용병 배치 (방어)
function placeDefender(player, mercUid, x, y) {
  if (!player._castle) player._castle = { level: 1, traps: [], defenders: [] };
  const mercSystem = require('./mercenary_system');
  const mercs = mercSystem.getPlayerMercs(player);
  const merc = mercs.roster.find(m => m.uid === mercUid);
  if (!merc) return { success: false, msg: '용병 없음' };
  if (player._castle.defenders.length >= SIEGE_PLACEMENT.maxDefenders) return { success: false, msg: '방어 유닛 최대' };

  player._castle.defenders.push({
    uid: merc.uid, name: merc.name, icon: merc.icon,
    atk: merc.atk, def: merc.def, hp: merc.hp,
    skill: merc.skill || null, skillLevel: merc.skillLevel || 1,
    role: merc.role || '전사',
    x, y,
  });

  return { success: true, msg: merc.icon + ' ' + merc.name + ' 배치!' };
}

// ══════ 성 업그레이드 ══════
const CASTLE_TIERS = [
  { level: 1, name: '캠프 ⛺',       cost: 0,      time: 0,   slots: 3,  wallHp: 500 },
  { level: 2, name: '목책 요새 🏕️',  cost: 5000,   time: 60,  slots: 5,  wallHp: 1500 },
  { level: 3, name: '석조 성채 🏰',   cost: 20000,  time: 300, slots: 8,  wallHp: 5000 },
  { level: 4, name: '왕의 성 ����',     cost: 80000,  time: 900, slots: 12, wallHp: 15000 },
  { level: 5, name: '제국 요새 🗼',   cost: 300000, time: 1800,slots: 18, wallHp: 50000 },
];

const BUILDINGS = [
  { id: 'barracks', name: '⚔️ 병영',     cost: 2000,  effect: '용병 슬롯 +2',    desc: '더 많은 용병 배치' },
  { id: 'wall',     name: '🧱 성벽 강화', cost: 3000,  effect: '성벽 HP +2000',   desc: '방어력 강화' },
  { id: 'tower',    name: '🗼 감시탑',    cost: 5000,  effect: '시야 +50',        desc: '적 감지' },
  { id: 'market',   name: '💰 시장',      cost: 4000,  effect: '교역 슬롯 +1',    desc: '무역 확장' },
  { id: 'smithy',   name: '🔨 대장간',    cost: 6000,  effect: '장비 강화 가능',   desc: '장비 업그레이드' },
  { id: 'stable',   name: '🐴 마구간',    cost: 8000,  effect: '탈것 슬롯 +1',    desc: '이동 수단' },
  { id: 'temple',   name: '⛪ 신전',      cost: 10000, effect: '회복 +20%',       desc: '용병 치유' },
  { id: 'storage',  name: '📦 창고',      cost: 3000,  effect: '보관량 +500',     desc: '자원 저장' },
  { id: 'academy',  name: '📚 학원',      cost: 15000, effect: '용병 EXP +30%',   desc: '육성 ���속' },
];

function getCastle(player) {
  if (!player._castle) player._castle = { level: 1, name: '캠프 ⛺', buildings: [], traps: [], defenders: [], wallHp: 500 };
  return player._castle;
}

function upgradeCastle(player) {
  const castle = getCastle(player);
  const nextTier = CASTLE_TIERS.find(t => t.level === castle.level + 1);
  if (!nextTier) return { success: false, msg: '최대 레벨입니다!' };
  if ((player.gold || 0) < nextTier.cost) return { success: false, msg: `골드 부족 (필요: ${nextTier.cost}G)` };

  player.gold -= nextTier.cost;
  castle.level = nextTier.level;
  castle.name = nextTier.name;
  castle.wallHp = nextTier.wallHp;

  return { success: true, msg: `🏰 성 업그레이드! ${nextTier.name} (Lv.${nextTier.level})`, castle };
}

function buildFacility(player, buildingId) {
  const castle = getCastle(player);
  const building = BUILDINGS.find(b => b.id === buildingId);
  if (!building) return { success: false, msg: '시설 없음' };

  const currentSlots = CASTLE_TIERS.find(t => t.level === castle.level)?.slots || 3;
  if (castle.buildings.length >= currentSlots) return { success: false, msg: `시설 슬롯 부족 (${castle.buildings.length}/${currentSlots})` };
  if ((player.gold || 0) < building.cost) return { success: false, msg: `골드 부족 (${building.cost}G)` };

  player.gold -= building.cost;
  castle.buildings.push(buildingId);

  return { success: true, msg: `${building.name} 건설 완료! ${building.effect}` };
}

// ══════ 용병 원정대 ══════
const EXPEDITIONS = [
  { id: 'forest',   name: '🌲 숲 원정',     power: 100,  time: 3600,   rewards: { gold: 200,   material: 2,  exp: 50  }, desc: '1시간, 초보 원정' },
  { id: 'mountain',  name: '🏔️ 산맥 원정',   power: 500,  time: 10800,  rewards: { gold: 1000,  material: 8,  exp: 200 }, desc: '3시간, 중급' },
  { id: 'volcano',   name: '🌋 화산 원정',   power: 2000, time: 21600,  rewards: { gold: 5000,  material: 20, exp: 500, cardChance: 0.1 }, desc: '6시간, 상급' },
  { id: 'ruins',     name: '🏰 고대 유적',   power: 5000, time: 43200,  rewards: { gold: 15000, material: 50, exp: 1000, cardChance: 0.3 }, desc: '12시간, 최상급' },
  { id: 'dimension', name: '🌌 차원의 틈',   power: 10000,time: 86400,  rewards: { gold: 50000, material: 100, diamonds: 100, cardChance: 0.5 }, desc: '24시간, 전설' },
];

function startExpedition(player, expedId, mercUids) {
  if (!player._expedition) player._expedition = { active: null, completed: 0 };
  if (player._expedition.active) return { success: false, msg: '이미 원정 진행 중!' };

  const exped = EXPEDITIONS.find(e => e.id === expedId);
  if (!exped) return { success: false, msg: '원정 없음' };

  const mercSystem = require('./mercenary_system');
  const mercs = mercSystem.getPlayerMercs(player);
  const team = mercUids.map(uid => mercs.roster.find(m => m.uid === uid)).filter(Boolean).slice(0, 4);

  const totalPower = team.reduce((s, m) => s + mercSystem.calcCombatPower(m), 0);
  if (totalPower < exped.power) return { success: false, msg: `전투력 부족! (${totalPower}/${exped.power})` };

  player._expedition.active = {
    expedId, team: team.map(m => ({ uid: m.uid, name: m.name, icon: m.icon })),
    startTime: Date.now(), arrivalTime: Date.now() + exped.time * 1000,
    totalPower,
  };

  return { success: true, msg: `${exped.name} 출발! (${Math.floor(exped.time/3600)}시간)` };
}

function checkExpedition(player) {
  if (!player._expedition || !player._expedition.active) return null;
  const active = player._expedition.active;

  if (Date.now() < active.arrivalTime) {
    const remain = Math.ceil((active.arrivalTime - Date.now()) / 1000);
    return { completed: false, remaining: remain, name: EXPEDITIONS.find(e => e.id === active.expedId)?.name };
  }

  // 원정 완료!
  const exped = EXPEDITIONS.find(e => e.id === active.expedId);
  const rewards = { ...exped.rewards };

  // 전투력 보너스 (요구치 대비 초과분)
  const overPower = active.totalPower / exped.power;
  if (overPower > 1.5) { rewards.gold = Math.floor(rewards.gold * 1.3); rewards.material = Math.floor(rewards.material * 1.2); }

  // 랜덤 이벤트 (10%)
  let event = null;
  if (Math.random() < 0.1) {
    const events = ['보물 발견! 골드 2배', '적 습격! 보상 -30%', '비밀 던전 발견! 재료 3배', '조난 구조! 호감도 +10'];
    event = events[Math.floor(Math.random() * events.length)];
    if (event.includes('2배')) rewards.gold *= 2;
    else if (event.includes('-30%')) { rewards.gold = Math.floor(rewards.gold * 0.7); rewards.material = Math.floor(rewards.material * 0.7); }
    else if (event.includes('3배')) rewards.material *= 3;
  }

  // 용병 카드 드롭
  let mercCard = null;
  if (rewards.cardChance && Math.random() < rewards.cardChance) {
    try {
      const mercSystem = require('./mercenary_system');
      const pool = mercSystem.MERCENARIES.filter(m => m.grade <= 2);
      mercCard = pool[Math.floor(Math.random() * pool.length)];
      if (mercCard) {
        mercSystem.addMercenary(player, mercCard.id);
        mercCard = { name: mercCard.name, icon: mercCard.icon };
      }
    } catch(e) {}
  }

  // 용병 EXP 지급
  const mercSystem = require('./mercenary_system');
  for (const t of active.team) {
    mercSystem.addMercExp(player, t.uid, rewards.exp || 50);
  }

  // 보상 지급
  player.gold = (player.gold || 0) + rewards.gold;
  player.diamonds = (player.diamonds || 0) + (rewards.diamonds || 0);

  player._expedition.active = null;
  player._expedition.completed++;

  return { completed: true, rewards, event, mercCard, team: active.team };
}

// 소켓 핸들러
function registerSlgHandlers(socket, playerId, players, io) {
  socket.on('slg_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('slg_status', getSlgStatus(p));
  });

  socket.on('slg_promote', (data) => {
    const p = players[playerId];
    if (!p) return;
    const result = promoteMerc(p, data.uid, data.to);
    socket.emit('slg_result', result);
    if (result.success) io.emit('server_msg', { msg: '🎖️ ' + (p.displayName||p.className) + '의 용병이 진급! ' + result.merc.icon + ' ' + result.merc.name, type: 'rare' });
  });

  socket.on('slg_evolve', (recipeIdx) => {
    const p = players[playerId];
    if (!p) return;
    const result = evolveMercs(p, recipeIdx);
    socket.emit('slg_result', result);
    if (result.success) io.emit('server_msg', { msg: '🧬 ' + (p.displayName||p.className) + '의 용병 진화! ' + result.merc?.icon + ' ' + result.merc?.name, type: 'boss' });
  });

  socket.on('slg_place_trap', (data) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('slg_result', placeTrap(p, data.trapId, data.x, data.y));
  });

  socket.on('slg_place_defender', (data) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('slg_result', placeDefender(p, data.uid, data.x, data.y));
  });

  // 성 업그레이드
  socket.on('slg_upgrade_castle', () => {
    const p = players[playerId];
    if (!p) return;
    const result = upgradeCastle(p);
    socket.emit('slg_result', result);
    if (result.success) io.emit('server_msg', { msg: '🏰 ' + (p.displayName||p.className) + '의 성이 업그레이드! ' + result.castle.name, type: 'rare' });
  });

  // 시설 건설
  socket.on('slg_build', (buildingId) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('slg_result', buildFacility(p, buildingId));
  });

  // 시설 목록 조회
  socket.on('slg_buildings', () => {
    const p = players[playerId];
    if (!p) return;
    const castle = getCastle(p);
    const tier = CASTLE_TIERS.find(t => t.level === castle.level);
    socket.emit('slg_buildings', {
      buildings: BUILDINGS, current: castle.buildings,
      slots: tier?.slots || 3, used: castle.buildings.length,
    });
  });

  // 원정 출발
  socket.on('slg_expedition_start', (data) => {
    const p = players[playerId];
    if (!p) return;
    const result = startExpedition(p, data.expedId, data.mercUids || []);
    socket.emit('slg_result', result);
  });

  // 원정 상태 확인
  socket.on('slg_expedition_check', () => {
    const p = players[playerId];
    if (!p) return;
    const result = checkExpedition(p);
    if (result) {
      socket.emit('slg_expedition_result', result);
      if (result.completed) {
        let msg = '🌍 원정 완료! +' + result.rewards.gold + 'G';
        if (result.mercCard) msg += ' 🎴 ' + result.mercCard.icon + result.mercCard.name + ' 획득!';
        if (result.event) msg += ' (' + result.event + ')';
        socket.emit('server_msg', { msg, type: 'normal' });
      }
    } else {
      socket.emit('slg_expedition_result', { completed: false, remaining: 0, noExpedition: true });
    }
  });

  // 원정 목록
  socket.on('slg_expeditions', () => {
    socket.emit('slg_expeditions', { expeditions: EXPEDITIONS });
  });

  // 활성 SLG 이벤트 조회
  socket.on('slg_active_event', () => {
    const evt = getActiveEvent();
    socket.emit('slg_active_event', evt || { active: false, msg: '현재 활성 이벤트 없음' });
  });

  // 함정/용병 배치 초기화
  socket.on('slg_reset_defense', () => {
    const p = players[playerId];
    if (!p) return;
    const castle = getCastle(p);
    // 함정 비용의 50% 환불
    let refund = 0;
    for (const trap of castle.traps) refund += Math.floor((trap.cost || 0) * 0.5);
    castle.traps = [];
    castle.defenders = [];
    p.gold = (p.gold || 0) + refund;
    socket.emit('slg_result', { success: true, msg: `방��� 배치 초기화! ${refund}G 환불` });
  });
}

module.exports = { PROMOTION_TREE, EVOLUTION_RECIPES, SLG_EVENTS, SIEGE_PLACEMENT, CASTLE_TIERS, BUILDINGS, EXPEDITIONS, getSlgStatus, registerSlgHandlers, tickSlgEvents, getActiveEvent, checkEventEffect };

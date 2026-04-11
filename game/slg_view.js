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
];

// ── SLG 이벤트 (기존 이벤트 연동) ──
const SLG_EVENTS = [
  { id: 'merc_tournament', name: '용병 대회',     icon: '🏟️', interval: 3600,  desc: '용병끼리 토너먼트! 1위 보상 대박', reward: { gold: 20000, diamonds: 100 } },
  { id: 'trade_festival',  name: '무역 축제',     icon: '💰', interval: 7200,  desc: '모든 교역 이윤 2배!', effect: { tradeProfitMult: 2 } },
  { id: 'siege_season',    name: '공성 시즌',     icon: '🏰', interval: 14400, desc: '공성 보상 3배! 전원 참여!', effect: { siegeRewardMult: 3 } },
  { id: 'merc_recruit',    name: '용병 모집 축제', icon: '🎴', interval: 10800, desc: '소환 시 등급 +1 보장!', effect: { gradeBoost: 1 } },
  { id: 'boss_invasion',   name: '보스 침공',     icon: '👹', interval: 5400,  desc: '월드 보스가 모든 성을 공격! 협동 방어!', reward: { gold: 30000, mercCard: true } },
  { id: 'treasure_hunt',   name: '보물 사냥',     icon: '🗺️', interval: 3600,  desc: '맵에 보물이 숨겨짐! 찾으면 희귀 용병!', reward: { mercCard: true } },
];

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
  ],
  // 공성전 맵 구조
  mapLayout: {
    size: { w: 20, h: 15 },
    lanes: 3,            // 3개 통로
    gatePosition: { x: 10, y: 0 },  // 성문 위치
    thronePosition: { x: 10, y: 14 }, // 왕좌 위치 (여기 도달하면 승리)
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
    events: SLG_EVENTS.map(e => ({ ...e, active: false })), // TODO: 활성 상태 체크
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

  player._castle.defenders.push({ uid: merc.uid, name: merc.name, icon: merc.icon, atk: merc.atk, def: merc.def, hp: merc.hp, x, y });

  return { success: true, msg: merc.icon + ' ' + merc.name + ' 배치!' };
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
}

module.exports = { PROMOTION_TREE, EVOLUTION_RECIPES, SLG_EVENTS, SIEGE_PLACEMENT, getSlgStatus, registerSlgHandlers };

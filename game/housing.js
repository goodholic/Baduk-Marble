// 하우징 & 요새 시스템 — v2.58
// 개인 집/요새 건설, 가구 배치, 자원 생산, 방어전, 방문객

// ═══ 주택 등급 ═══
const HOUSE_TIERS = [
  { id: 'tent',    name: '텐트',       icon: '⛺', cost: 1000,    maxFurniture: 3,  maxGuards: 0, desc: '여행자의 임시 거처. 최소한의 공간.', bonuses: { restedExp: 5 } },
  { id: 'cottage', name: '오두막',     icon: '🏠', cost: 10000,   maxFurniture: 8,  maxGuards: 1, desc: '아담한 오두막. 화덕과 침대가 있다.', bonuses: { restedExp: 10, hpRegen: 2 } },
  { id: 'house',   name: '주택',       icon: '🏡', cost: 50000,   maxFurniture: 15, maxGuards: 2, desc: '넓은 정원이 있는 주택.', bonuses: { restedExp: 15, hpRegen: 5, goldProd: 50 } },
  { id: 'mansion', name: '저택',       icon: '🏰', cost: 200000,  maxFurniture: 25, maxGuards: 4, desc: '호화로운 귀족의 저택.', bonuses: { restedExp: 25, hpRegen: 10, goldProd: 200, expBonus: 5 } },
  { id: 'castle',  name: '성',         icon: '🏯', cost: 1000000, maxFurniture: 40, maxGuards: 8, desc: '영주의 성. 최고의 방어력과 자원 생산.', bonuses: { restedExp: 40, hpRegen: 20, goldProd: 500, expBonus: 10, defBonus: 10 } },
];

// ═══ 가구 정의 ═══
const FURNITURE = {
  // 기본 가구
  bed:          { name: '침대',       icon: '🛏️', cost: 500,   category: 'basic',  effect: { restedExp: 5 }, desc: '편안한 잠자리. 경험치 보너스.' },
  table:        { name: '식탁',       icon: '🪑', cost: 300,   category: 'basic',  effect: {}, desc: '식사를 위한 테이블.' },
  fireplace:    { name: '벽난로',     icon: '🔥', cost: 2000,  category: 'basic',  effect: { hpRegen: 3 }, desc: '따뜻한 벽난로. HP 자동 회복.' },
  bookshelf:    { name: '책장',       icon: '📚', cost: 3000,  category: 'deco',   effect: { expBonus: 3 }, desc: '지식의 보고. EXP 보너스.' },
  // 생산 가구
  garden:       { name: '약초 정원',  icon: '🌿', cost: 5000,  category: 'prod',   effect: { produce: { item: 'mat_herb', amount: 2, interval: 3600 } }, desc: '매시간 약초 2개 생산.' },
  mine:         { name: '채광 시설',  icon: '⛏️', cost: 10000, category: 'prod',   effect: { produce: { item: 'mat_ore', amount: 1, interval: 3600 } }, desc: '매시간 광석 1개 생산.' },
  goldmine:     { name: '금광',       icon: '💰', cost: 30000, category: 'prod',   effect: { goldProd: 100 }, desc: '시간당 100G 수입.' },
  farm:         { name: '농장',       icon: '🌾', cost: 8000,  category: 'prod',   effect: { produce: { item: 'mat_wheat', amount: 3, interval: 3600 } }, desc: '매시간 밀 3개 생산.' },
  // 전투 가구
  training:     { name: '훈련장',     icon: '⚔️', cost: 15000, category: 'combat', effect: { atkBonus: 3 }, desc: 'ATK +3 보너스.' },
  armor_stand:  { name: '갑옷 거치대',icon: '🛡️', cost: 12000, category: 'combat', effect: { defBonus: 3 }, desc: 'DEF +3 보너스.' },
  alchemy_lab:  { name: '연금술 작업대',icon:'⚗️', cost: 20000, category: 'combat', effect: { potionProd: true }, desc: '포션 자동 생산.' },
  // 장식 가구
  trophy:       { name: '트로피 전시대',icon:'🏆', cost: 5000,  category: 'deco',   effect: {}, desc: '업적을 전시한다. 방문객 호감 +.' },
  fountain:     { name: '마법 분수',  icon: '⛲', cost: 25000, category: 'deco',   effect: { mpRegen: 5 }, desc: 'MP 자동 회복.' },
  crystal_lamp: { name: '수정 조명',  icon: '💎', cost: 8000,  category: 'deco',   effect: {}, desc: '아름다운 수정 조명.' },
  dragon_statue:{ name: '용 석상',    icon: '🐉', cost: 50000, category: 'deco',   effect: { atkBonus: 5, defBonus: 5 }, desc: '용의 위엄. ATK/DEF +5.' },
  world_map:    { name: '세계 지도',  icon: '🗺️', cost: 10000, category: 'deco',   effect: { expBonus: 2 }, desc: '세계 지도. EXP +2%.' },
};

// ═══ 수비 유닛 ═══
const GUARD_TYPES = [
  { id: 'militia',  name: '민병대',   icon: '🗡️', cost: 2000,  hp: 200, atk: 15, def: 8 },
  { id: 'knight',   name: '기사',     icon: '⚔️', cost: 8000,  hp: 400, atk: 25, def: 15 },
  { id: 'mage',     name: '마법사',   icon: '🧙', cost: 10000, hp: 250, atk: 40, def: 8 },
  { id: 'golem',    name: '골렘',     icon: '🗿', cost: 20000, hp: 800, atk: 20, def: 30 },
  { id: 'dragon',   name: '드래곤',   icon: '🐲', cost: 100000,hp: 1500,atk: 60, def: 25 },
];

// ═══ 하우징 핵심 로직 ═══

function getHouse(player) {
  if (!player._house) {
    player._house = null; // 집이 없음
  }
  return player._house;
}

function buildHouse(player, tierId) {
  if (player._house) return { success: false, msg: '이미 집이 있습니다. 업그레이드를 이용하세요.' };
  const tier = HOUSE_TIERS.find(t => t.id === tierId);
  if (!tier) return { success: false, msg: '존재하지 않는 주택입니다.' };
  if ((player.gold || 0) < tier.cost) return { success: false, msg: '골드가 부족합니다. (필요: ' + tier.cost.toLocaleString() + 'G)' };

  player.gold -= tier.cost;
  player._house = {
    tier: tierId,
    furniture: [],
    guards: [],
    visitors: [],
    lastCollect: Date.now(),
    trophies: [],
    guestbook: [],
  };

  return { success: true, msg: tier.icon + ' ' + tier.name + ' 건설 완료! (-' + tier.cost.toLocaleString() + 'G)' };
}

function upgradeHouse(player) {
  if (!player._house) return { success: false, msg: '먼저 집을 건설하세요.' };
  const currentIdx = HOUSE_TIERS.findIndex(t => t.id === player._house.tier);
  if (currentIdx >= HOUSE_TIERS.length - 1) return { success: false, msg: '이미 최고 등급입니다!' };
  const nextTier = HOUSE_TIERS[currentIdx + 1];
  const upgradeCost = nextTier.cost - HOUSE_TIERS[currentIdx].cost;
  if ((player.gold || 0) < upgradeCost) return { success: false, msg: '골드가 부족합니다. (필요: ' + upgradeCost.toLocaleString() + 'G)' };

  player.gold -= upgradeCost;
  player._house.tier = nextTier.id;

  return { success: true, msg: nextTier.icon + ' ' + nextTier.name + '(으)로 업그레이드! (-' + upgradeCost.toLocaleString() + 'G)' };
}

function placeFurniture(player, furnitureId) {
  if (!player._house) return { success: false, msg: '먼저 집을 건설하세요.' };
  const furn = FURNITURE[furnitureId];
  if (!furn) return { success: false, msg: '존재하지 않는 가구입니다.' };

  const tier = HOUSE_TIERS.find(t => t.id === player._house.tier);
  if (player._house.furniture.length >= tier.maxFurniture) return { success: false, msg: '가구 슬롯이 가득 찼습니다. (' + tier.maxFurniture + '개)' };
  if ((player.gold || 0) < furn.cost) return { success: false, msg: '골드가 부족합니다. (필요: ' + furn.cost.toLocaleString() + 'G)' };

  player.gold -= furn.cost;
  player._house.furniture.push({ id: furnitureId, placedAt: Date.now() });

  return { success: true, msg: furn.icon + ' ' + furn.name + ' 배치 완료! (-' + furn.cost.toLocaleString() + 'G)' };
}

function hireGuard(player, guardId) {
  if (!player._house) return { success: false, msg: '먼저 집을 건설하세요.' };
  const guard = GUARD_TYPES.find(g => g.id === guardId);
  if (!guard) return { success: false, msg: '존재하지 않는 수비 유닛.' };

  const tier = HOUSE_TIERS.find(t => t.id === player._house.tier);
  if (player._house.guards.length >= tier.maxGuards) return { success: false, msg: '수비 유닛 최대. (' + tier.maxGuards + ')' };
  if ((player.gold || 0) < guard.cost) return { success: false, msg: '골드 부족. (필요: ' + guard.cost.toLocaleString() + 'G)' };

  player.gold -= guard.cost;
  player._house.guards.push({ id: guardId, hp: guard.hp, maxHp: guard.hp, hiredAt: Date.now() });

  return { success: true, msg: guard.icon + ' ' + guard.name + ' 배치! (-' + guard.cost.toLocaleString() + 'G)' };
}

// 자원 수집 (접속 시 또는 수동)
function collectResources(player) {
  if (!player._house) return { success: false, msg: '집이 없습니다.' };
  const house = player._house;
  const tier = HOUSE_TIERS.find(t => t.id === house.tier);
  const now = Date.now();
  const hoursPassed = Math.min(24, Math.floor((now - (house.lastCollect || now)) / 3600000));
  if (hoursPassed <= 0) return { success: false, msg: '아직 수집할 자원이 없습니다.' };

  house.lastCollect = now;
  const collected = { gold: 0, items: {} };

  // 기본 골드 생산
  if (tier.bonuses.goldProd) {
    collected.gold += tier.bonuses.goldProd * hoursPassed;
  }

  // 가구 생산
  for (const f of house.furniture) {
    const furn = FURNITURE[f.id];
    if (furn && furn.effect) {
      if (furn.effect.goldProd) collected.gold += furn.effect.goldProd * hoursPassed;
      if (furn.effect.produce) {
        const item = furn.effect.produce.item;
        const amount = furn.effect.produce.amount * hoursPassed;
        collected.items[item] = (collected.items[item] || 0) + amount;
      }
    }
  }

  // 보상 지급
  player.gold = (player.gold || 0) + collected.gold;
  if (!player.inventory) player.inventory = {};
  for (const [itemId, amount] of Object.entries(collected.items)) {
    player.inventory[itemId] = (player.inventory[itemId] || 0) + amount;
  }

  return { success: true, msg: '자원 수집! (' + hoursPassed + '시간분)', gold: collected.gold, items: collected.items };
}

// 하우징 보너스 계산
function getHousingBonuses(player) {
  if (!player._house) return {};
  const tier = HOUSE_TIERS.find(t => t.id === player._house.tier);
  const bonuses = { ...tier.bonuses };

  for (const f of player._house.furniture) {
    const furn = FURNITURE[f.id];
    if (furn && furn.effect) {
      for (const [key, val] of Object.entries(furn.effect)) {
        if (typeof val === 'number' && bonuses[key] !== undefined) bonuses[key] = (bonuses[key] || 0) + val;
        else if (typeof val === 'number') bonuses[key] = val;
      }
    }
  }

  return bonuses;
}

// 요새 방어전 (다른 플레이어가 침공)
function raidHouse(attackerPlayer, defenderPlayer) {
  if (!defenderPlayer._house) return { success: false, msg: '상대에게 집이 없습니다.' };

  const house = defenderPlayer._house;
  const guards = house.guards.filter(g => g.hp > 0);
  const attackerAtk = attackerPlayer.atk || 25;
  const results = [];
  let attackerHp = attackerPlayer.hp || 200;
  let lootGold = 0;

  // 수비 유닛과 전투
  for (const guard of guards) {
    const guardDef = GUARD_TYPES.find(g => g.id === guard.id);
    if (!guardDef) continue;

    let guardHp = guard.hp;
    let rounds = 0;
    while (guardHp > 0 && attackerHp > 0 && rounds < 20) {
      // 공격자 타격
      const dmgToGuard = Math.max(1, attackerAtk - Math.floor(guardDef.def * 0.3));
      guardHp -= dmgToGuard;
      // 수비 반격
      const dmgToAttacker = Math.max(1, guardDef.atk - Math.floor((attackerPlayer.def || 10) * 0.3));
      attackerHp -= dmgToAttacker;
      rounds++;
    }

    guard.hp = Math.max(0, guardHp);
    results.push({ guard: guardDef.name, survived: guardHp > 0, rounds });

    if (attackerHp <= 0) {
      return { success: false, msg: '침공 실패! 수비대에게 패배했습니다.', results, attackerHpLeft: 0 };
    }
  }

  // 수비대 돌파 — 약탈
  const tier = HOUSE_TIERS.find(t => t.id === house.tier);
  lootGold = Math.floor((tier.bonuses.goldProd || 50) * 10); // 10시간분 약탈
  defenderPlayer.gold = Math.max(0, (defenderPlayer.gold || 0) - lootGold);
  attackerPlayer.gold = (attackerPlayer.gold || 0) + lootGold;

  return {
    success: true,
    msg: '침공 성공! ' + lootGold + 'G 약탈!',
    results,
    lootGold,
    attackerHpLeft: attackerHp,
  };
}

// 방명록
function writeGuestbook(player, visitorName, message) {
  if (!player._house) return { success: false, msg: '집이 없습니다.' };
  player._house.guestbook.unshift({
    from: visitorName,
    msg: message.substring(0, 100),
    time: Date.now(),
  });
  if (player._house.guestbook.length > 20) player._house.guestbook.length = 20;
  return { success: true, msg: '방명록에 글을 남겼습니다!' };
}

// 하우징 상태 조회
function getHouseStatus(player) {
  if (!player._house) return { hasHouse: false, tiers: HOUSE_TIERS.map(t => ({ id: t.id, name: t.name, icon: t.icon, cost: t.cost, desc: t.desc })) };

  const house = player._house;
  const tier = HOUSE_TIERS.find(t => t.id === house.tier);
  const currentIdx = HOUSE_TIERS.findIndex(t => t.id === house.tier);
  const nextTier = currentIdx < HOUSE_TIERS.length - 1 ? HOUSE_TIERS[currentIdx + 1] : null;
  const bonuses = getHousingBonuses(player);

  // 수집 가능한 자원 미리보기
  const hoursPassed = Math.min(24, Math.floor((Date.now() - (house.lastCollect || Date.now())) / 3600000));

  return {
    hasHouse: true,
    tier: { id: tier.id, name: tier.name, icon: tier.icon },
    nextUpgrade: nextTier ? { name: nextTier.name, icon: nextTier.icon, cost: nextTier.cost - tier.cost } : null,
    furniture: house.furniture.map(f => {
      const def = FURNITURE[f.id];
      return { id: f.id, name: def?.name, icon: def?.icon, category: def?.category };
    }),
    maxFurniture: tier.maxFurniture,
    guards: house.guards.map(g => {
      const def = GUARD_TYPES.find(gt => gt.id === g.id);
      return { id: g.id, name: def?.name, icon: def?.icon, hp: g.hp, maxHp: g.maxHp };
    }),
    maxGuards: tier.maxGuards,
    bonuses,
    pendingHours: hoursPassed,
    guestbook: house.guestbook.slice(0, 10),
    availableFurniture: Object.entries(FURNITURE).map(([id, f]) => ({ id, name: f.name, icon: f.icon, cost: f.cost, category: f.category, desc: f.desc })),
    availableGuards: GUARD_TYPES.map(g => ({ id: g.id, name: g.name, icon: g.icon, cost: g.cost, hp: g.hp, atk: g.atk, def: g.def })),
  };
}

// 소켓 핸들러
function registerHousingHandlers(socket, playerId, players, io) {
  socket.on('house_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('house_status', getHouseStatus(p));
  });

  socket.on('house_build', (tierId) => {
    const p = players[playerId];
    if (!p) return;
    const result = buildHouse(p, tierId);
    socket.emit('house_result', result);
    if (result.success) io.emit('server_msg', { msg: '🏠 ' + (p.displayName||p.className) + '님이 집을 건설했습니다!', type: 'normal' });
  });

  socket.on('house_upgrade', () => {
    const p = players[playerId];
    if (!p) return;
    const result = upgradeHouse(p);
    socket.emit('house_result', result);
  });

  socket.on('house_furniture', (furnitureId) => {
    const p = players[playerId];
    if (!p) return;
    const result = placeFurniture(p, furnitureId);
    socket.emit('house_result', result);
  });

  socket.on('house_guard', (guardId) => {
    const p = players[playerId];
    if (!p) return;
    const result = hireGuard(p, guardId);
    socket.emit('house_result', result);
  });

  socket.on('house_collect', () => {
    const p = players[playerId];
    if (!p) return;
    const result = collectResources(p);
    socket.emit('house_collect_result', result);
  });

  socket.on('house_visit', (targetName) => {
    // 다른 플레이어 집 방문
    const target = Object.values(players).find(pp => pp.displayName === targetName || pp.className === targetName);
    if (!target || !target._house) { socket.emit('house_result', { success: false, msg: '상대에게 집이 없습니다.' }); return; }
    socket.emit('house_visit_data', getHouseStatus(target));
  });

  socket.on('house_guestbook', (data) => {
    const targetPlayer = Object.values(players).find(pp => pp.displayName === data.targetName);
    if (!targetPlayer) return;
    const p = players[playerId];
    writeGuestbook(targetPlayer, p.displayName || p.className, data.message);
    socket.emit('house_result', { success: true, msg: '방명록에 글을 남겼습니다!' });
  });

  socket.on('house_raid', (targetName) => {
    const p = players[playerId];
    if (!p) return;
    const target = Object.values(players).find(pp => pp.displayName === targetName);
    if (!target) { socket.emit('house_result', { success: false, msg: '대상을 찾을 수 없습니다.' }); return; }
    const result = raidHouse(p, target);
    socket.emit('house_raid_result', result);
    if (result.success) {
      io.emit('server_msg', { msg: '⚔️ ' + (p.displayName||p.className) + '님이 ' + (target.displayName||target.className) + '의 요새를 침공! ' + result.lootGold + 'G 약탈!', type: 'danger' });
    }
  });
}

module.exports = {
  HOUSE_TIERS,
  FURNITURE,
  GUARD_TYPES,
  getHouse,
  buildHouse,
  upgradeHouse,
  placeFurniture,
  hireGuard,
  collectResources,
  getHousingBonuses,
  raidHouse,
  getHouseStatus,
  registerHousingHandlers,
};

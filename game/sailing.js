// 항해 시스템 — v2.08
// 배를 타고 섬으로 항해 → 무작위 조우/보물/위험

const SHIPS = {
  raft:    { name:'뗏목',     icon:'🪵', speed:1, capacity:50,  price:0,    durability:50  },
  fishing: { name:'어선',     icon:'⛵', speed:2, capacity:100, price:1000, durability:100 },
  caravel: { name:'카라벨',   icon:'⛵', speed:3, capacity:200, price:5000, durability:200 },
  galleon: { name:'갤리온',   icon:'🚢', speed:4, capacity:400, price:20000,durability:400 },
};

const ISLANDS = {
  paradise:    { name:'낙원섬',     icon:'🏝️', dist:3,  loot:[300,800],   risk:0.1 },
  fog:         { name:'안개섬',     icon:'🌫️', dist:5,  loot:[500,1500],  risk:0.3 },
  volcano:     { name:'화산섬',     icon:'🌋', dist:7,  loot:[1000,3000], risk:0.5 },
  storm:       { name:'폭풍섬',     icon:'⛈️', dist:9,  loot:[2000,5000], risk:0.6 },
  legendary:   { name:'전설의 섬',  icon:'✨', dist:12, loot:[5000,15000],risk:0.8 },
};

const ENCOUNTERS = [
  { type:'treasure', icon:'💰', text:'난파선의 보물 발견', chance:0.25 },
  { type:'merchant', icon:'🛍️', text:'떠돌이 상인을 만남',  chance:0.15 },
  { type:'mermaid',  icon:'🧜', text:'인어가 노래를 부른다', chance:0.05 },
  { type:'kraken',   icon:'🐙', text:'크라켄의 습격!',      chance:0.10 },
  { type:'pirate',   icon:'🏴‍☠️', text:'해적선과 마주침',     chance:0.15 },
  { type:'whale',    icon:'🐋', text:'고래 무리를 발견',     chance:0.10 },
  { type:'calm',     icon:'🌊', text:'평온한 바다',          chance:0.20 },
];

function _ensure(player) {
  if (!player.sailing) {
    player.sailing = {
      ship: 'raft',
      durability: SHIPS.raft.durability,
      voyages: 0,
      visitedIslands: [],
      activeVoyage: null, // {islandId, departedAt, arrivalAt}
      log: [],
    };
  }
  return player.sailing;
}

function getStatus(player) {
  const s = _ensure(player);
  const ship = SHIPS[s.ship];
  const now = Date.now();
  let voyageInfo = null;
  if (s.activeVoyage) {
    voyageInfo = {
      ...s.activeVoyage,
      island: ISLANDS[s.activeVoyage.islandId],
      arrived: now >= s.activeVoyage.arrivalAt,
      secondsLeft: Math.max(0, Math.ceil((s.activeVoyage.arrivalAt - now) / 1000)),
    };
  }
  return {
    ship: { id: s.ship, ...ship },
    durability: s.durability,
    maxDurability: ship.durability,
    voyages: s.voyages,
    visitedIslands: s.visitedIslands,
    activeVoyage: voyageInfo,
    log: s.log.slice(0, 20),
    ships: SHIPS,
    islands: ISLANDS,
  };
}

function buyShip(player, shipId) {
  const s = _ensure(player);
  const def = SHIPS[shipId];
  if (!def) return { success:false, msg:'존재하지 않는 배' };
  if (s.ship === shipId) return { success:false, msg:'이미 보유 중' };
  if ((player.gold || 0) < def.price) return { success:false, msg:`골드 ${def.price} 부족` };
  player.gold -= def.price;
  s.ship = shipId;
  s.durability = def.durability;
  return { success:true, msg:`${def.icon} ${def.name} 구매!` };
}

function repair(player) {
  const s = _ensure(player);
  const ship = SHIPS[s.ship];
  const need = ship.durability - s.durability;
  if (need <= 0) return { success:false, msg:'이미 만피' };
  const cost = need * 5;
  if ((player.gold || 0) < cost) return { success:false, msg:`수리비 ${cost}G 부족` };
  player.gold -= cost;
  s.durability = ship.durability;
  return { success:true, msg:`수리 완료 (-${cost}G)` };
}

function depart(player, islandId) {
  const s = _ensure(player);
  if (s.activeVoyage) return { success:false, msg:'이미 항해 중' };
  const island = ISLANDS[islandId];
  if (!island) return { success:false, msg:'존재하지 않는 섬' };
  const ship = SHIPS[s.ship];
  if (s.durability < 20) return { success:false, msg:'배 내구도 부족 (20+ 필요)' };
  // 시간 = dist / speed * 30초
  const seconds = Math.max(10, Math.floor((island.dist / ship.speed) * 30));
  s.activeVoyage = {
    islandId,
    departedAt: Date.now(),
    arrivalAt: Date.now() + seconds * 1000,
  };
  return { success:true, msg:`${island.icon} ${island.name}으로 출항 (${seconds}초)`, secondsLeft: seconds };
}

function _rollEncounter() {
  let r = Math.random();
  for (const enc of ENCOUNTERS) {
    if (r < enc.chance) return enc;
    r -= enc.chance;
  }
  return ENCOUNTERS[ENCOUNTERS.length - 1];
}

function arrive(player) {
  const s = _ensure(player);
  if (!s.activeVoyage) return { success:false, msg:'항해 중이 아님' };
  if (Date.now() < s.activeVoyage.arrivalAt) {
    return { success:false, msg:'아직 도착 전' };
  }
  const island = ISLANDS[s.activeVoyage.islandId];
  const ship = SHIPS[s.ship];

  // 위험 판정
  let damage = 0;
  if (Math.random() < island.risk) {
    damage = 10 + Math.floor(Math.random() * 30);
    s.durability = Math.max(0, s.durability - damage);
  }

  // 보물
  const [lo, hi] = island.loot;
  let loot = lo + Math.floor(Math.random() * (hi - lo + 1));
  if (loot > ship.capacity) loot = ship.capacity; // 적재량 제한
  player.gold = Math.min(999999999, (player.gold || 0) + loot);

  // 조우
  const encounter = _rollEncounter();
  let bonus = 0;
  if (encounter.type === 'treasure') { bonus = 500; player.gold = Math.min(999999999, player.gold + bonus); }
  else if (encounter.type === 'merchant') { bonus = 200; player.gold = Math.min(999999999, player.gold + bonus); }
  else if (encounter.type === 'mermaid') { bonus = 1000; player.gold = Math.min(999999999, player.gold + bonus); }
  else if (encounter.type === 'kraken') { s.durability = Math.max(0, s.durability - 30); }
  else if (encounter.type === 'pirate') { const stolen = Math.min(player.gold || 0, 200); player.gold -= stolen; bonus = -stolen; }

  s.voyages += 1;
  if (!s.visitedIslands.includes(island.name)) s.visitedIslands.push(island.name);
  s.activeVoyage = null;

  const entry = {
    island: island.name,
    loot,
    bonus,
    encounter: encounter.text,
    damage,
    when: Date.now(),
  };
  s.log.unshift(entry);
  if (s.log.length > 50) s.log.length = 50;

  return {
    success: true,
    msg: `${island.icon} ${island.name} 도착! 전리품 ${loot}G | ${encounter.icon} ${encounter.text}${bonus !== 0 ? ` (${bonus > 0 ? '+' : ''}${bonus}G)` : ''}${damage > 0 ? ` | 항해 데미지 -${damage}` : ''}`,
    loot,
    encounter,
    bonus,
    damage,
  };
}

module.exports = {
  SHIPS,
  ISLANDS,
  ENCOUNTERS,
  getStatus,
  buyShip,
  repair,
  depart,
  arrive,
};

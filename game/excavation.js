// 유물 발굴 시스템 — v2.09
// 발굴지에서 시간을 들여 유물을 찾는다 — 등급별 가치, 박물관 기증 시 명예

const SITES = {
  ancient_ruins:{ name:'고대 유적',     icon:'🏛️', tier:1, energyCost:10, rareBonus:0.0 },
  pyramid:      { name:'피라미드',     icon:'🔺', tier:2, energyCost:15, rareBonus:0.1 },
  sunken_city:  { name:'침몰 도시',     icon:'🌊', tier:3, energyCost:20, rareBonus:0.2 },
  dragon_grave: { name:'용의 무덤',     icon:'🐲', tier:4, energyCost:30, rareBonus:0.3 },
  god_temple:   { name:'신들의 신전',   icon:'⛩️', tier:5, energyCost:50, rareBonus:0.5 },
};

const ARTIFACT_GRADES = {
  shard:    { name:'유물 파편', weight: 50, value: 50,    icon:'🪨' },
  pottery:  { name:'토기',     weight: 25, value: 200,   icon:'🏺' },
  jewelry:  { name:'장신구',   weight: 15, value: 800,   icon:'💍' },
  weapon:   { name:'고대 무기',weight:  7, value: 2500,  icon:'⚔️' },
  scroll:   { name:'고대 두루마리', weight: 2.5, value:8000, icon:'📜' },
  divine:   { name:'신물',     weight:  0.5, value:25000, icon:'✨' },
};

const ENERGY_MAX = 100;
const ENERGY_REGEN_PER_HOUR = 20;

function _ensure(player) {
  if (!player.excavation) {
    player.excavation = {
      energy: ENERGY_MAX,
      lastEnergyAt: Date.now(),
      collection: {}, // {grade: count}
      donated: {},    // {grade: count}
      siteVisits: {}, // {siteId: count}
      digCount: 0,
      honor: 0,
    };
  }
  return player.excavation;
}

function _refreshEnergy(player) {
  const e = _ensure(player);
  const now = Date.now();
  const elapsed = now - e.lastEnergyAt;
  const regen = Math.floor(elapsed / (3600000 / ENERGY_REGEN_PER_HOUR));
  if (regen > 0) {
    e.energy = Math.min(ENERGY_MAX, e.energy + regen);
    e.lastEnergyAt = now;
  }
}

function _pickArtifact(rareBonus) {
  const adjusted = {};
  let total = 0;
  for (const [g, def] of Object.entries(ARTIFACT_GRADES)) {
    // 등급이 높을수록 rareBonus가 가중치를 더 많이 늘림
    const weight = def.weight + (def.weight < 20 ? def.weight * rareBonus * 2 : 0);
    adjusted[g] = weight;
    total += weight;
  }
  let r = Math.random() * total;
  for (const [g, w] of Object.entries(adjusted)) {
    if (r < w) return g;
    r -= w;
  }
  return 'shard';
}

function getStatus(player) {
  _refreshEnergy(player);
  const e = _ensure(player);
  const collectionValue = Object.entries(e.collection).reduce(
    (sum, [g, c]) => sum + (ARTIFACT_GRADES[g]?.value || 0) * c,
    0,
  );
  return {
    energy: e.energy,
    energyMax: ENERGY_MAX,
    collection: e.collection,
    collectionValue,
    donated: e.donated,
    siteVisits: e.siteVisits,
    digCount: e.digCount,
    honor: e.honor,
    sites: SITES,
    grades: ARTIFACT_GRADES,
  };
}

function dig(player, siteId) {
  _refreshEnergy(player);
  const e = _ensure(player);
  const site = SITES[siteId];
  if (!site) return { success:false, msg:'존재하지 않는 발굴지' };
  if (e.energy < site.energyCost) {
    return { success:false, msg:`에너지 부족 (${site.energyCost}/${e.energy})` };
  }
  e.energy -= site.energyCost;
  e.digCount += 1;
  e.siteVisits[siteId] = (e.siteVisits[siteId] || 0) + 1;
  const grade = _pickArtifact(site.rareBonus);
  const def = ARTIFACT_GRADES[grade];
  e.collection[grade] = (e.collection[grade] || 0) + 1;
  return {
    success:true,
    msg:`${site.icon} ${site.name}에서 ${def.icon} ${def.name} 발굴! (가치 ${def.value}G)`,
    grade,
    artifact: def,
  };
}

function sell(player, grade, count) {
  const e = _ensure(player);
  const def = ARTIFACT_GRADES[grade];
  if (!def) return { success:false, msg:'존재하지 않는 등급' };
  count = Math.max(1, Math.floor(count || 1));
  if ((e.collection[grade] || 0) < count) return { success:false, msg:'유물 부족' };
  e.collection[grade] -= count;
  const earned = def.value * count;
  player.gold = Math.min(999999999, (player.gold || 0) + earned);
  return { success:true, msg:`${def.name} ${count}개 판매 (+${earned}G)`, gold: earned };
}

function donate(player, grade) {
  const e = _ensure(player);
  const def = ARTIFACT_GRADES[grade];
  if (!def) return { success:false, msg:'존재하지 않는 등급' };
  if ((e.collection[grade] || 0) < 1) return { success:false, msg:'유물 없음' };
  e.collection[grade] -= 1;
  e.donated[grade] = (e.donated[grade] || 0) + 1;
  // 명예 = 가치 / 100
  const honorGain = Math.max(1, Math.floor(def.value / 100));
  e.honor += honorGain;
  return {
    success:true,
    msg:`${def.icon} ${def.name} 박물관 기증 (+${honorGain} 명예)`,
    honorGain,
  };
}

module.exports = {
  SITES,
  ARTIFACT_GRADES,
  ENERGY_MAX,
  ENERGY_REGEN_PER_HOUR,
  getStatus,
  dig,
  sell,
  donate,
};

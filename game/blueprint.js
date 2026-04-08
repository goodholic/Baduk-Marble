// 도면(Blueprint) 시스템 — v1.72
// 몬스터 드롭/던전에서 발견하는 비밀 제작 도면
// 일반 제작과 다른 점: 도면을 먼저 발견해야 제작 가능, 1회용

const BLUEPRINTS = {
  flame_sword: {
    name: '화염검 도면',
    icon: '🔥',
    rarity: 'rare',
    desc: '용암 지역 보스가 가끔 떨어뜨리는 도면',
    source: '용암 핵심부 보스 (3% 드롭)',
    materials: { goods_iron: 30, mat_dragon: 2, mat_magic: 10 },
    cost: 5000,
    result: 'equip_flame_sword',
    resultName: '화염검',
    resultStat: { atk: 80, fireDmg: 0.15 },
  },
  frost_armor: {
    name: '서리 갑옷 도면',
    icon: '❄️',
    rarity: 'rare',
    desc: '얼음 협곡의 비밀',
    source: '빙결 골렘 (2% 드롭)',
    materials: { goods_iron: 25, mat_soul: 5, goods_crystal: 3 },
    cost: 6000,
    result: 'equip_frost_armor',
    resultName: '서리 갑옷',
    resultStat: { def: 70, dmgReduce: 0.05 },
  },
  void_dagger: {
    name: '공허 단검 도면',
    icon: '🌌',
    rarity: 'epic',
    desc: '공허에서 흘러나온 금단의 도면',
    source: '공허의 균열 클리어 보상',
    materials: { mat_dragon: 5, mat_soul: 15, goods_void_essence: 3 },
    cost: 15000,
    result: 'equip_void_dagger',
    resultName: '공허 단검',
    resultStat: { atk: 100, critRate: 0.10, executeBonus: 0.10 },
  },
  star_bow: {
    name: '별의 활 도면',
    icon: '🏹',
    rarity: 'epic',
    desc: '천공의 정상 별빛이 새겨진 도면',
    source: '천공의 수호자 (5% 드롭)',
    materials: { mat_dragon: 4, mat_soul: 12, goods_star_dust: 5 },
    cost: 12000,
    result: 'equip_star_bow',
    resultName: '별의 활',
    resultStat: { atk: 90, atkSpeed: 0.15, dropRate: 0.05 },
  },
  primordial_orb_weapon: {
    name: '태초의 구슬 도면',
    icon: '🔮',
    rarity: 'legendary',
    desc: '태초의 존재만이 알고 있는 도면',
    source: '월드 보스 태초의 존재 (0.5% 드롭)',
    materials: { mat_dragon: 20, mat_soul: 50, goods_celestial_silk: 3 },
    cost: 100000,
    result: 'equip_primordial_orb',
    resultName: '태초의 구슬',
    resultStat: { atk: 150, allMulti: 0.10, expBonus: 0.20 },
  },
};

function _ensure(player) {
  if (!player.blueprints) player.blueprints = { discovered: [], crafted: [] };
  return player.blueprints;
}

function discoverBlueprint(player, blueprintId) {
  const bp = BLUEPRINTS[blueprintId];
  if (!bp) return { success: false, msg: '존재하지 않는 도면' };
  const data = _ensure(player);
  if (data.discovered.includes(blueprintId)) {
    return { success: false, msg: '이미 발견한 도면' };
  }
  data.discovered.push(blueprintId);
  return { success: true, blueprint: bp };
}

function craftFromBlueprint(player, blueprintId) {
  const bp = BLUEPRINTS[blueprintId];
  if (!bp) return { success: false, msg: '존재하지 않는 도면' };
  const data = _ensure(player);
  if (!data.discovered.includes(blueprintId)) {
    return { success: false, msg: '발견하지 않은 도면' };
  }
  if (data.crafted.includes(blueprintId)) {
    return { success: false, msg: '이미 제작한 도면 (1회용)' };
  }

  // 비용 검증
  if ((player.gold || 0) < bp.cost) {
    return { success: false, msg: `골드 ${bp.cost} 필요` };
  }
  if (!player.inventory) player.inventory = {};
  for (const [matId, count] of Object.entries(bp.materials)) {
    if ((player.inventory[matId] || 0) < count) {
      return { success: false, msg: `${matId} ${count}개 필요` };
    }
  }

  // 차감
  player.gold -= bp.cost;
  for (const [matId, count] of Object.entries(bp.materials)) {
    player.inventory[matId] -= count;
    if (player.inventory[matId] <= 0) delete player.inventory[matId];
  }

  // 결과물 지급
  player.inventory[bp.result] = (player.inventory[bp.result] || 0) + 1;
  data.crafted.push(blueprintId);

  return {
    success: true,
    blueprint: bp,
    result: bp.result,
    resultName: bp.resultName,
  };
}

function getStatus(player) {
  const data = _ensure(player);
  return {
    discovered: data.discovered.map(id => ({ id, ...BLUEPRINTS[id], crafted: data.crafted.includes(id) })),
    crafted: data.crafted,
    available: Object.entries(BLUEPRINTS).map(([id, bp]) => ({
      id,
      ...bp,
      status: data.crafted.includes(id) ? 'crafted' : (data.discovered.includes(id) ? 'discovered' : 'undiscovered'),
    })),
  };
}

module.exports = {
  BLUEPRINTS,
  discoverBlueprint,
  craftFromBlueprint,
  getStatus,
};

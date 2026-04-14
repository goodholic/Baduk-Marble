// v5.1 — 용병 전용 장비 제작소 시스템
// IO 전리품 + SLG 재료를 사용하여 용병 전용 장비 제작/강화

// 제작 가능 장비 카테고리
const EQUIP_CATEGORIES = {
  weapon:    { name: '무기', icon: '⚔️', slots: 1, mainStat: 'atk' },
  armor:     { name: '갑옷', icon: '🛡️', slots: 1, mainStat: 'def' },
  accessory: { name: '장신구', icon: '💍', slots: 2, mainStat: 'mixed' },
  relic:     { name: '유물', icon: '🏺', slots: 1, mainStat: 'special' },
};

// 제작 레시피 (재료 + 골드 + 시간)
const FORGE_RECIPES = [
  // 무기
  { id: 'flame_sword', name: '화염검', icon: '🔥⚔️', category: 'weapon', grade: 'rare',
    materials: [{ id: 'iron_ore', qty: 10 }, { id: 'fire_crystal', qty: 3 }], gold: 5000, time: 60,
    stats: { atk: 50, fireDmg: 20 }, desc: '불길을 두른 검' },
  { id: 'frost_blade', name: '서리 칼날', icon: '❄️🗡️', category: 'weapon', grade: 'rare',
    materials: [{ id: 'iron_ore', qty: 10 }, { id: 'ice_crystal', qty: 3 }], gold: 5000, time: 60,
    stats: { atk: 45, iceDmg: 25, slow: 0.1 }, desc: '적을 얼리는 냉기의 칼' },
  { id: 'thunder_axe', name: '뇌전 도끼', icon: '⚡🪓', category: 'weapon', grade: 'epic',
    materials: [{ id: 'mithril', qty: 5 }, { id: 'storm_essence', qty: 5 }], gold: 15000, time: 180,
    stats: { atk: 80, lightDmg: 40, stun: 0.1 }, desc: '번개를 부르는 전투 도끼' },
  { id: 'shadow_dagger', name: '그림자 단검', icon: '🌑🗡️', category: 'weapon', grade: 'epic',
    materials: [{ id: 'dark_steel', qty: 5 }, { id: 'shadow_essence', qty: 5 }], gold: 15000, time: 180,
    stats: { atk: 60, crit: 25, critDmg: 1.5 }, desc: '그림자에서 나타나는 암살 무기' },
  { id: 'divine_staff', name: '신성 지팡이', icon: '✨🪄', category: 'weapon', grade: 'legend',
    materials: [{ id: 'world_tree_branch', qty: 3 }, { id: 'holy_crystal', qty: 10 }, { id: 'dragon_scale', qty: 5 }],
    gold: 50000, time: 600,
    stats: { matk: 120, healBonus: 0.3, mpRegen: 10 }, desc: '세계수의 가지로 만든 지팡이' },

  // 갑옷
  { id: 'dragon_armor', name: '용린 갑옷', icon: '🐲🛡️', category: 'armor', grade: 'legend',
    materials: [{ id: 'dragon_scale', qty: 20 }, { id: 'mithril', qty: 10 }], gold: 80000, time: 900,
    stats: { def: 100, hp: 2000, fireRes: 0.5 }, desc: '용의 비늘로 제작한 최강 갑옷' },
  { id: 'shadow_cloak', name: '그림자 망토', icon: '🌑🧥', category: 'armor', grade: 'epic',
    materials: [{ id: 'shadow_essence', qty: 8 }, { id: 'spider_silk', qty: 5 }], gold: 20000, time: 300,
    stats: { def: 40, eva: 20, stealth: 3 }, desc: '3초간 은신 가능한 암살자 망토' },

  // 장신구
  { id: 'ring_of_fury', name: '분노의 반지', icon: '💍🔥', category: 'accessory', grade: 'rare',
    materials: [{ id: 'fire_crystal', qty: 5 }, { id: 'gold_ingot', qty: 3 }], gold: 8000, time: 120,
    stats: { atk: 20, atkSpd: 0.1 }, desc: '분노로 타오르는 반지' },
  { id: 'amulet_of_life', name: '생명의 부적', icon: '💚📿', category: 'accessory', grade: 'epic',
    materials: [{ id: 'world_tree_leaf', qty: 5 }, { id: 'holy_crystal', qty: 3 }], gold: 12000, time: 180,
    stats: { hp: 1000, hpRegen: 20, revive: 0.1 }, desc: '10% 확률로 사망 시 부활' },

  // 유물
  { id: 'orb_of_chaos', name: '혼돈의 오브', icon: '🔮💜', category: 'relic', grade: 'legend',
    materials: [{ id: 'chaos_shard', qty: 10 }, { id: 'void_essence', qty: 5 }, { id: 'dragon_heart_mat', qty: 1 }],
    gold: 100000, time: 1800,
    stats: { allStat: 30, randomBuff: true }, desc: '매 전투마다 랜덤 강력 버프 1개 부여' },
  { id: 'crown_of_kings', name: '왕의 관', icon: '👑✨', category: 'relic', grade: 'myth',
    materials: [{ id: 'divine_fragment', qty: 3 }, { id: 'dragon_scale', qty: 30 }, { id: 'mithril', qty: 20 }, { id: 'world_tree_branch', qty: 5 }],
    gold: 500000, time: 3600,
    stats: { allStat: 50, teamBuff: 0.1, leaderAura: true }, desc: '착용자의 팀 전체 능력 10% 증가' },
];

// 강화 시스템 (+1~+10, 실패 시 하락 가능)
const ENHANCE_TABLE = {
  1:  { cost: 1000,  rate: 0.95, bonus: { statMul: 1.05 } },
  2:  { cost: 2000,  rate: 0.90, bonus: { statMul: 1.10 } },
  3:  { cost: 5000,  rate: 0.85, bonus: { statMul: 1.16 } },
  4:  { cost: 10000, rate: 0.75, bonus: { statMul: 1.23 } },
  5:  { cost: 20000, rate: 0.60, bonus: { statMul: 1.31 } },
  6:  { cost: 35000, rate: 0.45, bonus: { statMul: 1.40 } },
  7:  { cost: 50000, rate: 0.30, bonus: { statMul: 1.55 } },
  8:  { cost: 80000, rate: 0.20, bonus: { statMul: 1.75 } },
  9:  { cost: 120000,rate: 0.10, bonus: { statMul: 2.00 } },
  10: { cost: 200000,rate: 0.05, bonus: { statMul: 2.50, glow: true } },
};

// 재료 드롭 테이블 (IO에서 획득)
const MATERIAL_DROPS = {
  io_normal:   ['iron_ore', 'spider_silk', 'gold_ingot'],
  io_boss:     ['fire_crystal', 'ice_crystal', 'storm_essence', 'shadow_essence'],
  io_rare:     ['mithril', 'dark_steel', 'world_tree_leaf', 'holy_crystal'],
  siege_reward: ['dragon_scale', 'chaos_shard'],
  expedition:  ['void_essence', 'world_tree_branch', 'dragon_heart_mat'],
  hidden_boss: ['divine_fragment'],
};

function forgeEquipment(player, recipeId) {
  const recipe = FORGE_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return { ok: false, reason: '알 수 없는 레시피' };
  if ((player.gold || 0) < recipe.gold) return { ok: false, reason: '골드 부족' };

  // 재료 체크
  const mats = player.forgeMaterials || {};
  for (const mat of recipe.materials) {
    if ((mats[mat.id] || 0) < mat.qty) return { ok: false, reason: `재료 부족: ${mat.id}` };
  }

  // 재료/골드 소비
  player.gold -= recipe.gold;
  for (const mat of recipe.materials) mats[mat.id] -= mat.qty;
  player.forgeMaterials = mats;

  const equipment = {
    id: `${recipe.id}_${Date.now()}`,
    recipeId: recipe.id,
    name: recipe.name,
    icon: recipe.icon,
    category: recipe.category,
    grade: recipe.grade,
    stats: { ...recipe.stats },
    enhance: 0,
    desc: recipe.desc,
    forgedAt: Date.now(),
  };

  const forgedItems = player.forgedEquipment = player.forgedEquipment || [];
  forgedItems.push(equipment);

  return { ok: true, equipment };
}

function enhanceEquipment(player, equipId) {
  const equips = player.forgedEquipment || [];
  const equip = equips.find(e => e.id === equipId);
  if (!equip) return { ok: false, reason: '장비 없음' };

  const nextLevel = (equip.enhance || 0) + 1;
  if (nextLevel > 10) return { ok: false, reason: '최대 강화' };

  const table = ENHANCE_TABLE[nextLevel];
  if ((player.gold || 0) < table.cost) return { ok: false, reason: '골드 부족' };

  player.gold -= table.cost;
  const success = Math.random() < table.rate;

  if (success) {
    equip.enhance = nextLevel;
    equip.enhanceMul = table.bonus.statMul;
    if (table.bonus.glow) equip.glow = true;
    return { ok: true, success: true, equip, level: nextLevel };
  } else {
    // 실패: +4 이상에서 1단계 하락
    if (equip.enhance >= 4) {
      equip.enhance = Math.max(0, equip.enhance - 1);
      equip.enhanceMul = ENHANCE_TABLE[equip.enhance]?.bonus?.statMul || 1;
    }
    return { ok: true, success: false, equip, level: equip.enhance };
  }
}

function equipOnMerc(player, equipId, mercId) {
  const equip = (player.forgedEquipment || []).find(e => e.id === equipId);
  if (!equip) return { ok: false, reason: '장비 없음' };
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };

  merc.forgedEquipment = merc.forgedEquipment || {};
  merc.forgedEquipment[equip.category] = equip;

  return { ok: true, merc: merc.name, equip: equip.name };
}

function register(io, socket, player) {
  socket.on('forge_recipe_list', () => {
    socket.emit('forge_recipe_list', {
      recipes: FORGE_RECIPES,
      materials: player.forgeMaterials || {},
      enhanceTable: ENHANCE_TABLE,
    });
  });

  socket.on('forge_craft', (data) => {
    const result = forgeEquipment(player, data.recipeId);
    socket.emit('forge_craft_result', result);
    if (result.ok && ['legend', 'myth'].includes(result.equipment.grade)) {
      io.emit('server_msg', `🔨 [제작] ${player.name}이(가) "${result.equipment.name}" 제작 성공!`);
    }
  });

  socket.on('forge_enhance', (data) => {
    const result = enhanceEquipment(player, data.equipId);
    socket.emit('forge_enhance_result', result);
    if (result.ok && result.success && result.level >= 8) {
      io.emit('server_msg', `✨ [강화] ${player.name}의 장비가 +${result.level} 강화 성공!`);
    }
  });

  socket.on('forge_equip_merc', (data) => {
    const result = equipOnMerc(player, data.equipId, data.mercId);
    socket.emit('forge_equip_merc_result', result);
  });
}

module.exports = {
  EQUIP_CATEGORIES, FORGE_RECIPES, ENHANCE_TABLE, MATERIAL_DROPS,
  forgeEquipment, enhanceEquipment, equipOnMerc, register,
};

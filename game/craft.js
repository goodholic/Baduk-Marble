// 제작 시스템
const RECIPES = {
  // 무기
  craft_sword_1: { name:'철제 검 제작',   need:{goods_iron:5, goods_wood:3},  result:'equip_sword_1', gold:100, successRate:1.0 },
  craft_sword_2: { name:'강철 검 제작',   need:{goods_iron:15, mat_magic:5},  result:'equip_sword_2', gold:500, successRate:0.8 },
  craft_sword_3: { name:'미스릴 검 제작', need:{goods_iron:30, mat_soul:10, mat_dragon:3}, result:'equip_sword_3', gold:3000, successRate:0.5 },
  // 방어구
  craft_armor_1: { name:'가죽 갑옷 제작', need:{goods_leather:5, goods_wood:2}, result:'equip_armor_1', gold:80, successRate:1.0 },
  craft_armor_2: { name:'철판 갑옷 제작', need:{goods_iron:20, goods_leather:10}, result:'equip_armor_2', gold:500, successRate:0.8 },
  craft_armor_3: { name:'미스릴 갑옷 제작',need:{goods_iron:30, mat_soul:10, mat_dragon:3}, result:'equip_armor_3', gold:3000, successRate:0.5 },
  // 장신구
  craft_ring:    { name:'힘의 반지 제작', need:{goods_gem:5, mat_magic:3}, result:'equip_ring_1', gold:800, successRate:0.7 },
  craft_ring2:   { name:'용의 반지 제작', need:{goods_gem:15, mat_dragon:5}, result:'equip_ring_2', gold:5000, successRate:0.3 },
  craft_neck:    { name:'목걸이 제작',   need:{goods_gem:3, goods_spice:2}, result:'equip_neck_1', gold:500, successRate:0.8 },
  craft_boots:   { name:'질풍 부츠 제작', need:{goods_leather:10, mat_magic:3}, result:'equip_boots_1', gold:600, successRate:0.7 },
  craft_helmet:  { name:'철투구 제작',   need:{goods_iron:10, goods_leather:5}, result:'equip_helmet_1', gold:400, successRate:0.8 },
  // 물약
  craft_hp_pot:  { name:'HP 물약 제작',  need:{goods_herb:3, goods_potion:1}, result:'pot_hp_m', gold:30, successRate:1.0 },
  craft_atk_pot: { name:'공격 물약 제작', need:{goods_herb:5, goods_spice:2}, result:'pot_atk', gold:80, successRate:0.9 },
};

function handleCraft(player, recipeId, io) {
  const recipe = RECIPES[recipeId];
  if (!recipe) return { success: false, msg: '알 수 없는 레시피' };
  if (player.gold < recipe.gold) return { success: false, msg: `골드 부족 (${recipe.gold}G 필요)` };
  if (!player.inventory) player.inventory = {};

  // 재료 확인
  for (const [item, count] of Object.entries(recipe.need)) {
    if ((player.inventory[item] || 0) < count) {
      return { success: false, msg: `재료 부족: ${item}` };
    }
  }

  // 재료 소모
  player.gold -= recipe.gold;
  for (const [item, count] of Object.entries(recipe.need)) {
    player.inventory[item] -= count;
    if (player.inventory[item] <= 0) delete player.inventory[item];
  }

  // 성공 판정
  if (Math.random() < recipe.successRate) {
    player.inventory[recipe.result] = (player.inventory[recipe.result] || 0) + 1;
    return { success: true, msg: `${recipe.name} 성공!` };
  } else {
    return { success: false, msg: `${recipe.name} 실패... 재료 소실` };
  }
}

module.exports = { RECIPES, handleCraft };

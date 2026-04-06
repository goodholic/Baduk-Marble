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
  craft_ring2:   { name:'용사의 반지 제작', need:{goods_gem:10, mat_magic:8, mat_soul:3}, result:'equip_ring_2', gold:2000, successRate:0.5 },
  craft_ring3:   { name:'드래곤 반지 제작', need:{goods_gem:15, mat_dragon:5}, result:'equip_ring_3', gold:5000, successRate:0.3 },
  craft_neck:    { name:'지혜의 목걸이 제작', need:{goods_gem:3, goods_spice:2}, result:'equip_neck_1', gold:500, successRate:0.8 },
  craft_neck2:   { name:'행운의 목걸이 제작', need:{goods_gem:8, mat_magic:5}, result:'equip_neck_2', gold:1500, successRate:0.5 },
  craft_neck3:   { name:'드래곤 목걸이 제작', need:{goods_gem:15, mat_dragon:3, mat_soul:5}, result:'equip_neck_3', gold:4000, successRate:0.3 },
  // 투구
  craft_helm1:   { name:'가죽 투구 제작', need:{goods_leather:5, goods_wood:3}, result:'equip_helm_1', gold:200, successRate:1.0 },
  craft_helm2:   { name:'철제 투구 제작', need:{goods_iron:10, goods_leather:5}, result:'equip_helm_2', gold:400, successRate:0.8 },
  craft_helm3:   { name:'미스릴 투구 제작', need:{goods_iron:20, mat_magic:8, mat_soul:3}, result:'equip_helm_3', gold:2000, successRate:0.5 },
  // 장갑
  craft_glove1:  { name:'가죽 장갑 제작', need:{goods_leather:5, goods_wood:2}, result:'equip_glove_1', gold:150, successRate:1.0 },
  craft_glove2:  { name:'철제 장갑 제작', need:{goods_iron:8, goods_leather:5}, result:'equip_glove_2', gold:350, successRate:0.8 },
  craft_glove3:  { name:'미스릴 장갑 제작', need:{goods_iron:15, mat_magic:5, mat_soul:2}, result:'equip_glove_3', gold:1500, successRate:0.5 },
  // 신발
  craft_boots1:  { name:'가죽 장화 제작', need:{goods_leather:5, goods_wood:2}, result:'equip_boots_1', gold:150, successRate:1.0 },
  craft_boots2:  { name:'철제 장화 제작', need:{goods_leather:10, mat_magic:3}, result:'equip_boots_2', gold:600, successRate:0.7 },
  craft_boots3:  { name:'민첩의 장화 제작', need:{goods_leather:15, mat_magic:8, mat_soul:3}, result:'equip_boots_3', gold:1800, successRate:0.5 },
  // 영웅/전설급 (보스 재료 필요)
  craft_sword_4: { name:'영웅의 검 제작', need:{mat_dragon:5, mat_soul:15, mat_magic:20}, result:'equip_sword_4', gold:8000, successRate:0.3 },
  craft_sword_5: { name:'드래곤 소드 제작', need:{mat_dragon:10, mat_soul:30, goods_gem:20}, result:'equip_sword_5', gold:20000, successRate:0.2 },
  craft_armor_4: { name:'영웅의 갑옷 제작', need:{mat_dragon:5, mat_soul:15, mat_magic:20}, result:'equip_armor_4', gold:8000, successRate:0.3 },
  craft_armor_5: { name:'드래곤 아머 제작', need:{mat_dragon:10, mat_soul:30, goods_gem:20}, result:'equip_armor_5', gold:20000, successRate:0.2 },
  // 보호/축복 주문서
  craft_protect: { name:'보호 주문서 제작', need:{mat_magic:10, mat_soul:5}, result:'protect_scroll', gold:500, successRate:0.7 },
  craft_bless:   { name:'축복 주문서 제작', need:{mat_magic:5, mat_soul:3}, result:'bless_scroll', gold:200, successRate:0.8 },
  // ── 요리 (음식 버프) ──
  cook_fish_stew:  { name:'생선 스튜',   need:{goods_fish:3, goods_salt:1},      result:'food_hp',    gold:50,  successRate:1.0 },
  cook_gold_soup:  { name:'황금 수프',   need:{goods_spice:2, goods_herb:3},     result:'food_atk',   gold:80,  successRate:1.0 },
  cook_dragon_feast:{ name:'용의 만찬',  need:{mat_dragon:1, goods_spice:5, goods_wine:2}, result:'food_all', gold:500, successRate:0.7 },
  cook_warrior_meal:{ name:'전사의 식사', need:{goods_fish:2, goods_herb:2},      result:'food_def',   gold:60,  successRate:1.0 },
  cook_speed_tea:  { name:'쾌속 차',     need:{goods_herb:3, goods_salt:1},      result:'food_spd',   gold:40,  successRate:1.0 },
  cook_crit_pie:   { name:'행운의 파이', need:{goods_fish:2, goods_spice:2, goods_herb:1}, result:'food_crit',  gold:100, successRate:1.0 },
  cook_mana_brew:  { name:'마나 양조', need:{goods_herb:5, goods_wine:1},      result:'food_mp',    gold:70,  successRate:1.0 },
  cook_fire_soup:  { name:'화염 수프', need:{goods_spice:3, goods_salt:2},      result:'food_fire',  gold:90,  successRate:1.0 },
  cook_ice_cream:  { name:'빙하 빙수', need:{goods_fish:1, goods_salt:3},       result:'food_ice',   gold:60,  successRate:1.0 },
  cook_kings_feast:{ name:'왕의 연회', need:{mat_dragon:2, goods_wine:3, goods_spice:5, goods_fish:5}, result:'food_king', gold:1000, successRate:0.5 },
  cook_exp_tea:    { name:'깨달음의 차', need:{goods_herb:5, mat_magic:2},      result:'food_exp',   gold:150, successRate:0.8 },
  // ── 망토/벨트 제작 ──
  craft_cape_1:  { name:'여행자 망토 제작', need:{goods_leather:8, goods_wood:3}, result:'equip_cape_1', gold:150, successRate:1.0 },
  craft_cape_2:  { name:'기사 망토 제작',   need:{goods_leather:15, mat_magic:5}, result:'equip_cape_2', gold:600, successRate:0.8 },
  craft_cape_3:  { name:'마법사 로브 제작', need:{goods_leather:20, mat_magic:10, mat_soul:5}, result:'equip_cape_3', gold:2000, successRate:0.5 },
  craft_cape_4:  { name:'영웅 망토 제작',   need:{mat_dragon:5, mat_soul:15, mat_magic:20}, result:'equip_cape_4', gold:8000, successRate:0.3 },
  craft_belt_1:  { name:'가죽 벨트 제작',   need:{goods_leather:5, goods_wood:2}, result:'equip_belt_1', gold:100, successRate:1.0 },
  craft_belt_2:  { name:'철제 벨트 제작',   need:{goods_iron:10, goods_leather:5}, result:'equip_belt_2', gold:400, successRate:0.8 },
  craft_belt_3:  { name:'미스릴 벨트 제작', need:{goods_iron:20, mat_magic:8, mat_soul:3}, result:'equip_belt_3', gold:1500, successRate:0.5 },
  craft_belt_4:  { name:'영웅 벨트 제작',   need:{mat_dragon:5, mat_soul:10, mat_magic:15}, result:'equip_belt_4', gold:6000, successRate:0.3 },
  // ── 영웅/전설급 투구/장갑/신발 ──
  craft_helm4:   { name:'영웅 투구 제작',   need:{mat_dragon:3, mat_soul:10, goods_iron:25}, result:'equip_helm_4', gold:5000, successRate:0.3 },
  craft_glove4:  { name:'영웅 장갑 제작',   need:{mat_dragon:3, mat_soul:8, goods_leather:20}, result:'equip_glove_4', gold:4500, successRate:0.3 },
  craft_boots4:  { name:'영웅 장화 제작',   need:{mat_dragon:3, mat_soul:8, goods_leather:20}, result:'equip_boots_4', gold:4500, successRate:0.3 },
  // ── 신화급 제작 (초고난이도) ──
  craft_mythic_sword:{ name:'태초의 검 제작', need:{mat_dragon:30, mat_soul:50, mat_magic:50}, result:'equip_mythic_sword', gold:100000, successRate:0.1 },
  craft_mythic_armor:{ name:'태초의 갑옷 제작', need:{mat_dragon:30, mat_soul:50, mat_magic:50}, result:'equip_mythic_armor', gold:100000, successRate:0.1 },
  craft_mythic_ring: { name:'태초의 반지 제작', need:{mat_dragon:20, mat_soul:30, goods_gem:30}, result:'equip_mythic_ring', gold:80000, successRate:0.15 },
  // ── 신규 재료 조합 ──
  craft_mat_upgrade: { name:'고급 재료 정제', need:{mat_magic:10, mat_soul:5}, result:'mat_dragon', gold:3000, successRate:0.4 },
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
    return { success: true, msg: `${recipe.name} 성공!`, resultItem: recipe.result };
  } else {
    return { success: false, msg: `${recipe.name} 실패... 재료 소실` };
  }
}

module.exports = { RECIPES, handleCraft };

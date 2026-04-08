// 농장 시스템 — v1.36
// 안전 마을 존에서 작물을 심고, 일정 시간 후 수확
// AFK 진행 — 오프라인 시간도 카운트
// 슬롯 기반 (기본 4슬롯, 다이아로 확장 가능)

const CROP_TYPES = {
  // [id, name, growMinutes, seedCost, seedCurrency, harvest]
  herb:     { name:'약초',     growMinutes:5,   seedCost:30,  seedCurrency:'gold',
              harvest:{ items:{ goods_herb: 3 }, exp: 20, gold: 0 } },
  carrot:   { name:'당근',     growMinutes:10,  seedCost:60,  seedCurrency:'gold',
              harvest:{ items:{ goods_herb: 2 }, exp: 40, gold: 50 } },
  wheat:    { name:'밀',       growMinutes:15,  seedCost:100, seedCurrency:'gold',
              harvest:{ items:{ goods_potion: 1 }, exp: 60, gold: 100 } },
  pumpkin:  { name:'호박',     growMinutes:30,  seedCost:200, seedCurrency:'gold',
              harvest:{ items:{ goods_spice: 1 }, exp: 120, gold: 250 } },
  golden_apple: { name:'황금 사과', growMinutes:60, seedCost:500, seedCurrency:'gold',
              harvest:{ items:{ goods_gem: 1, mat_magic: 2 }, exp: 250, gold: 600 } },
  moonflower:   { name:'달꽃',     growMinutes:120, seedCost:30, seedCurrency:'diamond',
              harvest:{ items:{ mat_magic: 5, mat_soul: 1 }, exp: 500, gold: 1500 } },
  dragon_fruit: { name:'용 과일', growMinutes:240, seedCost:80, seedCurrency:'diamond',
              harvest:{ items:{ mat_dragon: 1, mat_soul: 3 }, exp: 1000, gold: 3000 } },
};

const FARM_CONFIG = {
  baseSlots: 4,
  maxSlots: 12,
  expandSlotCost: 50,    // 다이아 1슬롯 추가
  fertilizerSpeedup: 0.5, // 비료 사용 시 50% 시간 단축
  fertilizerCost: 20,     // 다이아 20개
};

function _ensure(player) {
  if (!player.farm) player.farm = { slots: {}, slotCount: FARM_CONFIG.baseSlots };
  return player.farm;
}

function getFarmStatus(player) {
  const farm = _ensure(player);
  const now = Date.now();
  const slots = [];
  for (let i = 0; i < farm.slotCount; i++) {
    const slot = farm.slots[i];
    if (!slot) {
      slots.push({ idx: i, status: 'empty' });
    } else {
      const crop = CROP_TYPES[slot.cropId];
      const total = crop.growMinutes * 60 * 1000 * (slot.fertilized ? FARM_CONFIG.fertilizerSpeedup : 1);
      const elapsed = now - slot.plantedAt;
      const ready = elapsed >= total;
      slots.push({
        idx: i,
        status: ready ? 'ready' : 'growing',
        cropId: slot.cropId,
        cropName: crop.name,
        plantedAt: slot.plantedAt,
        readyAt: slot.plantedAt + total,
        remainingSec: Math.max(0, Math.ceil((total - elapsed) / 1000)),
        fertilized: !!slot.fertilized,
      });
    }
  }
  return {
    slots,
    slotCount: farm.slotCount,
    maxSlots: FARM_CONFIG.maxSlots,
    expandCost: FARM_CONFIG.expandSlotCost,
    fertilizerCost: FARM_CONFIG.fertilizerCost,
    crops: CROP_TYPES,
  };
}

function plantCrop(player, slotIdx, cropId) {
  const farm = _ensure(player);
  if (slotIdx < 0 || slotIdx >= farm.slotCount) return { success: false, msg: '슬롯 범위 초과' };
  if (farm.slots[slotIdx]) return { success: false, msg: '이미 작물이 심겨있음' };
  const crop = CROP_TYPES[cropId];
  if (!crop) return { success: false, msg: '존재하지 않는 작물' };
  // 비용 차감
  if (crop.seedCurrency === 'gold') {
    if ((player.gold || 0) < crop.seedCost) return { success: false, msg: '골드 부족' };
    player.gold -= crop.seedCost;
  } else {
    if ((player.diamonds || 0) < crop.seedCost) return { success: false, msg: '다이아 부족' };
    player.diamonds -= crop.seedCost;
  }
  farm.slots[slotIdx] = { cropId, plantedAt: Date.now(), fertilized: false };
  return { success: true, slotIdx, cropId };
}

function harvestCrop(player, slotIdx) {
  const farm = _ensure(player);
  const slot = farm.slots[slotIdx];
  if (!slot) return { success: false, msg: '빈 슬롯' };
  const crop = CROP_TYPES[slot.cropId];
  const total = crop.growMinutes * 60 * 1000 * (slot.fertilized ? FARM_CONFIG.fertilizerSpeedup : 1);
  const elapsed = Date.now() - slot.plantedAt;
  if (elapsed < total) {
    return { success: false, msg: `아직 자라는 중 (${Math.ceil((total - elapsed) / 1000)}초 남음)` };
  }
  // 보상 지급
  const h = crop.harvest;
  if (h.gold) player.gold = (player.gold || 0) + h.gold;
  if (h.exp) player.exp = (player.exp || 0) + h.exp;
  if (!player.inventory) player.inventory = {};
  if (h.items) {
    for (const [itemId, count] of Object.entries(h.items)) {
      player.inventory[itemId] = (player.inventory[itemId] || 0) + count;
    }
  }
  delete farm.slots[slotIdx];
  return { success: true, harvest: h, cropName: crop.name };
}

function applyFertilizer(player, slotIdx) {
  const farm = _ensure(player);
  const slot = farm.slots[slotIdx];
  if (!slot) return { success: false, msg: '빈 슬롯' };
  if (slot.fertilized) return { success: false, msg: '이미 비료 사용됨' };
  if ((player.diamonds || 0) < FARM_CONFIG.fertilizerCost) return { success: false, msg: '다이아 부족' };
  player.diamonds -= FARM_CONFIG.fertilizerCost;
  // 이미 자란 시간 비례로 단축 적용
  const crop = CROP_TYPES[slot.cropId];
  const oldTotal = crop.growMinutes * 60 * 1000;
  const newTotal = oldTotal * FARM_CONFIG.fertilizerSpeedup;
  const elapsed = Date.now() - slot.plantedAt;
  // plantedAt을 앞당겨서 newTotal 기준 동일 진행률 유지
  slot.plantedAt = Date.now() - (elapsed * (newTotal / oldTotal));
  slot.fertilized = true;
  return { success: true };
}

function expandSlot(player) {
  const farm = _ensure(player);
  if (farm.slotCount >= FARM_CONFIG.maxSlots) return { success: false, msg: '최대 슬롯 도달' };
  if ((player.diamonds || 0) < FARM_CONFIG.expandSlotCost) return { success: false, msg: '다이아 부족' };
  player.diamonds -= FARM_CONFIG.expandSlotCost;
  farm.slotCount++;
  return { success: true, newSlotCount: farm.slotCount };
}

module.exports = {
  CROP_TYPES,
  FARM_CONFIG,
  getFarmStatus,
  plantCrop,
  harvestCrop,
  applyFertilizer,
  expandSlot,
};

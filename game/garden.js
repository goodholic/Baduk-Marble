// 정원 시스템 — v2.18
// 꽃을 12 슬롯 정원에 심어 성장시킴 — 만개시 작은 보너스, 시들면 재식
// farm.js와 차이: farm은 식량 생산, garden은 장식 + 패시브 보너스

const FLOWERS = {
  daisy:    { name:'데이지',     icon:'🌼', seed: 50,  growHours: 2,  bonus:{ stat:'maxHp',    value: 5 } },
  rose:     { name:'장미',       icon:'🌹', seed:120,  growHours: 4,  bonus:{ stat:'atk',      value: 2 } },
  tulip:    { name:'튤립',       icon:'🌷', seed: 80,  growHours: 3,  bonus:{ stat:'def',      value: 3 } },
  sunflower:{ name:'해바라기',   icon:'🌻', seed:100,  growHours: 4,  bonus:{ stat:'goldBonus',value: 2 } },
  lotus:    { name:'연꽃',       icon:'🪷', seed:200,  growHours: 6,  bonus:{ stat:'mp',       value: 5 } },
  cherry:   { name:'벚꽃',       icon:'🌸', seed:150,  growHours: 5,  bonus:{ stat:'crit',     value: 1 } },
  hibiscus: { name:'무궁화',     icon:'🌺', seed:180,  growHours: 5,  bonus:{ stat:'evasion',  value: 1 } },
  starflower:{name:'별꽃',       icon:'✨', seed:500,  growHours:12,  bonus:{ stat:'allStats', value: 1 } },
};

const SLOTS = 12;
const WILT_HOURS = 24; // 만개 후 시들 때까지

function _ensure(player) {
  if (!player.garden) {
    player.garden = {
      slots: Array(SLOTS).fill(null), // each: {flowerId, plantedAt}
      planted: 0,
      bloomed: 0,
    };
  }
  return player.garden;
}

function _stage(slot) {
  if (!slot) return 'empty';
  const def = FLOWERS[slot.flowerId];
  if (!def) return 'empty';
  const elapsedHours = (Date.now() - slot.plantedAt) / 3600000;
  if (elapsedHours < def.growHours * 0.3) return 'seed';
  if (elapsedHours < def.growHours * 0.7) return 'sprout';
  if (elapsedHours < def.growHours)        return 'budding';
  if (elapsedHours < def.growHours + WILT_HOURS) return 'bloom';
  return 'wilted';
}

function getStatus(player) {
  const g = _ensure(player);
  const slots = g.slots.map((slot, i) => {
    if (!slot) return { i, empty:true };
    const def = FLOWERS[slot.flowerId];
    return {
      i,
      flowerId: slot.flowerId,
      name: def?.name,
      icon: def?.icon,
      stage: _stage(slot),
      plantedAt: slot.plantedAt,
    };
  });
  const blooming = slots.filter(s => s.stage === 'bloom').length;
  return {
    slots,
    slotCount: SLOTS,
    planted: g.planted,
    bloomed: g.bloomed,
    blooming,
    flowers: FLOWERS,
  };
}

function plant(player, slotIndex, flowerId) {
  const g = _ensure(player);
  if (slotIndex < 0 || slotIndex >= SLOTS) return { success:false, msg:'잘못된 슬롯' };
  const def = FLOWERS[flowerId];
  if (!def) return { success:false, msg:'존재하지 않는 꽃' };
  const slot = g.slots[slotIndex];
  if (slot && _stage(slot) !== 'wilted') return { success:false, msg:'슬롯 사용 중' };
  if ((player.gold || 0) < def.seed) return { success:false, msg:`씨앗 ${def.seed}G 부족` };
  player.gold -= def.seed;
  g.slots[slotIndex] = { flowerId, plantedAt: Date.now() };
  g.planted += 1;
  return { success:true, msg:`${def.icon} ${def.name} 심음 — ${def.growHours}시간 후 만개` };
}

function harvest(player, slotIndex) {
  const g = _ensure(player);
  const slot = g.slots[slotIndex];
  if (!slot) return { success:false, msg:'빈 슬롯' };
  const stage = _stage(slot);
  if (stage !== 'wilted') return { success:false, msg:'아직 시들지 않음' };
  g.slots[slotIndex] = null;
  return { success:true, msg:'시든 꽃 정리' };
}

function getActiveBonuses(player) {
  const g = _ensure(player);
  const bonuses = {};
  for (const slot of g.slots) {
    if (!slot) continue;
    if (_stage(slot) !== 'bloom') continue;
    const def = FLOWERS[slot.flowerId];
    if (!def?.bonus) continue;
    bonuses[def.bonus.stat] = (bonuses[def.bonus.stat] || 0) + def.bonus.value;
  }
  return bonuses;
}

module.exports = {
  FLOWERS,
  SLOTS,
  WILT_HOURS,
  getStatus,
  plant,
  harvest,
  getActiveBonuses,
};

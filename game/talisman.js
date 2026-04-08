// 부적 시스템 — v2.13
// 종이 + 잉크로 부적을 제작 → 최대 3 슬롯에 장착 → 효과
// 부적은 영구적이지 않고 사용 횟수(charge) 가 줄어듦

const TALISMAN_TYPES = {
  ward_of_might:    { name:'힘의 부적',   icon:'🔴', stat:'atk',     value: 8,  charges:50,  craft:{ paper:2, redInk:1 } },
  ward_of_iron:     { name:'철의 부적',   icon:'⚪', stat:'def',     value:15,  charges:50,  craft:{ paper:2, whiteInk:1 } },
  ward_of_swift:    { name:'바람의 부적', icon:'💨', stat:'evasion', value: 5,  charges:50,  craft:{ paper:2, blueInk:1 } },
  ward_of_spirit:   { name:'영의 부적',   icon:'🟣', stat:'mp',      value:30,  charges:50,  craft:{ paper:2, purpleInk:1 } },
  ward_of_keen:     { name:'예리의 부적', icon:'🟡', stat:'crit',    value: 6,  charges:50,  craft:{ paper:2, yellowInk:1 } },
  ward_of_vitality: { name:'생명의 부적', icon:'🟢', stat:'maxHp',   value:60,  charges:50,  craft:{ paper:2, greenInk:1 } },
  ward_of_fortune:  { name:'행운의 부적', icon:'💰', stat:'goldBonus',value:15, charges:30,  craft:{ paper:3, goldDust:1 } },
  ward_of_wisdom:   { name:'지혜의 부적', icon:'📖', stat:'expBonus',value:20,  charges:30,  craft:{ paper:3, sageEssence:1 } },
};

const MAX_SLOTS = 3;

function _ensure(player) {
  if (!player.talisman) {
    player.talisman = {
      materials: { paper: 0 }, // 종이 + 색별 잉크
      inventory: [],            // [{id, type, charges, craftedAt}]
      equipped: [null, null, null],
      crafted: 0,
    };
  }
  return player.talisman;
}

function getStatus(player) {
  const t = _ensure(player);
  const equippedDetails = t.equipped.map(slot => {
    if (!slot) return null;
    const item = t.inventory.find(x => x.id === slot);
    if (!item) return null;
    const def = TALISMAN_TYPES[item.type];
    return { ...item, ...def };
  });
  return {
    materials: t.materials,
    inventory: t.inventory.map(it => ({ ...it, ...TALISMAN_TYPES[it.type] })),
    equipped: equippedDetails,
    crafted: t.crafted,
    types: TALISMAN_TYPES,
  };
}

function buyMaterials(player, kind, count) {
  const t = _ensure(player);
  const prices = {
    paper: 5, redInk: 30, whiteInk: 30, blueInk: 30, purpleInk: 30,
    yellowInk: 30, greenInk: 30, goldDust: 100, sageEssence: 80,
  };
  if (!(kind in prices)) return { success:false, msg:'존재하지 않는 재료' };
  count = Math.max(1, Math.floor(count || 1));
  const totalCost = prices[kind] * count;
  if ((player.gold || 0) < totalCost) return { success:false, msg:'골드 부족' };
  player.gold -= totalCost;
  t.materials[kind] = (t.materials[kind] || 0) + count;
  return { success:true, msg:`${kind} ${count}개 (-${totalCost}G)` };
}

function craft(player, typeId) {
  const t = _ensure(player);
  const def = TALISMAN_TYPES[typeId];
  if (!def) return { success:false, msg:'존재하지 않는 부적' };
  for (const [mat, qty] of Object.entries(def.craft)) {
    if ((t.materials[mat] || 0) < qty) return { success:false, msg:`재료 부족: ${mat}` };
  }
  for (const [mat, qty] of Object.entries(def.craft)) {
    t.materials[mat] -= qty;
  }
  const item = {
    id: `tal_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    type: typeId,
    charges: def.charges,
    craftedAt: Date.now(),
  };
  t.inventory.push(item);
  t.crafted += 1;
  return { success:true, msg:`${def.icon} ${def.name} 제작!`, item };
}

function equip(player, slotIndex, talismanId) {
  const t = _ensure(player);
  if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return { success:false, msg:'잘못된 슬롯' };
  if (talismanId === null) {
    t.equipped[slotIndex] = null;
    return { success:true, msg:'슬롯 비움' };
  }
  if (!t.inventory.find(x => x.id === talismanId)) return { success:false, msg:'부적 없음' };
  // 다른 슬롯에서 장착 해제
  for (let i = 0; i < MAX_SLOTS; i++) {
    if (t.equipped[i] === talismanId) t.equipped[i] = null;
  }
  t.equipped[slotIndex] = talismanId;
  return { success:true, msg:'장착 완료' };
}

// 전투 등에서 부적 사용 시 호출 — charge 1 감소, 0 시 자동 제거
function consumeCharge(player) {
  const t = _ensure(player);
  for (let i = 0; i < MAX_SLOTS; i++) {
    const id = t.equipped[i];
    if (!id) continue;
    const item = t.inventory.find(x => x.id === id);
    if (!item) { t.equipped[i] = null; continue; }
    item.charges -= 1;
    if (item.charges <= 0) {
      t.inventory = t.inventory.filter(x => x.id !== id);
      t.equipped[i] = null;
    }
  }
}

function getActiveBonuses(player) {
  const t = _ensure(player);
  const bonuses = {};
  for (const id of t.equipped) {
    if (!id) continue;
    const item = t.inventory.find(x => x.id === id);
    if (!item) continue;
    const def = TALISMAN_TYPES[item.type];
    if (!def) continue;
    bonuses[def.stat] = (bonuses[def.stat] || 0) + def.value;
  }
  return bonuses;
}

module.exports = {
  TALISMAN_TYPES,
  MAX_SLOTS,
  getStatus,
  buyMaterials,
  craft,
  equip,
  consumeCharge,
  getActiveBonuses,
};

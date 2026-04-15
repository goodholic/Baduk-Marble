// ============================================
// IO 전리품 — 매치 중 장비 드롭 & 실시간 교체
// ============================================

// IO 전용 장비 (매치 내에서만 유효, 매치 종료 시 소멸)
const IO_EQUIPMENT_POOL = {
  common: [
    { id: 'io_rusty_sword', name: '녹슨 검⚔️', slot: 'weapon', stat: { atk: 5 }, desc: '기본 무기' },
    { id: 'io_leather', name: '가죽 갑옷🧥', slot: 'armor', stat: { def: 5, hp: 20 }, desc: '기본 방어구' },
    { id: 'io_ring', name: '구리 반지💍', slot: 'accessory', stat: { hp: 15 }, desc: '기본 장신구' },
    { id: 'io_boots', name: '낡은 장화👢', slot: 'boots', stat: { spd: 1 }, desc: '기본 신발' },
    { id: 'io_herb', name: '치유 허브🌿', slot: 'consumable', stat: { heal: 30 }, desc: 'HP 30 회복', consumable: true },
  ],
  uncommon: [
    { id: 'io_steel_blade', name: '강철 검⚔️🔵', slot: 'weapon', stat: { atk: 12, critRate: 0.03 }, desc: '단단한 검' },
    { id: 'io_chainmail', name: '쇠사슬 갑옷🛡️🔵', slot: 'armor', stat: { def: 10, hp: 40 }, desc: '쇠사슬 방어' },
    { id: 'io_amulet', name: '푸른 목걸이💎🔵', slot: 'accessory', stat: { atk: 5, def: 5 }, desc: '균형 장신구' },
    { id: 'io_swift_boots', name: '민첩 장화💨🔵', slot: 'boots', stat: { spd: 2, eva: 0.05 }, desc: '빠른 신발' },
    { id: 'io_potion', name: 'HP 포션🧪🔵', slot: 'consumable', stat: { heal: 80 }, desc: 'HP 80 회복', consumable: true },
  ],
  rare: [
    { id: 'io_flame_sword', name: '화염검🔥⚔️', slot: 'weapon', stat: { atk: 22, fireDmg: 10 }, desc: '불타는 검' },
    { id: 'io_ice_staff', name: '빙결 지팡이❄️🪄', slot: 'weapon', stat: { atk: 18, matk: 15, slow: 0.1 }, desc: '얼음 마법봉' },
    { id: 'io_plate', name: '판금 갑옷🛡️🟡', slot: 'armor', stat: { def: 20, hp: 80 }, desc: '튼튼한 갑옷' },
    { id: 'io_ruby', name: '루비 목걸이💎🟡', slot: 'accessory', stat: { atk: 12, critRate: 0.08 }, desc: '크리 특화' },
    { id: 'io_dash_boots', name: '돌진 장화⚡🟡', slot: 'boots', stat: { spd: 3, dashCooldown: -0.2 }, desc: '대시 쿨 -20%' },
    { id: 'io_elixir', name: '엘릭서🧪🟡', slot: 'consumable', stat: { heal: 200, atkBuff: 0.1 }, desc: 'HP 200 + ATK +10%', consumable: true },
  ],
  epic: [
    { id: 'io_dragon_blade', name: '용의 검🐲⚔️', slot: 'weapon', stat: { atk: 40, fireDmg: 20, critRate: 0.1 }, desc: '용의 화염' },
    { id: 'io_shadow_cloak', name: '그림자 망토🌑🧥', slot: 'armor', stat: { def: 15, eva: 0.15, stealth: 3 }, desc: '은신 3초' },
    { id: 'io_crown', name: '전투왕관👑', slot: 'accessory', stat: { atk: 15, def: 15, hp: 50 }, desc: '왕의 위엄' },
    { id: 'io_teleport_boots', name: '순간이동 장화🌀👢', slot: 'boots', stat: { spd: 4, teleport: true }, desc: '순간이동 가능!' },
    { id: 'io_full_restore', name: '완전 회복약🧪💜', slot: 'consumable', stat: { fullHeal: true }, desc: 'HP 100% 회복!', consumable: true },
  ],
  legendary: [
    { id: 'io_excalibur', name: '엑스칼리버⚔️🌟', slot: 'weapon', stat: { atk: 70, holyDmg: 30, critRate: 0.15 }, desc: '전설의 성검!' },
    { id: 'io_god_armor', name: '신의 갑주🛡️🌟', slot: 'armor', stat: { def: 50, hp: 200, reflect: 0.1 }, desc: '신성한 방어!' },
    { id: 'io_infinity', name: '무한의 보석💎🌟', slot: 'accessory', stat: { atk: 30, def: 30, hp: 100, allStat: 0.1 }, desc: '전 스탯 +10%!' },
  ],
};

// 드롭 확률 (몬스터 티어별)
const DROP_RATES = {
  normal:   { none: 0.5, common: 0.35, uncommon: 0.12, rare: 0.03, epic: 0, legendary: 0 },
  elite:    { none: 0.2, common: 0.3, uncommon: 0.3, rare: 0.15, epic: 0.05, legendary: 0 },
  boss:     { none: 0, common: 0.1, uncommon: 0.2, rare: 0.35, epic: 0.25, legendary: 0.1 },
  player:   { none: 0.3, common: 0.2, uncommon: 0.25, rare: 0.15, epic: 0.08, legendary: 0.02 },
  supply:   { none: 0, common: 0, uncommon: 0.2, rare: 0.4, epic: 0.3, legendary: 0.1 },
};

// IO 장비 슬롯
const IO_SLOTS = ['weapon', 'armor', 'accessory', 'boots'];
const MAX_CONSUMABLE_SLOTS = 3;

// 등급별 점수 (아이템 비교용)
const RARITY_SCORE = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };

// ============================================
// 유틸: 아이템 총 스탯 점수 계산
// ============================================
function itemStatScore(item) {
  if (!item || !item.stat) return 0;
  let score = 0;
  const s = item.stat;
  score += (s.atk || 0) * 2;
  score += (s.def || 0) * 2;
  score += (s.hp || 0) * 0.5;
  score += (s.matk || 0) * 2;
  score += (s.spd || 0) * 5;
  score += (s.critRate || 0) * 100;
  score += (s.eva || 0) * 80;
  score += (s.fireDmg || 0) * 1.5;
  score += (s.holyDmg || 0) * 1.5;
  score += (s.heal || 0) * 0.3;
  score += s.teleport ? 30 : 0;
  score += s.fullHeal ? 50 : 0;
  score += (s.reflect || 0) * 100;
  score += (s.allStat || 0) * 200;
  score += (s.stealth || 0) * 10;
  score += (s.slow || 0) * 30;
  score += (s.dashCooldown ? Math.abs(s.dashCooldown) * 50 : 0);
  score += (s.atkBuff || 0) * 50;
  return score;
}

// 아이템이 어느 등급 풀에 속하는지 판별
function getItemRarity(item) {
  if (!item) return null;
  for (const rarity of Object.keys(IO_EQUIPMENT_POOL)) {
    if (IO_EQUIPMENT_POOL[rarity].some(i => i.id === item.id)) return rarity;
  }
  return 'common';
}

// ============================================
// 1) initIOInventory — 플레이어 IO 인벤토리 초기화
// ============================================
function initIOInventory(player) {
  player.ioEquip = {
    weapon: null,
    armor: null,
    accessory: null,
    boots: null,
  };
  player.ioConsumables = [null, null, null]; // 3 consumable slots
  player.ioDropLog = [];   // 이번 매치에서 획득한 아이템 기록
  player.ioBuffs = [];     // 소모품 임시 버프
  return player.ioEquip;
}

// ============================================
// 2) generateDrop — 티어별 드롭 롤
// ============================================
function generateDrop(tier) {
  const rates = DROP_RATES[tier] || DROP_RATES.normal;
  let roll = Math.random();
  let selectedRarity = null;

  for (const [rarity, chance] of Object.entries(rates)) {
    if (rarity === 'none') {
      roll -= chance;
      if (roll <= 0) return null; // 꽝
      continue;
    }
    roll -= chance;
    if (roll <= 0) {
      selectedRarity = rarity;
      break;
    }
  }

  if (!selectedRarity) return null;

  const pool = IO_EQUIPMENT_POOL[selectedRarity];
  if (!pool || pool.length === 0) return null;

  const template = pool[Math.floor(Math.random() * pool.length)];
  // uid로 인스턴스 구분 (같은 아이템 여러 개 바닥에 있을 수 있음)
  return {
    ...template,
    uid: `${template.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    rarity: selectedRarity,
    droppedAt: Date.now(),
  };
}

// ============================================
// 3) pickupItem — 아이템 줍기 (자동 장착 or 교체 제안)
// ============================================
function pickupItem(player, item) {
  if (!player || !item) return { success: false, msg: '아이템 없음' };

  // 인벤토리 초기화 안 되어 있으면 초기화
  if (!player.ioEquip) initIOInventory(player);

  // 드롭 로그 기록
  player.ioDropLog.push({
    item: { id: item.id, name: item.name, rarity: item.rarity },
    time: Date.now(),
  });

  // 소모품 처리
  if (item.consumable) {
    const emptySlot = player.ioConsumables.findIndex(s => s === null);
    if (emptySlot !== -1) {
      player.ioConsumables[emptySlot] = item;
      return { success: true, action: 'consumable_added', slot: emptySlot, item };
    }
    // 소모품 슬롯 가득 -> 바닥에 놔둠
    return { success: false, msg: '소모품 슬롯 가득!', action: 'consumable_full', item };
  }

  // 장비 처리
  const slot = item.slot;
  if (!IO_SLOTS.includes(slot)) return { success: false, msg: '알 수 없는 슬롯' };

  const current = player.ioEquip[slot];

  // 슬롯 비어있으면 자동 장착
  if (!current) {
    player.ioEquip[slot] = item;
    applyEquipStats(player, item, true);
    return { success: true, action: 'auto_equip', slot, item };
  }

  // 슬롯에 이미 장비 있음 -> 새 아이템이 더 좋으면 자동 교체, 아니면 비교 데이터 반환
  const currentScore = itemStatScore(current);
  const newScore = itemStatScore(item);

  if (newScore > currentScore) {
    // 자동 교체: 더 좋은 아이템
    const oldItem = current;
    applyEquipStats(player, oldItem, false);  // 기존 장비 스탯 제거
    player.ioEquip[slot] = item;
    applyEquipStats(player, item, true);       // 새 장비 스탯 적용
    return {
      success: true,
      action: 'auto_swap',
      slot,
      equipped: item,
      dropped: oldItem,
      reason: `${item.name} (${newScore.toFixed(0)}점) > ${oldItem.name} (${currentScore.toFixed(0)}점)`,
    };
  }

  // 더 약한 아이템 -> 교체 제안만 (클라이언트가 io_equip으로 수동 교체 가능)
  return {
    success: true,
    action: 'compare',
    slot,
    current: { ...current, score: currentScore },
    newItem: { ...item, score: newScore },
    msg: `현재 장비가 더 좋습니다. 교체하려면 수동 장착하세요.`,
  };
}

// ============================================
// 4) equipIOItem — 수동 장착 (교체)
// ============================================
function equipIOItem(player, itemUid, slot) {
  if (!player || !player.ioEquip) return { success: false, msg: '인벤토리 없음' };
  if (!IO_SLOTS.includes(slot)) return { success: false, msg: '올바르지 않은 슬롯' };

  // 바닥 아이템 목록에서 uid로 찾아야 하는데, 여기서는 compare 상태의 아이템을
  // 클라이언트가 보관하고 있다가 io_equip으로 보내는 시나리오 대응
  // 실제 매치에서는 groundLoot 배열에서 찾음
  // 여기서는 player._pendingLoot에 임시 저장한다고 가정
  if (!player._pendingLoot) player._pendingLoot = [];

  const idx = player._pendingLoot.findIndex(i => i.uid === itemUid);
  if (idx === -1) return { success: false, msg: '아이템을 찾을 수 없음' };

  const item = player._pendingLoot.splice(idx, 1)[0];
  if (item.slot !== slot && !item.consumable) {
    return { success: false, msg: `이 아이템은 ${item.slot} 슬롯입니다` };
  }

  const oldItem = player.ioEquip[slot];
  if (oldItem) {
    applyEquipStats(player, oldItem, false);
  }

  player.ioEquip[slot] = item;
  applyEquipStats(player, item, true);

  return {
    success: true,
    action: 'equipped',
    slot,
    equipped: item,
    dropped: oldItem || null,
  };
}

// ============================================
// 5) useConsumable — 소모품 사용
// ============================================
function useConsumable(player, slotIndex) {
  if (!player || !player.ioConsumables) return { success: false, msg: '인벤토리 없음' };
  if (slotIndex < 0 || slotIndex >= MAX_CONSUMABLE_SLOTS) return { success: false, msg: '올바르지 않은 슬롯' };

  const item = player.ioConsumables[slotIndex];
  if (!item) return { success: false, msg: '빈 슬롯' };

  const result = { success: true, used: item, effects: [] };
  const s = item.stat;

  // HP 회복
  if (s.fullHeal) {
    const healed = (player.maxHp || player.hp) - player.hp;
    player.hp = player.maxHp || player.hp;
    result.effects.push(`HP 전체 회복! (+${healed})`);
  } else if (s.heal) {
    const maxHp = player.maxHp || 999999;
    const before = player.hp;
    player.hp = Math.min(maxHp, player.hp + s.heal);
    result.effects.push(`HP +${player.hp - before}`);
  }

  // ATK 버프
  if (s.atkBuff) {
    const buffAmount = Math.floor((player.atk || 10) * s.atkBuff);
    player.atk = (player.atk || 10) + buffAmount;
    const buffEntry = {
      type: 'atkBuff',
      amount: buffAmount,
      expiresAt: Date.now() + 30000, // 30초 지속
    };
    if (!player.ioBuffs) player.ioBuffs = [];
    player.ioBuffs.push(buffEntry);
    result.effects.push(`ATK +${buffAmount} (30초)`);

    // 자동 해제 타이머
    setTimeout(() => {
      if (player && player.atk) {
        player.atk = Math.max(1, (player.atk || 10) - buffAmount);
      }
      if (player.ioBuffs) {
        const bi = player.ioBuffs.indexOf(buffEntry);
        if (bi !== -1) player.ioBuffs.splice(bi, 1);
      }
    }, 30000);
  }

  // 슬롯 비우기
  player.ioConsumables[slotIndex] = null;
  return result;
}

// ============================================
// 6) getIOInventory — 현재 IO 인벤토리 조회
// ============================================
function getIOInventory(player) {
  if (!player) return null;
  if (!player.ioEquip) initIOInventory(player);

  return {
    equipment: { ...player.ioEquip },
    consumables: [...player.ioConsumables],
    bonuses: calcIOEquipBonuses(player),
    activeBuffs: (player.ioBuffs || []).filter(b => b.expiresAt > Date.now()).map(b => ({
      type: b.type,
      amount: b.amount,
      remaining: Math.ceil((b.expiresAt - Date.now()) / 1000),
    })),
  };
}

// ============================================
// 7) calcIOEquipBonuses — IO 장비 총 보너스 합산
// ============================================
function calcIOEquipBonuses(player) {
  if (!player || !player.ioEquip) return {};

  const totals = {};
  for (const slot of IO_SLOTS) {
    const item = player.ioEquip[slot];
    if (!item || !item.stat) continue;
    for (const [key, val] of Object.entries(item.stat)) {
      if (typeof val === 'number') {
        totals[key] = (totals[key] || 0) + val;
      } else if (typeof val === 'boolean' && val) {
        totals[key] = true;
      }
    }
  }

  return totals;
}

// ============================================
// 8) generateSupplyDrop — 보급 상자 생성 (rare+ 3개)
// ============================================
function generateSupplyDrop() {
  const items = [];
  for (let i = 0; i < 3; i++) {
    let item = generateDrop('supply');
    // supply 등급은 none 확률 0이므로 반드시 아이템 나옴
    // 혹시 null이면 재시도
    let tries = 0;
    while (!item && tries < 10) {
      item = generateDrop('supply');
      tries++;
    }
    if (item) items.push(item);
  }

  return {
    type: 'supply_drop',
    id: `supply_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    items,
    x: Math.random() * 800 - 400,
    y: Math.random() * 800 - 400,
    spawnedAt: Date.now(),
    despawnAt: Date.now() + 60000, // 60초 후 사라짐
  };
}

// ============================================
// 9) lootPlayer — 플레이어 킬 시 최고 아이템 드롭
// ============================================
function lootPlayer(killer, victim) {
  if (!killer || !victim) return { success: false, msg: '대상 없음' };
  if (!victim.ioEquip) return { success: false, msg: '전리품 없음' };

  // 피해자의 모든 장비 중 가장 좋은 아이템 1개 드롭
  let bestItem = null;
  let bestScore = -1;
  let bestSlot = null;

  for (const slot of IO_SLOTS) {
    const item = victim.ioEquip[slot];
    if (!item) continue;
    const score = itemStatScore(item);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
      bestSlot = slot;
    }
  }

  // 보너스: player 티어 추가 드롭 롤
  const bonusDrop = generateDrop('player');

  const droppedItems = [];

  if (bestItem && bestSlot) {
    // 피해자에게서 장비 해제
    applyEquipStats(victim, bestItem, false);
    victim.ioEquip[bestSlot] = null;

    // 킬러에게 자동 줍기 시도
    const pickResult = pickupItem(killer, bestItem);
    droppedItems.push({
      item: bestItem,
      source: 'victim_best',
      pickResult,
    });
  }

  if (bonusDrop) {
    const pickResult2 = pickupItem(killer, bonusDrop);
    droppedItems.push({
      item: bonusDrop,
      source: 'bonus_drop',
      pickResult: pickResult2,
    });
  }

  // 피해자의 소모품도 바닥에 드롭 (반환)
  const droppedConsumables = [];
  if (victim.ioConsumables) {
    for (let i = 0; i < victim.ioConsumables.length; i++) {
      if (victim.ioConsumables[i]) {
        droppedConsumables.push(victim.ioConsumables[i]);
        victim.ioConsumables[i] = null;
      }
    }
  }

  return {
    success: true,
    killerName: killer.displayName || killer.className || 'unknown',
    victimName: victim.displayName || victim.className || 'unknown',
    droppedItems,
    droppedConsumables,
    msg: bestItem
      ? `${bestItem.name} 획득! (${victim.displayName || '적'}에게서 전리품)`
      : '전리품 없음',
  };
}

// ============================================
// 10) getDropLog — 이번 매치 아이템 획득 기록
// ============================================
function getDropLog(player) {
  if (!player || !player.ioDropLog) return [];
  return player.ioDropLog.map(entry => ({
    ...entry,
    ago: Math.floor((Date.now() - entry.time) / 1000),
  }));
}

// ============================================
// 장비 스탯 적용 / 해제 헬퍼
// ============================================
function applyEquipStats(player, item, equip) {
  if (!item || !item.stat) return;
  const mult = equip ? 1 : -1;
  const s = item.stat;

  if (s.atk) player.atk = (player.atk || 0) + s.atk * mult;
  if (s.def) player.def = (player.def || 0) + s.def * mult;
  if (s.hp) {
    player.maxHp = (player.maxHp || player.hp || 100) + s.hp * mult;
    if (equip) player.hp = (player.hp || 100) + s.hp; // 장착 시 HP도 증가
    // 해제 시 HP가 maxHp 넘지 않게
    if (!equip && player.hp > player.maxHp) player.hp = player.maxHp;
  }
  if (s.spd) player.spd = (player.spd || 0) + s.spd * mult;
  if (s.critRate) player.critRate = (player.critRate || 0) + s.critRate * mult;
  if (s.eva) player.eva = (player.eva || 0) + s.eva * mult;
  if (s.matk) player.matk = (player.matk || 0) + s.matk * mult;
  if (s.fireDmg) player.fireDmg = (player.fireDmg || 0) + s.fireDmg * mult;
  if (s.holyDmg) player.holyDmg = (player.holyDmg || 0) + s.holyDmg * mult;
  if (s.reflect) player.reflect = (player.reflect || 0) + s.reflect * mult;
  if (s.slow) player.slow = (player.slow || 0) + s.slow * mult;

  // 불리언 특수 효과
  if (s.teleport) player.canTeleport = equip;
  if (s.stealth) player.stealthDuration = equip ? s.stealth : 0;

  // allStat 비율 보너스 (장착 시만 적용, 해제 시 역산)
  if (s.allStat) {
    if (equip) {
      player._allStatMult = (player._allStatMult || 1) * (1 + s.allStat);
      player.atk = Math.floor((player.atk || 0) * (1 + s.allStat));
      player.def = Math.floor((player.def || 0) * (1 + s.allStat));
      player.maxHp = Math.floor((player.maxHp || 100) * (1 + s.allStat));
      player.hp = Math.min(player.hp, player.maxHp);
    } else {
      const factor = 1 / (1 + s.allStat);
      player._allStatMult = (player._allStatMult || 1) * factor;
      player.atk = Math.floor((player.atk || 0) * factor);
      player.def = Math.floor((player.def || 0) * factor);
      player.maxHp = Math.floor((player.maxHp || 100) * factor);
      player.hp = Math.min(player.hp, player.maxHp);
    }
  }

  // dashCooldown 보너스
  if (s.dashCooldown) {
    player.dashCooldownMod = (player.dashCooldownMod || 0) + s.dashCooldown * mult;
  }
}

// ============================================
// 11) register — 소켓 이벤트 등록
// ============================================
function register(io, socket, player) {
  if (!player) return;

  // 인벤토리 조회
  socket.on('io_inventory', () => {
    const inv = getIOInventory(player);
    socket.emit('io_inventory', inv);
  });

  // 바닥 아이템 줍기 (클라이언트가 아이템 uid 전송)
  socket.on('io_pickup', (data) => {
    if (!data || !data.item) return;
    const result = pickupItem(player, data.item);

    // compare 결과면 _pendingLoot에 보관 (나중에 수동 장착 가능)
    if (result.action === 'compare') {
      if (!player._pendingLoot) player._pendingLoot = [];
      player._pendingLoot.push(data.item);
    }

    socket.emit('io_pickup_result', result);

    // 자동 교체로 바닥에 떨어진 아이템 -> 방 전체에 알림
    if (result.action === 'auto_swap' && result.dropped) {
      io.emit('io_ground_item', {
        item: result.dropped,
        x: player.x || 0,
        y: player.y || 0,
      });
    }
  });

  // 수동 장착
  socket.on('io_equip', (data) => {
    if (!data || !data.itemUid || !data.slot) return;
    const result = equipIOItem(player, data.itemUid, data.slot);
    socket.emit('io_equip_result', result);

    // 교체로 떨어진 아이템 -> 방 전체 알림
    if (result.dropped) {
      io.emit('io_ground_item', {
        item: result.dropped,
        x: player.x || 0,
        y: player.y || 0,
      });
    }
  });

  // 소모품 사용
  socket.on('io_use_consumable', (data) => {
    const slotIndex = (data && typeof data.slot === 'number') ? data.slot : 0;
    const result = useConsumable(player, slotIndex);
    socket.emit('io_use_consumable_result', result);
  });

  // 드롭 로그 조회
  socket.on('io_drop_log', () => {
    socket.emit('io_drop_log', getDropLog(player));
  });
}

// ============================================
// module.exports
// ============================================
module.exports = {
  IO_EQUIPMENT_POOL,
  DROP_RATES,
  IO_SLOTS,
  initIOInventory,
  generateDrop,
  pickupItem,
  equipIOItem,
  useConsumable,
  getIOInventory,
  calcIOEquipBonuses,
  generateSupplyDrop,
  lootPlayer,
  getDropLog,
  register,
  // 유틸 (외부에서 사용 가능)
  itemStatScore,
  getItemRarity,
  applyEquipStats,
};

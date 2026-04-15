// ============================================
// 카드 관리 시스템 — 장비, 스킬, 편성, 상점, IO 연동
// ============================================

// ═══ 1. 카드 장비 시스템 ═══
const EQUIPMENT_SLOTS = ['weapon', 'armor', 'accessory'];
const EQUIPMENT_POOL = {
  weapon: [
    { id: 'eq_rusty_sword', name: '녹슨 검', icon: '🗡️', grade: 'normal', stat: { atk: 8 }, desc: '기본 무기' },
    { id: 'eq_steel_blade', name: '강철 검', icon: '⚔️', grade: 'rare', stat: { atk: 20 }, desc: '단단한 검' },
    { id: 'eq_flame_sword', name: '화염검', icon: '🔥⚔️', grade: 'epic', stat: { atk: 40, fireDmg: 15 }, desc: '불꽃을 두른 검' },
    { id: 'eq_holy_blade', name: '성검', icon: '✨⚔️', grade: 'legend', stat: { atk: 70, holyDmg: 25 }, desc: '신성한 빛의 검' },
    { id: 'eq_star_staff', name: '별의 지팡이', icon: '🌟🪄', grade: 'legend', stat: { atk: 60, matk: 40 }, desc: '별의 힘' },
    { id: 'eq_death_scythe', name: '죽음의 낫', icon: '💀🔪', grade: 'myth', stat: { atk: 100, critRate: 0.2 }, desc: '사신의 무기' },
  ],
  armor: [
    { id: 'eq_leather', name: '가죽 갑옷', icon: '🧥', grade: 'normal', stat: { def: 8 }, desc: '기본 방어구' },
    { id: 'eq_chainmail', name: '쇠사슬 갑옷', icon: '🛡️', grade: 'rare', stat: { def: 18, hp: 30 }, desc: '든든한 갑옷' },
    { id: 'eq_dragon_armor', name: '용린 갑옷', icon: '🐲🛡️', grade: 'epic', stat: { def: 35, hp: 80 }, desc: '용의 비늘' },
    { id: 'eq_divine_plate', name: '신성 갑주', icon: '✨🛡️', grade: 'legend', stat: { def: 60, hp: 150 }, desc: '빛의 방어' },
    { id: 'eq_void_cloak', name: '공허 망토', icon: '🌀🧥', grade: 'myth', stat: { def: 80, eva: 0.15 }, desc: '차원의 외투' },
  ],
  accessory: [
    { id: 'eq_copper_ring', name: '구리 반지', icon: '💍', grade: 'normal', stat: { hp: 20 }, desc: '기본 장신구' },
    { id: 'eq_ruby_pendant', name: '루비 펜던트', icon: '💎', grade: 'rare', stat: { atk: 10, hp: 30 }, desc: '붉은 보석' },
    { id: 'eq_phoenix_feather', name: '불사조 깃털', icon: '🔥🪶', grade: 'epic', stat: { hp: 60, revive: true }, desc: '1회 부활' },
    { id: 'eq_crown', name: '왕관', icon: '👑', grade: 'legend', stat: { atk: 25, def: 25, hp: 100 }, desc: '왕의 위엄' },
    { id: 'eq_infinity_gem', name: '무한의 보석', icon: '💎🌟', grade: 'myth', stat: { atk: 40, def: 40, hp: 200 }, desc: '만물의 힘' },
  ],
};

// ═══ 1-B. 장비 강화 시스템 ═══
const ENHANCE_COSTS = { 1: 500, 2: 1000, 3: 2000, 4: 4000, 5: 8000, 6: 15000, 7: 25000, 8: 40000, 9: 60000, 10: 100000 };
const ENHANCE_RATES = { 1: 1.0, 2: 0.95, 3: 0.9, 4: 0.8, 5: 0.7, 6: 0.6, 7: 0.5, 8: 0.4, 9: 0.3, 10: 0.2 };

function findEquipment(player, equipUid) {
  // Search inventory
  let equip = (player.equipment || []).find(e => e.uid === equipUid);
  if (equip) return { equip, location: 'inventory' };
  // Search equipped on cards
  for (const card of (player.cards || [])) {
    if (!card.equipment) continue;
    for (const slot of EQUIPMENT_SLOTS) {
      if (card.equipment[slot] && card.equipment[slot].uid === equipUid) {
        return { equip: card.equipment[slot], location: 'card', card, slot };
      }
    }
  }
  return null;
}

function enhanceEquipment(player, equipUid, useProtect) {
  const found = findEquipment(player, equipUid);
  if (!found) return { ok: false, reason: '장비를 찾을 수 없음' };
  const equip = found.equip;
  const curLevel = equip.enhanceLevel || 0;
  if (curLevel >= 10) return { ok: false, reason: '이미 최대 강화 (+10)' };

  const nextLevel = curLevel + 1;
  const cost = ENHANCE_COSTS[nextLevel];
  if ((player.gold || 0) < cost) return { ok: false, reason: `골드 부족 (필요: ${cost})` };

  // Check protect scroll
  const hasProtect = useProtect && (player.enhanceProtects || 0) > 0;

  player.gold -= cost;
  const roll = Math.random();
  const rate = ENHANCE_RATES[nextLevel];

  if (roll < rate) {
    // Success
    equip.enhanceLevel = nextLevel;
    // Boost base stats +15% per level (cumulative from original)
    if (!equip.baseStat) equip.baseStat = { ...equip.stat };
    const mult = 1 + nextLevel * 0.15;
    for (const key of Object.keys(equip.baseStat)) {
      if (typeof equip.baseStat[key] === 'number') {
        equip.stat[key] = Math.floor(equip.baseStat[key] * mult);
      }
    }
    // +10 gets star prefix
    if (nextLevel === 10 && !equip.name.startsWith('★')) {
      equip.name = `★${equip.name}`;
    }
    return { ok: true, msg: `강화 성공! ${equip.name} +${nextLevel}`, level: nextLevel, stat: equip.stat };
  } else {
    // Fail
    if (nextLevel > 7 && !hasProtect) {
      equip.enhanceLevel = Math.max(0, curLevel - 1);
      // Recalculate stats
      if (equip.baseStat) {
        const mult = 1 + equip.enhanceLevel * 0.15;
        for (const key of Object.keys(equip.baseStat)) {
          if (typeof equip.baseStat[key] === 'number') {
            equip.stat[key] = Math.floor(equip.baseStat[key] * mult);
          }
        }
      }
      return { ok: false, reason: `강화 실패! +${curLevel} → +${equip.enhanceLevel} (레벨 하락)`, level: equip.enhanceLevel };
    }
    if (hasProtect) {
      player.enhanceProtects -= 1;
      return { ok: false, reason: `강화 실패! 보호 주문서로 레벨 유지 (+${curLevel})`, level: curLevel, protectUsed: true };
    }
    return { ok: false, reason: `강화 실패! 레벨 유지 (+${curLevel})`, level: curLevel };
  }
}

// ═══ 1-C. 장비 세트 보너스 ═══
const EQUIPMENT_SETS = [
  { name: '화염 세트🔥', pieces: ['eq_flame_sword', 'eq_dragon_armor', 'eq_ruby_pendant'],
    bonus2: { atk: 0.1, fireDmg: 20 }, bonus3: { atk: 0.2, fireDmg: 50, burnProc: 0.15 }, desc: '2세트: ATK+10%, 3세트: ATK+20%+화염' },
  { name: '신성 세트✨', pieces: ['eq_holy_blade', 'eq_divine_plate', 'eq_crown'],
    bonus2: { def: 0.15, holyDmg: 15 }, bonus3: { def: 0.3, holyDmg: 40, revive: true }, desc: '2세트: DEF+15%, 3세트: DEF+30%+부활' },
  { name: '그림자 세트🌑', pieces: ['eq_death_scythe', 'eq_void_cloak', 'eq_infinity_gem'],
    bonus2: { critRate: 0.1, eva: 0.1 }, bonus3: { critRate: 0.2, critDmg: 0.5, trueDmg: 30 }, desc: '2세트: 크리+회피, 3세트: 궁극 암살자' },
];

function checkSetBonus(card) {
  if (!card || !card.equipment) return [];
  const equippedIds = EQUIPMENT_SLOTS.map(s => card.equipment[s]?.id).filter(Boolean);
  const activeSets = [];
  for (const set of EQUIPMENT_SETS) {
    const matched = set.pieces.filter(p => equippedIds.includes(p)).length;
    if (matched >= 2) {
      const bonus = matched >= 3 ? { ...set.bonus2, ...set.bonus3 } : { ...set.bonus2 };
      activeSets.push({ name: set.name, matched, bonus, desc: set.desc });
    }
  }
  return activeSets;
}

// ═══ 1-D. 장비 제작 시스템 ═══
const CRAFT_RECIPES = [
  { result: 'eq_flame_sword', materials: [{ name: '화염 원석', count: 3 }, { name: '강철 주괴', count: 5 }], cost: 5000 },
  { result: 'eq_dragon_armor', materials: [{ name: '용의 비늘', count: 5 }, { name: '미스릴', count: 3 }], cost: 10000 },
  { result: 'eq_holy_blade', materials: [{ name: '빛의 결정', count: 5 }, { name: '성수', count: 3 }], cost: 15000 },
  { result: 'eq_divine_plate', materials: [{ name: '신성한 광석', count: 5 }, { name: '미스릴', count: 5 }], cost: 20000 },
  { result: 'eq_death_scythe', materials: [{ name: '어둠의 결정', count: 8 }, { name: '영혼 조각', count: 5 }, { name: '저주받은 강철', count: 3 }], cost: 30000 },
  { result: 'eq_void_cloak', materials: [{ name: '공허의 천', count: 5 }, { name: '어둠의 결정', count: 5 }], cost: 25000 },
  { result: 'eq_infinity_gem', materials: [{ name: '원소 결정', count: 10 }, { name: '영혼 조각', count: 8 }, { name: '별의 가루', count: 5 }], cost: 50000 },
];

// All possible material names for disassembly reward pool
const MATERIAL_POOL = [
  '화염 원석', '강철 주괴', '용의 비늘', '미스릴', '빛의 결정', '성수',
  '신성한 광석', '어둠의 결정', '영혼 조각', '저주받은 강철', '공허의 천',
  '원소 결정', '별의 가루',
];

const GRADE_MATERIAL_COUNT = { normal: 1, rare: 2, epic: 3, legend: 5, myth: 10 };

function craftEquipment(player, recipeIndex) {
  if (recipeIndex < 0 || recipeIndex >= CRAFT_RECIPES.length) return { ok: false, reason: '잘못된 레시피' };
  const recipe = CRAFT_RECIPES[recipeIndex];

  // Check gold
  if ((player.gold || 0) < recipe.cost) return { ok: false, reason: `골드 부족 (필요: ${recipe.cost})` };

  // Check materials
  player.materials = player.materials || {};
  for (const mat of recipe.materials) {
    if ((player.materials[mat.name] || 0) < mat.count) {
      return { ok: false, reason: `재료 부족: ${mat.name} (보유: ${player.materials[mat.name] || 0}/${mat.count})` };
    }
  }

  // Deduct costs
  player.gold -= recipe.cost;
  for (const mat of recipe.materials) {
    player.materials[mat.name] -= mat.count;
  }

  // Find the equipment template
  let template = null;
  for (const slot of EQUIPMENT_SLOTS) {
    template = EQUIPMENT_POOL[slot].find(e => e.id === recipe.result);
    if (template) break;
  }
  if (!template) return { ok: false, reason: '제작 결과 장비를 찾을 수 없음' };

  const newEquip = { ...template, uid: `eq_${Date.now()}`, enhanceLevel: 0 };
  player.equipment = player.equipment || [];
  player.equipment.push(newEquip);

  return { ok: true, msg: `${newEquip.name} 제작 완료!`, equipment: newEquip };
}

// ═══ 1-E. 장비 분해 ═══
function disassembleEquipment(player, equipUid) {
  const idx = (player.equipment || []).findIndex(e => e.uid === equipUid);
  if (idx === -1) return { ok: false, reason: '인벤토리에서 장비를 찾을 수 없음 (장착 해제 후 분해)' };

  const equip = player.equipment[idx];
  const matCount = GRADE_MATERIAL_COUNT[equip.grade] || 1;

  // Random materials
  player.materials = player.materials || {};
  const gained = [];
  for (let i = 0; i < matCount; i++) {
    const mat = MATERIAL_POOL[Math.floor(Math.random() * MATERIAL_POOL.length)];
    player.materials[mat] = (player.materials[mat] || 0) + 1;
    gained.push(mat);
  }

  // Remove equipment
  player.equipment.splice(idx, 1);

  return { ok: true, msg: `${equip.name} 분해! 재료 ${matCount}개 획득`, materials: gained };
}

// ═══ 1-F. 자동 장착 ═══
function autoEquipBest(player, cardId) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };

  card.equipment = card.equipment || {};
  const equipped = [];

  for (const slot of EQUIPMENT_SLOTS) {
    // Find all inventory items for this slot
    const candidates = (player.equipment || []).filter(e => {
      return EQUIPMENT_POOL[slot]?.some(pe => pe.id === e.id);
    });
    if (candidates.length === 0) continue;

    // Score: sum of numeric stats + enhance bonus
    const score = (eq) => {
      let s = 0;
      for (const v of Object.values(eq.stat || {})) {
        if (typeof v === 'number') s += v;
      }
      s += (eq.enhanceLevel || 0) * 10;
      // Bonus for set pieces
      const currentIds = EQUIPMENT_SLOTS.filter(sl => sl !== slot).map(sl => card.equipment[sl]?.id).filter(Boolean);
      for (const set of EQUIPMENT_SETS) {
        if (set.pieces.includes(eq.id) && currentIds.some(id => set.pieces.includes(id))) {
          s += 100; // Set bonus priority
        }
      }
      return s;
    };

    candidates.sort((a, b) => score(b) - score(a));
    const best = candidates[0];
    const currentEquipped = card.equipment[slot];

    // Only swap if better
    if (!currentEquipped || score(best) > score(currentEquipped)) {
      // Return current to inventory
      if (currentEquipped) {
        player.equipment.push(currentEquipped);
      }
      card.equipment[slot] = best;
      player.equipment = player.equipment.filter(e => e.uid !== best.uid);
      equipped.push(`${slot}: ${best.name}`);
    }
  }

  if (equipped.length === 0) return { ok: true, msg: '이미 최적 장비 장착 중' };
  return { ok: true, msg: `자동 장착 완료: ${equipped.join(', ')}`, equipped };
}

// ═══ 2. 카드 스킬 시스템 ═══
const SKILLS = [
  { id: 'sk_slash', name: '베기', icon: '⚔️', dmg: 1.2, cooldown: 0, type: 'active', desc: '기본 공격 1.2배', grade: 'normal' },
  { id: 'sk_fireball', name: '파이어볼', icon: '🔥', dmg: 1.8, cooldown: 3, type: 'active', element: 'fire', desc: '화염 데미지', grade: 'rare' },
  { id: 'sk_heal', name: '치유', icon: '💚', heal: 0.3, cooldown: 4, type: 'active', desc: '아군 HP 30% 회복', grade: 'rare' },
  { id: 'sk_shield', name: '방벽', icon: '🛡️', shield: 0.2, cooldown: 5, type: 'active', desc: 'DEF +20% (3턴)', grade: 'rare' },
  { id: 'sk_backstab', name: '급소 공격', icon: '🗡️💥', dmg: 2.5, cooldown: 5, type: 'active', desc: '크리 확정 2.5배', grade: 'epic' },
  { id: 'sk_meteor', name: '메테오', icon: '☄️', dmg: 3.0, cooldown: 8, type: 'active', aoe: true, desc: '전체 3배 데미지', grade: 'legend' },
  { id: 'sk_revive', name: '부활', icon: '💫', revive: true, cooldown: 10, type: 'active', desc: '쓰러진 아군 1명 부활', grade: 'legend' },
  // 패시브
  { id: 'sk_berserker', name: '광전사', icon: '👹', atkBonus: 0.15, type: 'passive', desc: 'ATK +15%', grade: 'rare' },
  { id: 'sk_iron_wall', name: '철벽', icon: '🧱', defBonus: 0.2, type: 'passive', desc: 'DEF +20%', grade: 'rare' },
  { id: 'sk_lifesteal', name: '흡혈', icon: '🩸', lifeSteal: 0.1, type: 'passive', desc: '데미지의 10% 회복', grade: 'epic' },
  { id: 'sk_dodge', name: '회피 본능', icon: '💨', evaBonus: 0.1, type: 'passive', desc: '회피율 +10%', grade: 'epic' },
  { id: 'sk_aura', name: '지휘 오라', icon: '✨', teamBuff: 0.08, type: 'passive', desc: '팀 전체 스탯 +8%', grade: 'legend' },
];

// ═══ 2-B. 스킬 콤보 시스템 ═══
const SKILL_COMBOS = [
  { skills: ['sk_fireball', 'sk_meteor'], name: '화염 연계🔥🔥', bonus: { fireDmg: 1.5 }, desc: '화염 데미지 50% 증가' },
  { skills: ['sk_heal', 'sk_revive'], name: '생명의 축복💚💫', bonus: { healPow: 1.3 }, desc: '치유력 30% 증가' },
  { skills: ['sk_backstab', 'sk_dodge'], name: '암살 마스터🗡️💨', bonus: { critRate: 0.15 }, desc: '크리율 +15%' },
  { skills: ['sk_shield', 'sk_iron_wall'], name: '철벽 방어🛡️🧱', bonus: { def: 0.3 }, desc: 'DEF +30%' },
  { skills: ['sk_berserker', 'sk_lifesteal'], name: '피의 광전사👹🩸', bonus: { atk: 0.2, lifeSteal: 0.05 }, desc: 'ATK+20%, 흡혈+5%' },
];

function checkSkillCombos(card) {
  if (!card || !card.skills || card.skills.length < 2) return [];
  const skillIds = card.skills.map(s => s.id);
  const activeCombos = [];
  for (const combo of SKILL_COMBOS) {
    if (combo.skills.every(s => skillIds.includes(s))) {
      activeCombos.push({ name: combo.name, bonus: combo.bonus, desc: combo.desc });
    }
  }
  return activeCombos;
}

// ═══ 3. 파티 편성 (IO 출전용) ═══
const MAX_PARTY = 5;

function setParty(player, cardIds) {
  if (!cardIds || cardIds.length > MAX_PARTY) return { ok: false, reason: `최대 ${MAX_PARTY}장` };
  const cards = (player.cards || []).filter(c => cardIds.includes(c.id));
  if (cards.length === 0) return { ok: false, reason: '유효한 카드 없음' };
  player.ioParty = cardIds;
  // 시너지 계산
  const synergies = calcPartySynergy(cards);
  return { ok: true, party: cards, synergies, msg: `파티 ${cards.length}장 편성 완료` };
}

function calcPartySynergy(cards) {
  // 간단한 시너지: 같은 등급 2장 이상이면 보너스
  const grades = {};
  cards.forEach(c => { grades[c.grade] = (grades[c.grade] || 0) + 1; });
  const synergies = [];
  for (const [grade, count] of Object.entries(grades)) {
    if (count >= 2) synergies.push({ name: `${grade.toUpperCase()} x${count}`, bonus: { atk: 1 + count * 0.05, def: 1 + count * 0.03 } });
  }
  if (cards.length >= 5) synergies.push({ name: '풀 파티', bonus: { all: 1.1 } });
  return synergies;
}

// ═══ 4. 상점 ═══
const SHOP_ITEMS = [
  { id: 'shop_equip_box_normal', name: '일반 장비 상자', icon: '📦', price: { gold: 1000 }, content: 'random_equip_normal' },
  { id: 'shop_equip_box_rare', name: '희귀 장비 상자', icon: '📦🔵', price: { gold: 5000 }, content: 'random_equip_rare' },
  { id: 'shop_equip_box_epic', name: '에픽 장비 상자', icon: '📦💜', price: { diamonds: 30 }, content: 'random_equip_epic' },
  { id: 'shop_skill_scroll', name: '스킬 두루마리', icon: '📜⚔️', price: { gold: 3000 }, content: 'random_skill' },
  { id: 'shop_gold_pack', name: '골드 팩', icon: '💰', price: { diamonds: 10 }, content: { gold: 5000 } },
  { id: 'shop_diamond_pack', name: '다이아 팩', icon: '💎', price: { gold: 50000 }, content: { diamonds: 30 } },
  { id: 'shop_revive_ticket', name: 'IO 부활권', icon: '💫🎫', price: { diamonds: 40 }, content: { reviveTicket: 1 } },
  { id: 'shop_material_box', name: '재료 상자', icon: '📦⚒️', price: { gold: 3000 }, content: 'random_material' },
  { id: 'shop_legend_equip', name: '전설 장비 상자', icon: '📦🌟', price: { diamonds: 80 }, content: 'random_equip_legend' },
  { id: 'shop_enhance_scroll', name: '강화 보호 주문서', icon: '📜🛡️', price: { diamonds: 20 }, content: { enhanceProtect: 1 }, desc: '강화 실패 시 레벨 유지' },
  { id: 'shop_skill_reset', name: '스킬 초기화', icon: '🔄', price: { diamonds: 15 }, content: { skillReset: true }, desc: '카드 스킬 전부 제거' },
];

function buyShopItem(player, itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: '상품 없음' };
  if (item.price.gold && (player.gold || 0) < item.price.gold) return { ok: false, reason: '골드 부족' };
  if (item.price.diamonds && (player.diamonds || 0) < item.price.diamonds) return { ok: false, reason: '다이아 부족' };

  if (item.price.gold) player.gold -= item.price.gold;
  if (item.price.diamonds) player.diamonds -= item.price.diamonds;

  let reward = null;
  if (typeof item.content === 'string' && item.content.startsWith('random_equip')) {
    const grade = item.content.split('_')[2] || 'normal';
    const slots = Object.keys(EQUIPMENT_POOL);
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const pool = EQUIPMENT_POOL[slot].filter(e => e.grade === grade || (grade === 'normal'));
    reward = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    if (reward) {
      player.equipment = player.equipment || [];
      player.equipment.push({ ...reward, uid: `eq_${Date.now()}` });
    }
  } else if (item.content === 'random_material') {
    player.materials = player.materials || {};
    const mat = MATERIAL_POOL[Math.floor(Math.random() * MATERIAL_POOL.length)];
    const count = 1 + Math.floor(Math.random() * 3); // 1~3개
    player.materials[mat] = (player.materials[mat] || 0) + count;
    reward = { material: mat, count };
  } else if (item.content === 'random_skill') {
    const pool = SKILLS.filter(s => s.grade !== 'myth');
    reward = pool[Math.floor(Math.random() * pool.length)];
    if (reward) {
      player.skillScrolls = player.skillScrolls || [];
      player.skillScrolls.push({ ...reward, uid: `sk_${Date.now()}` });
    }
  } else if (typeof item.content === 'object') {
    if (item.content.gold) player.gold = (player.gold || 0) + item.content.gold;
    if (item.content.diamonds) player.diamonds = (player.diamonds || 0) + item.content.diamonds;
    if (item.content.reviveTicket) player.reviveTickets = (player.reviveTickets || 0) + item.content.reviveTicket;
    if (item.content.enhanceProtect) player.enhanceProtects = (player.enhanceProtects || 0) + item.content.enhanceProtect;
    if (item.content.skillReset) reward = { skillReset: true };
    reward = reward || item.content;
  }

  return { ok: true, msg: `구매: ${item.name}`, reward };
}

// ═══ 5. 카드에 장비/스킬 장착 ═══
function equipToCard(player, cardId, equipUid) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };
  const equip = (player.equipment || []).find(e => e.uid === equipUid);
  if (!equip) return { ok: false, reason: '장비 없음' };

  card.equipment = card.equipment || {};
  // 기존 장비 반환
  const slotKey = EQUIPMENT_SLOTS.find(s => EQUIPMENT_POOL[s]?.some(e => e.id === equip.id)) || 'accessory';
  if (card.equipment[slotKey]) {
    player.equipment.push(card.equipment[slotKey]); // 기존 장비 인벤토리로
  }
  card.equipment[slotKey] = equip;
  player.equipment = player.equipment.filter(e => e.uid !== equipUid);

  return { ok: true, msg: `${card.name}에 ${equip.name} 장착!` };
}

function learnSkill(player, cardId, skillUid) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };
  const skill = (player.skillScrolls || []).find(s => s.uid === skillUid);
  if (!skill) return { ok: false, reason: '스킬 두루마리 없음' };

  card.skills = card.skills || [];
  if (card.skills.length >= 3) return { ok: false, reason: '스킬 슬롯 최대 3개' };
  card.skills.push(skill);
  player.skillScrolls = player.skillScrolls.filter(s => s.uid !== skillUid);

  return { ok: true, msg: `${card.name}에 "${skill.name}" 스킬 학습!` };
}

// ═══ 6. IO 보상 → 카드 연동 ═══
function applyIORewardToCards(player, ioResult) {
  const expGain = Math.floor((ioResult.survivalTime || 60) * 0.5 + (ioResult.kills || 0) * 20);
  const goldGain = Math.floor((ioResult.rank <= 3 ? 3000 : ioResult.rank <= 10 ? 1500 : 500) + (ioResult.kills || 0) * 100);

  // 파티 카드에 경험치 분배
  const partyIds = player.ioParty || [];
  const partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
  const expPerCard = partyCards.length > 0 ? Math.floor(expGain / partyCards.length) : 0;

  partyCards.forEach(c => {
    c.exp = (c.exp || 0) + expPerCard;
    const reqExp = (c.level || 1) * 100;
    while (c.exp >= reqExp) {
      c.exp -= reqExp;
      c.level = (c.level || 1) + 1;
      c.atk = Math.floor((c.atk || 30) * 1.03);
      c.def = Math.floor((c.def || 20) * 1.02);
      c.hp = Math.floor((c.hp || 200) * 1.02);
    }
  });

  player.gold = (player.gold || 0) + goldGain;

  return { expGain, goldGain, expPerCard, levelUps: partyCards.filter(c => c.exp === 0).length };
}

function register(io, socket, player) {
  // 장비 장착
  socket.on('card_equip', (data) => {
    const result = equipToCard(player, data.cardId, data.equipUid);
    socket.emit('card_equip_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 스킬 학습
  socket.on('card_learn_skill', (data) => {
    const result = learnSkill(player, data.cardId, data.skillUid);
    socket.emit('card_learn_skill_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 파티 편성
  socket.on('card_set_party', (data) => {
    const result = setParty(player, data.cardIds);
    socket.emit('card_set_party_result', result);
  });

  // 상점
  socket.on('shop_list', () => {
    socket.emit('shop_list', { items: SHOP_ITEMS, equipment: player.equipment || [], skills: player.skillScrolls || [] });
  });
  socket.on('shop_buy', (data) => {
    const result = buyShopItem(player, data.itemId);
    socket.emit('shop_buy_result', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      socket.emit('shop_list', { items: SHOP_ITEMS, equipment: player.equipment || [], skills: player.skillScrolls || [] });
    }
  });

  // 장비 강화
  socket.on('equip_enhance', (data) => {
    const result = enhanceEquipment(player, data.equipUid, data.useProtect);
    socket.emit('equip_enhance_result', result);
    if (result.ok || result.level !== undefined) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // 장비 제작
  socket.on('equip_craft', (data) => {
    const result = craftEquipment(player, data.recipeIndex);
    socket.emit('equip_craft_result', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      socket.emit('shop_list', { items: SHOP_ITEMS, equipment: player.equipment || [], skills: player.skillScrolls || [] });
    }
  });

  // 장비 분해
  socket.on('equip_disassemble', (data) => {
    const result = disassembleEquipment(player, data.equipUid);
    socket.emit('equip_disassemble_result', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // 자동 장착
  socket.on('equip_auto', (data) => {
    const result = autoEquipBest(player, data.cardId);
    socket.emit('equip_auto_result', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // 세트 보너스 확인
  socket.on('card_set_check', (data) => {
    const card = (player.cards || []).find(c => c.id === data.cardId);
    const sets = checkSetBonus(card);
    socket.emit('card_set_check_result', { cardId: data.cardId, sets });
  });

  // 스킬 콤보 확인
  socket.on('card_skill_combo_check', (data) => {
    const card = (player.cards || []).find(c => c.id === data.cardId);
    const combos = checkSkillCombos(card);
    socket.emit('card_skill_combo_check_result', { cardId: data.cardId, combos });
  });

  // IO 보상 연동
  socket.on('io_reward_apply', (data) => {
    const result = applyIORewardToCards(player, data);
    socket.emit('io_reward_applied', result);
    socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });
}

module.exports = {
  EQUIPMENT_POOL, EQUIPMENT_SETS, SKILLS, SKILL_COMBOS, SHOP_ITEMS, MAX_PARTY,
  ENHANCE_COSTS, ENHANCE_RATES, CRAFT_RECIPES, MATERIAL_POOL, GRADE_MATERIAL_COUNT,
  equipToCard, learnSkill, setParty, buyShopItem, applyIORewardToCards,
  enhanceEquipment, checkSetBonus, checkSkillCombos,
  craftEquipment, disassembleEquipment, autoEquipBest,
  register,
};

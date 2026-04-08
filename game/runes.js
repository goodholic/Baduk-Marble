// 룬 시스템 — v1.49
// 무기/방어구 슬롯에 장착하는 영구 강화석
// 12종 룬 × 3등급 = 36 종류
// 등급별 효과 배수: 일반 ×1, 고급 ×2, 전설 ×4
// 룬 워드 (특정 조합 3개 장착 시 추가 보너스)

const RUNE_TYPES = {
  // 공격형
  vigor: { name:'활력', symbol:'⚡', stat:'atk', value:10, slot:'weapon' },
  fury:  { name:'분노', symbol:'🔥', stat:'critRate', value:0.05, slot:'weapon' },
  pierce:{ name:'관통', symbol:'🗡️', stat:'pierce', value:0.10, slot:'weapon' },
  // 방어형
  guard: { name:'수호', symbol:'🛡️', stat:'def', value:8, slot:'armor' },
  vital: { name:'생명', symbol:'❤️', stat:'hp', value:50, slot:'armor' },
  ward:  { name:'방벽', symbol:'⛨', stat:'dmgReduce', value:0.04, slot:'armor' },
  // 유틸형
  swift: { name:'질풍', symbol:'💨', stat:'speed', value:2, slot:'boots' },
  fortune:{ name:'행운', symbol:'🍀', stat:'goldBonus', value:0.08, slot:'helmet' },
  wisdom:{ name:'지혜', symbol:'📚', stat:'expBonus', value:0.08, slot:'helmet' },
  // 특수형
  drain: { name:'흡혈', symbol:'🩸', stat:'lifesteal', value:0.05, slot:'weapon' },
  thorns:{ name:'가시', symbol:'🌵', stat:'reflect', value:0.10, slot:'armor' },
  haste: { name:'신속', symbol:'⏩', stat:'atkSpeed', value:0.08, slot:'weapon' },
};

const RUNE_GRADES = {
  common:    { name:'일반', color:'#cccccc', multi:1 },
  rare:      { name:'고급', color:'#4488ff', multi:2 },
  legendary: { name:'전설', color:'#ff8800', multi:4 },
};

// 룬 워드 (특정 룬 3개 동시 장착 시 추가 보너스)
const RUNE_WORDS = {
  warrior: {
    name: '전사의 인장',
    runes: ['vigor', 'fury', 'haste'],
    bonus: { atk: 30, critRate: 0.10, atkSpeed: 0.15 },
    desc: '근접 전투의 정수',
  },
  guardian: {
    name: '수호자의 결속',
    runes: ['guard', 'vital', 'ward'],
    bonus: { def: 25, hp: 200, dmgReduce: 0.10 },
    desc: '난공불락의 방어',
  },
  scholar: {
    name: '학자의 지혜',
    runes: ['wisdom', 'fortune', 'swift'],
    bonus: { expBonus: 0.20, goldBonus: 0.20, speed: 5 },
    desc: '탐험과 성장의 길',
  },
  vampire: {
    name: '흡혈귀의 갈증',
    runes: ['drain', 'fury', 'pierce'],
    bonus: { lifesteal: 0.10, critRate: 0.05, pierce: 0.15 },
    desc: '피를 마시는 자의 권능',
  },
};

const RUNE_CONFIG = {
  maxSocketsPerEquip: 3,
  craftCostBase: 1000,
  craftMatRequired: 'mat_magic',
  craftMatPerGrade: { common: 5, rare: 15, legendary: 50 },
  upgradeChance: { common: 1.0, rare: 0.6, legendary: 0.25 }, // 등급 상승 확률
};

function _ensure(player) {
  if (!player.runes) player.runes = { inventory: [], sockets: {} };
  // sockets: { equipSlot: [runeId, runeId, runeId] }
  return player.runes;
}

let runeIdCounter = 1;

function craftRune(player, runeType, grade = 'common') {
  if (!RUNE_TYPES[runeType]) return { success: false, msg: '존재하지 않는 룬 종류' };
  if (!RUNE_GRADES[grade]) return { success: false, msg: '존재하지 않는 등급' };

  const goldCost = RUNE_CONFIG.craftCostBase * RUNE_GRADES[grade].multi;
  const matCost = RUNE_CONFIG.craftMatPerGrade[grade];
  if ((player.gold || 0) < goldCost) return { success: false, msg: `골드 ${goldCost} 필요` };
  if (!player.inventory) player.inventory = {};
  if ((player.inventory[RUNE_CONFIG.craftMatRequired] || 0) < matCost) {
    return { success: false, msg: `${RUNE_CONFIG.craftMatRequired} ${matCost}개 필요` };
  }

  player.gold -= goldCost;
  player.inventory[RUNE_CONFIG.craftMatRequired] -= matCost;
  if (player.inventory[RUNE_CONFIG.craftMatRequired] <= 0) {
    delete player.inventory[RUNE_CONFIG.craftMatRequired];
  }

  // 등급 상승 보너스 (확률 실패 시 한 단계 낮춤)
  let finalGrade = grade;
  if (Math.random() > RUNE_CONFIG.upgradeChance[grade]) {
    if (grade === 'legendary') finalGrade = 'rare';
    else if (grade === 'rare') finalGrade = 'common';
  }

  const r = _ensure(player);
  const runeInstance = {
    id: `rune_${runeIdCounter++}`,
    type: runeType,
    grade: finalGrade,
    name: RUNE_TYPES[runeType].name,
    grade_name: RUNE_GRADES[finalGrade].name,
  };
  r.inventory.push(runeInstance);

  return {
    success: true,
    rune: runeInstance,
    expectedGrade: grade,
    actualGrade: finalGrade,
    downgraded: finalGrade !== grade,
  };
}

function socketRune(player, runeId, equipSlot) {
  const r = _ensure(player);
  const runeIdx = r.inventory.findIndex(rn => rn.id === runeId);
  if (runeIdx < 0) return { success: false, msg: '보유하지 않은 룬' };
  const rune = r.inventory[runeIdx];
  const required = RUNE_TYPES[rune.type].slot;
  if (required !== equipSlot) {
    return { success: false, msg: `이 룬은 ${required} 슬롯 전용` };
  }
  if (!r.sockets[equipSlot]) r.sockets[equipSlot] = [];
  if (r.sockets[equipSlot].length >= RUNE_CONFIG.maxSocketsPerEquip) {
    return { success: false, msg: `${equipSlot} 슬롯 가득 (${RUNE_CONFIG.maxSocketsPerEquip}개)` };
  }
  r.sockets[equipSlot].push(rune);
  r.inventory.splice(runeIdx, 1);
  return { success: true };
}

function unsocketRune(player, equipSlot, socketIdx) {
  const r = _ensure(player);
  if (!r.sockets[equipSlot] || !r.sockets[equipSlot][socketIdx]) {
    return { success: false, msg: '해당 슬롯에 룬 없음' };
  }
  const rune = r.sockets[equipSlot].splice(socketIdx, 1)[0];
  r.inventory.push(rune);
  return { success: true };
}

function getRuneBonus(player, stat) {
  const r = _ensure(player);
  let total = 0;
  for (const slot of Object.values(r.sockets)) {
    for (const rune of slot) {
      const def = RUNE_TYPES[rune.type];
      if (def.stat === stat) {
        total += def.value * RUNE_GRADES[rune.grade].multi;
      }
    }
  }
  return total;
}

function getActiveRuneWords(player) {
  const r = _ensure(player);
  // 모든 장착된 룬 종류 (중복 제외)
  const equippedTypes = new Set();
  for (const slot of Object.values(r.sockets)) {
    for (const rune of slot) equippedTypes.add(rune.type);
  }
  // 어떤 룬 워드가 활성?
  const active = [];
  for (const [wordId, word] of Object.entries(RUNE_WORDS)) {
    if (word.runes.every(rt => equippedTypes.has(rt))) {
      active.push({ id: wordId, ...word });
    }
  }
  return active;
}

function getRuneWordBonus(player, stat) {
  const active = getActiveRuneWords(player);
  let total = 0;
  for (const word of active) {
    total += word.bonus[stat] || 0;
  }
  return total;
}

function getStatus(player) {
  const r = _ensure(player);
  return {
    inventory: r.inventory,
    sockets: r.sockets,
    activeWords: getActiveRuneWords(player),
    runeTypes: RUNE_TYPES,
    runeGrades: RUNE_GRADES,
    runeWords: RUNE_WORDS,
    config: RUNE_CONFIG,
  };
}

module.exports = {
  RUNE_TYPES,
  RUNE_GRADES,
  RUNE_WORDS,
  RUNE_CONFIG,
  craftRune,
  socketRune,
  unsocketRune,
  getRuneBonus,
  getActiveRuneWords,
  getRuneWordBonus,
  getStatus,
};

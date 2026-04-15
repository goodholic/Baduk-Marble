// ============================================
// 펫 동반자 — 카드에 배치, 함께 전투, 성장
// ============================================

const PETS = [
  { id: 'pet_cat', name: '고양이🐱', grade: 'normal', baseAtk: 5, baseDef: 3, baseHp: 30, skill: '할퀴기', ability: { critRate: 0.03 }, desc: '민첩한 고양이. 크리율 UP.' },
  { id: 'pet_dog', name: '강아지🐕', grade: 'normal', baseAtk: 4, baseDef: 5, baseHp: 40, skill: '물기', ability: { loyalty: 0.05 }, desc: '충성스러운 강아지. 경험치 UP.' },
  { id: 'pet_hawk', name: '매🦅', grade: 'rare', baseAtk: 8, baseDef: 2, baseHp: 25, skill: '급강하', ability: { atk: 0.05 }, desc: '날카로운 매. ATK UP.' },
  { id: 'pet_wolf', name: '늑대🐺', grade: 'rare', baseAtk: 10, baseDef: 5, baseHp: 35, skill: '포효', ability: { teamAtk: 0.03 }, desc: '야생 늑대. 팀 ATK UP.' },
  { id: 'pet_bear', name: '곰🐻', grade: 'rare', baseAtk: 7, baseDef: 10, baseHp: 60, skill: '강타', ability: { def: 0.05 }, desc: '든든한 곰. DEF UP.' },
  { id: 'pet_fox', name: '여우🦊', grade: 'epic', baseAtk: 12, baseDef: 6, baseHp: 40, skill: '환혹', ability: { eva: 0.05, gold: 0.1 }, desc: '영리한 여우. 회피+골드 UP.' },
  { id: 'pet_phoenix', name: '불사조🔥🐦', grade: 'epic', baseAtk: 15, baseDef: 8, baseHp: 50, skill: '화염날개', ability: { fireDmg: 0.1, revive: 0.1 }, desc: '불사조. 화염 DMG+부활 확률.' },
  { id: 'pet_unicorn', name: '유니콘🦄', grade: 'epic', baseAtk: 8, baseDef: 10, baseHp: 55, skill: '성스러운 빛', ability: { healPow: 0.1, purify: true }, desc: '치유의 유니콘. 힐 UP+정화.' },
  { id: 'pet_dragon', name: '드래곤🐲', grade: 'legend', baseAtk: 20, baseDef: 12, baseHp: 70, skill: '브레스', ability: { allStat: 0.05, fireDmg: 0.15 }, desc: '전설의 용. 전 스탯 UP.' },
  { id: 'pet_angel', name: '천사🕊️', grade: 'legend', baseAtk: 12, baseDef: 15, baseHp: 80, skill: '신성보호', ability: { def: 0.08, healPow: 0.15 }, desc: '수호 천사. DEF+치유 UP.' },
  { id: 'pet_shadow', name: '그림자🌑', grade: 'legend', baseAtk: 25, baseDef: 5, baseHp: 40, skill: '암습', ability: { critRate: 0.1, critDmg: 0.2 }, desc: '그림자. 크리 특화.' },
  { id: 'pet_spirit_king', name: '정령왕👑🌀', grade: 'myth', baseAtk: 30, baseDef: 20, baseHp: 100, skill: '원소 폭풍', ability: { allStat: 0.1, elementAll: 0.15 }, desc: '신화의 정령왕. 모든 보너스.' },
];

const PET_FOOD = [
  { id: 'food_basic', name: '기본 먹이', icon: '🍖', exp: 50, cost: 500 },
  { id: 'food_premium', name: '고급 먹이', icon: '🥩', exp: 200, cost: 2000 },
  { id: 'food_legendary', name: '전설 먹이', icon: '🍗✨', exp: 1000, cost: 10000 },
];

// Pet level scaling: level * baseStats * 0.1 bonus per level
// Max level: 20
const PET_MAX_LEVEL = 20;

// Grade weights for summon
const GRADE_WEIGHTS = {
  normal: 40,
  rare:   30,
  epic:   20,
  legend: 8,
  myth:   2,
};

// Grade hierarchy for evolution
const GRADE_ORDER = ['normal', 'rare', 'epic', 'legend', 'myth'];

// ── 유틸 ─────────────────────────────────────

function _ensurePets(player) {
  if (!player.pets) player.pets = [];
}

function _findPet(player, petId) {
  _ensurePets(player);
  return player.pets.find(p => p.uid === petId);
}

function _weightedRandom() {
  const total = Object.values(GRADE_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [grade, w] of Object.entries(GRADE_WEIGHTS)) {
    r -= w;
    if (r <= 0) return grade;
  }
  return 'normal';
}

function _nextUid() {
  return 'pet_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

// ── getPetLevel ──────────────────────────────

function getPetLevel(pet) {
  if (!pet || !pet.exp) return 1;
  let level = 1;
  let needed = 100; // level 1→2 needs 100
  let totalNeeded = 0;
  while (level < PET_MAX_LEVEL) {
    totalNeeded += needed;
    if (pet.exp < totalNeeded) break;
    level++;
    needed = level * 100;
  }
  return level;
}

function _expForLevel(level) {
  // total EXP needed to reach this level
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += l * 100;
  }
  return total;
}

// ── 스탯 계산 ────────────────────────────────

function _calcPetStats(pet) {
  const template = PETS.find(p => p.id === pet.templateId);
  if (!template) return { atk: 0, def: 0, hp: 0 };
  const level = getPetLevel(pet);
  const mult = 1 + (level - 1) * 0.1;
  return {
    atk: Math.floor(template.baseAtk * mult),
    def: Math.floor(template.baseDef * mult),
    hp:  Math.floor(template.baseHp * mult),
    level,
    skill: template.skill,
  };
}

// ── summonPet ────────────────────────────────

function summonPet(player) {
  const SUMMON_COST = 1000;
  if ((player.gold ?? 0) < SUMMON_COST) {
    return { ok: false, reason: '골드가 부족합니다. (필요: 1000G)' };
  }
  player.gold -= SUMMON_COST;
  _ensurePets(player);

  const grade = _weightedRandom();
  const candidates = PETS.filter(p => p.grade === grade);
  const template = candidates[Math.floor(Math.random() * candidates.length)];

  const pet = {
    uid: _nextUid(),
    templateId: template.id,
    name: template.name,
    grade: template.grade,
    exp: 0,
    assignedTo: null,
  };

  player.pets.push(pet);
  const stats = _calcPetStats(pet);

  return {
    ok: true,
    pet: { ...pet, ...stats, ability: template.ability, desc: template.desc },
    goldLeft: player.gold,
  };
}

// ── assignPetToCard ──────────────────────────

function assignPetToCard(player, petId, cardId) {
  _ensurePets(player);
  const pet = _findPet(player, petId);
  if (!pet) return { ok: false, reason: '펫을 찾을 수 없습니다.' };

  // Check card exists
  const cards = player.cards || player.mercenaries || [];
  const card = cards.find(c => (c.uid || c.id) === cardId);
  if (!card) return { ok: false, reason: '카드를 찾을 수 없습니다.' };

  // Check if card already has a pet
  const existing = player.pets.find(p => p.assignedTo === cardId);
  if (existing && existing.uid !== petId) {
    return { ok: false, reason: '이 카드에 이미 다른 펫이 배치되어 있습니다. 먼저 해제하세요.' };
  }

  // Unassign from previous card if any
  if (pet.assignedTo && pet.assignedTo !== cardId) {
    pet.assignedTo = null;
  }

  pet.assignedTo = cardId;
  return { ok: true, petId: pet.uid, cardId, name: pet.name };
}

// ── removePetFromCard ────────────────────────

function removePetFromCard(player, petId) {
  const pet = _findPet(player, petId);
  if (!pet) return { ok: false, reason: '펫을 찾을 수 없습니다.' };
  if (!pet.assignedTo) return { ok: false, reason: '이 펫은 카드에 배치되어 있지 않습니다.' };

  const prevCard = pet.assignedTo;
  pet.assignedTo = null;
  return { ok: true, petId: pet.uid, removedFrom: prevCard };
}

// ── feedPet ──────────────────────────────────

function feedPet(player, petId, foodId) {
  const pet = _findPet(player, petId);
  if (!pet) return { ok: false, reason: '펫을 찾을 수 없습니다.' };

  const food = PET_FOOD.find(f => f.id === foodId);
  if (!food) return { ok: false, reason: '유효하지 않은 먹이입니다.' };

  if ((player.gold ?? 0) < food.cost) {
    return { ok: false, reason: `골드가 부족합니다. (필요: ${food.cost}G)` };
  }

  const prevLevel = getPetLevel(pet);
  if (prevLevel >= PET_MAX_LEVEL) {
    return { ok: false, reason: '이미 최대 레벨입니다.' };
  }

  player.gold -= food.cost;
  pet.exp = (pet.exp || 0) + food.exp;

  const newLevel = getPetLevel(pet);
  const stats = _calcPetStats(pet);
  const leveledUp = newLevel > prevLevel;

  return {
    ok: true,
    petId: pet.uid,
    foodUsed: food.name,
    expGained: food.exp,
    totalExp: pet.exp,
    level: newLevel,
    leveledUp,
    stats,
    goldLeft: player.gold,
  };
}

// ── evolvePet ────────────────────────────────

function evolvePet(player, petId) {
  _ensurePets(player);
  const pet = _findPet(player, petId);
  if (!pet) return { ok: false, reason: '펫을 찾을 수 없습니다.' };

  const level = getPetLevel(pet);
  if (level < 10) {
    return { ok: false, reason: `레벨 10 이상이어야 진화할 수 있습니다. (현재: ${level})` };
  }

  const gradeIdx = GRADE_ORDER.indexOf(pet.grade);
  if (gradeIdx < 0 || gradeIdx >= GRADE_ORDER.length - 1) {
    return { ok: false, reason: '이미 최고 등급이거나 진화할 수 없습니다.' };
  }

  // Need another same-grade pet as material (not assigned to a card)
  const material = player.pets.find(
    p => p.uid !== petId && p.grade === pet.grade && !p.assignedTo
  );
  if (!material) {
    return { ok: false, reason: `같은 등급(${pet.grade})의 미배치 펫이 필요합니다.` };
  }

  // Remove material
  player.pets = player.pets.filter(p => p.uid !== material.uid);

  // Upgrade grade
  const newGrade = GRADE_ORDER[gradeIdx + 1];
  const newCandidates = PETS.filter(p => p.grade === newGrade);
  const newTemplate = newCandidates[Math.floor(Math.random() * newCandidates.length)];

  // Transform the pet
  pet.templateId = newTemplate.id;
  pet.name = newTemplate.name;
  pet.grade = newTemplate.grade;
  pet.exp = 0; // reset EXP on evolution

  const stats = _calcPetStats(pet);

  return {
    ok: true,
    evolved: { ...pet, ...stats, ability: newTemplate.ability, desc: newTemplate.desc },
    consumed: { uid: material.uid, name: material.name },
  };
}

// ── getPetList ────────────────────────────────

function getPetList(player) {
  _ensurePets(player);
  return player.pets.map(pet => {
    const template = PETS.find(p => p.id === pet.templateId);
    const stats = _calcPetStats(pet);
    return {
      uid: pet.uid,
      templateId: pet.templateId,
      name: pet.name,
      grade: pet.grade,
      exp: pet.exp || 0,
      level: stats.level,
      atk: stats.atk,
      def: stats.def,
      hp: stats.hp,
      skill: stats.skill,
      ability: template ? template.ability : {},
      desc: template ? template.desc : '',
      assignedTo: pet.assignedTo,
    };
  });
}

// ── getPetBonuses ────────────────────────────

function getPetBonuses(card, player) {
  if (!player || !player.pets) return {};
  const cardId = card.uid || card.id;
  const pet = player.pets.find(p => p.assignedTo === cardId);
  if (!pet) return {};

  const template = PETS.find(p => p.id === pet.templateId);
  if (!template) return {};

  const level = getPetLevel(pet);
  const levelMult = 1 + (level - 1) * 0.05; // bonuses scale slightly with level
  const bonuses = {};

  for (const [key, val] of Object.entries(template.ability)) {
    if (typeof val === 'number') {
      bonuses[key] = +(val * levelMult).toFixed(4);
    } else {
      bonuses[key] = val; // booleans like purify
    }
  }

  // Also add pet combat stats
  const stats = _calcPetStats(pet);
  bonuses.petAtk = stats.atk;
  bonuses.petDef = stats.def;
  bonuses.petHp = stats.hp;
  bonuses.petSkill = stats.skill;
  bonuses.petName = pet.name;
  bonuses.petLevel = level;

  return bonuses;
}

// ── Socket 이벤트 등록 ──────────────────────

function register(io, socket, player) {

  socket.on('pet_list', (_, ack) => {
    const list = getPetList(player);
    const res = { ok: true, pets: list, foodOptions: PET_FOOD };
    if (typeof ack === 'function') ack(res);
    else socket.emit('pet_list', res);
  });

  socket.on('pet_summon', (_, ack) => {
    const result = summonPet(player);
    if (typeof ack === 'function') ack(result);
    else socket.emit('pet_summon', result);
  });

  socket.on('pet_assign', (data, ack) => {
    const { petId, cardId } = data || {};
    const result = assignPetToCard(player, petId, cardId);
    if (typeof ack === 'function') ack(result);
    else socket.emit('pet_assign', result);
  });

  socket.on('pet_remove', (data, ack) => {
    const { petId } = data || {};
    const result = removePetFromCard(player, petId);
    if (typeof ack === 'function') ack(result);
    else socket.emit('pet_remove', result);
  });

  socket.on('pet_feed', (data, ack) => {
    const { petId, foodId } = data || {};
    const result = feedPet(player, petId, foodId);
    if (typeof ack === 'function') ack(result);
    else socket.emit('pet_feed', result);
  });

  socket.on('pet_evolve', (data, ack) => {
    const { petId } = data || {};
    const result = evolvePet(player, petId);
    if (typeof ack === 'function') ack(result);
    else socket.emit('pet_evolve', result);
  });
}

// ── exports ──────────────────────────────────

module.exports = {
  PETS,
  PET_FOOD,
  PET_MAX_LEVEL,
  summonPet,
  assignPetToCard,
  removePetFromCard,
  feedPet,
  getPetLevel,
  evolvePet,
  getPetList,
  getPetBonuses,
  register,
};

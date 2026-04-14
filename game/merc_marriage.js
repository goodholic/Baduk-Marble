// v5.3 — 용병 결혼/결합 시스템
// 친밀도 최대 용병끼리 결혼 → 2세대 자녀 용병 탄생 + 부부 시너지

const MARRIAGE_REQ_INTIMACY = 100;
const CHILD_INHERIT_RATE = 0.7; // 부모 스탯의 70% 계승

// 결혼 의식 종류
const WEDDING_TYPES = {
  simple:    { name: '소박한 결혼', icon: '💍', cost: 5000, bonus: { atk: 1.05, def: 1.05 }, desc: '기본 결혼, 소박한 축복' },
  grand:     { name: '성대한 결혼', icon: '💒', cost: 30000, bonus: { atk: 1.1, def: 1.1, hp: 1.05 }, desc: '화려한 결혼식, 강한 축복' },
  royal:     { name: '왕실 결혼', icon: '👑💍', cost: 100000, bonus: { atk: 1.15, def: 1.15, hp: 1.1, allStat: 1.03 }, desc: '왕실급 결혼, 최강 축복' },
  forbidden: { name: '금지된 결합', icon: '💜🖤', cost: 50000, bonus: { atk: 1.25, def: 0.9 }, desc: '원수 관계에서만 가능, 강력하지만 불안정', special: 'rivalry_only' },
};

// 부부 시너지 스킬
const COUPLE_SKILLS = [
  { id: 'united_front', name: '합심 공격', desc: '부부 동시 공격 시 데미지 1.5배', trigger: 'same_target' },
  { id: 'protective_love', name: '사랑의 방패', desc: '배우자 HP 30% 이하 시 자동으로 대신 피격', trigger: 'spouse_low_hp' },
  { id: 'love_heal', name: '사랑의 치유', desc: '매 30초 서로 HP 10% 회복', trigger: 'passive' },
  { id: 'dual_ultimate', name: '부부 합체기', desc: '둘의 궁극기를 합친 초강력 공격', trigger: 'both_ultimate_ready' },
];

// 자녀 용병 특성
const CHILD_TRAITS = [
  { id: 'prodigy', name: '천재', chance: 0.1, effect: 'EXP 획득 2배', desc: '부모의 재능을 뛰어넘는 천재' },
  { id: 'mixed_blood', name: '혼혈', chance: 0.15, effect: '부모 양쪽 클래스 스킬 사용', desc: '두 클래스의 장점을 모두 가짐' },
  { id: 'rebellious', name: '반항아', chance: 0.1, effect: '랜덤 스탯 1개 부모 초과 (+20%)', desc: '한 분야에서 부모를 뛰어넘음' },
  { id: 'blessed', name: '축복받은 아이', chance: 0.05, effect: '전체 스탯 +10%', desc: '결혼 축복이 아이에게' },
  { id: 'cursed', name: '저주받은 아이', chance: 0.03, effect: '전체 스탯 +25%, 친밀도 하락 빠름', desc: '금지된 결합의 결과' },
];

function canMarry(player, mercIdA, mercIdB) {
  const mercs = player.mercenaries || [];
  const a = mercs.find(m => m.id === mercIdA);
  const b = mercs.find(m => m.id === mercIdB);
  if (!a || !b) return { ok: false, reason: '용병 없음' };
  if (a.married || b.married) return { ok: false, reason: '이미 결혼함' };

  const bonds = player.mercBonds || {};
  const key = [mercIdA, mercIdB].sort().join(':');
  const bond = bonds[key];
  if (!bond || bond.points < MARRIAGE_REQ_INTIMACY) return { ok: false, reason: `친밀도 ${MARRIAGE_REQ_INTIMACY} 필요 (현재: ${bond?.points || 0})` };

  return { ok: true, mercA: a.name, mercB: b.name, bondType: bond.type };
}

function marry(player, mercIdA, mercIdB, weddingType) {
  const check = canMarry(player, mercIdA, mercIdB);
  if (!check.ok) return check;

  const wedding = WEDDING_TYPES[weddingType] || WEDDING_TYPES.simple;
  if (wedding.special === 'rivalry_only' && check.bondType !== 'hatred' && check.bondType !== 'rivalry') {
    return { ok: false, reason: '금지된 결합은 원수/라이벌 관계에서만 가능' };
  }
  if ((player.gold || 0) < wedding.cost) return { ok: false, reason: '골드 부족' };

  player.gold -= wedding.cost;
  const mercs = player.mercenaries || [];
  const a = mercs.find(m => m.id === mercIdA);
  const b = mercs.find(m => m.id === mercIdB);

  a.married = mercIdB; a.weddingType = weddingType; a.coupleBonus = wedding.bonus;
  b.married = mercIdA; b.weddingType = weddingType; b.coupleBonus = wedding.bonus;

  // 자녀 용병 생성
  const child = createChild(a, b, wedding);

  mercs.push(child);
  return { ok: true, couple: [a.name, b.name], wedding: wedding.name, child };
}

function createChild(parentA, parentB, wedding) {
  const avgStat = (statA, statB) => Math.floor(((statA || 50) + (statB || 50)) / 2 * CHILD_INHERIT_RATE);

  // 자녀 특성 결정
  const traits = [];
  for (const t of CHILD_TRAITS) {
    if (Math.random() < t.chance) traits.push(t);
  }

  const child = {
    id: `child_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${parentA.name}Jr`,
    class: Math.random() < 0.5 ? parentA.class : parentB.class,
    grade: parentA.grade || 'rare',
    level: 1,
    generation: Math.max(parentA.generation || 1, parentB.generation || 1) + 1,
    hp: avgStat(parentA.hp, parentB.hp),
    atk: avgStat(parentA.atk, parentB.atk),
    def: avgStat(parentA.def, parentB.def),
    spd: Math.floor(((parentA.spd || 5) + (parentB.spd || 5)) / 2),
    parents: [parentA.name, parentB.name],
    childTraits: traits,
    emotion: 'joy',
    born: Date.now(),
    isChild: true,
  };

  // 특성 적용
  for (const t of traits) {
    if (t.id === 'blessed') { child.hp = Math.floor(child.hp * 1.1); child.atk = Math.floor(child.atk * 1.1); child.def = Math.floor(child.def * 1.1); }
    if (t.id === 'cursed') { child.hp = Math.floor(child.hp * 1.25); child.atk = Math.floor(child.atk * 1.25); child.def = Math.floor(child.def * 1.25); }
    if (t.id === 'rebellious') {
      const stats = ['hp', 'atk', 'def'];
      const pick = stats[Math.floor(Math.random() * stats.length)];
      child[pick] = Math.floor(child[pick] * 1.2);
    }
  }

  return child;
}

function register(io, socket, player) {
  socket.on('merc_marriage_check', (data) => {
    const result = canMarry(player, data.mercA, data.mercB);
    socket.emit('merc_marriage_check', result);
  });

  socket.on('merc_marriage_execute', (data) => {
    const result = marry(player, data.mercA, data.mercB, data.weddingType);
    socket.emit('merc_marriage_result', result);
    if (result.ok) {
      io.emit('server_msg', `💍 [결혼] ${result.couple[0]}와 ${result.couple[1]}이(가) ${result.wedding}! 2세대 자녀 "${result.child.name}" 탄생!`);
    }
  });

  socket.on('merc_marriage_info', () => {
    socket.emit('merc_marriage_info', { weddings: WEDDING_TYPES, coupleSkills: COUPLE_SKILLS, childTraits: CHILD_TRAITS });
  });
}

module.exports = { WEDDING_TYPES, COUPLE_SKILLS, CHILD_TRAITS, MARRIAGE_REQ_INTIMACY, canMarry, marry, register };

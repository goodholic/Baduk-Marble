// 변신 시스템 — v2.01
// 몬스터 에센스를 모아 일시적으로 변신 — 스탯/외형 변화
// 에센스는 일반적으로 몬스터 처치로 획득 (서버 측에서 grantEssence 호출)

const FORMS = {
  wolf: {
    name:'늑대', icon:'🐺',
    essenceCost: 3,
    durationMin: 5,
    stats:{ atk: 8, evasion: 5 },
    desc:'민첩한 야수의 형상',
  },
  bear: {
    name:'곰', icon:'🐻',
    essenceCost: 5,
    durationMin: 5,
    stats:{ maxHp: 80, def: 10 },
    desc:'거대하고 우직한 형상',
  },
  eagle: {
    name:'독수리', icon:'🦅',
    essenceCost: 4,
    durationMin: 4,
    stats:{ crit: 8, evasion: 8 },
    desc:'하늘을 가르는 형상',
  },
  serpent: {
    name:'뱀', icon:'🐍',
    essenceCost: 4,
    durationMin: 5,
    stats:{ crit: 5, atk: 5 },
    desc:'독을 품은 사자(死者)의 형상',
  },
  golem: {
    name:'골렘', icon:'🗿',
    essenceCost: 8,
    durationMin: 6,
    stats:{ maxHp: 150, def: 25 },
    desc:'움직이는 바위의 형상',
  },
  phoenix: {
    name:'불사조', icon:'🔥',
    essenceCost: 12,
    durationMin: 7,
    stats:{ atk: 15, allStats: 5 },
    desc:'불꽃에서 다시 태어나는 형상',
  },
  dragon: {
    name:'드래곤', icon:'🐲',
    essenceCost: 20,
    durationMin: 8,
    stats:{ atk: 25, def: 15, crit: 10, maxHp: 100 },
    desc:'전설의 용 — 모든 것을 압도',
  },
};

const ESSENCE_DROP_TABLE = {
  // monsterTier → form essences they drop
  weak:    ['wolf','serpent'],
  normal:  ['wolf','bear','eagle','serpent'],
  strong:  ['bear','eagle','golem','phoenix'],
  boss:    ['phoenix','dragon'],
  worldboss:['dragon'],
};

function _ensure(player) {
  if (!player.morph) {
    player.morph = {
      essences: {},   // {wolf: count, ...}
      activeForm: null, // {formId, expiresAt}
      transformCount: 0,
      collected: [],  // 한번이라도 변신해본 form id
    };
  }
  return player.morph;
}

function getStatus(player) {
  const m = _ensure(player);
  if (m.activeForm && m.activeForm.expiresAt < Date.now()) m.activeForm = null;
  return {
    essences: m.essences,
    activeForm: m.activeForm,
    transformCount: m.transformCount,
    collected: m.collected,
    totalForms: Object.keys(FORMS).length,
    forms: FORMS,
  };
}

// 외부(전투 핸들러)에서 호출 — 몬스터 처치 시 에센스 부여
function grantEssence(player, monsterTier) {
  const m = _ensure(player);
  const pool = ESSENCE_DROP_TABLE[monsterTier];
  if (!pool || pool.length === 0) return null;
  // 30% 드롭률
  if (Math.random() > 0.3) return null;
  const formId = pool[Math.floor(Math.random() * pool.length)];
  m.essences[formId] = (m.essences[formId] || 0) + 1;
  return { formId, name: FORMS[formId].name };
}

function transform(player, formId) {
  const m = _ensure(player);
  const form = FORMS[formId];
  if (!form) return { success:false, msg:'존재하지 않는 형상' };
  if (m.activeForm && m.activeForm.expiresAt > Date.now()) {
    return { success:false, msg:'이미 변신 중' };
  }
  if ((m.essences[formId] || 0) < form.essenceCost) {
    return { success:false, msg:`에센스 부족 (${form.essenceCost} 필요, 보유 ${m.essences[formId]||0})` };
  }
  m.essences[formId] -= form.essenceCost;
  m.activeForm = {
    formId,
    expiresAt: Date.now() + form.durationMin * 60 * 1000,
  };
  m.transformCount += 1;
  if (!m.collected.includes(formId)) m.collected.push(formId);
  return {
    success: true,
    msg: `${form.icon} ${form.name}으로 변신! (${form.durationMin}분)`,
    form,
  };
}

function revert(player) {
  const m = _ensure(player);
  if (!m.activeForm) return { success:false, msg:'변신 중이 아님' };
  m.activeForm = null;
  return { success:true, msg:'원래 모습으로 돌아옴' };
}

function getActiveBonuses(player) {
  const m = _ensure(player);
  if (!m.activeForm || m.activeForm.expiresAt < Date.now()) return {};
  return FORMS[m.activeForm.formId]?.stats || {};
}

module.exports = {
  FORMS,
  ESSENCE_DROP_TABLE,
  getStatus,
  grantEssence,
  transform,
  revert,
  getActiveBonuses,
};

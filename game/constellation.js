// 별자리 시스템 — v1.93
// 매일 오늘의 별자리가 바뀌고, 관측하면 해당 효과를 24시간 받음
// 12개를 모두 관측하면 "별의 인도자" 영구 보너스

const CONSTELLATIONS = [
  { id:'aries',       name:'양자리',     icon:'♈', stat:'atk',       value:8,  desc:'돌진하는 양' },
  { id:'taurus',      name:'황소자리',   icon:'♉', stat:'def',       value:12, desc:'굳건한 황소' },
  { id:'gemini',      name:'쌍둥이자리', icon:'♊', stat:'crit',      value:5,  desc:'쌍둥이의 가호' },
  { id:'cancer',      name:'게자리',     icon:'♋', stat:'maxHp',     value:50, desc:'단단한 껍질' },
  { id:'leo',         name:'사자자리',   icon:'♌', stat:'atk',       value:12, desc:'백수의 왕' },
  { id:'virgo',       name:'처녀자리',   icon:'♍', stat:'evasion',   value:5,  desc:'순수한 우아함' },
  { id:'libra',       name:'천칭자리',   icon:'♎', stat:'allStats',  value:4,  desc:'균형의 가호' },
  { id:'scorpio',     name:'전갈자리',   icon:'♏', stat:'crit',      value:8,  desc:'독침' },
  { id:'sagittarius', name:'사수자리',   icon:'♐', stat:'expBonus',  value:10, desc:'머나먼 화살' },
  { id:'capricorn',   name:'염소자리',   icon:'♑', stat:'goldBonus', value:15, desc:'풍요의 산양' },
  { id:'aquarius',    name:'물병자리',   icon:'♒', stat:'mp',        value:30, desc:'영혼의 물병' },
  { id:'pisces',      name:'물고기자리', icon:'♓', stat:'evasion',   value:8,  desc:'유영하는 물고기' },
];

const ZODIAC_MASTER_BONUS = {
  stat:'allStats', value:10, desc:'12 별자리 관측 완료 — 별의 인도자',
};

function _ensure(player) {
  if (!player.constellation) {
    player.constellation = {
      observed: {},        // {id: lastObservedDate (YYYY-MM-DD)}
      collected: [],       // 한번이라도 관측한 별자리 ids
      lastDay: null,
      activeBuff: null,    // {id, expiresAt}
    };
  }
  return player.constellation;
}

function _today() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function _todayConstellation() {
  // 일자 기반 결정론적 선택
  const d = new Date();
  const dayOfYear = Math.floor((d - new Date(Date.UTC(d.getUTCFullYear(),0,0))) / 86400000);
  return CONSTELLATIONS[dayOfYear % CONSTELLATIONS.length];
}

function getStatus(player) {
  const c = _ensure(player);
  const today = _todayConstellation();
  const todayStr = _today();
  const observedToday = c.observed[today.id] === todayStr;
  return {
    today,
    todayStr,
    observedToday,
    collected: c.collected,
    collectedCount: c.collected.length,
    totalCount: CONSTELLATIONS.length,
    activeBuff: c.activeBuff && c.activeBuff.expiresAt > Date.now() ? c.activeBuff : null,
    masterBonus: c.collected.length >= CONSTELLATIONS.length ? ZODIAC_MASTER_BONUS : null,
    allConstellations: CONSTELLATIONS,
  };
}

function observe(player) {
  const c = _ensure(player);
  const today = _todayConstellation();
  const todayStr = _today();
  if (c.observed[today.id] === todayStr) {
    return { success:false, msg:'오늘 이미 관측함' };
  }
  c.observed[today.id] = todayStr;
  if (!c.collected.includes(today.id)) c.collected.push(today.id);
  c.activeBuff = {
    id: today.id,
    name: today.name,
    icon: today.icon,
    stat: today.stat,
    value: today.value,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  const justCompleted = c.collected.length === CONSTELLATIONS.length &&
                         !c.zodiacMasterAwarded;
  if (justCompleted) c.zodiacMasterAwarded = Date.now();
  return {
    success: true,
    msg: `${today.icon} ${today.name} 관측! +${today.value} ${today.stat} (24시간)`,
    buff: c.activeBuff,
    completed: justCompleted,
  };
}

function getActiveBonuses(player) {
  const c = _ensure(player);
  const bonuses = {};
  if (c.activeBuff && c.activeBuff.expiresAt > Date.now()) {
    bonuses[c.activeBuff.stat] = (bonuses[c.activeBuff.stat] || 0) + c.activeBuff.value;
  }
  if (c.collected.length >= CONSTELLATIONS.length) {
    bonuses[ZODIAC_MASTER_BONUS.stat] = (bonuses[ZODIAC_MASTER_BONUS.stat] || 0) + ZODIAC_MASTER_BONUS.value;
  }
  return bonuses;
}

module.exports = {
  CONSTELLATIONS,
  ZODIAC_MASTER_BONUS,
  getStatus,
  observe,
  getActiveBonuses,
};

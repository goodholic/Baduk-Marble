// 신탁 시스템 — v1.96
// 매일 한 번 신탁의 사제에게 예언을 받음
// 예언 = 버프 + 수수께끼/격언, 누적 기록

const PROPHECIES = [
  { id:'sun',     icon:'☀️', text:'태양이 너의 길을 비추리라', buff:{ stat:'expBonus',  value:20, hours:6 } },
  { id:'moon',    icon:'🌙', text:'달빛이 너의 발걸음을 인도하리라', buff:{ stat:'evasion',  value:6,  hours:6 } },
  { id:'storm',   icon:'⚡', text:'폭풍이 너의 검을 깨우리라', buff:{ stat:'crit',     value:7,  hours:6 } },
  { id:'mountain',icon:'⛰️', text:'산이 너의 어깨를 단단히 하리라', buff:{ stat:'def',      value:15, hours:6 } },
  { id:'river',   icon:'🌊', text:'강물이 너의 마음을 식히리라', buff:{ stat:'mp',       value:30, hours:6 } },
  { id:'flame',   icon:'🔥', text:'불꽃이 너의 분노를 일으키리라', buff:{ stat:'atk',      value:10, hours:6 } },
  { id:'wind',    icon:'🍃', text:'바람이 너의 등을 밀어주리라', buff:{ stat:'goldBonus', value:15, hours:6 } },
  { id:'stars',   icon:'🌟', text:'별들이 너의 이름을 속삭이리라', buff:{ stat:'allStats', value:5,  hours:6 } },
  { id:'shadow',  icon:'🌑', text:'그림자가 너의 약점을 가리리라', buff:{ stat:'maxHp',    value:60, hours:6 } },
  { id:'eye',     icon:'👁️', text:'천 개의 눈이 너의 적을 응시한다', buff:{ stat:'rareDropBonus', value:25, hours:6 } },
];

const RIDDLES = [
  '낮에는 4발, 저녁에는 2발, 밤에는 3발인 것은?',
  '말 못하는 대답으로 모든 질문에 답하는 것은?',
  '잡으면 사라지고 놓으면 자라는 것은?',
  '많을수록 가벼운 것은?',
  '가지지 않은 사람만이 줄 수 있는 것은?',
  '바닥에서 시작해 천장에서 끝나지만 움직이지 않는 것은?',
  '불 없이 타고 물 없이 흐르는 것은?',
  '사람이 부숴야만 쓸 수 있는 것은?',
];

function _today() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function _ensure(player) {
  if (!player.oracle) {
    player.oracle = {
      lastConsultDate: null,
      activeBuff: null, // {stat, value, expiresAt, prophecyId}
      history: [],      // [{date, prophecyId, riddle}]
      consults: 0,
    };
  }
  return player.oracle;
}

function getStatus(player) {
  const o = _ensure(player);
  const today = _today();
  const consultedToday = o.lastConsultDate === today;
  if (o.activeBuff && o.activeBuff.expiresAt < Date.now()) o.activeBuff = null;
  return {
    consultedToday,
    activeBuff: o.activeBuff,
    history: o.history.slice(-30),
    consults: o.consults,
    today,
  };
}

function consult(player) {
  const o = _ensure(player);
  const today = _today();
  if (o.lastConsultDate === today) {
    return { success:false, msg:'오늘의 신탁은 이미 받음' };
  }
  // 일자+이름 시드로 결정론적 선택
  const seed = (today + (player.id || player.displayName || 'x')).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const prophecy = PROPHECIES[seed % PROPHECIES.length];
  const riddle = RIDDLES[(seed * 7) % RIDDLES.length];

  o.lastConsultDate = today;
  o.consults += 1;
  o.activeBuff = {
    prophecyId: prophecy.id,
    stat: prophecy.buff.stat,
    value: prophecy.buff.value,
    expiresAt: Date.now() + prophecy.buff.hours * 60 * 60 * 1000,
  };
  o.history.unshift({ date: today, prophecyId: prophecy.id, riddle });
  if (o.history.length > 100) o.history.length = 100;

  return {
    success: true,
    msg: `${prophecy.icon} "${prophecy.text}" — +${prophecy.buff.value} ${prophecy.buff.stat} (${prophecy.buff.hours}시간)`,
    prophecy,
    riddle,
    buff: o.activeBuff,
  };
}

function getActiveBonuses(player) {
  const o = _ensure(player);
  if (!o.activeBuff || o.activeBuff.expiresAt < Date.now()) return {};
  return { [o.activeBuff.stat]: o.activeBuff.value };
}

module.exports = {
  PROPHECIES,
  RIDDLES,
  getStatus,
  consult,
  getActiveBonuses,
};

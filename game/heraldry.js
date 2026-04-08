// 가문 문장 시스템 — v2.16
// 동물/색/모토를 조합해 자신의 가문 문장을 만든다 — 구성 요소가 작은 보너스 부여

const CHARGES = {
  // 동물 — 메인 상징
  lion:    { name:'사자',     icon:'🦁', stat:'atk',     value:5 },
  eagle:   { name:'독수리',   icon:'🦅', stat:'crit',    value:3 },
  bear:    { name:'곰',       icon:'🐻', stat:'maxHp',   value:30 },
  wolf:    { name:'늑대',     icon:'🐺', stat:'evasion', value:3 },
  dragon:  { name:'용',       icon:'🐲', stat:'allStats',value:2 },
  phoenix: { name:'불사조',   icon:'🔥', stat:'mp',      value:15 },
  unicorn: { name:'유니콘',   icon:'🦄', stat:'expBonus',value:8 },
  serpent: { name:'뱀',       icon:'🐍', stat:'crit',    value:4 },
  stag:    { name:'사슴',     icon:'🦌', stat:'evasion', value:4 },
  bull:    { name:'황소',     icon:'🐂', stat:'def',     value:8 },
};

const COLORS = {
  gules:    { name:'홍색',  icon:'🔴', stat:'atk',     value:2 },
  azure:    { name:'청색',  icon:'🔵', stat:'mp',      value:8 },
  vert:     { name:'녹색',  icon:'🟢', stat:'maxHp',   value:15 },
  or:       { name:'금색',  icon:'🟡', stat:'goldBonus',value:5 },
  argent:   { name:'은색',  icon:'⚪', stat:'def',     value:4 },
  sable:    { name:'흑색',  icon:'⚫', stat:'evasion', value:2 },
  purpure:  { name:'자색',  icon:'🟣', stat:'crit',    value:2 },
  tenne:    { name:'주황',  icon:'🟠', stat:'expBonus',value:5 },
};

const MOTTOS = [
  { id:'fortis',    text:'강한 자만이 살아남는다',     stat:'atk',      value:3 },
  { id:'sapientia', text:'지혜는 검보다 강하다',       stat:'expBonus', value:5 },
  { id:'fides',     text:'신의는 황금보다 귀하다',     stat:'allStats', value:1 },
  { id:'veritas',   text:'진실만이 영원하다',         stat:'mp',       value:10 },
  { id:'audere',    text:'감히 시도하는 자가 이긴다', stat:'crit',     value:3 },
  { id:'patientia', text:'인내가 모든 것을 정복한다',  stat:'def',      value:5 },
  { id:'libertas',  text:'자유를 위하여',              stat:'evasion',  value:3 },
  { id:'gloria',    text:'영광은 영원하리라',         stat:'goldBonus',value:8 },
];

function _ensure(player) {
  if (!player.heraldry) {
    player.heraldry = {
      charge: null,
      color: null,
      motto: null,
      designedAt: null,
      changes: 0,
    };
  }
  return player.heraldry;
}

function getStatus(player) {
  const h = _ensure(player);
  return {
    charge: h.charge ? { id: h.charge, ...CHARGES[h.charge] } : null,
    color: h.color ? { id: h.color, ...COLORS[h.color] } : null,
    motto: h.motto ? MOTTOS.find(m => m.id === h.motto) : null,
    designed: !!(h.charge && h.color && h.motto),
    changes: h.changes,
    allCharges: CHARGES,
    allColors: COLORS,
    allMottos: MOTTOS,
  };
}

function design(player, chargeId, colorId, mottoId) {
  const h = _ensure(player);
  if (!CHARGES[chargeId]) return { success:false, msg:'존재하지 않는 동물' };
  if (!COLORS[colorId]) return { success:false, msg:'존재하지 않는 색' };
  if (!MOTTOS.find(m => m.id === mottoId)) return { success:false, msg:'존재하지 않는 모토' };
  // 변경 비용 (첫 디자인은 무료)
  if (h.changes > 0) {
    const cost = 500;
    if ((player.gold || 0) < cost) return { success:false, msg:`재디자인 비용 ${cost}G` };
    player.gold -= cost;
  }
  h.charge = chargeId;
  h.color = colorId;
  h.motto = mottoId;
  h.designedAt = Date.now();
  h.changes += 1;
  return {
    success:true,
    msg:`${COLORS[colorId].icon} ${CHARGES[chargeId].icon} ${CHARGES[chargeId].name} 위 ${COLORS[colorId].name} 가문 — "${MOTTOS.find(m => m.id === mottoId).text}"`,
  };
}

function getActiveBonuses(player) {
  const h = _ensure(player);
  const bonuses = {};
  if (h.charge) {
    const c = CHARGES[h.charge];
    if (c) bonuses[c.stat] = (bonuses[c.stat] || 0) + c.value;
  }
  if (h.color) {
    const c = COLORS[h.color];
    if (c) bonuses[c.stat] = (bonuses[c.stat] || 0) + c.value;
  }
  if (h.motto) {
    const m = MOTTOS.find(x => x.id === h.motto);
    if (m) bonuses[m.stat] = (bonuses[m.stat] || 0) + m.value;
  }
  return bonuses;
}

module.exports = {
  CHARGES,
  COLORS,
  MOTTOS,
  getStatus,
  design,
  getActiveBonuses,
};

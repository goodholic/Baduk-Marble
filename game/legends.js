// 위대한 인물 전당 — v1.99
// 12명의 전설적 인물 — 매일 한 명을 학습하면 영구 작은 보너스 + 24h 큰 버프

const LEGENDS = [
  { id:'arthur',    name:'아서 왕',         icon:'👑', era:'고대', stat:'def',      perm:1, buff:8,  lore:'엑스칼리버를 뽑은 정의의 왕' },
  { id:'merlin',    name:'멀린',            icon:'🧙', era:'고대', stat:'mp',       perm:3, buff:25, lore:'시간을 거꾸로 사는 대마법사' },
  { id:'leonidas',  name:'레오니다스',      icon:'🛡️', era:'고대', stat:'def',      perm:1, buff:12, lore:'300인의 스파르타 왕' },
  { id:'sun_tzu',   name:'손자',            icon:'📜', era:'고대', stat:'crit',     perm:1, buff:5,  lore:'전쟁은 속임수다 — 손자병법' },
  { id:'sappho',    name:'사포',            icon:'🎵', era:'고대', stat:'allStats', perm:1, buff:3,  lore:'레스보스의 여류 시인' },
  { id:'archimedes',name:'아르키메데스',    icon:'⚙️', era:'고대', stat:'expBonus', perm:2, buff:15, lore:'유레카! 욕조 속의 발견' },
  { id:'joan',      name:'잔다르크',        icon:'🔥', era:'중세', stat:'atk',      perm:1, buff:10, lore:'신의 음성을 들은 소녀' },
  { id:'davinci',   name:'다 빈치',         icon:'🎨', era:'중세', stat:'allStats', perm:1, buff:4,  lore:'모나리자의 미소를 그린 천재' },
  { id:'tesla',     name:'테슬라',          icon:'⚡', era:'근대', stat:'crit',     perm:1, buff:7,  lore:'번개를 길들인 발명가' },
  { id:'curie',     name:'마리 퀴리',       icon:'☢️', era:'근대', stat:'expBonus', perm:2, buff:20, lore:'두 번의 노벨상, 라듐의 어머니' },
  { id:'gandhi',    name:'간디',            icon:'🕊️', era:'근대', stat:'maxHp',    perm:5, buff:50, lore:'비폭력의 위대한 영혼' },
  { id:'einstein',  name:'아인슈타인',      icon:'🧠', era:'근대', stat:'allStats', perm:1, buff:6,  lore:'E=mc² — 시공간을 휜 사람' },
];

const HALL_MASTER_BONUS = { stat:'allStats', value: 15, desc:'12 위인 모두 학습 — 역사의 증인' };

function _today() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function _ensure(player) {
  if (!player.legends) {
    player.legends = {
      studied: {},      // {legendId: studyCount}
      studiedDays: {},  // {legendId: lastStudyDate}
      lastStudyDate: null,
      activeBuff: null, // {legendId, stat, value, expiresAt}
      totalStudies: 0,
    };
  }
  return player.legends;
}

function getStatus(player) {
  const l = _ensure(player);
  const today = _today();
  if (l.activeBuff && l.activeBuff.expiresAt < Date.now()) l.activeBuff = null;
  const collected = Object.keys(l.studied).length;
  return {
    studied: l.studied,
    studiedDays: l.studiedDays,
    studiedToday: l.lastStudyDate === today,
    activeBuff: l.activeBuff,
    totalStudies: l.totalStudies,
    collected,
    totalLegends: LEGENDS.length,
    halled: collected >= LEGENDS.length,
    legends: LEGENDS,
  };
}

function study(player, legendId) {
  const l = _ensure(player);
  const today = _today();
  if (l.lastStudyDate === today) return { success:false, msg:'오늘 이미 학습함 (1일 1회)' };
  const legend = LEGENDS.find(x => x.id === legendId);
  if (!legend) return { success:false, msg:'존재하지 않는 인물' };

  l.studied[legendId] = (l.studied[legendId] || 0) + 1;
  l.studiedDays[legendId] = today;
  l.lastStudyDate = today;
  l.totalStudies += 1;
  l.activeBuff = {
    legendId,
    stat: legend.stat,
    value: legend.buff,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  const collected = Object.keys(l.studied).length;
  const completed = collected >= LEGENDS.length && !l.hallMasterAt;
  if (completed) l.hallMasterAt = Date.now();

  return {
    success: true,
    msg: `${legend.icon} ${legend.name} 학습 — "${legend.lore}" (+${legend.buff} ${legend.stat} 24h)`,
    legend,
    completed,
  };
}

function getActiveBonuses(player) {
  const l = _ensure(player);
  const bonuses = {};
  // 일시 버프
  if (l.activeBuff && l.activeBuff.expiresAt > Date.now()) {
    bonuses[l.activeBuff.stat] = (bonuses[l.activeBuff.stat] || 0) + l.activeBuff.value;
  }
  // 영구 학습 보너스 (인물별 perm × 학습횟수)
  for (const [id, count] of Object.entries(l.studied)) {
    const def = LEGENDS.find(x => x.id === id);
    if (!def) continue;
    bonuses[def.stat] = (bonuses[def.stat] || 0) + def.perm * count;
  }
  // 마스터 보너스
  if (Object.keys(l.studied).length >= LEGENDS.length) {
    bonuses[HALL_MASTER_BONUS.stat] = (bonuses[HALL_MASTER_BONUS.stat] || 0) + HALL_MASTER_BONUS.value;
  }
  return bonuses;
}

module.exports = {
  LEGENDS,
  HALL_MASTER_BONUS,
  getStatus,
  study,
  getActiveBonuses,
};

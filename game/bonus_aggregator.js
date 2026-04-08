// 보너스 집계 시스템 — v2.0 (마일스톤)
// v1.91~v1.99에서 추가된 모든 active bonus 모듈을 한 곳에서 합산
// 플레이어가 어떤 보너스가 얼마나 적용 중인지 한 번에 확인 가능

const BONUS_SOURCES = [
  { id:'meditation',    label:'명상 패시브',     module:'./meditation' },
  { id:'cooking',       label:'요리 버프',       module:'./cooking' },
  { id:'constellation', label:'별자리',         module:'./constellation' },
  { id:'weather',       label:'기상',            module:'./weather' },
  { id:'oracle',        label:'신탁',            module:'./oracle' },
  { id:'legends',       label:'위인 학습',       module:'./legends' },
  { id:'morph',         label:'변신 형상',       module:'./morph' },
  { id:'dream',         label:'꿈의 축복',       module:'./dream' },
  { id:'music',         label:'음악 연주',       module:'./music' },
  { id:'tarot',         label:'타로 운명',       module:'./tarot' },
  { id:'talisman',      label:'부적',            module:'./talisman' },
];

// 모듈 lazy require — 로드 실패 시에도 안전
function _loadModule(path) {
  try { return require(path); } catch (e) { return null; }
}

function aggregate(player) {
  const breakdown = {}; // {sourceId: {stat: value}}
  const totals = {};
  for (const src of BONUS_SOURCES) {
    const mod = _loadModule(src.module);
    if (!mod || typeof mod.getActiveBonuses !== 'function') continue;
    let bonus = {};
    try {
      bonus = mod.getActiveBonuses(player) || {};
    } catch (e) {
      bonus = {};
    }
    if (Object.keys(bonus).length === 0) continue;
    breakdown[src.id] = { label: src.label, bonus };
    for (const [stat, val] of Object.entries(bonus)) {
      totals[stat] = (totals[stat] || 0) + val;
    }
  }
  return {
    breakdown,
    totals,
    activeSourceCount: Object.keys(breakdown).length,
    totalSourceCount: BONUS_SOURCES.length,
  };
}

function getCompactSummary(player) {
  const agg = aggregate(player);
  const lines = [];
  for (const [stat, val] of Object.entries(agg.totals)) {
    lines.push(`+${val} ${stat}`);
  }
  return {
    text: lines.join(' / ') || '활성 보너스 없음',
    sourceCount: agg.activeSourceCount,
    totalSources: agg.totalSourceCount,
  };
}

module.exports = {
  BONUS_SOURCES,
  aggregate,
  getCompactSummary,
};

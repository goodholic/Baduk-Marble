// 일기장 시스템 — v1.90
// 캐릭터의 의미있는 사건을 자동 기록 (개인 타임라인)
// game/news_board.js와 차이: news_board는 서버 전체, diary는 개인

const DIARY_EVENT_TYPES = {
  // 진행
  level_up:      { icon:'⬆️', importance:'low',  title:'레벨 {level} 달성' },
  level_milestone:{ icon:'🌟', importance:'mid', title:'레벨 {level} 마일스톤 (10/20/30/50)' },
  prestige:      { icon:'♻️', importance:'high', title:'환생 {count}차' },
  // 전투
  first_kill:    { icon:'⚔️', importance:'low',  title:'첫 처치: {monster}' },
  boss_kill:     { icon:'🐲', importance:'mid',  title:'{boss} 처치' },
  worldboss_kill:{ icon:'👑', importance:'high', title:'월드 보스 {boss} 처치' },
  pvp_first_win: { icon:'🥊', importance:'mid',  title:'첫 PvP 승리' },
  pvp_kill_streak:{ icon:'🔥', importance:'mid', title:'{count}연속 PvP 승리' },
  // 컬렉션
  rare_drop:     { icon:'💎', importance:'mid',  title:'희귀 드롭: {item}' },
  legendary_drop:{ icon:'⭐', importance:'high', title:'전설 드롭: {item}' },
  title_earned:  { icon:'🏅', importance:'mid',  title:'칭호 획득: {title}' },
  codex_milestone:{ icon:'📚', importance:'mid', title:'도감 마일스톤: {milestone}' },
  // 경제
  big_gold:      { icon:'💰', importance:'mid',  title:'골드 {amount}G 달성' },
  big_purchase:  { icon:'🛍️', importance:'mid',  title:'대형 구매: {item} ({price}G)' },
  // 사회
  clan_join:     { icon:'🏛️', importance:'mid',  title:'{clan} 길드 가입' },
  clan_leave:    { icon:'👋', importance:'low',  title:'{clan} 길드 탈퇴' },
  marriage:      { icon:'💝', importance:'high', title:'{partner}와 결혼' },
  // 모험
  zone_first:    { icon:'🗺️', importance:'low',  title:'첫 방문: {zone}' },
  dungeon_clear: { icon:'🏆', importance:'mid',  title:'{dungeon} 클리어' },
  raid_clear:    { icon:'🛡️', importance:'high', title:'{raid} 레이드 클리어' },
  treasure_legendary:{ icon:'📜', importance:'high', title:'전설 보물 발견' },
};

const DIARY_CONFIG = {
  maxEntries: 100, // 플레이어당 최대 항목
};

function _ensure(player) {
  if (!player.diary) player.diary = [];
  return player.diary;
}

function _renderTitle(template, params) {
  return (template || '').replace(/\{(\w+)\}/g, (_, k) => params[k] || '???');
}

function logEvent(player, eventType, params = {}) {
  const def = DIARY_EVENT_TYPES[eventType];
  if (!def) return null;
  const diary = _ensure(player);
  const entry = {
    id: `d_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: eventType,
    icon: def.icon,
    importance: def.importance,
    title: _renderTitle(def.title, params),
    params,
    timestamp: Date.now(),
  };
  diary.unshift(entry);
  if (diary.length > DIARY_CONFIG.maxEntries) {
    diary.length = DIARY_CONFIG.maxEntries;
  }
  return entry;
}

function getDiary(player, filter = {}) {
  const diary = _ensure(player);
  let filtered = diary;
  if (filter.importance) {
    filtered = filtered.filter(e => e.importance === filter.importance);
  }
  if (filter.type) {
    filtered = filtered.filter(e => e.type === filter.type);
  }
  if (filter.since) {
    filtered = filtered.filter(e => e.timestamp >= filter.since);
  }
  return filtered.slice(0, filter.limit || diary.length);
}

function getHighlights(player) {
  return getDiary(player, { importance: 'high', limit: 20 });
}

function getStats(player) {
  const diary = _ensure(player);
  const byType = {};
  for (const entry of diary) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }
  return {
    total: diary.length,
    byType,
    firstEntry: diary[diary.length - 1] || null,
    lastEntry: diary[0] || null,
  };
}

function clearDiary(player) {
  player.diary = [];
}

module.exports = {
  DIARY_EVENT_TYPES,
  DIARY_CONFIG,
  logEvent,
  getDiary,
  getHighlights,
  getStats,
  clearDiary,
};

// 서버 뉴스 보드 — v1.70 (70번째 패치 마일스톤)
// 모든 모듈의 주요 이벤트를 집계해서 뉴스 피드로 표시
// 카테고리별 필터 + 시간순 정렬

const NEWS_CATEGORIES = {
  combat: { name: '전투', icon: '⚔️', color: '#ff4444' },
  economy: { name: '경제', icon: '💰', color: '#ffd700' },
  social: { name: '사회', icon: '🤝', color: '#88ddff' },
  world: { name: '월드', icon: '🌍', color: '#aa44ff' },
  achievement: { name: '업적', icon: '🏆', color: '#ff8800' },
};

// 뉴스 템플릿 (모듈 → 뉴스 변환)
const NEWS_TEMPLATES = {
  // 전투
  worldboss_killed: { category: 'combat', priority: 'high', template: '👑 {player}이(가) {boss}를 처치!' },
  raid_victory: { category: 'combat', priority: 'high', template: '🏛️ {guild} 길드가 {raid} 레이드 성공!' },
  rare_drop: { category: 'combat', priority: 'mid', template: '💎 {player}이(가) {item}을(를) 획득!' },
  pvp_streak: { category: 'combat', priority: 'mid', template: '🔥 {player} {count}연속 PvP 승리!' },

  // 경제
  jackpot_won: { category: 'economy', priority: 'high', template: '💰 {player}이(가) 잭팟 {amount}G 당첨!' },
  big_trade: { category: 'economy', priority: 'mid', template: '🛍️ {player}이(가) {item}을(를) {price}G에 거래' },
  guild_treasury: { category: 'economy', priority: 'low', template: '🏦 {guild} 길드 재정 {amount}G 돌파' },

  // 사회
  guild_war_declared: { category: 'social', priority: 'high', template: '⚔️ {attacker} 길드가 {defender} 길드에 선전포고!' },
  guild_created: { category: 'social', priority: 'mid', template: '🏛️ {leader}이(가) {guild} 길드를 창설' },
  marriage: { category: 'social', priority: 'mid', template: '💝 {player1}와 {player2}가 결혼' },
  tournament_winner: { category: 'social', priority: 'high', template: '🏆 {player}이(가) PvP 토너먼트 우승!' },

  // 월드
  event_started: { category: 'world', priority: 'high', template: '🌟 {event} 이벤트 시작!' },
  event_ended: { category: 'world', priority: 'mid', template: '⏹️ {event} 이벤트 종료' },
  weather_change: { category: 'world', priority: 'low', template: '🌦️ 날씨가 {weather}(으)로 변경' },
  world_first: { category: 'world', priority: 'high', template: '🥇 {player}이(가) {achievement} 월드 퍼스트!' },

  // 업적
  legendary_title: { category: 'achievement', priority: 'high', template: '🏅 {player}이(가) "{title}" 칭호 획득!' },
  level_up: { category: 'achievement', priority: 'low', template: '⬆️ {player} Lv.{level} 달성' },
  milestone: { category: 'achievement', priority: 'mid', template: '🎯 {player}이(가) {milestone} 달성' },
};

const NEWS_CONFIG = {
  maxNewsItems: 200,           // 메모리 보관 한도
  feedSize: 50,                // 피드 표시 한도
  highPriorityKeepDays: 7,     // 고우선순위 7일 보관
  midPriorityKeepDays: 3,      // 중우선순위 3일
  lowPriorityKeepDays: 1,      // 저우선순위 1일
};

// 메모리 뉴스 풀
let newsItems = [];
let newsIdCounter = 1;

function _formatTemplate(template, params) {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] || '???');
}

function postNews(eventType, params) {
  const tpl = NEWS_TEMPLATES[eventType];
  if (!tpl) return null;
  const item = {
    id: `news_${newsIdCounter++}`,
    eventType,
    category: tpl.category,
    priority: tpl.priority,
    message: _formatTemplate(tpl.template, params),
    icon: NEWS_CATEGORIES[tpl.category]?.icon,
    color: NEWS_CATEGORIES[tpl.category]?.color,
    timestamp: Date.now(),
    params,
  };
  newsItems.unshift(item); // 최신 우선
  // 한도 초과 시 정리
  if (newsItems.length > NEWS_CONFIG.maxNewsItems) {
    newsItems = newsItems.slice(0, NEWS_CONFIG.maxNewsItems);
  }
  return item;
}

function _expireOld() {
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;
  newsItems = newsItems.filter(item => {
    let keepDays;
    if (item.priority === 'high') keepDays = NEWS_CONFIG.highPriorityKeepDays;
    else if (item.priority === 'mid') keepDays = NEWS_CONFIG.midPriorityKeepDays;
    else keepDays = NEWS_CONFIG.lowPriorityKeepDays;
    return (now - item.timestamp) < keepDays * dayMs;
  });
}

function getFeed(filter = {}) {
  _expireOld();
  let filtered = newsItems;

  if (filter.category) {
    filtered = filtered.filter(item => item.category === filter.category);
  }
  if (filter.priority) {
    filtered = filtered.filter(item => item.priority === filter.priority);
  }
  if (filter.player) {
    filtered = filtered.filter(item =>
      Object.values(item.params || {}).includes(filter.player)
    );
  }

  return filtered.slice(0, filter.limit || NEWS_CONFIG.feedSize);
}

function getCategoryStats() {
  _expireOld();
  const stats = {};
  for (const cat of Object.keys(NEWS_CATEGORIES)) {
    stats[cat] = newsItems.filter(item => item.category === cat).length;
  }
  return stats;
}

function getRecentHighlights(limit = 10) {
  _expireOld();
  return newsItems
    .filter(item => item.priority === 'high')
    .slice(0, limit);
}

// 디버그/관리용
function clearAllNews() {
  newsItems = [];
}

module.exports = {
  NEWS_CATEGORIES,
  NEWS_TEMPLATES,
  NEWS_CONFIG,
  postNews,
  getFeed,
  getCategoryStats,
  getRecentHighlights,
  clearAllNews,
};

// 프로필 카드 시스템 — v2.04
// 플레이어의 명함 — 한줄소개, 뱃지, 테마 색상, 통계 표시
// 다른 플레이어가 조회 가능

const THEMES = {
  classic:  { name:'클래식',   bg:'#1a1a2e', accent:'#e9d758' },
  forest:   { name:'숲',       bg:'#1b3520', accent:'#90ee90' },
  ocean:    { name:'바다',     bg:'#082f49', accent:'#38bdf8' },
  sunset:   { name:'노을',     bg:'#3b0a18', accent:'#fb923c' },
  void:     { name:'공허',     bg:'#0a0a0a', accent:'#a855f7' },
  royal:    { name:'왕가',     bg:'#1e1b4b', accent:'#facc15' },
  crimson:  { name:'심홍',     bg:'#3b0a0a', accent:'#ef4444' },
  ice:      { name:'얼음',     bg:'#0c1c2e', accent:'#bfdbfe' },
};

const BADGES = {
  founder:    { name:'개척자',     icon:'🚩', desc:'베타 시기 참여' },
  veteran:    { name:'고참',       icon:'🎖️', desc:'30일 이상 플레이' },
  rich:       { name:'갑부',       icon:'💎', desc:'100만 골드 달성' },
  hunter:     { name:'사냥꾼',     icon:'🏹', desc:'1000 몬스터 처치' },
  social:     { name:'사교가',     icon:'💌', desc:'친구 10명 이상' },
  philosopher:{ name:'철인',       icon:'📚', desc:'12 위인 학습 완료' },
  collector:  { name:'수집가',     icon:'🗃️', desc:'도감 100% 달성' },
  champion:   { name:'챔피언',     icon:'🏆', desc:'PvP 토너먼트 우승' },
};

const MAX_DISPLAYED_BADGES = 5;
const MAX_BIO_LENGTH = 80;

function _ensure(player) {
  if (!player.profile) {
    player.profile = {
      bio: '',
      theme: 'classic',
      badges: [],            // 획득한 뱃지 ids
      displayBadges: [],     // 카드에 표시 (최대 5)
      views: 0,
      lastUpdated: 0,
    };
  }
  return player.profile;
}

function getCard(player, viewer) {
  const pf = _ensure(player);
  if (viewer && viewer.id !== player.id) pf.views += 1;
  return {
    id: player.id,
    displayName: player.displayName,
    level: player.level || 1,
    classId: player.classId || 'novice',
    title: player.activeTitle || null,
    bio: pf.bio || '한 줄 소개가 없습니다',
    theme: THEMES[pf.theme] || THEMES.classic,
    themeId: pf.theme,
    badges: pf.displayBadges.map(id => BADGES[id]).filter(Boolean),
    ownedBadges: pf.badges,
    views: pf.views,
    stats: {
      gold: player.gold || 0,
      kills: player.totalKills || 0,
      pvpWins: player.pvpWins || 0,
      clan: player.clanName || null,
    },
  };
}

function setBio(player, text) {
  const pf = _ensure(player);
  if (typeof text !== 'string') return { success:false, msg:'문자열 필요' };
  pf.bio = text.slice(0, MAX_BIO_LENGTH);
  pf.lastUpdated = Date.now();
  return { success:true, msg:'한줄소개 업데이트' };
}

function setTheme(player, themeId) {
  const pf = _ensure(player);
  if (!THEMES[themeId]) return { success:false, msg:'존재하지 않는 테마' };
  pf.theme = themeId;
  pf.lastUpdated = Date.now();
  return { success:true, msg:`테마: ${THEMES[themeId].name}` };
}

function awardBadge(player, badgeId) {
  const pf = _ensure(player);
  if (!BADGES[badgeId]) return null;
  if (pf.badges.includes(badgeId)) return null;
  pf.badges.push(badgeId);
  if (pf.displayBadges.length < MAX_DISPLAYED_BADGES) {
    pf.displayBadges.push(badgeId);
  }
  return BADGES[badgeId];
}

function setDisplayBadges(player, ids) {
  const pf = _ensure(player);
  if (!Array.isArray(ids)) return { success:false, msg:'배열 필요' };
  const valid = ids.filter(id => pf.badges.includes(id)).slice(0, MAX_DISPLAYED_BADGES);
  pf.displayBadges = valid;
  return { success:true, msg:`표시 뱃지 ${valid.length}개 설정` };
}

// 자동 뱃지 체크 (서버 측에서 주기적으로 호출 가능)
function autoCheckBadges(player) {
  const granted = [];
  const tryGrant = (id, condition) => {
    if (condition) {
      const b = awardBadge(player, id);
      if (b) granted.push(b);
    }
  };
  tryGrant('rich', (player.gold || 0) >= 1000000);
  tryGrant('hunter', (player.totalKills || 0) >= 1000);
  tryGrant('social', player.friends && Object.keys(player.friends.list || {}).length >= 10);
  tryGrant('philosopher', player.legends && Object.keys(player.legends.studied || {}).length >= 12);
  return granted;
}

module.exports = {
  THEMES,
  BADGES,
  MAX_DISPLAYED_BADGES,
  MAX_BIO_LENGTH,
  getCard,
  setBio,
  setTheme,
  awardBadge,
  setDisplayBadges,
  autoCheckBadges,
};

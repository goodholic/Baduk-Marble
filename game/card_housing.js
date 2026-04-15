// ============================================
// 하우징 — 방 꾸미기 + 방문 + 점수 보너스
// ============================================

const ROOM_SIZE = { width: 5, height: 4 }; // 5x4 grid = 20 slots

const FURNITURE = [
  // 기본 가구
  { id: 'fur_bed', name: '나무 침대🛏️', cost: 1000, score: 5, bonus: { hpRegen: 0.02 }, category: 'rest', desc: '휴식. HP 재생+2%' },
  { id: 'fur_table', name: '식탁🪑', cost: 800, score: 3, bonus: {}, category: 'basic', desc: '기본 가구' },
  { id: 'fur_lamp', name: '랜턴🏮', cost: 600, score: 3, bonus: { exp: 0.01 }, category: 'light', desc: 'EXP+1%' },
  { id: 'fur_carpet', name: '카펫🟫', cost: 1200, score: 5, bonus: { gold: 0.02 }, category: 'floor', desc: '골드+2%' },
  { id: 'fur_bookshelf', name: '책장📚', cost: 2000, score: 8, bonus: { exp: 0.03 }, category: 'study', desc: 'EXP+3%' },
  // 중급 가구
  { id: 'fur_fireplace', name: '벽난로🔥', cost: 5000, score: 15, bonus: { atk: 0.02 }, category: 'warm', desc: 'ATK+2%' },
  { id: 'fur_fountain', name: '분수⛲', cost: 8000, score: 20, bonus: { hpRegen: 0.05 }, category: 'water', desc: 'HP 재생+5%' },
  { id: 'fur_painting', name: '명화🖼️', cost: 6000, score: 18, bonus: { exp: 0.05 }, category: 'art', desc: 'EXP+5%' },
  { id: 'fur_trophy', name: '트로피🏆', cost: 10000, score: 25, bonus: { allStat: 0.02 }, category: 'trophy', desc: '전 스탯+2%' },
  { id: 'fur_aquarium', name: '수족관🐠', cost: 7000, score: 20, bonus: { gold: 0.05 }, category: 'water', desc: '골드+5%' },
  // 고급 가구
  { id: 'fur_throne', name: '왕좌👑', cost: 30000, score: 50, bonus: { allStat: 0.05 }, category: 'throne', desc: '전 스탯+5%!', grade: 'legend' },
  { id: 'fur_crystal', name: '마법 수정🔮', cost: 20000, score: 40, bonus: { matk: 0.08 }, category: 'magic', desc: '마공+8%', grade: 'epic' },
  { id: 'fur_armor_stand', name: '갑옷 거치대🛡️', cost: 15000, score: 35, bonus: { def: 0.05 }, category: 'display', desc: 'DEF+5%', grade: 'epic' },
  { id: 'fur_garden', name: '실내 정원🌿', cost: 12000, score: 30, bonus: { hpRegen: 0.08, gold: 0.03 }, category: 'nature', desc: '재생+골드', grade: 'epic' },
  { id: 'fur_portal', name: '차원문🌀', cost: 50000, score: 80, bonus: { allStat: 0.08 }, category: 'portal', desc: '전 스탯+8%!', grade: 'myth' },
  // 이벤트/칭호 가구 (구매 불가)
  { id: 'fur_champion', name: '챔피언 배너🏆🚩', cost: 0, score: 60, bonus: { atk: 0.05 }, category: 'trophy', desc: 'IO 1위 전용', source: 'IO 1위 달성', grade: 'legend' },
  { id: 'fur_dragon_egg', name: '용알🥚🐲', cost: 0, score: 70, bonus: { allStat: 0.05 }, category: 'special', desc: '드래곤 각성 전용', source: '드래곤 각성', grade: 'legend' },
];

// 방 테마 (배경 변경)
const ROOM_THEMES = [
  { id: 'theme_default', name: '기본 방', cost: 0, icon: '🏠' },
  { id: 'theme_castle', name: '성 내부🏰', cost: 10000, icon: '🏰', bonus: { def: 0.02 } },
  { id: 'theme_forest', name: '숲속 오두막🌲', cost: 8000, icon: '🌲', bonus: { hpRegen: 0.03 } },
  { id: 'theme_underwater', name: '해저 궁전🌊', cost: 15000, icon: '🌊', bonus: { matk: 0.03 } },
  { id: 'theme_cloud', name: '구름 위 궁전☁️', cost: 20000, icon: '☁️', bonus: { allStat: 0.03 } },
  { id: 'theme_volcano', name: '화산 기지🌋', cost: 25000, icon: '🌋', bonus: { atk: 0.05 } },
  { id: 'theme_space', name: '우주 정거장🚀', cost: 50000, icon: '🚀', bonus: { allStat: 0.05 } },
];

// 인테리어 점수 → 보너스 등급
const SCORE_TIERS = [
  { minScore: 0, name: '초라한 방', bonus: 0, icon: '😢' },
  { minScore: 30, name: '평범한 방', bonus: 0.02, icon: '🏠' },
  { minScore: 80, name: '아늑한 방', bonus: 0.05, icon: '😊' },
  { minScore: 150, name: '화려한 방', bonus: 0.08, icon: '✨' },
  { minScore: 300, name: '궁전', bonus: 0.12, icon: '👑' },
  { minScore: 500, name: '신의 거처', bonus: 0.15, icon: '🌟👑' },
];

/* ── helpers ─────────────────────────────────── */

function ensureHousing(player) {
  if (!player.housing) {
    player.housing = {
      grid: Array.from({ length: ROOM_SIZE.height }, () =>
        new Array(ROOM_SIZE.width).fill(null)
      ),
      placed: {},          // furnitureId → { x, y }
      ownedFurniture: [],  // furnitureId[]
      theme: 'theme_default',
      ownedThemes: ['theme_default'],
      visitCount: 0,
      ratings: [],         // { from, score }
      visitedToday: {},    // hostName → timestamp (cooldown)
    };
  }
  return player.housing;
}

function findFurniture(id) {
  return FURNITURE.find(f => f.id === id) || null;
}

function findTheme(id) {
  return ROOM_THEMES.find(t => t.id === id) || null;
}

function calcTotalScore(housing) {
  let total = 0;
  for (const fid of Object.keys(housing.placed)) {
    const fur = findFurniture(fid);
    if (fur) total += fur.score;
  }
  return total;
}

function getScoreTier(score) {
  let tier = SCORE_TIERS[0];
  for (const t of SCORE_TIERS) {
    if (score >= t.minScore) tier = t;
  }
  return tier;
}

function averageRating(housing) {
  if (!housing.ratings || housing.ratings.length === 0) return 0;
  const sum = housing.ratings.reduce((s, r) => s + r.score, 0);
  return sum / housing.ratings.length;
}

function mergeBonuses(target, source) {
  for (const [key, val] of Object.entries(source)) {
    target[key] = (target[key] || 0) + val;
  }
}

/* ── core functions ──────────────────────────── */

/**
 * 가구 구매
 */
function buyFurniture(player, furnitureId) {
  const fur = findFurniture(furnitureId);
  if (!fur) return { ok: false, msg: '존재하지 않는 가구입니다.' };
  if (fur.cost === 0 && fur.source) return { ok: false, msg: `이 가구는 구매할 수 없습니다. (획득 조건: ${fur.source})` };

  const h = ensureHousing(player);
  if (h.ownedFurniture.includes(furnitureId)) return { ok: false, msg: '이미 보유한 가구입니다.' };

  const gold = player.gold ?? 0;
  if (gold < fur.cost) return { ok: false, msg: `골드가 부족합니다. (필요: ${fur.cost}, 보유: ${gold})` };

  player.gold = gold - fur.cost;
  h.ownedFurniture.push(furnitureId);

  return { ok: true, msg: `${fur.name} 구매 완료! (-${fur.cost}G)`, furniture: fur };
}

/**
 * 가구 배치
 */
function placeFurniture(player, furnitureId, x, y) {
  const fur = findFurniture(furnitureId);
  if (!fur) return { ok: false, msg: '존재하지 않는 가구입니다.' };

  const h = ensureHousing(player);
  if (!h.ownedFurniture.includes(furnitureId)) return { ok: false, msg: '보유하지 않은 가구입니다.' };

  // bounds check
  if (x < 0 || x >= ROOM_SIZE.width || y < 0 || y >= ROOM_SIZE.height) {
    return { ok: false, msg: `범위를 벗어났습니다. (0~${ROOM_SIZE.width - 1}, 0~${ROOM_SIZE.height - 1})` };
  }

  // collision check
  if (h.grid[y][x] !== null) {
    return { ok: false, msg: `해당 위치에 이미 가구가 있습니다. (${h.grid[y][x]})` };
  }

  // if already placed elsewhere, remove first
  if (h.placed[furnitureId]) {
    const old = h.placed[furnitureId];
    h.grid[old.y][old.x] = null;
  }

  h.grid[y][x] = furnitureId;
  h.placed[furnitureId] = { x, y };

  return { ok: true, msg: `${fur.name}을(를) (${x},${y})에 배치했습니다.` };
}

/**
 * 가구 제거 (인벤토리에 보관)
 */
function removeFurniture(player, furnitureId) {
  const fur = findFurniture(furnitureId);
  if (!fur) return { ok: false, msg: '존재하지 않는 가구입니다.' };

  const h = ensureHousing(player);
  if (!h.placed[furnitureId]) return { ok: false, msg: '배치되지 않은 가구입니다.' };

  const pos = h.placed[furnitureId];
  h.grid[pos.y][pos.x] = null;
  delete h.placed[furnitureId];

  return { ok: true, msg: `${fur.name}을(를) 제거했습니다. (인벤토리 보관)` };
}

/**
 * 방 테마 변경
 */
function setTheme(player, themeId) {
  const theme = findTheme(themeId);
  if (!theme) return { ok: false, msg: '존재하지 않는 테마입니다.' };

  const h = ensureHousing(player);

  // 이미 보유한 테마면 바로 적용
  if (h.ownedThemes.includes(themeId)) {
    h.theme = themeId;
    return { ok: true, msg: `테마를 ${theme.name}(으)로 변경했습니다.` };
  }

  // 구매
  const gold = player.gold ?? 0;
  if (gold < theme.cost) return { ok: false, msg: `골드가 부족합니다. (필요: ${theme.cost}, 보유: ${gold})` };

  player.gold = gold - theme.cost;
  h.ownedThemes.push(themeId);
  h.theme = themeId;

  return { ok: true, msg: `${theme.name} 테마 구매 및 적용! (-${theme.cost}G)` };
}

/**
 * 방 상태 전체 조회
 */
function getRoomState(player) {
  const h = ensureHousing(player);
  const totalScore = calcTotalScore(h);
  const tier = getScoreTier(totalScore);
  const avg = averageRating(h);
  const bonuses = getHousingBonuses(player);
  const theme = findTheme(h.theme);

  const placedDetails = {};
  for (const [fid, pos] of Object.entries(h.placed)) {
    const fur = findFurniture(fid);
    placedDetails[fid] = { ...pos, ...(fur ? { name: fur.name, score: fur.score, desc: fur.desc, grade: fur.grade } : {}) };
  }

  return {
    grid: h.grid,
    placed: placedDetails,
    ownedFurniture: h.ownedFurniture,
    theme: theme ? { id: theme.id, name: theme.name, icon: theme.icon } : null,
    ownedThemes: h.ownedThemes,
    totalScore,
    tier: { name: tier.name, icon: tier.icon, bonus: tier.bonus },
    avgRating: Math.round(avg * 100) / 100,
    ratingCount: h.ratings.length,
    visitCount: h.visitCount,
    bonuses,
    roomSize: ROOM_SIZE,
  };
}

/**
 * 하우징 보너스 합산 (가구 + 테마 + 점수 등급 + 평점)
 */
function getHousingBonuses(player) {
  const h = ensureHousing(player);
  const bonuses = {};

  // 1) 배치된 가구 보너스
  for (const fid of Object.keys(h.placed)) {
    const fur = findFurniture(fid);
    if (fur && fur.bonus) mergeBonuses(bonuses, fur.bonus);
  }

  // 2) 테마 보너스
  const theme = findTheme(h.theme);
  if (theme && theme.bonus) mergeBonuses(bonuses, theme.bonus);

  // 3) 점수 등급 보너스 (allStat으로 적용)
  const totalScore = calcTotalScore(h);
  const tier = getScoreTier(totalScore);
  if (tier.bonus > 0) {
    bonuses.allStat = (bonuses.allStat || 0) + tier.bonus;
  }

  // 4) 평점 보너스: 평균 4 이상이면 추가 allStat +3%, 5 이면 +5%
  const avg = averageRating(h);
  if (avg >= 5) {
    bonuses.allStat = (bonuses.allStat || 0) + 0.05;
  } else if (avg >= 4) {
    bonuses.allStat = (bonuses.allStat || 0) + 0.03;
  }

  return bonuses;
}

/**
 * 다른 플레이어 방 방문
 */
function visitRoom(visitorPlayer, hostName, allPlayers) {
  if (!allPlayers) return { ok: false, msg: '플레이어 목록이 없습니다.' };

  const host = Object.values(allPlayers).find(p => p.name === hostName);
  if (!host) return { ok: false, msg: `${hostName} 플레이어를 찾을 수 없습니다.` };
  if (host.name === visitorPlayer.name) return { ok: false, msg: '자신의 방은 방문할 수 없습니다.' };

  const vH = ensureHousing(visitorPlayer);

  // cooldown: 같은 방 1시간에 1번
  const now = Date.now();
  const lastVisit = vH.visitedToday[hostName] || 0;
  if (now - lastVisit < 3600000) {
    const remain = Math.ceil((3600000 - (now - lastVisit)) / 60000);
    return { ok: false, msg: `${remain}분 후에 다시 방문할 수 있습니다.` };
  }

  vH.visitedToday[hostName] = now;

  const hostH = ensureHousing(host);
  hostH.visitCount = (hostH.visitCount || 0) + 1;

  // 방문 보상: 방문자 100G
  visitorPlayer.gold = (visitorPlayer.gold || 0) + 100;

  const roomState = getRoomState(host);

  return {
    ok: true,
    msg: `${hostName}의 방을 방문했습니다! (+100G)`,
    reward: 100,
    hostRoom: roomState,
  };
}

/**
 * 방 평가 (1~5)
 */
function rateRoom(player, hostName, rating, allPlayers) {
  if (!allPlayers) return { ok: false, msg: '플레이어 목록이 없습니다.' };

  rating = Math.floor(Number(rating));
  if (rating < 1 || rating > 5) return { ok: false, msg: '평점은 1~5 사이여야 합니다.' };

  const host = Object.values(allPlayers).find(p => p.name === hostName);
  if (!host) return { ok: false, msg: `${hostName} 플레이어를 찾을 수 없습니다.` };
  if (host.name === player.name) return { ok: false, msg: '자신의 방은 평가할 수 없습니다.' };

  const hostH = ensureHousing(host);

  // 이미 평가했으면 갱신
  const existing = hostH.ratings.find(r => r.from === player.name);
  if (existing) {
    existing.score = rating;
    return { ok: true, msg: `${hostName}의 방 평점을 ${rating}점으로 수정했습니다.` };
  }

  hostH.ratings.push({ from: player.name, score: rating });
  const avg = averageRating(hostH);

  return { ok: true, msg: `${hostName}의 방에 ${rating}점을 남겼습니다. (평균: ${avg.toFixed(1)})` };
}

/**
 * 인테리어 점수 순위
 */
function getTopRooms(allPlayers) {
  const list = [];
  for (const p of Object.values(allPlayers)) {
    if (!p.housing) continue;
    const h = p.housing;
    const totalScore = calcTotalScore(h);
    if (totalScore <= 0) continue;
    const tier = getScoreTier(totalScore);
    const avg = averageRating(h);
    list.push({
      name: p.name,
      score: totalScore,
      tier: tier.name,
      tierIcon: tier.icon,
      avgRating: Math.round(avg * 100) / 100,
      visitCount: h.visitCount || 0,
      theme: findTheme(h.theme)?.name || '기본 방',
    });
  }
  list.sort((a, b) => b.score - a.score);
  return list.slice(0, 20);
}

/* ── socket registration ─────────────────────── */

function register(io, socket, player, allPlayers) {
  // 방 상태 조회
  socket.on('housing_state', (_, cb) => {
    const state = getRoomState(player);
    const callback = typeof _ === 'function' ? _ : cb;
    if (typeof callback === 'function') callback(state);
    else socket.emit('housing_state', state);
  });

  // 가구 구매
  socket.on('housing_buy', (data, cb) => {
    const result = buyFurniture(player, data.furnitureId);
    if (result.ok) {
      const state = getRoomState(player);
      socket.emit('housing_state', state);
    }
    if (typeof cb === 'function') cb(result);
    else socket.emit('housing_buy_result', result);
  });

  // 가구 배치
  socket.on('housing_place', (data, cb) => {
    const result = placeFurniture(player, data.furnitureId, data.x, data.y);
    if (result.ok) {
      const state = getRoomState(player);
      socket.emit('housing_state', state);
    }
    if (typeof cb === 'function') cb(result);
    else socket.emit('housing_place_result', result);
  });

  // 가구 제거
  socket.on('housing_remove', (data, cb) => {
    const result = removeFurniture(player, data.furnitureId);
    if (result.ok) {
      const state = getRoomState(player);
      socket.emit('housing_state', state);
    }
    if (typeof cb === 'function') cb(result);
    else socket.emit('housing_remove_result', result);
  });

  // 테마 변경
  socket.on('housing_theme', (data, cb) => {
    const result = setTheme(player, data.themeId);
    if (result.ok) {
      const state = getRoomState(player);
      socket.emit('housing_state', state);
    }
    if (typeof cb === 'function') cb(result);
    else socket.emit('housing_theme_result', result);
  });

  // 방 방문
  socket.on('housing_visit', (data, cb) => {
    const result = visitRoom(player, data.hostName, allPlayers);
    if (typeof cb === 'function') cb(result);
    else socket.emit('housing_visit_result', result);
  });

  // 방 평가
  socket.on('housing_rate', (data, cb) => {
    const result = rateRoom(player, data.hostName, data.rating, allPlayers);
    if (typeof cb === 'function') cb(result);
    else socket.emit('housing_rate_result', result);
  });

  // 순위
  socket.on('housing_top', (_, cb) => {
    const top = getTopRooms(allPlayers);
    const callback = typeof _ === 'function' ? _ : cb;
    if (typeof callback === 'function') callback(top);
    else socket.emit('housing_top', top);
  });
}

/* ── exports ─────────────────────────────────── */

module.exports = {
  FURNITURE,
  ROOM_THEMES,
  SCORE_TIERS,
  ROOM_SIZE,
  buyFurniture,
  placeFurniture,
  removeFurniture,
  setTheme,
  getRoomState,
  getHousingBonuses,
  visitRoom,
  rateRoom,
  getTopRooms,
  register,
};

// 계약(Contract) 시스템 — v1.71
// 게시판에서 사냥/PvP/수집 계약을 수락
// 짧은 시간 + 명확한 목표 + 즉시 보상
// 일일 퀘스트와 차이: 게시판에서 골라 받는 단발성, PvP 위험 가능

const CONTRACT_TYPES = {
  hunt_normal: {
    name: '일반 사냥', icon: '🏹',
    target: 'kill_monster_tier', tier: 'normal', count: 30,
    reward: { gold: 800, exp: 1000 },
    timeLimit: 3600, // 1시간
    difficulty: 'easy',
  },
  hunt_elite: {
    name: '엘리트 사냥', icon: '⚔️',
    target: 'kill_monster_tier', tier: 'elite', count: 10,
    reward: { gold: 2000, exp: 3000 },
    timeLimit: 3600,
    difficulty: 'normal',
  },
  hunt_rare: {
    name: '레어 사냥', icon: '🎯',
    target: 'kill_monster_tier', tier: 'rare', count: 5,
    reward: { gold: 5000, exp: 8000, item: 'mat_soul', count: 3 },
    timeLimit: 7200,
    difficulty: 'hard',
  },
  hunt_boss: {
    name: '보스 토벌', icon: '🐲',
    target: 'kill_monster_tier', tier: 'boss', count: 1,
    reward: { gold: 10000, exp: 15000, item: 'mat_dragon', count: 1 },
    timeLimit: 7200,
    difficulty: 'hard',
  },
  pvp_bounty: {
    name: 'PvP 현상금', icon: '💀',
    target: 'pvp_kill', count: 3,
    reward: { gold: 8000, exp: 5000, diamonds: 30 },
    timeLimit: 3600,
    difficulty: 'risky',
    note: 'PvP 활동 중 사망 시 손실',
  },
  collect_herb: {
    name: '약초 수집', icon: '🌿',
    target: 'collect_item', item: 'goods_herb', count: 20,
    reward: { gold: 1500, exp: 500 },
    timeLimit: 5400,
    difficulty: 'easy',
  },
  collect_gem: {
    name: '보석 수집', icon: '💎',
    target: 'collect_item', item: 'goods_gem', count: 5,
    reward: { gold: 4000, exp: 1500, diamonds: 10 },
    timeLimit: 5400,
    difficulty: 'normal',
  },
  delivery_mission: {
    name: '특별 배송', icon: '📦',
    target: 'deliver_count', count: 3,
    reward: { gold: 3000, exp: 2000 },
    timeLimit: 5400,
    difficulty: 'normal',
  },
};

const CONTRACT_CONFIG = {
  maxActiveContracts: 5,
  boardRefreshHours: 6, // 게시판 6시간마다 갱신
  boardSize: 8,
};

let currentBoard = null;
let lastBoardRefresh = 0;
let contractIdCounter = 1;

function _refreshBoard() {
  const types = Object.keys(CONTRACT_TYPES);
  const board = [];
  for (let i = 0; i < CONTRACT_CONFIG.boardSize; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const def = CONTRACT_TYPES[type];
    board.push({
      id: `contract_${contractIdCounter++}`,
      type,
      ...def,
    });
  }
  currentBoard = board;
  lastBoardRefresh = Date.now();
}

function getBoard() {
  const refreshIntervalMs = CONTRACT_CONFIG.boardRefreshHours * 3600 * 1000;
  if (!currentBoard || (Date.now() - lastBoardRefresh) >= refreshIntervalMs) {
    _refreshBoard();
  }
  return currentBoard;
}

function _ensure(player) {
  if (!player.contracts) player.contracts = { active: [], completed: 0, failed: 0 };
  return player.contracts;
}

function acceptContract(player, contractId) {
  const c = _ensure(player);
  if (c.active.length >= CONTRACT_CONFIG.maxActiveContracts) {
    return { success: false, msg: `최대 ${CONTRACT_CONFIG.maxActiveContracts}개 계약` };
  }
  const board = getBoard();
  const contract = board.find(co => co.id === contractId);
  if (!contract) return { success: false, msg: '존재하지 않는 계약' };
  if (c.active.find(co => co.id === contractId)) {
    return { success: false, msg: '이미 수락한 계약' };
  }
  c.active.push({
    ...contract,
    progress: 0,
    acceptedAt: Date.now(),
    expiresAt: Date.now() + contract.timeLimit * 1000,
  });
  return { success: true, contract };
}

function trackContract(player, target, count = 1, extra = {}) {
  const c = _ensure(player);
  const updated = [];
  const now = Date.now();

  for (const contract of c.active) {
    if (contract.expiresAt < now) continue;
    if (contract.target !== target) continue;

    // 추가 매칭 (tier, item)
    if (contract.tier && extra.tier !== contract.tier) continue;
    if (contract.item && extra.item !== contract.item) continue;

    contract.progress += count;
    if (contract.progress >= contract.count) {
      // 완료 — 보상 지급
      const r = contract.reward;
      if (r.gold) player.gold = Math.min(999999999, (player.gold || 0) + r.gold);
      if (r.exp) player.exp = (player.exp || 0) + r.exp;
      if (r.diamonds) player.diamonds = (player.diamonds || 0) + r.diamonds;
      if (r.item) {
        if (!player.inventory) player.inventory = {};
        player.inventory[r.item] = (player.inventory[r.item] || 0) + (r.count || 1);
      }
      c.completed++;
      updated.push({ contract, completed: true, reward: r });
    } else {
      updated.push({ contract, completed: false });
    }
  }

  // 완료된 계약 제거
  c.active = c.active.filter(co => co.progress < co.count && co.expiresAt > now);

  return updated;
}

function abandonContract(player, contractId) {
  const c = _ensure(player);
  const idx = c.active.findIndex(co => co.id === contractId);
  if (idx < 0) return { success: false };
  c.active.splice(idx, 1);
  c.failed++;
  return { success: true };
}

function _cleanExpired(player) {
  const c = _ensure(player);
  const now = Date.now();
  const before = c.active.length;
  c.active = c.active.filter(co => co.expiresAt > now);
  const expired = before - c.active.length;
  if (expired > 0) c.failed += expired;
}

function getStatus(player) {
  _cleanExpired(player);
  const c = _ensure(player);
  return {
    active: c.active,
    board: getBoard(),
    completed: c.completed,
    failed: c.failed,
    maxActive: CONTRACT_CONFIG.maxActiveContracts,
  };
}

module.exports = {
  CONTRACT_TYPES,
  CONTRACT_CONFIG,
  getBoard,
  acceptContract,
  trackContract,
  abandonContract,
  getStatus,
};

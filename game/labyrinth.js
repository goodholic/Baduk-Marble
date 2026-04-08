// 미궁 시스템 — v2.07
// 매일 결정론적 시드로 새 미궁 생성, 플레이어가 방 단위로 탐험
// 방 종류: empty / treasure / monster / trap / exit

const ROOM_TYPES = {
  empty:    { icon:'⬜', desc:'아무것도 없는 방' },
  treasure: { icon:'💰', desc:'보물 상자가 있는 방' },
  monster:  { icon:'👹', desc:'몬스터가 도사리는 방' },
  trap:     { icon:'⚠️', desc:'함정이 설치된 방' },
  exit:     { icon:'🚪', desc:'미궁의 출구' },
  start:    { icon:'🏁', desc:'시작 지점' },
  unknown:  { icon:'❓', desc:'미탐험' },
};

const SIZE = 5; // 5x5 grid
const GOLD_REWARD = { min: 100, max: 500 };
const MONSTER_DAMAGE = { min: 10, max: 30 };
const TRAP_DAMAGE = { min: 5, max: 20 };

function _today() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

// 결정론적 PRNG (mulberry32)
function _prng(seed) {
  return function() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _generateMaze(seed) {
  const rng = _prng(seed);
  const grid = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [];
    for (let x = 0; x < SIZE; x++) {
      const r = rng();
      let type = 'empty';
      if (r < 0.20) type = 'treasure';
      else if (r < 0.40) type = 'monster';
      else if (r < 0.55) type = 'trap';
      row.push(type);
    }
    grid.push(row);
  }
  // 시작/출구 강제 배치
  grid[0][0] = 'start';
  grid[SIZE-1][SIZE-1] = 'exit';
  return grid;
}

function _ensure(player) {
  if (!player.labyrinth) {
    player.labyrinth = {
      day: null,
      grid: null,
      visited: {},     // {"x,y": true}
      pos: { x:0, y:0 },
      rewards: 0,
      damageTaken: 0,
      cleared: false,
      runs: 0,
    };
  }
  return player.labyrinth;
}

function _initIfNeeded(player) {
  const l = _ensure(player);
  const today = _today();
  if (l.day !== today) {
    // 새 일자 → 새 미궁
    const seed = parseInt(today.replace(/-/g,''), 10);
    l.day = today;
    l.grid = _generateMaze(seed);
    l.visited = { '0,0': true };
    l.pos = { x:0, y:0 };
    l.rewards = 0;
    l.damageTaken = 0;
    l.cleared = false;
    l.runs += 1;
  }
}

function getStatus(player) {
  _initIfNeeded(player);
  const l = _ensure(player);
  // 클라이언트에는 방문한 곳만 노출
  const visibleGrid = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [];
    for (let x = 0; x < SIZE; x++) {
      if (l.visited[`${x},${y}`]) {
        row.push(l.grid[y][x]);
      } else {
        row.push('unknown');
      }
    }
    visibleGrid.push(row);
  }
  return {
    day: l.day,
    grid: visibleGrid,
    pos: l.pos,
    size: SIZE,
    rewards: l.rewards,
    damageTaken: l.damageTaken,
    cleared: l.cleared,
    runs: l.runs,
    roomTypes: ROOM_TYPES,
  };
}

function move(player, direction) {
  _initIfNeeded(player);
  const l = _ensure(player);
  if (l.cleared) return { success:false, msg:'오늘 미궁은 이미 클리어' };

  const deltas = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
  const d = deltas[direction];
  if (!d) return { success:false, msg:'잘못된 방향' };

  const nx = l.pos.x + d[0];
  const ny = l.pos.y + d[1];
  if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) {
    return { success:false, msg:'미궁의 벽' };
  }
  l.pos = { x: nx, y: ny };
  l.visited[`${nx},${ny}`] = true;

  const cell = l.grid[ny][nx];
  const events = [];

  // 방 효과 (한 방 1회)
  if (cell === 'treasure' && !l.visited[`treasure_${nx},${ny}`]) {
    l.visited[`treasure_${nx},${ny}`] = true;
    const gold = GOLD_REWARD.min + Math.floor(Math.random() * (GOLD_REWARD.max - GOLD_REWARD.min + 1));
    player.gold = (player.gold || 0) + gold;
    l.rewards += gold;
    events.push({ type:'treasure', msg:`💰 보물! +${gold}G`, gold });
  } else if (cell === 'monster' && !l.visited[`monster_${nx},${ny}`]) {
    l.visited[`monster_${nx},${ny}`] = true;
    const dmg = MONSTER_DAMAGE.min + Math.floor(Math.random() * (MONSTER_DAMAGE.max - MONSTER_DAMAGE.min + 1));
    l.damageTaken += dmg;
    events.push({ type:'monster', msg:`👹 몬스터! -${dmg} HP`, damage: dmg });
  } else if (cell === 'trap' && !l.visited[`trap_${nx},${ny}`]) {
    l.visited[`trap_${nx},${ny}`] = true;
    const dmg = TRAP_DAMAGE.min + Math.floor(Math.random() * (TRAP_DAMAGE.max - TRAP_DAMAGE.min + 1));
    l.damageTaken += dmg;
    events.push({ type:'trap', msg:`⚠️ 함정! -${dmg} HP`, damage: dmg });
  } else if (cell === 'exit') {
    l.cleared = true;
    const bonus = 1000;
    player.gold = (player.gold || 0) + bonus;
    l.rewards += bonus;
    events.push({ type:'exit', msg:`🚪 출구 도달! 클리어 보너스 +${bonus}G`, gold: bonus });
  }

  return {
    success:true,
    msg:`이동 → (${nx},${ny}) ${ROOM_TYPES[cell].icon}`,
    pos: l.pos,
    cell,
    events,
    cleared: l.cleared,
  };
}

module.exports = {
  ROOM_TYPES,
  SIZE,
  getStatus,
  move,
};

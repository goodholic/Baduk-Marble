// ============================================
// 카드 오토체스 배틀 모드
// 2x4 보드에 용병 카드를 배치하고 자동 전투
// ============================================

const BOARD_SIZE = { rows: 2, cols: 4 }; // 8 slots total
const MAX_UNITS = 5; // max cards on board
const MAX_TURNS = 30;
const HISTORY_LIMIT = 10;

const POSITION_BONUSES = {
  front: { atk: 1.0, def: 1.2, taunt: true },  // front row: tank
  back:  { atk: 1.2, def: 0.8, ranged: true },  // back row: damage
};

// Auto-chess synergies (board-specific, separate from PvP)
const CHESS_SYNERGIES = [
  { id: 'cs_warrior2', name: '전사 듀오⚔️⚔️', req: { class: 'warrior', count: 2 }, bonus: { teamDef: 0.15 } },
  { id: 'cs_warrior3', name: '전사 트리오⚔️⚔️⚔️', req: { class: 'warrior', count: 3 }, bonus: { teamDef: 0.3, teamAtk: 0.1 } },
  { id: 'cs_mage2', name: '마법 듀오🔮🔮', req: { class: 'mage', count: 2 }, bonus: { teamMatk: 0.2 } },
  { id: 'cs_assassin2', name: '암살 듀오🗡️🗡️', req: { class: 'assassin', count: 2 }, bonus: { teamCrit: 0.15 } },
  { id: 'cs_healer1', name: '치유사💚', req: { class: 'healer', count: 1 }, bonus: { teamRegen: 0.05 } },
  { id: 'cs_dragon2', name: '용족🐲🐲', req: { race: 'dragon', count: 2 }, bonus: { teamAll: 0.12 } },
  { id: 'cs_undead2', name: '언데드💀💀', req: { race: 'undead', count: 2 }, bonus: { teamLifesteal: 0.08 } },
  { id: 'cs_elf3', name: '엘프 연합🧝🧝🧝', req: { race: 'elf', count: 3 }, bonus: { teamSpd: 0.2, teamEva: 0.1 } },
  { id: 'cs_mixed5', name: '오색 연합🌈', req: { uniqueRaces: 5 }, bonus: { teamAll: 0.15 } },
  { id: 'cs_full', name: '풀 배치👑', req: { units: 5 }, bonus: { teamAll: 0.08 } },
];

// Chess rewards
const CHESS_REWARDS = {
  win:  { gold: 2000, chessPoints: 50, desc: '오토체스 승리' },
  lose: { gold: 500, chessPoints: 10, desc: '오토체스 패배' },
  streak3:  { gold: 3000, diamonds: 5, desc: '3연승 보너스!' },
  streak5:  { gold: 8000, diamonds: 15, desc: '5연승 보너스!' },
  streak10: { gold: 25000, diamonds: 60, title: '오토체스 마스터', desc: '10연승!' },
};

// Chess ranks (separate from PvP)
const CHESS_RANKS = [
  { rank: 'pawn',   name: '졸(Pawn)',     icon: '♟️', minPoints: 0 },
  { rank: 'knight', name: '기사(Knight)',  icon: '♞', minPoints: 200 },
  { rank: 'bishop', name: '비숍(Bishop)',  icon: '♝', minPoints: 500 },
  { rank: 'rook',   name: '룩(Rook)',      icon: '♜', minPoints: 1000 },
  { rank: 'queen',  name: '퀸(Queen)',     icon: '♛', minPoints: 2000 },
  { rank: 'king',   name: '킹(King)',      icon: '♚', minPoints: 4000 },
];

// ============================================
// Board setup & validation
// ============================================

function setupBoard(player, placements) {
  if (!player) return { ok: false, error: '플레이어 정보 없음' };
  if (!placements || !Array.isArray(placements)) return { ok: false, error: '배치 정보가 없습니다' };
  if (placements.length === 0) return { ok: false, error: '최소 1개 유닛을 배치해야 합니다' };
  if (placements.length > MAX_UNITS) return { ok: false, error: `최대 ${MAX_UNITS}개까지 배치 가능합니다` };

  const cards = player.cards || [];
  const cardMap = {};
  for (const c of cards) { cardMap[c.id] = c; }

  const occupied = new Set();
  const boardUnits = [];

  for (const p of placements) {
    const { cardId, row, col } = p;

    // Validate card ownership
    if (!cardMap[cardId]) return { ok: false, error: `카드를 보유하고 있지 않습니다: ${cardId}` };

    // Validate position bounds
    if (row < 0 || row >= BOARD_SIZE.rows) return { ok: false, error: `행(row)은 0~${BOARD_SIZE.rows - 1} 범위여야 합니다` };
    if (col < 0 || col >= BOARD_SIZE.cols) return { ok: false, error: `열(col)은 0~${BOARD_SIZE.cols - 1} 범위여야 합니다` };

    // Validate no duplicate position
    const posKey = `${row},${col}`;
    if (occupied.has(posKey)) return { ok: false, error: `위치 (${row},${col})에 이미 유닛이 있습니다` };
    occupied.add(posKey);

    // Validate no duplicate card
    if (boardUnits.find(u => u.cardId === cardId)) return { ok: false, error: `같은 카드를 두 번 배치할 수 없습니다: ${cardId}` };

    const card = cardMap[cardId];
    const rowType = row === 0 ? 'front' : 'back';
    boardUnits.push({
      cardId,
      card: { ...card },
      row,
      col,
      rowType,
    });
  }

  // Save board to player
  player.chessBoard = boardUnits;
  player.chessBoardTime = Date.now();

  return { ok: true, board: boardUnits, unitCount: boardUnits.length };
}

// ============================================
// Get board state
// ============================================

function getBoard(player) {
  if (!player) return { ok: false, error: '플레이어 정보 없음' };

  const board = player.chessBoard || [];
  if (board.length === 0) return { ok: true, board: [], synergies: [], rank: getChessRank(player) };

  const synergies = calcBoardSynergies(board.map(u => u.card));
  const rank = getChessRank(player);

  // Build grid view
  const grid = [];
  for (let r = 0; r < BOARD_SIZE.rows; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE.cols; c++) {
      const unit = board.find(u => u.row === r && u.col === c);
      row.push(unit ? { cardId: unit.cardId, name: unit.card.name || unit.cardId, rowType: unit.rowType } : null);
    }
    grid.push(row);
  }

  return {
    ok: true,
    board,
    grid,
    synergies,
    unitCount: board.length,
    maxUnits: MAX_UNITS,
    rank,
    stats: {
      chessPoints: player.chessPoints || 0,
      chessWins: player.chessWins || 0,
      chessLosses: player.chessLosses || 0,
      chessStreak: player.chessStreak || 0,
    },
  };
}

// ============================================
// Synergy calculation
// ============================================

function calcBoardSynergies(boardCards) {
  if (!boardCards || boardCards.length === 0) return [];

  const active = [];

  // Count classes and races
  const classCounts = {};
  const raceCounts = {};
  const raceSet = new Set();

  for (const card of boardCards) {
    const cls = card.class || card.type || 'warrior';
    const race = card.race || 'human';
    classCounts[cls] = (classCounts[cls] || 0) + 1;
    raceCounts[race] = (raceCounts[race] || 0) + 1;
    raceSet.add(race);
  }

  for (const syn of CHESS_SYNERGIES) {
    const { req } = syn;
    let matched = false;

    if (req.class && req.count) {
      if ((classCounts[req.class] || 0) >= req.count) matched = true;
    }
    if (req.race && req.count) {
      if ((raceCounts[req.race] || 0) >= req.count) matched = true;
    }
    if (req.uniqueRaces) {
      if (raceSet.size >= req.uniqueRaces) matched = true;
    }
    if (req.units) {
      if (boardCards.length >= req.units) matched = true;
    }

    if (matched) active.push(syn);
  }

  return active;
}

// ============================================
// Build combat-ready unit from card + position + synergies
// ============================================

function buildCombatUnit(unit, synergies) {
  const card = unit.card;
  const posBonus = POSITION_BONUSES[unit.rowType];

  // Base stats
  let atk = (card.atk || 30);
  let def = (card.def || 20);
  let hp = (card.hp || 100);
  let maxHp = hp;
  let spd = (card.spd || 10);
  let critRate = (card.critRate || 0.05);
  let critDmg = (card.critDmg || 1.5);
  let healPow = (card.healPow || 0);
  let lifeSteal = 0;
  let evasion = 0;
  let regen = 0;

  // Position bonuses
  atk = Math.floor(atk * (posBonus.atk || 1));
  def = Math.floor(def * (posBonus.def || 1));

  // Synergy bonuses
  for (const syn of synergies) {
    const b = syn.bonus;
    if (b.teamAtk) atk = Math.floor(atk * (1 + b.teamAtk));
    if (b.teamDef) def = Math.floor(def * (1 + b.teamDef));
    if (b.teamMatk) atk = Math.floor(atk * (1 + b.teamMatk)); // matk adds to atk for simplicity
    if (b.teamCrit) critRate += b.teamCrit;
    if (b.teamRegen) regen += b.teamRegen;
    if (b.teamLifesteal) lifeSteal += b.teamLifesteal;
    if (b.teamSpd) spd = Math.floor(spd * (1 + b.teamSpd));
    if (b.teamEva) evasion += b.teamEva;
    if (b.teamAll) {
      atk = Math.floor(atk * (1 + b.teamAll));
      def = Math.floor(def * (1 + b.teamAll));
      hp = Math.floor(hp * (1 + b.teamAll));
      maxHp = hp;
      spd = Math.floor(spd * (1 + b.teamAll));
    }
  }

  // Star bonus (+15% per star above 0)
  const starMul = 1 + ((card.star || 0) * 0.15);
  atk = Math.floor(atk * starMul);
  def = Math.floor(def * starMul);
  hp = Math.floor(hp * starMul);
  maxHp = hp;

  const cls = card.class || card.type || 'warrior';
  const race = card.race || 'human';

  return {
    id: unit.cardId,
    name: card.name || unit.cardId,
    class: cls,
    race,
    row: unit.row,
    col: unit.col,
    rowType: unit.rowType,
    atk, def, hp, maxHp, spd,
    critRate, critDmg,
    healPow, lifeSteal, evasion, regen,
    taunt: posBonus.taunt || false,
    ranged: posBonus.ranged || false,
    canBypassFront: cls === 'assassin',
    alive: true,
  };
}

// ============================================
// Auto-battle simulation
// ============================================

function simulateChessBattle(boardA, boardB) {
  if (!boardA || boardA.length === 0) return { ok: false, error: 'A팀 보드가 비어 있습니다' };
  if (!boardB || boardB.length === 0) return { ok: false, error: 'B팀 보드가 비어 있습니다' };

  // Calculate synergies
  const synA = calcBoardSynergies(boardA.map(u => u.card));
  const synB = calcBoardSynergies(boardB.map(u => u.card));

  // Build combat units
  const unitsA = boardA.map(u => ({ ...buildCombatUnit(u, synA), team: 'A' }));
  const unitsB = boardB.map(u => ({ ...buildCombatUnit(u, synB), team: 'B' }));

  const allUnits = [...unitsA, ...unitsB];
  const log = [];
  let turn = 0;

  // Helper: get alive units for a team
  const alive = (team) => allUnits.filter(u => u.team === team && u.alive);
  const aliveFront = (team) => alive(team).filter(u => u.rowType === 'front');
  const aliveBack = (team) => alive(team).filter(u => u.rowType === 'back');

  // Helper: pick target
  function pickTarget(attacker) {
    const enemyTeam = attacker.team === 'A' ? 'B' : 'A';
    const enemyFront = aliveFront(enemyTeam);
    const enemyBack = aliveBack(enemyTeam);
    const enemyAll = alive(enemyTeam);

    if (enemyAll.length === 0) return null;

    // Assassins bypass front row and target back row
    if (attacker.canBypassFront && enemyBack.length > 0) {
      // Target lowest HP in back row
      return enemyBack.reduce((a, b) => a.hp < b.hp ? a : b);
    }

    // Normal targeting: front row first (taunt), then back row
    if (enemyFront.length > 0) {
      // Target lowest HP in front row
      return enemyFront.reduce((a, b) => a.hp < b.hp ? a : b);
    }

    // Front row dead, target back row
    return enemyBack.reduce((a, b) => a.hp < b.hp ? a : b);
  }

  // Helper: pick heal target (lowest HP% ally)
  function pickHealTarget(healer) {
    const allies = alive(healer.team).filter(u => u.id !== healer.id && u.hp < u.maxHp);
    if (allies.length === 0) return null;
    return allies.reduce((a, b) => (a.hp / a.maxHp) < (b.hp / b.maxHp) ? a : b);
  }

  // Battle loop
  while (turn < MAX_TURNS) {
    turn++;
    const turnLog = { turn, actions: [] };

    // Sort all alive units by speed (descending), front row acts first on ties
    const actOrder = allUnits
      .filter(u => u.alive)
      .sort((a, b) => {
        if (b.spd !== a.spd) return b.spd - a.spd;
        if (a.rowType !== b.rowType) return a.rowType === 'front' ? -1 : 1;
        return 0;
      });

    for (const unit of actOrder) {
      if (!unit.alive) continue;

      // Check if battle is over
      if (alive('A').length === 0 || alive('B').length === 0) break;

      // Regen at start of unit's turn
      if (unit.regen > 0 && unit.hp < unit.maxHp) {
        const regenAmt = Math.floor(unit.maxHp * unit.regen);
        unit.hp = Math.min(unit.maxHp, unit.hp + regenAmt);
        turnLog.actions.push({
          type: 'regen',
          unit: unit.name,
          team: unit.team,
          amount: regenAmt,
          hpAfter: unit.hp,
        });
      }

      // Healer action: heal lowest HP ally instead of attacking
      const cls = unit.class;
      if (cls === 'healer' && unit.healPow > 0) {
        const healTarget = pickHealTarget(unit);
        if (healTarget) {
          const healAmt = Math.floor(unit.atk * 0.5 + unit.healPow * 0.3 + unit.maxHp * 0.05);
          healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + healAmt);
          turnLog.actions.push({
            type: 'heal',
            healer: unit.name,
            team: unit.team,
            target: healTarget.name,
            amount: healAmt,
            targetHpAfter: healTarget.hp,
          });
          // Healers still do a reduced attack after healing
        }
      }

      // Attack
      const target = pickTarget(unit);
      if (!target) continue;

      // Evasion check
      if (target.evasion > 0 && Math.random() < target.evasion) {
        turnLog.actions.push({
          type: 'evade',
          attacker: unit.name,
          attackerTeam: unit.team,
          target: target.name,
          targetTeam: target.team,
        });
        continue;
      }

      // Crit check
      const isCrit = Math.random() < unit.critRate;
      const critMul = isCrit ? unit.critDmg : 1.0;

      // Random variance (0.9 ~ 1.1)
      const variance = 0.9 + Math.random() * 0.2;

      // Damage calculation
      let dmg = Math.max(1, Math.floor(unit.atk * critMul * variance - target.def * 0.4));

      // Healer penalty: deals 50% less damage
      if (cls === 'healer') dmg = Math.floor(dmg * 0.5);

      target.hp -= dmg;

      // Lifesteal
      let lsHeal = 0;
      if (unit.lifeSteal > 0) {
        lsHeal = Math.floor(dmg * unit.lifeSteal);
        unit.hp = Math.min(unit.maxHp, unit.hp + lsHeal);
      }

      const action = {
        type: 'attack',
        attacker: unit.name,
        attackerTeam: unit.team,
        target: target.name,
        targetTeam: target.team,
        damage: dmg,
        crit: isCrit,
        bypass: unit.canBypassFront && target.rowType === 'back' && aliveFront(target.team).length > 0,
      };
      if (lsHeal > 0) action.lifesteal = lsHeal;

      // Check if target died
      if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
        action.killed = true;
      }

      action.targetHpAfter = target.hp;
      turnLog.actions.push(action);
    }

    log.push(turnLog);

    // Check win condition
    if (alive('A').length === 0 || alive('B').length === 0) break;
  }

  // Determine winner
  const aliveA = alive('A');
  const aliveB = alive('B');
  let winner;
  if (aliveA.length === 0 && aliveB.length === 0) {
    winner = 'draw';
  } else if (aliveA.length === 0) {
    winner = 'B';
  } else if (aliveB.length === 0) {
    winner = 'A';
  } else {
    // Timeout: highest total HP wins
    const hpA = aliveA.reduce((s, u) => s + u.hp, 0);
    const hpB = aliveB.reduce((s, u) => s + u.hp, 0);
    winner = hpA > hpB ? 'A' : hpB > hpA ? 'B' : 'draw';
  }

  return {
    ok: true,
    winner,
    turns: turn,
    survivorsA: aliveA.map(u => ({ name: u.name, hp: u.hp, maxHp: u.maxHp })),
    survivorsB: aliveB.map(u => ({ name: u.name, hp: u.hp, maxHp: u.maxHp })),
    synergiesA: synA.map(s => ({ id: s.id, name: s.name })),
    synergiesB: synB.map(s => ({ id: s.id, name: s.name })),
    log,
  };
}

// ============================================
// Matchmaking queue
// ============================================

const chessQueue = [];
const CHESS_MATCH_RANGE = 300;
const CHESS_RANGE_EXPAND = 150;
const CHESS_EXPAND_INTERVAL = 30000;
const CHESS_MAX_WAIT = 60000;

function queueChessMatch(socketId, player) {
  if (!player) return { ok: false, error: '플레이어 정보 없음' };
  if (!player.chessBoard || player.chessBoard.length === 0) {
    return { ok: false, error: '보드에 유닛을 배치한 후 매칭을 시작하세요' };
  }

  // Already in queue
  if (chessQueue.find(q => q.socketId === socketId)) {
    return { ok: false, error: '이미 대기 중입니다' };
  }

  chessQueue.push({
    socketId,
    player,
    board: player.chessBoard,
    points: player.chessPoints || 0,
    queueTime: Date.now(),
  });

  return { ok: true, position: chessQueue.length, message: '매칭 대기열에 등록되었습니다' };
}

function leaveChessQueue(socketId) {
  const idx = chessQueue.findIndex(q => q.socketId === socketId);
  if (idx !== -1) {
    chessQueue.splice(idx, 1);
    return { ok: true };
  }
  return { ok: false, error: '큐에 없습니다' };
}

// Generate a bot board based on player strength
function generateBotBoard(playerBoard, playerPoints) {
  const diffScale = Math.min(1.3, 0.7 + (playerPoints || 0) / 3000);
  return playerBoard.map(u => ({
    ...u,
    cardId: 'bot_' + u.cardId,
    card: {
      ...u.card,
      id: 'bot_' + (u.card.id || u.cardId),
      name: (u.card.name || 'Bot') + ' (Bot)',
      atk: Math.floor((u.card.atk || 30) * (diffScale * (0.85 + Math.random() * 0.3))),
      def: Math.floor((u.card.def || 20) * (diffScale * (0.85 + Math.random() * 0.3))),
      hp: Math.floor((u.card.hp || 100) * (diffScale * (0.85 + Math.random() * 0.3))),
      spd: Math.floor((u.card.spd || 10) * (diffScale * (0.9 + Math.random() * 0.2))),
    },
  }));
}

function applyChessRewards(player, isWin) {
  const reward = isWin ? CHESS_REWARDS.win : CHESS_REWARDS.lose;
  player.gold = (player.gold || 0) + reward.gold;
  player.chessPoints = (player.chessPoints || 0) + reward.chessPoints;
  player.chessStreak = isWin ? (player.chessStreak || 0) + 1 : 0;
  player.chessWins = (player.chessWins || 0) + (isWin ? 1 : 0);
  player.chessLosses = (player.chessLosses || 0) + (isWin ? 0 : 1);

  let streakReward = null;
  if (player.chessStreak >= 10) streakReward = CHESS_REWARDS.streak10;
  else if (player.chessStreak >= 5) streakReward = CHESS_REWARDS.streak5;
  else if (player.chessStreak >= 3) streakReward = CHESS_REWARDS.streak3;

  if (streakReward) {
    player.gold = (player.gold || 0) + (streakReward.gold || 0);
    if (streakReward.diamonds) player.diamonds = (player.diamonds || 0) + streakReward.diamonds;
    if (streakReward.title) {
      player.titles = player.titles || [];
      if (!player.titles.includes(streakReward.title)) player.titles.push(streakReward.title);
    }
  }

  return { reward, streakReward };
}

function saveChessHistory(player, entry) {
  player.chessHistory = player.chessHistory || [];
  player.chessHistory.unshift(entry);
  if (player.chessHistory.length > HISTORY_LIMIT) {
    player.chessHistory = player.chessHistory.slice(0, HISTORY_LIMIT);
  }
}

function processChessQueue(io) {
  const now = Date.now();

  for (let i = 0; i < chessQueue.length; i++) {
    const entry = chessQueue[i];
    const waitTime = now - entry.queueTime;
    const range = CHESS_MATCH_RANGE + Math.floor(waitTime / CHESS_EXPAND_INTERVAL) * CHESS_RANGE_EXPAND;

    // Try to find a match
    for (let j = i + 1; j < chessQueue.length; j++) {
      const opponent = chessQueue[j];
      if (Math.abs(entry.points - opponent.points) <= range) {
        // Match found -- remove both from queue
        chessQueue.splice(j, 1);
        chessQueue.splice(i, 1);
        i--;

        // Run battle
        const result = simulateChessBattle(entry.board, opponent.board);
        const isEntryWin = result.winner === 'A';

        // Apply rewards
        const entryReward = applyChessRewards(entry.player, isEntryWin);
        const oppReward = applyChessRewards(opponent.player, !isEntryWin);

        // Save history
        saveChessHistory(entry.player, {
          opponent: opponent.player.name || 'Player',
          result: isEntryWin ? 'win' : 'lose',
          turns: result.turns,
          survivorsA: result.survivorsA,
          survivorsB: result.survivorsB,
          synergiesA: result.synergiesA,
          synergiesB: result.synergiesB,
          time: Date.now(),
        });
        saveChessHistory(opponent.player, {
          opponent: entry.player.name || 'Player',
          result: isEntryWin ? 'lose' : 'win',
          turns: result.turns,
          survivorsA: result.survivorsB,
          survivorsB: result.survivorsA,
          synergiesA: result.synergiesB,
          synergiesB: result.synergiesA,
          time: Date.now(),
        });

        // Emit results
        const entryRank = getChessRank(entry.player);
        const oppRank = getChessRank(opponent.player);

        io.to(entry.socketId).emit('chess_match_result', {
          ok: true, win: isEntryWin, result,
          reward: entryReward.reward, streakReward: entryReward.streakReward,
          streak: entry.player.chessStreak, rank: entryRank,
          chessPoints: entry.player.chessPoints,
          opponent: opponent.player.name || 'Player',
        });
        io.to(opponent.socketId).emit('chess_match_result', {
          ok: true, win: !isEntryWin,
          result: { ...result, winner: result.winner === 'A' ? 'B' : result.winner === 'B' ? 'A' : 'draw' },
          reward: oppReward.reward, streakReward: oppReward.streakReward,
          streak: opponent.player.chessStreak, rank: oppRank,
          chessPoints: opponent.player.chessPoints,
          opponent: entry.player.name || 'Player',
        });

        break;
      }
    }

    // Bot match after timeout
    if (chessQueue[i] && waitTime >= CHESS_MAX_WAIT) {
      const entry2 = chessQueue.splice(i, 1)[0];
      i--;

      const botBoard = generateBotBoard(entry2.board, entry2.points);
      const result = simulateChessBattle(entry2.board, botBoard);
      const isWin = result.winner === 'A';

      const reward = applyChessRewards(entry2.player, isWin);
      saveChessHistory(entry2.player, {
        opponent: 'AI Bot',
        result: isWin ? 'win' : 'lose',
        turns: result.turns,
        survivorsA: result.survivorsA,
        survivorsB: result.survivorsB,
        synergiesA: result.synergiesA,
        synergiesB: result.synergiesB,
        isBot: true,
        time: Date.now(),
      });

      const rank = getChessRank(entry2.player);
      io.to(entry2.socketId).emit('chess_match_result', {
        ok: true, win: isWin, result, isBot: true,
        reward: reward.reward, streakReward: reward.streakReward,
        streak: entry2.player.chessStreak, rank,
        chessPoints: entry2.player.chessPoints,
        opponent: 'AI Bot',
      });
    }
  }
}

// ============================================
// Ranking & history
// ============================================

function getChessRank(player) {
  const pts = player.chessPoints || 0;
  return [...CHESS_RANKS].reverse().find(r => pts >= r.minPoints) || CHESS_RANKS[0];
}

function getChessRanking(allPlayers) {
  if (!allPlayers || !Array.isArray(allPlayers)) return [];

  return allPlayers
    .filter(p => (p.chessWins || 0) + (p.chessLosses || 0) > 0)
    .map(p => ({
      name: p.name || 'Unknown',
      chessPoints: p.chessPoints || 0,
      wins: p.chessWins || 0,
      losses: p.chessLosses || 0,
      winRate: (p.chessWins || 0) > 0
        ? Math.round(((p.chessWins || 0) / ((p.chessWins || 0) + (p.chessLosses || 0))) * 100)
        : 0,
      streak: p.chessStreak || 0,
      rank: getChessRank(p),
    }))
    .sort((a, b) => b.chessPoints - a.chessPoints)
    .slice(0, 50);
}

function getChessHistory(player) {
  if (!player) return [];
  return (player.chessHistory || []).slice(0, HISTORY_LIMIT);
}

// ============================================
// Socket event registration
// ============================================

function register(socket, player) {
  // Setup board
  socket.on('chess_setup_board', (data) => {
    const placements = (data && data.placements) || [];
    const result = setupBoard(player, placements);
    socket.emit('chess_setup_board', result);
  });

  // Get current board state
  socket.on('chess_get_board', () => {
    const result = getBoard(player);
    socket.emit('chess_get_board', result);
  });

  // Enter matchmaking queue
  socket.on('chess_queue', (data) => {
    const action = (data && data.action) || 'join';
    if (action === 'leave') {
      const result = leaveChessQueue(socket.id);
      socket.emit('chess_queue', result);
    } else {
      const result = queueChessMatch(socket.id, player);
      socket.emit('chess_queue', result);
    }
  });

  // Match history
  socket.on('chess_history', () => {
    const history = getChessHistory(player);
    const rank = getChessRank(player);
    socket.emit('chess_history', {
      history,
      rank,
      stats: {
        chessPoints: player.chessPoints || 0,
        wins: player.chessWins || 0,
        losses: player.chessLosses || 0,
        streak: player.chessStreak || 0,
      },
    });
  });

  // Leaderboard
  socket.on('chess_ranking', () => {
    // Collect all players from the global players map if available
    const allPlayers = global._allPlayers || [];
    const ranking = getChessRanking(allPlayers);
    const myRank = getChessRank(player);
    socket.emit('chess_ranking', { ranking, myRank, myPoints: player.chessPoints || 0 });
  });
}

// ============================================
// Exports
// ============================================

module.exports = {
  BOARD_SIZE,
  MAX_UNITS,
  MAX_TURNS,
  POSITION_BONUSES,
  CHESS_SYNERGIES,
  CHESS_REWARDS,
  CHESS_RANKS,
  setupBoard,
  getBoard,
  calcBoardSynergies,
  simulateChessBattle,
  queueChessMatch,
  leaveChessQueue,
  processChessQueue,
  getChessRanking,
  getChessHistory,
  getChessRank,
  register,
};

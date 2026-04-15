// ============================================
// 미니게임 컬렉션 — 캐주얼 재미 + 보상
// ============================================

const MINIGAMES = {
  // 1. 가위바위보 도박
  rps: {
    name: '가위바위보🪨📄✂️',
    cost: 500,
    desc: '딜러와 가위바위보! 이기면 3배!',
  },

  // 2. 카드 뒤집기 (기억력)
  memory: {
    name: '카드 뒤집기🃏🃏',
    cost: 1000,
    desc: '8장 중 짝 맞추기! 시도 횟수로 보상!',
    pairs: 4,
  },

  // 3. 슬롯머신
  slots: {
    name: '슬롯머신🎰',
    cost: 300,
    desc: '3릴 맞추기! 잭팟은 100배!',
    symbols: ['🍒', '🍊', '🍋', '🔔', '💎', '7️⃣', '👑'],
    payouts: {
      '👑👑👑': 100, '7️⃣7️⃣7️⃣': 50, '💎💎💎': 30,
      '🔔🔔🔔': 15, '🍋🍋🍋': 10, '🍊🍊🍊': 7, '🍒🍒🍒': 5,
      '👑👑': 3, '7️⃣7️⃣': 2, '💎💎': 1.5,
    },
  },

  // 4. 행운의 룰렛
  roulette: {
    name: '행운의 룰렛🎡',
    cost: 2000,
    desc: '룰렛을 돌려 보상 획득! 대박 or 꽝!',
    prizes: [
      { name: '💎 다이아 50', weight: 1, reward: { diamonds: 50 } },
      { name: '🌟 전설 카드', weight: 2, reward: { card: 'legend' } },
      { name: '💰 골드 10000', weight: 5, reward: { gold: 10000 } },
      { name: '💎 다이아 10', weight: 8, reward: { diamonds: 10 } },
      { name: '💰 골드 5000', weight: 12, reward: { gold: 5000 } },
      { name: '💰 골드 3000', weight: 15, reward: { gold: 3000 } },
      { name: '💰 골드 1000', weight: 20, reward: { gold: 1000 } },
      { name: '😢 꽝!', weight: 15, reward: { gold: 100 } },
      { name: '🃏 일반 카드', weight: 22, reward: { card: 'normal' } },
    ],
  },

  // 5. 숫자 맞추기
  numberGuess: {
    name: '숫자 맞추기🔢',
    cost: 800,
    desc: '1~100 중 숫자를 맞춰라! 적은 시도 = 높은 보상!',
    maxAttempts: 7,
    range: [1, 100],
  },

  // 6. 주사위 대결
  dice: {
    name: '주사위 대결🎲🎲',
    cost: 1000,
    desc: '6면 주사위 3개! 합이 높으면 승리!',
  },
};

const DAILY_PLAY_LIMIT = 10;

// ============================================
// 유틸리티
// ============================================

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ensureMinigameData(player) {
  if (!player._minigame) {
    player._minigame = {
      dailyPlays: {},   // { '2026-04-15': 5 }
      history: [],      // last 20 results
      stats: {
        totalPlayed: 0,
        totalWon: 0,
        totalLost: 0,
        biggestWin: 0,
        gameCounts: {},  // { rps: 5, slots: 12, ... }
      },
    };
  }
  return player._minigame;
}

function getDailyPlays(player) {
  const data = ensureMinigameData(player);
  const today = getTodayKey();
  return data.dailyPlays[today] || 0;
}

function incrementDailyPlays(player) {
  const data = ensureMinigameData(player);
  const today = getTodayKey();
  data.dailyPlays[today] = (data.dailyPlays[today] || 0) + 1;
  // 오래된 날짜 정리 (3일 이전)
  for (const key of Object.keys(data.dailyPlays)) {
    if (key < getTodayKey() && key !== today) {
      delete data.dailyPlays[key];
    }
  }
}

function canPlay(player, gameKey) {
  if (getDailyPlays(player) >= DAILY_PLAY_LIMIT) {
    return { ok: false, msg: `일일 미니게임 횟수 소진 (${DAILY_PLAY_LIMIT}회)` };
  }
  const game = MINIGAMES[gameKey];
  if (!game) return { ok: false, msg: '존재하지 않는 미니게임' };
  if ((player.gold || 0) < game.cost) {
    return { ok: false, msg: `골드 부족 (필요: ${game.cost}G, 보유: ${player.gold || 0}G)` };
  }
  return { ok: true };
}

function deductCost(player, gameKey) {
  player.gold = (player.gold || 0) - MINIGAMES[gameKey].cost;
}

function addReward(player, gold) {
  player.gold = (player.gold || 0) + gold;
}

function recordResult(player, gameKey, result, netGain) {
  const data = ensureMinigameData(player);
  incrementDailyPlays(player);

  data.history.unshift({
    game: gameKey,
    gameName: MINIGAMES[gameKey].name,
    result,
    netGain,
    time: Date.now(),
  });
  if (data.history.length > 20) data.history.length = 20;

  data.stats.totalPlayed++;
  if (netGain > 0) {
    data.stats.totalWon += netGain;
    if (netGain > data.stats.biggestWin) data.stats.biggestWin = netGain;
  } else {
    data.stats.totalLost += Math.abs(netGain);
  }
  data.stats.gameCounts[gameKey] = (data.stats.gameCounts[gameKey] || 0) + 1;
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================
// 1. 가위바위보 (RPS)
// ============================================

const RPS_CHOICES = ['rock', 'paper', 'scissors'];
const RPS_NAMES = { rock: '바위🪨', paper: '보📄', scissors: '가위✂️' };

function playRPS(player, choice) {
  const check = canPlay(player, 'rps');
  if (!check.ok) return { success: false, msg: check.msg };
  if (!RPS_CHOICES.includes(choice)) return { success: false, msg: '잘못된 선택 (rock/paper/scissors)' };

  deductCost(player, 'rps');
  const cost = MINIGAMES.rps.cost;

  const dealerChoice = RPS_CHOICES[Math.floor(Math.random() * 3)];

  let outcome, payout, netGain;
  if (choice === dealerChoice) {
    outcome = 'draw';
    payout = cost;
    netGain = 0;
  } else if (
    (choice === 'rock' && dealerChoice === 'scissors') ||
    (choice === 'paper' && dealerChoice === 'rock') ||
    (choice === 'scissors' && dealerChoice === 'paper')
  ) {
    outcome = 'win';
    payout = cost * 3;
    netGain = cost * 2;
  } else {
    outcome = 'lose';
    payout = 0;
    netGain = -cost;
  }

  addReward(player, payout);
  recordResult(player, 'rps', outcome, netGain);

  return {
    success: true,
    playerChoice: RPS_NAMES[choice],
    dealerChoice: RPS_NAMES[dealerChoice],
    outcome,
    payout,
    netGain,
    gold: player.gold,
  };
}

// ============================================
// 2. 카드 뒤집기 (Memory)
// ============================================

const MEMORY_SYMBOLS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐸'];

function startMemory(player) {
  const check = canPlay(player, 'memory');
  if (!check.ok) return { success: false, msg: check.msg };

  deductCost(player, 'memory');

  // 4쌍 = 8장
  const pairs = MINIGAMES.memory.pairs;
  const chosen = shuffleArray(MEMORY_SYMBOLS).slice(0, pairs);
  const board = shuffleArray([...chosen, ...chosen]);

  player._minigameState = {
    type: 'memory',
    board,               // actual symbols
    revealed: new Array(8).fill(false),
    firstFlip: null,     // index of first card in current turn
    attempts: 0,
    pairsFound: 0,
    totalPairs: pairs,
  };

  return {
    success: true,
    msg: '카드 뒤집기 시작! 8장의 카드에서 짝을 맞추세요.',
    boardSize: 8,
    // 모든 카드 뒷면 표시
    display: new Array(8).fill('❓'),
    gold: player.gold,
  };
}

function flipMemoryCard(player, position) {
  const state = player._minigameState;
  if (!state || state.type !== 'memory') {
    return { success: false, msg: '진행 중인 카드 뒤집기 게임이 없습니다.' };
  }
  if (position < 0 || position >= 8) {
    return { success: false, msg: '위치는 0~7 사이여야 합니다.' };
  }
  if (state.revealed[position]) {
    return { success: false, msg: '이미 뒤집힌 카드입니다.' };
  }

  const symbol = state.board[position];

  if (state.firstFlip === null) {
    // 첫 번째 카드 뒤집기
    state.firstFlip = position;
    const display = state.board.map((s, i) =>
      state.revealed[i] ? s : (i === position ? s : '❓')
    );
    return {
      success: true,
      phase: 'first',
      position,
      symbol,
      display,
      attempts: state.attempts,
      pairsFound: state.pairsFound,
    };
  }

  // 두 번째 카드 뒤집기
  state.attempts++;
  const firstIdx = state.firstFlip;
  const firstSymbol = state.board[firstIdx];
  state.firstFlip = null;

  const matched = firstSymbol === symbol && firstIdx !== position;
  if (matched) {
    state.revealed[firstIdx] = true;
    state.revealed[position] = true;
    state.pairsFound++;
  }

  const display = state.board.map((s, i) =>
    state.revealed[i] ? s : '❓'
  );

  // 게임 완료 확인
  if (state.pairsFound >= state.totalPairs) {
    let reward;
    if (state.attempts <= 4) reward = 5000;
    else if (state.attempts <= 8) reward = 3000;
    else reward = 1000;

    const netGain = reward - MINIGAMES.memory.cost;
    addReward(player, reward);
    recordResult(player, 'memory', `완료 (${state.attempts}회)`, netGain);
    player._minigameState = null;

    return {
      success: true,
      phase: 'complete',
      position,
      symbol,
      matched: true,
      display: state.board,
      attempts: state.attempts,
      pairsFound: state.pairsFound,
      reward,
      netGain,
      gold: player.gold,
      msg: `축하합니다! ${state.attempts}회 만에 클리어! ${reward}G 획득!`,
    };
  }

  return {
    success: true,
    phase: 'second',
    position,
    symbol,
    firstPosition: firstIdx,
    firstSymbol,
    matched,
    display,
    // 매칭 실패 시 두 카드 모두 다시 가림 (display에 반영됨)
    attempts: state.attempts,
    pairsFound: state.pairsFound,
  };
}

// ============================================
// 3. 슬롯머신 (Slots)
// ============================================

function spinSlots(player) {
  const check = canPlay(player, 'slots');
  if (!check.ok) return { success: false, msg: check.msg };

  deductCost(player, 'slots');
  const cost = MINIGAMES.slots.cost;
  const symbols = MINIGAMES.slots.symbols;
  const payouts = MINIGAMES.slots.payouts;

  // 3릴 랜덤
  const reels = [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  // 3개 일치 확인
  const key3 = reels.join('');
  let multiplier = 0;
  let matchType = 'none';

  if (payouts[key3] !== undefined) {
    multiplier = payouts[key3];
    matchType = 'triple';
  } else {
    // 2개 일치 (왼쪽부터)
    const key2 = reels[0] + reels[1];
    if (payouts[key2] !== undefined) {
      multiplier = payouts[key2];
      matchType = 'double';
    }
  }

  const payout = Math.floor(cost * multiplier);
  const netGain = payout - cost;

  addReward(player, payout);
  recordResult(player, 'slots', `${reels.join(' ')} (${matchType})`, netGain);

  return {
    success: true,
    reels,
    matchType,
    multiplier,
    payout,
    netGain,
    gold: player.gold,
    isJackpot: multiplier >= 50,
    msg: multiplier >= 50
      ? `🎉 잭팟! ${reels.join('')} — ${payout}G 획득!`
      : multiplier > 0
        ? `${reels.join(' ')} — ${payout}G 획득!`
        : `${reels.join(' ')} — 꽝!`,
  };
}

// ============================================
// 4. 행운의 룰렛 (Roulette)
// ============================================

function spinRoulette(player) {
  const check = canPlay(player, 'roulette');
  if (!check.ok) return { success: false, msg: check.msg };

  deductCost(player, 'roulette');
  const cost = MINIGAMES.roulette.cost;
  const prizes = MINIGAMES.roulette.prizes;

  // 가중치 기반 랜덤 선택
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * totalWeight;
  let selected = prizes[prizes.length - 1];

  for (const prize of prizes) {
    roll -= prize.weight;
    if (roll <= 0) {
      selected = prize;
      break;
    }
  }

  // 보상 지급
  const reward = selected.reward;
  let rewardDesc = '';
  let goldGained = 0;

  if (reward.gold) {
    addReward(player, reward.gold);
    goldGained = reward.gold;
    rewardDesc = `${reward.gold}G`;
  }
  if (reward.diamonds) {
    player.diamonds = (player.diamonds || 0) + reward.diamonds;
    rewardDesc = `다이아 ${reward.diamonds}개`;
  }
  if (reward.card) {
    // 카드 보상 — 인벤토리에 추가 (존재하면)
    if (!player.cardInventory) player.cardInventory = [];
    const cardRarity = reward.card;
    player.cardInventory.push({
      rarity: cardRarity,
      obtainedAt: Date.now(),
      source: 'roulette',
    });
    rewardDesc = `${cardRarity === 'legend' ? '전설' : '일반'} 카드`;
  }

  const netGain = goldGained - cost;
  recordResult(player, 'roulette', selected.name, netGain);

  // 애니메이션 데이터: 룰렛 인덱스 + 회전 각도
  const prizeIndex = prizes.indexOf(selected);
  const sliceAngle = 360 / prizes.length;
  const spinAngle = 360 * (3 + Math.floor(Math.random() * 3)) + prizeIndex * sliceAngle + Math.random() * sliceAngle * 0.8;

  return {
    success: true,
    prize: selected.name,
    reward: selected.reward,
    rewardDesc,
    netGain,
    gold: player.gold,
    diamonds: player.diamonds || 0,
    animation: {
      prizeIndex,
      totalPrizes: prizes.length,
      spinAngle,
      duration: 3000,
    },
    msg: `룰렛 결과: ${selected.name} — ${rewardDesc} 획득!`,
  };
}

// ============================================
// 5. 숫자 맞추기 (Number Guess)
// ============================================

function startNumberGuess(player) {
  const check = canPlay(player, 'numberGuess');
  if (!check.ok) return { success: false, msg: check.msg };

  deductCost(player, 'numberGuess');

  const [min, max] = MINIGAMES.numberGuess.range;
  const target = Math.floor(Math.random() * (max - min + 1)) + min;

  player._minigameState = {
    type: 'numberGuess',
    target,
    attempts: 0,
    maxAttempts: MINIGAMES.numberGuess.maxAttempts,
    guesses: [],
  };

  return {
    success: true,
    msg: `숫자 맞추기 시작! ${min}~${max} 사이의 숫자를 맞추세요. (최대 ${MINIGAMES.numberGuess.maxAttempts}회)`,
    range: [min, max],
    maxAttempts: MINIGAMES.numberGuess.maxAttempts,
    gold: player.gold,
  };
}

function guessNumber(player, guess) {
  const state = player._minigameState;
  if (!state || state.type !== 'numberGuess') {
    return { success: false, msg: '진행 중인 숫자 맞추기 게임이 없습니다.' };
  }

  guess = parseInt(guess, 10);
  if (isNaN(guess) || guess < 1 || guess > 100) {
    return { success: false, msg: '1~100 사이의 숫자를 입력하세요.' };
  }

  state.attempts++;
  state.guesses.push(guess);

  if (guess === state.target) {
    // 정답!
    let reward;
    if (state.attempts <= 3) reward = 5000;
    else if (state.attempts <= 5) reward = 3000;
    else reward = 1500;

    const netGain = reward - MINIGAMES.numberGuess.cost;
    addReward(player, reward);
    recordResult(player, 'numberGuess', `정답 (${state.attempts}회)`, netGain);
    player._minigameState = null;

    return {
      success: true,
      result: 'correct',
      target: guess,
      attempts: state.attempts,
      reward,
      netGain,
      gold: player.gold,
      msg: `정답! ${state.attempts}회 만에 맞춤! ${reward}G 획득!`,
    };
  }

  // 시도 횟수 초과
  if (state.attempts >= state.maxAttempts) {
    const netGain = -MINIGAMES.numberGuess.cost;
    recordResult(player, 'numberGuess', '실패', netGain);
    const target = state.target;
    player._minigameState = null;

    return {
      success: true,
      result: 'fail',
      target,
      attempts: state.attempts,
      reward: 0,
      netGain,
      gold: player.gold,
      msg: `실패! 정답은 ${target}이었습니다.`,
    };
  }

  const hint = guess < state.target ? 'higher' : 'lower';
  const hintMsg = guess < state.target ? '더 큽니다! ⬆️' : '더 작습니다! ⬇️';

  return {
    success: true,
    result: hint,
    guess,
    attempts: state.attempts,
    remaining: state.maxAttempts - state.attempts,
    guesses: state.guesses,
    msg: hintMsg,
  };
}

// ============================================
// 6. 주사위 대결 (Dice)
// ============================================

function rollDice(count) {
  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * 6) + 1);
  }
  return rolls;
}

function playDice(player) {
  const check = canPlay(player, 'dice');
  if (!check.ok) return { success: false, msg: check.msg };

  deductCost(player, 'dice');
  const cost = MINIGAMES.dice.cost;

  const playerRolls = rollDice(3);
  const dealerRolls = rollDice(3);
  const playerTotal = playerRolls.reduce((a, b) => a + b, 0);
  const dealerTotal = dealerRolls.reduce((a, b) => a + b, 0);

  const isTripleSix = playerRolls.every(r => r === 6);

  let outcome, payout, netGain;

  if (isTripleSix) {
    outcome = 'jackpot';
    payout = cost * 5;
    netGain = cost * 4;
  } else if (playerTotal > dealerTotal) {
    outcome = 'win';
    payout = cost * 2;
    netGain = cost;
  } else if (playerTotal === dealerTotal) {
    outcome = 'draw';
    payout = cost;
    netGain = 0;
  } else {
    outcome = 'lose';
    payout = 0;
    netGain = -cost;
  }

  addReward(player, payout);
  recordResult(player, 'dice', outcome, netGain);

  return {
    success: true,
    playerRolls,
    dealerRolls,
    playerTotal,
    dealerTotal,
    outcome,
    isTripleSix,
    payout,
    netGain,
    gold: player.gold,
    msg: isTripleSix
      ? `🎉 트리플 식스! [${playerRolls}] vs [${dealerRolls}] — ${payout}G 획득!`
      : outcome === 'win'
        ? `승리! [${playerRolls}](${playerTotal}) vs [${dealerRolls}](${dealerTotal}) — ${payout}G 획득!`
        : outcome === 'draw'
          ? `무승부! [${playerRolls}](${playerTotal}) vs [${dealerRolls}](${dealerTotal}) — 베팅금 반환`
          : `패배! [${playerRolls}](${playerTotal}) vs [${dealerRolls}](${dealerTotal})`,
  };
}

// ============================================
// 조회 함수
// ============================================

function getMinigameList(player) {
  const dailyPlays = getDailyPlays(player);
  const data = ensureMinigameData(player);

  const list = Object.entries(MINIGAMES).map(([key, game]) => ({
    key,
    name: game.name,
    cost: game.cost,
    desc: game.desc,
    playCount: data.stats.gameCounts[key] || 0,
  }));

  return {
    games: list,
    dailyPlays,
    dailyLimit: DAILY_PLAY_LIMIT,
    remaining: Math.max(0, DAILY_PLAY_LIMIT - dailyPlays),
    gold: player.gold || 0,
  };
}

function getMinigameHistory(player) {
  const data = ensureMinigameData(player);
  return {
    history: data.history,
    count: data.history.length,
  };
}

function getMinigameStats(player) {
  const data = ensureMinigameData(player);
  const s = data.stats;

  // 가장 많이 한 게임 찾기
  let favoriteGame = null;
  let maxCount = 0;
  for (const [key, count] of Object.entries(s.gameCounts)) {
    if (count > maxCount) {
      maxCount = count;
      favoriteGame = key;
    }
  }

  return {
    totalPlayed: s.totalPlayed,
    totalWon: s.totalWon,
    totalLost: s.totalLost,
    netProfit: s.totalWon - s.totalLost,
    biggestWin: s.biggestWin,
    favoriteGame: favoriteGame ? MINIGAMES[favoriteGame].name : '없음',
    favoriteGameKey: favoriteGame,
    favoriteGameCount: maxCount,
    gameCounts: s.gameCounts,
  };
}

// ============================================
// Socket.io 이벤트 등록
// ============================================

function registerMinigameHandlers(io, socket, getPlayer) {
  // 미니게임 목록
  socket.on('minigame_list', () => {
    const player = getPlayer(socket);
    if (!player) return;
    socket.emit('minigame_list', getMinigameList(player));
  });

  // 가위바위보
  socket.on('minigame_rps', (data) => {
    const player = getPlayer(socket);
    if (!player) return;
    const result = playRPS(player, data && data.choice);
    socket.emit('minigame_rps', result);
  });

  // 카드 뒤집기 — 시작
  socket.on('minigame_memory_start', () => {
    const player = getPlayer(socket);
    if (!player) return;
    const result = startMemory(player);
    socket.emit('minigame_memory_start', result);
  });

  // 카드 뒤집기 — 카드 선택
  socket.on('minigame_memory_flip', (data) => {
    const player = getPlayer(socket);
    if (!player) return;
    const result = flipMemoryCard(player, data && data.position);
    socket.emit('minigame_memory_flip', result);
  });

  // 슬롯머신
  socket.on('minigame_slots', () => {
    const player = getPlayer(socket);
    if (!player) return;
    const result = spinSlots(player);
    socket.emit('minigame_slots', result);
  });

  // 룰렛
  socket.on('minigame_roulette', () => {
    const player = getPlayer(socket);
    if (!player) return;
    const result = spinRoulette(player);
    socket.emit('minigame_roulette', result);
  });

  // 숫자 맞추기 — 시작
  socket.on('minigame_number_start', () => {
    const player = getPlayer(socket);
    if (!player) return;
    const result = startNumberGuess(player);
    socket.emit('minigame_number_start', result);
  });

  // 숫자 맞추기 — 추측
  socket.on('minigame_number_guess', (data) => {
    const player = getPlayer(socket);
    if (!player) return;
    const result = guessNumber(player, data && data.guess);
    socket.emit('minigame_number_guess', result);
  });

  // 주사위 대결
  socket.on('minigame_dice', () => {
    const player = getPlayer(socket);
    if (!player) return;
    const result = playDice(player);
    socket.emit('minigame_dice', result);
  });

  // 기록 조회
  socket.on('minigame_history', () => {
    const player = getPlayer(socket);
    if (!player) return;
    socket.emit('minigame_history', getMinigameHistory(player));
  });

  // 통계 조회
  socket.on('minigame_stats', () => {
    const player = getPlayer(socket);
    if (!player) return;
    socket.emit('minigame_stats', getMinigameStats(player));
  });
}

// ============================================
// Exports
// ============================================

module.exports = {
  MINIGAMES,
  DAILY_PLAY_LIMIT,
  // 개별 게임
  playRPS,
  startMemory,
  flipMemoryCard,
  spinSlots,
  spinRoulette,
  startNumberGuess,
  guessNumber,
  playDice,
  // 조회
  getMinigameList,
  getMinigameHistory,
  getMinigameStats,
  // 소켓 등록
  registerMinigameHandlers,
};

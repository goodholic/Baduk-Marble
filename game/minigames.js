// 미니게임 모음 — v2.58
// 낚시 대회, 보물지도 탐험, 카드 뒤집기, 몬스터 퀴즈

// ═══ 낚시 대회 ═══
const FISHING_TOURNAMENT = {
  duration: 300, // 5분
  entryFee: 500,
  minPlayers: 1,
  fishTypes: [
    { name: '잡어', icon: '🐟', points: 1, weight: 50 },
    { name: '참돔', icon: '🐠', points: 3, weight: 25 },
    { name: '복어', icon: '🐡', points: 5, weight: 12 },
    { name: '황금 잉어', icon: '✨', points: 10, weight: 5 },
    { name: '용왕의 물고기', icon: '🐲', points: 25, weight: 2 },
    { name: '전설의 대어', icon: '👑', points: 50, weight: 1 },
  ],
  rewards: {
    1: { gold: 15000, diamonds: 80, title: 'master_fisher' },
    2: { gold: 8000, diamonds: 40 },
    3: { gold: 4000, diamonds: 20 },
  },
};

let fishTournament = { phase: 'idle', players: {}, startTime: 0, endTime: 0 };

function startFishTournament(io) {
  if (fishTournament.phase !== 'idle') return { success: false, msg: '이미 진행 중' };
  fishTournament = { phase: 'active', players: {}, startTime: Date.now(), endTime: Date.now() + FISHING_TOURNAMENT.duration * 1000 };
  if (io) io.emit('server_msg', { msg: '🎣 낚시 대회 시작! ' + (FISHING_TOURNAMENT.duration/60) + '분간 가장 많은 포인트를 모으세요!', type: 'boss' });
  setTimeout(() => endFishTournament(io), FISHING_TOURNAMENT.duration * 1000);
  return { success: true };
}

function fishTournamentCatch(playerId, playerName) {
  if (fishTournament.phase !== 'active') return null;
  const totalWeight = FISHING_TOURNAMENT.fishTypes.reduce((s, f) => s + f.weight, 0);
  let roll = Math.random() * totalWeight;
  let caught = FISHING_TOURNAMENT.fishTypes[0];
  for (const fish of FISHING_TOURNAMENT.fishTypes) {
    roll -= fish.weight;
    if (roll <= 0) { caught = fish; break; }
  }
  if (!fishTournament.players[playerId]) fishTournament.players[playerId] = { name: playerName, points: 0, catches: 0 };
  fishTournament.players[playerId].points += caught.points;
  fishTournament.players[playerId].catches++;
  return { fish: caught, totalPoints: fishTournament.players[playerId].points };
}

function endFishTournament(io) {
  fishTournament.phase = 'idle';
  const rankings = Object.entries(fishTournament.players)
    .sort((a, b) => b[1].points - a[1].points)
    .map(([pid, d], i) => ({ rank: i + 1, id: pid, name: d.name, points: d.points, catches: d.catches }));
  if (io && rankings.length > 0) {
    io.emit('server_msg', { msg: '🏆 낚시 대회 종료! 1위: ' + rankings[0].name + ' (' + rankings[0].points + '점)', type: 'boss' });
    io.emit('fishing_tournament_end', { rankings: rankings.slice(0, 10) });
  }
  return rankings;
}

// ═══ 보물지도 탐험 ═══
const TREASURE_MAPS = [
  { id: 'map_forest', name: '이슬숲의 보물', zone: 'forest', clues: ['큰 나무 아래', '이끼 낀 바위 옆', '개울 건너편'], reward: { gold: 3000, exp: 2000 }, difficulty: 1 },
  { id: 'map_ruins', name: '유적의 비밀', zone: 'ruins', clues: ['무너진 기둥 뒤', '달빛이 비추는 곳', '고대 문자 앞'], reward: { gold: 8000, exp: 5000, item: 'mat_ancient' }, difficulty: 2 },
  { id: 'map_volcano', name: '불의 보물', zone: 'volcano', clues: ['용암 옆 동굴', '연기 피는 바위', '화산석 무더기'], reward: { gold: 15000, exp: 10000, diamonds: 50 }, difficulty: 3 },
  { id: 'map_abyss', name: '심연의 유산', zone: 'abyss', clues: ['어둠의 제단', '뒤틀린 공간', '시간이 멈춘 곳'], reward: { gold: 30000, exp: 20000, diamonds: 150, item: 'equip_abyss_ring' }, difficulty: 4 },
];

function startTreasureHunt(player) {
  if (player._treasureHunt) return { success: false, msg: '이미 탐험 중' };
  const map = TREASURE_MAPS[Math.floor(Math.random() * TREASURE_MAPS.length)];
  player._treasureHunt = { mapId: map.id, clueIndex: 0, startTime: Date.now() };
  return { success: true, map: { name: map.name, zone: map.zone, clue: map.clues[0], difficulty: map.difficulty, totalClues: map.clues.length } };
}

function progressTreasureHunt(player) {
  if (!player._treasureHunt) return { success: false, msg: '탐험 중이 아닙니다' };
  const hunt = player._treasureHunt;
  const map = TREASURE_MAPS.find(m => m.id === hunt.mapId);
  if (!map) { delete player._treasureHunt; return { success: false, msg: '지도 오류' }; }

  // 정답 확인 (해당 존에 있어야 함)
  if (player.zone !== map.zone) return { success: false, msg: map.zone + ' 지역으로 이동하세요!' };

  hunt.clueIndex++;
  if (hunt.clueIndex >= map.clues.length) {
    // 보물 발견!
    delete player._treasureHunt;
    if (map.reward.gold) player.gold = (player.gold || 0) + map.reward.gold;
    if (map.reward.exp) player.exp = (player.exp || 0) + map.reward.exp;
    if (map.reward.diamonds) player.diamonds = (player.diamonds || 0) + map.reward.diamonds;
    if (map.reward.item) {
      if (!player.inventory) player.inventory = {};
      player.inventory[map.reward.item] = (player.inventory[map.reward.item] || 0) + 1;
    }
    return { success: true, completed: true, reward: map.reward, msg: '보물을 발견했습니다!' };
  }

  return { success: true, completed: false, clue: map.clues[hunt.clueIndex], progress: hunt.clueIndex + '/' + map.clues.length };
}

// ═══ 카드 뒤집기 (메모리 게임) ═══
const CARD_GAME = {
  gridSize: 4, // 4x4 = 16칸, 8쌍
  entryFee: 300,
  symbols: ['⚔️','🛡️','🔥','❄️','⚡','💀','👑','💎'],
  timeLimit: 60,
  rewards: { perfect: { gold: 5000, diamonds: 30 }, good: { gold: 2000, diamonds: 10 }, normal: { gold: 500 } },
};

function startCardGame(player) {
  if ((player.gold || 0) < CARD_GAME.entryFee) return { success: false, msg: '골드 부족 (필요: ' + CARD_GAME.entryFee + 'G)' };
  player.gold -= CARD_GAME.entryFee;

  // 카드 배치 (8쌍 = 16장)
  const cards = [];
  for (const sym of CARD_GAME.symbols) { cards.push(sym, sym); }
  // 셔플
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  player._cardGame = {
    cards, revealed: new Array(16).fill(false), matched: new Array(16).fill(false),
    firstPick: -1, attempts: 0, matches: 0, startTime: Date.now(),
  };

  return { success: true, gridSize: CARD_GAME.gridSize, timeLimit: CARD_GAME.timeLimit };
}

function flipCard(player, index) {
  if (!player._cardGame) return { success: false, msg: '게임 중이 아닙니다' };
  const game = player._cardGame;
  if (index < 0 || index >= 16) return { success: false, msg: '잘못된 위치' };
  if (game.matched[index]) return { success: false, msg: '이미 맞춘 카드' };
  if (Date.now() - game.startTime > CARD_GAME.timeLimit * 1000) {
    delete player._cardGame;
    return { success: false, msg: '시간 초과!', timeout: true };
  }

  if (game.firstPick === -1) {
    game.firstPick = index;
    return { success: true, index, symbol: game.cards[index], waitingSecond: true };
  }

  // 두 번째 카드
  const secondIndex = index;
  const firstIndex = game.firstPick;
  game.firstPick = -1;
  game.attempts++;

  if (game.cards[firstIndex] === game.cards[secondIndex] && firstIndex !== secondIndex) {
    game.matched[firstIndex] = true;
    game.matched[secondIndex] = true;
    game.matches++;

    if (game.matches >= CARD_GAME.symbols.length) {
      // 전부 맞춤!
      const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
      let reward;
      if (game.attempts <= 12) reward = CARD_GAME.rewards.perfect;
      else if (game.attempts <= 20) reward = CARD_GAME.rewards.good;
      else reward = CARD_GAME.rewards.normal;

      player.gold = (player.gold || 0) + reward.gold;
      if (reward.diamonds) player.diamonds = (player.diamonds || 0) + reward.diamonds;
      delete player._cardGame;

      return { success: true, match: true, symbol: game.cards[secondIndex], completed: true, attempts: game.attempts, elapsed, reward };
    }

    return { success: true, match: true, symbol: game.cards[secondIndex], matches: game.matches, total: CARD_GAME.symbols.length };
  }

  return { success: true, match: false, firstSymbol: game.cards[firstIndex], secondSymbol: game.cards[secondIndex], firstIndex, secondIndex };
}

// ═══ 몬스터 퀴즈 ═══
const QUIZ_QUESTIONS = [
  { q: '슬라임의 약점 속성은?', options: ['화염', '빙결', '번개', '없음'], answer: 3 },
  { q: '어쌔신의 기본 크리티컬 확률은?', options: ['10%', '15%', '22%', '30%'], answer: 2 },
  { q: '드래곤 8종 중 가장 희귀한 것은?', options: ['화염룡', '암흑룡', '공허룡', '혼돈룡'], answer: 3 },
  { q: '심연의 탑은 몇 층까지?', options: ['5층', '10층', '15층', '20층'], answer: 1 },
  { q: '배틀로얄 최소 참가 인원은?', options: ['3명', '6명', '10명', '20명'], answer: 1 },
  { q: '나이트의 특기는?', options: ['암살', '마법', '탱킹', '치유'], answer: 2 },
  { q: '궁극기 게이지 최대치는?', options: ['100', '500', '1000', '2000'], answer: 2 },
  { q: '천공의 첨탑 최종 보스는?', options: ['바하무트', '천사장 미카엘', '심연의 군주', '이그드라실'], answer: 1 },
  { q: '장비 최대 강화 수치는? (전설 기준)', options: ['+5', '+10', '+15', '+20'], answer: 2 },
  { q: '월드 레이드 보스 수는?', options: ['1종', '2종', '3종', '5종'], answer: 2 },
];

function startQuiz(player) {
  const q = QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)];
  player._quiz = { question: q, startTime: Date.now() };
  return { success: true, question: q.q, options: q.options, timeLimit: 15 };
}

function answerQuiz(player, answerIndex) {
  if (!player._quiz) return { success: false, msg: '퀴즈 중이 아닙니다' };
  const quiz = player._quiz;
  const elapsed = (Date.now() - quiz.startTime) / 1000;
  delete player._quiz;

  if (elapsed > 15) return { success: true, correct: false, msg: '시간 초과!', reward: null };

  const correct = answerIndex === quiz.question.answer;
  const reward = correct ? { gold: 1000 + Math.floor(Math.max(0, 15 - elapsed) * 100), exp: 500 } : null;

  if (correct && reward) {
    player.gold = (player.gold || 0) + reward.gold;
    if (player.exp !== undefined) player.exp += reward.exp;
  }

  return { success: true, correct, correctAnswer: quiz.question.options[quiz.question.answer], reward, elapsed: Math.floor(elapsed) };
}

// ═══ 소켓 핸들러 ═══
function registerMinigameHandlers(socket, playerId, players, io) {
  // 낚시 대회
  socket.on('fish_tournament_start', () => {
    const result = startFishTournament(io);
    socket.emit('minigame_result', result);
  });
  socket.on('fish_tournament_catch', () => {
    const p = players[playerId];
    if (!p) return;
    const result = fishTournamentCatch(playerId, p.displayName || p.className);
    if (result) socket.emit('fish_tournament_catch_result', result);
    else socket.emit('minigame_result', { success: false, msg: '낚시 대회가 진행 중이 아닙니다' });
  });
  socket.on('fish_tournament_status', () => {
    const remaining = fishTournament.phase === 'active' ? Math.max(0, Math.floor((fishTournament.endTime - Date.now()) / 1000)) : 0;
    const rankings = Object.entries(fishTournament.players).sort((a, b) => b[1].points - a[1].points).map(([pid, d], i) => ({ rank: i + 1, name: d.name, points: d.points }));
    socket.emit('fish_tournament_status', { phase: fishTournament.phase, remaining, rankings: rankings.slice(0, 10) });
  });

  // 보물지도
  socket.on('treasure_hunt_start', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('treasure_hunt_result', startTreasureHunt(p));
  });
  socket.on('treasure_hunt_progress', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('treasure_hunt_result', progressTreasureHunt(p));
  });

  // 카드 뒤집기
  socket.on('card_game_start', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('card_game_result', startCardGame(p));
  });
  socket.on('card_game_flip', (index) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('card_game_flip_result', flipCard(p, parseInt(index)));
  });

  // 퀴즈
  socket.on('quiz_start', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('quiz_question', startQuiz(p));
  });
  socket.on('quiz_answer', (answerIndex) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('quiz_result', answerQuiz(p, parseInt(answerIndex)));
  });
}

module.exports = { registerMinigameHandlers, startFishTournament };

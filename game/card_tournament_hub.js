// ============================================
// 토너먼트 허브 — 대진표, 관전, 베팅, 챔피언십
// ============================================

const cardPvp = require('./card_pvp');
const cardAutoChess = require('./card_auto_chess');
let cardDuel;
try { cardDuel = require('./card_strategic_duel'); } catch (_) { cardDuel = null; }

// ============================================
// 토너먼트 타입 정의
// ============================================

const TOURNAMENT_TYPES = [
  { id: 'daily_pvp', name: '일일 PvP 토너먼트⚔️', type: 'pvp', size: 8, entryFee: 1000, schedule: 'daily',
    prizes: { 1: { gold: 20000, diamonds: 50, title: '일일 챔피언' }, 2: { gold: 10000, diamonds: 25 }, 3: { gold: 5000, diamonds: 10 }, 4: { gold: 5000, diamonds: 10 } } },
  { id: 'weekly_chess', name: '주간 오토체스 대회♟️', type: 'chess', size: 16, entryFee: 5000, schedule: 'weekly',
    prizes: { 1: { gold: 100000, diamonds: 200, card: 'legend', title: '체스 왕' }, 2: { gold: 50000, diamonds: 100 }, 3: { gold: 25000, diamonds: 50 }, 4: { gold: 25000, diamonds: 50 } } },
  { id: 'monthly_duel', name: '월간 카드 대결 챔피언십🃏👑', type: 'duel', size: 32, entryFee: 10000, schedule: 'monthly',
    prizes: { 1: { gold: 500000, diamonds: 1000, card: 'myth', title: '월간 챔피언', frame: 'champion_frame' }, 2: { gold: 200000, diamonds: 500, card: 'legend' }, 3: { gold: 100000, diamonds: 250 }, 4: { gold: 100000, diamonds: 250 } } },
  { id: 'season_grand', name: '시즌 그랜드 챔피언십🏆👑🌟', type: 'all', size: 64, entryFee: 50000, schedule: 'seasonal',
    prizes: { 1: { gold: 2000000, diamonds: 5000, card: 'myth', title: '시즌 그랜드 챔피언', frame: 'grand_champion' }, 2: { gold: 1000000, diamonds: 2500, card: 'myth' }, 3: { gold: 500000, diamonds: 1000, card: 'legend' }, 4: { gold: 500000, diamonds: 1000, card: 'legend' } } },
];

// 베팅 배율
const BET_MULTIPLIERS = { correct_winner: 2.5, correct_semifinalist: 1.5, correct_finalist: 2.0 };
const MAX_BET = 50000;

// ============================================
// 상태 저장소
// ============================================

const activeTournaments = {};   // tournamentId -> tournament state
const tournamentHistory = [];   // completed tournaments (최근 100개)
const championHistory = {};     // tournamentTypeId -> [{ champion, date, ... }]
const playerBets = {};          // `${playerId}_${tournamentId}` -> bet info
const HISTORY_MAX = 100;

let _nextTournamentId = 1;
let _nextMatchId = 1;

// ============================================
// 봇 생성
// ============================================

const BOT_NAMES = [
  '파이어드래곤', '실버울프', '다크나이트', '스톰메이지', '아이언골렘',
  '섀도우팬텀', '골드이글', '프로스트위치', '블레이즈킹', '문라이트',
  '크리스탈세이지', '데스워커', '스카이헌터', '블러드레이븐', '스톤가드',
  '윈드레인저', '네크로맨서', '홀리팔라딘', '인페르노', '아쿠아나이트',
  '드래곤슬레이어', '페닉스라이더', '데몬헌터', '에인션트원', '스타워리어',
  '엘프레인저', '오크워로드', '드워프스미스', '언데드킹', '페어리퀸',
  '미스틱세이지', '블레이드마스터', '아케인위자드', '볼트스트라이커', '테라가디언',
  '루나소서러', '아이스퀸', '플레임로드', '쉐도우블레이드', '라이트브링어',
  '워터프리스트', '어스쉐이커', '스카이워리어', '데몬킹', '엔젤나이트',
  '드래곤메이지', '고스트워커', '피닉스메이지', '다크세이지', '홀리세인트',
  '썬더볼트', '아이스스톰', '파이어스톰', '다크블레이즈', '실버소드',
  '골든차일드', '크리스탈아처', '블러드위치', '스톤킹', '윈드세이지',
  '스타프리스트', '문나이트', '선블레이드',
];

const CARD_TEMPLATES = [
  { name: '화염 전사', icon: '🔥⚔️', grade: 'rare', element: 'fire', type: 'warrior', atk: 120, def: 80, hp: 300, stars: 2 },
  { name: '물의 마법사', icon: '🌊🔮', grade: 'rare', element: 'water', type: 'mage', atk: 140, def: 60, hp: 250, stars: 2 },
  { name: '대지 수호자', icon: '🌿🛡️', grade: 'rare', element: 'earth', type: 'warrior', atk: 90, def: 120, hp: 350, stars: 2 },
  { name: '바람 궁수', icon: '🌬️🏹', grade: 'uncommon', element: 'wind', type: 'assassin', atk: 130, def: 50, hp: 220, stars: 1 },
  { name: '빛의 성기사', icon: '✨🛡️', grade: 'epic', element: 'light', type: 'warrior', atk: 150, def: 130, hp: 400, stars: 3 },
  { name: '암흑 암살자', icon: '🌑🗡️', grade: 'epic', element: 'dark', type: 'assassin', atk: 180, def: 40, hp: 200, stars: 3 },
  { name: '전설의 용', icon: '🐉', grade: 'legend', element: 'fire', type: 'warrior', atk: 220, def: 160, hp: 500, stars: 4 },
  { name: '신비의 현자', icon: '🌟🔮', grade: 'legend', element: 'light', type: 'mage', atk: 200, def: 100, hp: 350, stars: 4 },
  { name: '치유 사제', icon: '💚', grade: 'uncommon', element: 'light', type: 'healer', atk: 60, def: 90, hp: 280, stars: 1 },
  { name: '흑마법사', icon: '💀🔮', grade: 'rare', element: 'dark', type: 'mage', atk: 150, def: 70, hp: 240, stars: 2 },
];

function _generateBotId() {
  return 'bot_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

function _createBot(powerLevel) {
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  const id = _generateBotId();
  const rating = 800 + Math.floor(Math.random() * 600) + powerLevel * 100;

  // 봇 덱 생성 (5장)
  const deck = [];
  const shuffled = [...CARD_TEMPLATES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 5; i++) {
    const tmpl = shuffled[i % shuffled.length];
    const bonus = Math.floor(Math.random() * powerLevel * 15);
    deck.push({
      id: `${id}_card_${i}`,
      name: tmpl.name,
      icon: tmpl.icon,
      grade: tmpl.grade,
      element: tmpl.element,
      type: tmpl.type,
      class: tmpl.type,
      race: ['human', 'elf', 'dragon', 'undead', 'dwarf'][Math.floor(Math.random() * 5)],
      atk: tmpl.atk + bonus,
      def: tmpl.def + bonus,
      hp: tmpl.hp + bonus * 2,
      stars: tmpl.stars,
    });
  }

  // 오토체스 보드 (최대 5유닛)
  const board = deck.slice(0, 5).map((card, idx) => ({
    card,
    row: idx < 2 ? 0 : 1,
    col: idx % 4,
  }));

  return {
    id, name, isBot: true,
    gold: 999999, diamonds: 999,
    pvpRating: rating, chessPoints: Math.floor(rating * 0.8),
    cards: deck, deck,
    chessBoard: board,
    _tournamentHistory: [],
  };
}

// ============================================
// 파워 계산
// ============================================

function _calcPlayerPower(player, type) {
  if (type === 'chess') return player.chessPoints || 0;
  if (type === 'duel') return (player.duelPoints || 0) + (player.pvpRating || 1000);
  if (type === 'pvp') return player.pvpRating || 1000;
  // 'all' type — combined
  return (player.pvpRating || 1000) + (player.chessPoints || 0) + (player.duelPoints || 0);
}

function _getPlayerDeck(player) {
  if (player.deck && player.deck.length >= 5) return player.deck.slice(0, 5);
  if (player.cards && player.cards.length >= 5) return player.cards.slice(0, 5);
  // 카드가 부족하면 기본 덱
  const defaults = CARD_TEMPLATES.slice(0, 5).map((t, i) => ({
    ...t, id: `default_${player.id}_${i}`,
    class: t.type,
    race: 'human',
  }));
  return defaults;
}

function _getPlayerBoard(player) {
  if (player.chessBoard && player.chessBoard.length > 0) return player.chessBoard;
  const deck = _getPlayerDeck(player);
  return deck.map((card, idx) => ({ card, row: idx < 2 ? 0 : 1, col: idx % 4 }));
}

// ============================================
// 토너먼트 사용 가능 목록
// ============================================

function getAvailableTournaments() {
  const now = Date.now();
  const list = [];

  for (const tt of TOURNAMENT_TYPES) {
    // 이미 활성 상태인 동일 타입이 있는지 확인
    const existing = Object.values(activeTournaments).find(
      t => t.typeId === tt.id && (t.status === 'registering' || t.status === 'in_progress')
    );

    if (existing) {
      list.push({
        tournamentId: existing.id,
        typeId: tt.id,
        name: tt.name,
        type: tt.type,
        size: tt.size,
        entryFee: tt.entryFee,
        schedule: tt.schedule,
        prizes: tt.prizes,
        status: existing.status,
        registered: existing.participants.length,
        maxPlayers: tt.size,
      });
    } else {
      // 자동으로 새 토너먼트 생성 (등록 가능)
      const tid = _createTournamentInstance(tt);
      const t = activeTournaments[tid];
      list.push({
        tournamentId: tid,
        typeId: tt.id,
        name: tt.name,
        type: tt.type,
        size: tt.size,
        entryFee: tt.entryFee,
        schedule: tt.schedule,
        prizes: tt.prizes,
        status: 'registering',
        registered: 0,
        maxPlayers: tt.size,
      });
    }
  }

  return { ok: true, tournaments: list };
}

function _createTournamentInstance(tournamentType) {
  const id = `tournament_${_nextTournamentId++}`;
  activeTournaments[id] = {
    id,
    typeId: tournamentType.id,
    name: tournamentType.name,
    type: tournamentType.type,
    size: tournamentType.size,
    entryFee: tournamentType.entryFee,
    schedule: tournamentType.schedule,
    prizes: tournamentType.prizes,
    status: 'registering',           // registering -> in_progress -> finished
    participants: [],                // { player, seed }
    bracket: null,                   // generated on start
    currentRound: 0,
    totalRounds: 0,
    matches: [],                     // all matches
    bets: [],                        // all bets for this tournament
    spectators: {},                  // matchId -> [playerId, ...]
    champion: null,
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null,
  };
  return id;
}

// ============================================
// 토너먼트 참가
// ============================================

function joinTournament(player, tournamentId) {
  if (!player) return { ok: false, error: '플레이어 정보 없음' };
  const t = activeTournaments[tournamentId];
  if (!t) return { ok: false, error: '토너먼트를 찾을 수 없습니다' };
  if (t.status !== 'registering') return { ok: false, error: '등록 기간이 아닙니다' };
  if (t.participants.length >= t.size) return { ok: false, error: '참가 인원이 가득 찼습니다' };
  if (t.participants.find(p => p.player.id === player.id)) {
    return { ok: false, error: '이미 등록한 토너먼트입니다' };
  }

  // 참가비 차감
  const gold = player.gold || 0;
  if (gold < t.entryFee) return { ok: false, error: `골드가 부족합니다 (필요: ${t.entryFee}G, 보유: ${gold}G)` };
  player.gold = gold - t.entryFee;

  const power = _calcPlayerPower(player, t.type);
  t.participants.push({ player, seed: power, isBot: false });

  return {
    ok: true,
    message: `${t.name} 토너먼트에 참가했습니다! (참가비 ${t.entryFee}G 차감)`,
    registered: t.participants.length,
    maxPlayers: t.size,
    remainingGold: player.gold,
  };
}

// ============================================
// 토너먼트 시작
// ============================================

function startTournament(tournamentId) {
  const t = activeTournaments[tournamentId];
  if (!t) return { ok: false, error: '토너먼트를 찾을 수 없습니다' };
  if (t.status !== 'registering') return { ok: false, error: '이미 시작된 토너먼트입니다' };

  // 참가자가 부족하면 봇으로 채움
  const needed = t.size - t.participants.length;
  if (needed > 0) {
    const maxPower = t.participants.reduce((m, p) => Math.max(m, p.seed), 1);
    for (let i = 0; i < needed; i++) {
      const powerLevel = Math.max(1, Math.floor(maxPower / 300));
      const bot = _createBot(powerLevel);
      t.participants.push({ player: bot, seed: _calcPlayerPower(bot, t.type), isBot: true });
    }
  }

  // 시드 기반 정렬 후 대진표 생성
  t.participants.sort((a, b) => b.seed - a.seed);
  t.bracket = generateBracket(t.participants, t.size);
  t.totalRounds = Math.log2(t.size);
  t.currentRound = 1;
  t.status = 'in_progress';
  t.startedAt = Date.now();

  return {
    ok: true,
    message: `${t.name} 토너먼트가 시작되었습니다! (${t.size}명 참가)`,
    bracket: _serializeBracket(t.bracket),
    totalRounds: t.totalRounds,
  };
}

// ============================================
// 대진표 생성 (단판 토너먼트)
// ============================================

function generateBracket(participants, size) {
  // 시드 순위대로 매칭: 1v최하, 2v(최하-1), ...
  // 표준 시드 배치 사용
  const seedOrder = _getSeedOrder(size);
  const slots = new Array(size).fill(null);

  for (let i = 0; i < participants.length && i < size; i++) {
    slots[seedOrder[i]] = participants[i];
  }

  // 1라운드 매치 생성
  const matches = [];
  for (let i = 0; i < size; i += 2) {
    const matchId = `match_${_nextMatchId++}`;
    matches.push({
      id: matchId,
      round: 1,
      position: Math.floor(i / 2),
      playerA: slots[i],
      playerB: slots[i + 1],
      winner: null,
      loser: null,
      result: null,
      log: null,
      timestamp: null,
    });
  }

  return {
    size,
    rounds: { 1: matches },
    finalStandings: null,
  };
}

function _getSeedOrder(size) {
  // 표준 시드 배치: 1시드 vs 최하위시드가 만나도록 배치
  if (size <= 2) return [0, 1];
  const half = size / 2;
  const top = _getSeedOrder(half);
  const order = [];
  for (let i = 0; i < half; i++) {
    order.push(top[i] * 2);
    order.push(size - 1 - top[i] * 2 >= 0 ? size - 1 - top[i] * 2 : top[i] * 2 + 1);
  }
  // 위치 셔플 (같은 시드대끼리 살짝 섞기)
  for (let i = order.length - 1; i > 0; i -= 2) {
    if (Math.random() > 0.7) {
      const j = i - 1;
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  return order;
}

// ============================================
// 매치 시뮬레이션
// ============================================

function simulateMatch(playerA, playerB, type) {
  const pA = playerA.player || playerA;
  const pB = playerB.player || playerB;

  let result;
  const log = [];

  if (type === 'pvp' || type === 'all') {
    // PvP 카드 배틀
    const deckA = _getPlayerDeck(pA);
    const deckB = _getPlayerDeck(pB);
    result = cardPvp.simulateCardBattle(deckA, deckB);
    log.push({ system: 'pvp', result });

    if (type === 'all') {
      // 그랜드 챔피언십: pvp + chess 복합 (best of 2, 동점시 duel)
      const boardA = _getPlayerBoard(pA);
      const boardB = _getPlayerBoard(pB);
      const chessResult = cardAutoChess.simulateChessBattle(boardA, boardB);
      log.push({ system: 'chess', result: chessResult });

      let winsA = 0, winsB = 0;
      if (result.winner === 'A') winsA++; else if (result.winner === 'B') winsB++;
      if (chessResult.winner === 'A') winsA++; else if (chessResult.winner === 'B') winsB++;

      if (winsA === winsB) {
        // 타이브레이커: 총 점수로 결정
        const scoreA = (result.score?.A || 0) + (chessResult.survivorsA || 0);
        const scoreB = (result.score?.B || 0) + (chessResult.survivorsB || 0);
        const tieWinner = scoreA >= scoreB ? 'A' : 'B';
        log.push({ system: 'tiebreaker', winner: tieWinner, scoreA, scoreB });
        return { winner: tieWinner, log, type: 'all' };
      }
      return { winner: winsA > winsB ? 'A' : 'B', log, type: 'all' };
    }

    return { winner: result.winner === 'draw' ? (Math.random() < 0.5 ? 'A' : 'B') : result.winner, log, type: 'pvp' };
  }

  if (type === 'chess') {
    const boardA = _getPlayerBoard(pA);
    const boardB = _getPlayerBoard(pB);
    result = cardAutoChess.simulateChessBattle(boardA, boardB);
    log.push({ system: 'chess', result });
    const w = result.winner === 'draw' ? (Math.random() < 0.5 ? 'A' : 'B') : result.winner;
    return { winner: w, log, type: 'chess' };
  }

  if (type === 'duel') {
    // 듀얼 시스템이 있으면 사용, 없으면 pvp로 대체
    const deckA = _getPlayerDeck(pA);
    const deckB = _getPlayerDeck(pB);
    result = cardPvp.simulateCardBattle(deckA, deckB);
    log.push({ system: 'duel_via_pvp', result });
    const w = result.winner === 'draw' ? (Math.random() < 0.5 ? 'A' : 'B') : result.winner;
    return { winner: w, log, type: 'duel' };
  }

  // 폴백: pvp
  const deckA = _getPlayerDeck(pA);
  const deckB = _getPlayerDeck(pB);
  result = cardPvp.simulateCardBattle(deckA, deckB);
  log.push({ system: 'pvp_fallback', result });
  return { winner: result.winner === 'draw' ? 'A' : result.winner, log, type: 'pvp' };
}

// ============================================
// 대진 진행
// ============================================

function advanceBracket(tournament) {
  const t = tournament;
  if (!t || !t.bracket) return { ok: false, error: '대진표가 없습니다' };
  if (t.status !== 'in_progress') return { ok: false, error: '진행 중이 아닙니다' };

  const currentMatches = t.bracket.rounds[t.currentRound];
  if (!currentMatches) return { ok: false, error: '현재 라운드 정보 없음' };

  // 미완료 매치 확인
  const unfinished = currentMatches.filter(m => !m.winner);
  if (unfinished.length > 0) return { ok: false, error: `아직 ${unfinished.length}개 경기가 남았습니다` };

  // 결승전이 끝난 경우
  if (t.currentRound >= t.totalRounds) {
    const finalMatch = currentMatches[0];
    t.champion = finalMatch.winner;
    t.status = 'finished';
    t.finishedAt = Date.now();

    // 최종 순위 결정
    const standings = _determineFinalStandings(t);
    t.bracket.finalStandings = standings;

    // 상금 지급
    _awardPrizes(t, standings);

    // 베팅 정산
    resolveBets(t);

    // 기록 저장
    _saveTournamentHistory(t);

    return {
      ok: true,
      finished: true,
      champion: _serializeParticipant(t.champion),
      standings: standings.map(s => _serializeParticipant(s)),
      message: `${t.name} 토너먼트 종료! 우승: ${t.champion.player.name}`,
    };
  }

  // 다음 라운드 매치 생성
  const nextRound = t.currentRound + 1;
  const winners = currentMatches.map(m => m.winner);
  const nextMatches = [];

  for (let i = 0; i < winners.length; i += 2) {
    const matchId = `match_${_nextMatchId++}`;
    nextMatches.push({
      id: matchId,
      round: nextRound,
      position: Math.floor(i / 2),
      playerA: winners[i],
      playerB: winners[i + 1] || null,
      winner: null,
      loser: null,
      result: null,
      log: null,
      timestamp: null,
    });
  }

  // 부전승 처리
  for (const m of nextMatches) {
    if (!m.playerB) {
      m.winner = m.playerA;
      m.result = { winner: 'A', log: [{ system: 'bye', message: '부전승' }], type: 'bye' };
      m.timestamp = Date.now();
    }
  }

  t.bracket.rounds[nextRound] = nextMatches;
  t.currentRound = nextRound;
  t.matches.push(...nextMatches);

  return {
    ok: true,
    finished: false,
    round: nextRound,
    totalRounds: t.totalRounds,
    matches: nextMatches.map(m => _serializeMatch(m)),
  };
}

function _determineFinalStandings(tournament) {
  const t = tournament;
  // 1위: 결승 승자, 2위: 결승 패자, 3-4위: 준결승 패자
  const standings = [];

  const finalMatch = t.bracket.rounds[t.totalRounds]?.[0];
  if (finalMatch) {
    standings.push(finalMatch.winner);    // 1위
    standings.push(finalMatch.loser);     // 2위
  }

  // 준결승 패자 (3-4위)
  if (t.totalRounds >= 2) {
    const semiFinals = t.bracket.rounds[t.totalRounds - 1] || [];
    for (const m of semiFinals) {
      if (m.loser && !standings.find(s => s?.player?.id === m.loser?.player?.id)) {
        standings.push(m.loser);
      }
    }
  }

  return standings;
}

function _awardPrizes(tournament, standings) {
  const prizes = tournament.prizes;
  for (let i = 0; i < standings.length && i < 4; i++) {
    const p = standings[i];
    if (!p || !p.player) continue;
    const prize = prizes[i + 1];
    if (!prize) continue;

    const pl = p.player;
    if (prize.gold) pl.gold = (pl.gold || 0) + prize.gold;
    if (prize.diamonds) pl.diamonds = (pl.diamonds || 0) + prize.diamonds;
    if (prize.title) pl.title = prize.title;
    if (prize.frame) pl.frame = prize.frame;
    // card rewards 는 별도 인벤토리 시스템에 따라 추가 필요
    if (prize.card && pl.cards) {
      const rewardCard = _generateRewardCard(prize.card);
      pl.cards.push(rewardCard);
    }

    // 참가자 기록에 상금 기록
    if (!pl._tournamentHistory) pl._tournamentHistory = [];
    pl._tournamentHistory.push({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      placement: i + 1,
      prize,
      date: Date.now(),
    });
  }
}

function _generateRewardCard(grade) {
  const templates = CARD_TEMPLATES.filter(c => c.grade === grade || cardPvp.GRADE_ORDER.indexOf(c.grade) >= cardPvp.GRADE_ORDER.indexOf(grade));
  const tmpl = templates.length > 0 ? templates[Math.floor(Math.random() * templates.length)] : CARD_TEMPLATES[0];
  return {
    id: 'reward_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    name: tmpl.name + ' (토너먼트 보상)',
    icon: tmpl.icon,
    grade: grade,
    element: tmpl.element,
    type: tmpl.type,
    class: tmpl.type,
    race: 'human',
    atk: tmpl.atk + (grade === 'myth' ? 100 : grade === 'legend' ? 50 : 20),
    def: tmpl.def + (grade === 'myth' ? 80 : grade === 'legend' ? 40 : 15),
    hp: tmpl.hp + (grade === 'myth' ? 200 : grade === 'legend' ? 100 : 40),
    stars: grade === 'myth' ? 5 : grade === 'legend' ? 4 : 3,
    source: 'tournament',
  };
}

// ============================================
// 라운드 실행
// ============================================

function runTournamentRound(tournament, io) {
  const t = tournament;
  if (!t || !t.bracket) return { ok: false, error: '대진표가 없습니다' };
  if (t.status !== 'in_progress') return { ok: false, error: '진행 중이 아닙니다' };

  const currentMatches = t.bracket.rounds[t.currentRound];
  if (!currentMatches) return { ok: false, error: '현재 라운드 매치가 없습니다' };

  const results = [];

  for (const match of currentMatches) {
    if (match.winner) {
      results.push(_serializeMatch(match));
      continue; // 이미 완료 (부전승 등)
    }

    if (!match.playerA || !match.playerB) {
      // 부전승
      match.winner = match.playerA || match.playerB;
      match.loser = null;
      match.result = { winner: 'A', log: [{ system: 'bye' }], type: 'bye' };
      match.timestamp = Date.now();
      results.push(_serializeMatch(match));
      continue;
    }

    // 매치 시뮬레이션
    const battleResult = simulateMatch(match.playerA, match.playerB, t.type);
    match.result = battleResult;
    match.timestamp = Date.now();

    if (battleResult.winner === 'A') {
      match.winner = match.playerA;
      match.loser = match.playerB;
    } else {
      match.winner = match.playerB;
      match.loser = match.playerA;
    }

    match.log = battleResult.log;
    t.matches.push(match);
    results.push(_serializeMatch(match));
  }

  // 브로드캐스트
  if (io) {
    io.emit('tournament_round_result', {
      tournamentId: t.id,
      tournamentName: t.name,
      round: t.currentRound,
      totalRounds: t.totalRounds,
      results,
    });
  }

  // 라운드명 (8강, 4강, 결승 등)
  const roundNames = {
    1: t.size >= 64 ? '64강' : t.size >= 32 ? '32강' : t.size >= 16 ? '16강' : '8강',
  };
  const remainingPlayers = currentMatches.length;
  let roundName = `${remainingPlayers * 2}강`;
  if (remainingPlayers === 1) roundName = '결승전';
  else if (remainingPlayers === 2) roundName = '준결승';
  else if (remainingPlayers === 4) roundName = '8강';

  return {
    ok: true,
    round: t.currentRound,
    roundName,
    totalRounds: t.totalRounds,
    results,
    message: `${t.name} ${roundName} 완료!`,
  };
}

// ============================================
// 대진표 조회
// ============================================

function getBracket(tournamentId) {
  const t = activeTournaments[tournamentId];
  if (!t) {
    // 히스토리에서 검색
    const hist = tournamentHistory.find(h => h.id === tournamentId);
    if (hist) return { ok: true, bracket: hist.bracket, status: 'finished', champion: hist.champion };
    return { ok: false, error: '토너먼트를 찾을 수 없습니다' };
  }
  return {
    ok: true,
    tournamentId: t.id,
    name: t.name,
    status: t.status,
    currentRound: t.currentRound,
    totalRounds: t.totalRounds,
    bracket: _serializeBracket(t.bracket),
    champion: t.champion ? _serializeParticipant(t.champion) : null,
    participants: t.participants.length,
  };
}

// ============================================
// 베팅 시스템
// ============================================

function placeBet(player, tournamentId, predictedWinnerId, amount) {
  if (!player) return { ok: false, error: '플레이어 정보 없음' };
  const t = activeTournaments[tournamentId];
  if (!t) return { ok: false, error: '토너먼트를 찾을 수 없습니다' };
  if (t.status !== 'registering' && t.status !== 'in_progress') {
    return { ok: false, error: '베팅 기간이 지났습니다' };
  }

  // 자기 자신이 참가한 토너먼트에는 베팅 불가
  if (t.participants.find(p => p.player.id === player.id)) {
    return { ok: false, error: '참가 중인 토너먼트에는 베팅할 수 없습니다' };
  }

  if (!amount || amount <= 0) return { ok: false, error: '베팅 금액을 입력하세요' };
  if (amount > MAX_BET) return { ok: false, error: `최대 베팅 금액은 ${MAX_BET}G입니다` };

  const gold = player.gold || 0;
  if (gold < amount) return { ok: false, error: `골드가 부족합니다 (보유: ${gold}G)` };

  // 이미 베팅했는지 확인
  const betKey = `${player.id}_${tournamentId}`;
  if (playerBets[betKey]) return { ok: false, error: '이미 이 토너먼트에 베팅했습니다' };

  // 예측 대상 존재 확인
  const target = t.participants.find(p => p.player.id === predictedWinnerId);
  if (!target) return { ok: false, error: '해당 참가자를 찾을 수 없습니다' };

  player.gold = gold - amount;

  const bet = {
    playerId: player.id,
    playerName: player.name,
    tournamentId,
    predictedWinnerId,
    predictedWinnerName: target.player.name,
    amount,
    placedAt: Date.now(),
    resolved: false,
    payout: 0,
  };

  playerBets[betKey] = bet;
  t.bets.push(bet);

  // 배율 계산 (참가자 수에 따른 기대 배율)
  const expectedMultiplier = BET_MULTIPLIERS.correct_winner;

  return {
    ok: true,
    message: `${target.player.name}에게 ${amount}G 베팅 완료!`,
    bet: {
      predictedWinner: target.player.name,
      amount,
      potentialPayout: Math.floor(amount * expectedMultiplier),
      multiplier: expectedMultiplier,
    },
    remainingGold: player.gold,
  };
}

function resolveBets(tournament) {
  const t = tournament;
  if (!t || !t.champion) return { ok: false, error: '토너먼트가 끝나지 않았습니다' };

  const standings = t.bracket.finalStandings || [];
  const championId = t.champion.player.id;

  // 준결승 진출자 ID 목록
  const semiFinalists = new Set();
  if (t.totalRounds >= 2) {
    const semis = t.bracket.rounds[t.totalRounds - 1] || [];
    for (const m of semis) {
      if (m.playerA) semiFinalists.add(m.playerA.player.id);
      if (m.playerB) semiFinalists.add(m.playerB.player.id);
    }
  }

  // 결승 진출자 ID 목록
  const finalists = new Set();
  const finalMatch = t.bracket.rounds[t.totalRounds]?.[0];
  if (finalMatch) {
    if (finalMatch.playerA) finalists.add(finalMatch.playerA.player.id);
    if (finalMatch.playerB) finalists.add(finalMatch.playerB.player.id);
  }

  const payouts = [];

  for (const bet of t.bets) {
    if (bet.resolved) continue;
    bet.resolved = true;

    let multiplier = 0;
    let reason = '탈락';

    if (bet.predictedWinnerId === championId) {
      multiplier = BET_MULTIPLIERS.correct_winner;
      reason = '우승자 적중!';
    } else if (finalists.has(bet.predictedWinnerId)) {
      multiplier = BET_MULTIPLIERS.correct_finalist;
      reason = '결승 진출 적중';
    } else if (semiFinalists.has(bet.predictedWinnerId)) {
      multiplier = BET_MULTIPLIERS.correct_semifinalist;
      reason = '준결승 진출 적중';
    }

    const payout = Math.floor(bet.amount * multiplier);
    bet.payout = payout;

    if (payout > 0) {
      // 봇이 아닌 실제 플레이어에게만 지급 (betKey로 참조 불가하므로 이벤트로 전달)
      payouts.push({
        playerId: bet.playerId,
        playerName: bet.playerName,
        predictedWinner: bet.predictedWinnerName,
        amount: bet.amount,
        payout,
        multiplier,
        reason,
      });
    }
  }

  return { ok: true, payouts, championName: t.champion.player.name };
}

// ============================================
// 관전 시스템
// ============================================

function spectateMatch(player, matchId) {
  if (!player) return { ok: false, error: '플레이어 정보 없음' };

  // 모든 토너먼트에서 매치 검색
  for (const t of Object.values(activeTournaments)) {
    for (const roundKey of Object.keys(t.bracket?.rounds || {})) {
      const matches = t.bracket.rounds[roundKey];
      const match = matches.find(m => m.id === matchId);
      if (match) {
        // 관전자 등록
        if (!t.spectators[matchId]) t.spectators[matchId] = [];
        if (!t.spectators[matchId].includes(player.id)) {
          t.spectators[matchId].push(player.id);
        }

        return {
          ok: true,
          match: _serializeMatch(match),
          tournament: { id: t.id, name: t.name, round: parseInt(roundKey), totalRounds: t.totalRounds },
          spectatorCount: t.spectators[matchId].length,
        };
      }
    }
  }

  // 히스토리에서도 검색
  for (const t of tournamentHistory) {
    for (const roundKey of Object.keys(t.bracket?.rounds || {})) {
      const matches = t.bracket.rounds[roundKey];
      const match = matches.find(m => m.id === matchId);
      if (match) {
        return {
          ok: true,
          match: _serializeMatch(match),
          tournament: { id: t.id, name: t.name, round: parseInt(roundKey) },
          replay: true,
        };
      }
    }
  }

  return { ok: false, error: '매치를 찾을 수 없습니다' };
}

// ============================================
// 히스토리
// ============================================

function getTournamentHistory(player) {
  if (!player) return { ok: false, error: '플레이어 정보 없음' };
  const history = player._tournamentHistory || [];
  return {
    ok: true,
    history: history.slice(-20).reverse(),
    totalParticipations: history.length,
    bestPlacement: history.length > 0 ? Math.min(...history.map(h => h.placement)) : null,
    titles: history.filter(h => h.prize?.title).map(h => h.prize.title),
  };
}

function getChampionHistory() {
  const result = {};
  for (const tt of TOURNAMENT_TYPES) {
    result[tt.id] = {
      name: tt.name,
      champions: (championHistory[tt.id] || []).slice(-10).reverse(),
    };
  }
  return { ok: true, champions: result };
}

function _saveTournamentHistory(tournament) {
  const t = tournament;

  // 챔피언 기록
  if (!championHistory[t.typeId]) championHistory[t.typeId] = [];
  championHistory[t.typeId].push({
    champion: _serializeParticipant(t.champion),
    tournamentId: t.id,
    tournamentName: t.name,
    date: t.finishedAt,
    participants: t.participants.length,
  });

  // 토너먼트 히스토리 (최근 100개)
  tournamentHistory.push({
    id: t.id,
    typeId: t.typeId,
    name: t.name,
    type: t.type,
    champion: _serializeParticipant(t.champion),
    standings: (t.bracket.finalStandings || []).map(s => _serializeParticipant(s)),
    participants: t.participants.length,
    bracket: _serializeBracket(t.bracket),
    startedAt: t.startedAt,
    finishedAt: t.finishedAt,
  });

  if (tournamentHistory.length > HISTORY_MAX) {
    tournamentHistory.splice(0, tournamentHistory.length - HISTORY_MAX);
  }

  // 활성 토너먼트에서 제거
  delete activeTournaments[t.id];
}

// ============================================
// 직렬화 헬퍼
// ============================================

function _serializeParticipant(p) {
  if (!p) return null;
  const pl = p.player || p;
  return {
    id: pl.id,
    name: pl.name,
    isBot: pl.isBot || false,
    seed: p.seed || 0,
    rating: pl.pvpRating || 0,
  };
}

function _serializeMatch(match) {
  if (!match) return null;
  return {
    id: match.id,
    round: match.round,
    position: match.position,
    playerA: _serializeParticipant(match.playerA),
    playerB: _serializeParticipant(match.playerB),
    winner: _serializeParticipant(match.winner),
    loser: _serializeParticipant(match.loser),
    result: match.result ? {
      winner: match.result.winner,
      type: match.result.type,
      logSummary: (match.result.log || []).map(l => l.system || 'battle').join(', '),
    } : null,
    timestamp: match.timestamp,
  };
}

function _serializeBracket(bracket) {
  if (!bracket) return null;
  const rounds = {};
  for (const [roundKey, matches] of Object.entries(bracket.rounds || {})) {
    rounds[roundKey] = matches.map(m => _serializeMatch(m));
  }
  return {
    size: bracket.size,
    rounds,
    finalStandings: (bracket.finalStandings || []).map(s => _serializeParticipant(s)),
  };
}

// ============================================
// 소켓 이벤트 등록
// ============================================

function register(io, socket, player) {
  // 토너먼트 목록 조회
  socket.on('tournament_list', () => {
    const result = getAvailableTournaments();
    socket.emit('tournament_list', result);
  });

  // 토너먼트 참가
  socket.on('tournament_join', (data) => {
    const { tournamentId } = data || {};
    const result = joinTournament(player, tournamentId);
    socket.emit('tournament_join', result);

    if (result.ok) {
      io.emit('tournament_update', {
        tournamentId,
        registered: result.registered,
        maxPlayers: result.maxPlayers,
      });

      // 참가 인원이 가득 차면 자동 시작
      const t = activeTournaments[tournamentId];
      if (t && t.participants.length >= t.size) {
        _autoRunTournament(t, io);
      }
    }
  });

  // 토너먼트 강제 시작 (봇으로 채움)
  socket.on('tournament_start', (data) => {
    const { tournamentId } = data || {};
    const t = activeTournaments[tournamentId];
    if (!t) {
      socket.emit('tournament_start', { ok: false, error: '토너먼트를 찾을 수 없습니다' });
      return;
    }
    if (t.participants.length < 2) {
      socket.emit('tournament_start', { ok: false, error: '최소 2명의 참가자가 필요합니다' });
      return;
    }
    _autoRunTournament(t, io);
    socket.emit('tournament_start', { ok: true, message: `${t.name} 시작!` });
  });

  // 대진표 조회
  socket.on('tournament_bracket', (data) => {
    const { tournamentId } = data || {};
    const result = getBracket(tournamentId);
    socket.emit('tournament_bracket', result);
  });

  // 베팅
  socket.on('tournament_bet', (data) => {
    const { tournamentId, predictedWinnerId, amount } = data || {};
    const result = placeBet(player, tournamentId, predictedWinnerId, amount);
    socket.emit('tournament_bet', result);
  });

  // 관전
  socket.on('tournament_spectate', (data) => {
    const { matchId } = data || {};
    const result = spectateMatch(player, matchId);
    socket.emit('tournament_spectate', result);
  });

  // 내 토너먼트 기록
  socket.on('tournament_history', () => {
    const result = getTournamentHistory(player);
    socket.emit('tournament_history', result);
  });

  // 챔피언 명예의 전당
  socket.on('tournament_champions', () => {
    const result = getChampionHistory();
    socket.emit('tournament_champions', result);
  });
}

// ============================================
// 자동 토너먼트 실행
// ============================================

function _autoRunTournament(tournament, io) {
  const t = tournament;

  // 시작
  const startResult = startTournament(t.id);
  if (!startResult.ok) return;

  if (io) {
    io.emit('tournament_started', {
      tournamentId: t.id,
      name: t.name,
      bracket: startResult.bracket,
      totalRounds: startResult.totalRounds,
    });
  }

  // 라운드별 실행 (약간의 딜레이를 두고 순차 실행)
  let roundDelay = 0;
  const ROUND_INTERVAL = 3000; // 3초 간격

  for (let round = 1; round <= t.totalRounds; round++) {
    setTimeout(() => {
      // 현재 라운드 실행
      const roundResult = runTournamentRound(t, io);

      if (io) {
        io.emit('tournament_round_complete', {
          tournamentId: t.id,
          ...roundResult,
        });
      }

      // 다음 라운드 진행
      const advanceResult = advanceBracket(t);

      if (advanceResult.finished) {
        // 토너먼트 종료
        if (io) {
          io.emit('tournament_finished', {
            tournamentId: t.id,
            name: t.name,
            champion: advanceResult.champion,
            standings: advanceResult.standings,
            message: advanceResult.message,
          });
        }

        // 베팅 정산 결과 방송
        const betResult = { ok: true, payouts: t.bets.filter(b => b.payout > 0) };
        if (betResult.payouts.length > 0 && io) {
          io.emit('tournament_bet_results', {
            tournamentId: t.id,
            payouts: betResult.payouts,
          });

          // 실제 골드 지급 (소켓 연결된 플레이어에게)
          for (const payout of betResult.payouts) {
            const betKey = `${payout.playerId}_${t.id}`;
            const bet = playerBets[betKey];
            if (bet) {
              // 플레이어 참조를 통해 지급 (이벤트로 알림)
              io.emit('tournament_bet_payout', {
                playerId: payout.playerId,
                payout: payout.payout,
                reason: payout.reason,
              });
            }
          }
        }
      }
    }, roundDelay);

    roundDelay += ROUND_INTERVAL;
  }
}

// ============================================
// Exports
// ============================================

module.exports = {
  TOURNAMENT_TYPES,
  BET_MULTIPLIERS,
  MAX_BET,
  getAvailableTournaments,
  joinTournament,
  startTournament,
  generateBracket,
  simulateMatch,
  advanceBracket,
  runTournamentRound,
  getBracket,
  placeBet,
  resolveBets,
  spectateMatch,
  getTournamentHistory,
  getChampionHistory,
  register,
};

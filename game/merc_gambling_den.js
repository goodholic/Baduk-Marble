// v6.0 — 도박장 시스템 (카지노 대확장)
// 주사위/슬롯/포커/룰렛/경마 + 도박 중독 방지

const GAMES = {
  dice: { name: '주사위 대전', icon: '🎲', minBet: 100, maxBet: 50000,
    rules: '2개 주사위 합 → 7 이상이면 승리 (2배), 정확히 12면 10배!',
    odds: { win: 0.42, jackpot: 0.028, lose: 0.552 }, payout: { win: 2, jackpot: 10 } },
  slots: { name: '슬롯머신', icon: '🎰', minBet: 500, maxBet: 100000,
    rules: '3릴 일치 → 잭팟! 2릴 일치 → 소잭팟',
    symbols: ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '👑'],
    odds: { triple: 0.02, double: 0.15 }, payout: { triple: 50, double: 3, seven: 100, crown: 200 } },
  poker: { name: '용병 포커', icon: '🃏', minBet: 1000, maxBet: 200000,
    rules: '용병 카드 5장으로 포커, 용병 스탯이 카드 능력에 영향',
    hands: ['하이카드', '원페어', '투페어', '트리플', '스트레이트', '플러시', '풀하우스', '포카드', '스트레이트 플러시', '로얄 플러시'],
    payout: { pair: 2, twoPair: 3, triple: 5, straight: 8, flush: 10, fullHouse: 15, four: 30, straightFlush: 100, royal: 500 } },
  roulette: { name: '운명의 룰렛', icon: '🎡', minBet: 500, maxBet: 100000,
    rules: '숫자(1~36)/색상(빨강/검정)/홀짝 베팅',
    payout: { number: 36, color: 2, oddEven: 2, dozen: 3 } },
  horse: { name: '몬스터 경마', icon: '🐎🏁', minBet: 1000, maxBet: 500000,
    rules: '5마리 몬스터 경주, 배당률은 실력에 반비례',
    horses: [
      { name: '불늑대', icon: '🐺🔥', odds: 2.5 },
      { name: '빙결 매', icon: '🦅❄️', odds: 3.0 },
      { name: '뇌전 고양이', icon: '🐱⚡', odds: 4.0 },
      { name: '대지 곰', icon: '🐻🪨', odds: 6.0 },
      { name: '???', icon: '❓', odds: 20.0, desc: '정체불명! 최고 배당!' },
    ] },
};

// VIP 등급 (누적 베팅 금액)
const VIP_TIERS = [
  { tier: 1, name: '일반', totalBet: 0, bonus: 0 },
  { tier: 2, name: '실버', totalBet: 100000, bonus: 0.02, desc: '당첨금+2%' },
  { tier: 3, name: '골드', totalBet: 500000, bonus: 0.05, desc: '당첨금+5%' },
  { tier: 4, name: '플래티넘', totalBet: 2000000, bonus: 0.08, desc: '당첨금+8%, 전용 테이블' },
  { tier: 5, name: '다이아', totalBet: 10000000, bonus: 0.12, desc: '당첨금+12%, 전용 게임 해금' },
];

// 도박 중독 방지 (일일 한도)
const DAILY_LIMITS = { maxBetTotal: 500000, maxLossTotal: 200000, warningAt: 0.7 };

function playDice(player, bet) {
  if (bet < GAMES.dice.minBet || bet > GAMES.dice.maxBet) return { ok: false, reason: '베팅 범위 초과' };
  if ((player.gold || 0) < bet) return { ok: false, reason: '골드 부족' };
  player.gold -= bet;
  player.totalBet = (player.totalBet || 0) + bet;
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const sum = d1 + d2;
  let result, payout = 0;
  if (sum === 12) { result = 'jackpot'; payout = bet * GAMES.dice.payout.jackpot; }
  else if (sum >= 7) { result = 'win'; payout = bet * GAMES.dice.payout.win; }
  else { result = 'lose'; }
  player.gold += payout;
  return { ok: true, dice: [d1, d2], sum, result, payout };
}

function playSlots(player, bet) {
  if ((player.gold || 0) < bet) return { ok: false, reason: '골드 부족' };
  player.gold -= bet;
  const syms = GAMES.slots.symbols;
  const reels = [syms[Math.floor(Math.random()*syms.length)], syms[Math.floor(Math.random()*syms.length)], syms[Math.floor(Math.random()*syms.length)]];
  let payout = 0, result = 'lose';
  if (reels[0]===reels[1]&&reels[1]===reels[2]) {
    result = 'jackpot';
    payout = reels[0]==='👑' ? bet*GAMES.slots.payout.crown : reels[0]==='7️⃣' ? bet*GAMES.slots.payout.seven : bet*GAMES.slots.payout.triple;
  } else if (reels[0]===reels[1]||reels[1]===reels[2]) {
    result = 'small_win'; payout = bet * GAMES.slots.payout.double;
  }
  player.gold += payout;
  return { ok: true, reels, result, payout };
}

function register(io, socket, player) {
  socket.on('gambling_info', () => {
    const vip = VIP_TIERS.filter(v => (player.totalBet||0) >= v.totalBet).pop();
    socket.emit('gambling_info', { games: GAMES, vip, limits: DAILY_LIMITS, totalBet: player.totalBet || 0 });
  });
  socket.on('gambling_dice', (data) => {
    const result = playDice(player, data.bet);
    socket.emit('gambling_result', result);
    if (result.result === 'jackpot') io.emit('server_msg', `🎲💰 [잭팟!] ${player.name}이(가) 주사위 잭팟! (×${GAMES.dice.payout.jackpot})`);
  });
  socket.on('gambling_slots', (data) => {
    const result = playSlots(player, data.bet);
    socket.emit('gambling_result', result);
    if (result.result === 'jackpot') io.emit('server_msg', `🎰💰 [잭팟!] ${player.name} 슬롯머신 ${result.reels.join('')} 잭팟!`);
  });
}

module.exports = { GAMES, VIP_TIERS, DAILY_LIMITS, playDice, playSlots, register };

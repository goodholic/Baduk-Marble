// 카지노 시스템 — v2.05
// 슬롯머신, 주사위 도박, 동전 던지기

const SLOT_SYMBOLS = ['🍒','🍋','🍊','⭐','🔔','💎','7️⃣'];
const SLOT_PAYOUT = {
  // 3개 일치 시 배수
  '7️⃣': 50,
  '💎': 25,
  '⭐': 12,
  '🔔': 8,
  '🍊': 5,
  '🍋': 4,
  '🍒': 3,
};
const SLOT_PARTIAL_PAYOUT = 1.5; // 2개 일치 (체리만)
const MIN_BET = 10;
const MAX_BET = 10000;

function _ensure(player) {
  if (!player.casino) {
    player.casino = {
      totalBet: 0,
      totalWin: 0,
      slotPlays: 0,
      dicePlays: 0,
      coinPlays: 0,
      biggestWin: 0,
    };
  }
  return player.casino;
}

function getStats(player) {
  const c = _ensure(player);
  return {
    ...c,
    netGold: c.totalWin - c.totalBet,
  };
}

function _validateBet(player, bet) {
  bet = Math.floor(Number(bet) || 0);
  if (bet < MIN_BET) return { ok:false, msg:`최소 베팅 ${MIN_BET}G` };
  if (bet > MAX_BET) return { ok:false, msg:`최대 베팅 ${MAX_BET}G` };
  if ((player.gold || 0) < bet) return { ok:false, msg:'골드 부족' };
  return { ok:true, bet };
}

function playSlot(player, bet) {
  const v = _validateBet(player, bet);
  if (!v.ok) return { success:false, msg:v.msg };
  const c = _ensure(player);
  player.gold -= v.bet;
  c.totalBet += v.bet;
  c.slotPlays += 1;

  const reels = [
    SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
    SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
    SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
  ];

  let payout = 0;
  let result = 'lose';
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    payout = v.bet * (SLOT_PAYOUT[reels[0]] || 1);
    result = 'jackpot';
  } else if (reels.filter(r => r === '🍒').length >= 2) {
    payout = Math.floor(v.bet * SLOT_PARTIAL_PAYOUT);
    result = 'cherry';
  }

  if (payout > 0) {
    player.gold += payout;
    c.totalWin += payout;
    if (payout > c.biggestWin) c.biggestWin = payout;
  }

  return {
    success: true,
    msg: `[${reels.join(' | ')}] ${result === 'jackpot' ? '🎰 잭팟!' : result === 'cherry' ? '🍒 체리!' : '꽝'} ${payout > 0 ? `+${payout}G` : `-${v.bet}G`}`,
    reels,
    result,
    payout,
    netChange: payout - v.bet,
  };
}

function playDice(player, bet, guess) {
  // guess: 'high'(8-12) | 'low'(2-6) | 'lucky7'(7) | 1~12 specific
  const v = _validateBet(player, bet);
  if (!v.ok) return { success:false, msg:v.msg };
  const c = _ensure(player);
  player.gold -= v.bet;
  c.totalBet += v.bet;
  c.dicePlays += 1;

  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  const sum = d1 + d2;

  let payout = 0;
  let won = false;
  if (guess === 'high' && sum >= 8) { won = true; payout = v.bet * 2; }
  else if (guess === 'low' && sum <= 6) { won = true; payout = v.bet * 2; }
  else if (guess === 'lucky7' && sum === 7) { won = true; payout = v.bet * 5; }
  else if (typeof guess === 'number' && guess === sum) { won = true; payout = v.bet * 8; }

  if (won) {
    player.gold += payout;
    c.totalWin += payout;
    if (payout > c.biggestWin) c.biggestWin = payout;
  }

  return {
    success:true,
    msg:`🎲 ${d1}+${d2}=${sum} ${won ? '승리 +' + payout + 'G' : '패배 -' + v.bet + 'G'}`,
    dice:[d1,d2], sum, won, payout, netChange: payout - v.bet,
  };
}

function playCoin(player, bet, guess) {
  // guess: 'heads' | 'tails'
  const v = _validateBet(player, bet);
  if (!v.ok) return { success:false, msg:v.msg };
  const c = _ensure(player);
  player.gold -= v.bet;
  c.totalBet += v.bet;
  c.coinPlays += 1;

  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = result === guess;
  const payout = won ? Math.floor(v.bet * 1.95) : 0;
  if (won) {
    player.gold += payout;
    c.totalWin += payout;
    if (payout > c.biggestWin) c.biggestWin = payout;
  }
  return {
    success:true,
    msg:`🪙 ${result === 'heads' ? '앞면' : '뒷면'} ${won ? '+' + payout + 'G' : '-' + v.bet + 'G'}`,
    result, won, payout, netChange: payout - v.bet,
  };
}

module.exports = {
  SLOT_SYMBOLS,
  SLOT_PAYOUT,
  MIN_BET,
  MAX_BET,
  getStats,
  playSlot,
  playDice,
  playCoin,
};

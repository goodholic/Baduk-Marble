// v5.7 — IO PvP 결투 시스템
// 1v1 명예 결투, 밴픽, 베팅, 칭호, 복수전

const DUEL_DURATION = 120; // 2분

// 결투 유형
const DUEL_TYPES = [
  { id: 'honor', name: '명예 결투', icon: '⚔️🏅', rules: '정정당당, 아이템 사용 불가', reward: { honor: 50, gold: 5000 } },
  { id: 'death', name: '죽음의 결투', icon: '💀⚔️', rules: '패배 시 장비 1개 드롭!', reward: { honor: 100, gold: 10000 }, risk: true },
  { id: 'merc', name: '용병 대결', icon: '⚔️🤖', rules: '플레이어 대신 용병이 싸움', reward: { honor: 30, mercExp: 500 } },
  { id: 'strip', name: '약탈 결투', icon: '⚔️💰', rules: '승자가 패자의 골드 30% 탈취', reward: { goldSteal: 0.3 }, risk: true },
  { id: 'class_mirror', name: '동일 클래스전', icon: '🪞⚔️', rules: '같은 클래스끼리만, 순수 실력전', reward: { honor: 80, gold: 8000 } },
  { id: 'naked', name: '맨몸 결투', icon: '👊', rules: '장비/스킬 없이 기본 스탯만', reward: { honor: 60, gold: 6000 } },
];

// 명예 등급
const HONOR_RANKS = [
  { rank: 1, name: '결투 입문자', honor: 0, bonus: {} },
  { rank: 2, name: '결투사', honor: 200, bonus: { atkInDuel: 1.03 } },
  { rank: 3, name: '검투사', honor: 500, bonus: { atkInDuel: 1.06 } },
  { rank: 4, name: '투기왕', honor: 1000, bonus: { atkInDuel: 1.10, title: true } },
  { rank: 5, name: '결투의 신', honor: 2000, bonus: { atkInDuel: 1.15, aura: true, title: true } },
  { rank: 6, name: '전설의 결투사', honor: 5000, bonus: { atkInDuel: 1.20, aura: true, frame: true, title: true } },
];

// 결투 전 밴픽
const BAN_PICK = {
  bans: 2,     // 각자 2개 금지 (무기/스킬)
  picks: 3,    // 각자 3개 선택 (무기/스킬)
  banPool: ['검', '활', '마법봉', '단검', '창', '도끼', '방패', '지팡이'],
};

// 복수전 시스템
const REVENGE = {
  window: 3600,  // 1시간 내 복수 가능
  bonusOnRevenge: { honor: 2.0, gold: 1.5 },  // 복수 성공 시 보상 2배
  desc: '패배 후 1시간 내 재도전 시 보상 2배',
};

// 관전+베팅 (다른 플레이어)
const SPECTATOR_BET = {
  minBet: 500,
  maxBet: 50000,
  odds: { underdog: 3.0, even: 2.0, favorite: 1.4 },
};

// 결투 기록
const DUEL_RECORDS = {
  streak: { 3: '3연승 표시', 5: '5연승 불꽃 이펙트', 10: '10연승 번개 이펙트 + 서버 공지' },
};

function createDuel(challenger, targetId, duelType) {
  const type = DUEL_TYPES.find(d => d.id === duelType);
  if (!type) return { ok: false, reason: '알 수 없는 결투 유형' };
  return {
    ok: true,
    duel: {
      id: `duel_${Date.now()}`,
      challenger: { id: challenger.id, name: challenger.name },
      target: targetId,
      type,
      duration: DUEL_DURATION,
      status: 'pending',
      createdAt: Date.now(),
    },
  };
}

function register(io, socket, player) {
  socket.on('duel_info', () => {
    const honor = player.honor || 0;
    const rank = [...HONOR_RANKS].reverse().find(r => honor >= r.honor);
    socket.emit('duel_info', { types: DUEL_TYPES, ranks: HONOR_RANKS, banPick: BAN_PICK, revenge: REVENGE, spectator: SPECTATOR_BET, records: DUEL_RECORDS, myHonor: honor, myRank: rank });
  });
  socket.on('duel_challenge', (data) => {
    const result = createDuel(player, data.targetId, data.duelType);
    socket.emit('duel_challenge_result', result);
    if (result.ok) io.emit('server_msg', `⚔️ [결투] ${player.name}이(가) 결투를 신청! (${result.duel.type.name})`);
  });
  socket.on('duel_spectate_bet', (data) => {
    if ((player.gold || 0) < data.amount) return socket.emit('duel_bet_result', { ok: false, reason: '골드 부족' });
    player.gold -= data.amount;
    socket.emit('duel_bet_result', { ok: true, amount: data.amount });
  });
}

module.exports = { DUEL_TYPES, HONOR_RANKS, BAN_PICK, REVENGE, SPECTATOR_BET, DUEL_RECORDS, createDuel, register };

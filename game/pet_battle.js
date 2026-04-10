// 펫 배틀 시스템 — v1.42
// 보유한 펫끼리 자동 전투 (턴제 시뮬레이션)
// 일일 토너먼트 + 친선전 + 랭킹
// 기존 game/pet.js의 PETS 데이터를 import해서 스탯으로 변환

const { PETS } = require('./pet');

// 펫 배틀용 기본 스탯 (effect/value를 전투 스탯으로 변환)
function getPetBattleStats(petId) {
  const pet = PETS[petId];
  if (!pet) return null;
  // 기본 스탯
  let hp = 100, atk = 20, def = 5, speed = 10;
  // 진화형은 강화
  if (pet.evolved) { hp += 80; atk += 15; def += 8; speed += 5; }
  // 효과별 보너스
  switch (pet.effect) {
    case 'atkBonus':    atk += Math.floor(pet.value * 100); break;
    case 'hpRegen':     hp += Math.floor(pet.value * 500); break;
    case 'expBonus':    speed += 5; break;
    case 'autoRevive':  hp += 100; def += 10; break;
    case 'fireDmg':     atk += 25; break;
    case 'dodgeBonus':  speed += 8; def += 3; break;
  }
  return { id: petId, name: pet.name, hp, maxHp: hp, atk, def, speed, effect: pet.effect };
}

// 두 펫의 자동 전투 시뮬레이션 (최대 30턴)
function simulateBattle(pet1Id, pet2Id) {
  const a = getPetBattleStats(pet1Id);
  const b = getPetBattleStats(pet2Id);
  if (!a || !b) return { error: '존재하지 않는 펫' };

  const log = [];
  // 속도가 빠른 쪽이 선공
  let first = a.speed >= b.speed ? a : b;
  let second = first === a ? b : a;

  for (let turn = 1; turn <= 30; turn++) {
    // 1차 공격
    const dmg1 = Math.max(1, first.atk - Math.floor(second.def * 0.5));
    second.hp -= dmg1;
    log.push({ turn, attacker: first.name, target: second.name, dmg: dmg1, targetHp: Math.max(0, second.hp) });
    if (second.hp <= 0) {
      return { winner: first.name, winnerId: first.id, loserId: second.id, turns: turn, log };
    }
    // 2차 공격
    const dmg2 = Math.max(1, second.atk - Math.floor(first.def * 0.5));
    first.hp -= dmg2;
    log.push({ turn, attacker: second.name, target: first.name, dmg: dmg2, targetHp: Math.max(0, first.hp) });
    if (first.hp <= 0) {
      return { winner: second.name, winnerId: second.id, loserId: first.id, turns: turn, log };
    }
  }
  // 30턴 무승부 → HP 비율로 판정
  const ratio1 = first.hp / first.maxHp;
  const ratio2 = second.hp / second.maxHp;
  return ratio1 >= ratio2
    ? { winner: first.name, winnerId: first.id, loserId: second.id, turns: 30, draw: true, log }
    : { winner: second.name, winnerId: second.id, loserId: first.id, turns: 30, draw: true, log };
}

// 토너먼트 (8강) — 8마리 펫을 받아 우승자 결정
function runTournament(petIds) {
  if (petIds.length !== 8) return { error: '8마리 필요' };
  const round1 = [];
  for (let i = 0; i < 8; i += 2) {
    round1.push(simulateBattle(petIds[i], petIds[i + 1]));
  }
  const round2 = [];
  for (let i = 0; i < 4; i += 2) {
    round2.push(simulateBattle(round1[i].winnerId, round1[i + 1].winnerId));
  }
  const final = simulateBattle(round2[0].winnerId, round2[1].winnerId);
  return {
    round1: round1.map(r => ({ winner: r.winner, loser: r.loserId, turns: r.turns })),
    round2: round2.map(r => ({ winner: r.winner, loser: r.loserId, turns: r.turns })),
    final: { winner: final.winner, loser: final.loserId, turns: final.turns },
    champion: final.winnerId,
  };
}

const PET_BATTLE_CONFIG = {
  dailyFreeBattles: 5,
  paidBattlePrice: 10, // 다이아
  tournamentEntryFee: 100, // 다이아
  tournamentChampionReward: { gold: 5000, diamonds: 200, title: 'pet_champion' },
  winRewardGold: 100,
  winRewardExp: 50,
};

function canFreeBattle(player) {
  const today = new Date().toISOString().slice(0, 10);
  if (player.petBattleDate !== today) return true;
  return (player.petBattleCount || 0) < PET_BATTLE_CONFIG.dailyFreeBattles;
}

function consumeFreeBattle(player) {
  const today = new Date().toISOString().slice(0, 10);
  if (player.petBattleDate !== today) {
    player.petBattleDate = today;
    player.petBattleCount = 0;
  }
  player.petBattleCount = (player.petBattleCount || 0) + 1;
}

function applyBattleReward(player, won) {
  if (won) {
    player.gold = Math.min(999999999, (player.gold || 0) + PET_BATTLE_CONFIG.winRewardGold);
    player.exp = (player.exp || 0) + PET_BATTLE_CONFIG.winRewardExp;
    player.petBattleWins = (player.petBattleWins || 0) + 1;
  } else {
    player.petBattleLosses = (player.petBattleLosses || 0) + 1;
  }
}

module.exports = {
  PET_BATTLE_CONFIG,
  getPetBattleStats,
  simulateBattle,
  runTournament,
  canFreeBattle,
  consumeFreeBattle,
  applyBattleReward,
};

// ============================================
// 카드 기지(성) 시스템 — 건설 + 다른 플레이어 공략
// 카드게임 내에서 "성 공략"의 재미
// ============================================

// 기지 시설 (카드로 건설)
const FORTRESS_BUILDINGS = [
  { id: 'fb_wall', name: '성벽', icon: '🧱', cost: { gold: 2000 }, hp: 500, def: 50, desc: '기본 방어', maxLv: 10 },
  { id: 'fb_tower', name: '감시탑', icon: '🗼', cost: { gold: 3000 }, hp: 300, atk: 30, desc: '자동 공격', maxLv: 5 },
  { id: 'fb_barracks', name: '병영', icon: '🏕️', cost: { gold: 4000 }, effect: { mercSlot: 1 }, desc: '수비 용병 +1', maxLv: 5 },
  { id: 'fb_mine', name: '금광', icon: '⛏️💰', cost: { gold: 5000 }, effect: { goldPerHour: 200 }, desc: '시간당 골드 생산', maxLv: 10 },
  { id: 'fb_lab', name: '연구소', icon: '🔬', cost: { gold: 6000 }, effect: { cardExpBonus: 0.1 }, desc: '카드 EXP +10%/Lv', maxLv: 5 },
  { id: 'fb_market', name: '시장', icon: '🏪', cost: { gold: 4000 }, effect: { tradeMul: 1.1 }, desc: '무역 수익 +10%/Lv', maxLv: 5 },
  { id: 'fb_shrine', name: '신전', icon: '⛪', cost: { gold: 8000 }, effect: { diamondPerDay: 3 }, desc: '일일 다이아 +3/Lv', maxLv: 3 },
  { id: 'fb_vault', name: '금고', icon: '🏦', cost: { gold: 3000 }, effect: { raidProtect: 0.1 }, desc: '약탈 방어 +10%/Lv', maxLv: 10 },
];

// 기지 레벨 (총 건물 수 기준)
const FORTRESS_LEVELS = [
  { level: 1, name: '야영지', buildings: 0, icon: '⛺' },
  { level: 2, name: '마을', buildings: 3, icon: '🏘️' },
  { level: 3, name: '요새', buildings: 6, icon: '🏰' },
  { level: 4, name: '성채', buildings: 10, icon: '🏰🌟' },
  { level: 5, name: '왕성', buildings: 15, icon: '🏰👑' },
];

// 기지 공략 (다른 플레이어 성 공격)
function attackFortress(attacker, defender) {
  if (!attacker || !defender) return { ok: false, reason: '대상 없음' };
  const fort = defender.fortress || { buildings: {}, level: 1 };

  // 공격력 = 파티 카드 총 ATK
  const partyIds = attacker.ioParty || [];
  const partyCards = (attacker.cards || []).filter(c => partyIds.includes(c.id));
  const totalAtk = partyCards.reduce((s, c) => s + (c.atk || 30), 0);

  // 방어력 = 성벽 DEF + 감시탑 ATK
  const wallLv = fort.buildings['fb_wall'] || 0;
  const towerLv = fort.buildings['fb_tower'] || 0;
  const totalDef = wallLv * 50 + towerLv * 30;

  const attackRoll = totalAtk * (0.8 + Math.random() * 0.4);
  const defenseRoll = totalDef * (0.8 + Math.random() * 0.4);
  const win = attackRoll > defenseRoll;

  let loot = 0;
  if (win) {
    const vaultLv = fort.buildings['fb_vault'] || 0;
    const protectRate = Math.min(0.9, vaultLv * 0.1);
    loot = Math.floor((defender.gold || 0) * 0.1 * (1 - protectRate));
    defender.gold = Math.max(0, (defender.gold || 0) - loot);
    attacker.gold = (attacker.gold || 0) + loot;
  }

  return {
    ok: true, win, loot,
    attackPower: Math.floor(attackRoll),
    defensePower: Math.floor(defenseRoll),
    msg: win ? `공략 성공! ${loot}G 약탈!` : '공략 실패... 방어가 너무 강합니다',
  };
}

function buildFortress(player, buildingId) {
  const bld = FORTRESS_BUILDINGS.find(b => b.id === buildingId);
  if (!bld) return { ok: false, reason: '알 수 없는 건물' };
  if ((player.gold || 0) < bld.cost.gold) return { ok: false, reason: '골드 부족' };

  player.fortress = player.fortress || { buildings: {}, level: 1 };
  const current = player.fortress.buildings[buildingId] || 0;
  if (current >= bld.maxLv) return { ok: false, reason: '최대 레벨' };

  player.gold -= bld.cost.gold;
  player.fortress.buildings[buildingId] = current + 1;

  // 레벨 갱신
  const totalBuildings = Object.values(player.fortress.buildings).reduce((s, v) => s + v, 0);
  const newLevel = [...FORTRESS_LEVELS].reverse().find(l => totalBuildings >= l.buildings) || FORTRESS_LEVELS[0];
  player.fortress.level = newLevel.level;

  return { ok: true, msg: `${bld.name} Lv.${current + 1} 건설! (기지: ${newLevel.icon} ${newLevel.name})`, fortress: player.fortress };
}

// 기지 수입 수집
function collectFortressIncome(player) {
  const fort = player.fortress;
  if (!fort) return { ok: false, reason: '기지 없음' };
  const now = Date.now();
  const lastCollect = player._lastFortressCollect || now;
  const hours = Math.min(24, (now - lastCollect) / 3600000); // 최대 24시간
  if (hours < 0.1) return { ok: false, reason: '아직 수집할 수입 없음' };

  const mineLv = fort.buildings['fb_mine'] || 0;
  const gold = Math.floor(mineLv * 200 * hours);
  player.gold = (player.gold || 0) + gold;
  player._lastFortressCollect = now;

  return { ok: true, msg: `${Math.floor(hours)}시간 수입: ${gold}G 수집!`, gold };
}

function register(io, socket, player) {
  socket.on('fortress_info', () => {
    socket.emit('fortress_info', {
      buildings: FORTRESS_BUILDINGS, levels: FORTRESS_LEVELS,
      myFortress: player.fortress || { buildings: {}, level: 1 },
    });
  });

  socket.on('fortress_build', (data) => {
    const result = buildFortress(player, data.buildingId);
    socket.emit('fortress_build_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('fortress_collect', () => {
    const result = collectFortressIncome(player);
    socket.emit('fortress_collect_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('fortress_attack', (data) => {
    // 봇 상대 공략 (실제 매칭은 추후)
    const botFort = { fortress: { buildings: { fb_wall: Math.floor(Math.random() * 5), fb_tower: Math.floor(Math.random() * 3), fb_vault: Math.floor(Math.random() * 3) }, level: 2 }, gold: 5000 + Math.floor(Math.random() * 10000) };
    const result = attackFortress(player, botFort);
    socket.emit('fortress_attack_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });
}

module.exports = { FORTRESS_BUILDINGS, FORTRESS_LEVELS, buildFortress, attackFortress, collectFortressIncome, register };

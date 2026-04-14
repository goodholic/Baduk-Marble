// ============================================
// 도전의 탑 — 100층, 층마다 강해지는 적, 엔드게임 콘텐츠
// ============================================

const MAX_FLOOR = 100;
const DAILY_ATTEMPTS = 5;

// 층별 적 스케일링
function getFloorEnemy(floor) {
  const baseHp = 100 + floor * 50;
  const baseAtk = 15 + floor * 8;
  const baseDef = 10 + floor * 5;
  const names = ['슬라임', '고블린', '오크 전사', '스켈레톤', '다크 나이트', '리치', '드래곤 해츨링', '마왕 부하', '고대 골렘', '차원의 수호자'];
  const icons = ['🟢', '👺', '👹', '💀', '🖤⚔️', '💀🔮', '🐲', '😈', '🗿', '🌀'];
  const tier = Math.min(Math.floor(floor / 10), names.length - 1);

  return {
    name: names[tier] + (floor % 10 === 0 ? ' (보스!)' : ''),
    icon: icons[tier],
    hp: floor % 10 === 0 ? baseHp * 3 : baseHp, // 10층마다 보스 (HP 3배)
    atk: floor % 10 === 0 ? baseAtk * 2 : baseAtk,
    def: baseDef,
    floor,
    isBoss: floor % 10 === 0,
  };
}

// 층별 보상
function getFloorReward(floor) {
  const gold = 200 + floor * 100;
  const exp = 50 + floor * 20;
  const reward = { gold, exp };

  if (floor % 10 === 0) { // 보스층 보상
    reward.diamonds = 5 + Math.floor(floor / 10) * 3;
    if (floor >= 50) reward.card = floor >= 90 ? 'legend' : floor >= 70 ? 'epic' : 'rare';
  }
  if (floor === 100) { // 최종층!
    reward.gold = 100000;
    reward.diamonds = 200;
    reward.card = 'myth';
    reward.title = '탑의 정복자';
  }

  return reward;
}

// 전투 시뮬레이션
function battleFloor(playerCards, floor) {
  const enemy = getFloorEnemy(floor);
  const totalAtk = playerCards.reduce((s, c) => s + (c.atk || 30), 0);
  const totalDef = playerCards.reduce((s, c) => s + (c.def || 20), 0);
  const totalHp = playerCards.reduce((s, c) => s + (c.hp || 100), 0);

  let playerHp = totalHp;
  let enemyHp = enemy.hp;
  const log = [];

  for (let turn = 1; turn <= 20 && playerHp > 0 && enemyHp > 0; turn++) {
    const pDmg = Math.max(5, Math.floor(totalAtk * (0.9 + Math.random() * 0.2) - enemy.def * 0.3));
    const eDmg = Math.max(5, Math.floor(enemy.atk * (0.9 + Math.random() * 0.2) - totalDef * 0.3));
    enemyHp -= pDmg;
    playerHp -= eDmg;
    log.push({ turn, pDmg, eDmg, playerHp: Math.max(0, playerHp), enemyHp: Math.max(0, enemyHp) });
  }

  return { win: enemyHp <= 0, log, enemy, remainHp: Math.max(0, playerHp) };
}

function attemptFloor(player) {
  const today = new Date().toDateString();
  if (player._towerDate !== today) { player._towerDate = today; player._towerAttempts = 0; }
  if ((player._towerAttempts || 0) >= DAILY_ATTEMPTS) return { ok: false, reason: `일일 ${DAILY_ATTEMPTS}회 도전 소진` };

  player._towerAttempts++;
  const floor = (player.towerFloor || 0) + 1;
  if (floor > MAX_FLOOR) return { ok: false, reason: '이미 100층 클리어!' };

  const partyIds = player.ioParty || (player.cards || []).slice(0, 5).map(c => c.id);
  const partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
  if (partyCards.length === 0) return { ok: false, reason: '파티 카드 필요' };

  const result = battleFloor(partyCards, floor);

  if (result.win) {
    player.towerFloor = floor;
    const reward = getFloorReward(floor);
    player.gold = (player.gold || 0) + reward.gold;
    if (reward.diamonds) player.diamonds = (player.diamonds || 0) + reward.diamonds;
    if (reward.exp) partyCards.forEach(c => c.exp = (c.exp || 0) + Math.floor(reward.exp / partyCards.length));
    if (reward.title) { player.titles = player.titles || []; player.titles.push(reward.title); }

    return { ok: true, win: true, floor, reward, battle: result, attemptsLeft: DAILY_ATTEMPTS - player._towerAttempts,
      msg: `${floor}층 클리어! +${reward.gold}G${reward.diamonds ? ' +' + reward.diamonds + '💎' : ''}` };
  }

  return { ok: true, win: false, floor, battle: result, attemptsLeft: DAILY_ATTEMPTS - player._towerAttempts,
    msg: `${floor}층 실패... (남은 도전: ${DAILY_ATTEMPTS - player._towerAttempts}회)` };
}

function register(io, socket, player) {
  socket.on('tower_info', () => {
    const floor = player.towerFloor || 0;
    const nextEnemy = floor < MAX_FLOOR ? getFloorEnemy(floor + 1) : null;
    const nextReward = floor < MAX_FLOOR ? getFloorReward(floor + 1) : null;
    socket.emit('tower_info', { floor, maxFloor: MAX_FLOOR, nextEnemy, nextReward, attemptsLeft: DAILY_ATTEMPTS - (player._towerAttempts || 0) });
  });

  socket.on('tower_attempt', () => {
    const result = attemptFloor(player);
    socket.emit('tower_result', result);
    if (result.ok && result.win) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      if (result.floor % 10 === 0) io.emit('server_msg', `🗼 [도전의 탑] ${player.displayName || '???'}이(가) ${result.floor}층 보스 격파!`);
      if (result.floor === 100) io.emit('server_msg', `🗼👑 [도전의 탑] ${player.displayName || '???'}이(가) 100층 완전 정복!!!`);
    }
  });
}

module.exports = { MAX_FLOOR, DAILY_ATTEMPTS, getFloorEnemy, getFloorReward, battleFloor, attemptFloor, register };

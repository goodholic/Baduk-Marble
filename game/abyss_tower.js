// 심연의 탑 — v3.0
// 100층 엔드게임 타워, 주간 리셋, 용병 HP 유지, 랭킹

const TOWER_CFG = {
  maxFloor: 100,
  resetDay: 1, // 월요일
  bossFloors: [5,10,15,20,30,40,50,70,90,100],
};

// 층별 적 스케일링
function getFloorData(floor) {
  const scale = 1 + (floor - 1) * 0.15;
  const hpBase = 50 * Math.pow(scale, 2);
  const atkBase = 8 + floor * 2;
  const count = Math.min(8, 3 + Math.floor(floor / 10));
  const isBoss = TOWER_CFG.bossFloors.includes(floor);

  const bossNames = {
    5: '슬라임 킹', 10: '디어울프', 15: '아라크네', 20: '흑기사',
    30: '마왕의 그림자', 40: '심연의 쌍둥이', 50: '심연 군주',
    70: '고대 용', 90: '마왕', 100: '태초의 존재 그림자',
  };

  return {
    floor,
    enemies: isBoss ? [{ name: bossNames[floor] || '보스', hp: Math.floor(hpBase * 3), atk: Math.floor(atkBase * 2), isBoss: true }]
      : Array.from({ length: count }, (_, i) => ({
          name: '심연의 ' + ['전사','마법사','궁수','암살자','해골'][i % 5],
          hp: Math.floor(hpBase), atk: Math.floor(atkBase),
        })),
    reward: {
      gold: floor * 100 * (isBoss ? 3 : 1),
      material: Math.floor(floor / 5),
      cardChance: isBoss ? Math.min(0.3, floor * 0.003) : 0,
      awakenStone: floor >= 50 && isBoss ? 0.1 : 0,
    },
    special: floor > 25 ? '용병 사망 시 다음 층 사용 불가' : '',
  };
}

function getTowerState(player) {
  if (!player._abyssTower) player._abyssTower = { currentFloor: 1, highest: 0, weekStart: 0, mercHp: {}, attempts: 0 };

  // 주간 리셋 체크
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - (now.getDay() || 7) + 1); monday.setHours(0,0,0,0);
  if (player._abyssTower.weekStart < monday.getTime()) {
    player._abyssTower.currentFloor = 1;
    player._abyssTower.mercHp = {};
    player._abyssTower.attempts = 0;
    player._abyssTower.weekStart = monday.getTime();
  }
  return player._abyssTower;
}

// 전투 (자동)
function challengeFloor(player) {
  const tower = getTowerState(player);
  if (tower.currentFloor > TOWER_CFG.maxFloor) return { success: false, msg: '이미 100층 클리어!' };

  const floor = getFloorData(tower.currentFloor);
  tower.attempts++;

  // 용병 파티로 전투
  let mercSystem;
  try { mercSystem = require('./mercenary_system'); } catch(e) {}
  const mercs = mercSystem ? mercSystem.getPlayerMercs(player) : { roster: [], party: [] };
  const party = mercs.roster.filter(m => mercs.party.includes(m.uid));

  if (party.length === 0) return { success: false, msg: '용병 파티를 편성하세요' };

  // 용병 HP 유지 (이전 층 HP 이어감)
  const fighters = party.map(m => {
    const savedHp = tower.mercHp[m.uid];
    return {
      uid: m.uid, name: m.name, icon: m.icon,
      atk: m.atk, def: m.def,
      hp: savedHp !== undefined ? savedHp : m.hp,
      maxHp: m.hp,
      alive: (savedHp !== undefined ? savedHp : m.hp) > 0,
      skill: m.skill,
    };
  }).filter(f => f.alive);

  if (fighters.length === 0) return { success: false, msg: '생존한 용병이 없습니다! (주간 리셋 대기)' };

  // 전투 시뮬레이션 (간소화)
  const enemies = floor.enemies.map(e => ({ ...e, alive: true }));
  const log = [];
  let turn = 0;

  while (fighters.some(f => f.alive) && enemies.some(e => e.alive) && turn < 50) {
    turn++;

    // 아군 공격
    for (const f of fighters.filter(f => f.alive)) {
      const target = enemies.find(e => e.alive);
      if (!target) break;
      const dmg = Math.max(1, Math.floor(f.atk * (100 / (100 + (target.def || 0)))));
      target.hp -= dmg;
      if (target.hp <= 0) { target.alive = false; log.push(`${f.icon} ${f.name}이(가) ${target.name} 처치!`); }
    }

    // 적 공격
    for (const e of enemies.filter(e => e.alive)) {
      const target = fighters.filter(f => f.alive)[Math.floor(Math.random() * fighters.filter(f => f.alive).length)];
      if (!target) break;
      const dmg = Math.max(1, Math.floor(e.atk * (100 / (100 + target.def))));
      target.hp -= dmg;
      if (target.hp <= 0) { target.alive = false; log.push(`${target.icon} ${target.name} 쓰러짐!`); }
    }
  }

  // HP 저장 (다음 층 이어감)
  for (const f of fighters) {
    tower.mercHp[f.uid] = Math.max(0, f.hp);
  }

  const victory = enemies.every(e => !e.alive);

  if (victory) {
    // 보상 지급
    player.gold = (player.gold || 0) + floor.reward.gold;
    if (tower.currentFloor > tower.highest) {
      tower.highest = tower.currentFloor;
      player._abyssHighest = tower.highest;
    }

    // 용병 카드 드롭
    let cardDrop = null;
    if (floor.reward.cardChance && Math.random() < floor.reward.cardChance) {
      try {
        const pool = mercSystem.MERCENARIES.filter(m => m.grade <= 3);
        const card = pool[Math.floor(Math.random() * pool.length)];
        if (card) { mercSystem.addMercenary(player, card.id); cardDrop = card.name; }
      } catch(e) {}
    }

    tower.currentFloor++;

    return {
      success: true, victory: true,
      floor: tower.currentFloor - 1,
      reward: floor.reward, cardDrop,
      msg: `🏰 ${tower.currentFloor - 1}층 클리어! +${floor.reward.gold}G${cardDrop ? ' 🎴' + cardDrop : ''}`,
      survivors: fighters.filter(f => f.alive).length,
      log: log.slice(-5),
      nextFloor: tower.currentFloor,
    };
  } else {
    return {
      success: true, victory: false,
      floor: tower.currentFloor,
      msg: `💀 ${tower.currentFloor}층 실패... (생존 ${fighters.filter(f => f.alive).length}명)`,
      survivors: fighters.filter(f => f.alive).length,
      log: log.slice(-5),
    };
  }
}

function getTowerStatus(player) {
  const tower = getTowerState(player);
  const nextFloor = getFloorData(Math.min(tower.currentFloor, TOWER_CFG.maxFloor));
  const mercs = require('./mercenary_system').getPlayerMercs(player);
  const party = mercs.roster.filter(m => mercs.party.includes(m.uid));

  return {
    currentFloor: tower.currentFloor,
    highest: tower.highest,
    attempts: tower.attempts,
    nextFloor: {
      floor: nextFloor.floor,
      enemies: nextFloor.enemies.length,
      isBoss: TOWER_CFG.bossFloors.includes(nextFloor.floor),
      reward: nextFloor.reward,
      special: nextFloor.special,
    },
    party: party.map(m => ({
      uid: m.uid, name: m.name, icon: m.icon,
      hp: tower.mercHp[m.uid] !== undefined ? tower.mercHp[m.uid] : m.hp,
      maxHp: m.hp,
      alive: (tower.mercHp[m.uid] !== undefined ? tower.mercHp[m.uid] : m.hp) > 0,
    })),
  };
}

function registerTowerHandlers(socket, playerId, players, io) {
  socket.on('tower_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('tower_status', getTowerStatus(p));
  });

  socket.on('tower_challenge', () => {
    const p = players[playerId];
    if (!p) return;
    const result = challengeFloor(p);
    socket.emit('tower_result', result);
    if (result.victory && TOWER_CFG.bossFloors.includes(result.floor)) {
      io.emit('server_msg', { msg: `🏰 ${p.displayName||p.className}님이 심연의 탑 ${result.floor}층 보스 클리어!`, type: 'boss' });
    }
    if (result.floor === 100 && result.victory) {
      io.emit('server_msg', { msg: `🏆🏆🏆 ${p.displayName||p.className}님이 심연의 탑 100층 완전 정복!!!`, type: 'boss' });
    }
  });
}

module.exports = { registerTowerHandlers, getTowerStatus, TOWER_CFG };

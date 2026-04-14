// v5.0 — 용병 성벽 배치 시스템
// 성벽 위에 용병을 배치하여 IO 맵에서 자동 공격하는 타워디펜스 요소

const MAX_WALL_SLOTS = 8;

// 성벽 포지션별 특성
const WALL_POSITIONS = [
  { id: 'gate_left',   name: '정문 좌', x: 100, y: 300, bonus: { def: 1.2 }, desc: '정문 방어 핵심' },
  { id: 'gate_right',  name: '정문 우', x: 300, y: 300, bonus: { def: 1.2 }, desc: '정문 방어 핵심' },
  { id: 'tower_nw',    name: '북서 망루', x: 50,  y: 100, bonus: { range: 1.3 }, desc: '사거리 증가' },
  { id: 'tower_ne',    name: '북동 망루', x: 350, y: 100, bonus: { range: 1.3 }, desc: '사거리 증가' },
  { id: 'tower_sw',    name: '남서 망루', x: 50,  y: 500, bonus: { range: 1.3 }, desc: '사거리 증가' },
  { id: 'tower_se',    name: '남동 망루', x: 350, y: 500, bonus: { range: 1.3 }, desc: '사거리 증가' },
  { id: 'inner_wall',  name: '내성벽', x: 200, y: 200, bonus: { def: 1.5, atk: 0.8 }, desc: '최후 방어선, 높은 방어' },
  { id: 'throne_guard',name: '왕좌 수호', x: 200, y: 150, bonus: { atk: 1.3, def: 1.3 }, desc: '최종 보스 포지션' },
];

// 용병 배치 시 자동 공격 타입
const ATTACK_PATTERNS = {
  melee:  { range: 80,  atkSpd: 1.0, splash: 0,  label: '근접', desc: '성벽 근처 접근 시 강력 타격' },
  ranged: { range: 200, atkSpd: 0.8, splash: 0,  label: '원거리', desc: '멀리서 지속 공격' },
  magic:  { range: 180, atkSpd: 0.6, splash: 60, label: '마법', desc: '범위 마법 공격' },
  healer: { range: 150, atkSpd: 0.5, splash: 0,  label: '치유', desc: '아군 용병/성벽 회복' },
  siege:  { range: 250, atkSpd: 0.3, splash: 80, label: '공성', desc: '느리지만 강력한 범위 공격' },
};

// 성벽 용병 시너지: 인접 배치 시 추가 효과
const WALL_SYNERGIES = [
  { positions: ['gate_left', 'gate_right'], name: '철벽 수문장', effect: { bothDef: 1.3, gateHp: 1.5 } },
  { positions: ['tower_nw', 'tower_ne'], name: '십자포화', effect: { bothAtk: 1.2, crossfire: true } },
  { positions: ['tower_sw', 'tower_se'], name: '남방 포격', effect: { bothAtk: 1.2, crossfire: true } },
  { positions: ['inner_wall', 'throne_guard'], name: '최후의 보루', effect: { bothDef: 1.5, lastStand: true } },
  { positions: ['gate_left', 'tower_nw'], name: '좌익 협공', effect: { bothAtk: 1.15 } },
  { positions: ['gate_right', 'tower_ne'], name: '우익 협공', effect: { bothAtk: 1.15 } },
];

// 성벽 업그레이드: 포지션별 강화
const WALL_UPGRADES = {
  reinforced: { name: '강화 성벽', cost: 5000, effect: 'HP+30%', level: [1, 2, 3] },
  oil_pot:    { name: '끓는 기름', cost: 3000, effect: '접근 시 DoT', level: [1, 2] },
  arrow_slit: { name: '화살 구멍', cost: 4000, effect: '사거리+20%', level: [1, 2, 3] },
  magic_ward: { name: '마법 보호막', cost: 8000, effect: '마법 피해 50% 감소', level: [1] },
  barricade:  { name: '바리케이드', cost: 2000, effect: '이동속도 감소 지역', level: [1, 2] },
};

function placeMercOnWall(player, mercId, positionId) {
  const pos = WALL_POSITIONS.find(p => p.id === positionId);
  if (!pos) return { ok: false, reason: '잘못된 배치 위치' };

  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };

  const placements = player.wallPlacements || {};
  if (Object.keys(placements).length >= MAX_WALL_SLOTS) {
    return { ok: false, reason: `최대 ${MAX_WALL_SLOTS}곳 배치 가능` };
  }
  if (placements[positionId]) {
    return { ok: false, reason: '이미 배치된 위치' };
  }

  // 공격 패턴 결정
  const classMap = {
    warrior: 'melee', knight: 'melee', assassin: 'melee',
    mage: 'magic', cleric: 'healer', ranger: 'ranged',
  };
  const pattern = ATTACK_PATTERNS[classMap[merc.class] || 'melee'];

  const wallMerc = {
    mercId: merc.id,
    name: merc.name,
    position: positionId,
    posData: pos,
    hp: Math.floor((merc.hp || 500) * (pos.bonus.def || 1)),
    atk: Math.floor((merc.atk || 50) * (pos.bonus.atk || 1)),
    pattern,
    range: Math.floor(pattern.range * (pos.bonus.range || 1)),
    x: pos.x,
    y: pos.y,
  };

  placements[positionId] = wallMerc;
  player.wallPlacements = placements;

  // 시너지 체크
  const activeSynergies = [];
  for (const syn of WALL_SYNERGIES) {
    if (syn.positions.every(p => placements[p])) {
      activeSynergies.push(syn);
    }
  }

  return { ok: true, wallMerc, activeSynergies };
}

function removeMercFromWall(player, positionId) {
  const placements = player.wallPlacements || {};
  if (!placements[positionId]) return { ok: false, reason: '해당 위치에 용병 없음' };
  const removed = placements[positionId];
  delete placements[positionId];
  player.wallPlacements = placements;
  return { ok: true, removed };
}

function getWallStatus(player) {
  const placements = player.wallPlacements || {};
  const activeSynergies = [];
  for (const syn of WALL_SYNERGIES) {
    if (syn.positions.every(p => placements[p])) {
      activeSynergies.push(syn);
    }
  }
  return {
    positions: WALL_POSITIONS,
    placements,
    synergies: activeSynergies,
    upgrades: player.wallUpgrades || {},
    maxSlots: MAX_WALL_SLOTS,
  };
}

function upgradeWall(player, positionId, upgradeId) {
  const upg = WALL_UPGRADES[upgradeId];
  if (!upg) return { ok: false, reason: '알 수 없는 업그레이드' };
  const upgrades = player.wallUpgrades || {};
  const key = `${positionId}:${upgradeId}`;
  const currentLv = upgrades[key] || 0;
  if (currentLv >= upg.level.length) return { ok: false, reason: '최대 레벨' };
  if ((player.gold || 0) < upg.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= upg.cost;
  upgrades[key] = currentLv + 1;
  player.wallUpgrades = upgrades;
  return { ok: true, upgrade: upg, level: currentLv + 1 };
}

function register(io, socket, player) {
  socket.on('siege_wall_place', (data) => {
    const result = placeMercOnWall(player, data.mercId, data.positionId);
    socket.emit('siege_wall_place_result', result);
    if (result.ok) {
      io.to(data.siegeRoom || 'siege').emit('siege_wall_update', getWallStatus(player));
    }
  });

  socket.on('siege_wall_remove', (data) => {
    const result = removeMercFromWall(player, data.positionId);
    socket.emit('siege_wall_remove_result', result);
  });

  socket.on('siege_wall_status', () => {
    socket.emit('siege_wall_status', getWallStatus(player));
  });

  socket.on('siege_wall_upgrade', (data) => {
    const result = upgradeWall(player, data.positionId, data.upgradeId);
    socket.emit('siege_wall_upgrade_result', result);
  });
}

module.exports = {
  MAX_WALL_SLOTS, WALL_POSITIONS, ATTACK_PATTERNS, WALL_SYNERGIES, WALL_UPGRADES,
  placeMercOnWall, removeMercFromWall, getWallStatus, upgradeWall, register,
};

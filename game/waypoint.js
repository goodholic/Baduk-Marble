// 차원문/웨이포인트 시스템 — v2.02
// 거점을 잠금 해제하고 텔레포트로 즉시 이동

const WAYPOINTS = {
  capital:     { name:'왕도',         icon:'🏰', x: 0,    y: 0,    unlockCost:    0, levelReq: 1  },
  forest_camp: { name:'숲속 야영지',  icon:'🌲', x:-30,   y: 20,   unlockCost:  500, levelReq: 5  },
  desert_oasis:{ name:'사막 오아시스', icon:'🏜️', x: 60,   y:-10,   unlockCost: 1500, levelReq:10 },
  iceberg_port:{ name:'빙산 항구',     icon:'🧊', x:-80,   y:-50,   unlockCost: 3000, levelReq:15 },
  volcano_rim: { name:'화산 능선',     icon:'🌋', x: 90,   y: 70,   unlockCost: 5000, levelReq:20 },
  shadow_keep: { name:'그림자 요새',   icon:'🏚️', x:-100,  y: 80,   unlockCost: 8000, levelReq:25 },
  sky_temple:  { name:'천공 신전',     icon:'⛩️', x: 50,   y:120,   unlockCost:12000, levelReq:30 },
  void_gate:   { name:'공허의 문',     icon:'🌀', x: 0,    y:200,   unlockCost:25000, levelReq:40 },
};

const TELEPORT_COOLDOWN_MIN = 3;
const TELEPORT_FEE_BASE = 10;

function _ensure(player) {
  if (!player.waypoint) {
    player.waypoint = {
      unlocked: ['capital'], // 시작은 왕도 무료
      lastTeleport: 0,
      teleportCount: 0,
    };
  }
  return player.waypoint;
}

function getStatus(player) {
  const w = _ensure(player);
  const now = Date.now();
  const cdMs = TELEPORT_COOLDOWN_MIN * 60 * 1000;
  const cooldownLeft = Math.max(0, w.lastTeleport + cdMs - now);
  const list = {};
  for (const [id, def] of Object.entries(WAYPOINTS)) {
    list[id] = {
      ...def,
      unlocked: w.unlocked.includes(id),
      meetsLevel: (player.level || 1) >= def.levelReq,
    };
  }
  return {
    waypoints: list,
    unlockedCount: w.unlocked.length,
    totalCount: Object.keys(WAYPOINTS).length,
    teleportCount: w.teleportCount,
    cooldownSecondsLeft: Math.ceil(cooldownLeft / 1000),
  };
}

function unlock(player, waypointId) {
  const w = _ensure(player);
  const def = WAYPOINTS[waypointId];
  if (!def) return { success:false, msg:'존재하지 않는 거점' };
  if (w.unlocked.includes(waypointId)) return { success:false, msg:'이미 해금됨' };
  if ((player.level || 1) < def.levelReq) {
    return { success:false, msg:`레벨 ${def.levelReq} 필요` };
  }
  if ((player.gold || 0) < def.unlockCost) {
    return { success:false, msg:`골드 ${def.unlockCost} 부족` };
  }
  player.gold -= def.unlockCost;
  w.unlocked.push(waypointId);
  return {
    success:true,
    msg:`${def.icon} ${def.name} 해금 완료!`,
    completed: w.unlocked.length === Object.keys(WAYPOINTS).length,
  };
}

function teleport(player, waypointId) {
  const w = _ensure(player);
  const def = WAYPOINTS[waypointId];
  if (!def) return { success:false, msg:'존재하지 않는 거점' };
  if (!w.unlocked.includes(waypointId)) return { success:false, msg:'미해금 거점' };
  const now = Date.now();
  const cdMs = TELEPORT_COOLDOWN_MIN * 60 * 1000;
  if (now < w.lastTeleport + cdMs) {
    return { success:false, msg:`쿨다운 ${Math.ceil((w.lastTeleport+cdMs-now)/1000)}초 남음` };
  }
  // 거리 비례 요금
  const fromX = player.x || 0;
  const fromY = player.y || 0;
  const dist = Math.sqrt((def.x - fromX) ** 2 + (def.y - fromY) ** 2);
  const fee = TELEPORT_FEE_BASE + Math.floor(dist);
  if ((player.gold || 0) < fee) return { success:false, msg:`텔레포트 비용 ${fee}G 부족` };

  player.gold -= fee;
  player.x = def.x;
  player.y = def.y;
  w.lastTeleport = now;
  w.teleportCount += 1;

  return {
    success:true,
    msg:`${def.icon} ${def.name}(으)로 이동! (${fee}G)`,
    fee,
    pos:{ x: def.x, y: def.y },
  };
}

module.exports = {
  WAYPOINTS,
  TELEPORT_COOLDOWN_MIN,
  getStatus,
  unlock,
  teleport,
};

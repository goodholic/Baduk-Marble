// v6.9 — 영지 거상(콜로서스) 시스템
// 영지에 거대 조형물 건설, 서버 랜드마크, 관광+버프+위엄

const COLOSSUS_TYPES = [
  { id: 'warrior_statue', name: '전사의 거상', icon: '🗿⚔️', cost: 500000, height: 50, buff: { serverAtk: 1.03 }, visitors: 200, desc: '전사의 기상! 서버 ATK+3%', buildTime: 7 },
  { id: 'dragon_monument', name: '용의 기념비', icon: '🐲🗿', cost: 800000, height: 80, buff: { serverFireDmg: 1.05 }, visitors: 350, desc: '거대한 용 석상! 화속성+5%', buildTime: 14 },
  { id: 'tree_of_eternity', name: '영원의 나무', icon: '🌳🗿', cost: 600000, height: 100, buff: { serverHpRegen: 0.01 }, visitors: 300, desc: '황금 나무! 서버 재생+1%', buildTime: 10 },
  { id: 'tower_of_babel', name: '바벨탑', icon: '🗼🗿', cost: 1000000, height: 200, buff: { serverExp: 1.05 }, visitors: 500, desc: '하늘을 찌르는 탑! EXP+5%', buildTime: 21 },
  { id: 'lighthouse', name: '세계의 등대', icon: '🏮🗿', cost: 700000, height: 60, buff: { serverVision: 1.1 }, visitors: 250, desc: '모든 것을 비추는 등대! 시야+10%', buildTime: 10 },
  { id: 'colosseum_supreme', name: '대 콜로세움', icon: '🏟️🗿', cost: 900000, height: 40, buff: { serverPvpReward: 1.1 }, visitors: 400, desc: '최대 규모 투기장! PvP 보상+10%', buildTime: 14 },
  { id: 'world_wonder', name: '세계의 기적', icon: '🌍🗿👑', cost: 3000000, height: 300, buff: { serverAll: 1.05 }, visitors: 1000, desc: '서버에 1개만! 전체+5%!', buildTime: 30, unique: true },
];

// 거상 유지 (주간 유지비)
const MAINTENANCE = { costPerWeek: 'buildCost×0.01', desc: '주간 유지비 = 건설비의 1%' };

// 거상 이벤트
const COLOSSUS_EVENTS = [
  { id: 'pilgrimage', name: '순례', chance: 0.1, effect: '방문자 3배 (1일)', desc: '전 서버에서 순례자 몰림' },
  { id: 'miracle', name: '기적', chance: 0.03, effect: '거상 버프 2배 (3일)', desc: '거상에서 기적이!' },
  { id: 'earthquake_risk', name: '지진 위협', chance: 0.05, effect: '거상 HP -20%, 수리 필요', desc: '지진으로 균열!' },
  { id: 'war_target', name: '전쟁 목표', chance: 0.04, effect: '적 길드가 거상을 파괴 목표로!', desc: '거상을 지켜라!' },
  { id: 'festival', name: '거상 축제', chance: 0.08, effect: '자동 축제 발생! 방문자+수입↑', desc: '거상 앞 축제!' },
];

// 거상 파괴 & 복구
const DESTRUCTION = {
  destroyable: true,
  rebuildCost: 0.5, // 원래 비용의 50%로 재건
  destroyReward: { gold: 100000, fame: 500, desc: '적 거상 파괴 시 보상' },
  desc: '공성전에서 거상 파괴 가능! 파괴하면 서버 버프 소멸',
};

function buildColossus(player, colossusId) {
  const col = COLOSSUS_TYPES.find(c => c.id === colossusId);
  if (!col) return { ok: false, reason: '알 수 없는 거상' };
  if ((player.gold || 0) < col.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= col.cost;
  player.colossus = { id: colossusId, name: col.name, builtAt: Date.now(), hp: 100 };
  return { ok: true, colossus: col };
}

function register(io, socket, player) {
  socket.on('colossus_info', () => {
    socket.emit('colossus_info', { types: COLOSSUS_TYPES, maintenance: MAINTENANCE, events: COLOSSUS_EVENTS, destruction: DESTRUCTION, mine: player.colossus });
  });
  socket.on('colossus_build', (data) => {
    const result = buildColossus(player, data.colossusId);
    socket.emit('colossus_build_result', result);
    if (result.ok) io.emit('server_msg', `🗿👑 [거상 건설!] ${player.name}이(가) "${result.colossus.name}" 건설 시작! 서버 랜드마크!`);
  });
}

module.exports = { COLOSSUS_TYPES, MAINTENANCE, COLOSSUS_EVENTS, DESTRUCTION, buildColossus, register };

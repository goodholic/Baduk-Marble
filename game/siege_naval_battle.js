// v5.6 — 해상 공성전 시스템
// 바다 위 해전, 함선 건조, 해적/해군, 섬 요새 공략

const SHIP_TYPES = [
  { id: 'rowboat', name: '노 젓는 배', icon: '🚣', hp: 500, spd: 3, cannons: 0, crew: 2, cost: 1000, desc: '기본 이동수단' },
  { id: 'sloop', name: '슬루프', icon: '⛵', hp: 2000, spd: 5, cannons: 2, crew: 5, cost: 10000, desc: '빠른 소형 전투선' },
  { id: 'brigantine', name: '브리건틴', icon: '🚢', hp: 5000, spd: 4, cannons: 6, crew: 15, cost: 30000, desc: '균형 잡힌 중형선' },
  { id: 'galleon', name: '갈레온', icon: '🚢⚔️', hp: 12000, spd: 3, cannons: 16, crew: 40, cost: 80000, desc: '대형 전함, 화력 집중' },
  { id: 'man_of_war', name: '전열함', icon: '⚓🔥', hp: 25000, spd: 2, cannons: 30, crew: 80, cost: 200000, desc: '최강 전함, 해전의 왕' },
  { id: 'ghost_ship', name: '유령선', icon: '👻🚢', hp: 15000, spd: 6, cannons: 10, crew: 0, cost: 500000, desc: '은신 가능! 승무원 불필요', special: true },
];

// 함선 무장
const SHIP_WEAPONS = [
  { id: 'iron_cannon', name: '철 대포', icon: '💣', dmg: 100, range: 200, reload: 5, desc: '기본 대포' },
  { id: 'fire_cannon', name: '화염 대포', icon: '🔥💣', dmg: 80, range: 180, reload: 6, burn: true, desc: '화재 유발' },
  { id: 'chain_shot', name: '체인 샷', icon: '⛓️', dmg: 50, range: 150, reload: 4, slowShip: 0.3, desc: '적 함선 속도 감소' },
  { id: 'grapeshot', name: '포도탄', icon: '🫐💣', dmg: 30, range: 100, reload: 3, crewDmg: 50, desc: '승무원 피해 집중' },
  { id: 'mortar', name: '박격포', icon: '💥', dmg: 200, range: 350, reload: 10, aoe: 3, desc: '장거리 범위 공격' },
  { id: 'kraken_harpoon', name: '크라켄 작살', icon: '🦑⚓', dmg: 150, range: 120, reload: 8, pull: true, desc: '적 함선 끌어당김' },
];

// 해전 맵
const NAVAL_MAPS = [
  { id: 'open_sea', name: '대양', icon: '🌊', features: ['넓은 공간', '바람 변수'], desc: '정면 화력전' },
  { id: 'archipelago', name: '군도', icon: '🏝️', features: ['섬 엄폐', '좁은 해협'], desc: '기동전+매복' },
  { id: 'harbor_siege', name: '항구 공성', icon: '⚓🏰', features: ['항구 방어탑', '기뢰밭'], desc: '항구 요새 공략' },
  { id: 'whirlpool', name: '소용돌이 해역', icon: '🌀🌊', features: ['소용돌이 장애물', '강한 조류'], desc: '위험한 해역 전투' },
  { id: 'kraken_lair', name: '크라켄의 영역', icon: '🦑🌊', features: ['크라켄 출현!', '안개'], desc: '보스+해전 복합' },
];

// 해적/해군 시스템
const NAVAL_ROLES = {
  captain:   { name: '선장', icon: '🎖️', bonus: { teamMorale: 1.15 }, desc: '함선 지휘, 사기 보너스' },
  gunner:    { name: '포수', icon: '💣', bonus: { cannonDmg: 1.2 }, desc: '대포 데미지 강화' },
  navigator: { name: '항해사', icon: '🧭', bonus: { shipSpd: 1.15 }, desc: '속도 보너스' },
  boarder:   { name: '돌격병', icon: '⚔️', bonus: { meleeDmg: 1.3 }, desc: '백병전 특화' },
  medic:     { name: '선의', icon: '💉', bonus: { repairRate: 1.5 }, desc: '함선 수리 속도 강화' },
};

// 해전 보상
const NAVAL_REWARDS = {
  sunken_treasure: { name: '침몰선 보물', gold: 30000, item: 'pearl', chance: 0.2 },
  pirate_flag:     { name: '해적 깃발', gold: 10000, title: '해적왕', chance: 0.05 },
  naval_medal:     { name: '해전 훈장', gold: 5000, defBonus: 1.05, chance: 0.3 },
  sea_monster_drop: { name: '해수 결정', gold: 50000, item: 'sea_crystal', chance: 0.1 },
};

function register(io, socket, player) {
  socket.on('naval_info', () => {
    socket.emit('naval_info', { ships: SHIP_TYPES, weapons: SHIP_WEAPONS, maps: NAVAL_MAPS, roles: NAVAL_ROLES, rewards: NAVAL_REWARDS });
  });
  socket.on('naval_build_ship', (data) => {
    const ship = SHIP_TYPES.find(s => s.id === data.shipId);
    if (!ship) return socket.emit('naval_build_result', { ok: false });
    if ((player.gold || 0) < ship.cost) return socket.emit('naval_build_result', { ok: false, reason: '골드 부족' });
    player.gold -= ship.cost;
    player.ships = player.ships || [];
    player.ships.push({ ...ship, id: `ship_${Date.now()}`, weapons: [], builtAt: Date.now() });
    socket.emit('naval_build_result', { ok: true, ship: ship.name });
    if (ship.special) io.emit('server_msg', `👻🚢 [해전] ${player.name}이(가) 전설의 "${ship.name}" 건조!`);
  });
  socket.on('naval_battle_start', (data) => {
    socket.emit('naval_battle_start', { ok: true, map: NAVAL_MAPS.find(m => m.id === data.mapId) });
    io.emit('server_msg', `⚓⚔️ [해전] ${player.name}이(가) 해전을 개시!`);
  });
}

module.exports = { SHIP_TYPES, SHIP_WEAPONS, NAVAL_MAPS, NAVAL_ROLES, NAVAL_REWARDS, register };

// v6.4 — IO 최후의 항전 모드
// 무한 웨이브 수비, 거점 방어, 협동, 자원 관리

const MAX_PLAYERS = 4;
const BASE_HP = 10000;
const WAVE_INTERVAL = 20;

// 거점 맵
const LAST_STAND_MAPS = [
  { id: 'castle_gate', name: '성문 사수', icon: '🏰🛡️', baseHp: 10000, paths: 2, buildSlots: 8, desc: '성문을 지켜라!' },
  { id: 'bridge', name: '다리 사수', icon: '🌉🛡️', baseHp: 8000, paths: 1, buildSlots: 6, desc: '좁은 다리, 집중 방어' },
  { id: 'village', name: '마을 방어', icon: '🏘️🛡️', baseHp: 15000, paths: 4, buildSlots: 12, desc: '넓은 마을, 여러 방향 공격' },
  { id: 'temple', name: '신전 수호', icon: '⛪🛡️', baseHp: 12000, paths: 3, buildSlots: 10, desc: '신전을 지키면 버프!', holyBuff: true },
  { id: 'last_fortress', name: '최후의 요새', icon: '🏰💀', baseHp: 20000, paths: 5, buildSlots: 15, desc: '최고 난이도!', extreme: true },
];

// 건설 가능한 방어 시설 (슬롯에 설치)
const DEFENSE_BUILDINGS = [
  { id: 'arrow_tower', name: '화살 탑', icon: '🏹🗼', cost: 500, atk: 50, range: 200, atkSpd: 1.0, desc: '기본 방어 탑' },
  { id: 'cannon_tower', name: '대포 탑', icon: '💣🗼', cost: 1500, atk: 150, range: 300, atkSpd: 0.5, aoe: 3, desc: '범위 공격' },
  { id: 'magic_tower', name: '마법 탑', icon: '🔮🗼', cost: 2000, atk: 100, range: 250, atkSpd: 0.8, slow: 0.3, desc: '둔화 효과' },
  { id: 'barricade', name: '바리케이드', icon: '🪵', cost: 300, hp: 2000, desc: '적 이동 차단' },
  { id: 'heal_beacon', name: '치유 장치', icon: '💚🗼', cost: 1000, healRate: 0.03, range: 150, desc: '아군+거점 회복' },
  { id: 'tesla_coil', name: '테슬라 코일', icon: '⚡🗼', cost: 3000, atk: 200, range: 150, chain: 3, desc: '번개 연쇄!' },
  { id: 'flamethrower', name: '화염방사탑', icon: '🔥🗼', cost: 2500, atk: 80, range: 100, dot: 30, desc: '지속 화염 DOT' },
  { id: 'sniper_nest', name: '저격 둥지', icon: '🎯🗼', cost: 2000, atk: 300, range: 500, atkSpd: 0.3, desc: '초장거리+고DMG' },
];

// 적 웨이브 유형
const ENEMY_WAVES = [
  { id: 'normal', name: '일반 웨이브', icon: '👹', count: 10, hpMul: 1.0, atkMul: 1.0 },
  { id: 'fast', name: '속도 웨이브', icon: '💨👹', count: 15, hpMul: 0.5, atkMul: 0.8, spdMul: 2.0 },
  { id: 'tank', name: '탱크 웨이브', icon: '🛡️👹', count: 5, hpMul: 3.0, atkMul: 1.5, spdMul: 0.5 },
  { id: 'flying', name: '비행 웨이브', icon: '🦅👹', count: 8, hpMul: 0.8, flying: true, desc: '지상 방어 무시!' },
  { id: 'boss', name: '보스 웨이브', icon: '💀👑', count: 1, hpMul: 10.0, atkMul: 3.0, boss: true },
  { id: 'swarm', name: '떼 웨이브', icon: '🐜🐜🐜', count: 50, hpMul: 0.2, atkMul: 0.3, desc: '엄청난 수!' },
  { id: 'stealth', name: '은신 웨이브', icon: '👻👹', count: 6, hpMul: 1.0, stealth: true, desc: '보이지 않는 적!' },
  { id: 'siege', name: '공성 웨이브', icon: '🏰💥', count: 3, hpMul: 5.0, structDmg: 3.0, desc: '거점 직접 공격!' },
];

// 웨이브 간 자원 (건설/업그레이드용)
const WAVE_INCOME = { baseGold: 500, perKill: 10, bonusWave: 200 };

// 보상 (도달 웨이브 기준)
const STAND_REWARDS = [
  { wave: 10, reward: { gold: 10000, exp: 1000 } },
  { wave: 20, reward: { gold: 25000, exp: 2500, item: '방어 장인의 증표' } },
  { wave: 30, reward: { gold: 50000, exp: 5000, title: '불굴의 수비수' } },
  { wave: 50, reward: { gold: 100000, exp: 10000, title: '최후의 보루', item: '전설 방어구' } },
  { wave: 100, reward: { gold: 300000, exp: 30000, title: '영원한 수호자', merc: 'last_guardian', frame: 'last_stand_god' } },
];

function register(io, socket, player) {
  socket.on('last_stand_info', () => {
    socket.emit('last_stand_info', { maps: LAST_STAND_MAPS, buildings: DEFENSE_BUILDINGS, enemies: ENEMY_WAVES, income: WAVE_INCOME, rewards: STAND_REWARDS });
  });
  socket.on('last_stand_join', (data) => {
    const map = LAST_STAND_MAPS.find(m => m.id === data.mapId);
    socket.emit('last_stand_join_result', { ok: true, map });
    io.emit('server_msg', `🛡️🏰 [최후의 항전] ${player.name}이(가) "${map?.name}" 방어전 시작!`);
  });
}

module.exports = { LAST_STAND_MAPS, DEFENSE_BUILDINGS, ENEMY_WAVES, WAVE_INCOME, STAND_REWARDS, register };

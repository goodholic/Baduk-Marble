// v6.1 — 공성전 비행선 전투 시스템
// 비행선 건조, 공중 요새, 비행선 vs 비행선, 공중 폭격

const AIRSHIP_TYPES = [
  { id: 'scout_balloon', name: '정찰 기구', icon: '🎈🔭', hp: 3000, spd: 8, weapons: 0, crew: 2, cost: 15000, desc: '빠른 정찰용' },
  { id: 'bomber', name: '폭격선', icon: '🛩️💣', hp: 8000, spd: 5, weapons: 4, crew: 8, cost: 50000, desc: '지상 폭격 특화' },
  { id: 'carrier', name: '공중 모함', icon: '🛫🏰', hp: 20000, spd: 3, weapons: 2, crew: 20, cost: 120000, desc: '용병 투하+보급' },
  { id: 'warship', name: '전투 비행선', icon: '⚓🛩️', hp: 15000, spd: 6, weapons: 8, crew: 15, cost: 80000, desc: '공중전 특화' },
  { id: 'fortress', name: '하늘의 요새', icon: '🏰☁️', hp: 40000, spd: 2, weapons: 12, crew: 30, cost: 200000, desc: '공중 성벽, 최강 방어' },
  { id: 'leviathan', name: '리바이어선호', icon: '🐋🛩️', hp: 60000, spd: 4, weapons: 16, crew: 50, cost: 500000, desc: '전설급 초대형 비행선', legendary: true },
];

// 비행선 무장
const AIRSHIP_WEAPONS = [
  { id: 'aa_gun', name: '대공포', icon: '🔫', dmg: 100, range: 300, target: 'air', desc: '공중 타겟 전용' },
  { id: 'bomb_bay', name: '폭탄 투하', icon: '💣⬇️', dmg: 300, range: 0, target: 'ground', aoe: 5, desc: '지상 범위 폭격' },
  { id: 'lightning_cannon', name: '번개포', icon: '⚡🔫', dmg: 200, range: 400, target: 'all', desc: '전 타겟 공격' },
  { id: 'harpoon', name: '작살', icon: '⚓', dmg: 150, range: 200, target: 'air', pull: true, desc: '적 비행선 끌어당김' },
  { id: 'flame_thrower', name: '화염방사기', icon: '🔥', dmg: 80, range: 100, target: 'all', dot: true, desc: '근접 화염' },
  { id: 'mega_cannon', name: '메가 캐논', icon: '💣💣', dmg: 800, range: 500, target: 'all', reload: 20, desc: '초대형 주포' },
];

// 공중 기동
const AIRSHIP_MANEUVERS = [
  { id: 'boarding', name: '접현 공격', desc: '적 비행선에 승선→백병전', icon: '⚔️🛩️' },
  { id: 'para_drop', name: '공수 투하', desc: '용병을 성 안으로 직접 투하', icon: '🪂' },
  { id: 'evasive', name: '회피 기동', desc: '3초간 투사체 회피', icon: '💨🛩️' },
  { id: 'ramming', name: '충각 돌격', desc: '비행선으로 직접 충돌(양측 DMG)', icon: '💥🛩️' },
  { id: 'smoke_screen', name: '연막', desc: '연막으로 시야 차단', icon: '💨🌫️' },
  { id: 'carpet_bomb', name: '융단 폭격', desc: '직선 경로 연속 폭격', icon: '💣💣💣' },
];

// 보상
const AIRSHIP_REWARDS = {
  air_win:      { gold: 40000, exp: 4000, title: '하늘의 왕' },
  ship_destroy: { gold: 20000, item: 'airship_parts' },
  boarding_win: { gold: 15000, desc: '접현 전투 승리' },
  para_mission: { gold: 25000, desc: '공수 투하 성공' },
};

function register(io, socket, player) {
  socket.on('airship_info', () => {
    socket.emit('airship_info', { ships: AIRSHIP_TYPES, weapons: AIRSHIP_WEAPONS, maneuvers: AIRSHIP_MANEUVERS, rewards: AIRSHIP_REWARDS, owned: player.airships || [] });
  });
  socket.on('airship_build', (data) => {
    const ship = AIRSHIP_TYPES.find(s => s.id === data.shipId);
    if (!ship) return socket.emit('airship_build_result', { ok: false });
    if ((player.gold || 0) < ship.cost) return socket.emit('airship_build_result', { ok: false, reason: '골드 부족' });
    player.gold -= ship.cost;
    player.airships = player.airships || [];
    player.airships.push({ ...ship, id: `air_${Date.now()}` });
    socket.emit('airship_build_result', { ok: true, ship: ship.name });
    if (ship.legendary) io.emit('server_msg', `🛩️👑 [비행선] ${player.name}이(가) 전설의 "${ship.name}" 건조!`);
  });
}

module.exports = { AIRSHIP_TYPES, AIRSHIP_WEAPONS, AIRSHIP_MANEUVERS, AIRSHIP_REWARDS, register };

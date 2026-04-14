// v6.5 — IO 데스 레이스 모드
// 전투+레이스! 무장 탈것으로 경주+공격, 파괴+속도

const MAX_RACERS = 12;
const LAPS = 3;

const DEATH_RACE_VEHICLES = [
  { id: 'war_chariot', name: '전쟁 마차', icon: '🛞⚔️', hp: 3000, spd: 6, weapon: '전방 창', dmg: 100, desc: '균형 잡힌 기본 차량' },
  { id: 'flame_car', name: '화염 자동차', icon: '🔥🏎️', hp: 2000, spd: 8, weapon: '후방 화염', dmg: 60, trail: true, desc: '뒤에 불 자국! 빠름' },
  { id: 'tank', name: '전차', icon: '🛡️🛞', hp: 6000, spd: 4, weapon: '포탑 360도', dmg: 200, desc: '느리지만 강력+튼튼' },
  { id: 'bike', name: '전투 바이크', icon: '🏍️⚔️', hp: 1500, spd: 10, weapon: '측면 칼날', dmg: 80, desc: '최고속! 하지만 약함' },
  { id: 'spider_mech', name: '거미 메카', icon: '🕷️🤖', hp: 4000, spd: 5, weapon: '거미줄(둔화)', dmg: 50, slow: 0.4, desc: '적 둔화 특화' },
  { id: 'flying_disc', name: '비행 원반', icon: '🛸', hp: 2500, spd: 9, weapon: '레이저', dmg: 120, flying: true, desc: '비행! 지상 장애물 무시' },
  { id: 'death_machine', name: '죽음의 기계', icon: '💀🏎️', hp: 5000, spd: 7, weapon: '회전 톱날', dmg: 150, desc: '범위 근접 공격', legendary: true },
];

// 트랙
const DEATH_TRACKS = [
  { id: 'highway', name: '파괴 고속도로', icon: '🛣️💥', length: 2000, obstacles: 15, desc: '넓은 도로, 고속 전투' },
  { id: 'canyon', name: '협곡 레이스', icon: '🏔️💥', length: 1800, obstacles: 20, desc: '좁은 협곡, 낙사 위험' },
  { id: 'arena_track', name: '원형 경기장', icon: '🏟️💥', length: 1500, obstacles: 10, desc: '원형 트랙, PvP 집중' },
  { id: 'lava_road', name: '용암 도로', icon: '🌋💥', length: 2200, obstacles: 25, desc: '용암+화염+장애물' },
  { id: 'sky_circuit', name: '하늘 서킷', icon: '☁️💥', length: 2500, obstacles: 18, desc: '구름 위 레이스! 낙사=즉사' },
];

// 레이스 아이템
const RACE_ITEMS = [
  { id: 'missile', name: '미사일', icon: '🚀', effect: '전방 대상 추적 미사일', dmg: 300, rarity: 'common' },
  { id: 'mine', name: '지뢰', icon: '💣', effect: '뒤에 지뢰 설치', dmg: 200, rarity: 'common' },
  { id: 'nitro', name: '니트로', icon: '🔥💨', effect: 'SPD 3배 (3초)', rarity: 'common' },
  { id: 'shield', name: '보호막', icon: '🔰', effect: '피해 1회 차단', rarity: 'uncommon' },
  { id: 'emp', name: 'EMP', icon: '⚡', effect: '주변 차량 3초 정지', rarity: 'rare' },
  { id: 'black_hole', name: '블랙홀', icon: '🌀', effect: '주변 차량 끌어당김+DMG', rarity: 'epic' },
  { id: 'ghost', name: '유령 모드', icon: '👻', effect: '5초 무적+통과', rarity: 'epic' },
  { id: 'nuke', name: '핵폭탄', icon: '☢️', effect: '전원 DMG 500! (자기 제외)', rarity: 'legendary', rare: true },
];

// 킬 보너스
const KILL_BONUSES = { perKill: { spd: 1.05, duration: 10, desc: '킬당 SPD+5% (10초)' }, maxStack: 5 };

// 보상
const DEATH_RACE_REWARDS = {
  first:  { gold: 25000, exp: 2500, title: '데스 레이서', item: 'vehicle_upgrade' },
  top3:   { gold: 12000, exp: 1200 },
  most_kills: { gold: 15000, title: '파괴왕' },
  survivor: { gold: 8000, desc: '완주 보상' },
};

function register(io, socket, player) {
  socket.on('death_race_info', () => {
    socket.emit('death_race_info', { vehicles: DEATH_RACE_VEHICLES, tracks: DEATH_TRACKS, items: RACE_ITEMS, killBonuses: KILL_BONUSES, rewards: DEATH_RACE_REWARDS, laps: LAPS });
  });
  socket.on('death_race_join', (data) => {
    const vehicle = DEATH_RACE_VEHICLES.find(v => v.id === data.vehicleId);
    const track = DEATH_TRACKS.find(t => t.id === data.trackId);
    socket.emit('death_race_join_result', { ok: true, vehicle, track });
    io.emit('server_msg', `🏎️💀 [데스 레이스] ${player.name}이(가) "${vehicle?.name}"으로 참가!`);
  });
}

module.exports = { DEATH_RACE_VEHICLES, DEATH_TRACKS, RACE_ITEMS, KILL_BONUSES, DEATH_RACE_REWARDS, register };

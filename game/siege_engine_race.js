// v6.3 — 공성 병기 레이스
// 커스텀 공성 병기를 만들어 레이스! 파괴+속도+장애물

const MAX_RACERS = 8;
const RACE_DURATION = 300; // 5분

const ENGINE_TYPES = [
  { id: 'battering_ram', name: '파성추 카트', icon: '🪵💨', hp: 3000, spd: 5, atk: 200, desc: '앞의 장애물 파괴 가능' },
  { id: 'catapult_car', name: '투석기 카트', icon: '🪨💨', hp: 2000, spd: 6, atk: 300, ranged: true, desc: '원거리 투석 공격' },
  { id: 'tower_wagon', name: '공성탑 마차', icon: '🗼💨', hp: 5000, spd: 3, atk: 100, desc: '느리지만 튼튼, 위에서 공격' },
  { id: 'fire_chariot', name: '화염 전차', icon: '🔥💨', hp: 2500, spd: 7, atk: 150, trail: 'fire', desc: '뒤에 화염 자국! 추월자 데미지' },
  { id: 'drill_machine', name: '드릴 머신', icon: '⛏️💨', hp: 4000, spd: 4, atk: 400, desc: '벽 뚫기! 지름길 생성' },
  { id: 'rocket_sled', name: '로켓 썰매', icon: '🚀💨', hp: 1500, spd: 10, atk: 50, boost: true, desc: '최고속! 하지만 약함' },
];

// 레이스 트랙
const RACE_TRACKS = [
  { id: 'castle_circuit', name: '성벽 서킷', icon: '🏰🏁', laps: 3, obstacles: ['성문', '해자', '탑', '성벽'], desc: '성을 돌며 파괴' },
  { id: 'mountain_pass', name: '산악 코스', icon: '⛰️🏁', laps: 2, obstacles: ['낙석', '좁은 다리', '절벽'], desc: '험난한 산길' },
  { id: 'dungeon_rush', name: '던전 돌파', icon: '🕳️🏁', laps: 1, obstacles: ['함정', '몬스터', '보스문'], desc: '일직선 돌파!' },
  { id: 'lava_track', name: '용암 트랙', icon: '🌋🏁', laps: 2, obstacles: ['용암 분출', '화염 벽', '바위'], desc: '화염 속 질주' },
];

// 레이스 아이템 (레이스 중 획득)
const RACE_ITEMS = [
  { id: 'nitro', name: '니트로', icon: '🚀', effect: '5초간 SPD 3배', rarity: 'common' },
  { id: 'oil_slick', name: '기름 웅덩이', icon: '🛢️', effect: '뒤에 미끄럼 함정', rarity: 'common' },
  { id: 'cannon_shot', name: '대포', icon: '💣', effect: '전방 대포 발사 (DMG 500)', rarity: 'uncommon' },
  { id: 'shield', name: '보호막', icon: '🔰', effect: '10초간 DMG 면역', rarity: 'uncommon' },
  { id: 'teleport', name: '워프', icon: '🌀', effect: '2등 위치로 순간이동', rarity: 'rare' },
  { id: 'emp', name: 'EMP', icon: '⚡💥', effect: '전원 3초 정지 (자신 제외)', rarity: 'epic' },
];

// 보상
const RACE_REWARDS = {
  first:  { gold: 20000, exp: 2000, title: '공성 레이서', item: 'engine_part' },
  top3:   { gold: 10000, exp: 1000 },
  finish: { gold: 3000, exp: 300 },
  most_destruction: { gold: 15000, title: '파괴왕', desc: '가장 많이 파괴' },
};

function register(io, socket, player) {
  socket.on('engine_race_info', () => {
    socket.emit('engine_race_info', { engines: ENGINE_TYPES, tracks: RACE_TRACKS, items: RACE_ITEMS, rewards: RACE_REWARDS });
  });
  socket.on('engine_race_join', (data) => {
    socket.emit('engine_race_join_result', { ok: true, engine: ENGINE_TYPES.find(e => e.id === data.engineId), track: RACE_TRACKS.find(t => t.id === data.trackId) });
    io.emit('server_msg', `🏁💨 [공성 레이스] ${player.name}이(가) 레이스 참가!`);
  });
}

module.exports = { ENGINE_TYPES, RACE_TRACKS, RACE_ITEMS, RACE_REWARDS, register };

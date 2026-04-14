// v6.5 — 화산 폭발 공성전
// 활화산 위의 성, 용암 흐름, 화산 폭발 이벤트, 극한 공성

const ERUPTION_INTERVAL = 120; // 2분마다 소규모 폭발
const MAJOR_ERUPTION = 300; // 5분마다 대폭발

const VOLCANO_HAZARDS = [
  { id: 'lava_flow', name: '용암 흐름', icon: '🌋🔥', dmg: 50, interval: 10, desc: '경로 변경! 용암이 흐른다', movable: true },
  { id: 'ash_cloud', name: '화산재', icon: '🌫️🔥', dmg: 0, effect: '시야 -60%, 이동 -20%', duration: 30, desc: '숨 쉬기 힘들다' },
  { id: 'fire_rain', name: '화염 비', icon: '🔥🌧️', dmg: 30, interval: 5, aoe: 'random', desc: '하늘에서 불이 내린다!' },
  { id: 'earthquake', name: '지진', icon: '🌍💥', dmg: 0, effect: '전원 기절 2초+건물 DMG 10%', desc: '땅이 흔들린다' },
  { id: 'eruption', name: '대폭발!', icon: '🌋💥💥', dmg: 200, aoe: 'map_center', radius: 200, desc: '중앙 근처 = 즉사급! 대피!', major: true },
  { id: 'obsidian_rain', name: '흑요석 비', icon: '🖤🌧️', dmg: 80, effect: '방어구 내구 -10%', desc: '단단한 흑요석 파편' },
];

// 화산 전용 자원 (용암 속에서만 획득)
const VOLCANO_RESOURCES = [
  { id: 'lava_crystal', name: '용암 결정', icon: '🔥💎', value: 5000, desc: '화염 장비 재료' },
  { id: 'obsidian', name: '흑요석', icon: '🖤💎', value: 3000, desc: '최강 무기 재료' },
  { id: 'fire_essence', name: '화염 정수', icon: '🔥✨', value: 8000, desc: '화염 마법 강화' },
  { id: 'dragon_egg', name: '드래곤 알', icon: '🥚🐲', value: 50000, desc: '매우 희귀! 드래곤 부화 가능', rarity: 'legendary' },
];

// 화산 위 성 구조 (특수)
const VOLCANO_CASTLE = {
  walls: { material: 'obsidian', hp: 30000, fireResist: 0.5, desc: '흑요석 성벽, 화염 내성 50%' },
  moat: { type: 'lava', dmg: 100, desc: '용암 해자! 빠지면 즉시 대피해' },
  specialDefense: [
    { id: 'lava_gate', name: '용암 수문', desc: '용암을 적에게 방출!', dmg: 300, cooldown: 60 },
    { id: 'obsidian_spikes', name: '흑요석 가시', desc: '성벽 주변 가시 바닥', dmg: 80, area: 5 },
    { id: 'fire_golem', name: '화염 골렘 소환', desc: '용암에서 골렘 소환!', hp: 15000, atk: 400, cooldown: 120 },
  ],
};

// 보상
const VOLCANO_REWARDS = {
  attacker_win: { gold: 60000, resources: ['lava_crystal', 'obsidian'], title: '화산 정복자' },
  defender_win: { gold: 50000, resources: ['fire_essence'], title: '화산의 군주' },
  dragon_egg:  { gold: 0, item: 'dragon_egg', desc: '대폭발 중 드래곤 알 발견! (1% 확률)' },
  survivor:    { gold: 20000, desc: '대폭발 생존 보너스' },
};

function register(io, socket, player) {
  socket.on('volcano_siege_info', () => {
    socket.emit('volcano_siege_info', { hazards: VOLCANO_HAZARDS, resources: VOLCANO_RESOURCES, castle: VOLCANO_CASTLE, rewards: VOLCANO_REWARDS });
  });
  socket.on('volcano_siege_join', () => {
    socket.emit('volcano_siege_join_result', { ok: true });
    io.emit('server_msg', `🌋⚔️ [화산 공성] ${player.name}이(가) 화산 공성전 참가! 용암에 주의!`);
  });
}

module.exports = { VOLCANO_HAZARDS, VOLCANO_RESOURCES, VOLCANO_CASTLE, VOLCANO_REWARDS, register };

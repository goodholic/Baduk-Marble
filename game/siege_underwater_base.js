// v6.8 — 수중 기지 공성전
// 해저 기지 공략, 산소 관리, 잠수함 전투, 수압

const OXYGEN_MAX = 100;
const OXYGEN_DRAIN = 2; // 초당 2%

const UNDERWATER_MAPS = [
  { id: 'coral_fortress', name: '산호초 요새', icon: '🐠🏰', depth: 100, oxygenDrain: 1.5, desc: '얕은 수심, 산호 엄폐' },
  { id: 'abyss_citadel', name: '심해 성채', icon: '🌊🏰', depth: 500, oxygenDrain: 2.5, desc: '깊은 수심, 수압 DMG' },
  { id: 'volcanic_vent', name: '해저 화산', icon: '🌋🌊', depth: 300, oxygenDrain: 2.0, desc: '열수 분출+독성 가스' },
  { id: 'sunken_city', name: '침몰 도시', icon: '🏚️🌊', depth: 200, oxygenDrain: 1.8, desc: '수몰된 고대 도시 유적' },
  { id: 'kraken_lair', name: '크라켄 소굴', icon: '🦑🌊', depth: 800, oxygenDrain: 3.0, desc: '최심층! 크라켄 출현!', boss: true },
];

// 잠수함
const SUBMARINES = [
  { id: 'mini_sub', name: '미니 잠수함', icon: '🤿', hp: 3000, spd: 5, weapons: 1, oxygen: 200, cost: 20000, desc: '1인용 소형' },
  { id: 'attack_sub', name: '공격 잠수함', icon: '🔱', hp: 8000, spd: 4, weapons: 4, oxygen: 300, cost: 60000, desc: '전투용 중형' },
  { id: 'carrier_sub', name: '수송 잠수함', icon: '📦🤿', hp: 12000, spd: 3, weapons: 2, oxygen: 500, crew: 10, cost: 100000, desc: '대형 수송+산소 많음' },
  { id: 'stealth_sub', name: '은밀 잠수함', icon: '👻🤿', hp: 5000, spd: 6, weapons: 2, oxygen: 250, stealth: true, cost: 80000, desc: '적 탐지 불가!' },
  { id: 'leviathan_sub', name: '리바이어선급', icon: '🐋🔱', hp: 25000, spd: 3, weapons: 8, oxygen: 600, cost: 250000, desc: '초대형 전투 잠수함!', legendary: true },
];

// 수중 장비 (산소 관리)
const DIVING_EQUIPMENT = [
  { id: 'basic_tank', name: '기본 산소통', icon: '🫁', oxygen: 50, cost: 1000, desc: '산소 50 보충' },
  { id: 'rebreather', name: '재호흡기', icon: '🫁✨', oxygenDrain: -0.5, cost: 5000, desc: '산소 소비 -0.5/초' },
  { id: 'bubble_shield', name: '공기 방울', icon: '🫧🛡️', oxygen: 100, shield: true, cost: 8000, desc: '산소 전체 회복+보호막' },
  { id: 'gill_potion', name: '아가미 약', icon: '🧪🐟', oxygenDrain: 0, duration: 60, cost: 10000, desc: '60초간 산소 소비 0!' },
  { id: 'pressure_suit', name: '내압복', icon: '🤿🛡️', pressureResist: true, cost: 15000, desc: '수압 DMG 면역' },
];

// 수중 위험
const WATER_HAZARDS = [
  { id: 'pressure', name: '수압', icon: '💧💀', effect: '깊을수록 HP 서서히 감소', counter: '내압복' },
  { id: 'current', name: '해류', icon: '🌊➡️', effect: '강한 물살에 밀려남', counter: '닻/잠수함' },
  { id: 'predator', name: '심해 포식자', icon: '🦈', effect: '거대 상어/해파리 공격', counter: '전투/회피' },
  { id: 'oxygen_out', name: '산소 고갈', icon: '🫁❌', effect: '산소 0 = HP 급감!', counter: '산소통/수면 복귀' },
  { id: 'bioluminescence', name: '생물 발광', icon: '🌟🐠', effect: '아름답지만 유혹 함정!', counter: '무시하고 진행' },
  { id: 'whirlpool', name: '소용돌이', icon: '🌀🌊', effect: '빨려들어감! 탈출 키 연타', counter: '잠수함 부스트' },
];

// 보상
const UNDERWATER_REWARDS = {
  attacker_win: { gold: 50000, item: 'deep_sea_pearl', title: '심해 정복자' },
  defender_win: { gold: 40000, title: '수중 수호자' },
  kraken_kill: { gold: 100000, item: 'kraken_heart', title: '크라켄 슬레이어', frame: 'deep_sea_king' },
  no_oxygen_death: { gold: 20000, title: '숨참기 달인', desc: '산소 고갈 0회' },
};

function register(io, socket, player) {
  socket.on('underwater_siege_info', () => {
    socket.emit('underwater_siege_info', { maps: UNDERWATER_MAPS, subs: SUBMARINES, equipment: DIVING_EQUIPMENT, hazards: WATER_HAZARDS, rewards: UNDERWATER_REWARDS });
  });
  socket.on('underwater_siege_join', (data) => {
    const map = UNDERWATER_MAPS.find(m => m.id === data.mapId);
    socket.emit('underwater_join_result', { ok: true, map, oxygen: OXYGEN_MAX });
    io.emit('server_msg', `🌊🏰 [수중 공성] ${player.name}이(가) "${map?.name}" 수중 공성 시작! 산소에 주의!`);
  });
}

module.exports = { UNDERWATER_MAPS, SUBMARINES, DIVING_EQUIPMENT, WATER_HAZARDS, UNDERWATER_REWARDS, OXYGEN_MAX, register };

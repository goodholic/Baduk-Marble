// v6.4 — 영지 철도 시스템
// 도시 간 철도 연결, 물류 수송, 승객 수입, 철도 전쟁

const RAIL_COST_PER_TILE = 500;
const MAX_STATIONS = 10;

const STATION_TYPES = [
  { id: 'freight', name: '화물역', icon: '🚂📦', cost: 10000, effect: '자원 자동 수송', income: 1000, desc: '영지 간 자원 이동' },
  { id: 'passenger', name: '여객역', icon: '🚂🧑', cost: 15000, effect: '관광 수입', income: 2000, desc: '방문자 수입 증가' },
  { id: 'military', name: '군사역', icon: '🚂⚔️', cost: 25000, effect: '용병 급속 이동', income: 500, desc: '공성전 시 용병 빠른 배치' },
  { id: 'trade', name: '무역역', icon: '🚂💰', cost: 20000, effect: '무역 속도 2배', income: 3000, desc: '무역품 고속 운송' },
  { id: 'express', name: '특급역', icon: '🚂💨', cost: 50000, effect: '전 효과 1.5배', income: 5000, desc: '최고급 복합역', premium: true },
];

// 열차 유형
const TRAIN_TYPES = [
  { id: 'steam', name: '증기 기관차', icon: '🚂💨', spd: 3, capacity: 100, cost: 5000, desc: '기본 열차' },
  { id: 'magic', name: '마법 열차', icon: '🚂✨', spd: 6, capacity: 200, cost: 20000, desc: '마법으로 구동' },
  { id: 'armored', name: '장갑 열차', icon: '🚂🛡️', spd: 4, capacity: 150, cost: 30000, weapons: true, desc: '전투 가능한 열차!' },
  { id: 'flying', name: '비행 열차', icon: '🚂🦅', spd: 10, capacity: 80, cost: 50000, flying: true, desc: '하늘을 나는 열차!' },
  { id: 'dimensional', name: '차원 열차', icon: '🚂🌀', spd: 20, capacity: 300, cost: 100000, desc: '차원을 넘나드는 열차!', legendary: true },
];

// 철도 이벤트
const RAIL_EVENTS = [
  { id: 'train_robbery', name: '열차 강도!', chance: 0.08, effect: '화물 30% 약탈 위험', counterable: true, desc: '호위 배치로 방어' },
  { id: 'gold_rush', name: '골드 러시', chance: 0.05, effect: '운송 수입 3배 (1시간)', desc: '특별 화물!' },
  { id: 'breakdown', name: '고장', chance: 0.06, effect: '운행 중단 30분', desc: '수리 필요' },
  { id: 'express_delivery', name: '특급 배달', chance: 0.07, effect: '긴급 의뢰 → 보상 5배', desc: '시간 내 배달 성공 시' },
  { id: 'vip_passenger', name: 'VIP 승객', chance: 0.04, effect: '수입 10배 + 특별 아이템', desc: '왕족이 탑승!' },
  { id: 'race', name: '열차 경주!', chance: 0.03, effect: '다른 플레이어와 열차 레이스', desc: '승리 시 골드+칭호' },
];

// 철도 네트워크 보너스 (연결된 역 수에 따라)
const NETWORK_BONUSES = [
  { stations: 3, name: '소규모 노선', bonus: { income: 1.1 } },
  { stations: 5, name: '중규모 노선', bonus: { income: 1.2, tradeSpd: 1.1 } },
  { stations: 7, name: '대규모 노선', bonus: { income: 1.4, tradeSpd: 1.2, militarySpd: 1.2 } },
  { stations: 10, name: '대륙 철도망', bonus: { income: 2.0, tradeSpd: 1.5, militarySpd: 1.5, title: true }, title: '철도왕' },
];

function buildStation(player, stationType) {
  const sType = STATION_TYPES.find(s => s.id === stationType);
  if (!sType) return { ok: false, reason: '알 수 없는 역' };
  if ((player.gold || 0) < sType.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= sType.cost;
  player.railStations = (player.railStations || 0) + 1;
  const netBonus = [...NETWORK_BONUSES].reverse().find(n => player.railStations >= n.stations);
  return { ok: true, station: sType, totalStations: player.railStations, network: netBonus };
}

function register(io, socket, player) {
  socket.on('railroad_info', () => {
    socket.emit('railroad_info', { stations: STATION_TYPES, trains: TRAIN_TYPES, events: RAIL_EVENTS, network: NETWORK_BONUSES, myStations: player.railStations || 0 });
  });
  socket.on('railroad_build', (data) => {
    const result = buildStation(player, data.stationType);
    socket.emit('railroad_build_result', result);
    if (result.ok) io.emit('server_msg', `🚂 [철도] ${player.name}이(가) "${result.station.name}" 건설! (총 ${result.totalStations}역)`);
  });
}

module.exports = { STATION_TYPES, TRAIN_TYPES, RAIL_EVENTS, NETWORK_BONUSES, buildStation, register };

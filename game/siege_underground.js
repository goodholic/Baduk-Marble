// v5.7 — 지하 공성전 시스템
// 땅굴 파기, 지하 침투, 지하 기지 건설, 함정, 지하 보스

const TUNNEL_DIG_TIME = 30; // 30초/칸
const MAX_TUNNEL_LENGTH = 20;

// 터널 유형
const TUNNEL_TYPES = [
  { id: 'basic', name: '기본 터널', icon: '🕳️', width: 1, cost: 500, digSpeed: 1.0, desc: '1인 통행 가능' },
  { id: 'wide', name: '넓은 터널', icon: '🕳️🕳️', width: 2, cost: 1500, digSpeed: 0.7, desc: '용병 동반 가능' },
  { id: 'reinforced', name: '강화 터널', icon: '🧱🕳️', width: 1, cost: 3000, digSpeed: 0.5, hp: 5000, desc: '파괴 내구도 보유' },
  { id: 'stealth', name: '은밀 터널', icon: '👻🕳️', width: 1, cost: 5000, digSpeed: 0.6, stealth: true, desc: '적에게 감지 안됨' },
  { id: 'express', name: '고속 터널', icon: '💨🕳️', width: 1, cost: 4000, digSpeed: 1.5, movSpd: 2.0, desc: '터널 내 이동 2배속' },
];

// 지하 시설
const UNDERGROUND_BUILDINGS = [
  { id: 'storage', name: '지하 창고', icon: '📦', cost: 5000, effect: '자원 약탈 방지 (지상 공격 시)', maxLv: 3 },
  { id: 'bunker', name: '방공호', icon: '🏠', cost: 8000, effect: '공성전 시 부활 지점', maxLv: 2 },
  { id: 'trap_room', name: '함정 방', icon: '🪤', cost: 3000, effect: '침입자에게 자동 함정 발동', maxLv: 5 },
  { id: 'mine', name: '광산', icon: '⛏️💎', cost: 10000, effect: '희귀 광물 자동 채굴', maxLv: 5 },
  { id: 'lab', name: '비밀 연구소', icon: '🧪', cost: 15000, effect: '금지된 연구 가능', maxLv: 3 },
  { id: 'prison', name: '지하 감옥', icon: '⛓️', cost: 6000, effect: '포로 용병 수감 → 정보 추출', maxLv: 2 },
  { id: 'escape_route', name: '탈출로', icon: '🚪', cost: 20000, effect: '공성 패배 시 자원 30% 보존', maxLv: 1 },
];

// 지하 보스 (터널 깊이에 따라 출현)
const UNDERGROUND_BOSSES = [
  { id: 'mole_king', name: '두더지 왕', icon: '🐀👑', hp: 20000, atk: 200, depth: 5, drop: 'earth_gem' },
  { id: 'cave_spider', name: '동굴 거미 여왕', icon: '🕷️👑', hp: 40000, atk: 350, depth: 10, drop: 'spider_silk_gold' },
  { id: 'crystal_golem', name: '수정 골렘', icon: '💎🗿', hp: 70000, atk: 300, depth: 15, drop: 'crystal_heart' },
  { id: 'underground_dragon', name: '지저룡', icon: '🐉⛏️', hp: 120000, atk: 600, depth: 20, drop: 'magma_core', desc: '최심층 보스' },
];

// 지하 이벤트
const UNDERGROUND_EVENTS = [
  { id: 'cave_in', name: '붕괴!', chance: 0.08, effect: '터널 1구간 파괴', desc: '천장이 무너진다!' },
  { id: 'gas_leak', name: '가스 누출', chance: 0.06, effect: '독 데미지 (30초)', desc: '유독 가스!' },
  { id: 'ore_vein', name: '광맥 발견', chance: 0.10, effect: '희귀 광물 대량 획득', desc: '대박!' },
  { id: 'underground_spring', name: '지하수', chance: 0.07, effect: 'HP 전체 회복', desc: '생명의 샘' },
  { id: 'ancient_tomb', name: '고대 무덤', chance: 0.04, effect: '전설 아이템 or 저주', desc: '무덤을 열 것인가?' },
  { id: 'lava_flow', name: '용암 분출', chance: 0.03, effect: '대량 화염 데미지, 터널 막힘', desc: '도망쳐!' },
];

function digTunnel(player, type, targetX, targetY) {
  const tType = TUNNEL_TYPES.find(t => t.id === type);
  if (!tType) return { ok: false, reason: '알 수 없는 터널' };
  if ((player.gold || 0) < tType.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= tType.cost;
  const tunnels = player.tunnels = player.tunnels || [];
  tunnels.push({ type, targetX, targetY, length: 1, stealth: tType.stealth || false, builtAt: Date.now() });
  return { ok: true, tunnel: tType };
}

function register(io, socket, player) {
  socket.on('underground_info', () => {
    socket.emit('underground_info', { tunnels: TUNNEL_TYPES, buildings: UNDERGROUND_BUILDINGS, bosses: UNDERGROUND_BOSSES, events: UNDERGROUND_EVENTS, myTunnels: player.tunnels || [] });
  });
  socket.on('underground_dig', (data) => {
    const result = digTunnel(player, data.type, data.x, data.y);
    socket.emit('underground_dig_result', result);
  });
  socket.on('underground_build', (data) => {
    const bld = UNDERGROUND_BUILDINGS.find(b => b.id === data.buildingId);
    if (!bld) return socket.emit('underground_build_result', { ok: false });
    if ((player.gold || 0) < bld.cost) return socket.emit('underground_build_result', { ok: false, reason: '골드 부족' });
    player.gold -= bld.cost;
    socket.emit('underground_build_result', { ok: true, building: bld.name });
  });
}

module.exports = { TUNNEL_TYPES, UNDERGROUND_BUILDINGS, UNDERGROUND_BOSSES, UNDERGROUND_EVENTS, digTunnel, register };

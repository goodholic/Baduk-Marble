// v6.3 — IO 보물 찾기 모드
// 맵에 숨겨진 보물 경쟁 수집, 지도 조각, 함정, PvP 약탈

const MAX_PLAYERS = 12;
const MATCH_DURATION = 360; // 6분

const TREASURE_MAPS = [
  { id: 'pirate_island', name: '해적 섬', icon: '🏴‍☠️🏝️', treasures: 20, traps: 10, pvpZones: 3, desc: '해적이 숨긴 보물!' },
  { id: 'ancient_temple', name: '고대 신전', icon: '🏛️💎', treasures: 15, traps: 15, pvpZones: 2, desc: '퍼즐+함정 많음' },
  { id: 'dragon_cave', name: '용의 동굴', icon: '🐲🕳️', treasures: 10, traps: 8, pvpZones: 4, desc: '용이 지키는 보물', boss: true },
  { id: 'sunken_ship', name: '침몰선', icon: '🚢💀', treasures: 25, traps: 5, pvpZones: 2, desc: '수중 탐사, 산소 관리', underwater: true },
  { id: 'sky_vault', name: '하늘 금고', icon: '☁️💰', treasures: 12, traps: 12, pvpZones: 5, desc: '플랫폼 점프+PvP 많음' },
];

// 보물 등급
const TREASURE_TYPES = [
  { id: 'copper_chest', name: '동 상자', icon: '📦🟤', rarity: 'common', gold: 1000, chance: 0.40, desc: '기본 보물' },
  { id: 'silver_chest', name: '은 상자', icon: '📦⚪', rarity: 'uncommon', gold: 3000, chance: 0.25, desc: '은화 가득' },
  { id: 'gold_chest', name: '금 상자', icon: '📦🟡', rarity: 'rare', gold: 8000, item: true, chance: 0.15, desc: '금화+아이템' },
  { id: 'diamond_chest', name: '다이아 상자', icon: '📦💎', rarity: 'epic', gold: 20000, item: true, chance: 0.08, desc: '보석+레어 아이템' },
  { id: 'legendary_chest', name: '전설 상자', icon: '📦👑', rarity: 'legendary', gold: 50000, item: true, chance: 0.02, desc: '전설 장비+대량 골드!', glow: true },
];

// 지도 조각 (수집하면 최종 보물 위치 공개)
const MAP_FRAGMENTS = { total: 5, finalReward: { gold: 100000, item: 'treasure_relic', title: '보물 사냥꾼' } };

// 약탈 시스템 (PvP 존에서)
const PLUNDER_RULES = {
  pvpZone: true,
  lootOnKill: 0.3, // 상대 보물의 30% 탈취
  dropOnDeath: 0.2, // 사망 시 보물 20% 드롭
  protectedZone: false, // 안전 지대 없음 (PvP 존)
};

// 함정
const TREASURE_TRAPS = [
  { id: 'mimic', name: '미믹', icon: '📦👹', effect: '가짜 상자! 공격하는 몬스터', dmg: 200 },
  { id: 'poison_dart', name: '독침', icon: '💉☠️', effect: 'HP 30% + 독 5초', dmg: 100 },
  { id: 'cave_in', name: '함몰', icon: '🕳️💥', effect: '바닥 붕괴! 아래층으로 추락', dmg: 150 },
  { id: 'curse_chest', name: '저주 상자', icon: '📦💀', effect: '열면 5초간 이동불가+위치 공개', dmg: 0 },
  { id: 'alarm', name: '경보', icon: '🔔🚨', effect: '전원에게 위치 노출 10초!', dmg: 0 },
];

// 보상 (최종)
const HUNT_REWARDS = {
  most_treasure: { gold: 30000, title: '최고의 보물 사냥꾼', desc: '최다 보물 수집' },
  map_complete:  { gold: 100000, item: 'treasure_relic', desc: '지도 5조각 완성' },
  pvp_king:      { gold: 15000, title: '약탈왕', desc: '최다 PvP 킬' },
  speed_hunter:  { gold: 20000, desc: '가장 빨리 전설 상자 발견' },
};

function register(io, socket, player) {
  socket.on('treasure_hunt_info', () => {
    socket.emit('treasure_hunt_info', { maps: TREASURE_MAPS, treasures: TREASURE_TYPES, fragments: MAP_FRAGMENTS, plunder: PLUNDER_RULES, traps: TREASURE_TRAPS, rewards: HUNT_REWARDS });
  });
  socket.on('treasure_hunt_join', (data) => {
    socket.emit('treasure_hunt_join_result', { ok: true, map: TREASURE_MAPS.find(m => m.id === data.mapId) });
    io.emit('server_msg', `💎 [보물찾기] ${player.name}이(가) 보물 찾기 참가!`);
  });
}

module.exports = { TREASURE_MAPS, TREASURE_TYPES, MAP_FRAGMENTS, PLUNDER_RULES, TREASURE_TRAPS, HUNT_REWARDS, register };

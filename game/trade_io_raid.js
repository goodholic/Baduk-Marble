// v5.0 — 무역 카라반 IO 습격 시스템
// 무역 중 PvP가 IO 미니매치로 전환되는 하이브리드 시스템

const RAID_MATCH_DURATION = 180; // 3분 미니매치
const RAID_MAP_SIZE = 800;

// 카라반 무역 루트별 위험도 & IO 전환 확률
const TRADE_ROUTES_DANGER = {
  silk_road:     { danger: 3, raidChance: 0.15, name: '비단길', terrain: 'desert', loot: 1.0 },
  ocean_route:   { danger: 4, raidChance: 0.20, name: '해상 루트', terrain: 'sea', loot: 1.3 },
  mountain_pass: { danger: 5, raidChance: 0.30, name: '산악 경로', terrain: 'mountain', loot: 1.5 },
  dark_forest:   { danger: 7, raidChance: 0.40, name: '어둠의 숲', terrain: 'forest', loot: 2.0 },
  dragon_valley: { danger: 9, raidChance: 0.50, name: '용의 계곡', terrain: 'volcanic', loot: 3.0 },
  smuggler_path: { danger: 6, raidChance: 0.35, name: '밀수업자의 길', terrain: 'cave', loot: 2.5 },
  royal_highway: { danger: 1, raidChance: 0.05, name: '왕도', terrain: 'plains', loot: 0.8 },
  frozen_trail:  { danger: 6, raidChance: 0.30, name: '동토의 길', terrain: 'tundra', loot: 1.8 },
};

// IO 습격 미니매치 전용 맵 테마
const RAID_MAPS = {
  desert:   { obstacles: 5,  cover: 3,  hazard: 'sandstorm(매 30초 시야 감소)', color: '#e8c872' },
  sea:      { obstacles: 8,  cover: 2,  hazard: 'wave(매 20초 밀려남)', color: '#4488cc' },
  mountain: { obstacles: 12, cover: 6,  hazard: 'rockfall(랜덤 낙석)', color: '#887766' },
  forest:   { obstacles: 15, cover: 10, hazard: 'fog(시야 50%)', color: '#336633' },
  volcanic: { obstacles: 7,  cover: 2,  hazard: 'eruption(화산 폭발 범위 데미지)', color: '#cc3300' },
  cave:     { obstacles: 10, cover: 8,  hazard: 'collapse(통로 차단)', color: '#444455' },
  plains:   { obstacles: 3,  cover: 2,  hazard: 'none', color: '#88aa44' },
  tundra:   { obstacles: 6,  cover: 4,  hazard: 'blizzard(이동속도 -30%)', color: '#ccddee' },
};

// 카라반 구성: 호위/짐칸/특수 유닛
const CARAVAN_UNITS = {
  cargo_cart:  { name: '화물 수레', hp: 500, spd: 2, icon: '🛒', desc: '무역품을 실은 수레, 파괴 시 물품 탈취' },
  guard:       { name: '호위병', hp: 200, atk: 40, spd: 4, icon: '💂', desc: '기본 호위 (최대 4명)' },
  merc_escort: { name: '용병 호위', hp: 0, atk: 0, spd: 0, icon: '⚔️', desc: 'SLG 용병을 호위로 배치 (스탯 그대로)' },
  decoy_cart:  { name: '미끼 수레', hp: 300, spd: 3, icon: '🎭', desc: '가짜 수레, 적을 속임' },
  armored_cart:{ name: '장갑 수레', hp: 1000, spd: 1, icon: '🛡️🛒', desc: '느리지만 튼튼한 특수 수레' },
};

// 약탈자 보상/위험
const RAIDER_REWARDS = {
  success: { goldMul: 0.5, itemChance: 0.3, karma: -10, desc: '카라반 물품의 50% 탈취 + 카르마 하락' },
  fail:    { goldLoss: 1000, karma: -5, desc: '습격 실패: 골드 1000 손실 + 카르마 하락' },
};

const DEFENDER_REWARDS = {
  success: { goldBonus: 2000, expBonus: 500, karma: 5, title: '대상단 수호자', desc: '호위 성공 보너스' },
  fail:    { lostPct: 0.3, desc: '카라반 물품 30% 손실' },
};

// 습격 이벤트: IO 미니매치 중 발생하는 추가 이벤트
const RAID_EVENTS = [
  { id: 'reinforcement', time: 60, desc: '지원군 도착! NPC 호위 2명 추가', effect: 'defender_buff' },
  { id: 'bandit_ambush', time: 90, desc: '산적 출현! 양측 모두에게 적대적 NPC 3명', effect: 'neutral_enemy' },
  { id: 'storm_incoming', time: 120, desc: '폭풍 접근! 10초간 시야 50% 감소', effect: 'vision_reduce' },
  { id: 'treasure_drop', time: 45, desc: '수레에서 보물 상자 떨어짐! 먼저 주운 쪽이 획득', effect: 'loot_spawn' },
  { id: 'wild_monster', time: 100, desc: '야생 몬스터 출현! 양측 위협', effect: 'monster_spawn' },
  { id: 'merchant_bribe', time: 30, desc: '상인의 뇌물: 양측에 즉시 HP 포션 제공', effect: 'both_heal' },
];

function createRaidMatch(attacker, defender, routeId) {
  const route = TRADE_ROUTES_DANGER[routeId] || TRADE_ROUTES_DANGER.silk_road;
  const mapTheme = RAID_MAPS[route.terrain] || RAID_MAPS.plains;

  return {
    id: `raid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    attacker: { id: attacker.id, name: attacker.name },
    defender: { id: defender.id, name: defender.name },
    route,
    map: {
      width: RAID_MAP_SIZE,
      height: RAID_MAP_SIZE,
      theme: mapTheme,
      terrain: route.terrain,
    },
    duration: RAID_MATCH_DURATION,
    startTime: Date.now(),
    events: RAID_EVENTS.map(e => ({ ...e, triggered: false })),
    cargoHp: CARAVAN_UNITS.cargo_cart.hp,
    status: 'active',
  };
}

function resolveRaid(match, cargoDestroyed) {
  if (cargoDestroyed) {
    return {
      winner: 'attacker',
      attackerReward: RAIDER_REWARDS.success,
      defenderResult: DEFENDER_REWARDS.fail,
    };
  }
  return {
    winner: 'defender',
    attackerResult: RAIDER_REWARDS.fail,
    defenderReward: DEFENDER_REWARDS.success,
  };
}

function register(io, socket, player) {
  // 무역 루트 위험도 조회
  socket.on('trade_route_danger', () => {
    socket.emit('trade_route_danger', TRADE_ROUTES_DANGER);
  });

  // 카라반 호위 편성
  socket.on('trade_caravan_setup', (data) => {
    const { routeId, escorts } = data;
    player.caravan = {
      routeId,
      escorts: escorts || [],
      cargo: data.cargo || [],
      status: 'traveling',
      startTime: Date.now(),
    };
    socket.emit('trade_caravan_setup_result', { ok: true, caravan: player.caravan });
  });

  // 카라반 습격 신청 (약탈자)
  socket.on('trade_raid_attack', (data) => {
    const { targetPlayerId, routeId } = data;
    // 실제로는 대상 플레이어에게 습격 알림 후 IO 미니매치 생성
    socket.emit('trade_raid_initiated', {
      match: createRaidMatch(player, { id: targetPlayerId, name: '대상' }, routeId),
    });
    io.emit('server_msg', `⚔️ [카라반 습격] ${player.name}이(가) 무역 카라반을 습격합니다!`);
  });

  // 습격 결과
  socket.on('trade_raid_result', (data) => {
    const { matchId, cargoDestroyed } = data;
    const result = resolveRaid(data, cargoDestroyed);
    socket.emit('trade_raid_result', result);
    if (result.winner === 'attacker') {
      player.karma = (player.karma || 0) + RAIDER_REWARDS.success.karma;
    }
  });
}

module.exports = {
  RAID_MATCH_DURATION, TRADE_ROUTES_DANGER, RAID_MAPS, CARAVAN_UNITS,
  RAIDER_REWARDS, DEFENDER_REWARDS, RAID_EVENTS,
  createRaidMatch, resolveRaid, register,
};

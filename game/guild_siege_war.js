// v5.2 — 길드 대공성전 시스템
// 길드 vs 길드 대규모 공성, 영토 쟁탈, 보상

const MAX_GUILD_SIZE = 30;
const SIEGE_WAR_DURATION = 600; // 10분

// 길드 공성전 맵 (대규모)
const GUILD_SIEGE_MAPS = [
  { id: 'dragon_fortress', name: '용의 요새', icon: '🐲🏰', size: 2000, wallHp: 50000, phases: 5, desc: '화염 함정이 가득한 용의 성', terrain: 'volcanic' },
  { id: 'ice_citadel', name: '빙결 성채', icon: '❄️🏰', size: 1800, wallHp: 40000, phases: 4, desc: '동결 지형이 특징인 얼음 요새', terrain: 'tundra' },
  { id: 'sky_castle', name: '하늘의 성', icon: '☁️🏰', size: 2200, wallHp: 60000, phases: 6, desc: '구름 위의 전설적 성, 최종 영토', terrain: 'sky' },
  { id: 'shadow_keep', name: '그림자 성채', icon: '🌑🏰', size: 1600, wallHp: 35000, phases: 4, desc: '시야가 극도로 제한된 어둠의 성', terrain: 'shadow' },
  { id: 'ancient_ruins', name: '고대 유적', icon: '🏛️🏰', size: 2000, wallHp: 45000, phases: 5, desc: '함정과 퍼즐이 가득한 유적', terrain: 'ruins' },
];

// 길드 역할 (공성전 전용)
const GUILD_ROLES = {
  commander:  { name: '지휘관', icon: '👑', max: 1, bonus: { teamAtk: 1.1, teamDef: 1.1 }, desc: '팀 전체 버프, 전략 지시' },
  vanguard:   { name: '돌격대장', icon: '⚔️', max: 3, bonus: { atk: 1.2 }, desc: '선봉 돌격 담당' },
  engineer:   { name: '공병대장', icon: '🔧', max: 2, bonus: { structDmg: 1.5 }, desc: '성벽/구조물 파괴 전문' },
  medic:      { name: '의무관', icon: '💉', max: 2, bonus: { healPow: 1.3 }, desc: '팀원 치료 전문' },
  scout:      { name: '정찰대장', icon: '👁️', max: 2, bonus: { vision: 2.0, trapDetect: true }, desc: '적 배치 정찰+함정 탐지' },
  defender:   { name: '수비대장', icon: '🛡️', max: 3, bonus: { def: 1.3, trapPow: 1.2 }, desc: '방어 전담 (수비 측)' },
  assassin:   { name: '암살대장', icon: '🗡️', max: 2, bonus: { crit: 1.3, stealth: 5 }, desc: '핵심 타깃 암살 전담' },
};

// 영토 보상 (성 점령 시 길드에게 지속 수입)
const TERRITORY_INCOME = {
  dragon_fortress: { gold: 10000, diamonds: 50, mercExp: 500, special: '용의 축복: 화속성 DMG+15%' },
  ice_citadel:     { gold: 8000, diamonds: 40, mercExp: 400, special: '빙결의 힘: 빙속성 내성+30%' },
  sky_castle:      { gold: 15000, diamonds: 80, mercExp: 800, special: '하늘의 가호: 전체 스탯+5%' },
  shadow_keep:     { gold: 7000, diamonds: 35, mercExp: 350, special: '그림자의 은총: 은신 시간+3초' },
  ancient_ruins:   { gold: 12000, diamonds: 60, mercExp: 600, special: '고대의 지식: 연구 속도+20%' },
};

// 공성전 전략 카드 (길드 지휘관이 매 페이즈마다 1장 사용)
const STRATEGY_CARDS = [
  { id: 'charge', name: '총공격', icon: '⚔️', effect: '팀 전원 ATK+30%, DEF-20% (60초)', type: 'attack' },
  { id: 'fortify', name: '결사 방어', icon: '🛡️', effect: '팀 전원 DEF+40%, ATK-15% (60초)', type: 'defense' },
  { id: 'ambush', name: '매복', icon: '🌿', effect: '팀 전원 10초 은신 + 첫 공격 크리 확정', type: 'stealth' },
  { id: 'bombardment', name: '포격', icon: '💣', effect: '지정 범위 대포 3발 (각 성벽 HP 10%)', type: 'siege' },
  { id: 'rally', name: '결집', icon: '📯', effect: '사기 충전: 5초간 CC 면역 + HP 20% 회복', type: 'support' },
  { id: 'spy', name: '간첩', icon: '🕵️', effect: '30초간 적 배치 전부 공개 + 함정 무효화', type: 'intel' },
  { id: 'scorched_earth', name: '초토화', icon: '🔥', effect: '후퇴 시 뒤에 화염 지대 생성 (30초)', type: 'retreat' },
  { id: 'divine_shield', name: '신성 보호막', icon: '✨', effect: '성문/왕좌 10초간 무적', type: 'ultimate' },
];

// 공성전 진행 결과
function createGuildSiege(attackGuild, defendGuild, mapId) {
  const map = GUILD_SIEGE_MAPS.find(m => m.id === mapId) || GUILD_SIEGE_MAPS[0];
  return {
    id: `gsw_${Date.now()}`,
    attackGuild: { id: attackGuild.id, name: attackGuild.name, members: [] },
    defendGuild: { id: defendGuild.id, name: defendGuild.name, members: [] },
    map,
    phase: 1,
    wallHp: map.wallHp,
    startTime: Date.now(),
    duration: SIEGE_WAR_DURATION,
    strategyCards: { attack: [...STRATEGY_CARDS], defend: [...STRATEGY_CARDS] },
    status: 'preparing',
  };
}

function useStrategyCard(siege, side, cardId) {
  const cards = siege.strategyCards[side] || [];
  const idx = cards.findIndex(c => c.id === cardId);
  if (idx === -1) return { ok: false, reason: '카드 없음 또는 이미 사용' };
  const card = cards.splice(idx, 1)[0];
  return { ok: true, card };
}

function register(io, socket, player) {
  socket.on('guild_siege_maps', () => {
    socket.emit('guild_siege_maps', { maps: GUILD_SIEGE_MAPS, roles: GUILD_ROLES, income: TERRITORY_INCOME, cards: STRATEGY_CARDS });
  });

  socket.on('guild_siege_declare', (data) => {
    // 공성전 선언 (지휘관만 가능)
    socket.emit('guild_siege_declare_result', { ok: true, mapId: data.mapId, targetGuild: data.targetGuildId });
    io.emit('server_msg', `⚔️🏰 [길드 대공성전] ${player.clanName || '???'} 길드가 공성전을 선포했습니다!`);
  });

  socket.on('guild_siege_set_role', (data) => {
    player.siegeRole = data.role;
    socket.emit('guild_siege_set_role_result', { ok: true, role: GUILD_ROLES[data.role] });
  });

  socket.on('guild_siege_use_card', (data) => {
    // 간략화: 실제로는 siege 인스턴스 관리 필요
    socket.emit('guild_siege_use_card_result', { ok: true, card: data.cardId });
  });
}

module.exports = {
  GUILD_SIEGE_MAPS, GUILD_ROLES, TERRITORY_INCOME, STRATEGY_CARDS, SIEGE_WAR_DURATION,
  createGuildSiege, useStrategyCard, register,
};

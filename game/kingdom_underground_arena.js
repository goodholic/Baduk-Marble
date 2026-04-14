// v6.1 — 영지 지하 투기장 시스템
// 불법 지하 투기장, 용병 격투, 도박, 챔피언 벨트

const ARENA_TIERS = [
  { tier: 1, name: '하수구 투기장', icon: '🕳️⚔️', entryFee: 1000, reward: { gold: 5000 }, maxLevel: 20, desc: '최하급 지하 싸움판' },
  { tier: 2, name: '지하 링', icon: '🥊', entryFee: 5000, reward: { gold: 15000 }, maxLevel: 30, desc: '중급 격투장' },
  { tier: 3, name: '피의 경기장', icon: '🩸🏟️', entryFee: 15000, reward: { gold: 40000 }, maxLevel: 40, desc: '피가 튀는 상급 투기장' },
  { tier: 4, name: '어둠의 콜로세움', icon: '🌑🏟️', entryFee: 50000, reward: { gold: 100000 }, maxLevel: 50, desc: '전설의 지하 투기장' },
  { tier: 5, name: '챔피언의 왕좌', icon: '👑🏟️', entryFee: 100000, reward: { gold: 250000, title: '지하 챔피언', belt: true }, maxLevel: 99, desc: '최강의 지하 챔피언 결정전' },
];

// 격투 규칙 (매치마다 랜덤)
const FIGHT_RULES = [
  { id: 'standard', name: '정규전', icon: '⚔️', desc: '표준 1v1 전투', mod: {} },
  { id: 'no_skill', name: '맨손 격투', icon: '👊', desc: '스킬 사용 불가, 기본 공격만', mod: { noSkill: true } },
  { id: 'cage_match', name: '철장 매치', icon: '🔲', desc: '좁은 철장 안, 도주 불가', mod: { mapSize: 0.3 } },
  { id: 'weapon_only', name: '무기 한정', icon: '🗡️', desc: '지정 무기만 사용', mod: { randomWeapon: true } },
  { id: 'handicap', name: '핸디캡전', icon: '⚖️', desc: '강자 HP -30%', mod: { handicap: true } },
  { id: 'death_match', name: '데스매치', icon: '💀', desc: '패배 시 장비 1개 파괴!', mod: { itemBreak: true }, risk: true },
  { id: 'tag_team', name: '태그 매치', icon: '🤝⚔️', desc: '2v2 교대 전투', mod: { tagTeam: true } },
  { id: 'gauntlet', name: '건틀릿', icon: '⚔️⚔️⚔️', desc: '3연전! HP 유지한 채 연속', mod: { gauntlet: 3 } },
];

// 챔피언 벨트 (티어별 1개, 최강자만 보유)
const CHAMPION_BELTS = [
  { tier: 1, name: '하수구 벨트', bonus: { atk: 1.03 } },
  { tier: 2, name: '지하 벨트', bonus: { atk: 1.05 } },
  { tier: 3, name: '피의 벨트', bonus: { atk: 1.08, lifeSteal: 0.05 } },
  { tier: 4, name: '어둠의 벨트', bonus: { atk: 1.12, fear: true } },
  { tier: 5, name: '챔피언 벨트', bonus: { atk: 1.15, allStat: 1.05 }, glow: true, title: '지하 절대 챔피언' },
];

// 관중 베팅 (다른 플레이어)
const BETTING = { minBet: 500, maxBet: 100000, houseCut: 0.05 };

function register(io, socket, player) {
  socket.on('underground_arena_info', () => {
    socket.emit('underground_arena_info', { tiers: ARENA_TIERS, rules: FIGHT_RULES, belts: CHAMPION_BELTS, betting: BETTING });
  });
  socket.on('underground_arena_enter', (data) => {
    const tier = ARENA_TIERS.find(t => t.tier === data.tier);
    if (!tier) return socket.emit('arena_enter_result', { ok: false });
    if ((player.gold || 0) < tier.entryFee) return socket.emit('arena_enter_result', { ok: false, reason: '입장료 부족' });
    player.gold -= tier.entryFee;
    const rule = FIGHT_RULES[Math.floor(Math.random() * FIGHT_RULES.length)];
    socket.emit('arena_enter_result', { ok: true, tier, rule });
    io.emit('server_msg', `🥊 [지하 투기장] ${player.name}이(가) "${tier.name}" 입장! 규칙: ${rule.name}`);
  });
}

module.exports = { ARENA_TIERS, FIGHT_RULES, CHAMPION_BELTS, BETTING, register };

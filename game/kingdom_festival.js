// v5.6 — 영지 축제 시스템
// 영지에서 축제를 개최, 다른 플레이어 초대, 미니게임, 보상

const FESTIVAL_COOLDOWN = 86400; // 1일

const FESTIVAL_TYPES = [
  { id: 'harvest', name: '수확 축제', icon: '🌾🎉', cost: 10000, duration: 1800,
    bonuses: { goldProd: 2.0, foodProd: 2.0, happiness: 15 },
    minigames: ['수확 레이스', '요리 대회', '가축 쇼'],
    reward: { gold: 20000, item: 'harvest_crown' }, desc: '풍년을 축하하는 축제' },
  { id: 'martial', name: '무술 대회', icon: '⚔️🎪', cost: 20000, duration: 2400,
    bonuses: { mercExp: 1.5, atkBonus: 1.1 },
    minigames: ['1v1 토너먼트', '타겟 명중', '장애물 레이스'],
    reward: { gold: 30000, item: 'champion_belt' }, desc: '무예를 겨루는 축제' },
  { id: 'magic', name: '마법 축제', icon: '🔮🎆', cost: 25000, duration: 2400,
    bonuses: { researchSpd: 2.0, matkBonus: 1.1 },
    minigames: ['마법 퀴즈', '원소 맞추기', '주문 시전 타임어택'],
    reward: { gold: 25000, item: 'arcane_trophy' }, desc: '마법의 밤' },
  { id: 'trade_fair', name: '무역 박람회', icon: '💰🏪', cost: 30000, duration: 3600,
    bonuses: { tradeMul: 2.0, shopDiscount: 0.3 },
    minigames: ['경매 대회', '흥정 게임', '물품 감별'],
    reward: { gold: 50000, item: 'merchant_seal' }, desc: '거상 스타일 대규모 박람회' },
  { id: 'love', name: '사랑의 축제', icon: '❤️🎉', cost: 15000, duration: 1800,
    bonuses: { intimacy: 2.0, happiness: 20 },
    minigames: ['짝맞추기', '선물 교환', '댄스 파티'],
    reward: { gold: 15000, item: 'love_charm' }, desc: '용병 친밀도 대폭 상승' },
  { id: 'lantern', name: '등불 축제', icon: '🏮✨', cost: 20000, duration: 2400,
    bonuses: { visionBonus: 2.0, luckBonus: 1.3 },
    minigames: ['등불 날리기', '소원 빌기', '미로 탈출'],
    reward: { gold: 20000, item: 'wish_lantern' }, desc: '소원을 비는 신비한 축제' },
];

// 미니게임 보상
const MINIGAME_REWARDS = {
  first:  { gold: 5000, exp: 500, title: '축제 챔피언' },
  second: { gold: 3000, exp: 300 },
  third:  { gold: 1500, exp: 150 },
  participate: { gold: 500, exp: 50 },
};

// 축제 방문자 보너스 (다른 플레이어가 방문)
const VISITOR_BONUSES = {
  host:    { gold: 1000, happiness: 2, desc: '방문자 1명당 골드+1000, 번영도+2' },
  visitor: { exp: 200, buff: '축제 기운 (30분간 EXP+10%)', desc: '축제 방문 보상' },
};

function hostFestival(player, festivalId) {
  const fest = FESTIVAL_TYPES.find(f => f.id === festivalId);
  if (!fest) return { ok: false, reason: '알 수 없는 축제' };
  if ((player.gold || 0) < fest.cost) return { ok: false, reason: '골드 부족' };
  const now = Date.now();
  if (player.lastFestival && now - player.lastFestival < FESTIVAL_COOLDOWN * 1000) return { ok: false, reason: '축제 쿨다운 중' };

  player.gold -= fest.cost;
  player.lastFestival = now;
  player.activeFestival = { ...fest, startTime: now, visitors: 0 };
  return { ok: true, festival: fest };
}

function register(io, socket, player) {
  socket.on('festival_list', () => {
    socket.emit('festival_list', { festivals: FESTIVAL_TYPES, minigameRewards: MINIGAME_REWARDS, visitorBonus: VISITOR_BONUSES, active: player.activeFestival });
  });
  socket.on('festival_host', (data) => {
    const result = hostFestival(player, data.festivalId);
    socket.emit('festival_host_result', result);
    if (result.ok) io.emit('server_msg', `🎉 [축제] ${player.name}의 영지에서 "${result.festival.name}" 개최! 방문하세요!`);
  });
  socket.on('festival_visit', (data) => {
    socket.emit('festival_visit_result', { ok: true, reward: VISITOR_BONUSES.visitor });
  });
}

module.exports = { FESTIVAL_TYPES, MINIGAME_REWARDS, VISITOR_BONUSES, hostFestival, register };

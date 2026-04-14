// v5.5 — 비밀 결사 시스템
// 숨겨진 조직에 가입, 고유 임무, 반란/혁명, 비밀 보상

const MAX_MEMBERS = 20;

const SECRET_SOCIETIES = [
  { id: 'shadow_hand', name: '그림자의 손', icon: '🖐️🌑', theme: '암살', req: { pkKills: 10 },
    perks: ['은신 시간+3초', '암살 DMG+20%', '현상금 수배 감소'],
    missions: ['VIP 암살', '정보 탈취', '증거 인멸'], desc: '어둠 속에서 세계를 움직이는 자들' },
  { id: 'golden_circle', name: '황금의 원', icon: '💰🔵', theme: '상업', req: { tradeProfit: 100000 },
    perks: ['무역 수수료 -50%', '경매장 비밀 상품', '암시장 VIP'],
    missions: ['가격 조작', '독점 계약', '밀수'], desc: '돈으로 세계를 지배하는 비밀 상인 조직' },
  { id: 'crimson_order', name: '붉은 기사단', icon: '🔴⚔️', theme: '전투', req: { bossKills: 50 },
    perks: ['보스 DMG+15%', '레이드 보상+20%', '전용 장비 구매'],
    missions: ['고대 보스 토벌', '비밀 던전 공략', '성물 수호'], desc: '역사 속에서 악과 싸워온 기사단' },
  { id: 'arcane_eye', name: '비전의 눈', icon: '👁️🔮', theme: '마법', req: { magicResearch: 10 },
    perks: ['마법 연구 속도+25%', '금지 마법 해금', '마나 소비-15%'],
    missions: ['고대 유적 탐사', '금서 복원', '차원 실험'], desc: '세계의 진실을 탐구하는 마법사 비밀 결사' },
  { id: 'iron_throne', name: '철의 왕좌', icon: '🪑⚔️', theme: '정치', req: { territory: 3 },
    perks: ['외교 비용-30%', '반란 선동 가능', '서버 이벤트 투표권 2배'],
    missions: ['정치 공작', '왕위 찬탈 계획', '반란 진압/선동'], desc: '왕좌를 향한 야망의 조직' },
  { id: 'nature_covenant', name: '자연의 서약', icon: '🌿🤝', theme: '자연', req: { lifeMaster: 2 },
    perks: ['채집 수량 2배', '펫 친밀도 상승 2배', '자연 치유 효과+30%'],
    missions: ['오염 정화', '희귀 생물 보호', '세계수 수호'], desc: '자연을 수호하는 비밀 드루이드 조직' },
];

// 비밀 임무 (결사별 고유)
const SECRET_MISSIONS = {
  shadow_hand: [
    { id: 'sh_m1', name: '그림자 작전', difficulty: 5, reward: { gold: 20000, item: 'shadow_badge' }, desc: '지정된 NPC를 조용히 제거하라' },
    { id: 'sh_m2', name: '정보전', difficulty: 7, reward: { gold: 40000, intel: true }, desc: '적 길드의 기밀 정보를 탈취하라' },
    { id: 'sh_m3', name: '혁명의 불씨', difficulty: 9, reward: { gold: 80000, title: '그림자 군주' }, desc: '현 서버 왕에 대한 반란을 준비하라' },
  ],
  golden_circle: [
    { id: 'gc_m1', name: '시장 조작', difficulty: 5, reward: { gold: 30000, tradeBonus: 1.1 }, desc: '특정 아이템 가격을 조작하라' },
    { id: 'gc_m2', name: '밀수 루트', difficulty: 7, reward: { gold: 60000, item: 'contraband' }, desc: '위험 물품을 안전하게 운반하라' },
    { id: 'gc_m3', name: '경제 전쟁', difficulty: 9, reward: { gold: 150000, title: '황금왕' }, desc: '적 길드를 경제적으로 파산시켜라' },
  ],
  crimson_order: [
    { id: 'co_m1', name: '고대 보스 토벌', difficulty: 6, reward: { gold: 25000, item: 'crimson_badge' }, desc: '비밀 보스를 처치하라' },
    { id: 'co_m2', name: '성물 수호', difficulty: 8, reward: { gold: 50000, relic: true }, desc: '고대 유물을 적에게서 지켜라' },
    { id: 'co_m3', name: '최종 시련', difficulty: 10, reward: { gold: 100000, title: '붉은 기사장' }, desc: '기사단 최종 시련을 통과하라' },
  ],
};

// 결사 랭크
const SOCIETY_RANKS = [
  { rank: 1, name: '신입', reqMissions: 0, perkLevel: 0.5 },
  { rank: 2, name: '정회원', reqMissions: 3, perkLevel: 0.75 },
  { rank: 3, name: '간부', reqMissions: 8, perkLevel: 1.0 },
  { rank: 4, name: '원로', reqMissions: 15, perkLevel: 1.25 },
  { rank: 5, name: '수장', reqMissions: 25, perkLevel: 1.5, unique: true },
];

function joinSociety(player, societyId) {
  const soc = SECRET_SOCIETIES.find(s => s.id === societyId);
  if (!soc) return { ok: false, reason: '알 수 없는 결사' };
  if (player.secretSociety) return { ok: false, reason: '이미 결사에 가입됨 (탈퇴 후 재가입)' };
  player.secretSociety = { id: societyId, rank: 1, missions: 0, joined: Date.now() };
  return { ok: true, society: soc.name, rank: '신입' };
}

function register(io, socket, player) {
  socket.on('secret_society_list', () => {
    socket.emit('secret_society_list', { societies: SECRET_SOCIETIES, ranks: SOCIETY_RANKS, current: player.secretSociety });
  });
  socket.on('secret_society_join', (data) => {
    const result = joinSociety(player, data.societyId);
    socket.emit('secret_society_join_result', result);
    if (result.ok) io.emit('server_msg', `🤫 [비밀 결사] 누군가가 "${result.society}"에 가입했다...`);
  });
  socket.on('secret_society_missions', () => {
    const soc = player.secretSociety;
    if (!soc) return socket.emit('secret_society_missions', { ok: false });
    socket.emit('secret_society_missions', { missions: SECRET_MISSIONS[soc.id] || [] });
  });
}

module.exports = { SECRET_SOCIETIES, SECRET_MISSIONS, SOCIETY_RANKS, joinSociety, register };

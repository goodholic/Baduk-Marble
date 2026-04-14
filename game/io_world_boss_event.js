// v6.0 — 서버 전체 월드 보스 이벤트
// 서버 전원이 참여하는 초대형 보스, 기여도 보상, 서버 히스토리

const EVENT_DURATION = 1800; // 30분 제한

// 월드 보스 풀
const WORLD_BOSSES = [
  { id: 'titan_king', name: '타이탄의 왕', icon: '🗿👑', hp: 10000000, atk: 2000, phases: 5,
    mechanics: ['지진(전체 기절 3초)', '바위 투척(범위 DMG)', '분신(2체, 진짜 1체)', '광역 손바닥(즉사 판정)', '최종형태(HP 30%↓ ATK 3배)'],
    reward: { gold: 500000, item: 'titan_heart', title: '타이탄 슬레이어' },
    lore: '태초부터 잠들어 있던 거인의 왕이 깨어났다' },
  { id: 'leviathan', name: '리바이어선', icon: '🐋💀', hp: 15000000, atk: 1500, phases: 6,
    mechanics: ['해일(맵 절반 수몰)', '촉수 20개(각 독립 공격)', '삼킴(10명 동시)', '심해 압력(전원 DEF-50%)', '소용돌이(중앙 흡인)', '최종: 세계 파괴 카운트다운(60초)'],
    reward: { gold: 800000, item: 'leviathan_scale', title: '심해의 정복자' },
    lore: '바다의 끝에서 올라온 태고의 괴수' },
  { id: 'ragnarok_dragon', name: '종말의 용', icon: '🐲💀🔥', hp: 20000000, atk: 3000, phases: 7,
    mechanics: ['3원소 동시 브레스', '하늘 화염비(전체)', '차원 절단(맵 분할)', '용의 포효(전원 공포)', '날개 폭풍(전원 넉백)', '부활(1회)', '최종: 멸세(전원 HP 1)'],
    reward: { gold: 1000000, item: 'ragnarok_fang', merc: 'baby_ragnarok', title: '종말을 막은 자', serverBuff: '전 서버 전스탯+5% (1주)' },
    lore: '세계를 멸망시키기 위해 탄생한 최종 보스. 서버 전원이 힘을 합쳐야 한다' },
];

// 기여도 시스템
const CONTRIBUTION_RANKS = [
  { rank: 'S', minPct: 10, rewardMul: 3.0, title: 'MVP' },
  { rank: 'A', minPct: 5,  rewardMul: 2.0 },
  { rank: 'B', minPct: 2,  rewardMul: 1.5 },
  { rank: 'C', minPct: 0.5, rewardMul: 1.0 },
  { rank: 'D', minPct: 0,  rewardMul: 0.5 },
];

// 기여도 행동
const CONTRIBUTION_ACTIONS = [
  { action: 'damage', points: 1, desc: 'DMG 1당 1포인트' },
  { action: 'heal_ally', points: 2, desc: '아군 치유 시 HP당 2포인트' },
  { action: 'tank_damage', points: 1.5, desc: '탱킹 시 받은 DMG의 1.5포인트' },
  { action: 'buff_ally', points: 3, desc: '아군 버프 시 3포인트' },
  { action: 'revive', points: 50, desc: '부활 시 50포인트' },
  { action: 'mechanic_clear', points: 100, desc: '보스 기믹 처리 시 100포인트' },
];

// 서버 히스토리 (역대 월드 보스 기록)
const HISTORY_FIELDS = ['처치 시간', 'MVP 플레이어', '참여 인원', '총 DMG', '사망자 수', '최다 기여 길드'];

// 예고 시스템 (월드 보스 등장 24시간 전 예고)
const ANNOUNCEMENT = {
  warning24h: '⚠️ 24시간 후 월드 보스 출현 예정!',
  warning1h:  '🚨 1시간 후 월드 보스 출현! 준비하라!',
  spawn:      '💀🌍 월드 보스 출현!!! 서버 전원 집결!!!',
};

function register(io, socket, player) {
  socket.on('world_boss_info', () => {
    socket.emit('world_boss_info', { bosses: WORLD_BOSSES, contributions: CONTRIBUTION_RANKS, actions: CONTRIBUTION_ACTIONS, history: HISTORY_FIELDS, announcement: ANNOUNCEMENT });
  });
  socket.on('world_boss_join', () => {
    socket.emit('world_boss_join_result', { ok: true });
    io.emit('server_msg', `⚔️🌍 [월드 보스] ${player.name}이(가) 월드 보스 전투에 합류!`);
  });
  socket.on('world_boss_contribute', (data) => {
    player.worldBossContrib = (player.worldBossContrib || 0) + (data.points || 0);
    socket.emit('world_boss_contrib', { total: player.worldBossContrib });
  });
}

module.exports = { WORLD_BOSSES, CONTRIBUTION_RANKS, CONTRIBUTION_ACTIONS, ANNOUNCEMENT, register };

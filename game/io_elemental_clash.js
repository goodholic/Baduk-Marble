// v6.1 — IO 원소 대격돌 모드
// 4원소 팀전, 원소 상성, 영토 쟁탈, 원소 궁극기

const TEAMS = 4;
const PLAYERS_PER_TEAM = 5;
const MATCH_DURATION = 480; // 8분

const ELEMENTS = {
  fire:    { name: '화', icon: '🔥', color: '#ff4400', strong: 'ice', weak: 'water', buff: { atk: 1.1 } },
  water:   { name: '수', icon: '🌊', color: '#0088ff', strong: 'fire', weak: 'thunder', buff: { hp: 1.1 } },
  thunder: { name: '뇌', icon: '⚡', color: '#ffcc00', strong: 'water', weak: 'earth', buff: { spd: 1.1 } },
  earth:   { name: '지', icon: '🌍', color: '#886622', strong: 'thunder', weak: 'fire', buff: { def: 1.1 } },
};

// 원소 존 (맵 4등분, 각 원소 영역)
const ELEMENTAL_ZONES = [
  { id: 'fire_zone', element: 'fire', name: '화염 지대', icon: '🔥🏔️', effect: '화 속성 DMG+30%, 수 속성 DMG-30%' },
  { id: 'water_zone', element: 'water', name: '수중 영역', icon: '🌊🏝️', effect: '수 속성 DMG+30%, 뇌 속성 DMG-30%' },
  { id: 'thunder_zone', element: 'thunder', name: '뇌전 지대', icon: '⚡🌪️', effect: '뇌 속성 DMG+30%, 지 속성 DMG-30%' },
  { id: 'earth_zone', element: 'earth', name: '대지 영역', icon: '🌍🏔️', effect: '지 속성 DMG+30%, 화 속성 DMG-30%' },
  { id: 'neutral', element: null, name: '중립 지대', icon: '⚪', effect: '보너스 없음, 쟁탈 핵심 거점' },
];

// 원소 궁극기 (팀 게이지 100% 시 발동)
const ELEMENTAL_ULTIMATES = {
  fire:    { name: '화산 폭발', icon: '🌋💥', desc: '맵 전체 화염, 수 팀 제외 전원 HP 40% DMG', charge: 100 },
  water:   { name: '대해일', icon: '🌊🌊', desc: '맵 절반 수몰, 화 팀 밀어내기+DMG', charge: 100 },
  thunder: { name: '뇌신의 심판', icon: '⚡👑', desc: '적 전원에게 번개 낙하 (각 HP 20% DMG+기절)', charge: 100 },
  earth:   { name: '대지진', icon: '🌍💥', desc: '뇌 팀 전원 기절 5초 + 맵 지형 변경', charge: 100 },
};

// 원소 점수 시스템
const SCORING = {
  kill: 10,
  zone_capture: 50,
  zone_hold_per_sec: 1,
  ultimate_use: 30,
  elemental_advantage_kill: 15, // 상성 킬 보너스
};

// 보상
const ELEMENTAL_REWARDS = {
  winning_team: { gold: 30000, exp: 3000, item: '원소 결정', title: '원소의 왕' },
  mvp: { gold: 50000, title: '원소 MVP', frame: 'elemental_mvp' },
  top_scorer: { gold: 20000 },
  participation: { gold: 5000, exp: 500 },
};

// 원소 조합 (2원소 → 특수 효과)
const ELEMENT_COMBOS = [
  { a: 'fire', b: 'water', name: '증기 폭발', effect: '범위 시야 차단+DOT', icon: '💨🔥' },
  { a: 'fire', b: 'thunder', name: '플라즈마', effect: '초고데미지 직선 공격', icon: '🔥⚡' },
  { a: 'water', b: 'earth', name: '진흙탕', effect: '범위 둔화+넘어짐', icon: '🌊🌍' },
  { a: 'thunder', b: 'earth', name: '자기 폭풍', effect: '금속 장비 착용자 추가 DMG', icon: '⚡🌍' },
  { a: 'fire', b: 'earth', name: '용암', effect: '지속 지형 DMG + 이동 불가', icon: '🔥🌍' },
  { a: 'water', b: 'thunder', name: '감전', effect: '수중 적 전원 기절', icon: '🌊⚡' },
];

function register(io, socket, player) {
  socket.on('elemental_clash_info', () => {
    socket.emit('elemental_clash_info', { elements: ELEMENTS, zones: ELEMENTAL_ZONES, ultimates: ELEMENTAL_ULTIMATES, scoring: SCORING, rewards: ELEMENTAL_REWARDS, combos: ELEMENT_COMBOS });
  });
  socket.on('elemental_clash_join', (data) => {
    player.elementTeam = data.element;
    socket.emit('elemental_join_result', { ok: true, element: ELEMENTS[data.element] });
    io.emit('server_msg', `${ELEMENTS[data.element]?.icon || '⚔️'} [원소 대격돌] ${player.name}이(가) ${ELEMENTS[data.element]?.name || '?'}팀 참가!`);
  });
}

module.exports = { ELEMENTS, ELEMENTAL_ZONES, ELEMENTAL_ULTIMATES, SCORING, ELEMENTAL_REWARDS, ELEMENT_COMBOS, register };

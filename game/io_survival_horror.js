// v6.1 — IO 서바이벌 호러 모드
// 어둠 속 공포 서바이벌, 괴물 회피, 제한된 자원, 탈출 목표

const MATCH_DURATION = 300; // 5분
const MAX_PLAYERS = 10;

const HORROR_MAPS = [
  { id: 'haunted_mansion', name: '유령 저택', icon: '🏚️👻', rooms: 15, keys: 3, exits: 1, visibility: 0.2,
    monsters: ['유령', '폴터가이스트', '거미'], boss: '저택의 주인(HP 50000)', desc: '열쇠 3개 → 탈출문' },
  { id: 'dark_hospital', name: '어둠의 병원', icon: '🏥💀', rooms: 20, keys: 4, exits: 1, visibility: 0.15,
    monsters: ['간호사 좀비', '환자 괴물', '의사 괴물'], boss: '원장(HP 80000)', desc: '약품 찾아 치료+탈출' },
  { id: 'abandoned_mine', name: '폐광', icon: '⛏️💀', rooms: 12, keys: 2, exits: 2, visibility: 0.1,
    monsters: ['광부 좀비', '거대 지렁이', '가스 유령'], boss: '광산의 심장(HP 60000)', desc: '횃불 필수, 가스 위험' },
  { id: 'cursed_ship', name: '저주받은 배', icon: '🚢💀', rooms: 18, keys: 3, exits: 1, visibility: 0.2,
    monsters: ['선원 좀비', '크라켄 촉수', '물 유령'], boss: '선장의 저주(HP 70000)', desc: '배가 침몰 중! 시간 제한' },
  { id: 'nightmare_realm', name: '악몽 세계', icon: '😱🌀', rooms: 25, keys: 5, exits: 1, visibility: 0.05,
    monsters: ['그림자', '도플갱어', '공포 자체'], boss: '악몽의 왕(HP 100000)', desc: '시야 거의 0! 최고 난이도' },
];

// 서바이벌 아이템
const HORROR_ITEMS = [
  { id: 'flashlight', name: '손전등', icon: '🔦', effect: '시야 3배 (30초)', rarity: 'common', uses: 3 },
  { id: 'medkit', name: '구급상자', icon: '🩹', effect: 'HP 50% 회복', rarity: 'common', uses: 1 },
  { id: 'weapon', name: '무기', icon: '🔫', effect: '약한 몬스터 처치 가능', rarity: 'uncommon', uses: 5 },
  { id: 'crucifix', name: '십자가', icon: '✝️', effect: '유령계 몬스터 퇴치', rarity: 'uncommon', uses: 2 },
  { id: 'key', name: '열쇠', icon: '🔑', effect: '잠긴 문 열기', rarity: 'rare', uses: 1 },
  { id: 'adrenaline', name: '아드레날린', icon: '💉💨', effect: '10초간 SPD 3배', rarity: 'rare', uses: 1 },
  { id: 'holy_water', name: '성수', icon: '💧✨', effect: '보스 약화 (DEF-50% 10초)', rarity: 'epic', uses: 1 },
  { id: 'escape_flare', name: '탈출 신호탄', icon: '🔴💨', effect: '즉시 탈출구 위치 표시', rarity: 'epic', uses: 1 },
];

// 공포 시스템 (공포 게이지)
const FEAR_SYSTEM = {
  maxFear: 100,
  events: [
    { fear: 25, effect: '손 떨림 (조작 흔들림)', icon: '😰' },
    { fear: 50, effect: '환각 (가짜 몬스터 출현)', icon: '😱' },
    { fear: 75, effect: '패닉 (랜덤 방향 이동 3초)', icon: '🫣' },
    { fear: 100, effect: '실신 (5초 행동불가, 위치 노출)', icon: '😵' },
  ],
  reduce: ['동료 근처(-2/초)', '밝은 곳(-3/초)', '아이템 사용(-20)'],
  increase: ['몬스터 조우(+15)', '동료 사망 목격(+30)', '어둠(+1/초)', '소리(+5)'],
};

// 보상
const HORROR_REWARDS = {
  escape: { gold: 20000, exp: 2000, title: '생존자' },
  boss_kill: { gold: 50000, exp: 5000, item: 'horror_trophy', title: '공포 정복자' },
  all_escape: { gold: 30000, desc: '전원 생존 보너스' },
  speed_escape: { gold: 40000, desc: '2분 내 탈출 보너스', title: '스피드 러너' },
};

function register(io, socket, player) {
  socket.on('horror_info', () => {
    socket.emit('horror_info', { maps: HORROR_MAPS, items: HORROR_ITEMS, fear: FEAR_SYSTEM, rewards: HORROR_REWARDS });
  });
  socket.on('horror_join', (data) => {
    const map = HORROR_MAPS.find(m => m.id === data.mapId);
    socket.emit('horror_join_result', { ok: true, map });
    io.emit('server_msg', `😱 [호러] ${player.name}이(가) "${map?.name}" 진입... 살아서 돌아올 수 있을까?`);
  });
}

module.exports = { HORROR_MAPS, HORROR_ITEMS, FEAR_SYSTEM, HORROR_REWARDS, register };

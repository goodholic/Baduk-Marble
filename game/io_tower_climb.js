// v5.8 — IO 탑 등반 모드
// 층마다 다른 규칙의 IO 전투, 올라갈수록 난이도↑, 중간 체크포인트

const MAX_FLOOR = 200;
const CHECKPOINT_EVERY = 10;

// 층별 특수 규칙 (10층마다 변경)
const FLOOR_RULES = [
  { floors: [1,10], name: '기본 전투', icon: '⚔️', rule: '표준 IO 규칙', mod: {} },
  { floors: [11,20], name: '저중력', icon: '🌙', rule: '점프 높이 3배, 낙하 느림', mod: { gravity: 0.3, jumpHeight: 3 } },
  { floors: [21,30], name: '암흑', icon: '🌑', rule: '시야 50%, 은신 유리', mod: { visibility: 0.5 } },
  { floors: [31,40], name: '빙판', icon: '❄️', rule: '바닥 미끄러짐, 이동 관성', mod: { friction: 0.3 } },
  { floors: [41,50], name: '용암 바닥', icon: '🌋', rule: '바닥에 서면 HP 감소, 플랫폼 이동', mod: { floorDmg: 10 } },
  { floors: [51,60], name: '거인의 층', icon: '🗿', rule: '적 크기 2배, 느리지만 강력', mod: { enemyScale: 2, enemySpd: 0.5, enemyAtk: 2 } },
  { floors: [61,70], name: '속도전', icon: '💨', rule: '모든 이동속도 2배, 빠른 전투', mod: { allSpd: 2.0 } },
  { floors: [71,80], name: '무기 금지', icon: '🚫⚔️', rule: '스킬만 사용 가능', mod: { noWeapon: true } },
  { floors: [81,90], name: '반전', icon: '🔄', rule: '조작 좌우 반전!', mod: { invertControls: true } },
  { floors: [91,100], name: '혼돈', icon: '🌀', rule: '매 10초마다 규칙 랜덤 변경', mod: { chaosRule: true } },
  { floors: [101,120], name: '축소전', icon: '🔬', rule: '캐릭터 절반 크기, 맵 거대화', mod: { scale: 0.5, mapScale: 2 } },
  { floors: [121,140], name: '1HP', icon: '💀', rule: '모든 유닛 HP 1, 원샷 원킬', mod: { allHp: 1 } },
  { floors: [141,160], name: '타임어택', icon: '⏱️', rule: '30초 안에 클리어', mod: { timeLimit: 30 } },
  { floors: [161,180], name: '보스 러시', icon: '👹👹', rule: '보스만 연속 출현', mod: { bossOnly: true } },
  { floors: [181,200], name: '최종 시련', icon: '🌟💀', rule: '전 규칙 랜덤 조합', mod: { allRandom: true } },
];

// 10층마다 보스
const TOWER_BOSSES = [
  { floor: 10, name: '문지기', hp: 10000, atk: 150 },
  { floor: 20, name: '그림자 기사', hp: 25000, atk: 250 },
  { floor: 30, name: '얼음 마녀', hp: 40000, atk: 300 },
  { floor: 50, name: '화염 거인', hp: 80000, atk: 450 },
  { floor: 75, name: '폭풍의 왕', hp: 150000, atk: 600 },
  { floor: 100, name: '탑의 주인', hp: 300000, atk: 800, title: '100층 정복자' },
  { floor: 150, name: '차원의 수호자', hp: 500000, atk: 1000, title: '150층 마스터' },
  { floor: 200, name: '탑의 신', hp: 1000000, atk: 1500, title: '탑의 정복자', frame: 'tower_god', merc: 'tower_guardian' },
];

// 체크포인트 보상
const CHECKPOINT_REWARDS = {
  10: { gold: 5000 }, 20: { gold: 10000 }, 30: { gold: 20000, item: '강화석' },
  50: { gold: 50000, item: '전설 장비 상자' }, 75: { gold: 80000, item: '신화 재료' },
  100: { gold: 150000, item: '초월 장비 상자', title: '100층 정복자' },
  150: { gold: 300000, item: '운명의 실', title: '150층 마스터' },
  200: { gold: 500000, item: '전설 용병 소환권', title: '탑의 정복자', merc: true },
};

// 층 사이 랜덤 이벤트
const TOWER_EVENTS = [
  { id: 'rest', name: '휴식 공간', chance: 0.10, effect: 'HP 50% 회복', icon: '⛺' },
  { id: 'shop', name: '떠돌이 상인', chance: 0.08, effect: '아이템 구매', icon: '🏪' },
  { id: 'curse', name: '저주의 층', chance: 0.05, effect: 'ATK -20% (3층)', icon: '💀' },
  { id: 'blessing', name: '축복의 층', chance: 0.07, effect: '전 스탯 +15% (3층)', icon: '✨' },
  { id: 'trap_floor', name: '함정 바닥', chance: 0.06, effect: 'HP 30% 손실', icon: '🪤' },
  { id: 'treasure', name: '숨겨진 보물', chance: 0.04, effect: '랜덤 장비 획득', icon: '💎' },
  { id: 'rival', name: '라이벌 등장', chance: 0.03, effect: 'NPC 라이벌과 강제 대결', icon: '⚔️😤' },
  { id: 'time_warp', name: '시간 왜곡', chance: 0.02, effect: '5층 스킵!', icon: '🌀⏰' },
];

function getFloorRule(floor) {
  return FLOOR_RULES.find(r => floor >= r.floors[0] && floor <= r.floors[1]) || FLOOR_RULES[0];
}

function register(io, socket, player) {
  socket.on('tower_info', () => {
    socket.emit('tower_info', {
      maxFloor: MAX_FLOOR, rules: FLOOR_RULES, bosses: TOWER_BOSSES,
      checkpoints: CHECKPOINT_REWARDS, events: TOWER_EVENTS,
      currentFloor: player.towerFloor || 1,
    });
  });
  socket.on('tower_climb', () => {
    const floor = (player.towerFloor || 0) + 1;
    player.towerFloor = floor;
    const rule = getFloorRule(floor);
    const boss = TOWER_BOSSES.find(b => b.floor === floor);
    const event = TOWER_EVENTS.find(e => Math.random() < e.chance);
    const checkpoint = CHECKPOINT_REWARDS[floor];
    socket.emit('tower_climb_result', { floor, rule, boss, event, checkpoint });
    if (boss) io.emit('server_msg', `🗼 [탑 등반] ${player.name}이(가) ${floor}층 보스 "${boss.name}" 도전!`);
    if (floor === 200) io.emit('server_msg', `🌟🗼 [탑 정복!] ${player.name}이(가) 200층 탑을 완전 정복!!`);
  });
}

module.exports = { MAX_FLOOR, FLOOR_RULES, TOWER_BOSSES, CHECKPOINT_REWARDS, TOWER_EVENTS, getFloorRule, register };

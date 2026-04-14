// v6.2 — IO 언덕의 왕 모드
// 맵 중앙 언덕 점령, 점령 시간에 따른 점수, 밀어내기 전투

const MATCH_DURATION = 300; // 5분
const MAX_PLAYERS = 16;
const HILL_CAPTURE_RATE = 1; // 1점/초

// 언덕 맵
const KOTH_MAPS = [
  { id: 'volcano_peak', name: '화산 정상', icon: '🌋⛰️', hillSize: 100, features: ['용암 테두리(바깥=DMG)', '간헐천(랜덤 넉백)'], desc: '화산 위의 왕좌' },
  { id: 'floating_island', name: '부유섬', icon: '☁️🏝️', hillSize: 80, features: ['좁은 면적(낙하 위험)', '바람(랜덤 밀기)'], desc: '떨어지면 리스폰!' },
  { id: 'ancient_altar', name: '고대 제단', icon: '🏛️⛰️', hillSize: 120, features: ['제단 활성화(1분마다 전원 버프)', '석상 함정'], desc: '신비한 제단 위의 전투' },
  { id: 'ice_peak', name: '빙산 정상', icon: '❄️⛰️', hillSize: 90, features: ['미끄러운 바닥', '빙결 바람(3초마다)'], desc: '미끄러지면 추락!' },
  { id: 'tree_top', name: '세계수 꼭대기', icon: '🌳⛰️', hillSize: 150, features: ['가지 플랫폼', '자연 치유(언덕 위 HP 재생)'], desc: '세계수의 정상' },
];

// 언덕 진화 (점령 시간에 따라 언덕 강화)
const HILL_EVOLUTION = [
  { time: 0, name: '빈 언덕', bonus: {} },
  { time: 30, name: '깃발 꽂힘', bonus: { pointRate: 1.5 }, icon: '🚩' },
  { time: 60, name: '보루 건설', bonus: { pointRate: 2.0, defBonus: 1.1 }, icon: '🏰' },
  { time: 90, name: '요새화', bonus: { pointRate: 2.5, defBonus: 1.2, turret: true }, icon: '🏰⚔️' },
  { time: 120, name: '왕좌 등극', bonus: { pointRate: 3.0, allStat: 1.1, aura: true }, icon: '👑' },
];

// 밀어내기 전용 스킬
const PUSH_SKILLS = [
  { id: 'shoulder_charge', name: '어깨 돌격', icon: '💪', push: 3, cooldown: 8, desc: '전방 적 3칸 밀기' },
  { id: 'ground_slam', name: '지면 강타', icon: '💥', push: 2, aoe: 3, cooldown: 12, desc: '범위 밀어내기' },
  { id: 'wind_blast', name: '바람 폭풍', icon: '🌪️', push: 5, cooldown: 15, desc: '직선 5칸 밀기' },
  { id: 'grapple', name: '끌어당기기', icon: '🪝', pull: 3, cooldown: 10, desc: '적 끌어오기 (역밀기)' },
  { id: 'earth_wall', name: '대지 벽', icon: '🧱', push: 0, cooldown: 20, desc: '벽 생성으로 접근 차단' },
  { id: 'meteor_drop', name: '유성 낙하', icon: '☄️', push: 4, aoe: 5, cooldown: 30, desc: '하늘에서 유성! 대범위 넉백' },
];

// 보상
const KOTH_REWARDS = {
  king:    { gold: 30000, exp: 3000, title: '언덕의 왕', frame: 'koth_champion' },
  top3:    { gold: 15000, exp: 1500 },
  top5:    { gold: 8000, exp: 800 },
  highest_push: { gold: 10000, title: '밀어내기 왕', desc: '가장 많이 밀어냄' },
};

// 특수 이벤트
const KOTH_EVENTS = [
  { time: 60, name: '지진!', effect: '언덕 크기 일시 축소 (-30%)', icon: '🌍💥' },
  { time: 120, name: '보물 낙하', effect: '언덕 위에 보물 (획득 시 점수 +50)', icon: '💎' },
  { time: 180, name: '폭풍', effect: '전원 랜덤 방향 밀려남', icon: '🌪️' },
  { time: 240, name: '최후의 격전', effect: '언덕 점수 5배!', icon: '⚔️🔥' },
];

function register(io, socket, player) {
  socket.on('koth_info', () => {
    socket.emit('koth_info', { maps: KOTH_MAPS, evolution: HILL_EVOLUTION, pushSkills: PUSH_SKILLS, rewards: KOTH_REWARDS, events: KOTH_EVENTS });
  });
  socket.on('koth_join', (data) => {
    socket.emit('koth_join_result', { ok: true, map: KOTH_MAPS.find(m => m.id === data.mapId) });
    io.emit('server_msg', `⛰️👑 [언덕의 왕] ${player.name}이(가) 참가! 정상을 차지하라!`);
  });
}

module.exports = { KOTH_MAPS, HILL_EVOLUTION, PUSH_SKILLS, KOTH_REWARDS, KOTH_EVENTS, register };

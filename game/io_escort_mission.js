// v6.3 — IO 호위 임무 모드
// VIP NPC를 호위하며 목적지까지 이동, 적 습격 방어, 협동

const MAX_PLAYERS = 6; // 호위대 최대 6인
const MISSION_DURATION = 480; // 8분

const ESCORT_MISSIONS = [
  { id: 'princess_escort', name: '공주 호위', icon: '👸🛡️', vipHp: 5000, reward: { gold: 30000, exp: 3000 },
    route: '왕성→마을→숲→항구', waypoints: 4, ambushes: 3, boss: '암살단장(HP 30000)', desc: '왕국의 공주를 항구까지' },
  { id: 'merchant_escort', name: '상인 호위', icon: '🧑‍💼🛡️', vipHp: 3000, reward: { gold: 40000, exp: 2000, tradeBonus: 1.2 },
    route: '시장→사막→산맥→도시', waypoints: 4, ambushes: 4, boss: '도적왕(HP 25000)', desc: '거상의 보물을 운반' },
  { id: 'sage_escort', name: '현자 호위', icon: '🧙🛡️', vipHp: 2000, reward: { gold: 25000, exp: 5000, item: 'wisdom_scroll' },
    route: '도서관→유적→신전', waypoints: 3, ambushes: 5, boss: '지식의 수호자(HP 40000)', desc: '현자를 고대 신전까지' },
  { id: 'prisoner_escort', name: '죄수 호송', icon: '⛓️🛡️', vipHp: 8000, reward: { gold: 20000, exp: 2000, karma: 10 },
    route: '감옥→숲→법원', waypoints: 3, ambushes: 6, boss: '탈옥단(HP 20000×3)', desc: '위험한 죄수를 법원까지, 탈옥 방지!' },
  { id: 'artifact_escort', name: '유물 운송', icon: '🏺🛡️', vipHp: 1, reward: { gold: 60000, exp: 4000, item: 'ancient_relic' },
    route: '유적→사막→화산→신전', waypoints: 4, ambushes: 5, boss: '유물 사냥꾼(HP 35000)', desc: 'HP 1! 한 번이라도 맞으면 파괴!', fragile: true },
];

// 호위대 역할
const ESCORT_ROLES = {
  vanguard: { name: '전위', icon: '⚔️', bonus: { atk: 1.2 }, desc: '앞에서 적 처리' },
  guardian: { name: '수호자', icon: '🛡️', bonus: { def: 1.3 }, desc: 'VIP 바로 옆 방어' },
  scout:    { name: '정찰', icon: '👁️', bonus: { vision: 2.0 }, desc: '앞서가며 습격 탐지' },
  healer:   { name: '치료사', icon: '💚', bonus: { healPow: 1.3 }, desc: 'VIP+팀원 치유' },
  sniper:   { name: '저격수', icon: '🎯', bonus: { range: 1.5, critDmg: 1.3 }, desc: '원거리에서 적 제거' },
  decoy:    { name: '미끼', icon: '🎭', bonus: { aggro: 2.0 }, desc: '적 어그로 유인' },
};

// 습격 웨이브 유형
const AMBUSH_TYPES = [
  { id: 'bandit', name: '산적 습격', icon: '🏴‍☠️', count: 5, atk: 100, desc: '기본 적' },
  { id: 'assassin', name: '암살자 습격', icon: '🗡️', count: 3, atk: 200, stealth: true, desc: 'VIP 직접 노림!' },
  { id: 'archer', name: '궁수 매복', icon: '🏹', count: 8, atk: 80, ranged: true, desc: '원거리에서 공격' },
  { id: 'monster', name: '야생 몬스터', icon: '🐺', count: 10, atk: 60, desc: '다수의 야생 몬스터' },
  { id: 'siege', name: '공성 병기', icon: '💣', count: 2, atk: 400, aoe: true, desc: '범위 공격 병기' },
  { id: 'betrayal', name: '배신!', icon: '🗡️🤝', count: 1, atk: 300, desc: 'NPC 호위 1명이 배신! (미니보스)', surprise: true },
];

// 보상 (성공/실패)
const ESCORT_REWARDS = {
  success:       { goldMul: 1.0, expMul: 1.0, title: '신뢰의 호위자' },
  perfect:       { goldMul: 2.0, expMul: 2.0, title: '완벽한 호위', desc: 'VIP HP 100% 유지' },
  speed:         { goldMul: 1.5, expMul: 1.5, desc: '절반 시간 내 완료' },
  fail_vip_dead: { goldMul: 0.2, expMul: 0.2, desc: 'VIP 사망 — 실패' },
  fail_timeout:  { goldMul: 0.3, expMul: 0.3, desc: '시간 초과 — 실패' },
};

function register(io, socket, player) {
  socket.on('escort_info', () => {
    socket.emit('escort_info', { missions: ESCORT_MISSIONS, roles: ESCORT_ROLES, ambushes: AMBUSH_TYPES, rewards: ESCORT_REWARDS });
  });
  socket.on('escort_join', (data) => {
    const mission = ESCORT_MISSIONS.find(m => m.id === data.missionId);
    player.escortRole = data.role || 'vanguard';
    socket.emit('escort_join_result', { ok: true, mission, role: ESCORT_ROLES[player.escortRole] });
    io.emit('server_msg', `🛡️ [호위] ${player.name}이(가) "${mission?.name}" 호위 임무 참가!`);
  });
}

module.exports = { ESCORT_MISSIONS, ESCORT_ROLES, AMBUSH_TYPES, ESCORT_REWARDS, register };

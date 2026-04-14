// v6.3 — 기억 궁전+ (확장)
// 과거 플레이를 기반으로 던전 생성, 자기 기록 도전, 향수 보너스

const MEMORY_TYPES = [
  { id: 'first_battle', name: '첫 전투의 기억', icon: '⚔️🕰️', desc: '처음 싸웠던 그때', difficulty: 1, reward: { exp: 500, item: '초심의 증표' }, nostalgia: '초심을 되새기면 EXP+20% (1시간)' },
  { id: 'first_boss', name: '첫 보스의 기억', icon: '👹🕰️', desc: '처음 만난 보스', difficulty: 3, reward: { gold: 5000, item: '각오의 결정' }, nostalgia: '각오를 되새기면 보스DMG+15% (1시간)' },
  { id: 'first_merc', name: '첫 용병의 기억', icon: '⚔️🧑🕰️', desc: '처음 영입한 용병', difficulty: 2, reward: { gold: 3000, item: '인연의 실' }, nostalgia: '인연을 되새기면 친밀도+20% (1시간)' },
  { id: 'first_siege', name: '첫 공성전의 기억', icon: '🏰🕰️', desc: '처음 참여한 공성', difficulty: 5, reward: { gold: 10000, item: '전략의 서' }, nostalgia: '전략을 되새기면 공성DEF+10% (1시간)' },
  { id: 'first_death', name: '첫 패배의 기억', icon: '💀🕰️', desc: '처음 쓰러진 순간', difficulty: 4, reward: { gold: 8000, item: '불굴의 증표' }, nostalgia: '불굴을 되새기면 부활속도+50% (1시간)' },
  { id: 'greatest_victory', name: '최고의 승리', icon: '🏆🕰️', desc: '가장 빛나던 순간', difficulty: 7, reward: { gold: 20000, item: '영광의 메달' }, nostalgia: '영광을 되새기면 전체+5% (1시간)' },
  { id: 'darkest_hour', name: '가장 어두운 시간', icon: '🌑🕰️', desc: '가장 힘들었던 순간', difficulty: 8, reward: { gold: 30000, item: '극복의 징표' }, nostalgia: '극복을 되새기면 CC면역 1회/전투 (1시간)' },
  { id: 'nightmare_memory', name: '악몽의 기억', icon: '😱🕰️', desc: '반복되는 악몽을 극복', difficulty: 10, reward: { gold: 50000, title: '기억의 주인' }, nostalgia: '기억을 지배하면 공포면역+전체+8% (1시간)', final: true },
];

// 자기 기록 도전 (과거 클리어 타임/점수 갱신)
const RECORD_CHALLENGE = {
  timeAttack: '과거 클리어 시간보다 빠르게 → 보상 1.5배',
  noDamage: '무피격으로 클리어 → 보상 3배',
  hardcore: '장비 없이 클리어 → 보상 5배 + 칭호',
};

// 향수 포인트 (기억 던전 클리어로 축적)
const NOSTALGIA_RANKS = [
  { points: 0, name: '잊혀진 자', bonus: {} },
  { points: 100, name: '추억을 가진 자', bonus: { expBonus: 1.05 } },
  { points: 300, name: '기억의 수호자', bonus: { expBonus: 1.1, hpRegen: 0.01 } },
  { points: 600, name: '시간의 여행자', bonus: { expBonus: 1.15, allStat: 1.03 } },
  { points: 1000, name: '기억의 주인', bonus: { expBonus: 1.2, allStat: 1.05, timeTravel: true }, title: true },
];

function enterMemory(player, memoryType) {
  const mem = MEMORY_TYPES.find(m => m.id === memoryType);
  if (!mem) return { ok: false, reason: '알 수 없는 기억' };
  player.activeMemory = { type: memoryType, startTime: Date.now() };
  return { ok: true, memory: mem };
}

function register(io, socket, player) {
  socket.on('memory_palace_info', () => {
    const rank = [...NOSTALGIA_RANKS].reverse().find(r => (player.nostalgiaPoints || 0) >= r.points);
    socket.emit('memory_palace_info', { memories: MEMORY_TYPES, challenge: RECORD_CHALLENGE, ranks: NOSTALGIA_RANKS, myRank: rank, points: player.nostalgiaPoints || 0 });
  });
  socket.on('memory_palace_enter', (data) => {
    const result = enterMemory(player, data.memoryType);
    socket.emit('memory_palace_result', result);
    if (result.ok) io.emit('server_msg', `🕰️ [기억 궁전] ${player.name}이(가) "${result.memory.name}" 속으로...`);
  });
}

module.exports = { MEMORY_TYPES, RECORD_CHALLENGE, NOSTALGIA_RANKS, enterMemory, register };

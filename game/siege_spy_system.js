// v5.3 — 공성전 첩보/간첩 시스템
// 공성전 전 정보전: 스파이 파견, 함정 파악, 역스파이, 교란

const SPY_COOLDOWN = 300; // 5분

// 첩보 임무 유형
const SPY_MISSIONS = [
  { id: 'scout_traps', name: '함정 정찰', icon: '🔍🪤', duration: 60, successRate: 0.7, cost: 2000,
    success: '적 함정 배치 50% 공개', fail: '스파이 발각! 적에게 위치 노출', intel: 'traps' },
  { id: 'scout_mercs', name: '수비 용병 정찰', icon: '🔍⚔️', duration: 90, successRate: 0.6, cost: 3000,
    success: '적 배치 용병 전체 공개', fail: '스파이 포로! 1분간 용병 -1', intel: 'mercs' },
  { id: 'sabotage', name: '방해 공작', icon: '💣🔧', duration: 120, successRate: 0.4, cost: 5000,
    success: '적 함정 2개 비활성화', fail: '역폭발! 아군 용병 1명 부상', intel: 'none', action: 'disable_traps' },
  { id: 'steal_plans', name: '작전 탈취', icon: '📋🕵️', duration: 180, successRate: 0.3, cost: 8000,
    success: '적 전략 카드 1장 미리 공개', fail: '가짜 정보! 잘못된 정보 제공', intel: 'strategy' },
  { id: 'assassinate', name: '성주 암살 시도', icon: '🗡️👑', duration: 240, successRate: 0.15, cost: 15000,
    success: '성주 스킬 쿨다운 2배 (5분)', fail: '암살 실패! 적 전원 ATK+20% (3분)', intel: 'none', action: 'debuff_lord' },
  { id: 'double_agent', name: '이중 스파이', icon: '🕵️‍♂️🔄', duration: 300, successRate: 0.5, cost: 10000,
    success: '적 스파이 차단 + 거짓 정보 역류', fail: '이중 스파이 발각! 정보 전부 누설', intel: 'counter' },
];

// 역첩보 (수비측 대응)
const COUNTER_INTEL = [
  { id: 'patrol', name: '순찰 강화', icon: '💂🔦', cost: 1000, effect: '스파이 성공률 -20%', duration: 300 },
  { id: 'false_info', name: '허위 정보 유포', icon: '📰🎭', cost: 3000, effect: '적 정찰 시 가짜 배치도 전달', duration: 300 },
  { id: 'trap_spy', name: '스파이 덫', icon: '🕸️🕵️', cost: 5000, effect: '적 스파이 포획 시 용병 정보 획득', duration: 600 },
  { id: 'encrypt', name: '정보 암호화', icon: '🔐', cost: 2000, effect: '작전 탈취 성공률 -30%', duration: 600 },
];

// 첩보 보고서
const INTEL_REPORTS = {
  traps:    { name: '함정 보고서', desc: '함정 위치+종류 (정확도 50~100%)', icon: '🗺️🪤' },
  mercs:    { name: '수비 용병 보고서', desc: '용병 이름+위치+스탯 (정확도 60~100%)', icon: '🗺️⚔️' },
  strategy: { name: '전략 보고서', desc: '적 전략 카드 1장 공개', icon: '📋' },
  counter:  { name: '역첩보 보고서', desc: '적 스파이 차단 성공 + 역정보', icon: '🕵️‍♂️' },
};

function sendSpy(player, missionId) {
  const mission = SPY_MISSIONS.find(m => m.id === missionId);
  if (!mission) return { ok: false, reason: '알 수 없는 임무' };
  if ((player.gold || 0) < mission.cost) return { ok: false, reason: '골드 부족' };

  const now = Date.now();
  if (player.lastSpyTime && now - player.lastSpyTime < SPY_COOLDOWN * 1000) {
    return { ok: false, reason: `쿨다운 ${Math.ceil((SPY_COOLDOWN * 1000 - (now - player.lastSpyTime)) / 1000)}초` };
  }

  player.gold -= mission.cost;
  player.lastSpyTime = now;

  const success = Math.random() < mission.successRate;
  const report = success
    ? { success: true, intel: mission.intel, message: mission.success, report: INTEL_REPORTS[mission.intel] }
    : { success: false, message: mission.fail };

  return { ok: true, mission: mission.name, ...report };
}

function deployCounterIntel(player, counterId) {
  const ci = COUNTER_INTEL.find(c => c.id === counterId);
  if (!ci) return { ok: false, reason: '알 수 없는 역첩보' };
  if ((player.gold || 0) < ci.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= ci.cost;
  player.activeCounterIntel = player.activeCounterIntel || [];
  player.activeCounterIntel.push({ ...ci, startTime: Date.now() });
  return { ok: true, counter: ci };
}

function register(io, socket, player) {
  socket.on('spy_missions', () => {
    socket.emit('spy_missions', { missions: SPY_MISSIONS, counterIntel: COUNTER_INTEL, reports: INTEL_REPORTS });
  });

  socket.on('spy_send', (data) => {
    const result = sendSpy(player, data.missionId);
    socket.emit('spy_result', result);
    if (result.ok && result.success) {
      socket.emit('spy_report', result.report);
    }
  });

  socket.on('spy_counter', (data) => {
    const result = deployCounterIntel(player, data.counterId);
    socket.emit('spy_counter_result', result);
  });
}

module.exports = { SPY_MISSIONS, COUNTER_INTEL, INTEL_REPORTS, sendSpy, deployCounterIntel, register };

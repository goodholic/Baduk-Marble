// v6.0 — 변장/위장 시스템
// 용병이 적 용병으로 변장, 침투, 교란, 암살

const DISGUISE_DURATION = 120; // 2분
const DISGUISE_COST = 5000;

// 변장 유형
const DISGUISE_TYPES = [
  { id: 'enemy_merc', name: '적 용병 위장', icon: '🎭⚔️', success: 0.7, duration: 120,
    ability: '적 진영 자유 이동 (발각 전까지)', risk: '발각 시 즉시 전투 + 위치 공개',
    detect: '같은 용병이 2명이면 자동 발각', desc: '적의 용병으로 완벽 변장' },
  { id: 'npc_disguise', name: 'NPC 변장', icon: '🎭🧑', success: 0.85, duration: 180,
    ability: '상인/주민으로 변장, 정보 수집', risk: '행동 불일치 시 의심',
    detect: '전투 행동 시 즉시 발각', desc: '무해한 NPC로 위장' },
  { id: 'monster_disguise', name: '몬스터 변장', icon: '🎭👹', success: 0.5, duration: 90,
    ability: '적 몬스터 사이에 숨기, 기습 가능', risk: '같은 종류 몬스터와 대면 시 발각',
    detect: '플레이어 근접 시 자동 스캔', desc: '몬스터로 위장하여 잠복' },
  { id: 'ally_disguise', name: '아군 위장 (스파이)', icon: '🎭🤝', success: 0.6, duration: 150,
    ability: '아군 진영에서 내부 교란 가능', risk: '친밀도 시스템에서 불일치 감지',
    detect: '대화 시 지식 테스트', desc: '이중 스파이 활동' },
  { id: 'object_disguise', name: '오브젝트 변장', icon: '🎭🪨', success: 0.95, duration: 60,
    ability: '나무/바위/상자로 변장, 완벽 은신', risk: '움직이면 즉시 발각',
    detect: '이동 시 발각', desc: '완전히 움직이지 않는 은신' },
];

// 발각 시 패널티
const DETECTION_PENALTIES = {
  combat:    { desc: '즉시 전투 시작 (적에게 ATK+30%)', severity: 'high' },
  expose:    { desc: '위치 30초간 전체 공개', severity: 'medium' },
  karma:     { desc: '카르마 -20', severity: 'low' },
  trap:      { desc: '5초 행동불가 + 주변 적 집결', severity: 'high' },
  blacklist: { desc: '해당 진영에서 24시간 변장 불가', severity: 'extreme' },
};

// 변장 스킬 레벨
const DISGUISE_MASTERY = [
  { level: 1, name: '초보', bonus: 0, desc: '기본 변장' },
  { level: 3, name: '능숙', bonus: 0.1, desc: '성공률 +10%' },
  { level: 5, name: '달인', bonus: 0.2, desc: '성공률 +20%, 지속시간 +30초' },
  { level: 7, name: '마스터', bonus: 0.3, desc: '성공률 +30%, 발각 시 즉시 탈출' },
  { level: 10, name: '천의 얼굴', bonus: 0.5, desc: '성공률 +50%, 완벽 변장 (스캔 무시)', title: true },
];

function disguise(player, mercId, disguiseType) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  const dtype = DISGUISE_TYPES.find(d => d.id === disguiseType);
  if (!dtype) return { ok: false, reason: '알 수 없는 변장' };
  if ((player.gold || 0) < DISGUISE_COST) return { ok: false, reason: '골드 부족' };
  player.gold -= DISGUISE_COST;

  const mastery = DISGUISE_MASTERY.filter(m => (merc.disguiseLevel || 1) >= m.level).pop();
  const finalSuccess = Math.min(0.99, dtype.success + (mastery?.bonus || 0));
  const success = Math.random() < finalSuccess;

  if (success) {
    merc.activeDisguise = { type: disguiseType, startTime: Date.now(), duration: dtype.duration };
    return { ok: true, disguise: dtype, mastery, success: true };
  } else {
    const penalty = DETECTION_PENALTIES[['combat','expose','karma'][Math.floor(Math.random()*3)]];
    return { ok: true, success: false, detected: true, penalty };
  }
}

function register(io, socket, player) {
  socket.on('disguise_info', () => {
    socket.emit('disguise_info', { types: DISGUISE_TYPES, penalties: DETECTION_PENALTIES, mastery: DISGUISE_MASTERY });
  });
  socket.on('disguise_execute', (data) => {
    const result = disguise(player, data.mercId, data.disguiseType);
    socket.emit('disguise_result', result);
    if (result.success) io.emit('server_msg', `🎭 누군가가 변장에 성공했다...`);
    else if (result.detected) io.emit('server_msg', `🎭❌ 변장이 발각되었다!`);
  });
}

module.exports = { DISGUISE_TYPES, DETECTION_PENALTIES, DISGUISE_MASTERY, DISGUISE_COST, disguise, register };

// v7.0 — 감정 공명장 시스템
// 전장에 감정 필드 생성, 범위 내 아군/적 감정 강제 전환+버프

const FIELD_DURATION = 20;
const FIELD_COOLDOWN = 120;
const FIELD_RADIUS = 200;

const RESONANCE_FIELDS = [
  { id: 'rage_field', name: '분노의 장', icon: '🔥🌀', emotion: 'rage', radius: 200,
    allyEffect: { atk: 1.2, emotion: 'rage' }, enemyEffect: { def: 0.85, emotion: 'fear' },
    desc: '아군 분노+공격↑, 적 공포+방어↓', visualColor: '#ff4400' },
  { id: 'calm_field', name: '평온의 장', icon: '😌🌀', emotion: 'calm', radius: 250,
    allyEffect: { hpRegen: 0.05, cdReduce: 0.8, emotion: 'calm' }, enemyEffect: { spd: 0.8 },
    desc: '아군 재생+쿨감, 적 둔화', visualColor: '#88ccff' },
  { id: 'joy_field', name: '환희의 장', icon: '🎉🌀', emotion: 'joy', radius: 200,
    allyEffect: { teamAll: 1.08, emotion: 'joy' }, enemyEffect: { confusion: 0.1 },
    desc: '아군 전체↑, 적 혼란 확률', visualColor: '#ffcc00' },
  { id: 'despair_field', name: '절망의 장', icon: '💀🌀', emotion: 'despair', radius: 180,
    allyEffect: { lastStand: true }, enemyEffect: { atk: 0.7, spd: 0.7, emotion: 'despair' },
    desc: '적 전투력 대폭↓, 아군 배수의 진', visualColor: '#440066' },
  { id: 'inspired_field', name: '영감의 장', icon: '✨🌀', emotion: 'inspired', radius: 220,
    allyEffect: { allStat: 1.1, skillBonus: 1.2, emotion: 'inspired' }, enemyEffect: { skillCd: 1.5 },
    desc: '아군 스킬 강화, 적 쿨다운 증가', visualColor: '#ffaaff' },
  { id: 'berserk_field', name: '광폭의 장', icon: '👹🌀', emotion: 'berserk', radius: 150,
    allyEffect: { atk: 1.4, def: 0.6, emotion: 'berserk' }, enemyEffect: { atk: 1.2, def: 0.7 },
    desc: '양측 모두 공격↑방어↓! 하이리스크 구간', visualColor: '#ff0044', risky: true },
  { id: 'void_field', name: '공허의 장', icon: '🌀🌀', emotion: 'void_mind', radius: 200,
    allyEffect: { penetration: 0.2, trueDmg: 50 }, enemyEffect: { healBlock: true, buffBlock: true },
    desc: '적 힐+버프 차단! 아군 관통↑', visualColor: '#220033', evolved: true },
  { id: 'nirvana_field', name: '열반의 장', icon: '🧘🌀', emotion: 'nirvana', radius: 300,
    allyEffect: { immune: 'all_cc', allStat: 1.15, emotion: 'nirvana' }, enemyEffect: { disarm: true },
    desc: '아군 CC 면역+전체↑, 적 무장 해제!', visualColor: '#ffffff', ultimate: true },
];

// 필드 충돌 (2개 필드 겹치면)
const FIELD_COLLISIONS = [
  { a: 'rage_field', b: 'calm_field', result: '중화! 양측 필드 소멸', name: '감정 충돌' },
  { a: 'joy_field', b: 'despair_field', result: '감정 폭발! 범위 내 전원 랜덤 감정', name: '감정 폭발' },
  { a: 'berserk_field', b: 'berserk_field', result: '광기의 폭풍! 범위 내 전원 5초 통제불능', name: '광기 폭풍' },
  { a: 'void_field', b: 'nirvana_field', result: '차원 균열! 맵 일부 변형+보너스 지역 생성', name: '차원 균열' },
  { a: 'inspired_field', b: 'rage_field', result: '불꽃의 영감! 범위 내 아군 궁극기 쿨 리셋', name: '불꽃 영감' },
];

// 필드 마스터리
const FIELD_MASTERY = [
  { uses: 5, name: '감정사', bonus: { radius: 1.1 } },
  { uses: 15, name: '공명 술사', bonus: { radius: 1.2, duration: 1.2 } },
  { uses: 30, name: '감정장 마스터', bonus: { radius: 1.3, duration: 1.3, dualField: true }, desc: '2개 필드 동시 전개!' },
  { uses: 50, name: '감정의 신', bonus: { radius: 1.5, duration: 1.5, dualField: true, instantCast: true }, desc: '즉시 발동+최대 범위!', title: true },
];

function deployField(player, fieldId, x, y) {
  const field = RESONANCE_FIELDS.find(f => f.id === fieldId);
  if (!field) return { ok: false, reason: '알 수 없는 필드' };
  player.fieldUses = (player.fieldUses || 0) + 1;
  const mastery = [...FIELD_MASTERY].reverse().find(m => player.fieldUses >= m.uses);
  return { ok: true, field, mastery, position: { x, y } };
}

function register(io, socket, player) {
  socket.on('resonance_field_info', () => {
    socket.emit('resonance_field_info', { fields: RESONANCE_FIELDS, collisions: FIELD_COLLISIONS, mastery: FIELD_MASTERY, uses: player.fieldUses || 0 });
  });
  socket.on('resonance_field_deploy', (data) => {
    const result = deployField(player, data.fieldId, data.x, data.y);
    socket.emit('resonance_field_result', result);
    if (result.ok) io.emit('server_msg', `🌀 [감정 공명장] ${player.name}이(가) "${result.field.name}" 전개!`);
  });
}

module.exports = { RESONANCE_FIELDS, FIELD_COLLISIONS, FIELD_MASTERY, deployField, register };

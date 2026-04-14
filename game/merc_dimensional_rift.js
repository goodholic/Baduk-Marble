// v5.9 — 용병 차원 균열 확장 시스템
// 무한 차원, 차원마다 다른 물리법칙, 차원 정복, 차원 보스

const MAX_DIMENSIONS = 12;

const DIMENSIONS = [
  { id: 'mirror', name: '거울 차원', icon: '🪞🌀', law: '모든 것이 반전 (좌우+공방)', boss: { name: '거울의 자아', hp: 100000 }, reward: '반사 장비', lore: '자신과 마주하는 세계' },
  { id: 'gravity', name: '중력 차원', icon: '🌑🌀', law: '중력 10배 (이동-70%, 점프 불가)', boss: { name: '중력왕', hp: 200000 }, reward: '무중력 신발', lore: '움직일 수 없는 세계' },
  { id: 'time', name: '시간 차원', icon: '⏰🌀', law: '시간 불안정 (속도 랜덤 0.5~3배)', boss: { name: '크로노스', hp: 300000 }, reward: '시간의 관', lore: '시간이 흐르지 않는 세계' },
  { id: 'elemental', name: '원소 차원', icon: '🔥❄️⚡🌍', law: '매 10초 원소 변경 (유리/불리)', boss: { name: '원소 혼합체', hp: 250000 }, reward: '전 원소 반지', lore: '4원소가 충돌하는 세계' },
  { id: 'size', name: '크기 차원', icon: '🔬🔭', law: '크기 랜덤 변경 (0.1~10배)', boss: { name: '차원 거인', hp: 500000 }, reward: '크기 변환기', lore: '크기가 의미 없는 세계' },
  { id: 'silence', name: '침묵 차원', icon: '🤫🌀', law: '스킬 사용 불가! 기본 공격만', boss: { name: '침묵의 군주', hp: 150000 }, reward: '침묵 파괴자', lore: '모든 마법이 침묵하는 세계' },
  { id: 'chaos', name: '혼돈 차원', icon: '🌀💜', law: '모든 규칙이 매 초 랜덤 변경', boss: { name: '혼돈 자체', hp: 400000 }, reward: '혼돈의 핵', lore: '어떤 법칙도 통하지 않는 세계' },
  { id: 'dream', name: '꿈 차원', icon: '💭🌀', law: 'HP=MP, MP=HP (역전)', boss: { name: '꿈의 군주', hp: 350000 }, reward: '꿈의 구슬', lore: '현실이 아닌 세계' },
  { id: 'death', name: '죽음 차원', icon: '💀🌀', law: '1회 피격=즉사, 회피만이 살 길', boss: { name: '사신', hp: 100000, atk: 99999 }, reward: '불멸의 증표', lore: '죽음만이 기다리는 세계' },
  { id: 'paradise', name: '낙원 차원', icon: '🌈🌀', law: 'HP 자동 회복, 적도 자동 회복', boss: { name: '낙원의 수호자', hp: 800000, regen: 0.01 }, reward: '영원의 꽃', lore: '아무도 죽지 않는 세계' },
  { id: 'void', name: '공허 차원', icon: '🕳️🌀', law: '모든 방어 무시, 순수 ATK만 적용', boss: { name: '공허신', hp: 600000 }, reward: '공허의 검', lore: '존재 자체가 소멸하는 세계' },
  { id: 'origin', name: '기원 차원', icon: '🌟🌀', law: '전 규칙 동시 적용 (최종 차원)', boss: { name: '차원의 종말자', hp: 999999, phases: 12 }, reward: '차원 정복자 칭호 + 초월 용병', lore: '모든 차원의 시작과 끝', final: true },
];

// 차원 정복 보상 (누적)
const CONQUEST_TIERS = [
  { dims: 3, title: '차원 여행자', bonus: { allStat: 1.03 } },
  { dims: 6, title: '차원 탐험가', bonus: { allStat: 1.06 } },
  { dims: 9, title: '차원 정복자', bonus: { allStat: 1.10 } },
  { dims: 12, title: '차원의 신 🌟🌀👑', bonus: { allStat: 1.20 }, ultimate: true },
];

function enterDimension(player, dimId, mercIds) {
  const dim = DIMENSIONS.find(d => d.id === dimId);
  if (!dim) return { ok: false, reason: '알 수 없는 차원' };
  player.activeDimension = { dimId, mercIds, startTime: Date.now() };
  return { ok: true, dimension: dim };
}

function register(io, socket, player) {
  socket.on('dimensional_rift_info', () => {
    socket.emit('dimensional_rift_info', { dimensions: DIMENSIONS, conquestTiers: CONQUEST_TIERS, conquered: player.conqueredDimensions || [] });
  });
  socket.on('dimensional_rift_enter', (data) => {
    const result = enterDimension(player, data.dimId, data.mercIds || []);
    socket.emit('dimensional_rift_result', result);
    if (result.ok) io.emit('server_msg', `🌀 [차원 균열] ${player.name}이(가) "${result.dimension.name}" 차원에 진입!`);
  });
}

module.exports = { DIMENSIONS, CONQUEST_TIERS, MAX_DIMENSIONS, enterDimension, register };

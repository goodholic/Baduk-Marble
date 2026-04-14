// v5.7 — 용병 꿈의 세계 시스템
// 용병의 꿈속으로 입장, 과거 기억 탐험, 숨겨진 능력 해금

const DREAM_TYPES = [
  { id: 'past_memory', name: '과거의 기억', icon: '🕰️💭', desc: '용병의 과거를 체험, 배경 스토리 해금',
    rewards: ['로어 해금', '친밀도+20', '과거 스킬 1개 학습'], difficulty: 3 },
  { id: 'nightmare', name: '악몽', icon: '👹💭', desc: '용병의 트라우마와 대면, 극복 시 능력 각성',
    rewards: ['공포 면역', 'ATK+10% 영구', '트라우마 극복 칭호'], difficulty: 7 },
  { id: 'prophecy', name: '예언의 꿈', icon: '🔮💭', desc: '미래의 환상, 다음 이벤트 미리보기',
    rewards: ['다음 전투 크리 확정', '이벤트 예언 정보', '운세 버프'], difficulty: 5 },
  { id: 'parallel', name: '평행세계', icon: '🌀💭', desc: '다른 가능성의 자신과 조우, 전직 미리보기',
    rewards: ['평행 스킬 1개 체험', '전직 재료 할인', '평행 장비 획득'], difficulty: 6 },
  { id: 'ancestral', name: '선조의 꿈', icon: '🏛️💭', desc: '세대 계승 선조의 기억, 유전 특성 강화',
    rewards: ['유전 특성 강화', '세대 보너스 +5%', '선조의 유물'], difficulty: 8 },
  { id: 'divine', name: '신의 꿈', icon: '✨💭', desc: '신과의 대화, 축복 획득 (신앙 필요)',
    rewards: ['신의 축복 강화', '신앙+100', '신성 장비'], difficulty: 10, reqFaith: 500 },
];

// 꿈의 세계 내부 이벤트
const DREAM_EVENTS = [
  { id: 'memory_fragment', name: '기억 조각', effect: '숨겨진 대사/로어 해금', chance: 0.15 },
  { id: 'shadow_self', name: '그림자 자아', effect: '자신의 분신과 전투 (승리 시 ATK+5%)', chance: 0.10 },
  { id: 'lost_skill', name: '잃어버린 기술', effect: '과거에 잊은 스킬 1개 습득', chance: 0.08 },
  { id: 'dream_merchant', name: '꿈의 상인', effect: '꿈에서만 살 수 있는 특수 아이템', chance: 0.06 },
  { id: 'lucid_dream', name: '루시드 드림', effect: '10초간 꿈 조종 (원하는 보상 선택)', chance: 0.03 },
  { id: 'nightmare_trap', name: '악몽의 덫', effect: '탈출 실패 시 1시간 디버프', chance: 0.05 },
  { id: 'dream_fusion', name: '꿈의 융합', effect: '2용병의 꿈이 합쳐짐 (합체기 강화)', chance: 0.04 },
];

// 꿈의 세계 전용 아이템
const DREAM_ITEMS = [
  { id: 'dream_catcher', name: '드림캐처', icon: '🕸️🌙', effect: '악몽 방지 + 꿈 보상 +30%', rarity: 'rare' },
  { id: 'lucid_ring', name: '자각의 반지', icon: '💍🌙', effect: '루시드 드림 확률 2배', rarity: 'epic' },
  { id: 'nightmare_blade', name: '악몽의 칼', icon: '🗡️👹', effect: '악몽 클리어 시 ATK+3% 영구', rarity: 'epic' },
  { id: 'divine_pillow', name: '신성한 베개', icon: '🛏️✨', effect: '신의 꿈 확률 2배', rarity: 'legendary' },
  { id: 'eternity_hourglass', name: '영원의 모래시계', icon: '⏳✨', effect: '꿈 지속시간 2배', rarity: 'legendary' },
];

function enterDream(player, mercId, dreamType) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  const dream = DREAM_TYPES.find(d => d.id === dreamType);
  if (!dream) return { ok: false, reason: '알 수 없는 꿈' };
  if (dream.reqFaith && (!player.godFaction || player.godFaction.faith < dream.reqFaith)) {
    return { ok: false, reason: `신앙 ${dream.reqFaith} 필요` };
  }

  // 랜덤 이벤트 결정
  const events = DREAM_EVENTS.filter(e => Math.random() < e.chance);

  player.activeDream = { mercId, dreamType, events, startTime: Date.now() };
  return { ok: true, dream, events: events.map(e => e.name), merc: merc.name };
}

function register(io, socket, player) {
  socket.on('dream_world_info', () => {
    socket.emit('dream_world_info', { dreams: DREAM_TYPES, events: DREAM_EVENTS, items: DREAM_ITEMS });
  });
  socket.on('dream_world_enter', (data) => {
    const result = enterDream(player, data.mercId, data.dreamType);
    socket.emit('dream_world_enter_result', result);
    if (result.ok) io.emit('server_msg', `💭 [꿈의 세계] ${player.name}의 ${result.merc}이(가) 꿈속으로...`);
  });
}

module.exports = { DREAM_TYPES, DREAM_EVENTS, DREAM_ITEMS, enterDream, register };

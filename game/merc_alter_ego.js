// v6.7 — 용병 이면(Alter Ego) 시스템
// 모든 용병에게 숨겨진 이면(어둠/빛) 존재, 각성 시 전혀 다른 능력

const ALTER_TYPES = {
  dark: { name: '어둠의 이면', icon: '🌑👤', statShift: { atk: 1.3, def: 0.8 }, element: 'dark',
    skills: ['어둠 폭주(ATK×2, 10초, 이후 기절 3초)', '그림자 분열(분신 3체)', '생명 착취(DMG의 50% 흡혈)'],
    trigger: '절망 감정 + HP 20% 이하', lore: '내면의 어둠이 폭주한다' },
  light: { name: '빛의 이면', icon: '✨👤', statShift: { def: 1.3, healPow: 1.5 }, element: 'holy',
    skills: ['천상 보호막(팀 전체 5초 무적)', '정화의 빛(적 디버프 전부 제거+힐)', '성스러운 심판(약한 적 즉사)'],
    trigger: '영감 감정 + 아군 2명 이상 HP 30% 이하', lore: '내면의 빛이 각성한다' },
  chaos: { name: '혼돈의 이면', icon: '🌀👤', statShift: { allStat: 1.15 }, element: 'chaos',
    skills: ['혼돈 변이(매 초 랜덤 스킬)', '현실 왜곡(적 조작 반전 5초)', '차원 붕괴(범위 HP 30%)'],
    trigger: '광폭 감정 + 3회 이상 감정 변화', lore: '이성의 경계가 무너진다', hidden: true },
  primal: { name: '원초의 이면', icon: '🐾👤', statShift: { atk: 1.2, spd: 1.4, def: 0.7 }, element: 'nature',
    skills: ['야수 본능(공속 3배 5초)', '포식(킬 시 HP 30% 회복)', '포효(적 전원 공포 3초)'],
    trigger: '분노 감정 + 야수/드래곤 계열', lore: '인간을 벗어던지고 야수가 된다' },
};

// 이면 성장 (이면 사용 횟수에 따라)
const ALTER_MASTERY = [
  { uses: 1, name: '첫 각성', bonus: { duration: 15 }, desc: '이면 지속 15초' },
  { uses: 5, name: '적응', bonus: { duration: 20, statBoost: 1.05 }, desc: '20초+스탯 보정' },
  { uses: 15, name: '공존', bonus: { duration: 30, statBoost: 1.1 }, desc: '30초+부작용 감소' },
  { uses: 30, name: '지배', bonus: { duration: 45, statBoost: 1.15, noSideEffect: true }, desc: '45초+부작용 없음!' },
  { uses: 50, name: '완전 통합', bonus: { permanent: true, statBoost: 1.2 }, desc: '영구 이면 유지 가능!', title: '이면의 지배자' },
];

// 이면 충돌 (팀 내 어둠+빛 이면 동시 발동)
const ALTER_CONFLICTS = [
  { types: ['dark', 'light'], result: '빛과 어둠의 폭발! 양측 이면 해제+범위 DMG', name: '충돌' },
  { types: ['chaos', 'any'], result: '혼돈 전파! 주변 아군도 랜덤 이면 각성', name: '혼돈 전파' },
  { types: ['dark', 'primal'], result: '마수화! 어둠+야수 융합 초강력 형태', name: '마수', fusion: true },
  { types: ['light', 'primal'], result: '신수화! 빛+야수 융합 성스러운 형태', name: '신수', fusion: true },
];

// 이면 대화 (이면 상태에서의 대사)
const ALTER_DIALOGUE = {
  dark: ['...파괴해야 해.', '어둠이... 나를 부른다.', '모든 것을 삼키겠다.'],
  light: ['모두를 지키겠습니다.', '빛이여, 인도하소서.', '아직 끝나지 않았다!'],
  chaos: ['ㅋㅋㅋ 규칙? 없어!', '뭐가 뭔지 모르겠다!', '재미있군!'],
  primal: ['으르르르...', '먹이... 냄새가 난다.', '야아아아!!'],
};

function triggerAlterEgo(merc, alterType) {
  const alter = ALTER_TYPES[alterType];
  if (!alter) return { ok: false, reason: '알 수 없는 이면' };
  merc.alterUses = (merc.alterUses || 0) + 1;
  const mastery = [...ALTER_MASTERY].reverse().find(m => merc.alterUses >= m.uses);
  merc.activeAlter = { type: alterType, startTime: Date.now(), duration: mastery?.bonus?.duration || 15, mastery };
  const dialogue = ALTER_DIALOGUE[alterType]?.[Math.floor(Math.random() * 3)] || '...';
  return { ok: true, alter, mastery, dialogue };
}

function register(io, socket, player) {
  socket.on('alter_ego_info', () => {
    socket.emit('alter_ego_info', { types: ALTER_TYPES, mastery: ALTER_MASTERY, conflicts: ALTER_CONFLICTS });
  });
  socket.on('alter_ego_trigger', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('alter_result', { ok: false });
    const result = triggerAlterEgo(merc, data.alterType);
    socket.emit('alter_result', result);
    if (result.ok) io.emit('server_msg', `${ALTER_TYPES[data.alterType]?.icon} [이면 각성] ${merc.name}의 이면이 깨어났다! "${result.dialogue}"`);
  });
}

module.exports = { ALTER_TYPES, ALTER_MASTERY, ALTER_CONFLICTS, ALTER_DIALOGUE, triggerAlterEgo, register };

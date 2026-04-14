// v6.8 — 피의 맹약 시스템
// 용병끼리 피로 맹세, 배신 시 저주, 극한 시너지

const PACT_TYPES = [
  { id: 'brotherhood', name: '형제의 맹약', icon: '🩸🤝', participants: 2, bonus: { teamAtk: 1.15, teamDef: 1.15 },
    oath: '생사를 함께한다', betrayalCurse: { allStat: 0.8, duration: 7 }, desc: '전투 시너지 극대화' },
  { id: 'eternal_love', name: '영원한 사랑의 맹약', icon: '🩸❤️', participants: 2, bonus: { healMul: 1.5, revive: true },
    oath: '죽음이 우리를 갈라놓을 때까지', betrayalCurse: { heartbreak: true, duration: 14 }, desc: '결혼 상위 버전, 파기 불가능급' },
  { id: 'war_pact', name: '전쟁의 맹약', icon: '🩸⚔️', participants: 4, bonus: { teamAtk: 1.2, siegeBonus: 1.15 },
    oath: '승리할 때까지 칼을 놓지 않는다', betrayalCurse: { pkTarget: true, duration: 3 }, desc: '4인 전투 동맹' },
  { id: 'death_pact', name: '죽음의 맹약', icon: '🩸💀', participants: 2, bonus: { atk: 1.3, linkedDeath: true },
    oath: '한 명이 죽으면 모두 죽는다', betrayalCurse: { instantDeath: true }, desc: 'HP 공유! 한 명 죽으면 전원 사망!', extreme: true },
  { id: 'soul_pact', name: '영혼의 맹약', icon: '🩸🌟', participants: 2, bonus: { allStat: 1.1, sharedExp: true, soulMerge: true },
    oath: '영혼을 하나로', betrayalCurse: { soulSplit: true, allStat: 0.7, duration: 30 }, desc: '최상위 맹약, 영혼 합체 가능!', legendary: true },
];

// 맹약 의식 (필요 재료)
const PACT_RITUAL = {
  cost: 10000,
  items: ['피의 결정 ×1', '맹세의 서 ×1'],
  time: 30, // 30초 의식
  cancelWindow: 10, // 마지막 10초 내 취소 가능
  desc: '되돌릴 수 없는 의식. 신중하게.',
};

// 배신 시스템
const BETRAYAL = {
  methods: [
    { id: 'leave_party', name: '파티 이탈', karma: -20, desc: '전투 중 파티 탈퇴' },
    { id: 'attack_ally', name: '아군 공격', karma: -50, desc: '맹약 동료 직접 공격!' },
    { id: 'steal', name: '전리품 도둑', karma: -30, desc: '공유 전리품 독점' },
    { id: 'info_leak', name: '정보 누설', karma: -40, desc: '적에게 동료 정보 전달' },
  ],
  curseActivation: '배신 감지 즉시 저주 발동! 서버 전체 공지!',
};

// 맹약 성장 (시간 경과에 따라 보너스 증가)
const PACT_GROWTH = [
  { days: 1, name: '신선한 맹약', bonusMul: 1.0 },
  { days: 7, name: '굳건한 맹약', bonusMul: 1.2 },
  { days: 30, name: '깊은 맹약', bonusMul: 1.5 },
  { days: 90, name: '불멸의 맹약', bonusMul: 2.0, title: '불멸의 동맹' },
];

function createPact(player, pactType, partnerIds) {
  const pact = PACT_TYPES.find(p => p.id === pactType);
  if (!pact) return { ok: false, reason: '알 수 없는 맹약' };
  if ((player.gold || 0) < PACT_RITUAL.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= PACT_RITUAL.cost;
  player.bloodPacts = player.bloodPacts || [];
  player.bloodPacts.push({ type: pactType, partners: partnerIds, created: Date.now(), active: true });
  return { ok: true, pact, partners: partnerIds };
}

function register(io, socket, player) {
  socket.on('blood_pact_info', () => {
    socket.emit('blood_pact_info', { pacts: PACT_TYPES, ritual: PACT_RITUAL, betrayal: BETRAYAL, growth: PACT_GROWTH, myPacts: player.bloodPacts || [] });
  });
  socket.on('blood_pact_create', (data) => {
    const result = createPact(player, data.pactType, data.partnerIds || []);
    socket.emit('blood_pact_result', result);
    if (result.ok) io.emit('server_msg', `🩸 [피의 맹약] ${player.name}이(가) "${result.pact.name}" 의식 완료! "${result.pact.oath}"`);
  });
}

module.exports = { PACT_TYPES, PACT_RITUAL, BETRAYAL, PACT_GROWTH, createPact, register };

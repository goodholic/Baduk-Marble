// v5.4 — 영지 외교 시스템
// 영지 간 무역 협정, 불가침, 종속, 전쟁 선포 등 문명급 외교

const RELATION_TYPES = {
  war:       { name: '전쟁', icon: '⚔️', tradeMul: 0, raidAllowed: true, desc: '전면 전쟁 상태' },
  hostile:   { name: '적대', icon: '😡', tradeMul: 0.3, raidAllowed: true, desc: '적대적, 약탈 가능' },
  neutral:   { name: '중립', icon: '😐', tradeMul: 0.7, raidAllowed: false, desc: '기본 관계' },
  friendly:  { name: '우호', icon: '😊', tradeMul: 1.0, raidAllowed: false, desc: '우호적 관계' },
  allied:    { name: '동맹', icon: '🤝', tradeMul: 1.3, raidAllowed: false, desc: '군사+경제 동맹' },
  vassal:    { name: '종속', icon: '🧎', tradeMul: 1.0, tributeRate: 0.2, desc: '상위 영주에게 조공' },
  federation:{ name: '연방', icon: '🏛️', tradeMul: 1.5, raidAllowed: false, desc: '최상위 동맹, 의회제' },
};

// 외교 포인트 (우호도)
const DIPLOMACY_ACTIONS = [
  { id: 'send_gift', name: '선물 외교', cost: 5000, relation: 5, desc: '상대에게 선물 보내기' },
  { id: 'trade_deal', name: '무역 협정', cost: 10000, relation: 10, desc: '무역 루트 개방' },
  { id: 'joint_exercise', name: '합동 훈련', cost: 8000, relation: 8, desc: '군사 합동 훈련' },
  { id: 'spy', name: '첩보', cost: 15000, relation: -20, desc: '적대적 행위' },
  { id: 'embargo', name: '무역 봉쇄', cost: 5000, relation: -15, desc: '경제적 압박' },
  { id: 'insult', name: '모욕', cost: 0, relation: -30, desc: '외교적 모욕' },
  { id: 'royal_visit', name: '국빈 방문', cost: 30000, relation: 20, desc: '최고급 외교' },
  { id: 'hostage_exchange', name: '인질 교환', cost: 0, relation: 15, desc: '용병 1명 임시 교환', special: true },
];

// 조약 시스템
const TREATIES = [
  { id: 'non_aggression', name: '불가침 조약', duration: 7, breakPenalty: -50, desc: '7일간 공격 불가' },
  { id: 'trade_agreement', name: '무역 협정', duration: 14, breakPenalty: -30, bonus: { tradeMul: 1.2 }, desc: '양측 무역 +20%' },
  { id: 'mutual_defense', name: '상호 방위', duration: 30, breakPenalty: -80, bonus: { defBonus: 1.1 }, desc: '공격 시 자동 참전' },
  { id: 'research_sharing', name: '연구 공유', duration: 14, breakPenalty: -20, bonus: { researchSpd: 1.15 }, desc: '연구 속도 +15%' },
  { id: 'tribute_treaty', name: '조공 조약', duration: 30, breakPenalty: -60, desc: '약자가 강자에게 골드 조공' },
];

// 전쟁 선포 조건/결과
const WAR_RULES = {
  declare_cost: 50000,
  declare_cooldown: 3, // 3일 쿨다운
  surrender_cost: '영토 1개 + 골드 50%',
  victory_reward: '영토 1개 획득 + 승전 칭호',
  ceasefire_cost: 30000,
};

function register(io, socket, player) {
  socket.on('diplomacy_info', () => {
    socket.emit('diplomacy_info', {
      relations: RELATION_TYPES, actions: DIPLOMACY_ACTIONS,
      treaties: TREATIES, warRules: WAR_RULES,
    });
  });
  socket.on('diplomacy_action', (data) => {
    const action = DIPLOMACY_ACTIONS.find(a => a.id === data.actionId);
    if (!action) return socket.emit('diplomacy_result', { ok: false });
    if ((player.gold || 0) < (action.cost || 0)) return socket.emit('diplomacy_result', { ok: false, reason: '골드 부족' });
    player.gold -= action.cost || 0;
    socket.emit('diplomacy_result', { ok: true, action: action.name, relationDelta: action.relation });
    if (action.relation < -20) {
      io.emit('server_msg', `⚠️ [외교] ${player.name}이(가) 적대적 외교 행동! (${action.name})`);
    }
  });
}

module.exports = { RELATION_TYPES, DIPLOMACY_ACTIONS, TREATIES, WAR_RULES, register };

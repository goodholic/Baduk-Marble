// v5.4 — 공성전 동맹 전쟁 시스템
// 복수 길드가 연합하여 대규모 공성, 배신/밀약/외교 시스템

const MAX_ALLIANCE_SIZE = 3; // 최대 3길드 연합

const ALLIANCE_TYPES = {
  military:  { name: '군사 동맹', icon: '⚔️🤝', bonus: { teamAtk: 1.1, teamDef: 1.1 }, desc: '전투력 공유, 공성전 합동', betrayalPenalty: 'severe' },
  economic:  { name: '경제 동맹', icon: '💰🤝', bonus: { tradeMul: 1.2, taxShare: 0.1 }, desc: '무역 수익 공유', betrayalPenalty: 'moderate' },
  secret:    { name: '밀약', icon: '🤫🤝', bonus: { intelShare: true }, desc: '비밀 동맹, 외부에 공개 안됨', betrayalPenalty: 'none' },
  vassal:    { name: '종속 관계', icon: '👑🧎', bonus: { lordAtk: 1.15, vassalDef: 1.1 }, desc: '강자에게 복종, 보호 받음', betrayalPenalty: 'extreme' },
  non_aggression: { name: '불가침 조약', icon: '✌️', bonus: {}, desc: '서로 공격 안 함', betrayalPenalty: 'light' },
};

// 배신 시스템
const BETRAYAL_EFFECTS = {
  none:     { karma: 0, desc: '밀약은 배신해도 패널티 없음' },
  light:    { karma: -10, desc: '카르마 -10' },
  moderate: { karma: -30, debuff: 'trade -20% (1일)', desc: '카르마 -30 + 무역 페널티' },
  severe:   { karma: -60, debuff: 'all stats -10% (1일)', desc: '카르마 -60 + 스탯 페널티' },
  extreme:  { karma: -100, debuff: 'kingdom income -50% (3일)', desc: '카르마 -100 + 영지 수입 반감' },
};

// 외교 행동
const DIPLOMATIC_ACTIONS = [
  { id: 'propose_alliance', name: '동맹 제안', icon: '🤝', cost: 10000, desc: '상대 길드에 동맹 제안' },
  { id: 'declare_war', name: '선전포고', icon: '⚔️📜', cost: 5000, desc: '적대 선언, 전쟁 시작' },
  { id: 'peace_offer', name: '평화 제안', icon: '🕊️', cost: 20000, desc: '전쟁 중 평화 제안' },
  { id: 'tribute', name: '조공', icon: '💰➡️', cost: 0, desc: '골드를 바쳐 관계 개선' },
  { id: 'spy_infiltrate', name: '간첩 침투', icon: '🕵️', cost: 15000, desc: '적 길드에 간첩 파견' },
  { id: 'betray', name: '배신', icon: '🗡️🤝', cost: 0, desc: '동맹을 깨고 기습!', warning: true },
  { id: 'marriage_alliance', name: '정략 결혼', icon: '💍👑', cost: 50000, desc: '용병 결혼으로 동맹 강화 (파기 불가)', permanent: true },
  { id: 'trade_embargo', name: '무역 봉쇄', icon: '🚫💰', cost: 8000, desc: '적 길드 무역 루트 차단' },
];

// 연합 공성전 특수 규칙
const ALLIANCE_SIEGE_RULES = {
  combined_army: '연합군 합산 최대 30명',
  shared_strategy: '전략 카드 공유 (합산)',
  split_reward: '보상 기여도 비율 분배',
  betrayal_window: '전투 중 배신 가능! (30초 경고 후)',
  commander_vote: '연합 사령관은 투표로 결정',
};

// 전장의 안개 (외교 상태에 따른 정보 가시성)
const FOG_OF_WAR = {
  ally:    { visibility: 1.0, desc: '완전 공개' },
  neutral: { visibility: 0.3, desc: '제한적 정보' },
  enemy:   { visibility: 0.0, desc: '첩보 없으면 안 보임' },
  secret:  { visibility: 0.5, desc: '밀약 동맹, 부분 공개' },
};

function register(io, socket, player) {
  socket.on('alliance_info', () => {
    socket.emit('alliance_info', {
      types: ALLIANCE_TYPES, betrayals: BETRAYAL_EFFECTS,
      actions: DIPLOMATIC_ACTIONS, siegeRules: ALLIANCE_SIEGE_RULES, fog: FOG_OF_WAR,
    });
  });
  socket.on('alliance_action', (data) => {
    const action = DIPLOMATIC_ACTIONS.find(a => a.id === data.actionId);
    if (!action) return socket.emit('alliance_action_result', { ok: false });
    if ((player.gold || 0) < (action.cost || 0)) return socket.emit('alliance_action_result', { ok: false, reason: '골드 부족' });
    player.gold -= action.cost || 0;
    socket.emit('alliance_action_result', { ok: true, action: action.name });
    if (data.actionId === 'betray') {
      io.emit('server_msg', `🗡️🤝 [배신!] ${player.clanName || player.name}이(가) 동맹을 배신했습니다!`);
    } else if (data.actionId === 'declare_war') {
      io.emit('server_msg', `⚔️📜 [선전포고] ${player.clanName || player.name}이(가) 전쟁을 선포했습니다!`);
    }
  });
}

module.exports = { ALLIANCE_TYPES, BETRAYAL_EFFECTS, DIPLOMATIC_ACTIONS, ALLIANCE_SIEGE_RULES, FOG_OF_WAR, register };

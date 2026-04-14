// v6.3 — 용병 계약 시스템 (플레이어 간)
// 다른 플레이어의 용병을 계약, 임시 고용, 보증금, 계약 파기

const CONTRACT_TYPES = {
  rental:    { name: '임대 계약', icon: '📋💰', duration: [3600, 86400, 604800], fee: 'level×500G/시간', desc: '시간제 대여' },
  mission:   { name: '임무 계약', icon: '📋⚔️', duration: null, fee: '성공 시 보상 분배', desc: '특정 임무 수행 후 반환' },
  permanent: { name: '영구 이적', icon: '📋🔄', duration: null, fee: '협상가', desc: '영구히 소유권 이전' },
  exchange:  { name: '교환 계약', icon: '📋🤝', duration: null, fee: '용병 1:1 교환', desc: '용병끼리 맞교환' },
  loan:      { name: '대출 계약', icon: '📋💸', duration: [86400, 604800], fee: '보증금+이자', desc: '보증금 걸고 빌리기' },
};

// 계약 보증 시스템
const GUARANTEE = {
  deposit: '용병 감정가의 150%',
  insurance: { cost: 'deposit×10%', effect: '계약 파기 시 피해 보상' },
  breach_penalty: { breaker: '보증금 몰수', victim: '보증금 수령+위약금' },
};

// 용병 에이전트 (NPC 중개인)
const AGENTS = [
  { id: 'basic_agent', name: '일반 중개인', icon: '🧑‍💼', commission: 0.05, trustLevel: 1, desc: '기본 중개, 수수료 5%' },
  { id: 'elite_agent', name: '엘리트 중개인', icon: '🧑‍💼⭐', commission: 0.08, trustLevel: 2, desc: '빠른 매칭, 보증 보험 포함' },
  { id: 'shadow_agent', name: '그림자 중개인', icon: '🧑‍💼🌑', commission: 0.12, trustLevel: 3, desc: '비밀 거래, 익명 보장, 수배범도 가능' },
  { id: 'royal_agent', name: '왕실 중개인', icon: '🧑‍💼👑', commission: 0.15, trustLevel: 4, desc: '최고급, 분쟁 중재+법적 보호' },
];

// 계약 평판
const REPUTATION = [
  { rep: 0, name: '신입 계약자', bonus: {} },
  { rep: 50, name: '신뢰 계약자', bonus: { feeDiscount: 0.05 } },
  { rep: 150, name: '우수 계약자', bonus: { feeDiscount: 0.10 } },
  { rep: 300, name: '마스터 계약자', bonus: { feeDiscount: 0.15, priorityMatch: true } },
  { rep: 500, name: '전설의 계약자', bonus: { feeDiscount: 0.20, exclusiveAccess: true }, title: true },
];

// 계약 이벤트 (랜덤)
const CONTRACT_EVENTS = [
  { id: 'bidding_war', name: '입찰 전쟁', chance: 0.1, effect: '인기 용병 가격 2배!', desc: '여러 플레이어가 동시 입찰' },
  { id: 'fire_sale', name: '급매!', chance: 0.05, effect: '특정 용병 50% 할인', desc: '급하게 처분하는 용병' },
  { id: 'scam_alert', name: '사기 주의', chance: 0.03, effect: '가짜 계약 출현, 주의!', desc: '검증 필수' },
  { id: 'star_merc', name: '스타 용병', chance: 0.02, effect: '유명 용병 계약 가능!', desc: '서버 TOP10 용병 임대 가능' },
];

function createContract(player, mercId, contractType, targetPlayerId, terms) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  const cType = CONTRACT_TYPES[contractType];
  if (!cType) return { ok: false, reason: '알 수 없는 계약' };

  const contract = {
    id: `ct_${Date.now()}`,
    type: contractType,
    mercId, mercName: merc.name,
    owner: player.id, ownerName: player.name,
    target: targetPlayerId,
    terms: terms || {},
    status: 'pending',
    createdAt: Date.now(),
  };

  player.contracts = player.contracts || [];
  player.contracts.push(contract);
  player.contractRep = (player.contractRep || 0) + 5;
  return { ok: true, contract };
}

function register(io, socket, player) {
  socket.on('contract_info', () => {
    const rep = [...REPUTATION].reverse().find(r => (player.contractRep || 0) >= r.rep);
    socket.emit('contract_info', { types: CONTRACT_TYPES, guarantee: GUARANTEE, agents: AGENTS, reputation: REPUTATION, events: CONTRACT_EVENTS, myRep: rep, contracts: player.contracts || [] });
  });
  socket.on('contract_create', (data) => {
    const result = createContract(player, data.mercId, data.type, data.targetId, data.terms);
    socket.emit('contract_create_result', result);
    if (result.ok) io.emit('server_msg', `📋 [계약] ${player.name}이(가) "${result.contract.mercName}" 계약 등록!`);
  });
}

module.exports = { CONTRACT_TYPES, GUARANTEE, AGENTS, REPUTATION, CONTRACT_EVENTS, createContract, register };

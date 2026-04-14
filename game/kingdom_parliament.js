// v5.9 — 영지 의회 시스템
// 민주주의 정치, 법안 투표, 세금/정책/전쟁 결정, 선거

const ELECTION_CYCLE = 7; // 7일마다 선거

// 의회 직책
const PARLIAMENT_ROLES = [
  { id: 'king', name: '왕', icon: '👑', max: 1, power: ['법안 제출', '거부권 (1회/주)', '전쟁 선포'], desc: '최고 권력자' },
  { id: 'minister', name: '대신', icon: '🎩', max: 3, power: ['법안 제출', '예산 집행'], desc: '왕의 보좌관' },
  { id: 'general', name: '장군', icon: '⚔️🎖️', max: 2, power: ['군사 명령', '징병'], desc: '군사 지휘관' },
  { id: 'treasurer', name: '재무관', icon: '💰📊', max: 1, power: ['세금 조정', '무역 정책'], desc: '경제 담당' },
  { id: 'spymaster', name: '첩보 수장', icon: '🕵️👑', max: 1, power: ['간첩 파견', '반란 진압'], desc: '정보 기관 수장' },
  { id: 'citizen', name: '시민', icon: '🧑', max: 999, power: ['투표권'], desc: '일반 시민' },
];

// 법안 유형
const BILL_TYPES = [
  { id: 'tax_change', name: '세금 변경', icon: '💰📜', effect: '세율 변경', voteReq: 0.5, desc: '과반수 찬성 필요' },
  { id: 'war_declare', name: '전쟁 선포', icon: '⚔️📜', effect: '적 영지에 전쟁', voteReq: 0.6, desc: '60% 찬성 필요' },
  { id: 'peace_treaty', name: '평화 조약', icon: '🕊️📜', effect: '전쟁 종결', voteReq: 0.5, desc: '과반수' },
  { id: 'building_plan', name: '건설 계획', icon: '🏗️📜', effect: '대규모 건설 (골드 집행)', voteReq: 0.5, desc: '예산 승인' },
  { id: 'trade_policy', name: '무역 정책', icon: '🏪📜', effect: '무역 루트 개방/폐쇄', voteReq: 0.5, desc: '무역 방향 결정' },
  { id: 'impeachment', name: '탄핵', icon: '⚖️📜', effect: '왕 해임!', voteReq: 0.75, desc: '75% 찬성 필요, 새 선거' },
  { id: 'festival_bill', name: '축제 법안', icon: '🎉📜', effect: '공식 축제 개최', voteReq: 0.4, desc: '40% 찬성' },
  { id: 'exile', name: '추방', icon: '🚫📜', effect: '특정 플레이어 추방', voteReq: 0.7, desc: '70% 찬성 필요' },
  { id: 'constitution', name: '헌법 개정', icon: '📜👑', effect: '기본 규칙 변경', voteReq: 0.8, desc: '80% 찬성 필요, 최상위 법' },
  { id: 'alliance_vote', name: '동맹 투표', icon: '🤝📜', effect: '동맹 체결/파기', voteReq: 0.6, desc: '60% 찬성' },
];

// 선거 시스템
const ELECTION_RULES = {
  candidateReq: { level: 20, reputation: 100, gold: 10000 },
  campaignDuration: 3, // 3일 선거 운동
  voteDuration: 1, // 1일 투표
  rewards: { winner: { title: true, gold: 50000, power: true }, loser: { gold: 5000 } },
};

// 정치 이벤트
const POLITICAL_EVENTS = [
  { id: 'scandal', name: '스캔들', chance: 0.05, effect: '현 왕 지지율 -30%', desc: '비밀이 폭로되다!' },
  { id: 'golden_age', name: '황금기', chance: 0.08, effect: '전체 생산+30% (3일)', desc: '좋은 정치의 결과' },
  { id: 'rebellion', name: '반란', chance: 0.03, effect: '비밀 결사 봉기 가능', desc: '민심이 폭발!' },
  { id: 'foreign_pressure', name: '외압', chance: 0.06, effect: '외교 선택 강요', desc: '강대 세력의 압력' },
  { id: 'plague_crisis', name: '역병 위기', chance: 0.04, effect: '긴급 예산 필요', desc: '의회 긴급 소집' },
];

function submitBill(player, billType, details) {
  const bill = BILL_TYPES.find(b => b.id === billType);
  if (!bill) return { ok: false, reason: '알 수 없는 법안' };
  const newBill = { id: `bill_${Date.now()}`, type: billType, submitter: player.name, details, votes: { yes: 0, no: 0 }, status: 'voting', created: Date.now() };
  return { ok: true, bill: newBill, voteReq: bill.voteReq };
}

function register(io, socket, player) {
  socket.on('parliament_info', () => {
    socket.emit('parliament_info', { roles: PARLIAMENT_ROLES, bills: BILL_TYPES, election: ELECTION_RULES, events: POLITICAL_EVENTS });
  });
  socket.on('parliament_submit_bill', (data) => {
    const result = submitBill(player, data.billType, data.details);
    socket.emit('parliament_bill_result', result);
    if (result.ok) io.emit('server_msg', `📜 [의회] ${player.name}이(가) "${BILL_TYPES.find(b=>b.id===data.billType)?.name}" 법안 제출!`);
  });
  socket.on('parliament_vote', (data) => {
    socket.emit('parliament_vote_result', { ok: true, vote: data.vote });
  });
}

module.exports = { PARLIAMENT_ROLES, BILL_TYPES, ELECTION_RULES, POLITICAL_EVENTS, submitBill, register };

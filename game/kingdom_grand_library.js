// v7.0 — 대도서관 시스템
// 지식 수집+연구+금서+서버 백과사전, 지식이 힘이 되는 시스템

const KNOWLEDGE_BRANCHES = [
  { id: 'combat', name: '전투학', icon: '⚔️📚', maxLv: 20, effect: 'ATK+1%/Lv', desc: '전투 기술 연구' },
  { id: 'magic', name: '마법학', icon: '🔮📚', maxLv: 20, effect: 'MATK+1%/Lv', desc: '마법 이론 연구' },
  { id: 'defense', name: '방어학', icon: '🛡️📚', maxLv: 20, effect: 'DEF+1%/Lv', desc: '방어 전략 연구' },
  { id: 'economy', name: '경제학', icon: '💰📚', maxLv: 20, effect: '무역+1%/Lv', desc: '경제 이론' },
  { id: 'biology', name: '생물학', icon: '🧬📚', maxLv: 20, effect: '용병 EXP+1%/Lv', desc: '생명체 연구' },
  { id: 'astronomy', name: '천문학', icon: '🌟📚', maxLv: 20, effect: '별자리+1%/Lv', desc: '별과 우주 연구' },
  { id: 'history', name: '역사학', icon: '📜📚', maxLv: 20, effect: '기억궁전+2%/Lv', desc: '과거 연구' },
  { id: 'alchemy', name: '연금술', icon: '⚗️📚', maxLv: 20, effect: '제작+1%/Lv', desc: '변환과 합성' },
  { id: 'forbidden', name: '금서', icon: '📕🔒', maxLv: 10, effect: '금지된 힘 해금', desc: '위험하지만 강력!', hidden: true },
  { id: 'omniscience', name: '전지학', icon: '📚👑', maxLv: 5, effect: '전체+1%/Lv', desc: '모든 학문의 정점', req: { allBranches: 15 }, ultimate: true },
];

// 도서관 시설
const LIBRARY_FACILITIES = [
  { id: 'reading_room', name: '열람실', icon: '📖', cost: 10000, effect: '연구 속도+10%', maxLv: 5 },
  { id: 'forbidden_section', name: '금서 구역', icon: '📕🔒', cost: 50000, effect: '금서 연구 해금', maxLv: 1 },
  { id: 'observatory', name: '천문대', icon: '🔭', cost: 30000, effect: '천문학+별자리 보너스', maxLv: 3 },
  { id: 'lab', name: '실험실', icon: '🧪', cost: 25000, effect: '연금술+생물학 보너스', maxLv: 3 },
  { id: 'archive', name: '기록 보관소', icon: '🗄️', cost: 20000, effect: '역사학+서버 기록 열람', maxLv: 3 },
  { id: 'grand_hall', name: '대강당', icon: '🏛️📚', cost: 100000, effect: '강의 개최 (다른 플레이어 초대)', maxLv: 1, special: true },
];

// 지식 이벤트
const KNOWLEDGE_EVENTS = [
  { id: 'eureka', name: '유레카!', chance: 0.05, effect: '랜덤 학문 +5 레벨!', desc: '갑작스런 깨달음!' },
  { id: 'book_find', name: '고서 발견', chance: 0.08, effect: '희귀 책 발견 → 연구 재료', desc: '먼지 쌓인 고서 속에서' },
  { id: 'forbidden_knowledge', name: '금지된 지식', chance: 0.03, effect: '금서 연구 +1 (위험!)', desc: '손대서는 안 되는 것을...' },
  { id: 'scholar_visit', name: '학자 방문', chance: 0.06, effect: '모든 연구 속도 2배 (1일)', desc: '위대한 학자의 방문' },
  { id: 'library_fire', name: '도서관 화재!', chance: 0.02, effect: '연구 진행도 -10%', desc: '불이야! 책을 살려라!', counter: '소방 시설' },
];

// 서버 백과사전 (플레이어 기여)
const ENCYCLOPEDIA = {
  categories: ['몬스터 도감', '용병 도감', '장비 도감', '지역 도감', '역사 도감', '레시피 도감'],
  contribution: { exp: 100, gold: 500, desc: '항목 1개 기여마다' },
  completion: { bonus: { allStat: 1.05 }, title: '백과사전 편찬자', desc: '전 항목 완성!' },
};

function research(player, branchId) {
  const branch = KNOWLEDGE_BRANCHES.find(b => b.id === branchId);
  if (!branch) return { ok: false, reason: '알 수 없는 학문' };
  const knowledge = player.knowledge = player.knowledge || {};
  const current = knowledge[branchId] || 0;
  if (current >= branch.maxLv) return { ok: false, reason: '최대 레벨' };
  const cost = (current + 1) * 2000;
  if ((player.gold || 0) < cost) return { ok: false, reason: `골드 부족 (${cost}G)` };
  player.gold -= cost;
  knowledge[branchId] = current + 1;
  return { ok: true, branch: branch.name, level: current + 1 };
}

function register(io, socket, player) {
  socket.on('library_info', () => {
    socket.emit('library_info', { branches: KNOWLEDGE_BRANCHES, facilities: LIBRARY_FACILITIES, events: KNOWLEDGE_EVENTS, encyclopedia: ENCYCLOPEDIA, knowledge: player.knowledge || {} });
  });
  socket.on('library_research', (data) => {
    const result = research(player, data.branchId);
    socket.emit('library_research_result', result);
    if (result.ok && result.level >= 15) io.emit('server_msg', `📚🌟 [대도서관] ${player.name}의 "${result.branch}" Lv.${result.level}!`);
  });
}

module.exports = { KNOWLEDGE_BRANCHES, LIBRARY_FACILITIES, KNOWLEDGE_EVENTS, ENCYCLOPEDIA, research, register };

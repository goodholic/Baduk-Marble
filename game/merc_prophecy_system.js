// v6.3 — 예언 시스템
// 서버 전체에 영향을 미치는 예언, 플레이어가 예언 성취/저지 선택

const PROPHECY_DURATION = 7; // 7일간 유효

const PROPHECIES = [
  { id: 'dragon_awakening', name: '용의 각성', icon: '🐲🔮', type: 'catastrophe',
    prediction: '7일 후 고대의 용이 깨어나 세계를 불태울 것이다',
    fulfill: { effect: '서버 전체 보스 이벤트 발생, 보상 3배', condition: '아무도 막지 않으면' },
    prevent: { effect: '예방 성공 시 서버 전체 DEF+10% (1주)', condition: '용의 봉인석 5개 수집' },
    reward: { fulfiller: { gold: 100000, title: '예언의 실행자' }, preventer: { gold: 80000, title: '예언 저지자' } } },
  { id: 'golden_age', name: '황금기의 도래', icon: '👑🔮', type: 'blessing',
    prediction: '위대한 상인이 나타나 황금기를 열 것이다',
    fulfill: { effect: '서버 전체 골드 생산 2배 (3일)', condition: '한 플레이어가 무역 1위 달성' },
    prevent: { effect: '독점 방지, 전원 무역 수익+30% (3일)', condition: '3명 이상 무역 TOP10 진입' },
    reward: { fulfiller: { gold: 200000, title: '황금기의 주역' }, preventer: { gold: 100000, title: '공정한 중재자' } } },
  { id: 'dark_eclipse', name: '어둠의 일식', icon: '🌑🔮', type: 'catastrophe',
    prediction: '어둠이 세계를 뒤덮어 빛이 사라질 것이다',
    fulfill: { effect: '3일간 야간 고정, 암속성 DMG 2배', condition: '자연 발생' },
    prevent: { effect: '성광 발동, 성속성+30% (3일)', condition: '6신 중 오로라 진영 기도 1000회' },
    reward: { fulfiller: { gold: 50000, item: 'dark_eye' }, preventer: { gold: 120000, item: 'light_crown' } } },
  { id: 'hero_birth', name: '영웅의 탄생', icon: '🦸🔮', type: 'blessing',
    prediction: '전설의 용병이 세상에 나타날 것이다',
    fulfill: { effect: '서버 전체 히든 용병 출현율 3배 (3일)', condition: '업적 300개+ 플레이어 등장' },
    prevent: { effect: '없음 (축복이므로 방해 불가)', condition: '없음' },
    reward: { fulfiller: { gold: 150000, merc: 'prophecy_hero' } } },
  { id: 'great_war', name: '대전쟁', icon: '⚔️🔮', type: 'conflict',
    prediction: '두 거대 세력이 충돌하여 대전쟁이 시작될 것이다',
    fulfill: { effect: '서버 전체 PvP DMG+30%, 영토전 보상 2배 (3일)', condition: '2개 이상 길드 전쟁 중' },
    prevent: { effect: '평화 조약 자동 체결, 외교 비용-50% (3일)', condition: '활성 전쟁 전부 종료' },
    reward: { fulfiller: { gold: 80000, title: '전쟁 촉발자' }, preventer: { gold: 150000, title: '평화의 수호자' } } },
  { id: 'dimensional_tear', name: '차원의 균열', icon: '🌀🔮', type: 'catastrophe',
    prediction: '차원의 벽이 찢어져 미지의 존재가 쏟아져 나올 것이다',
    fulfill: { effect: '차원 보스 3체 동시 출현! 보상 5배', condition: '자연 발생' },
    prevent: { effect: '차원 봉인, 차원 던전 보상+50% (3일)', condition: '차원 봉인석 10개 수집' },
    reward: { fulfiller: { gold: 200000, item: 'rift_essence_x5' }, preventer: { gold: 100000, item: 'seal_stone' } } },
  { id: 'plague_spread', name: '역병의 확산', icon: '☠️🔮', type: 'catastrophe',
    prediction: '치명적인 역병이 대륙을 휩쓸 것이다',
    fulfill: { effect: '3일간 HP 재생-50%, 치유 약초 가격 5배', condition: '자연 발생' },
    prevent: { effect: '면역, 서버 전체 HP 재생+30% (3일)', condition: '힐러 클래스 100명 동시 치유 이벤트' },
    reward: { fulfiller: { gold: 30000 }, preventer: { gold: 180000, title: '역병 정복자' } } },
  { id: 'celestial_alignment', name: '천체 정렬', icon: '🌟🔮', type: 'miracle',
    prediction: '별들이 일렬로 정렬되어 기적이 일어날 것이다',
    fulfill: { effect: '서버 전체 전스탯+10%, 별자리 효과 3배 (1일)', condition: '예언 당일 자동 발생' },
    prevent: { effect: '없음 (기적이므로 방해 불가)', condition: '없음' },
    reward: { fulfiller: { gold: 100000, item: 'star_blessing' } } },
];

// 예언자 시스템 (예언을 볼 수 있는 플레이어)
const PROPHET_RANKS = [
  { rank: 1, name: '점쟁이', icon: '🔮', seeCount: 1, accuracy: 0.5, desc: '예언 1개만 볼 수 있음 (50% 정확도)' },
  { rank: 2, name: '예언자', icon: '🔮⭐', seeCount: 2, accuracy: 0.7, desc: '2개, 70% 정확' },
  { rank: 3, name: '대예언자', icon: '🔮🌟', seeCount: 3, accuracy: 0.9, desc: '3개, 90% 정확' },
  { rank: 4, name: '신탁자', icon: '🔮👑', seeCount: 5, accuracy: 1.0, desc: '전부 공개, 100% 정확 + 예언 조작 가능!' },
];

// 예언 보드 (서버 공개)
function generateWeeklyProphecy() {
  const pool = [...PROPHECIES];
  const count = 2 + Math.floor(Math.random() * 2); // 2~3개
  const selected = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push({ ...pool.splice(idx, 1)[0], startDate: Date.now(), endDate: Date.now() + PROPHECY_DURATION * 86400000, status: 'active' });
  }
  return selected;
}

function register(io, socket, player) {
  socket.on('prophecy_info', () => {
    const rank = PROPHET_RANKS.filter(r => (player.prophetRank || 1) >= r.rank).pop();
    socket.emit('prophecy_info', { prophecies: PROPHECIES, ranks: PROPHET_RANKS, myRank: rank });
  });
  socket.on('prophecy_weekly', () => {
    socket.emit('prophecy_weekly', generateWeeklyProphecy());
  });
  socket.on('prophecy_act', (data) => {
    socket.emit('prophecy_act_result', { ok: true, action: data.action, prophecyId: data.prophecyId });
    io.emit('server_msg', `🔮 [예언] ${player.name}이(가) 예언 "${PROPHECIES.find(p=>p.id===data.prophecyId)?.name}"에 ${data.action === 'fulfill' ? '성취' : '저지'}를 시도!`);
  });
}

module.exports = { PROPHECIES, PROPHET_RANKS, PROPHECY_DURATION, generateWeeklyProphecy, register };

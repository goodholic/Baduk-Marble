// v6.4 — 용병 내면 세계 시스템
// 용병의 마음속으로 진입, 감정 퍼즐+전투, 잠재력 해방

const INNER_REALMS = [
  { id: 'courage', name: '용기의 방', icon: '🦁💛', emotion: 'rage', challenge: '두려움을 극복하는 전투', reward: { atk: 1.08, skill: '불굴의 함성' }, desc: '내면의 두려움과 싸운다' },
  { id: 'wisdom', name: '지혜의 방', icon: '🦉💙', emotion: 'calm', challenge: '논리 퍼즐 5단계', reward: { matk: 1.08, cdReduce: 0.9 }, desc: '마음의 혼란을 정리한다' },
  { id: 'love', name: '사랑의 방', icon: '❤️💗', emotion: 'joy', challenge: '소중한 기억 보호 전투', reward: { healPow: 1.1, teamBuff: 1.05 }, desc: '사랑하는 이를 지키는 힘' },
  { id: 'shadow', name: '그림자의 방', icon: '🌑👤', emotion: 'fear', challenge: '자신의 어둠 면과 대결', reward: { crit: 1.1, stealth: 2 }, desc: '인정하지 못한 자신과 마주한다' },
  { id: 'fury', name: '분노의 방', icon: '🔥👹', emotion: 'berserk', challenge: '분노를 제어하는 시련', reward: { atk: 1.12, berserkerControl: true }, desc: '폭주하는 분노를 길들인다' },
  { id: 'void', name: '공허의 방', icon: '🌀💜', emotion: 'despair', challenge: '무(無)에서 의미 찾기', reward: { allStat: 1.05, voidResist: true }, desc: '절망 속에서 빛을 찾는다' },
  { id: 'origin', name: '근원의 방', icon: '🌟👑', emotion: 'inspired', challenge: '전 감정 통합 시련', reward: { allStat: 1.1, innerPeace: true, title: '완전한 존재' }, desc: '모든 감정을 하나로 통합', final: true },
];

// 내면 퍼즐 유형
const INNER_PUZZLES = [
  { id: 'emotion_sort', name: '감정 정렬', desc: '뒤섞인 감정을 올바른 순서로', difficulty: 3 },
  { id: 'memory_match', name: '기억 맞추기', desc: '과거의 장면을 정확히 재현', difficulty: 4 },
  { id: 'shadow_chase', name: '그림자 추격', desc: '도망치는 그림자를 잡아라', difficulty: 5 },
  { id: 'balance_beam', name: '균형 잡기', desc: '감정의 천칭 균형 맞추기', difficulty: 6 },
  { id: 'void_navigation', name: '공허 항해', desc: '아무것도 없는 곳에서 길 찾기', difficulty: 8 },
  { id: 'origin_trial', name: '근원의 시련', desc: '전 퍼즐 동시 수행!', difficulty: 10, final: true },
];

// 잠재력 해방 (내면 클리어 시 영구 보너스)
const POTENTIAL_UNLOCKS = [
  { realmsCleared: 1, name: '자각', bonus: { exp: 1.05 }, desc: '자신을 알기 시작' },
  { realmsCleared: 3, name: '성장', bonus: { allStat: 1.03 }, desc: '내면의 성장' },
  { realmsCleared: 5, name: '깨달음', bonus: { allStat: 1.06 }, desc: '깊은 깨달음' },
  { realmsCleared: 7, name: '완전체', bonus: { allStat: 1.1, innerPeace: true }, desc: '완벽한 내면의 조화', title: '완전한 존재' },
];

// 내면 세계 이벤트
const INNER_EVENTS = [
  { id: 'memory_flash', name: '기억 섬광', chance: 0.15, effect: '과거 스킬 1개 사용 가능 (1전투)', desc: '잊었던 기억이 되살아난다' },
  { id: 'dark_temptation', name: '어둠의 유혹', chance: 0.1, effect: '수락 시 ATK+30% 하지만 친밀도-20', desc: '어둠이 힘을 속삭인다' },
  { id: 'inner_ally', name: '내면의 동맹', chance: 0.08, effect: '내면 분신이 1전투 동안 도움', desc: '진정한 자아가 함께 싸운다' },
  { id: 'emotional_storm', name: '감정 폭풍', chance: 0.05, effect: '랜덤 감정 3개 동시 발동!', desc: '감정이 폭주한다!' },
];

function enterInnerWorld(player, mercId, realmId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  const realm = INNER_REALMS.find(r => r.id === realmId);
  if (!realm) return { ok: false, reason: '알 수 없는 내면 세계' };
  if (realm.final && (merc.innerRealmsCleared || 0) < 6) return { ok: false, reason: '근원의 방: 6개 방 클리어 필요' };
  const event = INNER_EVENTS.find(e => Math.random() < e.chance);
  player.activeInnerWorld = { mercId, realmId, event, startTime: Date.now() };
  return { ok: true, realm, event, merc: merc.name };
}

function register(io, socket, player) {
  socket.on('inner_world_info', () => {
    socket.emit('inner_world_info', { realms: INNER_REALMS, puzzles: INNER_PUZZLES, potential: POTENTIAL_UNLOCKS, events: INNER_EVENTS });
  });
  socket.on('inner_world_enter', (data) => {
    const result = enterInnerWorld(player, data.mercId, data.realmId);
    socket.emit('inner_world_result', result);
    if (result.ok) io.emit('server_msg', `🌟 [내면 세계] ${player.name}의 ${result.merc}이(가) 내면 세계로...`);
  });
}

module.exports = { INNER_REALMS, INNER_PUZZLES, POTENTIAL_UNLOCKS, INNER_EVENTS, enterInnerWorld, register };

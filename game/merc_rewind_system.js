// v6.7 — 되감기(Rewind) 시스템
// 전투 중 시간을 되감아 실수 복구, 전략적 활용, 제한 횟수

const MAX_REWINDS_PER_MATCH = 2;
const REWIND_DURATION = 5; // 5초 되감기
const REWIND_COOLDOWN = 60; // 1분

const REWIND_EFFECTS = [
  { id: 'hp_restore', name: 'HP 복구', icon: '❤️⏪', desc: '5초 전 HP로 복구', priority: 1 },
  { id: 'position_restore', name: '위치 복구', icon: '📍⏪', desc: '5초 전 위치로 복귀', priority: 2 },
  { id: 'skill_reset', name: '스킬 리셋', icon: '🔮⏪', desc: '5초 전 스킬 쿨다운 복구', priority: 3 },
  { id: 'item_restore', name: '아이템 복구', icon: '📦⏪', desc: '5초 전 사용한 아이템 복구', priority: 4 },
  { id: 'death_rewind', name: '죽음 되감기', icon: '💀⏪', desc: '사망 직전으로 되감기! (HP 30%로 부활)', priority: 5, ultimate: true },
];

// 되감기 레벨 (사용 횟수에 따라 강화)
const REWIND_MASTERY = [
  { uses: 0, name: '초보', rewindTime: 3, maxPerMatch: 1, desc: '3초 되감기, 1회' },
  { uses: 10, name: '숙련', rewindTime: 5, maxPerMatch: 2, desc: '5초, 2회' },
  { uses: 30, name: '달인', rewindTime: 7, maxPerMatch: 2, desc: '7초, 2회' },
  { uses: 60, name: '마스터', rewindTime: 10, maxPerMatch: 3, desc: '10초!, 3회' },
  { uses: 100, name: '시간의 지배자', rewindTime: 15, maxPerMatch: 3, desc: '15초!, 3회 + 팀원 1명 되감기 가능!', teamRewind: true, title: true },
];

// 되감기 카운터 (적이 되감기를 방해)
const REWIND_COUNTERS = [
  { id: 'time_lock', name: '시간 고정', icon: '🔒⏰', desc: '대상의 되감기 봉인 30초', cost: 5000 },
  { id: 'paradox_bomb', name: '패러독스 폭탄', icon: '💣🌀', desc: '되감기 시 역으로 DMG 2배!', cost: 10000 },
  { id: 'chrono_shield', name: '시간 보호막', icon: '🛡️⏰', desc: '되감기 효과 무효화', cost: 3000 },
];

// 되감기 시각 효과
const REWIND_VISUALS = {
  screen: '화면 역재생 효과 (VHS 필름)',
  particles: '시간 파편 입자',
  sound: '시계 역회전 사운드',
  color: '세피아 톤 전환',
};

function useRewind(player, mercId, rewindType) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  player.rewindUses = (player.rewindUses || 0) + 1;
  const mastery = [...REWIND_MASTERY].reverse().find(m => player.rewindUses >= m.uses);
  const effect = REWIND_EFFECTS.find(e => e.id === rewindType);
  if (!effect) return { ok: false, reason: '알 수 없는 되감기' };
  return { ok: true, effect, mastery, rewindTime: mastery?.rewindTime || 3 };
}

function register(io, socket, player) {
  socket.on('rewind_info', () => {
    const mastery = [...REWIND_MASTERY].reverse().find(m => (player.rewindUses || 0) >= m.uses);
    socket.emit('rewind_info', { effects: REWIND_EFFECTS, mastery: REWIND_MASTERY, counters: REWIND_COUNTERS, visuals: REWIND_VISUALS, myMastery: mastery, uses: player.rewindUses || 0 });
  });
  socket.on('rewind_use', (data) => {
    const result = useRewind(player, data.mercId, data.rewindType);
    socket.emit('rewind_result', result);
    if (result.ok) io.emit('server_msg', `⏪ [되감기] ${player.name}이(가) 시간을 ${result.rewindTime}초 되감았다!`);
  });
}

module.exports = { REWIND_EFFECTS, REWIND_MASTERY, REWIND_COUNTERS, REWIND_VISUALS, MAX_REWINDS_PER_MATCH, useRewind, register };

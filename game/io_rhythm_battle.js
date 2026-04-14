// v6.4 — IO 리듬 전투 모드
// 음악에 맞춰 타이밍 공격! 리듬게임+IO 전투 하이브리드

const SONGS = [
  { id: 'battle_march', name: '전투 행진곡', icon: '🎵⚔️', bpm: 120, difficulty: 2, duration: 120, buff: { atk: 1.1 } },
  { id: 'fire_dance', name: '화염의 춤', icon: '🎵🔥', bpm: 140, difficulty: 4, duration: 150, buff: { fireDmg: 1.3 } },
  { id: 'storm_symphony', name: '폭풍 교향곡', icon: '🎵⛈️', bpm: 160, difficulty: 6, duration: 180, buff: { spd: 1.2, critDmg: 1.2 } },
  { id: 'death_waltz', name: '죽음의 왈츠', icon: '🎵💀', bpm: 180, difficulty: 8, duration: 200, buff: { atk: 1.3, def: 0.8 } },
  { id: 'god_requiem', name: '신들의 레퀴엠', icon: '🎵👑', bpm: 200, difficulty: 10, duration: 240, buff: { allStat: 1.15 }, legendary: true },
];

// 판정 등급 (타이밍 정확도)
const JUDGMENTS = {
  perfect: { window: 0.05, scoreMul: 1.0, dmgMul: 2.0, heal: 0.02, icon: '✨', desc: '완벽!' },
  great:   { window: 0.1,  scoreMul: 0.8, dmgMul: 1.5, heal: 0.01, icon: '👍', desc: '좋아!' },
  good:    { window: 0.15, scoreMul: 0.5, dmgMul: 1.0, heal: 0, icon: '👌', desc: '보통' },
  miss:    { window: 999,  scoreMul: 0,   dmgMul: 0,   heal: 0, icon: '❌', desc: '미스!', penalty: { selfDmg: 0.03 } },
};

// 콤보 시스템
const COMBO_BONUSES = [
  { combo: 10, name: '10콤보!', bonus: { dmgMul: 1.1 }, icon: '🔥' },
  { combo: 25, name: '25콤보!', bonus: { dmgMul: 1.2, heal: 0.05 }, icon: '🔥🔥' },
  { combo: 50, name: '50콤보!', bonus: { dmgMul: 1.5, teamBuff: 1.05 }, icon: '🔥🔥🔥' },
  { combo: 100, name: '100콤보!!', bonus: { dmgMul: 2.0, teamBuff: 1.1, ultimate: true }, icon: '💥🎵', desc: '리듬 궁극기 발동!' },
];

// 리듬 궁극기 (100콤보 도달 시)
const RHYTHM_ULTIMATES = {
  warrior: { name: '분노의 드럼솔로', desc: '10초간 전체 ATK+50% + 리듬에 맞춰 자동 범위 공격', icon: '🥁💥' },
  mage:    { name: '마법의 멜로디', desc: '10초간 전체 마법 DMG 2배 + 자동 시전', icon: '🎵🔮' },
  healer:  { name: '생명의 찬가', desc: '아군 전원 HP 100% 회복 + 10초 재생', icon: '🎵💚' },
  assassin:{ name: '암살의 세레나데', desc: '10초간 은신 + 모든 공격 크리 확정', icon: '🎵🗡️' },
  ranger:  { name: '화살의 비트', desc: '10초간 화살 자동 연사 (BPM에 맞춰)', icon: '🎵🏹' },
};

// 보상
const RHYTHM_REWARDS = {
  S_rank: { gold: 30000, exp: 3000, title: '리듬 마스터', desc: '95%+ 정확도' },
  A_rank: { gold: 20000, exp: 2000, desc: '85%+ 정확도' },
  B_rank: { gold: 10000, exp: 1000, desc: '70%+ 정확도' },
  C_rank: { gold: 5000, exp: 500, desc: '50%+ 정확도' },
  full_combo: { gold: 50000, title: '풀 콤보', frame: 'rhythm_god', desc: '미스 0! 전곡 퍼펙트' },
};

function register(io, socket, player) {
  socket.on('rhythm_info', () => {
    socket.emit('rhythm_info', { songs: SONGS, judgments: JUDGMENTS, combos: COMBO_BONUSES, ultimates: RHYTHM_ULTIMATES, rewards: RHYTHM_REWARDS });
  });
  socket.on('rhythm_join', (data) => {
    const song = SONGS.find(s => s.id === data.songId);
    socket.emit('rhythm_join_result', { ok: true, song });
    io.emit('server_msg', `🎵⚔️ [리듬 전투] ${player.name}이(가) "${song?.name}" 리듬 전투 시작!`);
  });
}

module.exports = { SONGS, JUDGMENTS, COMBO_BONUSES, RHYTHM_ULTIMATES, RHYTHM_REWARDS, register };

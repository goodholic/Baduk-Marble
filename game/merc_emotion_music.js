// v6.2 — 감정 음악 시스템
// 용병 감정 상태에 따라 BGM 변경, 감정 음악으로 팀 버프

const EMOTION_TRACKS = {
  calm:     { bgm: '평화로운 선율', icon: '🎵😌', tempo: 'slow', buff: { hpRegen: 0.02 }, desc: '마음이 편안해진다' },
  joy:      { bgm: '축제의 행진곡', icon: '🎵😊', tempo: 'upbeat', buff: { expBonus: 1.15 }, desc: '경험치 획득량 증가' },
  rage:     { bgm: '분노의 전쟁 드럼', icon: '🎵🔥', tempo: 'fast', buff: { atk: 1.1 }, desc: '공격력이 상승한다' },
  sadness:  { bgm: '슬픔의 레퀴엠', icon: '🎵😢', tempo: 'slow', buff: { def: 1.1 }, desc: '방어에 집중하게 된다' },
  fear:     { bgm: '공포의 불협화음', icon: '🎵😨', tempo: 'irregular', buff: { eva: 1.15 }, desc: '본능적 회피 능력 상승' },
  berserk:  { bgm: '광기의 메탈', icon: '🎵👹', tempo: 'extreme', buff: { atk: 1.2, def: 0.9 }, desc: '극한의 공격, 방어 무시' },
  inspired: { bgm: '영감의 교향곡', icon: '🎵✨', tempo: 'epic', buff: { allStat: 1.08 }, desc: '모든 능력이 상승' },
  despair:  { bgm: '절망의 진혼곡', icon: '🎵💀', tempo: 'dark', buff: { lastStand: true }, desc: '죽음 직전 각성 발동' },
};

// 팀 음악 하모니 (팀 내 감정 조합)
const MUSIC_HARMONY = [
  { emotions: ['calm', 'calm', 'calm'], name: '평화의 합창', effect: { teamHpRegen: 0.05 }, desc: '3명 이상 평온 → 팀 재생' },
  { emotions: ['rage', 'rage', 'berserk'], name: '전쟁의 교향곡', effect: { teamAtk: 1.2 }, desc: '분노 조합 → 팀 공격↑' },
  { emotions: ['joy', 'inspired', 'calm'], name: '희망의 협주곡', effect: { teamAll: 1.1 }, desc: '긍정 조합 → 팀 전체↑' },
  { emotions: ['fear', 'despair'], name: '어둠의 만가', effect: { enemyFear: true }, desc: '공포 조합 → 적 공포 전파' },
  { emotions: ['inspired', 'inspired', 'inspired'], name: '신들의 찬가', effect: { teamAll: 1.15, divine: true }, desc: '3명 영감 → 최강 하모니!' },
];

// DJ 시스템 (플레이어가 음악 큐 조작)
const DJ_ACTIONS = [
  { id: 'change_tempo', name: '템포 변경', desc: '전투 속도 ±20% 조절', cooldown: 30 },
  { id: 'crescendo', name: '크레셴도', desc: '30초간 버프 효과 2배', cooldown: 120 },
  { id: 'silence', name: '침묵', desc: '적 팀 음악 버프 15초 무효', cooldown: 90 },
  { id: 'encore', name: '앙코르', desc: '마지막 음악 효과 10초 연장', cooldown: 60 },
  { id: 'remix', name: '리믹스', desc: '현재 감정 음악 효과 변경 (랜덤 강화)', cooldown: 45 },
];

function getTeamHarmony(teamMercs) {
  const emotions = teamMercs.map(m => m.emotion || 'calm');
  for (const h of MUSIC_HARMONY) {
    const req = [...h.emotions];
    let matched = true;
    for (const r of req) {
      const idx = emotions.indexOf(r);
      if (idx === -1) { matched = false; break; }
      emotions.splice(idx, 1);
    }
    if (matched) return h;
  }
  return null;
}

function register(io, socket, player) {
  socket.on('emotion_music_info', () => {
    socket.emit('emotion_music_info', { tracks: EMOTION_TRACKS, harmony: MUSIC_HARMONY, dj: DJ_ACTIONS });
  });
  socket.on('emotion_music_dj', (data) => {
    const action = DJ_ACTIONS.find(a => a.id === data.actionId);
    socket.emit('emotion_music_dj_result', { ok: !!action, action });
  });
}

module.exports = { EMOTION_TRACKS, MUSIC_HARMONY, DJ_ACTIONS, getTeamHarmony, register };

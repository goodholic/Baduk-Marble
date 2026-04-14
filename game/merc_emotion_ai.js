// v5.0 — 용병 감정 AI 시스템
// 용병이 전투/휴식/패배에 따라 감정이 변하고, 대사/성능이 달라짐

const EMOTIONS = {
  joy:      { atk: 1.15, def: 1.0,  spd: 1.1,  icon: '😊', label: '기쁨' },
  rage:     { atk: 1.3,  def: 0.85, spd: 1.05, icon: '🔥', label: '분노' },
  sadness:  { atk: 0.85, def: 0.9,  spd: 0.9,  icon: '😢', label: '슬픔' },
  fear:     { atk: 0.8,  def: 1.2,  spd: 1.15, icon: '😨', label: '공포' },
  calm:     { atk: 1.0,  def: 1.1,  spd: 1.0,  icon: '😌', label: '평온' },
  berserk:  { atk: 1.5,  def: 0.6,  spd: 1.3,  icon: '👹', label: '광폭' },
  inspired: { atk: 1.2,  def: 1.1,  spd: 1.1,  icon: '✨', label: '영감' },
  despair:  { atk: 0.7,  def: 0.7,  spd: 0.8,  icon: '💀', label: '절망' },
};

// 감정 전이 규칙: [현재감정][이벤트] → 다음감정
const TRANSITIONS = {
  calm:     { win: 'joy', lose: 'sadness', ally_die: 'rage', rest: 'calm', crit: 'inspired', streak_lose: 'fear' },
  joy:      { win: 'inspired', lose: 'calm', ally_die: 'rage', rest: 'calm', crit: 'joy', streak_lose: 'sadness' },
  rage:     { win: 'joy', lose: 'berserk', ally_die: 'berserk', rest: 'calm', crit: 'rage', streak_lose: 'despair' },
  sadness:  { win: 'calm', lose: 'despair', ally_die: 'rage', rest: 'calm', crit: 'joy', streak_lose: 'despair' },
  fear:     { win: 'calm', lose: 'despair', ally_die: 'fear', rest: 'calm', crit: 'inspired', streak_lose: 'despair' },
  berserk:  { win: 'rage', lose: 'despair', ally_die: 'berserk', rest: 'rage', crit: 'berserk', streak_lose: 'despair' },
  inspired: { win: 'inspired', lose: 'calm', ally_die: 'rage', rest: 'calm', crit: 'inspired', streak_lose: 'sadness' },
  despair:  { win: 'sadness', lose: 'despair', ally_die: 'despair', rest: 'fear', crit: 'calm', streak_lose: 'despair' },
};

// 감정별 대사 템플릿 (용병 성격과 조합)
const DIALOGUE = {
  joy:      ['이 기세로 밀어붙이자!', '하하, 오늘은 기분이 좋군!', '승리의 맛이란...!'],
  rage:     ['비켜라... 내가 끝내겠다!', '분노가 치밀어 오른다!', '반드시 갚아주겠어!'],
  sadness:  ['이번엔... 힘들었다.', '동료를 지키지 못했어...', '괜찮아, 다시 일어서자.'],
  fear:     ['저건... 이길 수 있을까?', '조심해야 해...', '뒤로 물러서는 게...'],
  calm:     ['준비됐다.', '평소처럼 가자.', '집중...'],
  berserk:  ['으아아아!! 다 쓸어버린다!!', '멈출 수 없어!!', '피가 끓는다!!'],
  inspired: ['지금이다! 운명이 미소짓는다!', '영감이 넘친다, 최고의 전투를!', '빛이 보인다!'],
  despair:  ['더 이상... 무의미한 건 아닐까...', '끝이 없는 것 같다...', '힘이... 빠져나간다...'],
};

// 감정 공명: 같은 감정의 용병이 팀에 2명 이상이면 보너스
const RESONANCE_BONUS = {
  2: { atk: 1.05, def: 1.05 },
  3: { atk: 1.12, def: 1.10 },
  4: { atk: 1.20, def: 1.15 },
};

// 특수 감정 조합: 팀 내 특정 감정 조합 시 발동
const EMOTION_COMBOS = [
  { required: ['rage', 'rage', 'berserk'], name: '분노의 폭풍', effect: { teamAtk: 1.25, duration: 30 } },
  { required: ['calm', 'calm', 'inspired'], name: '고요한 영감', effect: { teamDef: 1.3, teamSpd: 1.15, duration: 30 } },
  { required: ['joy', 'inspired', 'calm'], name: '완벽한 하모니', effect: { teamAtk: 1.15, teamDef: 1.15, teamSpd: 1.15, duration: 45 } },
  { required: ['despair', 'rage'], name: '배수의 진', effect: { teamAtk: 1.4, teamDef: 0.5, duration: 20 } },
  { required: ['fear', 'inspired'], name: '공포 극복', effect: { teamAtk: 1.2, teamDef: 1.2, healPct: 0.1, duration: 15 } },
];

function getEmotionMod(mercId, mercData) {
  const emo = (mercData.emotion || 'calm');
  return EMOTIONS[emo] || EMOTIONS.calm;
}

function triggerEmotion(mercData, event) {
  const current = mercData.emotion || 'calm';
  const table = TRANSITIONS[current] || TRANSITIONS.calm;
  const next = table[event] || current;
  const changed = next !== current;
  mercData.emotion = next;
  mercData.emotionTurns = 0;
  if (changed) {
    const lines = DIALOGUE[next] || DIALOGUE.calm;
    mercData.lastDialogue = lines[Math.floor(Math.random() * lines.length)];
  }
  return { changed, from: current, to: next, dialogue: mercData.lastDialogue };
}

function checkResonance(teamMercs) {
  const counts = {};
  teamMercs.forEach(m => { const e = m.emotion || 'calm'; counts[e] = (counts[e] || 0) + 1; });
  let best = null;
  for (const [emo, cnt] of Object.entries(counts)) {
    if (cnt >= 2 && RESONANCE_BONUS[Math.min(cnt, 4)]) {
      if (!best || cnt > best.count) best = { emotion: emo, count: cnt, bonus: RESONANCE_BONUS[Math.min(cnt, 4)] };
    }
  }
  return best;
}

function checkEmotionCombo(teamMercs) {
  const emotions = teamMercs.map(m => m.emotion || 'calm');
  for (const combo of EMOTION_COMBOS) {
    const req = [...combo.required];
    let matched = true;
    for (const r of req) {
      const idx = emotions.indexOf(r);
      if (idx === -1) { matched = false; break; }
      emotions.splice(idx, 1);
    }
    if (matched) return combo;
  }
  return null;
}

function decayEmotion(mercData) {
  mercData.emotionTurns = (mercData.emotionTurns || 0) + 1;
  if (mercData.emotionTurns >= 10 && mercData.emotion !== 'calm') {
    mercData.emotion = 'calm';
    mercData.emotionTurns = 0;
    return true;
  }
  return false;
}

function register(io, socket, player) {
  socket.on('merc_emotion_status', () => {
    const mercs = player.mercenaries || [];
    const status = mercs.map(m => ({
      id: m.id, name: m.name, emotion: m.emotion || 'calm',
      icon: EMOTIONS[m.emotion || 'calm']?.icon || '😌',
      label: EMOTIONS[m.emotion || 'calm']?.label || '평온',
      mod: EMOTIONS[m.emotion || 'calm'],
      dialogue: m.lastDialogue || '',
    }));
    const resonance = checkResonance(mercs);
    const combo = checkEmotionCombo(mercs);
    socket.emit('merc_emotion_status', { mercs: status, resonance, combo });
  });
}

module.exports = {
  EMOTIONS, TRANSITIONS, DIALOGUE, RESONANCE_BONUS, EMOTION_COMBOS,
  getEmotionMod, triggerEmotion, checkResonance, checkEmotionCombo, decayEmotion,
  register,
};

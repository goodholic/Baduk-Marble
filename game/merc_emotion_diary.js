// v6.6 — 용병 감정 일기 시스템
// 용병이 자동으로 일기를 쓰고, 감정 변화 기록, 특수 이벤트 트리거

const DIARY_ENTRIES_PER_DAY = 3;

const DIARY_TEMPLATES = {
  joy: [
    '오늘 전투에서 승리했다! 동료들과 함께여서 행복하다. {merc_name}와 함께한 전투가 특히 즐거웠다.',
    '주인님이 나를 칭찬해줬다. 더 강해지고 싶다!',
    '맛있는 음식을 먹었다. 요리사 용병에게 감사!',
  ],
  sadness: [
    '오늘 동료가 쓰러졌다... {dead_merc}의 빈자리가 크게 느껴진다.',
    '전투에서 졌다. 내가 더 강했다면...',
    '고향이 그립다. 언젠가 돌아갈 수 있을까.',
  ],
  rage: [
    '적에게 당했다! 반드시 복수하겠다!',
    '분하다... 이 분노를 힘으로 바꾸겠다!',
    '{rival_merc}에게 졌다. 다음엔 꼭 이긴다.',
  ],
  fear: [
    '오늘 본 적은... 너무 강했다. 살아남은 것만으로도 다행이다.',
    '어둠의 대륙의 기억이 아직도 떠오른다...',
    '강해지지 않으면 지킬 수 없다.',
  ],
  inspired: [
    '새로운 기술을 깨달았다! 이 힘으로 모두를 지키겠다.',
    '하늘의 별이 아름답다. 이 세계를 지키고 싶다.',
    '동료들의 모습에 감동받았다. 나도 최선을 다하겠다.',
  ],
  calm: [
    '평화로운 하루. 훈련을 마치고 쉬는 중.',
    '정원에서 꽃을 보며 명상했다. 마음이 고요하다.',
    '내일은 어떤 일이 있을까. 준비는 되어있다.',
  ],
};

// 특수 일기 이벤트 (특정 조건에서 트리거)
const SPECIAL_DIARY_EVENTS = [
  { trigger: 'first_awakening', entry: '각성의 순간... 내 안에 잠든 힘이 깨어났다. 눈물이 났다.', reward: { intimacy: 10 } },
  { trigger: 'marriage', entry: '오늘 {spouse}와 결혼했다. 영원히 함께하겠다고 맹세했다.', reward: { intimacy: 20 } },
  { trigger: 'child_born', entry: '아이가 태어났다! 이 작은 생명을 위해 더 강해지겠다.', reward: { intimacy: 15 } },
  { trigger: 'nemesis_defeat', entry: '드디어 숙적을 이겼다... 길고 긴 싸움이었다.', reward: { atk: 1.02 } },
  { trigger: 'near_death', entry: '죽을 뻔했다... 동료들이 구해줬다. 감사하다.', reward: { def: 1.02 } },
  { trigger: '100_battles', entry: '100번째 전투. 어느새 이렇게 됐구나. 초심을 잃지 말자.', reward: { exp: 1000 } },
  { trigger: 'prestige', entry: '모든 것을 내려놓고 다시 시작한다. 하지만 기억은 남아있다.', reward: { allStat: 1.01 } },
  { trigger: 'dream_world', entry: '꿈에서 이상한 것을 봤다... 미래일까, 과거일까.', reward: { dreamBonus: 1.1 } },
];

// 일기 수집 보상 (일기 수에 따라)
const DIARY_MILESTONES = [
  { entries: 10, name: '일기 초보', reward: { intimacy: 5 } },
  { entries: 30, name: '일기 습관', reward: { intimacy: 10, exp: 500 } },
  { entries: 100, name: '감정의 기록자', reward: { intimacy: 20, title: '감정의 기록자' } },
  { entries: 365, name: '1년의 기록', reward: { allStat: 1.03, title: '영혼의 동반자', frame: true } },
];

// 일기장 교환 (다른 플레이어에게 용병 일기 공유)
const DIARY_SHARING = {
  shareCost: 500,
  readReward: { intimacy: 2, desc: '다른 용병의 일기를 읽으면 친밀도+2' },
  likeReward: { fame: 1, desc: '좋아요 받으면 명성+1' },
};

function generateDiaryEntry(merc, context) {
  const emotion = merc.emotion || 'calm';
  const templates = DIARY_TEMPLATES[emotion] || DIARY_TEMPLATES.calm;
  let entry = templates[Math.floor(Math.random() * templates.length)];
  entry = entry.replace('{merc_name}', context?.allyName || '동료').replace('{dead_merc}', context?.deadName || '동료').replace('{rival_merc}', context?.rivalName || '라이벌');
  return { emotion, entry, date: Date.now(), mercName: merc.name };
}

function register(io, socket, player) {
  socket.on('diary_info', () => {
    const mercs = (player.mercenaries || []).map(m => ({ id: m.id, name: m.name, diary: m.diary || [], emotion: m.emotion }));
    socket.emit('diary_info', { mercs, milestones: DIARY_MILESTONES, sharing: DIARY_SHARING, specialEvents: SPECIAL_DIARY_EVENTS.map(e => e.trigger) });
  });
  socket.on('diary_generate', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('diary_generate_result', { ok: false });
    const entry = generateDiaryEntry(merc, data.context);
    merc.diary = merc.diary || [];
    merc.diary.push(entry);
    socket.emit('diary_generate_result', { ok: true, entry });
  });
}

module.exports = { DIARY_TEMPLATES, SPECIAL_DIARY_EVENTS, DIARY_MILESTONES, DIARY_SHARING, generateDiaryEntry, register };

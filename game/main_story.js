// 메인 스토리 시스템 — v2.58
// NPC 대화 기반 몰입감 있는 스토리라인
// 챕터별 시네마틱, 분기 선택, NPC 연계 퀘스트

const STORY_CHAPTERS = [
  // ═══ 프롤로그: 각성 ═══
  {
    id: 'prologue', name: '프롤로그: 각성', level: 1,
    quests: [
      {
        id: 'prologue_1', name: '잊혀진 기억',
        cutscene: {
          lines: [
            { speaker: '???', icon: '💫', text: '눈을 떠라, 선택받은 자여...' },
            { speaker: '???', icon: '💫', text: '천 년 전, 이 세계는 심연의 군주에 의해 멸망할 뻔했다.' },
            { speaker: '???', icon: '💫', text: '여섯 영웅이 목숨을 바쳐 그를 봉인했지만... 봉인이 풀리고 있다.' },
            { speaker: '???', icon: '💫', text: '그대는 영웅의 피를 이은 자. 일어나라, 세계가 그대를 필요로 한다.' },
          ],
        },
        npc: 'aden_elder',
        dialog: {
          before: '오, 젊은이! 드디어 눈을 떴구먼. 자네는 마을 밖 이슬숲에서 쓰러져 있었네. 기억이 나는가?',
          task: '먼저 몸을 풀어보게. 이슬숲의 슬라임 5마리를 처치하고 돌아오게.',
          after: '잘 해냈네! 자네에겐 분명 특별한 힘이 있어. 이것을 받게, 첫 번째 무기일세.',
        },
        objective: { type: 'kill_monster', target: '슬라임', count: 5 },
        reward: { gold: 200, exp: 300, item: 'equip_basic_sword' },
      },
      {
        id: 'prologue_2', name: '촌장의 부탁',
        npc: 'aden_elder',
        dialog: {
          before: '자네의 솜씨를 보니 역시 범상치 않군. 사실... 최근 이상한 일이 일어나고 있네.',
          task: '이슬숲 깊은 곳에서 <b style="color:#ff4444">엘리트 몬스터</b>가 목격되었네. 처치하고 그 핵(核)을 가져와 주게.',
          after: '이건... 심연의 기운이 깃든 핵이군. 불길한 예감이 드네. 신전의 대신관님을 찾아가 보게.',
        },
        objective: { type: 'kill_elite', count: 3 },
        reward: { gold: 500, exp: 600 },
      },
      {
        id: 'prologue_3', name: '예언의 시작',
        npc: 'shrine_priest',
        npcFallback: 'aden_healer',
        dialog: {
          before: '오... 자네가 촌장이 말한 모험가인가. 이 핵에서 느껴지는 기운은... 심연의 군주의 것이로다.',
          task: '천 년 전 봉인된 심연의 군주가 깨어나고 있다. 먼저 Lv.10까지 실력을 키우게. 그래야 진실을 알려줄 수 있네.',
          after: '충분히 강해졌군. 이제 진실을 말해주겠네. 세계 각지에 <b style="color:#ffd700">여섯 봉인석</b>이 흩어져 있다. 봉인석을 모아 심연의 군주를 다시 봉인해야 하네.',
        },
        cutscene: {
          lines: [
            { speaker: '대신관 엘리아스', icon: '⛪', text: '천 년 전, 여섯 영웅은 각자의 힘을 봉인석에 담았다.' },
            { speaker: '대신관 엘리아스', icon: '⛪', text: '불의 봉인석은 불꽃산에, 얼음의 봉인석은 얼음 협곡에...' },
            { speaker: '대신관 엘리아스', icon: '⛪', text: '어둠의 봉인석은... 어둠의 심연 깊은 곳에 잠들어 있다.' },
            { speaker: '대신관 엘리아스', icon: '⛪', text: '모든 봉인석을 모아야만 심연의 군주를 영원히 봉인할 수 있다.' },
          ],
        },
        objective: { type: 'reach_level', count: 10 },
        reward: { gold: 1000, exp: 1500, diamonds: 50, title: 'seal_seeker', titleName: '봉인 탐색자' },
      },
    ],
  },

  // ═══ 1막: 불의 봉인석 ═══
  {
    id: 'chapter1', name: '1막: 불의 시련', level: 10,
    quests: [
      {
        id: 'ch1_1', name: '불꽃산으로의 여정',
        npc: 'aden_elder',
        dialog: {
          before: '불의 봉인석은 불꽃산 깊숙이 있다네. 하지만 그곳은 위험하지. 먼저 장비를 갖추게.',
          task: '대장장이 볼칸에게 가서 장비를 <b style="color:#ffd700">+5 이상</b> 강화하게. 불꽃산을 견디려면 최소 그 정도는 되어야 하네.',
          after: '준비가 되었군! 이제 불꽃산으로 향하게.',
        },
        objective: { type: 'enchant_level', count: 5 },
        reward: { gold: 1000, exp: 2000 },
      },
      {
        id: 'ch1_2', name: '화염의 수호자',
        cutscene: {
          lines: [
            { speaker: '', icon: '🔥', text: '불꽃산에 도착했다. 용암이 흐르고 열기가 대단하다.' },
            { speaker: '', icon: '🔥', text: '어딘가에서 강력한 마력이 느껴진다... 봉인석이 가까이 있다.' },
          ],
        },
        dialog: {
          before: '불꽃산의 몬스터를 물리치며 봉인석을 찾아라.',
          task: '불꽃산에서 몬스터 20마리를 처치하라.',
          after: '봉인석의 기운이 더 강하게 느껴진다... 앞에 거대한 화염의 정령이!',
        },
        objective: { type: 'kill_monster', zone: 'volcano', count: 20 },
        reward: { gold: 2000, exp: 4000 },
      },
      {
        id: 'ch1_3', name: '불의 봉인석',
        cutscene: {
          lines: [
            { speaker: '화염의 정령', icon: '🔥', text: '멈춰라, 인간이여. 봉인석을 가져가려는 것이냐?' },
            { speaker: '화염의 정령', icon: '🔥', text: '천 년 전, 불의 영웅 이그니스가 나에게 이것을 맡겼다.' },
            { speaker: '화염의 정령', icon: '🔥', text: '자격을 증명하라. 내 시련을 통과한다면... 봉인석을 주겠다.' },
          ],
        },
        dialog: {
          before: '화염의 정령이 시련을 제안한다.',
          task: '화염 던전을 클리어하여 화염의 정령을 시험에 통과하라!',
          after: '대단하군... 너는 진정한 영웅의 후계자로다. 불의 봉인석을 받아라.',
        },
        objective: { type: 'dungeon_clear', count: 1 },
        reward: { gold: 5000, exp: 8000, diamonds: 100, item: 'seal_fire', itemName: '🔥 불의 봉인석' },
      },
    ],
  },

  // ═══ 2막: 얼음의 봉인석 ═══
  {
    id: 'chapter2', name: '2막: 얼음의 비밀', level: 20,
    quests: [
      {
        id: 'ch2_1', name: '얼어붙은 진실',
        cutscene: {
          lines: [
            { speaker: '대신관 엘리아스', icon: '⛪', text: '불의 봉인석을 찾았군. 훌륭하네.' },
            { speaker: '대신관 엘리아스', icon: '⛪', text: '다음은 얼음 협곡이야. 하지만... 협곡에는 배신자가 있다.' },
            { speaker: '대신관 엘리아스', icon: '⛪', text: '천 년 전 여섯 영웅 중 하나, 빙결의 마녀 프로스타가 타락했다.' },
            { speaker: '대신관 엘리아스', icon: '⛪', text: '그녀는 심연의 군주 편에 섰고... 지금도 협곡을 지배하고 있다.' },
          ],
        },
        dialog: {
          before: '얼음 협곡에 가기 전, 파티를 구성하는 것이 좋겠네.',
          task: '혈맹에 가입하거나 파티를 만들어 동료를 구하게.',
          after: '좋아, 혼자가 아니라면 빙결의 마녀도 두렵지 않을 거야.',
        },
        objective: { type: 'join_clan', count: 1 },
        reward: { gold: 2000, exp: 3000 },
      },
      {
        id: 'ch2_2', name: '빙결의 마녀',
        cutscene: {
          lines: [
            { speaker: '', icon: '❄', text: '얼음 협곡. 모든 것이 하얗게 얼어붙어 있다.' },
            { speaker: '빙결의 마녀 프로스타', icon: '❄', text: '어리석은 것... 봉인석을 찾으러 왔느냐?' },
            { speaker: '빙결의 마녀 프로스타', icon: '❄', text: '천 년 전 나는 진실을 깨달았다. 이 세계는 구할 가치가 없다!' },
            { speaker: '빙결의 마녀 프로스타', icon: '❄', text: '심연의 군주만이 새로운 세계를 만들 수 있어. 방해하지 마라!' },
          ],
        },
        dialog: {
          before: '빙결의 마녀를 물리쳐야 봉인석을 되찾을 수 있다.',
          task: '빙결 지대에서 보스를 처치하라!',
          after: '',
        },
        objective: { type: 'kill_boss', count: 1 },
        reward: { gold: 3000, exp: 5000 },
      },
      {
        id: 'ch2_3', name: '선택의 순간',
        cutscene: {
          lines: [
            { speaker: '빙결의 마녀 프로스타', icon: '❄', text: '으으... 패배했군. 하지만 알아둬라...' },
            { speaker: '빙결의 마녀 프로스타', icon: '❄', text: '심연의 군주는 이미 반쯤 깨어났다. 봉인석 여섯 개로도...' },
            { speaker: '빙결의 마녀 프로스타', icon: '❄', text: '...충분하지 않을지도 모른다.' },
          ],
        },
        dialog: {
          before: '빙결의 마녀가 쓰러졌다. 봉인석이 그녀의 손에서 떨어진다.',
          task: '봉인석을 수거하라.',
          after: '얼음의 봉인석을 획득했다! 하지만 마녀의 마지막 말이 마음에 걸린다...',
        },
        choice: {
          prompt: '빙결의 마녀에게 자비를 베풀 것인가?',
          options: [
            { label: '🤝 용서한다 (자비)', value: 'mercy', effect: 'karma_good', dialog: '... 고맙다. 언젠가 이 은혜를 갚겠다.' },
            { label: '⚔️ 심판한다 (정의)', value: 'justice', effect: 'karma_neutral', dialog: '...그래, 이것이 내 운명이겠지.' },
          ],
        },
        objective: { type: 'story_choice', count: 1 },
        reward: { gold: 8000, exp: 12000, diamonds: 150, item: 'seal_ice', itemName: '❄ 얼음의 봉인석' },
      },
    ],
  },

  // ═══ 3막: 어둠 속으로 ═══
  {
    id: 'chapter3', name: '3막: 어둠 속으로', level: 30,
    quests: [
      {
        id: 'ch3_1', name: '배신',
        cutscene: {
          lines: [
            { speaker: '', icon: '⚠️', text: '신전 마을로 돌아왔다. 하지만 무언가 이상하다...' },
            { speaker: '부상당한 기사', icon: '🗡️', text: '모험가여! 큰일이다! 대신관이... 대신관이 납치당했다!' },
            { speaker: '부상당한 기사', icon: '🗡️', text: '검은 로브를 입은 자들이었다. 그들은... 심연 교단이라 했다.' },
            { speaker: '부상당한 기사', icon: '🗡️', text: '그림자숲 방향으로 갔다. 제발, 대신관을 구해주시오!' },
          ],
        },
        dialog: {
          before: '대신관이 심연 교단에게 납치당했다!',
          task: '그림자숲에서 심연 교단원 30마리를 처치하며 대신관의 행방을 추적하라.',
          after: '교단원들의 시체에서 지도를 발견했다. 마왕성... 그곳에 대신관이 있다!',
        },
        objective: { type: 'kill_monster', zone: 'darkforest', count: 30 },
        reward: { gold: 5000, exp: 10000 },
      },
      {
        id: 'ch3_2', name: '마왕성 침입',
        cutscene: {
          lines: [
            { speaker: '', icon: '🏰', text: '마왕성. 어둠의 기운이 하늘을 뒤덮고 있다.' },
            { speaker: '', icon: '🏰', text: '대신관을 구하기 위해... 이곳으로 들어가야 한다.' },
            { speaker: '심연 교단장', icon: '☠', text: '감히 여기까지 찾아왔군. 하지만 이미 늦었다.' },
            { speaker: '심연 교단장', icon: '☠', text: '대신관의 힘으로 봉인의 열쇠를 만들었다. 곧 군주님이 깨어나실 것이다!' },
          ],
        },
        dialog: {
          before: '마왕성에 잠입하여 대신관을 구출하라!',
          task: '심층 던전 "심연의 탑"을 5층까지 클리어하라.',
          after: '대신관을 구출했다! 하지만 교단장은 도망쳤다...',
        },
        objective: { type: 'deep_dungeon_floor', dungeon: 'abyss_tower', floor: 5 },
        reward: { gold: 10000, exp: 20000, diamonds: 200, item: 'seal_dark', itemName: '☠ 어둠의 봉인석' },
      },
    ],
  },

  // ═══ 4막: 최후의 결전 ═══
  {
    id: 'chapter4', name: '4막: 최후의 결전', level: 40,
    quests: [
      {
        id: 'ch4_1', name: '봉인의 의식',
        cutscene: {
          lines: [
            { speaker: '대신관 엘리아스', icon: '⛪', text: '감사하네, 모험가여. 자네 덕분에 살았다.' },
            { speaker: '대신관 엘리아스', icon: '⛪', text: '봉인석을 세 개나 모았군. 하지만... 마녀의 말이 맞았다.' },
            { speaker: '대신관 엘리아스', icon: '⛪', text: '여섯 개 전부를 모아야 한다. 나머지는... 뇌전 고원, 세계수, 그리고...' },
            { speaker: '대신관 엘리아스', icon: '⛪', text: '마지막 봉인석은 심연의 군주 자신이 가지고 있다. 그를 쓰러뜨려야만 한다.' },
          ],
        },
        dialog: {
          before: '나머지 봉인석을 모으기 위해 더 강해져야 한다.',
          task: 'Lv.45 이상으로 성장하라. 심연의 군주에게 도전하기 위한 준비를.',
          after: '충분히 강해졌다. 이제... 마지막 전투를 준비하자.',
        },
        objective: { type: 'reach_level', count: 45 },
        reward: { gold: 15000, exp: 30000, diamonds: 300 },
      },
      {
        id: 'ch4_2', name: '심연의 군주',
        cutscene: {
          lines: [
            { speaker: '', icon: '⚔️', text: '모든 봉인석의 힘이 하나로 모인다...' },
            { speaker: '', icon: '⚔️', text: '공허의 균열이 열리고, 그 너머에...' },
            { speaker: '심연의 군주 아비스', icon: '👿', text: '천 년을 기다렸다... 드디어 자유로다!' },
            { speaker: '심연의 군주 아비스', icon: '👿', text: '봉인? 하하하! 그 따위 것으로 나를 막을 수 있다고 생각하느냐!' },
            { speaker: '심연의 군주 아비스', icon: '👿', text: '이 세계를 멸망시키고, 새로운 세계를 만들어주마!' },
            { speaker: '', icon: '⚔️', text: '최후의 전투가 시작된다...!' },
          ],
        },
        dialog: {
          before: '심연의 군주와 최종 결전을 치러야 한다.',
          task: '심층 던전 "심연의 탑" 10층 보스 — 심연의 군주 아비스를 처치하라!',
          after: '',
        },
        objective: { type: 'deep_dungeon_clear', dungeon: 'abyss_tower' },
        reward: { gold: 50000, exp: 100000, diamonds: 1000,
          item: 'seal_complete', itemName: '✨ 완성된 봉인',
          title: 'world_savior', titleName: '세계의 구원자' },
      },
      {
        id: 'ch4_final', name: '에필로그: 새로운 시작',
        cutscene: {
          lines: [
            { speaker: '', icon: '✨', text: '심연의 군주가 쓰러졌다. 봉인석이 빛을 발하며 봉인이 완성된다.' },
            { speaker: '대신관 엘리아스', icon: '⛪', text: '해냈군... 자네가 진정한 영웅이야.' },
            { speaker: '대신관 엘리아스', icon: '⛪', text: '천 년 전 영웅들도 자네를 자랑스러워할 것이네.' },
            { speaker: '', icon: '🌅', text: '태양이 떠오른다. 세계에 다시 평화가 찾아왔다.' },
            { speaker: '', icon: '🌅', text: '하지만... 이것이 끝이 아니라는 것을 그대는 알고 있다.' },
            { speaker: '', icon: '🌅', text: '새로운 모험이 기다리고 있다. 전설은 계속된다...' },
            { speaker: '', icon: '🎊', text: '— 메인 스토리 완료 — 축하합니다! —' },
          ],
        },
        dialog: {
          before: '세계를 구했다! 모든 이가 당신을 영웅으로 기억할 것이다.',
          task: '대신관에게 보고하라.',
          after: '당신은 이 세계의 전설이 되었습니다. 새로운 모험이 기다리고 있습니다!',
        },
        objective: { type: 'story_complete', count: 1 },
        reward: { gold: 100000, exp: 200000, diamonds: 2000,
          title: 'legend', titleName: '전설의 영웅' },
      },
    ],
  },
];

// ═══ 스토리 진행 관리 ═══
function getStoryProgress(player) {
  if (!player._storyProgress) {
    player._storyProgress = { currentChapter: 0, currentQuest: 0, choices: {}, sealsCollected: 0, completed: false };
  }
  return player._storyProgress;
}

function getCurrentStoryQuest(player) {
  const progress = getStoryProgress(player);
  if (progress.completed) return null;

  const chapter = STORY_CHAPTERS[progress.currentChapter];
  if (!chapter) return null;

  const quest = chapter.quests[progress.currentQuest];
  if (!quest) return null;

  return { chapter, quest, chapterIndex: progress.currentChapter, questIndex: progress.currentQuest };
}

function checkStoryObjective(player, action, data) {
  const current = getCurrentStoryQuest(player);
  if (!current) return null;

  const obj = current.quest.objective;
  if (!obj) return null;

  const progress = getStoryProgress(player);
  if (!progress._questProgress) progress._questProgress = 0;

  let matched = false;

  switch (obj.type) {
    case 'kill_monster':
      if (action === 'kill' && (!obj.zone || data.zone === obj.zone)) {
        progress._questProgress++;
        matched = true;
      }
      break;
    case 'kill_elite':
      if (action === 'kill' && data.tier === 'elite') { progress._questProgress++; matched = true; }
      break;
    case 'kill_boss':
      if (action === 'kill' && (data.tier === 'boss' || data.tier === 'legendary')) { progress._questProgress++; matched = true; }
      break;
    case 'reach_level':
      if (action === 'level_up' && data.level >= obj.count) { progress._questProgress = obj.count; matched = true; }
      break;
    case 'enchant_level':
      if (action === 'enchant' && data.level >= obj.count) { progress._questProgress = obj.count; matched = true; }
      break;
    case 'dungeon_clear':
      if (action === 'dungeon_clear') { progress._questProgress++; matched = true; }
      break;
    case 'join_clan':
      if (action === 'join_clan') { progress._questProgress = 1; matched = true; }
      break;
    case 'deep_dungeon_floor':
      if (action === 'deep_dungeon_floor' && data.dungeon === obj.dungeon && data.floor >= obj.floor) {
        progress._questProgress = obj.count || 1; matched = true;
      }
      break;
    case 'deep_dungeon_clear':
      if (action === 'deep_dungeon_clear' && data.dungeon === obj.dungeon) {
        progress._questProgress = 1; matched = true;
      }
      break;
    case 'story_choice':
      if (action === 'story_choice') { progress._questProgress = 1; matched = true; }
      break;
    case 'story_complete':
      progress._questProgress = 1; matched = true;
      break;
  }

  if (!matched) return null;

  // 목표 달성 체크
  if (progress._questProgress >= (obj.count || 1)) {
    return completeStoryQuest(player);
  }

  return {
    type: 'progress',
    questName: current.quest.name,
    progress: progress._questProgress,
    goal: obj.count || 1,
  };
}

function completeStoryQuest(player) {
  const current = getCurrentStoryQuest(player);
  if (!current) return null;

  const progress = getStoryProgress(player);
  const quest = current.quest;

  // 보상 지급
  if (quest.reward) {
    if (quest.reward.gold) player.gold = (player.gold || 0) + quest.reward.gold;
    if (quest.reward.exp) player.exp = (player.exp || 0) + quest.reward.exp;
    if (quest.reward.diamonds) player.diamonds = (player.diamonds || 0) + quest.reward.diamonds;
    if (quest.reward.title) player.title = quest.reward.title;
    if (quest.reward.item) {
      if (!player.inventory) player.inventory = {};
      player.inventory[quest.reward.item] = (player.inventory[quest.reward.item] || 0) + 1;
    }
  }

  // 봉인석 수집 카운트
  if (quest.reward && quest.reward.item && quest.reward.item.startsWith('seal_')) {
    progress.sealsCollected++;
  }

  // 다음 퀘스트로
  progress.currentQuest++;
  progress._questProgress = 0;

  const chapter = STORY_CHAPTERS[progress.currentChapter];
  if (progress.currentQuest >= chapter.quests.length) {
    // 다음 챕터로
    progress.currentChapter++;
    progress.currentQuest = 0;
    if (progress.currentChapter >= STORY_CHAPTERS.length) {
      progress.completed = true;
    }
  }

  // 다음 퀘스트의 컷신 체크
  const nextCurrent = getCurrentStoryQuest(player);
  const nextCutscene = nextCurrent && nextCurrent.quest.cutscene ? nextCurrent.quest.cutscene : null;

  return {
    type: 'complete',
    questName: quest.name,
    reward: quest.reward,
    nextQuest: nextCurrent ? { name: nextCurrent.quest.name, chapter: nextCurrent.chapter.name } : null,
    nextCutscene: nextCutscene,
    storyCompleted: progress.completed,
  };
}

// 선택지 처리
function makeStoryChoice(player, choiceValue) {
  const current = getCurrentStoryQuest(player);
  if (!current || !current.quest.choice) return null;

  const progress = getStoryProgress(player);
  const choice = current.quest.choice.options.find(o => o.value === choiceValue);
  if (!choice) return null;

  progress.choices[current.quest.id] = choiceValue;

  // 카르마 효과
  if (choice.effect === 'karma_good') player.karma = Math.max(0, (player.karma || 0) - 50);
  else if (choice.effect === 'karma_evil') player.karma = (player.karma || 0) + 50;

  return { choiceValue, dialog: choice.dialog, effect: choice.effect };
}

// 소켓 핸들러
function registerStoryHandlers(socket, playerId, players, io) {
  socket.on('story_status', () => {
    const p = players[playerId];
    if (!p) return;
    const current = getCurrentStoryQuest(p);
    const progress = getStoryProgress(p);

    socket.emit('story_status', {
      completed: progress.completed,
      seals: progress.sealsCollected,
      chapter: current ? { name: current.chapter.name, index: current.chapterIndex } : null,
      quest: current ? {
        name: current.quest.name,
        npc: current.quest.npc,
        dialog: current.quest.dialog,
        objective: current.quest.objective,
        progress: progress._questProgress || 0,
        goal: current.quest.objective ? (current.quest.objective.count || 1) : 1,
        cutscene: current.quest.cutscene,
        choice: current.quest.choice,
        reward: current.quest.reward,
      } : null,
    });
  });

  socket.on('story_choice', (choiceValue) => {
    const p = players[playerId];
    if (!p) return;
    const result = makeStoryChoice(p, choiceValue);
    if (result) {
      socket.emit('story_choice_result', result);
      // 선택 후 목표 진행
      const completed = checkStoryObjective(p, 'story_choice', {});
      if (completed) socket.emit('story_quest_update', completed);
    }
  });

  socket.on('story_complete_report', () => {
    const p = players[playerId];
    if (!p) return;
    const result = checkStoryObjective(p, 'story_complete', {});
    if (result) {
      socket.emit('story_quest_update', result);
      if (result.storyCompleted) {
        io.emit('server_msg', { msg: '🎊 ' + (p.displayName||p.className) + '님이 메인 스토리를 완료했습니다! 전설의 영웅!', type: 'boss' });
      }
    }
  });
}

module.exports = {
  STORY_CHAPTERS,
  getStoryProgress,
  getCurrentStoryQuest,
  checkStoryObjective,
  completeStoryQuest,
  makeStoryChoice,
  registerStoryHandlers,
};

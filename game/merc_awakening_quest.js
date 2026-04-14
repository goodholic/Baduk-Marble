// v5.1 — 용병 각성 퀘스트 시스템
// 각 용병마다 고유 각성 스토리 + 분기 선택 + 전투 시련 → 최종 각성

const QUEST_STAGES = 5;

// 각성 퀘스트 아키타입 (용병 클래스별)
const QUEST_ARCHETYPES = {
  warrior: {
    name: '전사의 길', icon: '⚔️',
    stages: [
      { title: '첫 번째 시련', type: 'combat', desc: '100명의 적을 쓰러뜨려라', goal: { kills: 100 } },
      { title: '사부의 가르침', type: 'story', desc: '은사를 찾아 무예를 배운다', choices: ['힘의 길', '기술의 길'] },
      { title: '어둠의 검사', type: 'boss', desc: '그림자 속 자신과 싸운다', boss: { name: '그림자 자아', hp: 5000, atk: 200 } },
      { title: '동료의 위기', type: 'rescue', desc: '동료 용병이 위험에 처했다', choices: ['직접 구출', '지원 요청'] },
      { title: '궁극의 각성', type: 'awakening', desc: '한계를 초월하라', reward: { atkBonus: 1.3, newSkill: true, title: '검의 달인' } },
    ],
  },
  mage: {
    name: '마법사의 길', icon: '🔮',
    stages: [
      { title: '마력 응축', type: 'gather', desc: '마법 결정 50개를 모아라', goal: { items: 50 } },
      { title: '금서의 유혹', type: 'story', desc: '금지된 마법서를 발견한다', choices: ['읽는다 (힘↑ 위험↑)', '봉인한다 (안전↑)'] },
      { title: '원소의 폭풍', type: 'boss', desc: '4원소 정령과 싸운다', boss: { name: '원소 융합체', hp: 4000, atk: 250 } },
      { title: '제자의 선택', type: 'story', desc: '제자가 어둠의 길로 간다', choices: ['설득', '대결', '놓아준다'] },
      { title: '대마법사 각성', type: 'awakening', desc: '마력의 근원에 도달하라', reward: { matkBonus: 1.35, newSkill: true, title: '대마도사' } },
    ],
  },
  assassin: {
    name: '암살자의 길', icon: '🗡️',
    stages: [
      { title: '그림자 수련', type: 'stealth', desc: '들키지 않고 10회 잠입 성공', goal: { stealth: 10 } },
      { title: '배신의 의뢰', type: 'story', desc: '동료 암살 의뢰를 받는다', choices: ['거절 (명예↑)', '수락 (보상↑)', '역이용'] },
      { title: '독의 군주', type: 'boss', desc: '독을 다루는 암살왕과 대결', boss: { name: '독왕 스콜피온', hp: 3000, atk: 300 } },
      { title: '정체 노출', type: 'crisis', desc: '정체가 들통났다!', choices: ['도주', '전투', '위장'] },
      { title: '환영 각성', type: 'awakening', desc: '그림자와 하나가 되라', reward: { critBonus: 1.4, newSkill: true, title: '환영의 칼날' } },
    ],
  },
  healer: {
    name: '성직자의 길', icon: '💚',
    stages: [
      { title: '치유의 수련', type: 'heal', desc: '동료를 100회 치유하라', goal: { heals: 100 } },
      { title: '역병의 마을', type: 'story', desc: '역병에 걸린 마을을 발견', choices: ['치료에 전념', '원인 조사', '격리'] },
      { title: '죽음의 천사', type: 'boss', desc: '생명을 거두는 자와 대결', boss: { name: '사신 아즈라엘', hp: 6000, atk: 150 } },
      { title: '금단의 치유', type: 'story', desc: '죽은 자를 살릴 수 있는 방법 발견', choices: ['사용 (대가↑)', '봉인 (안전)', '연구 계속'] },
      { title: '생명의 각성', type: 'awakening', desc: '생사를 초월한 치유의 경지', reward: { healBonus: 1.5, newSkill: true, title: '생명의 수호자' } },
    ],
  },
  ranger: {
    name: '궁수의 길', icon: '🏹',
    stages: [
      { title: '백발백중', type: 'accuracy', desc: '연속 크리티컬 30회 달성', goal: { crits: 30 } },
      { title: '정령의 숲', type: 'story', desc: '숲의 정령이 도움을 요청', choices: ['정령과 계약', '독자 행동', '자연에 맡김'] },
      { title: '폭풍의 독수리', type: 'boss', desc: '하늘의 지배자와 대결', boss: { name: '썬더 이글', hp: 3500, atk: 220 } },
      { title: '숲의 위기', type: 'defend', desc: '고향 숲이 불타고 있다', choices: ['직접 진화', '동물 대피', '범인 추적'] },
      { title: '자연의 각성', type: 'awakening', desc: '바람과 하나가 되라', reward: { rangeBonus: 1.3, spdBonus: 1.2, newSkill: true, title: '바람의 사수' } },
    ],
  },
  tank: {
    name: '수호자의 길', icon: '🛡️',
    stages: [
      { title: '불굴의 의지', type: 'endure', desc: '1000 데미지 이상 견디기', goal: { dmgTaken: 1000 } },
      { title: '마을 수호', type: 'story', desc: '약탈자가 마을을 공격', choices: ['정면 대결', '함정 설치', '주민 대피'] },
      { title: '산의 거인', type: 'boss', desc: '바위 거인과의 힘겨루기', boss: { name: '마운틴 골렘', hp: 10000, atk: 100 } },
      { title: '최후의 방어', type: 'siege', desc: '혼자서 성문을 지켜라', choices: ['끝까지 사수', '전략적 후퇴', '증원 요청'] },
      { title: '철벽 각성', type: 'awakening', desc: '부서지지 않는 방패가 되라', reward: { defBonus: 1.5, hpBonus: 1.3, newSkill: true, title: '불멸의 방패' } },
    ],
  },
};

// 분기 선택에 따른 추가 보상
const CHOICE_BONUSES = {
  power:   { atk: 1.05, label: '힘 중시' },
  skill:   { crit: 1.05, label: '기술 중시' },
  honor:   { def: 1.05, karma: 5, label: '명예 중시' },
  risk:    { atk: 1.1, def: 0.95, label: '위험 감수' },
  safe:    { def: 1.05, hp: 1.05, label: '안전 우선' },
  research:{ matk: 1.05, cdReduce: 0.95, label: '연구 중시' },
};

// 각성 후 해금되는 궁극 스킬 (클래스별)
const AWAKENED_SKILLS = {
  warrior:  { name: '천붕지열참', desc: '전방 직선 범위 HP 40% 데미지 + 기절 3초', cooldown: 60, icon: '💥⚔️' },
  mage:     { name: '메테오 스웜', desc: '맵 전체 운석 10발 랜덤 낙하, 각 HP 15% 데미지', cooldown: 90, icon: '☄️🔮' },
  assassin: { name: '천살만화', desc: '3초간 무적 + 범위 내 적 전원에게 크리 3회', cooldown: 75, icon: '💀🗡️' },
  healer:   { name: '생명의 나무', desc: '아군 전원 HP 50% 즉시 회복 + 10초간 재생', cooldown: 120, icon: '🌳💚' },
  ranger:   { name: '폭풍의 화살비', desc: '넓은 범위 20발 연사, 각 일반 공격의 60%', cooldown: 60, icon: '🌪️🏹' },
  tank:     { name: '불멸의 성벽', desc: '10초간 팀 전체 데미지 70% 흡수', cooldown: 90, icon: '🏰🛡️' },
};

function getQuestArchetype(merc) {
  return QUEST_ARCHETYPES[merc.class] || QUEST_ARCHETYPES.warrior;
}

function startAwakeningQuest(merc) {
  if (merc.awakeningQuest) return { ok: false, reason: '이미 각성 퀘스트 진행 중' };
  if ((merc.level || 1) < 20) return { ok: false, reason: '레벨 20 이상 필요' };
  const archetype = getQuestArchetype(merc);
  merc.awakeningQuest = {
    stage: 0,
    archetype: merc.class || 'warrior',
    choices: [],
    progress: {},
    startTime: Date.now(),
  };
  return { ok: true, quest: archetype, currentStage: archetype.stages[0] };
}

function progressQuest(merc, choiceIdx) {
  const quest = merc.awakeningQuest;
  if (!quest) return { ok: false, reason: '퀘스트 없음' };
  const archetype = QUEST_ARCHETYPES[quest.archetype] || QUEST_ARCHETYPES.warrior;
  const stage = archetype.stages[quest.stage];
  if (!stage) return { ok: false, reason: '이미 완료' };

  if (stage.choices && choiceIdx !== undefined) {
    quest.choices.push({ stage: quest.stage, choice: stage.choices[choiceIdx] || stage.choices[0] });
  }

  quest.stage++;
  if (quest.stage >= QUEST_STAGES) {
    // 각성 완료!
    const reward = archetype.stages[QUEST_STAGES - 1].reward;
    merc.awakened = true;
    merc.awakenedSkill = AWAKENED_SKILLS[quest.archetype] || AWAKENED_SKILLS.warrior;
    merc.awakenTitle = reward.title;
    if (reward.atkBonus) merc.atkMul = (merc.atkMul || 1) * reward.atkBonus;
    if (reward.matkBonus) merc.matkMul = (merc.matkMul || 1) * reward.matkBonus;
    if (reward.defBonus) merc.defMul = (merc.defMul || 1) * reward.defBonus;
    if (reward.healBonus) merc.healMul = (merc.healMul || 1) * reward.healBonus;
    if (reward.critBonus) merc.critMul = (merc.critMul || 1) * reward.critBonus;
    if (reward.hpBonus) merc.hpMul = (merc.hpMul || 1) * reward.hpBonus;
    delete merc.awakeningQuest;
    return { ok: true, completed: true, reward, skill: merc.awakenedSkill };
  }

  return { ok: true, completed: false, nextStage: archetype.stages[quest.stage] };
}

function register(io, socket, player) {
  socket.on('merc_awakening_start', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('merc_awakening_result', { ok: false, reason: '용병 없음' });
    const result = startAwakeningQuest(merc);
    socket.emit('merc_awakening_result', result);
  });

  socket.on('merc_awakening_progress', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('merc_awakening_progress_result', { ok: false, reason: '용병 없음' });
    const result = progressQuest(merc, data.choiceIdx);
    socket.emit('merc_awakening_progress_result', result);
    if (result.completed) {
      io.emit('server_msg', `🌟 [각성] ${player.name}의 ${merc.name}이(가) 최종 각성! 칭호: "${result.reward.title}"`);
    }
  });

  socket.on('merc_awakening_status', () => {
    const mercs = (player.mercenaries || []).map(m => ({
      id: m.id, name: m.name, class: m.class,
      awakened: m.awakened || false,
      questStage: m.awakeningQuest?.stage || null,
      awakenedSkill: m.awakenedSkill || null,
    }));
    socket.emit('merc_awakening_status', mercs);
  });
}

module.exports = {
  QUEST_ARCHETYPES, CHOICE_BONUSES, AWAKENED_SKILLS, QUEST_STAGES,
  getQuestArchetype, startAwakeningQuest, progressQuest, register,
};

// ==========================================
// 튜토리얼 가이드 퀘스트 체인 — v4.2
// IO -> SLG -> 공성전 흐름을 단계별로 가르치는 7단계 퀘스트
// Lv.10 이상은 자동 스킵
// ==========================================

// ═══ 튜토리얼 단계 정의 ═══
const TUTORIAL_STEPS = [
  {
    id: 'step1_move',
    title: '\u{1F3AE} 첫 걸음',
    desc: '상하좌우로 이동해보세요!',
    objective: 'move_100',
    objectiveCount: 100,
    reward: { gold: 200, exp: 100 },
    hint: 'WASD 또는 화살표로 이동합니다',
    nextStep: 'step2_hunt',
  },
  {
    id: 'step2_hunt',
    title: '\u2694\uFE0F 첫 번째 사냥',
    desc: '몬스터 10마리를 처치하세요!',
    objective: 'kill_10',
    objectiveCount: 10,
    reward: { gold: 500, exp: 300 },
    hint: '몬스터에 가까이 가면 자동으로 공격합니다',
    nextStep: 'step3_merc',
  },
  {
    id: 'step3_merc',
    title: '\u{1F3B4} 용병 소환',
    desc: '첫 용병을 소환해보세요! (무료 소환 1회)',
    objective: 'gacha_1',
    objectiveCount: 1,
    reward: { gold: 1000, mercCard: 'merc_soldier' },
    hint: '용병 메뉴에서 무료 소환을 눌러보세요',
    nextStep: 'step4_slg',
  },
  {
    id: 'step4_slg',
    title: '\u{1F3F0} SLG 모드 진입',
    desc: 'SLG 모드로 전환해서 성을 확인하세요!',
    objective: 'enter_slg',
    objectiveCount: 1,
    reward: { gold: 1500 },
    hint: 'SLG 버튼을 눌러 영지 관리 화면으로 이동합니다',
    nextStep: 'step5_train',
  },
  {
    id: 'step5_train',
    title: '\u{1F4AA} 용병 강화',
    desc: '용병 1명을 레벨 5까지 올려보세요!',
    objective: 'merc_level_5',
    objectiveCount: 1,
    reward: { gold: 2000, diamonds: 30 },
    hint: '용병 상세에서 훈련 버튼을 누르세요',
    nextStep: 'step6_party',
  },
  {
    id: 'step6_party',
    title: '\u{1F465} 파티 편성 & 진형',
    desc: '용병 3명을 파티에 편성하고 진형을 설정하세요!',
    objective: 'party_3_formation',
    objectiveCount: 1,
    reward: { gold: 3000, diamonds: 50, mercCard: 'merc_archer' },
    hint: '파티 메뉴에서 용병을 배치하고 진형을 선택하세요',
    nextStep: 'step7_siege',
  },
  {
    id: 'step7_siege',
    title: '\u{1F3F0} 첫 공성전!',
    desc: '공성전에 도전해보세요! (AI 성 제공)',
    objective: 'siege_attempt',
    objectiveCount: 1,
    reward: { gold: 5000, diamonds: 100, title: '신규 전사' },
    hint: '공성전 메뉴에서 연습 공성을 선택하세요',
    unlockMsg: '\u{1F389} 모든 튜토리얼 완료! 이제 자유롭게 모험하세요!',
  },
];

const STEP_INDEX = {};
TUTORIAL_STEPS.forEach((s, i) => { STEP_INDEX[s.id] = i; });

// ═══ 가이드 초기화 ═══
function _initGuide(player) {
  if (!player._tutorialGuide) {
    player._tutorialGuide = {
      currentStep: 'step1_move',
      completed: [],       // 완료된 stepId 목록
      claimed: [],         // 보상 수령한 stepId 목록
      progress: {},        // stepId -> 현재 진행 수치
      allDone: false,
    };
  }
  return player._tutorialGuide;
}

// ═══ 레벨 10 이상이면 튜토리얼 불필요 ═══
function _shouldSkip(player) {
  return (player.level || 1) >= 10;
}

// ═══ 튜토리얼 상태 조회 ═══
function getTutorialStatus(player) {
  if (_shouldSkip(player)) {
    return { skipped: true, msg: 'Lv.10 이상이므로 튜토리얼이 필요하지 않습니다.' };
  }

  const guide = _initGuide(player);
  const currentIdx = STEP_INDEX[guide.currentStep];
  const current = currentIdx !== undefined ? TUTORIAL_STEPS[currentIdx] : null;

  return {
    skipped: false,
    allDone: guide.allDone,
    currentStep: current ? {
      id: current.id,
      title: current.title,
      desc: current.desc,
      hint: current.hint,
      progress: guide.progress[current.id] || 0,
      required: current.objectiveCount,
      reward: current.reward,
    } : null,
    completedSteps: guide.completed.map(stepId => {
      const s = TUTORIAL_STEPS[STEP_INDEX[stepId]];
      return s ? { id: s.id, title: s.title, claimed: guide.claimed.includes(stepId) } : null;
    }).filter(Boolean),
    totalSteps: TUTORIAL_STEPS.length,
    completedCount: guide.completed.length,
  };
}

// ═══ 이벤트 기반 자동 진행 체크 ═══
function checkTutorialProgress(player, eventType, eventData) {
  if (_shouldSkip(player)) return null;

  const guide = _initGuide(player);
  if (guide.allDone) return null;

  const currentIdx = STEP_INDEX[guide.currentStep];
  if (currentIdx === undefined) return null;
  const step = TUTORIAL_STEPS[currentIdx];
  if (!step) return null;

  let progressed = false;
  const current = guide.progress[step.id] || 0;

  switch (step.objective) {
    case 'move_100':
      if (eventType === 'move') {
        const dist = (eventData && eventData.distance) || 1;
        guide.progress[step.id] = current + dist;
        if (guide.progress[step.id] >= step.objectiveCount) progressed = true;
      }
      break;

    case 'kill_10':
      if (eventType === 'kill') {
        guide.progress[step.id] = current + 1;
        if (guide.progress[step.id] >= step.objectiveCount) progressed = true;
      }
      break;

    case 'gacha_1':
      if (eventType === 'gacha') {
        guide.progress[step.id] = current + 1;
        if (guide.progress[step.id] >= step.objectiveCount) progressed = true;
      }
      break;

    case 'enter_slg':
      if (eventType === 'enter_slg' || eventType === 'slg_view') {
        guide.progress[step.id] = 1;
        progressed = true;
      }
      break;

    case 'merc_level_5':
      if (eventType === 'merc_train' || eventType === 'merc_level_up') {
        const mercLevel = (eventData && eventData.level) || 0;
        if (mercLevel >= 5) {
          guide.progress[step.id] = 1;
          progressed = true;
        }
      }
      break;

    case 'party_3_formation':
      if (eventType === 'party_update' || eventType === 'formation_set') {
        const partySize = (eventData && eventData.partySize) || 0;
        const hasFormation = (eventData && eventData.hasFormation) || false;
        if (partySize >= 3 && hasFormation) {
          guide.progress[step.id] = 1;
          progressed = true;
        }
      }
      break;

    case 'siege_attempt':
      if (eventType === 'siege_start' || eventType === 'siege_attempt') {
        guide.progress[step.id] = 1;
        progressed = true;
      }
      break;
  }

  if (progressed) {
    guide.completed.push(step.id);
    // 다음 단계로 진행
    if (step.nextStep) {
      guide.currentStep = step.nextStep;
    } else {
      guide.allDone = true;
    }

    return {
      type: 'step_complete',
      stepId: step.id,
      title: step.title,
      msg: `\u2705 ${step.title} 완료!`,
      reward: step.reward,
      unlockMsg: step.unlockMsg || null,
      nextStep: step.nextStep ? TUTORIAL_STEPS[STEP_INDEX[step.nextStep]] : null,
      allDone: guide.allDone,
    };
  }

  // 미완료, 진행 상황 반환
  return {
    type: 'progress',
    stepId: step.id,
    title: step.title,
    progress: guide.progress[step.id] || 0,
    required: step.objectiveCount,
  };
}

// ═══ 보상 수령 ═══
function claimTutorialReward(player, stepId) {
  if (_shouldSkip(player)) {
    return { success: false, msg: 'Lv.10 이상이므로 튜토리얼 보상이 필요하지 않습니다.' };
  }

  const guide = _initGuide(player);

  if (!guide.completed.includes(stepId)) {
    return { success: false, msg: '아직 완료하지 않은 단계입니다.' };
  }
  if (guide.claimed.includes(stepId)) {
    return { success: false, msg: '이미 보상을 수령했습니다.' };
  }

  const idx = STEP_INDEX[stepId];
  if (idx === undefined) return { success: false, msg: '존재하지 않는 단계입니다.' };
  const step = TUTORIAL_STEPS[idx];
  const reward = step.reward;

  // 보상 지급
  const received = [];
  if (reward.gold) {
    player.gold = (player.gold || 0) + reward.gold;
    received.push(`골드 +${reward.gold}`);
  }
  if (reward.exp) {
    player.exp = (player.exp || 0) + reward.exp;
    received.push(`경험치 +${reward.exp}`);
  }
  if (reward.diamonds) {
    player.diamonds = (player.diamonds || 0) + reward.diamonds;
    received.push(`다이아 +${reward.diamonds}`);
  }
  if (reward.title) {
    player.title = reward.title;
    received.push(`칭호 [${reward.title}] 획득`);
  }
  if (reward.mercCard) {
    // 용병 카드 지급 (용병 시스템 연동)
    if (!player._tutorialRewardMercs) player._tutorialRewardMercs = [];
    player._tutorialRewardMercs.push(reward.mercCard);
    received.push(`용병 카드 [${reward.mercCard}] 획득`);
  }

  guide.claimed.push(stepId);

  return {
    success: true,
    msg: `\u{1F381} ${step.title} 보상 수령 완료!`,
    received,
    allClaimed: guide.claimed.length === guide.completed.length && guide.allDone,
  };
}

// ═══ 소켓 핸들러 등록 ═══
function registerTutorialGuideHandlers(io, socket, player, players) {
  const playerId = player.id || player.playerId;

  // 튜토리얼 상태 조회
  socket.on('tutorial_status', () => {
    const p = players[playerId];
    if (!p) return;
    const status = getTutorialStatus(p);
    socket.emit('tutorial_guide_status', status);
  });

  // 보상 수령
  socket.on('tutorial_claim', (data) => {
    const p = players[playerId];
    if (!p) return;
    const result = claimTutorialReward(p, data?.stepId);
    socket.emit('tutorial_guide_result', result);

    if (result.success && result.allClaimed) {
      io.emit('server_msg', {
        msg: `\u{1F389} ${p.displayName || p.className || playerId}님이 모든 튜토리얼을 완료했습니다!`,
        type: 'tutorial',
      });
    }
  });
}

// ═══ 모듈 내보내기 ═══
module.exports = {
  TUTORIAL_STEPS,
  getTutorialStatus,
  checkTutorialProgress,
  claimTutorialReward,
  registerTutorialGuideHandlers,
};

// 튜토리얼 시스템 — v2.59
// 신규 유저 온보딩: 단계별 가이드, 화살표 UI, 보상

const TUTORIAL_STEPS = [
  {
    id: 'welcome', name: '환영합니다!',
    icon: '👋', npcIcon: '👴', npcName: '촌장 아르덴',
    dialog: '모험가여, 환영하네! 이 세계에서 살아남으려면 기본을 배워야 하지. 내가 하나씩 알려주겠네.',
    task: null, // 대화만
    reward: { gold: 100 },
    highlight: null,
  },
  {
    id: 'move', name: '이동하기',
    icon: '🏃', npcIcon: '👴', npcName: '촌장 아르덴',
    dialog: 'WASD 키나 화면의 조이스틱으로 이동할 수 있네. 마을 밖으로 나가보게!',
    task: { type: 'move', desc: '마을 밖으로 이동하세요' },
    reward: { gold: 50 },
    highlight: 'joystick',
  },
  {
    id: 'attack', name: '공격하기',
    icon: '⚔️', npcIcon: '👴', npcName: '촌장 아르덴',
    dialog: 'Space키를 누르면 마우스 방향으로 공격하네. 빨간 공격 버튼을 눌러도 되고!',
    task: { type: 'attack', desc: '몬스터를 1마리 처치하세요', goal: 1 },
    reward: { gold: 100, exp: 200 },
    highlight: 'attack-btn',
  },
  {
    id: 'hunt', name: '사냥하기',
    icon: '💀', npcIcon: '👴', npcName: '촌장 아르덴',
    dialog: '좋아! 이제 슬라임 5마리를 사냥해보게. 경험치를 모아 레벨을 올리는 거야.',
    task: { type: 'kill', desc: '몬스터 5마리 처치', goal: 5 },
    reward: { gold: 300, exp: 500 },
    highlight: null,
  },
  {
    id: 'menu', name: '메뉴 사용',
    icon: '📋', npcIcon: '👴', npcName: '촌장 아르덴',
    dialog: '화면 하단에 메뉴 버튼이 있네. 전투, 아이템, 교역, 소셜, 기타 — 다양한 기능을 이용할 수 있지!',
    task: { type: 'open_menu', desc: '하단 메뉴를 열어보세요' },
    reward: { gold: 100 },
    highlight: 'bottom-bar',
  },
  {
    id: 'npc', name: 'NPC 대화',
    icon: '💬', npcIcon: '💚', npcName: '신관 루미아',
    dialog: '마을에서 NPC 안내 바를 클릭하면 NPC 목록이 나옵니다. 힐러에게 치료를 받아보세요!',
    task: { type: 'npc_talk', desc: '마을 NPC 목록을 열어보세요' },
    reward: { gold: 200 },
    highlight: 'town-npc',
  },
  {
    id: 'equip', name: '장비 확인',
    icon: '🛡️', npcIcon: '🔨', npcName: '대장장이 볼칸',
    dialog: '인벤토리에서 장비를 확인하고 착용할 수 있어! 좋은 장비는 전투력을 크게 올려주지.',
    task: { type: 'open_inventory', desc: '인벤토리를 열어보세요' },
    reward: { gold: 200, item: 'pot_hp_s' },
    highlight: null,
  },
  {
    id: 'dungeon', name: '던전 도전',
    icon: '🏰', npcIcon: '👴', npcName: '촌장 아르덴',
    dialog: 'Lv.5가 되면 던전에 도전할 수 있네. 기타 메뉴에서 던전을 찾아보게!',
    task: { type: 'reach_level', desc: 'Lv.5 달성', goal: 5 },
    reward: { gold: 500, exp: 1000, diamonds: 20 },
    highlight: null,
  },
  {
    id: 'story', name: '메인 스토리',
    icon: '📖', npcIcon: '⛪', npcName: '대신관 엘리아스',
    dialog: '기타 메뉴에서 메인 스토리를 확인하세요. 세계를 구하는 여정이 당신을 기다리고 있습니다!',
    task: { type: 'open_story', desc: '메인 스토리를 열어보세요' },
    reward: { gold: 300, diamonds: 10 },
    highlight: null,
  },
  {
    id: 'complete', name: '튜토리얼 완료!',
    icon: '🎉', npcIcon: '👴', npcName: '촌장 아르덴',
    dialog: '훌륭하네, 모험가여! 이제 기본은 다 배웠어. 이 세계는 넓고 위험하지만, 자네라면 해낼 수 있을 거야. 행운을 빌겠네!',
    task: null,
    reward: { gold: 1000, diamonds: 50, title: 'graduate' },
    highlight: null,
  },
];

function getTutorialProgress(player) {
  if (!player._tutorial) player._tutorial = { step: 0, completed: false, progress: 0 };
  return player._tutorial;
}

function getCurrentStep(player) {
  const tut = getTutorialProgress(player);
  if (tut.completed) return null;
  return TUTORIAL_STEPS[tut.step] || null;
}

function checkTutorialProgress(player, action, data) {
  const tut = getTutorialProgress(player);
  if (tut.completed) return null;

  const step = TUTORIAL_STEPS[tut.step];
  if (!step || !step.task) return null;

  let progressed = false;

  switch (step.task.type) {
    case 'move':
      if (action === 'zone_change') progressed = true;
      break;
    case 'attack':
    case 'kill':
      if (action === 'kill') {
        tut.progress++;
        if (tut.progress >= (step.task.goal || 1)) progressed = true;
      }
      break;
    case 'open_menu':
      if (action === 'open_menu') progressed = true;
      break;
    case 'npc_talk':
      if (action === 'npc_talk') progressed = true;
      break;
    case 'open_inventory':
      if (action === 'open_inventory') progressed = true;
      break;
    case 'reach_level':
      if (action === 'level_up' && data.level >= step.task.goal) progressed = true;
      break;
    case 'open_story':
      if (action === 'open_story') progressed = true;
      break;
  }

  if (progressed) return advanceTutorial(player);
  return { type: 'progress', step: step.id, progress: tut.progress, goal: step.task.goal || 1 };
}

function advanceTutorial(player) {
  const tut = getTutorialProgress(player);
  const step = TUTORIAL_STEPS[tut.step];

  // 보상 지급
  if (step.reward) {
    if (step.reward.gold) player.gold = (player.gold || 0) + step.reward.gold;
    if (step.reward.exp && player.exp !== undefined) player.exp += step.reward.exp;
    if (step.reward.diamonds) player.diamonds = (player.diamonds || 0) + step.reward.diamonds;
    if (step.reward.title) player.title = step.reward.title;
    if (step.reward.item) {
      if (!player.inventory) player.inventory = {};
      player.inventory[step.reward.item] = (player.inventory[step.reward.item] || 0) + 1;
    }
  }

  // 다음 단계
  tut.step++;
  tut.progress = 0;

  if (tut.step >= TUTORIAL_STEPS.length) {
    tut.completed = true;
    return { type: 'tutorial_complete', reward: step.reward };
  }

  const nextStep = TUTORIAL_STEPS[tut.step];
  return {
    type: 'step_complete',
    completedStep: step,
    reward: step.reward,
    nextStep: { id: nextStep.id, name: nextStep.name, icon: nextStep.icon, npcName: nextStep.npcName, dialog: nextStep.dialog, task: nextStep.task, highlight: nextStep.highlight },
  };
}

function skipTutorial(player) {
  const tut = getTutorialProgress(player);
  tut.completed = true;
  tut.step = TUTORIAL_STEPS.length;
  // 스킵 보상 (일부만)
  player.gold = (player.gold || 0) + 500;
  return { success: true, msg: '튜토리얼을 건너뛰었습니다. (+500G)' };
}

function registerTutorialHandlers(socket, playerId, players, io) {
  socket.on('tutorial_status', () => {
    const p = players[playerId];
    if (!p) return;
    const step = getCurrentStep(p);
    const tut = getTutorialProgress(p);
    socket.emit('tutorial_status', {
      completed: tut.completed,
      currentStep: tut.step,
      totalSteps: TUTORIAL_STEPS.length,
      step: step ? {
        id: step.id, name: step.name, icon: step.icon,
        npcIcon: step.npcIcon, npcName: step.npcName,
        dialog: step.dialog, task: step.task,
        highlight: step.highlight, reward: step.reward,
        progress: tut.progress,
      } : null,
    });
  });

  socket.on('tutorial_advance', () => {
    const p = players[playerId];
    if (!p) return;
    const step = getCurrentStep(p);
    if (step && !step.task) {
      // task 없는 단계는 바로 진행
      const result = advanceTutorial(p);
      socket.emit('tutorial_update', result);
    }
  });

  socket.on('tutorial_skip', () => {
    const p = players[playerId];
    if (!p) return;
    const result = skipTutorial(p);
    socket.emit('tutorial_update', { type: 'skipped', ...result });
  });
}

module.exports = {
  TUTORIAL_STEPS,
  getTutorialProgress, getCurrentStep,
  checkTutorialProgress, advanceTutorial, skipTutorial,
  registerTutorialHandlers,
};

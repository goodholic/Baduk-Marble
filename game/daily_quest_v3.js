// 일일 퀘스트 시스템 — v3.0
// 매일 리셋, IO/무역/공성/용병/생활 전 시스템 커버
// 완료 시 골드+다이아+배틀패스EXP 지급

const DAILY_QUESTS = [
  { id: 'io_3',        name: 'IO 서바이벌 3판',     target: 3,  reward: { gold: 1000, diamonds: 5, bpExp: 300 }, category: 'IO' },
  { id: 'trade_1',     name: '무역 1회 완료',       target: 1,  reward: { gold: 500, bpExp: 150 }, category: '무역' },
  { id: 'merc_train_3',name: '용병 훈련 3회',       target: 3,  reward: { gold: 300, bpExp: 100 }, category: '용병' },
  { id: 'arena_1',     name: '아레나 1회 참여',     target: 1,  reward: { gold: 500, diamonds: 3, bpExp: 200 }, category: 'PvP' },
  { id: 'expedition_1',name: '원정 파견 1회',       target: 1,  reward: { gold: 300, bpExp: 100 }, category: 'SLG' },
  { id: 'capture_feed',name: '몬스터 먹이 주기',    target: 1,  reward: { gold: 200, bpExp: 50 }, category: '포획' },
  { id: 'gacha_1',     name: '소환 1회',            target: 1,  reward: { gold: 200, bpExp: 100 }, category: '소환' },
  { id: 'kill_100',    name: '몬스터 100킬',        target: 100,reward: { gold: 800, bpExp: 200 }, category: '전투' },
];

const ALL_COMPLETE_BONUS = { gold: 2000, diamonds: 20, bpExp: 500 };

function getDailyQuests(player) {
  if (!player._dailyQuests) player._dailyQuests = { date: '', quests: {}, allClaimed: false };

  const today = new Date().toDateString();
  if (player._dailyQuests.date !== today) {
    // 일일 리셋
    player._dailyQuests = {
      date: today,
      quests: {},
      allClaimed: false,
    };
    for (const q of DAILY_QUESTS) {
      player._dailyQuests.quests[q.id] = { progress: 0, completed: false, claimed: false };
    }
  }
  return player._dailyQuests;
}

// 퀘스트 진행 (각 시스템에서 호출)
function progressQuest(player, questId, amount) {
  const dq = getDailyQuests(player);
  const quest = dq.quests[questId];
  if (!quest || quest.completed) return null;

  const template = DAILY_QUESTS.find(q => q.id === questId);
  if (!template) return null;

  quest.progress = Math.min(template.target, quest.progress + (amount || 1));
  if (quest.progress >= template.target) {
    quest.completed = true;
    return { completed: true, questName: template.name, reward: template.reward };
  }
  return { completed: false, progress: quest.progress, target: template.target };
}

// 보상 수령
function claimQuestReward(player, questId) {
  const dq = getDailyQuests(player);
  const quest = dq.quests[questId];
  if (!quest) return { success: false, msg: '퀘스트 없음' };
  if (!quest.completed) return { success: false, msg: '아직 미완료' };
  if (quest.claimed) return { success: false, msg: '이미 수령' };

  const template = DAILY_QUESTS.find(q => q.id === questId);
  quest.claimed = true;

  // 보상 지급
  const r = template.reward;
  if (r.gold) player.gold = (player.gold || 0) + r.gold;
  if (r.diamonds) player.diamonds = (player.diamonds || 0) + r.diamonds;

  // 배틀패스 EXP
  if (r.bpExp) {
    try {
      const bp = require('./battle_pass');
      bp.addBattlePassExp(player, r.bpExp, 'daily_' + questId);
    } catch(e) {}
  }

  return { success: true, msg: `✅ ${template.name} 보상 수령!`, reward: r };
}

// 전체 완료 보너스
function claimAllBonus(player) {
  const dq = getDailyQuests(player);
  if (dq.allClaimed) return { success: false, msg: '이미 수령' };

  const allDone = DAILY_QUESTS.every(q => dq.quests[q.id]?.claimed);
  if (!allDone) return { success: false, msg: '모든 퀘스트 보상을 먼저 수령하세요' };

  dq.allClaimed = true;
  player.gold = (player.gold || 0) + ALL_COMPLETE_BONUS.gold;
  player.diamonds = (player.diamonds || 0) + ALL_COMPLETE_BONUS.diamonds;

  try {
    const bp = require('./battle_pass');
    bp.addBattlePassExp(player, ALL_COMPLETE_BONUS.bpExp, 'daily_all');
  } catch(e) {}

  return { success: true, msg: '🏆 일일 퀘스트 전체 완료! +2,000G +20💎', reward: ALL_COMPLETE_BONUS };
}

// 상태 조회
function getDailyQuestStatus(player) {
  const dq = getDailyQuests(player);
  return {
    quests: DAILY_QUESTS.map(q => ({
      id: q.id, name: q.name, category: q.category,
      target: q.target,
      progress: dq.quests[q.id]?.progress || 0,
      completed: dq.quests[q.id]?.completed || false,
      claimed: dq.quests[q.id]?.claimed || false,
      reward: q.reward,
    })),
    allComplete: DAILY_QUESTS.every(q => dq.quests[q.id]?.claimed),
    allClaimed: dq.allClaimed,
    allBonus: ALL_COMPLETE_BONUS,
  };
}

function registerDailyQuestHandlers(socket, playerId, players, io) {
  socket.on('daily_quest_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('daily_quest_status', getDailyQuestStatus(p));
  });

  socket.on('daily_quest_claim', (questId) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('daily_quest_result', claimQuestReward(p, questId));
  });

  socket.on('daily_quest_claim_all', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('daily_quest_result', claimAllBonus(p));
  });
}

module.exports = { registerDailyQuestHandlers, progressQuest, getDailyQuestStatus, DAILY_QUESTS };

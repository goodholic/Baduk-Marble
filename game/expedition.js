// 원정(Expedition) 시스템 — v1.55
// 멀티 스테이지 장기 퀘스트 + 분기 선택
// 일일 퀘스트와 다른 점: 5~7 스테이지, 며칠에 걸쳐 진행, 분기 선택지 있음

const EXPEDITIONS = {
  dragon_slayer: {
    name: '드래곤 슬레이어 원정',
    icon: '🐉',
    minLevel: 25,
    desc: '전설의 드래곤을 추적하는 7일간의 여정',
    stages: [
      { id:1, name:'단서 수집', goal:'몬스터 처치 100마리', target:'kill_monster', count:100 },
      { id:2, name:'고대 유적 탐사', goal:'달그림자 유적 방문', target:'visit_zone', zone:'ruins' },
      { id:3, name:'드래곤 둥지 발견', goal:'용의 요람 도착', target:'visit_zone', zone:'dragon' },
      { id:4, name:'분기 선택', branch: true, options: [
        { id:'stealth', name:'은신 접근', desc:'어쌔신/메이지 유리', bonus:{ critRate:0.10 } },
        { id:'frontal', name:'정면 돌파', desc:'워리어/나이트 유리', bonus:{ atk:30, def:20 } },
      ]},
      { id:5, name:'드래곤 격파', goal:'보스 1처치', target:'kill_boss', count:1 },
      { id:6, name:'전리품 수집', goal:'드래곤 비늘 5개', target:'collect_item', item:'mat_dragon', count:5 },
      { id:7, name:'귀환', goal:'마을로 귀환', target:'visit_zone', zone:'aden' },
    ],
    rewards: {
      complete: { gold: 50000, exp: 80000, diamonds: 300, item: 'equip_sword_5', title: 'dragon_slayer_expedition' },
      stage: { gold: 5000, exp: 8000 }, // 스테이지당 부분 보상
    },
  },
  treasure_hunter: {
    name: '보물 사냥꾼 원정',
    icon: '💎',
    minLevel: 15,
    desc: '잃어버린 보물을 찾아 떠나는 5일간의 모험',
    stages: [
      { id:1, name:'고지도 해석', goal:'점쟁이 NPC 방문', target:'talk_npc', npc:'점쟁이' },
      { id:2, name:'함정 통과', goal:'25 지역 탐험', target:'explore_count', count:25 },
      { id:3, name:'분기 선택', branch: true, options: [
        { id:'help_locals', name:'주민 도움', desc:'평화적 해결', bonus:{ goldBonus:0.10 } },
        { id:'force_path', name:'힘으로 돌파', desc:'PvP 전투', bonus:{ atk:15 } },
      ]},
      { id:4, name:'보물 발굴', goal:'보물 5개 발견', target:'treasure_found', count:5 },
      { id:5, name:'안전 귀환', goal:'마을로 귀환', target:'visit_zone', zone:'aden' },
    ],
    rewards: {
      complete: { gold: 30000, exp: 40000, diamonds: 150, item: 'mythic_relic_box' },
      stage: { gold: 3000, exp: 5000 },
    },
  },
  void_explorer: {
    name: '공허의 탐험가 원정',
    icon: '🌌',
    minLevel: 40,
    desc: '차원 너머의 비밀을 밝히는 7일간의 위험한 탐험',
    stages: [
      { id:1, name:'균열 발견', goal:'공허의 균열 도착', target:'visit_zone', zone:'void_rift' },
      { id:2, name:'차원 안정화', goal:'전설급 처치 5', target:'kill_legendary', count:5 },
      { id:3, name:'고대 지식 수집', goal:'몬스터 도감 50종', target:'codex_monster', count:50 },
      { id:4, name:'분기 선택', branch: true, options: [
        { id:'preserve', name:'보존 선택', desc:'지식 우선 — EXP 중심', bonus:{ expBonus:0.20 } },
        { id:'destroy', name:'파괴 선택', desc:'안전 우선 — 골드 중심', bonus:{ goldBonus:0.20 } },
      ]},
      { id:5, name:'공허의 군주 격파', goal:'월드 보스 1처치', target:'worldboss_kill', count:1 },
      { id:6, name:'차원 봉인', goal:'룬 워드 1회 활성', target:'rune_word', count:1 },
      { id:7, name:'귀환의 의식', goal:'마을로 귀환', target:'visit_zone', zone:'aden' },
    ],
    rewards: {
      complete: { gold: 100000, exp: 150000, diamonds: 600, item: 'primordial_orb', title: 'void_walker' },
      stage: { gold: 10000, exp: 15000 },
    },
  },
};

const EXPEDITION_CONFIG = {
  maxActiveExpeditions: 2, // 동시에 진행 가능한 원정 수
};

function _ensure(player) {
  if (!player.expeditions) player.expeditions = { active: {}, completed: [] };
  return player.expeditions;
}

function startExpedition(player, expId) {
  const expDef = EXPEDITIONS[expId];
  if (!expDef) return { success: false, msg: '존재하지 않는 원정' };
  if ((player.level || 1) < expDef.minLevel) {
    return { success: false, msg: `레벨 ${expDef.minLevel} 필요` };
  }
  const e = _ensure(player);
  if (e.active[expId]) return { success: false, msg: '이미 진행 중' };
  if (e.completed.includes(expId)) return { success: false, msg: '이미 완료' };
  if (Object.keys(e.active).length >= EXPEDITION_CONFIG.maxActiveExpeditions) {
    return { success: false, msg: `동시 진행 한도 (${EXPEDITION_CONFIG.maxActiveExpeditions}개)` };
  }
  e.active[expId] = {
    currentStage: 1,
    progress: 0,
    branch: null,
    startedAt: Date.now(),
    stageStartedAt: Date.now(),
  };
  return { success: true, expedition: { ...expDef, ...e.active[expId] } };
}

function trackStage(player, target, count = 1, extra = {}) {
  const e = _ensure(player);
  const updated = [];
  for (const [expId, state] of Object.entries(e.active)) {
    const expDef = EXPEDITIONS[expId];
    if (!expDef) continue;
    const currentStageDef = expDef.stages.find(s => s.id === state.currentStage);
    if (!currentStageDef || currentStageDef.branch) continue;
    if (currentStageDef.target !== target) continue;

    // 추가 조건 확인
    if (currentStageDef.zone && extra.zone !== currentStageDef.zone) continue;
    if (currentStageDef.npc && extra.npc !== currentStageDef.npc) continue;
    if (currentStageDef.item && extra.item !== currentStageDef.item) continue;

    state.progress += count;
    const goalCount = currentStageDef.count || 1;
    if (state.progress >= goalCount) {
      // 스테이지 완료 — 부분 보상 + 다음 스테이지로
      const nextStage = expDef.stages.find(s => s.id === state.currentStage + 1);
      if (nextStage) {
        // 부분 보상
        const partial = expDef.rewards.stage;
        if (partial.gold) player.gold = (player.gold || 0) + partial.gold;
        if (partial.exp) player.exp = (player.exp || 0) + partial.exp;

        state.currentStage++;
        state.progress = 0;
        state.stageStartedAt = Date.now();
        updated.push({ expId, stageCompleted: state.currentStage - 1, nextStage: state.currentStage });
      } else {
        // 마지막 스테이지 완료 — 원정 종료
        const reward = expDef.rewards.complete;
        if (reward.gold) player.gold = (player.gold || 0) + reward.gold;
        if (reward.exp) player.exp = (player.exp || 0) + reward.exp;
        if (reward.diamonds) player.diamonds = (player.diamonds || 0) + reward.diamonds;
        if (reward.item) {
          if (!player.inventory) player.inventory = {};
          player.inventory[reward.item] = (player.inventory[reward.item] || 0) + 1;
        }
        if (reward.title) {
          if (!player.titles) player.titles = [];
          if (!player.titles.includes(reward.title)) player.titles.push(reward.title);
        }
        delete e.active[expId];
        e.completed.push(expId);
        updated.push({ expId, expeditionCompleted: true, reward });
      }
    }
  }
  return updated;
}

function pickBranch(player, expId, branchOption) {
  const e = _ensure(player);
  const state = e.active[expId];
  if (!state) return { success: false, msg: '진행 중이 아님' };
  const expDef = EXPEDITIONS[expId];
  const currentStage = expDef.stages.find(s => s.id === state.currentStage);
  if (!currentStage || !currentStage.branch) return { success: false, msg: '분기 스테이지 아님' };
  const opt = currentStage.options.find(o => o.id === branchOption);
  if (!opt) return { success: false, msg: '존재하지 않는 선택지' };

  state.branch = branchOption;
  // 다음 스테이지로
  const nextStage = expDef.stages.find(s => s.id === state.currentStage + 1);
  if (nextStage) {
    state.currentStage++;
    state.progress = 0;
    state.stageStartedAt = Date.now();
  }
  return { success: true, branch: opt, nextStage: state.currentStage };
}

function getStatus(player) {
  const e = _ensure(player);
  const result = {};
  for (const [expId, state] of Object.entries(e.active)) {
    const expDef = EXPEDITIONS[expId];
    result[expId] = {
      ...expDef,
      currentStage: state.currentStage,
      progress: state.progress,
      branch: state.branch,
      currentStageDef: expDef.stages.find(s => s.id === state.currentStage),
    };
  }
  return {
    active: result,
    completed: e.completed,
    available: Object.entries(EXPEDITIONS)
      .filter(([id]) => !e.active[id] && !e.completed.includes(id))
      .map(([id, def]) => ({ id, ...def })),
  };
}

module.exports = {
  EXPEDITIONS,
  EXPEDITION_CONFIG,
  startExpedition,
  trackStage,
  pickBranch,
  getStatus,
};

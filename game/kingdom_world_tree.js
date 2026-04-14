// v6.6 — 세계수 시스템
// 영지에 세계수를 심고 성장, 서버 전체에 영향, 최종 엔드게임

const GROWTH_STAGES = [
  { stage: 1, name: '씨앗', icon: '🌱', req: { gold: 10000, time: 86400 }, effect: {}, desc: '세계수의 시작' },
  { stage: 2, name: '묘목', icon: '🌿', req: { gold: 50000, water: 100, time: 259200 }, effect: { hpRegen: 0.01 }, desc: '작은 나무' },
  { stage: 3, name: '어린 나무', icon: '🌳', req: { gold: 150000, water: 300, sunlight: 200, time: 604800 }, effect: { hpRegen: 0.02, expBonus: 1.05 }, desc: '성장하는 나무' },
  { stage: 4, name: '거목', icon: '🌳✨', req: { gold: 500000, water: 500, sunlight: 500, moonlight: 200, time: 1209600 }, effect: { hpRegen: 0.03, expBonus: 1.1, allStat: 1.03 }, desc: '거대한 나무' },
  { stage: 5, name: '세계수', icon: '🌍🌳👑', req: { gold: 1000000, water: 1000, sunlight: 1000, moonlight: 500, stardust: 100, time: 2592000 }, effect: { hpRegen: 0.05, expBonus: 1.15, allStat: 1.05, serverBuff: true }, desc: '세계수 완성! 서버 전체에 축복!', final: true },
];

// 세계수 축복 (서버 전체)
const WORLD_TREE_BLESSINGS = [
  { id: 'life', name: '생명의 축복', icon: '💚🌳', effect: '서버 전체 HP 재생+2%', duration: 86400 },
  { id: 'growth', name: '성장의 축복', icon: '📈🌳', effect: '서버 전체 EXP+10%', duration: 86400 },
  { id: 'harmony', name: '조화의 축복', icon: '☮️🌳', effect: '서버 전체 PvP DMG-20% (평화)', duration: 43200 },
  { id: 'nature', name: '자연의 축복', icon: '🌿🌳', effect: '채집/농사 수확 2배', duration: 86400 },
  { id: 'protection', name: '수호의 축복', icon: '🛡️🌳', effect: '공성전 수비 DEF+15%', duration: 86400 },
];

// 세계수 자원 (성장에 필요)
const TREE_RESOURCES = [
  { id: 'water', name: '성수', icon: '💧✨', source: '낚시/요리/치유', desc: '물의 정수' },
  { id: 'sunlight', name: '태양빛 결정', icon: '☀️💎', source: '주간 전투/화속성', desc: '태양의 힘' },
  { id: 'moonlight', name: '달빛 결정', icon: '🌙💎', source: '야간 전투/빙속성', desc: '달의 힘' },
  { id: 'stardust', name: '별의 먼지', icon: '⭐✨', source: '차원 정복/별자리/우주 이벤트', desc: '가장 희귀한 자원', rarity: 'myth' },
];

// 세계수 위협 (적이 세계수를 공격할 수 있음)
const TREE_THREATS = [
  { id: 'corruption', name: '타락', chance: 0.05, effect: '세계수 HP -10%, 축복 정지', desc: '어둠이 세계수를 오염시킨다', counter: '정화 의식 (5인)' },
  { id: 'siege', name: '공성', chance: 0.03, effect: '적 길드가 세계수를 목표로 공성', desc: '세계수를 지켜라!', counter: '수비 전투' },
  { id: 'wither', name: '시듦', chance: 0.08, effect: '자원 미공급 시 단계 하락', desc: '물과 빛이 필요하다', counter: '자원 공급' },
  { id: 'parasite', name: '기생충', chance: 0.04, effect: '세계수 효과 역전 (디버프)', desc: '내부의 적!', counter: '세계수 탐색 퀘스트' },
];

// 세계수 최종 보상 (5단계 완성)
const FINAL_REWARD = {
  title: '세계수의 수호자 🌍🌳👑',
  serverBuff: '서버 전체 전스탯+3% (영구, 세계수 유지 중)',
  personalBuff: { allStat: 1.1, hpRegen: 0.05, expBonus: 1.2 },
  specialMerc: 'world_tree_spirit',
  desc: '세계수를 완성한 최초의 영지! 서버의 수호자가 되다.',
};

function waterTree(player, resourceId, amount) {
  const tree = player.worldTree;
  if (!tree) return { ok: false, reason: '세계수 없음 (씨앗 심기 필요)' };
  tree.resources = tree.resources || {};
  tree.resources[resourceId] = (tree.resources[resourceId] || 0) + amount;
  return { ok: true, resource: resourceId, total: tree.resources[resourceId] };
}

function growTree(player) {
  const tree = player.worldTree;
  if (!tree) return { ok: false, reason: '세계수 없음' };
  const nextStage = GROWTH_STAGES[tree.stage];
  if (!nextStage) return { ok: false, reason: '최대 성장' };
  if ((player.gold || 0) < nextStage.req.gold) return { ok: false, reason: '골드 부족' };
  player.gold -= nextStage.req.gold;
  tree.stage++;
  return { ok: true, stage: tree.stage, effect: nextStage.effect, name: nextStage.name };
}

function register(io, socket, player) {
  socket.on('world_tree_info', () => {
    socket.emit('world_tree_info', { stages: GROWTH_STAGES, blessings: WORLD_TREE_BLESSINGS, resources: TREE_RESOURCES, threats: TREE_THREATS, finalReward: FINAL_REWARD, tree: player.worldTree });
  });
  socket.on('world_tree_plant', () => {
    if (player.worldTree) return socket.emit('world_tree_result', { ok: false, reason: '이미 심음' });
    player.worldTree = { stage: 1, resources: {}, planted: Date.now() };
    socket.emit('world_tree_result', { ok: true });
    io.emit('server_msg', `🌱 [세계수] ${player.name}이(가) 세계수의 씨앗을 심었다!`);
  });
  socket.on('world_tree_grow', () => {
    const result = growTree(player);
    socket.emit('world_tree_grow_result', result);
    if (result.ok && result.stage === 5) io.emit('server_msg', `🌍🌳👑 [세계수 완성!] ${player.name}의 세계수가 완전 성장! 서버 전체에 축복이 내린다!`);
  });
  socket.on('world_tree_water', (data) => {
    socket.emit('world_tree_water_result', waterTree(player, data.resourceId, data.amount));
  });
}

module.exports = { GROWTH_STAGES, WORLD_TREE_BLESSINGS, TREE_RESOURCES, TREE_THREATS, FINAL_REWARD, waterTree, growTree, register };

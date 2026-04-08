// 특성 트리 (Talent / Skill Tree) — v1.35
// 레벨업 시 1포인트 획득 (Lv.50 만렙 = 50 포인트)
// 3개 브랜치 × 7개 노드 = 총 21 노드
// 각 노드는 1~5 랭크, 랭크당 효과 중첩
// 환생 시 포인트 환원

const SKILL_TREE = {
  offense: {
    name: '공격 특성',
    icon: '⚔️',
    color: '#ff4444',
    nodes: [
      { id:'off_atk',     name:'공격력 단련',  maxRank:5, perRank:{ atk: 3 },             requires: 0 },
      { id:'off_crit',    name:'크리티컬',    maxRank:5, perRank:{ critRate: 0.02 },     requires: 0 },
      { id:'off_speed',   name:'공격 속도',   maxRank:3, perRank:{ atkSpeed: 0.05 },     requires: 5 },
      { id:'off_pierce',  name:'관통',        maxRank:3, perRank:{ pierce: 0.04 },       requires: 10 },
      { id:'off_burst',   name:'폭발 일격',   maxRank:3, perRank:{ critDmg: 0.10 },      requires: 15 },
      { id:'off_execute', name:'마무리 일격', maxRank:1, perRank:{ executeBonus: 0.15 },requires: 20 },
      { id:'off_master',  name:'전쟁의 화신', maxRank:1, perRank:{ atk: 30, critRate: 0.05 }, requires: 25 },
    ],
  },
  defense: {
    name: '방어 특성',
    icon: '🛡️',
    color: '#4488ff',
    nodes: [
      { id:'def_def',     name:'방어력 단련',  maxRank:5, perRank:{ def: 3 },             requires: 0 },
      { id:'def_hp',      name:'체력 단련',    maxRank:5, perRank:{ hp: 30 },             requires: 0 },
      { id:'def_dodge',   name:'회피',        maxRank:3, perRank:{ dodgeRate: 0.02 },    requires: 5 },
      { id:'def_regen',   name:'재생',        maxRank:3, perRank:{ hpRegen: 0.10 },      requires: 10 },
      { id:'def_block',   name:'피해 감소',   maxRank:3, perRank:{ dmgReduce: 0.03 },    requires: 15 },
      { id:'def_revive',  name:'불굴',        maxRank:1, perRank:{ reviveChance: 0.10 },requires: 20 },
      { id:'def_master',  name:'불멸의 의지', maxRank:1, perRank:{ def: 30, hp: 300 },   requires: 25 },
    ],
  },
  utility: {
    name: '유틸리티 특성',
    icon: '✨',
    color: '#aa44ff',
    nodes: [
      { id:'util_exp',    name:'경험치 보너스', maxRank:5, perRank:{ expBonus: 0.03 },    requires: 0 },
      { id:'util_gold',   name:'골드 보너스',   maxRank:5, perRank:{ goldBonus: 0.03 },   requires: 0 },
      { id:'util_drop',   name:'드롭률',       maxRank:3, perRank:{ dropRate: 0.03 },    requires: 5 },
      { id:'util_speed',  name:'이동 속도',    maxRank:3, perRank:{ speed: 1 },          requires: 10 },
      { id:'util_lucky',  name:'행운',        maxRank:3, perRank:{ luckyChance: 0.02 }, requires: 15 },
      { id:'util_scout',  name:'정찰',        maxRank:1, perRank:{ visionRange: 5 },    requires: 20 },
      { id:'util_master', name:'운명의 인도자', maxRank:1, perRank:{ expBonus: 0.20, goldBonus: 0.20, dropRate: 0.10 }, requires: 25 },
    ],
  },
};

const TREE_CONFIG = {
  pointsPerLevel: 1,        // 레벨업당 1포인트
  resetCostDiamond: 100,    // 100💎 → 트리 전체 리셋
  maxTotalPoints: 50,       // 만렙 50 + 환생 보너스
};

function _ensure(player) {
  if (!player.talents) player.talents = { points: 0, spent: {}, totalSpent: 0 };
  return player.talents;
}

function awardPoints(player, levels = 1) {
  const t = _ensure(player);
  t.points += levels * TREE_CONFIG.pointsPerLevel;
  return t.points;
}

function _findNode(nodeId) {
  for (const branch of Object.values(SKILL_TREE)) {
    const node = branch.nodes.find(n => n.id === nodeId);
    if (node) return { branch, node };
  }
  return null;
}

function spendPoint(player, nodeId) {
  const t = _ensure(player);
  const found = _findNode(nodeId);
  if (!found) return { success: false, msg: '존재하지 않는 노드' };
  const { node } = found;
  if (t.points < 1) return { success: false, msg: '포인트 부족' };
  if (t.totalSpent < node.requires) return { success: false, msg: `해당 노드는 ${node.requires}포인트 투자 후 해금` };
  const currentRank = t.spent[nodeId] || 0;
  if (currentRank >= node.maxRank) return { success: false, msg: '이미 최대 랭크' };
  t.spent[nodeId] = currentRank + 1;
  t.points--;
  t.totalSpent++;
  return { success: true, newRank: currentRank + 1, pointsLeft: t.points };
}

function resetTree(player) {
  const t = _ensure(player);
  t.points += t.totalSpent;
  t.spent = {};
  t.totalSpent = 0;
  return { success: true, refunded: t.points };
}

function getTreeBonus(player, stat) {
  const t = _ensure(player);
  let total = 0;
  for (const [nodeId, rank] of Object.entries(t.spent)) {
    const found = _findNode(nodeId);
    if (!found) continue;
    const value = found.node.perRank[stat];
    if (value) total += value * rank;
  }
  return total;
}

function getTreeStatus(player) {
  const t = _ensure(player);
  return {
    points: t.points,
    totalSpent: t.totalSpent,
    spent: t.spent,
    branches: Object.entries(SKILL_TREE).map(([branchId, branch]) => ({
      id: branchId,
      name: branch.name,
      icon: branch.icon,
      color: branch.color,
      nodes: branch.nodes.map(n => ({
        ...n,
        currentRank: t.spent[n.id] || 0,
        unlocked: t.totalSpent >= n.requires,
      })),
    })),
    resetCost: TREE_CONFIG.resetCostDiamond,
  };
}

module.exports = {
  SKILL_TREE,
  TREE_CONFIG,
  awardPoints,
  spendPoint,
  resetTree,
  getTreeBonus,
  getTreeStatus,
};

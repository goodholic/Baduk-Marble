// 채집 시스템 — v1.97
// 노드별 쿨다운 자원 수집, 도구 등급에 따라 효율 변동

const NODES = {
  oak_tree:    { name:'참나무',     resource:'wood',  baseAmount:[2,5],  cooldownMin: 5,  tool:'axe',     skill:'woodcut' },
  pine_tree:   { name:'소나무',     resource:'wood',  baseAmount:[3,6],  cooldownMin: 6,  tool:'axe',     skill:'woodcut' },
  copper_vein: { name:'구리 광맥',  resource:'copper',baseAmount:[1,3],  cooldownMin: 8,  tool:'pickaxe', skill:'mining'  },
  iron_vein:   { name:'철 광맥',    resource:'iron',  baseAmount:[1,2],  cooldownMin:12,  tool:'pickaxe', skill:'mining'  },
  gold_vein:   { name:'금 광맥',    resource:'gold_ore',baseAmount:[1,2],cooldownMin:20,  tool:'pickaxe', skill:'mining'  },
  herb_patch:  { name:'약초밭',     resource:'herb_wild',baseAmount:[2,4],cooldownMin: 4, tool:'sickle',  skill:'herbalism' },
  berry_bush:  { name:'베리 덤불',  resource:'berry', baseAmount:[3,7],  cooldownMin: 5,  tool:null,      skill:'foraging' },
  mushroom:    { name:'버섯 군락',  resource:'mushroom',baseAmount:[1,4],cooldownMin: 7,  tool:null,      skill:'foraging' },
};

const TOOLS = {
  axe_basic:    { name:'녹슨 도끼', tool:'axe',     bonus:0.0, price: 50  },
  axe_iron:     { name:'철 도끼',   tool:'axe',     bonus:0.5, price: 300 },
  axe_mythril:  { name:'미스릴 도끼',tool:'axe',    bonus:1.5, price:1500 },
  pickaxe_basic:{ name:'녹슨 곡괭이',tool:'pickaxe',bonus:0.0, price: 50  },
  pickaxe_iron: { name:'철 곡괭이', tool:'pickaxe', bonus:0.5, price: 300 },
  pickaxe_mythril:{ name:'미스릴 곡괭이',tool:'pickaxe',bonus:1.5,price:1500 },
  sickle_basic: { name:'녹슨 낫',   tool:'sickle',  bonus:0.0, price: 30  },
  sickle_iron:  { name:'철 낫',     tool:'sickle',  bonus:0.5, price: 200 },
};

const SKILL_LEVELS = [0, 50, 150, 400, 1000, 2500]; // exp per level

function _ensure(player) {
  if (!player.gathering) {
    player.gathering = {
      resources: {},  // {wood: count, copper: ...}
      tools: {},      // {axe: 'axe_basic', pickaxe: ...}
      skills: {       // {woodcut: {level, exp}, ...}
        woodcut:   { level:1, exp:0 },
        mining:    { level:1, exp:0 },
        herbalism: { level:1, exp:0 },
        foraging:  { level:1, exp:0 },
      },
      lastGather: {}, // {nodeId: timestamp}
      gatheredCount: 0,
    };
  }
  return player.gathering;
}

function _skillLevelFromExp(exp) {
  let lv = 1;
  for (let i = 1; i < SKILL_LEVELS.length; i++) {
    if (exp >= SKILL_LEVELS[i]) lv = i + 1;
  }
  return lv;
}

function getStatus(player) {
  const g = _ensure(player);
  const now = Date.now();
  const nodeStatus = {};
  for (const [id, def] of Object.entries(NODES)) {
    const last = g.lastGather[id] || 0;
    const cdMs = def.cooldownMin * 60 * 1000;
    nodeStatus[id] = {
      ...def,
      ready: now >= last + cdMs,
      secondsLeft: Math.max(0, Math.ceil((last + cdMs - now) / 1000)),
    };
  }
  return {
    resources: g.resources,
    tools: g.tools,
    skills: g.skills,
    nodes: nodeStatus,
    gatheredCount: g.gatheredCount,
    allTools: TOOLS,
  };
}

function buyTool(player, toolId) {
  const g = _ensure(player);
  const def = TOOLS[toolId];
  if (!def) return { success:false, msg:'존재하지 않는 도구' };
  if ((player.gold || 0) < def.price) return { success:false, msg:'골드 부족' };
  player.gold -= def.price;
  g.tools[def.tool] = toolId;
  return { success:true, msg:`${def.name} 구매 (${def.price}G)` };
}

function gather(player, nodeId) {
  const g = _ensure(player);
  const def = NODES[nodeId];
  if (!def) return { success:false, msg:'존재하지 않는 노드' };
  const now = Date.now();
  const last = g.lastGather[nodeId] || 0;
  const cdMs = def.cooldownMin * 60 * 1000;
  if (now < last + cdMs) {
    return { success:false, msg:`쿨다운 ${Math.ceil((last+cdMs-now)/60000)}분 남음` };
  }
  // 도구 체크
  let toolBonus = 0;
  if (def.tool) {
    const equipped = g.tools[def.tool];
    if (!equipped) return { success:false, msg:`${def.tool} 도구 필요` };
    toolBonus = TOOLS[equipped]?.bonus || 0;
  }
  const skill = g.skills[def.skill] || { level:1, exp:0 };
  const skillBonus = (skill.level - 1) * 0.15;
  const [lo, hi] = def.baseAmount;
  const base = lo + Math.floor(Math.random() * (hi - lo + 1));
  const amount = Math.max(1, Math.round(base * (1 + toolBonus + skillBonus)));
  g.resources[def.resource] = (g.resources[def.resource] || 0) + amount;
  g.lastGather[nodeId] = now;
  g.gatheredCount += 1;
  // 경험치
  const expGain = 5 + amount;
  skill.exp += expGain;
  const newLv = _skillLevelFromExp(skill.exp);
  let levelUp = false;
  if (newLv > skill.level) { skill.level = newLv; levelUp = true; }
  g.skills[def.skill] = skill;
  return {
    success:true,
    msg:`${def.name}에서 ${def.resource} ${amount}개 채집 (+${expGain} ${def.skill} exp)${levelUp?' 🆙':''}`,
    amount,
    resource: def.resource,
    levelUp,
    newLevel: skill.level,
  };
}

module.exports = {
  NODES,
  TOOLS,
  SKILL_LEVELS,
  getStatus,
  buyTool,
  gather,
};

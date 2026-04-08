// 제련/공방 시스템 — v1.98
// 채집(gathering) 자원을 가공해 잉곳/합금/연료로 변환
// 가공된 결과물은 forgeStock에 저장 (추후 장비 강화 등에 사용 가능)

const RECIPES = {
  // 잉곳
  copper_ingot: {
    name:'구리 잉곳', tier:1, output:'copper_ingot',
    inputs:{ copper: 3, wood: 1 }, outputCount: 1,
    timeMin: 1, fuelCost: 5,
  },
  iron_ingot: {
    name:'철 잉곳', tier:2, output:'iron_ingot',
    inputs:{ iron: 3, wood: 2 }, outputCount: 1,
    timeMin: 2, fuelCost: 10,
  },
  gold_ingot: {
    name:'금 잉곳', tier:3, output:'gold_ingot',
    inputs:{ gold_ore: 3, wood: 2 }, outputCount: 1,
    timeMin: 3, fuelCost: 20,
  },
  // 합금
  bronze_alloy: {
    name:'청동 합금', tier:2, output:'bronze_alloy',
    inputs:{ copper_ingot: 2, iron_ingot: 1 }, outputCount: 1,
    timeMin: 4, fuelCost: 25,
  },
  steel_alloy: {
    name:'강철 합금', tier:3, output:'steel_alloy',
    inputs:{ iron_ingot: 3, copper_ingot: 1 }, outputCount: 1,
    timeMin: 5, fuelCost: 35,
  },
  mythril_alloy: {
    name:'미스릴 합금', tier:4, output:'mythril_alloy',
    inputs:{ iron_ingot: 5, gold_ingot: 2 }, outputCount: 1,
    timeMin: 8, fuelCost: 60,
  },
  // 연료
  charcoal: {
    name:'숯', tier:1, output:'charcoal',
    inputs:{ wood: 4 }, outputCount: 2,
    timeMin: 1, fuelCost: 0,
  },
};

const MAX_QUEUE = 5;

function _ensure(player) {
  if (!player.forge) {
    player.forge = {
      stock: {},  // {copper_ingot: count, ...}
      queue: [],  // [{recipeId, finishAt}]
      totalForged: 0,
      fuel: 50,   // 시작 연료
    };
  }
  return player.forge;
}

function _collectQueue(player) {
  const f = _ensure(player);
  const now = Date.now();
  const remaining = [];
  let collected = 0;
  for (const job of f.queue) {
    if (now >= job.finishAt) {
      const recipe = RECIPES[job.recipeId];
      if (recipe) {
        f.stock[recipe.output] = (f.stock[recipe.output] || 0) + recipe.outputCount;
        f.totalForged += 1;
        collected += 1;
      }
    } else {
      remaining.push(job);
    }
  }
  f.queue = remaining;
  return collected;
}

function getStatus(player) {
  const f = _ensure(player);
  const collected = _collectQueue(player);
  const now = Date.now();
  return {
    stock: f.stock,
    fuel: f.fuel,
    queue: f.queue.map(j => ({
      recipeId: j.recipeId,
      name: RECIPES[j.recipeId]?.name,
      secondsLeft: Math.max(0, Math.ceil((j.finishAt - now) / 1000)),
    })),
    queueMax: MAX_QUEUE,
    totalForged: f.totalForged,
    justCollected: collected,
    recipes: RECIPES,
  };
}

function refuel(player, amount) {
  const f = _ensure(player);
  amount = Math.max(1, Math.floor(amount || 10));
  const cost = amount * 2; // 2골드/연료
  if ((player.gold || 0) < cost) return { success:false, msg:'골드 부족' };
  player.gold -= cost;
  f.fuel += amount;
  return { success:true, msg:`연료 +${amount} (${cost}G)`, fuel: f.fuel };
}

function startForge(player, recipeId) {
  const f = _ensure(player);
  _collectQueue(player);
  const recipe = RECIPES[recipeId];
  if (!recipe) return { success:false, msg:'존재하지 않는 레시피' };
  if (f.queue.length >= MAX_QUEUE) return { success:false, msg:`작업 슬롯 가득 (${MAX_QUEUE})` };
  if (f.fuel < recipe.fuelCost) return { success:false, msg:`연료 부족 (${recipe.fuelCost} 필요)` };

  // 입력 자원 확인 (gathering의 resources 또는 forge의 stock에서)
  const gathering = player.gathering || {};
  const gres = gathering.resources || {};
  for (const [id, qty] of Object.entries(recipe.inputs)) {
    const have = (gres[id] || 0) + (f.stock[id] || 0);
    if (have < qty) return { success:false, msg:`재료 부족: ${id} (${have}/${qty})` };
  }
  // 차감 — gathering 우선
  for (const [id, qty] of Object.entries(recipe.inputs)) {
    let need = qty;
    const fromGather = Math.min(gres[id] || 0, need);
    if (fromGather > 0) {
      gres[id] -= fromGather;
      need -= fromGather;
    }
    if (need > 0) {
      f.stock[id] -= need;
    }
  }
  f.fuel -= recipe.fuelCost;
  f.queue.push({
    recipeId,
    finishAt: Date.now() + recipe.timeMin * 60 * 1000,
  });
  return { success:true, msg:`${recipe.name} 제련 시작 (${recipe.timeMin}분)` };
}

function speedup(player, jobIndex) {
  const f = _ensure(player);
  if (!f.queue[jobIndex]) return { success:false, msg:'작업 없음' };
  const cost = 20; // 다이아 즉시 완료
  if ((player.diamond || 0) < cost) return { success:false, msg:`다이아 ${cost} 부족` };
  player.diamond -= cost;
  f.queue[jobIndex].finishAt = Date.now();
  _collectQueue(player);
  return { success:true, msg:`즉시 완료 (-${cost}💎)` };
}

module.exports = {
  RECIPES,
  MAX_QUEUE,
  getStatus,
  refuel,
  startForge,
  speedup,
};

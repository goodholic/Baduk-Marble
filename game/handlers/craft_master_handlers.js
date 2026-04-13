// 크래프팅 마스터 시스템 — v4.1
function registerCraftMasterHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  const CRAFT_GRADES = [
    { name: '견습',         minExp: 0,     successBonus: 0,    salvageRate: 0 },
    { name: '도제',         minExp: 500,   successBonus: 0.03, salvageRate: 0 },
    { name: '숙련',         minExp: 2000,  successBonus: 0.07, salvageRate: 0.5 },
    { name: '장인',         minExp: 8000,  successBonus: 0.12, salvageRate: 0.7, canEngrave: true },
    { name: '명장',         minExp: 25000, successBonus: 0.18, salvageRate: 0.8, canEngrave: true },
    { name: '대장장이의 신', minExp: 100000,successBonus: 0.25, salvageRate: 1.0, canEngrave: true, canCustom: true },
  ];

  const LEGEND_RECIPES = {
    dragon_slayer:   { name: '드래곤 슬레이어', grade: 'legendary', mats: { dragon_scale: 50, mithril: 30, fire_essence: 10 }, cost: 500000, baseSuccess: 0.6, minGrade: 4 },
    world_tree_robe: { name: '세계수의 로브',   grade: 'legendary', mats: { world_tree_branch: 30, mana_stone: 50, moonlight_dew: 20 }, cost: 400000, baseSuccess: 0.55, minGrade: 4 },
    time_hourglass:  { name: '시간의 모래시계', grade: 'legendary', mats: { time_shard: 100, history_book: 10, time_essence: 5 }, cost: 800000, baseSuccess: 0.4, minGrade: 4 },
    chaos_blade:     { name: '혼돈의 대검',     grade: 'mythic',    mats: { chaos_essence: 200, world_shard: 50, emperor_mark: 1 }, cost: 5000000, baseSuccess: 0.5, minGrade: 5 },
    genesis_armor:   { name: '창세의 갑옷',     grade: 'mythic',    mats: { primordial_crystal: 100, dragon_king_scale: 1 }, cost: 8000000, baseSuccess: 0.3, minGrade: 5 },
  };

  function getCraftGrade(exp) {
    for (let i = CRAFT_GRADES.length - 1; i >= 0; i--) {
      if (exp >= CRAFT_GRADES[i].minExp) return { ...CRAFT_GRADES[i], index: i };
    }
    return { ...CRAFT_GRADES[0], index: 0 };
  }

  // 크래프팅 상태 조회
  socket.on('craft_master_status', () => {
    const p = players[playerId];
    if (!p) return;
    const exp = p.craftExp || 0;
    const grade = getCraftGrade(exp);
    socket.emit('craft_master_status', {
      exp, grade: grade.name, gradeIndex: grade.index,
      successBonus: grade.successBonus,
      canEngrave: !!grade.canEngrave,
      canCustom: !!grade.canCustom,
      totalCrafted: p.totalCrafted || 0,
    });
  });

  // 전설/신화 제작
  socket.on('craft_legend', (data) => {
    const p = players[playerId];
    if (!p || !data?.recipeId) return;
    const recipe = LEGEND_RECIPES[data.recipeId];
    if (!recipe) return;

    const exp = p.craftExp || 0;
    const grade = getCraftGrade(exp);
    if (grade.index < recipe.minGrade) {
      socket.emit('craft_error', { reason: 'grade_too_low', need: CRAFT_GRADES[recipe.minGrade].name });
      return;
    }
    if ((p.gold || 0) < recipe.cost) {
      socket.emit('craft_error', { reason: 'gold' });
      return;
    }

    // 재료 체크
    if (!p.materials) p.materials = {};
    for (const [mat, count] of Object.entries(recipe.mats)) {
      if ((p.materials[mat] || 0) < count) {
        socket.emit('craft_error', { reason: 'materials', missing: mat, need: count, have: p.materials[mat] || 0 });
        return;
      }
    }

    // 재료 소모
    p.gold -= recipe.cost;
    for (const [mat, count] of Object.entries(recipe.mats)) {
      p.materials[mat] -= count;
    }

    // 성공 판정
    const successRate = Math.min(1.0, recipe.baseSuccess + grade.successBonus);
    const success = Math.random() < successRate;

    if (success) {
      // 제작 성공!
      if (!p.craftedItems) p.craftedItems = [];
      const item = {
        id: `craft_${data.recipeId}_${Date.now()}`,
        name: data.customName || recipe.name,
        type: data.recipeId,
        grade: recipe.grade,
        craftedBy: p.name || p.displayName,
        engraved: grade.canEngrave ? (data.customName || null) : null,
        craftedAt: Date.now(),
      };
      p.craftedItems.push(item);
      p.craftExp = (p.craftExp || 0) + (recipe.grade === 'mythic' ? 5000 : 2000);
      if (!p.totalCrafted) p.totalCrafted = 0;
      p.totalCrafted++;
      savePlayer(p);

      socket.emit('craft_legend_result', { success: true, item, newExp: p.craftExp, newGrade: getCraftGrade(p.craftExp).name });

      // 신화 제작 시 서버 공지
      if (recipe.grade === 'mythic') {
        io.emit('server_toast', { msg: `🔨 ${p.name}이(가) 신화 장비 [${item.name}]을(를) 제작했습니다!` });
      }
    } else {
      // 실패 → 재료 일부 반환
      const salvage = grade.salvageRate;
      for (const [mat, count] of Object.entries(recipe.mats)) {
        const returned = Math.floor(count * salvage);
        p.materials[mat] = (p.materials[mat] || 0) + returned;
      }
      p.craftExp = (p.craftExp || 0) + (recipe.grade === 'mythic' ? 1000 : 500);
      savePlayer(p);

      socket.emit('craft_legend_result', { success: false, salvageRate: salvage, expGained: recipe.grade === 'mythic' ? 1000 : 500 });
    }
  });

  // 일반 제작 (크래프팅 EXP 획득)
  socket.on('craft_normal', (data) => {
    const p = players[playerId];
    if (!p || !data?.itemType) return;
    const expGain = { normal: 10, uncommon: 30, rare: 80, heroic: 200 };
    const gained = expGain[data.itemType] || 10;
    p.craftExp = (p.craftExp || 0) + gained;
    if (!p.totalCrafted) p.totalCrafted = 0;
    p.totalCrafted++;
    savePlayer(p);
    socket.emit('craft_normal_result', { expGained: gained, totalExp: p.craftExp, grade: getCraftGrade(p.craftExp).name });
  });

  // 전설 레시피 목록
  socket.on('craft_legend_recipes', () => {
    const p = players[playerId];
    if (!p) return;
    const grade = getCraftGrade(p.craftExp || 0);
    const recipes = Object.entries(LEGEND_RECIPES).map(([id, r]) => ({
      id, ...r,
      canCraft: grade.index >= r.minGrade,
      adjustedSuccess: Math.min(1.0, r.baseSuccess + grade.successBonus),
    }));
    socket.emit('craft_legend_recipes', recipes);
  });
}

module.exports = { registerCraftMasterHandlers };

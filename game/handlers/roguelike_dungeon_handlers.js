// 로그라이크 용병 던전 — v4.0
// 무한 층 + 랜덤 이벤트 + 용병 영구사망 리스크 + 희귀 보상
const { simulateBattle } = require('../merc_combat_engine');

function registerRoguelikeDungeonHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  const FLOOR_TYPES = [
    { type: 'combat',     weight: 40, label: '전투' },
    { type: 'elite',      weight: 15, label: '정예 전투' },
    { type: 'boss',       weight: 5,  label: '보스' },
    { type: 'treasure',   weight: 12, label: '보물방' },
    { type: 'rest',       weight: 10, label: '휴식처' },
    { type: 'shop',       weight: 8,  label: '떠돌이 상인' },
    { type: 'event',      weight: 10, label: '랜덤 이벤트' },
  ];

  const RANDOM_EVENTS = [
    { name: '저주받은 제단', choices: ['기도 (HP-20%, ATK+30% 영구)', '무시'], effects: [{ atkBuff: 0.3, hpCost: 0.2 }, null] },
    { name: '신비의 샘', choices: ['마시기 (50% HP회복 or 독)', '무시'], effects: [{ healOrPoison: true }, null] },
    { name: '떠돌이 대장장이', choices: ['강화 (골드 5000, 랜덤 용병 ATK+15%)', '무시'], effects: [{ enhance: true, cost: 5000 }, null] },
    { name: '갇힌 모험가', choices: ['구출 (전투 발생, 보상 큼)', '무시'], effects: [{ rescue_combat: true }, null] },
    { name: '시간의 균열', choices: ['진입 (2층 스킵)', '무시'], effects: [{ skipFloors: 2 }, null] },
    { name: '용병의 무덤', choices: ['도굴 (전설 아이템 or 저주)', '추모 (팀 HP+20%)'], effects: [{ lootOrCurse: true }, { healAll: 0.2 }] },
    { name: '마녀의 가마솥', choices: ['재료 투입 (용병 1체 희생 → 나머지 전체 강화)', '무시'], effects: [{ sacrifice: true }, null] },
  ];

  function weightedRandom(items) {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const item of items) { r -= item.weight; if (r <= 0) return item; }
    return items[0];
  }

  function generateEnemies(floor) {
    const count = floor <= 10 ? 3 : floor <= 30 ? 4 : 5;
    const baseStar = Math.min(5, 1 + Math.floor(floor / 10));
    const enemies = [];
    for (let i = 0; i < count; i++) {
      const star = Math.max(1, baseStar + Math.floor(Math.random() * 2) - 1);
      enemies.push({
        id: `dungeon_enemy_${floor}_${i}`,
        name: `던전 몬스터 Lv.${floor}`,
        grade: Math.min(5, star - 1),
        level: floor,
        atk: 10 + floor * 3 + star * 5,
        def: 5 + floor * 1.5 + star * 3,
        hp: 80 + floor * 15 + star * 30,
        spd: 8 + Math.floor(floor / 5),
        skill: star >= 3 ? { name: '강타', dmg: 2.0, cd: 5, desc: '강력한 일격' } : null,
      });
    }
    return enemies;
  }

  // 던전 입장
  socket.on('roguelike_start', (data) => {
    const p = players[playerId];
    if (!p || !data?.mercIds) return;
    if ((p.gold || 0) < 5000) { socket.emit('roguelike_error', { reason: 'gold', need: 5000 }); return; }

    const mercs = (p.mercenaries || []).filter(m => data.mercIds.includes(m.id));
    if (mercs.length < 1 || mercs.length > 5) { socket.emit('roguelike_error', { reason: 'merc_count' }); return; }

    p.gold -= 5000;

    // 던전 상태 초기화
    p.roguelike = {
      floor: 0,
      team: mercs.map(m => ({
        ...m,
        dungeonHP: (m.star || 1) * 200 + (m.level || 1) * 50,
        dungeonMaxHP: (m.star || 1) * 200 + (m.level || 1) * 50,
        dungeonBuffs: [],
        alive: true,
      })),
      gold: 0,
      items: [],
      started: Date.now(),
    };

    savePlayer(p);
    socket.emit('roguelike_started', { floor: 0, team: p.roguelike.team.map(m => ({ name: m.name || m.id, hp: m.dungeonHP, maxHP: m.dungeonMaxHP, alive: m.alive })) });
  });

  // 다음 층 진행
  socket.on('roguelike_advance', () => {
    const p = players[playerId];
    if (!p?.roguelike) return;
    const rg = p.roguelike;
    rg.floor++;

    const floorType = rg.floor % 10 === 0 ? { type: 'boss', label: '보스' } : weightedRandom(FLOOR_TYPES);

    const floorData = { floor: rg.floor, type: floorType.type, label: floorType.label };

    if (floorType.type === 'combat' || floorType.type === 'elite' || floorType.type === 'boss') {
      const enemies = generateEnemies(rg.floor);
      if (floorType.type === 'elite') enemies.forEach(e => { e.atk *= 1.5; e.hp *= 2; e.name = '정예 ' + e.name; });
      if (floorType.type === 'boss') {
        enemies.length = 1;
        const boss = enemies[0];
        boss.atk *= 3; boss.hp *= 5; boss.def *= 2;
        boss.name = `${rg.floor}층 보스`;
        boss.skill = { name: '멸살', dmg: 4.0, aoe: true, cd: 3, desc: '전체 4배!' };
      }

      const teamForBattle = rg.team.filter(m => m.alive);
      const result = simulateBattle(teamForBattle, enemies);

      // 결과 반영
      if (result.winner === 'A') {
        // 생존자 HP 반영
        for (const surv of result.survivorsA) {
          const m = rg.team.find(t => (t.name || t.id) === surv.name);
          if (m) m.dungeonHP = surv.hp;
        }
        // 전사자 처리
        for (const m of rg.team) {
          if (m.alive && !result.survivorsA.find(s => s.name === (m.name || m.id))) {
            m.alive = false;
            m.dungeonHP = 0;
          }
        }

        const goldReward = rg.floor * 100 * (floorType.type === 'boss' ? 10 : floorType.type === 'elite' ? 3 : 1);
        rg.gold += goldReward;

        floorData.result = 'victory';
        floorData.battleLog = result.log.slice(-10);
        floorData.mvp = result.mvp;
        floorData.goldReward = goldReward;
        floorData.casualties = rg.team.filter(m => !m.alive).map(m => m.name || m.id);

        // 보스 처치 특별 보상
        if (floorType.type === 'boss') {
          const item = { name: `${rg.floor}층 보스 전리품`, type: 'boss_loot', floor: rg.floor };
          rg.items.push(item);
          floorData.bossLoot = item;
        }
      } else {
        // 팀 전멸 → 던전 종료
        floorData.result = 'defeat';
        floorData.battleLog = result.log.slice(-10);
        endDungeon(p, 'defeat');
      }
    } else if (floorType.type === 'treasure') {
      const goldTreasure = rg.floor * 200;
      rg.gold += goldTreasure;
      floorData.treasure = goldTreasure;
      // 10% 확률 전설 아이템
      if (Math.random() < 0.1) {
        const item = { name: '전설 보물', type: 'legendary_treasure', floor: rg.floor };
        rg.items.push(item);
        floorData.legendaryItem = item;
      }
    } else if (floorType.type === 'rest') {
      for (const m of rg.team) {
        if (m.alive) m.dungeonHP = Math.min(m.dungeonMaxHP, m.dungeonHP + Math.floor(m.dungeonMaxHP * 0.3));
      }
      floorData.healed = '전원 HP 30% 회복';
    } else if (floorType.type === 'shop') {
      floorData.shop = [
        { id: 'heal_potion', name: 'HP 회복 물약', cost: rg.floor * 50, effect: '전원 HP 50% 회복' },
        { id: 'atk_scroll', name: 'ATK 강화 두루마리', cost: rg.floor * 80, effect: '전원 ATK +10% (던전 내)' },
        { id: 'revive_stone', name: '부활의 돌', cost: rg.floor * 200, effect: '전사한 용병 1체 부활' },
      ];
    } else if (floorType.type === 'event') {
      const evt = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
      floorData.event = { name: evt.name, choices: evt.choices };
    }

    floorData.team = rg.team.map(m => ({ name: m.name || m.id, hp: m.dungeonHP, maxHP: m.dungeonMaxHP, alive: m.alive }));
    floorData.aliveCount = rg.team.filter(m => m.alive).length;
    floorData.totalGold = rg.gold;

    // 전원 전사 체크
    if (rg.team.filter(m => m.alive).length === 0) {
      endDungeon(p, 'defeat');
      floorData.result = 'defeat';
    }

    savePlayer(p);
    socket.emit('roguelike_floor', floorData);
  });

  // 상점 구매
  socket.on('roguelike_shop_buy', (data) => {
    const p = players[playerId];
    if (!p?.roguelike || !data?.itemId) return;
    const rg = p.roguelike;

    if (data.itemId === 'heal_potion') {
      const cost = rg.floor * 50;
      if (rg.gold < cost) return;
      rg.gold -= cost;
      for (const m of rg.team) { if (m.alive) m.dungeonHP = Math.min(m.dungeonMaxHP, m.dungeonHP + Math.floor(m.dungeonMaxHP * 0.5)); }
    } else if (data.itemId === 'atk_scroll') {
      const cost = rg.floor * 80;
      if (rg.gold < cost) return;
      rg.gold -= cost;
      for (const m of rg.team) { if (m.alive) m.dungeonBuffs.push({ type: 'atk', value: 0.1 }); }
    } else if (data.itemId === 'revive_stone') {
      const cost = rg.floor * 200;
      if (rg.gold < cost) return;
      rg.gold -= cost;
      const dead = rg.team.find(m => !m.alive);
      if (dead) { dead.alive = true; dead.dungeonHP = Math.floor(dead.dungeonMaxHP * 0.3); }
    }
    savePlayer(p);
    socket.emit('roguelike_shop_result', { gold: rg.gold, team: rg.team.map(m => ({ name: m.name || m.id, hp: m.dungeonHP, maxHP: m.dungeonMaxHP, alive: m.alive })) });
  });

  // 이벤트 선택
  socket.on('roguelike_event_choice', (data) => {
    const p = players[playerId];
    if (!p?.roguelike || data?.choiceIndex === undefined) return;
    const rg = p.roguelike;
    // 간략한 이벤트 처리
    if (data.choiceIndex === 0) {
      // 첫 번째 선택: 리스크+리워드
      if (Math.random() < 0.5) {
        for (const m of rg.team) { if (m.alive) m.dungeonHP = Math.min(m.dungeonMaxHP, m.dungeonHP + Math.floor(m.dungeonMaxHP * 0.3)); }
        socket.emit('roguelike_event_result', { result: 'good', msg: '긍정적 효과! 전원 HP 30% 회복' });
      } else {
        for (const m of rg.team) { if (m.alive) m.dungeonHP = Math.floor(m.dungeonHP * 0.8); }
        socket.emit('roguelike_event_result', { result: 'bad', msg: '부정적 효과... 전원 HP 20% 감소' });
      }
    } else {
      socket.emit('roguelike_event_result', { result: 'safe', msg: '무시하고 지나갔습니다.' });
    }
    savePlayer(p);
  });

  // 던전 포기 (보상 수령)
  socket.on('roguelike_retreat', () => {
    const p = players[playerId];
    if (!p?.roguelike) return;
    endDungeon(p, 'retreat');
  });

  function endDungeon(p, reason) {
    const rg = p.roguelike;
    if (!rg) return;

    const floor = rg.floor;
    const goldEarned = rg.gold;
    const itemsEarned = rg.items;

    // 보상 지급
    p.gold = Math.min(999999999, (p.gold || 0) + goldEarned);

    // 최고 기록 갱신
    if (!p.roguelikeBest || floor > p.roguelikeBest) p.roguelikeBest = floor;

    // 용병 피해 반영 (영구 사망 옵션 = 하드코어)
    // 기본은 소프트: 전사 용병 HP 1로 복구
    for (const m of rg.team) {
      const real = (p.mercenaries || []).find(rm => rm.id === m.id);
      if (real) {
        if (m.alive) {
          real.bond = Math.min(1000, (real.bond || 0) + Math.floor(floor / 5));
        }
      }
    }

    p.roguelike = null;
    savePlayer(p);

    socket.emit('roguelike_end', {
      reason,
      floor,
      goldEarned,
      items: itemsEarned,
      bestRecord: p.roguelikeBest,
    });

    if (floor >= 50) {
      io.emit('server_toast', { msg: `🏆 ${p.name}이(가) 로그라이크 던전 ${floor}층 도달!` });
    }
  }

  // 상태 조회
  socket.on('roguelike_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('roguelike_status', {
      active: !!p.roguelike,
      floor: p.roguelike?.floor || 0,
      bestRecord: p.roguelikeBest || 0,
      team: p.roguelike?.team?.map(m => ({ name: m.name || m.id, hp: m.dungeonHP, maxHP: m.dungeonMaxHP, alive: m.alive })) || [],
    });
  });
}

module.exports = { registerRoguelikeDungeonHandlers };

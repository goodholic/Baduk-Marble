// 공성전 성주 실시간 지휘 & 함정 업그레이드 — v3.6
function registerSiegeCommanderHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  // 함정 업그레이드 트리 (Lv.1~4, 4에서 분기)
  const TRAP_TREE = {
    spike:     { name: '가시 함정',    levels: [
      { dmg: 50,  effect: '감속 20%' },
      { dmg: 80,  effect: '감속 30%' },
      { dmg: 120, effect: '감속 40%, 출혈' },
    ], branchA: { name: '독 가시', dmg: 0, effect: '독 DOT 5초' }, branchB: { name: '폭발 가시', dmg: 200, effect: '범위 DMG' } },
    fire:      { name: '화염 구덩이', levels: [
      { dmg: 100, effect: '화상 3초' },
      { dmg: 150, effect: '화상 5초' },
      { dmg: 200, effect: '범위 확대' },
    ], branchA: { name: '지옥불', dmg: 400, effect: '지속' }, branchB: { name: '용암 분출', dmg: 300, effect: '넉백' } },
    ice:       { name: '얼음 결계',   levels: [
      { dmg: 0,   effect: '감속 50%' },
      { dmg: 0,   effect: '동결 2초' },
      { dmg: 0,   effect: '동결 3초, DEF-20%' },
    ], branchA: { name: '절대영도', dmg: 0, effect: '동결 5초+즉사 10%' }, branchB: { name: '빙하', dmg: 0, effect: '통로 차단 10초' } },
    lightning: { name: '번개 기둥',   levels: [
      { dmg: 80,  effect: '스턴 1초' },
      { dmg: 120, effect: '스턴 2초, 연쇄 2명' },
      { dmg: 180, effect: '연쇄 4명' },
    ], branchA: { name: '뇌신의 심판', dmg: 0, effect: '전체 스턴 3초' }, branchB: { name: '자기장', dmg: 0, effect: '이동방향 역전 5초' } },
    poison:    { name: '독안개',       levels: [
      { dmg: 20,  effect: 'DOT/초, 시야-50%' },
      { dmg: 35,  effect: 'DOT/초, 시야-70%' },
      { dmg: 50,  effect: 'DOT/초, 시야-90%, 힐-50%' },
    ], branchA: { name: '맹독', dmg: 100, effect: '즉사 5%' }, branchB: { name: '환각안개', dmg: 0, effect: '아군 공격 유도 5초' } },
    catapult:  { name: '투석기',       levels: [
      { dmg: 200, effect: '범위공격' },
      { dmg: 300, effect: '범위+30%' },
      { dmg: 400, effect: '파편 DOT' },
    ], branchA: { name: '화염탄', dmg: 0, effect: '화염지대' }, branchB: { name: '빙결탄', dmg: 0, effect: '범위 동결 3초' } },
    portal:    { name: '함정문',       levels: [
      { dmg: 0, effect: '순간이동' },
      { dmg: 0, effect: '2곳 연결' },
      { dmg: 0, effect: '3곳 연결, 적 혼란' },
    ], branchA: { name: '추방문', dmg: 0, effect: '맵 밖 퇴출 5초' }, branchB: { name: '감옥문', dmg: 0, effect: '가둠 8초' } },
    summon:    { name: '소환진',       levels: [
      { dmg: 0, effect: '스켈레톤 3체' },
      { dmg: 0, effect: '좀비워리어 3체' },
      { dmg: 0, effect: '데스나이트 2+리치 1' },
    ], branchA: { name: '불사군단', dmg: 0, effect: '8체+리치킹' }, branchB: { name: '드래곤좀비', dmg: 0, effect: '보스급 1체' } },
    cannon:    { name: '성벽 대포',    levels: [
      { dmg: 300, effect: '직선 관통' },
      { dmg: 500, effect: '폭발 범위' },
      { dmg: 700, effect: '2연발' },
    ], branchA: { name: '레일건', dmg: 1500, effect: '즉발' }, branchB: { name: '산탄포', dmg: 400, effect: '부채꼴 x5' } },
    runeCircle: { name: '마법 룬 진', levels: [
      { dmg: 0, effect: '아군 ATK+10%' },
      { dmg: 0, effect: 'ATK+20%, DEF+10%' },
      { dmg: 0, effect: '전 스탯 +15%' },
    ], branchA: { name: '분노의 룬', dmg: 0, effect: 'ATK+40%, DEF-20%' }, branchB: { name: '수호의 룬', dmg: 0, effect: '무적 3초(30초쿨)' } },
  };

  // 성주 지휘 명령
  const COMMANDER_SKILLS = {
    relocateTrap:    { name: '함정 즉시 재배치', cooldown: 30e3,  moraleCost: 10 },
    emergencySummon: { name: '용병 긴급 소환',   cooldown: 60e3,  moraleCost: 20 },
    repairWall:      { name: '성벽 긴급 수리',   cooldown: 45e3,  moraleCost: 15 },
    arrowRain:       { name: '화살비',           cooldown: 90e3,  moraleCost: 25 },
    magicBombard:    { name: '마법 폭격',        cooldown: 120e3, moraleCost: 40 },
    chargeAll:       { name: '전체 돌격 명령',    cooldown: 180e3, moraleCost: 35 },
    retreat:         { name: '전략적 후퇴',       cooldown: 60e3,  moraleCost: 20 },
    chainDetonate:   { name: '함정 연쇄 기폭',   cooldown: 150e3, moraleCost: 50 },
    summonGuardian:  { name: '수호신 소환',      cooldown: 300e3, moraleCost: 80 },
    dimensionShift:  { name: '차원 전환',        cooldown: 240e3, moraleCost: 60 },
    lastAwakening:   { name: '최후의 각성',      cooldown: Infinity, moraleCost: 100, oncePerBattle: true },
    surrender:       { name: '항복 & 자폭',      cooldown: Infinity, moraleCost: 0, oncePerBattle: true },
  };

  // 함정 업그레이드
  socket.on('siege_upgrade_trap', (data) => {
    const p = players[playerId];
    if (!p || !data?.trapType) return;
    const tree = TRAP_TREE[data.trapType];
    if (!tree) return;
    if (!p.castle) p.castle = { traps: {}, structures: {}, morale: 50 };
    if (!p.castle.traps[data.trapType]) p.castle.traps[data.trapType] = { level: 1, branch: null };

    const trap = p.castle.traps[data.trapType];

    // 분기 선택 (Lv.4)
    if (trap.level === 3 && data.branch) {
      if (data.branch !== 'A' && data.branch !== 'B') return;
      const cost = (trap.level + 1) * 5000;
      if ((p.gold || 0) < cost) { socket.emit('siege_error', { reason: 'gold' }); return; }
      p.gold -= cost;
      trap.level = 4;
      trap.branch = data.branch;
      savePlayer(p);
      const chosen = data.branch === 'A' ? tree.branchA : tree.branchB;
      socket.emit('siege_trap_upgraded', { trapType: data.trapType, level: 4, branch: data.branch, name: chosen.name });
      return;
    }

    if (trap.level >= 4 || trap.level >= tree.levels.length) {
      socket.emit('siege_error', { reason: 'max_level' });
      return;
    }

    const cost = (trap.level + 1) * 3000;
    if ((p.gold || 0) < cost) { socket.emit('siege_error', { reason: 'gold' }); return; }
    p.gold -= cost;
    trap.level++;
    savePlayer(p);
    socket.emit('siege_trap_upgraded', { trapType: data.trapType, level: trap.level, stats: tree.levels[trap.level - 1] });
  });

  // 성주 지휘 명령 실행
  socket.on('siege_commander_skill', (data) => {
    const p = players[playerId];
    if (!p || !data?.skillId) return;
    const skill = COMMANDER_SKILLS[data.skillId];
    if (!skill) return;
    if (!p.castle) p.castle = { traps: {}, structures: {}, morale: 50 };

    const morale = p.castle.morale ?? 50;
    if (morale < skill.moraleCost) {
      socket.emit('siege_error', { reason: 'low_morale', current: morale, needed: skill.moraleCost });
      return;
    }

    // 쿨다운 체크
    if (!p.castle._skillCooldowns) p.castle._skillCooldowns = {};
    const now = Date.now();
    const lastUsed = p.castle._skillCooldowns[data.skillId] || 0;
    if (skill.oncePerBattle && lastUsed > 0) {
      socket.emit('siege_error', { reason: 'once_per_battle' });
      return;
    }
    if (now - lastUsed < skill.cooldown) {
      socket.emit('siege_error', { reason: 'cooldown', remaining: skill.cooldown - (now - lastUsed) });
      return;
    }

    // 실행
    p.castle.morale = Math.max(0, morale - skill.moraleCost);
    p.castle._skillCooldowns[data.skillId] = now;
    savePlayer(p);

    // 특수 효과 처리
    const effects = {};
    if (data.skillId === 'lastAwakening') {
      effects.commanderJoinsBattle = true;
      effects.statMultiplier = 3;
      p.castle.morale = Math.min(100, p.castle.morale + 50);
    }
    if (data.skillId === 'chargeAll') {
      effects.allMercsBuffed = true;
      effects.atkBonus = 0.3;
      effects.duration = 15000;
    }
    if (data.skillId === 'chainDetonate') {
      effects.allTrapsActivated = true;
      effects.rangeMultiplier = 2;
    }

    socket.emit('siege_skill_executed', { skillId: data.skillId, morale: p.castle.morale, effects });
    // 공성전 참여자 전체에게 브로드캐스트
    if (data.siegeRoomId) {
      io.to(data.siegeRoomId).emit('siege_commander_action', {
        commander: p.name,
        skillName: skill.name,
        effects,
      });
    }
  });

  // 사기 변화 이벤트 핸들러
  socket.on('siege_morale_event', (data) => {
    const p = players[playerId];
    if (!p || !data?.event) return;
    if (!p.castle) return;

    const MORALE_EVENTS = {
      enemy_kill: +5,
      ally_death: -8,
      legend_death: -20,
      wall_destroyed: -10,
      attacker_down: +30,
      throne_hit: -15,
      morale_zero: -999,
      morale_100: 0,
      commander_joins: +50,
    };

    const change = MORALE_EVENTS[data.event] || 0;
    p.castle.morale = Math.max(0, Math.min(100, (p.castle.morale ?? 50) + change));
    savePlayer(p);

    socket.emit('siege_morale_update', {
      morale: p.castle.morale,
      event: data.event,
      change,
    });
  });

  // 구조물 설치/업그레이드
  socket.on('siege_build_structure', (data) => {
    const p = players[playerId];
    if (!p || !data?.structureType) return;
    if (!p.castle) p.castle = { traps: {}, structures: {}, morale: 50 };
    if (!p.castle.structures[data.structureType]) {
      p.castle.structures[data.structureType] = { level: 1, position: data.position || null, count: 1 };
    } else {
      p.castle.structures[data.structureType].count++;
    }
    savePlayer(p);
    socket.emit('siege_structure_built', { structureType: data.structureType, ...p.castle.structures[data.structureType] });
  });

  // 성 정보 조회
  socket.on('siege_castle_info', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('siege_castle_info', p.castle || { traps: {}, structures: {}, morale: 50, level: 1 });
  });
}

module.exports = { registerSiegeCommanderHandlers };

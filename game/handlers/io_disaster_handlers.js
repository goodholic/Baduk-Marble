// IO 재앙 & 특수 이벤트 + 변이 웨이브 — v3.6
function registerIODisasterHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  // 재앙 이벤트 정의
  const DISASTERS = {
    meteor_shower: {
      name: '유성우', triggerTime: 300, duration: 15,
      effect: { type: 'aoe_random', dmg: 300, warningMs: 2000 },
      reward: { type: 'meteor_fragment', rarity: 'epic' },
    },
    plague_fog: {
      name: '역병의 안개', triggerTime: 210, duration: 60,
      effect: { type: 'shrinking_zone', dot: 30, shrinkRate: 2 },
      reward: { type: 'plague_monster', rarity: 'rare' },
    },
    dimension_rift: {
      name: '차원 균열', triggerTime: 240, duration: 30,
      effect: { type: 'portals', count: 4, bossMultiplier: 2 },
      reward: { type: 'dimension_gear', rarity: 'epic', duration: 600 },
    },
    demon_lord: {
      name: '마왕 강림', triggerTime: 420, duration: 60,
      effect: { type: 'world_boss', hpMultiplier: 5, ceasefire: true },
      reward: { type: 'demon_loot', rarity: 'legendary', mvpBonus: true },
    },
    gold_rush: {
      name: '골드 러시', triggerTime: -1, duration: 20,
      effect: { type: 'gold_monsters', count: 30, goldMultiplier: 10 },
      reward: { type: 'gold', multiplier: 10 },
    },
    time_rewind: {
      name: '시간 역행', triggerTime: 360, duration: 1,
      effect: { type: 'rewind', seconds: 30 },
      reward: { type: 'time_shard' },
    },
    elemental_storm: {
      name: '엘리멘탈 폭풍', triggerTime: 270, duration: 30,
      effect: { type: 'quadrant_elements', dmgMultiplier: 2, weaknessMultiplier: 3 },
      reward: { type: 'elemental_crystal' },
    },
    gravity_anomaly: {
      name: '중력 이상', triggerTime: -1, duration: 30,
      effect: { type: 'gravity', modes: ['reverse', 'low', 'high'] },
      reward: null,
    },
    treasure_ship: {
      name: '보물선 출현', triggerTime: 330, duration: 30,
      effect: { type: 'treasure_ship', position: 'edge' },
      reward: { type: 'treasure_chest', rarity: 'legendary' },
    },
    divine_blessing: {
      name: '신들의 축복', triggerTime: 120, duration: 10,
      effect: { type: 'peace_heal', choices: ['ATK', 'DEF', 'SPD', 'LCK'] },
      reward: { type: 'blessing_choice' },
      rare: true,
    },
  };

  // 변이 웨이브 정의
  const MUTANT_WAVES = {
    blood:     { name: '핏빛 웨이브',   triggerTime: 180, monsters: { type: 'blood_slime', count: 20 }, ability: 'hp_drain_5pct', drop: 'blood_crystal' },
    crystal:   { name: '결정 웨이브',   triggerTime: 240, monsters: { type: 'crystal_golem', count: 5 }, ability: 'physical_reflect_50', drop: 'crystal_core' },
    shadow:    { name: '그림자 웨이브', triggerTime: 300, monsters: { type: 'shadow_ninja', count: 10 }, ability: 'stealth_execute_10pct', drop: 'shadow_cloak' },
    mech:      { name: '기계 웨이브',   triggerTime: 210, monsters: { type: 'steam_robot', count: 8 }, ability: 'self_destruct_300', drop: 'gear_parts' },
    undead:    { name: '언데드 웨이브', triggerTime: 360, monsters: { type: 'skeleton_king', count: 1, minions: 30 }, ability: 'infinite_revive', drop: 'cursed_bone' },
    fairy:     { name: '요정 웨이브',   triggerTime: 120, monsters: { type: 'fairy_mixed', count: 15 }, ability: 'heal_and_debuff', drop: 'fairy_dust', rare: true },
    dragon:    { name: '용족 웨이브',   triggerTime: 420, monsters: { type: 'baby_dragon', count: 3, wyverns: 2 }, ability: 'breath_400', drop: 'dragon_scale' },
    golden:    { name: '변이 웨이브(럭키)', triggerTime: -1, monsters: { type: 'golden_mutant', count: 1 }, ability: 'flee', drop: 'golden_egg', rare: true },
    void:      { name: '공허 웨이브',   triggerTime: 480, monsters: { type: 'void_apostle', count: 2 }, ability: 'nullify_buffs_blackhole', drop: 'void_shard' },
    king:      { name: '왕의 웨이브',   triggerTime: 540, monsters: { type: 'wave_king', count: 1 }, ability: 'all_previous_random', drop: 'wave_crown' },
  };

  // IO 매치 중 재앙 발생 요청
  socket.on('io_trigger_disaster', (data) => {
    if (!data?.matchId || !data?.type) return;
    const disaster = DISASTERS[data.type];
    if (!disaster) return;

    // 매치 참가자 전원에게 브로드캐스트
    io.to(data.matchId).emit('io_disaster_start', {
      type: data.type,
      name: disaster.name,
      duration: disaster.duration,
      effect: disaster.effect,
      reward: disaster.reward,
    });

    // 종료 타이머
    setTimeout(() => {
      io.to(data.matchId).emit('io_disaster_end', { type: data.type });
    }, disaster.duration * 1000);
  });

  // IO 변이 웨이브 스폰
  socket.on('io_spawn_mutant_wave', (data) => {
    if (!data?.matchId || !data?.waveType) return;
    const wave = MUTANT_WAVES[data.waveType];
    if (!wave) return;

    io.to(data.matchId).emit('io_mutant_wave', {
      type: data.waveType,
      name: wave.name,
      monsters: wave.monsters,
      ability: wave.ability,
      drop: wave.drop,
    });
  });

  // 재앙 보상 수령
  socket.on('io_disaster_reward', (data) => {
    const p = players[playerId];
    if (!p || !data?.type) return;
    const disaster = DISASTERS[data.type];
    if (!disaster?.reward) return;

    if (!p.disasterRewards) p.disasterRewards = {};
    if (!p.disasterRewards[data.type]) p.disasterRewards[data.type] = 0;
    p.disasterRewards[data.type]++;

    // 재앙 마스터 칭호 체크
    const totalCleared = Object.values(p.disasterRewards).reduce((a, b) => a + b, 0);
    if (totalCleared >= 50 && !p.titles?.includes('disaster_master')) {
      if (!p.titles) p.titles = [];
      p.titles.push('disaster_master');
      socket.emit('title_earned', { title: 'disaster_master', name: '재앙의 마스터' });
    }

    // 보상 지급
    const reward = disaster.reward;
    if (reward.type === 'gold') {
      p.gold = Math.min(999999999, (p.gold || 0) + (data.amount || 0) * (reward.multiplier || 1));
    } else {
      if (!p.materials) p.materials = {};
      p.materials[reward.type] = (p.materials[reward.type] || 0) + 1;
    }

    savePlayer(p);
    socket.emit('io_reward_claimed', { type: data.type, reward });
  });

  // 변이 웨이브 처치 보상
  socket.on('io_mutant_wave_clear', (data) => {
    const p = players[playerId];
    if (!p || !data?.waveType) return;
    const wave = MUTANT_WAVES[data.waveType];
    if (!wave) return;

    if (!p.mutantClears) p.mutantClears = {};
    p.mutantClears[data.waveType] = (p.mutantClears[data.waveType] || 0) + 1;

    if (!p.materials) p.materials = {};
    p.materials[wave.drop] = (p.materials[wave.drop] || 0) + (data.killCount || 1);

    // 웨이브 킹 처치 = 전설 칭호
    if (data.waveType === 'king' && !p.titles?.includes('wave_king')) {
      if (!p.titles) p.titles = [];
      p.titles.push('wave_king');
      socket.emit('title_earned', { title: 'wave_king', name: '웨이브의 왕' });
    }

    savePlayer(p);
    socket.emit('io_wave_reward', { waveType: data.waveType, drop: wave.drop, count: data.killCount || 1 });
  });

  // 차원 균열 보스 처치
  socket.on('io_rift_boss_clear', (data) => {
    const p = players[playerId];
    if (!p || !data?.dimension) return;

    if (!p.riftClears) p.riftClears = {};
    p.riftClears[data.dimension] = (p.riftClears[data.dimension] || 0) + 1;

    const essenceType = `${data.dimension}_essence`;
    if (!p.materials) p.materials = {};
    p.materials[essenceType] = (p.materials[essenceType] || 0) + 1;

    // 전 차원 클리어 체크
    const DIMENSIONS = ['fire', 'ice', 'lightning', 'poison', 'void', 'time', 'mirror', 'chaos'];
    const allCleared = DIMENSIONS.every(d => (p.riftClears[d] || 0) >= 1);
    if (allCleared && !p.titles?.includes('dimension_conqueror')) {
      if (!p.titles) p.titles = [];
      p.titles.push('dimension_conqueror');
      socket.emit('title_earned', { title: 'dimension_conqueror', name: '차원 정복자' });
    }

    savePlayer(p);
    socket.emit('io_rift_reward', { dimension: data.dimension, essence: essenceType });
  });
}

module.exports = { registerIODisasterHandlers };

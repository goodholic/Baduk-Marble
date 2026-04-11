// 심층 던전 시스템 — v2.58
// 10층 다층 던전: 층별 테마, 함정, 보스 페이즈, 누적 보상
// 리니지풍 던전 탐험 경험

// ═══ 던전 정의 ═══
const DEEP_DUNGEONS = {
  abyss_tower: {
    name: '심연의 탑', icon: '🏰', minLevel: 20, entryFee: 3000,
    desc: '지하 10층까지 이어지는 고대의 탑. 더 깊이 갈수록 강력한 존재가 기다린다.',
    floors: [
      { name: '1층 — 망자의 회랑',    theme: 'undead',   ambience: '차가운 바람이 분다... 해골들의 눈이 빛난다.',
        monsters: [{name:'해골 전사',hp:300,atk:25,def:8,count:5},{name:'해골 마법사',hp:200,atk:35,def:5,count:3}],
        trap: null, reward: {gold:500,exp:800} },
      { name: '2층 — 독거미의 둥지',   theme: 'spider',   ambience: '천장에서 거미줄이 늘어진다. 발밑에 조심!',
        monsters: [{name:'독거미',hp:350,atk:30,def:10,count:6},{name:'거미 여왕',hp:800,atk:45,def:15,count:1}],
        trap: {type:'poison_gas',damage:10,duration:5,msg:'💀 독가스가 분출됩니다! 초당 10 데미지!'}, reward: {gold:800,exp:1200} },
      { name: '3층 — 무너진 성벽',     theme: 'golem',    ambience: '돌벽 사이로 마력이 흐른다. 골렘의 발소리가...',
        monsters: [{name:'돌 골렘',hp:600,atk:20,def:25,count:4},{name:'크리스탈 골렘',hp:500,atk:40,def:20,count:2}],
        trap: {type:'rockfall',damage:80,chance:0.3,msg:'⚠️ 낙석! 80 데미지!'}, reward: {gold:1200,exp:1800} },
      { name: '4층 — 화염의 방',       theme: 'fire',     ambience: '바닥에서 용암이 솟아오른다. 열기가 대단하다!',
        monsters: [{name:'화염 임프',hp:280,atk:40,def:8,count:6},{name:'파이어 엘리멘탈',hp:700,atk:50,def:12,count:2}],
        trap: {type:'lava_floor',damage:15,duration:3,msg:'🔥 용암 바닥! 초당 15 데미지!'}, reward: {gold:1500,exp:2500} },
      { name: '5층 — 수호자의 방',     theme: 'boss',     ambience: '거대한 문이 열리며... 수호자가 깨어난다!',
        monsters: [],
        boss: {
          name: '심연의 수호자 가디안', hp: 5000, atk: 60, def: 25,
          phases: [
            { hpThreshold: 1.0, name: '1페이즈: 방패', pattern: 'shield', desc: 'DEF 2배, 5초마다 방패 강타', atkMult: 1.0, defMult: 2.0 },
            { hpThreshold: 0.5, name: '2페이즈: 분노', pattern: 'enrage', desc: 'ATK 1.5배, DEF 감소', atkMult: 1.5, defMult: 0.8 },
          ],
          reward: {gold:5000,exp:8000,diamonds:30,drop:{id:'equip_guardian_shield',name:'수호자의 방패',grade:'epic',chance:0.3}}
        },
        reward: {gold:2000,exp:3000} },
      { name: '6층 — 환영의 미궁',     theme: 'illusion',  ambience: '공간이 일그러진다... 무엇이 진짜인가?',
        monsters: [{name:'환영 기사',hp:500,atk:45,def:15,count:5},{name:'미러 위치',hp:400,atk:55,def:10,count:3}],
        trap: {type:'confusion',duration:4,msg:'💫 환영! 4초간 방향이 뒤바뀝니다!'}, reward: {gold:2000,exp:3500} },
      { name: '7층 — 빙결의 감옥',     theme: 'ice',      ambience: '숨이 하얗게 나온다. 모든 것이 얼어붙어 있다.',
        monsters: [{name:'프로스트 리치',hp:700,atk:50,def:18,count:3},{name:'얼음 골렘',hp:900,atk:35,def:30,count:2}],
        trap: {type:'freeze',duration:3,msg:'❄ 빙결 함정! 3초간 얼어붙습니다!'}, reward: {gold:2500,exp:4500} },
      { name: '8층 — 암흑의 제단',     theme: 'dark',     ambience: '빛이 사라진다... 제단에서 사악한 기운이...',
        monsters: [{name:'다크 어콜라이트',hp:550,atk:55,def:12,count:5},{name:'섀도우 데몬',hp:800,atk:65,def:18,count:2}],
        trap: {type:'dark_seal',duration:5,msg:'☠ 마법 봉인! 5초간 스킬 사용 불가!'}, reward: {gold:3000,exp:5500} },
      { name: '9층 — 용의 거처',       theme: 'dragon',   ambience: '거대한 뼈들이 쌓여있다... 드래곤의 숨결이 느껴진다.',
        monsters: [{name:'드레이크',hp:1000,atk:60,def:22,count:3},{name:'와이번',hp:800,atk:70,def:15,count:2}],
        trap: {type:'dragonbreath',damage:100,chance:0.25,msg:'🐲 드래곤 브레스! 100 데미지!'}, reward: {gold:4000,exp:7000} },
      { name: '10층 — 심연의 왕좌',    theme: 'final_boss', ambience: '이곳이 끝이다... 심연의 군주가 왕좌에서 일어선다!',
        monsters: [],
        boss: {
          name: '심연의 군주 아비스', hp: 15000, atk: 90, def: 35,
          phases: [
            { hpThreshold: 1.0, name: '1페이즈: 암흑의 검', pattern: 'dark_sword', desc: '강력한 근접 공격, 출혈 부여', atkMult: 1.0, defMult: 1.0, effect: 'bleed' },
            { hpThreshold: 0.6, name: '2페이즈: 심연의 부름', pattern: 'summon', desc: '소환수 3체 등장, 본체 회복', atkMult: 1.2, defMult: 1.2, summon: {name:'심연의 하수인',hp:500,atk:40,def:10,count:3} },
            { hpThreshold: 0.3, name: '최종 페이즈: 멸망의 오라', pattern: 'apocalypse', desc: 'ATK 2배, 전체 데미지, 저주 부여', atkMult: 2.0, defMult: 0.6, effect: 'curse', aoePerSec: 20 },
          ],
          reward: {gold:30000,exp:50000,diamonds:200,
            drop:{id:'equip_abyss_blade',name:'심연의 검 아비스',grade:'legendary',chance:0.15},
            title:'abyss_conqueror',titleName:'심연의 정복자'}
        },
        reward: {gold:5000,exp:8000} },
    ],
  },

  celestial_spire: {
    name: '천공의 첨탑', icon: '⛅', minLevel: 35, entryFee: 5000,
    desc: '하늘 높이 솟은 고대의 첨탑. 꼭대기에는 천사장이 기다린다.',
    floors: [
      { name: '1층 — 구름의 정원',    theme: 'wind',     ambience: '구름 위의 정원. 바람의 정령이 춤추고 있다.',
        monsters: [{name:'바람 정령',hp:500,atk:40,def:12,count:5},{name:'하피',hp:400,atk:50,def:8,count:3}],
        trap: {type:'gust',msg:'💨 돌풍! 밀려납니다!',knockback:50}, reward: {gold:1000,exp:2000} },
      { name: '2층 — 번개의 회랑',    theme: 'lightning', ambience: '천둥이 울린다! 번개가 내리꽂는다!',
        monsters: [{name:'뇌전 골렘',hp:700,atk:55,def:20,count:4},{name:'라이트닝 엘프',hp:450,atk:65,def:10,count:3}],
        trap: {type:'lightning_strike',damage:60,chance:0.35,msg:'⚡ 벼락! 60 데미지!'}, reward: {gold:1500,exp:3000} },
      { name: '3층 — 빛의 시련',     theme: 'holy',      ambience: '눈부신 빛이 쏟아진다. 성스러운 시련의 장.',
        monsters: [{name:'빛의 수호자',hp:800,atk:50,def:25,count:3},{name:'성기사 환영',hp:600,atk:60,def:22,count:2}],
        trap: null, reward: {gold:2000,exp:4000} },
      { name: '4층 — 별의 도서관',    theme: 'arcane',    ambience: '수만 권의 마도서가 떠다닌다. 지식의 정수가...',
        monsters: [{name:'마도서 골렘',hp:900,atk:55,def:18,count:4},{name:'고대 학자의 혼',hp:700,atk:70,def:15,count:2}],
        trap: {type:'mana_drain',value:30,msg:'📘 마나 흡수! MP -30!'}, reward: {gold:2500,exp:5000} },
      { name: '5층 — 천사장의 옥좌',  theme: 'boss',      ambience: '성스러운 빛이 폭발한다... 천사장이 강림했다!',
        monsters: [],
        boss: {
          name: '천사장 미카엘', hp: 20000, atk: 100, def: 40,
          phases: [
            { hpThreshold: 1.0, name: '1페이즈: 신성 검무', pattern: 'holy_blade', desc: '빠른 검격, 신성 데미지', atkMult: 1.0, defMult: 1.0, element: 'holy' },
            { hpThreshold: 0.5, name: '2페이즈: 천사의 날개', pattern: 'wings', desc: '비행 + 빛의 비 (광역)', atkMult: 1.3, defMult: 1.5, aoePerSec: 25 },
            { hpThreshold: 0.2, name: '최종 페이즈: 심판의 빛', pattern: 'judgment', desc: 'ATK 3배, 단일 즉사 판정', atkMult: 3.0, defMult: 0.5, execute: 0.1 },
          ],
          reward: {gold:50000,exp:80000,diamonds:500,
            drop:{id:'equip_archangel_wing',name:'천사장의 날개',grade:'legendary',chance:0.1},
            title:'celestial_champion',titleName:'천공의 챔피언'}
        },
        reward: {gold:8000,exp:12000} },
    ],
  },
};

// ═══ 함정 효과 처리 ═══
function applyTrapEffect(player, trap) {
  if (!trap) return null;
  const result = { type: trap.type, msg: trap.msg };

  switch (trap.type) {
    case 'poison_gas':
      result.dot = { damage: trap.damage, duration: trap.duration, element: 'poison' };
      break;
    case 'rockfall':
      if (Math.random() < (trap.chance || 0.3)) {
        player.hp = Math.max(1, (player.hp || 0) - trap.damage);
        result.damage = trap.damage;
      } else {
        result.dodged = true;
        result.msg = '⚡ 낙석을 피했다!';
      }
      break;
    case 'lava_floor':
      result.dot = { damage: trap.damage, duration: trap.duration, element: 'fire' };
      break;
    case 'freeze':
      result.stun = trap.duration;
      break;
    case 'dark_seal':
      result.silence = trap.duration;
      break;
    case 'dragonbreath':
      if (Math.random() < (trap.chance || 0.25)) {
        player.hp = Math.max(1, (player.hp || 0) - trap.damage);
        result.damage = trap.damage;
      } else {
        result.dodged = true;
        result.msg = '🐲 드래곤 브레스를 피했다!';
      }
      break;
    case 'lightning_strike':
      if (Math.random() < (trap.chance || 0.35)) {
        player.hp = Math.max(1, (player.hp || 0) - trap.damage);
        result.damage = trap.damage;
        result.stun = 1;
      } else {
        result.dodged = true;
        result.msg = '⚡ 벼락을 피했다!';
      }
      break;
    case 'confusion':
      result.confusion = trap.duration;
      break;
    case 'gust':
      result.knockback = trap.knockback;
      break;
    case 'mana_drain':
      if (player.mp !== undefined) player.mp = Math.max(0, player.mp - (trap.value || 30));
      result.manaDrain = trap.value;
      break;
  }

  return result;
}

// ═══ 보스 페이즈 전환 ═══
function checkBossPhase(bossState) {
  if (!bossState || !bossState.phases) return null;
  const hpPct = bossState.hp / bossState.maxHp;
  for (let i = bossState.phases.length - 1; i >= 0; i--) {
    const phase = bossState.phases[i];
    if (hpPct <= phase.hpThreshold && bossState.currentPhase < i) {
      bossState.currentPhase = i;
      bossState.atk = Math.floor(bossState.baseAtk * phase.atkMult);
      bossState.def = Math.floor(bossState.baseDef * phase.defMult);
      return phase;
    }
  }
  return null;
}

// ═══ 던전 인스턴스 관리 ═══
const activeDeepDungeons = {};

function enterDeepDungeon(playerId, dungeonId, player, io, socket) {
  const dungeon = DEEP_DUNGEONS[dungeonId];
  if (!dungeon) return { success: false, msg: '존재하지 않는 던전입니다.' };
  if ((player.level || 1) < dungeon.minLevel) return { success: false, msg: 'Lv.' + dungeon.minLevel + ' 이상만 입장 가능합니다.' };
  if ((player.gold || 0) < dungeon.entryFee) return { success: false, msg: '골드가 부족합니다. (필요: ' + dungeon.entryFee + 'G)' };
  if (player._deepDungeon) return { success: false, msg: '이미 던전 진행 중입니다.' };

  player.gold -= dungeon.entryFee;

  const instanceId = 'dd_' + playerId + '_' + Date.now();
  const instance = {
    id: instanceId,
    dungeonId,
    playerId,
    currentFloor: 0,
    monstersKilled: 0,
    totalMonsters: dungeon.floors[0].monsters.reduce((s, m) => s + m.count, 0),
    bossState: null,
    startTime: Date.now(),
    accumulatedReward: { gold: 0, exp: 0, diamonds: 0, items: [] },
    trapTriggered: false,
  };

  activeDeepDungeons[instanceId] = instance;
  player._deepDungeon = instanceId;

  const floor = dungeon.floors[0];

  return {
    success: true,
    msg: dungeon.name + ' 입장! (참가비 -' + dungeon.entryFee + 'G)',
    instanceId,
    dungeonName: dungeon.name,
    floor: {
      index: 0,
      name: floor.name,
      theme: floor.theme,
      ambience: floor.ambience,
      monstersTotal: instance.totalMonsters,
      hasTrap: !!floor.trap,
      hasBoss: !!floor.boss,
    },
    totalFloors: dungeon.floors.length,
  };
}

// 몬스터 처치
function killDeepDungeonMonster(playerId, player, io, socket) {
  const instanceId = player._deepDungeon;
  if (!instanceId) return null;
  const instance = activeDeepDungeons[instanceId];
  if (!instance) { player._deepDungeon = null; return null; }

  const dungeon = DEEP_DUNGEONS[instance.dungeonId];
  const floor = dungeon.floors[instance.currentFloor];

  // 보스전 중이면 보스 데미지 처리
  if (instance.bossState) {
    return hitDeepDungeonBoss(instance, player, io, socket, dungeon, floor);
  }

  instance.monstersKilled++;

  // 현재 층 클리어 체크
  if (instance.monstersKilled >= instance.totalMonsters) {
    return clearFloor(instance, player, io, socket, dungeon);
  }

  return {
    type: 'kill',
    floor: instance.currentFloor,
    killed: instance.monstersKilled,
    total: instance.totalMonsters,
    floorName: floor.name,
  };
}

// 보스 타격
function hitDeepDungeonBoss(instance, player, io, socket, dungeon, floor) {
  const boss = instance.bossState;
  const playerAtk = player.atk || 25;
  const isCrit = Math.random() < ((player.critRate || 10) / 100);
  const rawDmg = Math.max(1, playerAtk - Math.floor(boss.def * 0.3));
  const dmg = Math.floor(rawDmg * (0.8 + Math.random() * 0.4) * (isCrit ? 2 : 1));

  boss.hp = Math.max(0, boss.hp - dmg);

  // 페이즈 전환 체크
  const newPhase = checkBossPhase(boss);

  const result = {
    type: 'boss_hit',
    damage: dmg,
    isCrit,
    bossHp: boss.hp,
    bossMaxHp: boss.maxHp,
    bossName: boss.name,
    phaseChange: newPhase,
  };

  // 보스 처치
  if (boss.hp <= 0) {
    const bossReward = floor.boss.reward;
    instance.accumulatedReward.gold += bossReward.gold;
    instance.accumulatedReward.exp += bossReward.exp;
    instance.accumulatedReward.diamonds += (bossReward.diamonds || 0);

    // 드롭 체크
    if (bossReward.drop && Math.random() < bossReward.drop.chance) {
      instance.accumulatedReward.items.push(bossReward.drop);
    }

    // 칭호
    if (bossReward.title) {
      player.title = bossReward.title;
    }

    instance.bossState = null;

    // 마지막 층이면 던전 클리어
    if (instance.currentFloor >= dungeon.floors.length - 1) {
      return completeDungeon(instance, player, io, socket, dungeon);
    } else {
      return clearFloor(instance, player, io, socket, dungeon);
    }
  }

  return result;
}

// 층 클리어
function clearFloor(instance, player, io, socket, dungeon) {
  const floor = dungeon.floors[instance.currentFloor];

  // 층 보상 누적
  instance.accumulatedReward.gold += floor.reward.gold;
  instance.accumulatedReward.exp += floor.reward.exp;
  player.gold = (player.gold || 0) + floor.reward.gold;
  if (player.exp !== undefined) player.exp += floor.reward.exp;

  // 다음 층으로
  instance.currentFloor++;

  if (instance.currentFloor >= dungeon.floors.length) {
    return completeDungeon(instance, player, io, socket, dungeon);
  }

  const nextFloor = dungeon.floors[instance.currentFloor];

  // 보스 층이면 보스 초기화
  if (nextFloor.boss) {
    const b = nextFloor.boss;
    instance.bossState = {
      name: b.name,
      hp: b.hp,
      maxHp: b.hp,
      atk: b.atk,
      def: b.def,
      baseAtk: b.atk,
      baseDef: b.def,
      phases: b.phases,
      currentPhase: -1,
    };
    instance.monstersKilled = 0;
    instance.totalMonsters = 1; // 보스 1체
  } else {
    instance.monstersKilled = 0;
    instance.totalMonsters = nextFloor.monsters.reduce((s, m) => s + m.count, 0);
  }

  // 함정 발동 (진입 시)
  let trapResult = null;
  if (nextFloor.trap && !instance.trapTriggered) {
    instance.trapTriggered = true;
    trapResult = applyTrapEffect(player, nextFloor.trap);
    setTimeout(() => { instance.trapTriggered = false; }, 3000);
  }

  return {
    type: 'floor_clear',
    clearedFloor: instance.currentFloor - 1,
    clearedFloorName: floor.name,
    reward: floor.reward,
    nextFloor: {
      index: instance.currentFloor,
      name: nextFloor.name,
      theme: nextFloor.theme,
      ambience: nextFloor.ambience,
      monstersTotal: instance.totalMonsters,
      hasTrap: !!nextFloor.trap,
      hasBoss: !!nextFloor.boss,
      bossName: nextFloor.boss ? nextFloor.boss.name : null,
    },
    totalFloors: dungeon.floors.length,
    trap: trapResult,
    accumulated: instance.accumulatedReward,
  };
}

// 던전 완전 클리어
function completeDungeon(instance, player, io, socket, dungeon) {
  // 최종 보상 지급
  player.gold = (player.gold || 0) + instance.accumulatedReward.gold;
  if (player.exp !== undefined) player.exp += instance.accumulatedReward.exp;
  player.diamonds = (player.diamonds || 0) + instance.accumulatedReward.diamonds;

  // 드롭 아이템 인벤토리 추가
  for (const item of instance.accumulatedReward.items) {
    if (!player.inventory) player.inventory = {};
    player.inventory[item.id] = (player.inventory[item.id] || 0) + 1;
  }

  const elapsed = Math.floor((Date.now() - instance.startTime) / 1000);

  // 정리
  delete activeDeepDungeons[instance.id];
  player._deepDungeon = null;

  return {
    type: 'dungeon_complete',
    dungeonName: dungeon.name,
    totalReward: instance.accumulatedReward,
    elapsedSec: elapsed,
    title: instance.accumulatedReward.items.length > 0 ? '아이템 획득!' : null,
  };
}

// 던전 포기
function abandonDeepDungeon(playerId, player) {
  const instanceId = player._deepDungeon;
  if (!instanceId) return { success: false, msg: '진행 중인 던전이 없습니다.' };

  const instance = activeDeepDungeons[instanceId];
  if (instance) {
    // 현재까지 보상의 50%만 지급
    player.gold = (player.gold || 0) + Math.floor(instance.accumulatedReward.gold * 0.5);
    if (player.exp !== undefined) player.exp += Math.floor(instance.accumulatedReward.exp * 0.5);
  }

  delete activeDeepDungeons[instanceId];
  player._deepDungeon = null;

  return { success: true, msg: '던전을 포기했습니다. (보상 50% 수령)' };
}

// 현재 상태 조회
function getDeepDungeonStatus(playerId, player) {
  const instanceId = player._deepDungeon;
  if (!instanceId) return { active: false };

  const instance = activeDeepDungeons[instanceId];
  if (!instance) { player._deepDungeon = null; return { active: false }; }

  const dungeon = DEEP_DUNGEONS[instance.dungeonId];
  const floor = dungeon.floors[instance.currentFloor];

  return {
    active: true,
    dungeonName: dungeon.name,
    floor: {
      index: instance.currentFloor,
      name: floor.name,
      theme: floor.theme,
      ambience: floor.ambience,
      hasBoss: !!floor.boss,
      bossName: floor.boss ? floor.boss.name : null,
    },
    progress: instance.monstersKilled + '/' + instance.totalMonsters,
    totalFloors: dungeon.floors.length,
    accumulated: instance.accumulatedReward,
    boss: instance.bossState ? {
      name: instance.bossState.name,
      hp: instance.bossState.hp,
      maxHp: instance.bossState.maxHp,
      phase: instance.bossState.currentPhase,
    } : null,
  };
}

// 소켓 핸들러 등록
function registerDeepDungeonHandlers(socket, playerId, players, io) {
  socket.on('deep_dungeon_list', () => {
    const list = Object.entries(DEEP_DUNGEONS).map(([id, d]) => ({
      id, name: d.name, icon: d.icon, minLevel: d.minLevel, entryFee: d.entryFee,
      desc: d.desc, floors: d.floors.length,
    }));
    socket.emit('deep_dungeon_list', { dungeons: list });
  });

  socket.on('deep_dungeon_enter', (dungeonId) => {
    const p = players[playerId];
    if (!p || !p.isAlive) return;
    const result = enterDeepDungeon(playerId, dungeonId, p, io, socket);
    socket.emit('deep_dungeon_result', result);
    if (result.success) {
      io.emit('server_msg', { msg: '⚔️ ' + (p.displayName||p.className) + '님이 ' + result.dungeonName + '에 입장!', type: 'rare' });
    }
  });

  socket.on('deep_dungeon_kill', () => {
    const p = players[playerId];
    if (!p || !p.isAlive) return;
    const result = killDeepDungeonMonster(playerId, p, io, socket);
    if (result) {
      socket.emit('deep_dungeon_result', result);
      if (result.type === 'dungeon_complete') {
        io.emit('server_msg', {
          msg: '🏆 ' + (p.displayName||p.className) + '님이 ' + result.dungeonName + ' 클리어! (보상: ' + result.totalReward.gold + 'G, ' + result.totalReward.diamonds + '💎)',
          type: 'boss'
        });
      } else if (result.phaseChange) {
        io.emit('server_msg', {
          msg: '⚠️ [보스] ' + result.phaseChange.name + ' — ' + result.phaseChange.desc,
          type: 'danger'
        });
      }
    }
  });

  socket.on('deep_dungeon_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('deep_dungeon_status', getDeepDungeonStatus(playerId, p));
  });

  socket.on('deep_dungeon_abandon', () => {
    const p = players[playerId];
    if (!p) return;
    const result = abandonDeepDungeon(playerId, p);
    socket.emit('deep_dungeon_result', { type: 'abandon', ...result });
  });
}

module.exports = {
  DEEP_DUNGEONS,
  registerDeepDungeonHandlers,
  activeDeepDungeons,
};

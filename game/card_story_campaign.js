// ============================================
// 용병 스토리 캠페인 — 12에피소드 + 선택지 분기
// ============================================

const CAMPAIGN_EPISODES = [
  {
    id: 'ep1', name: '모험의 시작', icon: '🌅',
    desc: '평화로운 마을에 어둠이 드리운다. 한 젊은 전사가 검을 든다.',
    scenes: [
      { id: 's1', text: '마을 입구에서 비명이 들린다. 고블린이 침입했다!',
        choices: [
          { text: '즉시 달려간다 (전투)', result: 'combat', enemy: { name: '고블린 무리', atk: 30, def: 10, hp: 150 }, reward: { gold: 500, karma: 10 } },
          { text: '마을 사람들을 대피시킨다', result: 'karma', reward: { gold: 300, karma: 20 } },
          { text: '무시하고 지나간다', result: 'karma', reward: { gold: 100, karma: -10 } },
        ]
      },
      { id: 's2', text: '고블린을 물리치자 마을 촌장이 감사의 인사를 한다. "영웅이시여, 북쪽 동굴에 더 큰 위험이..."',
        choices: [
          { text: '동굴로 향한다 (다음 에피소드 해금)', result: 'unlock', unlock: 'ep2', reward: { gold: 1000 } },
          { text: '보상을 요구한다', result: 'reward', reward: { gold: 2000, karma: -5 } },
        ]
      },
    ],
    reqLevel: 1, reward: { gold: 2000, exp: 500, card: 'normal' },
  },
  {
    id: 'ep2', name: '어둠의 동굴', icon: '🌑',
    desc: '동굴 깊은 곳에서 기이한 빛이 새어나온다. 무엇이 기다리고 있을까?',
    scenes: [
      { id: 's1', text: '동굴 입구에 상인이 앉아있다. "위험하오. 이 약을 사시오."',
        choices: [
          { text: '약 구매 (500G)', result: 'buy', cost: 500, reward: { healItem: 1 } },
          { text: '거절하고 진입', result: 'continue' },
          { text: '상인과 대화', result: 'lore', lore: '이 동굴은 옛 마법사의 실험실이었다...' },
        ]
      },
      { id: 's2', text: '동굴 깊숙이 들어가니 거대한 트롤이 길을 막고 있다!',
        choices: [
          { text: '정면 돌파! (보스전)', result: 'boss', enemy: { name: '동굴 트롤', atk: 60, def: 30, hp: 500 }, reward: { gold: 3000, diamonds: 10 } },
          { text: '은밀하게 우회 (SPD 체크)', result: 'check', stat: 'spd', threshold: 50, successReward: { gold: 2000 }, failResult: 'combat' },
        ]
      },
      { id: 's3', text: '트롤 뒤에서 고대 유물을 발견했다! 빛나는 검이다.',
        choices: [
          { text: '검을 집는다', result: 'item', reward: { equipment: { name: '고대의 검', atk: 50, grade: 'epic' } } },
          { text: '함정일 수 있다... 조사한다', result: 'check', stat: 'def', threshold: 30, successReward: { equipment: { name: '축복받은 고대 검', atk: 65, grade: 'legend' } }, failReward: { damage: 100 } },
        ]
      },
    ],
    reqLevel: 5, reqEpisode: 'ep1', reward: { gold: 5000, exp: 1000, diamonds: 15 },
  },
  { id: 'ep3', name: '숲의 수호자', icon: '🌲', desc: '엘프 숲에서 도움을 요청한다.', reqLevel: 10, reqEpisode: 'ep2', reward: { gold: 8000, exp: 2000, diamonds: 20, card: 'rare' },
    scenes: [
      { id: 's1', text: '엘프 여왕이 말한다: "어둠의 세력이 우리 숲을 오염시키고 있어요."', choices: [
        { text: '숲 정화 (전투 3연전)', result: 'multi_combat', enemies: [{ name: '오염된 정령', atk: 50, def: 20, hp: 300 }, { name: '독 덩굴', atk: 40, def: 40, hp: 400 }, { name: '어둠 나무', atk: 70, def: 30, hp: 500 }], reward: { gold: 5000, diamonds: 10 } },
        { text: '오염 원인 조사', result: 'lore', lore: '옛 마법사가 금지된 실험을 했다...', reward: { gold: 2000 } },
      ]}
    ]
  },
  { id: 'ep4', name: '용의 산', icon: '🐲', desc: '전설의 용이 산에 깨어났다.', reqLevel: 15, reqEpisode: 'ep3', reward: { gold: 12000, exp: 3000, diamonds: 30 },
    scenes: [{ id: 's1', text: '용의 포효가 울려퍼진다!', choices: [
      { text: '용에게 도전!', result: 'boss', enemy: { name: '화염 드래곤', atk: 120, def: 60, hp: 1500 }, reward: { gold: 10000, diamonds: 20, card: 'epic' } },
      { text: '용과 대화 시도', result: 'check', stat: 'matk', threshold: 80, successReward: { gold: 8000, card: 'epic', lore: '용은 적이 아니었다...' }, failResult: 'combat' },
    ]}]
  },
  { id: 'ep5', name: '왕국의 위기', icon: '🏰', desc: '왕국에 반란이 일어났다!', reqLevel: 20, reqEpisode: 'ep4', reward: { gold: 15000, exp: 5000, diamonds: 40, card: 'epic' },
    scenes: [{ id: 's1', text: '반란군이 왕성을 포위했다!', choices: [
      { text: '왕을 지킨다', result: 'boss', enemy: { name: '반란군 장군', atk: 100, def: 50, hp: 1000 }, reward: { gold: 10000, karma: 30 } },
      { text: '반란군에 합류한다 (어둠 루트)', result: 'dark_path', reward: { gold: 15000, karma: -50 }, unlock: 'ep5_dark' },
    ]}]
  },
  { id: 'ep6', name: '심연의 부름', icon: '🌀', desc: '차원의 균열이 열리고 있다.', reqLevel: 25, reqEpisode: 'ep5', reward: { gold: 20000, exp: 8000, diamonds: 50 },
    scenes: [{ id: 's1', text: '균열 너머에서 속삭임이 들린다...', choices: [
      { text: '균열에 들어간다', result: 'boss', enemy: { name: '차원 수호자', atk: 150, def: 70, hp: 2000 }, reward: { gold: 15000, diamonds: 30 } },
      { text: '균열을 봉인한다', result: 'check', stat: 'matk', threshold: 120, successReward: { gold: 12000, diamonds: 25, title: '봉인사' }, failReward: { damage: 200 } },
    ]}]
  },
  { id: 'ep7', name: '배신', icon: '🗡️💔', desc: '가장 믿었던 동료가 적이었다.', reqLevel: 28, reqEpisode: 'ep6', reward: { gold: 25000, exp: 10000, diamonds: 60, card: 'legend' },
    scenes: [{ id: 's1', text: '"미안하다, 친구. 이것이 내 운명이다."', choices: [
      { text: '싸운다 (보스전)', result: 'boss', enemy: { name: '타락한 동료', atk: 180, def: 80, hp: 2500 }, reward: { gold: 20000, diamonds: 40 } },
      { text: '설득한다', result: 'check', stat: 'hp', threshold: 1000, successReward: { gold: 25000, diamonds: 50, card: 'legend', lore: '동료를 구했다' }, failResult: 'combat' },
    ]}]
  },
  { id: 'ep8', name: '신들의 시험', icon: '⚡', desc: '신이 시험을 내린다.', reqLevel: 30, reqEpisode: 'ep7', reward: { gold: 30000, exp: 15000, diamonds: 80 },
    scenes: [{ id: 's1', text: '하늘에서 번개가 내리꽂힌다. "증명하라, 필멸자여."', choices: [
      { text: '시험에 응한다 (연속 3보스)', result: 'multi_combat', enemies: [{ name: '시련의 수호자', atk: 120, def: 60, hp: 1500 }, { name: '지혜의 심판관', atk: 100, def: 100, hp: 2000 }, { name: '힘의 거신', atk: 200, def: 40, hp: 1800 }], reward: { gold: 25000, diamonds: 60 } },
      { text: '거부한다 (히든 루트)', result: 'hidden', reward: { gold: 10000, title: '반항자', lore: '신에게 거역한 자...' } },
    ]}]
  },
  { id: 'ep9', name: '마왕의 부활', icon: '😈👑', desc: '봉인이 풀리고 마왕이 부활한다.', reqLevel: 33, reqEpisode: 'ep8', reward: { gold: 40000, exp: 20000, diamonds: 100 },
    scenes: [{ id: 's1', text: '대지가 갈라지고 어둠이 쏟아진다!', choices: [
      { text: '마왕에게 도전!', result: 'boss', enemy: { name: '마왕 아스모데우스', atk: 250, def: 100, hp: 5000 }, reward: { gold: 30000, diamonds: 80, card: 'legend' } },
      { text: '동맹 모집 후 진격', result: 'ally', reward: { atkBuff: 0.3, defBuff: 0.3 }, nextCombat: true },
    ]}]
  },
  { id: 'ep10', name: '최후의 전쟁', icon: '⚔️🔥', desc: '세계의 운명을 건 최후의 전투.', reqLevel: 35, reqEpisode: 'ep9', reward: { gold: 50000, exp: 30000, diamonds: 150, card: 'myth' },
    scenes: [{ id: 's1', text: '모든 동료가 함께한다. "끝내자."', choices: [
      { text: '최종 보스전!', result: 'boss', enemy: { name: '혼돈의 군주', atk: 300, def: 120, hp: 8000, mechanic: 'chaos' }, reward: { gold: 50000, diamonds: 100, card: 'myth', title: '세계의 구원자' } },
    ]}]
  },
  { id: 'ep11', name: '에필로그: 평화', icon: '🌅✨', desc: '전쟁이 끝나고 평화가 찾아왔다.', reqLevel: 35, reqEpisode: 'ep10', reward: { gold: 30000, diamonds: 100 },
    scenes: [{ id: 's1', text: '세계에 평화가 돌아왔다. 하지만 새로운 모험이...', choices: [
      { text: '새로운 여행을 떠난다', result: 'unlock', unlock: 'ep12', reward: { gold: 20000, title: '전설의 모험가' } },
      { text: '마을에서 쉰다', result: 'rest', reward: { gold: 10000, fullHeal: true } },
    ]}]
  },
  { id: 'ep12', name: '히든: 태초의 비밀', icon: '🌟🔮', desc: '세계의 시작에 숨겨진 진실.', reqLevel: 40, reqEpisode: 'ep11', reward: { gold: 100000, exp: 50000, diamonds: 300, card: 'myth', title: '태초의 증인' },
    scenes: [{ id: 's1', text: '시간의 끝에서 태초의 존재를 만난다.', choices: [
      { text: '진실을 묻는다', result: 'lore', lore: '이 세계는... 카드 한 장에서 시작되었다.', reward: { gold: 50000, diamonds: 200 } },
      { text: '최종 도전', result: 'boss', enemy: { name: '태초의 존재', atk: 500, def: 200, hp: 20000 }, reward: { gold: 100000, diamonds: 300, card: 'myth', title: '태초의 증인' } },
    ]}]
  },
];

/* ─── 유틸: 캠페인 상태 초기화 ─── */
function ensureCampaign(player) {
  if (!player._campaign) {
    player._campaign = {
      completed: [],          // 완료한 에피소드 id
      unlocked: ['ep1'],      // 해금된 에피소드 id (ep1은 기본 해금)
      current: null,          // { episodeId, sceneIndex, log[], buffActive:{} }
      karma: 0,               // 누적 카르마
      titles: [],             // 획득 칭호
      loreUnlocked: [],       // 해금된 로어 텍스트
      choicesMade: 0,         // 총 선택 횟수
      endings: [],            // 도달한 엔딩 id
    };
  }
  return player._campaign;
}

/* ─── 파티 전투력 계산 ─── */
function getPartyStats(player) {
  const cards = player.cards || player.deck || [];
  let atk = 0, def = 0, hp = 0, matk = 0, spd = 0;
  const party = Array.isArray(cards) ? cards.slice(0, 5) : [];
  for (const c of party) {
    atk  += (c.atk  || c.attack  || 0);
    def  += (c.def  || c.defense || 0);
    hp   += (c.hp   || c.health  || 0);
    matk += (c.matk || c.magicAttack || 0);
    spd  += (c.spd  || c.speed || 0);
  }
  // 기본 스탯 보정 (카드 없을 때도 진행 가능)
  if (party.length === 0) {
    const lv = player.level || 1;
    atk = 20 + lv * 5;
    def = 10 + lv * 3;
    hp  = 200 + lv * 20;
    matk = 15 + lv * 4;
    spd  = 10 + lv * 2;
  }
  return { atk, def, hp, matk, spd, count: party.length || 1 };
}

/* ─── 전투 시스템 ─── */
function combatScene(player, enemy) {
  const camp = ensureCampaign(player);
  const stats = getPartyStats(player);
  const log = [];

  // 버프 적용
  let atkMul = 1, defMul = 1;
  if (camp.current && camp.current.buffActive) {
    if (camp.current.buffActive.atkBuff) atkMul += camp.current.buffActive.atkBuff;
    if (camp.current.buffActive.defBuff) defMul += camp.current.buffActive.defBuff;
  }

  let pHp   = stats.hp;
  let pAtk  = Math.floor(stats.atk * atkMul);
  let pDef  = Math.floor(stats.def * defMul);
  let eHp   = enemy.hp;
  let eAtk  = enemy.atk;
  let eDef  = enemy.def;
  let turn  = 0;
  const maxTurns = 30;

  log.push(`⚔️ 전투 시작: ${enemy.name} (ATK:${eAtk} DEF:${eDef} HP:${eHp})`);
  log.push(`📊 아군 파티: ATK:${pAtk} DEF:${pDef} HP:${pHp}`);

  while (pHp > 0 && eHp > 0 && turn < maxTurns) {
    turn++;

    // 플레이어 공격
    const pDmg = Math.max(1, pAtk - Math.floor(eDef * 0.5));
    // 크리티컬 (10% 확률)
    const crit = Math.random() < 0.1;
    const actualPDmg = crit ? Math.floor(pDmg * 1.5) : pDmg;
    eHp -= actualPDmg;
    log.push(`[턴 ${turn}] 아군 → ${enemy.name}: ${actualPDmg} 데미지${crit ? ' (크리티컬!)' : ''}`);

    if (eHp <= 0) {
      log.push(`✅ ${enemy.name} 격파!`);
      break;
    }

    // 적 공격
    const eDmg = Math.max(1, eAtk - Math.floor(pDef * 0.5));
    // 혼돈 메카닉: 매 3턴마다 2배 공격
    const chaosMul = (enemy.mechanic === 'chaos' && turn % 3 === 0) ? 2 : 1;
    const actualEDmg = Math.floor(eDmg * chaosMul);
    pHp -= actualEDmg;
    if (chaosMul > 1) log.push(`[턴 ${turn}] ⚡ 혼돈 강화! ${enemy.name} → 아군: ${actualEDmg} 데미지`);
    else log.push(`[턴 ${turn}] ${enemy.name} → 아군: ${actualEDmg} 데미지`);

    if (pHp <= 0) {
      log.push(`💀 아군 파티 전멸...`);
      break;
    }
  }

  if (turn >= maxTurns && pHp > 0 && eHp > 0) {
    log.push('⏰ 시간 초과 — 무승부 (전투 실패 처리)');
  }

  const victory = eHp <= 0;
  return {
    victory,
    remainingHp: Math.max(0, pHp),
    enemyRemainingHp: Math.max(0, eHp),
    turns: turn,
    log,
  };
}

/* ─── 보상 지급 ─── */
function grantReward(player, reward) {
  if (!reward) return {};
  const camp = ensureCampaign(player);
  const granted = {};

  if (reward.gold) {
    player.gold = (player.gold || 0) + reward.gold;
    granted.gold = reward.gold;
  }
  if (reward.exp) {
    player.exp = (player.exp || 0) + reward.exp;
    granted.exp = reward.exp;
  }
  if (reward.diamonds) {
    player.diamonds = (player.diamonds || 0) + reward.diamonds;
    granted.diamonds = reward.diamonds;
  }
  if (reward.karma) {
    camp.karma = (camp.karma || 0) + reward.karma;
    granted.karma = reward.karma;
  }
  if (reward.healItem) {
    player.healItems = (player.healItems || 0) + reward.healItem;
    granted.healItem = reward.healItem;
  }
  if (reward.title) {
    if (!camp.titles.includes(reward.title)) {
      camp.titles.push(reward.title);
    }
    granted.title = reward.title;
  }
  if (reward.card) {
    granted.card = reward.card;
    // 카드 등급 보상 — 실제 카드 생성은 외부 시스템에 위임
  }
  if (reward.equipment) {
    if (!player.campaignEquipment) player.campaignEquipment = [];
    player.campaignEquipment.push(reward.equipment);
    granted.equipment = reward.equipment;
  }
  if (reward.fullHeal) {
    // 체력 전체 회복 표시
    granted.fullHeal = true;
  }
  if (reward.damage) {
    granted.damage = reward.damage;
    // 데미지는 실질적 감소 없이 기록만 (전투 중 반영됨)
  }
  if (reward.lore) {
    if (!camp.loreUnlocked.includes(reward.lore)) {
      camp.loreUnlocked.push(reward.lore);
    }
    granted.lore = reward.lore;
  }

  return granted;
}

/* ─── 에피소드 해금 조건 체크 ─── */
function isEpisodeUnlocked(player, ep) {
  const camp = ensureCampaign(player);
  // ep1은 항상 해금
  if (ep.id === 'ep1') return true;
  return camp.unlocked.includes(ep.id);
}

function meetsRequirements(player, ep) {
  const camp = ensureCampaign(player);
  const level = player.level || 1;

  if (ep.reqLevel && level < ep.reqLevel) {
    return { ok: false, msg: `레벨 ${ep.reqLevel} 이상 필요 (현재: ${level})` };
  }
  if (ep.reqEpisode && !camp.completed.includes(ep.reqEpisode)) {
    const reqEpData = CAMPAIGN_EPISODES.find(e => e.id === ep.reqEpisode);
    return { ok: false, msg: `선행 에피소드 '${reqEpData ? reqEpData.name : ep.reqEpisode}' 클리어 필요` };
  }
  if (!isEpisodeUnlocked(player, ep)) {
    return { ok: false, msg: '아직 해금되지 않은 에피소드입니다.' };
  }
  return { ok: true };
}

/* ─── 에피소드 목록 ─── */
function getEpisodeList(player) {
  const camp = ensureCampaign(player);
  return CAMPAIGN_EPISODES.map(ep => {
    const unlocked = isEpisodeUnlocked(player, ep);
    const completed = camp.completed.includes(ep.id);
    const reqs = meetsRequirements(player, ep);
    return {
      id: ep.id,
      name: ep.name,
      icon: ep.icon,
      desc: unlocked ? ep.desc : '???',
      reqLevel: ep.reqLevel,
      reqEpisode: ep.reqEpisode || null,
      unlocked,
      completed,
      canStart: reqs.ok && !camp.current,
      lockReason: reqs.ok ? null : reqs.msg,
      reward: unlocked ? ep.reward : null,
      sceneCount: unlocked ? ep.scenes.length : '?',
    };
  });
}

/* ─── 에피소드 시작 ─── */
function startEpisode(player, episodeId) {
  const camp = ensureCampaign(player);

  if (camp.current) {
    return { success: false, msg: '이미 진행 중인 에피소드가 있습니다. 완료하거나 포기하세요.' };
  }

  const ep = CAMPAIGN_EPISODES.find(e => e.id === episodeId);
  if (!ep) {
    return { success: false, msg: '존재하지 않는 에피소드입니다.' };
  }

  const reqs = meetsRequirements(player, ep);
  if (!reqs.ok) {
    return { success: false, msg: reqs.msg };
  }

  camp.current = {
    episodeId,
    sceneIndex: 0,
    log: [],
    buffActive: {},
    combatQueue: null,  // multi_combat용 대기열
  };

  const scene = ep.scenes[0];
  return {
    success: true,
    episode: { id: ep.id, name: ep.name, icon: ep.icon, desc: ep.desc },
    scene: { id: scene.id, text: scene.text, choices: scene.choices.map((c, i) => ({ index: i, text: c.text })) },
    totalScenes: ep.scenes.length,
    currentScene: 1,
  };
}

/* ─── 현재 씬 가져오기 ─── */
function getCurrentScene(player) {
  const camp = ensureCampaign(player);
  if (!camp.current) {
    return { success: false, msg: '진행 중인 에피소드가 없습니다.' };
  }

  const ep = CAMPAIGN_EPISODES.find(e => e.id === camp.current.episodeId);
  if (!ep) {
    return { success: false, msg: '에피소드 데이터 오류.' };
  }

  const idx = camp.current.sceneIndex;

  // 멀티 전투 대기열이 있으면 다음 전투 표시
  if (camp.current.combatQueue && camp.current.combatQueue.length > 0) {
    const nextEnemy = camp.current.combatQueue[0];
    return {
      success: true,
      episode: { id: ep.id, name: ep.name },
      scene: {
        id: `combat_queue_${camp.current.combatQueue.length}`,
        text: `다음 적이 나타났다: ${nextEnemy.name}!`,
        choices: [{ index: 0, text: `${nextEnemy.name}과(와) 전투!` }],
      },
      totalScenes: ep.scenes.length,
      currentScene: idx + 1,
      combatQueueRemaining: camp.current.combatQueue.length,
    };
  }

  if (idx >= ep.scenes.length) {
    return {
      success: true,
      episode: { id: ep.id, name: ep.name },
      scene: null,
      completed: true,
      msg: '모든 씬을 완료했습니다. 에피소드를 완료하세요.',
    };
  }

  const scene = ep.scenes[idx];
  return {
    success: true,
    episode: { id: ep.id, name: ep.name },
    scene: {
      id: scene.id,
      text: scene.text,
      choices: scene.choices.map((c, i) => ({ index: i, text: c.text })),
    },
    totalScenes: ep.scenes.length,
    currentScene: idx + 1,
  };
}

/* ─── 선택지 처리 ─── */
function makeChoice(player, choiceIndex) {
  const camp = ensureCampaign(player);
  if (!camp.current) {
    return { success: false, msg: '진행 중인 에피소드가 없습니다.' };
  }

  const ep = CAMPAIGN_EPISODES.find(e => e.id === camp.current.episodeId);
  if (!ep) {
    return { success: false, msg: '에피소드 데이터 오류.' };
  }

  // 멀티 전투 대기열 처리
  if (camp.current.combatQueue && camp.current.combatQueue.length > 0) {
    const enemy = camp.current.combatQueue.shift();
    const combatResult = combatScene(player, enemy);
    camp.current.log.push({ type: 'combat', enemy: enemy.name, result: combatResult.victory ? 'win' : 'lose' });

    if (!combatResult.victory) {
      // 전투 패배 — 에피소드 실패
      camp.current = null;
      return {
        success: true,
        type: 'combat',
        victory: false,
        combat: combatResult,
        msg: `${enemy.name}에게 패배했습니다. 에피소드가 초기화됩니다.`,
      };
    }

    // 대기열에 남은 적이 있으면 계속
    if (camp.current.combatQueue.length > 0) {
      const nextEnemy = camp.current.combatQueue[0];
      return {
        success: true,
        type: 'combat',
        victory: true,
        combat: combatResult,
        msg: `${enemy.name} 격파! 다음 적: ${nextEnemy.name}`,
        nextEnemy: nextEnemy.name,
        remaining: camp.current.combatQueue.length,
      };
    }

    // 대기열 소진 — 보상 지급 후 다음 씬
    camp.current.combatQueue = null;
    // 멀티 전투 보상은 마지막 선택에 저장돼 있음
    const queueReward = camp.current._pendingMultiReward;
    let granted = {};
    if (queueReward) {
      granted = grantReward(player, queueReward);
      camp.current._pendingMultiReward = null;
    }
    camp.current.sceneIndex++;
    camp.choicesMade = (camp.choicesMade || 0) + 1;

    return {
      success: true,
      type: 'multi_combat_complete',
      victory: true,
      combat: combatResult,
      reward: granted,
      msg: '모든 적을 격파했습니다!',
      nextScene: getCurrentScene(player),
    };
  }

  // 일반 씬 처리
  const idx = camp.current.sceneIndex;
  if (idx >= ep.scenes.length) {
    return { success: false, msg: '이미 모든 씬을 완료했습니다.' };
  }

  const scene = ep.scenes[idx];
  if (choiceIndex < 0 || choiceIndex >= scene.choices.length) {
    return { success: false, msg: `잘못된 선택지 (0~${scene.choices.length - 1})` };
  }

  const choice = scene.choices[choiceIndex];
  camp.choicesMade = (camp.choicesMade || 0) + 1;
  camp.current.log.push({ scene: scene.id, choice: choiceIndex, text: choice.text, result: choice.result });

  const response = {
    success: true,
    type: choice.result,
    choiceText: choice.text,
  };

  switch (choice.result) {
    case 'combat':
    case 'boss': {
      const enemy = choice.enemy;
      if (!enemy) {
        // failResult로부터 온 전투 — 씬의 첫 번째 전투 적 사용
        response.msg = '전투가 시작됩니다!';
        break;
      }
      const combatResult = combatScene(player, enemy);
      response.combat = combatResult;
      response.victory = combatResult.victory;

      if (combatResult.victory) {
        const granted = grantReward(player, choice.reward);
        response.reward = granted;
        response.msg = `${enemy.name} 격파! 보상 획득!`;
        camp.current.sceneIndex++;
      } else {
        // 패배 — 에피소드 실패
        camp.current = null;
        response.msg = `${enemy.name}에게 패배... 에피소드가 초기화됩니다.`;
      }
      break;
    }

    case 'multi_combat': {
      const enemies = choice.enemies || [];
      if (enemies.length === 0) {
        response.msg = '적이 없습니다.';
        camp.current.sceneIndex++;
        break;
      }
      // 첫 적 즉시 전투, 나머지는 대기열에
      const firstEnemy = enemies[0];
      camp.current.combatQueue = enemies.slice(1);
      camp.current._pendingMultiReward = choice.reward || null;

      const combatResult = combatScene(player, firstEnemy);
      response.combat = combatResult;
      response.victory = combatResult.victory;

      if (!combatResult.victory) {
        camp.current = null;
        response.msg = `${firstEnemy.name}에게 패배... 에피소드가 초기화됩니다.`;
      } else if (camp.current.combatQueue.length > 0) {
        response.msg = `${firstEnemy.name} 격파! 다음 적: ${camp.current.combatQueue[0].name}`;
        response.remaining = camp.current.combatQueue.length;
      } else {
        // 적이 1마리뿐이었음
        camp.current.combatQueue = null;
        const granted = grantReward(player, choice.reward);
        response.reward = granted;
        response.msg = '모든 적을 격파했습니다!';
        camp.current._pendingMultiReward = null;
        camp.current.sceneIndex++;
      }
      break;
    }

    case 'karma': {
      const granted = grantReward(player, choice.reward);
      response.reward = granted;
      response.msg = choice.reward.karma > 0
        ? `선한 행동! 카르마 +${choice.reward.karma}`
        : `카르마 ${choice.reward.karma}`;
      camp.current.sceneIndex++;
      break;
    }

    case 'reward':
    case 'item':
    case 'rest':
    case 'hidden':
    case 'dark_path': {
      const granted = grantReward(player, choice.reward);
      response.reward = granted;
      if (choice.unlock) {
        if (!camp.unlocked.includes(choice.unlock)) {
          camp.unlocked.push(choice.unlock);
        }
        response.unlock = choice.unlock;
      }
      response.msg = choice.result === 'dark_path'
        ? '어둠의 길을 선택했습니다...'
        : '보상을 획득했습니다!';
      camp.current.sceneIndex++;
      break;
    }

    case 'unlock': {
      const granted = grantReward(player, choice.reward);
      response.reward = granted;
      if (choice.unlock && !camp.unlocked.includes(choice.unlock)) {
        camp.unlocked.push(choice.unlock);
      }
      response.unlock = choice.unlock;
      response.msg = `새로운 에피소드가 해금되었습니다!`;
      camp.current.sceneIndex++;
      break;
    }

    case 'buy': {
      const cost = choice.cost || 0;
      if ((player.gold || 0) < cost) {
        response.msg = `골드 부족 (필요: ${cost}G, 보유: ${player.gold || 0}G)`;
        response.purchased = false;
      } else {
        player.gold -= cost;
        const granted = grantReward(player, choice.reward);
        response.reward = granted;
        response.purchased = true;
        response.msg = `${cost}G 지불! 아이템 획득!`;
      }
      camp.current.sceneIndex++;
      break;
    }

    case 'lore': {
      if (choice.lore) {
        if (!camp.loreUnlocked.includes(choice.lore)) {
          camp.loreUnlocked.push(choice.lore);
        }
        response.lore = choice.lore;
      }
      if (choice.reward) {
        const granted = grantReward(player, choice.reward);
        response.reward = granted;
      }
      response.msg = choice.lore || '새로운 이야기를 발견했습니다.';
      camp.current.sceneIndex++;
      break;
    }

    case 'check': {
      const stats = getPartyStats(player);
      const stat = choice.stat || 'atk';
      const threshold = choice.threshold || 0;
      const playerStat = stats[stat] || 0;
      const passed = playerStat >= threshold;

      response.statCheck = { stat, threshold, playerStat, passed };

      if (passed) {
        const granted = grantReward(player, choice.successReward);
        response.reward = granted;
        response.msg = `${stat.toUpperCase()} 체크 성공! (${playerStat} >= ${threshold})`;
        if (choice.successReward && choice.successReward.lore) {
          response.lore = choice.successReward.lore;
        }
        camp.current.sceneIndex++;
      } else {
        // 실패
        if (choice.failResult === 'combat' && choice.enemy) {
          // 실패 시 강제 전투
          const combatResult = combatScene(player, choice.enemy);
          response.combat = combatResult;
          response.victory = combatResult.victory;
          if (combatResult.victory) {
            response.msg = `${stat.toUpperCase()} 체크 실패 (${playerStat} < ${threshold}), 하지만 전투에서 승리!`;
            camp.current.sceneIndex++;
          } else {
            camp.current = null;
            response.msg = `${stat.toUpperCase()} 체크 실패, 전투에서도 패배...`;
          }
        } else if (choice.failReward) {
          const granted = grantReward(player, choice.failReward);
          response.reward = granted;
          response.msg = `${stat.toUpperCase()} 체크 실패! (${playerStat} < ${threshold})`;
          camp.current.sceneIndex++;
        } else {
          response.msg = `${stat.toUpperCase()} 체크 실패! (${playerStat} < ${threshold})`;
          camp.current.sceneIndex++;
        }
      }
      break;
    }

    case 'ally': {
      // 동맹 모집 — 버프 적용 후 다음 씬에서 전투
      if (choice.reward) {
        if (choice.reward.atkBuff) camp.current.buffActive.atkBuff = choice.reward.atkBuff;
        if (choice.reward.defBuff) camp.current.buffActive.defBuff = choice.reward.defBuff;
      }
      response.msg = '동맹을 모집했습니다! 공격력/방어력이 강화됩니다!';
      response.buffs = camp.current.buffActive;
      camp.current.sceneIndex++;
      break;
    }

    case 'continue': {
      response.msg = '계속 진행합니다.';
      camp.current.sceneIndex++;
      break;
    }

    default: {
      response.msg = '선택이 처리되었습니다.';
      if (choice.reward) {
        const granted = grantReward(player, choice.reward);
        response.reward = granted;
      }
      camp.current.sceneIndex++;
      break;
    }
  }

  // 다음 씬 정보 첨부 (에피소드가 아직 유효할 때)
  if (camp.current && !response.nextScene) {
    const next = getCurrentScene(player);
    response.nextScene = next;
  }

  return response;
}

/* ─── 에피소드 완료 ─── */
function completeEpisode(player) {
  const camp = ensureCampaign(player);
  if (!camp.current) {
    return { success: false, msg: '진행 중인 에피소드가 없습니다.' };
  }

  const ep = CAMPAIGN_EPISODES.find(e => e.id === camp.current.episodeId);
  if (!ep) {
    camp.current = null;
    return { success: false, msg: '에피소드 데이터 오류.' };
  }

  // 모든 씬을 완료했는지 확인
  if (camp.current.sceneIndex < ep.scenes.length && !(camp.current.combatQueue && camp.current.combatQueue.length > 0)) {
    return { success: false, msg: `아직 완료하지 않은 씬이 있습니다. (${camp.current.sceneIndex + 1}/${ep.scenes.length})` };
  }

  const episodeId = ep.id;
  const isFirstClear = !camp.completed.includes(episodeId);

  // 에피소드 보상 (첫 클리어만)
  let granted = {};
  if (isFirstClear) {
    granted = grantReward(player, ep.reward);
    camp.completed.push(episodeId);
  }

  // 다음 에피소드 자동 해금 (reqEpisode 기반)
  for (const nextEp of CAMPAIGN_EPISODES) {
    if (nextEp.reqEpisode === episodeId && !camp.unlocked.includes(nextEp.id)) {
      camp.unlocked.push(nextEp.id);
    }
  }

  // 엔딩 기록
  const endingId = `${episodeId}_clear`;
  if (!camp.endings.includes(endingId)) {
    camp.endings.push(endingId);
  }

  // 로그 보존
  const log = camp.current.log;
  camp.current = null;

  return {
    success: true,
    episode: { id: ep.id, name: ep.name, icon: ep.icon },
    firstClear: isFirstClear,
    reward: granted,
    log,
    msg: isFirstClear
      ? `🎉 '${ep.name}' 첫 클리어! 보상 획득!`
      : `'${ep.name}' 재클리어 완료.`,
    nextUnlocked: camp.unlocked.filter(u => !camp.completed.includes(u)),
  };
}

/* ─── 에피소드 포기 ─── */
function abandonEpisode(player) {
  const camp = ensureCampaign(player);
  if (!camp.current) {
    return { success: false, msg: '진행 중인 에피소드가 없습니다.' };
  }
  const epId = camp.current.episodeId;
  camp.current = null;
  return { success: true, msg: `에피소드를 포기했습니다.`, episodeId: epId };
}

/* ─── 캠페인 전체 진행도 ─── */
function getCampaignProgress(player) {
  const camp = ensureCampaign(player);
  const total = CAMPAIGN_EPISODES.length;
  const completed = camp.completed.length;
  const unlocked = camp.unlocked.length;

  return {
    totalEpisodes: total,
    completedEpisodes: completed,
    unlockedEpisodes: unlocked,
    completionRate: Math.floor((completed / total) * 100),
    completedList: camp.completed,
    unlockedList: camp.unlocked,
    karma: camp.karma,
    titles: camp.titles,
    loreUnlocked: camp.loreUnlocked,
    choicesMade: camp.choicesMade,
    endings: camp.endings,
    endingsTotal: CAMPAIGN_EPISODES.length,  // 기본 엔딩 수
    currentEpisode: camp.current ? camp.current.episodeId : null,
    karmaAlignment: camp.karma >= 50 ? '성자'
      : camp.karma >= 20 ? '선인'
      : camp.karma >= 0 ? '중립'
      : camp.karma >= -20 ? '악인'
      : '타락자',
  };
}

/* ─── Socket.io 이벤트 등록 ─── */
function register(io, socket, player) {
  // 에피소드 목록 요청
  socket.on('campaign_list', () => {
    if (!player) return;
    const list = getEpisodeList(player);
    const progress = getCampaignProgress(player);
    socket.emit('campaign_list', { success: true, episodes: list, progress });
  });

  // 에피소드 시작
  socket.on('campaign_start', (data) => {
    if (!player) return;
    const episodeId = data && data.episodeId;
    if (!episodeId) {
      socket.emit('campaign_result', { success: false, msg: 'episodeId가 필요합니다.' });
      return;
    }
    const result = startEpisode(player, episodeId);
    socket.emit('campaign_result', result);
    if (result.success) {
      io.emit('server_msg', {
        msg: `📖 ${player.displayName || player.className || '모험가'}님이 '${result.episode.name}' 스토리를 시작했습니다!`,
        type: 'campaign',
      });
    }
  });

  // 현재 씬 요청
  socket.on('campaign_scene', () => {
    if (!player) return;
    const result = getCurrentScene(player);
    socket.emit('campaign_scene', result);
  });

  // 선택지 선택
  socket.on('campaign_choose', (data) => {
    if (!player) return;
    const choiceIndex = data && typeof data.choiceIndex === 'number' ? data.choiceIndex : -1;
    const result = makeChoice(player, choiceIndex);
    socket.emit('campaign_result', result);

    // 에피소드 자동 완료 체크
    if (result.success && result.nextScene && result.nextScene.completed) {
      const completeResult = completeEpisode(player);
      socket.emit('campaign_complete', completeResult);
      if (completeResult.success && completeResult.firstClear) {
        io.emit('server_msg', {
          msg: `🏆 ${player.displayName || player.className || '모험가'}님이 '${completeResult.episode.name}' 캠페인을 클리어했습니다!`,
          type: 'campaign',
        });
      }
    }
  });

  // 에피소드 포기
  socket.on('campaign_abandon', () => {
    if (!player) return;
    const result = abandonEpisode(player);
    socket.emit('campaign_result', result);
  });

  // 전체 진행도 요청
  socket.on('campaign_progress', () => {
    if (!player) return;
    const progress = getCampaignProgress(player);
    socket.emit('campaign_progress', progress);
  });
}

module.exports = {
  CAMPAIGN_EPISODES,
  getEpisodeList,
  startEpisode,
  getCurrentScene,
  makeChoice,
  combatScene,
  completeEpisode,
  abandonEpisode,
  getCampaignProgress,
  register,
};

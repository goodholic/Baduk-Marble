// ============================================
// 엔드게임 도전 — 최강자를 위한 최종 콘텐츠
// ============================================

// ═══ 1. 심연의 균열 (무한 스케일링 던전) ═══
const ABYSS_RIFT = {
  name: '심연의 균열🌀',
  desc: '무한히 강해지는 적! 얼마나 깊이 갈 수 있는가?',
  entryReq: { towerFloor: 100 }, // 탑 100층 클리어 필요
  scalingPerFloor: { atkMul: 1.12, defMul: 1.1, hpMul: 1.15 }, // 매 층 스케일링
  baseEnemy: { atk: 200, def: 100, hp: 2000 },
  modifiers: [ // 매 5층마다 랜덤 수식어
    { name: '광폭💢', effect: { atkMul: 1.5 } },
    { name: '강철🛡️', effect: { defMul: 2.0 } },
    { name: '재생💚', effect: { regen: 0.05 } },
    { name: '분열💥', effect: { split: true } }, // 죽으면 2마리로 분열
    { name: '반사🪞', effect: { reflect: 0.2 } },
    { name: '흡혈🩸', effect: { lifesteal: 0.15 } },
    { name: '면역🔰', effect: { immuneType: 'random' } }, // 랜덤 속성 면역
    { name: '시간⏳', effect: { turnLimit: 10 } }, // 10턴 내 처치 필요
  ],
  rewardsPerFloor: { gold: 1000, diamonds: 2 }, // 층당 기본 보상
  milestones: [
    { floor: 10, reward: { gold: 20000, diamonds: 50 }, name: '심연 입문' },
    { floor: 25, reward: { gold: 50000, diamonds: 100, card: 'legend' }, name: '심연 탐험가' },
    { floor: 50, reward: { gold: 100000, diamonds: 200, card: 'myth' }, name: '심연의 지배자', title: '심연의 지배자' },
    { floor: 100, reward: { gold: 500000, diamonds: 1000, card: 'myth' }, name: '심연을 넘은 자', title: '심연을 넘은 자' },
  ],
};

// ═══ 2. 시련의 전당 (조건부 도전) ═══
const TRIAL_HALLS = [
  { id: 'trial_solo', name: '고독의 시련🗡️', desc: '카드 1장으로 탑 30층', condition: { maxCards: 1, towerTarget: 30 }, reward: { gold: 30000, diamonds: 80, title: '외로운 영웅' } },
  { id: 'trial_poor', name: '빈자의 시련💰', desc: '일반 등급 카드만으로 탑 20층', condition: { maxGrade: 'normal', towerTarget: 20 }, reward: { gold: 50000, diamonds: 100, title: '진정한 실력자' } },
  { id: 'trial_speed', name: '속도의 시련⚡', desc: '10분 안에 탑 50층', condition: { timeLimit: 600, towerTarget: 50 }, reward: { gold: 40000, diamonds: 90, title: '번개' } },
  { id: 'trial_pacifist', name: '평화의 시련☮️', desc: 'PK 0킬로 시즌 골드 달성', condition: { noPK: true, seasonRank: 'gold' }, reward: { gold: 60000, diamonds: 120, title: '평화주의자' } },
  { id: 'trial_collector', name: '수집의 시련📖', desc: '모든 앨범 완성', condition: { allAlbums: true }, reward: { gold: 100000, diamonds: 200, title: '만물박사' } },
  { id: 'trial_fusion', name: '합체의 시련🔄', desc: '모든 특수 합체 발견', condition: { allFusions: true }, reward: { gold: 80000, diamonds: 150, title: '합체 마스터' } },
  { id: 'trial_prestige', name: '윤회의 시련🔄🔄🔄', desc: '환생 3회 달성', condition: { prestigeLevel: 3 }, reward: { gold: 100000, diamonds: 300, card: 'myth', title: '윤회의 달인' } },
  { id: 'trial_ultimate', name: '궁극의 시련👑', desc: '모든 시련 클리어', condition: { allTrials: true }, reward: { gold: 500000, diamonds: 1000, card: 'myth', title: '전설 그 자체' } },
];

// ═══ 3. 최종 업적 체인 ═══
const ENDGAME_ACHIEVEMENTS = [
  { id: 'eg_max_card', name: '궁극의 카드', desc: '초월 3단계 + 전설 인챈트 3개 + ★5 카드 보유', reward: { gold: 100000, diamonds: 200 }, icon: '👑🃏' },
  { id: 'eg_all_awaken', name: '전원 각성', desc: '각성 카드 10종 보유', reward: { gold: 200000, diamonds: 500, title: '각성자의 왕' }, icon: '🌟🌟🌟' },
  { id: 'eg_all_modes', name: '만능 게이머', desc: '12개 게임 모드 전부 참여', reward: { gold: 150000, diamonds: 300 }, icon: '🎮👑' },
  { id: 'eg_million_gold', name: '백만장자', desc: '누적 골드 100만 획득', reward: { diamonds: 500, title: '재벌' }, icon: '💰💰💰' },
  { id: 'eg_true_ending', name: '진엔딩', desc: '캠페인 12에피소드 + 히든 엔딩 달성', reward: { gold: 200000, diamonds: 500, card: 'myth', title: '완전한 영웅' }, icon: '📖👑' },
  { id: 'eg_perfect', name: '퍼펙트 게임', desc: '모든 업적 + 모든 시련 + 환생 5회', reward: { gold: 1000000, diamonds: 3000, title: '게임의 신' }, icon: '🌟👑🌟' },
];

// ═══ 유틸 ═══
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function grantReward(player, reward) {
  if (!reward) return;
  if (reward.gold) player.gold = (player.gold || 0) + reward.gold;
  if (reward.diamonds) player.diamonds = (player.diamonds || 0) + reward.diamonds;
  if (reward.card) {
    const id = 'endgame_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    if (!player.cards) player.cards = [];
    player.cards.push({ id, name: `엔드게임 보상 카드`, grade: reward.card, atk: 50, def: 40, hp: 300, obtained: Date.now() });
  }
  if (reward.title) {
    if (!player.titles) player.titles = [];
    if (!player.titles.includes(reward.title)) player.titles.push(reward.title);
  }
}

// ═══════════════════════════════════════════
//  심연의 균열 함수
// ═══════════════════════════════════════════

/** 심연의 균열 진입 */
function enterAbyssRift(player) {
  // 입장 조건: 탑 100층 클리어
  const towerFloor = player.towerFloor || player._towerHighest || 0;
  if (towerFloor < ABYSS_RIFT.entryReq.towerFloor) {
    return { ok: false, reason: `탑 ${ABYSS_RIFT.entryReq.towerFloor}층 클리어 필요 (현재: ${towerFloor}층)` };
  }

  // 기존 런이 있으면 거부
  if (player._abyssRift && player._abyssRift.active) {
    return { ok: false, reason: '이미 진행 중인 균열이 있습니다', run: player._abyssRift };
  }

  // 초기화
  player._abyssRift = {
    active: true,
    floor: 1,
    startedAt: Date.now(),
    modifiers: [],       // 현재 활성 수식어
    claimedMilestones: player._abyssRift ? (player._abyssRift.claimedMilestones || []) : [],
    partyHp: {},         // 파티원 HP 유지
  };

  if (!player._abyssBest) player._abyssBest = 0;

  return { ok: true, msg: `${ABYSS_RIFT.name} 진입! 무한한 심연이 기다립니다...`, run: player._abyssRift };
}

/** 현재 층의 적 데이터 생성 */
function getAbyssFloor(run) {
  const floor = run.floor || 1;
  const s = ABYSS_RIFT.scalingPerFloor;
  const base = ABYSS_RIFT.baseEnemy;

  const atk = Math.floor(base.atk * Math.pow(s.atkMul, floor - 1));
  const def = Math.floor(base.def * Math.pow(s.defMul, floor - 1));
  const hp  = Math.floor(base.hp  * Math.pow(s.hpMul, floor - 1));

  // 매 5층마다 수식어 누적 추가
  let activeModifiers = (run.modifiers || []).slice();
  if (floor % 5 === 0 && floor > 0) {
    // 아직 이 층의 수식어를 안 넣었으면 추가
    const alreadyHas = activeModifiers.length >= Math.floor(floor / 5);
    if (!alreadyHas) {
      const mod = pick(ABYSS_RIFT.modifiers);
      activeModifiers.push({ ...mod, addedAtFloor: floor });
      run.modifiers = activeModifiers;
    }
  }

  // 수식어 적용
  let finalAtk = atk, finalDef = def, finalHp = hp;
  let regen = 0, split = false, reflect = 0, lifesteal = 0, immuneType = null, turnLimit = 30;

  for (const mod of activeModifiers) {
    const e = mod.effect;
    if (e.atkMul) finalAtk = Math.floor(finalAtk * e.atkMul);
    if (e.defMul) finalDef = Math.floor(finalDef * e.defMul);
    if (e.regen) regen += e.regen;
    if (e.split) split = true;
    if (e.reflect) reflect += e.reflect;
    if (e.lifesteal) lifesteal += e.lifesteal;
    if (e.immuneType) immuneType = e.immuneType;
    if (e.turnLimit) turnLimit = Math.min(turnLimit, e.turnLimit);
  }

  return {
    floor,
    name: `심연의 존재 Lv.${floor}🌀`,
    atk: finalAtk,
    def: finalDef,
    hp: finalHp,
    maxHp: finalHp,
    regen,
    split,
    reflect,
    lifesteal,
    immuneType,
    turnLimit,
    modifiers: activeModifiers,
  };
}

/** 심연의 균열 전투 */
function fightAbyssFloor(player) {
  if (!player._abyssRift || !player._abyssRift.active) {
    return { ok: false, reason: '진행 중인 균열이 없습니다. 먼저 진입하세요.' };
  }

  const run = player._abyssRift;
  const enemy = getAbyssFloor(run);

  // 파티 구성
  const cards = player.cards || [];
  const party = cards.filter(c => c.inParty || c.selected);
  if (party.length === 0) {
    return { ok: false, reason: '파티에 카드를 편성하세요.' };
  }

  // 파티 스탯 — 이전 층 HP 유지
  const fighters = party.map(c => {
    const savedHp = run.partyHp[c.id];
    const maxHp = c.hp || 200;
    return {
      id: c.id,
      name: c.name || '카드',
      atk: c.atk || 30,
      def: c.def || 20,
      hp: savedHp !== undefined ? savedHp : maxHp,
      maxHp,
      alive: (savedHp !== undefined ? savedHp : maxHp) > 0,
    };
  }).filter(f => f.alive);

  if (fighters.length === 0) {
    // 전멸 — 런 종료
    run.active = false;
    if (run.floor - 1 > (player._abyssBest || 0)) player._abyssBest = run.floor - 1;
    return { ok: true, win: false, reason: '파티 전멸! 균열이 닫힙니다.', bestFloor: player._abyssBest };
  }

  let totalAtk = fighters.reduce((s, f) => s + f.atk, 0);
  let totalDef = fighters.reduce((s, f) => s + f.def, 0);
  let playerHp = fighters.reduce((s, f) => s + f.hp, 0);
  const playerMaxHp = fighters.reduce((s, f) => s + f.maxHp, 0);

  let enemyHp = enemy.hp;
  const log = [];
  const MAX_TURNS = enemy.turnLimit;

  // 면역 타입 결정
  let immuneElement = null;
  if (enemy.immuneType === 'random') {
    const elements = ['fire', 'ice', 'lightning', 'dark', 'holy'];
    immuneElement = pick(elements);
  }

  // 분열 추적
  let splitEnemies = []; // {hp, atk, def}

  for (let turn = 1; turn <= MAX_TURNS && playerHp > 0 && (enemyHp > 0 || splitEnemies.length > 0); turn++) {
    const events = [];

    // ── 플레이어 공격 ──
    let dmgToEnemy = Math.max(1, totalAtk - enemy.def);

    // 면역 감소 (일부 속성 카드의 데미지 무효화 시뮬레이션)
    if (immuneElement) {
      dmgToEnemy = Math.floor(dmgToEnemy * 0.7); // 면역으로 30% 감소
      events.push(`${immuneElement} 면역! 데미지 감소`);
    }

    // 반사 데미지
    if (enemy.reflect > 0) {
      const reflectDmg = Math.floor(dmgToEnemy * enemy.reflect);
      playerHp -= reflectDmg;
      events.push(`반사! ${reflectDmg} 데미지`);
    }

    // 메인 적 공격
    if (enemyHp > 0) {
      enemyHp -= dmgToEnemy;
      events.push(`아군 → 적 ${dmgToEnemy} 데미지 (남은 HP: ${Math.max(0, enemyHp)})`);
    }

    // 분열체 공격
    for (let i = splitEnemies.length - 1; i >= 0; i--) {
      const se = splitEnemies[i];
      const sDmg = Math.max(1, Math.floor(totalAtk * 0.5) - se.def);
      se.hp -= sDmg;
      events.push(`아군 → 분열체 ${sDmg} 데미지`);
      if (se.hp <= 0) {
        splitEnemies.splice(i, 1);
        events.push('분열체 처치!');
      }
    }

    // 분열 처리: 메인 적 사망 시 분열
    if (enemyHp <= 0 && enemy.split) {
      enemy.split = false; // 1회만 분열
      const splitHp = Math.floor(enemy.maxHp * 0.5);
      splitEnemies.push({ hp: splitHp, atk: Math.floor(enemy.atk * 0.6), def: Math.floor(enemy.def * 0.5) });
      splitEnemies.push({ hp: splitHp, atk: Math.floor(enemy.atk * 0.6), def: Math.floor(enemy.def * 0.5) });
      events.push('💥 적이 분열! 2마리로 갈라졌다!');
    }

    // ── 적 공격 ──
    let enemyTotalAtk = 0;
    if (enemyHp > 0) {
      enemyTotalAtk += Math.max(1, enemy.atk - totalDef);
    }
    for (const se of splitEnemies) {
      enemyTotalAtk += Math.max(1, se.atk - totalDef);
    }

    playerHp -= enemyTotalAtk;
    if (enemyTotalAtk > 0) events.push(`적 → 아군 ${enemyTotalAtk} 데미지 (남은 HP: ${Math.max(0, playerHp)})`);

    // 적 흡혈
    if (enemy.lifesteal > 0 && enemyHp > 0) {
      const heal = Math.floor(enemyTotalAtk * enemy.lifesteal);
      enemyHp = Math.min(enemy.maxHp, enemyHp + heal);
      events.push(`흡혈! 적 HP +${heal}`);
    }

    // 적 재생
    if (enemy.regen > 0 && enemyHp > 0) {
      const regenAmt = Math.floor(enemy.maxHp * enemy.regen);
      enemyHp = Math.min(enemy.maxHp, enemyHp + regenAmt);
      events.push(`재생! 적 HP +${regenAmt}`);
    }

    log.push({ turn, events });

    // 모든 적 처치 확인
    if (enemyHp <= 0 && splitEnemies.length === 0) break;
  }

  const win = enemyHp <= 0 && splitEnemies.length === 0;

  // 턴 제한 초과 시 패배
  const timedOut = !win && playerHp > 0;

  // 파티원 HP 갱신
  if (win) {
    const hpRatio = Math.max(0, playerHp) / playerMaxHp;
    for (const f of fighters) {
      run.partyHp[f.id] = Math.max(0, Math.floor(f.maxHp * hpRatio));
    }
  }

  if (win) {
    // 보상
    const floorReward = {
      gold: ABYSS_RIFT.rewardsPerFloor.gold * run.floor,
      diamonds: ABYSS_RIFT.rewardsPerFloor.diamonds * Math.ceil(run.floor / 5),
    };
    grantReward(player, floorReward);

    // 마일스톤 체크
    let milestoneReward = null;
    for (const ms of ABYSS_RIFT.milestones) {
      if (run.floor === ms.floor && !run.claimedMilestones.includes(ms.floor)) {
        run.claimedMilestones.push(ms.floor);
        grantReward(player, ms.reward);
        milestoneReward = ms;
      }
    }

    // 다음 층으로
    run.floor++;

    // 최고 기록 갱신
    if (run.floor - 1 > (player._abyssBest || 0)) player._abyssBest = run.floor - 1;

    return {
      ok: true, win: true,
      floor: run.floor - 1,
      nextFloor: run.floor,
      reward: floorReward,
      milestone: milestoneReward,
      log,
      bestFloor: player._abyssBest,
    };
  } else {
    // 패배 — 런 종료
    run.active = false;
    if (run.floor > (player._abyssBest || 0)) player._abyssBest = run.floor;

    return {
      ok: true, win: false,
      floor: run.floor,
      reason: timedOut ? '⏳ 시간 초과! 턴 내에 처치하지 못했습니다.' : '파티 전멸!',
      log,
      bestFloor: player._abyssBest,
    };
  }
}

/** 심연 상태 조회 */
function getAbyssStatus(player) {
  const run = player._abyssRift || null;
  const best = player._abyssBest || 0;

  // 마일스톤 현황
  const milestones = ABYSS_RIFT.milestones.map(ms => ({
    ...ms,
    claimed: run ? (run.claimedMilestones || []).includes(ms.floor) : false,
    reached: best >= ms.floor,
  }));

  // 진입 가능 여부
  const towerFloor = player.towerFloor || player._towerHighest || 0;
  const canEnter = towerFloor >= ABYSS_RIFT.entryReq.towerFloor;

  return {
    name: ABYSS_RIFT.name,
    desc: ABYSS_RIFT.desc,
    canEnter,
    requiredTowerFloor: ABYSS_RIFT.entryReq.towerFloor,
    currentTowerFloor: towerFloor,
    bestFloor: best,
    active: run ? run.active : false,
    currentFloor: run ? run.floor : 0,
    activeModifiers: run ? run.modifiers : [],
    milestones,
  };
}

// ═══════════════════════════════════════════
//  시련의 전당 함수
// ═══════════════════════════════════════════

/** 시련 달성 여부 확인 */
function evaluateTrialCondition(player, trial) {
  const cond = trial.condition;

  // 궁극의 시련: 다른 모든 시련 클리어 필요
  if (cond.allTrials) {
    const completed = player._trialsCompleted || {};
    const otherTrials = TRIAL_HALLS.filter(t => t.id !== 'trial_ultimate');
    return otherTrials.every(t => completed[t.id]);
  }

  if (cond.allAlbums) {
    return !!(player._allAlbumsComplete);
  }
  if (cond.allFusions) {
    return !!(player._allFusionsDiscovered);
  }
  if (cond.prestigeLevel) {
    return (player.prestigeLevel || 0) >= cond.prestigeLevel;
  }
  if (cond.noPK && cond.seasonRank) {
    const noPK = (player._seasonPkKills || 0) === 0;
    const rankOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'];
    const targetIdx = rankOrder.indexOf(cond.seasonRank);
    const currentIdx = rankOrder.indexOf(player._seasonRank || 'bronze');
    return noPK && currentIdx >= targetIdx;
  }

  // 시련 진행 중에 확인하는 조건 (towerTarget 계열)은 startTrial에서 추적
  // 여기서는 완료 플래그만 확인
  if (player._trialProgress && player._trialProgress[trial.id]) {
    return player._trialProgress[trial.id].completed;
  }

  return false;
}

/** 시련 목록 및 상태 확인 */
function checkTrials(player) {
  const completed = player._trialsCompleted || {};
  const progress = player._trialProgress || {};

  return TRIAL_HALLS.map(trial => ({
    id: trial.id,
    name: trial.name,
    desc: trial.desc,
    condition: trial.condition,
    reward: trial.reward,
    completed: !!completed[trial.id],
    claimed: !!completed[trial.id],
    inProgress: progress[trial.id] ? !progress[trial.id].completed : false,
    progress: progress[trial.id] || null,
  }));
}

/** 시련 시작 */
function startTrial(player, trialId) {
  const trial = TRIAL_HALLS.find(t => t.id === trialId);
  if (!trial) return { ok: false, reason: '존재하지 않는 시련입니다.' };

  if (!player._trialsCompleted) player._trialsCompleted = {};
  if (player._trialsCompleted[trialId]) {
    return { ok: false, reason: '이미 완료한 시련입니다.' };
  }

  if (!player._trialProgress) player._trialProgress = {};

  // 특수 조건 시련은 바로 평가
  const cond = trial.condition;
  if (cond.allTrials || cond.allAlbums || cond.allFusions || cond.prestigeLevel || cond.noPK) {
    const met = evaluateTrialCondition(player, trial);
    if (met) {
      player._trialProgress[trialId] = { completed: true, completedAt: Date.now() };
      return { ok: true, msg: `${trial.name} 조건 달성! 보상을 수령하세요.`, completed: true };
    } else {
      return { ok: true, msg: `${trial.name} 시작. 조건을 달성하세요: ${trial.desc}`, completed: false };
    }
  }

  // towerTarget 계열: 진행 시뮬레이션
  if (cond.towerTarget) {
    // 파티 제한 적용
    const cards = player.cards || [];
    let eligible = cards.filter(c => c.inParty || c.selected);

    if (cond.maxCards) {
      eligible = eligible.slice(0, cond.maxCards);
    }
    if (cond.maxGrade) {
      const gradeOrder = ['normal', 'rare', 'epic', 'legend', 'myth'];
      const maxIdx = gradeOrder.indexOf(cond.maxGrade);
      eligible = eligible.filter(c => {
        const gi = gradeOrder.indexOf(c.grade || 'normal');
        return gi <= maxIdx;
      });
    }

    if (eligible.length === 0) {
      return { ok: false, reason: '조건에 맞는 카드가 없습니다.' };
    }

    // 시련 진행 상태 초기화
    const startTime = Date.now();
    player._trialProgress[trialId] = {
      completed: false,
      startedAt: startTime,
      currentFloor: 0,
      targetFloor: cond.towerTarget,
      timeLimit: cond.timeLimit || null,
      eligibleCards: eligible.map(c => c.id),
      maxCards: cond.maxCards || null,
      maxGrade: cond.maxGrade || null,
    };

    // 시뮬레이션: 제한된 파티로 타워 전투
    let totalAtk = eligible.reduce((s, c) => s + (c.atk || 30), 0);
    let totalDef = eligible.reduce((s, c) => s + (c.def || 20), 0);
    let totalHp = eligible.reduce((s, c) => s + (c.hp || 200), 0);
    let playerHp = totalHp;
    let floorsCleared = 0;
    const timeStart = Date.now();

    for (let fl = 1; fl <= cond.towerTarget; fl++) {
      // 시간 제한 체크
      if (cond.timeLimit) {
        const elapsed = (Date.now() - timeStart) / 1000;
        if (elapsed > cond.timeLimit) break;
      }

      // 적 생성 (타워 기반 스케일링)
      const eHp = 100 + fl * 50;
      const eAtk = 15 + fl * 8;
      const eDef = 10 + fl * 5;

      let curEnemyHp = eHp;
      for (let turn = 1; turn <= 30 && playerHp > 0 && curEnemyHp > 0; turn++) {
        const dmg = Math.max(1, totalAtk - eDef);
        curEnemyHp -= dmg;
        const eDmg = Math.max(1, eAtk - totalDef);
        playerHp -= eDmg;
      }

      if (curEnemyHp <= 0) {
        floorsCleared++;
        // 약간 HP 회복
        playerHp = Math.min(totalHp, playerHp + Math.floor(totalHp * 0.1));
      } else {
        break;
      }
    }

    const progress = player._trialProgress[trialId];
    progress.currentFloor = floorsCleared;
    progress.completed = floorsCleared >= cond.towerTarget;
    if (progress.completed) progress.completedAt = Date.now();

    return {
      ok: true,
      msg: progress.completed
        ? `${trial.name} 클리어! ${floorsCleared}/${cond.towerTarget}층 돌파! 보상을 수령하세요.`
        : `${trial.name} 도전 결과: ${floorsCleared}/${cond.towerTarget}층 돌파. 다시 도전하세요.`,
      completed: progress.completed,
      floorsCleared,
      targetFloor: cond.towerTarget,
    };
  }

  return { ok: false, reason: '알 수 없는 시련 조건입니다.' };
}

/** 시련 보상 수령 */
function claimTrialReward(player, trialId) {
  const trial = TRIAL_HALLS.find(t => t.id === trialId);
  if (!trial) return { ok: false, reason: '존재하지 않는 시련입니다.' };

  if (!player._trialsCompleted) player._trialsCompleted = {};
  if (player._trialsCompleted[trialId]) {
    return { ok: false, reason: '이미 보상을 수령했습니다.' };
  }

  // 완료 여부 확인
  const progress = (player._trialProgress || {})[trialId];
  const directCheck = evaluateTrialCondition(player, trial);

  if (!(progress && progress.completed) && !directCheck) {
    return { ok: false, reason: '시련을 아직 완료하지 못했습니다.' };
  }

  // 보상 지급
  grantReward(player, trial.reward);
  player._trialsCompleted[trialId] = true;

  return {
    ok: true,
    msg: `${trial.name} 보상 수령 완료!`,
    reward: trial.reward,
  };
}

// ═══════════════════════════════════════════
//  엔드게임 업적 함수
// ═══════════════════════════════════════════

/** 개별 업적 달성 조건 평가 */
function evaluateAchievement(player, ach) {
  const cards = player.cards || [];

  switch (ach.id) {
    case 'eg_max_card': {
      // 초월 3단계 + 전설 인챈트 3개 + ★5 카드 보유
      return cards.some(c =>
        (c.transcendLevel || 0) >= 3 &&
        (c.enchants || []).filter(e => e.grade === 'legend').length >= 3 &&
        (c.stars || 0) >= 5
      );
    }
    case 'eg_all_awaken': {
      // 각성 카드 10종
      const awakenedCount = cards.filter(c => c.awakened).length;
      return awakenedCount >= 10;
    }
    case 'eg_all_modes': {
      // 12개 게임 모드 참여
      const modes = player._modesPlayed || [];
      return modes.length >= 12;
    }
    case 'eg_million_gold': {
      // 누적 골드 100만
      return (player._totalGoldEarned || 0) >= 1000000;
    }
    case 'eg_true_ending': {
      // 캠페인 12에피소드 + 히든 엔딩
      return (player._campaignEpisodes || 0) >= 12 && !!player._hiddenEnding;
    }
    case 'eg_perfect': {
      // 모든 업적 + 모든 시련 + 환생 5회
      const claimed = player._endgameAchClaimed || {};
      const otherAchs = ENDGAME_ACHIEVEMENTS.filter(a => a.id !== 'eg_perfect');
      const allAchs = otherAchs.every(a => claimed[a.id]);
      const completed = player._trialsCompleted || {};
      const allTrials = TRIAL_HALLS.every(t => completed[t.id]);
      const prestige = (player.prestigeLevel || 0) >= 5;
      return allAchs && allTrials && prestige;
    }
    default:
      return false;
  }
}

/** 엔드게임 업적 체크 + 자동 수령 */
function checkEndgameAchievements(player) {
  if (!player._endgameAchClaimed) player._endgameAchClaimed = {};

  const results = [];

  for (const ach of ENDGAME_ACHIEVEMENTS) {
    if (player._endgameAchClaimed[ach.id]) {
      results.push({ ...ach, completed: true, claimed: true, newlyClaimed: false });
      continue;
    }

    const met = evaluateAchievement(player, ach);
    if (met) {
      // 자동 수령
      grantReward(player, ach.reward);
      player._endgameAchClaimed[ach.id] = true;
      results.push({ ...ach, completed: true, claimed: true, newlyClaimed: true });
    } else {
      results.push({ ...ach, completed: false, claimed: false, newlyClaimed: false });
    }
  }

  return results;
}

// ═══════════════════════════════════════════
//  엔드게임 종합 상태
// ═══════════════════════════════════════════

/** 엔드게임 전체 현황 */
function getEndgameStatus(player) {
  const abyssStatus = getAbyssStatus(player);
  const trials = checkTrials(player);
  const achievements = checkEndgameAchievements(player);

  const trialsCompleted = trials.filter(t => t.completed).length;
  const trialsTotal = trials.length;
  const achCompleted = achievements.filter(a => a.completed).length;
  const achTotal = achievements.length;

  // 전체 진행도
  const totalItems = 1 + trialsTotal + achTotal; // 심연 + 시련 + 업적
  const completedItems = (abyssStatus.bestFloor >= 100 ? 1 : 0) + trialsCompleted + achCompleted;
  const progress = Math.floor((completedItems / totalItems) * 100);

  return {
    progress: `${progress}%`,
    abyss: abyssStatus,
    trials: { completed: trialsCompleted, total: trialsTotal, list: trials },
    achievements: { completed: achCompleted, total: achTotal, list: achievements },
    summary: `엔드게임 진행도: ${progress}% | 심연 최고: ${abyssStatus.bestFloor}층 | 시련: ${trialsCompleted}/${trialsTotal} | 업적: ${achCompleted}/${achTotal}`,
  };
}

// ═══════════════════════════════════════════
//  소켓 이벤트 등록
// ═══════════════════════════════════════════

function register(io, socket, player) {
  // 심연의 균열
  socket.on('abyss_enter', () => {
    const result = enterAbyssRift(player);
    socket.emit('abyss_enter', result);
    if (result.ok) {
      io.emit('server_msg', `🌀 [심연의 균열] ${player.displayName || '???'}이(가) 심연에 진입!`);
    }
  });

  socket.on('abyss_fight', () => {
    const result = fightAbyssFloor(player);
    socket.emit('abyss_fight', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      if (result.win && result.floor % 10 === 0) {
        io.emit('server_msg', `🌀 [심연의 균열] ${player.displayName || '???'}이(가) ${result.floor}층 돌파!`);
      }
      if (result.win && result.milestone) {
        io.emit('server_msg', `🌀🏆 [심연의 균열] ${player.displayName || '???'} — [${result.milestone.name}] 달성!`);
      }
      if (!result.win) {
        io.emit('server_msg', `🌀💀 [심연의 균열] ${player.displayName || '???'}이(가) ${result.floor}층에서 쓰러졌다... (최고: ${result.bestFloor}층)`);
      }
    }
  });

  socket.on('abyss_status', () => {
    const result = getAbyssStatus(player);
    socket.emit('abyss_status', result);
  });

  // 시련의 전당
  socket.on('trial_list', () => {
    const result = checkTrials(player);
    socket.emit('trial_list', { trials: result });
  });

  socket.on('trial_start', (data) => {
    const trialId = data && data.trialId;
    const result = startTrial(player, trialId);
    socket.emit('trial_start', result);
    if (result.ok && result.completed) {
      const trial = TRIAL_HALLS.find(t => t.id === trialId);
      io.emit('server_msg', `⚔️🏆 [시련의 전당] ${player.displayName || '???'}이(가) [${trial ? trial.name : trialId}] 클리어!`);
    }
  });

  socket.on('trial_claim', (data) => {
    const trialId = data && data.trialId;
    const result = claimTrialReward(player, trialId);
    socket.emit('trial_claim', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // 엔드게임 종합
  socket.on('endgame_status', () => {
    const result = getEndgameStatus(player);
    socket.emit('endgame_status', result);
  });

  socket.on('endgame_check', () => {
    const achievements = checkEndgameAchievements(player);
    socket.emit('endgame_check', { achievements });
    const newClaims = achievements.filter(a => a.newlyClaimed);
    if (newClaims.length > 0) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      for (const ach of newClaims) {
        io.emit('server_msg', `🌟👑 [엔드게임 업적] ${player.displayName || '???'} — [${ach.name}] 달성! ${ach.icon}`);
      }
    }
  });
}

module.exports = {
  ABYSS_RIFT, TRIAL_HALLS, ENDGAME_ACHIEVEMENTS,
  enterAbyssRift, getAbyssFloor, fightAbyssFloor, getAbyssStatus,
  checkTrials, startTrial, claimTrialReward,
  evaluateTrialCondition, evaluateAchievement,
  checkEndgameAchievements, getEndgameStatus,
  register,
};

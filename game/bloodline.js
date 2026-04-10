// ==========================================
// 고대 혈맹 (Ancient Bloodline) — v2.42
// 4혈통 × 3각성 단계 + 변신 + 고유 스킬 + 상성
// ==========================================

// ── 혈통 정의 ─��
const BLOODLINES = {
  dragon: {
    name: '용족', icon: '🐉', color: '#ff4400',
    desc: '고대 용의 피가 흐��는 자. 압도적인 화력과 브레스 공격',
    lore: '태초의 용 바하무트의 후예. 분노할수록 강해지는 용의 피.',
    stages: [
      { level: 1, name: '용의 자각', reqLevel: 25, cost: { gold: 30000, mat_dragon: 5 },
        passive: { atk: 20, critDmg: 0.10 }, desc: 'ATK +20, 크리 데미지 +10%' },
      { level: 2, name: '용린 각성', reqLevel: 35, cost: { gold: 80000, mat_dragon: 15, mat_soul: 10 },
        passive: { atk: 40, critDmg: 0.20, fireAtk: 0.15 }, desc: 'ATK +40, 크리 데미지 +20%, 화속성 +15%',
        skill: { name: '드래곤 브레스', desc: '전방 부채꼴 화염 (ATK 6배, 범위 6)', dmgMulti: 6.0, range: 6, aoe: true, cd: 60, mpCost: 120 } },
      { level: 3, name: '용왕 혈맹', reqLevel: 45, cost: { gold: 200000, mat_dragon: 30, mat_soul: 20 },
        passive: { atk: 70, critDmg: 0.30, fireAtk: 0.25, maxHp: 300 }, desc: 'ATK +70, 크리 데미지 +30%, 화속성 +25%, HP +300',
        skill: { name: '바하무트의 심판', desc: '하늘에서 용의 불길 낙하 (ATK 12배, 광역 8)', dmgMulti: 12.0, range: 8, aoe: true, cd: 180, mpCost: 250 },
        transform: { name: '용인 변신', duration: 30, cd: 300, bonus: { atkMulti: 1.5, defMulti: 1.2, spdMulti: 1.3 }, desc: '30초간 용인 — ATK x1.5, DEF x1.2, SPD x1.3' } },
    ],
    strongVs: 'spirit',   // 용 > 정령
    weakVs: 'demon',      // 용 < 악마
  },

  angel: {
    name: '천사족', icon: '👼', color: '#ffd700',
    desc: '천상의 빛을 이어받은 자. 치유와 보호의 신성한 힘',
    lore: '대천사 미카엘의 축복을 받은 혈통. 아군을 지키는 빛의 수호자.',
    stages: [
      { level: 1, name: '빛의 자각', reqLevel: 25, cost: { gold: 30000, mat_soul: 5 },
        passive: { def: 15, maxHp: 150, healBonus: 0.10 }, desc: 'DEF +15, HP +150, 힐 +10%' },
      { level: 2, name: '날개 각성', reqLevel: 35, cost: { gold: 80000, mat_soul: 15, mat_dragon: 5 },
        passive: { def: 25, maxHp: 300, healBonus: 0.25, holyAtk: 0.15 }, desc: 'DEF +25, HP +300, 힐 +25%, 신성 +15%',
        skill: { name: '천상의 보호막', desc: '자신+주변 아군 5초 보호막 (HP 20%)', shieldPct: 0.20, range: 6, cd: 45, mpCost: 100 } },
      { level: 3, name: '대천사 혈맹', reqLevel: 45, cost: { gold: 200000, mat_soul: 30, mat_dragon: 10 },
        passive: { def: 40, maxHp: 500, healBonus: 0.40, holyAtk: 0.25, allStats: 10 }, desc: 'DEF +40, HP +500, 힐 +40%, 신성 +25%, 올스탯 +10',
        skill: { name: '대천사의 기적', desc: '주변 아군 전원 HP 완전 회복 + 5초 무적', healAllPct: 1.0, invincible: 5, range: 8, cd: 240, mpCost: 300 },
        transform: { name: '세라핌 변신', duration: 25, cd: 300, bonus: { defMulti: 1.5, healMulti: 2.0, holyAura: true }, desc: '25초간 세라핌 — DEF x1.5, 힐 x2, 신성 오라' } },
    ],
    strongVs: 'demon',
    weakVs: 'spirit',
  },

  demon: {
    name: '악마족', icon: '😈', color: '#aa22ff',
    desc: '심연의 어둠��� 품은 자. 저주와 공포, 생명력 흡수',
    lore: '마왕 벨제부브의 혈맥. 공포를 먹고 자라는 암흑의 힘.',
    stages: [
      { level: 1, name: '어둠의 자각', reqLevel: 25, cost: { gold: 30000, mat_soul: 5 },
        passive: { atk: 15, crit: 5, lifesteal: 0.05 }, desc: 'ATK +15, CRIT +5%, 흡혈 5%' },
      { level: 2, name: '마안 각성', reqLevel: 35, cost: { gold: 80000, mat_soul: 15, mat_dragon: 5 },
        passive: { atk: 30, crit: 10, lifesteal: 0.10, darkAtk: 0.15 }, desc: 'ATK +30, CRIT +10%, 흡혈 10%, 암속성 +15%',
        skill: { name: '공포의 시선', desc: '주변 적 5초 공포 (ATK/SPD -30%)', fearDuration: 5, fearPower: 0.30, range: 6, cd: 50, mpCost: 100 } },
      { level: 3, name: '마왕 혈맹', reqLevel: 45, cost: { gold: 200000, mat_soul: 30, mat_dragon: 10 },
        passive: { atk: 50, crit: 15, lifesteal: 0.15, darkAtk: 0.25, evasion: 8 }, desc: 'ATK +50, CRIT +15%, 흡혈 15%, 암속성 +25%, 회피 +8%',
        skill: { name: '심연의 포옹', desc: '단일 적 ATK 15배 + HP 50% 흡수', dmgMulti: 15.0, hpSteal: 0.50, range: 4, cd: 200, mpCost: 280 },
        transform: { name: '대악마 변신', duration: 25, cd: 300, bonus: { atkMulti: 1.6, critMulti: 1.5, lifestealMulti: 2.0 }, desc: '25초간 대악마 — ATK x1.6, CRIT x1.5, 흡혈 x2' } },
    ],
    strongVs: 'dragon',
    weakVs: 'angel',
  },

  spirit: {
    name: '정령족', icon: '🧚', color: '#44ff88',
    desc: '자연의 정수와 하나 된 자. 원소 마법과 극한의 속도',
    lore: '세계수 이그드라실에서 태어난 정령의 피. 자연과 교감하는 원초적 힘.',
    stages: [
      { level: 1, name: '정령의 자각', reqLevel: 25, cost: { gold: 30000, mat_soul: 5 },
        passive: { spd: 5, mp: 40, evasion: 5, skillDmg: 0.08 }, desc: 'SPD +5, MP +40, 회피 +5%, 스킬 데미지 +8%' },
      { level: 2, name: '원소 각성', reqLevel: 35, cost: { gold: 80000, mat_soul: 15, mat_dragon: 5 },
        passive: { spd: 8, mp: 80, evasion: 10, skillDmg: 0.15, cdReduce: 0.10 }, desc: 'SPD +8, MP +80, 회피 +10%, 스킬 +15%, CD -10%',
        skill: { name: '원소 폭풍', desc: '랜덤 원소 광역 (ATK 5배, 범위 7, 상태이상)', dmgMulti: 5.0, range: 7, aoe: true, randomElement: true, cd: 55, mpCost: 110 } },
      { level: 3, name: '대정령 혈맹', reqLevel: 45, cost: { gold: 200000, mat_soul: 30, mat_dragon: 10 },
        passive: { spd: 12, mp: 120, evasion: 15, skillDmg: 0.25, cdReduce: 0.20, allStats: 8 }, desc: 'SPD +12, MP +120, 회피 +15%, 스킬 +25%, CD -20%, 올스탯 +8',
        skill: { name: '세계수의 분노', desc: '4원소 동시 폭발 (ATK 10배, 광역 10, 전 상태이상)', dmgMulti: 10.0, range: 10, aoe: true, allElements: true, cd: 200, mpCost: 280 },
        transform: { name: '대정령 변신', duration: 25, cd: 300, bonus: { spdMulti: 2.0, skillDmgMulti: 1.8, cdReduceMulti: 0.5 }, desc: '25초간 대정령 — SPD x2, 스킬 데미지 x1.8, CD 50% 감소' } },
    ],
    strongVs: 'angel',
    weakVs: 'dragon',
  },
};

// ── 상성 데미지 배율 ──
const MATCHUP_BONUS = 0.20;   // 유리 시 +20%
const MATCHUP_PENALTY = 0.15; // 불리 시 -15%

function _ensure(player) {
  if (!player._bloodline) {
    player._bloodline = {
      type: null,           // 'dragon' | 'angel' | 'demon' | 'spirit'
      stage: 0,             // 0=미각성, 1/2/3
      transformActive: false,
      transformEnd: 0,
      transformCd: 0,
      skillCooldowns: {},
      totalTransforms: 0,
    };
  }
  return player._bloodline;
}

// ── 혈통 선택 (최초 1회) ──
function chooseBloodline(player, type) {
  const bl = _ensure(player);
  if (bl.type) return { success: false, msg: `이미 ${BLOODLINES[bl.type].name} 혈통���니다` };
  if (!BLOODLINES[type]) return { success: false, msg: '잘못된 혈통' };
  if (player.level < 25) return { success: false, msg: 'Lv.25 이상 필요' };

  bl.type = type;
  const info = BLOODLINES[type];
  return { success: true, bloodline: info, msg: `${info.icon} ${info.name} 혈통 각성! — ${info.desc}` };
}

// ── 각성 단계 상승 ──
function awakenStage(player) {
  const bl = _ensure(player);
  if (!bl.type) return { success: false, msg: '혈통을 먼저 선택하세요' };

  const info = BLOODLINES[bl.type];
  const nextStage = bl.stage + 1;
  if (nextStage > 3) return { success: false, msg: '이미 최종 각성' };

  const stageData = info.stages[nextStage - 1];
  if (player.level < stageData.reqLevel) return { success: false, msg: `Lv.${stageData.reqLevel} 필요` };

  // 비용 체크
  if ((player.gold || 0) < stageData.cost.gold) return { success: false, msg: `골드 부족 (${stageData.cost.gold}G)` };
  for (const [item, count] of Object.entries(stageData.cost)) {
    if (item === 'gold') continue;
    if (!player.inventory?.[item] || player.inventory[item] < count) {
      return { success: false, msg: `재료 부족: ${item} x${count}` };
    }
  }

  // 비용 차감
  player.gold -= stageData.cost.gold;
  for (const [item, count] of Object.entries(stageData.cost)) {
    if (item === 'gold') continue;
    player.inventory[item] -= count;
    if (player.inventory[item] <= 0) delete player.inventory[item];
  }

  bl.stage = nextStage;
  return {
    success: true,
    stage: nextStage,
    stageData,
    bloodline: info,
    hasTransform: !!stageData.transform,
    msg: `${info.icon} ${stageData.name}! [${info.name} ${nextStage}단계] — ${stageData.desc}`,
  };
}

// ── 변신 ──
function transform(player) {
  const bl = _ensure(player);
  if (!bl.type || bl.stage < 3) return { success: false, msg: '3단계 각성 필요' };
  if (bl.transformActive) return { success: false, msg: '이미 변신 중' };

  const now = Date.now();
  if (now < bl.transformCd) {
    const remain = Math.ceil((bl.transformCd - now) / 1000);
    return { success: false, msg: `변신 쿨다운 (${remain}초)` };
  }

  const info = BLOODLINES[bl.type];
  const tf = info.stages[2].transform;
  bl.transformActive = true;
  bl.transformEnd = now + tf.duration * 1000;
  bl.transformCd = now + tf.cd * 1000;
  bl.totalTransforms++;

  return {
    success: true, transform: tf, bloodline: info,
    msg: `${info.icon} ${tf.name}! — ${tf.desc}`,
  };
}

// ── 변신 해제 체크 ──
function checkTransform(player) {
  const bl = _ensure(player);
  if (!bl.transformActive) return { active: false };
  if (Date.now() >= bl.transformEnd) {
    bl.transformActive = false;
    return { active: false, justEnded: true };
  }
  return { active: true, remaining: Math.ceil((bl.transformEnd - Date.now()) / 1000) };
}

// ── 혈통 스킬 시전 ──
function useSkill(player, skillIndex) {
  const bl = _ensure(player);
  if (!bl.type) return { success: false, msg: '혈통 없음' };

  const info = BLOODLINES[bl.type];
  // skillIndex 0 = stage 2 스킬, 1 = stage 3 스킬
  const stageIdx = skillIndex === 0 ? 1 : 2;
  if (bl.stage < stageIdx + 1) return { success: false, msg: `${stageIdx + 1}단계 각성 필요` };

  const stageData = info.stages[stageIdx];
  if (!stageData.skill) return { success: false, msg: '스킬 없음' };
  const skill = stageData.skill;

  const now = Date.now();
  const lastUsed = bl.skillCooldowns[skill.name] || 0;
  const cdRemain = Math.ceil((lastUsed + skill.cd * 1000 - now) / 1000);
  if (cdRemain > 0) return { success: false, msg: `쿨다운 (${cdRemain}초)` };
  if (skill.mpCost && (player.mp || 0) < skill.mpCost) return { success: false, msg: `MP 부족 (${skill.mpCost})` };

  if (skill.mpCost) player.mp = Math.max(0, (player.mp || 0) - skill.mpCost);
  bl.skillCooldowns[skill.name] = now;

  return { success: true, skill, bloodline: info, msg: `${info.icon} ${skill.name}! — ${skill.desc}` };
}

// ── 상성 계산 ──
function getMatchupMulti(attackerType, defenderType) {
  if (!attackerType || !defenderType || attackerType === defenderType) return 1.0;
  const attacker = BLOODLINES[attackerType];
  if (!attacker) return 1.0;
  if (attacker.strongVs === defenderType) return 1.0 + MATCHUP_BONUS;
  if (attacker.weakVs === defenderType) return 1.0 - MATCHUP_PENALTY;
  return 1.0;
}

// ── 패시브 보너스 계산 ──
function getPassiveBonuses(player) {
  const bl = _ensure(player);
  if (!bl.type || bl.stage < 1) return {};

  const info = BLOODLINES[bl.type];
  const bonuses = {};

  // 현재 단계까지의 모든 패시브 합산
  for (let i = 0; i < bl.stage; i++) {
    const stage = info.stages[i];
    if (stage.passive) {
      for (const [stat, val] of Object.entries(stage.passive)) {
        bonuses[stat] = (bonuses[stat] || 0) + val;
      }
    }
  }

  // 변신 중 추가 보너스
  if (bl.transformActive && Date.now() < bl.transformEnd) {
    const tf = info.stages[2]?.transform;
    if (tf?.bonus) {
      for (const [stat, val] of Object.entries(tf.bonus)) {
        bonuses['tf_' + stat] = val;
      }
    }
  }

  return bonuses;
}

// ── 상태 조회 ──
function getStatus(player) {
  const bl = _ensure(player);
  const now = Date.now();

  if (!bl.type) {
    return {
      hasBloodline: false,
      available: BLOODLINES,
      canChoose: player.level >= 25,
      reqLevel: 25,
    };
  }

  const info = BLOODLINES[bl.type];
  const tfCheck = checkTransform(player);

  // 다음 단계 정보
  let nextStage = null;
  if (bl.stage < 3) {
    nextStage = info.stages[bl.stage];
  }

  // 스킬 쿨다운
  const skills = [];
  for (let i = 1; i <= 2; i++) {
    const stageData = info.stages[i];
    if (!stageData?.skill) continue;
    const sk = stageData.skill;
    const lastUsed = bl.skillCooldowns[sk.name] || 0;
    const cdRemain = Math.max(0, Math.ceil((lastUsed + sk.cd * 1000 - now) / 1000));
    skills.push({
      index: i - 1, name: sk.name, desc: sk.desc, cd: sk.cd, cdRemain,
      mpCost: sk.mpCost, available: bl.stage >= i + 1 && cdRemain === 0,
      locked: bl.stage < i + 1,
    });
  }

  return {
    hasBloodline: true,
    type: bl.type,
    name: info.name,
    icon: info.icon,
    color: info.color,
    desc: info.desc,
    lore: info.lore,
    stage: bl.stage,
    stageName: bl.stage > 0 ? info.stages[bl.stage - 1].name : '미각성',
    stageDesc: bl.stage > 0 ? info.stages[bl.stage - 1].desc : '',
    nextStage,
    canAwaken: nextStage && player.level >= nextStage.reqLevel,
    skills,
    transformActive: tfCheck.active,
    transformRemaining: tfCheck.remaining || 0,
    transformCdRemain: now < bl.transformCd ? Math.ceil((bl.transformCd - now) / 1000) : 0,
    canTransform: bl.stage >= 3 && !tfCheck.active && now >= bl.transformCd,
    transformInfo: bl.stage >= 3 ? info.stages[2].transform : null,
    totalTransforms: bl.totalTransforms,
    strongVs: BLOODLINES[info.strongVs]?.name || '',
    weakVs: BLOODLINES[info.weakVs]?.name || '',
    matchup: `${BLOODLINES[info.strongVs]?.icon || ''} 강함 / ${BLOODLINES[info.weakVs]?.icon || ''} 약함`,
  };
}

module.exports = {
  BLOODLINES, MATCHUP_BONUS, MATCHUP_PENALTY,
  chooseBloodline, awakenStage, transform, checkTransform, useSkill,
  getMatchupMulti, getPassiveBonuses, getStatus,
};

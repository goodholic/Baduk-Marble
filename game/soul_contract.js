// ==========================================
// 영혼 계약 (Soul Contract) — v2.43
// 보스 영혼 포획 → 계약 의식 → 소환수 사역
// ==========================================

// ── 포획 가능한 보스 영혼 ──
const CAPTURABLE_SOULS = {
  // ═══ Tier 1: 필드 보스 (드롭률 높음, 약한 소환수) ═══
  orc_warlord: {
    name: '오크 대장군', icon: '👹', tier: 1, element: 'earth', color: '#aa8844',
    desc: '오크 전쟁 무리의 족장. 원시적이지만 강력한 힘.',
    stats: { hp: 800, atk: 45, def: 20, spd: 8 },
    skill: { name: '전쟁 함성', desc: '주변 아군 ATK +15% (10초)', type: 'buff', atkMulti: 0.15, duration: 10, cd: 30 },
    dropSource: ['elite', 'rare'], dropRate: 0.08,
    contractCost: { gold: 10000, mat_soul: 3 },
  },
  dark_knight: {
    name: '타락한 기사', icon: '🖤', tier: 1, element: 'dark', color: '#6644aa',
    desc: '명예를 버린 기사. 어둠의 검술을 구사한다.',
    stats: { hp: 600, atk: 55, def: 25, spd: 12 },
    skill: { name: '어둠 베기', desc: '전방 3칸 ATK 4배 (암속성)', type: 'attack', dmgMulti: 4.0, range: 3, cd: 20 },
    dropSource: ['rare', 'boss'], dropRate: 0.06,
    contractCost: { gold: 12000, mat_soul: 5 },
  },
  ice_witch: {
    name: '빙설의 마녀', icon: '❄️', tier: 1, element: 'ice', color: '#88ccff',
    desc: '눈보라를 불러오는 고대의 마녀.',
    stats: { hp: 500, atk: 50, def: 12, spd: 10 },
    skill: { name: '빙결의 숨결', desc: '범위 5 빙결 3초 + ATK 3배', type: 'aoe', dmgMulti: 3.0, range: 5, freeze: 3, cd: 25 },
    dropSource: ['rare', 'boss'], dropRate: 0.06,
    contractCost: { gold: 12000, mat_soul: 5 },
  },

  // ═══ Tier 2: 던전 보스 (중간 드롭률, 강한 소환수) ═══
  fire_dragon: {
    name: '화염의 드래곤', icon: '🐲', tier: 2, element: 'fire', color: '#ff4400',
    desc: '용암 동굴의 지배자. 숨결 한 번에 전장이 불타오른다.',
    stats: { hp: 2500, atk: 80, def: 35, spd: 9 },
    skill: { name: '용의 숨결', desc: '전방 부채꼴 ATK 7배 화염 + 화상', type: 'aoe', dmgMulti: 7.0, range: 6, burn: { dps: 15, duration: 5 }, cd: 35 },
    dropSource: ['boss', 'legendary'], dropRate: 0.04,
    contractCost: { gold: 50000, mat_dragon: 10, mat_soul: 10 },
  },
  shadow_lord: {
    name: '그림자 군주', icon: '👤', tier: 2, element: 'dark', color: '#442266',
    desc: '그림자 차원의 지배자. 실체가 없어 공격이 통하지 않는다.',
    stats: { hp: 1800, atk: 90, def: 15, spd: 18 },
    skill: { name: '그림자 분신', desc: '분신 3체 소환 (본체 50% 스탯)', type: 'summon', count: 3, statRatio: 0.5, duration: 15, cd: 45 },
    dropSource: ['boss', 'legendary'], dropRate: 0.035,
    contractCost: { gold: 55000, mat_soul: 15 },
  },
  storm_giant: {
    name: '폭풍의 거인', icon: '⛈️', tier: 2, element: 'thunder', color: '#44aaff',
    desc: '번개를 두른 거인. 대지를 뒤흔드는 일격.',
    stats: { hp: 3500, atk: 70, def: 50, spd: 6 },
    skill: { name: '뇌격', desc: '범위 8 ATK 6배 번개 + 기절 2초', type: 'aoe', dmgMulti: 6.0, range: 8, stun: 2, cd: 40 },
    dropSource: ['boss', 'legendary'], dropRate: 0.035,
    contractCost: { gold: 55000, mat_dragon: 8, mat_soul: 12 },
  },
  bone_emperor: {
    name: '해골 황제', icon: '💀', tier: 2, element: 'dark', color: '#ccccaa',
    desc: '수천 년간 죽음을 지배한 황제. 죽은 자를 일으킨다.',
    stats: { hp: 2200, atk: 65, def: 40, spd: 8 },
    skill: { name: '죽은 자의 군단', desc: '해골 병사 5체 소환 (20초)', type: 'summon', count: 5, statRatio: 0.3, duration: 20, cd: 50 },
    dropSource: ['boss', 'legendary'], dropRate: 0.03,
    contractCost: { gold: 60000, mat_soul: 18 },
  },

  // ═══ Tier 3: 월드 보스 (매우 희귀, 최강 소환수) ═══
  ancient_dragon: {
    name: '태고의 드래곤', icon: '🐉', tier: 3, element: 'fire', color: '#ff0000',
    desc: '세계가 만들어지기 전부터 존재한 용. 압도적인 위엄.',
    stats: { hp: 8000, atk: 150, def: 60, spd: 12 },
    skill: { name: '멸망의 브레스', desc: '전장 전체 ATK 15배 화염', type: 'aoe', dmgMulti: 15.0, range: 12, burn: { dps: 30, duration: 8 }, cd: 90 },
    dropSource: ['legendary', 'worldboss'], dropRate: 0.01,
    contractCost: { gold: 200000, mat_dragon: 30, mat_soul: 30 },
  },
  abyss_lord: {
    name: '심연의 군주', icon: '🕳️', tier: 3, element: 'void', color: '#8800ff',
    desc: '심연 그 자체인 존재. 모든 것을 삼킨다.',
    stats: { hp: 6000, atk: 180, def: 40, spd: 15 },
    skill: { name: '심연 포식', desc: '범위 내 적 HP 30% 삭감 + 흡수', type: 'aoe', hpCutPct: 0.30, selfHeal: true, range: 10, cd: 80 },
    dropSource: ['legendary', 'worldboss'], dropRate: 0.008,
    contractCost: { gold: 250000, mat_soul: 40 },
  },
  phoenix_immortal: {
    name: '불멸의 피닉스', icon: '🔥', tier: 3, element: 'fire', color: '#ff8800',
    desc: '죽어도 재에서 부활하는 불사의 새.',
    stats: { hp: 5000, atk: 120, def: 30, spd: 20 },
    skill: { name: '불사의 불꽃', desc: '사망 시 50% HP로 부활 + 주변 화염폭발 ATK 10배', type: 'revive', reviveHp: 0.5, explosionMulti: 10.0, range: 6, cd: 120 },
    dropSource: ['legendary', 'worldboss'], dropRate: 0.008,
    contractCost: { gold: 250000, mat_dragon: 25, mat_soul: 25 },
  },
  time_guardian: {
    name: '시간의 수호자', icon: '⏳', tier: 3, element: 'arcane', color: '#ffd700',
    desc: '시간의 흐름을 관장하는 자. 적의 시간을 멈춘다.',
    stats: { hp: 5500, atk: 140, def: 50, spd: 25 },
    skill: { name: '시간 정지', desc: '범위 10 내 모든 적 5초 정지 + ATK 8배', type: 'aoe', dmgMulti: 8.0, range: 10, stun: 5, cd: 100 },
    dropSource: ['worldboss'], dropRate: 0.005,
    contractCost: { gold: 300000, mat_dragon: 20, mat_soul: 40 },
  },
};

// ── 계약 의식 실패 시 저주 ──
const CONTRACT_CURSES = [
  { name: '영혼 침식', desc: 'HP 30% 손실', effect: 'hpLoss', value: 0.3 },
  { name: '정신 오염', desc: 'MP 전부 소실', effect: 'mpDrain' },
  { name: '분노의 반격', desc: '해당 영혼 파편 소실', effect: 'destroySoul' },
  { name: '기억 혼란', desc: 'EXP 2000 손실', effect: 'expLoss', value: 2000 },
];

// ── 소환수 레벨 보너스 ──
const SUMMON_LEVEL_BONUS = [
  { level: 1, multi: 1.0 },
  { level: 2, multi: 1.15 },
  { level: 3, multi: 1.30 },
  { level: 4, multi: 1.50 },
  { level: 5, multi: 1.80 },  // 최대 레벨
];

function _ensure(player) {
  if (!player._soulContract) {
    player._soulContract = {
      fragments: {},       // { soulId: count } — 영혼 파편
      contracted: {},      // { soulId: { level, exp, summonCount } }
      activeSummon: null,  // { soulId, summonEnd, skillCd }
      totalContracts: 0,
      totalSummons: 0,
    };
  }
  return player._soulContract;
}

// ── 영혼 파편 드롭 (보스 처치 시) ──
function tryDropFragment(player, monsterTier) {
  const sc = _ensure(player);
  const dropped = [];
  for (const [id, soul] of Object.entries(CAPTURABLE_SOULS)) {
    if (!soul.dropSource.includes(monsterTier)) continue;
    if (Math.random() < soul.dropRate) {
      sc.fragments[id] = (sc.fragments[id] || 0) + 1;
      dropped.push({ id, soul });
    }
  }
  return dropped;
}

// ── 계약 의식 (영혼 파편 3개 → 계약) ──
function contractSoul(player, soulId) {
  const sc = _ensure(player);
  const soul = CAPTURABLE_SOULS[soulId];
  if (!soul) return { success: false, msg: '알 수 없는 영혼' };
  if (sc.contracted[soulId]) return { success: false, msg: '이미 계약됨' };

  // 파편 체크 (Tier에 따라 필요 수량)
  const fragNeeded = soul.tier === 1 ? 3 : soul.tier === 2 ? 5 : 8;
  if ((sc.fragments[soulId] || 0) < fragNeeded) {
    return { success: false, msg: `파편 부족 (${sc.fragments[soulId] || 0}/${fragNeeded})` };
  }

  // 비용 체크
  const cost = soul.contractCost;
  if ((player.gold || 0) < cost.gold) return { success: false, msg: `골드 부족 (${cost.gold}G)` };
  for (const [item, count] of Object.entries(cost)) {
    if (item === 'gold') continue;
    if (!player.inventory?.[item] || player.inventory[item] < count) {
      return { success: false, msg: `재료 부족: ${item} x${count}` };
    }
  }

  // 계약 성공/실패 판정
  const successRate = soul.tier === 1 ? 0.85 : soul.tier === 2 ? 0.65 : 0.45;
  if (Math.random() > successRate) {
    // 실패 — 저주 + 파편 일부 소실
    const curse = CONTRACT_CURSES[Math.floor(Math.random() * CONTRACT_CURSES.length)];
    if (curse.effect === 'destroySoul') {
      sc.fragments[soulId] = Math.max(0, (sc.fragments[soulId] || 0) - fragNeeded);
    } else {
      sc.fragments[soulId] = Math.max(0, (sc.fragments[soulId] || 0) - 1);
    }
    // 골드는 소모
    player.gold -= Math.floor(cost.gold * 0.5);
    return { success: false, failed: true, curse, msg: `계약 실패! ${curse.name}: ${curse.desc}` };
  }

  // 성공
  sc.fragments[soulId] -= fragNeeded;
  if (sc.fragments[soulId] <= 0) delete sc.fragments[soulId];
  player.gold -= cost.gold;
  for (const [item, count] of Object.entries(cost)) {
    if (item === 'gold') continue;
    player.inventory[item] -= count;
    if (player.inventory[item] <= 0) delete player.inventory[item];
  }

  sc.contracted[soulId] = { level: 1, exp: 0, summonCount: 0 };
  sc.totalContracts++;

  return {
    success: true, soul,
    msg: `${soul.icon} ${soul.name}과(와) 영혼 계약 성공! 이제 소환할 수 있습니다.`,
  };
}

// ── 소환 ──
function summon(player, soulId) {
  const sc = _ensure(player);
  const soul = CAPTURABLE_SOULS[soulId];
  if (!soul) return { success: false, msg: '알 수 없는 영혼' };
  if (!sc.contracted[soulId]) return { success: false, msg: '계약되지 않은 영혼' };
  if (sc.activeSummon) return { success: false, msg: '이미 소환 중' };

  const duration = soul.tier === 1 ? 30 : soul.tier === 2 ? 25 : 20;
  const now = Date.now();
  sc.activeSummon = {
    soulId,
    summonEnd: now + duration * 1000,
    skillCd: 0,
  };
  sc.contracted[soulId].summonCount++;
  sc.totalSummons++;

  // 소환 경험치
  sc.contracted[soulId].exp += 10;
  _checkLevelUp(sc.contracted[soulId]);

  const lvl = sc.contracted[soulId].level;
  const multi = SUMMON_LEVEL_BONUS[lvl - 1]?.multi || 1.0;

  return {
    success: true, soul, duration, level: lvl, multi,
    msg: `${soul.icon} ${soul.name} 소환! (Lv.${lvl}, ${duration}초)`,
  };
}

// ── 소환수 스킬 사용 ──
function useSummonSkill(player) {
  const sc = _ensure(player);
  if (!sc.activeSummon) return { success: false, msg: '소환수 없음' };

  const now = Date.now();
  if (now >= sc.activeSummon.summonEnd) {
    sc.activeSummon = null;
    return { success: false, msg: '소환 시간 종료' };
  }
  if (now < sc.activeSummon.skillCd) {
    const remain = Math.ceil((sc.activeSummon.skillCd - now) / 1000);
    return { success: false, msg: `스킬 쿨다운 (${remain}초)` };
  }

  const soul = CAPTURABLE_SOULS[sc.activeSummon.soulId];
  if (!soul) return { success: false, msg: '오류' };

  const contract = sc.contracted[sc.activeSummon.soulId];
  const lvl = contract?.level || 1;
  const multi = SUMMON_LEVEL_BONUS[lvl - 1]?.multi || 1.0;

  sc.activeSummon.skillCd = now + soul.skill.cd * 1000;

  // 소환 경험치
  if (contract) {
    contract.exp += 5;
    _checkLevelUp(contract);
  }

  return {
    success: true, soul, skill: soul.skill, level: lvl, multi,
    msg: `${soul.icon} ${soul.name}: ${soul.skill.name}!`,
  };
}

// ── 소환 해제 체크 ──
function checkSummon(player) {
  const sc = _ensure(player);
  if (!sc.activeSummon) return { active: false };
  if (Date.now() >= sc.activeSummon.summonEnd) {
    sc.activeSummon = null;
    return { active: false, justEnded: true };
  }
  const soul = CAPTURABLE_SOULS[sc.activeSummon.soulId];
  return {
    active: true,
    soulId: sc.activeSummon.soulId,
    remaining: Math.ceil((sc.activeSummon.summonEnd - Date.now()) / 1000),
    skillCdRemain: Math.max(0, Math.ceil((sc.activeSummon.skillCd - Date.now()) / 1000)),
    soul,
  };
}

// ── 소환수 레벨업 체크 ──
function _checkLevelUp(contract) {
  const expTable = [0, 100, 300, 600, 1000];
  while (contract.level < 5 && contract.exp >= expTable[contract.level]) {
    contract.exp -= expTable[contract.level];
    contract.level++;
  }
}

// ── 영혼 파편으로 소환수 강화 (여분 파편 사용) ──
function feedFragment(player, soulId) {
  const sc = _ensure(player);
  if (!sc.contracted[soulId]) return { success: false, msg: '계약되지 않은 영혼' };
  if ((sc.fragments[soulId] || 0) < 1) return { success: false, msg: '파편 없음' };
  if (sc.contracted[soulId].level >= 5) return { success: false, msg: '이미 최대 레벨' };

  sc.fragments[soulId]--;
  if (sc.fragments[soulId] <= 0) delete sc.fragments[soulId];

  const soul = CAPTURABLE_SOULS[soulId];
  const expGain = soul.tier === 1 ? 30 : soul.tier === 2 ? 50 : 80;
  sc.contracted[soulId].exp += expGain;
  const oldLv = sc.contracted[soulId].level;
  _checkLevelUp(sc.contracted[soulId]);
  const newLv = sc.contracted[soulId].level;

  return {
    success: true, expGain, leveledUp: newLv > oldLv, level: newLv,
    msg: `${soul.icon} +${expGain} EXP${newLv > oldLv ? ` → Lv.${newLv}!` : ''}`,
  };
}

// ── 상태 조회 ──
function getStatus(player) {
  const sc = _ensure(player);
  const now = Date.now();
  const summonCheck = checkSummon(player);

  // 계약된 영혼 목록
  const contracted = Object.entries(sc.contracted).map(([id, c]) => {
    const soul = CAPTURABLE_SOULS[id];
    const multi = SUMMON_LEVEL_BONUS[c.level - 1]?.multi || 1.0;
    const nextExp = [0, 100, 300, 600, 1000][c.level] || 999;
    return {
      id, name: soul.name, icon: soul.icon, tier: soul.tier, element: soul.element,
      color: soul.color, desc: soul.desc,
      level: c.level, exp: c.exp, nextExp, multi: Math.floor(multi * 100),
      summonCount: c.summonCount,
      skillName: soul.skill.name, skillDesc: soul.skill.desc,
      stats: {
        hp: Math.floor(soul.stats.hp * multi),
        atk: Math.floor(soul.stats.atk * multi),
        def: Math.floor(soul.stats.def * multi),
      },
    };
  });

  // 파편 목록
  const fragments = Object.entries(sc.fragments).map(([id, count]) => {
    const soul = CAPTURABLE_SOULS[id];
    const fragNeeded = soul.tier === 1 ? 3 : soul.tier === 2 ? 5 : 8;
    const alreadyContracted = !!sc.contracted[id];
    return {
      id, name: soul.name, icon: soul.icon, tier: soul.tier, color: soul.color,
      count, needed: fragNeeded, canContract: count >= fragNeeded && !alreadyContracted,
      contracted: alreadyContracted,
    };
  });

  // 미발견 영혼
  const undiscovered = Object.entries(CAPTURABLE_SOULS)
    .filter(([id]) => !sc.fragments[id] && !sc.contracted[id])
    .map(([id, soul]) => ({ id, icon: soul.icon, tier: soul.tier }));

  return {
    contracted,
    fragments,
    undiscovered,
    activeSummon: summonCheck.active ? {
      soulId: summonCheck.soulId,
      name: summonCheck.soul?.name,
      icon: summonCheck.soul?.icon,
      remaining: summonCheck.remaining,
      skillCdRemain: summonCheck.skillCdRemain,
    } : null,
    totalContracts: sc.totalContracts,
    totalSummons: sc.totalSummons,
    totalSouls: Object.keys(CAPTURABLE_SOULS).length,
  };
}

module.exports = {
  CAPTURABLE_SOULS, CONTRACT_CURSES, SUMMON_LEVEL_BONUS,
  tryDropFragment, contractSoul, summon, useSummonSkill, checkSummon,
  feedFragment, getStatus,
};

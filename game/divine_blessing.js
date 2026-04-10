// ==========================================
// 신의 축복 (Divine Blessing) — v2.45
// 6신 귀의 + 신앙심 + 기도 + 기적 + 신전
// ==========================================

// ── 6신 정의 ──
const GODS = {
  war: {
    name: '전쟁의 신 아레스', icon: '⚔️', color: '#ff4400',
    domain: '전쟁', desc: '전장에서 승리를 거머쥐는 자에게 힘을 부여하는 신',
    lore: '"피와 철의 향연 속에서 진정한 전사가 태어난다."',
    passive: [
      { faith: 0,    name: '전사의 가호', desc: 'ATK +10', bonus: { atk: 10 } },
      { faith: 100,  name: '전투 본능', desc: 'CRIT +5%, 킬 시 HP 2% 회복', bonus: { crit: 5, killHeal: 0.02 } },
      { faith: 300,  name: '전쟁의 광기', desc: 'ATK +30, 보스 데미지 +15%', bonus: { atk: 30, bossDmg: 0.15 } },
      { faith: 600,  name: '불멸의 투지', desc: 'HP 20% 이하 시 ATK +50%', bonus: { atk: 0, lowHpAtk: 0.50 } },
      { faith: 1000, name: '아레스의 화신', desc: 'ATK +60, CRIT +10%, 크리 데미지 +25%', bonus: { atk: 60, crit: 10, critDmg: 0.25 } },
    ],
    prayer: { name: '승리의 기도', desc: '30초간 ATK +40%, CRIT +15%', buff: { atkMulti: 0.40, critBonus: 0.15 }, duration: 30, cd: 300 },
    miracle: { name: '전쟁신의 분노', desc: '주변 적 전원에게 ATK 20배 번개', dmgMulti: 20.0, aoe: true, range: 10, cd: 600, faithCost: 50 },
  },

  wisdom: {
    name: '지혜의 신 아테나', icon: '📚', color: '#44aaff',
    domain: '지혜', desc: '지식을 추구하는 자에게 깨달음을 내리는 신',
    lore: '"모든 전투는 시작되기 전에 이미 결정된다."',
    passive: [
      { faith: 0,    name: '학자의 가호', desc: 'EXP +10%', bonus: { expBonus: 10 } },
      { faith: 100,  name: '명석한 두뇌', desc: 'MP +50, 스킬 데미지 +8%', bonus: { mp: 50, skillDmg: 0.08 } },
      { faith: 300,  name: '전략가의 눈', desc: 'EXP +20%, 스킬 CD -15%', bonus: { expBonus: 20, cdReduce: 0.15 } },
      { faith: 600,  name: '지혜의 결정', desc: 'MP +100, 스킬 데미지 +15%', bonus: { mp: 100, skillDmg: 0.15 } },
      { faith: 1000, name: '아테나의 현신', desc: 'EXP +30%, 스킬 CD -25%, MP 소모 -20%', bonus: { expBonus: 30, cdReduce: 0.25, mpReduce: 0.20 } },
    ],
    prayer: { name: '깨달음의 기도', desc: '60초간 EXP +50%, 스킬 CD -30%', buff: { expMulti: 0.50, cdReduce: 0.30 }, duration: 60, cd: 300 },
    miracle: { name: '지혜신의 계시', desc: '30초간 모든 적 위치 표시 + 약점 노출 (DEF -40%)', debuffRange: 15, defReduce: 0.40, duration: 30, cd: 600, faithCost: 50 },
  },

  nature: {
    name: '자연의 신 가이아', icon: '🌿', color: '#44ff44',
    domain: '자연', desc: '대지와 생명을 관장하는 태초의 어머니',
    lore: '"자연의 품에서 모든 상처는 치유되리라."',
    passive: [
      { faith: 0,    name: '대지의 가호', desc: 'HP +100, HP 리젠 +1%', bonus: { maxHp: 100, hpRegen: 0.01 } },
      { faith: 100,  name: '자연 치유', desc: '힐 효율 +20%, 독/화상 저항 30%', bonus: { healBonus: 0.20, dotResist: 0.30 } },
      { faith: 300,  name: '생명의 축복', desc: 'HP +300, 포션 효과 +30%', bonus: { maxHp: 300, potionBonus: 0.30 } },
      { faith: 600,  name: '세계수의 뿌리', desc: 'HP 리젠 +3%, 디버프 시간 -40%', bonus: { hpRegen: 0.03, debuffReduce: 0.40 } },
      { faith: 1000, name: '가이아의 품', desc: 'HP +600, 힐 +40%, 사망 시 1회 부활', bonus: { maxHp: 600, healBonus: 0.40, autoRevive: true } },
    ],
    prayer: { name: '생명의 기도', desc: 'HP/MP 완전 회복 + 15초 리젠 오라', buff: { fullHeal: true, regenAura: true }, duration: 15, cd: 300 },
    miracle: { name: '자연신의 기적', desc: '주변 아군 전원 HP 완전 회복 + 부활', healAll: true, reviveAll: true, range: 12, cd: 600, faithCost: 50 },
  },

  death: {
    name: '죽음의 신 타나토스', icon: '💀', color: '#8844cc',
    domain: '죽음', desc: '생과 사의 경계를 지배하는 심판자',
    lore: '"죽음을 두려워하지 않는 자만이 진정한 힘을 얻는다."',
    passive: [
      { faith: 0,    name: '사신의 가호', desc: '흡혈 +3%', bonus: { lifesteal: 0.03 } },
      { faith: 100,  name: '영혼 수확', desc: '적 처치 시 EXP +15%, 흡혈 +5%', bonus: { killExpBonus: 0.15, lifesteal: 0.05 } },
      { faith: 300,  name: '죽음의 손길', desc: '공격 시 5% 확률 즉사 (보스 제외)', bonus: { instantKill: 0.05 } },
      { faith: 600,  name: '영혼 포식', desc: '흡혈 +10%, 적 처치 시 ATK +3 영구 (최대 +60)', bonus: { lifesteal: 0.10, killAtkStack: 3, killAtkMax: 60 } },
      { faith: 1000, name: '타나토스의 대리인', desc: '즉사 8%, 흡혈 15%, 사망 면역 1회/5분', bonus: { instantKill: 0.08, lifesteal: 0.15, deathImmune: true } },
    ],
    prayer: { name: '죽음의 기도', desc: '30초간 흡혈 +25%, 적 처치 시 3초 무적', buff: { lifestealBonus: 0.25, killInvincible: 3 }, duration: 30, cd: 300 },
    miracle: { name: '죽음신의 심판', desc: '범위 내 모든 적 HP 50% 삭감 (보스 25%)', hpCutPct: 0.50, bossHpCut: 0.25, range: 12, cd: 600, faithCost: 50 },
  },

  time: {
    name: '시간의 신 크로노스', icon: '⏳', color: '#ffd700',
    domain: '시간', desc: '과거와 미래를 꿰뚫어 보는 시간의 지배자',
    lore: '"시간을 다스리는 자, 세계를 다스린다."',
    passive: [
      { faith: 0,    name: '시간의 가호', desc: 'SPD +3, 공격 속도 +5%', bonus: { spd: 3, atkSpeed: 0.05 } },
      { faith: 100,  name: '가속', desc: 'SPD +5, 스킬 CD -10%', bonus: { spd: 5, cdReduce: 0.10 } },
      { faith: 300,  name: '시간 왜곡', desc: '공격 속도 +15%, 회피 +8%', bonus: { atkSpeed: 0.15, evasion: 8 } },
      { faith: 600,  name: '시간 역행', desc: '사망 시 3초 전 상태로 되돌림 (5분 CD)', bonus: { timeRewind: true } },
      { faith: 1000, name: '크로노스의 총애', desc: 'SPD +10, CD -20%, 공격 속도 +25%', bonus: { spd: 10, cdReduce: 0.20, atkSpeed: 0.25 } },
    ],
    prayer: { name: '시간의 기도', desc: '20초간 모든 쿨다운 정지 (무한 시전)', buff: { cdFreeze: true }, duration: 20, cd: 300 },
    miracle: { name: '시간신의 권능', desc: '범위 내 모든 적 8초 시간 정지', stunAll: true, stunDuration: 8, range: 12, cd: 600, faithCost: 50 },
  },

  fortune: {
    name: '행운의 신 포르투나', icon: '🍀', color: '#44ff88',
    domain: '행운', desc: '운명의 주사위를 굴리는 변덕스러운 신',
    lore: '"행운은 준비된 자에게 미소 짓는다... 가끔은 아닌 적도 있지만."',
    passive: [
      { faith: 0,    name: '행운의 가호', desc: '골드 +10%, 드롭률 +5%', bonus: { goldBonus: 10, dropRate: 0.05 } },
      { faith: 100,  name: '행운아', desc: '크리 +5%, 희귀 몬스터 출현 +10%', bonus: { crit: 5, rareSpawn: 0.10 } },
      { faith: 300,  name: '대박 기운', desc: '골드 +20%, 드롭률 +15%, 강화 성공 +5%', bonus: { goldBonus: 20, dropRate: 0.15, enchantSuccess: 0.05 } },
      { faith: 600,  name: '잭팟', desc: '몬스터 처치 시 3% 확률 10배 보상', bonus: { jackpot: 0.03, jackpotMulti: 10 } },
      { faith: 1000, name: '포르투나의 총애', desc: '골드 +30%, 드롭 +20%, 강화 +10%, 잭팟 5%', bonus: { goldBonus: 30, dropRate: 0.20, enchantSuccess: 0.10, jackpot: 0.05 } },
    ],
    prayer: { name: '행운의 기도', desc: '60초간 드롭률 x2, 골드 x2', buff: { dropMulti: 2.0, goldMulti: 2.0 }, duration: 60, cd: 300 },
    miracle: { name: '행운신의 축복', desc: '즉시 다이아 100 + 랜덤 전설 장비 1개', instantReward: { diamonds: 100, legendaryDrop: true }, cd: 600, faithCost: 50 },
  },
};

// ── 신앙심 획득 소스 ──
const FAITH_SOURCES = {
  daily_prayer: 15,
  kill_boss: 5,
  kill_legendary: 10,
  dungeon_clear: 10,
  pvp_win: 3,
  world_boss: 20,
  offering_gold: { per: 10000, faith: 5 },  // 골드 공양
  offering_item: { item: 'mat_soul', faith: 15 },  // 영혼석 공양
};

function _ensure(player) {
  if (!player._divine) {
    player._divine = {
      god: null,           // 'war' | 'wisdom' | 'nature' | 'death' | 'time' | 'fortune'
      faith: 0,
      totalFaith: 0,
      prayerCd: 0,
      miracleCd: 0,
      lastPrayerDate: null,
      dailyPrayers: 0,
      miracleCount: 0,
      killAtkStacks: 0,    // 죽음의 신 전용
    };
  }
  return player._divine;
}

// ── 신 선택 (변경 가능하지만 신앙심 50% 손실) ──
function chooseGod(player, godId) {
  const dv = _ensure(player);
  if (!GODS[godId]) return { success: false, msg: '알 수 없는 신' };

  if (dv.god === godId) return { success: false, msg: '이미 이 신을 믿고 있습니다' };

  const oldGod = dv.god;
  if (oldGod) {
    // 신 변경 — 신앙심 50% 페널티
    dv.faith = Math.floor(dv.faith * 0.5);
  }

  dv.god = godId;
  const god = GODS[godId];
  return {
    success: true, god, oldGod,
    msg: `${god.icon} ${god.name}에게 귀의했습니다!${oldGod ? ' (신앙심 50% 감소)' : ''}`,
  };
}

// ── 기도 (일일 + 쿨다운) ──
function pray(player) {
  const dv = _ensure(player);
  if (!dv.god) return { success: false, msg: '먼저 신을 선택하세요' };

  const now = Date.now();
  if (now < dv.prayerCd) {
    const remain = Math.ceil((dv.prayerCd - now) / 1000);
    return { success: false, msg: `기도 쿨다운 (${remain}초)` };
  }

  const god = GODS[dv.god];
  const prayer = god.prayer;

  dv.prayerCd = now + prayer.cd * 1000;
  dv.faith += FAITH_SOURCES.daily_prayer;
  dv.totalFaith += FAITH_SOURCES.daily_prayer;
  dv.dailyPrayers++;

  return {
    success: true, god, prayer,
    faithGain: FAITH_SOURCES.daily_prayer,
    msg: `${god.icon} ${prayer.name}! — ${prayer.desc} (+${FAITH_SOURCES.daily_prayer} 신앙심)`,
  };
}

// ── 기적 발동 ──
function miracle(player) {
  const dv = _ensure(player);
  if (!dv.god) return { success: false, msg: '먼저 신을 선택하세요' };
  if (dv.faith < 50) return { success: false, msg: `신앙심 50 필요 (현재: ${dv.faith})` };

  const now = Date.now();
  if (now < dv.miracleCd) {
    const remain = Math.ceil((dv.miracleCd - now) / 1000);
    return { success: false, msg: `기적 쿨다운 (${remain}초)` };
  }

  const god = GODS[dv.god];
  const mir = god.miracle;

  dv.faith -= mir.faithCost;
  dv.miracleCd = now + mir.cd * 1000;
  dv.miracleCount++;

  return {
    success: true, god, miracle: mir,
    msg: `${god.icon} ${mir.name}! — ${mir.desc || ''}`,
  };
}

// ── 공양 (골드/아이템 → 신앙심) ──
function offering(player, type) {
  const dv = _ensure(player);
  if (!dv.god) return { success: false, msg: '먼저 신을 선택하세요' };

  if (type === 'gold') {
    const cost = FAITH_SOURCES.offering_gold.per;
    if ((player.gold || 0) < cost) return { success: false, msg: `골드 부족 (${cost}G)` };
    player.gold -= cost;
    const gain = FAITH_SOURCES.offering_gold.faith;
    dv.faith += gain;
    dv.totalFaith += gain;
    return { success: true, faithGain: gain, msg: `${cost}G 공양 → +${gain} 신앙심` };
  }

  if (type === 'item') {
    const item = FAITH_SOURCES.offering_item.item;
    if (!player.inventory?.[item] || player.inventory[item] <= 0) {
      return { success: false, msg: `영혼석 부족` };
    }
    player.inventory[item]--;
    if (player.inventory[item] <= 0) delete player.inventory[item];
    const gain = FAITH_SOURCES.offering_item.faith;
    dv.faith += gain;
    dv.totalFaith += gain;
    return { success: true, faithGain: gain, msg: `영혼석 공양 → +${gain} 신앙심` };
  }

  return { success: false, msg: '잘못된 공양 유형' };
}

// ── 신앙심 획득 (외부 호출) ──
function earnFaith(player, source) {
  const dv = _ensure(player);
  if (!dv.god) return 0;
  const gain = FAITH_SOURCES[source] || 0;
  if (gain <= 0) return 0;
  dv.faith += gain;
  dv.totalFaith += gain;
  return gain;
}

// ── 현재 패시브 계산 ──
function getPassiveBonuses(player) {
  const dv = _ensure(player);
  if (!dv.god) return {};

  const god = GODS[dv.god];
  const bonuses = {};

  for (const tier of god.passive) {
    if (dv.faith < tier.faith) break;
    for (const [stat, val] of Object.entries(tier.bonus)) {
      if (typeof val === 'boolean') {
        bonuses[stat] = val;
      } else {
        bonuses[stat] = (bonuses[stat] || 0) + val;
      }
    }
  }

  // 죽음의 신 킬 스택
  if (dv.god === 'death' && dv.killAtkStacks > 0) {
    bonuses.atk = (bonuses.atk || 0) + dv.killAtkStacks;
  }

  return bonuses;
}

// ── 현재 신앙 등급 ──
function _getFaithRank(faith) {
  if (faith >= 1000) return { rank: 5, name: '신의 대리인', icon: '👑' };
  if (faith >= 600)  return { rank: 4, name: '대사제', icon: '⭐' };
  if (faith >= 300)  return { rank: 3, name: '사제', icon: '✨' };
  if (faith >= 100)  return { rank: 2, name: '신도', icon: '🙏' };
  if (faith >= 0)    return { rank: 1, name: '입문자', icon: '🌱' };
  return { rank: 0, name: '무신론자', icon: '❓' };
}

// ── 상태 조회 ──
function getStatus(player) {
  const dv = _ensure(player);
  const now = Date.now();

  if (!dv.god) {
    return {
      hasGod: false,
      gods: Object.entries(GODS).map(([id, g]) => ({
        id, name: g.name, icon: g.icon, color: g.color, domain: g.domain,
        desc: g.desc, lore: g.lore,
      })),
    };
  }

  const god = GODS[dv.god];
  const faithRank = _getFaithRank(dv.faith);

  // 현재 해금된 패시브
  const unlockedPassives = god.passive.filter(p => dv.faith >= p.faith);
  const nextPassive = god.passive.find(p => dv.faith < p.faith);

  return {
    hasGod: true,
    godId: dv.god,
    god: { name: god.name, icon: god.icon, color: god.color, domain: god.domain, desc: god.desc, lore: god.lore },
    faith: dv.faith,
    totalFaith: dv.totalFaith,
    faithRank,
    unlockedPassives: unlockedPassives.map(p => ({ name: p.name, desc: p.desc, faith: p.faith })),
    nextPassive: nextPassive ? { name: nextPassive.name, desc: nextPassive.desc, faith: nextPassive.faith } : null,
    prayer: {
      name: god.prayer.name, desc: god.prayer.desc,
      cdRemain: Math.max(0, Math.ceil((dv.prayerCd - now) / 1000)),
      canPray: now >= dv.prayerCd,
    },
    miracle: {
      name: god.miracle.name, desc: god.miracle.desc || '',
      faithCost: god.miracle.faithCost,
      cdRemain: Math.max(0, Math.ceil((dv.miracleCd - now) / 1000)),
      canUse: now >= dv.miracleCd && dv.faith >= god.miracle.faithCost,
    },
    miracleCount: dv.miracleCount,
    dailyPrayers: dv.dailyPrayers,
    killAtkStacks: dv.god === 'death' ? dv.killAtkStacks : undefined,
  };
}

module.exports = {
  GODS, FAITH_SOURCES,
  chooseGod, pray, miracle, offering, earnFaith, getPassiveBonuses, getStatus,
};

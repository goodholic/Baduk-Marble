// ==========================================
// 운명의 별자리 — v2.40 (v1.93 확장)
// 12궁 별자리 × 5노드 패시브 트리 + 별가루 재화
// 매일 관측 + 별 수집 + 영구 패시브 해금
// ==========================================

const CONSTELLATIONS = [
  { id:'aries',       name:'양자리',     icon:'♈', stat:'atk',       value:8,  desc:'돌진하는 양', element:'fire' },
  { id:'taurus',      name:'황소자리',   icon:'♉', stat:'def',       value:12, desc:'굳건한 황소', element:'earth' },
  { id:'gemini',      name:'쌍둥이자리', icon:'♊', stat:'crit',      value:5,  desc:'쌍둥이의 가호', element:'wind' },
  { id:'cancer',      name:'게자리',     icon:'♋', stat:'maxHp',     value:50, desc:'단단한 껍질', element:'water' },
  { id:'leo',         name:'사자자리',   icon:'♌', stat:'atk',       value:12, desc:'백수의 왕', element:'fire' },
  { id:'virgo',       name:'처녀자리',   icon:'♍', stat:'evasion',   value:5,  desc:'순수한 우아함', element:'earth' },
  { id:'libra',       name:'천칭자리',   icon:'♎', stat:'allStats',  value:4,  desc:'균형의 가호', element:'wind' },
  { id:'scorpio',     name:'전갈자리',   icon:'♏', stat:'crit',      value:8,  desc:'독침', element:'water' },
  { id:'sagittarius', name:'사수자리',   icon:'♐', stat:'expBonus',  value:10, desc:'머나먼 화살', element:'fire' },
  { id:'capricorn',   name:'염소자리',   icon:'♑', stat:'goldBonus', value:15, desc:'풍요의 산양', element:'earth' },
  { id:'aquarius',    name:'물병자리',   icon:'♒', stat:'mp',        value:30, desc:'영혼의 물병', element:'water' },
  { id:'pisces',      name:'물고기자리', icon:'♓', stat:'evasion',   value:8,  desc:'유영하는 물고기', element:'water' },
];

const ZODIAC_MASTER_BONUS = {
  stat:'allStats', value:10, desc:'12 별자리 관측 완료 — 별의 인도자',
};

// ── v2.40: 별자리 패시브 트리 (12궁 × 5노드 = 60 노드) ──
const STAR_NODES = {
  // ═══ 양자리 (♈ 공격 특화) ═══
  aries: [
    { id:'aries_1', name:'돌진', desc:'ATK +10', cost:30, stat:'atk', value:10, prereq:null, tier:1 },
    { id:'aries_2', name:'전사의 혼', desc:'크리티컬 데미지 +15%', cost:60, stat:'critDmg', value:0.15, prereq:'aries_1', tier:2 },
    { id:'aries_3', name:'양의 뿔', desc:'보스 데미지 +10%', cost:60, stat:'bossDmg', value:0.10, prereq:'aries_1', tier:2 },
    { id:'aries_4', name:'화염의 돌파', desc:'ATK +25, 화속성 +10%', cost:120, stat:'atk', value:25, bonus:{fireAtk:0.10}, prereq:'aries_2', tier:3 },
    { id:'aries_5', name:'양자리의 축복', desc:'공격 시 5% 확률 2배 타격', cost:250, stat:'doubleStrike', value:0.05, prereq:'aries_4', tier:4, ultimate:true },
  ],
  // ═══ 황소자리 (♉ 방어 특화) ═══
  taurus: [
    { id:'taurus_1', name:'단단한 가죽', desc:'DEF +12', cost:30, stat:'def', value:12, prereq:null, tier:1 },
    { id:'taurus_2', name:'대지의 인내', desc:'HP +100', cost:60, stat:'maxHp', value:100, prereq:'taurus_1', tier:2 },
    { id:'taurus_3', name:'반격의 의지', desc:'피격 시 10% 확률 반격', cost:60, stat:'counterChance', value:0.10, prereq:'taurus_1', tier:2 },
    { id:'taurus_4', name:'철벽의 뿔', desc:'DEF +30, 피해 감소 5%', cost:120, stat:'def', value:30, bonus:{dmgReduce:0.05}, prereq:'taurus_2', tier:3 },
    { id:'taurus_5', name:'황소자리의 축복', desc:'HP 20% 이하 시 10초간 무적 (300초 CD)', cost:250, stat:'lastStand', value:10, prereq:'taurus_4', tier:4, ultimate:true },
  ],
  // ═══ 쌍둥이자리 (♊ 속도/크�� 특화) ═══
  gemini: [
    { id:'gemini_1', name:'재빠른 발걸음', desc:'SPD +3', cost:30, stat:'spd', value:3, prereq:null, tier:1 },
    { id:'gemini_2', name:'분신의 그림자', desc:'회피 +5%', cost:60, stat:'evasion', value:5, prereq:'gemini_1', tier:2 },
    { id:'gemini_3', name:'쌍둥이의 행운', desc:'CRIT +5%', cost:60, stat:'crit', value:5, prereq:'gemini_1', tier:2 },
    { id:'gemini_4', name:'이중 존재', desc:'SPD +5, CRIT +5%', cost:120, stat:'spd', value:5, bonus:{crit:5}, prereq:'gemini_3', tier:3 },
    { id:'gemini_5', name:'쌍둥이자리의 축복', desc:'공격 시 20% 확률 분신이 동시 공격', cost:250, stat:'twinStrike', value:0.20, prereq:'gemini_4', tier:4, ultimate:true },
  ],
  // ═══ 게자리 (♋ HP/��존 특화) ═══
  cancer: [
    { id:'cancer_1', name:'딱딱한 껍질', desc:'HP +80', cost:30, stat:'maxHp', value:80, prereq:null, tier:1 },
    { id:'cancer_2', name:'재생력', desc:'HP 리젠 +2%/초', cost:60, stat:'hpRegen', value:0.02, prereq:'cancer_1', tier:2 },
    { id:'cancer_3', name:'보호막', desc:'전투 시작 시 HP 10% 보호막', cost:60, stat:'startShield', value:0.10, prereq:'cancer_1', tier:2 },
    { id:'cancer_4', name:'생명의 껍질', desc:'HP +200, 힐 ���율 +20%', cost:120, stat:'maxHp', value:200, bonus:{healBonus:0.20}, prereq:'cancer_2', tier:3 },
    { id:'cancer_5', name:'게자리의 축복', desc:'사망 시 1회 50% HP로 부활 (600초 CD)', cost:250, stat:'autoRevive', value:0.5, prereq:'cancer_4', tier:4, ultimate:true },
  ],
  // ═══ 사자자리 (♌ 화력 특화) ═══
  leo: [
    { id:'leo_1', name:'왕의 위엄', desc:'ATK +15', cost:30, stat:'atk', value:15, prereq:null, tier:1 },
    { id:'leo_2', name:'사자의 포효', desc:'주변 적 ATK -10% (��라)', cost:60, stat:'fearAura', value:0.10, prereq:'leo_1', tier:2 },
    { id:'leo_3', name:'맹수의 본능', desc:'CRIT +8%', cost:60, stat:'crit', value:8, prereq:'leo_1', tier:2 },
    { id:'leo_4', name:'불꽃 갈기', desc:'ATK +20, 공격 시 화상 ��여', cost:120, stat:'atk', value:20, bonus:{burnOnHit:true}, prereq:'leo_3', tier:3 },
    { id:'leo_5', name:'사자자리의 축복', desc:'킬 시 15초간 ATK +50%', cost:250, stat:'killFrenzy', value:0.50, prereq:'leo_4', tier:4, ultimate:true },
  ],
  // ═══ 처녀자리 (♍ 회피/유틸 특화) ═══
  virgo: [
    { id:'virgo_1', name:'우아한 ���놀림', desc:'회피 +4%', cost:30, stat:'evasion', value:4, prereq:null, tier:1 },
    { id:'virgo_2', name:'정화의 빛', desc:'디버프 지���시간 -30%', cost:60, stat:'debuffReduce', value:0.30, prereq:'virgo_1', tier:2 },
    { id:'virgo_3', name:'치유의 은혜', desc:'포션 효과 +25%', cost:60, stat:'potionBonus', value:0.25, prereq:'virgo_1', tier:2 },
    { id:'virgo_4', name:'순결한 오라', desc:'회피 +6%, 주변 아군 힐 +10%', cost:120, stat:'evasion', value:6, bonus:{allyHeal:0.10}, prereq:'virgo_2', tier:3 },
    { id:'virgo_5', name:'처녀자리의 축복', desc:'회피 성공 시 HP 3% 회복', cost:250, stat:'dodgeHeal', value:0.03, prereq:'virgo_4', tier:4, ultimate:true },
  ],
  // ═══ 천칭자리 (♎ 균형/만능 특화) ═══
  libra: [
    { id:'libra_1', name:'균형의 추', desc:'ATK +5, DEF +5', cost:30, stat:'atk', value:5, bonus:{def:5}, prereq:null, tier:1 },
    { id:'libra_2', name:'���정한 심판', desc:'CRIT +3%, 회피 +3%', cost:60, stat:'crit', value:3, bonus:{evasion:3}, prereq:'libra_1', tier:2 },
    { id:'libra_3', name:'교환의 법칙', desc:'EXP +8%, 골드 +8%', cost:60, stat:'expBonus', value:8, bonus:{goldBonus:8}, prereq:'libra_1', tier:2 },
    { id:'libra_4', name:'완벽한 균형', desc:'모든 스탯 +8', cost:120, stat:'allStats', value:8, prereq:'libra_2', tier:3 },
    { id:'libra_5', name:'천칭자리의 축복', desc:'HP 50% 이상이면 ATK +20%, 이하면 DEF +30%', cost:250, stat:'balance', value:1, prereq:'libra_4', tier:4, ultimate:true },
  ],
  // ═══ 전갈자리 (♏ 독/크리 특화) ═══
  scorpio: [
    { id:'scorpio_1', name:'전갈의 독', desc:'공격 시 독 데미지 +5', cost:30, stat:'poisonDmg', value:5, prereq:null, tier:1 },
    { id:'scorpio_2', name:'치명적 일격', desc:'CRIT +6%', cost:60, stat:'crit', value:6, prereq:'scorpio_1', tier:2 },
    { id:'scorpio_3', name:'맹독 강화', desc:'독 지속시간 +50%', cost:60, stat:'poisonDuration', value:0.50, prereq:'scorpio_1', tier:2 },
    { id:'scorpio_4', name:'죽음의 독침', desc:'CRIT +8%, 크리티컬 시 독 부여', cost:120, stat:'crit', value:8, bonus:{critPoison:true}, prereq:'scorpio_2', tier:3 },
    { id:'scorpio_5', name:'전갈자리의 축복', desc:'독 걸린 적에게 데미지 +30%', cost:250, stat:'poisonBonus', value:0.30, prereq:'scorpio_4', tier:4, ultimate:true },
  ],
  // ═══ 사수자리 (♐ EXP/성장 특화) ═══
  sagittarius: [
    { id:'sagittarius_1', name:'먼 여행', desc:'EXP +5%', cost:30, stat:'expBonus', value:5, prereq:null, tier:1 },
    { id:'sagittarius_2', name:'사냥꾼의 눈', desc:'드롭률 +10%', cost:60, stat:'dropRate', value:0.10, prereq:'sagittarius_1', tier:2 },
    { id:'sagittarius_3', name:'신속한 화살', desc:'공격 속도 +10%', cost:60, stat:'atkSpeed', value:0.10, prereq:'sagittarius_1', tier:2 },
    { id:'sagittarius_4', name:'탐험가의 직감', desc:'EXP +10%, 희귀 몬스터 발견 +5%', cost:120, stat:'expBonus', value:10, bonus:{rareSpawn:0.05}, prereq:'sagittarius_2', tier:3 },
    { id:'sagittarius_5', name:'사수자리의 축복', desc:'경험치 획득 시 10% 확률 2��', cost:250, stat:'doubleExp', value:0.10, prereq:'sagittarius_4', tier:4, ultimate:true },
  ],
  // ═══ 염소자리 (♑ 골드/교역 특화) ═══
  capricorn: [
    { id:'capricorn_1', name:'산양의 발걸음', desc:'골드 +8%', cost:30, stat:'goldBonus', value:8, prereq:null, tier:1 },
    { id:'capricorn_2', name:'황금 코', desc:'교역 이익 +10%', cost:60, stat:'tradeBonus', value:0.10, prereq:'capricorn_1', tier:2 },
    { id:'capricorn_3', name:'풍요의 뿔', desc:'골드 +12%', cost:60, stat:'goldBonus', value:12, prereq:'capricorn_1', tier:2 },
    { id:'capricorn_4', name:'마이다스의 손', desc:'골드 +15%, 상점 ��인 -10%', cost:120, stat:'goldBonus', value:15, bonus:{shopDiscount:0.10}, prereq:'capricorn_3', tier:3 },
    { id:'capricorn_5', name:'염소자리의 축복', desc:'몬스터 처치 시 5% 확률 골드 5배', cost:250, stat:'goldJackpot', value:0.05, prereq:'capricorn_4', tier:4, ultimate:true },
  ],
  // ═══ 물병자리 (♒ MP/마법 특화) ═══
  aquarius: [
    { id:'aquarius_1', name:'영혼의 샘', desc:'MP +30', cost:30, stat:'mp', value:30, prereq:null, tier:1 },
    { id:'aquarius_2', name:'마력 흐름', desc:'MP 리젠 +20%', cost:60, stat:'mpRegen', value:0.20, prereq:'aquarius_1', tier:2 },
    { id:'aquarius_3', name:'스킬 강화', desc:'스킬 데미지 +8%', cost:60, stat:'skillDmg', value:0.08, prereq:'aquarius_1', tier:2 },
    { id:'aquarius_4', name:'무한 마력', desc:'MP +60, 스킬 쿨다운 -10%', cost:120, stat:'mp', value:60, bonus:{cdReduce:0.10}, prereq:'aquarius_2', tier:3 },
    { id:'aquarius_5', name:'물병자리의 축복', desc:'스킬 시전 시 MP 소모 20% 확률 0', cost:250, stat:'freeCast', value:0.20, prereq:'aquarius_4', tier:4, ultimate:true },
  ],
  // ═══ 물고기자리 (♓ 회피/수속성 특화) ═══
  pisces: [
    { id:'pisces_1', name:'물살 타기', desc:'SPD +2, 회피 +3%', cost:30, stat:'spd', value:2, bonus:{evasion:3}, prereq:null, tier:1 },
    { id:'pisces_2', name:'물의 가호', desc:'수속성 데미지 +15%', cost:60, stat:'waterAtk', value:0.15, prereq:'pisces_1', tier:2 },
    { id:'pisces_3', name:'미끄러운 몸', desc:'회피 +6%', cost:60, stat:'evasion', value:6, prereq:'pisces_1', tier:2 },
    { id:'pisces_4', name:'심해의 비밀', desc:'회피 +5%, 수중 지역 ATK +20%', cost:120, stat:'evasion', value:5, bonus:{waterZoneAtk:0.20}, prereq:'pisces_3', tier:3 },
    { id:'pisces_5', name:'물고기자리의 축복', desc:'HP 30% 이하 시 10초간 회피 +40%', cost:250, stat:'desperateEvasion', value:0.40, prereq:'pisces_4', tier:4, ultimate:true },
  ],
};

// ── 별가루(Stardust) 획득량 ──
const STARDUST_SOURCES = {
  daily_observe: 15,
  kill_elite: 2,
  kill_boss: 8,
  kill_legendary: 20,
  pvp_win: 5,
  level_up: 25,
  dungeon_clear: 15,
  world_boss: 30,
};

// ── 별자리 완성 보너스 (궁별 5노드 모두 해금 시) ──
const CONSTELLATION_COMPLETE = {
  aries:       { name:'양자리 마스터', desc:'화속성 데미지 +20%', stat:'fireAtk', value:0.20 },
  taurus:      { name:'황소자리 마스터', desc:'최대 HP +500', stat:'maxHp', value:500 },
  gemini:      { name:'쌍둥이자리 마스터', desc:'SPD +8', stat:'spd', value:8 },
  cancer:      { name:'게자리 마스터', desc:'모든 힐 효율 +30%', stat:'healBonus', value:0.30 },
  leo:         { name:'사자자리 마스터', desc:'ATK +40', stat:'atk', value:40 },
  virgo:       { name:'처녀자리 마스터', desc:'회피 +12%', stat:'evasion', value:12 },
  libra:       { name:'천칭자리 마스터', desc:'모든 스탯 +15', stat:'allStats', value:15 },
  scorpio:     { name:'전갈자리 마스터', desc:'CRIT +15%', stat:'crit', value:15 },
  sagittarius: { name:'사수자리 마스터', desc:'EXP +20%', stat:'expBonus', value:20 },
  capricorn:   { name:'염소자리 마스터', desc:'골드 +30%', stat:'goldBonus', value:30 },
  aquarius:    { name:'물병자리 마스터', desc:'스킬 데미지 +15%', stat:'skillDmg', value:0.15 },
  pisces:      { name:'물고기자리 마스터', desc:'수속성 데미지 +25%', stat:'waterAtk', value:0.25 },
};

// ── 전체 완성 보너스 (12궁 모든 노드 해금) ──
const GRAND_MASTER_BONUS = {
  name: '별의 ���배자',
  desc: '모든 스탯 +30, ATK/DEF x1.1, HP +1000',
  bonuses: { allStats: 30, atkMulti: 0.10, defMulti: 0.10, maxHp: 1000 },
};

function _ensure(player) {
  if (!player.constellation) {
    player.constellation = {
      observed: {},
      collected: [],
      lastDay: null,
      activeBuff: null,
    };
  }
  // v2.40 확장 필드
  if (!player.constellation.stardust) player.constellation.stardust = 0;
  if (!player.constellation.unlockedNodes) player.constellation.unlockedNodes = {};
  if (!player.constellation.totalStardustEarned) player.constellation.totalStardustEarned = 0;
  return player.constellation;
}

function _today() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function _todayConstellation() {
  const d = new Date();
  const dayOfYear = Math.floor((d - new Date(Date.UTC(d.getUTCFullYear(),0,0))) / 86400000);
  return CONSTELLATIONS[dayOfYear % CONSTELLATIONS.length];
}

// ── 별가루 획득 ──
function earnStardust(player, source, amount) {
  const c = _ensure(player);
  const gain = amount || STARDUST_SOURCES[source] || 0;
  if (gain <= 0) return { earned: 0 };
  c.stardust += gain;
  c.totalStardustEarned += gain;
  return { earned: gain, total: c.stardust };
}

// ── 노드 해금 ──
function unlockNode(player, nodeId) {
  const c = _ensure(player);

  // 노드 찾기
  let targetNode = null;
  let zodiacId = null;
  for (const [zId, nodes] of Object.entries(STAR_NODES)) {
    const found = nodes.find(n => n.id === nodeId);
    if (found) { targetNode = found; zodiacId = zId; break; }
  }
  if (!targetNode) return { success: false, msg: '알 수 없는 노드' };
  if (c.unlockedNodes[nodeId]) return { success: false, msg: '이미 해금됨' };

  // 선행 조건
  if (targetNode.prereq && !c.unlockedNodes[targetNode.prereq]) {
    return { success: false, msg: '선행 노드를 먼저 해금하세요' };
  }

  // 별가루 확인
  if (c.stardust < targetNode.cost) {
    return { success: false, msg: `별가루 부족 (${targetNode.cost} 필요, 보유: ${c.stardust})` };
  }

  c.stardust -= targetNode.cost;
  c.unlockedNodes[nodeId] = Date.now();

  // 별자리 완성 체크
  const zodiacNodes = STAR_NODES[zodiacId];
  const allUnlocked = zodiacNodes.every(n => !!c.unlockedNodes[n.id]);
  const completeBonus = allUnlocked ? CONSTELLATION_COMPLETE[zodiacId] : null;

  // 그랜드 마스터 체크 (전체 60노드)
  let grandMaster = false;
  if (allUnlocked) {
    let totalUnlocked = 0;
    for (const nodes of Object.values(STAR_NODES)) {
      for (const n of nodes) {
        if (c.unlockedNodes[n.id]) totalUnlocked++;
      }
    }
    grandMaster = totalUnlocked >= 60;
    if (grandMaster && !c.grandMaster) c.grandMaster = Date.now();
  }

  return {
    success: true,
    node: targetNode,
    zodiacId,
    zodiacComplete: allUnlocked,
    completeBonus,
    grandMaster,
    msg: `✨ ${targetNode.name} 해금! — ${targetNode.desc}`,
  };
}

// ── 관측 (기존 + 별가루 보상) ──
function observe(player) {
  const c = _ensure(player);
  const today = _todayConstellation();
  const todayStr = _today();
  if (c.observed[today.id] === todayStr) {
    return { success: false, msg: '오늘 이미 관측함' };
  }
  c.observed[today.id] = todayStr;
  if (!c.collected.includes(today.id)) c.collected.push(today.id);
  c.activeBuff = {
    id: today.id, name: today.name, icon: today.icon,
    stat: today.stat, value: today.value,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };

  // 별가루 보상
  const stardustGain = earnStardust(player, 'daily_observe');

  const justCompleted = c.collected.length === CONSTELLATIONS.length && !c.zodiacMasterAwarded;
  if (justCompleted) c.zodiacMasterAwarded = Date.now();

  return {
    success: true,
    msg: `${today.icon} ${today.name} 관측! +${today.value} ${today.stat} (24h) | +${stardustGain.earned} 별가루`,
    buff: c.activeBuff,
    stardust: stardustGain,
    completed: justCompleted,
  };
}

// ── 모든 ���구 보너스 계산 ──
function getActiveBonuses(player) {
  const c = _ensure(player);
  const bonuses = {};

  // 1) 오늘의 관측 버프
  if (c.activeBuff && c.activeBuff.expiresAt > Date.now()) {
    bonuses[c.activeBuff.stat] = (bonuses[c.activeBuff.stat] || 0) + c.activeBuff.value;
  }

  // 2) 12궁 관측 마스터 보너스
  if (c.collected.length >= CONSTELLATIONS.length) {
    bonuses[ZODIAC_MASTER_BONUS.stat] = (bonuses[ZODIAC_MASTER_BONUS.stat] || 0) + ZODIAC_MASTER_BONUS.value;
  }

  // 3) 해금된 패시브 노드 보너스
  for (const [zId, nodes] of Object.entries(STAR_NODES)) {
    for (const node of nodes) {
      if (!c.unlockedNodes[node.id]) continue;
      bonuses[node.stat] = (bonuses[node.stat] || 0) + node.value;
      if (node.bonus) {
        for (const [bStat, bVal] of Object.entries(node.bonus)) {
          bonuses[bStat] = (bonuses[bStat] || 0) + bVal;
        }
      }
    }
  }

  // 4) 별자리 완성 보너스
  for (const [zId, nodes] of Object.entries(STAR_NODES)) {
    const allUnlocked = nodes.every(n => !!c.unlockedNodes[n.id]);
    if (allUnlocked && CONSTELLATION_COMPLETE[zId]) {
      const cb = CONSTELLATION_COMPLETE[zId];
      bonuses[cb.stat] = (bonuses[cb.stat] || 0) + cb.value;
    }
  }

  // 5) 그랜드 마스터 보너스
  if (c.grandMaster) {
    for (const [stat, val] of Object.entries(GRAND_MASTER_BONUS.bonuses)) {
      bonuses[stat] = (bonuses[stat] || 0) + val;
    }
  }

  return bonuses;
}

// ── 상태 조회 ──
function getStatus(player) {
  const c = _ensure(player);
  const today = _todayConstellation();
  const todayStr = _today();
  const observedToday = c.observed[today.id] === todayStr;

  // 궁별 진행도
  const zodiacStatus = {};
  for (const [zId, nodes] of Object.entries(STAR_NODES)) {
    const unlocked = nodes.filter(n => !!c.unlockedNodes[n.id]).length;
    zodiacStatus[zId] = {
      unlocked,
      total: nodes.length,
      complete: unlocked === nodes.length,
      nodes: nodes.map(n => ({
        ...n,
        unlocked: !!c.unlockedNodes[n.id],
        available: !c.unlockedNodes[n.id] && (!n.prereq || !!c.unlockedNodes[n.prereq]),
      })),
    };
    if (zodiacStatus[zId].complete && CONSTELLATION_COMPLETE[zId]) {
      zodiacStatus[zId].completeBonus = CONSTELLATION_COMPLETE[zId];
    }
  }

  // 전체 통계
  let totalUnlocked = 0;
  for (const zs of Object.values(zodiacStatus)) totalUnlocked += zs.unlocked;

  return {
    today, todayStr, observedToday,
    collected: c.collected,
    collectedCount: c.collected.length,
    totalCount: CONSTELLATIONS.length,
    activeBuff: c.activeBuff && c.activeBuff.expiresAt > Date.now() ? c.activeBuff : null,
    masterBonus: c.collected.length >= CONSTELLATIONS.length ? ZODIAC_MASTER_BONUS : null,
    stardust: c.stardust,
    totalStardustEarned: c.totalStardustEarned,
    zodiacStatus,
    totalNodesUnlocked: totalUnlocked,
    totalNodes: 60,
    grandMaster: !!c.grandMaster,
    grandMasterBonus: c.grandMaster ? GRAND_MASTER_BONUS : null,
    allConstellations: CONSTELLATIONS,
  };
}

module.exports = {
  CONSTELLATIONS, ZODIAC_MASTER_BONUS, STAR_NODES, CONSTELLATION_COMPLETE, GRAND_MASTER_BONUS, STARDUST_SOURCES,
  getStatus, observe, getActiveBonuses, earnStardust, unlockNode,
};

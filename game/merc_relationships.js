// 용병 관계 시스템 — v1.0
// 용병 간 우정/라이벌/인연/사제/원한 관계 추적
// 파티 편성 시 관계 보너스/패널티 자동 적용

// ═══ 관계 유형 정의 ═══
const RELATIONSHIP_TYPES = {
  friendship: {
    id: 'friendship', name: '우정', icon: '🤝', color: '#44cc44',
    maxLevel: 5,
    desc: '함께 싸우며 쌓은 신뢰',
    bonuses: { atkMult: 0.05 },           // 파티 동반 시 ATK +5%
  },
  rivalry: {
    id: 'rivalry', name: '라이벌', icon: '⚔️', color: '#ff8800',
    maxLevel: 5,
    desc: '서로를 인정하는 경쟁자',
    bonuses: { vsAtkMult: 0.08, pairedDefMult: -0.03 }, // 대결 ATK+8%, 동반 DEF-3%
  },
  romance: {
    id: 'romance', name: '인연', icon: '💕', color: '#ff44aa',
    maxLevel: 3,
    desc: '운명적 끈으로 묶인 두 용병',
    bonuses: { allStatMult: 0.10 },       // 동반 시 전스탯 +10%
  },
  mentor: {
    id: 'mentor', name: '사제', icon: '📖', color: '#4488ff',
    maxLevel: 5,
    desc: '스승과 제자의 유대',
    bonuses: { expBonus: 0.20 },          // 제자 EXP +20%
  },
  hatred: {
    id: 'hatred', name: '원한', icon: '💢', color: '#cc0000',
    maxLevel: 5,
    desc: '깊은 적대감',
    bonuses: { allStatMult: -0.05, disobeyChance: 0.05 }, // 전스탯 -5%, 명령 무시 5%
  },
};

// ═══ 관계 이벤트 메시지 템플릿 ═══
const RELATIONSHIP_EVENTS = {
  friendship: [
    { msg: (a, b) => `${a}와(과) ${b}가 함께 훈련하며 우정을 쌓았다!`, weight: 4 },
    { msg: (a, b) => `${a}가 위기에 빠진 ${b}를 구해주었다!`, weight: 3 },
    { msg: (a, b) => `${a}와(과) ${b}가 전투 후 서로의 건강을 걱정했다.`, weight: 3 },
    { msg: (a, b) => `${a}와(과) ${b}가 밤새 무용담을 나누었다.`, weight: 2 },
  ],
  rivalry: [
    { msg: (a, b) => `${a}가 ${b}에게 도전장을 내밀었다!`, weight: 4 },
    { msg: (a, b) => `${a}와(과) ${b}가 서로 누가 더 강한지 논쟁했다.`, weight: 3 },
    { msg: (a, b) => `${a}가 ${b}의 전과를 의식하며 더 열심히 싸웠다!`, weight: 3 },
  ],
  romance: [
    { msg: (a, b) => `${a}와(과) ${b} 사이에 묘한 인연의 끈이 느껴진다...`, weight: 2 },
    { msg: (a, b) => `${a}가 ${b}를 바라보는 눈빛이 달라졌다.`, weight: 1 },
    { msg: (a, b) => `${a}와(과) ${b}가 전장에서 서로를 지켜주었다.`, weight: 2 },
  ],
  mentor: [
    { msg: (a, b) => `${a}가 ${b}의 실수를 감싸주며 가르침을 줬다.`, weight: 4 },
    { msg: (a, b) => `${a}가 ${b}에게 전투 기술의 핵심을 전수했다!`, weight: 3 },
    { msg: (a, b) => `${b}가 ${a}의 가르침을 되새기며 성장했다.`, weight: 3 },
  ],
  hatred: [
    { msg: (a, b) => `${a}가 ${b}의 전리품을 가로챘다!`, weight: 3, personality: 'greedy' },
    { msg: (a, b) => `${a}와(과) ${b}가 심하게 말다툼을 벌였다!`, weight: 4 },
    { msg: (a, b) => `${a}가 ${b}를 의도적으로 무시했다.`, weight: 2 },
    { msg: (a, b) => `${a}가 ${b}의 작전을 방해했다!`, weight: 2, personality: 'selfish' },
  ],
};

// 성격별 관계 발생 가중치
const PERSONALITY_WEIGHTS = {
  brave:     { friendship: 3, rivalry: 2, romance: 1, mentor: 2, hatred: 0 },
  calm:      { friendship: 2, rivalry: 1, romance: 2, mentor: 3, hatred: 0 },
  greedy:    { friendship: 1, rivalry: 2, romance: 0, mentor: 0, hatred: 4 },
  loyal:     { friendship: 4, rivalry: 1, romance: 2, mentor: 2, hatred: 0 },
  selfish:   { friendship: 0, rivalry: 3, romance: 1, mentor: 0, hatred: 3 },
  kind:      { friendship: 4, rivalry: 0, romance: 3, mentor: 3, hatred: 0 },
  fierce:    { friendship: 1, rivalry: 4, romance: 1, mentor: 1, hatred: 2 },
  wise:      { friendship: 2, rivalry: 1, romance: 1, mentor: 5, hatred: 0 },
  default:   { friendship: 2, rivalry: 2, romance: 1, mentor: 2, hatred: 1 },
};

// ═══ 초기화 ═══
function initRelationships(player) {
  if (!player._mercRelationships) {
    player._mercRelationships = {};  // key: "uid1:uid2" (정렬된), value: { type, level, history[] }
  }
  return player._mercRelationships;
}

// 정렬된 키 생성
function _pairKey(uid1, uid2) {
  return uid1 < uid2 ? `${uid1}:${uid2}` : `${uid2}:${uid1}`;
}

// ═══ 관계 추가/업그레이드 ═══
function addRelationship(player, mercUid1, mercUid2, type) {
  if (mercUid1 === mercUid2) return null;
  if (!RELATIONSHIP_TYPES[type]) return null;

  const rels = initRelationships(player);
  const key = _pairKey(mercUid1, mercUid2);
  const typeDef = RELATIONSHIP_TYPES[type];

  if (rels[key]) {
    // 같은 유형이면 레벨 업
    if (rels[key].type === type) {
      if (rels[key].level < typeDef.maxLevel) {
        rels[key].level++;
        rels[key].updatedAt = Date.now();
        return { action: 'upgrade', key, type, level: rels[key].level };
      }
      return null; // 이미 최대
    }
    // 다른 유형이면 교체 (원한 → 우정 등 전환 가능)
    rels[key] = { type, level: 1, createdAt: Date.now(), updatedAt: Date.now(), history: rels[key].history || [] };
    rels[key].history.push({ from: rels[key].type, to: type, at: Date.now() });
    return { action: 'change', key, type, level: 1 };
  }

  // 신규 관계
  rels[key] = { type, level: 1, createdAt: Date.now(), updatedAt: Date.now(), history: [] };
  return { action: 'new', key, type, level: 1 };
}

// ═══ 관계 조회 ═══
function getRelationships(player, mercUid) {
  const rels = initRelationships(player);
  const results = [];

  for (const [key, rel] of Object.entries(rels)) {
    const [uid1, uid2] = key.split(':');
    if (uid1 === mercUid || uid2 === mercUid) {
      const partnerUid = uid1 === mercUid ? uid2 : uid1;
      results.push({
        partnerUid,
        type: rel.type,
        typeName: RELATIONSHIP_TYPES[rel.type]?.name || rel.type,
        typeIcon: RELATIONSHIP_TYPES[rel.type]?.icon || '?',
        level: rel.level,
        maxLevel: RELATIONSHIP_TYPES[rel.type]?.maxLevel || 5,
      });
    }
  }

  return results;
}

// ═══ 관계 이벤트 롤 ═══
function rollRelationshipEvent(player, mercUid1, mercUid2) {
  if (mercUid1 === mercUid2) return null;

  // 15% 확률로 이벤트 발생
  if (Math.random() > 0.15) return null;

  let mercSystem;
  try { mercSystem = require('./mercenary_system'); } catch (e) { return null; }

  const mercs = mercSystem.getPlayerMercs(player);
  const merc1 = mercs.roster.find(m => m.uid === mercUid1);
  const merc2 = mercs.roster.find(m => m.uid === mercUid2);
  if (!merc1 || !merc2) return null;

  // 성격 기반 가중치 결정
  const p1 = merc1.personality || 'default';
  const p2 = merc2.personality || 'default';
  const w1 = PERSONALITY_WEIGHTS[p1] || PERSONALITY_WEIGHTS.default;
  const w2 = PERSONALITY_WEIGHTS[p2] || PERSONALITY_WEIGHTS.default;

  // 합산 가중치로 관계 유형 결정
  const combined = {};
  for (const t of Object.keys(RELATIONSHIP_TYPES)) {
    combined[t] = (w1[t] || 0) + (w2[t] || 0);
  }

  // 사제 관계: 레벨 차이 5 이상일 때만
  const lvDiff = Math.abs((merc1.level || 1) - (merc2.level || 1));
  if (lvDiff < 5) combined.mentor = 0;
  else combined.mentor = Math.floor(combined.mentor * (1 + lvDiff * 0.1));

  // 인연 관계: 매우 낮은 확률 보정
  combined.romance = Math.floor(combined.romance * 0.3);

  // 가중치 기반 랜덤 선택
  const totalWeight = Object.values(combined).reduce((s, v) => s + v, 0);
  if (totalWeight <= 0) return null;

  let roll = Math.random() * totalWeight;
  let selectedType = null;
  for (const [t, w] of Object.entries(combined)) {
    roll -= w;
    if (roll <= 0) { selectedType = t; break; }
  }
  if (!selectedType) return null;

  // 관계 적용
  const result = addRelationship(player, mercUid1, mercUid2, selectedType);
  if (!result) return null;

  // 이벤트 메시지 선택
  const events = RELATIONSHIP_EVENTS[selectedType] || [];
  const validEvents = events.filter(e => !e.personality || e.personality === p1 || e.personality === p2);
  if (validEvents.length === 0) return null;

  const evtWeightTotal = validEvents.reduce((s, e) => s + (e.weight || 1), 0);
  let evtRoll = Math.random() * evtWeightTotal;
  let selectedEvt = validEvents[0];
  for (const evt of validEvents) {
    evtRoll -= (evt.weight || 1);
    if (evtRoll <= 0) { selectedEvt = evt; break; }
  }

  const name1 = `${merc1.icon} ${merc1.name}`;
  const name2 = `${merc2.icon} ${merc2.name}`;
  const msg = selectedEvt.msg(name1, name2);

  return {
    type: selectedType,
    typeName: RELATIONSHIP_TYPES[selectedType].name,
    typeIcon: RELATIONSHIP_TYPES[selectedType].icon,
    level: result.level,
    action: result.action,
    msg,
    merc1: { uid: mercUid1, name: merc1.name, icon: merc1.icon },
    merc2: { uid: mercUid2, name: merc2.name, icon: merc2.icon },
  };
}

// ═══ 파티 관계 보너스 계산 ═══
function getPartyRelationshipBonuses(player) {
  let mercSystem;
  try { mercSystem = require('./mercenary_system'); } catch (e) { return { bonuses: [], totalAtk: 0, totalDef: 0, totalHp: 0, totalSpd: 0, expBonus: 0, disobeyChance: 0 }; }

  const mercs = mercSystem.getPlayerMercs(player);
  const partyUids = mercs.party || [];
  const partyMercs = mercs.roster.filter(m => partyUids.includes(m.uid));
  const rels = initRelationships(player);

  const bonuses = [];
  let totalAtkMult = 0;
  let totalDefMult = 0;
  let totalAllMult = 0;
  let totalExpBonus = 0;
  let totalDisobey = 0;

  // 파티 내 모든 조합 검사
  for (let i = 0; i < partyMercs.length; i++) {
    for (let j = i + 1; j < partyMercs.length; j++) {
      const key = _pairKey(partyMercs[i].uid, partyMercs[j].uid);
      const rel = rels[key];
      if (!rel) continue;

      const typeDef = RELATIONSHIP_TYPES[rel.type];
      if (!typeDef) continue;

      const levelMult = 1 + (rel.level - 1) * 0.15; // 레벨당 15% 증가

      if (typeDef.bonuses.atkMult) {
        const val = typeDef.bonuses.atkMult * levelMult;
        totalAtkMult += val;
        bonuses.push({
          type: rel.type, icon: typeDef.icon,
          pair: [partyMercs[i].icon, partyMercs[j].icon],
          desc: `${typeDef.name} Lv${rel.level}: ATK +${(val * 100).toFixed(0)}%`,
        });
      }

      if (typeDef.bonuses.pairedDefMult) {
        const val = typeDef.bonuses.pairedDefMult * levelMult;
        totalDefMult += val;
        bonuses.push({
          type: rel.type, icon: typeDef.icon,
          pair: [partyMercs[i].icon, partyMercs[j].icon],
          desc: `${typeDef.name} Lv${rel.level}: DEF ${(val * 100).toFixed(0)}%`,
        });
      }

      if (typeDef.bonuses.allStatMult) {
        const val = typeDef.bonuses.allStatMult * levelMult;
        totalAllMult += val;
        bonuses.push({
          type: rel.type, icon: typeDef.icon,
          pair: [partyMercs[i].icon, partyMercs[j].icon],
          desc: `${typeDef.name} Lv${rel.level}: 전스탯 ${val > 0 ? '+' : ''}${(val * 100).toFixed(0)}%`,
        });
      }

      if (typeDef.bonuses.expBonus) {
        const val = typeDef.bonuses.expBonus * levelMult;
        totalExpBonus += val;
        // 사제: 낮은 레벨 용병에게 적용
        const lowMerc = (partyMercs[i].level || 1) < (partyMercs[j].level || 1) ? partyMercs[i] : partyMercs[j];
        bonuses.push({
          type: rel.type, icon: typeDef.icon,
          pair: [partyMercs[i].icon, partyMercs[j].icon],
          desc: `${typeDef.name} Lv${rel.level}: ${lowMerc.icon} EXP +${(val * 100).toFixed(0)}%`,
          targetUid: lowMerc.uid,
        });
      }

      if (typeDef.bonuses.disobeyChance) {
        const val = typeDef.bonuses.disobeyChance * rel.level;
        totalDisobey = Math.max(totalDisobey, val); // 최대값 사용
        bonuses.push({
          type: rel.type, icon: typeDef.icon,
          pair: [partyMercs[i].icon, partyMercs[j].icon],
          desc: `${typeDef.name} Lv${rel.level}: 명령 무시 ${(val * 100).toFixed(0)}%`,
        });
      }
    }
  }

  return {
    bonuses,
    totalAtk: totalAtkMult + totalAllMult,
    totalDef: totalDefMult + totalAllMult,
    totalHp: totalAllMult,
    totalSpd: totalAllMult,
    expBonus: totalExpBonus,
    disobeyChance: Math.min(totalDisobey, 0.25), // 최대 25% 캡
  };
}

// ═══ 소켓 핸들러 ═══
function registerRelationshipHandlers(io, socket, player, players) {
  // 전체 관계 조회
  socket.on('merc_relationships', () => {
    const rels = initRelationships(player);
    let mercSystem;
    try { mercSystem = require('./mercenary_system'); } catch (e) {}

    const mercs = mercSystem ? mercSystem.getPlayerMercs(player) : { roster: [] };
    const allRels = [];

    for (const [key, rel] of Object.entries(rels)) {
      const [uid1, uid2] = key.split(':');
      const m1 = mercs.roster.find(m => m.uid === uid1);
      const m2 = mercs.roster.find(m => m.uid === uid2);
      if (!m1 || !m2) continue;

      const typeDef = RELATIONSHIP_TYPES[rel.type];
      allRels.push({
        key,
        merc1: { uid: uid1, name: m1.name, icon: m1.icon },
        merc2: { uid: uid2, name: m2.name, icon: m2.icon },
        type: rel.type,
        typeName: typeDef?.name || rel.type,
        typeIcon: typeDef?.icon || '?',
        level: rel.level,
        maxLevel: typeDef?.maxLevel || 5,
      });
    }

    const partyBonuses = getPartyRelationshipBonuses(player);
    socket.emit('merc_relationships_result', { relationships: allRels, partyBonuses });
  });

  // 특정 용병 쌍 상세 조회
  socket.on('merc_relationship_detail', (data) => {
    if (!data || !data.uid1 || !data.uid2) {
      socket.emit('merc_relationship_detail_result', { success: false, msg: '용병 UID를 지정해주세요.' });
      return;
    }

    const rels = initRelationships(player);
    const key = _pairKey(data.uid1, data.uid2);
    const rel = rels[key];

    let mercSystem;
    try { mercSystem = require('./mercenary_system'); } catch (e) {}
    const mercs = mercSystem ? mercSystem.getPlayerMercs(player) : { roster: [] };
    const m1 = mercs.roster.find(m => m.uid === data.uid1);
    const m2 = mercs.roster.find(m => m.uid === data.uid2);

    if (!m1 || !m2) {
      socket.emit('merc_relationship_detail_result', { success: false, msg: '해당 용병을 찾을 수 없습니다.' });
      return;
    }

    if (!rel) {
      socket.emit('merc_relationship_detail_result', {
        success: true,
        merc1: { uid: data.uid1, name: m1.name, icon: m1.icon, level: m1.level },
        merc2: { uid: data.uid2, name: m2.name, icon: m2.icon, level: m2.level },
        relationship: null,
        msg: '아직 관계가 형성되지 않았습니다.',
      });
      return;
    }

    const typeDef = RELATIONSHIP_TYPES[rel.type];
    socket.emit('merc_relationship_detail_result', {
      success: true,
      merc1: { uid: data.uid1, name: m1.name, icon: m1.icon, level: m1.level },
      merc2: { uid: data.uid2, name: m2.name, icon: m2.icon, level: m2.level },
      relationship: {
        type: rel.type,
        typeName: typeDef?.name || rel.type,
        typeIcon: typeDef?.icon || '?',
        typeDesc: typeDef?.desc || '',
        level: rel.level,
        maxLevel: typeDef?.maxLevel || 5,
        bonuses: typeDef?.bonuses || {},
        history: rel.history || [],
        createdAt: rel.createdAt,
      },
    });
  });

  // 합동 훈련 (골드 소비로 관계 형성/강화)
  socket.on('merc_force_train', (data) => {
    if (!data || !data.uid1 || !data.uid2) {
      socket.emit('merc_force_train_result', { success: false, msg: '훈련할 용병 2명을 선택해주세요.' });
      return;
    }
    if (data.uid1 === data.uid2) {
      socket.emit('merc_force_train_result', { success: false, msg: '같은 용병끼리는 훈련할 수 없습니다.' });
      return;
    }

    const TRAIN_COST = 500;
    if ((player.gold || 0) < TRAIN_COST) {
      socket.emit('merc_force_train_result', { success: false, msg: `골드가 부족합니다. (필요: ${TRAIN_COST}G)` });
      return;
    }

    // 쿨다운 체크 (10분)
    const trainKey = _pairKey(data.uid1, data.uid2);
    if (!player._trainCooldowns) player._trainCooldowns = {};
    const lastTrain = player._trainCooldowns[trainKey] || 0;
    const cooldown = 600000; // 10분
    if (Date.now() - lastTrain < cooldown) {
      const remain = Math.ceil((cooldown - (Date.now() - lastTrain)) / 60000);
      socket.emit('merc_force_train_result', { success: false, msg: `훈련 쿨다운 중입니다. (${remain}분 남음)` });
      return;
    }

    // 골드 차감
    player.gold -= TRAIN_COST;
    player._trainCooldowns[trainKey] = Date.now();

    // 관계 이벤트 발생 (훈련 시 50% 확률로 강제 발동)
    const forcedRoll = Math.random() < 0.5;
    let event = null;

    if (forcedRoll) {
      // rollRelationshipEvent 내부 확률 무시하고 강제 실행
      const originalRandom = Math.random;
      // 확률을 1.0으로 만들어 반드시 발동
      event = (function() {
        // 간단히 직접 호출
        let mercSystem;
        try { mercSystem = require('./mercenary_system'); } catch (e) { return null; }

        const mercs = mercSystem.getPlayerMercs(player);
        const merc1 = mercs.roster.find(m => m.uid === data.uid1);
        const merc2 = mercs.roster.find(m => m.uid === data.uid2);
        if (!merc1 || !merc2) return null;

        const p1 = merc1.personality || 'default';
        const p2 = merc2.personality || 'default';
        const w1 = PERSONALITY_WEIGHTS[p1] || PERSONALITY_WEIGHTS.default;
        const w2 = PERSONALITY_WEIGHTS[p2] || PERSONALITY_WEIGHTS.default;

        const combined = {};
        for (const t of Object.keys(RELATIONSHIP_TYPES)) {
          combined[t] = (w1[t] || 0) + (w2[t] || 0);
        }
        // 훈련은 우정/사제 보너스
        combined.friendship = (combined.friendship || 0) + 3;
        combined.mentor = (combined.mentor || 0) + 2;
        // 원한은 훈련에서 약화
        combined.hatred = Math.max(0, (combined.hatred || 0) - 2);

        const lvDiff = Math.abs((merc1.level || 1) - (merc2.level || 1));
        if (lvDiff < 5) combined.mentor = 0;

        combined.romance = Math.floor((combined.romance || 0) * 0.3);

        const totalWeight = Object.values(combined).reduce((s, v) => s + v, 0);
        if (totalWeight <= 0) return null;

        let roll = Math.random() * totalWeight;
        let selectedType = null;
        for (const [t, w] of Object.entries(combined)) {
          roll -= w;
          if (roll <= 0) { selectedType = t; break; }
        }
        if (!selectedType) return null;

        const result = addRelationship(player, data.uid1, data.uid2, selectedType);
        if (!result) return null;

        const events = RELATIONSHIP_EVENTS[selectedType] || [];
        if (events.length === 0) return null;
        const selectedEvt = events[Math.floor(Math.random() * events.length)];
        const name1 = `${merc1.icon} ${merc1.name}`;
        const name2 = `${merc2.icon} ${merc2.name}`;

        return {
          type: selectedType,
          typeName: RELATIONSHIP_TYPES[selectedType].name,
          typeIcon: RELATIONSHIP_TYPES[selectedType].icon,
          level: result.level,
          action: result.action,
          msg: selectedEvt.msg(name1, name2),
        };
      })();
    }

    socket.emit('merc_force_train_result', {
      success: true,
      cost: TRAIN_COST,
      gold: player.gold,
      event,
      msg: event
        ? `합동 훈련 완료! (-${TRAIN_COST}G) ${event.typeIcon} ${event.msg}`
        : `합동 훈련 완료! (-${TRAIN_COST}G) 특별한 일은 없었다.`,
    });
  });
}

module.exports = {
  RELATIONSHIP_TYPES,
  RELATIONSHIP_EVENTS,
  initRelationships,
  addRelationship,
  getRelationships,
  rollRelationshipEvent,
  getPartyRelationshipBonuses,
  registerRelationshipHandlers,
};

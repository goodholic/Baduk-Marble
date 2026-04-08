// 가면 시스템 — v2.15
// 가면을 수집하고 하나를 착용 — 외형 + 페르소나 능력치
// 가면은 상점/드롭/제작 등 다양한 경로로 획득

const MASKS = {
  // 기본 (시작시 보유)
  blank: {
    name:'백지 가면', icon:'⬜', persona:'무',
    stats:{},
    rarity:'common',
    desc:'아무 표정도 없는 빈 가면',
    source:'default',
  },
  // 동물 시리즈 — 상점
  fox: {
    name:'여우 가면', icon:'🦊', persona:'교활',
    stats:{ crit:5, evasion:3 },
    rarity:'common',
    desc:'영리한 여우의 모습',
    source:'shop', price:1000,
  },
  wolf: {
    name:'늑대 가면', icon:'🐺', persona:'야수',
    stats:{ atk:8, evasion:2 },
    rarity:'common',
    desc:'무리의 본능을 일깨운다',
    source:'shop', price:1000,
  },
  bear: {
    name:'곰 가면', icon:'🐻', persona:'우직',
    stats:{ maxHp:60, def:8 },
    rarity:'common',
    desc:'산의 힘이 깃든다',
    source:'shop', price:1500,
  },
  owl: {
    name:'올빼미 가면', icon:'🦉', persona:'현자',
    stats:{ expBonus:15, mp:20 },
    rarity:'uncommon',
    desc:'밤의 지혜',
    source:'shop', price:2500,
  },
  // 신화/특수
  oni: {
    name:'오니 가면', icon:'👹', persona:'분노',
    stats:{ atk:15, def:-3 },
    rarity:'rare',
    desc:'억눌린 분노가 폭발한다',
    source:'craft',
  },
  noh: {
    name:'노 가면', icon:'😶', persona:'정적',
    stats:{ allStats:5 },
    rarity:'rare',
    desc:'표정 없는 우아함',
    source:'craft',
  },
  ghost: {
    name:'유령 가면', icon:'👻', persona:'영체',
    stats:{ evasion:10, maxHp:-30 },
    rarity:'rare',
    desc:'반쯤 다른 세상에 발을 디딘다',
    source:'event',
  },
  dragon: {
    name:'용 가면', icon:'🐲', persona:'제왕',
    stats:{ atk:12, def:8, crit:5, allStats:3 },
    rarity:'legendary',
    desc:'고대 용의 의지',
    source:'boss_drop',
  },
  // 감정
  joy:    { name:'기쁨의 가면',  icon:'😊', persona:'환희',  stats:{ goldBonus:15 }, rarity:'uncommon', source:'shop', price:3000 },
  sorrow: { name:'슬픔의 가면',  icon:'😢', persona:'고독',  stats:{ defBonus:10, mp:15 }, rarity:'uncommon', source:'shop', price:3000 },
};

function _ensure(player) {
  if (!player.mask) {
    player.mask = {
      collection: ['blank'],
      equipped: 'blank',
      personaUses: 0,
    };
  }
  return player.mask;
}

function getStatus(player) {
  const m = _ensure(player);
  const list = {};
  for (const [id, def] of Object.entries(MASKS)) {
    list[id] = { ...def, owned: m.collection.includes(id) };
  }
  return {
    collection: m.collection,
    equipped: m.equipped,
    equippedDetails: MASKS[m.equipped],
    masks: list,
    collectionCount: m.collection.length,
    totalCount: Object.keys(MASKS).length,
  };
}

function buyMask(player, maskId) {
  const m = _ensure(player);
  const def = MASKS[maskId];
  if (!def) return { success:false, msg:'존재하지 않는 가면' };
  if (m.collection.includes(maskId)) return { success:false, msg:'이미 보유 중' };
  if (def.source !== 'shop') return { success:false, msg:'상점에서 판매하지 않음' };
  if ((player.gold || 0) < def.price) return { success:false, msg:`골드 ${def.price} 부족` };
  player.gold -= def.price;
  m.collection.push(maskId);
  return { success:true, msg:`${def.icon} ${def.name} 구매!` };
}

function awardMask(player, maskId) {
  const m = _ensure(player);
  if (!MASKS[maskId]) return null;
  if (m.collection.includes(maskId)) return null;
  m.collection.push(maskId);
  return MASKS[maskId];
}

function equip(player, maskId) {
  const m = _ensure(player);
  if (!MASKS[maskId]) return { success:false, msg:'존재하지 않는 가면' };
  if (!m.collection.includes(maskId)) return { success:false, msg:'미보유 가면' };
  m.equipped = maskId;
  m.personaUses += 1;
  return {
    success:true,
    msg:`${MASKS[maskId].icon} ${MASKS[maskId].name} 착용 — "${MASKS[maskId].persona}"`,
    persona: MASKS[maskId].persona,
  };
}

function getActiveBonuses(player) {
  const m = _ensure(player);
  const def = MASKS[m.equipped];
  if (!def) return {};
  return def.stats || {};
}

module.exports = {
  MASKS,
  getStatus,
  buyMask,
  awardMask,
  equip,
  getActiveBonuses,
};

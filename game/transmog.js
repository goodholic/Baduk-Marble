// 트랜스모그(외형 변환) 시스템 — v1.58
// 무기/방어구 외형을 다른 스킨으로 덮어씀 (스탯은 그대로)
// 12종 유니크 스킨 — 업적/이벤트/구매로 해금

const TRANSMOG_SKINS = {
  // 무기 스킨
  flame_blade: {
    name: '화염의 검', icon: '🔥', slot: 'weapon', rarity: 'rare',
    color: '#ff4400', particle: 'flame',
    source: '불꽃산 보스 50처치',
  },
  ice_blade: {
    name: '빙결의 검', icon: '❄️', slot: 'weapon', rarity: 'rare',
    color: '#88ddff', particle: 'frost',
    source: '얼음 협곡 보스 처치',
  },
  void_blade: {
    name: '공허의 검', icon: '🌌', slot: 'weapon', rarity: 'epic',
    color: '#aa44ff', particle: 'void',
    source: '공허의 균열 클리어',
  },
  celestial_blade: {
    name: '천공의 검', icon: '⚡', slot: 'weapon', rarity: 'legendary',
    color: '#ffd700', particle: 'lightning',
    source: '천공의 수호자 레이드 MVP',
  },
  // 방어구 스킨
  golden_armor: {
    name: '황금 갑옷', icon: '✨', slot: 'armor', rarity: 'rare',
    color: '#ffd700', particle: 'sparkle',
    source: '왕의 성 점령',
  },
  shadow_cloak: {
    name: '그림자 망토', icon: '🌑', slot: 'cape', rarity: 'rare',
    color: '#222244', particle: 'shadow',
    source: '그림자 영역 100처치',
  },
  phoenix_robe: {
    name: '불사조 로브', icon: '🪶', slot: 'armor', rarity: 'epic',
    color: '#ff8800', particle: 'feather',
    source: '불멸의 피닉스 처치',
  },
  // 투구 스킨
  king_crown: {
    name: '왕의 왕관', icon: '👑', slot: 'helmet', rarity: 'legendary',
    color: '#ffd700', particle: 'aura',
    source: '주간 랭킹 1위',
  },
  demon_horns: {
    name: '악마의 뿔', icon: '😈', slot: 'helmet', rarity: 'epic',
    color: '#aa0000', particle: 'dark',
    source: '마왕성 클리어',
  },
  // 망토 스킨
  star_cape: {
    name: '별빛 망토', icon: '⭐', slot: 'cape', rarity: 'epic',
    color: '#ddddff', particle: 'starlight',
    source: '운명의 별 유물 획득',
  },
  // 신화 스킨
  primordial_aura: {
    name: '태초의 오라', icon: '🔮', slot: 'all', rarity: 'mythic',
    color: '#ff00ff', particle: 'cosmic',
    source: '태초의 구슬 + 모든 카테고리 1위',
  },
  // 시즌 한정
  season_glow: {
    name: '시즌 글로우', icon: '🌈', slot: 'all', rarity: 'epic',
    color: '#ff88dd', particle: 'rainbow',
    source: '시즌 패스 티어 3 보상',
  },
};

const TRANSMOG_CONFIG = {
  applyCostGold: 500, // 1회 적용 비용
  removeFree: true,    // 해제는 무료
};

function _ensure(player) {
  if (!player.transmog) player.transmog = { unlocked: [], applied: {} };
  // applied: { slot: skinId }
  return player.transmog;
}

function unlockSkin(player, skinId) {
  const skin = TRANSMOG_SKINS[skinId];
  if (!skin) return { success: false, msg: '존재하지 않는 스킨' };
  const t = _ensure(player);
  if (t.unlocked.includes(skinId)) return { success: false, msg: '이미 해금됨' };
  t.unlocked.push(skinId);
  return { success: true, skin };
}

function applySkin(player, skinId, slot = null) {
  const skin = TRANSMOG_SKINS[skinId];
  if (!skin) return { success: false, msg: '존재하지 않는 스킨' };
  const t = _ensure(player);
  if (!t.unlocked.includes(skinId)) return { success: false, msg: '해금되지 않은 스킨' };

  // 슬롯 검증
  const targetSlot = slot || skin.slot;
  if (skin.slot !== 'all' && skin.slot !== targetSlot) {
    return { success: false, msg: `이 스킨은 ${skin.slot} 슬롯 전용` };
  }

  if ((player.gold || 0) < TRANSMOG_CONFIG.applyCostGold) {
    return { success: false, msg: `골드 ${TRANSMOG_CONFIG.applyCostGold} 필요` };
  }

  player.gold -= TRANSMOG_CONFIG.applyCostGold;
  t.applied[targetSlot] = skinId;

  return { success: true, skinId, slot: targetSlot };
}

function removeSkin(player, slot) {
  const t = _ensure(player);
  if (!t.applied[slot]) return { success: false, msg: '해당 슬롯에 스킨 없음' };
  const removed = t.applied[slot];
  delete t.applied[slot];
  return { success: true, removed };
}

function getAppliedSkins(player) {
  const t = _ensure(player);
  const result = {};
  for (const [slot, skinId] of Object.entries(t.applied)) {
    const skin = TRANSMOG_SKINS[skinId];
    if (skin) {
      result[slot] = { id: skinId, ...skin };
    }
  }
  return result;
}

function getStatus(player) {
  const t = _ensure(player);
  return {
    unlocked: t.unlocked.map(id => ({ id, ...TRANSMOG_SKINS[id] })),
    applied: getAppliedSkins(player),
    available: Object.entries(TRANSMOG_SKINS).map(([id, skin]) => ({ id, ...skin, owned: t.unlocked.includes(id) })),
    applyCost: TRANSMOG_CONFIG.applyCostGold,
  };
}

module.exports = {
  TRANSMOG_SKINS,
  TRANSMOG_CONFIG,
  unlockSkin,
  applySkin,
  removeSkin,
  getAppliedSkins,
  getStatus,
};

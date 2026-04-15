// ============================================
// 카드 스킨 — 외형 변경 (프리미엄+업적 보상)
// ============================================

const SKIN_CATEGORIES = {
  frame: [
    { id: 'frame_gold', name: '황금 테두리', icon: '🟡', cost: { diamonds: 50 }, desc: '카드에 황금 테두리', rarity: 'rare' },
    { id: 'frame_fire', name: '화염 테두리', icon: '🔥', cost: { diamonds: 80 }, desc: '불타오르는 테두리', rarity: 'epic' },
    { id: 'frame_ice', name: '빙결 테두리', icon: '❄️', cost: { diamonds: 80 }, desc: '얼음 결정 테두리', rarity: 'epic' },
    { id: 'frame_rainbow', name: '무지개 테두리', icon: '🌈', cost: { diamonds: 150 }, desc: '7색 무지개!', rarity: 'legend' },
    { id: 'frame_void', name: '공허 테두리', icon: '🌀', cost: { diamonds: 200 }, desc: '차원의 균열', rarity: 'myth' },
    { id: 'frame_dragon', name: '드래곤 테두리', icon: '🐲', cost: { diamonds: 120 }, desc: '용의 비늘 테두리', rarity: 'legend' },
    { id: 'frame_celestial', name: '천상 테두리', icon: '👼', cost: { diamonds: 180 }, desc: '천사의 후광', rarity: 'legend' },
    { id: 'frame_chaos', name: '혼돈 테두리', icon: '🌀💜', cost: { diamonds: 300 }, desc: '차원의 혼돈', rarity: 'myth' },
  ],
  effect: [
    { id: 'eff_sparkle', name: '반짝임', icon: '✨', cost: { diamonds: 30 }, desc: '카드가 반짝반짝', rarity: 'common' },
    { id: 'eff_flame_aura', name: '화염 오라', icon: '🔥💨', cost: { diamonds: 60 }, desc: '불꽃 오라', rarity: 'rare' },
    { id: 'eff_lightning', name: '번개 효과', icon: '⚡', cost: { diamonds: 60 }, desc: '전류가 흐르는', rarity: 'rare' },
    { id: 'eff_holy_light', name: '성광', icon: '✨🌟', cost: { diamonds: 100 }, desc: '신성한 빛', rarity: 'epic' },
    { id: 'eff_galaxy', name: '은하', icon: '🌌', cost: { diamonds: 250 }, desc: '카드 속에 은하가!', rarity: 'myth' },
    { id: 'eff_shadow', name: '그림자 오라', icon: '🖤', cost: { diamonds: 70 }, desc: '어둠의 그림자', rarity: 'rare' },
    { id: 'eff_petal', name: '꽃잎 효과', icon: '🌸', cost: { diamonds: 50 }, desc: '꽃잎이 흩날림', rarity: 'rare' },
    { id: 'eff_thunder_strike', name: '낙뢰', icon: '🌩️', cost: { diamonds: 130 }, desc: '하늘에서 벼락이!', rarity: 'epic' },
  ],
  background: [
    { id: 'bg_forest', name: '숲 배경', icon: '🌲', cost: { gold: 5000 }, desc: '고요한 숲', rarity: 'common' },
    { id: 'bg_castle', name: '성 배경', icon: '🏰', cost: { gold: 10000 }, desc: '웅장한 성', rarity: 'rare' },
    { id: 'bg_volcano', name: '화산 배경', icon: '🌋', cost: { diamonds: 40 }, desc: '타오르는 화산', rarity: 'epic' },
    { id: 'bg_heaven', name: '천상 배경', icon: '☁️✨', cost: { diamonds: 80 }, desc: '구름 위의 세계', rarity: 'legend' },
    { id: 'bg_void', name: '공허 배경', icon: '🌀🌑', cost: { diamonds: 120 }, desc: '차원의 끝', rarity: 'myth' },
    { id: 'bg_ocean', name: '심해 배경', icon: '🌊', cost: { gold: 8000 }, desc: '깊은 바다 속', rarity: 'common' },
    { id: 'bg_desert', name: '사막 배경', icon: '🏜️', cost: { gold: 8000 }, desc: '끝없는 사막', rarity: 'common' },
    { id: 'bg_aurora', name: '오로라 배경', icon: '🌌✨', cost: { diamonds: 100 }, desc: '북극의 오로라', rarity: 'legend' },
  ],
  emote: [
    { id: 'emote_laugh', name: '웃음', icon: '😂', cost: { gold: 2000 }, desc: '킬 후 웃음', rarity: 'common' },
    { id: 'emote_taunt', name: '도발', icon: '😤', cost: { gold: 3000 }, desc: '적에게 도발', rarity: 'common' },
    { id: 'emote_dance', name: '춤', icon: '💃', cost: { gold: 5000 }, desc: '승리의 춤', rarity: 'rare' },
    { id: 'emote_cry', name: '눈물', icon: '😭', cost: { gold: 3000 }, desc: '패배의 눈물', rarity: 'common' },
    { id: 'emote_crown', name: '왕관 던지기', icon: '👑', cost: { diamonds: 50 }, desc: '킹 포즈', rarity: 'epic' },
    { id: 'emote_dragon', name: '드래곤 포효', icon: '🐲💨', cost: { diamonds: 100 }, desc: '용의 포효!', rarity: 'legend' },
  ],
  title_style: [
    { id: 'ts_gold', name: '금색 칭호', icon: '🟡', cost: { gold: 10000 }, desc: '칭호 금색 효과', rarity: 'rare' },
    { id: 'ts_rainbow', name: '무지개 칭호', icon: '🌈', cost: { diamonds: 60 }, desc: '칭호 무지개 효과', rarity: 'epic' },
    { id: 'ts_fire', name: '불타는 칭호', icon: '🔥', cost: { diamonds: 80 }, desc: '칭호에 불꽃!', rarity: 'epic' },
    { id: 'ts_glow', name: '빛나는 칭호', icon: '✨', cost: { diamonds: 120 }, desc: '칭호 후광 효과', rarity: 'legend' },
  ],
};

// 업적 스킨 (구매 불가, 달성으로만 획득)
const ACHIEVEMENT_SKINS = [
  { id: 'skin_champion', name: '챔피언 프레임', icon: '🏆', source: 'IO 10회 우승', frame: 'champion_gold' },
  { id: 'skin_tower100', name: '탑 정복자 프레임', icon: '🗼👑', source: '탑 100층 클리어', frame: 'tower_conqueror' },
  { id: 'skin_pvp_legend', name: 'PvP 전설 프레임', icon: '⚔️👑', source: 'PvP 전설 등급', frame: 'pvp_legend' },
  { id: 'skin_season_legend', name: '시즌 전설 프레임', icon: '🌟👑', source: '시즌 전설 달성', frame: 'season_legend' },
  { id: 'skin_awakened', name: '각성자 프레임', icon: '🌟⚔️', source: '카드 각성 1회', frame: 'awakened_glow' },
  { id: 'skin_pk_demon', name: '마왕 프레임', icon: '👿', source: 'PK 카르마 마왕 달성', frame: 'pk_demon' },
  { id: 'skin_trade_king', name: '무역왕 프레임', icon: '💰👑', source: '무역 명성 최고', frame: 'trade_king' },
  { id: 'skin_guild_leader', name: '길드장 프레임', icon: '🏛️👑', source: '길드 레벨 5', frame: 'guild_leader' },
  { id: 'skin_explorer', name: '탐험가 프레임', icon: '🧭', source: '원정 200회', frame: 'explorer' },
  { id: 'skin_farmer', name: '농장왕 프레임', icon: '🌾👑', source: '농장 100만G', frame: 'farmer_king' },
  { id: 'skin_boss_hunter', name: '보스 헌터 프레임', icon: '🐉⚔️', source: '보스 최고 기여 1회', frame: 'boss_hunter' },
  { id: 'skin_full_album', name: '도감 마스터 프레임', icon: '📖✨', source: '전 앨범 완성', frame: 'full_album' },
  { id: 'skin_combo_master', name: '콤보 마스터 프레임', icon: '🔗💥', source: '콤보 달성 50회', frame: 'combo_master' },
  { id: 'skin_transcend', name: '초월자 프레임', icon: '🌟🌟', source: '초월 3단계 달성', frame: 'transcend' },
  { id: 'skin_io_20kill', name: '학살자 프레임', icon: '💀🔥', source: 'IO 20킬 달성', frame: 'io_20kill' },
];

// ============================================
// 스킨 세트 — 매칭 보너스
// ============================================
const SKIN_SETS = [
  { name: '화염 세트🔥', skins: ['frame_fire', 'eff_flame_aura', 'bg_volcano'], bonus: { atk: 0.03 }, desc: '3종 화염: ATK+3%' },
  { name: '빙결 세트❄️', skins: ['frame_ice', 'eff_sparkle', 'bg_forest'], bonus: { def: 0.03 }, desc: '3종 빙결: DEF+3%' },
  { name: '공허 세트🌀', skins: ['frame_void', 'eff_galaxy', 'bg_void'], bonus: { all: 0.05 }, desc: '3종 공허: 전스탯+5%!' },
  { name: '천상 세트👼', skins: ['frame_celestial', 'eff_holy_light', 'bg_heaven'], bonus: { healPow: 0.1 }, desc: '3종 천상: 치유+10%' },
];

function checkSkinSetBonus(player) {
  const equipped = player.equippedSkins || {};
  const allEquipped = Object.values(equipped).filter(Boolean);
  const activeSets = [];

  for (const set of SKIN_SETS) {
    const hasAll = set.skins.every(s => allEquipped.includes(s));
    if (hasAll) activeSets.push(set);
  }

  // 보너스 합산
  const totalBonus = {};
  for (const set of activeSets) {
    for (const [stat, val] of Object.entries(set.bonus)) {
      totalBonus[stat] = (totalBonus[stat] || 0) + val;
    }
  }

  player.skinSetBonus = totalBonus;
  player.activeSkinSets = activeSets.map(s => s.name);
  return { activeSets: activeSets.map(s => ({ name: s.name, desc: s.desc, bonus: s.bonus })), totalBonus };
}

// ============================================
// 한정 스킨 가챠
// ============================================
const SKIN_GACHA_POOL = [
  { id: 'lskin_aurora', name: '오로라 프레임🌌', rarity: 'myth', weight: 1, desc: '한정판! 오로라 효과' },
  { id: 'lskin_phoenix', name: '불사조 오라🔥🐦', rarity: 'legend', weight: 3, desc: '한정판! 불사조 날개' },
  { id: 'lskin_cherry', name: '벚꽃 배경🌸', rarity: 'epic', weight: 8, desc: '한정판! 벚꽃 흩날림' },
  { id: 'lskin_star', name: '별빛 효과⭐', rarity: 'rare', weight: 15, desc: '한정판! 별이 빛남' },
  { id: 'lskin_basic', name: '기본 반짝임✨', rarity: 'common', weight: 30, desc: '기본 반짝이 효과' },
];

const GACHA_COST = 30; // diamonds
const GACHA_PITY = 20; // guaranteed legend+ at this count

function skinGacha(player) {
  if ((player.diamonds || 0) < GACHA_COST) return { ok: false, reason: '다이아 부족 (30 필요)' };

  player.diamonds -= GACHA_COST;
  player.skins = player.skins || [];
  player.gachaPity = (player.gachaPity || 0) + 1;

  // 보유하지 않은 스킨만 후보
  let pool = SKIN_GACHA_POOL.filter(s => !player.skins.includes(s.id));
  if (pool.length === 0) return { ok: false, reason: '모든 한정 스킨 보유 중', refund: (player.diamonds += GACHA_COST, true) };

  // 천장 (pity): legend 이상 보장
  if (player.gachaPity >= GACHA_PITY) {
    const highPool = pool.filter(s => s.rarity === 'legend' || s.rarity === 'myth');
    if (highPool.length > 0) pool = highPool;
    player.gachaPity = 0;
  }

  // 가중치 랜덤
  const totalWeight = pool.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * totalWeight;
  let picked = pool[pool.length - 1];
  for (const skin of pool) {
    roll -= skin.weight;
    if (roll <= 0) { picked = skin; break; }
  }

  player.skins.push(picked.id);
  if (picked.rarity === 'legend' || picked.rarity === 'myth') player.gachaPity = 0;

  return { ok: true, skin: picked, pity: player.gachaPity, msg: `${picked.name} 획득! (${picked.rarity})` };
}

// ============================================
// 프로필 커스터마이징
// ============================================
function setProfile(player, options) {
  player.equippedSkins = player.equippedSkins || {};
  player.skins = player.skins || [];

  const slots = ['frame', 'effect', 'background', 'emote', 'titleStyle'];
  for (const slot of slots) {
    if (options[slot] !== undefined) {
      if (options[slot] === null) {
        delete player.equippedSkins[slot];
      } else if (player.skins.includes(options[slot])) {
        player.equippedSkins[slot] = options[slot];
      } else {
        return { ok: false, reason: `${slot} 스킨 미보유: ${options[slot]}` };
      }
    }
  }

  // 프로필 메시지 (최대 50자)
  if (options.profileMessage !== undefined) {
    const msg = String(options.profileMessage || '').slice(0, 50);
    player.profileMessage = msg;
  }

  // 세트 보너스 재계산
  const setResult = checkSkinSetBonus(player);

  return { ok: true, msg: '프로필 업데이트 완료!', equippedSkins: player.equippedSkins, profileMessage: player.profileMessage, setBonus: setResult };
}

function getProfile(player) {
  const setResult = checkSkinSetBonus(player);
  return {
    equippedSkins: player.equippedSkins || {},
    profileMessage: player.profileMessage || '',
    ownedSkins: player.skins || [],
    activeSets: setResult.activeSets,
    totalBonus: setResult.totalBonus,
  };
}

// ============================================
// 구매 / 적용
// ============================================
function buySkin(player, skinId) {
  let skin = null;
  for (const cat of Object.values(SKIN_CATEGORIES)) {
    skin = cat.find(s => s.id === skinId);
    if (skin) break;
  }
  if (!skin) return { ok: false, reason: '알 수 없는 스킨' };

  player.skins = player.skins || [];
  if (player.skins.includes(skinId)) return { ok: false, reason: '이미 보유' };

  if (skin.cost.gold && (player.gold || 0) < skin.cost.gold) return { ok: false, reason: '골드 부족' };
  if (skin.cost.diamonds && (player.diamonds || 0) < skin.cost.diamonds) return { ok: false, reason: '다이아 부족' };

  if (skin.cost.gold) player.gold -= skin.cost.gold;
  if (skin.cost.diamonds) player.diamonds -= skin.cost.diamonds;

  player.skins.push(skinId);

  return { ok: true, msg: `${skin.icon} "${skin.name}" 구매 완료!` };
}

function applySkin(player, cardId, skinId) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };
  if (!(player.skins || []).includes(skinId)) return { ok: false, reason: '스킨 미보유' };
  card.skin = skinId;
  return { ok: true, msg: `스킨 적용!` };
}

// ============================================
// Socket 등록
// ============================================
function register(io, socket, player) {
  socket.on('skin_shop', () => {
    socket.emit('skin_shop', { categories: SKIN_CATEGORIES, achievements: ACHIEVEMENT_SKINS, owned: player.skins || [] });
  });
  socket.on('skin_buy', (data) => {
    const result = buySkin(player, data.skinId);
    socket.emit('skin_buy_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });
  socket.on('skin_apply', (data) => {
    const result = applySkin(player, data.cardId, data.skinId);
    socket.emit('skin_apply_result', result);
  });
  socket.on('skin_set_check', () => {
    const result = checkSkinSetBonus(player);
    socket.emit('skin_set_check_result', result);
  });
  socket.on('skin_gacha', () => {
    const result = skinGacha(player);
    socket.emit('skin_gacha_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });
  socket.on('profile_set', (data) => {
    const result = setProfile(player, data);
    socket.emit('profile_set_result', result);
  });
  socket.on('profile_get', () => {
    const result = getProfile(player);
    socket.emit('profile_get_result', result);
  });
}

module.exports = {
  SKIN_CATEGORIES, ACHIEVEMENT_SKINS, SKIN_SETS, SKIN_GACHA_POOL,
  buySkin, applySkin, checkSkinSetBonus, skinGacha, setProfile, getProfile,
  register,
};

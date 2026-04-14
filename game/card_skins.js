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
  ],
  effect: [
    { id: 'eff_sparkle', name: '반짝임', icon: '✨', cost: { diamonds: 30 }, desc: '카드가 반짝반짝', rarity: 'common' },
    { id: 'eff_flame_aura', name: '화염 오라', icon: '🔥💨', cost: { diamonds: 60 }, desc: '불꽃 오라', rarity: 'rare' },
    { id: 'eff_lightning', name: '번개 효과', icon: '⚡', cost: { diamonds: 60 }, desc: '전류가 흐르는', rarity: 'rare' },
    { id: 'eff_holy_light', name: '성광', icon: '✨🌟', cost: { diamonds: 100 }, desc: '신성한 빛', rarity: 'epic' },
    { id: 'eff_galaxy', name: '은하', icon: '🌌', cost: { diamonds: 250 }, desc: '카드 속에 은하가!', rarity: 'myth' },
  ],
  background: [
    { id: 'bg_forest', name: '숲 배경', icon: '🌲', cost: { gold: 5000 }, desc: '고요한 숲', rarity: 'common' },
    { id: 'bg_castle', name: '성 배경', icon: '🏰', cost: { gold: 10000 }, desc: '웅장한 성', rarity: 'rare' },
    { id: 'bg_volcano', name: '화산 배경', icon: '🌋', cost: { diamonds: 40 }, desc: '타오르는 화산', rarity: 'epic' },
    { id: 'bg_heaven', name: '천상 배경', icon: '☁️✨', cost: { diamonds: 80 }, desc: '구름 위의 세계', rarity: 'legend' },
    { id: 'bg_void', name: '공허 배경', icon: '🌀🌑', cost: { diamonds: 120 }, desc: '차원의 끝', rarity: 'myth' },
  ],
};

// 업적 스킨 (구매 불가, 달성으로만 획득)
const ACHIEVEMENT_SKINS = [
  { id: 'skin_champion', name: '챔피언 프레임', icon: '🏆', source: 'IO 10회 우승', frame: 'champion_gold' },
  { id: 'skin_tower100', name: '탑 정복자 프레임', icon: '🗼👑', source: '탑 100층 클리어', frame: 'tower_conqueror' },
  { id: 'skin_pvp_legend', name: 'PvP 전설 프레임', icon: '⚔️👑', source: 'PvP 전설 등급', frame: 'pvp_legend' },
  { id: 'skin_season_legend', name: '시즌 전설 프레임', icon: '🌟👑', source: '시즌 전설 달성', frame: 'season_legend' },
  { id: 'skin_awakened', name: '각성자 프레임', icon: '🌟⚔️', source: '카드 각성 1회', frame: 'awakened_glow' },
];

function buySkin(player, skinId) {
  let skin = null;
  for (const cat of Object.values(SKIN_CATEGORIES)) {
    skin = cat.find(s => s.id === skinId);
    if (skin) break;
  }
  if (!skin) return { ok: false, reason: '알 수 없는 스킨' };
  if (skin.cost.gold && (player.gold || 0) < skin.cost.gold) return { ok: false, reason: '골드 부족' };
  if (skin.cost.diamonds && (player.diamonds || 0) < skin.cost.diamonds) return { ok: false, reason: '다이아 부족' };

  if (skin.cost.gold) player.gold -= skin.cost.gold;
  if (skin.cost.diamonds) player.diamonds -= skin.cost.diamonds;

  player.skins = player.skins || [];
  if (player.skins.includes(skinId)) return { ok: false, reason: '이미 보유' };
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
}

module.exports = { SKIN_CATEGORIES, ACHIEVEMENT_SKINS, buySkin, applySkin, register };

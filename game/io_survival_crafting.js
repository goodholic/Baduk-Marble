// v6.7 — IO 서바이벌 크래프팅 모드
// 맵에서 재료 수집 → 무기/방어구/도구 제작 → 생존, 맨손 시작

const MAX_PLAYERS = 20;
const MATCH_DURATION = 600; // 10분
const START_EQUIPMENT = null; // 맨손 시작!

// 수집 가능 재료
const MATERIALS = [
  { id: 'wood', name: '나무', icon: '🪵', source: '나무 채집', commonIn: ['forest', 'village'], gather: 3 },
  { id: 'stone', name: '돌', icon: '🪨', source: '바위 채집', commonIn: ['mountain', 'cave'], gather: 4 },
  { id: 'iron', name: '철', icon: '⛏️', source: '광맥 채굴', commonIn: ['cave', 'mountain'], gather: 6 },
  { id: 'leather', name: '가죽', icon: '🧶', source: '야생 동물 처치', commonIn: ['forest', 'plains'], gather: 5 },
  { id: 'crystal', name: '마법 결정', icon: '💎', source: '마법 광맥/몬스터', commonIn: ['cave', 'ruins'], gather: 8, rarity: 'rare' },
  { id: 'bone', name: '뼈', icon: '🦴', source: '몬스터 처치', commonIn: ['ruins', 'cave'], gather: 4 },
  { id: 'herb', name: '약초', icon: '🌿', source: '풀밭 채집', commonIn: ['forest', 'plains'], gather: 2 },
  { id: 'fiber', name: '섬유', icon: '🧵', source: '식물 채집', commonIn: ['forest', 'plains'], gather: 2 },
];

// 제작 레시피 (현장 크래프팅)
const CRAFT_RECIPES = [
  // 무기
  { id: 'wooden_club', name: '나무 곤봉', icon: '🪵⚔️', materials: { wood: 3 }, stats: { atk: 20 }, tier: 1 },
  { id: 'stone_axe', name: '돌 도끼', icon: '🪨🪓', materials: { wood: 2, stone: 3 }, stats: { atk: 35 }, tier: 1 },
  { id: 'iron_sword', name: '철검', icon: '⛏️⚔️', materials: { iron: 5, wood: 2 }, stats: { atk: 60 }, tier: 2 },
  { id: 'crystal_blade', name: '결정 칼날', icon: '💎⚔️', materials: { crystal: 3, iron: 3 }, stats: { atk: 90, matk: 30 }, tier: 3 },
  { id: 'bone_scythe', name: '뼈 낫', icon: '🦴⚔️', materials: { bone: 8, iron: 2 }, stats: { atk: 75, lifeSteal: 0.1 }, tier: 2 },
  // 방어구
  { id: 'leather_armor', name: '가죽 갑옷', icon: '🧶🛡️', materials: { leather: 5 }, stats: { def: 20 }, tier: 1 },
  { id: 'iron_armor', name: '철 갑옷', icon: '⛏️🛡️', materials: { iron: 8, leather: 3 }, stats: { def: 50 }, tier: 2 },
  { id: 'crystal_armor', name: '결정 갑옷', icon: '💎🛡️', materials: { crystal: 5, iron: 5 }, stats: { def: 80, mdef: 30 }, tier: 3 },
  // 도구/소모품
  { id: 'bandage', name: '붕대', icon: '🩹', materials: { fiber: 3, herb: 2 }, stats: { heal: 100 }, consumable: true, tier: 1 },
  { id: 'potion', name: '포션', icon: '🧪', materials: { herb: 5, crystal: 1 }, stats: { heal: 300 }, consumable: true, tier: 2 },
  { id: 'trap', name: '덫', icon: '🪤', materials: { wood: 3, fiber: 3 }, stats: { trapDmg: 80 }, placeable: true, tier: 1 },
  { id: 'campfire', name: '모닥불', icon: '🔥🪵', materials: { wood: 5 }, stats: { hpRegen: 0.05, warmth: true }, placeable: true, tier: 1 },
  { id: 'shelter', name: '임시 거처', icon: '🏕️', materials: { wood: 10, leather: 5, fiber: 5 }, stats: { safeZone: true, hpRegen: 0.1 }, placeable: true, tier: 2 },
];

// 환경 위험
const ENVIRONMENTAL_HAZARDS = [
  { id: 'hunger', name: '배고픔', icon: '🍖❌', effect: '5분 후 ATK-20%, 8분 후 HP 감소 시작', counter: '음식 제작/사냥' },
  { id: 'cold', name: '추위', icon: '❄️🥶', effect: '밤에 HP 서서히 감소', counter: '모닥불/갑옷' },
  { id: 'monster_wave', name: '몬스터 웨이브', icon: '👹🌊', effect: '매 2분 몬스터 출현', counter: '전투/회피' },
  { id: 'storm', name: '폭풍', icon: '⛈️', effect: '3분에 한 번 폭풍 (시야↓+DMG)', counter: '거처 안에서 대피' },
  { id: 'pvp_zone', name: 'PvP 구역', icon: '⚔️🔴', effect: '특정 구역에서 PvP 가능', counter: '회피 or 전투' },
];

// 보상
const CRAFTING_REWARDS = {
  survivor:  { gold: 20000, exp: 2000, title: '크래프팅 서바이버' },
  most_craft:{ gold: 15000, title: '장인', desc: '가장 많이 제작' },
  first_kill:{ gold: 5000, desc: '첫 PvP 킬' },
  pacifist:  { gold: 25000, title: '평화주의자', desc: '0킬로 생존!', special: true },
};

function register(io, socket, player) {
  socket.on('crafting_survival_info', () => {
    socket.emit('crafting_survival_info', { materials: MATERIALS, recipes: CRAFT_RECIPES, hazards: ENVIRONMENTAL_HAZARDS, rewards: CRAFTING_REWARDS, duration: MATCH_DURATION });
  });
  socket.on('crafting_survival_join', () => {
    socket.emit('crafting_survival_join_result', { ok: true, startEquip: START_EQUIPMENT });
    io.emit('server_msg', `🪵⚔️ [크래프팅 서바이벌] ${player.name}이(가) 맨손으로 시작! 살아남아라!`);
  });
}

module.exports = { MATERIALS, CRAFT_RECIPES, ENVIRONMENTAL_HAZARDS, CRAFTING_REWARDS, register };

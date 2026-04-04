// ==========================================
// AutoBattle.io — 게임 설정 (거상+리니지+포켓몬+알비온)
// ==========================================

// 맵 500x500 (-250 ~ 250)
const ZONES = {
  // ── 마을 (안전지대) ──
  aden:       { name:'아덴 마을',     x:-250, y:-250, w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','대장장이','힐러','제작소'] },
  harbor:     { name:'항구 마을',     x:150,  y:-250, w:40, h:40, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','항해사','펫 상인'] },
  oasis:      { name:'오아시스 마을',  x:-50,  y:0,    w:35, h:35, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','제작소'] },
  // ── 초보 사냥터 (1~15) ──
  forest:     { name:'엘프숲',       x:-200, y:-180, w:60, h:50, lvl:[1,10],  safe:false, bg:'map_forest' },
  plains:     { name:'말하는 섬',     x:-130, y:-200, w:60, h:50, lvl:[3,12],  safe:false, bg:'map_plains' },
  meadow:     { name:'초원 지대',     x:-60,  y:-200, w:50, h:40, lvl:[5,15],  safe:false, bg:'map_plains' },
  // ── 중급 사냥터 (10~30) ──
  swamp:      { name:'독안개 늪',     x:30,   y:-200, w:50, h:50, lvl:[10,20], safe:false, bg:'map_forest' },
  desert:     { name:'사막 황야',     x:100,  y:-180, w:60, h:50, lvl:[12,22], safe:false, bg:'map_plains' },
  cave:       { name:'수정 동굴',     x:-200, y:-100, w:50, h:50, lvl:[15,25], safe:false, bg:'map_dungeon' },
  ruins:      { name:'고대 유적',     x:-130, y:-100, w:50, h:40, lvl:[18,28], safe:false, bg:'map_dungeon' },
  // ── 고급 사냥터 (25~50) ──
  volcano:    { name:'화산 지대',     x:80,   y:-100, w:60, h:50, lvl:[25,40], safe:false, bg:'map_dragon' },
  graveyard:  { name:'잊혀진 묘지',   x:-200, y:-30,  w:50, h:40, lvl:[28,38], safe:false, bg:'map_dungeon' },
  darkforest: { name:'어둠의 숲',     x:100,  y:-30,  w:50, h:50, lvl:[30,45], safe:false, bg:'map_forest' },
  // ── 최상급/보스 (35+) ──
  dragon:     { name:'드래곤 둥지',   x:150,  y:50,   w:50, h:50, lvl:[35,99], safe:false, bg:'map_dragon' },
  abyss:      { name:'심연',         x:-200, y:50,   w:60, h:50, lvl:[40,99], safe:false, bg:'map_chaos' },
  hell:       { name:'지옥문',       x:-100, y:100,  w:50, h:50, lvl:[45,99], safe:false, bg:'map_chaos' },
  // ── PK 존 ──
  chaos:      { name:'죽음의 협곡',   x:50,   y:100,  w:60, h:50, lvl:[20,99], safe:false, bg:'map_chaos', noPKpenalty:true },
  warzone:    { name:'전쟁터',       x:-50,  y:150,  w:70, h:50, lvl:[15,99], safe:false, bg:'map_chaos', noPKpenalty:true },
  // ── 특수 ──
  castle:     { name:'왕의 성',      x:0,    y:200,  w:60, h:50, lvl:[20,99], safe:false, bg:'map_dungeon', isCastle:true },
  arena:      { name:'콜로세움',     x:150,  y:150,  w:40, h:40, lvl:[10,99], safe:true,  bg:'map_dungeon', isArena:true },
};

// 클래스
const CLASSES = {
  Assassin:  { displayName:'어쌔신',    maxHp:120, atk:45, def:8,  speed:22, critRate:0.25, dodgeRate:0.15, aoe:false, projSpeed:45, projLife:80 },
  Warrior:   { displayName:'워리어',    maxHp:180, atk:30, def:15, speed:12, critRate:0.10, dodgeRate:0.05, aoe:false, projSpeed:18, projLife:1200 },
  Knight:    { displayName:'나이트',    maxHp:300, atk:15, def:30, speed:10, critRate:0.05, dodgeRate:0.02, aoe:false, projSpeed:14, projLife:800 },
  Mage:      { displayName:'메이지',    maxHp:90,  atk:10, def:5,  speed:9,  critRate:0.15, dodgeRate:0.10, aoe:true,  projSpeed:0,  projLife:2500 },
  GuardianTower: { displayName:'가디언 타워', maxHp:600, atk:35, def:25, speed:0, critRate:0.05, dodgeRate:0, aoe:false, projSpeed:22, projLife:800 },
};

// 몬스터 등급
const MONSTER_TIERS = {
  normal: { name:'슬라임',     hp:60,   atk:5,  def:2,  expReward:15,  goldReward:8,   spawnWeight:50 },
  elite:  { name:'오크 전사',   hp:200,  atk:15, def:8,  expReward:50,  goldReward:30,  spawnWeight:25 },
  rare:   { name:'다크 나이트', hp:500,  atk:30, def:15, expReward:120, goldReward:80,  spawnWeight:15 },
  boss:   { name:'드래곤',     hp:2000, atk:60, def:30, expReward:500, goldReward:300, spawnWeight:5 },
  legend: { name:'고대 용왕',   hp:5000, atk:100,def:50, expReward:1500,goldReward:1000,spawnWeight:2 },
};

// 교역품
const TRADE_GOODS = {
  goods_silk:    { name:'비단',     basePrice:100 },
  goods_iron:    { name:'철광석',    basePrice:50 },
  goods_herb:    { name:'약초',     basePrice:30 },
  goods_gem:     { name:'보석',     basePrice:200 },
  goods_wood:    { name:'목재',     basePrice:40 },
  goods_leather: { name:'가죽',     basePrice:60 },
  goods_spice:   { name:'향신료',    basePrice:150 },
  goods_potion:  { name:'물약 원료', basePrice:80 },
};

// 카르마
const KARMA = {
  PK_PENALTY: 100, DECAY_PER_MIN: 5, CHAOTIC_THRESHOLD: 200,
  DEATH_GOLD_LOSS: 0.50, DEATH_ITEM_LOSS: 0.30, BOUNTY_BONUS: 1.5,
};

// 전직
const CLASS_ADVANCE = {
  Assassin: { name:'ShadowLord', displayName:'쉐도우로드', bonusAtk:20, bonusCrit:0.1 },
  Warrior:  { name:'Warlord',    displayName:'워로드',     bonusAtk:15, bonusDef:15, bonusHp:100 },
  Knight:   { name:'HolyKnight', displayName:'홀리나이트', bonusDef:25, bonusHp:200 },
  Mage:     { name:'Archmage',   displayName:'아크메이지', bonusAtk:30, bonusCrit:0.15 },
};

// 스킬
const SKILLS = {
  Assassin: [
    { name:'그림자 일격', dmgMulti:3.0, cooldown:5, range:3, level:1 },
    { name:'연속 베기',   dmgMulti:1.5, cooldown:8, range:2, level:5, hits:4 },
    { name:'암살',       dmgMulti:8.0, cooldown:60, range:2, level:15 },
  ],
  Warrior: [
    { name:'파워 스트라이크', dmgMulti:2.5, cooldown:4, range:4, level:1 },
    { name:'회전 베기',     dmgMulti:2.0, cooldown:6, range:3, level:5, aoe:true },
    { name:'버서커',       dmgMulti:2.0, cooldown:90, level:15, buff:true },
  ],
  Knight: [
    { name:'방패 강타', dmgMulti:2.0, cooldown:6, range:3, level:1, stun:1 },
    { name:'도발',     cooldown:10, range:8, level:5, taunt:true },
    { name:'철벽 방어', cooldown:15, level:15, buff:true },
  ],
  Mage: [
    { name:'파이어볼',     dmgMulti:3.0, cooldown:3, range:6, level:1, aoe:true },
    { name:'아이스 볼트',   dmgMulti:2.0, cooldown:5, range:5, level:5 },
    { name:'메테오',       dmgMulti:10.0, cooldown:90, range:8, level:15, aoe:true },
  ],
};

// 테이밍 확률
const TAME_RATES = { normal:0.30, elite:0.15, rare:0.08, boss:0.03, legend:0.01 };
const TAME_COST = 50;

// 장비 슬롯
const EQUIPMENT_SLOTS = ['weapon','armor','helmet','gloves','boots','ring','necklace'];

const EQUIP_STATS = {
  equip_sword_1:  { slot:'weapon', name:'철제 검',   atk:10, def:0, grade:'normal' },
  equip_sword_2:  { slot:'weapon', name:'강철 검',   atk:25, def:0, grade:'uncommon' },
  equip_sword_3:  { slot:'weapon', name:'미스릴 검',  atk:45, def:0, grade:'rare' },
  equip_armor_1:  { slot:'armor',  name:'가죽 갑옷', atk:0, def:10, grade:'normal' },
  equip_armor_2:  { slot:'armor',  name:'철판 갑옷', atk:0, def:25, grade:'uncommon' },
  equip_armor_3:  { slot:'armor',  name:'미스릴 갑옷',atk:0, def:45, grade:'rare' },
  equip_ring_1:   { slot:'ring',   name:'힘의 반지', atk:8, def:3, grade:'uncommon' },
  equip_ring_2:   { slot:'ring',   name:'용의 반지', atk:20, def:10, grade:'rare' },
  equip_neck_1:   { slot:'necklace',name:'지혜의 목걸이',atk:5, def:5, grade:'uncommon' },
  equip_boots_1:  { slot:'boots',  name:'질풍 부츠', atk:0, def:5, grade:'uncommon' },
  equip_helmet_1: { slot:'helmet', name:'철투구',    atk:0, def:15, grade:'uncommon' },
};

module.exports = {
  ZONES, CLASSES, MONSTER_TIERS, TRADE_GOODS, KARMA, CLASS_ADVANCE,
  SKILLS, TAME_RATES, TAME_COST, EQUIPMENT_SLOTS, EQUIP_STATS,
  MAX_PLAYERS: 50, MAX_MONSTERS: 120,
  MAP_SIZE: 500, MAP_MIN: -250, MAP_MAX: 250,
};

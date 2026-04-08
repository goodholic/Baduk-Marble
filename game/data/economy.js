// 경제/사회 데이터 — v1.41 Phase 5 추출 (마스터 플랜 마지막)
// server.js → game/data/economy.js (함수 종속성 0)
// 포함: DIAMOND_PRODUCTS, NPCS, TRADE_GOODS, TAME_RATES, TAME_COSTS,
//       SHOP_ITEMS, FREE_DIAMOND_SOURCES, TRADEABLE_ITEMS,
//       CLAN_LEVEL_EXP, CLAN_MAX_MEMBERS, CLAN_SKILLS, EMOTES

const DIAMOND_PRODUCTS = {
    'diamond_100':  { diamonds: 100,  price: 1000,  name: '다이아 100개' },
    'diamond_500':  { diamonds: 500,  price: 4500,  name: '다이아 500개 (+10% 보너스)' },
    'diamond_1000': { diamonds: 1100, price: 9000,  name: '다이아 1100개 (+20% 보너스)' },
    'diamond_3000': { diamonds: 3500, price: 25000, name: '다이아 3500개 (+30% 보너스)' },
};

const NPCS = {
    '상점':    { type:'shop',    msgs:['어서오세요! 좋은 물건 많습니다!','오늘의 특가 상품이 있어요!','강한 전사에게는 좋은 장비가 필요하죠.'] },
    '대장장이': { type:'smith',   msgs:['장비를 강화해드리겠습니다.','좋은 재료를 가져오셨군요!','이 검은... 대단한 물건이에요!'] },
    '힐러':    { type:'healer',  msgs:['치료해드릴까요?','상처가 깊군요... 걱정 마세요.','모험은 쉬운 게 아니지요.'] },
    '낚시꾼':  { type:'fisher',  msgs:['오늘 낚시 하기 좋은 날이에요!','큰 물고기가 물 것 같은 예감이...','인내심이 있어야 대어를 낚지요.'] },
    '요리사':  { type:'cook',    msgs:['재료를 가져오시면 요리를 만들어드립니다.','이 레시피는 비밀이에요...','맛있는 음식은 전투력의 원천이죠!'] },
    '항해사':  { type:'travel',  msgs:['어디로 떠나시겠습니까?','바다 건너에 새로운 세계가 기다리고 있어요.','안전한 항해를 보장합니다!'] },
    '펫 상인': { type:'shop',    msgs:['귀여운 친구를 찾고 계신가요?','이 펫은 전투에 큰 도움이 됩니다!'] },
    '제작소':  { type:'cook',    msgs:['무엇을 제작하시겠습니까?','좋은 재료로 좋은 장비를 만들지요.'] },
    // ── v1.16 신규 NPC ──
    '점쟁이':  { type:'fortune', msgs:['오늘의 운세를 봐드릴까요?','별의 흐름이 좋군요...','당신에게 큰 행운이 다가오고 있어요!','조심하세요. 어두운 그림자가 보입니다.'] },
    '감정사':  { type:'appraise',msgs:['미감정 장비를 가져오셨군요?','이건... 대단한 물건이에요!','감정에는 약간의 비용이 듭니다.','겉보기와 다른 보물일지도 모릅니다.'] },
    '수집가':  { type:'collect', msgs:['희귀한 아이템을 찾고 있어요!','그 물건... 비싸게 사드릴 수 있어요.','컬렉션을 완성해야 합니다!','오래된 보물에 관심이 있어요.'] },
};

const TRADE_GOODS = {
    'goods_silk':      { name:'비단',      basePrice: 100 },
    'goods_iron':      { name:'철광석',     basePrice: 50 },
    'goods_herb':      { name:'약초',      basePrice: 30 },
    'goods_gem':       { name:'보석',      basePrice: 200 },
    'goods_wood':      { name:'목재',      basePrice: 40 },
    'goods_leather':   { name:'가죽',      basePrice: 60 },
    'goods_spice':     { name:'향신료',     basePrice: 150 },
    'goods_potion':    { name:'물약 원료',  basePrice: 80 },
    'goods_pearl':     { name:'진주',      basePrice: 300 },
    'goods_crystal':   { name:'마법 수정',  basePrice: 250 },
    'goods_wine':      { name:'고급 와인',  basePrice: 180 },
    'goods_fur':       { name:'고급 모피',  basePrice: 120 },
    'goods_incense':   { name:'향',        basePrice: 90 },
    'goods_dye':       { name:'염료',      basePrice: 70 },
    'goods_salt':      { name:'소금',      basePrice: 35 },
    'goods_fish':      { name:'건어물',     basePrice: 55 },
    'goods_gold_bar':  { name:'금괴',      basePrice: 500 },
    'goods_dragon_eye':{ name:'용의 눈',   basePrice: 800 },
    'goods_star_dust': { name:'별의 가루',  basePrice: 400 },
    'goods_moonstone': { name:'월석',      basePrice: 350 },
    // ── v1.13 신규 교역품 (이국의 사치품) ──
    'goods_phoenix_feather': { name:'불사조 깃털', basePrice: 600 },
    'goods_void_essence':    { name:'공허의 정수', basePrice: 750 },
    'goods_celestial_silk':  { name:'천공의 비단', basePrice: 900 },
};

const TAME_RATES = { normal:0.30, elite:0.15, rare:0.08, boss:0.03 };
const TAME_COSTS = { normal: 50, elite: 150, rare: 300, boss: 500, legendary: 1000, mythic: 2000 };

const SHOP_ITEMS = {
    // 소모품
    'exp_boost':     { name:'경험치 2배 부스터', price:50,  currency:'diamond', effect:'exp_boost', value:2, duration:300, desc:'5분간 EXP 2배' },
    'gold_boost':    { name:'골드 2배 부스터',   price:50,  currency:'diamond', effect:'gold_boost', value:2, duration:300, desc:'5분간 골드 2배' },
    'hp_potion_big': { name:'상급 HP 물약 x10',  price:30,  currency:'diamond', effect:'hp_potion', value:800, count:10, desc:'HP 800 즉시 회복' },
    'revive_scroll': { name:'부활 주문서 x3',    price:80,  currency:'diamond', effect:'revive', count:3, desc:'현재 위치에서 즉시 부활' },
    'protect_scroll':{ name:'강화 보호 주문서',  price:100, currency:'diamond', effect:'protect', count:1, desc:'강화 실패 시 파괴 방지' },
    // 편의
    'inventory_expand':{ name:'용병 슬롯 +5',   price:200, currency:'diamond', effect:'army_expand', value:5, desc:'최대 용병 수 +5 (영구)' },
    'auto_loot_range': { name:'루팅 범위 확대',  price:150, currency:'diamond', effect:'loot_range', value:2, duration:3600, desc:'1시간 루팅 범위 2배' },
    // 코스메틱
    'skin_golden':   { name:'황금 오라 스킨',    price:300, currency:'diamond', effect:'skin', value:'golden', desc:'캐릭터 황금빛 이펙트 (영구)' },
    'skin_shadow':   { name:'그림자 스킨',       price:300, currency:'diamond', effect:'skin', value:'shadow', desc:'캐릭터 어둠 이펙트 (영구)' },
    'skin_flame':    { name:'화염 스킨',         price:500, currency:'diamond', effect:'skin', value:'flame', desc:'캐릭터 불꽃 이펙트 (영구)' },
    // 골드로 구매
    'hp_potion_s':   { name:'하급 HP 물약 x10',  price:100, currency:'gold', effect:'hp_potion', value:100, count:10, desc:'HP 100 즉시 회복' },
    'hp_potion_m':   { name:'중급 HP 물약 x10',  price:300, currency:'gold', effect:'hp_potion', value:300, count:10, desc:'HP 300 즉시 회복' },
    'atk_boost':     { name:'공격 부스터',       price:500, currency:'gold', effect:'atk_boost', value:1.3, duration:60, desc:'1분간 ATK 30% 증가' },
    'def_boost':     { name:'방어 부스터',       price:500, currency:'gold', effect:'def_boost', value:1.3, duration:60, desc:'1분간 DEF 30% 증가' },
    'town_scroll':   { name:'귀환 주문서',       price:200, currency:'gold', effect:'teleport', value:'village', desc:'마을로 즉시 귀환' },
    // ── NPC 장비 상점 (골드) ──
    'shop_sword_1':  { name:'철제 검',          price:200,  currency:'gold', effect:'equip_item', value:'equip_sword_1', desc:'ATK +10 (일반)' },
    'shop_sword_2':  { name:'강철 검',          price:800,  currency:'gold', effect:'equip_item', value:'equip_sword_2', desc:'ATK +25 (고급)' },
    'shop_armor_1':  { name:'가죽 갑옷',        price:150,  currency:'gold', effect:'equip_item', value:'equip_armor_1', desc:'DEF +10 (일반)' },
    'shop_armor_2':  { name:'철판 갑옷',        price:700,  currency:'gold', effect:'equip_item', value:'equip_armor_2', desc:'DEF +25 (고급)' },
    'shop_helm_1':   { name:'가죽 투구',        price:100,  currency:'gold', effect:'equip_item', value:'equip_helm_1', desc:'DEF +5 (일반)' },
    'shop_glove_1':  { name:'가죽 장갑',        price:80,   currency:'gold', effect:'equip_item', value:'equip_glove_1', desc:'ATK+3 DEF+2 (일반)' },
    'shop_boots_1':  { name:'가죽 장화',        price:80,   currency:'gold', effect:'equip_item', value:'equip_boots_1', desc:'DEF+3 SPD+2 (일반)' },
    'shop_ring_1':   { name:'힘의 반지',        price:500,  currency:'gold', effect:'equip_item', value:'equip_ring_1', desc:'ATK+8 DEF+3 (고급)' },
    'shop_neck_1':   { name:'지혜의 목걸이',     price:400,  currency:'gold', effect:'equip_item', value:'equip_neck_1', desc:'ATK+5 DEF+5 EXP+5%' },
    // ── 희귀 장비 (다이아) ──
    'shop_sword_3':  { name:'미스릴 검',        price:300,  currency:'diamond', effect:'equip_item', value:'equip_sword_3', desc:'ATK +45 (희귀)' },
    'shop_armor_3':  { name:'미스릴 갑옷',      price:250,  currency:'diamond', effect:'equip_item', value:'equip_armor_3', desc:'DEF +45 (희귀)' },
    // ── 신규 코스메틱 (다이아) ──
    'skin_aurora':   { name:'오로라 스킨',       price:600, currency:'diamond', effect:'skin', value:'aurora', desc:'무지개 빛 오라 (영구)' },
    'skin_void':     { name:'공허 스킨',         price:800, currency:'diamond', effect:'skin', value:'void', desc:'어둠의 균열 이펙트 (영구)' },
    'skin_celestial':{ name:'천상 스킨',         price:1000,currency:'diamond', effect:'skin', value:'celestial', desc:'별빛 후광 (영구)' },
    // ── 신규 부스터 ──
    'mega_exp':      { name:'메가 EXP 부스터',   price:120, currency:'diamond', effect:'exp_boost', value:3, duration:600, desc:'10분간 EXP 3배' },
    'mega_gold':     { name:'메가 골드 부스터',  price:120, currency:'diamond', effect:'gold_boost', value:3, duration:600, desc:'10분간 골드 3배' },
    'all_in_one':    { name:'올인원 부스터',     price:250, currency:'diamond', effect:'exp_boost', value:2, duration:1800, desc:'30분간 EXP/골드 2배' },
    // ── 신규 편의 ──
    'rare_box_buy':  { name:'희귀 상자',         price:80,  currency:'diamond', effect:'rare_box_grant', desc:'전설/영웅 장비 가능 상자' },
    'mat_dragon_5':  { name:'드래곤 비늘 x5',    price:200, currency:'diamond', effect:'mat_grant', value:'mat_dragon', count:5, desc:'전설 제작 재료' },
    'mat_soul_10':   { name:'영혼석 x10',        price:150, currency:'diamond', effect:'mat_grant', value:'mat_soul', count:10, desc:'전설 제작 재료' },
    // ── 신규 골드 아이템 ──
    'mp_potion':     { name:'MP 물약 x10',       price:200, currency:'gold', effect:'mp_potion', value:50, count:10, desc:'MP 50 회복 (스킬 충전)' },
    'speed_scroll':  { name:'질주 주문서',       price:400, currency:'gold', effect:'speed_boost', value:1.5, duration:120, desc:'2분간 이동속도 50% 증가' },
    // ── 인벤토리 보관용 물약 (자동물약 시스템용) ──
    'pot_s_pack':    { name:'하급 HP 물약 x10 (자동용)', price:150, currency:'gold', effect:'mat_grant', value:'pot_hp_s', count:10, desc:'인벤토리에 보관, 자동물약 작동' },
    'pot_m_pack':    { name:'중급 HP 물약 x10 (자동용)', price:500, currency:'gold', effect:'mat_grant', value:'pot_hp_m', count:10, desc:'인벤토리에 보관, 자동물약 작동' },
    'pot_l_pack':    { name:'상급 HP 물약 x10 (자동용)', price:30,  currency:'diamond', effect:'mat_grant', value:'pot_hp_l', count:10, desc:'인벤토리에 보관, 자동물약 작동' },
    // ── v1.18 신규 프리미엄 아이템 ──
    'skin_phoenix':       { name:'불사조 스킨',          price:1200, currency:'diamond', effect:'skin', value:'phoenix', desc:'불사조 깃털 이펙트 (영구) — v1.18' },
    'skin_storm':         { name:'폭풍 스킨',            price:1200, currency:'diamond', effect:'skin', value:'storm', desc:'번개 오라 이펙트 (영구) — v1.18' },
    'auto_potion_premium':{ name:'프리미엄 자동물약',    price:500,  currency:'diamond', effect:'auto_potion_premium', duration:86400, desc:'24시간 자동물약 무한 사용 — v1.18' },
    'rare_box_premium':   { name:'프리미엄 보물 상자',   price:300,  currency:'diamond', effect:'premium_box', desc:'전설 장비 확정 + 다이아 보너스 — v1.18' },
    'mat_pack_legendary': { name:'전설 재료 패키지',     price:600,  currency:'diamond', effect:'mat_pack', desc:'용재료 x10 + 영혼석 x20 + 마법재료 x20 — v1.18' },
};

const FREE_DIAMOND_SOURCES = {
    daily_login: 10,        // 매일 접속: 10 다이아
    first_boss_kill: 50,    // 첫 보스 처치: 50 다이아
    level_10: 30,           // Lv.10 달성: 30 다이아
    level_20: 50,           // Lv.20 달성: 50 다이아
    level_30: 100,          // Lv.30 달성: 100 다이아
    pvp_10_wins: 30,        // PvP 10승: 30 다이아
    pvp_100_wins: 100,      // PvP 100승: 100 다이아
    weekly_quest: 50,       // 주간 퀘스트 완료: 50 다이아
    // ── v1.19 신규 마일스톤 ──
    level_40: 150,          // Lv.40 달성 (각성기 해금): 150 다이아
    level_50: 250,          // Lv.50 달성 (환생 가능): 250 다이아
    first_prestige: 500,    // 첫 환생: 500 다이아
    worldboss_first: 100,   // 첫 월드 보스 처치: 100 다이아
    achievement_50: 200,    // 업적 50개 달성: 200 다이아
};

const TRADEABLE_ITEMS = {
    'mat_iron':       { name:'철광석',       category:'재료', basePrice: 5 },
    'mat_magic':      { name:'마법 결정',    category:'재료', basePrice: 15 },
    'mat_soul':       { name:'영혼석',       category:'재료', basePrice: 50 },
    'mat_dragon':     { name:'드래곤 비늘',  category:'재료', basePrice: 500 },
    'pot_hp_s':       { name:'하급 HP 물약', category:'물약', basePrice: 10 },
    'pot_hp_m':       { name:'중급 HP 물약', category:'물약', basePrice: 30 },
    'pot_hp_l':       { name:'상급 HP 물약', category:'물약', basePrice: 80 },
    'pot_atk':        { name:'공격 부스터',  category:'물약', basePrice: 100 },
    'pot_def':        { name:'방어 부스터',  category:'물약', basePrice: 100 },
    'scroll_return':  { name:'귀환 주문서',  category:'주문서', basePrice: 50 },
    'scroll_revive':  { name:'부활 주문서',  category:'주문서', basePrice: 300 },
    'scroll_protect': { name:'강화 보호',    category:'주문서', basePrice: 500 },
    'protect_scroll': { name:'보호 주문서',    category:'주문서', basePrice: 500 },
    'bless_scroll':   { name:'축복 주문서',   category:'주문서', basePrice: 200 },
    // 장비 - 무기
    'equip_sword_1':  { name:'철제 검',      category:'장비', basePrice: 200 },
    'equip_sword_2':  { name:'강철 검',      category:'장비', basePrice: 800 },
    'equip_sword_3':  { name:'미스릴 검',    category:'장비', basePrice: 3000 },
    'equip_sword_4':  { name:'영웅의 검',    category:'장비', basePrice: 10000 },
    'equip_sword_5':  { name:'드래곤 소드',  category:'장비', basePrice: 50000 },
    // 장비 - 방어구
    'equip_armor_1':  { name:'가죽 갑옷',    category:'장비', basePrice: 150 },
    'equip_armor_2':  { name:'철판 갑옷',    category:'장비', basePrice: 700 },
    'equip_armor_3':  { name:'미스릴 갑옷',  category:'장비', basePrice: 2500 },
    'equip_armor_4':  { name:'영웅의 갑옷',  category:'장비', basePrice: 9000 },
    'equip_armor_5':  { name:'드래곤 아머',  category:'장비', basePrice: 45000 },
    // 장비 - 투구/장갑/신발
    'equip_helm_1':   { name:'가죽 투구',    category:'장비', basePrice: 100 },
    'equip_helm_2':   { name:'철제 투구',    category:'장비', basePrice: 400 },
    'equip_helm_3':   { name:'미스릴 투구',  category:'장비', basePrice: 2000 },
    'equip_glove_1':  { name:'가죽 장갑',    category:'장비', basePrice: 80 },
    'equip_glove_2':  { name:'철제 장갑',    category:'장비', basePrice: 350 },
    'equip_glove_3':  { name:'미스릴 장갑',  category:'장비', basePrice: 1500 },
    'equip_boots_1':  { name:'가죽 장화',    category:'장비', basePrice: 80 },
    'equip_boots_2':  { name:'철제 장화',    category:'장비', basePrice: 350 },
    'equip_boots_3':  { name:'민첩의 장화',  category:'장비', basePrice: 1800 },
    // 장비 - 장신구
    'equip_ring_1':   { name:'힘의 반지',    category:'장비', basePrice: 500 },
    'equip_ring_2':   { name:'용사의 반지',  category:'장비', basePrice: 2000 },
    'equip_ring_3':   { name:'드래곤 반지',  category:'장비', basePrice: 8000 },
    'equip_neck_1':   { name:'지혜의 목걸이', category:'장비', basePrice: 400 },
    'equip_neck_2':   { name:'행운의 목걸이', category:'장비', basePrice: 1500 },
    'equip_neck_3':   { name:'드래곤 목걸이', category:'장비', basePrice: 6000 },
};

const CLAN_LEVEL_EXP = [0, 1000, 3000, 7000, 15000, 30000]; // 레벨업 필요 경험치
const CLAN_MAX_MEMBERS = { 1:10, 2:20, 3:30, 4:40, 5:50, 6:60, 7:70, 8:80, 9:90, 10:100 };
const CLAN_SKILLS = {
    1: { name:'혈맹의 힘', effect:'ATK +5%', stat:'atk', multi:0.05 },
    2: { name:'혈맹의 방패', effect:'DEF +5%', stat:'def', multi:0.05 },
    3: { name:'혈맹의 지혜', effect:'EXP +10%', stat:'exp', multi:0.10 },
    4: { name:'혈맹의 축복', effect:'HP +10%', stat:'hp', multi:0.10 },
    5: { name:'혈맹의 영광', effect:'골드 +10%', stat:'gold', multi:0.10 },
    // ── v1.17 신규 (Lv.6-10) ──
    6: { name:'혈맹의 분노', effect:'크리티컬 +5%', stat:'critRate', multi:0.05 },
    7: { name:'혈맹의 신속', effect:'이동속도 +10%', stat:'speed', multi:0.10 },
    8: { name:'혈맹의 회복', effect:'HP 재생 +50%', stat:'hpRegen', multi:0.50 },
    9: { name:'혈맹의 운명', effect:'회피 +5%', stat:'dodgeRate', multi:0.05 },
    10:{ name:'혈맹의 전설', effect:'전 스탯 +5%', stat:'all', multi:0.05 },
};

const EMOTES = {
    taunt:'도발!', cheer:'환호!', greet:'안녕!', laugh:'ㅋㅋㅋ',
    cry:'ㅠㅠ', gg:'GG', help:'도와줘!', thanks:'고마워!',
};

module.exports = {
    DIAMOND_PRODUCTS,
    NPCS,
    TRADE_GOODS,
    TAME_RATES,
    TAME_COSTS,
    SHOP_ITEMS,
    FREE_DIAMOND_SOURCES,
    TRADEABLE_ITEMS,
    CLAN_LEVEL_EXP,
    CLAN_MAX_MEMBERS,
    CLAN_SKILLS,
    EMOTES,
};

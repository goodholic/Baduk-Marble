// 장비 데이터 — v1.39 Phase 3 추출
// server.js → game/data/equipment.js (함수 종속성 0)
// 포함: EQUIPMENT_SLOTS, EQUIPMENT_SETS, GRADE_INFO, RANDOM_OPTIONS, EQUIP_STATS, EQUIP_DESCRIPTIONS

const EQUIPMENT_SLOTS = ['weapon','armor','helmet','gloves','boots','ring','necklace','cape','belt'];

const EQUIPMENT_SETS = {
    dragon: {
        name: '드래곤 세트', pieces: ['equip_sword_5','equip_armor_5','equip_helm_5','equip_glove_5','equip_boots_5','equip_belt_5','equip_cape_5'],
        bonuses: { 2: {atk:20,def:20}, 3: {atk:40,def:40,hp:200}, 5: {atkMulti:1.2,defMulti:1.2,hp:500}, 7: {atkMulti:1.5,defMulti:1.5,hp:1000} }
    },
    hero: {
        name: '영웅 세트', pieces: ['equip_sword_4','equip_armor_4','equip_helm_4','equip_glove_4','equip_boots_4','equip_belt_4','equip_cape_4'],
        bonuses: { 2: {atk:10,def:10}, 3: {atk:25,def:25,hp:100}, 5: {atkMulti:1.15,defMulti:1.15,hp:300} }
    },
    mythic: {
        name: '태초 세트', pieces: ['equip_mythic_sword','equip_mythic_armor','equip_mythic_ring'],
        bonuses: { 2: {atk:50,def:50,hp:500}, 3: {atkMulti:1.5,defMulti:1.5,hp:2000,expBonus:0.3} }
    },
};

const GRADE_INFO = {
    normal:    { name:'일반', color:'#cccccc', atkMulti:1.0, defMulti:1.0, maxEnchant:5,  randomOpts:0, levelReq:1 },
    uncommon:  { name:'고급', color:'#44cc44', atkMulti:1.2, defMulti:1.2, maxEnchant:8,  randomOpts:1, levelReq:5 },
    rare:      { name:'희귀', color:'#4488ff', atkMulti:1.4, defMulti:1.4, maxEnchant:10, randomOpts:2, levelReq:15 },
    epic:      { name:'영웅', color:'#aa44ff', atkMulti:1.7, defMulti:1.7, maxEnchant:12, randomOpts:3, levelReq:25 },
    legendary: { name:'전설', color:'#ff8800', atkMulti:2.2, defMulti:2.2, maxEnchant:15, randomOpts:4, levelReq:35 },
};

const RANDOM_OPTIONS = [
    { name:'크리티컬 +', stat:'critRate', min:0.02, max:0.08 },
    { name:'회피 +',     stat:'dodgeRate', min:0.01, max:0.05 },
    { name:'HP +',       stat:'bonusHp', min:20, max:100 },
    { name:'공격속도 +', stat:'atkSpeed', min:0.05, max:0.15 },
    { name:'이동속도 +', stat:'bonusSpd', min:1, max:5 },
    { name:'경험치 +',   stat:'expBonus', min:0.05, max:0.15 },
    { name:'골드 +',     stat:'goldBonus', min:0.05, max:0.10 },
];

const EQUIP_STATS = {
    // 무기 (weapon)
    'equip_sword_1':  { slot:'weapon', name:'철제 검',     atk:10, def:0, grade:'normal' },
    'equip_sword_2':  { slot:'weapon', name:'강철 검',     atk:25, def:0, grade:'uncommon' },
    'equip_sword_3':  { slot:'weapon', name:'미스릴 검',   atk:45, def:0, grade:'rare' },
    'equip_sword_4':  { slot:'weapon', name:'영웅의 검',   atk:70, def:0, grade:'epic' },
    'equip_sword_5':  { slot:'weapon', name:'드래곤 소드', atk:120, def:0, grade:'legendary', bound:true },
    // 방어구 (armor)
    'equip_armor_1':  { slot:'armor', name:'가죽 갑옷',   atk:0, def:10, grade:'normal' },
    'equip_armor_2':  { slot:'armor', name:'철판 갑옷',   atk:0, def:25, grade:'uncommon' },
    'equip_armor_3':  { slot:'armor', name:'미스릴 갑옷', atk:0, def:45, grade:'rare' },
    'equip_armor_4':  { slot:'armor', name:'영웅의 갑옷', atk:0, def:70, grade:'epic' },
    'equip_armor_5':  { slot:'armor', name:'드래곤 아머', atk:0, def:120, grade:'legendary', bound:true },
    // 투구 (helmet)
    'equip_helm_1':   { slot:'helmet', name:'가죽 투구',   atk:0, def:5,  grade:'normal' },
    'equip_helm_2':   { slot:'helmet', name:'철제 투구',   atk:0, def:12, grade:'uncommon' },
    'equip_helm_3':   { slot:'helmet', name:'미스릴 투구', atk:0, def:20, grade:'rare' },
    // 장갑 (gloves)
    'equip_glove_1':  { slot:'gloves', name:'가죽 장갑',   atk:3,  def:2,  grade:'normal' },
    'equip_glove_2':  { slot:'gloves', name:'철제 장갑',   atk:8,  def:5,  grade:'uncommon' },
    'equip_glove_3':  { slot:'gloves', name:'미스릴 장갑', atk:15, def:10, grade:'rare' },
    // 신발 (boots)
    'equip_boots_1':  { slot:'boots', name:'가죽 장화',   atk:0, def:3,  grade:'normal',   bonusSpd:2 },
    'equip_boots_2':  { slot:'boots', name:'철제 장화',   atk:0, def:7,  grade:'uncommon', bonusSpd:3 },
    'equip_boots_3':  { slot:'boots', name:'민첩의 장화', atk:0, def:12, grade:'rare',     bonusSpd:5 },
    // 반지 (ring)
    'equip_ring_1':   { slot:'ring', name:'힘의 반지',     atk:8,  def:3,  grade:'uncommon' },
    'equip_ring_2':   { slot:'ring', name:'용사의 반지',   atk:15, def:5,  grade:'rare' },
    'equip_ring_3':   { slot:'ring', name:'드래곤 반지',   atk:20, def:10, grade:'epic' },
    // 목걸이 (necklace)
    'equip_neck_1':   { slot:'necklace', name:'지혜의 목걸이',  atk:5,  def:5,  grade:'uncommon', expBonus:0.05 },
    'equip_neck_2':   { slot:'necklace', name:'행운의 목걸이',  atk:8,  def:8,  grade:'rare',     goldBonus:0.10 },
    'equip_neck_3':   { slot:'necklace', name:'드래곤의 목걸이', atk:15, def:15, grade:'epic',     expBonus:0.10 },
    // 망토 (cape)
    'equip_cape_1':   { slot:'cape', name:'여행자의 망토',   atk:3,  def:5,  grade:'normal' },
    'equip_cape_2':   { slot:'cape', name:'기사의 망토',     atk:5,  def:10, grade:'uncommon' },
    'equip_cape_3':   { slot:'cape', name:'마법사의 로브',   atk:10, def:15, grade:'rare',     expBonus:0.05 },
    'equip_cape_4':   { slot:'cape', name:'영웅의 망토',     atk:18, def:25, grade:'epic',     bonusSpd:3 },
    'equip_cape_5':   { slot:'cape', name:'천공의 날개',     atk:30, def:40, grade:'legendary', bonusSpd:5, bound:true },
    // 벨트 (belt)
    'equip_belt_1':   { slot:'belt', name:'가죽 벨트',       atk:2,  def:3,  grade:'normal' },
    'equip_belt_2':   { slot:'belt', name:'철제 벨트',       atk:5,  def:8,  grade:'uncommon' },
    'equip_belt_3':   { slot:'belt', name:'미스릴 벨트',     atk:10, def:12, grade:'rare' },
    'equip_belt_4':   { slot:'belt', name:'영웅의 벨트',     atk:15, def:20, grade:'epic' },
    'equip_belt_5':   { slot:'belt', name:'드래곤 벨트',     atk:25, def:30, grade:'legendary', bound:true },
    // 영웅/전설급 투구/장갑/신발 추가
    'equip_helm_4':   { slot:'helmet', name:'영웅의 투구',   atk:5,  def:35, grade:'epic' },
    'equip_helm_5':   { slot:'helmet', name:'드래곤 투구',   atk:10, def:50, grade:'legendary', bound:true },
    'equip_glove_4':  { slot:'gloves', name:'영웅의 장갑',   atk:20, def:15, grade:'epic' },
    'equip_glove_5':  { slot:'gloves', name:'드래곤 장갑',   atk:30, def:25, grade:'legendary', bound:true },
    'equip_boots_4':  { slot:'boots', name:'영웅의 장화',    atk:5,  def:18, grade:'epic',      bonusSpd:4 },
    'equip_boots_5':  { slot:'boots', name:'드래곤 장화',    atk:8,  def:28, grade:'legendary', bonusSpd:6, bound:true },
    // 신화급 세트 장비 (mythic)
    'equip_mythic_sword': { slot:'weapon', name:'태초의 검', atk:200, def:0,  grade:'legendary', bound:true },
    'equip_mythic_armor': { slot:'armor',  name:'태초의 갑옷', atk:0, def:200, grade:'legendary', bound:true },
    'equip_mythic_ring':  { slot:'ring',   name:'태초의 반지', atk:30, def:30, grade:'legendary', bound:true, expBonus:0.15, goldBonus:0.15 },
};

const EQUIP_DESCRIPTIONS = {
    'equip_sword_1':'대장장이가 처음 만들어준 기본 검. 가볍고 다루기 쉽다.',
    'equip_sword_2':'강철로 벼린 검. 무게감이 느껴진다.',
    'equip_sword_3':'미스릴의 빛이 서린 명검. 가볍지만 날카롭다.',
    'equip_sword_4':'영웅의 혼이 깃든 검. 주인을 가린다고 전해진다.',
    'equip_sword_5':'고대 드래곤의 이빨로 벼린 전설의 검. 불꽃이 서려있다.',
    'equip_armor_1':'가죽으로 만든 기본 갑옷. 가볍고 활동하기 편하다.',
    'equip_armor_2':'철판을 이어 만든 갑옷. 묵직한 방어력.',
    'equip_armor_3':'미스릴 사슬로 짠 갑옷. 가볍지만 검도 뚫지 못한다.',
    'equip_armor_4':'전설의 대장장이가 만든 갑옷. 마법 방어까지 갖추었다.',
    'equip_armor_5':'드래곤 비늘로 만든 최강의 갑옷. 드래곤의 브레스도 막는다.',
    'equip_cape_5':'천공의 바람을 담은 날개. 착용자에게 바람의 가호를 준다.',
    'equip_belt_5':'드래곤의 힘줄로 만든 벨트. 착용자의 근력을 극한까지 끌어올린다.',
    'equip_mythic_sword':'세계가 만들어지기 전부터 존재한 검. 만물을 벨 수 있다.',
    'equip_mythic_armor':'태초의 빛으로 짠 갑옷. 어떤 공격도 통하지 않는다.',
    'equip_mythic_ring':'시간과 공간을 다루는 반지. 착용자에게 무한한 힘을 준다.',
};

module.exports = {
    EQUIPMENT_SLOTS,
    EQUIPMENT_SETS,
    GRADE_INFO,
    RANDOM_OPTIONS,
    EQUIP_STATS,
    EQUIP_DESCRIPTIONS,
};

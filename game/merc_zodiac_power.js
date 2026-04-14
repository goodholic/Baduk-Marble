// v6.2 — 별자리 파워 시스템
// 12별자리 중 하나 부여, 별자리별 고유 능력+운세+합성

const ZODIAC_SIGNS = [
  { id: 'aries', name: '양자리', icon: '♈🐏', month: [3,4], element: 'fire', trait: '선봉', passive: { atk: 1.1, firstStrike: true }, skill: '돌진의 뿔(첫 공격 DMG 2배)', lore: '전장의 선두, 두려움을 모르는 돌격수' },
  { id: 'taurus', name: '황소자리', icon: '♉🐂', month: [4,5], element: 'earth', trait: '불굴', passive: { def: 1.15, hpRegen: 0.02 }, skill: '대지의 뿔(기절+넉백)', lore: '부서지지 않는 대지의 힘' },
  { id: 'gemini', name: '쌍둥이자리', icon: '♊👥', month: [5,6], element: 'air', trait: '쌍둥이', passive: { spd: 1.1, clone: true }, skill: '분신술(3초간 분신 1체)', lore: '두 개의 영혼, 예측 불가' },
  { id: 'cancer', name: '게자리', icon: '♋🦀', month: [6,7], element: 'water', trait: '수호', passive: { def: 1.1, shieldOnLowHp: true }, skill: '갑각 방어(3초 DMG 반감)', lore: '소중한 것을 지키는 단단한 방패' },
  { id: 'leo', name: '사자자리', icon: '♌🦁', month: [7,8], element: 'fire', trait: '왕', passive: { atk: 1.12, teamMorale: 1.1 }, skill: '왕의 포효(팀 ATK+15% 10초)', lore: '태양 아래 가장 빛나는 왕' },
  { id: 'virgo', name: '처녀자리', icon: '♍🌾', month: [8,9], element: 'earth', trait: '치유', passive: { healPow: 1.2, purify: true }, skill: '정화의 빛(디버프 전원 제거)', lore: '순수한 빛으로 상처를 치유' },
  { id: 'libra', name: '천칭자리', icon: '♎⚖️', month: [9,10], element: 'air', trait: '균형', passive: { allStat: 1.05, balanced: true }, skill: '균형의 심판(강자↓ 약자↑)', lore: '모든 것의 균형을 맞추는 자' },
  { id: 'scorpio', name: '전갈자리', icon: '♏🦂', month: [10,11], element: 'water', trait: '독', passive: { critDmg: 1.3, poison: true }, skill: '독침(5초 DOT+DEF 감소)', lore: '한 번의 독침으로 끝내는 암살자' },
  { id: 'sagittarius', name: '사수자리', icon: '♐🏹', month: [11,12], element: 'fire', trait: '원사', passive: { range: 1.3, accuracy: 1.15 }, skill: '유성 화살(관통+범위)', lore: '화살이 별처럼 날아간다' },
  { id: 'capricorn', name: '염소자리', icon: '♑🐐', month: [12,1], element: 'earth', trait: '등반', passive: { expBonus: 1.2, endurance: 1.15 }, skill: '산의 정복자(HP↓시 ATK↑)', lore: '끊임없이 올라가는 등반가' },
  { id: 'aquarius', name: '물병자리', icon: '♒💧', month: [1,2], element: 'air', trait: '혁신', passive: { matk: 1.1, cdReduce: 0.9 }, skill: '지혜의 물(팀 MP 전체 회복)', lore: '새로운 길을 여는 혁신가' },
  { id: 'pisces', name: '물고기자리', icon: '♓🐟', month: [2,3], element: 'water', trait: '몽상', passive: { eva: 1.2, dreamBonus: 1.5 }, skill: '환상의 바다(적 혼란 3초)', lore: '꿈과 현실 사이를 헤엄치는 자' },
];

// 별자리 합성 (같은 원소 3별자리 → 궁극 별자리)
const ZODIAC_FUSIONS = [
  { elements: ['fire', 'fire', 'fire'], result: { name: '태양신좌', icon: '☀️♈♌♐', bonus: { fireDmg: 1.5, atk: 1.2 } }, desc: '양+사자+사수 = 태양의 힘' },
  { elements: ['earth', 'earth', 'earth'], result: { name: '대지신좌', icon: '🌍♉♍♑', bonus: { def: 1.4, hp: 1.3 } }, desc: '황소+처녀+염소 = 대지의 힘' },
  { elements: ['air', 'air', 'air'], result: { name: '천공신좌', icon: '🌪️♊♎♒', bonus: { spd: 1.4, cdReduce: 0.7 } }, desc: '쌍둥이+천칭+물병 = 하늘의 힘' },
  { elements: ['water', 'water', 'water'], result: { name: '심해신좌', icon: '🌊♋♏♓', bonus: { healPow: 1.4, critDmg: 1.4 } }, desc: '게+전갈+물고기 = 바다의 힘' },
];

// 일일 별자리 운세 (플레이어 별자리에 따라 버프)
const DAILY_FORTUNE = {
  great:   { chance: 0.1, buff: { allStat: 1.15, luck: 1.5 }, desc: '대길! 오늘 전체+15%, 행운+50%' },
  good:    { chance: 0.25, buff: { allStat: 1.08, luck: 1.2 }, desc: '길! 전체+8%, 행운+20%' },
  normal:  { chance: 0.35, buff: {}, desc: '보통. 변화 없음' },
  bad:     { chance: 0.2, buff: { allStat: 0.95 }, desc: '흉. 전체-5%, 조심하세요' },
  terrible:{ chance: 0.1, buff: { allStat: 0.9, luck: 0.7 }, desc: '대흉! 전체-10%, 행운-30%. 오늘은 쉬세요...' },
};

function assignZodiac(merc, zodiacId) {
  const zodiac = ZODIAC_SIGNS.find(z => z.id === zodiacId);
  if (!zodiac) return { ok: false, reason: '알 수 없는 별자리' };
  merc.zodiac = { id: zodiacId, ...zodiac };
  return { ok: true, zodiac };
}

function getDailyFortune(player) {
  const r = Math.random();
  let cum = 0;
  for (const [key, f] of Object.entries(DAILY_FORTUNE)) {
    cum += f.chance;
    if (r <= cum) return { fortune: key, ...f };
  }
  return { fortune: 'normal', ...DAILY_FORTUNE.normal };
}

function register(io, socket, player) {
  socket.on('zodiac_info', () => {
    socket.emit('zodiac_info', { signs: ZODIAC_SIGNS, fusions: ZODIAC_FUSIONS, fortune: DAILY_FORTUNE });
  });
  socket.on('zodiac_assign', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('zodiac_result', { ok: false });
    socket.emit('zodiac_result', assignZodiac(merc, data.zodiacId));
  });
  socket.on('zodiac_fortune', () => {
    socket.emit('zodiac_fortune', getDailyFortune(player));
  });
}

module.exports = { ZODIAC_SIGNS, ZODIAC_FUSIONS, DAILY_FORTUNE, assignZodiac, getDailyFortune, register };

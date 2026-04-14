// v5.2 — 용병 전용 펫 시스템
// 용병마다 전용 펫 장착, 펫+용병 시너지, 펫 진화

// 펫 종류
const PET_TYPES = [
  { id: 'fire_wolf', name: '불늑대', icon: '🐺🔥', element: 'fire', baseStats: { atk: 30, def: 10, spd: 5 }, skill: '화염 돌진', grade: 'rare' },
  { id: 'ice_hawk', name: '빙결 매', icon: '🦅❄️', element: 'ice', baseStats: { atk: 25, def: 5, spd: 8 }, skill: '냉기 급강하', grade: 'rare' },
  { id: 'thunder_cat', name: '뇌전 고양이', icon: '🐱⚡', element: 'thunder', baseStats: { atk: 20, def: 15, spd: 7 }, skill: '전격 발톱', grade: 'rare' },
  { id: 'earth_bear', name: '대지 곰', icon: '🐻🪨', element: 'earth', baseStats: { atk: 15, def: 40, spd: 3 }, skill: '지진 강타', grade: 'rare' },
  { id: 'shadow_raven', name: '그림자 까마귀', icon: '🐦‍⬛🌑', element: 'dark', baseStats: { atk: 25, def: 8, spd: 9 }, skill: '암흑 깃털', grade: 'epic' },
  { id: 'holy_unicorn', name: '성스러운 유니콘', icon: '🦄✨', element: 'holy', baseStats: { atk: 10, def: 20, spd: 6 }, skill: '치유의 빛', grade: 'epic' },
  { id: 'dragon_whelp', name: '아기 드래곤', icon: '🐲', element: 'fire', baseStats: { atk: 40, def: 20, spd: 5 }, skill: '미니 브레스', grade: 'legend' },
  { id: 'phoenix_chick', name: '불사조 새끼', icon: '🐥🔥', element: 'fire', baseStats: { atk: 20, def: 15, spd: 6 }, skill: '재탄생', grade: 'legend' },
  { id: 'void_serpent', name: '공허 뱀', icon: '🐍🌌', element: 'dark', baseStats: { atk: 35, def: 10, spd: 10 }, skill: '차원 독', grade: 'legend' },
  { id: 'celestial_deer', name: '천상의 사슴', icon: '🦌✨', element: 'holy', baseStats: { atk: 15, def: 30, spd: 7 }, skill: '별빛 축복', grade: 'myth' },
];

// 펫 진화 트리
const PET_EVOLUTION = {
  fire_wolf:     ['불늑대', '화염 늑대왕', '지옥의 켈베로스'],
  ice_hawk:      ['빙결 매', '빙풍 피닉스', '절대영도 그리폰'],
  thunder_cat:   ['뇌전 고양이', '번개 호랑이', '뇌신 백호'],
  earth_bear:    ['대지 곰', '산의 군주', '대지의 타이탄'],
  shadow_raven:  ['그림자 까마귀', '암흑 피닉스', '죽음의 전령'],
  holy_unicorn:  ['성스러운 유니콘', '천마', '신수 기린'],
  dragon_whelp:  ['아기 드래곤', '청년 드래곤', '고대 드래곤'],
  phoenix_chick: ['불사조 새끼', '불사조', '영원의 불사조'],
  void_serpent:  ['공허 뱀', '차원의 뱀', '세계를 감싸는 뱀'],
  celestial_deer:['천상의 사슴', '성수', '신의 사자'],
};

// 용병+펫 시너지 (원소 일치 / 특수 조합)
const PET_SYNERGIES = [
  { mercClass: 'warrior', petElement: 'fire', name: '불타는 전사', bonus: { atk: 1.15, fireDmg: 1.2 } },
  { mercClass: 'warrior', petElement: 'earth', name: '철벽의 기사', bonus: { def: 1.2, hp: 1.1 } },
  { mercClass: 'mage', petElement: 'thunder', name: '뇌전 마법사', bonus: { matk: 1.2, castSpd: 1.15 } },
  { mercClass: 'mage', petElement: 'ice', name: '빙결 마도사', bonus: { matk: 1.15, slow: 0.2 } },
  { mercClass: 'assassin', petElement: 'dark', name: '그림자 암살자', bonus: { crit: 1.25, stealth: 2 } },
  { mercClass: 'healer', petElement: 'holy', name: '신성 치유사', bonus: { healPow: 1.3, manaRegen: 1.2 } },
  { mercClass: 'ranger', petElement: 'fire', name: '화염 사수', bonus: { atk: 1.1, range: 1.15 } },
  { mercClass: 'tank', petElement: 'earth', name: '대지의 수호자', bonus: { def: 1.25, hp: 1.15 } },
];

// 펫 양육 (친밀도, 밥주기, 놀아주기)
const PET_CARE = {
  feed:    { cost: 100, intimacy: 3, desc: '밥 주기 — 친밀도+3', cooldown: 300 },
  play:    { cost: 0, intimacy: 2, desc: '놀아주기 — 친밀도+2', cooldown: 600 },
  train:   { cost: 500, intimacy: 1, exp: 50, desc: '훈련 — EXP+50', cooldown: 900 },
  groom:   { cost: 200, intimacy: 5, desc: '목욕/정리 — 친밀도+5', cooldown: 1800 },
  gift:    { cost: 1000, intimacy: 10, desc: '선물 — 친밀도+10', cooldown: 3600 },
};

// 친밀도 단계
const INTIMACY_TIERS = [
  { min: 0,   name: '경계', bonus: 0.8 },
  { min: 20,  name: '친근', bonus: 1.0 },
  { min: 50,  name: '신뢰', bonus: 1.1 },
  { min: 80,  name: '우정', bonus: 1.2 },
  { min: 100, name: '유대', bonus: 1.35, special: '펫 궁극기 해금' },
];

function assignPet(player, mercId, petId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  const pets = player.pets || [];
  const pet = pets.find(p => p.id === petId);
  if (!pet) return { ok: false, reason: '펫 없음' };

  merc.pet = pet;
  // 시너지 체크
  const synergy = PET_SYNERGIES.find(s => s.mercClass === merc.class && s.petElement === pet.element);
  merc.petSynergy = synergy || null;

  return { ok: true, merc: merc.name, pet: pet.name, synergy };
}

function carePet(player, petId, careType) {
  const pet = (player.pets || []).find(p => p.id === petId);
  if (!pet) return { ok: false, reason: '펫 없음' };
  const care = PET_CARE[careType];
  if (!care) return { ok: false, reason: '알 수 없는 양육' };
  if ((player.gold || 0) < care.cost) return { ok: false, reason: '골드 부족' };

  player.gold -= care.cost;
  pet.intimacy = Math.min(100, (pet.intimacy || 0) + care.intimacy);
  if (care.exp) pet.exp = (pet.exp || 0) + care.exp;

  const tier = INTIMACY_TIERS.filter(t => pet.intimacy >= t.min).pop();
  return { ok: true, pet: pet.name, intimacy: pet.intimacy, tier };
}

function evolvePet(player, petId) {
  const pet = (player.pets || []).find(p => p.id === petId);
  if (!pet) return { ok: false, reason: '펫 없음' };
  const evoLine = PET_EVOLUTION[pet.baseId || pet.typeId];
  if (!evoLine) return { ok: false, reason: '진화 불가' };
  const stage = pet.evoStage || 0;
  if (stage >= evoLine.length - 1) return { ok: false, reason: '최종 진화' };
  if ((pet.level || 1) < (stage + 1) * 15) return { ok: false, reason: `레벨 ${(stage + 1) * 15} 필요` };
  if ((pet.intimacy || 0) < 50) return { ok: false, reason: '친밀도 50 이상 필요' };

  pet.evoStage = stage + 1;
  pet.name = evoLine[stage + 1];
  pet.atk = Math.floor((pet.atk || 20) * 1.5);
  pet.def = Math.floor((pet.def || 10) * 1.4);
  pet.spd = Math.floor((pet.spd || 5) * 1.2);

  return { ok: true, pet, newName: pet.name, stage: stage + 1 };
}

function register(io, socket, player) {
  socket.on('pet_list', () => {
    socket.emit('pet_list', {
      available: PET_TYPES,
      owned: player.pets || [],
      synergies: PET_SYNERGIES,
      care: PET_CARE,
    });
  });

  socket.on('pet_assign', (data) => {
    const result = assignPet(player, data.mercId, data.petId);
    socket.emit('pet_assign_result', result);
  });

  socket.on('pet_care', (data) => {
    const result = carePet(player, data.petId, data.careType);
    socket.emit('pet_care_result', result);
  });

  socket.on('pet_evolve', (data) => {
    const result = evolvePet(player, data.petId);
    socket.emit('pet_evolve_result', result);
    if (result.ok) {
      io.emit('server_msg', `🐾 [펫 진화] ${player.name}의 펫이 "${result.newName}"(으)로 진화!`);
    }
  });
}

module.exports = {
  PET_TYPES, PET_EVOLUTION, PET_SYNERGIES, PET_CARE, INTIMACY_TIERS,
  assignPet, carePet, evolvePet, register,
};

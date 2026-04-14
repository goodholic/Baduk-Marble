// v6.6 — 전설의 무기(레거시 웨폰) 시스템
// 세대를 넘어 전해지는 무기, 사용할수록 성장, 고유 이름, 역사

const LEGACY_WEAPON_TYPES = [
  { id: 'sword', name: '전설의 검', icon: '⚔️🌟', baseStat: { atk: 100 }, growthPerBattle: { atk: 0.5 }, maxLevel: 100 },
  { id: 'staff', name: '전설의 지팡이', icon: '🪄🌟', baseStat: { matk: 100 }, growthPerBattle: { matk: 0.5 }, maxLevel: 100 },
  { id: 'bow', name: '전설의 활', icon: '🏹🌟', baseStat: { atk: 80, range: 50 }, growthPerBattle: { atk: 0.4, range: 0.2 }, maxLevel: 100 },
  { id: 'shield', name: '전설의 방패', icon: '🛡️🌟', baseStat: { def: 100, hp: 500 }, growthPerBattle: { def: 0.5, hp: 2 }, maxLevel: 100 },
  { id: 'dagger', name: '전설의 단검', icon: '🗡️🌟', baseStat: { atk: 70, crit: 15 }, growthPerBattle: { atk: 0.3, crit: 0.1 }, maxLevel: 100 },
  { id: 'grimoire', name: '전설의 마도서', icon: '📖🌟', baseStat: { matk: 80, cdReduce: 5 }, growthPerBattle: { matk: 0.4, cdReduce: 0.05 }, maxLevel: 100 },
];

// 무기 각성 단계 (레벨에 따라)
const WEAPON_AWAKENING = [
  { level: 10, name: '이름 각성', effect: '무기에 고유 이름 부여 가능', icon: '📝' },
  { level: 25, name: '1차 각성', effect: '고유 스킬 1개 해금', icon: '⭐' },
  { level: 50, name: '2차 각성', effect: '외형 변화 + 고유 스킬 강화', icon: '⭐⭐' },
  { level: 75, name: '3차 각성', effect: '오라 효과 + 팀 버프', icon: '⭐⭐⭐' },
  { level: 100, name: '최종 각성', effect: '전설급 변환! 무기에 의지 탄생', icon: '👑⭐', sentient: true },
];

// 무기의 의지 (100레벨 도달 시)
const WEAPON_PERSONALITY = [
  { id: 'noble', name: '고결', dialogue: '주인이여, 정의를 위해 싸우자.', bonus: { atk: 1.05, karma: 2 } },
  { id: 'fierce', name: '호전적', dialogue: '더 많은 피를... 더 많은 전투를!', bonus: { atk: 1.1, karma: -1 } },
  { id: 'wise', name: '지혜로움', dialogue: '싸우기 전에 생각하라.', bonus: { matk: 1.08, exp: 1.1 } },
  { id: 'protective', name: '수호', dialogue: '내가 너를 지키겠다.', bonus: { def: 1.1, shieldOnLowHp: true } },
  { id: 'chaotic', name: '혼돈', dialogue: '규칙은 깨지기 위해 존재해!', bonus: { randomBuff: true } },
];

// 무기 역사 (자동 기록)
const WEAPON_HISTORY_EVENTS = [
  'n번째 전투 참여', '보스 처치 기록', '공성전 승리', '주인 변경 (세대 계승)',
  '각성 달성', '최대 데미지 기록', 'PvP 최다 킬', '위기에서 주인 구함',
];

// 세대 계승 시 무기 전달
const INHERITANCE_BONUS = {
  desc: '이전 주인의 전투 경험이 무기에 남아있다',
  bonus: { levelRetain: 1.0, extraGrowth: 0.1 }, // 레벨 유지 + 성장률 +10%
};

function createLegacyWeapon(player, mercId, weaponType) {
  const wType = LEGACY_WEAPON_TYPES.find(w => w.id === weaponType);
  if (!wType) return { ok: false, reason: '알 수 없는 무기' };
  const weapon = {
    id: `lw_${Date.now()}`, type: weaponType, customName: null,
    level: 1, battles: 0, stats: { ...wType.baseStat },
    history: [{ event: '탄생', date: Date.now(), owner: player.name }],
    personality: null, awakened: 0,
  };
  player.legacyWeapons = player.legacyWeapons || [];
  player.legacyWeapons.push(weapon);
  return { ok: true, weapon };
}

function battleGrowth(weapon, wType) {
  weapon.battles++;
  for (const [stat, growth] of Object.entries(wType.growthPerBattle)) {
    weapon.stats[stat] = (weapon.stats[stat] || 0) + growth;
  }
  weapon.level = Math.min(wType.maxLevel, Math.floor(weapon.battles / 10) + 1);
  const awakening = WEAPON_AWAKENING.filter(a => weapon.level >= a.level && weapon.awakened < WEAPON_AWAKENING.indexOf(a) + 1);
  if (awakening.length > weapon.awakened) {
    weapon.awakened = awakening.length;
    if (weapon.level >= 100 && !weapon.personality) {
      weapon.personality = WEAPON_PERSONALITY[Math.floor(Math.random() * WEAPON_PERSONALITY.length)];
    }
    return { levelUp: true, awakening: awakening[awakening.length - 1], personality: weapon.personality };
  }
  return { levelUp: false };
}

function register(io, socket, player) {
  socket.on('legacy_weapon_info', () => {
    socket.emit('legacy_weapon_info', { types: LEGACY_WEAPON_TYPES, awakening: WEAPON_AWAKENING, personalities: WEAPON_PERSONALITY, inheritance: INHERITANCE_BONUS, weapons: player.legacyWeapons || [] });
  });
  socket.on('legacy_weapon_create', (data) => {
    const result = createLegacyWeapon(player, data.mercId, data.weaponType);
    socket.emit('legacy_weapon_result', result);
    if (result.ok) io.emit('server_msg', `⚔️🌟 [전설 무기] ${player.name}이(가) 전설의 무기를 단조!`);
  });
  socket.on('legacy_weapon_name', (data) => {
    const weapon = (player.legacyWeapons || []).find(w => w.id === data.weaponId);
    if (weapon && weapon.level >= 10) {
      weapon.customName = data.name;
      socket.emit('legacy_weapon_name_result', { ok: true, name: data.name });
      io.emit('server_msg', `⚔️📝 [전설 무기] "${data.name}"이라는 이름이 새겨졌다!`);
    }
  });
}

module.exports = { LEGACY_WEAPON_TYPES, WEAPON_AWAKENING, WEAPON_PERSONALITY, INHERITANCE_BONUS, createLegacyWeapon, battleGrowth, register };

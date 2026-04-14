// v5.3 — 어둠의 대륙 시스템
// 완전히 새로운 대륙, 극한 난이도, 영구 사망(permadeath) 모드, 최고급 보상

const PERMA_DEATH = true; // 이 대륙에서 용병이 죽으면 진짜 사라짐!

// 어둠의 대륙 지역
const DARK_ZONES = [
  { id: 'cursed_shore', name: '저주받은 해안', icon: '🏴‍☠️', difficulty: 8, hazard: '독안개(매 30초 HP -5%)', reward: { gold: 20000, darkCrystal: 3 }, lore: '발을 디딘 자의 절반은 돌아오지 못한다' },
  { id: 'bone_desert', name: '뼈의 사막', icon: '💀🏜️', difficulty: 9, hazard: '모래폭풍(시야0, 랜덤DMG)', reward: { gold: 30000, darkCrystal: 5 }, lore: '무수한 용사의 뼈가 사막을 이룬다' },
  { id: 'blood_swamp', name: '피의 늪', icon: '🩸🌿', difficulty: 9, hazard: '흡혈 지형(이동 시 HP 흡수)', reward: { gold: 35000, darkCrystal: 5 }, lore: '늪 자체가 살아있는 괴물' },
  { id: 'void_rift', name: '공허의 틈', icon: '🌀💜', difficulty: 10, hazard: '차원 붕괴(랜덤 스탯 -20%)', reward: { gold: 50000, darkCrystal: 8 }, lore: '현실과 공허 사이의 경계' },
  { id: 'demon_citadel', name: '마왕의 성채', icon: '😈🏰', difficulty: 10, hazard: '지배의 기운(매분 공포 판정)', reward: { gold: 80000, darkCrystal: 12, demonSoul: 1 }, lore: '이곳의 주인은 세계를 삼키려 한다' },
  { id: 'abyss_core', name: '심연의 핵', icon: '🕳️🔥', difficulty: 11, hazard: '존재 소멸(10분 제한, 초과 시 즉사)', reward: { gold: 150000, darkCrystal: 20, abyssEssence: 1 }, lore: '모든 악의 근원, 최종 도전' },
];

// 어둠의 대륙 전용 보스
const DARK_BOSSES = [
  { id: 'plague_lord', name: '역병의 군주', hp: 100000, atk: 800, zone: 'cursed_shore', icon: '☠️', skill: '전염: 아군에게 전파되는 독', drop: { darkCrystal: 10, recipe: 'plague_blade' } },
  { id: 'sand_titan', name: '모래의 타이탄', hp: 200000, atk: 600, zone: 'bone_desert', icon: '🏜️💀', skill: '매장: 용병 1명 5초간 행동불가', drop: { darkCrystal: 15, recipe: 'titan_armor' } },
  { id: 'blood_mother', name: '피의 어머니', hp: 150000, atk: 900, zone: 'blood_swamp', icon: '🩸👹', skill: '흡혈: 데미지의 100% 회복', drop: { darkCrystal: 12, recipe: 'blood_ring' } },
  { id: 'void_king', name: '공허의 왕', hp: 300000, atk: 1000, zone: 'void_rift', icon: '🌀👑', skill: '차원 절단: 방어력 무시 데미지', drop: { darkCrystal: 20, recipe: 'void_staff' } },
  { id: 'demon_emperor', name: '마황', hp: 500000, atk: 1200, zone: 'demon_citadel', icon: '😈👑', skill: '지배: 아군 1명 30초간 적으로 전환', drop: { demonSoul: 3, recipe: 'demon_crown' } },
  { id: 'abyss_god', name: '심연신', hp: 999999, atk: 1500, zone: 'abyss_core', icon: '🕳️👁️', skill: '소멸: 매 턴 최대HP 10% 영구 감소', drop: { abyssEssence: 3, recipe: 'abyss_weapon', title: '심연을 정복한 자' } },
];

// 어둠의 대륙 전용 장비 (최상위)
const DARK_EQUIPMENT = [
  { id: 'plague_blade', name: '역병의 검', icon: '☠️⚔️', grade: 'myth', stats: { atk: 200, poisonDmg: 100, lifeSteal: 0.1 }, desc: '적을 역병에 감염시키는 저주의 검' },
  { id: 'titan_armor', name: '타이탄의 갑주', icon: '🏜️🛡️', grade: 'myth', stats: { def: 250, hp: 5000, dmgReduce: 0.15 }, desc: '사막의 거인이 두른 불멸의 갑옷' },
  { id: 'blood_ring', name: '피의 반지', icon: '🩸💍', grade: 'myth', stats: { atk: 100, lifeSteal: 0.25, hpCost: 0.05 }, desc: '착용자의 피를 대가로 절대적 힘' },
  { id: 'void_staff', name: '공허의 지팡이', icon: '🌀🪄', grade: 'myth', stats: { matk: 250, penetration: 0.3, mpCost: 2.0 }, desc: '방어를 관통하는 차원의 마법' },
  { id: 'demon_crown', name: '마황의 관', icon: '😈👑', grade: 'myth', stats: { allStat: 80, dominate: 0.05 }, desc: '5% 확률로 적 1명 지배 (10초)' },
  { id: 'abyss_weapon', name: '심연의 무기', icon: '🕳️⚔️', grade: 'transcend', stats: { allStat: 120, trueDmg: 100 }, desc: '초월 등급! 진정한 데미지를 가한다' },
];

// 영구 사망 보험 (고가)
const PERMADEATH_INSURANCE = {
  basic:    { cost: 50000, saves: 1, name: '기본 보험' },
  premium:  { cost: 200000, saves: 3, name: '프리미엄 보험' },
  ultimate: { cost: 1000000, saves: 99, name: '무한 보험' },
};

function enterDarkContinent(player, zoneId, mercIds) {
  const zone = DARK_ZONES.find(z => z.id === zoneId);
  if (!zone) return { ok: false, reason: '알 수 없는 지역' };
  const mercs = (player.mercenaries || []).filter(m => mercIds.includes(m.id));
  if (mercs.length === 0) return { ok: false, reason: '용병 선택 필요' };

  player.darkExpedition = {
    zoneId, zone,
    squad: mercs.map(m => m.id),
    startTime: Date.now(),
    status: 'active',
    insurance: player.darkInsurance || null,
  };
  return { ok: true, zone, squad: mercs.map(m => ({ id: m.id, name: m.name })), warning: '⚠️ 영구 사망 모드! 용병이 사망하면 영원히 사라집니다!' };
}

function mercDeath(player, mercId) {
  const ins = player.darkInsurance;
  if (ins && ins.saves > 0) {
    ins.saves--;
    return { ok: true, saved: true, remaining: ins.saves };
  }
  // 영구 사망!
  const mercs = player.mercenaries || [];
  const idx = mercs.findIndex(m => m.id === mercId);
  if (idx >= 0) {
    const dead = mercs.splice(idx, 1)[0];
    player.fallenHeroes = player.fallenHeroes || [];
    player.fallenHeroes.push({ name: dead.name, level: dead.level, diedAt: Date.now(), zone: player.darkExpedition?.zoneId });
    return { ok: true, saved: false, fallen: dead.name };
  }
  return { ok: false };
}

function register(io, socket, player) {
  socket.on('dark_continent_zones', () => {
    socket.emit('dark_continent_zones', { zones: DARK_ZONES, bosses: DARK_BOSSES, equipment: DARK_EQUIPMENT, insurance: PERMADEATH_INSURANCE });
  });

  socket.on('dark_continent_enter', (data) => {
    const result = enterDarkContinent(player, data.zoneId, data.mercIds);
    socket.emit('dark_continent_enter_result', result);
    if (result.ok) io.emit('server_msg', `🏴‍☠️ [어둠의 대륙] ${player.name}이(가) "${result.zone.name}"에 진입! ⚠️영구사망 모드⚠️`);
  });

  socket.on('dark_continent_buy_insurance', (data) => {
    const ins = PERMADEATH_INSURANCE[data.type];
    if (!ins) return socket.emit('dark_ins_result', { ok: false });
    if ((player.gold || 0) < ins.cost) return socket.emit('dark_ins_result', { ok: false, reason: '골드 부족' });
    player.gold -= ins.cost;
    player.darkInsurance = { type: data.type, saves: ins.saves };
    socket.emit('dark_ins_result', { ok: true, insurance: player.darkInsurance });
  });

  socket.on('dark_continent_merc_death', (data) => {
    const result = mercDeath(player, data.mercId);
    socket.emit('dark_merc_death_result', result);
    if (result.ok && !result.saved) {
      io.emit('server_msg', `💀 [영구 사망] ${player.name}의 ${result.fallen}이(가) 어둠의 대륙에서 영원히 쓰러졌습니다...`);
    }
  });

  socket.on('dark_continent_fallen', () => {
    socket.emit('dark_continent_fallen', player.fallenHeroes || []);
  });
}

module.exports = { DARK_ZONES, DARK_BOSSES, DARK_EQUIPMENT, PERMADEATH_INSURANCE, enterDarkContinent, mercDeath, register };

// ============================================
// IO 배틀로얄 중 이벤트 시스템 — 전투 중 랜덤 이벤트
// "io 단판 형식에 심어넣을 이벤트들"
// ============================================

// IO 중 5분마다 하나씩 발동하는 서버 이벤트
const IO_EVENTS = [
  // 보급
  { id: 'supply_drop', name: '보급 투하!', icon: '🪂📦', time: 300, type: 'supply',
    desc: '맵 랜덤 위치에 보급 상자 5개 투하! 무기/포션/골드',
    effect: { spawnCrates: 5, crateContents: ['weapon_boost', 'hp_potion', 'gold_100', 'speed_boost', 'shield'] } },

  // 보스
  { id: 'mini_boss', name: '미니보스 출현!', icon: '👹🔥', time: 600, type: 'boss',
    desc: '맵 중앙에 강력한 미니보스! 처치 시 전설 장비 드롭',
    effect: { bossHp: 5000, bossAtk: 200, drop: 'legend_equip' } },

  // 환경
  { id: 'fog', name: '짙은 안개!', icon: '🌫️', time: 900, type: 'weather', duration: 120,
    desc: '2분간 시야 50% 감소! 은밀한 플레이 유리',
    effect: { visibility: 0.5 } },
  { id: 'meteor_shower', name: '유성우!', icon: '☄️', time: 1200, type: 'weather', duration: 60,
    desc: '1분간 랜덤 위치에 유성 낙하! 범위 데미지',
    effect: { meteorDmg: 100, meteorCount: 10, interval: 6 } },
  { id: 'blood_moon', name: '핏빛 달!', icon: '🌙🩸', time: 1800, type: 'weather', duration: 180,
    desc: '3분간 모든 데미지 1.5배! 킬 시 체력 회복',
    effect: { dmgMul: 1.5, killHeal: 0.2 } },

  // 버프/디버프 존
  { id: 'healing_spring', name: '치유의 샘 출현', icon: '💧💚', time: 450, type: 'zone',
    desc: '맵에 치유의 샘 3곳 생성 (30초간 HP 회복)',
    effect: { healZones: 3, healRate: 0.05, duration: 30 } },
  { id: 'cursed_zone', name: '저주 지대!', icon: '💀🌀', time: 750, type: 'zone', duration: 60,
    desc: '맵 일부가 저주 지대로! 진입 시 DEF -30%',
    effect: { curseZones: 2, defReduce: 0.3 } },

  // PK 유도
  { id: 'bounty_king', name: '현상금 왕!', icon: '👑💰', time: 1500, type: 'pk',
    desc: '킬 수 1위에게 현상금! 처치 시 골드 2000 + 추가 보상',
    effect: { bountyGold: 2000, targetTopKiller: true } },
  { id: 'double_xp', name: '경험치 2배!', icon: '📈📈', time: 2100, type: 'buff', duration: 120,
    desc: '2분간 킬 경험치 2배! 적극적으로 전투하라!',
    effect: { expMul: 2.0 } },

  // 서바이벌
  { id: 'zone_shrink_fast', name: '긴급 축소!', icon: '🔴⚡', time: 2400, type: 'survival',
    desc: '안전 구역이 즉시 30% 축소! 서둘러라!',
    effect: { zoneShrink: 0.3 } },
  { id: 'loot_frenzy', name: '전리품 광란!', icon: '💎💎💎', time: 2700, type: 'buff', duration: 60,
    desc: '1분간 킬 시 골드/다이아 5배!',
    effect: { lootMul: 5.0 } },

  // 최종 이벤트
  { id: 'final_boss', name: '최종 보스 출현!', icon: '🐲👑', time: 3000, type: 'boss',
    desc: '최종 보스 등장! 생존자 전원 협력 or 무시하고 PvP!',
    effect: { bossHp: 20000, bossAtk: 500, drop: 'myth_card', serverAnnounce: true } },
  { id: 'last_stand', name: '최후의 결전!', icon: '⚔️🔥', time: 3300, type: 'survival',
    desc: '안전 구역 최소화! 남은 생존자 강제 근접 전투!',
    effect: { zoneShrink: 0.8, dmgMul: 1.3 } },
];

// IO 전투 중 드롭 아이템
const IO_DROPS = [
  { id: 'hp_potion', name: 'HP 포션', icon: '🧪❤️', effect: { heal: 0.3 }, rarity: 'common', desc: 'HP 30% 회복' },
  { id: 'speed_boost', name: '속도 부스트', icon: '💨', effect: { spdMul: 1.5, duration: 15 }, rarity: 'common', desc: '15초 속도 1.5배' },
  { id: 'shield', name: '보호막', icon: '🔰', effect: { shield: 200 }, rarity: 'uncommon', desc: '보호막 200' },
  { id: 'weapon_boost', name: '무기 강화', icon: '⚔️⬆️', effect: { atkMul: 1.3, duration: 30 }, rarity: 'uncommon', desc: '30초 ATK 1.3배' },
  { id: 'gold_100', name: '골드 주머니', icon: '💰', effect: { gold: 100 }, rarity: 'common', desc: '+100G' },
  { id: 'gold_500', name: '골드 상자', icon: '💰📦', effect: { gold: 500 }, rarity: 'uncommon', desc: '+500G' },
  { id: 'diamond_3', name: '다이아 조각', icon: '💎', effect: { diamonds: 3 }, rarity: 'rare', desc: '+3💎' },
  { id: 'invis_potion', name: '투명 물약', icon: '👻🧪', effect: { invisible: true, duration: 10 }, rarity: 'rare', desc: '10초 투명' },
  { id: 'trap', name: '함정', icon: '🪤', effect: { placeable: true, dmg: 150 }, rarity: 'uncommon', desc: '설치 가능, 밟으면 150 DMG' },
  { id: 'merc_scroll', name: '용병 소환서', icon: '📜⚔️', effect: { summonMerc: true, duration: 30 }, rarity: 'rare', desc: '30초 용병 소환' },
  { id: 'revive_charm', name: '부활 부적', icon: '💫', effect: { revive: true }, rarity: 'epic', desc: '1회 자동 부활 (무료!)' },
];

// 맵 지역 (단일 맵이지만 구역별 특성)
const MAP_ZONES = [
  { id: 'forest', name: '숲', icon: '🌲', bonus: { stealth: true }, desc: '은신 유리, 시야 제한' },
  { id: 'village', name: '마을', icon: '🏘️', bonus: { lootMul: 1.3 }, desc: '아이템 많음' },
  { id: 'mountain', name: '산', icon: '⛰️', bonus: { defMul: 1.1 }, desc: '고지 방어 유리' },
  { id: 'lake', name: '호수', icon: '🏞️', bonus: { healRate: 0.01 }, desc: 'HP 서서히 회복' },
  { id: 'ruins', name: '유적', icon: '🏛️', bonus: { expMul: 1.2 }, desc: 'EXP 보너스' },
  { id: 'volcano', name: '화산', icon: '🌋', bonus: { atkMul: 1.1, dot: 5 }, desc: '공격↑, 지속 데미지' },
  { id: 'center', name: '중앙 광장', icon: '⚔️', bonus: { lootMul: 1.5, danger: true }, desc: '최고 보상, 최고 위험' },
];

// 이벤트 스케줄 생성 (매치 시작 시)
function generateEventSchedule() {
  const schedule = IO_EVENTS.map(e => ({
    ...e,
    triggerTime: e.time + Math.floor(Math.random() * 60) - 30, // ±30초 랜덤
    triggered: false,
  }));
  return schedule.sort((a, b) => a.triggerTime - b.triggerTime);
}

// 현재 시간 기준 발동할 이벤트 체크
function checkEvents(schedule, elapsedSeconds) {
  const triggered = [];
  for (const e of schedule) {
    if (!e.triggered && elapsedSeconds >= e.triggerTime) {
      e.triggered = true;
      triggered.push(e);
    }
  }
  return triggered;
}

function register(io, socket, player) {
  socket.on('io_events_info', () => {
    socket.emit('io_events_info', { events: IO_EVENTS, drops: IO_DROPS, zones: MAP_ZONES });
  });

  // IO 중 아이템 줍기
  socket.on('io_pickup_item', (data) => {
    const item = IO_DROPS.find(d => d.id === data.itemId);
    if (!item) return;
    if (item.effect.gold) player.gold = (player.gold || 0) + item.effect.gold;
    if (item.effect.diamonds) player.diamonds = (player.diamonds || 0) + item.effect.diamonds;
    if (item.effect.heal) { /* Unity 쪽에서 HP 회복 처리 */ }
    socket.emit('io_pickup_result', { ok: true, item, msg: `${item.icon} ${item.name} 획득!` });
  });
}

module.exports = { IO_EVENTS, IO_DROPS, MAP_ZONES, generateEventSchedule, checkEvents, register };

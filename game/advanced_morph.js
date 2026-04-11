// 상위 변신 & 업적 보상 시스템 — v2.58
// 전설급 변신, 업적 달성 보상, 칭호 이펙트, 시즌 보상

// ═══ 전설 변신 (상위 변신) ═══
const LEGENDARY_FORMS = {
  demon_lord: {
    name: '마왕', icon: '👿', rarity: 'legendary',
    requirement: { level: 40, kills: 5000, bossKills: 50 },
    duration: 300, // 5분
    stats: { atk: 50, def: 30, maxHp: 500, critRate: 15, speed: 5 },
    special: 'fear_aura', // 주변 적 공포
    desc: '심연의 힘을 빌려 마왕으로 변신. 주변 적에게 공포 효과.',
    visualEffect: 'dark',
  },
  archangel: {
    name: '대천사', icon: '👼', rarity: 'legendary',
    requirement: { level: 40, healTotal: 10000, questsCompleted: 20 },
    duration: 300,
    stats: { atk: 30, def: 40, maxHp: 800, hpRegen: 20 },
    special: 'holy_aura', // 주변 아군 회복
    desc: '천상의 힘을 빌려 대천사로 변신. 주변 아군 지속 회복.',
    visualEffect: 'holy',
  },
  ancient_dragon: {
    name: '태고용', icon: '🐲', rarity: 'mythic',
    requirement: { level: 50, dragonCount: 5, raidKills: 10 },
    duration: 180, // 3분
    stats: { atk: 80, def: 50, maxHp: 1000, critRate: 20, speed: 8 },
    special: 'dragon_breath', // 화면 전체 광역
    desc: '태고의 용으로 변신! 모든 스탯 폭발적 증가.',
    visualEffect: 'fire',
  },
  shadow_king: {
    name: '그림자 왕', icon: '🌑', rarity: 'legendary',
    requirement: { level: 35, pvpKills: 100, stealth: true },
    duration: 240,
    stats: { atk: 60, critRate: 25, dodge: 20, speed: 10 },
    special: 'shadow_clones', // 분신 소환
    desc: '그림자의 왕으로 변신. 분신 3체 소환.',
    visualEffect: 'dark',
  },
  titan: {
    name: '타이탄', icon: '⛰️', rarity: 'legendary',
    requirement: { level: 45, dungeonClears: 30 },
    duration: 300,
    stats: { def: 80, maxHp: 2000, knockbackImmune: true },
    special: 'earthquake', // 지진 (광역 스턴)
    desc: '거대한 타이탄으로 변신. 압도적인 방어력.',
    visualEffect: 'earth',
  },
};

// ═══ 업적 시스템 ═══
const ACHIEVEMENTS = {
  // 전투 업적
  first_blood:     { name: '첫 번째 피', icon: '🗡️', desc: '첫 몬스터 처치', condition: { kills: 1 }, reward: { gold: 100, title: 'beginner' } },
  hundred_kills:   { name: '백인참', icon: '💀', desc: '몬스터 100마리 처치', condition: { kills: 100 }, reward: { gold: 1000, diamonds: 10 } },
  thousand_kills:  { name: '천인참', icon: '☠️', desc: '몬스터 1,000마리 처치', condition: { kills: 1000 }, reward: { gold: 5000, diamonds: 50, title: 'slayer' } },
  ten_thousand:    { name: '만인참', icon: '🔥', desc: '몬스터 10,000마리 처치', condition: { kills: 10000 }, reward: { gold: 50000, diamonds: 200, title: 'massacre', titleEffect: 'fire' } },
  boss_slayer:     { name: '보스 사냥꾼', icon: '🐉', desc: '보스 10마리 처치', condition: { bossKills: 10 }, reward: { gold: 10000, diamonds: 100, title: 'boss_hunter' } },
  world_boss:      { name: '세계의 수호자', icon: '🌍', desc: '월드 보스 참가', condition: { raidParticipation: 1 }, reward: { gold: 5000, diamonds: 50 } },

  // 탐험 업적
  explorer:        { name: '탐험가', icon: '🗺️', desc: '10개 존 방문', condition: { zonesVisited: 10 }, reward: { gold: 2000, title: 'explorer' } },
  world_traveler:  { name: '세계 여행자', icon: '🌐', desc: '30개 존 방문', condition: { zonesVisited: 30 }, reward: { gold: 10000, diamonds: 100, title: 'world_traveler', titleEffect: 'sparkle' } },
  dungeon_master:  { name: '던전 마스터', icon: '🏰', desc: '던전 20회 클리어', condition: { dungeonClears: 20 }, reward: { gold: 15000, diamonds: 150, title: 'dungeon_master' } },

  // 성장 업적
  level_10:        { name: '성장의 시작', icon: '📈', desc: 'Lv.10 달성', condition: { level: 10 }, reward: { gold: 500 } },
  level_25:        { name: '숙련 모험가', icon: '⚔️', desc: 'Lv.25 달성', condition: { level: 25 }, reward: { gold: 3000, diamonds: 30 } },
  level_50:        { name: '전설의 경지', icon: '👑', desc: 'Lv.50 달성', condition: { level: 50 }, reward: { gold: 30000, diamonds: 300, title: 'legend', titleEffect: 'gold' } },
  first_enchant:   { name: '강화의 맛', icon: '🔨', desc: '장비 +5 강화', condition: { enchantMax: 5 }, reward: { gold: 1000 } },
  master_enchant:  { name: '강화 달인', icon: '⚡', desc: '장비 +12 강화', condition: { enchantMax: 12 }, reward: { gold: 20000, diamonds: 200, title: 'enchant_master', titleEffect: 'lightning' } },

  // 사교 업적
  guild_member:    { name: '혈맹의 일원', icon: '🤝', desc: '혈맹 가입', condition: { joinClan: 1 }, reward: { gold: 1000 } },
  pvp_warrior:     { name: 'PvP 전사', icon: '⚔️', desc: 'PvP 10승', condition: { pvpWins: 10 }, reward: { gold: 5000, title: 'pvp_fighter' } },
  arena_master:    { name: '투기장 마스터', icon: '🏆', desc: '아레나 마스터 티어', condition: { arenaTier: 'master' }, reward: { gold: 50000, diamonds: 500, title: 'arena_master', titleEffect: 'fire' } },

  // 수집 업적
  dragon_tamer:    { name: '용 조련사', icon: '🐲', desc: '드래곤 3마리 보유', condition: { dragonCount: 3 }, reward: { gold: 10000, diamonds: 100, title: 'dragon_tamer' } },
  all_dragons:     { name: '용왕', icon: '👑', desc: '드래곤 8종 보유', condition: { dragonCount: 8 }, reward: { gold: 100000, diamonds: 1000, title: 'dragon_king', titleEffect: 'fire' } },
  homeowner:       { name: '집주인', icon: '🏠', desc: '집 건설', condition: { hasHouse: true }, reward: { gold: 2000 } },
  castle_lord:     { name: '성주', icon: '🏯', desc: '성 업그레이드', condition: { houseTier: 'castle' }, reward: { gold: 50000, diamonds: 300, title: 'castle_lord', titleEffect: 'gold' } },

  // 스토리 업적
  story_ch1:       { name: '불의 시련', icon: '🔥', desc: '1막 클리어', condition: { storyChapter: 1 }, reward: { gold: 5000, diamonds: 50 } },
  story_ch2:       { name: '얼음의 비밀', icon: '❄️', desc: '2막 클리어', condition: { storyChapter: 2 }, reward: { gold: 10000, diamonds: 100 } },
  story_complete:  { name: '세계의 구원자', icon: '✨', desc: '메인 스토리 완료', condition: { storyComplete: true }, reward: { gold: 100000, diamonds: 2000, title: 'world_savior', titleEffect: 'holy' } },

  // 특수 업적
  battle_royale:   { name: '최후의 생존자', icon: '🏟️', desc: '배틀로얄 우승', condition: { brWins: 1 }, reward: { gold: 20000, diamonds: 200, title: 'last_standing', titleEffect: 'fire' } },
  race_champion:   { name: '하늘의 제왕', icon: '🏁', desc: '드래곤 레이스 우승', condition: { raceWins: 1 }, reward: { gold: 10000, diamonds: 100, title: 'sky_champion' } },
  millionaire:     { name: '백만장자', icon: '💰', desc: '골드 100만 보유', condition: { gold: 1000000 }, reward: { diamonds: 500, title: 'rich', titleEffect: 'gold' } },
};

// ═══ 칭호 이펙트 정의 ═══
const TITLE_EFFECTS = {
  fire:      { name: '화염 칭호', color: '#ff4400', particleType: 'ember', desc: '이름 주변에 불꽃 이펙트' },
  ice:       { name: '빙결 칭호', color: '#66ddff', particleType: 'snowflake', desc: '이름 주변에 눈꽃 이펙트' },
  lightning: { name: '뇌전 칭호', color: '#ffdd00', particleType: 'spark', desc: '이름 주변에 전기 이펙트' },
  dark:      { name: '암흑 칭호', color: '#9933ff', particleType: 'shadow', desc: '이름 주변에 어둠 이펙트' },
  holy:      { name: '신성 칭호', color: '#ffd700', particleType: 'halo', desc: '이름 주변에 빛 후광' },
  gold:      { name: '황금 칭호', color: '#ffd700', particleType: 'coin', desc: '이름이 금빛으로 빛남' },
  sparkle:   { name: '반짝이 칭호', color: '#ffffff', particleType: 'star', desc: '이름 주변에 별빛' },
};

// ═══ 시즌 패스 보상 ═══
const SEASON_PASS_REWARDS = [
  { level: 1,  free: { gold: 500 },              premium: { gold: 1000, diamonds: 10 } },
  { level: 5,  free: { gold: 1000 },             premium: { gold: 2000, diamonds: 20, item: 'pot_hp_l' } },
  { level: 10, free: { gold: 2000, item: 'mat_herb' }, premium: { gold: 5000, diamonds: 50, title: 'season_traveler' } },
  { level: 15, free: { gold: 3000 },             premium: { gold: 8000, diamonds: 80 } },
  { level: 20, free: { gold: 5000 },             premium: { gold: 15000, diamonds: 100, item: 'equip_season_ring' } },
  { level: 25, free: { gold: 8000 },             premium: { gold: 20000, diamonds: 150 } },
  { level: 30, free: { gold: 10000, diamonds: 50 }, premium: { gold: 30000, diamonds: 200, title: 'season_champion', titleEffect: 'sparkle' } },
  { level: 40, free: { gold: 20000, diamonds: 100 }, premium: { gold: 50000, diamonds: 500, morph: 'demon_lord' } },
  { level: 50, free: { gold: 50000, diamonds: 200 }, premium: { gold: 100000, diamonds: 1000, title: 'season_legend', titleEffect: 'gold', morph: 'ancient_dragon' } },
];

// ═══ 업적 체크 ═══
function checkAchievements(player) {
  if (!player._achievements) player._achievements = {};
  const newlyCompleted = [];

  for (const [achId, ach] of Object.entries(ACHIEVEMENTS)) {
    if (player._achievements[achId]) continue; // 이미 달성

    const cond = ach.condition;
    let met = true;

    if (cond.kills && (player.killCount || 0) < cond.kills) met = false;
    if (cond.bossKills && (player.bossKillCount || 0) < cond.bossKills) met = false;
    if (cond.level && (player.level || 1) < cond.level) met = false;
    if (cond.zonesVisited && (player.zonesVisited ? Object.keys(player.zonesVisited).length : 0) < cond.zonesVisited) met = false;
    if (cond.dungeonClears && (player.dungeonClears || 0) < cond.dungeonClears) met = false;
    if (cond.enchantMax && (player.maxEnchantLevel || 0) < cond.enchantMax) met = false;
    if (cond.joinClan && !player.clanId) met = false;
    if (cond.pvpWins && (player.pvpWins || 0) < cond.pvpWins) met = false;
    if (cond.dragonCount) {
      const dc = player.dragons ? Object.keys(player.dragons).length : 0;
      if (dc < cond.dragonCount) met = false;
    }
    if (cond.hasHouse && !player._house) met = false;
    if (cond.houseTier && (!player._house || player._house.tier !== cond.houseTier)) met = false;
    if (cond.storyChapter) {
      const sp = player._storyProgress;
      if (!sp || sp.currentChapter < cond.storyChapter) met = false;
    }
    if (cond.storyComplete && (!player._storyProgress || !player._storyProgress.completed)) met = false;
    if (cond.gold && (player.gold || 0) < cond.gold) met = false;
    if (cond.brWins && (player.brWins || 0) < cond.brWins) met = false;
    if (cond.raceWins && (player.raceWins || 0) < cond.raceWins) met = false;

    if (met) {
      player._achievements[achId] = { completedAt: Date.now() };

      // 보상 지급
      const r = ach.reward;
      if (r.gold) player.gold = (player.gold || 0) + r.gold;
      if (r.diamonds) player.diamonds = (player.diamonds || 0) + r.diamonds;
      if (r.title) player.title = r.title;

      newlyCompleted.push({
        id: achId,
        name: ach.name,
        icon: ach.icon,
        desc: ach.desc,
        reward: r,
      });
    }
  }

  return newlyCompleted;
}

// 업적 현황 조회
function getAchievementStatus(player) {
  if (!player._achievements) player._achievements = {};
  const list = Object.entries(ACHIEVEMENTS).map(([id, ach]) => ({
    id,
    name: ach.name,
    icon: ach.icon,
    desc: ach.desc,
    completed: !!player._achievements[id],
    completedAt: player._achievements[id]?.completedAt,
    reward: ach.reward,
  }));

  const completed = list.filter(a => a.completed).length;
  return { achievements: list, completed, total: list.length, pct: Math.floor(completed / list.length * 100) };
}

// 전설 변신 체크
function canLegendaryMorph(player, morphId) {
  const form = LEGENDARY_FORMS[morphId];
  if (!form) return { can: false, msg: '존재하지 않는 변신' };
  const req = form.requirement;
  if (req.level && (player.level || 1) < req.level) return { can: false, msg: 'Lv.' + req.level + ' 필요' };
  if (req.kills && (player.killCount || 0) < req.kills) return { can: false, msg: '처치 수 부족 (' + (player.killCount||0) + '/' + req.kills + ')' };
  if (req.bossKills && (player.bossKillCount || 0) < req.bossKills) return { can: false, msg: '보스 처치 수 부족' };
  return { can: true };
}

function activateLegendaryMorph(player, morphId) {
  const check = canLegendaryMorph(player, morphId);
  if (!check.can) return { success: false, msg: check.msg };

  const form = LEGENDARY_FORMS[morphId];
  player._legendaryMorph = {
    id: morphId,
    expiresAt: Date.now() + form.duration * 1000,
    stats: { ...form.stats },
  };

  return {
    success: true,
    msg: form.icon + ' ' + form.name + '(으)로 변신! (' + (form.duration/60) + '분)',
    form: { name: form.name, icon: form.icon, stats: form.stats, visualEffect: form.visualEffect, duration: form.duration },
  };
}

// 소켓 핸들러
function registerAdvancedHandlers(socket, playerId, players, io) {
  // 업적 현황
  socket.on('achievement_status', () => {
    const p = players[playerId];
    if (!p) return;
    // 업적 체크 실행
    const newAchs = checkAchievements(p);
    if (newAchs.length > 0) {
      for (const ach of newAchs) {
        socket.emit('achievement_unlocked', ach);
        io.emit('server_msg', { msg: '🏆 ' + (p.displayName||p.className) + '님이 업적 달성: ' + ach.icon + ' ' + ach.name, type: 'rare' });
      }
    }
    socket.emit('achievement_status', getAchievementStatus(p));
  });

  // 전설 변신 목록
  socket.on('legendary_morph_list', () => {
    const p = players[playerId];
    if (!p) return;
    const list = Object.entries(LEGENDARY_FORMS).map(([id, f]) => ({
      id, name: f.name, icon: f.icon, rarity: f.rarity,
      desc: f.desc, duration: f.duration,
      stats: f.stats, visualEffect: f.visualEffect,
      canUse: canLegendaryMorph(p, id).can,
      requirement: f.requirement,
    }));
    socket.emit('legendary_morph_list', { forms: list, activeMorph: p._legendaryMorph || null });
  });

  // 전설 변신 발동
  socket.on('legendary_morph', (morphId) => {
    const p = players[playerId];
    if (!p) return;
    const result = activateLegendaryMorph(p, morphId);
    socket.emit('legendary_morph_result', result);
    if (result.success) {
      io.emit('server_msg', { msg: result.form.icon + ' ' + (p.displayName||p.className) + '님이 ' + result.form.name + '(으)로 변신!', type: 'boss' });
    }
  });

  // 시즌 패스 현황
  socket.on('season_pass_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('season_pass_status', {
      level: p.level || 1,
      premium: p.seasonPassPremium || false,
      rewards: SEASON_PASS_REWARDS,
      claimed: p._seasonClaimed || {},
    });
  });
}

module.exports = {
  LEGENDARY_FORMS,
  ACHIEVEMENTS,
  TITLE_EFFECTS,
  SEASON_PASS_REWARDS,
  checkAchievements,
  getAchievementStatus,
  canLegendaryMorph,
  activateLegendaryMorph,
  registerAdvancedHandlers,
};

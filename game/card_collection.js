// ============================================
// 도감 + 업적 + 칭호 + 스토리 시스템 (중독성 콘텐츠)
// ============================================

// ═══ 1. 용병 도감 (수집률 → 보상) ═══
const CODEX_MILESTONES = [
  { count: 5, name: '초보 수집가', reward: { gold: 1000 }, icon: '📖' },
  { count: 10, name: '수집가', reward: { gold: 3000, diamonds: 5 }, icon: '📖⭐' },
  { count: 20, name: '열성 수집가', reward: { gold: 8000, diamonds: 15 }, icon: '📖🌟' },
  { count: 30, name: '마스터 수집가', reward: { gold: 15000, diamonds: 30, card: 'epic' }, icon: '📖💎' },
  { count: 50, name: '전설의 수집가', reward: { gold: 30000, diamonds: 60, card: 'legend' }, icon: '📖👑' },
  { count: 75, name: '만물의 수집가', reward: { gold: 60000, diamonds: 100, card: 'myth' }, icon: '📖🌟👑' },
];

// ═══ 2. 업적 시스템 ═══
const ACHIEVEMENTS = [
  // IO 업적
  { id: 'ach_first_kill', name: '첫 킬', icon: '⚔️', condition: { ioKills: 1 }, reward: { gold: 500 }, desc: 'IO에서 첫 처치' },
  { id: 'ach_10_kills', name: '10킬', icon: '⚔️🔥', condition: { ioKills: 10 }, reward: { gold: 3000, diamonds: 5 }, desc: '누적 10킬' },
  { id: 'ach_100_kills', name: '100킬', icon: '⚔️💀', condition: { ioKills: 100 }, reward: { gold: 15000, diamonds: 30 }, desc: '킬 마스터' },
  { id: 'ach_first_win', name: '첫 치킨 디너', icon: '🏆', condition: { ioWins: 1 }, reward: { gold: 5000, diamonds: 20, title: '치킨 디너' }, desc: 'IO 1위!' },
  { id: 'ach_10_wins', name: '10회 우승', icon: '🏆🌟', condition: { ioWins: 10 }, reward: { gold: 30000, diamonds: 100, title: '챔피언' }, desc: '10회 1위' },

  // 카드 업적
  { id: 'ach_first_summon', name: '첫 소환', icon: '📜', condition: { summons: 1 }, reward: { gold: 500 }, desc: '첫 가챠' },
  { id: 'ach_legend_card', name: '전설 획득', icon: '🌟', condition: { legendCards: 1 }, reward: { gold: 5000, diamonds: 15 }, desc: '전설 카드 획득!' },
  { id: 'ach_myth_card', name: '신화 획득', icon: '👑', condition: { mythCards: 1 }, reward: { gold: 20000, diamonds: 50, title: '신화의 소유자' }, desc: '신화 카드!' },
  { id: 'ach_hidden_card', name: '히든 카드', icon: '🌟✨', condition: { hiddenCards: 1 }, reward: { gold: 10000, diamonds: 30 }, desc: '히든 조합 발견' },
  { id: 'ach_first_evolve', name: '첫 진화', icon: '🔥', condition: { evolves: 1 }, reward: { gold: 2000 }, desc: '진화 성공' },
  { id: 'ach_max_stars', name: '★5 달성', icon: '⭐⭐⭐⭐⭐', condition: { maxStars: 5 }, reward: { gold: 20000, diamonds: 40 }, desc: '최고 진급' },

  // 기지 업적
  { id: 'ach_first_fortress', name: '첫 건설', icon: '🏰', condition: { buildings: 1 }, reward: { gold: 1000 }, desc: '기지 건설 시작' },
  { id: 'ach_castle', name: '왕성 달성', icon: '🏰👑', condition: { fortressLevel: 5 }, reward: { gold: 30000, diamonds: 50, title: '성주' }, desc: '왕성까지!' },
  { id: 'ach_raid_win', name: '첫 공략', icon: '⚔️🏰', condition: { raidWins: 1 }, reward: { gold: 2000 }, desc: '첫 성 공략 성공' },

  // PvP 업적
  { id: 'ach_pvp_10', name: 'PvP 10승', icon: '⚔️🏅', condition: { pvpWins: 10 }, reward: { gold: 5000, diamonds: 10 }, desc: '카드 대전 10승' },
  { id: 'ach_pvp_master', name: 'PvP 마스터', icon: '⚔️👑', condition: { pvpRank: 'master' }, reward: { gold: 20000, diamonds: 50, title: 'PvP 마스터' }, desc: '마스터 등급' },

  // 길드 업적
  { id: 'ach_guild_create', name: '길드 창설', icon: '👥', condition: { hasGuild: true }, reward: { gold: 3000 }, desc: '길드를 만들다' },
  { id: 'ach_guild_raid', name: '길드 보스', icon: '🐲', condition: { guildRaidWins: 1 }, reward: { gold: 5000, diamonds: 10 }, desc: '길드 레이드 클리어' },

  // 기타
  { id: 'ach_rich', name: '부자', icon: '💰', condition: { goldTotal: 100000 }, reward: { diamonds: 20, title: '부자' }, desc: '누적 골드 10만' },
  { id: 'ach_collector', name: '풀 컬렉션', icon: '📖👑', condition: { codexCount: 50 }, reward: { gold: 50000, diamonds: 100, title: '수집의 왕' }, desc: '도감 50종' },
];

// ═══ 3. 칭호 시스템 ═══
const TITLES = [
  { id: 'title_newbie', name: '초심자', icon: '🌱', source: '기본 칭호' },
  { id: 'title_chicken', name: '치킨 디너', icon: '🍗🏆', source: 'IO 1위' },
  { id: 'title_champion', name: '챔피언', icon: '🏆🌟', source: 'IO 10회 우승' },
  { id: 'title_myth_owner', name: '신화의 소유자', icon: '👑✨', source: '신화 카드 획득' },
  { id: 'title_castle_lord', name: '성주', icon: '🏰👑', source: '왕성 달성' },
  { id: 'title_pvp_master', name: 'PvP 마스터', icon: '⚔️👑', source: 'PvP 마스터 등급' },
  { id: 'title_collector', name: '수집의 왕', icon: '📖👑', source: '도감 50종' },
  { id: 'title_rich', name: '부자', icon: '💰👑', source: '누적 골드 10만' },
  { id: 'title_season_legend', name: '시즌 전설', icon: '👑🌟', source: '시즌 전설 등급' },
  { id: 'title_guild_leader', name: '길드장', icon: '👥👑', source: '길드 창설' },
];

// ═══ 4. 용병 스토리 (카드별 짧은 배경 이야기) ═══
const MERC_STORIES = {
  '견습 전사': { chapter1: '작은 마을의 농부 아들이었다. 어느 날 마을이 습격당하고, 검을 들었다.', chapter2: '수련의 길을 걷기 시작한 청년. 아직 서투르지만 눈빛은 단호하다.' },
  '정예 전사': { chapter1: '수많은 전투를 겪으며 강해진 전사. 이제 후배들의 본보기가 된다.', chapter2: '그의 검에는 수십 번의 전투의 흔적이 새겨져 있다.' },
  '영웅 검사': { chapter1: '왕국을 구한 영웅. 백성들이 그의 이름을 기억한다.', chapter2: '하지만 그가 진정 지키고 싶었던 건, 고향의 작은 마을이었다.' },
  '견습 궁수': { chapter1: '숲에서 자란 엘프 소녀. 바람의 소리를 듣고 화살을 쏜다.', chapter2: '아직 세상을 모르지만, 활시위를 당기는 손은 흔들리지 않는다.' },
  '견습 마법사': { chapter1: '탑에서 홀로 수련하던 소년. 처음으로 불꽃을 만들어낸 날의 기쁨을 잊지 못한다.', chapter2: '마법은 위험하다. 하지만 그는 그 위험을 안고 앞으로 나아간다.' },
  '전설의 검성': { chapter1: '백 번의 전투에서 살아남은 자. 그의 검은 이미 전설이 되었다.', chapter2: '어느 날 그가 사라졌다. 사람들은 말한다 — 그는 더 강한 적을 찾아 떠났다고.' },
};

function getCodexCount(player) {
  const unique = new Set((player.cards || []).map(c => (c.name || '').replace(/[★+\d]+$/, '').trim()));
  return unique.size;
}

function checkAchievements(player) {
  const unlocked = player.achievements || [];
  const newlyUnlocked = [];

  for (const ach of ACHIEVEMENTS) {
    if (unlocked.includes(ach.id)) continue;
    let met = false;
    const c = ach.condition;
    if (c.ioKills && (player.totalIoKills || 0) >= c.ioKills) met = true;
    if (c.ioWins && (player.totalIoWins || 0) >= c.ioWins) met = true;
    if (c.summons && (player.totalSummons || 0) >= c.summons) met = true;
    if (c.legendCards && (player.cards || []).some(cd => cd.grade === 'legend')) met = true;
    if (c.mythCards && (player.cards || []).some(cd => cd.grade === 'myth')) met = true;
    if (c.hiddenCards && (player.cards || []).some(cd => cd.hidden)) met = true;
    if (c.evolves && (player.totalEvolves || 0) >= c.evolves) met = true;
    if (c.maxStars && (player.cards || []).some(cd => (cd.stars || 0) >= c.maxStars)) met = true;
    if (c.buildings && Object.keys((player.fortress?.buildings) || {}).length >= c.buildings) met = true;
    if (c.fortressLevel && (player.fortress?.level || 0) >= c.fortressLevel) met = true;
    if (c.raidWins && (player.totalRaidWins || 0) >= c.raidWins) met = true;
    if (c.pvpWins && (player.totalPvpWins || 0) >= c.pvpWins) met = true;
    if (c.hasGuild && player.guild) met = true;
    if (c.guildRaidWins && (player.totalGuildRaidWins || 0) >= c.guildRaidWins) met = true;
    if (c.goldTotal && (player.totalGoldEarned || 0) >= c.goldTotal) met = true;
    if (c.codexCount && getCodexCount(player) >= c.codexCount) met = true;

    if (met) {
      unlocked.push(ach.id);
      newlyUnlocked.push(ach);
      if (ach.reward.gold) player.gold = (player.gold || 0) + ach.reward.gold;
      if (ach.reward.diamonds) player.diamonds = (player.diamonds || 0) + ach.reward.diamonds;
      if (ach.reward.title) {
        player.titles = player.titles || [];
        if (!player.titles.includes(ach.reward.title)) player.titles.push(ach.reward.title);
      }
    }
  }
  player.achievements = unlocked;
  return newlyUnlocked;
}

function register(io, socket, player) {
  // 도감
  socket.on('codex_info', () => {
    const count = getCodexCount(player);
    const milestone = [...CODEX_MILESTONES].reverse().find(m => count >= m.count);
    const next = CODEX_MILESTONES.find(m => count < m.count);
    socket.emit('codex_info', { count, milestone, next, milestones: CODEX_MILESTONES });
  });

  // 업적
  socket.on('achievements_check', () => {
    const newlyUnlocked = checkAchievements(player);
    socket.emit('achievements_result', {
      unlocked: player.achievements || [],
      newlyUnlocked,
      all: ACHIEVEMENTS,
    });
    if (newlyUnlocked.length > 0) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // 칭호
  socket.on('titles_info', () => {
    socket.emit('titles_info', { owned: player.titles || [], equipped: player.equippedTitle || null, all: TITLES });
  });
  socket.on('title_equip', (data) => {
    if ((player.titles || []).includes(data.title)) {
      player.equippedTitle = data.title;
      socket.emit('title_equip_result', { ok: true, title: data.title });
    }
  });

  // 스토리
  socket.on('merc_story', (data) => {
    const name = (data.cardName || '').replace(/[★+\d]+$/, '').trim();
    const story = MERC_STORIES[name];
    socket.emit('merc_story', { name, story: story || null });
  });
}

module.exports = { CODEX_MILESTONES, ACHIEVEMENTS, TITLES, MERC_STORIES, getCodexCount, checkAchievements, register };

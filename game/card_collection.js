// ============================================
// 도감 + 업적 + 칭호 + 스토리 + 앨범 시스템 (중독성 콘텐츠)
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
  // ── IO 업적 ──
  { id: 'ach_first_kill', name: '첫 킬', icon: '⚔️', condition: { ioKills: 1 }, reward: { gold: 500 }, desc: 'IO에서 첫 처치' },
  { id: 'ach_10_kills', name: '10킬', icon: '⚔️🔥', condition: { ioKills: 10 }, reward: { gold: 3000, diamonds: 5 }, desc: '누적 10킬', chain: 'ach_100_kills' },
  { id: 'ach_100_kills', name: '100킬', icon: '⚔️💀', condition: { ioKills: 100 }, reward: { gold: 15000, diamonds: 30 }, desc: '킬 마스터', requires: 'ach_10_kills', tier: 'gold' },
  { id: 'ach_first_win', name: '첫 치킨 디너', icon: '🏆', condition: { ioWins: 1 }, reward: { gold: 5000, diamonds: 20, title: '치킨 디너' }, desc: 'IO 1위!', chain: 'ach_10_wins' },
  { id: 'ach_10_wins', name: '10회 우승', icon: '🏆🌟', condition: { ioWins: 10 }, reward: { gold: 30000, diamonds: 100, title: '챔피언' }, desc: '10회 1위', requires: 'ach_first_win', tier: 'gold' },

  // ── 카드 업적 ──
  { id: 'ach_first_summon', name: '첫 소환', icon: '📜', condition: { summons: 1 }, reward: { gold: 500 }, desc: '첫 가챠' },
  { id: 'ach_legend_card', name: '전설 획득', icon: '🌟', condition: { legendCards: 1 }, reward: { gold: 5000, diamonds: 15 }, desc: '전설 카드 획득!' },
  { id: 'ach_myth_card', name: '신화 획득', icon: '👑', condition: { mythCards: 1 }, reward: { gold: 20000, diamonds: 50, title: '신화의 소유자' }, desc: '신화 카드!' },
  { id: 'ach_hidden_card', name: '히든 카드', icon: '🌟✨', condition: { hiddenCards: 1 }, reward: { gold: 10000, diamonds: 30 }, desc: '히든 조합 발견' },
  { id: 'ach_first_evolve', name: '첫 진화', icon: '🔥', condition: { evolves: 1 }, reward: { gold: 2000 }, desc: '진화 성공' },
  { id: 'ach_max_stars', name: '★5 달성', icon: '⭐⭐⭐⭐⭐', condition: { maxStars: 5 }, reward: { gold: 20000, diamonds: 40 }, desc: '최고 진급' },

  // ── 기지 업적 ──
  { id: 'ach_first_fortress', name: '첫 건설', icon: '🏰', condition: { buildings: 1 }, reward: { gold: 1000 }, desc: '기지 건설 시작' },
  { id: 'ach_castle', name: '왕성 달성', icon: '🏰👑', condition: { fortressLevel: 5 }, reward: { gold: 30000, diamonds: 50, title: '성주' }, desc: '왕성까지!' },
  { id: 'ach_raid_win', name: '첫 공략', icon: '⚔️🏰', condition: { raidWins: 1 }, reward: { gold: 2000 }, desc: '첫 성 공략 성공' },

  // ── PvP 업적 ──
  { id: 'ach_pvp_10', name: 'PvP 10승', icon: '⚔️🏅', condition: { pvpWins: 10 }, reward: { gold: 5000, diamonds: 10 }, desc: '카드 대전 10승' },
  { id: 'ach_pvp_master', name: 'PvP 마스터', icon: '⚔️👑', condition: { pvpRank: 'master' }, reward: { gold: 20000, diamonds: 50, title: 'PvP 마스터' }, desc: '마스터 등급' },

  // ── 길드 업적 ──
  { id: 'ach_guild_create', name: '길드 창설', icon: '👥', condition: { hasGuild: true }, reward: { gold: 3000 }, desc: '길드를 만들다' },
  { id: 'ach_guild_raid', name: '길드 보스', icon: '🐲', condition: { guildRaidWins: 1 }, reward: { gold: 5000, diamonds: 10 }, desc: '길드 레이드 클리어' },

  // ── 기타 ──
  { id: 'ach_rich', name: '부자', icon: '💰', condition: { goldTotal: 100000 }, reward: { diamonds: 20, title: '부자' }, desc: '누적 골드 10만' },
  { id: 'ach_collector', name: '풀 컬렉션', icon: '📖👑', condition: { codexCount: 50 }, reward: { gold: 50000, diamonds: 100, title: '수집의 왕' }, desc: '도감 50종' },

  // ══════════════════════════════════════
  // ── 추가 업적 (30개) ──
  // ══════════════════════════════════════

  // ── 도전의 탑 ──
  { id: 'ach_tower_30', name: '탑 30층', icon: '🗼', condition: { towerFloor: 30 }, reward: { gold: 5000, diamonds: 15 }, desc: '도전의 탑 30층', chain: 'ach_tower_50' },
  { id: 'ach_tower_50', name: '탑 50층', icon: '🗼⭐', condition: { towerFloor: 50 }, reward: { gold: 15000, diamonds: 40, title: '탑의 도전자' }, desc: '도전의 탑 50층', requires: 'ach_tower_30', tier: 'silver', chain: 'ach_tower_100' },
  { id: 'ach_tower_100', name: '탑 정복', icon: '🗼👑', condition: { towerFloor: 100 }, reward: { gold: 50000, diamonds: 100, title: '탑의 정복자', card: 'myth' }, desc: '최종 정복!', requires: 'ach_tower_50', tier: 'gold' },

  // ── 탐험 ──
  { id: 'ach_exp_10', name: '탐험 10회', icon: '🗺️', condition: { expeditions: 10 }, reward: { gold: 3000, diamonds: 5 }, desc: '탐험 10회 완료', chain: 'ach_exp_100' },
  { id: 'ach_exp_100', name: '탐험 100회', icon: '🗺️⭐', condition: { expeditions: 100 }, reward: { gold: 20000, diamonds: 30, title: '탐험가' }, desc: '탐험 100회 완료', requires: 'ach_exp_10', tier: 'gold' },

  // ── 거래 ──
  { id: 'ach_trade_10', name: '10회 거래', icon: '💰', condition: { trades: 10 }, reward: { gold: 5000 }, desc: '거래소에서 10회 거래', chain: 'ach_trade_king' },
  { id: 'ach_trade_king', name: '무역왕', icon: '💰👑', condition: { trades: 100 }, reward: { gold: 30000, diamonds: 50, title: '무역왕' }, desc: '거래소 100회 거래', requires: 'ach_trade_10', tier: 'gold' },

  // ── PK ──
  { id: 'ach_pk_first', name: '첫 PK', icon: '⚔️🔴', condition: { pkKills: 1 }, reward: { gold: 1000 }, desc: '첫 PK 처치', chain: 'ach_pk_50' },
  { id: 'ach_pk_50', name: 'PK 50킬', icon: '⚔️💀', condition: { pkKills: 50 }, reward: { gold: 15000, diamonds: 30, title: '학살자' }, desc: 'PK 50킬 달성', requires: 'ach_pk_first', tier: 'gold' },
  { id: 'ach_bounty', name: '현상금 사냥꾼', icon: '🎯', condition: { bountiesClaimed: 5 }, reward: { gold: 10000, diamonds: 20 }, desc: '현상금 5회 수령' },

  // ── 인챈트 ──
  { id: 'ach_enchant_legend', name: '전설 인챈트', icon: '✨👑', condition: { legendEnchants: 1 }, reward: { gold: 10000, diamonds: 20 }, desc: '전설 인챈트 성공' },
  { id: 'ach_enchant_3', name: '풀 인챈트', icon: '✨✨✨', condition: { fullEnchant: true }, reward: { gold: 15000, diamonds: 30 }, desc: '한 카드에 3슬롯 모두 인챈트' },

  // ── 각성 ──
  { id: 'ach_awaken_first', name: '첫 각성', icon: '🌟', condition: { awakenings: 1 }, reward: { gold: 20000, diamonds: 50 }, desc: '첫 각성 성공', chain: 'ach_awaken_5' },
  { id: 'ach_awaken_5', name: '5종 각성', icon: '🌟🌟🌟🌟🌟', condition: { awakenings: 5 }, reward: { gold: 50000, diamonds: 100, title: '각성자' }, desc: '5종 각성 달성', requires: 'ach_awaken_first', tier: 'gold' },

  // ── 시즌 ──
  { id: 'ach_season_gold', name: '시즌 골드', icon: '🏅', condition: { seasonRank: 'gold' }, reward: { gold: 10000 }, desc: '시즌 골드 등급 달성', chain: 'ach_season_legend' },
  { id: 'ach_season_legend', name: '시즌 전설', icon: '👑🌟', condition: { seasonRank: 'legend' }, reward: { gold: 100000, diamonds: 200, title: '시즌 전설' }, desc: '시즌 전설 등급 달성', requires: 'ach_season_gold', tier: 'gold' },

  // ── 소셜 ──
  { id: 'ach_friends_5', name: '5명의 친구', icon: '👥', condition: { friends: 5 }, reward: { gold: 3000 }, desc: '친구 5명 등록' },
  { id: 'ach_guild_max', name: '길드 만렙', icon: '👥👑', condition: { guildLevel: 5 }, reward: { gold: 30000, diamonds: 50 }, desc: '길드 레벨 최대' },

  // ── 요새 공방 ──
  { id: 'ach_raid_10', name: '10회 공략', icon: '⚔️🏰', condition: { raidWins: 10 }, reward: { gold: 10000, diamonds: 15 }, desc: '성 공략 10회 성공' },
  { id: 'ach_defense_10', name: '10회 방어', icon: '🛡️🏰', condition: { defenseWins: 10 }, reward: { gold: 10000, diamonds: 15 }, desc: '성 방어 10회 성공' },

  // ── 보스 레이드 ──
  { id: 'ach_boss_first', name: '보스 참여', icon: '🐲', condition: { bossRaidParticipation: 1 }, reward: { gold: 5000 }, desc: '보스 레이드 첫 참여', chain: 'ach_boss_top1' },
  { id: 'ach_boss_top1', name: '보스 최고 기여', icon: '🐲👑', condition: { bossRaidTop1: 1 }, reward: { gold: 20000, diamonds: 50, title: '보스 헌터' }, desc: '보스 레이드 최고 기여', requires: 'ach_boss_first', tier: 'gold' },

  // ── 농장 ──
  { id: 'ach_farm_100k', name: '농장 10만G', icon: '🌿💰', condition: { farmGold: 100000 }, reward: { gold: 10000, diamonds: 20 }, desc: '농장으로 누적 10만 골드' },

  // ── 카드 마일스톤 ──
  { id: 'ach_cards_20', name: '카드 20장', icon: '🃏', condition: { totalCards: 20 }, reward: { gold: 5000 }, desc: '카드 20장 보유', chain: 'ach_cards_50' },
  { id: 'ach_cards_50', name: '카드 50장', icon: '🃏⭐', condition: { totalCards: 50 }, reward: { gold: 15000, diamonds: 20 }, desc: '카드 50장 보유', requires: 'ach_cards_20', tier: 'silver', chain: 'ach_cards_100' },
  { id: 'ach_cards_100', name: '카드 100장', icon: '🃏👑', condition: { totalCards: 100 }, reward: { gold: 50000, diamonds: 50, title: '카드 마스터' }, desc: '카드 100장 보유', requires: 'ach_cards_50', tier: 'gold' },

  // ── 콤보/행동 ──
  { id: 'ach_combo_first', name: '첫 콤보', icon: '🔗', condition: { combos: 1 }, reward: { gold: 2000 }, desc: '첫 콤보 발동' },
  { id: 'ach_action_100', name: '행동 카드 100회', icon: '🎴', condition: { actionsPlayed: 100 }, reward: { gold: 10000, diamonds: 15 }, desc: '행동 카드 100회 사용' },

  // ── 복권 ──
  { id: 'ach_lottery_myth', name: '복권 대상', icon: '🎰👑', condition: { lotteryMyth: 1 }, reward: { gold: 50000, title: '행운의 주인공' }, desc: '복권에서 대상 당첨!' },

  // ── 종합 ──
  { id: 'ach_all_albums', name: '앨범 마스터', icon: '📖🌈', condition: { allAlbums: true }, reward: { gold: 100000, diamonds: 150, title: '만물박사' }, desc: '모든 앨범 완성' },
];

// ── 업적 체인 정보 ──
// requires: 선행 업적 ID (해당 업적 완료 전까지 숨김)
// chain: 다음 단계 업적 ID (이 업적 완료 시 다음 단계가 공개)
// tier: bronze / silver / gold (아이콘 프레임)
const ACHIEVEMENT_TIERS = { bronze: '🟤', silver: '⚪', gold: '🟡' };

function getAchievementVisibility(player) {
  const unlocked = player.achievements || [];
  return ACHIEVEMENTS.filter(ach => {
    if (!ach.requires) return true;
    return unlocked.includes(ach.requires);
  });
}

// ═══ 3. 칭호 시스템 ═══
const TITLES = [
  // 기존 칭호
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

  // 추가 칭호 (20개)
  { id: 'title_explorer', name: '탐험가', icon: '🗺️⭐', source: '탐험 100회 달성' },
  { id: 'title_trade_king', name: '무역왕', icon: '💰🏆', source: '거래 100회 달성' },
  { id: 'title_slayer', name: '학살자', icon: '⚔️💀', source: 'PK 50킬' },
  { id: 'title_awakened', name: '각성자', icon: '🌟💫', source: '5종 각성 달성' },
  { id: 'title_tower_challenger', name: '탑의 도전자', icon: '🗼⭐', source: '도전의 탑 50층' },
  { id: 'title_tower_conqueror', name: '탑의 정복자', icon: '🗼👑', source: '도전의 탑 100층' },
  { id: 'title_boss_hunter', name: '보스 헌터', icon: '🐲👑', source: '보스 레이드 최고 기여' },
  { id: 'title_season_legend2', name: '시즌 전설', icon: '👑🌟🔥', source: '시즌 전설 등급 달성' },
  { id: 'title_card_master', name: '카드 마스터', icon: '🃏👑', source: '카드 100장 보유' },
  { id: 'title_lucky', name: '행운의 주인공', icon: '🎰🌟', source: '복권 대상 당첨' },
  { id: 'title_farmer_king', name: '농부왕', icon: '🌿👑', source: '농장 누적 10만 골드' },
  { id: 'title_blacksmith', name: '대장장이', icon: '🔨🔥', source: '전설 인챈트 성공' },
  { id: 'title_strategist', name: '전략가', icon: '🧠⭐', source: '행동 카드 100회 사용' },
  { id: 'title_guardian', name: '수호자', icon: '🛡️✨', source: '성 방어 10회 성공' },
  { id: 'title_conqueror', name: '정복왕', icon: '⚔️🏰👑', source: '성 공략 10회 성공' },
  { id: 'title_legendary_merchant', name: '전설의 거상', icon: '💎🏆', source: '누적 거래 수익 100만' },
  { id: 'title_combo_master', name: '콤보 마스터', icon: '🔗🔥', source: '콤보 50회 발동' },
  { id: 'title_immortal', name: '불멸의 전사', icon: '⚔️🔥👑', source: 'IO 100킬 + 10승' },
  { id: 'title_abyss_explorer', name: '심연 탐험가', icon: '🌀🗺️', source: '심연 던전 클리어' },
  { id: 'title_polymath', name: '만물박사', icon: '📖🌟💫', source: '모든 앨범 완성' },
];

// ═══ 4. 용병 스토리 (카드별 짧은 배경 이야기) ═══
const MERC_STORIES = {
  // 기존 스토리
  '견습 전사': { chapter1: '작은 마을의 농부 아들이었다. 어느 날 마을이 습격당하고, 검을 들었다.', chapter2: '수련의 길을 걷기 시작한 청년. 아직 서투르지만 눈빛은 단호하다.' },
  '정예 전사': { chapter1: '수많은 전투를 겪으며 강해진 전사. 이제 후배들의 본보기가 된다.', chapter2: '그의 검에는 수십 번의 전투의 흔적이 새겨져 있다.' },
  '영웅 검사': { chapter1: '왕국을 구한 영웅. 백성들이 그의 이름을 기억한다.', chapter2: '하지만 그가 진정 지키고 싶었던 건, 고향의 작은 마을이었다.' },
  '견습 궁수': { chapter1: '숲에서 자란 엘프 소녀. 바람의 소리를 듣고 화살을 쏜다.', chapter2: '아직 세상을 모르지만, 활시위를 당기는 손은 흔들리지 않는다.' },
  '견습 마법사': { chapter1: '탑에서 홀로 수련하던 소년. 처음으로 불꽃을 만들어낸 날의 기쁨을 잊지 못한다.', chapter2: '마법은 위험하다. 하지만 그는 그 위험을 안고 앞으로 나아간다.' },
  '전설의 검성': { chapter1: '백 번의 전투에서 살아남은 자. 그의 검은 이미 전설이 되었다.', chapter2: '어느 날 그가 사라졌다. 사람들은 말한다 — 그는 더 강한 적을 찾아 떠났다고.' },

  // 추가 스토리 (10종)
  '정예 궁수': { chapter1: '백 발 백 중. 그녀의 화살은 바람을 가르며 정확히 심장을 꿰뚫는다.', chapter2: '숲의 수호자로 불리는 그녀는, 사실 잃어버린 왕국의 공주였다.' },
  '대마도사': { chapter1: '마법 탑의 꼭대기에서 별을 읽는 현자. 세계의 균열을 가장 먼저 감지했다.', chapter2: '그의 지팡이에는 천 년의 지혜가 깃들어 있다. 하지만 대가는 고독이었다.' },
  '마검사': { chapter1: '검과 마법을 동시에 다루는 금기의 전사. 양쪽 길드에서 모두 추방당했다.', chapter2: '홀로 걷는 길 위에서, 그는 자신만의 검술을 완성했다. 세상이 두려워하는 그 검을.' },
  '성기사': { chapter1: '빛의 신전에서 서약한 기사. 약자를 지키겠다는 맹세를 한 번도 어기지 않았다.', chapter2: '하지만 전쟁은 그에게도 선택을 강요했다. 마을을 지키기 위해 도시를 버려야 했던 그날의 기억.' },
  '암살자': { chapter1: '그림자 속에서 태어나 그림자로 사라지는 자. 이름도, 과거도 없다.', chapter2: '단 하나의 규칙 — 의뢰를 받으면 반드시 완수한다. 실패는 곧 죽음이니까.' },
  '드루이드': { chapter1: '대자연과 교감하는 현자. 나무의 속삭임을 듣고, 대지의 고통을 느낀다.', chapter2: '세계수가 시들어가고 있다. 그는 마지막 희망을 찾아 여행을 시작했다.' },
  '네크로맨서': { chapter1: '죽은 자의 안식을 방해하는 금기의 마법사. 하지만 그에게는 이유가 있었다.', chapter2: '사랑하는 사람을 되살리기 위해 시작한 연구. 그 끝에서 그는 무엇을 찾았을까.' },
  '용기사': { chapter1: '어린 용과 함께 자란 기사. 세상은 그들의 유대를 이해하지 못했다.', chapter2: '하늘을 나는 것은 자유다. 그와 용은 누구의 명령도 받지 않는다.' },
  '치유사': { chapter1: '전쟁터의 천사라 불리는 사제. 적군의 부상병까지 치료하는 자비의 손길.', chapter2: '치유의 빛은 생명력을 소모한다. 그녀는 자신의 수명을 나누어주고 있었다.' },
  '연금술사': { chapter1: '만물의 변환을 추구하는 학자. 납을 금으로 바꾸는 것은 서막에 불과했다.', chapter2: '현자의 돌을 완성한 날, 그는 깨달았다 — 진정한 변환은 마음에서 시작된다고.' },
};

// ═══ 5. 앨범 시스템 (테마별 수집 + 완성 보너스) ═══
const ALBUMS = [
  { id: 'album_starter', name: '초심자의 여정', icon: '🌱', cards: ['견습 전사', '견습 궁수', '견습 마법사'], bonus: { allAtk: 0.05 }, reward: { gold: 5000 }, desc: '세 명의 초심자를 모으세요' },
  { id: 'album_warriors', name: '전사의 길', icon: '⚔️', cards: ['견습 전사', '정예 전사', '영웅 검사', '전설의 검성'], bonus: { atk: 0.1 }, reward: { gold: 20000, diamonds: 30 }, desc: '전사의 성장 과정' },
  { id: 'album_legends', name: '전설의 영웅들', icon: '🌟', cards: ['전설의 검성', '불사조', '빛의 천사', '용왕', '암흑기사'], bonus: { all: 0.08 }, reward: { gold: 50000, diamonds: 50 }, desc: '전설 영웅 5종' },
  { id: 'album_myths', name: '신화의 존재', icon: '👑', cards: ['신의 대리자', '세계의 수호자', '운명의 파괴자', '태초의 존재', '차원의 지배자'], bonus: { all: 0.15 }, reward: { gold: 100000, diamonds: 100, title: '신화 수집가' }, desc: '신화 5종 모두!' },
  { id: 'album_awakened', name: '각성자들', icon: '🌟👑', cards: ['신검의 주인', '차원의 현자', '신궁'], bonus: { all: 0.12 }, reward: { gold: 80000, diamonds: 80 }, desc: '각성 용병 3종' },
  { id: 'album_elements', name: '원소의 조화', icon: '🌈', reqElements: ['fire', 'water', 'earth', 'wind', 'light', 'dark'], bonus: { elementDmg: 0.1 }, reward: { gold: 30000, diamonds: 40 }, desc: '6속성 카드 보유' },
];

function checkAlbums(player) {
  const cards = player.cards || [];
  const cardNames = new Set(cards.map(c => (c.name || '').replace(/[★+\d]+$/, '').trim()));
  const cardElements = new Set(cards.map(c => c.element).filter(Boolean));
  const completed = player.completedAlbums || [];
  const newlyCompleted = [];

  for (const album of ALBUMS) {
    if (completed.includes(album.id)) continue;

    let isComplete = false;
    if (album.cards) {
      isComplete = album.cards.every(name => cardNames.has(name));
    } else if (album.reqElements) {
      isComplete = album.reqElements.every(el => cardElements.has(el));
    }

    if (isComplete) {
      completed.push(album.id);
      newlyCompleted.push(album);
      // 보상 지급
      if (album.reward.gold) player.gold = (player.gold || 0) + album.reward.gold;
      if (album.reward.diamonds) player.diamonds = (player.diamonds || 0) + album.reward.diamonds;
      if (album.reward.title) {
        player.titles = player.titles || [];
        if (!player.titles.includes(album.reward.title)) player.titles.push(album.reward.title);
      }
      // 보너스 영구 적용
      player.albumBonuses = player.albumBonuses || {};
      for (const [stat, val] of Object.entries(album.bonus)) {
        player.albumBonuses[stat] = (player.albumBonuses[stat] || 0) + val;
      }
    }
  }
  player.completedAlbums = completed;
  return newlyCompleted;
}

function getAlbumStatus(player) {
  const cards = player.cards || [];
  const cardNames = new Set(cards.map(c => (c.name || '').replace(/[★+\d]+$/, '').trim()));
  const cardElements = new Set(cards.map(c => c.element).filter(Boolean));
  const completed = player.completedAlbums || [];

  return ALBUMS.map(album => {
    const owned = album.cards
      ? album.cards.filter(name => cardNames.has(name))
      : (album.reqElements || []).filter(el => cardElements.has(el));
    const total = album.cards ? album.cards.length : (album.reqElements || []).length;
    return {
      ...album,
      completed: completed.includes(album.id),
      progress: owned.length,
      total,
      ownedList: owned,
    };
  });
}

// ═══ 핵심 함수 ═══

function getCodexCount(player) {
  const unique = new Set((player.cards || []).map(c => (c.name || '').replace(/[★+\d]+$/, '').trim()));
  return unique.size;
}

// 시즌 랭크 순서 (비교용)
const SEASON_RANK_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'legend'];

function checkAchievements(player) {
  const unlocked = player.achievements || [];
  const newlyUnlocked = [];

  // 가시성 필터: requires 선행 업적이 있으면 해당 업적이 완료되어야 도전 가능
  const visible = getAchievementVisibility(player);

  for (const ach of visible) {
    if (unlocked.includes(ach.id)) continue;
    let met = false;
    const c = ach.condition;

    // IO
    if (c.ioKills && (player.totalIoKills || 0) >= c.ioKills) met = true;
    if (c.ioWins && (player.totalIoWins || 0) >= c.ioWins) met = true;

    // 카드
    if (c.summons && (player.totalSummons || 0) >= c.summons) met = true;
    if (c.legendCards && (player.cards || []).some(cd => cd.grade === 'legend')) met = true;
    if (c.mythCards && (player.cards || []).some(cd => cd.grade === 'myth')) met = true;
    if (c.hiddenCards && (player.cards || []).some(cd => cd.hidden)) met = true;
    if (c.evolves && (player.totalEvolves || 0) >= c.evolves) met = true;
    if (c.maxStars && (player.cards || []).some(cd => (cd.stars || 0) >= c.maxStars)) met = true;
    if (c.totalCards && (player.cards || []).length >= c.totalCards) met = true;

    // 기지
    if (c.buildings && Object.keys((player.fortress?.buildings) || {}).length >= c.buildings) met = true;
    if (c.fortressLevel && (player.fortress?.level || 0) >= c.fortressLevel) met = true;
    if (c.raidWins && (player.totalRaidWins || 0) >= c.raidWins) met = true;
    if (c.defenseWins && (player.totalDefenseWins || 0) >= c.defenseWins) met = true;

    // PvP
    if (c.pvpWins && (player.totalPvpWins || 0) >= c.pvpWins) met = true;
    if (c.pvpRank && player.pvpRank === c.pvpRank) met = true;

    // 길드
    if (c.hasGuild && player.guild) met = true;
    if (c.guildRaidWins && (player.totalGuildRaidWins || 0) >= c.guildRaidWins) met = true;
    if (c.guildLevel && (player.guildLevel || 0) >= c.guildLevel) met = true;

    // 골드/도감
    if (c.goldTotal && (player.totalGoldEarned || 0) >= c.goldTotal) met = true;
    if (c.codexCount && getCodexCount(player) >= c.codexCount) met = true;

    // 도전의 탑
    if (c.towerFloor && (player.towerFloor || 0) >= c.towerFloor) met = true;

    // 탐험
    if (c.expeditions && (player.totalExpeditions || 0) >= c.expeditions) met = true;

    // 거래
    if (c.trades && (player.totalTrades || 0) >= c.trades) met = true;

    // PK
    if (c.pkKills && (player.totalPkKills || 0) >= c.pkKills) met = true;
    if (c.bountiesClaimed && (player.totalBountiesClaimed || 0) >= c.bountiesClaimed) met = true;

    // 인챈트
    if (c.legendEnchants && (player.totalLegendEnchants || 0) >= c.legendEnchants) met = true;
    if (c.fullEnchant && (player.cards || []).some(cd => cd.enchants && cd.enchants.length >= 3)) met = true;

    // 각성
    if (c.awakenings && (player.totalAwakenings || 0) >= c.awakenings) met = true;

    // 시즌
    if (c.seasonRank) {
      const playerRankIdx = SEASON_RANK_ORDER.indexOf(player.seasonRank || '');
      const reqRankIdx = SEASON_RANK_ORDER.indexOf(c.seasonRank);
      if (playerRankIdx >= 0 && reqRankIdx >= 0 && playerRankIdx >= reqRankIdx) met = true;
    }

    // 소셜
    if (c.friends && (player.friends || []).length >= c.friends) met = true;

    // 보스 레이드
    if (c.bossRaidParticipation && (player.totalBossRaidParticipation || 0) >= c.bossRaidParticipation) met = true;
    if (c.bossRaidTop1 && (player.totalBossRaidTop1 || 0) >= c.bossRaidTop1) met = true;

    // 농장
    if (c.farmGold && (player.totalFarmGold || 0) >= c.farmGold) met = true;

    // 콤보/행동
    if (c.combos && (player.totalCombos || 0) >= c.combos) met = true;
    if (c.actionsPlayed && (player.totalActionsPlayed || 0) >= c.actionsPlayed) met = true;

    // 복권
    if (c.lotteryMyth && (player.totalLotteryMyth || 0) >= c.lotteryMyth) met = true;

    // 종합
    if (c.allAlbums && (player.completedAlbums || []).length >= ALBUMS.length) met = true;

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
      visible: getAchievementVisibility(player),
    });
    if (newlyUnlocked.length > 0) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // 업적 상세 (체인, 티어 정보 포함)
  socket.on('achievement_details', (data) => {
    const ach = ACHIEVEMENTS.find(a => a.id === data.id);
    if (!ach) return socket.emit('achievement_details', { error: 'not_found' });
    const unlocked = (player.achievements || []).includes(ach.id);
    const chainNext = ach.chain ? ACHIEVEMENTS.find(a => a.id === ach.chain) : null;
    const tierIcon = ach.tier ? ACHIEVEMENT_TIERS[ach.tier] : null;
    socket.emit('achievement_details', { ...ach, unlocked, chainNext, tierIcon });
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

  // 앨범 상태
  socket.on('album_status', () => {
    const status = getAlbumStatus(player);
    socket.emit('album_status', { albums: status, bonuses: player.albumBonuses || {} });
  });

  // 앨범 체크 (완성 확인 + 보상)
  socket.on('album_check', () => {
    const newlyCompleted = checkAlbums(player);
    const status = getAlbumStatus(player);
    socket.emit('album_check_result', {
      newlyCompleted,
      albums: status,
      bonuses: player.albumBonuses || {},
    });
    if (newlyCompleted.length > 0) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });
}

module.exports = {
  CODEX_MILESTONES,
  ACHIEVEMENTS,
  ACHIEVEMENT_TIERS,
  TITLES,
  MERC_STORIES,
  ALBUMS,
  getCodexCount,
  getAchievementVisibility,
  checkAchievements,
  checkAlbums,
  getAlbumStatus,
  register,
};

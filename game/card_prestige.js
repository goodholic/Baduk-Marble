// ============================================
// 프레스티지(환생) 시스템 — 리셋 + 영구 보너스
// ============================================

// 환생 요건
const PRESTIGE_REQUIREMENTS = {
  towerFloor: 50,        // 탑 50층+
  totalCards: 20,         // 카드 20장+
  level: 30,              // 캐릭터 Lv.30+
};

// 환생 시 유지되는 것
const KEPT_ON_PRESTIGE = [
  'prestigeLevel',        // 환생 레벨
  'prestigeBonuses',      // 영구 보너스
  'legacySkills',         // 레거시 스킬
  'discoveredRecipes',    // 발견 레시피
  'achievements',         // 업적
  'titles',               // 칭호
  'skins',                // 스킨
  'seasonPoints',         // 시즌 점수
  'totalPrestigeGold',    // 누적 환생 골드
  'favoriteCards',        // 환생 전 선택한 즐겨찾기 카드
  'displayName',          // 닉네임
  'id',                   // 유저 ID
];

// 환생 레벨별 영구 보너스
const PRESTIGE_BONUSES = [
  { level: 1, name: '환생 1회', bonus: { allStat: 0.05, goldBonus: 0.1, expBonus: 0.1 }, reward: { diamonds: 100, card: 'epic' }, title: '환생자', icon: '🔄' },
  { level: 2, name: '환생 2회', bonus: { allStat: 0.10, goldBonus: 0.2, expBonus: 0.2 }, reward: { diamonds: 200, card: 'legend' }, title: '이세계인', icon: '🔄🔄' },
  { level: 3, name: '환생 3회', bonus: { allStat: 0.15, goldBonus: 0.3, expBonus: 0.3 }, reward: { diamonds: 300, card: 'legend' }, title: '윤회자', icon: '🔄🔄🔄' },
  { level: 5, name: '환생 5회', bonus: { allStat: 0.25, goldBonus: 0.5, expBonus: 0.5 }, reward: { diamonds: 500, card: 'myth' }, title: '영원의 방랑자', icon: '🔄🌟' },
  { level: 7, name: '환생 7회', bonus: { allStat: 0.35, goldBonus: 0.7, expBonus: 0.7, startingGold: 10000 }, reward: { diamonds: 700 }, title: '불멸의 영혼', icon: '🔄👑' },
  { level: 10, name: '환생 10회', bonus: { allStat: 0.50, goldBonus: 1.0, expBonus: 1.0, startingGold: 50000, startingDiamonds: 100 }, reward: { diamonds: 1000, card: 'myth' }, title: '신의 전생', icon: '🔄👑🌟' },
];

// 레거시 스킬 (환생 시 1개 선택, 영구 유지)
const LEGACY_SKILLS = [
  { id: 'ls_warrior', name: '전사의 기억', icon: '⚔️', effect: { atk: 0.1 }, desc: '모든 카드 ATK +10% (영구)', reqPrestige: 1 },
  { id: 'ls_guardian', name: '수호자의 기억', icon: '🛡️', effect: { def: 0.1 }, desc: '모든 카드 DEF +10% (영구)', reqPrestige: 1 },
  { id: 'ls_sage', name: '현자의 기억', icon: '📚', effect: { exp: 0.2 }, desc: 'EXP 획득 +20% (영구)', reqPrestige: 1 },
  { id: 'ls_merchant', name: '상인의 기억', icon: '💰', effect: { gold: 0.2 }, desc: '골드 획득 +20% (영구)', reqPrestige: 2 },
  { id: 'ls_lucky', name: '행운의 기억', icon: '🍀', effect: { luck: 0.15 }, desc: '드롭률/소환 확률 +15% (영구)', reqPrestige: 3 },
  { id: 'ls_summoner', name: '소환사의 기억', icon: '📜', effect: { summon: 0.1 }, desc: '소환 시 등급 +10% 상승 (영구)', reqPrestige: 3 },
  { id: 'ls_conqueror', name: '정복자의 기억', icon: '👑', effect: { allStat: 0.08 }, desc: '전 스탯 +8% (영구)', reqPrestige: 5 },
  { id: 'ls_immortal', name: '불멸의 기억', icon: '♾️', effect: { revive: true }, desc: 'IO에서 무료 부활 1회 (영구)', reqPrestige: 7 },
];

// ── 리셋 대상 필드 ──
const RESET_FIELDS = {
  gold: 0,
  diamonds: 0,
  cards: [],
  towerFloor: 0,
  infiniteTowerFloor: 0,
  level: 1,
  exp: 0,
  expeditionSlots: [],
  expeditionTeam: [],
  farmPlots: [],
  fortressLevel: 0,
  fortressWalls: 0,
  fortressUnits: [],
  deckSlots: {},
  inventory: [],
  quests: [],
  dailyQuests: [],
  battlePassLevel: 0,
  battlePassExp: 0,
  storyProgress: 0,
  campaignStage: 0,
  arenaRank: 0,
  arenaPoints: 0,
  enchantStone: 0,
  blessingSlots: [],
  auraSlots: [],
  marketListings: [],
  _towerAttempts: 0,
  _challengeDone: {},
};

// ── 환생 가능 여부 체크 ──
function canPrestige(player) {
  const pLevel = player.prestigeLevel || 0;
  const towerFloor = player.towerFloor || 0;
  const totalCards = (player.cards || []).length;
  const level = player.level || 1;

  const met = {
    towerFloor: towerFloor >= PRESTIGE_REQUIREMENTS.towerFloor,
    totalCards: totalCards >= PRESTIGE_REQUIREMENTS.totalCards,
    level: level >= PRESTIGE_REQUIREMENTS.level,
  };
  const allMet = met.towerFloor && met.totalCards && met.level;

  // 다음 환생 레벨에서 얻을 보너스
  const nextLevel = pLevel + 1;
  const milestone = PRESTIGE_BONUSES.find(b => b.level === nextLevel);
  const nextMilestone = PRESTIGE_BONUSES.find(b => b.level > pLevel) || null;

  // 유지/리셋 목록
  const kept = [...KEPT_ON_PRESTIGE];
  const lost = Object.keys(RESET_FIELDS);

  // 즐겨찾기 카드 (선택한 3장은 유지)
  const favoriteCards = player.favoriteCards || [];

  return {
    ok: allMet,
    currentPrestige: pLevel,
    nextPrestige: nextLevel,
    requirements: {
      towerFloor: { required: PRESTIGE_REQUIREMENTS.towerFloor, current: towerFloor, met: met.towerFloor },
      totalCards: { required: PRESTIGE_REQUIREMENTS.totalCards, current: totalCards, met: met.totalCards },
      level: { required: PRESTIGE_REQUIREMENTS.level, current: level, met: met.level },
    },
    milestone,
    nextMilestone,
    kept,
    lost,
    favoriteCards,
    availableLegacySkills: getAvailableLegacySkills(nextLevel, player.legacySkills || []),
  };
}

// ── 즐겨찾기 카드 선택 (환생 전 최대 3장) ──
function selectFavoriteCards(player, cardIds) {
  if (!Array.isArray(cardIds)) return { ok: false, reason: '카드 ID 배열이 필요합니다.' };
  if (cardIds.length > 3) return { ok: false, reason: '최대 3장까지 선택 가능합니다.' };

  const cards = player.cards || [];
  const validIds = [];
  for (const cid of cardIds) {
    const card = cards.find(c => c.id === cid || c.uid === cid);
    if (!card) return { ok: false, reason: `카드를 찾을 수 없습니다: ${cid}` };
    validIds.push(card);
  }

  player.favoriteCards = validIds.map(c => ({ ...c }));
  return {
    ok: true,
    selected: player.favoriteCards.map(c => ({ id: c.id || c.uid, name: c.name, grade: c.grade })),
    msg: `${validIds.length}장의 카드를 즐겨찾기로 선택했습니다. 환생 후에도 유지됩니다.`,
  };
}

// ── 환생 실행 ──
function doPrestige(player) {
  const check = canPrestige(player);
  if (!check.ok) return { ok: false, reason: '환생 조건을 충족하지 못했습니다.', check };

  const oldLevel = player.prestigeLevel || 0;
  const newLevel = oldLevel + 1;

  // 1) 누적 골드 기록
  player.totalPrestigeGold = (player.totalPrestigeGold || 0) + (player.gold || 0);

  // 2) 보존할 데이터 백업
  const preserved = {};
  for (const key of KEPT_ON_PRESTIGE) {
    if (player[key] !== undefined) {
      preserved[key] = JSON.parse(JSON.stringify(player[key]));
    }
  }

  // 3) 즐겨찾기 카드 백업
  const keptCards = (player.favoriteCards || []).map(c => ({ ...c }));

  // 4) 리셋
  for (const [key, val] of Object.entries(RESET_FIELDS)) {
    player[key] = JSON.parse(JSON.stringify(val));
  }

  // 5) 보존 데이터 복원
  for (const [key, val] of Object.entries(preserved)) {
    player[key] = val;
  }

  // 6) 환생 레벨 갱신
  player.prestigeLevel = newLevel;

  // 7) 즐겨찾기 카드 복원
  player.cards = keptCards;
  player.favoriteCards = [];

  // 8) 마일스톤 보너스 확인 및 적용
  const milestone = PRESTIGE_BONUSES.find(b => b.level === newLevel);
  let milestoneReward = null;
  if (milestone) {
    // 영구 보너스 저장
    if (!player.prestigeBonuses) player.prestigeBonuses = {};
    player.prestigeBonuses = computePrestigeBonuses(newLevel);

    // 보상 지급
    milestoneReward = { ...milestone.reward };
    if (milestone.reward.diamonds) {
      player.diamonds = (player.diamonds || 0) + milestone.reward.diamonds;
    }
    if (milestone.reward.card) {
      const rewardCard = generatePrestigeRewardCard(milestone.reward.card, newLevel);
      player.cards.push(rewardCard);
      milestoneReward.cardDetail = rewardCard;
    }

    // 칭호 부여
    if (milestone.title) {
      if (!player.titles) player.titles = [];
      if (!player.titles.includes(milestone.title)) {
        player.titles.push(milestone.title);
      }
    }
  } else {
    // 마일스톤이 아닌 레벨에서도 보너스 누적 계산
    if (!player.prestigeBonuses) player.prestigeBonuses = {};
    player.prestigeBonuses = computePrestigeBonuses(newLevel);
  }

  // 9) 시작 보너스 적용 (startingGold, startingDiamonds)
  const bonuses = player.prestigeBonuses || {};
  if (bonuses.startingGold) {
    player.gold = (player.gold || 0) + bonuses.startingGold;
  }
  if (bonuses.startingDiamonds) {
    player.diamonds = (player.diamonds || 0) + bonuses.startingDiamonds;
  }

  // 10) 레거시 스킬 대기 상태 (환생 직후 1개 선택 가능)
  player._pendingLegacyPick = true;

  return {
    ok: true,
    previousPrestige: oldLevel,
    newPrestige: newLevel,
    keptCards: keptCards.map(c => ({ id: c.id || c.uid, name: c.name, grade: c.grade })),
    milestoneReward,
    bonuses: player.prestigeBonuses,
    startingGold: player.gold,
    startingDiamonds: player.diamonds,
    pendingLegacyPick: true,
    msg: `🔄 환생 ${newLevel}회 완료! 새로운 여정을 시작합니다.`,
  };
}

// ── 영구 보너스 누적 계산 ──
function computePrestigeBonuses(prestigeLevel) {
  const result = { allStat: 0, goldBonus: 0, expBonus: 0, startingGold: 0, startingDiamonds: 0 };

  for (const milestone of PRESTIGE_BONUSES) {
    if (milestone.level <= prestigeLevel) {
      const b = milestone.bonus;
      // 가장 높은 마일스톤의 보너스를 적용 (누적이 아닌 최고치)
      if (b.allStat !== undefined && b.allStat > result.allStat) result.allStat = b.allStat;
      if (b.goldBonus !== undefined && b.goldBonus > result.goldBonus) result.goldBonus = b.goldBonus;
      if (b.expBonus !== undefined && b.expBonus > result.expBonus) result.expBonus = b.expBonus;
      if (b.startingGold !== undefined && b.startingGold > result.startingGold) result.startingGold = b.startingGold;
      if (b.startingDiamonds !== undefined && b.startingDiamonds > result.startingDiamonds) result.startingDiamonds = b.startingDiamonds;
    }
  }

  return result;
}

// ── 환생 보상 카드 생성 ──
function generatePrestigeRewardCard(grade, prestigeLevel) {
  const names = {
    epic: ['환생의 전사', '재탄생의 마법사', '윤회의 기사', '부활의 성기사'],
    legend: ['영겁의 수호자', '전생의 군주', '불멸의 현자', '윤회의 대마법사'],
    myth: ['태초의 존재', '신의 전생체', '영원의 창조자', '차원의 지배자'],
  };
  const gradeNames = names[grade] || names.epic;
  const name = gradeNames[Math.floor(Math.random() * gradeNames.length)];
  const baseStat = grade === 'myth' ? 200 : grade === 'legend' ? 120 : 70;
  const bonus = prestigeLevel * 5;

  return {
    id: `prestige_${grade}_${Date.now()}`,
    uid: `prestige_${grade}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${name} (환생 ${prestigeLevel}차)`,
    grade,
    atk: baseStat + bonus + Math.floor(Math.random() * 20),
    def: baseStat + bonus + Math.floor(Math.random() * 20),
    hp: (baseStat + bonus) * 5 + Math.floor(Math.random() * 100),
    level: 1,
    exp: 0,
    prestige: true,
    prestigeOrigin: prestigeLevel,
    icon: grade === 'myth' ? '🌟👑' : grade === 'legend' ? '🌟' : '💜',
  };
}

// ── 레거시 스킬 선택 ──
function chooseLegacySkill(player, skillId) {
  const pLevel = player.prestigeLevel || 0;
  if (pLevel < 1) return { ok: false, reason: '환생을 먼저 진행해야 합니다.' };

  // 대기 상태 확인
  if (!player._pendingLegacyPick) return { ok: false, reason: '현재 레거시 스킬을 선택할 수 없습니다. (이번 환생에서 이미 선택했거나 대기 상태가 아닙니다)' };

  const skill = LEGACY_SKILLS.find(s => s.id === skillId);
  if (!skill) return { ok: false, reason: `존재하지 않는 레거시 스킬입니다: ${skillId}` };

  if (pLevel < skill.reqPrestige) {
    return { ok: false, reason: `이 스킬은 환생 ${skill.reqPrestige}회 이상이 필요합니다. (현재: ${pLevel}회)` };
  }

  if (!player.legacySkills) player.legacySkills = [];

  // 최대 보유 수 = 환생 레벨 (1회당 1개)
  if (player.legacySkills.length >= pLevel) {
    return { ok: false, reason: `레거시 스킬 최대 보유 수에 도달했습니다. (${player.legacySkills.length}/${pLevel})` };
  }

  // 중복 선택 불가
  if (player.legacySkills.find(s => s.id === skillId)) {
    return { ok: false, reason: '이미 보유한 레거시 스킬입니다.' };
  }

  player.legacySkills.push({ ...skill, acquiredAt: pLevel });
  player._pendingLegacyPick = false;

  return {
    ok: true,
    skill: { id: skill.id, name: skill.name, icon: skill.icon, desc: skill.desc, effect: skill.effect },
    totalSkills: player.legacySkills.length,
    maxSkills: pLevel,
    msg: `${skill.icon} 레거시 스킬 [${skill.name}] 획득! — ${skill.desc}`,
  };
}

// ── 선택 가능한 레거시 스킬 목록 ──
function getAvailableLegacySkills(prestigeLevel, ownedSkills) {
  const ownedIds = (ownedSkills || []).map(s => s.id);
  return LEGACY_SKILLS.filter(s => s.reqPrestige <= prestigeLevel && !ownedIds.includes(s.id));
}

// ── 현재 환생 상태 조회 ──
function getPrestigeStatus(player) {
  const pLevel = player.prestigeLevel || 0;
  const bonuses = player.prestigeBonuses || computePrestigeBonuses(pLevel);
  const legacySkills = player.legacySkills || [];

  // 현재 마일스톤
  const currentMilestone = [...PRESTIGE_BONUSES].reverse().find(b => b.level <= pLevel) || null;

  // 다음 마일스톤
  const nextMilestone = PRESTIGE_BONUSES.find(b => b.level > pLevel) || null;

  // 레거시 스킬 슬롯
  const maxSkills = pLevel;
  const usedSkills = legacySkills.length;

  return {
    prestigeLevel: pLevel,
    bonuses,
    legacySkills: legacySkills.map(s => ({
      id: s.id, name: s.name, icon: s.icon, desc: s.desc, effect: s.effect,
    })),
    currentMilestone: currentMilestone ? { level: currentMilestone.level, name: currentMilestone.name, icon: currentMilestone.icon, title: currentMilestone.title } : null,
    nextMilestone: nextMilestone ? { level: nextMilestone.level, name: nextMilestone.name, icon: nextMilestone.icon, bonus: nextMilestone.bonus, reward: nextMilestone.reward } : null,
    skillSlots: { used: usedSkills, max: maxSkills },
    pendingLegacyPick: !!player._pendingLegacyPick,
    totalPrestigeGold: player.totalPrestigeGold || 0,
    titles: (player.titles || []),
  };
}

// ── 다른 시스템에서 사용할 보너스 멀티플라이어 ──
function getPrestigeBonuses(player) {
  const pLevel = player.prestigeLevel || 0;
  if (pLevel < 1) {
    return { allStat: 0, goldBonus: 0, expBonus: 0, startingGold: 0, startingDiamonds: 0, legacy: {} };
  }

  const base = player.prestigeBonuses || computePrestigeBonuses(pLevel);

  // 레거시 스킬 효과 합산
  const legacy = {};
  for (const skill of (player.legacySkills || [])) {
    for (const [key, val] of Object.entries(skill.effect)) {
      if (typeof val === 'number') {
        legacy[key] = (legacy[key] || 0) + val;
      } else {
        legacy[key] = val; // boolean 등
      }
    }
  }

  return {
    allStat: base.allStat || 0,
    goldBonus: base.goldBonus || 0,
    expBonus: base.expBonus || 0,
    startingGold: base.startingGold || 0,
    startingDiamonds: base.startingDiamonds || 0,
    legacy,
    // 통합 스탯 보정 (allStat + legacy.allStat)
    totalAllStat: (base.allStat || 0) + (legacy.allStat || 0),
    totalGoldBonus: (base.goldBonus || 0) + (legacy.gold || 0),
    totalExpBonus: (base.expBonus || 0) + (legacy.exp || 0),
    totalAtkBonus: legacy.atk || 0,
    totalDefBonus: legacy.def || 0,
    totalLuckBonus: legacy.luck || 0,
    totalSummonBonus: legacy.summon || 0,
    hasRevive: !!legacy.revive,
  };
}

// ── 환생 리더보드 ──
function getPrestigeLeaderboard(allPlayers) {
  const players = Object.values(allPlayers || {});
  const ranked = players
    .filter(p => (p.prestigeLevel || 0) > 0)
    .map(p => ({
      name: p.displayName || '???',
      prestigeLevel: p.prestigeLevel || 0,
      totalPrestigeGold: p.totalPrestigeGold || 0,
      legacySkills: (p.legacySkills || []).length,
      title: getCurrentTitle(p),
    }))
    .sort((a, b) => {
      if (b.prestigeLevel !== a.prestigeLevel) return b.prestigeLevel - a.prestigeLevel;
      return b.totalPrestigeGold - a.totalPrestigeGold;
    })
    .slice(0, 20);

  return ranked.map((p, i) => ({ rank: i + 1, ...p }));
}

// ── 현재 활성 칭호 (가장 높은 마일스톤 칭호) ──
function getCurrentTitle(player) {
  const pLevel = player.prestigeLevel || 0;
  const milestone = [...PRESTIGE_BONUSES].reverse().find(b => b.level <= pLevel);
  return milestone ? milestone.title : null;
}

// ── 소켓 등록 ──
function register(io, socket, player, allPlayers) {
  socket.on('prestige_status', () => {
    const status = getPrestigeStatus(player);
    socket.emit('prestige_status', status);
  });

  socket.on('prestige_check', () => {
    const result = canPrestige(player);
    socket.emit('prestige_check', result);
  });

  socket.on('prestige_execute', () => {
    const result = doPrestige(player);
    socket.emit('prestige_execute', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      io.emit('server_msg', `🔄 [환생] ${player.displayName || '???'}이(가) ${result.newPrestige}회차 환생 완료!`);
      if (result.milestoneReward) {
        io.emit('server_msg', `🔄🌟 [환생 마일스톤] ${player.displayName || '???'}이(가) "${PRESTIGE_BONUSES.find(b => b.level === result.newPrestige)?.name}" 달성!`);
      }
    }
  });

  socket.on('prestige_legacy_choose', (data) => {
    const skillId = data && data.skillId;
    if (!skillId) {
      socket.emit('prestige_legacy_choose', { ok: false, reason: 'skillId가 필요합니다.' });
      return;
    }
    const result = chooseLegacySkill(player, skillId);
    socket.emit('prestige_legacy_choose', result);
    if (result.ok) {
      io.emit('server_msg', `🔄${result.skill.icon} [레거시] ${player.displayName || '???'}이(가) [${result.skill.name}] 획득!`);
    }
  });

  socket.on('prestige_favorites', (data) => {
    const cardIds = data && data.cardIds;
    if (!Array.isArray(cardIds)) {
      socket.emit('prestige_favorites', { ok: false, reason: 'cardIds 배열이 필요합니다.' });
      return;
    }
    const result = selectFavoriteCards(player, cardIds);
    socket.emit('prestige_favorites', result);
  });

  socket.on('prestige_leaderboard', () => {
    const leaderboard = getPrestigeLeaderboard(allPlayers || {});
    socket.emit('prestige_leaderboard', { leaderboard });
  });
}

module.exports = {
  PRESTIGE_REQUIREMENTS, KEPT_ON_PRESTIGE, PRESTIGE_BONUSES, LEGACY_SKILLS, RESET_FIELDS,
  canPrestige, doPrestige, chooseLegacySkill,
  getPrestigeStatus, getPrestigeBonuses, getPrestigeLeaderboard,
  selectFavoriteCards, computePrestigeBonuses, getCurrentTitle,
  getAvailableLegacySkills, generatePrestigeRewardCard,
  register,
};

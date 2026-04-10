// ==========================================
// 예언의 타로 — v2.41 (v2.12 대확장)
// 22장 대아르카나 + 조합 효과 + 운명의 도전 + 영구 마일스톤
// ==========================================

const MAJOR_ARCANA = [
  { id:0,  name:'바보',          icon:'🃏', upright:'순수한 시작',     reversed:'무모함',      stat:'evasion',   uprightVal:8,  reversedVal:-3 },
  { id:1,  name:'마법사',        icon:'🎩', upright:'창조력',          reversed:'기만',        stat:'mp',        uprightVal:30, reversedVal:-10 },
  { id:2,  name:'여사제',        icon:'👸', upright:'직관',            reversed:'비밀',        stat:'crit',      uprightVal:8,  reversedVal:-3 },
  { id:3,  name:'여왕',          icon:'👑', upright:'풍요',            reversed:'의존',        stat:'goldBonus', uprightVal:15, reversedVal:-5 },
  { id:4,  name:'황제',          icon:'🤴', upright:'권위',            reversed:'독재',        stat:'def',       uprightVal:15, reversedVal:-5 },
  { id:5,  name:'교황',          icon:'⛪', upright:'전통',            reversed:'반역',        stat:'expBonus',  uprightVal:12, reversedVal:-4 },
  { id:6,  name:'연인',          icon:'💑', upright:'사랑과 선택',     reversed:'이별',        stat:'allStats',  uprightVal:6,  reversedVal:-2 },
  { id:7,  name:'전차',          icon:'🛞', upright:'승리',            reversed:'좌절',        stat:'atk',       uprightVal:15, reversedVal:-5 },
  { id:8,  name:'힘',            icon:'🦁', upright:'용기',            reversed:'유약',        stat:'maxHp',     uprightVal:80, reversedVal:-20 },
  { id:9,  name:'은둔자',        icon:'🕯️', upright:'성찰',            reversed:'고립',        stat:'expBonus',  uprightVal:10, reversedVal:-5 },
  { id:10, name:'운명의 수레바퀴',icon:'☸️', upright:'행운의 전환',     reversed:'불운',        stat:'goldBonus', uprightVal:20, reversedVal:-8 },
  { id:11, name:'정의',          icon:'⚖️', upright:'균형',            reversed:'불공정',      stat:'def',       uprightVal:12, reversedVal:-4 },
  { id:12, name:'매달린 사람',    icon:'🙃', upright:'희생',            reversed:'정체',        stat:'evasion',   uprightVal:6,  reversedVal:-3 },
  { id:13, name:'죽음',          icon:'💀', upright:'재탄생',          reversed:'두려움',      stat:'atk',       uprightVal:18, reversedVal:-8 },
  { id:14, name:'절제',          icon:'🍶', upright:'조화',            reversed:'불균형',      stat:'mp',        uprightVal:25, reversedVal:-10 },
  { id:15, name:'악마',          icon:'😈', upright:'유혹',            reversed:'해방',        stat:'crit',      uprightVal:10, reversedVal:-5 },
  { id:16, name:'탑',            icon:'🗼', upright:'갑작스런 변화',   reversed:'재앙 회피',   stat:'def',       uprightVal:20, reversedVal:-10 },
  { id:17, name:'별',            icon:'⭐', upright:'희망',            reversed:'절망',        stat:'allStats',  uprightVal:8,  reversedVal:-3 },
  { id:18, name:'달',            icon:'🌙', upright:'환상',            reversed:'명료함',      stat:'evasion',   uprightVal:10, reversedVal:-4 },
  { id:19, name:'태양',          icon:'☀️', upright:'성공',            reversed:'기쁨의 지연', stat:'expBonus',  uprightVal:15, reversedVal:-5 },
  { id:20, name:'심판',          icon:'📯', upright:'각성',            reversed:'후회',        stat:'allStats',  uprightVal:10, reversedVal:-4 },
  { id:21, name:'세계',          icon:'🌍', upright:'완성',            reversed:'미완',        stat:'allStats',  uprightVal:12, reversedVal:-5 },
];

const POSITIONS = ['과거','현재','미래'];

// ── v2.41: 카드 조합 효과 (3장 특별 조합) ──
const ARCANA_COMBOS = [
  { name: '완전한 여행', icon: '🌌', cards: [0, 21],
    desc: '바보→세계: 모든 스탯 +20', bonus: { allStats: 20 }, rarity: 'epic' },
  { name: '지혜의 삼위일체', icon: '📚', cards: [1, 2, 5],
    desc: '마법사+여사제+교황: EXP +30%, MP +50', bonus: { expBonus: 30, mp: 50 }, rarity: 'epic' },
  { name: '전쟁의 삼위일체', icon: '⚔️', cards: [7, 8, 13],
    desc: '전차+힘+죽음: ATK +40, CRIT +10%', bonus: { atk: 40, crit: 10 }, rarity: 'epic' },
  { name: '천체의 정렬', icon: '🌠', cards: [17, 18, 19],
    desc: '별+달+태양: 모든 보너스 2배 + 올스탯 +15', bonus: { allStats: 15, doubleAll: true }, rarity: 'legendary' },
  { name: '파멸의 예언', icon: '🔥', cards: [13, 15, 16],
    desc: '죽음+악마+탑: ATK +60, DEF -20 (위험한 힘)', bonus: { atk: 60, def: -20 }, rarity: 'epic' },
  { name: '왕관의 무게', icon: '👑', cards: [3, 4],
    desc: '여왕+황제: DEF +25, 골드 +20%', bonus: { def: 25, goldBonus: 20 }, rarity: 'rare' },
  { name: '운명의 심판', icon: '⚖️', cards: [10, 11, 20],
    desc: '수레바퀴+정의+심판: 드롭률 +20%, EXP +15%', bonus: { dropRate: 0.20, expBonus: 15 }, rarity: 'epic' },
  { name: '달빛 환상', icon: '🌙', cards: [2, 12, 18],
    desc: '여사제+매달린사람+달: 회피 +15%, CRIT +8%', bonus: { evasion: 15, crit: 8 }, rarity: 'rare' },
  { name: '사랑과 조화', icon: '💕', cards: [6, 14, 17],
    desc: '연인+절제+별: 힐 효율 +30%, 올스탯 +10', bonus: { healBonus: 0.30, allStats: 10 }, rarity: 'rare' },
  { name: '어둠의 해방', icon: '🖤', cards: [9, 12, 15],
    desc: '은둔자+매달린사람+악마: 독 데미지 +50%, 흡혈 +5%', bonus: { poisonDmg: 50, lifesteal: 0.05 }, rarity: 'epic' },
  { name: '세계의 시작과 끝', icon: '♾️', cards: [0, 13, 21],
    desc: '바보+죽음+세계: 올스탯 +25, EXP +20%', bonus: { allStats: 25, expBonus: 20 }, rarity: 'legendary' },
  { name: '최후의 심판', icon: '🔱', cards: [16, 19, 20],
    desc: '탑+태양+심판: ATK +30, DEF +30, HP +300', bonus: { atk: 30, def: 30, maxHp: 300 }, rarity: 'legendary' },
];

// ── v2.41: 운명 등급 마일스톤 (영구 보너스) ──
const FATE_MILESTONES = [
  { score: 50,   name: '운명의 씨앗',   icon: '🌱', bonus: { expBonus: 3 },        desc: 'EXP +3% 영구' },
  { score: 100,  name: '운명의 싹',     icon: '🌿', bonus: { goldBonus: 5 },       desc: '골드 +5% 영구' },
  { score: 200,  name: '운명의 꽃',     icon: '🌸', bonus: { atk: 10, def: 10 },   desc: 'ATK/DEF +10 영구' },
  { score: 350,  name: '운명의 열매',   icon: '🍎', bonus: { allStats: 5 },        desc: '올스탯 +5 영구' },
  { score: 500,  name: '운명의 나무',   icon: '🌳', bonus: { crit: 5, evasion: 5 }, desc: 'CRIT/회피 +5% 영구' },
  { score: 750,  name: '운명의 별',     icon: '💫', bonus: { maxHp: 200, mp: 50 }, desc: 'HP +200, MP +50 영구' },
  { score: 1000, name: '운명의 지배자', icon: '🔮', bonus: { allStats: 15, atk: 20 }, desc: '올스탯 +15, ATK +20 영구' },
];

// ── v2.41: 역방향 도전 보상 ──
const REVERSED_CHALLENGE_REWARDS = [
  { name: '역경의 힘', desc: 'ATK +20 (24h)', bonus: { atk: 20 }, duration: 86400000 },
  { name: '시련의 보호', desc: 'DEF +25 (24h)', bonus: { def: 25 }, duration: 86400000 },
  { name: '고통의 결실', desc: 'EXP +20% (24h)', bonus: { expBonus: 20 }, duration: 86400000 },
  { name: '암흑의 통찰', desc: 'CRIT +12% (24h)', bonus: { crit: 12 }, duration: 86400000 },
  { name: '운명의 반전', desc: '운명 점수 +30', bonus: { fateScore: 30 }, duration: 0 },
  { name: '잃어버린 황금', desc: '골드 3000 획득', bonus: { gold: 3000 }, duration: 0 },
  { name: '별의 축복', desc: '별가루 +50', bonus: { stardust: 50 }, duration: 0 },
];

function _today() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function _seed(today, playerId) {
  return (today + (playerId || 'x')).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

function _ensure(player) {
  if (!player.tarot) {
    player.tarot = {
      lastReadDate: null,
      lastReading: null,
      activeBonus: null,
      fateScore: 0,
      uprightCount: 0,
      reversedCount: 0,
      readings: 0,
    };
  }
  // v2.41 확장 필드
  if (!player.tarot.combosTriggered) player.tarot.combosTriggered = {};
  if (!player.tarot.comboBonus) player.tarot.comboBonus = null;
  if (!player.tarot.milestonesClaimed) player.tarot.milestonesClaimed = {};
  if (!player.tarot.reversedChallenges) player.tarot.reversedChallenges = 0;
  if (!player.tarot.reversedBonus) player.tarot.reversedBonus = null;
  if (player.tarot.gambitUsed === undefined) player.tarot.gambitUsed = false;
  return player.tarot;
}

function _fateLineLabel(score) {
  if (score >= 1000) return '🔮 운명의 지배자';
  if (score >= 750)  return '💫 운명의 별';
  if (score >= 500)  return '🌳 운명의 나무';
  if (score >= 350)  return '🍎 운명의 열매';
  if (score >= 200)  return '🌸 운명의 꽃';
  if (score >= 100)  return '🌿 운명의 싹';
  if (score >= 50)   return '🌱 운명의 씨앗';
  if (score >= 0)    return '⚖️ 균형';
  if (score >= -50)  return '🌑 어두운 운명';
  if (score >= -100) return '🌀 혼돈의 운명';
  return '💀 저주받은 운명';
}

// ── 조합 체크 ──
function _checkCombo(drawnIds) {
  for (const combo of ARCANA_COMBOS) {
    if (combo.cards.every(cid => drawnIds.includes(cid))) {
      return combo;
    }
  }
  return null;
}

// ── 카드 뽑기 ──
function read(player) {
  const t = _ensure(player);
  const today = _today();
  if (t.lastReadDate === today) {
    return { success:false, msg:'오늘의 점은 이미 봄' };
  }

  let seed = _seed(today, player.id || 'x');
  function nextRand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const drawn = [];
  const used = new Set();
  for (let i = 0; i < 3; i++) {
    let card;
    do {
      card = MAJOR_ARCANA[Math.floor(nextRand() * MAJOR_ARCANA.length)];
    } while (used.has(card.id));
    used.add(card.id);
    const reversed = nextRand() < 0.4;
    drawn.push({ card, reversed, position: POSITIONS[i] });
    if (reversed) {
      t.reversedCount += 1;
      t.fateScore -= 5;
    } else {
      t.uprightCount += 1;
      t.fateScore += 10;
    }
  }

  // 보너스 계산: 3장 모두 합산
  const bonuses = {};
  for (const d of drawn) {
    const val = d.reversed ? d.card.reversedVal : d.card.uprightVal;
    bonuses[d.card.stat] = (bonuses[d.card.stat] || 0) + val;
  }

  t.activeBonus = {
    stats: bonuses,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    cards: drawn.map(d => ({ name: d.card.name, icon: d.card.icon, reversed: d.reversed })),
  };

  // 조합 체크
  const drawnIds = drawn.map(d => d.card.id);
  const combo = _checkCombo(drawnIds);
  let comboResult = null;
  if (combo) {
    t.comboBonus = {
      name: combo.name, icon: combo.icon, bonus: combo.bonus, rarity: combo.rarity,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    if (!t.combosTriggered[combo.name]) t.combosTriggered[combo.name] = 0;
    t.combosTriggered[combo.name]++;
    comboResult = combo;
  } else {
    t.comboBonus = null;
  }

  t.lastReadDate = today;
  t.lastReading = { date: today, cards: drawn };
  t.readings += 1;
  t.gambitUsed = false;

  // 역방향 카드 수 (역방향 도전 가능 여부)
  const reversedCount = drawn.filter(d => d.reversed).length;

  return {
    success: true,
    msg: drawn.map(d => `${d.card.icon}${d.card.name}${d.reversed ? '(역)' : ''}`).join(' | '),
    cards: drawn,
    bonuses,
    combo: comboResult,
    fateLine: _fateLineLabel(t.fateScore),
    fateScore: t.fateScore,
    canGambit: !t.gambitUsed,
    canReversedChallenge: reversedCount > 0,
    reversedCount,
  };
}

// ── v2.41: 운명의 도전 (Gambit) — 현재 카드를 다시 뽑기 ──
function gambit(player) {
  const t = _ensure(player);
  if (t.gambitUsed) return { success: false, msg: '오늘 이미 도전함' };
  if (!t.lastReading) return { success: false, msg: '먼저 카드를 뽑으세요' };

  t.gambitUsed = true;
  const rng = Math.random();

  if (rng < 0.45) {
    // 성공: 보너스 2배
    const doubled = {};
    if (t.activeBonus?.stats) {
      for (const [stat, val] of Object.entries(t.activeBonus.stats)) {
        doubled[stat] = val * 2;
      }
      t.activeBonus.stats = doubled;
    }
    t.fateScore += 20;
    return {
      success: true, won: true,
      msg: '🎉 운명의 도전 성공! 모든 보너스 2배!',
      bonuses: doubled,
      fateScore: t.fateScore,
      fateLine: _fateLineLabel(t.fateScore),
    };
  } else if (rng < 0.75) {
    // 실패: 보너스 절반
    if (t.activeBonus?.stats) {
      for (const stat in t.activeBonus.stats) {
        t.activeBonus.stats[stat] = Math.floor(t.activeBonus.stats[stat] * 0.5);
      }
    }
    t.fateScore -= 10;
    return {
      success: true, won: false,
      msg: '💨 운명의 도전 실패... 보너스 절반으로 감소',
      bonuses: t.activeBonus?.stats || {},
      fateScore: t.fateScore,
      fateLine: _fateLineLabel(t.fateScore),
    };
  } else {
    // 대실패: 보너스 전부 사라짐 + 저주
    t.activeBonus = { stats: {}, expiresAt: Date.now() + 24 * 60 * 60 * 1000, cards: t.activeBonus?.cards || [] };
    t.fateScore -= 25;
    return {
      success: true, won: false, cursed: true,
      msg: '💀 운명의 역습! 모든 보너스 소멸 + 운명 점수 -25',
      bonuses: {},
      fateScore: t.fateScore,
      fateLine: _fateLineLabel(t.fateScore),
    };
  }
}

// ── v2.41: 역방향 수용 (역방향 카드의 저주를 받아들이고 보상 획득) ──
function embraceReversed(player) {
  const t = _ensure(player);
  if (!t.lastReading) return { success: false, msg: '먼저 카드를 뽑으세요' };

  const reversedCards = t.lastReading.cards.filter(d => d.reversed);
  if (reversedCards.length === 0) return { success: false, msg: '역방향 카드가 없습니다' };
  if (t.reversedChallengeToday) return { success: false, msg: '오늘 이미 역방향 도전을 했습니다' };

  t.reversedChallengeToday = true;
  t.reversedChallenges++;

  // 역방향 카드 수에 비례해 보상 증가
  const rewardCount = Math.min(reversedCards.length, 2);
  const rewards = [];
  for (let i = 0; i < rewardCount; i++) {
    const reward = REVERSED_CHALLENGE_REWARDS[Math.floor(Math.random() * REVERSED_CHALLENGE_REWARDS.length)];
    rewards.push(reward);
  }

  // 보상 적용
  const appliedBonuses = {};
  for (const reward of rewards) {
    if (reward.bonus.fateScore) t.fateScore += reward.bonus.fateScore;
    if (reward.bonus.gold) player.gold = (player.gold || 0) + reward.bonus.gold;
    if (reward.bonus.stardust && player.constellation) {
      player.constellation.stardust = (player.constellation.stardust || 0) + reward.bonus.stardust;
    }
    if (reward.duration > 0) {
      // 시간 제한 보너스
      for (const [stat, val] of Object.entries(reward.bonus)) {
        if (stat === 'fateScore' || stat === 'gold' || stat === 'stardust') continue;
        appliedBonuses[stat] = (appliedBonuses[stat] || 0) + val;
      }
    }
  }

  if (Object.keys(appliedBonuses).length > 0) {
    t.reversedBonus = {
      stats: appliedBonuses,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
  }

  return {
    success: true,
    rewards,
    msg: `🖤 역방향을 수용! 보상 ${rewards.length}개: ${rewards.map(r => r.name).join(', ')}`,
    fateScore: t.fateScore,
    fateLine: _fateLineLabel(t.fateScore),
  };
}

// ── v2.41: 운명 마일스톤 보상 수령 ──
function claimMilestone(player, score) {
  const t = _ensure(player);
  const milestone = FATE_MILESTONES.find(m => m.score === score);
  if (!milestone) return { success: false, msg: '잘못된 마일스톤' };
  if (t.fateScore < milestone.score) return { success: false, msg: `운명 점수 ${milestone.score} 필요 (현재: ${t.fateScore})` };
  if (t.milestonesClaimed[score]) return { success: false, msg: '이미 수령함' };

  t.milestonesClaimed[score] = Date.now();
  return {
    success: true,
    milestone,
    msg: `${milestone.icon} ${milestone.name} 달성! — ${milestone.desc}`,
  };
}

// ── 상태 조회 ──
function getStatus(player) {
  const t = _ensure(player);
  const today = _today();
  if (t.activeBonus && t.activeBonus.expiresAt < Date.now()) t.activeBonus = null;
  if (t.comboBonus && t.comboBonus.expiresAt < Date.now()) t.comboBonus = null;
  if (t.reversedBonus && t.reversedBonus.expiresAt < Date.now()) t.reversedBonus = null;
  if (t.lastReadDate !== today) t.reversedChallengeToday = false;

  const reversedCount = t.lastReading?.cards?.filter(d => d.reversed)?.length || 0;

  return {
    today,
    readToday: t.lastReadDate === today,
    lastReading: t.lastReading,
    activeBonus: t.activeBonus,
    comboBonus: t.comboBonus,
    reversedBonus: t.reversedBonus,
    fateScore: t.fateScore,
    fateLine: _fateLineLabel(t.fateScore),
    uprightCount: t.uprightCount,
    reversedCount: t.reversedCount,
    readings: t.readings,
    combosTriggered: t.combosTriggered,
    totalCombos: Object.values(t.combosTriggered).reduce((s, v) => s + v, 0),
    canGambit: t.lastReadDate === today && !t.gambitUsed,
    canReversedChallenge: t.lastReadDate === today && reversedCount > 0 && !t.reversedChallengeToday,
    reversedChallenges: t.reversedChallenges,
    milestones: FATE_MILESTONES.map(m => ({
      ...m,
      achieved: t.fateScore >= m.score,
      claimed: !!t.milestonesClaimed[m.score],
    })),
    allCombos: ARCANA_COMBOS.map(c => ({
      name: c.name, icon: c.icon, desc: c.desc, rarity: c.rarity,
      triggered: (t.combosTriggered[c.name] || 0) > 0,
      count: t.combosTriggered[c.name] || 0,
    })),
  };
}

// ── 보너스 합산 ──
function getActiveBonuses(player) {
  const t = _ensure(player);
  const bonuses = {};
  const now = Date.now();

  // 1) 카드 보너스
  if (t.activeBonus && t.activeBonus.expiresAt > now && t.activeBonus.stats) {
    for (const [stat, val] of Object.entries(t.activeBonus.stats)) {
      bonuses[stat] = (bonuses[stat] || 0) + val;
    }
  }

  // 2) 조합 보너스
  if (t.comboBonus && t.comboBonus.expiresAt > now && t.comboBonus.bonus) {
    for (const [stat, val] of Object.entries(t.comboBonus.bonus)) {
      if (stat === 'doubleAll') continue;
      bonuses[stat] = (bonuses[stat] || 0) + val;
    }
    // 천체의 정렬: 모든 보너스 2배
    if (t.comboBonus.bonus.doubleAll) {
      for (const stat in bonuses) {
        bonuses[stat] *= 2;
      }
    }
  }

  // 3) 역방향 수용 보너스
  if (t.reversedBonus && t.reversedBonus.expiresAt > now && t.reversedBonus.stats) {
    for (const [stat, val] of Object.entries(t.reversedBonus.stats)) {
      bonuses[stat] = (bonuses[stat] || 0) + val;
    }
  }

  // 4) 마일스톤 영구 보너스
  for (const milestone of FATE_MILESTONES) {
    if (!t.milestonesClaimed[milestone.score]) continue;
    for (const [stat, val] of Object.entries(milestone.bonus)) {
      bonuses[stat] = (bonuses[stat] || 0) + val;
    }
  }

  return bonuses;
}

module.exports = {
  MAJOR_ARCANA, POSITIONS, ARCANA_COMBOS, FATE_MILESTONES, REVERSED_CHALLENGE_REWARDS,
  getStatus, read, gambit, embraceReversed, claimMilestone, getActiveBonuses,
};

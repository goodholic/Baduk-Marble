// 타로 카드 시스템 — v2.12
// 매일 3장 뽑음 — 과거/현재/미래
// 카드는 정방향/역방향, 각각 다른 의미와 작은 일일 보너스
// 누적 운명 점수에 따라 등급(운명선)이 매겨짐

const MAJOR_ARCANA = [
  { id:0,  name:'바보',          icon:'🃏', upright:'순수한 시작',     reversed:'무모함',      stat:'evasion' },
  { id:1,  name:'마법사',        icon:'🎩', upright:'창조력',          reversed:'기만',        stat:'mp' },
  { id:2,  name:'여사제',        icon:'👸', upright:'직관',            reversed:'비밀',        stat:'crit' },
  { id:3,  name:'여왕',          icon:'👑', upright:'풍요',            reversed:'의존',        stat:'goldBonus' },
  { id:4,  name:'황제',          icon:'🤴', upright:'권위',            reversed:'독재',        stat:'def' },
  { id:5,  name:'교황',          icon:'⛪', upright:'전통',            reversed:'반역',        stat:'expBonus' },
  { id:6,  name:'연인',          icon:'💑', upright:'사랑과 선택',     reversed:'이별',        stat:'allStats' },
  { id:7,  name:'전차',          icon:'🛞', upright:'승리',            reversed:'좌절',        stat:'atk' },
  { id:8,  name:'힘',            icon:'🦁', upright:'용기',            reversed:'유약',        stat:'maxHp' },
  { id:9,  name:'은둔자',        icon:'🕯️', upright:'성찰',            reversed:'고립',        stat:'expBonus' },
  { id:10, name:'운명의 수레바퀴',icon:'☸️', upright:'행운의 전환',     reversed:'불운',        stat:'goldBonus' },
  { id:11, name:'정의',          icon:'⚖️', upright:'균형',            reversed:'불공정',      stat:'def' },
  { id:12, name:'매달린 사람',    icon:'🙃', upright:'희생',            reversed:'정체',        stat:'evasion' },
  { id:13, name:'죽음',          icon:'💀', upright:'재탄생',          reversed:'두려움',      stat:'atk' },
  { id:14, name:'절제',          icon:'🍶', upright:'조화',            reversed:'불균형',      stat:'mp' },
  { id:15, name:'악마',          icon:'😈', upright:'유혹',            reversed:'해방',        stat:'crit' },
  { id:16, name:'탑',            icon:'🗼', upright:'갑작스런 변화',   reversed:'재앙 회피',   stat:'def' },
  { id:17, name:'별',            icon:'⭐', upright:'희망',            reversed:'절망',        stat:'allStats' },
  { id:18, name:'달',            icon:'🌙', upright:'환상',            reversed:'명료함',      stat:'evasion' },
  { id:19, name:'태양',          icon:'☀️', upright:'성공',            reversed:'기쁨의 지연', stat:'expBonus' },
  { id:20, name:'심판',          icon:'📯', upright:'각성',            reversed:'후회',        stat:'allStats' },
  { id:21, name:'세계',          icon:'🌍', upright:'완성',            reversed:'미완',        stat:'allStats' },
];

const POSITIONS = ['과거','현재','미래'];

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
      lastReading: null,    // {date, cards: [{card, reversed, position}]}
      activeBonus: null,    // {stat, value, expiresAt}
      fateScore: 0,
      uprightCount: 0,
      reversedCount: 0,
      readings: 0,
    };
  }
  return player.tarot;
}

function getStatus(player) {
  const t = _ensure(player);
  const today = _today();
  if (t.activeBonus && t.activeBonus.expiresAt < Date.now()) t.activeBonus = null;
  return {
    today,
    readToday: t.lastReadDate === today,
    lastReading: t.lastReading,
    activeBonus: t.activeBonus,
    fateScore: t.fateScore,
    fateLine: _fateLineLabel(t.fateScore),
    uprightCount: t.uprightCount,
    reversedCount: t.reversedCount,
    readings: t.readings,
  };
}

function _fateLineLabel(score) {
  if (score >= 200) return '🌟 별의 후예';
  if (score >= 100) return '✨ 빛나는 운명';
  if (score >= 50)  return '☀️ 밝은 운명';
  if (score >= 0)   return '⚖️ 균형';
  if (score >= -50) return '🌑 어두운 운명';
  return '💀 저주받은 운명';
}

function read(player) {
  const t = _ensure(player);
  const today = _today();
  if (t.lastReadDate === today) {
    return { success:false, msg:'오늘의 점은 이미 봄' };
  }
  // 결정론적 시드 → 같은 날 같은 결과
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
  // 활성 보너스 = 현재 카드의 stat
  const present = drawn[1];
  const value = present.reversed ? 3 : 8;
  t.activeBonus = {
    stat: present.card.stat,
    value,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    cardName: present.card.name,
    reversed: present.reversed,
  };
  t.lastReadDate = today;
  t.lastReading = { date: today, cards: drawn };
  t.readings += 1;
  return {
    success: true,
    msg: drawn.map(d => `${d.card.icon}${d.card.name}${d.reversed ? '(역)' : ''}`).join(' | '),
    cards: drawn,
    bonus: t.activeBonus,
    fateLine: _fateLineLabel(t.fateScore),
  };
}

function getActiveBonuses(player) {
  const t = _ensure(player);
  if (!t.activeBonus || t.activeBonus.expiresAt < Date.now()) return {};
  return { [t.activeBonus.stat]: t.activeBonus.value };
}

module.exports = {
  MAJOR_ARCANA,
  POSITIONS,
  getStatus,
  read,
  getActiveBonuses,
};

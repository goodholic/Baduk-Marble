// ==========================================
// 영웅의 전당 (Hall of Heroes) — v2.51
// 서버 최초 달성 기록 + 영구 서버 버프 + 전설 유물
// ==========================================

// ── 전당 등록 가능 업적 (서버 최초 1인만) ──
const HALL_ACHIEVEMENTS = {
  first_lv50:       { name: '최초의 영웅', icon: '🏆', desc: '서버 최초 Lv.50 달성', category: 'growth', serverBuff: { expBonus: 0.03 }, relic: 'relic_first_hero' },
  first_prestige:   { name: '최초의 환생자', icon: '♻️', desc: '서버 최초 환생', category: 'growth', serverBuff: { goldBonus: 0.03 }, relic: 'relic_reborn' },
  first_prestige5:  { name: '윤회의 선구자', icon: '🔄', desc: '서버 최초 5차 환생', category: 'growth', serverBuff: { expBonus: 0.05 }, relic: 'relic_cycle' },
  first_worldboss:  { name: '세계의 수호자', icon: '🐉', desc: '서버 최초 월드 보스 처치', category: 'combat', serverBuff: { atk: 5 }, relic: 'relic_dragonslayer' },
  first_pvp100:     { name: '투기장의 전설', icon: '⚔️', desc: '서버 최초 PvP 100승', category: 'combat', serverBuff: { crit: 1 }, relic: 'relic_gladiator' },
  first_master_tier:{ name: '마스터의 길', icon: '👑', desc: '서버 최초 아레나 마스터 티어', category: 'combat', serverBuff: { atk: 3, def: 3 }, relic: 'relic_champion' },
  first_legendary:  { name: '전설의 발견자', icon: '✨', desc: '서버 최초 전설 장비 획득', category: 'collect', serverBuff: { dropRate: 0.02 }, relic: 'relic_fortune' },
  first_runeword:   { name: '룬의 현자', icon: '🔮', desc: '서버 최초 룬 워드 발동', category: 'collect', serverBuff: { allStats: 2 }, relic: 'relic_runemaster' },
  first_awaken:     { name: '각성의 선구자', icon: '⚡', desc: '서버 최초 2차 각성', category: 'growth', serverBuff: { atk: 5, def: 5 }, relic: 'relic_awakened' },
  first_bloodline3: { name: '혈맹의 시조', icon: '🩸', desc: '서버 최초 혈맹 3단계', category: 'growth', serverBuff: { maxHp: 50 }, relic: 'relic_ancestor' },
  first_grimoire_t3:{ name: '금서의 지배자', icon: '📕', desc: '서버 최초 Tier 3 금서 해독', category: 'collect', serverBuff: { mp: 10 }, relic: 'relic_forbidden' },
  first_golem_t5:   { name: '인형사', icon: '⚙️', desc: '서버 최초 태초의 골렘 조립', category: 'craft', serverBuff: { def: 5 }, relic: 'relic_puppeteer' },
  first_alchemy_t4: { name: '현자의 돌', icon: '⚗️', desc: '서버 최초 전설 연금술 성공', category: 'craft', serverBuff: { goldBonus: 0.03 }, relic: 'relic_philosopher' },
  first_mutant_all: { name: '변이 사냥꾼', icon: '🧬', desc: '서버 최초 변이 도감 완성', category: 'collect', serverBuff: { dropRate: 0.03 }, relic: 'relic_mutant_hunter' },
  first_constellation:{ name: '별의 지배자', icon: '🌌', desc: '서버 최초 60노드 해금', category: 'collect', serverBuff: { allStats: 3 }, relic: 'relic_starmaster' },
  first_million_gold:{ name: '백만장자', icon: '💰', desc: '서버 최초 골드 1,000,000 보유', category: 'economy', serverBuff: { goldBonus: 0.05 }, relic: 'relic_midas' },
};

// ── 전설 유물 (전당 등록자에게 부여) ──
const RELICS = {
  relic_first_hero:    { name: '최초 영웅의 검', icon: '🗡️🏆', stats: { atk: 30, def: 10 }, special: 'EXP +10% 영구', color: '#ffd700' },
  relic_reborn:        { name: '환생의 반지', icon: '💍♻️', stats: { maxHp: 200 }, special: '환생 보너스 +20%', color: '#44ff88' },
  relic_cycle:         { name: '윤회의 목걸이', icon: '📿🔄', stats: { allStats: 10 }, special: '전생 기억 슬롯 +1', color: '#aa44ff' },
  relic_dragonslayer:  { name: '용살자의 갑옷', icon: '🛡️🐉', stats: { atk: 25, def: 25, maxHp: 300 }, special: '보스 데미지 +15%', color: '#ff4400' },
  relic_gladiator:     { name: '검투사의 투구', icon: '⚔️👑', stats: { atk: 20, crit: 8 }, special: 'PvP 데미지 +10%', color: '#ff6b6b' },
  relic_champion:      { name: '챔피언의 망토', icon: '🧥👑', stats: { atk: 15, def: 15, spd: 5 }, special: '아레나 포인트 +20%', color: '#44aaff' },
  relic_fortune:       { name: '행운의 부적', icon: '🍀✨', stats: { goldBonus: 15 }, special: '전설 드롭률 x1.5', color: '#ffd700' },
  relic_runemaster:    { name: '룬 마스터의 지팡이', icon: '🔮🪄', stats: { atk: 20, mp: 50 }, special: '룬 효과 +20%', color: '#aa44ff' },
  relic_awakened:      { name: '각성자의 오브', icon: '⚡🔮', stats: { atk: 20, def: 20 }, special: '각성 보너스 +15%', color: '#ff8800' },
  relic_ancestor:      { name: '시조의 피', icon: '🩸👑', stats: { maxHp: 500 }, special: '혈맹 패시브 +20%', color: '#aa22ff' },
  relic_forbidden:     { name: '금서의 열쇠', icon: '📕🔑', stats: { mp: 80, atk: 15 }, special: '금서 대가 -20%', color: '#8844cc' },
  relic_puppeteer:     { name: '인형사의 실', icon: '⚙️🧵', stats: { def: 20, maxHp: 200 }, special: '골렘 스탯 +30%', color: '#ff8800' },
  relic_philosopher:   { name: '현자의 증표', icon: '⚗️💎', stats: { allStats: 8 }, special: '연금술 성공률 +15%', color: '#ffd700' },
  relic_mutant_hunter: { name: '변이 사냥꾼의 눈', icon: '🧬👁️', stats: { crit: 10, atk: 15 }, special: '변이 출현률 x2', color: '#ff44ff' },
  relic_starmaster:    { name: '별의 왕관', icon: '🌌👑', stats: { allStats: 15 }, special: '별가루 획득 x2', color: '#ffffff' },
  relic_midas:         { name: '마이다스의 장갑', icon: '💰🧤', stats: { goldBonus: 25 }, special: '상점 할인 15%', color: '#ffd700' },
};

// ── 서버 전역 상태 (메모리 내) ──
let _hallRecords = {};   // { achievementId: { playerId, playerName, timestamp } }
let _serverBuffs = {};   // 합산된 서버 버프

function init(savedRecords) {
  _hallRecords = savedRecords || {};
  _recalcServerBuffs();
}

function _recalcServerBuffs() {
  _serverBuffs = {};
  for (const [achId, record] of Object.entries(_hallRecords)) {
    const ach = HALL_ACHIEVEMENTS[achId];
    if (!ach?.serverBuff) continue;
    for (const [stat, val] of Object.entries(ach.serverBuff)) {
      _serverBuffs[stat] = (_serverBuffs[stat] || 0) + val;
    }
  }
}

// ── 업적 달성 등록 (서버 최초인지 확인) ──
function tryRegister(achievementId, player) {
  const ach = HALL_ACHIEVEMENTS[achievementId];
  if (!ach) return null;
  if (_hallRecords[achievementId]) return null; // 이미 누군가 달성

  _hallRecords[achievementId] = {
    playerId: player.id,
    playerName: player.displayName || player.className || 'Unknown',
    timestamp: Date.now(),
  };
  _recalcServerBuffs();

  // 유물 부여
  if (!player._hallRelics) player._hallRelics = [];
  if (ach.relic && !player._hallRelics.includes(ach.relic) && player._hallRelics.length < 50) {
    player._hallRelics.push(ach.relic);
  }

  return {
    achievement: ach,
    relic: RELICS[ach.relic],
    serverBuff: ach.serverBuff,
  };
}

// ── 서버 전체 버프 가져오기 ──
function getServerBuffs() {
  return { ..._serverBuffs };
}

// ── 플레이어 유물 보너스 ──
function getRelicBonuses(player) {
  if (!player._hallRelics || player._hallRelics.length === 0) return {};
  const bonuses = {};
  for (const relicId of player._hallRelics) {
    const relic = RELICS[relicId];
    if (!relic?.stats) continue;
    for (const [stat, val] of Object.entries(relic.stats)) {
      bonuses[stat] = (bonuses[stat] || 0) + val;
    }
  }
  return bonuses;
}

// ── 전당 기록 가져오기 ──
function getRecords() {
  return _hallRecords;
}

// ── 상태 조회 ──
function getStatus(player) {
  const records = [];
  const unclaimed = [];

  for (const [achId, ach] of Object.entries(HALL_ACHIEVEMENTS)) {
    const record = _hallRecords[achId];
    if (record) {
      records.push({
        id: achId, ...ach, relic: RELICS[ach.relic],
        holder: record.playerName,
        holderId: record.playerId,
        timestamp: record.timestamp,
        isMe: record.playerId === player.id,
      });
    } else {
      unclaimed.push({ id: achId, ...ach, relic: RELICS[ach.relic] });
    }
  }

  // 플레이어 유물
  const myRelics = (player._hallRelics || []).map(id => {
    const r = RELICS[id];
    return r ? { id, ...r } : null;
  }).filter(Boolean);

  return {
    records,
    unclaimed,
    serverBuffs: _serverBuffs,
    totalAchievements: Object.keys(HALL_ACHIEVEMENTS).length,
    claimedCount: records.length,
    myRelics,
    myRelicCount: myRelics.length,
  };
}

module.exports = {
  HALL_ACHIEVEMENTS, RELICS,
  init, tryRegister, getServerBuffs, getRelicBonuses, getRecords, getStatus,
};

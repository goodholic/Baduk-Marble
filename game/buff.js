// 버프 & 디버프 시스템
const BUFF_TYPES = {
  // 버프
  atk_boost:   { name:'공격 증가',  stat:'atk',      multi:1.3, duration:60,  icon:'buff' },
  def_boost:   { name:'방어 증가',  stat:'def',      multi:1.3, duration:60,  icon:'buff' },
  speed_boost: { name:'속도 증가',  stat:'speed',    multi:1.5, duration:30,  icon:'buff' },
  exp_boost:   { name:'경험치 증가', stat:'expMulti', multi:2.0, duration:300, icon:'buff' },
  food_hp:     { name:'생선 스튜',  stat:'maxHp',    add:200,   duration:180, icon:'food' },
  food_atk:    { name:'황금 수프',  stat:'atk',      add:15,    duration:180, icon:'food' },
  food_all:    { name:'용의 만찬',  stat:'all',      add:10,    duration:300, icon:'food' },
  berserker:   { name:'버서커',    stat:'atk',      multi:2.0, duration:15,  icon:'skill' },
  shield:      { name:'철벽 방어',  stat:'def',      multi:3.0, duration:5,   icon:'skill' },
  // 디버프
  poison:      { name:'독',       stat:'hp',    dot:-15,   duration:5,  icon:'debuff' },
  slow:        { name:'슬로우',    stat:'speed', multi:0.5, duration:3,  icon:'debuff' },
  stun:        { name:'스턴',     stat:'stun',  duration:1, icon:'debuff' },
  burn:        { name:'화상',     stat:'hp',    dot:-25,   duration:5,  icon:'debuff' },
  curse:       { name:'저주',     stat:'healReduce', multi:0.5, duration:10, icon:'debuff' },
};

function applyBuff(player, buffId) {
  if (!BUFF_TYPES[buffId]) return;
  if (!player.activeBuffs) player.activeBuffs = {};
  player.activeBuffs[buffId] = {
    ...BUFF_TYPES[buffId],
    startTime: Date.now(),
    endTime: Date.now() + BUFF_TYPES[buffId].duration * 1000,
  };
}

function removeBuff(player, buffId) {
  if (player.activeBuffs) delete player.activeBuffs[buffId];
}

function updateBuffs(player) {
  if (!player.activeBuffs) return;
  const now = Date.now();
  for (const [id, buff] of Object.entries(player.activeBuffs)) {
    if (now >= buff.endTime) {
      delete player.activeBuffs[id];
      continue;
    }
    // DOT 데미지 (매초)
    if (buff.dot && buff.lastTick !== Math.floor(now / 1000)) {
      buff.lastTick = Math.floor(now / 1000);
      player.hp += buff.dot; // dot is negative for damage
      if (player.hp <= 0) player.hp = 1;
    }
  }
}

function getBuffedStat(player, stat) {
  let base = player[stat] || 0;
  if (!player.activeBuffs) return base;
  for (const buff of Object.values(player.activeBuffs)) {
    if (buff.stat === stat && buff.multi) base *= buff.multi;
    if (buff.stat === stat && buff.add) base += buff.add;
    if (buff.stat === 'all' && buff.add) base += buff.add;
  }
  return Math.floor(base);
}

function isStunned(player) {
  if (!player.activeBuffs) return false;
  return !!player.activeBuffs['stun'];
}

// 칭호 시스템
const TITLES = {
  title_first_pk:    { name:'피의 세례',     cond:'첫 PK',        color:'#ff4444' },
  title_slayer:      { name:'학살자',        cond:'PK 100회',     color:'#aa0000' },
  title_dragon:      { name:'드래곤 슬레이어', cond:'드래곤 100 처치', color:'#ffa500' },
  title_merchant:    { name:'거상',          cond:'교역 이익 10만G', color:'#ffd700' },
  title_tamer:       { name:'포켓몬 마스터',  cond:'테이밍 50마리',  color:'#44aaff' },
  title_millionaire: { name:'백만장자',       cond:'골드 100만 보유', color:'#ffd700' },
  title_warlord:     { name:'전쟁의 신',      cond:'PvP 1000승',   color:'#ff4444' },
};

function checkTitles(player) {
  if (!player.titles) player.titles = [];
  if (player.killCount >= 1 && !player.titles.includes('title_first_pk')) player.titles.push('title_first_pk');
  if (player.killCount >= 100 && !player.titles.includes('title_slayer')) player.titles.push('title_slayer');
  if ((player.morphKills?.dragon||0) >= 100 && !player.titles.includes('title_dragon')) player.titles.push('title_dragon');
  if ((player.totalTradeProfit||0) >= 100000 && !player.titles.includes('title_merchant')) player.titles.push('title_merchant');
  if ((player.totalTamed||0) >= 50 && !player.titles.includes('title_tamer')) player.titles.push('title_tamer');
  if (player.gold >= 1000000 && !player.titles.includes('title_millionaire')) player.titles.push('title_millionaire');
}

module.exports = { BUFF_TYPES, applyBuff, removeBuff, updateBuffs, getBuffedStat, isStunned, TITLES, checkTitles };

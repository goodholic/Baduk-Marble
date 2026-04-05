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
  food_def:    { name:'전사의 식사', stat:'def',    add:15,    duration:180, icon:'food' },
  food_spd:    { name:'쾌속 차',    stat:'speed',   add:5,     duration:120, icon:'food' },
  berserker:   { name:'버서커',    stat:'atk',      multi:2.0, duration:15,  icon:'skill' },
  berserk_penalty: { name:'버서커 약화', stat:'def',  multi:0.5, duration:15,  icon:'debuff' },
  shield:      { name:'철벽 방어',  stat:'def',      multi:3.0, duration:5,   icon:'skill' },
  stealth:     { name:'은신',      stat:'stealth',  duration:5,              icon:'skill' },
  war_cry:     { name:'전투 함성',  stat:'atk',      multi:1.2, duration:10,  icon:'skill' },
  iron_wall:   { name:'철벽 방어',  stat:'dmgReduce', multi:0.3, duration:5,  icon:'skill' },
  divine_shield: { name:'신성한 방벽', stat:'invincible', duration:3,         icon:'skill' },
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

// 칭호 시스템 (기획서 확장)
const TITLES = {
  // 전투 칭호
  title_first_pk:    { name:'피의 세례',     cond:'첫 PK',         color:'#ff4444',  effect:null },
  title_slayer:      { name:'학살자',        cond:'PK 100회',      color:'#aa0000',  effect:{ stat:'atk', multi:0.03 } },
  title_warlord:     { name:'전쟁의 신',      cond:'PvP 1000승',   color:'#ffd700',  effect:{ stat:'atk', multi:0.05 } },
  title_dragon:      { name:'드래곤 슬레이어', cond:'드래곤 100 처치', color:'#ffa500', effect:{ stat:'bossDmg', multi:0.10 } },
  title_dungeon:     { name:'던전 정복자',    cond:'던전 10회 클리어', color:'#aa44ff', effect:{ stat:'expBonus', multi:0.15 } },
  // 경제 칭호
  title_merchant:    { name:'거상',          cond:'교역 이익 10만G', color:'#ffd700',  effect:{ stat:'marketFee', multi:-0.02 } },
  title_millionaire: { name:'백만장자',       cond:'골드 100만 보유', color:'#ffd700',  effect:null },
  title_crafter:     { name:'마스터 대장장이', cond:'제작 50회',      color:'#4488ff',  effect:{ stat:'craftBonus', multi:0.05 } },
  // 소셜 칭호
  title_tamer:       { name:'포켓몬 마스터',  cond:'테이밍 50마리',  color:'#44aaff',  effect:null },
  title_arena_king:  { name:'투기장 왕',      cond:'아레나 100승',   color:'#ff4444',  effect:{ stat:'atk', multi:0.05 } },
  title_guild_master:{ name:'혈맹의 별',      cond:'혈맹 Lv.5 달성', color:'#aa44ff',  effect:null },
  // 랭킹 칭호 (주간 초기화)
  title_rank_level:  { name:'서버 최강자',    cond:'레벨 1위 (주간)', color:'#ffd700',  effect:{ stat:'expBonus', multi:0.20 }, weekly:true },
  title_rank_pvp:    { name:'최강 전사',      cond:'PvP 1위 (주간)', color:'#ff4444',  effect:{ stat:'atk', multi:0.10 }, weekly:true },
  title_rank_guild:  { name:'최고의 혈맹',    cond:'혈맹 1위 (주간)', color:'#aa44ff',  effect:null, weekly:true },
};

function checkTitles(player) {
  if (!player.titles) player.titles = [];
  const addTitle = (id) => { if (!player.titles.includes(id)) { player.titles.push(id); return true; } return false; };

  if (player.killCount >= 1) addTitle('title_first_pk');
  if (player.killCount >= 100) addTitle('title_slayer');
  if ((player.pvpWins || 0) >= 1000) addTitle('title_warlord');
  if ((player.morphKills?.dragon||0) >= 100) addTitle('title_dragon');
  if ((player.dungeonClears||0) >= 10) addTitle('title_dungeon');
  if ((player.totalTradeProfit||0) >= 100000) addTitle('title_merchant');
  if ((player.totalTamed||0) >= 50) addTitle('title_tamer');
  if (player.gold >= 1000000) addTitle('title_millionaire');
  if ((player.totalCrafts||0) >= 50) addTitle('title_crafter');
  if ((player.arenaWins||0) >= 100) addTitle('title_arena_king');
}

// 칭호 효과 계산
function getTitleBonus(player, stat) {
  if (!player.titles || !player.activeTitle) return 0;
  const title = TITLES[player.activeTitle];
  if (!title || !title.effect || title.effect.stat !== stat) return 0;
  return title.effect.multi || 0;
}

module.exports = { BUFF_TYPES, applyBuff, removeBuff, updateBuffs, getBuffedStat, isStunned, TITLES, checkTitles, getTitleBonus };

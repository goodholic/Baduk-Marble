// 음악/연주 시스템 — v2.11
// 악기를 사고, 곡을 익히고, 연주하면 일시 버프 — 명연주는 주변 플레이어에게도 영향

const INSTRUMENTS = {
  flute:     { name:'피리',     icon:'🪈', price:300,  affinity:'wind' },
  lyre:      { name:'리라',     icon:'🪕', price:600,  affinity:'string' },
  drum:      { name:'드럼',     icon:'🥁', price:500,  affinity:'percussion' },
  horn:      { name:'호른',     icon:'📯', price:1500, affinity:'brass' },
  violin:    { name:'바이올린', icon:'🎻', price:3000, affinity:'string' },
  saxophone: { name:'색소폰',   icon:'🎷', price:5000, affinity:'wind' },
};

const SONGS = {
  // 시작 곡 (모두 해금)
  lullaby:        { name:'자장가',       affinity:'wind',     buff:{ stat:'maxHp', value:30, durationMin:10 }, default:true },
  marching:       { name:'행진곡',       affinity:'percussion',buff:{ stat:'atk',   value:6,  durationMin:10 }, default:true },
  // 구매 곡
  battle_hymn:    { name:'전투 찬가',    affinity:'brass',    buff:{ stat:'atk',   value:12, durationMin:15 }, price:1000 },
  silver_string:  { name:'은빛 현',      affinity:'string',   buff:{ stat:'crit',  value:6,  durationMin:15 }, price:1500 },
  thunder_beat:   { name:'천둥의 박자',  affinity:'percussion',buff:{ stat:'def',   value:15, durationMin:15 }, price:1200 },
  wind_whisper:   { name:'바람의 속삭임',affinity:'wind',     buff:{ stat:'evasion',value:6, durationMin:15 }, price:1300 },
  hero_ballad:    { name:'영웅의 발라드',affinity:'string',   buff:{ stat:'allStats',value:4,durationMin:20 }, price:5000 },
  divine_anthem:  { name:'신의 송가',    affinity:'brass',    buff:{ stat:'expBonus',value:20,durationMin:30 }, price:10000 },
};

const COOLDOWN_SECONDS = 30;

function _ensure(player) {
  if (!player.music) {
    player.music = {
      instruments: [],          // 보유 악기
      activeInstrument: null,
      songs: ['lullaby','marching'],  // 익힌 곡
      activeBuff: null,         // {stat,value,expiresAt,song}
      lastPerformAt: 0,
      performances: 0,
    };
  }
  return player.music;
}

function getStatus(player) {
  const m = _ensure(player);
  if (m.activeBuff && m.activeBuff.expiresAt < Date.now()) m.activeBuff = null;
  return {
    instruments: m.instruments,
    activeInstrument: m.activeInstrument,
    songs: m.songs,
    activeBuff: m.activeBuff,
    performances: m.performances,
    cooldownSecondsLeft: Math.max(0, Math.ceil((m.lastPerformAt + COOLDOWN_SECONDS*1000 - Date.now()) / 1000)),
    allInstruments: INSTRUMENTS,
    allSongs: SONGS,
  };
}

function buyInstrument(player, instrumentId) {
  const m = _ensure(player);
  const def = INSTRUMENTS[instrumentId];
  if (!def) return { success:false, msg:'존재하지 않는 악기' };
  if (m.instruments.includes(instrumentId)) return { success:false, msg:'이미 보유 중' };
  if ((player.gold || 0) < def.price) return { success:false, msg:`골드 ${def.price} 부족` };
  player.gold -= def.price;
  m.instruments.push(instrumentId);
  if (!m.activeInstrument) m.activeInstrument = instrumentId;
  return { success:true, msg:`${def.icon} ${def.name} 구매!` };
}

function equipInstrument(player, instrumentId) {
  const m = _ensure(player);
  if (!m.instruments.includes(instrumentId)) return { success:false, msg:'미보유 악기' };
  m.activeInstrument = instrumentId;
  return { success:true, msg:`${INSTRUMENTS[instrumentId].name} 장착` };
}

function learnSong(player, songId) {
  const m = _ensure(player);
  const def = SONGS[songId];
  if (!def) return { success:false, msg:'존재하지 않는 곡' };
  if (m.songs.includes(songId)) return { success:false, msg:'이미 익힘' };
  if (def.default) return { success:false, msg:'기본 곡' };
  if ((player.gold || 0) < def.price) return { success:false, msg:`골드 ${def.price} 부족` };
  player.gold -= def.price;
  m.songs.push(songId);
  return { success:true, msg:`${def.name} 악보 습득` };
}

function perform(player, songId) {
  const m = _ensure(player);
  const song = SONGS[songId];
  if (!song) return { success:false, msg:'존재하지 않는 곡' };
  if (!m.songs.includes(songId)) return { success:false, msg:'미습득 곡' };
  if (!m.activeInstrument) return { success:false, msg:'악기 없음' };
  const now = Date.now();
  if (now < m.lastPerformAt + COOLDOWN_SECONDS * 1000) {
    return { success:false, msg:`쿨다운 ${Math.ceil((m.lastPerformAt + COOLDOWN_SECONDS*1000 - now)/1000)}초` };
  }
  // 악기와 곡의 affinity 일치 보너스
  const instrument = INSTRUMENTS[m.activeInstrument];
  const matched = instrument.affinity === song.affinity;
  const value = matched ? Math.floor(song.buff.value * 1.5) : song.buff.value;
  m.activeBuff = {
    song: song.name,
    stat: song.buff.stat,
    value,
    expiresAt: now + song.buff.durationMin * 60 * 1000,
    matched,
  };
  m.lastPerformAt = now;
  m.performances += 1;
  return {
    success:true,
    msg:`${instrument.icon} ${player.displayName || ''} ♪ ${song.name} 연주! +${value} ${song.buff.stat}${matched ? ' (✨공명!)' : ''} (${song.buff.durationMin}분)`,
    buff: m.activeBuff,
    matched,
  };
}

function getActiveBonuses(player) {
  const m = _ensure(player);
  if (!m.activeBuff || m.activeBuff.expiresAt < Date.now()) return {};
  return { [m.activeBuff.stat]: m.activeBuff.value };
}

module.exports = {
  INSTRUMENTS,
  SONGS,
  COOLDOWN_SECONDS,
  getStatus,
  buyInstrument,
  equipInstrument,
  learnSong,
  perform,
  getActiveBonuses,
};

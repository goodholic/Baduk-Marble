// v5.9 — 용병 음악 밴드 시스템
// 용병으로 밴드 결성, 공연, 버프 효과, 음악 대전

const MAX_BAND_SIZE = 5;

const INSTRUMENTS = [
  { id: 'sword_guitar', name: '검 기타', icon: '⚔️🎸', role: 'lead', buff: { atk: 1.1 }, desc: '리드 기타, 공격 버프' },
  { id: 'shield_drum', name: '방패 드럼', icon: '🛡️🥁', role: 'rhythm', buff: { def: 1.1 }, desc: '리듬, 방어 버프' },
  { id: 'staff_flute', name: '지팡이 플룻', icon: '🪄🎵', role: 'melody', buff: { matk: 1.1, heal: 1.1 }, desc: '멜로디, 마법+힐 버프' },
  { id: 'bow_harp', name: '활 하프', icon: '🏹🎵', role: 'harmony', buff: { spd: 1.1, crit: 1.05 }, desc: '하모니, 속도+크리 버프' },
  { id: 'fist_bass', name: '주먹 베이스', icon: '👊🎸', role: 'bass', buff: { hp: 1.1, teamMorale: 1.1 }, desc: '베이스, HP+사기 버프' },
  { id: 'voice', name: '노래(보컬)', icon: '🎤', role: 'vocal', buff: { allStat: 1.05 }, desc: '보컬, 전체 버프' },
];

// 음악 장르 (밴드 구성에 따라 결정)
const GENRES = [
  { id: 'rock', name: '배틀 록', icon: '🎸🔥', req: ['lead', 'bass', 'rhythm'], buff: { teamAtk: 1.15, morale: 1.2 }, desc: '공격적인 전투 음악' },
  { id: 'ballad', name: '힐링 발라드', icon: '🎵💚', req: ['melody', 'vocal', 'harmony'], buff: { teamHeal: 1.3, regen: 0.03 }, desc: '치유의 음악' },
  { id: 'symphony', name: '전쟁 교향곡', icon: '🎻⚔️', req: ['lead', 'melody', 'harmony', 'rhythm', 'vocal'], buff: { teamAll: 1.1, duration: 2 }, desc: '5인 풀밴드! 최강 버프' },
  { id: 'punk', name: '반항의 펑크', icon: '🎸💀', req: ['lead', 'bass'], buff: { atk: 1.2, def: 0.9, morale: 1.3 }, desc: '공격 특화 펑크' },
  { id: 'lullaby', name: '자장가', icon: '🎵😴', req: ['melody', 'vocal'], buff: { enemySleep: 0.1, teamRegen: 0.05 }, desc: '적을 잠들게 하는 음악' },
];

// 공연 시스템
const PERFORMANCE_VENUES = [
  { id: 'tavern', name: '주점', icon: '🍺🎵', audience: 20, goldPerViewer: 100, desc: '소규모 공연' },
  { id: 'plaza', name: '광장', icon: '🏛️🎵', audience: 100, goldPerViewer: 50, desc: '야외 공연' },
  { id: 'colosseum', name: '콜로세움', icon: '🏟️🎵', audience: 500, goldPerViewer: 30, desc: '대규모 공연' },
  { id: 'castle', name: '왕성', icon: '🏰🎵', audience: 50, goldPerViewer: 500, desc: '왕에게 바치는 공연, VIP' },
  { id: 'battlefield', name: '전장', icon: '⚔️🎵', audience: 0, goldPerViewer: 0, desc: '전투 중 연주! 실시간 버프', battleBuff: true },
];

// 음악 대전 (밴드 vs 밴드)
const MUSIC_BATTLE_ROUNDS = 3;
const MUSIC_BATTLE_REWARDS = {
  winner: { gold: 20000, fame: 50, title: '음악의 왕' },
  loser:  { gold: 5000, fame: 10 },
  draw:   { gold: 10000, fame: 25 },
};

function formBand(player, mercIds, bandName) {
  if (mercIds.length < 2 || mercIds.length > MAX_BAND_SIZE) return { ok: false, reason: `2~${MAX_BAND_SIZE}명 필요` };
  const mercs = (player.mercenaries || []).filter(m => mercIds.includes(m.id));
  if (mercs.length !== mercIds.length) return { ok: false, reason: '용병 부족' };

  player.band = { name: bandName || '무명 밴드', members: mercIds, instruments: {}, formed: Date.now(), fame: 0 };
  return { ok: true, band: player.band };
}

function register(io, socket, player) {
  socket.on('band_info', () => {
    socket.emit('band_info', { instruments: INSTRUMENTS, genres: GENRES, venues: PERFORMANCE_VENUES, battleRewards: MUSIC_BATTLE_REWARDS, myBand: player.band });
  });
  socket.on('band_form', (data) => {
    const result = formBand(player, data.mercIds || [], data.bandName);
    socket.emit('band_form_result', result);
    if (result.ok) io.emit('server_msg', `🎵 [밴드] "${result.band.name}" 결성! (${result.band.members.length}인 밴드)`);
  });
  socket.on('band_perform', (data) => {
    const venue = PERFORMANCE_VENUES.find(v => v.id === data.venueId);
    if (!venue) return socket.emit('band_perform_result', { ok: false });
    const gold = venue.audience * venue.goldPerViewer;
    player.gold = (player.gold || 0) + gold;
    if (player.band) player.band.fame = (player.band.fame || 0) + venue.audience;
    socket.emit('band_perform_result', { ok: true, venue: venue.name, gold, fame: venue.audience });
    if (venue.audience >= 100) io.emit('server_msg', `🎵🎉 [공연] "${player.band?.name}"의 공연! ${venue.audience}명 관중!`);
  });
}

module.exports = { INSTRUMENTS, GENRES, PERFORMANCE_VENUES, MUSIC_BATTLE_REWARDS, MAX_BAND_SIZE, formBand, register };

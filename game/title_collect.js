// 칭호 컬렉션 & 외형 효과 — v2.59
// 수집 가능한 칭호, 장착 시 이름 옆 이펙트 + 스탯 보너스

const TITLES = {
  first_kill:    { name: '첫 걸음',      icon: '🗡️', color: '#888',    bonus: null, how: '첫 몬스터 처치' },
  slayer:        { name: '학살자',       icon: '💀', color: '#ff4444', bonus: { atk: 3 }, how: '1000마리 처치' },
  boss_hunter:   { name: '보스 사냥꾼',  icon: '🐲', color: '#ff8800', bonus: { atk: 5, critRate: 2 }, how: '보스 10마리' },
  pvp_fighter:   { name: 'PvP 전사',     icon: '⚔️', color: '#ff6b6b', bonus: { atk: 2 }, how: 'PvP 10승' },
  arena_master:  { name: '투기장 마스터', icon: '🏆', color: '#ffd700', bonus: { atk: 8, def: 5 }, how: '마스터 티어' },
  last_standing: { name: '최후의 생존자',icon: '🏟️', color: '#ff4444', bonus: { hp: 100 }, how: '배틀로얄 우승' },
  explorer:      { name: '탐험가',       icon: '🗺️', color: '#44aaff', bonus: { speed: 1 }, how: '10존 방문' },
  dungeon_master:{ name: '던전 마스터',  icon: '🏰', color: '#aa44ff', bonus: { atk: 5, def: 5 }, how: '던전 20회' },
  legend:        { name: '전설',         icon: '👑', color: '#ffd700', bonus: { atk: 5, def: 5, hp: 50 }, how: 'Lv.50' },
  world_savior:  { name: '세계의 구원자',icon: '✨', color: '#ffffff', bonus: { atk: 10, def: 10, hp: 200 }, how: '스토리 완료' },
  dragon_king:   { name: '용왕',         icon: '🐲', color: '#ff4400', bonus: { atk: 15, def: 10 }, how: '드래곤 8종' },
  graduate:      { name: '졸업생',       icon: '🎓', color: '#44ff88', bonus: { expBonus: 5 }, how: '튜토리얼' },
  rich:          { name: '백만장자',     icon: '💎', color: '#55ccff', bonus: { goldBonus: 20 }, how: '100만G' },
  season_legend: { name: '시즌 전설',    icon: '🌟', color: '#ff00ff', bonus: { atk: 8, expBonus: 10 }, how: '시즌 전설' },
  bounty_king:   { name: '현상금 왕',    icon: '💰', color: '#ffd700', bonus: { goldBonus: 10 }, how: '20킬 스트릭' },
};

function getOwnedTitles(player) {
  const owned = [];
  for (const [id, t] of Object.entries(TITLES)) {
    if (player.title === id || (player._achievements && player._achievements[id]) || (player.titles && player.titles.includes(id)))
      owned.push({ id, ...t });
  }
  return owned;
}

function equipTitle(player, titleId) {
  const t = TITLES[titleId];
  if (!t) return { success: false, msg: '존재하지 않는 칭호' };
  if (!getOwnedTitles(player).some(o => o.id === titleId)) return { success: false, msg: '미보유 칭호' };
  player._equippedTitle = titleId;
  player.title = titleId;
  return { success: true, msg: t.icon + ' ' + t.name + ' 장착!', title: { id: titleId, ...t } };
}

function registerTitleCollectHandlers(socket, playerId, players, io) {
  socket.on('title_collection', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('title_collection', {
      owned: getOwnedTitles(p),
      equipped: p._equippedTitle || p.title || null,
      all: Object.entries(TITLES).map(([id, t]) => ({ id, ...t, owned: getOwnedTitles(p).some(o => o.id === id) })),
    });
  });
  socket.on('equip_title', (titleId) => {
    const p = players[playerId];
    if (!p) return;
    const result = equipTitle(p, titleId);
    socket.emit('title_result', result);
    if (result.success) io.emit('server_msg', { msg: result.title.icon + ' ' + (p.displayName||p.className) + ' → "' + result.title.name + '"', type: 'normal' });
  });
}

module.exports = { TITLES, getOwnedTitles, equipTitle, registerTitleCollectHandlers };

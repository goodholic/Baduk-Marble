// 드래곤 라이딩 소켓 핸들러 — v2.57

function registerDragonRidingHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, dragonRiding } = ctx;

  // 보유 드래곤 목록 조회
  socket.on('dragon_list', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('dragon_list_result', dragonRiding.getPlayerDragons(p));
  });

  // 드래곤 상세 정보
  socket.on('dragon_info', (dragonType) => {
    const p = players[playerId]; if (!p) return;
    if (typeof dragonType !== 'string') return;
    socket.emit('dragon_info_result', dragonRiding.getDragonInfo(p, dragonType));
  });

  // 알 부화
  socket.on('dragon_hatch', (dragonType) => {
    const p = players[playerId]; if (!p) return;
    if (typeof dragonType !== 'string') return;
    const result = dragonRiding.hatchEgg(p, dragonType);
    if (result.success) {
      savePlayer(p);
      io.emit('server_msg', { msg: `🥚 ${p.displayName}의 드래곤 알이 부화했습니다! — ${result.msg}`, type: 'rare' });
    }
    socket.emit('dragon_result', result);
  });

  // 먹이 주기
  socket.on('dragon_feed', ({ dragonType, foodId }) => {
    const p = players[playerId]; if (!p) return;
    if (typeof dragonType !== 'string' || typeof foodId !== 'string') return;
    const result = dragonRiding.feedDragon(p, dragonType, foodId);
    if (result.success) {
      savePlayer(p);
      if (result.stageChanged) {
        io.emit('server_msg', { msg: `🐲 ${p.displayName}의 드래곤이 성장했습니다! ${result.msg}`, type: 'morph' });
      }
    }
    socket.emit('dragon_result', result);
  });

  // 탑승
  socket.on('dragon_mount', (dragonType) => {
    const p = players[playerId]; if (!p) return;
    if (typeof dragonType !== 'string') return;
    const result = dragonRiding.mountDragon(p, dragonType);
    if (result.success) {
      savePlayer(p);
      io.emit('server_msg', { msg: `🐲 ${p.displayName}이(가) 드래곤에 탑승! ${result.msg}`, type: 'rare' });
    }
    socket.emit('dragon_result', result);
  });

  // 하강
  socket.on('dragon_dismount', () => {
    const p = players[playerId]; if (!p) return;
    const result = dragonRiding.dismountDragon(p);
    if (result.success) savePlayer(p);
    socket.emit('dragon_result', result);
  });

  // 브레스 공격
  socket.on('dragon_breath', () => {
    const p = players[playerId]; if (!p) return;
    const result = dragonRiding.useBreath(p);
    if (result.success) {
      io.emit('dragon_breath_fx', { player: playerId, type: result.type, element: result.element });
    }
    socket.emit('dragon_result', result);
  });

  // 비행 스킬
  socket.on('dragon_flight_skill', (skillId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof skillId !== 'string') return;
    const result = dragonRiding.useFlightSkill(p, skillId);
    if (result.success) {
      io.emit('dragon_skill_fx', { player: playerId, skill: result.skill, name: result.name });
    }
    socket.emit('dragon_result', result);
  });

  // 드래곤 종류/알 정보 (도감)
  socket.on('dragon_codex', () => {
    const types = {};
    for (const [id, dt] of Object.entries(dragonRiding.DRAGON_TYPES)) {
      types[id] = {
        name: dt.name, icon: dt.icon, color: dt.color,
        element: dt.element, rarity: dt.rarity, lore: dt.lore,
        breathDesc: dt.breathDesc, passiveDesc: dt.passiveDesc,
        eggSource: dragonRiding.EGG_SOURCES[id]?.source || '???',
      };
    }
    socket.emit('dragon_codex_result', types);
  });
}

module.exports = { registerDragonRidingHandlers };

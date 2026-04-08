// 펫 배틀 소켓 핸들러 — v1.86
function registerPetBattleHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, MAX_GOLD, petBattle } = ctx;

  socket.on('pet_battle_status', () => {
    const p = players[playerId];
    if (!p) return;
    const today = new Date().toISOString().slice(0, 10);
    const used = (p.petBattleDate === today) ? (p.petBattleCount || 0) : 0;
    socket.emit('pet_battle_status_result', {
      ownedPets: p.pets || [],
      activePet: p.activePet || null,
      wins: p.petBattleWins || 0,
      losses: p.petBattleLosses || 0,
      freeLeft: Math.max(0, petBattle.PET_BATTLE_CONFIG.dailyFreeBattles - used),
      paidPrice: petBattle.PET_BATTLE_CONFIG.paidBattlePrice,
      tournamentFee: petBattle.PET_BATTLE_CONFIG.tournamentEntryFee,
    });
  });

  socket.on('pet_battle_fight', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || !data.myPet || !data.enemyPet) {
      socket.emit('pet_battle_result', { success: false, msg: '펫 미지정' });
      return;
    }
    if (!p.pets || !p.pets.includes(data.myPet)) {
      socket.emit('pet_battle_result', { success: false, msg: '보유하지 않은 펫' });
      return;
    }
    const usePaid = !petBattle.canFreeBattle(p);
    if (usePaid) {
      const cost = petBattle.PET_BATTLE_CONFIG.paidBattlePrice;
      if ((p.diamonds || 0) < cost) {
        socket.emit('pet_battle_result', { success: false, msg: `무료 횟수 소진 — 다이아 ${cost}개 필요` });
        return;
      }
      p.diamonds -= cost;
    } else {
      petBattle.consumeFreeBattle(p);
    }
    const result = petBattle.simulateBattle(data.myPet, data.enemyPet);
    if (result.error) {
      socket.emit('pet_battle_result', { success: false, msg: result.error });
      return;
    }
    const won = result.winnerId === data.myPet;
    petBattle.applyBattleReward(p, won);
    if (p.gold > MAX_GOLD) p.gold = MAX_GOLD;
    savePlayer(p);
    socket.emit('pet_battle_result', {
      success: true,
      won,
      winner: result.winner,
      turns: result.turns,
      draw: !!result.draw,
      log: result.log.slice(0, 10),
      reward: won ? { gold: petBattle.PET_BATTLE_CONFIG.winRewardGold, exp: petBattle.PET_BATTLE_CONFIG.winRewardExp } : null,
    });
    io.emit('player_update', p);
  });
}

module.exports = { registerPetBattleHandlers };

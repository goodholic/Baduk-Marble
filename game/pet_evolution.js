// 펫 진화 시스템 — v2.59
// 기본 펫 → 진화체 → 최종 진화 (3단계)

const PET_EVOLUTION_TREE = {
  pet_slime: {
    name: '미니 슬라임', icon: '🟢', stage: 1,
    stats: { hpRegen: 3 },
    evolvesTo: 'pet_king_slime',
    evolveCost: { gold: 5000, kills: 100 },
  },
  pet_king_slime: {
    name: '슬라임 킹', icon: '👑', stage: 2,
    stats: { hpRegen: 8, def: 5 },
    evolvesTo: 'pet_emperor_slime',
    evolveCost: { gold: 30000, kills: 500, item: 'mat_soul' },
  },
  pet_emperor_slime: {
    name: '슬라임 엠퍼러', icon: '💎', stage: 3,
    stats: { hpRegen: 15, def: 12, goldBonus: 10 },
    evolvesTo: null, // 최종
  },

  pet_wolf: {
    name: '아기 늑대', icon: '🐺', stage: 1,
    stats: { atk: 8 },
    evolvesTo: 'pet_dire_wolf',
    evolveCost: { gold: 8000, kills: 200 },
  },
  pet_dire_wolf: {
    name: '다이어 울프', icon: '🐾', stage: 2,
    stats: { atk: 18, critRate: 5 },
    evolvesTo: 'pet_fenrir',
    evolveCost: { gold: 50000, kills: 1000, item: 'mat_dragon' },
  },
  pet_fenrir: {
    name: '펜리르', icon: '🌑', stage: 3,
    stats: { atk: 35, critRate: 12, speed: 3 },
    evolvesTo: null,
  },

  pet_dragon: {
    name: '미니 드래곤', icon: '🐲', stage: 1,
    stats: { atk: 15 },
    evolvesTo: 'pet_elder_dragon',
    evolveCost: { gold: 20000, kills: 500, item: 'mat_dragon' },
  },
  pet_elder_dragon: {
    name: '고대 드래곤', icon: '🔥', stage: 2,
    stats: { atk: 30, def: 10, fireDmg: 15 },
    evolvesTo: 'pet_divine_dragon',
    evolveCost: { gold: 100000, kills: 2000, item: 'mat_void_essence' },
  },
  pet_divine_dragon: {
    name: '신룡', icon: '⭐', stage: 3,
    stats: { atk: 50, def: 20, allDmg: 10, hpRegen: 10 },
    evolvesTo: null,
  },

  pet_fairy: {
    name: '요정', icon: '🧚', stage: 1,
    stats: { expBonus: 15 },
    evolvesTo: 'pet_grand_fairy',
    evolveCost: { gold: 10000, kills: 300 },
  },
  pet_grand_fairy: {
    name: '대요정', icon: '✨', stage: 2,
    stats: { expBonus: 30, hpRegen: 5 },
    evolvesTo: 'pet_fairy_queen',
    evolveCost: { gold: 60000, kills: 1000, item: 'mat_world_leaf' },
  },
  pet_fairy_queen: {
    name: '요정 여왕', icon: '👸', stage: 3,
    stats: { expBonus: 50, hpRegen: 10, goldBonus: 15, luck: 10 },
    evolvesTo: null,
  },
};

function evolvePet(player, petId) {
  const pet = PET_EVOLUTION_TREE[petId];
  if (!pet) return { success: false, msg: '존재하지 않는 펫' };
  if (!pet.evolvesTo) return { success: false, msg: '이미 최종 진화!' };
  if (player.activePet !== petId) return { success: false, msg: '해당 펫을 장착하고 있어야 합니다' };

  const cost = pet.evolveCost;
  if ((player.gold || 0) < (cost.gold || 0)) return { success: false, msg: '골드 부족 (필요: ' + cost.gold + 'G)' };
  if ((player.killCount || 0) < (cost.kills || 0)) return { success: false, msg: '처치 수 부족 (' + (player.killCount||0) + '/' + cost.kills + ')' };
  if (cost.item && (!player.inventory || !player.inventory[cost.item])) return { success: false, msg: '재료 부족: ' + cost.item };

  // 비용 차감
  player.gold -= cost.gold || 0;
  if (cost.item && player.inventory) {
    player.inventory[cost.item]--;
    if (player.inventory[cost.item] <= 0) delete player.inventory[cost.item];
  }

  // 진화
  const evolved = PET_EVOLUTION_TREE[pet.evolvesTo];
  player.activePet = pet.evolvesTo;

  return {
    success: true,
    msg: pet.icon + ' ' + pet.name + ' → ' + evolved.icon + ' ' + evolved.name + ' 진화 완료!',
    newPet: { id: pet.evolvesTo, name: evolved.name, icon: evolved.icon, stage: evolved.stage, stats: evolved.stats },
  };
}

function getPetStatus(player) {
  const petId = player.activePet;
  if (!petId) return { hasPet: false, evolutionTree: Object.entries(PET_EVOLUTION_TREE).filter(([,v]) => v.stage === 1).map(([id, p]) => ({ id, name: p.name, icon: p.icon })) };

  const pet = PET_EVOLUTION_TREE[petId];
  if (!pet) return { hasPet: false };

  return {
    hasPet: true,
    current: { id: petId, name: pet.name, icon: pet.icon, stage: pet.stage, stats: pet.stats },
    canEvolve: !!pet.evolvesTo,
    evolveCost: pet.evolveCost || null,
    nextForm: pet.evolvesTo ? { name: PET_EVOLUTION_TREE[pet.evolvesTo].name, icon: PET_EVOLUTION_TREE[pet.evolvesTo].icon } : null,
  };
}

function registerPetEvolutionHandlers(socket, playerId, players, io) {
  socket.on('pet_evo_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('pet_evo_status', getPetStatus(p));
  });

  socket.on('pet_evolve', (petId) => {
    const p = players[playerId];
    if (!p) return;
    const result = evolvePet(p, petId);
    socket.emit('pet_evo_result', result);
    if (result.success) {
      io.emit('server_msg', { msg: '🌟 ' + (p.displayName||p.className) + '의 펫이 진화했습니다! ' + result.newPet.icon + ' ' + result.newPet.name, type: 'rare' });
    }
  });
}

module.exports = { PET_EVOLUTION_TREE, evolvePet, getPetStatus, registerPetEvolutionHandlers };

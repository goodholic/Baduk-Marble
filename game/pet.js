// 펫 & 탈것 시스템
const PETS = {
  pet_slime:   { name:'미니 슬라임', effect:'hpRegen',  value:0.03, source:'슬라임 100마리 처치', need:{morphKills:{slime:100}} },
  pet_wolf:    { name:'아기 늑대',   effect:'atkBonus',  value:0.08, source:'오크 50마리 처치',   need:{morphKills:{orc:50}} },
  pet_fairy:   { name:'요정',       effect:'expBonus',  value:0.15, source:'다이아 300개',       need:{diamonds:300} },
  pet_dragon:  { name:'미니 드래곤', effect:'atkBonus',  value:0.15, source:'드래곤 20마리 처치', need:{morphKills:{dragon:20}} },
  pet_angel:   { name:'천사',       effect:'autoRevive',value:1,    source:'다이아 1000개',      need:{diamonds:1000} },
};

const MOUNTS = {
  mount_horse:   { name:'말',       speedBonus:0.3, source:'상점 1000G',  cost:{gold:1000} },
  mount_warhorse:{ name:'전투마',    speedBonus:0.5, source:'상점 5000G',  cost:{gold:5000} },
  mount_griffin:  { name:'그리폰',   speedBonus:0.7, source:'다이아 500',  cost:{diamonds:500} },
  mount_dragon:  { name:'흑룡',     speedBonus:1.0, source:'드래곤 둥지 보스 드롭', cost:{drop:true} },
};

function handleBuyPet(player, petId) {
  const pet = PETS[petId];
  if (!pet) return { success:false, msg:'존재하지 않는 펫' };
  if (player.activePet === petId) return { success:false, msg:'이미 소유 중' };

  // 조건 확인
  if (pet.need.diamonds && (player.diamonds||0) < pet.need.diamonds) {
    return { success:false, msg:`다이아 ${pet.need.diamonds}개 필요` };
  }
  if (pet.need.morphKills) {
    for (const [type, count] of Object.entries(pet.need.morphKills)) {
      if ((player.morphKills?.[type]||0) < count) {
        return { success:false, msg:`${type} ${count}마리 처치 필요 (현재: ${player.morphKills?.[type]||0})` };
      }
    }
  }

  // 구매
  if (pet.need.diamonds) player.diamonds -= pet.need.diamonds;
  if (!player.pets) player.pets = [];
  if (!player.pets.includes(petId)) player.pets.push(petId);
  player.activePet = petId;
  return { success:true, msg:`${pet.name} 획득!` };
}

function handleBuyMount(player, mountId) {
  const mount = MOUNTS[mountId];
  if (!mount) return { success:false, msg:'존재하지 않는 탈것' };
  if (mount.cost.drop) return { success:false, msg:'보스 드롭으로만 획득' };

  if (mount.cost.gold && player.gold < mount.cost.gold) return { success:false, msg:'골드 부족' };
  if (mount.cost.diamonds && (player.diamonds||0) < mount.cost.diamonds) return { success:false, msg:'다이아 부족' };

  if (mount.cost.gold) player.gold -= mount.cost.gold;
  if (mount.cost.diamonds) player.diamonds -= mount.cost.diamonds;

  if (!player.mounts) player.mounts = [];
  if (!player.mounts.includes(mountId)) player.mounts.push(mountId);
  player.activeMount = mountId;
  return { success:true, msg:`${mount.name} 획득! 이동속도 +${Math.floor(mount.speedBonus*100)}%` };
}

function getPetEffect(player) {
  if (!player.activePet || !PETS[player.activePet]) return null;
  return PETS[player.activePet];
}

function getMountSpeed(player) {
  if (!player.activeMount || !MOUNTS[player.activeMount]) return 0;
  return MOUNTS[player.activeMount].speedBonus;
}

module.exports = { PETS, MOUNTS, handleBuyPet, handleBuyMount, getPetEffect, getMountSpeed };

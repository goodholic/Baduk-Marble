// 펫 & 탈것 시스템
const PETS = {
  pet_slime:   { name:'미니 슬라임', effect:'hpRegen',  value:0.03, source:'슬라임 100마리 처치', need:{morphKills:{slime:100}}, evolveTo:'pet_slime_king' },
  pet_wolf:    { name:'아기 늑대',   effect:'atkBonus',  value:0.08, source:'오크 50마리 처치',   need:{morphKills:{orc:50}},     evolveTo:'pet_dire_wolf' },
  pet_fairy:   { name:'요정',       effect:'expBonus',  value:0.15, source:'다이아 300개',       need:{diamonds:300},            evolveTo:'pet_archfairy' },
  pet_dragon:  { name:'미니 드래곤', effect:'atkBonus',  value:0.15, source:'드래곤 20마리 처치', need:{morphKills:{dragon:20}}, evolveTo:'pet_elder_dragon' },
  pet_angel:   { name:'천사',       effect:'autoRevive',value:1,    source:'다이아 1000개',      need:{diamonds:1000},           evolveTo:'pet_seraph' },
  // ── v1.11 신규 ──
  pet_phoenix: { name:'불사조',     effect:'fireDmg',   value:0.20, source:'불꽃산 보스 50처치', need:{morphKills:{fire_lord:50}}, evolveTo:'pet_phoenix_lord' },
  pet_unicorn: { name:'유니콘',     effect:'dodgeBonus',value:0.10, source:'다이아 800개',       need:{diamonds:800},              evolveTo:'pet_celestial_unicorn' },
  // ── 진화형 (상위) ──
  pet_slime_king:    { name:'슬라임 킹',   effect:'hpRegen',   value:0.08, source:'슬라임 진화', evolved:true },
  pet_dire_wolf:     { name:'다이어 울프', effect:'atkBonus',  value:0.18, source:'늑대 진화',  evolved:true },
  pet_archfairy:     { name:'대요정',      effect:'expBonus',  value:0.30, source:'요정 진화',  evolved:true },
  pet_elder_dragon:  { name:'고대 드래곤', effect:'atkBonus',  value:0.30, source:'드래곤 진화', evolved:true },
  pet_seraph:        { name:'세라핌',      effect:'autoRevive',value:1,   source:'천사 진화',  evolved:true, reviveBonus:0.3 },
  // ── v1.11 진화형 ──
  pet_phoenix_lord:       { name:'불사조 군주',   effect:'fireDmg',    value:0.40, source:'불사조 진화', evolved:true },
  pet_celestial_unicorn:  { name:'천상의 유니콘', effect:'dodgeBonus', value:0.20, source:'유니콘 진화', evolved:true },
};

// 진화 비용
const PET_EVOLVE_COST = { mat_dragon: 10, mat_soul: 20, gold: 50000 };

function handleEvolvePet(player, basePetId) {
  const base = PETS[basePetId];
  if (!base || !base.evolveTo) return { success:false, msg:'진화 불가한 펫' };
  if (!player.pets || !player.pets.includes(basePetId)) return { success:false, msg:'해당 펫을 보유하지 않음' };
  if (player.pets.includes(base.evolveTo)) return { success:false, msg:'이미 진화된 펫을 보유 중' };
  // 비용 체크
  if (!player.inventory) player.inventory = {};
  for (const [mat, qty] of Object.entries(PET_EVOLVE_COST)) {
    if (mat === 'gold') {
      if ((player.gold || 0) < qty) return { success:false, msg:`골드 부족 (${qty}G 필요)` };
    } else {
      if ((player.inventory[mat] || 0) < qty) return { success:false, msg:`재료 부족: ${mat} ${qty}개 필요` };
    }
  }
  // 차감
  for (const [mat, qty] of Object.entries(PET_EVOLVE_COST)) {
    if (mat === 'gold') player.gold -= qty;
    else {
      player.inventory[mat] -= qty;
      if (player.inventory[mat] <= 0) delete player.inventory[mat];
    }
  }
  // 진화 펫 추가 (기본 펫은 유지)
  if (!player.pets.includes(base.evolveTo)) player.pets.push(base.evolveTo);
  player.activePet = base.evolveTo;
  return { success:true, msg:`${base.name} → ${PETS[base.evolveTo].name} 진화 성공!`, newPet: base.evolveTo };
}

const MOUNTS = {
  mount_horse:   { name:'말',       speedBonus:0.3, source:'상점 1000G',  cost:{gold:1000} },
  mount_warhorse:{ name:'전투마',    speedBonus:0.5, source:'상점 5000G',  cost:{gold:5000} },
  mount_griffin: { name:'그리폰',    speedBonus:0.7, source:'다이아 500',  cost:{diamonds:500} },
  mount_dragon:  { name:'흑룡',     speedBonus:1.0, source:'드래곤 둥지 보스 드롭', cost:{drop:true} },
  // ── v1.11 신규 ──
  mount_pegasus: { name:'페가수스',  speedBonus:0.85, source:'다이아 1200', cost:{diamonds:1200}, fly:true },
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

  if (mount.cost.gold && (player.gold || 0) < mount.cost.gold) return { success:false, msg:'골드 부족' };
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

module.exports = { PETS, MOUNTS, handleBuyPet, handleBuyMount, getPetEffect, getMountSpeed, handleEvolvePet, PET_EVOLVE_COST };

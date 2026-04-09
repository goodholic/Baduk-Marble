// ==========================================
// 사냥터 시스템 (현상금 사냥꾼) — v2.23
// NPC 사냥 의뢰 + 현상금 수배 + 추적 + 함정
// ==========================================

// ── NPC 사냥 의뢰 (일일 갱신) ──
const HUNT_MISSIONS = [
    { id:'hunt_wolf_pack', name:'늑대 떼 소탕', desc:'숲 지역의 늑대 10마리 처치', zone:'forest', target:'kill_monster', goal:10, monsterTier:'normal', reward:{gold:2000,exp:1500,diamonds:10}, difficulty:'easy' },
    { id:'hunt_bandit_camp', name:'산적 소굴 정리', desc:'산악 지역의 산적 8마리 처치', zone:'mountain', target:'kill_monster', goal:8, monsterTier:'elite', reward:{gold:4000,exp:3000,diamonds:20}, difficulty:'normal' },
    { id:'hunt_dragon_eggs', name:'드래곤 알 수거', desc:'용의 둥지에서 알 5개 수집', zone:'dragon', target:'collect_item', goal:5, item:'dragon_egg', reward:{gold:8000,exp:6000,diamonds:40}, difficulty:'hard' },
    { id:'hunt_ghost_ship', name:'유령선 정벌', desc:'항구 근처 유령 해적 12마리', zone:'harbor', target:'kill_monster', goal:12, monsterTier:'rare', reward:{gold:6000,exp:5000,diamonds:30}, difficulty:'normal' },
    { id:'hunt_void_breach', name:'공허 균열 봉인', desc:'심연의 공허 몬스터 6마리', zone:'abyss', target:'kill_monster', goal:6, monsterTier:'boss', reward:{gold:15000,exp:12000,diamonds:80}, difficulty:'extreme' },
    { id:'hunt_poison_swamp', name:'독늪 정화', desc:'독 안개 늪의 독 생물 15마리', zone:'swamp', target:'kill_monster', goal:15, monsterTier:'normal', reward:{gold:3000,exp:2000,diamonds:15}, difficulty:'easy' },
    { id:'hunt_ice_titan', name:'빙하 거인 토벌', desc:'빙하 지역의 거인 3마리', zone:'glacier', target:'kill_monster', goal:3, monsterTier:'boss', reward:{gold:10000,exp:8000,diamonds:50}, difficulty:'hard' },
    { id:'hunt_fire_elemental', name:'화염 정령 수렵', desc:'화산 화염 정령 7마리', zone:'volcano', target:'kill_monster', goal:7, monsterTier:'elite', reward:{gold:5000,exp:4000,diamonds:25}, difficulty:'normal' },
    { id:'hunt_night_stalker', name:'밤의 추적자', desc:'밤에만 나타나는 그림자 수렵 5마리', zone:null, target:'kill_night', goal:5, reward:{gold:7000,exp:5000,diamonds:35}, difficulty:'hard', condition:'nightOnly' },
    { id:'hunt_storm_beast', name:'폭풍 짐승 사냥', desc:'폭풍 중 번개 짐승 4마리', zone:null, target:'kill_storm', goal:4, reward:{gold:12000,exp:10000,diamonds:60}, difficulty:'extreme', condition:'stormOnly' },
];

// ── 현상금 수배 등급 ──
const BOUNTY_GRADES = {
    bronze: { name:'브론즈 현상금', color:'#cd7f32', rewardMult:1.0, trackRange:50, trapSlots:1 },
    silver: { name:'실버 현상금', color:'#c0c0c0', rewardMult:1.5, trackRange:40, trapSlots:2 },
    gold:   { name:'골드 현상금', color:'#ffd700', rewardMult:2.0, trackRange:30, trapSlots:3 },
    diamond:{ name:'다이아 현상금', color:'#44ddff', rewardMult:3.0, trackRange:20, trapSlots:4 },
};

// ── 함정 아이템 ──
const TRAPS = {
    trap_snare:   { name:'올가미', desc:'3초간 이동 불가', effect:'root',  duration:3000, cost:500, icon:'🪤' },
    trap_poison:  { name:'독 함정', desc:'10초간 독 데미지', effect:'dot', dps:5, duration:10000, cost:800, icon:'☠️' },
    trap_flash:   { name:'섬광탄', desc:'2초간 실명 (공격 불가)', effect:'blind', duration:2000, cost:600, icon:'💥' },
    trap_net:     { name:'투망', desc:'5초간 속도 70% 감소', effect:'slow', value:0.3, duration:5000, cost:700, icon:'🕸️' },
    trap_bomb:    { name:'폭탄', desc:'즉시 500 데미지', effect:'damage', value:500, cost:1200, icon:'💣' },
};

// ── 사냥꾼 등급 (누적 완료 수에 따라) ──
const HUNTER_RANKS = [
    { name:'견습 사냥꾼', minClears:0, icon:'🏹', perk:null },
    { name:'숙련 사냥꾼', minClears:10, icon:'⚔️', perk:{ type:'trackBonus', value:10, desc:'추적 범위 +10' } },
    { name:'베테랑 사냥꾼', minClears:30, icon:'🗡️', perk:{ type:'rewardBonus', value:0.1, desc:'보상 +10%' } },
    { name:'마스터 사냥꾼', minClears:60, icon:'🎯', perk:{ type:'trapDiscount', value:0.2, desc:'함정 비용 -20%' } },
    { name:'전설의 사냥꾼', minClears:100, icon:'👑', perk:{ type:'doubleBounty', value:0.15, desc:'15% 확률 보상 2배' } },
];

function _ensure(player) {
    if (!player._bountyHunter) {
        player._bountyHunter = {
            rank: 0,
            totalClears: 0,
            dailyMissions: [],     // 오늘 받은 의뢰 [{id, progress, completed, acceptedAt}]
            lastDailyRefresh: 0,
            activeBounty: null,    // 현재 추적 중인 현상금 수배
            traps: {},             // 보유 함정 {trapId: count}
            placedTraps: [],       // 설치된 함정 [{trapId, x, y, placedAt}]
            stats: { monstersKilled:0, bountiesClaimed:0, trapsUsed:0 },
        };
    }
    return player._bountyHunter;
}

function getHunterRank(totalClears) {
    let rank = HUNTER_RANKS[0];
    for (const r of HUNTER_RANKS) {
        if (totalClears >= r.minClears) rank = r;
    }
    return rank;
}

// ── 일일 의뢰 갱신 (3개 랜덤) ──
function refreshDailyMissions(player) {
    const state = _ensure(player);
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastDailyRefresh === today) return { success: false, msg: '오늘 이미 갱신됨' };

    // 랜덤 3개 선택
    const shuffled = [...HUNT_MISSIONS].sort(() => Math.random() - 0.5);
    state.dailyMissions = shuffled.slice(0, 3).map(m => ({
        ...m, progress: 0, completed: false, claimed: false, acceptedAt: Date.now(),
    }));
    state.lastDailyRefresh = today;
    return { success: true, missions: state.dailyMissions };
}

// ── 의뢰 진행 업데이트 ──
function updateMissionProgress(player, target, amount, context) {
    const state = _ensure(player);
    const results = [];
    for (const mission of state.dailyMissions) {
        if (mission.completed || mission.claimed) continue;
        if (mission.target !== target) continue;

        // 존 제한 체크
        if (mission.zone && context?.zone !== mission.zone) continue;
        // 조건 체크
        if (mission.condition === 'nightOnly' && !context?.isNight) continue;
        if (mission.condition === 'stormOnly' && context?.weather !== 'storm') continue;
        // 몬스터 티어 체크
        if (mission.monsterTier && context?.monsterTier !== mission.monsterTier) continue;

        mission.progress = Math.min(mission.goal, mission.progress + (amount || 1));
        if (mission.progress >= mission.goal) {
            mission.completed = true;
            results.push({ missionId: mission.id, name: mission.name });
        }
    }
    return results;
}

// ── 의뢰 보상 수령 ──
function claimMissionReward(player, missionId) {
    const state = _ensure(player);
    const mission = state.dailyMissions.find(m => m.id === missionId);
    if (!mission) return { success: false, msg: '의뢰 없음' };
    if (!mission.completed) return { success: false, msg: '미완료' };
    if (mission.claimed) return { success: false, msg: '이미 수령' };

    mission.claimed = true;
    state.totalClears++;
    state.stats.monstersKilled += mission.goal;

    // 사냥꾼 등급 보너스
    const rank = getHunterRank(state.totalClears);
    let rewardMult = 1.0;
    if (rank.perk?.type === 'rewardBonus') rewardMult += rank.perk.value;
    if (rank.perk?.type === 'doubleBounty' && Math.random() < rank.perk.value) rewardMult *= 2;

    const r = mission.reward;
    if (r.gold) player.gold = Math.min(999999999, (player.gold || 0) + Math.floor(r.gold * rewardMult));
    if (r.exp) player.exp = (player.exp || 0) + Math.floor(r.exp * rewardMult);
    if (r.diamonds) player.diamonds = Math.min(9999999, (player.diamonds || 0) + Math.floor(r.diamonds * rewardMult));

    return { success: true, reward: r, rewardMult, rank: rank.name, totalClears: state.totalClears };
}

// ── 함정 구매 ──
function buyTrap(player, trapId) {
    const state = _ensure(player);
    const trap = TRAPS[trapId];
    if (!trap) return { success: false, msg: '알 수 없는 함정' };

    let cost = trap.cost;
    const rank = getHunterRank(state.totalClears);
    if (rank.perk?.type === 'trapDiscount') cost = Math.floor(cost * (1 - rank.perk.value));

    if ((player.gold || 0) < cost) return { success: false, msg: `골드 부족 (${cost}G)` };
    player.gold -= cost;
    state.traps[trapId] = (state.traps[trapId] || 0) + 1;
    return { success: true, trap: trap.name, cost, count: state.traps[trapId] };
}

// ── 함정 설치 ──
function placeTrap(player, trapId) {
    const state = _ensure(player);
    if (!state.traps[trapId] || state.traps[trapId] <= 0) return { success: false, msg: '함정 없음' };

    const rank = getHunterRank(state.totalClears);
    const grade = Object.values(BOUNTY_GRADES).find(g => state.totalClears >= 0) || BOUNTY_GRADES.bronze;
    if (state.placedTraps.length >= grade.trapSlots) return { success: false, msg: `최대 ${grade.trapSlots}개 설치 가능` };

    state.traps[trapId]--;
    if (state.traps[trapId] <= 0) delete state.traps[trapId];
    state.placedTraps.push({ trapId, x: player.x, y: player.y, placedAt: Date.now() });
    state.stats.trapsUsed++;

    return { success: true, trap: TRAPS[trapId], position: { x: player.x, y: player.y } };
}

// ── 상태 조회 ──
function getStatus(player) {
    const state = _ensure(player);
    const rank = getHunterRank(state.totalClears);
    const nextRank = HUNTER_RANKS.find(r => r.minClears > state.totalClears);

    // 오늘 의뢰 자동 갱신
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastDailyRefresh !== today) {
        refreshDailyMissions(player);
    }

    return {
        rank, nextRank,
        totalClears: state.totalClears,
        dailyMissions: state.dailyMissions,
        traps: state.traps,
        placedTraps: state.placedTraps,
        stats: state.stats,
        availableTraps: Object.entries(TRAPS).map(([id, t]) => ({ id, ...t })),
    };
}

module.exports = {
    HUNT_MISSIONS, BOUNTY_GRADES, TRAPS, HUNTER_RANKS,
    refreshDailyMissions, updateMissionProgress, claimMissionReward,
    buyTrap, placeTrap, getStatus, getHunterRank,
};

// ==========================================
// 부유 요새 — v2.40
// 하늘에 떠 있는 개인 요새 건설 + 시설 업그레이드 + 방어전
// ==========================================

// ── 요새 시설 ──
const FORTRESS_FACILITIES = {
    throne_hall:   { name: '왕좌의 간',     icon: '🏰', maxLevel: 5, baseCost: 10000, effect: 'fortressLevel', desc: '요새 핵심. 레벨에 따라 시설 해금' },
    sky_wall:      { name: '하늘 성벽',     icon: '🧱', maxLevel: 10, baseCost: 5000,  effect: 'wallHp', desc: '성벽 HP +500/레벨', prereq: 'throne_hall' },
    mana_tower:    { name: '마나 포탑',     icon: '🗼', maxLevel: 8,  baseCost: 8000,  effect: 'towerDmg', desc: '자동 공격 포탑 (데미지 +100/레벨)', prereq: 'throne_hall' },
    cloud_garden:  { name: '구름 정원',     icon: '🌿☁️', maxLevel: 5, baseCost: 6000,  effect: 'resourceGen', desc: '시간당 골드/재료 생성', prereq: 'throne_hall' },
    star_forge:    { name: '별빛 대장간',   icon: '⚒️✨', maxLevel: 5, baseCost: 12000, effect: 'craftBonus', desc: '제작 보너스 +5%/레벨', prereqLevel: 2 },
    wind_hangar:   { name: '바람의 격납고', icon: '🌬️', maxLevel: 3,  baseCost: 15000, effect: 'airUnit', desc: '공중 유닛 배치 (방어전용)', prereqLevel: 3 },
    crystal_vault: { name: '수정 금고',     icon: '💎', maxLevel: 5,  baseCost: 8000,  effect: 'storage', desc: '추가 저장 공간 +100/레벨', prereqLevel: 2 },
    oracle_spire:  { name: '신탁의 첨탑',   icon: '🔮', maxLevel: 3,  baseCost: 20000, effect: 'warningSystem', desc: '침공 사전 경고 + 정찰', prereqLevel: 4 },
    dragon_roost:  { name: '용의 둥지',     icon: '🐉', maxLevel: 1,  baseCost: 100000, effect: 'dragonGuard', desc: '수호룡 배치 (최강 방어)', prereqLevel: 5 },
};

// ── 방어전 침공 웨이브 ──
const INVASION_WAVES = [
    { wave: 1, name: '도적단 습격',     icon: '🏴‍☠️', enemies: 5,  baseHp: 200,  baseAtk: 30,  reward: { gold: 3000, exp: 1000 } },
    { wave: 2, name: '암흑 비행단',     icon: '🦇',  enemies: 8,  baseHp: 400,  baseAtk: 50,  reward: { gold: 6000, exp: 2000 } },
    { wave: 3, name: '스톰 골렘 부대', icon: '🗿⚡', enemies: 6,  baseHp: 800,  baseAtk: 80,  reward: { gold: 10000, exp: 4000 } },
    { wave: 4, name: '마왕군 선봉대',   icon: '👹',  enemies: 10, baseHp: 1200, baseAtk: 120, reward: { gold: 20000, exp: 8000 } },
    { wave: 5, name: '천공의 폭군',     icon: '🐲',  enemies: 1,  baseHp: 15000, baseAtk: 300, reward: { gold: 50000, exp: 20000 } },
];

// ── 요새 꾸미기 테마 ──
const FORTRESS_THEMES = {
    classic:   { name: '고전 성채', icon: '🏰', cost: 0 },
    crystal:   { name: '수정 궁전', icon: '💎🏰', cost: 30000 },
    dark:      { name: '암흑 요새', icon: '🌑🏰', cost: 30000 },
    cloud:     { name: '구름 천궁', icon: '☁️🏰', cost: 50000 },
    dragon:    { name: '용의 보루', icon: '🐉🏰', cost: 80000 },
    celestial: { name: '천상 성역', icon: '✨🏰', cost: 100000 },
};

function _ensure(player) {
    if (!player._fortress) {
        player._fortress = {
            built: false,
            name: '',
            theme: 'classic',
            facilities: {},         // { facilityId: level }
            wallHp: 1000,
            wallMaxHp: 1000,
            towerDmg: 50,
            resources: { gold: 0, crystals: 0, starDust: 0 },
            invasionWave: 0,        // 현재 도달한 웨이브
            totalDefenses: 0,       // 총 방어 성공
            inDefense: false,
            defenseProgress: null,
            visitors: [],           // 방문자 기록
            lastResourceCollect: 0,
        };
    }
    return player._fortress;
}

// 요새 건설
function buildFortress(player, name) {
    const state = _ensure(player);
    if (state.built) return { success: false, msg: '이미 요새가 있습니다.' };
    if ((player.level || 1) < 25) return { success: false, msg: 'Lv.25 이상 필요합니다.' };
    if ((player.gold || 0) < 50000) return { success: false, msg: '골드 부족 (50,000G)' };

    player.gold -= 50000;
    state.built = true;
    state.name = (name && typeof name === 'string') ? name.slice(0, 16) : `${player.displayName}의 요새`;
    state.facilities.throne_hall = 1;
    state.lastResourceCollect = Date.now();

    return {
        success: true,
        msg: `🏰 부유 요새 "${state.name}" 건설 완료! 하늘 위에 당신만의 성이 떠올랐습니다!`,
    };
}

// 시설 업그레이드
function upgradeFacility(player, facilityId) {
    const state = _ensure(player);
    if (!state.built) return { success: false, msg: '요새를 먼저 건설하세요.' };

    const facility = FORTRESS_FACILITIES[facilityId];
    if (!facility) return { success: false, msg: '알 수 없는 시설' };

    const currentLevel = state.facilities[facilityId] || 0;
    if (currentLevel >= facility.maxLevel) return { success: false, msg: '최대 레벨입니다.' };

    // 선행 조건 체크
    const throneLevel = state.facilities.throne_hall || 0;
    if (facility.prereqLevel && throneLevel < facility.prereqLevel) {
        return { success: false, msg: `왕좌의 간 Lv.${facility.prereqLevel} 필요` };
    }
    if (facility.prereq && !state.facilities[facility.prereq]) {
        return { success: false, msg: `선행 시설 필요: ${FORTRESS_FACILITIES[facility.prereq]?.name}` };
    }

    const cost = facility.baseCost * (currentLevel + 1);
    if ((player.gold || 0) < cost) return { success: false, msg: `골드 부족 (${cost}G)` };

    player.gold -= cost;
    state.facilities[facilityId] = currentLevel + 1;

    // 효과 적용
    if (facility.effect === 'wallHp') {
        state.wallMaxHp = 1000 + (state.facilities.sky_wall || 0) * 500;
        state.wallHp = state.wallMaxHp;
    }
    if (facility.effect === 'towerDmg') {
        state.towerDmg = 50 + (state.facilities.mana_tower || 0) * 100;
    }

    return {
        success: true, facility, newLevel: currentLevel + 1, cost,
        msg: `${facility.icon} ${facility.name} Lv.${currentLevel + 1} 업그레이드 완료!`,
    };
}

// 자원 수확 (구름 정원)
function collectResources(player) {
    const state = _ensure(player);
    if (!state.built) return { success: false, msg: '요새가 없습니다.' };

    const gardenLevel = state.facilities.cloud_garden || 0;
    if (gardenLevel <= 0) return { success: false, msg: '구름 정원을 먼저 건설하세요.' };

    const elapsed = Math.floor((Date.now() - state.lastResourceCollect) / 3600000); // 시간 단위
    if (elapsed <= 0) return { success: false, msg: '아직 자원이 생성되지 않았습니다.' };

    const goldPerHour = gardenLevel * 500;
    const crystalsPerHour = gardenLevel * 2;
    const maxHours = 24; // 최대 24시간 축적

    const hours = Math.min(elapsed, maxHours);
    const gold = goldPerHour * hours;
    const crystals = crystalsPerHour * hours;

    player.gold = Math.min((player.gold || 0) + gold, 999999999);
    state.resources.crystals = (state.resources.crystals || 0) + crystals;
    state.lastResourceCollect = Date.now();

    return {
        success: true, gold, crystals, hours,
        msg: `☁️🌿 ${hours}시간 수확: +${gold}G +${crystals} 수정`,
    };
}

// 방어전 시작
function startDefense(player) {
    const state = _ensure(player);
    if (!state.built) return { success: false, msg: '요새가 없습니다.' };
    if (state.inDefense) return { success: false, msg: '이미 방어전 진행 중!' };

    const waveIdx = Math.min(state.invasionWave, INVASION_WAVES.length - 1);
    const wave = INVASION_WAVES[waveIdx];

    state.inDefense = true;
    state.defenseProgress = {
        waveIdx,
        enemiesRemaining: wave.enemies,
        wallHp: state.wallHp,
        totalDamageDealt: 0,
    };

    return {
        success: true, wave,
        msg: `${wave.icon} ${wave.name} 침공 시작! 적 ${wave.enemies}체 접근 중!`,
    };
}

// 방어전 전투
function defendFortress(player) {
    const state = _ensure(player);
    if (!state.inDefense || !state.defenseProgress) return { success: false, msg: '방어전 진행 중이 아닙니다.' };

    const prog = state.defenseProgress;
    const wave = INVASION_WAVES[prog.waveIdx];
    const playerAtk = (player.atk || 10) + (player.level || 1) * 2;

    // 플레이어 공격 + 포탑 공격
    const towerDmg = state.towerDmg || 50;
    const totalAtk = playerAtk + towerDmg;
    const damage = Math.floor(totalAtk * (0.8 + Math.random() * 0.4));
    prog.totalDamageDealt += damage;

    // 적 공격 (성벽에 데미지)
    const enemyDmg = Math.floor(wave.baseAtk * prog.enemiesRemaining * (0.3 + Math.random() * 0.3));
    prog.wallHp = Math.max(0, prog.wallHp - enemyDmg);

    // 적 처치 판정
    const killThreshold = wave.baseHp;
    const killed = prog.totalDamageDealt >= killThreshold;
    if (killed) {
        prog.enemiesRemaining--;
        prog.totalDamageDealt -= killThreshold;
    }

    // 성벽 파괴 = 패배
    if (prog.wallHp <= 0) {
        state.inDefense = false;
        state.defenseProgress = null;
        return {
            success: true, type: 'defeat',
            msg: `💥 성벽 파괴! ${wave.icon} ${wave.name} 방어 실패... 성벽을 수리하세요.`,
        };
    }

    // 웨이브 클리어
    if (prog.enemiesRemaining <= 0) {
        state.inDefense = false;
        state.defenseProgress = null;
        state.invasionWave++;
        state.totalDefenses++;

        // 성벽 HP 복구
        state.wallHp = Math.min(state.wallMaxHp, prog.wallHp + Math.floor(state.wallMaxHp * 0.3));

        const goldReward = wave.reward.gold;
        const expReward = wave.reward.exp;
        player.gold = Math.min((player.gold || 0) + goldReward, 999999999);
        player.exp = (player.exp || 0) + expReward;

        return {
            success: true, type: 'victory',
            wave, goldReward, expReward,
            msg: `🏰 ${wave.icon} ${wave.name} 격퇴! +${goldReward}G +${expReward}EXP (방어 성공: ${state.totalDefenses}회)`,
        };
    }

    return {
        success: true, type: 'fighting',
        damage, enemyDmg, killed,
        enemiesRemaining: prog.enemiesRemaining,
        wallHp: prog.wallHp, wallMaxHp: state.wallMaxHp,
        msg: `⚔️ ${damage} 데미지! 적 잔여: ${prog.enemiesRemaining} | 성벽: ${prog.wallHp}/${state.wallMaxHp}${killed ? ' (적 1체 격파!)' : ''}`,
    };
}

// 성벽 수리
function repairWall(player) {
    const state = _ensure(player);
    if (!state.built) return { success: false, msg: '요새가 없습니다.' };
    if (state.wallHp >= state.wallMaxHp) return { success: false, msg: '성벽이 온전합니다.' };

    const repairCost = Math.floor((state.wallMaxHp - state.wallHp) * 2);
    if ((player.gold || 0) < repairCost) return { success: false, msg: `골드 부족 (${repairCost}G)` };

    player.gold -= repairCost;
    state.wallHp = state.wallMaxHp;

    return {
        success: true, cost: repairCost,
        msg: `🧱 성벽 수리 완료! (${repairCost}G) HP: ${state.wallHp}/${state.wallMaxHp}`,
    };
}

// 테마 변경
function changeTheme(player, themeId) {
    const state = _ensure(player);
    if (!state.built) return { success: false, msg: '요새가 없습니다.' };

    const theme = FORTRESS_THEMES[themeId];
    if (!theme) return { success: false, msg: '알 수 없는 테마' };
    if (state.theme === themeId) return { success: false, msg: '이미 적용된 테마' };

    if ((player.gold || 0) < theme.cost) return { success: false, msg: `골드 부족 (${theme.cost}G)` };
    player.gold -= theme.cost;
    state.theme = themeId;

    return {
        success: true, theme,
        msg: `${theme.icon} 요새 테마 변경: ${theme.name}!`,
    };
}

// 요새 방문 (다른 플레이어)
function visitFortress(visitor, owner) {
    const ownerState = _ensure(owner);
    if (!ownerState.built) return { success: false, msg: '요새가 없습니다.' };

    const theme = FORTRESS_THEMES[ownerState.theme];
    ownerState.visitors.push({ name: visitor.displayName, time: Date.now() });
    if (ownerState.visitors.length > 20) ownerState.visitors.shift();

    return {
        success: true,
        fortressName: ownerState.name,
        theme,
        facilities: ownerState.facilities,
        totalDefenses: ownerState.totalDefenses,
        msg: `${theme.icon} "${ownerState.name}" 방문! (방어 기록: ${ownerState.totalDefenses}회)`,
    };
}

// 상태 조회
function getStatus(player) {
    const state = _ensure(player);
    const theme = FORTRESS_THEMES[state.theme];
    return {
        built: state.built,
        name: state.name,
        theme,
        themeId: state.theme,
        facilities: Object.entries(FORTRESS_FACILITIES).map(([id, f]) => {
            const level = state.facilities[id] || 0;
            const throneLevel = state.facilities.throne_hall || 0;
            const prereqMet = !f.prereqLevel || throneLevel >= f.prereqLevel;
            const depMet = !f.prereq || (state.facilities[f.prereq] || 0) > 0;
            return {
                id, ...f, level,
                upgradeCost: level < f.maxLevel ? f.baseCost * (level + 1) : null,
                available: prereqMet && depMet && level < f.maxLevel,
            };
        }),
        wallHp: state.wallHp,
        wallMaxHp: state.wallMaxHp,
        towerDmg: state.towerDmg,
        resources: state.resources,
        invasionWave: state.invasionWave,
        totalDefenses: state.totalDefenses,
        inDefense: state.inDefense,
        defenseProgress: state.defenseProgress,
        visitors: state.visitors.slice(-5),
        themes: Object.entries(FORTRESS_THEMES).map(([id, t]) => ({ id, ...t, current: state.theme === id })),
        nextWave: state.invasionWave < INVASION_WAVES.length ? INVASION_WAVES[state.invasionWave] : null,
    };
}

module.exports = {
    FORTRESS_FACILITIES, INVASION_WAVES, FORTRESS_THEMES,
    buildFortress, upgradeFacility, collectResources,
    startDefense, defendFortress, repairWall,
    changeTheme, visitFortress, getStatus,
};

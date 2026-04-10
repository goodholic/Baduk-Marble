// ==========================================
// 기억 궁전 — v2.51
// 과거 플레이 기록 기반 던전 + 회상 + 과거 능력 각인
// ==========================================

// ── 기억 유형 (플레이 기록 카테고리) ──
const MEMORY_TYPES = {
    combat:     { name: '전투의 기억',   icon: '⚔️🧠', stat: 'monstersKilled', desc: '처치한 몬스터들이 되살아난다', minValue: 50 },
    death:      { name: '죽음의 기억',   icon: '💀🧠', stat: 'deaths',        desc: '죽었던 순간이 재현된다. 극복하면 강해진다', minValue: 5 },
    treasure:   { name: '보물의 기억',   icon: '💎🧠', stat: 'goldEarned',    desc: '과거의 보물이 기다린다', minValue: 100000 },
    journey:    { name: '여정의 기억',   icon: '🗺️🧠', stat: 'zonesVisited',  desc: '걸어온 길이 던전이 된다', minValue: 10 },
    friendship: { name: '인연의 기억',   icon: '🤝🧠', stat: 'interactions',  desc: '만났던 존재들의 환영', minValue: 20 },
    power:      { name: '힘의 기억',     icon: '💪🧠', stat: 'maxDamage',     desc: '가장 강했던 순간을 재현', minValue: 1000 },
};

// ── 기억 던전 난이도 ──
const MEMORY_DIFFICULTIES = {
    faded:     { name: '희미한 기억',   icon: '🌫️', mult: 0.7, rewardMult: 0.8, desc: '기억이 흐릿하다' },
    clear:     { name: '선명한 기억',   icon: '🔍', mult: 1.0, rewardMult: 1.0, desc: '기억이 또렷하다' },
    vivid:     { name: '생생한 기억',   icon: '✨', mult: 1.5, rewardMult: 1.5, desc: '마치 다시 살고 있는 듯' },
    nightmare: { name: '악몽의 기억',   icon: '😱', mult: 2.0, rewardMult: 2.5, desc: '기억이 뒤틀리고 강화되었다' },
    eternal:   { name: '영원의 기억',   icon: '♾️', mult: 3.0, rewardMult: 4.0, desc: '시간을 초월한 기억. 끝이 없다' },
};

// ── 각인 (기억 클리어 보상) ──
const MEMORY_INSCRIPTIONS = {
    warrior_echo:     { name: '전사의 메아리',     icon: '⚔️✨', memType: 'combat',     require: 3,  effect: { atk: 10 }, desc: '영구 ATK +10' },
    survivor_mark:    { name: '생존자의 각인',     icon: '💀✨', memType: 'death',      require: 3,  effect: { maxHp: 50, def: 5 }, desc: '영구 HP +50, DEF +5' },
    fortune_seal:     { name: '행운의 봉인',       icon: '💎✨', memType: 'treasure',   require: 3,  effect: { goldBonus: 0.05, dropRate: 0.03 }, desc: '영구 골드 +5%, 드롭 +3%' },
    wanderer_brand:   { name: '방랑자의 낙인',     icon: '🗺️✨', memType: 'journey',    require: 3,  effect: { speed: 0.05, expMult: 0.05 }, desc: '영구 속도 +5%, EXP +5%' },
    bond_crest:       { name: '인연의 문장',       icon: '🤝✨', memType: 'friendship', require: 3,  effect: { healBonus: 0.08, allStat: 3 }, desc: '영구 힐 +8%, ALL +3' },
    power_glyph:      { name: '힘의 상형문자',     icon: '💪✨', memType: 'power',      require: 3,  effect: { critDmg: 0.1, atk: 15 }, desc: '영구 크뎀 +10%, ATK +15' },
    // 마스터 각인 (모든 기억 클리어)
    memory_master:    { name: '기억의 주인',       icon: '🧠👑', memType: 'all',        require: 18, effect: { allStat: 10, memoryPower: true }, desc: '영구 ALL +10 + 기억의 힘 해금' },
};

// ── 기억 속 적 (플레이 데이터 기반 생성) ──
function _generateMemoryEnemies(player, memType, difficulty) {
    const mult = MEMORY_DIFFICULTIES[difficulty]?.mult || 1.0;
    const level = player.level || 1;

    const templates = {
        combat: [
            { name: '과거의 라이벌',     icon: '⚔️👤', hpBase: 500,  atkBase: 50 },
            { name: '기억 속 보스',       icon: '👹💭', hpBase: 1500, atkBase: 100 },
            { name: '처음 만난 적',       icon: '🐺💭', hpBase: 200,  atkBase: 30 },
        ],
        death: [
            { name: '나를 죽인 그것',     icon: '💀😨', hpBase: 2000, atkBase: 150 },
            { name: '죽음의 순간',         icon: '⚰️🌀', hpBase: 1000, atkBase: 200 },
        ],
        treasure: [
            { name: '황금 수호자',         icon: '💰🗿', hpBase: 1200, atkBase: 80 },
            { name: '탐욕의 환영',         icon: '💎😈', hpBase: 800,  atkBase: 120 },
        ],
        journey: [
            { name: '길 위의 괴물',       icon: '🛤️👹', hpBase: 600,  atkBase: 60 },
            { name: '잊힌 마을의 수호자', icon: '🏘️⚔️', hpBase: 1000, atkBase: 90 },
        ],
        friendship: [
            { name: '과거의 동료',         icon: '👥💭', hpBase: 800,  atkBase: 70 },
            { name: '배신자의 그림자',     icon: '🗡️👤', hpBase: 1500, atkBase: 130 },
        ],
        power: [
            { name: '과거의 나',           icon: '🪞💪', hpBase: 1800, atkBase: 160 },
            { name: '한계의 벽',           icon: '🧱🔥', hpBase: 3000, atkBase: 200 },
        ],
    };

    const pool = templates[memType] || templates.combat;
    const enemies = [];
    const count = 3 + Math.floor(Math.random() * 2);

    for (let i = 0; i < count; i++) {
        const template = pool[Math.floor(Math.random() * pool.length)];
        enemies.push({
            name: template.name,
            icon: template.icon,
            hp: Math.floor(template.hpBase * mult * (1 + level * 0.05)),
            atk: Math.floor(template.atkBase * mult * (1 + level * 0.03)),
        });
    }

    return enemies;
}

function _ensure(player) {
    if (!player._memoryPalace) {
        player._memoryPalace = {
            clears: {},             // { memType_difficulty: clearCount }
            totalClears: 0,
            inscriptions: {},       // { inscriptionId: true }
            inMemory: false,
            memoryState: null,
            memoryTokens: 0,
            bestDifficulty: {},     // { memType: bestDifficulty }
            // 플레이 통계 추적
            stats: {
                monstersKilled: 0,
                deaths: 0,
                goldEarned: 0,
                zonesVisited: 0,
                interactions: 0,
                maxDamage: 0,
            },
        };
    }
    return player._memoryPalace;
}

// 기억 통계 업데이트 (외부에서 호출)
function trackStat(player, stat, value) {
    const state = _ensure(player);
    if (stat === 'maxDamage') {
        state.stats.maxDamage = Math.max(state.stats.maxDamage, value);
    } else {
        state.stats[stat] = (state.stats[stat] || 0) + (value || 1);
    }
}

// 기억 진입
function enterMemory(player, memType, difficulty) {
    const state = _ensure(player);
    if (state.inMemory) return { success: false, msg: '이미 기억 속에 있습니다.' };

    const mem = MEMORY_TYPES[memType];
    if (!mem) return { success: false, msg: '알 수 없는 기억' };

    const diff = MEMORY_DIFFICULTIES[difficulty];
    if (!diff) return { success: false, msg: '알 수 없는 난이도' };

    // 통계 요건 체크
    if ((state.stats[mem.stat] || 0) < mem.minValue) {
        return { success: false, msg: `${mem.name} 해금 조건: ${mem.stat} ${mem.minValue} 이상 (현재: ${state.stats[mem.stat] || 0})` };
    }

    // 레벨 요건
    if ((player.level || 1) < 25) return { success: false, msg: 'Lv.25 이상 필요' };

    const enemies = _generateMemoryEnemies(player, memType, difficulty);

    state.inMemory = true;
    state.memoryState = {
        memType,
        difficulty,
        enemies,
        currentEnemy: 0,
        playerHp: player.hp || 100,
        playerMaxHp: player.maxHp || 100,
        totalDmgDealt: 0,
        startTime: Date.now(),
    };

    return {
        success: true,
        mem, diff, enemyCount: enemies.length,
        firstEnemy: enemies[0],
        msg: `${mem.icon} ${mem.name} (${diff.icon} ${diff.name}) 진입!\n"${mem.desc}"\n${enemies.length}개의 기억이 기다린다... 첫 번째: ${enemies[0].icon} ${enemies[0].name}`,
    };
}

// 기억 전투
function fightMemory(player) {
    const state = _ensure(player);
    if (!state.inMemory || !state.memoryState) return { success: false, msg: '기억 속이 아닙니다.' };

    const ms = state.memoryState;
    if (ms.currentEnemy >= ms.enemies.length) return { success: false, msg: '모든 기억을 극복했습니다.' };

    const enemy = ms.enemies[ms.currentEnemy];
    const playerAtk = (player.atk || 10) + (player.level || 1) * 2;

    const isCrit = Math.random() < 0.15;
    const damage = Math.floor(playerAtk * (isCrit ? 2.0 : 1.0) * (0.8 + Math.random() * 0.4));
    const enemyDmg = Math.floor(enemy.atk * (0.5 + Math.random() * 0.5));

    ms.playerHp = Math.max(0, ms.playerHp - enemyDmg);
    ms.totalDmgDealt += damage;

    // 기억의 치유 (전투 후 소량 회복)
    const healAmount = Math.floor(ms.playerMaxHp * 0.03);
    ms.playerHp = Math.min(ms.playerMaxHp, ms.playerHp + healAmount);

    const killed = damage >= enemy.hp;

    if (killed) {
        ms.currentEnemy++;

        if (ms.currentEnemy >= ms.enemies.length) {
            return _completeMemory(player, state, ms);
        }

        const nextEnemy = ms.enemies[ms.currentEnemy];
        return {
            success: true, type: 'enemy_clear',
            damage, isCrit, enemyDmg, healAmount,
            progress: `${ms.currentEnemy}/${ms.enemies.length}`,
            nextEnemy,
            hp: ms.playerHp,
            msg: `${isCrit ? '💥' : '⚔️'} ${enemy.icon} ${enemy.name} 극복! (${damage} 데미지) HP: ${ms.playerHp} [${ms.currentEnemy}/${ms.enemies.length}]`,
        };
    }

    // 패배 체크
    if (ms.playerHp <= 0) {
        state.inMemory = false;
        state.memoryState = null;
        return {
            success: true, type: 'defeat',
            msg: `💀 ${enemy.icon} ${enemy.name}에게 패배... 기억에서 밀려났습니다.`,
        };
    }

    return {
        success: true, type: 'fighting',
        damage, isCrit, enemyDmg, healAmount,
        enemyHp: Math.max(0, enemy.hp - damage), enemyMaxHp: enemy.hp,
        hp: ms.playerHp,
        msg: `${enemy.icon} ${enemy.name}에게 ${damage} 데미지${isCrit ? ' (크리!)' : ''} (반격 ${enemyDmg}) HP: ${ms.playerHp}`,
    };
}

function _completeMemory(player, state, ms) {
    const diff = MEMORY_DIFFICULTIES[ms.difficulty];
    const elapsed = Math.floor((Date.now() - ms.startTime) / 1000);

    const key = `${ms.memType}_${ms.difficulty}`;
    state.clears[key] = (state.clears[key] || 0) + 1;
    state.totalClears++;

    // 최고 난이도 갱신
    const diffOrder = ['faded', 'clear', 'vivid', 'nightmare', 'eternal'];
    const currentBest = state.bestDifficulty[ms.memType];
    if (!currentBest || diffOrder.indexOf(ms.difficulty) > diffOrder.indexOf(currentBest)) {
        state.bestDifficulty[ms.memType] = ms.difficulty;
    }

    const goldReward = Math.floor(10000 * diff.rewardMult);
    const expReward = Math.floor(5000 * diff.rewardMult);
    const tokenReward = Math.floor(5 * diff.rewardMult);

    player.gold = Math.min((player.gold || 0) + goldReward, 999999999);
    player.exp = (player.exp || 0) + expReward;
    state.memoryTokens += tokenReward;

    // 각인 해금 체크
    let newInscription = null;
    for (const [insId, ins] of Object.entries(MEMORY_INSCRIPTIONS)) {
        if (state.inscriptions[insId]) continue;
        if (ins.memType === 'all') {
            if (state.totalClears >= ins.require) {
                state.inscriptions[insId] = true;
                newInscription = ins;
            }
        } else if (ins.memType === ms.memType) {
            const typeClears = Object.entries(state.clears)
                .filter(([k]) => k.startsWith(ms.memType))
                .reduce((sum, [, c]) => sum + c, 0);
            if (typeClears >= ins.require) {
                state.inscriptions[insId] = true;
                newInscription = ins;
            }
        }
    }

    // HP 복구
    player.hp = Math.min(player.maxHp || 100, (player.hp || 100) + Math.floor((player.maxHp || 100) * 0.3));

    state.inMemory = false;
    state.memoryState = null;

    return {
        success: true, type: 'complete',
        goldReward, expReward, tokenReward, elapsed,
        newInscription,
        msg: `🧠✨ ${MEMORY_TYPES[ms.memType].name} (${diff.name}) 극복! ${elapsed}초\n+${goldReward}G +${expReward}EXP +${tokenReward} 기억 토큰${newInscription ? `\n🔮 각인 해금: ${newInscription.icon} ${newInscription.name} — ${newInscription.desc}` : ''}`,
    };
}

// 기억 포기
function leaveMemory(player) {
    const state = _ensure(player);
    if (!state.inMemory) return { success: false, msg: '기억 속이 아닙니다.' };
    state.inMemory = false;
    state.memoryState = null;
    return { success: true, msg: '🧠 기억에서 빠져나왔습니다...' };
}

function getStatus(player) {
    const state = _ensure(player);
    return {
        totalClears: state.totalClears,
        memoryTokens: state.memoryTokens,
        inMemory: state.inMemory,
        stats: state.stats,
        clears: state.clears,
        bestDifficulty: state.bestDifficulty,
        inscriptions: Object.entries(MEMORY_INSCRIPTIONS).map(([id, ins]) => ({
            id, ...ins,
            unlocked: !!state.inscriptions[id],
        })),
        memories: Object.entries(MEMORY_TYPES).map(([id, m]) => ({
            id, ...m,
            currentValue: state.stats[m.stat] || 0,
            available: (state.stats[m.stat] || 0) >= m.minValue,
        })),
        difficulties: MEMORY_DIFFICULTIES,
        memoryState: state.memoryState ? {
            memType: state.memoryState.memType,
            difficulty: state.memoryState.difficulty,
            currentEnemy: state.memoryState.currentEnemy,
            totalEnemies: state.memoryState.enemies.length,
            hp: state.memoryState.playerHp,
            maxHp: state.memoryState.playerMaxHp,
            enemy: state.memoryState.enemies[state.memoryState.currentEnemy] || null,
        } : null,
    };
}

module.exports = {
    MEMORY_TYPES, MEMORY_DIFFICULTIES, MEMORY_INSCRIPTIONS,
    trackStat, enterMemory, fightMemory, leaveMemory, getStatus,
};

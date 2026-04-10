// ==========================================
// 저주받은 던전 — v2.42
// 랜덤 저주 로그라이크 던전 + 저주 역이용 + 저주 조합 보상
// ==========================================

// ── 저주 목록 (입장 시 1~3개 랜덤 부여) ──
const CURSES = {
    // ─── 전투 저주 ───
    glass_body:     { name: '유리 몸',       icon: '🪟',   tier: 1, effect: { defMult: -0.5 },           desc: 'DEF -50%', exploit: '받는 데미지 2배 → 반사 데미지 활성화' },
    sealed_arm:     { name: '봉인된 팔',     icon: '🚫✋', tier: 1, effect: { atkMult: -0.3 },           desc: 'ATK -30%', exploit: '스킬 데미지 +40% 보정' },
    heavy_chain:    { name: '무거운 사슬',   icon: '⛓️',   tier: 1, effect: { speedMult: -0.4 },         desc: '이동속도 -40%', exploit: '회피 불가 대신 방어력 +20%' },
    mana_leak:      { name: '마나 누출',     icon: '💧🔮', tier: 2, effect: { mpDrain: 5 },              desc: '초당 MP -5', exploit: 'MP 0일 때 물리 데미지 2배' },
    blood_curse:    { name: '피의 저주',     icon: '🩸',   tier: 2, effect: { hpDrain: 3 },              desc: '초당 HP -3', exploit: 'HP 30% 이하 시 크리 확률 +30%' },
    blind_eye:      { name: '맹목',         icon: '🙈',   tier: 2, effect: { accuracy: -0.3 },           desc: '명중률 -30%', exploit: '명중 시 데미지 +50%' },
    soul_weight:    { name: '영혼의 무게',   icon: '👻⬇️', tier: 3, effect: { expMult: -0.5 },           desc: 'EXP 획득 -50%', exploit: '골드 드롭 +100%' },
    reversed_heal:  { name: '역전된 치유',   icon: '💚➡️💀', tier: 3, effect: { healReverse: true },      desc: '회복이 데미지로 전환', exploit: '적의 힐도 데미지로 전환' },
    mirror_pain:    { name: '거울의 고통',   icon: '🪞💢', tier: 3, effect: { reflectSelf: 0.2 },         desc: '가한 데미지의 20%를 자신도 받음', exploit: '흡혈 효과 3배' },
    time_fracture:  { name: '시간 균열',     icon: '⏳💥', tier: 4, effect: { cooldownMult: 2.0 },        desc: '스킬 쿨다운 2배', exploit: '스킬 위력 +80%' },
    void_hunger:    { name: '공허의 굶주림', icon: '🕳️🍽️', tier: 4, effect: { goldDrain: true },          desc: '방마다 골드 -5%', exploit: '소모된 골드만큼 ATK 버프' },
    death_timer:    { name: '죽음의 시계',   icon: '⏰💀', tier: 5, effect: { deathTimer: 180 },          desc: '3분 내 클리어 못하면 즉사', exploit: '시간 압박 보너스: 보상 x3' },
};

// ── 저주 조합 (특정 저주 조합 → 특수 효과) ──
const CURSE_COMBOS = {
    berserker:   { name: '광전사의 길',     icon: '🔥⚔️', curses: ['glass_body', 'blood_curse'],           bonus: { atkMult: 0.8, lifesteal: 0.15 }, desc: 'DEF 포기 → ATK +80%, 흡혈 +15%' },
    ghost_walk:  { name: '유령 보행',       icon: '👻🚶', curses: ['heavy_chain', 'blind_eye'],            bonus: { phaseThrough: true, critRate: 0.2 }, desc: '벽 통과 + 크리 +20%' },
    blood_mage:  { name: '혈마법사',       icon: '🩸🔮', curses: ['mana_leak', 'blood_curse'],             bonus: { bloodMagic: true, spellPower: 0.5 }, desc: 'HP로 마법 시전, 마법 위력 +50%' },
    time_lord:   { name: '시간의 지배자',   icon: '⏳👑', curses: ['time_fracture', 'death_timer'],         bonus: { timeStop: true, duration: 5 }, desc: '5초 시간 정지 사용 가능 (보스전)' },
    void_walker: { name: '공허의 보행자',   icon: '🕳️🚶', curses: ['void_hunger', 'soul_weight'],          bonus: { voidDmg: 0.4, immuneVoid: true }, desc: '공허 데미지 +40%, 공허 면역' },
    undying:     { name: '불사의 몸',       icon: '💀❌', curses: ['reversed_heal', 'mirror_pain'],         bonus: { reviveOnDeath: true, maxHpUp: 0.3 }, desc: '1회 부활 + 최대 HP +30%' },
    all_cursed:  { name: '완전한 저주',     icon: '💀💀💀', curses: ['death_timer', 'blood_curse', 'glass_body'], bonus: { allReward: 5.0, legendaryDrop: 0.5 }, desc: '보상 x5, 전설 드롭 50%' },
};

// ── 던전 층 ──
const DUNGEON_FLOORS = [
    { floor: 1,  name: '잊힌 예배당',       icon: '⛪💀',  monsters: ['저주받은 사제', '뼈 집사', '그림자 신도'], monsterHp: 300,  monsterAtk: 30,  goldReward: 2000,  expReward: 800 },
    { floor: 2,  name: '썩은 도서관',       icon: '📚🕸️',  monsters: ['미치광이 학자', '마도서', '잉크 유령'], monsterHp: 500,  monsterAtk: 50,  goldReward: 3500,  expReward: 1500 },
    { floor: 3,  name: '거꾸로 된 정원',   icon: '🌿🔄',  monsters: ['식인 꽃', '독 나무', '저주받은 정령'], monsterHp: 800,  monsterAtk: 75,  goldReward: 5000,  expReward: 2500 },
    { floor: 4,  name: '피의 분수대',       icon: '⛲🩸',  monsters: ['핏빛 기사', '흡혈 조각상', '피의 원소'], monsterHp: 1200, monsterAtk: 100, goldReward: 8000,  expReward: 4000 },
    { floor: 5,  name: '뒤틀린 거울의 방', icon: '🪞👹',  monsters: ['거울 도플갱어', '왜곡된 자아', '균열 수호자'], monsterHp: 1800, monsterAtk: 130, goldReward: 12000, expReward: 6000 },
    { floor: 6,  name: '고문실',           icon: '⛏️💀',  monsters: ['고문관', '살아있는 족쇄', '비명의 벽'], monsterHp: 2500, monsterAtk: 160, goldReward: 18000, expReward: 9000 },
    { floor: 7,  name: '역전된 왕좌',       icon: '👑🔄',  monsters: ['타락한 왕', '저주받은 근위대', '어둠의 대신'], monsterHp: 3500, monsterAtk: 200, goldReward: 25000, expReward: 13000 },
];

// ── 저주 던전 보스 ──
const CURSED_BOSSES = {
    curse_weaver: { name: '저주 직공 말레딕투스', icon: '🕷️💀', hp: 20000, atk: 350, def: 150, skills: ['저주 거미줄', '고통의 바늘', '절망의 고치'], phase2Hp: 0.4, phase2Buff: { atkMult: 1.5, newSkill: '완전한 저주' } },
    mirror_demon: { name: '거울 악마 리플렉스',   icon: '🪞😈', hp: 30000, atk: 250, def: 250, skills: ['완벽한 복제', '거울 파편 폭풍', '자아 침식'], phase2Hp: 0.3, phase2Buff: { copies: 3, desc: '분신 3체 소환' } },
    blood_god:    { name: '피의 신 헤마토스',     icon: '🩸👹', hp: 50000, atk: 500, def: 100, skills: ['혈류 조종', '핏빛 폭우', '생명 흡수'], phase2Hp: 0.5, phase2Buff: { lifesteal: 0.3, regen: 500 } },
};

// ── 저주 유물 (던전 보상) ──
const CURSED_RELICS = {
    pain_ring:       { name: '고통의 반지',       icon: '💍💀', grade: 'legendary', stats: { atk: 50, critDmg: 0.2, selfDmgOnCrit: 10 }, desc: '크리 시 자해 10 → 크리 데미지 +20%' },
    mirror_shard:    { name: '거울 파편',         icon: '🪞🔪', grade: 'legendary', stats: { reflectDmg: 0.15, def: 30 }, desc: '받은 데미지 15% 반사' },
    blood_chalice:   { name: '피의 성배',         icon: '🏆🩸', grade: 'mythic', stats: { lifesteal: 0.12, maxHp: -100, atk: 80 }, desc: '최대 HP -100, ATK +80, 흡혈 12%' },
    curse_crown:     { name: '저주의 왕관',       icon: '👑💀', grade: 'mythic', stats: { allStat: 20, curseImmune: true }, desc: 'ALL +20, 저주 면역 (저주 던전 내)' },
    void_pendant:    { name: '공허의 펜던트',     icon: '📿🕳️', grade: 'legendary', stats: { mpRegen: 10, spellPower: 0.15 }, desc: 'MP 재생 +10/초, 마법 위력 +15%' },
    agony_blade:     { name: '고뇌의 검',         icon: '⚔️😱', grade: 'mythic', stats: { atk: 120, curseStacks: true }, desc: '저주 1개당 ATK +15% (던전 내)' },
    paradox_armor:   { name: '모순의 갑옷',       icon: '🛡️🔄', grade: 'mythic', stats: { def: 60, hp: 200, paradoxShield: true }, desc: '받는 데미지가 높을수록 방어력 증가' },
    despair_tome:    { name: '절망의 마도서',     icon: '📖💀', grade: 'legendary', stats: { spellPower: 0.25, mpCost: 1.3 }, desc: '마법 위력 +25%, MP 소모 +30%' },
};

// ── 저주 해제/강화 제단 (층 사이 선택) ──
const ALTAR_CHOICES = {
    purify:    { name: '정화 제단',     icon: '✨⛪', desc: '저주 1개 제거 (보상 -20%)' },
    empower:   { name: '강화 제단',     icon: '💪⛪', desc: '저주 효과 2배 → 보상도 2배' },
    exchange:  { name: '교환 제단',     icon: '🔄⛪', desc: '현재 저주를 랜덤 다른 저주로 교체' },
    embrace:   { name: '수용 제단',     icon: '🖤⛪', desc: '저주 1개 추가 → 보상 +50%' },
    sacrifice: { name: '희생 제단',     icon: '🩸⛪', desc: 'HP 30% 희생 → 다음 층 데미지 +50%' },
};

function _ensure(player) {
    if (!player._cursedDungeon) {
        player._cursedDungeon = {
            totalRuns: 0,
            bestFloor: 0,
            totalClears: 0,
            inDungeon: false,
            currentFloor: 0,
            activeCurses: [],       // [{ curseId, empowered }]
            activeCombo: null,      // 활성 저주 조합
            rewardMult: 1.0,
            floorMonsters: 0,       // 현재 층 남은 몬스터
            bossDefeated: false,
            currentBoss: null,
            currentBossHp: 0,
            bossPhase: 1,
            dungeonStartTime: 0,
            relicsFound: {},        // { relicId: count }
            cursesMastered: {},     // { curseId: clearCount } — 특정 저주로 클리어 횟수
            sacrificeActive: false,
            dmgBonus: 0,
            lastRunTime: 0,
        };
    }
    return player._cursedDungeon;
}

// 저주 랜덤 부여
function _rollCurses(tier) {
    const available = Object.entries(CURSES).filter(([, c]) => c.tier <= tier);
    const count = Math.min(1 + Math.floor(Math.random() * 3), available.length); // 1~3개
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(([id]) => ({ curseId: id, empowered: false }));
}

// 저주 조합 체크
function _checkCombo(activeCurses) {
    const curseIds = new Set(activeCurses.map(c => c.curseId));
    for (const [comboId, combo] of Object.entries(CURSE_COMBOS)) {
        if (combo.curses.every(c => curseIds.has(c))) {
            return { comboId, ...combo };
        }
    }
    return null;
}

// 던전 입장
function enterDungeon(player) {
    const state = _ensure(player);
    if (state.inDungeon) return { success: false, msg: '이미 던전 안에 있습니다.' };
    if ((player.level || 1) < 20) return { success: false, msg: 'Lv.20 이상 필요' };

    // 쿨다운 15분
    if (Date.now() - state.lastRunTime < 900000) {
        const remain = Math.ceil((900000 - (Date.now() - state.lastRunTime)) / 1000);
        return { success: false, msg: `재입장 대기: ${remain}초` };
    }

    // 입장료 5,000G
    if ((player.gold || 0) < 5000) return { success: false, msg: '골드 부족 (5,000G)' };
    player.gold -= 5000;

    // 저주 부여
    const tier = Math.min(5, 1 + Math.floor((player.level || 1) / 10));
    const curses = _rollCurses(tier);

    state.inDungeon = true;
    state.currentFloor = 1;
    state.activeCurses = curses;
    state.rewardMult = 1.0 + curses.length * 0.3; // 저주 많을수록 보상 증가
    state.floorMonsters = 3;
    state.bossDefeated = false;
    state.currentBoss = null;
    state.currentBossHp = 0;
    state.bossPhase = 1;
    state.dungeonStartTime = Date.now();
    state.totalRuns++;
    state.sacrificeActive = false;
    state.dmgBonus = 0;

    // 저주 조합 체크
    const combo = _checkCombo(curses);
    state.activeCombo = combo ? combo.comboId : null;

    const curseNames = curses.map(c => {
        const curse = CURSES[c.curseId];
        return `${curse.icon} ${curse.name}: ${curse.desc}`;
    });

    return {
        success: true,
        floor: DUNGEON_FLOORS[0],
        curses: curseNames,
        combo: combo ? `${combo.icon} ${combo.name} 발동! — ${combo.desc}` : null,
        rewardMult: state.rewardMult,
        msg: `⛪💀 저주받은 던전 입장!\n저주: ${curseNames.join(' | ')}${combo ? `\n🔥 저주 조합: ${combo.icon} ${combo.name} — ${combo.desc}` : ''}`,
    };
}

// 전투
function fight(player) {
    const state = _ensure(player);
    if (!state.inDungeon) return { success: false, msg: '던전에 있지 않습니다.' };

    const floorIdx = Math.min(state.currentFloor - 1, DUNGEON_FLOORS.length - 1);
    const floor = DUNGEON_FLOORS[floorIdx];

    // 죽음의 시계 체크
    const hasDeathTimer = state.activeCurses.some(c => c.curseId === 'death_timer');
    if (hasDeathTimer) {
        const elapsed = (Date.now() - state.dungeonStartTime) / 1000;
        const timerDuration = state.activeCurses.find(c => c.curseId === 'death_timer')?.empowered ? 90 : 180;
        if (elapsed > timerDuration) {
            state.inDungeon = false;
            state.lastRunTime = Date.now();
            return { success: true, type: 'death_timer', msg: '⏰💀 죽음의 시계가 울렸다... 시간 초과! 던전에서 추방됩니다.' };
        }
    }

    // ATK 계산 (저주 적용)
    let atkMult = 1.0;
    let defMult = 1.0;
    let critBonus = 0;
    let lifestealBonus = 0;
    let extraDmgMult = 1.0;

    for (const c of state.activeCurses) {
        const curse = CURSES[c.curseId];
        const mult = c.empowered ? 2.0 : 1.0;
        if (curse.effect.atkMult) atkMult += curse.effect.atkMult * mult;
        if (curse.effect.defMult) defMult += curse.effect.defMult * mult;
        // 저주 역이용 보너스
        if (c.curseId === 'sealed_arm') extraDmgMult += 0.4 * mult;
        if (c.curseId === 'blood_curse' && (player.hp || 100) < (player.maxHp || 100) * 0.3) critBonus += 0.3;
        if (c.curseId === 'blind_eye') extraDmgMult += 0.5 * mult * (Math.random() < 0.7 ? 0 : 1); // 명중 시만
        if (c.curseId === 'mirror_pain') lifestealBonus += 0.15 * mult;
        if (c.curseId === 'time_fracture') extraDmgMult += 0.8 * mult;
    }

    // 저주 조합 보너스
    if (state.activeCombo) {
        const combo = CURSE_COMBOS[state.activeCombo];
        if (combo.bonus.atkMult) atkMult += combo.bonus.atkMult;
        if (combo.bonus.lifesteal) lifestealBonus += combo.bonus.lifesteal;
        if (combo.bonus.critRate) critBonus += combo.bonus.critRate;
        if (combo.bonus.spellPower) extraDmgMult += combo.bonus.spellPower;
        if (combo.bonus.voidDmg) extraDmgMult += combo.bonus.voidDmg;
    }

    // 희생 제단 보너스
    if (state.sacrificeActive) extraDmgMult += 0.5;
    extraDmgMult += state.dmgBonus;

    const baseAtk = (player.atk || 10) + (player.level || 1) * 2;
    const finalAtk = Math.floor(baseAtk * Math.max(0.1, atkMult) * extraDmgMult);
    const isCrit = Math.random() < (0.1 + critBonus);
    const damage = Math.floor(finalAtk * (isCrit ? 2.0 : 1.0) * (0.8 + Math.random() * 0.4));

    // 보스전
    if (state.floorMonsters <= 0 && state.currentBoss) {
        return _fightBoss(player, state, damage, isCrit, lifestealBonus);
    }

    // 일반 몬스터
    const monsterName = floor.monsters[Math.floor(Math.random() * floor.monsters.length)];
    const killed = damage >= floor.monsterHp;

    // 적의 반격
    const enemyDmg = Math.floor(floor.monsterAtk * Math.max(0.1, defMult) * (0.5 + Math.random() * 0.5));
    player.hp = Math.max(1, (player.hp || 100) - enemyDmg);

    // 흡혈
    if (lifestealBonus > 0 && killed) {
        const heal = Math.floor(damage * lifestealBonus);
        player.hp = Math.min((player.maxHp || 100), player.hp + heal);
    }

    // 저주 HP/MP 드레인
    _applyCurseDrain(player, state);

    if (killed) {
        state.floorMonsters--;
        const goldReward = Math.floor(floor.goldReward * 0.2 * state.rewardMult);
        const expReward = Math.floor(floor.expReward * 0.15 * state.rewardMult);
        player.gold = Math.min((player.gold || 0) + goldReward, 999999999);
        player.exp = (player.exp || 0) + expReward;

        return {
            success: true, type: 'monster_kill',
            monsterName, damage, isCrit, enemyDmg, goldReward, expReward,
            monstersLeft: state.floorMonsters,
            msg: `${isCrit ? '💥 크리티컬! ' : ''}${monsterName} 처치! ${damage} 데미지 (반격 ${enemyDmg}) +${goldReward}G +${expReward}EXP [잔여: ${state.floorMonsters}]`,
        };
    }

    return {
        success: true, type: 'monster_hit',
        monsterName, damage, isCrit, enemyDmg,
        msg: `${monsterName}에게 ${damage} 데미지${isCrit ? ' (크리!)' : ''} (반격 ${enemyDmg})`,
    };
}

function _fightBoss(player, state, damage, isCrit, lifestealBonus) {
    const boss = CURSED_BOSSES[state.currentBoss];
    state.currentBossHp = Math.max(0, state.currentBossHp - damage);

    // 페이즈 2 전환
    if (state.bossPhase === 1 && state.currentBossHp <= boss.hp * boss.phase2Hp) {
        state.bossPhase = 2;
    }

    const bossAtkMult = state.bossPhase === 2 ? (boss.phase2Buff.atkMult || 1.0) : 1.0;
    const bossDmg = Math.floor(boss.atk * bossAtkMult * (0.5 + Math.random() * 0.5));
    player.hp = Math.max(1, (player.hp || 100) - bossDmg);

    if (lifestealBonus > 0) {
        const heal = Math.floor(damage * lifestealBonus);
        player.hp = Math.min((player.maxHp || 100), player.hp + heal);
    }

    _applyCurseDrain(player, state);

    // 부활 체크 (불사 조합)
    if (player.hp <= 1 && state.activeCombo === 'undying' && !state._usedRevive) {
        state._usedRevive = true;
        player.hp = Math.floor((player.maxHp || 100) * 0.5);
    }

    if (state.currentBossHp <= 0) {
        // 보스 격파!
        state.bossDefeated = true;
        state.totalClears++;
        if (state.currentFloor > state.bestFloor) state.bestFloor = state.currentFloor;

        const goldReward = Math.floor(30000 * state.rewardMult);
        const expReward = Math.floor(15000 * state.rewardMult);
        player.gold = Math.min((player.gold || 0) + goldReward, 999999999);
        player.exp = (player.exp || 0) + expReward;

        // 유물 드롭
        let relic = null;
        const dropChance = 0.15 + state.activeCurses.length * 0.05;
        const hasLegendaryBoost = state.activeCombo === 'all_cursed';
        if (Math.random() < dropChance || hasLegendaryBoost) {
            const relicKeys = Object.keys(CURSED_RELICS);
            const relicKey = relicKeys[Math.floor(Math.random() * relicKeys.length)];
            relic = { id: relicKey, ...CURSED_RELICS[relicKey] };
            state.relicsFound[relicKey] = (state.relicsFound[relicKey] || 0) + 1;
        }

        // 저주 마스터리 기록
        for (const c of state.activeCurses) {
            state.cursesMastered[c.curseId] = (state.cursesMastered[c.curseId] || 0) + 1;
        }

        state.inDungeon = false;
        state.lastRunTime = Date.now();

        return {
            success: true, type: 'boss_clear',
            boss, goldReward, expReward, relic,
            cursesUsed: state.activeCurses.length,
            msg: `${boss.icon} ${boss.name} 격파! +${goldReward}G +${expReward}EXP${relic ? ` — ${relic.icon} ${relic.name} 획득!` : ''} (저주 ${state.activeCurses.length}개로 클리어!)`,
        };
    }

    const phaseMsg = state.bossPhase === 2 ? ' [페이즈 2!]' : '';
    return {
        success: true, type: 'boss_hit',
        damage, isCrit, bossDmg, bossHp: state.currentBossHp, bossMaxHp: boss.hp, phase: state.bossPhase,
        msg: `${boss.icon} ${boss.name}에게 ${damage} 데미지${isCrit ? ' (크리!)' : ''} (반격 ${bossDmg}) HP: ${state.currentBossHp}/${boss.hp}${phaseMsg}`,
    };
}

function _applyCurseDrain(player, state) {
    for (const c of state.activeCurses) {
        const curse = CURSES[c.curseId];
        const mult = c.empowered ? 2.0 : 1.0;
        if (curse.effect.hpDrain) {
            player.hp = Math.max(1, (player.hp || 100) - Math.floor(curse.effect.hpDrain * mult));
        }
        if (curse.effect.mpDrain) {
            player.mp = Math.max(0, (player.mp || 0) - Math.floor(curse.effect.mpDrain * mult));
        }
    }
}

// 다음 층으로 (제단 선택)
function nextFloor(player, altarChoice) {
    const state = _ensure(player);
    if (!state.inDungeon) return { success: false, msg: '던전에 있지 않습니다.' };
    if (state.floorMonsters > 0) return { success: false, msg: '이 층의 몬스터를 먼저 처치하세요.' };

    // 마지막 층이면 보스전
    if (state.currentFloor >= DUNGEON_FLOORS.length) {
        return _startBoss(player, state);
    }

    // 제단 선택 적용
    const altar = ALTAR_CHOICES[altarChoice];
    let altarMsg = '';
    if (altar) {
        switch (altarChoice) {
            case 'purify':
                if (state.activeCurses.length > 0) {
                    const removed = state.activeCurses.pop();
                    state.rewardMult = Math.max(0.5, state.rewardMult - 0.2);
                    altarMsg = `${altar.icon} ${CURSES[removed.curseId].name} 저주 해제! (보상 -20%)`;
                }
                break;
            case 'empower':
                if (state.activeCurses.length > 0) {
                    const target = state.activeCurses[Math.floor(Math.random() * state.activeCurses.length)];
                    target.empowered = true;
                    state.rewardMult += 0.5;
                    altarMsg = `${altar.icon} ${CURSES[target.curseId].name} 강화! 효과 2배 → 보상 +50%!`;
                }
                break;
            case 'exchange':
                if (state.activeCurses.length > 0) {
                    const idx = Math.floor(Math.random() * state.activeCurses.length);
                    const oldCurse = state.activeCurses[idx].curseId;
                    const available = Object.keys(CURSES).filter(id => !state.activeCurses.some(c => c.curseId === id));
                    if (available.length > 0) {
                        const newCurseId = available[Math.floor(Math.random() * available.length)];
                        state.activeCurses[idx] = { curseId: newCurseId, empowered: false };
                        altarMsg = `${altar.icon} ${CURSES[oldCurse].name} → ${CURSES[newCurseId].icon} ${CURSES[newCurseId].name} 교체!`;
                    }
                }
                break;
            case 'embrace': {
                const available = Object.keys(CURSES).filter(id => !state.activeCurses.some(c => c.curseId === id));
                if (available.length > 0) {
                    const newCurseId = available[Math.floor(Math.random() * available.length)];
                    state.activeCurses.push({ curseId: newCurseId, empowered: false });
                    state.rewardMult += 0.5;
                    altarMsg = `${altar.icon} ${CURSES[newCurseId].icon} ${CURSES[newCurseId].name} 저주 추가! 보상 +50%!`;
                }
                break;
            }
            case 'sacrifice':
                player.hp = Math.max(1, Math.floor((player.hp || 100) * 0.7));
                state.sacrificeActive = true;
                state.dmgBonus += 0.5;
                altarMsg = `${altar.icon} HP 30% 희생! 다음 층 데미지 +50%!`;
                break;
        }

        // 조합 재확인
        const combo = _checkCombo(state.activeCurses);
        state.activeCombo = combo ? combo.comboId : null;
        if (combo && !altarMsg.includes('조합')) {
            altarMsg += ` | 🔥 ${combo.icon} ${combo.name} 발동!`;
        }
    }

    state.currentFloor++;
    const floorIdx = Math.min(state.currentFloor - 1, DUNGEON_FLOORS.length - 1);
    const floor = DUNGEON_FLOORS[floorIdx];
    state.floorMonsters = 3;
    state.sacrificeActive = altarChoice === 'sacrifice';

    // HP 소량 회복
    player.hp = Math.min((player.maxHp || 100), (player.hp || 100) + Math.floor((player.maxHp || 100) * 0.1));

    return {
        success: true,
        floor, floorNum: state.currentFloor, altarMsg,
        msg: `${floor.icon} ${state.currentFloor}층: ${floor.name} 진입!${altarMsg ? `\n${altarMsg}` : ''} (HP 10% 회복)`,
    };
}

function _startBoss(player, state) {
    // 보스 선택 (저주 수에 따라)
    const bossKeys = Object.keys(CURSED_BOSSES);
    const bossIdx = Math.min(state.activeCurses.length - 1, bossKeys.length - 1);
    const bossKey = bossKeys[Math.max(0, bossIdx)];
    const boss = CURSED_BOSSES[bossKey];

    state.currentBoss = bossKey;
    state.currentBossHp = boss.hp;
    state.bossPhase = 1;
    state.floorMonsters = 0;
    state._usedRevive = false;

    return {
        success: true, type: 'boss_appear',
        boss,
        msg: `${boss.icon} ${boss.name} 등장! HP: ${boss.hp} | ATK: ${boss.atk} | 스킬: ${boss.skills.join(', ')}`,
    };
}

// 던전 포기
function abandonDungeon(player) {
    const state = _ensure(player);
    if (!state.inDungeon) return { success: false, msg: '던전에 있지 않습니다.' };

    state.inDungeon = false;
    state.lastRunTime = Date.now();

    return {
        success: true,
        msg: '⛪💀 저주받은 던전에서 탈출했습니다... 저주가 풀렸습니다.',
    };
}

// 상태 조회
function getStatus(player) {
    const state = _ensure(player);
    const elapsed = state.inDungeon ? (Date.now() - state.dungeonStartTime) / 1000 : 0;

    return {
        inDungeon: state.inDungeon,
        currentFloor: state.currentFloor,
        bestFloor: state.bestFloor,
        totalRuns: state.totalRuns,
        totalClears: state.totalClears,
        activeCurses: state.activeCurses.map(c => ({
            ...c,
            curse: CURSES[c.curseId],
        })),
        activeCombo: state.activeCombo ? { id: state.activeCombo, ...CURSE_COMBOS[state.activeCombo] } : null,
        rewardMult: state.rewardMult,
        floorMonsters: state.floorMonsters,
        currentBoss: state.currentBoss ? { id: state.currentBoss, ...CURSED_BOSSES[state.currentBoss], currentHp: state.currentBossHp, phase: state.bossPhase } : null,
        relicsFound: state.relicsFound,
        cursesMastered: state.cursesMastered,
        elapsed: Math.floor(elapsed),
        cooldownRemain: Math.max(0, Math.ceil((900000 - (Date.now() - state.lastRunTime)) / 1000)),
        floors: DUNGEON_FLOORS,
        currentFloorInfo: state.inDungeon ? DUNGEON_FLOORS[Math.min(state.currentFloor - 1, DUNGEON_FLOORS.length - 1)] : null,
        altarChoices: state.inDungeon && state.floorMonsters <= 0 ? ALTAR_CHOICES : null,
        curseList: CURSES,
        comboList: CURSE_COMBOS,
        relicList: CURSED_RELICS,
    };
}

module.exports = {
    CURSES, CURSE_COMBOS, DUNGEON_FLOORS, CURSED_BOSSES, CURSED_RELICS, ALTAR_CHOICES,
    enterDungeon, fight, nextFloor, abandonDungeon, getStatus,
};

// ==========================================
// 환영 투기장 — v2.45
// 과거 영웅/보스 환영 대결 + 기술 습득 + 연승 + 전설 도전
// ==========================================

// ── 환영 등급 ──
const PHANTOM_TIERS = {
    common:    { name: '일반',   icon: '⚪', atkMult: 1.0, hpMult: 1.0, rewardMult: 1.0 },
    veteran:   { name: '역전',   icon: '🟢', atkMult: 1.3, hpMult: 1.5, rewardMult: 1.5 },
    elite:     { name: '정예',   icon: '🔵', atkMult: 1.6, hpMult: 2.0, rewardMult: 2.0 },
    legendary: { name: '전설',   icon: '🟡', atkMult: 2.0, hpMult: 3.0, rewardMult: 3.0 },
    mythic:    { name: '신화',   icon: '🔴', atkMult: 3.0, hpMult: 5.0, rewardMult: 5.0 },
};

// ── 환영 목록 ──
const PHANTOMS = {
    // ─── 과거 영웅 ───
    phantom_knight:   { name: '성기사 아르투스',     icon: '🛡️⚔️', class: 'knight',   baseHp: 2000, baseAtk: 150, baseDef: 100, lore: '천 년 전 마왕을 봉인한 성기사. 그의 검술은 아직도 전설이다.', learnableSkill: { name: '성스러운 참격', effect: { dmg: 3.0, holyDmg: true }, cd: 20 } },
    phantom_mage:     { name: '대마법사 메를린',     icon: '🧙‍♂️',   class: 'mage',     baseHp: 1500, baseAtk: 200, baseDef: 60,  lore: '세계의 마법 체계를 창조한 현인. 그의 마법은 차원을 넘는다.', learnableSkill: { name: '차원 마법탄', effect: { dmg: 4.0, piercing: true }, cd: 25 } },
    phantom_assassin: { name: '그림자 칼날 실피아',   icon: '🗡️🌙', class: 'assassin', baseHp: 1200, baseAtk: 250, baseDef: 40,  lore: '어둠 속에서 왕국을 지킨 암살자. 그녀의 칼은 빛보다 빠르다.', learnableSkill: { name: '그림자 연무', effect: { dmg: 2.0, multiHit: 5 }, cd: 15 } },
    phantom_cleric:   { name: '대사제 루미나',       icon: '✨🙏', class: 'cleric',   baseHp: 2500, baseAtk: 100, baseDef: 80,  lore: '태양신의 사랑을 받은 사제. 그녀의 축복은 죽음도 되돌린다.', learnableSkill: { name: '태양의 축복', effect: { heal: 0.4, cleanse: true }, cd: 30 } },
    phantom_berserker:{ name: '광전사 울프가르',     icon: '🪓😤', class: 'warrior',  baseHp: 3000, baseAtk: 300, baseDef: 30,  lore: '분노만으로 군대를 쓸어버린 전사. 그의 함성은 대지를 흔든다.', learnableSkill: { name: '분노의 포효', effect: { atkBuff: 0.5, selfDmg: 0.1, duration: 10 }, cd: 25 } },

    // ─── 과거 보스 ───
    phantom_dragon_king:  { name: '용왕 이그니스',       icon: '🐉👑', class: 'boss', baseHp: 5000,  baseAtk: 400, baseDef: 150, lore: '화염의 군주. 대륙을 불태운 공포의 존재였다.', learnableSkill: { name: '황제의 브레스', effect: { aoe: true, dmg: 5.0, burn: 20 }, cd: 40 } },
    phantom_lich_queen:   { name: '리치 여왕 모르가나', icon: '💀👸', class: 'boss', baseHp: 4000,  baseAtk: 350, baseDef: 100, lore: '영원한 생명을 얻은 대가로 세계를 저주한 여왕.', learnableSkill: { name: '영원의 저주', effect: { dmg: 3.0, curse: true, mpDrain: 80 }, cd: 35 } },
    phantom_titan:        { name: '대지의 타이탄',       icon: '🗿💪', class: 'boss', baseHp: 8000,  baseAtk: 500, baseDef: 250, lore: '세계가 태어날 때 함께 태어난 거인. 대지 그 자체.', learnableSkill: { name: '대지의 분쇄', effect: { dmg: 6.0, stun: 3, armorBreak: 0.5 }, cd: 45 } },
    phantom_void_emperor: { name: '공허 황제 니힐루스',   icon: '🕳️👑', class: 'boss', baseHp: 10000, baseAtk: 600, baseDef: 200, lore: '존재를 삼키는 공허의 지배자. 차원의 끝에서 온 자.', learnableSkill: { name: '존재 소멸', effect: { hpCut: 0.25, defIgnore: true }, cd: 50 } },

    // ─── 전설의 존재 (최고 난이도) ───
    phantom_god_war:   { name: '전쟁신 아레스',       icon: '⚔️🔥', class: 'god', baseHp: 15000, baseAtk: 800, baseDef: 300, lore: '전쟁과 파괴의 신. 그의 앞에서 모든 것이 무너진다.', learnableSkill: { name: '전쟁의 심판', effect: { dmg: 8.0, aoe: true, fearAll: true }, cd: 60 } },
    phantom_god_death: { name: '사신 타나토스',       icon: '💀⚰️', class: 'god', baseHp: 12000, baseAtk: 1000, baseDef: 150, lore: '죽음 그 자체. 모든 생명의 종착점.', learnableSkill: { name: '죽음의 선고', effect: { instantKill: 0.1, dmg: 10.0 }, cd: 90 } },
    phantom_god_time:  { name: '시간신 크로노스',     icon: '⏳👑', class: 'god', baseHp: 20000, baseAtk: 700, baseDef: 400, lore: '시간의 창조자이자 지배자. 과거, 현재, 미래를 관장한다.', learnableSkill: { name: '시간의 역류', effect: { timeRewind: true, fullHeal: true }, cd: 120 } },
};

// ── 연승 보너스 ──
const STREAK_BONUSES = {
    3:  { name: '투사',       bonus: { expMult: 0.1 }, icon: '🥉' },
    5:  { name: '검투사',     bonus: { expMult: 0.15, goldMult: 0.1 }, icon: '🥈' },
    10: { name: '챔피언',     bonus: { expMult: 0.2, goldMult: 0.2, skillDmg: 0.05 }, icon: '🥇' },
    15: { name: '전설의 검투사', bonus: { expMult: 0.3, goldMult: 0.3, skillDmg: 0.1 }, icon: '🏆' },
    20: { name: '불멸의 투사', bonus: { allStat: 5, expMult: 0.5 }, icon: '👑' },
};

function _ensure(player) {
    if (!player._colosseum) {
        player._colosseum = {
            totalFights: 0,
            totalWins: 0,
            streak: 0,
            bestStreak: 0,
            phantomKills: {},       // { phantomId: killCount }
            learnedSkills: {},      // { phantomId: { skill, learnedAt } }
            inFight: false,
            fightState: null,
            fame: 0,               // 명성 포인트
            rank: 'none',
        };
    }
    return player._colosseum;
}

const FAME_RANKS = [
    { min: 0,    name: '무명',     icon: '⚪' },
    { min: 50,   name: '도전자',   icon: '🟢' },
    { min: 150,  name: '투사',     icon: '🔵' },
    { min: 400,  name: '검투사',   icon: '🟣' },
    { min: 800,  name: '챔피언',   icon: '🟡' },
    { min: 1500, name: '전설',     icon: '🔴' },
    { min: 3000, name: '신화',     icon: '👑' },
];

function _getRank(fame) {
    let rank = FAME_RANKS[0];
    for (const r of FAME_RANKS) {
        if (fame >= r.min) rank = r;
    }
    return rank;
}

// 환영 도전 시작
function challenge(player, phantomId, tierKey) {
    const state = _ensure(player);
    if (state.inFight) return { success: false, msg: '이미 전투 중입니다.' };

    const phantom = PHANTOMS[phantomId];
    if (!phantom) return { success: false, msg: '알 수 없는 환영' };

    // 레벨 제한
    const minLevels = { knight: 15, mage: 15, assassin: 15, cleric: 15, warrior: 15, boss: 30, god: 45 };
    if ((player.level || 1) < (minLevels[phantom.class] || 15)) {
        return { success: false, msg: `Lv.${minLevels[phantom.class]} 이상 필요` };
    }

    // 신 등급은 보스 5종 이상 클리어 필요
    if (phantom.class === 'god') {
        const bossKills = Object.entries(state.phantomKills)
            .filter(([id]) => PHANTOMS[id]?.class === 'boss')
            .reduce((sum, [, count]) => sum + (count > 0 ? 1 : 0), 0);
        if (bossKills < 4) return { success: false, msg: `신 도전 조건: 보스 환영 4종 이상 격파 필요 (현재: ${bossKills})` };
    }

    const tier = PHANTOM_TIERS[tierKey] || PHANTOM_TIERS.common;

    // 연승 보정 (연승 시 적도 강해짐)
    const streakScale = 1 + state.streak * 0.05;

    const finalHp = Math.floor(phantom.baseHp * tier.hpMult * streakScale);
    const finalAtk = Math.floor(phantom.baseAtk * tier.atkMult * streakScale);
    const finalDef = Math.floor(phantom.baseDef * tier.hpMult);

    state.inFight = true;
    state.fightState = {
        phantomId,
        tierKey,
        phantomHp: finalHp,
        phantomMaxHp: finalHp,
        phantomAtk: finalAtk,
        phantomDef: finalDef,
        playerStartHp: player.hp || 100,
        turns: 0,
        maxTurns: 20,
        usedSkills: [],
    };
    state.totalFights++;

    return {
        success: true,
        phantom: { ...phantom, hp: finalHp, atk: finalAtk, def: finalDef },
        tier,
        lore: phantom.lore,
        msg: `${tier.icon}${phantom.icon} ${phantom.name} (${tier.name}) 도전!\nHP: ${finalHp} | ATK: ${finalAtk} | DEF: ${finalDef}\n"${phantom.lore}"`,
    };
}

// 전투 (턴제)
function fight(player) {
    const state = _ensure(player);
    if (!state.inFight || !state.fightState) return { success: false, msg: '전투 중이 아닙니다.' };

    const fs = state.fightState;
    const phantom = PHANTOMS[fs.phantomId];
    const tier = PHANTOM_TIERS[fs.tierKey] || PHANTOM_TIERS.common;

    fs.turns++;

    // 플레이어 공격
    const playerAtk = (player.atk || 10) + (player.level || 1) * 2;
    const critChance = 0.15;
    const isCrit = Math.random() < critChance;
    const rawDmg = Math.floor(playerAtk * (isCrit ? 2.0 : 1.0) * (0.8 + Math.random() * 0.4));
    const dmgToPhantom = Math.max(1, rawDmg - fs.phantomDef);
    fs.phantomHp = Math.max(0, fs.phantomHp - dmgToPhantom);

    // 환영 공격
    const phantomDmg = Math.floor(fs.phantomAtk * (0.6 + Math.random() * 0.4));
    const playerDef = (player.def || 5);
    const dmgToPlayer = Math.max(1, phantomDmg - playerDef);
    player.hp = Math.max(1, (player.hp || 100) - dmgToPlayer);

    // 환영 특수 스킬 (3턴마다)
    let phantomSkillMsg = '';
    if (fs.turns % 3 === 0 && phantom.learnableSkill) {
        const skill = phantom.learnableSkill;
        const skillDmg = Math.floor(fs.phantomAtk * (skill.effect.dmg || 1));
        player.hp = Math.max(1, player.hp - Math.floor(skillDmg * 0.3)); // 스킬 추가 데미지
        phantomSkillMsg = ` | ${phantom.icon} "${skill.name}" 발동!`;
    }

    // 승리
    if (fs.phantomHp <= 0) {
        return _winFight(player, state, fs, phantom, tier);
    }

    // 턴 초과 또는 HP 1
    if (fs.turns >= fs.maxTurns) {
        return _loseFight(player, state, phantom);
    }

    return {
        success: true, type: 'turn',
        turn: fs.turns,
        dmgToPhantom, isCrit, dmgToPlayer,
        phantomHp: fs.phantomHp, phantomMaxHp: fs.phantomMaxHp,
        playerHp: player.hp,
        msg: `T${fs.turns}: ${isCrit ? '💥' : '⚔️'} ${dmgToPhantom} → 환영 (${fs.phantomHp}/${fs.phantomMaxHp}) | 환영 → ${dmgToPlayer} (HP: ${player.hp})${phantomSkillMsg}`,
    };
}

function _winFight(player, state, fs, phantom, tier) {
    state.inFight = false;
    state.totalWins++;
    state.streak++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    state.phantomKills[fs.phantomId] = (state.phantomKills[fs.phantomId] || 0) + 1;

    // 보상
    const baseGold = { knight: 5000, mage: 5000, assassin: 5000, cleric: 5000, warrior: 5000, boss: 15000, god: 50000 };
    const baseExp = { knight: 3000, mage: 3000, assassin: 3000, cleric: 3000, warrior: 3000, boss: 10000, god: 30000 };
    const goldReward = Math.floor((baseGold[phantom.class] || 5000) * tier.rewardMult);
    const expReward = Math.floor((baseExp[phantom.class] || 3000) * tier.rewardMult);
    const fameReward = Math.floor((phantom.class === 'god' ? 50 : phantom.class === 'boss' ? 20 : 10) * tier.rewardMult);

    player.gold = Math.min((player.gold || 0) + goldReward, 999999999);
    player.exp = (player.exp || 0) + expReward;
    state.fame += fameReward;

    // 스킬 습득 (첫 클리어 시)
    let skillLearned = null;
    if (!state.learnedSkills[fs.phantomId] && phantom.learnableSkill) {
        // 습득 확률: 일반=20%, 역전=30%, 정예=50%, 전설=80%, 신화=100%
        const learnChance = { common: 0.2, veteran: 0.3, elite: 0.5, legendary: 0.8, mythic: 1.0 };
        if (Math.random() < (learnChance[fs.tierKey] || 0.2)) {
            state.learnedSkills[fs.phantomId] = {
                skill: phantom.learnableSkill,
                learnedAt: Date.now(),
                phantomName: phantom.name,
                phantomIcon: phantom.icon,
            };
            skillLearned = phantom.learnableSkill;
        }
    }

    // 연승 보너스 체크
    const streakBonus = STREAK_BONUSES[state.streak] || null;

    // 랭크 업데이트
    state.rank = _getRank(state.fame).name;

    // HP 일부 회복
    player.hp = Math.min(player.maxHp || 100, player.hp + Math.floor((player.maxHp || 100) * 0.2));

    state.fightState = null;

    return {
        success: true, type: 'victory',
        phantom, tier, goldReward, expReward, fameReward,
        skillLearned, streak: state.streak, streakBonus,
        rank: _getRank(state.fame),
        msg: `🏆 ${phantom.icon} ${phantom.name} (${tier.name}) 격파! +${goldReward}G +${expReward}EXP +${fameReward} 명성 (${state.streak}연승)${skillLearned ? `\n⚡ "${skillLearned.name}" 습득!` : ''}${streakBonus ? `\n${streakBonus.icon} ${streakBonus.name} 보너스!` : ''}`,
    };
}

function _loseFight(player, state, phantom) {
    state.inFight = false;
    state.streak = 0;
    state.fightState = null;

    // HP 회복
    player.hp = Math.min(player.maxHp || 100, player.hp + Math.floor((player.maxHp || 100) * 0.3));

    return {
        success: true, type: 'defeat',
        phantom,
        msg: `💔 ${phantom.icon} ${phantom.name}에게 패배... 연승 초기화.`,
    };
}

// 습득한 스킬 사용
function useLearnedSkill(player, phantomId) {
    const state = _ensure(player);
    const learned = state.learnedSkills[phantomId];
    if (!learned) return { success: false, msg: '습득하지 않은 스킬입니다.' };

    const skill = learned.skill;
    const cdMs = skill.cd * 1000;

    if (learned._lastUsed && Date.now() - learned._lastUsed < cdMs) {
        const remain = Math.ceil((cdMs - (Date.now() - learned._lastUsed)) / 1000);
        return { success: false, msg: `${skill.name} 대기: ${remain}초` };
    }

    learned._lastUsed = Date.now();

    const results = {};
    let msg = `${learned.phantomIcon} ${skill.name} 발동!`;

    if (skill.effect.dmg) {
        results.damage = Math.floor((player.atk || 10) * skill.effect.dmg);
        msg += ` ${results.damage} 데미지!`;
    }
    if (skill.effect.heal) {
        const heal = Math.floor((player.maxHp || 100) * skill.effect.heal);
        player.hp = Math.min(player.maxHp || 100, (player.hp || 100) + heal);
        results.heal = heal;
        msg += ` HP +${heal}!`;
    }
    if (skill.effect.atkBuff) {
        results.atkBuff = skill.effect.atkBuff;
        results.duration = skill.effect.duration;
        msg += ` ATK +${Math.floor(skill.effect.atkBuff * 100)}% (${skill.effect.duration}초)!`;
    }
    if (skill.effect.fullHeal) {
        player.hp = player.maxHp || 100;
        msg += ' HP 완전 회복!';
    }
    if (skill.effect.hpCut) {
        results.hpCut = skill.effect.hpCut;
        msg += ` 적 HP ${Math.floor(skill.effect.hpCut * 100)}% 삭감!`;
    }
    if (skill.effect.multiHit) {
        const totalDmg = Math.floor((player.atk || 10) * skill.effect.dmg * skill.effect.multiHit);
        results.damage = totalDmg;
        msg += ` ${skill.effect.multiHit}연타 총 ${totalDmg}!`;
    }

    return { success: true, skill, results, msg };
}

// 전투 포기
function forfeit(player) {
    const state = _ensure(player);
    if (!state.inFight) return { success: false, msg: '전투 중이 아닙니다.' };

    state.inFight = false;
    state.streak = 0;
    state.fightState = null;
    player.hp = Math.min(player.maxHp || 100, (player.hp || 100) + Math.floor((player.maxHp || 100) * 0.3));

    return { success: true, msg: '🏳️ 전투 포기. 연승 초기화.' };
}

// 상태 조회
function getStatus(player) {
    const state = _ensure(player);
    const rank = _getRank(state.fame);
    return {
        totalFights: state.totalFights,
        totalWins: state.totalWins,
        streak: state.streak,
        bestStreak: state.bestStreak,
        fame: state.fame,
        rank,
        nextRank: FAME_RANKS.find(r => r.min > state.fame) || null,
        inFight: state.inFight,
        fightState: state.fightState ? {
            phantom: PHANTOMS[state.fightState.phantomId],
            tier: PHANTOM_TIERS[state.fightState.tierKey],
            phantomHp: state.fightState.phantomHp,
            phantomMaxHp: state.fightState.phantomMaxHp,
            turns: state.fightState.turns,
            maxTurns: state.fightState.maxTurns,
        } : null,
        phantomKills: state.phantomKills,
        learnedSkills: Object.entries(state.learnedSkills).map(([id, data]) => ({
            phantomId: id,
            phantomName: data.phantomName,
            phantomIcon: data.phantomIcon,
            skill: data.skill,
            cooldownRemain: data._lastUsed ? Math.max(0, Math.ceil((data.skill.cd * 1000 - (Date.now() - data._lastUsed)) / 1000)) : 0,
        })),
        phantoms: Object.entries(PHANTOMS).map(([id, p]) => {
            const minLevels = { knight: 15, mage: 15, assassin: 15, cleric: 15, warrior: 15, boss: 30, god: 45 };
            return {
                id, ...p,
                kills: state.phantomKills[id] || 0,
                skillLearned: !!state.learnedSkills[id],
                available: (player.level || 1) >= (minLevels[p.class] || 15),
            };
        }),
        tiers: PHANTOM_TIERS,
        streakBonuses: STREAK_BONUSES,
        fameRanks: FAME_RANKS,
    };
}

module.exports = {
    PHANTOMS, PHANTOM_TIERS, STREAK_BONUSES,
    challenge, fight, useLearnedSkill, forfeit, getStatus,
};

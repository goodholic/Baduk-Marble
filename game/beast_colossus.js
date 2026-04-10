// ==========================================
// 거수 합체 — v2.49
// 몬스터 3체(머리/몸/꼬리) 융합 → 거대 합체수 + 레이드
// ==========================================

// ── 몬스터 파츠 ──
const HEAD_PARTS = {
    dragon_head:   { name: '용의 머리',     icon: '🐉', tier: 4, atk: 300, skill: '화염 브레스', element: 'fire',   atkMult: 1.5 },
    wolf_head:     { name: '늑대 머리',     icon: '🐺', tier: 2, atk: 150, skill: '맹수의 이빨', element: 'none',   atkMult: 1.2 },
    snake_head:    { name: '뱀의 머리',     icon: '🐍', tier: 2, atk: 120, skill: '맹독 송곳니', element: 'poison', atkMult: 1.1 },
    eagle_head:    { name: '독수리 머리',   icon: '🦅', tier: 3, atk: 200, skill: '폭풍 부리',   element: 'wind',   atkMult: 1.3 },
    demon_head:    { name: '악마 머리',     icon: '😈', tier: 4, atk: 350, skill: '지옥 포효',   element: 'dark',   atkMult: 1.6 },
    lion_head:     { name: '사자 머리',     icon: '🦁', tier: 3, atk: 250, skill: '왕의 포효',   element: 'none',   atkMult: 1.4 },
    kraken_head:   { name: '크라켄 머리',   icon: '🐙', tier: 4, atk: 280, skill: '심해 압력',   element: 'water',  atkMult: 1.5 },
    phoenix_head:  { name: '불사조 머리',   icon: '🔥🐦', tier: 5, atk: 400, skill: '불멸의 불꽃', element: 'fire', atkMult: 1.8 },
};

const BODY_PARTS = {
    turtle_body:   { name: '거북 몸통',     icon: '🐢', tier: 2, hp: 5000,  def: 200, trait: '철벽 방어', defMult: 1.5 },
    bear_body:     { name: '곰 몸통',       icon: '🐻', tier: 2, hp: 4000,  def: 120, trait: '야성의 힘', defMult: 1.2 },
    golem_body:    { name: '골렘 몸통',     icon: '🗿', tier: 3, hp: 8000,  def: 300, trait: '바위 껍질', defMult: 1.6 },
    dragon_body:   { name: '용 몸통',       icon: '🐲', tier: 4, hp: 10000, def: 250, trait: '용인 비늘', defMult: 1.8 },
    slime_body:    { name: '슬라임 몸통',   icon: '🟢', tier: 1, hp: 2000,  def: 50,  trait: '유연체',   defMult: 0.8 },
    titan_body:    { name: '타이탄 몸통',   icon: '🗿⚡', tier: 5, hp: 15000, def: 400, trait: '거신의 체구', defMult: 2.0 },
    phantom_body:  { name: '환영 몸통',     icon: '👻', tier: 3, hp: 3000,  def: 100, trait: '유체화',   defMult: 1.0 },
};

const TAIL_PARTS = {
    scorpion_tail: { name: '전갈 꼬리',     icon: '🦂', tier: 2, effect: 'poison',    power: 80,  desc: '독침 공격 (DPS 80)' },
    dragon_tail:   { name: '용 꼬리',       icon: '🐉', tier: 4, effect: 'sweep',     power: 200, desc: '꼬리 휩쓸기 (범위 200)' },
    fox_tail:      { name: '여우 꼬리',     icon: '🦊', tier: 2, effect: 'charm',     power: 100, desc: '매혹 (3초 행동 불가)' },
    whale_tail:    { name: '고래 꼬리',     icon: '🐋', tier: 3, effect: 'tsunami',   power: 180, desc: '쓰나미 (범위 + 넉백)' },
    serpent_tail:  { name: '대뱀 꼬리',     icon: '🐍', tier: 3, effect: 'constrict', power: 150, desc: '조이기 (3초 속박 + DPS)' },
    meteor_tail:   { name: '운석 꼬리',     icon: '☄️', tier: 5, effect: 'meteor',    power: 350, desc: '운석 낙하 (범위 350)' },
    crystal_tail:  { name: '수정 꼬리',     icon: '💎', tier: 3, effect: 'reflect',   power: 120, desc: '데미지 20% 반사' },
};

// ── 합체 시너지 (특정 파츠 조합 보너스) ──
const SYNERGIES = {
    pure_dragon:   { parts: { head: 'dragon_head', body: 'dragon_body', tail: 'dragon_tail' }, name: '순혈 드래곤', icon: '🐉🐉🐉', bonus: { allMult: 1.5, skill: '용제의 심판' }, desc: '전체 스탯 x1.5 + 궁극 스킬' },
    chimera_classic: { parts: { head: 'lion_head', body: 'golem_body', tail: 'serpent_tail' }, name: '고전 키메라', icon: '🦁🗿🐍', bonus: { atkMult: 1.3, defMult: 1.3 }, desc: 'ATK/DEF x1.3' },
    sea_monster:   { parts: { head: 'kraken_head', body: 'dragon_body', tail: 'whale_tail' }, name: '해왕 리바이어선', icon: '🐙🐲🐋', bonus: { waterDmg: 0.5, tsunami: true }, desc: '수속성 +50% + 쓰나미' },
    hell_beast:    { parts: { head: 'demon_head', body: 'titan_body', tail: 'meteor_tail' }, name: '지옥의 종말수', icon: '😈🗿☄️', bonus: { allMult: 2.0, fireDmg: 0.3 }, desc: '전체 x2 + 화속 +30%' },
    phoenix_rebirth: { parts: { head: 'phoenix_head', body: 'phantom_body', tail: 'crystal_tail' }, name: '불멸의 봉황', icon: '🔥👻💎', bonus: { revive: true, reflectAll: 0.15 }, desc: '부활 1회 + 반사 15%' },
};

// ── 거수 레이드 보스 ──
const COLOSSUS_RAIDS = {
    ancient_titan:    { name: '원초의 타이탄',     icon: '🗿👑', hp: 200000, atk: 1000, def: 500, reward: { gold: 100000, exp: 50000 }, minPower: 3000 },
    void_leviathan:   { name: '공허의 리바이어선', icon: '🐋🕳️', hp: 300000, atk: 800,  def: 400, reward: { gold: 150000, exp: 80000 }, minPower: 5000 },
    cosmic_hydra:     { name: '우주의 히드라',     icon: '🐉🌌', hp: 500000, atk: 1200, def: 600, reward: { gold: 250000, exp: 120000 }, minPower: 8000 },
};

function _ensure(player) {
    if (!player._beastColossus) {
        player._beastColossus = {
            capturedParts: { heads: {}, bodies: {}, tails: {} },
            colossus: null,         // { head, body, tail, name, stats, synergy }
            totalFusions: 0,
            raidKills: {},
            raidDamageDealt: 0,
            beastTokens: 0,
        };
    }
    return player._beastColossus;
}

// 파츠 수집 (몬스터 처치 시 호출)
function collectPart(player, monsterTier) {
    const state = _ensure(player);
    const roll = Math.random();
    if (roll > 0.15) return null; // 15% 확률

    const partType = ['heads', 'bodies', 'tails'][Math.floor(Math.random() * 3)];
    const partPool = partType === 'heads' ? HEAD_PARTS : partType === 'bodies' ? BODY_PARTS : TAIL_PARTS;
    const eligible = Object.entries(partPool).filter(([, p]) => p.tier <= Math.min(5, monsterTier + 2));
    if (eligible.length === 0) return null;

    const [partId, part] = eligible[Math.floor(Math.random() * eligible.length)];
    state.capturedParts[partType][partId] = (state.capturedParts[partType][partId] || 0) + 1;

    return { partType, partId, part };
}

// 합체수 생성
function fuseColossus(player, headId, bodyId, tailId, name) {
    const state = _ensure(player);
    const head = HEAD_PARTS[headId];
    const body = BODY_PARTS[bodyId];
    const tail = TAIL_PARTS[tailId];

    if (!head || !body || !tail) return { success: false, msg: '잘못된 파츠' };
    if (!state.capturedParts.heads[headId]) return { success: false, msg: `${head.name} 없음` };
    if (!state.capturedParts.bodies[bodyId]) return { success: false, msg: `${body.name} 없음` };
    if (!state.capturedParts.tails[tailId]) return { success: false, msg: `${tail.name} 없음` };

    // 비용 15,000G
    if ((player.gold || 0) < 15000) return { success: false, msg: '골드 부족 (15,000G)' };
    player.gold -= 15000;

    // 파츠 소비
    state.capturedParts.heads[headId]--;
    if (state.capturedParts.heads[headId] <= 0) delete state.capturedParts.heads[headId];
    state.capturedParts.bodies[bodyId]--;
    if (state.capturedParts.bodies[bodyId] <= 0) delete state.capturedParts.bodies[bodyId];
    state.capturedParts.tails[tailId]--;
    if (state.capturedParts.tails[tailId] <= 0) delete state.capturedParts.tails[tailId];

    // 시너지 체크
    let synergy = null;
    for (const [, syn] of Object.entries(SYNERGIES)) {
        if (syn.parts.head === headId && syn.parts.body === bodyId && syn.parts.tail === tailId) {
            synergy = syn;
            break;
        }
    }

    const atkMult = head.atkMult * (synergy?.bonus?.atkMult || 1) * (synergy?.bonus?.allMult || 1);
    const defMult = body.defMult * (synergy?.bonus?.defMult || 1) * (synergy?.bonus?.allMult || 1);

    const stats = {
        atk: Math.floor(head.atk * atkMult),
        hp: Math.floor(body.hp * defMult),
        def: Math.floor(body.def * defMult),
        tailPower: tail.power,
        headSkill: head.skill,
        tailEffect: tail.effect,
        totalPower: Math.floor(head.atk * atkMult + body.hp * 0.1 + body.def * defMult + tail.power),
    };

    const colossusName = (name && typeof name === 'string') ? name.slice(0, 16) : `${head.name}+${body.name}+${tail.name}`;

    state.colossus = {
        head: headId, body: bodyId, tail: tailId,
        headPart: head, bodyPart: body, tailPart: tail,
        name: colossusName,
        stats,
        synergy,
    };
    state.totalFusions++;

    return {
        success: true,
        colossus: state.colossus,
        msg: `🦁🗿🦂 거수 합체! "${colossusName}" 탄생!\n머리: ${head.icon} ${head.name} (${head.skill})\n몸: ${body.icon} ${body.name} (${body.trait})\n꼬리: ${tail.icon} ${tail.name} (${tail.desc})\n총 전투력: ${stats.totalPower}${synergy ? `\n🔥 시너지: ${synergy.icon} ${synergy.name} — ${synergy.desc}` : ''}`,
    };
}

// 거수 레이드
function raidBoss(player, raidId) {
    const state = _ensure(player);
    if (!state.colossus) return { success: false, msg: '합체수를 먼저 만드세요.' };

    const raid = COLOSSUS_RAIDS[raidId];
    if (!raid) return { success: false, msg: '알 수 없는 레이드' };
    if (state.colossus.stats.totalPower < raid.minPower) {
        return { success: false, msg: `총 전투력 ${raid.minPower} 이상 필요 (현재: ${state.colossus.stats.totalPower})` };
    }

    // 전투 시뮬
    const myAtk = state.colossus.stats.atk;
    const myHp = state.colossus.stats.hp;
    const myDef = state.colossus.stats.def;
    const tailPow = state.colossus.stats.tailPower;

    const totalDmg = Math.floor((myAtk + tailPow) * (8 + Math.random() * 4));
    const bossHits = Math.floor(raid.atk * 5 * (0.6 + Math.random() * 0.4));
    const survived = (myHp + myDef * 10) > bossHits;

    if (totalDmg >= raid.hp * 0.3 && survived) { // 30% 이상 깎으면 승리
        state.raidKills[raidId] = (state.raidKills[raidId] || 0) + 1;
        state.raidDamageDealt += totalDmg;
        state.beastTokens += 20;

        player.gold = Math.min((player.gold || 0) + raid.reward.gold, 999999999);
        player.exp = (player.exp || 0) + raid.reward.exp;

        return {
            success: true, victory: true,
            totalDmg, raid,
            msg: `${raid.icon} ${raid.name} 격파! "${state.colossus.name}" 대활약!\n${totalDmg} 데미지 | +${raid.reward.gold}G +${raid.reward.exp}EXP +20 야수 토큰`,
        };
    }

    return {
        success: true, victory: false,
        totalDmg, raidHp: raid.hp,
        msg: `${raid.icon} ${raid.name}에게 패배... (${totalDmg}/${raid.hp} 데미지)`,
    };
}

// 합체수 해체
function disassemble(player) {
    const state = _ensure(player);
    if (!state.colossus) return { success: false, msg: '합체수가 없습니다.' };

    const c = state.colossus;
    state.capturedParts.heads[c.head] = (state.capturedParts.heads[c.head] || 0) + 1;
    state.capturedParts.bodies[c.body] = (state.capturedParts.bodies[c.body] || 0) + 1;
    state.capturedParts.tails[c.tail] = (state.capturedParts.tails[c.tail] || 0) + 1;
    state.colossus = null;

    return { success: true, msg: '합체수 해체 완료! 파츠가 반환되었습니다.' };
}

function getStatus(player) {
    const state = _ensure(player);
    return {
        colossus: state.colossus,
        totalFusions: state.totalFusions,
        beastTokens: state.beastTokens,
        raidKills: state.raidKills,
        capturedParts: {
            heads: Object.entries(state.capturedParts.heads).map(([id, c]) => ({ id, count: c, ...HEAD_PARTS[id] })),
            bodies: Object.entries(state.capturedParts.bodies).map(([id, c]) => ({ id, count: c, ...BODY_PARTS[id] })),
            tails: Object.entries(state.capturedParts.tails).map(([id, c]) => ({ id, count: c, ...TAIL_PARTS[id] })),
        },
        raids: Object.entries(COLOSSUS_RAIDS).map(([id, r]) => ({ id, ...r, kills: state.raidKills[id] || 0 })),
        synergies: SYNERGIES,
    };
}

module.exports = {
    HEAD_PARTS, BODY_PARTS, TAIL_PARTS, SYNERGIES, COLOSSUS_RAIDS,
    collectPart, fuseColossus, raidBoss, disassemble, getStatus,
};

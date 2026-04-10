// ==========================================
// 영체 이탈 — v2.41
// 영혼 상태로 숨겨진 차원 탐험 + 히든 NPC/아이템 + 영혼 퀘스트
// ==========================================

// ── 영체 상태 제한 ──
const ASTRAL_DURATION = 180; // 초 (3분)
const ASTRAL_COOLDOWN = 600000; // 10분 쿨다운

// ── 숨겨진 차원 ──
const ASTRAL_REALMS = {
    twilight_veil:   { name: '황혼의 장막',   icon: '🌅👻', tier: 1, minLevel: 20, desc: '현실과 영계의 경계. 떠도는 혼령들이 보인다.', dangers: ['잊힌 혼령', '방황하는 그림자'], treasures: 3 },
    spirit_garden:   { name: '영혼의 정원',   icon: '🌸👻', tier: 2, minLevel: 30, desc: '죽은 자들이 쉬는 낙원. 고대의 꽃이 핀다.', dangers: ['정원 수호자', '시든 정령'], treasures: 5 },
    memory_corridor: { name: '기억의 회랑',   icon: '🏛️👻', tier: 3, minLevel: 40, desc: '과거의 기억이 재생되는 차원. 잊혀진 비밀이 있다.', dangers: ['기억의 파편', '왜곡된 자아'], treasures: 7 },
    void_abyss:      { name: '공허의 심연',   icon: '🕳️👻', tier: 4, minLevel: 50, desc: '존재와 비존재의 경계. 이곳의 비밀을 아는 자는 적다.', dangers: ['공허 포식자', '차원의 감시자'], treasures: 10 },
};

// ── 히든 NPC (영체에서만 보임) ──
const ASTRAL_NPCS = {
    ghost_merchant:    { name: '유령 상인 에텔',     icon: '👻🏪', realm: 'twilight_veil', dialogue: '살아있는 자가 여길 오다니... 특별한 물건이 있지.', trades: { ghost_silk: 2000, spirit_potion: 1500, phantom_cloak: 15000 } },
    ancient_scholar:   { name: '고대 학자 메모리온', icon: '📚👻', realm: 'memory_corridor', dialogue: '지식을 찾아왔느냐? 잊혀진 마법을 가르쳐주지.', teaches: ['astral_bolt', 'memory_read', 'soul_sight'] },
    void_oracle:       { name: '공허의 신탁 닉스',   icon: '🔮👻', realm: 'void_abyss', dialogue: '그대의 운명을 보겠다... 대가는 크다.', prophecy: true },
    flower_spirit:     { name: '꽃의 정령 블로사',   icon: '🌸🧚', realm: 'spirit_garden', dialogue: '이 정원에서 영원히 쉴 수 있어... 가져갈 꽃을 골라봐.', gifts: { soul_flower: 0, healing_petal: 0, spirit_nectar: 0 } },
    death_knight:      { name: '죽음의 기사 모르간', icon: '⚔️💀', realm: 'twilight_veil', dialogue: '한때 나도 살아있었다... 나의 기술을 전수하마.', combatTraining: true },
    dream_weaver:      { name: '꿈의 직공 소나타',   icon: '🕸️✨', realm: 'spirit_garden', dialogue: '꿈과 현실을 엮어주지... 원하는 것이 무엇이냐?', crafts: true },
};

// ── 영체 전용 아이템 ──
const ASTRAL_ITEMS = {
    ghost_silk:     { name: '유령 비단',     icon: '🧵👻', type: 'material', effect: {}, desc: '보이지 않는 실로 짠 천. 영체 장비 재료' },
    spirit_potion:  { name: '영혼의 물약',   icon: '🧪👻', type: 'consumable', effect: { restoreAstral: 60 }, desc: '영체 지속시간 +60초' },
    phantom_cloak:  { name: '망령의 망토',   icon: '🧥👻', type: 'equipment', effect: { evasion: 0.1, ghostForm: true }, desc: '회피 +10%, 공격 시 5% 확률 유체화' },
    soul_flower:    { name: '영혼의 꽃',     icon: '🌸✨', type: 'material', effect: {}, desc: '영혼의 정원에서만 피는 꽃. 영구 HP +10' },
    healing_petal:  { name: '치유의 꽃잎',   icon: '🌺', type: 'consumable', effect: { healPct: 0.5 }, desc: 'HP 50% 회복' },
    spirit_nectar:  { name: '정령의 넥타르', icon: '🍯✨', type: 'consumable', effect: { mpRestore: 200, expBoost: 0.1 }, desc: 'MP +200, 10분간 EXP +10%' },
    memory_crystal: { name: '기억의 수정',   icon: '💎🧠', type: 'material', effect: {}, desc: '과거의 기억이 담긴 수정. 고대 마법 학습 재료' },
    void_shard:     { name: '공허의 파편',   icon: '🔮🕳️', type: 'material', effect: {}, desc: '차원의 조각. 공허 장비 제작 재료' },
    astral_compass: { name: '영체 나침반',   icon: '🧭👻', type: 'tool', effect: { findHidden: true }, desc: '숨겨진 보물/NPC 탐지 범위 2배' },
    death_blade:    { name: '사신의 검',     icon: '⚔️💀', type: 'equipment', effect: { atk: 80, soulDmg: 0.2, deathStrike: 0.05 }, desc: 'ATK +80, 영혼 데미지 +20%, 5% 즉사' },
    dream_thread:   { name: '꿈의 실',       icon: '🧶✨', type: 'material', effect: {}, desc: '꿈과 현실을 잇는 실. 특수 제작 재료' },
    void_eye:       { name: '공허의 눈',     icon: '👁️🕳️', type: 'equipment', effect: { seeAll: true, darkVision: true, mpDrain: 1 }, desc: '모든 숨겨진 것을 본다. MP 초당 -1' },
};

// ── 영혼 퀘스트 ──
const ASTRAL_QUESTS = {
    ghost_merchant_favor: { name: '유령 상인의 부탁', icon: '👻📦', npc: 'ghost_merchant', desc: '유령 비단 3개를 구해오라', require: { ghost_silk: 3 }, reward: { gold: 10000, item: 'astral_compass' } },
    memory_recovery:      { name: '잃어버린 기억',   icon: '🧠✨', npc: 'ancient_scholar', desc: '기억의 수정 5개를 수집하라', require: { memory_crystal: 5 }, reward: { gold: 20000, item: 'death_blade', exp: 10000 } },
    void_revelation:      { name: '공허의 계시',     icon: '🔮💀', npc: 'void_oracle', desc: '공허의 파편 10개를 바쳐라', require: { void_shard: 10 }, reward: { gold: 50000, item: 'void_eye', exp: 30000 } },
    dream_tapestry:       { name: '꿈의 태피스트리', icon: '🕸️🌸', npc: 'dream_weaver', desc: '꿈의 실 5개 + 영혼의 꽃 3개', require: { dream_thread: 5, soul_flower: 3 }, reward: { gold: 30000, permanentBuff: { allStat: 5 } } },
};

function _ensure(player) {
    if (!player._astral) {
        player._astral = {
            totalProjections: 0,
            lastProjection: 0,
            inAstral: false,
            currentRealm: null,
            astralTimeRemain: 0,
            astralStartTime: 0,
            itemsFound: {},        // { itemId: count }
            npcsDiscovered: {},    // { npcId: true }
            questsCompleted: {},   // { questId: completedAt }
            activeQuest: null,
            treasuresFound: 0,
            combatTraining: 0,     // 죽음의 기사 훈련 횟수
            permanentBuffs: {},    // 영구 버프
        };
    }
    return player._astral;
}

// 영체 이탈 시작
function startProjection(player, realmId) {
    const state = _ensure(player);
    if (state.inAstral) return { success: false, msg: '이미 영체 상태입니다.' };

    const realm = ASTRAL_REALMS[realmId];
    if (!realm) return { success: false, msg: '알 수 없는 차원' };
    if ((player.level || 1) < realm.minLevel) return { success: false, msg: `Lv.${realm.minLevel} 이상 필요` };

    // 쿨다운 체크
    if (Date.now() - state.lastProjection < ASTRAL_COOLDOWN) {
        const remain = Math.ceil((ASTRAL_COOLDOWN - (Date.now() - state.lastProjection)) / 1000);
        return { success: false, msg: `영체 이탈 대기: ${remain}초` };
    }

    // MP 소모 (50)
    if ((player.mp || 0) < 50) return { success: false, msg: 'MP 부족 (50 필요)' };
    player.mp -= 50;

    state.inAstral = true;
    state.currentRealm = realmId;
    state.astralTimeRemain = ASTRAL_DURATION;
    state.astralStartTime = Date.now();
    state.lastProjection = Date.now();
    state.totalProjections++;

    // 이 영역의 NPC 발견
    const newNpcs = [];
    for (const [npcId, npc] of Object.entries(ASTRAL_NPCS)) {
        if (npc.realm === realmId && !state.npcsDiscovered[npcId]) {
            state.npcsDiscovered[npcId] = true;
            newNpcs.push(npc);
        }
    }

    return {
        success: true,
        realm,
        duration: ASTRAL_DURATION,
        newNpcs,
        msg: `${realm.icon} 영체 이탈! ${realm.name}에 진입 (${ASTRAL_DURATION}초)${newNpcs.length > 0 ? `\n새로운 존재 발견: ${newNpcs.map(n => `${n.icon} ${n.name}`).join(', ')}` : ''}`,
    };
}

// 영체 탐험 (보물/아이템 탐색)
function exploreAstral(player) {
    const state = _ensure(player);
    if (!state.inAstral) return { success: false, msg: '영체 상태가 아닙니다.' };

    // 시간 체크
    const elapsed = Math.floor((Date.now() - state.astralStartTime) / 1000);
    const remaining = ASTRAL_DURATION - elapsed;
    if (remaining <= 0) {
        state.inAstral = false;
        state.currentRealm = null;
        return { success: false, msg: '영체 시간이 만료되었습니다. 육체로 돌아갑니다...' };
    }

    const realm = ASTRAL_REALMS[state.currentRealm];
    if (!realm) return { success: false, msg: '차원 정보 오류' };

    // 탐험 결과 (랜덤)
    const roll = Math.random();

    if (roll < 0.30) {
        // 보물 발견 (30%)
        const itemPool = {
            twilight_veil: ['ghost_silk', 'spirit_potion'],
            spirit_garden: ['soul_flower', 'healing_petal', 'spirit_nectar'],
            memory_corridor: ['memory_crystal', 'dream_thread'],
            void_abyss: ['void_shard', 'spirit_potion'],
        };
        const pool = itemPool[state.currentRealm] || ['spirit_potion'];
        const foundId = pool[Math.floor(Math.random() * pool.length)];
        const item = ASTRAL_ITEMS[foundId];
        state.itemsFound[foundId] = (state.itemsFound[foundId] || 0) + 1;
        state.treasuresFound++;

        // 영구 버프 아이템 적용
        if (foundId === 'soul_flower') {
            state.permanentBuffs.hp = (state.permanentBuffs.hp || 0) + 10;
        }

        return {
            success: true, type: 'treasure',
            item, remaining,
            msg: `${item.icon} ${item.name} 발견! — ${item.desc} (남은 시간: ${remaining}초)`,
        };
    }

    if (roll < 0.55) {
        // 위험 조우 (25%)
        const dangerName = realm.dangers[Math.floor(Math.random() * realm.dangers.length)];
        const playerPower = (player.atk || 10) + (player.level || 1);
        const dangerPower = realm.tier * 50;
        const survived = playerPower > dangerPower * (0.5 + Math.random() * 0.5);

        if (survived) {
            const expReward = realm.tier * 500;
            player.exp = (player.exp || 0) + expReward;
            return {
                success: true, type: 'danger_survived',
                dangerName, expReward, remaining,
                msg: `⚠️ ${dangerName} 조우! 영혼의 힘으로 극복! +${expReward} EXP (남은 시간: ${remaining}초)`,
            };
        }

        // 실패 — 강제 귀환
        state.inAstral = false;
        state.currentRealm = null;
        return {
            success: true, type: 'danger_failed',
            dangerName,
            msg: `💀 ${dangerName}에게 영혼이 흔들렸습니다! 강제 귀환...`,
        };
    }

    if (roll < 0.70) {
        // 숨겨진 기억/비전 (15%)
        const visions = [
            '고대 전쟁의 장면이 스쳐지나간다... 전투 경험이 깊어졌다.',
            '죽은 영웅의 기억을 흡수했다. 새로운 기술의 실마리를 얻었다.',
            '차원의 틈에서 빛나는 에너지를 발견했다!',
            '과거의 자신을 만났다... 이상한 기분이 든다.',
            '잊혀진 신의 목소리가 들린다. 축복이 깃들었다.',
        ];
        const vision = visions[Math.floor(Math.random() * visions.length)];
        const expReward = realm.tier * 300;
        player.exp = (player.exp || 0) + expReward;

        return {
            success: true, type: 'vision',
            vision, expReward, remaining,
            msg: `👁️ ${vision} +${expReward} EXP (남은 시간: ${remaining}초)`,
        };
    }

    // 고요 (30%)
    return {
        success: true, type: 'nothing',
        remaining,
        msg: `... 고요한 영계. 주변을 더 탐색해보세요. (남은 시간: ${remaining}초)`,
    };
}

// NPC 상호작용
function interactNpc(player, npcId) {
    const state = _ensure(player);
    if (!state.inAstral) return { success: false, msg: '영체 상태가 아닙니다.' };

    const npc = ASTRAL_NPCS[npcId];
    if (!npc) return { success: false, msg: '알 수 없는 NPC' };
    if (!state.npcsDiscovered[npcId]) return { success: false, msg: 'NPC를 아직 발견하지 못했습니다.' };
    if (npc.realm !== state.currentRealm) return { success: false, msg: '이 차원에 없는 NPC입니다.' };

    // 전투 훈련 (죽음의 기사)
    if (npc.combatTraining) {
        state.combatTraining++;
        const atkBonus = Math.min(state.combatTraining, 20); // 최대 20회
        state.permanentBuffs.atk = atkBonus;
        return {
            success: true, type: 'training',
            npc,
            msg: `${npc.icon} ${npc.name}: "${npc.dialogue}"\n영혼 전투 훈련 완료! 영구 ATK +${atkBonus} (훈련 ${state.combatTraining}회)`,
        };
    }

    // 신탁 (공허의 신탁)
    if (npc.prophecy) {
        const prophecies = [
            '큰 보물이 다가오고 있다... 다음 보스전에서 행운이 함께할 것이다.',
            '조심하라... 가까운 미래에 배신이 있을 것이다.',
            '달이 가장 밝을 때, 잊혀진 문이 열릴 것이다.',
            '그대의 무기에 잠든 영혼이 각성을 원한다.',
            '공허에서 최강의 힘을 얻으려면, 먼저 모든 것을 놓아야 한다.',
        ];
        const prophecy = prophecies[Math.floor(Math.random() * prophecies.length)];
        return {
            success: true, type: 'prophecy',
            npc, prophecy,
            msg: `${npc.icon} ${npc.name}: "${prophecy}"`,
        };
    }

    // 기본 대화 + 상점
    return {
        success: true, type: 'dialogue',
        npc,
        trades: npc.trades || null,
        gifts: npc.gifts ? Object.keys(npc.gifts) : null,
        msg: `${npc.icon} ${npc.name}: "${npc.dialogue}"`,
    };
}

// NPC 상점 구매
function buyFromNpc(player, npcId, itemId) {
    const state = _ensure(player);
    if (!state.inAstral) return { success: false, msg: '영체 상태가 아닙니다.' };

    const npc = ASTRAL_NPCS[npcId];
    if (!npc || !npc.trades) return { success: false, msg: '거래 불가 NPC' };
    if (!npc.trades[itemId]) return { success: false, msg: '판매하지 않는 아이템' };

    const price = npc.trades[itemId];
    if ((player.gold || 0) < price) return { success: false, msg: `골드 부족 (${price}G)` };

    player.gold -= price;
    state.itemsFound[itemId] = (state.itemsFound[itemId] || 0) + 1;
    const item = ASTRAL_ITEMS[itemId];

    return {
        success: true,
        item, price,
        msg: `${item.icon} ${item.name} 구매! (-${price}G)`,
    };
}

// 꽃의 정령 선물 받기
function receiveGift(player) {
    const state = _ensure(player);
    if (!state.inAstral || state.currentRealm !== 'spirit_garden') {
        return { success: false, msg: '영혼의 정원에서만 가능합니다.' };
    }

    // 하루 1회
    const today = new Date().toDateString();
    if (state._lastGiftDay === today) return { success: false, msg: '오늘은 이미 선물을 받았습니다.' };
    state._lastGiftDay = today;

    const giftPool = ['soul_flower', 'healing_petal', 'spirit_nectar'];
    const giftId = giftPool[Math.floor(Math.random() * giftPool.length)];
    const item = ASTRAL_ITEMS[giftId];
    state.itemsFound[giftId] = (state.itemsFound[giftId] || 0) + 1;

    if (giftId === 'soul_flower') {
        state.permanentBuffs.hp = (state.permanentBuffs.hp || 0) + 10;
    }

    return {
        success: true, item,
        msg: `🌸🧚 블로사: "이걸 가져가~ 예쁘지?" — ${item.icon} ${item.name} 획득!`,
    };
}

// 영체 귀환 (수동)
function endProjection(player) {
    const state = _ensure(player);
    if (!state.inAstral) return { success: false, msg: '영체 상태가 아닙니다.' };

    state.inAstral = false;
    state.currentRealm = null;

    return {
        success: true,
        msg: '💫 육체로 돌아왔습니다... 영계의 기억이 희미하게 남아있습니다.',
    };
}

// 퀘스트 시작
function startQuest(player, questId) {
    const state = _ensure(player);
    const quest = ASTRAL_QUESTS[questId];
    if (!quest) return { success: false, msg: '알 수 없는 퀘스트' };
    if (state.questsCompleted[questId]) return { success: false, msg: '이미 완료한 퀘스트' };
    if (state.activeQuest) return { success: false, msg: '이미 진행 중인 퀘스트가 있습니다.' };

    state.activeQuest = questId;
    return {
        success: true, quest,
        msg: `${quest.icon} 퀘스트 수락: ${quest.name} — ${quest.desc}`,
    };
}

// 퀘스트 완료
function completeQuest(player) {
    const state = _ensure(player);
    if (!state.activeQuest) return { success: false, msg: '진행 중인 퀘스트가 없습니다.' };

    const quest = ASTRAL_QUESTS[state.activeQuest];
    if (!quest) return { success: false, msg: '퀘스트 정보 오류' };

    // 요구 아이템 체크
    for (const [itemId, count] of Object.entries(quest.require)) {
        if ((state.itemsFound[itemId] || 0) < count) {
            return { success: false, msg: `재료 부족: ${ASTRAL_ITEMS[itemId]?.name || itemId} (${state.itemsFound[itemId] || 0}/${count})` };
        }
    }

    // 재료 소모
    for (const [itemId, count] of Object.entries(quest.require)) {
        state.itemsFound[itemId] -= count;
        if (state.itemsFound[itemId] <= 0) delete state.itemsFound[itemId];
    }

    // 보상
    if (quest.reward.gold) player.gold = Math.min((player.gold || 0) + quest.reward.gold, 999999999);
    if (quest.reward.exp) player.exp = (player.exp || 0) + quest.reward.exp;
    if (quest.reward.item) state.itemsFound[quest.reward.item] = (state.itemsFound[quest.reward.item] || 0) + 1;
    if (quest.reward.permanentBuff) {
        for (const [stat, val] of Object.entries(quest.reward.permanentBuff)) {
            state.permanentBuffs[stat] = (state.permanentBuffs[stat] || 0) + val;
        }
    }

    state.questsCompleted[state.activeQuest] = Date.now();
    state.activeQuest = null;

    return {
        success: true, quest,
        msg: `${quest.icon} ${quest.name} 완료! 보상: ${quest.reward.gold ? quest.reward.gold + 'G ' : ''}${quest.reward.exp ? quest.reward.exp + 'EXP ' : ''}${quest.reward.item ? ASTRAL_ITEMS[quest.reward.item]?.name : ''}`,
    };
}

// 상태 조회
function getStatus(player) {
    const state = _ensure(player);
    const elapsed = state.inAstral ? Math.floor((Date.now() - state.astralStartTime) / 1000) : 0;
    const remaining = state.inAstral ? Math.max(0, ASTRAL_DURATION - elapsed) : 0;

    // 자동 만료
    if (state.inAstral && remaining <= 0) {
        state.inAstral = false;
        state.currentRealm = null;
    }

    return {
        inAstral: state.inAstral,
        currentRealm: state.currentRealm ? { id: state.currentRealm, ...ASTRAL_REALMS[state.currentRealm] } : null,
        timeRemaining: remaining,
        totalProjections: state.totalProjections,
        cooldownRemain: Math.max(0, Math.ceil((ASTRAL_COOLDOWN - (Date.now() - state.lastProjection)) / 1000)),
        itemsFound: state.itemsFound,
        npcsDiscovered: Object.keys(state.npcsDiscovered).map(id => ({ id, ...ASTRAL_NPCS[id] })),
        questsCompleted: state.questsCompleted,
        activeQuest: state.activeQuest ? { id: state.activeQuest, ...ASTRAL_QUESTS[state.activeQuest] } : null,
        treasuresFound: state.treasuresFound,
        permanentBuffs: state.permanentBuffs,
        combatTraining: state.combatTraining,
        realms: Object.entries(ASTRAL_REALMS).map(([id, r]) => ({
            id, ...r,
            available: (player.level || 1) >= r.minLevel,
        })),
        quests: Object.entries(ASTRAL_QUESTS).map(([id, q]) => ({
            id, ...q,
            completed: !!state.questsCompleted[id],
            active: state.activeQuest === id,
            progress: Object.entries(q.require).map(([itemId, need]) => ({
                item: ASTRAL_ITEMS[itemId]?.name || itemId,
                have: state.itemsFound[itemId] || 0,
                need,
            })),
        })),
    };
}

module.exports = {
    ASTRAL_REALMS, ASTRAL_NPCS, ASTRAL_ITEMS, ASTRAL_QUESTS,
    startProjection, exploreAstral, interactNpc, buyFromNpc,
    receiveGift, endProjection, startQuest, completeQuest, getStatus,
};

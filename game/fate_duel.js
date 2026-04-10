// ==========================================
// 운명의 결투 — v2.43
// 카드 기반 운명 대결 + 덱 빌딩 + 운명 카드 수집 + 운명 흡수
// ==========================================

// ── 운명 카드 (6원소 x 4등급 + 특수 카드) ──
const FATE_CARDS = {
    // ─── 화염 ───
    fire_spark:     { name: '불꽃',       icon: '🔥',   element: 'fire',   tier: 1, atk: 3,  def: 1,  ability: null },
    fire_blaze:     { name: '맹화',       icon: '🔥🔥', element: 'fire',   tier: 2, atk: 6,  def: 2,  ability: 'burn', abilityDesc: '상대 다음 턴 -1 DEF' },
    fire_inferno:   { name: '업화',       icon: '🌋',   element: 'fire',   tier: 3, atk: 10, def: 3,  ability: 'incinerate', abilityDesc: '상대 낮은 카드 1장 파괴' },
    fire_apocalypse:{ name: '종말의 불꽃', icon: '☄️',   element: 'fire',   tier: 4, atk: 15, def: 5,  ability: 'apocalypse', abilityDesc: '상대 전체 DEF 무시' },

    // ─── 빙결 ───
    ice_frost:      { name: '서리',       icon: '❄️',   element: 'ice',    tier: 1, atk: 2,  def: 3,  ability: null },
    ice_glacier:    { name: '빙하',       icon: '🧊',   element: 'ice',    tier: 2, atk: 4,  def: 5,  ability: 'freeze', abilityDesc: '상대 다음 카드 ATK -2' },
    ice_blizzard:   { name: '눈보라',     icon: '🌨️',   element: 'ice',    tier: 3, atk: 7,  def: 8,  ability: 'frostbite', abilityDesc: '상대 손패 1장 동결 (사용 불가)' },
    ice_absolute:   { name: '절대 영도',   icon: '💠',   element: 'ice',    tier: 4, atk: 10, def: 14, ability: 'absolute_zero', abilityDesc: '이번 턴 모든 데미지 무효' },

    // ─── 번개 ───
    thunder_spark:  { name: '정전기',     icon: '⚡',   element: 'thunder', tier: 1, atk: 4,  def: 0,  ability: null },
    thunder_bolt:   { name: '낙뢰',       icon: '🌩️',   element: 'thunder', tier: 2, atk: 7,  def: 1,  ability: 'chain', abilityDesc: '추가 2 데미지 (연쇄)' },
    thunder_storm:  { name: '뇌우',       icon: '⛈️',   element: 'thunder', tier: 3, atk: 11, def: 2,  ability: 'paralyze', abilityDesc: '상대 다음 턴 카드 효과 무력화' },
    thunder_god:    { name: '뇌신의 심판', icon: '⚡👑', element: 'thunder', tier: 4, atk: 18, def: 0,  ability: 'divine_thunder', abilityDesc: '2턴 연속 공격 (이번 카드 2회 적용)' },

    // ─── 대지 ───
    earth_pebble:   { name: '자갈',       icon: '🪨',   element: 'earth',  tier: 1, atk: 1,  def: 4,  ability: null },
    earth_boulder:  { name: '바위',       icon: '⛰️',   element: 'earth',  tier: 2, atk: 3,  def: 6,  ability: 'fortify', abilityDesc: '다음 턴 자신 DEF +3' },
    earth_quake:    { name: '지진',       icon: '🌍💥', element: 'earth',  tier: 3, atk: 8,  def: 7,  ability: 'shatter', abilityDesc: '상대 방어 카드 효과 -50%' },
    earth_titan:    { name: '대지의 거신', icon: '🗿',   element: 'earth',  tier: 4, atk: 12, def: 12, ability: 'unbreakable', abilityDesc: '이번 턴 받는 데미지 최대 5' },

    // ─── 암흑 ───
    dark_shadow:    { name: '그림자',     icon: '🌑',   element: 'dark',   tier: 1, atk: 3,  def: 2,  ability: null },
    dark_curse:     { name: '저주',       icon: '💀',   element: 'dark',   tier: 2, atk: 5,  def: 3,  ability: 'curse', abilityDesc: '상대 다음 카드 ATK/DEF -1' },
    dark_abyss:     { name: '심연',       icon: '🕳️',   element: 'dark',   tier: 3, atk: 9,  def: 5,  ability: 'devour', abilityDesc: '가한 데미지의 50% HP 회복' },
    dark_oblivion:  { name: '망각',       icon: '💀🕳️', element: 'dark',   tier: 4, atk: 14, def: 7,  ability: 'oblivion', abilityDesc: '상대 손패 확인 + 1장 선택 제거' },

    // ─── 성광 ───
    light_glow:     { name: '빛줄기',     icon: '✨',   element: 'light',  tier: 1, atk: 2,  def: 2,  ability: null },
    light_radiance: { name: '광휘',       icon: '🌟',   element: 'light',  tier: 2, atk: 4,  def: 4,  ability: 'heal', abilityDesc: 'HP +3 회복' },
    light_judgment: { name: '심판',       icon: '⚖️',   element: 'light',  tier: 3, atk: 8,  def: 6,  ability: 'purify', abilityDesc: '자신의 디버프 전부 해제' },
    light_miracle:  { name: '기적',       icon: '🌈',   element: 'light',  tier: 4, atk: 11, def: 10, ability: 'miracle', abilityDesc: 'HP 1 이하 시 HP 15로 회복 (1회)' },

    // ─── 특수 카드 ───
    fate_reverse:   { name: '운명 반전',   icon: '🔄✨', element: 'fate',   tier: 5, atk: 0,  def: 0,  ability: 'reverse', abilityDesc: '이번 턴 ATK↔DEF 교환 (양측)' },
    fate_mirror:    { name: '운명의 거울', icon: '🪞✨', element: 'fate',   tier: 5, atk: 0,  def: 0,  ability: 'mirror', abilityDesc: '상대 카드를 그대로 복제' },
    fate_gamble:    { name: '운명의 도박', icon: '🎲✨', element: 'fate',   tier: 5, atk: 0,  def: 0,  ability: 'gamble', abilityDesc: '50%: ATK 20 / 50%: 자해 10' },
    fate_steal:     { name: '운명 강탈',   icon: '🖐️✨', element: 'fate',   tier: 5, atk: 5,  def: 5,  ability: 'steal', abilityDesc: '승리 시 상대 카드 1장 영구 획득' },
};

// ── 원소 상성 ──
const ELEMENT_ADVANTAGE = {
    fire: 'ice', ice: 'thunder', thunder: 'earth',
    earth: 'dark', dark: 'light', light: 'fire',
};

// ── 운명 흡수 보너스 ──
const FATE_ABSORB_BONUSES = {
    3:  { name: '운명의 씨앗',   bonus: { atk: 3 } },
    7:  { name: '운명의 새싹',   bonus: { def: 5 } },
    15: { name: '운명의 가지',   bonus: { critRate: 0.03 } },
    25: { name: '운명의 꽃',     bonus: { allStat: 3 } },
    50: { name: '운명의 나무',   bonus: { allStat: 5, expMult: 0.05 } },
    100:{ name: '운명의 지배자', bonus: { allStat: 10, fateMaster: true } },
};

// ── 카드 팩 ──
const CARD_PACKS = {
    basic:    { name: '기본 팩',   icon: '📦',   cost: 3000,  cards: 3, tierChance: { 1: 0.60, 2: 0.30, 3: 0.08, 4: 0.02, 5: 0 } },
    premium:  { name: '프리미엄 팩', icon: '📦✨', cost: 10000, cards: 5, tierChance: { 1: 0.30, 2: 0.35, 3: 0.20, 4: 0.10, 5: 0.05 } },
    fate:     { name: '운명의 팩', icon: '📦🌟', cost: 30000, cards: 5, tierChance: { 1: 0.10, 2: 0.20, 3: 0.30, 4: 0.25, 5: 0.15 } },
};

const DUEL_HP = 30;
const HAND_SIZE = 5;
const DECK_MIN = 10;
const DECK_MAX = 20;

function _ensure(player) {
    if (!player._fateDuel) {
        player._fateDuel = {
            collection: {},     // { cardId: count }
            deck: [],           // [cardId, ...]  (10~20장)
            wins: 0,
            losses: 0,
            winStreak: 0,
            bestStreak: 0,
            fateAbsorbed: 0,    // 운명 흡수 총량
            rating: 1000,       // ELO 레이팅
            inDuel: false,
            duelState: null,
            packsOpened: 0,
            cardsWon: {},       // 결투로 획득한 카드
        };
    }
    return player._fateDuel;
}

// 초기 덱 생성 (기본 카드 제공)
function _giveStarterDeck(state) {
    const starters = ['fire_spark', 'ice_frost', 'thunder_spark', 'earth_pebble', 'dark_shadow',
                       'light_glow', 'fire_spark', 'ice_frost', 'thunder_spark', 'earth_pebble'];
    for (const cardId of starters) {
        state.collection[cardId] = (state.collection[cardId] || 0) + 1;
    }
    state.deck = [...starters];
}

// 카드 팩 오픈
function openPack(player, packId) {
    const state = _ensure(player);
    const pack = CARD_PACKS[packId];
    if (!pack) return { success: false, msg: '알 수 없는 팩' };
    if ((player.gold || 0) < pack.cost) return { success: false, msg: `골드 부족 (${pack.cost}G)` };

    player.gold -= pack.cost;
    state.packsOpened++;

    const allCards = Object.entries(FATE_CARDS);
    const drawnCards = [];

    for (let i = 0; i < pack.cards; i++) {
        // 티어 결정
        const roll = Math.random();
        let cumul = 0;
        let targetTier = 1;
        for (const [tier, chance] of Object.entries(pack.tierChance)) {
            cumul += chance;
            if (roll < cumul) { targetTier = parseInt(tier); break; }
        }

        const eligible = allCards.filter(([, c]) => c.tier === targetTier);
        if (eligible.length === 0) continue;
        const [cardId, card] = eligible[Math.floor(Math.random() * eligible.length)];
        state.collection[cardId] = (state.collection[cardId] || 0) + 1;
        drawnCards.push({ id: cardId, ...card });
    }

    // 첫 팩이면 기본 덱 설정
    if (state.deck.length === 0) _giveStarterDeck(state);

    return {
        success: true, cards: drawnCards,
        msg: `${pack.icon} ${pack.name} 오픈! ${drawnCards.map(c => `${c.icon} ${c.name}`).join(', ')}`,
    };
}

// 덱 편집
function editDeck(player, newDeck) {
    const state = _ensure(player);
    if (!Array.isArray(newDeck)) return { success: false, msg: '잘못된 덱 형식' };
    if (newDeck.length < DECK_MIN || newDeck.length > DECK_MAX) {
        return { success: false, msg: `덱은 ${DECK_MIN}~${DECK_MAX}장이어야 합니다.` };
    }

    // 보유 카드 체크
    const usage = {};
    for (const cardId of newDeck) {
        if (!FATE_CARDS[cardId]) return { success: false, msg: `알 수 없는 카드: ${cardId}` };
        usage[cardId] = (usage[cardId] || 0) + 1;
        if (usage[cardId] > (state.collection[cardId] || 0)) {
            return { success: false, msg: `${FATE_CARDS[cardId].name} 보유 수량 부족` };
        }
    }

    state.deck = [...newDeck];
    return { success: true, msg: `덱 저장 완료! (${newDeck.length}장)` };
}

// PvE 결투 시작 (AI 상대)
function startDuel(player) {
    const state = _ensure(player);
    if (state.inDuel) return { success: false, msg: '이미 결투 중입니다.' };
    if (state.deck.length < DECK_MIN) {
        if (Object.keys(state.collection).length === 0) _giveStarterDeck(state);
        else return { success: false, msg: `덱에 최소 ${DECK_MIN}장이 필요합니다.` };
    }

    // AI 덱 생성 (플레이어 레벨 기반)
    const aiLevel = Math.min(5, 1 + Math.floor((player.level || 1) / 10));
    const aiDeck = _generateAiDeck(aiLevel);

    // 손패 드로우
    const shuffledPlayer = [...state.deck].sort(() => Math.random() - 0.5);
    const shuffledAi = [...aiDeck].sort(() => Math.random() - 0.5);

    state.inDuel = true;
    state.duelState = {
        playerHp: DUEL_HP,
        aiHp: DUEL_HP,
        playerHand: shuffledPlayer.splice(0, HAND_SIZE),
        aiHand: shuffledAi.splice(0, HAND_SIZE),
        playerDeck: shuffledPlayer,
        aiDeck: shuffledAi,
        turn: 1,
        maxTurns: 10,
        playerDebuffs: {},
        aiDebuffs: {},
        miracleUsed: false,
        log: [],
    };

    return {
        success: true,
        hand: state.duelState.playerHand.map(id => ({ id, ...FATE_CARDS[id] })),
        hp: DUEL_HP,
        aiHp: DUEL_HP,
        msg: `⚔️✨ 운명의 결투 시작! HP: ${DUEL_HP} vs ${DUEL_HP} | 손패 ${HAND_SIZE}장`,
    };
}

function _generateAiDeck(level) {
    const allCards = Object.entries(FATE_CARDS).filter(([, c]) => c.tier <= level + 1);
    const deck = [];
    for (let i = 0; i < 12; i++) {
        const [id] = allCards[Math.floor(Math.random() * allCards.length)];
        deck.push(id);
    }
    return deck;
}

// 카드 내기 (턴 진행)
function playCard(player, cardId) {
    const state = _ensure(player);
    if (!state.inDuel || !state.duelState) return { success: false, msg: '결투 중이 아닙니다.' };

    const ds = state.duelState;
    const handIdx = ds.playerHand.indexOf(cardId);
    if (handIdx === -1) return { success: false, msg: '손패에 없는 카드입니다.' };

    // 동결 체크
    if (ds.playerDebuffs.frozen === cardId) {
        delete ds.playerDebuffs.frozen;
        return { success: false, msg: `${FATE_CARDS[cardId].icon} ${FATE_CARDS[cardId].name}이(가) 동결되어 사용할 수 없습니다!` };
    }

    const pCard = FATE_CARDS[cardId];
    ds.playerHand.splice(handIdx, 1);

    // AI 카드 선택
    const aiCardId = ds.aiHand.length > 0 ? ds.aiHand.splice(Math.floor(Math.random() * ds.aiHand.length), 1)[0] : null;
    const aCard = aiCardId ? FATE_CARDS[aiCardId] : { name: '없음', icon: '❌', atk: 0, def: 0, element: 'none', tier: 0, ability: null };

    // 디버프 적용
    let pAtk = pCard.atk;
    let pDef = pCard.def;
    let aAtk = aCard.atk;
    let aDef = aCard.def;

    if (ds.playerDebuffs.atkReduce) { pAtk = Math.max(0, pAtk - ds.playerDebuffs.atkReduce); delete ds.playerDebuffs.atkReduce; }
    if (ds.playerDebuffs.defReduce) { pDef = Math.max(0, pDef - ds.playerDebuffs.defReduce); delete ds.playerDebuffs.defReduce; }
    if (ds.playerDebuffs.cursed) { pAtk = Math.max(0, pAtk - 1); pDef = Math.max(0, pDef - 1); delete ds.playerDebuffs.cursed; }
    if (ds.aiDebuffs.atkReduce) { aAtk = Math.max(0, aAtk - ds.aiDebuffs.atkReduce); delete ds.aiDebuffs.atkReduce; }
    if (ds.aiDebuffs.defReduce) { aDef = Math.max(0, aDef - ds.aiDebuffs.defReduce); delete ds.aiDebuffs.defReduce; }
    if (ds.aiDebuffs.cursed) { aAtk = Math.max(0, aAtk - 1); aDef = Math.max(0, aDef - 1); delete ds.aiDebuffs.cursed; }

    // 특수 카드 처리
    if (pCard.ability === 'reverse') { [pAtk, pDef] = [pDef, pAtk]; [aAtk, aDef] = [aDef, aAtk]; }
    if (pCard.ability === 'mirror') { pAtk = aAtk; pDef = aDef; }
    if (pCard.ability === 'gamble') { pAtk = Math.random() < 0.5 ? 20 : 0; pDef = 0; if (pAtk === 0) ds.playerHp = Math.max(0, ds.playerHp - 10); }

    // 원소 상성 보너스
    let elementMsg = '';
    if (pCard.element !== 'fate' && aCard.element !== 'fate') {
        if (ELEMENT_ADVANTAGE[pCard.element] === aCard.element) {
            pAtk = Math.floor(pAtk * 1.5);
            elementMsg = ` (${pCard.element}→${aCard.element} 상성!)`;
        } else if (ELEMENT_ADVANTAGE[aCard.element] === pCard.element) {
            aAtk = Math.floor(aAtk * 1.5);
            elementMsg = ` (${aCard.element}→${pCard.element} 역상성!)`;
        }
    }

    // 데미지 계산
    const dmgToAi = Math.max(0, pAtk - aDef);
    const dmgToPlayer = Math.max(0, aAtk - pDef);

    // 특수 능력 (방어 무시 등)
    let finalDmgAi = dmgToAi;
    let finalDmgPlayer = dmgToPlayer;
    if (pCard.ability === 'apocalypse') finalDmgAi = pAtk;
    if (pCard.ability === 'divine_thunder') finalDmgAi *= 2;
    if (aCard.ability === 'apocalypse') finalDmgPlayer = aAtk;
    if (pCard.ability === 'absolute_zero') finalDmgPlayer = 0;
    if (pCard.ability === 'unbreakable') finalDmgPlayer = Math.min(5, finalDmgPlayer);

    ds.aiHp = Math.max(0, ds.aiHp - finalDmgAi);
    ds.playerHp = Math.max(0, ds.playerHp - finalDmgPlayer);

    // 후속 능력
    let abilityMsg = '';
    if (pCard.ability === 'burn') { ds.aiDebuffs.defReduce = 1; abilityMsg = ' | 🔥 상대 DEF -1'; }
    if (pCard.ability === 'freeze') { ds.aiDebuffs.atkReduce = 2; abilityMsg = ' | ❄️ 상대 ATK -2'; }
    if (pCard.ability === 'curse') { ds.aiDebuffs.cursed = true; abilityMsg = ' | 💀 상대 저주'; }
    if (pCard.ability === 'heal') { ds.playerHp = Math.min(DUEL_HP, ds.playerHp + 3); abilityMsg = ' | 💚 HP +3'; }
    if (pCard.ability === 'devour') { const heal = Math.floor(finalDmgAi * 0.5); ds.playerHp = Math.min(DUEL_HP, ds.playerHp + heal); abilityMsg = ` | 🩸 HP +${heal}`; }
    if (pCard.ability === 'chain') { ds.aiHp = Math.max(0, ds.aiHp - 2); abilityMsg = ' | ⚡ 연쇄 +2'; }
    if (pCard.ability === 'fortify') { ds.playerDebuffs.defBonus = 3; abilityMsg = ' | ⛰️ 다음 턴 DEF +3'; }
    if (pCard.ability === 'frostbite' && ds.aiHand.length > 0) { ds.aiDebuffs.frozen = ds.aiHand[0]; abilityMsg = ' | 🧊 상대 카드 동결'; }
    if (pCard.ability === 'miracle' && ds.playerHp <= 1 && !ds.miracleUsed) { ds.playerHp = 15; ds.miracleUsed = true; abilityMsg = ' | 🌈 기적 발동! HP → 15'; }
    if (pCard.ability === 'purify') { ds.playerDebuffs = {}; abilityMsg = ' | ⚖️ 디버프 해제'; }

    // 드로우
    if (ds.playerDeck.length > 0) ds.playerHand.push(ds.playerDeck.shift());
    if (ds.aiDeck.length > 0) ds.aiHand.push(ds.aiDeck.shift());
    ds.turn++;

    const turnLog = `T${ds.turn - 1}: ${pCard.icon}${pCard.name}(${finalDmgAi}) vs ${aCard.icon}${aCard.name}(${finalDmgPlayer})${elementMsg}${abilityMsg}`;
    ds.log.push(turnLog);

    // 승패 판정
    if (ds.aiHp <= 0 || ds.playerHp <= 0 || ds.turn > ds.maxTurns) {
        return _endDuel(player, state, ds, pCard, cardId);
    }

    return {
        success: true, type: 'turn',
        playerCard: { id: cardId, ...pCard },
        aiCard: aiCardId ? { id: aiCardId, ...aCard } : null,
        dmgToAi: finalDmgAi, dmgToPlayer: finalDmgPlayer,
        playerHp: ds.playerHp, aiHp: ds.aiHp,
        turn: ds.turn,
        hand: ds.playerHand.map(id => ({ id, ...FATE_CARDS[id] })),
        msg: turnLog,
    };
}

function _endDuel(player, state, ds, lastCard, lastCardId) {
    const won = ds.aiHp <= 0 || (ds.playerHp > 0 && ds.playerHp >= ds.aiHp);
    state.inDuel = false;

    if (won) {
        state.wins++;
        state.winStreak++;
        if (state.winStreak > state.bestStreak) state.bestStreak = state.winStreak;
        state.fateAbsorbed++;
        state.rating = Math.min(3000, state.rating + 25 + state.winStreak * 5);

        // 보상
        const goldReward = 5000 + state.winStreak * 1000;
        const expReward = 2000 + state.winStreak * 500;
        player.gold = Math.min((player.gold || 0) + goldReward, 999999999);
        player.exp = (player.exp || 0) + expReward;

        // 카드 드롭
        let cardDrop = null;
        if (Math.random() < 0.3) {
            const allCards = Object.entries(FATE_CARDS).filter(([, c]) => c.tier <= 3);
            const [dropId, dropCard] = allCards[Math.floor(Math.random() * allCards.length)];
            state.collection[dropId] = (state.collection[dropId] || 0) + 1;
            state.cardsWon[dropId] = (state.cardsWon[dropId] || 0) + 1;
            cardDrop = { id: dropId, ...dropCard };
        }

        // 운명 강탈 (steal)
        if (lastCard && lastCard.ability === 'steal') {
            const stealTier = Math.min(4, 1 + Math.floor(Math.random() * 3));
            const stealable = Object.entries(FATE_CARDS).filter(([, c]) => c.tier === stealTier);
            if (stealable.length > 0) {
                const [stealId, stealCard] = stealable[Math.floor(Math.random() * stealable.length)];
                state.collection[stealId] = (state.collection[stealId] || 0) + 1;
                cardDrop = { id: stealId, ...stealCard, stolen: true };
            }
        }

        // 흡수 보너스 체크
        const absorbBonus = FATE_ABSORB_BONUSES[state.fateAbsorbed] || null;

        state.duelState = null;
        return {
            success: true, type: 'victory',
            goldReward, expReward, cardDrop, absorbBonus,
            winStreak: state.winStreak, rating: state.rating,
            msg: `🏆 승리! +${goldReward}G +${expReward}EXP (${state.winStreak}연승)${cardDrop ? ` — ${cardDrop.icon} ${cardDrop.name} 획득!` : ''}${absorbBonus ? ` | 🌟 ${absorbBonus.name} 달성!` : ''}`,
        };
    }

    // 패배
    state.losses++;
    state.winStreak = 0;
    state.rating = Math.max(0, state.rating - 15);

    state.duelState = null;
    return {
        success: true, type: 'defeat',
        rating: state.rating,
        msg: `💔 패배... 연승 초기화. (레이팅: ${state.rating})`,
    };
}

// 상태 조회
function getStatus(player) {
    const state = _ensure(player);
    const ds = state.duelState;
    return {
        wins: state.wins,
        losses: state.losses,
        winStreak: state.winStreak,
        bestStreak: state.bestStreak,
        rating: state.rating,
        fateAbsorbed: state.fateAbsorbed,
        packsOpened: state.packsOpened,
        inDuel: state.inDuel,
        collection: Object.entries(state.collection).map(([id, count]) => ({ id, count, ...FATE_CARDS[id] })),
        deck: state.deck.map(id => ({ id, ...FATE_CARDS[id] })),
        deckSize: state.deck.length,
        duelState: ds ? {
            playerHp: ds.playerHp,
            aiHp: ds.aiHp,
            turn: ds.turn,
            hand: ds.playerHand.map(id => ({ id, ...FATE_CARDS[id] })),
            log: ds.log.slice(-5),
        } : null,
        nextAbsorb: Object.entries(FATE_ABSORB_BONUSES).find(([count]) => parseInt(count) > state.fateAbsorbed)?.[1] || null,
        nextAbsorbAt: Object.keys(FATE_ABSORB_BONUSES).map(Number).find(n => n > state.fateAbsorbed) || null,
        packs: CARD_PACKS,
    };
}

module.exports = {
    FATE_CARDS, ELEMENT_ADVANTAGE, CARD_PACKS, FATE_ABSORB_BONUSES,
    openPack, editDeck, startDuel, playCard, getStatus,
};

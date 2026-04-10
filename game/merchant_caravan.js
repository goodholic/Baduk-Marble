// ==========================================
// 상인 캐러밴 — v2.50
// NPC 상인단 고용 + 교역로 + 도적 방어 + 업그레이드
// ==========================================

// ── 교역 도시 ──
const TRADE_CITIES = {
    crystal_haven:  { name: '수정 항구',     icon: '💎🏘️', specialty: 'crystals',  buyPrice: 100,  sellPrice: 250, danger: 1, distance: 1 },
    iron_forge:     { name: '철의 대장간',   icon: '⚒️🏘️', specialty: 'metals',    buyPrice: 80,   sellPrice: 200, danger: 2, distance: 2 },
    silk_garden:    { name: '비단 정원',     icon: '🧵🏘️', specialty: 'textiles',  buyPrice: 120,  sellPrice: 300, danger: 1, distance: 1 },
    spice_market:   { name: '향신료 시장',   icon: '🌶️🏘️', specialty: 'spices',    buyPrice: 150,  sellPrice: 350, danger: 2, distance: 2 },
    rune_sanctuary: { name: '룬 성소',       icon: '📜🏘️', specialty: 'runes',     buyPrice: 200,  sellPrice: 500, danger: 3, distance: 3 },
    shadow_bazaar:  { name: '그림자 바자르', icon: '🌑🏘️', specialty: 'contraband', buyPrice: 300, sellPrice: 800, danger: 4, distance: 4 },
    dragon_peak:    { name: '용봉우리',     icon: '🐉🏘️', specialty: 'dragongem',  buyPrice: 500,  sellPrice: 1500, danger: 5, distance: 5 },
    celestial_port: { name: '천상 항구',     icon: '✨🏘️', specialty: 'starlight',  buyPrice: 400,  sellPrice: 1200, danger: 4, distance: 3 },
};

// ── 교역품 ──
const GOODS = {
    crystals:   { name: '수정 원석',     icon: '💎',   weight: 2 },
    metals:     { name: '정련 철광',     icon: '⚙️',   weight: 3 },
    textiles:   { name: '마법 비단',     icon: '🧵',   weight: 1 },
    spices:     { name: '고대 향신료',   icon: '🌶️',   weight: 1 },
    runes:      { name: '룬 조각',       icon: '📜',   weight: 1 },
    contraband: { name: '금지품',       icon: '🌑📦', weight: 2 },
    dragongem:  { name: '용의 보석',     icon: '🐉💎', weight: 3 },
    starlight:  { name: '별빛 정수',     icon: '✨🧪', weight: 1 },
};

// ── 캐러밴 업그레이드 ──
const CARAVAN_UPGRADES = {
    wagon:    { name: '마차',     icon: '🛒', maxLevel: 5, baseCost: 5000,  effect: 'capacity', perLevel: 10, desc: '적재량 +10/레벨' },
    guards:   { name: '호위대',   icon: '⚔️', maxLevel: 5, baseCost: 8000,  effect: 'defense',  perLevel: 50, desc: '방어력 +50/레벨' },
    speed:    { name: '마법 바퀴', icon: '💨', maxLevel: 5, baseCost: 6000,  effect: 'speed',    perLevel: 1,  desc: '이동 시간 -1분/레벨' },
    merchant: { name: '숙련 상인', icon: '🧑‍💼', maxLevel: 3, baseCost: 15000, effect: 'profit',   perLevel: 0.1, desc: '판매 가격 +10%/레벨' },
    scout:    { name: '정찰대',   icon: '🔭', maxLevel: 3, baseCost: 10000, effect: 'warning',  perLevel: 0.15, desc: '도적 회피 +15%/레벨' },
};

// ── 도적 유형 ──
const BANDITS = {
    petty_thief:    { name: '좀도둑',       icon: '🏴‍☠️', power: 50,   loot: 0.1,  desc: '물건 10% 약탈' },
    bandit_gang:    { name: '도적단',       icon: '⚔️🏴', power: 150,  loot: 0.2,  desc: '물건 20% 약탈' },
    dark_raiders:   { name: '암흑 습격대',   icon: '🌑⚔️', power: 300,  loot: 0.3,  desc: '물건 30% 약탈' },
    dragon_bandits: { name: '용기사 도적단', icon: '🐉🏴', power: 500,  loot: 0.5,  desc: '물건 50% 약탈' },
    void_pirates:   { name: '공허 해적단',   icon: '🕳️🏴', power: 800,  loot: 0.7,  desc: '물건 70% 약탈' },
};

// ── 랜덤 이벤트 ──
const TRAVEL_EVENTS = [
    { name: '오아시스 발견',   icon: '🏝️', type: 'good', effect: { healCaravan: true }, desc: '호위대 체력 회복!' },
    { name: '유랑 상인 조우',  icon: '🧳', type: 'good', effect: { bonusGoods: 5 }, desc: '추가 물품 +5 획득!' },
    { name: '보물 발견',       icon: '💰', type: 'good', effect: { bonusGold: 5000 }, desc: '숨겨진 보물 +5,000G!' },
    { name: '지름길 발견',     icon: '🗺️', type: 'good', effect: { speedUp: true }, desc: '도착 시간 단축!' },
    { name: '폭풍우',         icon: '⛈️', type: 'bad',  effect: { slowDown: true }, desc: '이동 시간 증가...' },
    { name: '상품 파손',       icon: '💥', type: 'bad',  effect: { loseGoods: 3 }, desc: '물품 -3 파손...' },
    { name: '밀수업자 제안',   icon: '🌑🤝', type: 'neutral', effect: { contraband: true }, desc: '금지품 거래 기회!' },
    { name: '축제 도시 경유',  icon: '🎊', type: 'good', effect: { bonusSell: 0.2 }, desc: '판매 가격 +20% 보너스!' },
];

function _ensure(player) {
    if (!player._caravan) {
        player._caravan = {
            established: false,
            caravanName: '',
            upgrades: {},           // { upgradeId: level }
            capacity: 20,           // 기본 적재량
            defense: 50,            // 기본 방어력
            cargo: {},              // { goodId: count }
            inTransit: false,
            transitState: null,     // { from, to, departTime, arriveTime, cargo, events }
            totalTrips: 0,
            totalProfit: 0,
            totalLosses: 0,
            caravanTokens: 0,
            merchantRank: 'novice',
        };
    }
    return player._caravan;
}

const MERCHANT_RANKS = [
    { min: 0,      name: '견습 상인',   icon: '⚪' },
    { min: 50000,   name: '행상인',     icon: '🟢' },
    { min: 200000,  name: '무역상',     icon: '🔵' },
    { min: 500000,  name: '대상인',     icon: '🟣' },
    { min: 1000000, name: '무역왕',     icon: '🟡' },
    { min: 5000000, name: '전설의 상인', icon: '👑' },
];

function _getMerchantRank(profit) {
    let rank = MERCHANT_RANKS[0];
    for (const r of MERCHANT_RANKS) { if (profit >= r.min) rank = r; }
    return rank;
}

// 캐러밴 설립
function establish(player, name) {
    const state = _ensure(player);
    if (state.established) return { success: false, msg: '이미 캐러밴이 있습니다.' };
    if ((player.level || 1) < 20) return { success: false, msg: 'Lv.20 이상 필요' };
    if ((player.gold || 0) < 20000) return { success: false, msg: '골드 부족 (20,000G)' };

    player.gold -= 20000;
    state.established = true;
    state.caravanName = (name && typeof name === 'string') ? name.slice(0, 16) : `${player.displayName} 상단`;

    return { success: true, msg: `🛒 "${state.caravanName}" 상단 설립! 교역로를 개척하세요!` };
}

// 업그레이드
function upgrade(player, upgradeId) {
    const state = _ensure(player);
    if (!state.established) return { success: false, msg: '캐러밴을 먼저 설립하세요.' };

    const upg = CARAVAN_UPGRADES[upgradeId];
    if (!upg) return { success: false, msg: '알 수 없는 업그레이드' };
    const level = state.upgrades[upgradeId] || 0;
    if (level >= upg.maxLevel) return { success: false, msg: '최대 레벨' };

    const cost = upg.baseCost * (level + 1);
    if ((player.gold || 0) < cost) return { success: false, msg: `골드 부족 (${cost}G)` };

    player.gold -= cost;
    state.upgrades[upgradeId] = level + 1;

    // 효과 적용
    if (upg.effect === 'capacity') state.capacity = 20 + (state.upgrades.wagon || 0) * 10;
    if (upg.effect === 'defense') state.defense = 50 + (state.upgrades.guards || 0) * 50;

    return { success: true, msg: `${upg.icon} ${upg.name} Lv.${level + 1} 업그레이드! (-${cost}G)` };
}

// 물품 구매
function buyGoods(player, cityId, count) {
    const state = _ensure(player);
    if (!state.established) return { success: false, msg: '캐러밴을 먼저 설립하세요.' };
    if (state.inTransit) return { success: false, msg: '이동 중에는 구매 불가' };

    const city = TRADE_CITIES[cityId];
    if (!city) return { success: false, msg: '알 수 없는 도시' };

    const n = Math.min(count || 1, 50);
    const cost = city.buyPrice * n;
    if ((player.gold || 0) < cost) return { success: false, msg: `골드 부족 (${cost}G)` };

    const currentLoad = Object.values(state.cargo).reduce((sum, c) => sum + c, 0);
    if (currentLoad + n > state.capacity) return { success: false, msg: `적재량 초과 (${currentLoad}/${state.capacity})` };

    player.gold -= cost;
    state.cargo[city.specialty] = (state.cargo[city.specialty] || 0) + n;

    return { success: true, msg: `${GOODS[city.specialty].icon} ${GOODS[city.specialty].name} x${n} 구매! (-${cost}G)` };
}

// 교역 출발
function depart(player, destinationId) {
    const state = _ensure(player);
    if (!state.established) return { success: false, msg: '캐러밴을 먼저 설립하세요.' };
    if (state.inTransit) return { success: false, msg: '이미 이동 중!' };
    if (Object.keys(state.cargo).length === 0) return { success: false, msg: '적재 물품이 없습니다.' };

    const dest = TRADE_CITIES[destinationId];
    if (!dest) return { success: false, msg: '알 수 없는 목적지' };

    const speedBonus = (state.upgrades.speed || 0);
    const travelTime = Math.max(1, dest.distance * 3 - speedBonus) * 60000; // 분 → ms

    state.inTransit = true;
    state.transitState = {
        destination: destinationId,
        departTime: Date.now(),
        arriveTime: Date.now() + travelTime,
        cargo: { ...state.cargo },
        events: [],
        banditEncountered: false,
    };

    // 랜덤 이벤트 (거리 기반)
    const eventCount = Math.min(dest.distance, 3);
    for (let i = 0; i < eventCount; i++) {
        const event = TRAVEL_EVENTS[Math.floor(Math.random() * TRAVEL_EVENTS.length)];
        state.transitState.events.push(event);
    }

    // 도적 조우 판정
    const scoutBonus = (state.upgrades.scout || 0) * 0.15;
    const banditChance = Math.min(0.8, dest.danger * 0.15) * (1 - scoutBonus);
    if (Math.random() < banditChance) {
        state.transitState.banditEncountered = true;
        const banditKeys = Object.keys(BANDITS);
        const banditIdx = Math.min(dest.danger - 1, banditKeys.length - 1);
        state.transitState.banditType = banditKeys[Math.max(0, banditIdx)];
    }

    return {
        success: true,
        travelMinutes: Math.ceil(travelTime / 60000),
        destination: dest,
        events: state.transitState.events.length,
        msg: `🛒💨 "${state.caravanName}" ${dest.icon} ${dest.name}으로 출발! (${Math.ceil(travelTime / 60000)}분)`,
    };
}

// 도착 (수동 또는 시간 경과 후)
function arrive(player) {
    const state = _ensure(player);
    if (!state.inTransit || !state.transitState) return { success: false, msg: '이동 중이 아닙니다.' };

    if (Date.now() < state.transitState.arriveTime) {
        const remain = Math.ceil((state.transitState.arriveTime - Date.now()) / 60000);
        return { success: false, msg: `도착까지 ${remain}분 남았습니다.` };
    }

    const ts = state.transitState;
    const dest = TRADE_CITIES[ts.destination];
    const profitMult = 1 + (state.upgrades.merchant || 0) * 0.1;
    const results = [];

    // 이벤트 처리
    let eventBonusMult = 1.0;
    let bonusGold = 0;
    for (const event of ts.events) {
        results.push(`${event.icon} ${event.name}: ${event.desc}`);
        if (event.effect.bonusGold) bonusGold += event.effect.bonusGold;
        if (event.effect.bonusSell) eventBonusMult += event.effect.bonusSell;
        if (event.effect.loseGoods) {
            for (const gid in ts.cargo) {
                ts.cargo[gid] = Math.max(0, ts.cargo[gid] - event.effect.loseGoods);
                if (ts.cargo[gid] <= 0) delete ts.cargo[gid];
            }
        }
        if (event.effect.bonusGoods) {
            if (dest.specialty && ts.cargo[dest.specialty] !== undefined) {
                ts.cargo[dest.specialty] += event.effect.bonusGoods;
            }
        }
    }

    // 도적 처리
    if (ts.banditEncountered && ts.banditType) {
        const bandit = BANDITS[ts.banditType];
        const defended = state.defense >= bandit.power;
        if (defended) {
            results.push(`${bandit.icon} ${bandit.name} 격퇴! 호위대 승리!`);
            bonusGold += 2000;
        } else {
            const lostPct = bandit.loot;
            for (const gid in ts.cargo) {
                const lost = Math.ceil(ts.cargo[gid] * lostPct);
                ts.cargo[gid] = Math.max(0, ts.cargo[gid] - lost);
                if (ts.cargo[gid] <= 0) delete ts.cargo[gid];
            }
            results.push(`${bandit.icon} ${bandit.name} 습격! 물품 ${Math.floor(lostPct * 100)}% 약탈...`);
            state.totalLosses++;
        }
    }

    // 판매
    let totalRevenue = bonusGold;
    for (const [goodId, count] of Object.entries(ts.cargo)) {
        if (count <= 0) continue;
        // 도시별 가격 차이 (특산품 보너스)
        let price = dest.sellPrice;
        if (goodId !== dest.specialty) price = Math.floor(price * 0.7); // 비특산품은 70%
        const revenue = Math.floor(price * count * profitMult * eventBonusMult);
        totalRevenue += revenue;
        results.push(`${GOODS[goodId]?.icon || '📦'} ${GOODS[goodId]?.name || goodId} x${count} 판매 → ${revenue}G`);
    }

    player.gold = Math.min((player.gold || 0) + totalRevenue, 999999999);
    state.totalProfit += totalRevenue;
    state.totalTrips++;
    state.caravanTokens += dest.distance * 2;
    state.cargo = {};
    state.inTransit = false;
    state.transitState = null;
    state.merchantRank = _getMerchantRank(state.totalProfit).name;

    return {
        success: true, totalRevenue, results,
        msg: `${dest.icon} ${dest.name} 도착!\n${results.join('\n')}\n💰 총 수익: ${totalRevenue}G (누적: ${state.totalProfit}G)`,
    };
}

function getStatus(player) {
    const state = _ensure(player);
    const rank = _getMerchantRank(state.totalProfit);
    return {
        established: state.established,
        caravanName: state.caravanName,
        capacity: state.capacity,
        defense: state.defense,
        currentLoad: Object.values(state.cargo).reduce((s, c) => s + c, 0),
        cargo: Object.entries(state.cargo).map(([id, c]) => ({ id, count: c, ...GOODS[id] })),
        upgrades: Object.entries(CARAVAN_UPGRADES).map(([id, u]) => ({ id, ...u, level: state.upgrades[id] || 0, cost: u.baseCost * ((state.upgrades[id] || 0) + 1) })),
        inTransit: state.inTransit,
        transitRemain: state.transitState ? Math.max(0, Math.ceil((state.transitState.arriveTime - Date.now()) / 60000)) : 0,
        transitDest: state.transitState ? TRADE_CITIES[state.transitState.destination] : null,
        totalTrips: state.totalTrips,
        totalProfit: state.totalProfit,
        merchantRank: rank,
        caravanTokens: state.caravanTokens,
        cities: TRADE_CITIES,
        goods: GOODS,
    };
}

module.exports = {
    TRADE_CITIES, GOODS, CARAVAN_UPGRADES, BANDITS,
    establish, upgrade, buyGoods, depart, arrive, getStatus,
};

// economy connection handlers (split from connection.js)

function registerEconomyConnectionHandlers(socket, $) {
    const {
        players, io, savePlayer, recalcStats, trackQuest, getZone, EQUIP_STATS, SHOP_ITEMS,
        FREE_DIAMOND_SOURCES, TRADEABLE_ITEMS, RECIPES, handleCraft, handleBuyPet, handleBuyMount, handleEvolvePet, checkTitles,
        MAX_GOLD, capResources, giveExp, getExpRequired, bountyBoard,
    } = $;
    // --- shop_buy ---
    socket.on('shop_buy', (itemId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;

        const item = SHOP_ITEMS[itemId];
        if (!item) return;

        // 화폐 확인 & 차감
        if (item.currency === 'diamond') {
            if ((p.diamonds || 0) < item.price) {
                socket.emit('shop_result', { success: false, msg: '다이아몬드가 부족합니다' });
                return;
            }
            p.diamonds -= item.price;
        } else {
            if (p.gold < item.price) {
                socket.emit('shop_result', { success: false, msg: '골드가 부족합니다' });
                return;
            }
            p.gold -= item.price;
        }

        // 효과 적용
        let msg = `${item.name} 구매 완료!`;
        switch (item.effect) {
            case 'exp_boost':
                p.expBoost = (p.expBoost || 1) * item.value;
                p.expBoostEnd = Date.now() + (item.duration * 1000);
                msg += ` (${item.duration}초간 EXP x${item.value})`;
                break;
            case 'gold_boost':
                p.goldBoost = (p.goldBoost || 1) * item.value;
                p.goldBoostEnd = Date.now() + (item.duration * 1000);
                msg += ` (${item.duration}초간 골드 x${item.value})`;
                break;
            case 'hp_potion':
                p.hp = Math.min(p.maxHp, p.hp + item.value * (item.count || 1));
                break;
            case 'army_expand':
                p.maxArmy = (p.maxArmy || 30) + item.value;
                msg += ` (최대 용병: ${p.maxArmy}명)`;
                break;
            case 'skin':
                if (!p.skins) p.skins = [];
                if (!p.skins.includes(item.value)) p.skins.push(item.value);
                p.activeSkin = item.value;
                msg += ` (${item.value} 스킨 적용)`;
                break;
            case 'teleport':
                p.x = -20; p.y = -20; // 마을 좌표
                break;
            case 'atk_boost': {
                // 버프 시스템 사용 (recalcStats 충돌/영구 페널티 방지)
                if (!p.activeBuffs) p.activeBuffs = {};
                p.activeBuffs['shop_atk_boost'] = {
                    name: '공격 부스트',
                    stat: 'atk',
                    multi: item.value,
                    startTime: Date.now(),
                    endTime: Date.now() + item.duration * 1000,
                    icon: 'buff',
                };
                msg += ` (${item.duration}초간 ATK x${item.value})`;
                break;
            }
            case 'def_boost': {
                if (!p.activeBuffs) p.activeBuffs = {};
                p.activeBuffs['shop_def_boost'] = {
                    name: '방어 부스트',
                    stat: 'def',
                    multi: item.value,
                    startTime: Date.now(),
                    endTime: Date.now() + item.duration * 1000,
                    icon: 'buff',
                };
                msg += ` (${item.duration}초간 DEF x${item.value})`;
                break;
            }
            case 'equip_item':
                if (!p.inventory) p.inventory = {};
                p.inventory[item.value] = (p.inventory[item.value] || 0) + 1;
                const eName = EQUIP_STATS[item.value]?.name || item.value;
                msg = `${eName} 구매 완료! (인벤토리에 추가)`;
                break;
            case 'protect':
                if (!p.inventory) p.inventory = {};
                p.inventory['protect_scroll'] = (p.inventory['protect_scroll'] || 0) + (item.count || 1);
                break;
            case 'revive':
                if (!p.inventory) p.inventory = {};
                p.inventory['scroll_revive'] = (p.inventory['scroll_revive'] || 0) + (item.count || 1);
                break;
            case 'rare_box_grant':
                if (!p.inventory) p.inventory = {};
                p.inventory['rare_box'] = (p.inventory['rare_box'] || 0) + 1;
                msg = `희귀 상자 1개 획득! (인벤토리에서 오픈)`;
                break;
            case 'mat_grant':
                if (!p.inventory) p.inventory = {};
                p.inventory[item.value] = (p.inventory[item.value] || 0) + (item.count || 1);
                msg = `${item.name} 획득!`;
                break;
            case 'mp_potion':
                if (!p.inventory) p.inventory = {};
                p.inventory['mp_potion'] = (p.inventory['mp_potion'] || 0) + (item.count || 1);
                break;
            case 'speed_boost': {
                if (!p.activeBuffs) p.activeBuffs = {};
                p.activeBuffs['shop_speed'] = {
                    name: '질주', stat: 'speed', multi: item.value,
                    startTime: Date.now(), endTime: Date.now() + item.duration * 1000, icon: 'buff',
                };
                msg += ` (${item.duration}초간 SPD x${item.value})`;
                break;
            }
        }

        savePlayer(p);
        socket.emit('shop_result', { success: true, msg, diamonds: p.diamonds || 0, gold: p.gold });
        // 인벤토리 갱신 (장비 구매 시)
        socket.emit('inventory_update', { inventory: p.inventory });
        io.emit('player_update', p);
    });

    // ── 상점 목록 요청 ──

    // --- shop_list ---
    socket.on('shop_list', () => {
        const p = players[playerId];
        if (!p) return;
        socket.emit('shop_list_result', {
            items: SHOP_ITEMS,
            diamonds: p?.diamonds || 0,
            gold: p?.gold || 0,
            freeSources: FREE_DIAMOND_SOURCES
        });
    });

    // ── 일일 보상 수령 ──

    // --- daily_reward ---
    socket.on('daily_reward', () => {
        const p = players[playerId];
        if (!p) return;
        const today = new Date().toDateString();
        if (p.lastDailyReward === today) {
            socket.emit('daily_result', { success: false, msg: '오늘 이미 수령했습니다' });
            return;
        }
        p.lastDailyReward = today;
        p.diamonds = (p.diamonds || 0) + FREE_DIAMOND_SOURCES.daily_login;
        p.gold += 500;
        savePlayer(p);
        socket.emit('daily_result', {
            success: true,
            msg: `일일 보상: 💎${FREE_DIAMOND_SOURCES.daily_login} + 💰500G`,
            diamonds: p.diamonds,
            gold: p.gold
        });
    });

    // ── 행운의 룰렛 (일일 1회 무료) ──

    // --- lucky_spin ---
    socket.on('lucky_spin', () => {
        const p = players[playerId];
        if (!p) return;
        const today = new Date().toDateString();
        if (p.lastLuckySpin === today) {
            socket.emit('lucky_spin_result', { success: false, msg: '오늘 이미 룰렛을 돌렸습니다' });
            return;
        }
        // 8개 슬롯, 가중치 합 100
        const SLOTS = [
            { weight: 35, label: '💰 100G',     apply: (pl) => { pl.gold += 100; },                           tier:'common'  },
            { weight: 25, label: '💰 500G',     apply: (pl) => { pl.gold += 500; },                           tier:'common'  },
            { weight: 15, label: '💎 5',        apply: (pl) => { pl.diamonds = (pl.diamonds||0) + 5; },       tier:'rare'    },
            { weight: 10, label: '💰 2,000G',   apply: (pl) => { pl.gold += 2000; },                          tier:'rare'    },
            { weight:  7, label: 'EXP +5%',     apply: (pl) => { giveExp(pl, Math.floor(getExpRequired(pl.level) * 0.05)); }, tier:'rare' },
            { weight:  5, label: '🍖 황금 수프', apply: (pl) => { if(!pl.inventory)pl.inventory={}; pl.inventory['food_atk']=(pl.inventory['food_atk']||0)+1; }, tier:'epic' },
            { weight:  2, label: '💎 50',       apply: (pl) => { pl.diamonds = (pl.diamonds||0) + 50; },      tier:'epic'    },
            { weight:  1, label: '🐉 드래곤 비늘', apply: (pl) => { if(!pl.inventory)pl.inventory={}; pl.inventory['mat_dragon']=(pl.inventory['mat_dragon']||0)+1; }, tier:'legend' },
        ];
        const total = SLOTS.reduce((s, sl) => s + sl.weight, 0);
        let roll = Math.random() * total;
        let pickedIdx = 0;
        for (let i = 0; i < SLOTS.length; i++) {
            roll -= SLOTS[i].weight;
            if (roll <= 0) { pickedIdx = i; break; }
        }
        const picked = SLOTS[pickedIdx];
        picked.apply(p);
        p.lastLuckySpin = today;
        capResources(p);
        savePlayer(p);
        socket.emit('lucky_spin_result', {
            success: true,
            msg: `행운의 룰렛: ${picked.label}!`,
            slot: pickedIdx,
            tier: picked.tier,
            label: picked.label,
        });
        io.emit('player_update', p);
        if (picked.tier === 'epic' || picked.tier === 'legend') {
            io.emit('server_msg', { msg: `[행운] ${p.displayName}이(가) 룰렛에서 ${picked.label} 획득!`, type: 'rare' });
        }
    });

    // ── 인벤토리 조회 ──

    // --- market_list_item ---
    socket.on('market_list_item', (data) => {
        const p = players[playerId];
        if (!p) return;
        if (!data || typeof data.itemId !== 'string') { socket.emit('market_result', { msg: '잘못된 입력' }); return; }
        const itemId = data.itemId;
        const price = Math.floor(Number(data.price));
        if (!Number.isFinite(price) || price <= 0 || price > MAX_GOLD) { socket.emit('market_result', { msg: '잘못된 가격' }); return; }
        if (!p.inventory || !p.inventory[itemId] || p.inventory[itemId] <= 0) {
            socket.emit('market_result', { msg: '아이템 없음' }); return;
        }
        // 귀속 아이템 거래 불가
        if (EQUIP_STATS[itemId]?.bound) { socket.emit('market_result', { msg: '귀속 아이템은 거래 불가' }); return; }
        // 동시 10개 제한
        const myListings = $.marketListings.filter(l => l.sellerId === playerId);
        if (myListings.length >= 10) { socket.emit('market_result', { msg: '최대 10개까지 등록 가능' }); return; }

        p.inventory[itemId]--;
        if (p.inventory[itemId] <= 0) delete p.inventory[itemId];

        $.marketIdCounter++;
        const listing = {
            id: $.marketIdCounter, sellerId: playerId,
            sellerName: p.displayName, itemId, price: Math.floor(price),
            itemName: TRADEABLE_ITEMS[itemId]?.name || EQUIP_STATS[itemId]?.name || itemId,
            grade: EQUIP_STATS[itemId]?.grade || null,
            listedAt: Date.now(), expiresAt: Date.now() + 86400000, // 24시간
            bids: [], // 입찰 목록
        };
        $.marketListings.push(listing);
        socket.emit('market_result', { msg: `${listing.itemName} 등록 완료! (${price}G)` });
        savePlayer(p);
    });

    // ── 경매장: 즉시 구매 ──

    // --- market_buy ---
    socket.on('market_buy', (listingId) => {
        const p = players[playerId];
        if (!p) return;
        const idx = $.marketListings.findIndex(l => l.id === listingId);
        if (idx === -1) { socket.emit('market_result', { msg: '매물 없음' }); return; }
        const listing = $.marketListings[idx];
        if (listing.sellerId === playerId) { socket.emit('market_result', { msg: '자기 매물 구매 불가' }); return; }
        if (p.gold < listing.price) { socket.emit('market_result', { msg: '골드 부족' }); return; }

        p.gold -= listing.price;
        if (!p.inventory) p.inventory = {};
        p.inventory[listing.itemId] = (p.inventory[listing.itemId] || 0) + 1;

        // 판매자에게 수수료 제외 골드 지급
        const sellerGold = Math.floor(listing.price * (1 - MARKET_FEE));
        const seller = players[listing.sellerId];
        if (seller) { seller.gold += sellerGold; savePlayer(seller); }

        $.marketListings.splice(idx, 1);
        socket.emit('market_result', { msg: `${listing.itemName} 구매 완료! (-${listing.price}G)` });
        io.emit('player_update', p);
        savePlayer(p);
    });

    // ── 경매장: 입찰 ──

    // --- market_bid ---
    socket.on('market_bid', (data) => {
        const p = players[playerId];
        if (!p) return;
        if (!data) return;
        const listingId = data.listingId;
        const bidAmount = Math.floor(Number(data.bidAmount));
        if (!Number.isFinite(bidAmount) || bidAmount <= 0 || bidAmount > MAX_GOLD) { socket.emit('market_result', { msg: '잘못된 입찰액' }); return; }
        const listing = $.marketListings.find(l => l.id === listingId);
        if (!listing) { socket.emit('market_result', { msg: '매물 없음' }); return; }
        if (listing.sellerId === playerId) { socket.emit('market_result', { msg: '자기 매물 입찰 불가' }); return; }
        if (p.gold < bidAmount) { socket.emit('market_result', { msg: '골드 부족' }); return; }

        const highestBid = listing.bids.length > 0 ? listing.bids[listing.bids.length - 1].amount : 0;
        if (bidAmount <= highestBid) { socket.emit('market_result', { msg: `현재 최고 입찰가(${highestBid}G)보다 높아야 함` }); return; }

        // 이전 입찰자에게 골드 반환
        if (listing.bids.length > 0) {
            const prevBid = listing.bids[listing.bids.length - 1];
            const prevBidder = players[prevBid.bidderId];
            if (prevBidder) {
                prevBidder.gold += prevBid.amount;
                savePlayer(prevBidder);
                io.emit('player_update', prevBidder);
            }
        }

        p.gold -= bidAmount;
        listing.bids.push({ bidderId: playerId, bidderName: p.displayName, amount: bidAmount });
        savePlayer(p);
        socket.emit('market_result', { msg: `${listing.itemName}에 ${bidAmount}G 입찰 완료!` });
        io.emit('player_update', p);
    });

    // ── 경매장: 목록 조회 ──

    // --- market_browse ---
    socket.on('market_browse', (filter) => {
        const p = players[playerId]; if (!p) return;
        expireMarketListings();
        let filtered = $.marketListings;
        if (filter && filter.category) {
            filtered = filtered.filter(l => (TRADEABLE_ITEMS[l.itemId]?.category || '') === filter.category);
        }
        socket.emit('market_listings', filtered.map(l => ({
            id: l.id, itemId: l.itemId, itemName: l.itemName, price: l.price,
            grade: l.grade, sellerName: l.sellerName,
            highestBid: l.bids.length > 0 ? l.bids[l.bids.length - 1].amount : 0,
            timeLeft: Math.max(0, Math.floor((l.expiresAt - now) / 60000)),
        })));
    });

    // ── 경매장: 내 매물 취소 ──

    // --- market_cancel ---
    socket.on('market_cancel', (listingId) => {
        const p = players[playerId];
        if (!p) return;
        const idx = $.marketListings.findIndex(l => l.id === listingId && l.sellerId === playerId);
        if (idx === -1) { socket.emit('market_result', { msg: '매물 없음' }); return; }
        const listing = $.marketListings[idx];
        // 입찰자에게 골드 반환
        if (listing.bids && listing.bids.length > 0) {
            const lastBid = listing.bids[listing.bids.length - 1];
            const bidder = players[lastBid.bidderId];
            if (bidder) { bidder.gold += lastBid.amount; savePlayer(bidder); io.emit('player_update', bidder); }
        }
        // 아이템 반환
        if (!p.inventory) p.inventory = {};
        p.inventory[listing.itemId] = (p.inventory[listing.itemId] || 0) + 1;
        $.marketListings.splice(idx, 1);
        savePlayer(p);
        socket.emit('market_result', { msg: `${listing.itemName} 등록 취소` });
    });

    // ── 현상금 수락 ──

    // --- rogue_buy ---
    socket.on('rogue_buy', (dealIdx) => {
        const p = players[playerId];
        if (!p || !$.rogueMerchant) { socket.emit('rogue_result', { msg: '상인이 없습니다' }); return; }
        if ($.rogueMerchant.bought[dealIdx]) { socket.emit('rogue_result', { msg: '이미 판매됨' }); return; }
        const deal = $.rogueMerchant.deals[dealIdx];
        if (!deal) return;
        if (deal.currency === 'diamond' && (p.diamonds||0) < deal.price) { socket.emit('rogue_result', { msg: '다이아 부족' }); return; }
        if (deal.currency === 'gold' && p.gold < deal.price) { socket.emit('rogue_result', { msg: '골드 부족' }); return; }
        if (deal.currency === 'diamond') p.diamonds -= deal.price; else p.gold -= deal.price;
        $.rogueMerchant.bought[dealIdx] = playerId;
        if (!p.inventory) p.inventory = {};

        if (deal.type === 'equip') {
            p.inventory[deal.itemId] = (p.inventory[deal.itemId]||0) + 1;
            socket.emit('rogue_result', { msg: `${deal.name} 구매 완료!` });
        } else if (deal.type === 'material') {
            p.inventory[deal.itemId] = (p.inventory[deal.itemId]||0) + (deal.qty||1);
            socket.emit('rogue_result', { msg: `${deal.name} 구매 완료!` });
        } else if (deal.type === 'mystery') {
            const roll = Math.random();
            let item, grade;
            if (roll < 0.01) { item = 'equip_sword_5'; grade = '전설'; }
            else if (roll < 0.05) { item = 'equip_sword_4'; grade = '영웅'; }
            else if (roll < 0.15) { item = 'equip_sword_3'; grade = '희귀'; }
            else if (roll < 0.40) { item = 'equip_sword_2'; grade = '고급'; }
            else { item = 'pot_hp_s'; grade = '꽝'; }
            p.inventory[item] = (p.inventory[item]||0) + 1;
            const iName = EQUIP_STATS[item]?.name || item;
            socket.emit('rogue_result', { msg: `미스터리 박스 오픈! → ${iName} (${grade})` });
            if (grade === '전설' || grade === '영웅') io.emit('server_msg', { msg: `${p.displayName}이(가) 미스터리 박스에서 ${iName} 획득!`, type: 'rare' });
        }
        savePlayer(p); io.emit('player_update', p);
    });

    // ── 장비 합성 (같은 등급 3개 → 상위 1개) ──

    // --- town_buy ---
    socket.on('town_buy', (dataStr) => {
        const p = players[playerId];
        if (!p) return;
        try {
            const data = JSON.parse(dataStr);
            const goodsId = data && data.goodsId;
            const town = data && data.town;
            const qty = Math.floor(Number(data && data.qty));
            // 음수/NaN 방지 (도용 익스플로잇 차단)
            if (!Number.isFinite(qty) || qty <= 0 || qty > 9999) { socket.emit('trade_goods_result', { success:false, msg:'잘못된 수량' }); return; }
            const zone = getZone(p.x, p.y);
            if (!zone || zone.id !== town) { socket.emit('trade_goods_result', { success:false, msg:'해당 마을에 있어야 합니다' }); return; }
            if (!$.townPrices[town] || !$.townPrices[town][goodsId]) return;

            const price = $.townPrices[town][goodsId].buyPrice * qty;
            if (p.gold < price) { socket.emit('trade_goods_result', { success:false, msg:'골드 부족' }); return; }

            p.gold -= price;
            if (!p.inventory) p.inventory = {};
            p.inventory[goodsId] = (p.inventory[goodsId] || 0) + qty;
            savePlayer(p);
            socket.emit('trade_goods_result', { success:true, msg:`${$.townPrices[town][goodsId].name} x${qty} 구매 (${price}G)` });
            io.emit('player_update', p);
        } catch(e) {}
    });


    // --- town_sell ---
    socket.on('town_sell', (dataStr) => {
        const p = players[playerId];
        if (!p) return;
        try {
            const data = JSON.parse(dataStr);
            const goodsId = data && data.goodsId;
            const town = data && data.town;
            const qty = Math.floor(Number(data && data.qty));
            // 음수/NaN 방지
            if (!Number.isFinite(qty) || qty <= 0 || qty > 9999) { socket.emit('trade_goods_result', { success:false, msg:'잘못된 수량' }); return; }
            const zone = getZone(p.x, p.y);
            if (!zone || zone.id !== town) { socket.emit('trade_goods_result', { success:false, msg:'해당 마을에 있어야 합니다' }); return; }
            if (!p.inventory || !p.inventory[goodsId] || p.inventory[goodsId] < qty) {
                socket.emit('trade_goods_result', { success:false, msg:'물건 부족' }); return;
            }
            if (!$.townPrices[town] || !$.townPrices[town][goodsId]) return;

            const price = $.townPrices[town][goodsId].sellPrice * qty;
            p.inventory[goodsId] -= qty;
            if (p.inventory[goodsId] <= 0) delete p.inventory[goodsId];
            p.gold += price;
            p.totalTradeProfit = (p.totalTradeProfit || 0) + price;
            trackQuest(p, 'trade_count', qty);
            checkTitles(p);
            capResources(p);
            savePlayer(p);
            socket.emit('trade_goods_result', { success:true, msg:`${$.townPrices[town][goodsId].name} x${qty} 판매 (+${price}G)` });
            io.emit('player_update', p);
        } catch(e) {}
    });


    // --- get_town_prices ---
    socket.on('get_town_prices', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('town_prices', $.townPrices);
    });

    // ── 용병 거래 (제안) ──

    // --- trade_request ---
    socket.on('trade_request', (targetId) => {
        const p = players[playerId];
        const t = players[targetId];
        if (!p || !t || t.isBot || targetId === playerId) return;
        const dist = Math.hypot(p.x - t.x, p.y - t.y);
        if (dist > 5) { socket.emit('trade_result', { success:false, msg:'대상이 너무 멉니다 (5 이내)' }); return; }
        // 대기 중 거래 요청 저장 (수락 시 검증)
        if (!t._pendingTrades) t._pendingTrades = {};
        t._pendingTrades[playerId] = Date.now() + 60000; // 60초 유효
        io.to(targetId).emit('trade_incoming', { fromId: playerId, fromName: p.displayName });
        socket.emit('trade_result', { success:true, msg:'거래 요청을 보냈습니다' });
    });


    // --- trade_accept ---
    socket.on('trade_accept', (dataStr) => {
        try {
            const data = JSON.parse(dataStr);
            const fromId = data && data.fromId;
            const myItem = data && data.myItem;
            const p = players[playerId];
            const t = players[fromId];
            if (!p || !t || t.isBot || fromId === playerId) return;

            // 유효한 거래 요청 검증 (theirItem 강탈 방지)
            if (!p._pendingTrades || !p._pendingTrades[fromId] || Date.now() > p._pendingTrades[fromId]) {
                socket.emit('trade_result', { success:false, msg:'유효한 거래 요청이 없습니다' });
                return;
            }
            // 거리 재검증
            if (Math.hypot(p.x - t.x, p.y - t.y) > 5) {
                socket.emit('trade_result', { success:false, msg:'대상이 너무 멉니다' });
                return;
            }
            // 귀속 아이템 보호
            if (myItem && EQUIP_STATS[myItem]?.bound) {
                socket.emit('trade_result', { success:false, msg:'귀속 아이템은 거래 불가' });
                return;
            }
            // 한 번만 사용 (재사용 방지)
            delete p._pendingTrades[fromId];

            // 일방향 양도: 수락자가 자기 아이템을 요청자에게 전달
            if (myItem && p.inventory && p.inventory[myItem] > 0) {
                p.inventory[myItem]--;
                if (p.inventory[myItem] <= 0) delete p.inventory[myItem];
                if (!t.inventory) t.inventory = {};
                t.inventory[myItem] = (t.inventory[myItem] || 0) + 1;
                savePlayer(p); savePlayer(t);
                socket.emit('trade_result', { success:true, msg:`${myItem} 양도 완료!` });
                io.to(fromId).emit('trade_result', { success:true, msg:`${p.displayName}에게서 ${myItem} 수령!` });
                io.emit('player_update', p);
                io.emit('player_update', t);
            } else {
                socket.emit('trade_result', { success:false, msg:'양도할 아이템이 없습니다' });
            }
        } catch(e) {}
    });

    // ── 제작 ──

    // --- craft ---
    socket.on('craft', (recipeId) => {
        const p = players[playerId];
        if (!p) return;
        const result = handleCraft(p, recipeId, io);
        if (result.success) {
            p.totalCrafts = (p.totalCrafts || 0) + 1;
            trackQuest(p, 'craft_count', 1);
            checkTitles(p);
        }
        savePlayer(p);
        socket.emit('craft_result', result);
        if (result.success) io.emit('player_update', p);
    });

    // ── 스킬 상세 정보 ──

    // --- get_recipes ---
    socket.on('get_recipes', () => {
        socket.emit('recipe_list', RECIPES);
    });

    // ── 펫 구매 ──

    // --- buy_pet ---
    socket.on('buy_pet', (petId) => {
        const p = players[playerId];
        if (!p) return;
        const result = handleBuyPet(p, petId);
        if (result.success) savePlayer(p);
        socket.emit('pet_result', result);
    });

    // ── 펫 진화 ──

    // --- evolve_pet ---
    socket.on('evolve_pet', (petId) => {
        const p = players[playerId];
        if (!p) return;
        const result = handleEvolvePet(p, petId);
        if (result.success) {
            trackQuest(p, 'pet_evolve', 1);
            savePlayer(p);
            io.emit('player_update', p);
            io.emit('server_msg', { msg: `${p.displayName}이(가) 펫을 진화시켰습니다: ${result.msg}`, type: 'rare' });
        }
        socket.emit('pet_result', result);
    });

    // ── 탈것 구매 ──

    // --- buy_mount ---
    socket.on('buy_mount', (mountId) => {
        const p = players[playerId];
        if (!p) return;
        const result = handleBuyMount(p, mountId);
        if (result.success) savePlayer(p);
        socket.emit('mount_result', result);
    });

    // ── 버프 사용 (인벤토리 아이템) ──

    // --- claim_bounty ---
    socket.on('claim_bounty', (targetName) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const bounty = bountyBoard.find(b => b.targetName === targetName && !b.claimedBy);
        if (!bounty) { socket.emit('bounty_result', { msg: '이미 수락됨 또는 만료' }); return; }
        bounty.claimedBy = playerId;
        bounty.claimedAt = Date.now();
        p._activeBounty = bounty;
        socket.emit('bounty_result', { msg: `${bounty.targetName} 현상금 수락! 5분 내 처치하세요. 보상: ${bounty.reward}G + 50D` });
        // 5분 타이머
        setTimeout(() => {
            if (p._activeBounty === bounty && bounty.claimedBy === playerId) {
                p._activeBounty = null; bounty.claimedBy = null;
                socket.emit('bounty_result', { msg: '현상금 시간 초과! 실패' });
            }
        }, 300000);
    });

    // ── 현상금 목록 ──

    // --- get_bounties ---
    socket.on('get_bounties', () => {
        socket.emit('bounty_update', bountyBoard.map(b => ({ targetName: b.targetName, reward: b.reward, claimed: !!b.claimedBy })));
    });

    // ── 몬스터 도감 ──

}

module.exports = { registerEconomyConnectionHandlers };

// inventory connection handlers (split from connection.js)

function registerInventoryConnectionHandlers(socket, $) {
    const {
        players, io, savePlayer, recalcStats, trackQuest, getZone, EQUIPMENT_SLOTS, EQUIP_STATS,
        GRADE_INFO, TRADE_GOODS, TRADEABLE_ITEMS, applyBuff, MAX_GOLD, MAX_DIAMONDS, getEnchantBonus, capResources,
        generateRandomOptions, codexDiscover, handleRaidFinish, finishBossRush, clans, bossRushSessions, RUNES, RUNE_WORDS,
        BUFF_TYPES,
    } = $;
    // --- get_inventory ---
    socket.on('get_inventory', () => {
        const p = players[playerId];
        if (!p) return;
        // 장비 정보 병합 (등급, 귀속 포함)
        const mergedItems = { ...TRADEABLE_ITEMS };
        for (const [eqId, eq] of Object.entries(EQUIP_STATS)) {
            if (!mergedItems[eqId]) mergedItems[eqId] = {};
            mergedItems[eqId].name = eq.name;
            mergedItems[eqId].grade = eq.grade;
            mergedItems[eqId].bound = eq.bound || false;
        }
        socket.emit('inventory_data', {
            inventory: p.inventory || {},
            items: mergedItems,
            enchantLevels: p.enchantLevels || {},
            equipped: p.equipped || {},
        });
    });

    // ── 퀘스트 목록/진행도 ──

    // --- equip_item ---
    socket.on('equip_item', (itemId) => {
        const p = players[playerId];
        if (!p || !p.inventory || !p.inventory[itemId]) return;
        const eq = EQUIP_STATS[itemId];
        if (!eq || !eq.slot) return;
        // 등급별 레벨 요구
        const gradeReq = GRADE_INFO[eq.grade]?.levelReq || 1;
        if (p.level < gradeReq) {
            socket.emit('equip_result', { success: false, msg: `Lv.${gradeReq} 이상 필요 (현재 Lv.${p.level})` });
            return;
        }

        if (!p.equipped) p.equipped = {};
        // 기존 장비 해제 → 인벤토리로
        if (p.equipped[eq.slot]) {
            const old = p.equipped[eq.slot];
            p.inventory[old] = (p.inventory[old]||0) + 1;
        }
        // 새 장비 착용
        p.equipped[eq.slot] = itemId;
        p.inventory[itemId]--;
        if (p.inventory[itemId] <= 0) delete p.inventory[itemId];

        // 스탯 재계산
        recalcStats(p);
        savePlayer(p);
        socket.emit('equip_result', { success:true, msg:`${eq.name} 착용!`, equipped: p.equipped });
        io.emit('player_update', p);
    });

    // ── 장비 자동 최적화 (인벤토리에서 슬롯별 최고 등급 장비 자동 장착) ──

    // --- auto_equip_best ---
    socket.on('auto_equip_best', () => {
        const p = players[playerId];
        if (!p) return;
        if (!p.inventory) p.inventory = {};
        if (!p.equipped) p.equipped = {};

        // 등급 점수 (높을수록 좋음)
        const gradeScore = { normal:1, uncommon:2, rare:3, epic:4, legendary:5 };

        // 슬롯별 후보 수집 (장착 중 + 인벤토리)
        const bestPerSlot = {}; // { slot: { itemId, score } }

        const evaluateItem = (itemId) => {
            const eq = EQUIP_STATS[itemId];
            if (!eq || !eq.slot) return;
            // 레벨 제한 체크
            const gradeReq = GRADE_INFO[eq.grade]?.levelReq || 1;
            if (p.level < gradeReq) return;
            // 점수: 등급 * 100 + 강화레벨 + atk + def
            const enchant = (p.enchantLevels && p.enchantLevels[itemId]) || 0;
            const score = (gradeScore[eq.grade] || 1) * 1000 + enchant * 10 + (eq.atk || 0) + (eq.def || 0);
            const cur = bestPerSlot[eq.slot];
            if (!cur || score > cur.score) {
                bestPerSlot[eq.slot] = { itemId, score };
            }
        };

        // 1) 인벤토리 평가
        for (const itemId of Object.keys(p.inventory)) {
            if (p.inventory[itemId] > 0) evaluateItem(itemId);
        }
        // 2) 장착 중도 평가 (이미 장착중이면 후보 풀에 추가)
        for (const slot in p.equipped) {
            const eqId = p.equipped[slot];
            if (eqId) evaluateItem(eqId);
        }

        // 3) 슬롯별로 최고 장비로 교체
        let changed = 0;
        for (const slot in bestPerSlot) {
            const best = bestPerSlot[slot].itemId;
            if (p.equipped[slot] === best) continue; // 이미 장착중
            // 기존 장비 해제 → 인벤토리
            if (p.equipped[slot]) {
                const old = p.equipped[slot];
                p.inventory[old] = (p.inventory[old] || 0) + 1;
            }
            // 새 장비 인벤토리에서 차감 (없으면 이미 장착 중이었던 케이스)
            if (p.inventory[best] && p.inventory[best] > 0) {
                p.inventory[best]--;
                if (p.inventory[best] <= 0) delete p.inventory[best];
            }
            p.equipped[slot] = best;
            changed++;
        }

        if (changed > 0) {
            recalcStats(p);
            savePlayer(p);
            io.emit('player_update', p);
        }
        socket.emit('equip_result', { success: true, msg: `최적 장비 자동 장착! (${changed}개 슬롯 교체)`, equipped: p.equipped });
    });

    // ── 장비 해제 ──

    // --- unequip_item ---
    socket.on('unequip_item', (slot) => {
        const p = players[playerId];
        if (!p || !p.equipped || !p.equipped[slot]) return;
        if (!EQUIPMENT_SLOTS.includes(slot)) return;
        const itemId = p.equipped[slot];
        delete p.equipped[slot];
        if (!p.inventory) p.inventory = {};
        p.inventory[itemId] = (p.inventory[itemId] || 0) + 1;
        recalcStats(p);
        savePlayer(p);
        socket.emit('equip_result', { success: true, msg: `장비 해제!`, equipped: p.equipped });
        io.emit('player_update', p);
    });

    // ── 일괄 판매 (등급 이하 모두 판매) ──

    // --- bulk_sell ---
    socket.on('bulk_sell', (maxGrade) => {
        const p = players[playerId];
        if (!p || !p.inventory) return;
        const gradeOrder = ['normal','uncommon','rare','epic','legendary'];
        const maxIdx = gradeOrder.indexOf(maxGrade);
        if (maxIdx < 0) return;
        let totalGold = 0, soldCount = 0;
        for (const [itemId, qty] of Object.entries({ ...p.inventory })) {
            const eq = EQUIP_STATS[itemId];
            if (!eq) continue;
            const idx = gradeOrder.indexOf(eq.grade);
            if (idx >= 0 && idx <= maxIdx) {
                // 장착 중인 아이템 제외
                if (p.equipped && Object.values(p.equipped).includes(itemId)) continue;
                const price = Math.floor((TRADEABLE_ITEMS[itemId]?.basePrice || 50) * qty * 0.6);
                totalGold += price;
                soldCount += qty;
                delete p.inventory[itemId];
            }
        }
        if (soldCount > 0) {
            p.gold += totalGold;
            capResources(p);
            savePlayer(p);
            socket.emit('bulk_sell_result', { msg: `${soldCount}개 장비 일괄 판매! +${totalGold}G`, count: soldCount, gold: totalGold });
            io.emit('player_update', p);
        } else {
            socket.emit('bulk_sell_result', { msg: '판매할 장비가 없습니다' });
        }
    });

    // ── 장비 분해 (장비 → 재료) ──

    // --- dismantle_item ---
    socket.on('dismantle_item', (itemId) => {
        const p = players[playerId];
        if (!p || !p.inventory || !p.inventory[itemId]) return;
        const eq = EQUIP_STATS[itemId];
        if (!eq) return;
        if (p.equipped && Object.values(p.equipped).includes(itemId)) {
            socket.emit('dismantle_result', { msg: '장착 중인 장비는 분해 불가' }); return;
        }
        p.inventory[itemId]--;
        if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
        // 등급별 재료 반환
        if (!p.inventory) p.inventory = {};
        const matRewards = { normal: {mat_iron:2}, uncommon: {mat_iron:5,mat_magic:1}, rare: {mat_magic:3,mat_soul:1}, epic: {mat_soul:3,mat_dragon:1}, legendary: {mat_dragon:3,mat_soul:5} };
        const mats = matRewards[eq.grade] || {mat_iron:1};
        let matMsg = [];
        for (const [mat, qty] of Object.entries(mats)) {
            p.inventory[mat] = (p.inventory[mat]||0) + qty;
            matMsg.push(mat.replace('mat_','') + ' x' + qty);
        }
        savePlayer(p);
        socket.emit('dismantle_result', { msg: `${eq.name} 분해! → ${matMsg.join(', ')}` });
        io.emit('player_update', p);
    });

    // ── 웨이포인트 텔레포트 (방문한 마을로 무료 이동) ──

    // --- enchant_item ---
    socket.on('enchant_item', (data) => {
        const p = players[playerId];
        if (!p) return;
        if (!p.equipped) p.equipped = {};

        const itemId = typeof data === 'string' ? data : data.itemId;
        const useProtect = typeof data === 'object' ? data.useProtect : false;

        const eq = EQUIP_STATS[itemId];
        if (!eq) { socket.emit('enchant_result', { success: false, msg: '강화 불가' }); return; }
        // 장착 중인 장비만 강화 가능
        const isEquipped = p.equipped && Object.values(p.equipped).includes(itemId);
        if (!isEquipped) { socket.emit('enchant_result', { success: false, msg: '장비를 먼저 착용하세요' }); return; }

        const gradeInfo = GRADE_INFO[eq.grade] || GRADE_INFO.normal;
        if (!p.enchantLevels) p.enchantLevels = {};
        const curLevel = p.enchantLevels[itemId] || 0;
        if (curLevel >= gradeInfo.maxEnchant) {
            socket.emit('enchant_result', { success: false, msg: `최대 강화(+${gradeInfo.maxEnchant})` });
            return;
        }

        // 강화 비용 (단계별 증가)
        const cost = curLevel < 3 ? (curLevel+1)*200 : curLevel < 7 ? (curLevel+1)*350 : curLevel < 10 ? (curLevel+1)*500 : (curLevel+1)*800;
        if (p.gold < cost) { socket.emit('enchant_result', { success: false, msg: `골드 부족 (${cost}G 필요)` }); return; }
        p.gold -= cost;

        // 보호 주문서 사용 체크
        let hasProtect = false;
        if (useProtect && p.inventory && p.inventory['protect_scroll'] > 0) {
            hasProtect = true;
            p.inventory['protect_scroll']--;
        }

        // 축복 주문서 보너스 체크
        let blessBonus = 0;
        if (p.inventory && p.inventory['bless_scroll'] > 0) {
            blessBonus = 10;
            p.inventory['bless_scroll']--;
        }

        // 성공 확률 (기획서 기준: +1~3: 100%, +4~7: 80%, +8~10: 50%, +11~15: 30%)
        const rates = [100,100,100,80,80,80,80,50,50,50,30,30,30,30,30]; // +1~+15
        const rate = Math.min(100, (rates[curLevel] || 30) + blessBonus);
        const roll = Math.random() * 100;

        if (roll < rate) {
            // 잭팟 판정: 1% 기적 (MAX) / 5% 대성공 (+2)
            const jackpotRoll = Math.random();
            let enchantGain = 1;
            let jackpotMsg = '';
            if (jackpotRoll < 0.01 && curLevel < gradeInfo.maxEnchant - 1) {
                enchantGain = gradeInfo.maxEnchant - curLevel; // MAX까지
                jackpotMsg = '기적!';
                io.emit('server_msg', { msg: `[기적!] ${p.displayName}: ${eq.name} +${gradeInfo.maxEnchant} 달성!!! 🌟`, type: 'boss' });
            } else if (jackpotRoll < 0.06 && curLevel + 2 <= gradeInfo.maxEnchant) {
                enchantGain = 2;
                jackpotMsg = '대성공!';
            }
            p.enchantLevels[itemId] = Math.min(gradeInfo.maxEnchant, curLevel + enchantGain);
            recalcStats(p);
            const newLevel = p.enchantLevels[itemId];
            const announce = newLevel >= 10 ? 'rare' : newLevel >= 7 ? 'normal' : null;
            if (announce && !jackpotMsg) io.emit('server_msg', { msg: `${p.displayName}: ${eq.name} +${newLevel} 강화 성공!`, type: announce });
            socket.emit('enchant_result', { success: true, msg: `${jackpotMsg || ''} ${eq.name} +${newLevel} 성공!${enchantGain > 1 ? ' (+' + enchantGain + '!)' : ''} (${rate}%)`, jackpot: jackpotMsg || null });
        } else if (curLevel >= 10) {
            // +11 이상 실패 시 파괴 (보호 주문서로 방지 가능)
            if (hasProtect) {
                socket.emit('enchant_result', { success: false, msg: `강화 실패! 보호 주문서로 파괴 방지 (+${curLevel} 유지)` });
            } else {
                delete p.enchantLevels[itemId];
                if (p.equipped) {
                    for (const slot of EQUIPMENT_SLOTS) { if (p.equipped[slot] === itemId) delete p.equipped[slot]; }
                }
                if (p.inventory) delete p.inventory[itemId];
                recalcStats(p);
                io.emit('server_msg', { msg: `${p.displayName}: ${eq.name} +${curLevel+1} 강화 실패! 장비 파괴!`, type: 'danger' });
                socket.emit('enchant_result', { success: false, msg: `${eq.name} 파괴됨!!! (${rate}% 실패)` });
            }
        } else if (curLevel >= 7) {
            // +8~10 실패 시 -1 단계
            p.enchantLevels[itemId] = Math.max(0, curLevel - 1);
            recalcStats(p);
            socket.emit('enchant_result', { success: false, msg: `강화 실패 (${rate}%) — +${curLevel-1}로 하락` });
        } else {
            // +4~7 실패 시 등급 유지
            socket.emit('enchant_result', { success: false, msg: `강화 실패 (${rate}%) — 등급 유지` });
        }

        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 포션 단축키 사용 (인벤토리 즉시 소모 + HP/MP 회복) ──

    // --- compare_equip ---
    socket.on('compare_equip', (itemId) => {
        const p = players[playerId];
        if (!p) return;
        const newEq = EQUIP_STATS[itemId];
        if (!newEq) return;
        const curId = p.equipped?.[newEq.slot];
        const curEq = curId ? EQUIP_STATS[curId] : null;
        const curEnchant = curId && p.enchantLevels?.[curId] ? p.enchantLevels[curId] : 0;
        const newEnchant = p.enchantLevels?.[itemId] || 0;
        const curGrade = curEq ? GRADE_INFO[curEq.grade] : null;
        const newGrade = GRADE_INFO[newEq.grade];

        const curAtk = curEq ? Math.floor(curEq.atk * (curGrade?.atkMulti||1) * (1+getEnchantBonus(curEnchant))) : 0;
        const curDef = curEq ? Math.floor(curEq.def * (curGrade?.defMulti||1) * (1+getEnchantBonus(curEnchant))) : 0;
        const newAtk = Math.floor(newEq.atk * (newGrade?.atkMulti||1) * (1+getEnchantBonus(newEnchant)));
        const newDef = Math.floor(newEq.def * (newGrade?.defMulti||1) * (1+getEnchantBonus(newEnchant)));

        socket.emit('equip_compare', {
            slot: newEq.slot, itemId,
            current: curEq ? { name: curEq.name, grade: curEq.grade, enchant: curEnchant, atk: curAtk, def: curDef } : null,
            new: { name: newEq.name, grade: newEq.grade, enchant: newEnchant, atk: newAtk, def: newDef },
            atkDiff: newAtk - curAtk, defDiff: newDef - curDef,
        });
    });


    // --- fuse_equipment ---
    socket.on('fuse_equipment', (data) => {
        const p = players[playerId];
        if (!p) return;
        const { item1, item2, item3 } = data;
        if (!p.inventory) return;
        const items = [item1, item2, item3];
        // 3개 모두 보유 확인
        for (const it of items) {
            if (!p.inventory[it] || p.inventory[it] <= 0) { socket.emit('fuse_result', { msg: '재료 부족' }); return; }
        }
        // 같은 등급 확인
        const grades = items.map(it => EQUIP_STATS[it]?.grade);
        if (!grades[0] || grades[0] !== grades[1] || grades[1] !== grades[2]) { socket.emit('fuse_result', { msg: '같은 등급 장비 3개 필요' }); return; }
        const gradeOrder = ['normal','uncommon','rare','epic','legendary'];
        const curIdx = gradeOrder.indexOf(grades[0]);
        if (curIdx >= gradeOrder.length - 1) { socket.emit('fuse_result', { msg: '전설 등급은 합성 불가' }); return; }
        const nextGrade = gradeOrder[curIdx + 1];
        const fuseCosts = { normal:500, uncommon:2000, rare:5000, epic:15000 };
        const cost = fuseCosts[grades[0]] || 500;
        if (p.gold < cost) { socket.emit('fuse_result', { msg: `골드 부족 (${cost}G 필요)` }); return; }
        p.gold -= cost;
        // 재료 소모
        for (const it of items) { p.inventory[it]--; if (p.inventory[it] <= 0) delete p.inventory[it]; }
        // 결과: 상위 등급 랜덤 장비
        const candidates = Object.entries(EQUIP_STATS).filter(([id, eq]) => eq.grade === nextGrade);
        if (candidates.length === 0) { socket.emit('fuse_result', { msg: '합성 실패' }); return; }
        const [resultId, resultEq] = candidates[Math.floor(Math.random() * candidates.length)];
        p.inventory[resultId] = (p.inventory[resultId]||0) + 1;
        // 랜덤 옵션 생성
        const gi = GRADE_INFO[nextGrade];
        if (gi && gi.randomOpts > 0) {
            if (!p.equipOptions) p.equipOptions = {};
            p.equipOptions[resultId] = generateRandomOptions(gi.randomOpts);
        }
        savePlayer(p);
        socket.emit('fuse_result', { msg: `합성 성공! ${resultEq.name} (${GRADE_INFO[nextGrade].name}) 획득!` });
        if (nextGrade === 'epic' || nextGrade === 'legendary') io.emit('server_msg', { msg: `${p.displayName}이(가) 장비 합성으로 ${resultEq.name} 획득!`, type: 'rare' });
        io.emit('player_update', p);
    });

    // ── 옵션 리롤 (100 다이아) ──

    // --- reroll_options ---
    socket.on('reroll_options', (itemId) => {
        const p = players[playerId];
        if (!p) return;
        const eq = EQUIP_STATS[itemId];
        if (!eq) { socket.emit('reroll_result', { msg: '장비 없음' }); return; }
        if (!p.equipped || !Object.values(p.equipped).includes(itemId)) { socket.emit('reroll_result', { msg: '장착 중인 장비만 리롤 가능' }); return; }
        if ((p.diamonds||0) < 100) { socket.emit('reroll_result', { msg: '다이아 100개 필요' }); return; }
        p.diamonds -= 100;
        const gi = GRADE_INFO[eq.grade];
        if (!gi || gi.randomOpts <= 0) { socket.emit('reroll_result', { msg: '이 등급은 옵션 없음' }); return; }
        if (!p.equipOptions) p.equipOptions = {};
        const oldOpts = p.equipOptions[itemId] || [];
        p.equipOptions[itemId] = generateRandomOptions(gi.randomOpts);
        recalcStats(p);
        savePlayer(p);
        socket.emit('reroll_result', { msg: `옵션 리롤 완료! (-100D)`, oldOpts, newOpts: p.equipOptions[itemId] });
        io.emit('player_update', p);
    });

    // ══════════════════════════════════════
    // ══════════════════════════════════════
    // 낚시/이모트/출석캘린더/탐험도
    // ══════════════════════════════════════

    // ── 낚시 시작 ──

    // --- inscribe_rune ---
    socket.on('inscribe_rune', (data) => {
        const p = players[playerId];
        if (!p) return;
        const { itemId, runeId } = data;
        if (!p.equipped || !Object.values(p.equipped).includes(itemId)) {
            socket.emit('rune_result', { msg: '장착 중인 장비만 룬 장착 가능' }); return;
        }
        if (!p.inventory?.[runeId] || p.inventory[runeId] <= 0) {
            socket.emit('rune_result', { msg: '룬 없음' }); return;
        }
        if (!RUNES[runeId]) { socket.emit('rune_result', { msg: '유효하지 않은 룬' }); return; }

        // 장비당 최대 3룬
        if (!p.itemRunes) p.itemRunes = {};
        if (!p.itemRunes[itemId]) p.itemRunes[itemId] = [];
        if (p.itemRunes[itemId].length >= 3) { socket.emit('rune_result', { msg: '슬롯 가득 (최대 3개)' }); return; }

        p.inventory[runeId]--;
        if (p.inventory[runeId] <= 0) delete p.inventory[runeId];
        p.itemRunes[itemId].push(runeId);

        // 룬 워드 체크
        const runes = p.itemRunes[itemId].sort().join('');
        const runeWord = RUNE_WORDS[runes];
        if (runeWord) {
            socket.emit('rune_result', { msg: `룬 워드 발동! "${runeWord.name}" — ${runeWord.desc}` });
            io.emit('server_msg', { msg: `[룬 워드] ${p.displayName}: "${runeWord.name}" 발동!`, type: 'rare' });
        } else {
            socket.emit('rune_result', { msg: `룬 ${runeId} 장착 완료 (${p.itemRunes[itemId].length}/3)` });
        }
        recalcStats(p);
        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 3. 진영 가입 ──

    // --- use_potion ---
    socket.on('use_potion', (potId) => {
        const p = players[playerId];
        if (!p || !p.isAlive || !p.inventory) return;
        const HEAL_MAP = {
            'pot_hp_s': { stat:'hp', amount:100, name:'하급 HP' },
            'pot_hp_m': { stat:'hp', amount:300, name:'중급 HP' },
            'pot_hp_l': { stat:'hp', amount:800, name:'상급 HP' },
            'mp_potion':{ stat:'mp', amount:50,  name:'MP' },
        };
        const info = HEAL_MAP[potId];
        if (!info) { socket.emit('potion_result', { success:false, msg:'알 수 없는 물약' }); return; }
        if (!p.inventory[potId] || p.inventory[potId] <= 0) { socket.emit('potion_result', { success:false, msg:`${info.name} 물약 없음` }); return; }
        // 쿨다운 (1초)
        const now = Date.now();
        if (p._lastPotionUse && now - p._lastPotionUse < 1000) return;
        p._lastPotionUse = now;
        p.inventory[potId]--;
        if (p.inventory[potId] <= 0) delete p.inventory[potId];
        if (info.stat === 'hp') p.hp = Math.min(p.maxHp, p.hp + info.amount);
        else if (info.stat === 'mp') p.mp = Math.min(p.maxMp || 100, (p.mp || 0) + info.amount);
        socket.emit('potion_result', { success:true, msg:`${info.name} +${info.amount}`, hp:p.hp, mp:p.mp });
        io.emit('player_update', p);
    });

    // ── 자동 스킬 토글 ──

    // --- set_auto_dismantle ---
    socket.on('set_auto_dismantle', (val) => {
        const p = players[playerId];
        if (p) p.autoDismantle = !!val;
    });

    // ── 길드 채팅 ──

    // --- set_title ---
    socket.on('set_title', (titleId) => {
        const p = players[playerId];
        if (!p || !p.titles || !p.titles.includes(titleId)) return;
        p.activeTitle = titleId;
        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── v1.26: 행운의 룰렛 ── (v1.82: game/handlers/lottery_handlers.js로 분리)
    registerLotteryHandlers(socket, {
        io, players, playerId, savePlayer, trackQuest,
        MAX_GOLD, MAX_DIAMONDS, lottery
    });



    // ── v1.90: 일기장 ──
    registerDiaryHandlers(socket, { players, playerId, diary });

    // ── v1.91: 명상 ──
    registerMeditationHandlers(socket, { io, players, playerId, savePlayer, meditation });

    // ── v1.92: 요리 ──
    registerCookingHandlers(socket, { io, players, playerId, savePlayer, cooking });

    // ── v1.93: 별자리 ──
    registerConstellationHandlers(socket, { io, players, playerId, savePlayer, constellation });

    // ── v1.94: 기상 ──
    registerWeatherHandlers(socket, { io, players, playerId, savePlayer, weather });

    // ── v1.95: 보석 세공 ──
    registerGemcraftHandlers(socket, { io, players, playerId, savePlayer, gemcraft });

    // ── v1.96: 신탁 ──
    registerOracleHandlers(socket, { io, players, playerId, savePlayer, oracle });

    // ── v1.97: 채집 ──
    registerGatheringHandlers(socket, { io, players, playerId, savePlayer, gathering });

    // ── v1.98: 제련 ──
    registerForgeHandlers(socket, { io, players, playerId, savePlayer, forge });

    // ── v1.99: 위인 전당 ──
    registerLegendsHandlers(socket, { io, players, playerId, savePlayer, legends });

    // ── v2.0: 보너스 집계 ──
    registerBonusHandlers(socket, { players, playerId, bonusAggregator });

    // ── v2.01: 변신 ──
    registerMorphHandlers(socket, { io, players, playerId, savePlayer, morph });

    // ── v2.02: 차원문 ──
    registerWaypointHandlers(socket, { io, players, playerId, savePlayer, waypoint });

    // ── v2.03: 친구/우정 ──
    registerFriendsHandlers(socket, { io, players, playerId, savePlayer, friends });

    // ── v2.04: 프로필 카드 ──
    registerProfileHandlers(socket, { io, players, playerId, savePlayer, profile });

    // ── v2.05: 카지노 ──
    registerCasinoHandlers(socket, { io, players, playerId, savePlayer, casino });

    // ── v2.06: 이모트 ──
    registerEmoteHandlers(socket, { io, players, playerId, savePlayer, emote });

    // ── v2.07: 미궁 ──
    registerLabyrinthHandlers(socket, { io, players, playerId, savePlayer, labyrinth });

    // ── v2.08: 항해 ──
    registerSailingHandlers(socket, { io, players, playerId, savePlayer, sailing });

    // ── v2.09: 유물 발굴 ──
    registerExcavationHandlers(socket, { io, players, playerId, savePlayer, excavation });

    // ── v2.10: 꿈 ──
    registerDreamHandlers(socket, { io, players, playerId, savePlayer, dream });

    // ── v2.11: 음악/연주 ──
    registerMusicHandlers(socket, { io, players, playerId, savePlayer, music });

    // ── v2.12: 타로 ──
    registerTarotHandlers(socket, { io, players, playerId, savePlayer, tarot });

    // ── v2.13: 부적 ──
    registerTalismanHandlers(socket, { io, players, playerId, savePlayer, talisman });

    // ── v2.14: 소원의 우물 ──
    registerWishingWellHandlers(socket, { io, players, playerId, savePlayer, wishingWell });

    // ── v2.15: 가면 ──
    registerMaskHandlers(socket, { io, players, playerId, savePlayer, mask });

    // ── v2.16: 가문 문장 ──
    registerHeraldryHandlers(socket, { io, players, playerId, savePlayer, heraldry });

    // ── v2.17: 차원 균열 ──
    registerRiftHandlers(socket, { io, players, playerId, savePlayer, rift });

    // ── v2.18: 정원 ──
    registerGardenHandlers(socket, { io, players, playerId, savePlayer, garden });

    // ── v1.62 ~ v1.81: 잡다 핸들러 일괄 등록 (v1.89: handlers/misc_handlers.js)
    registerMiscHandlers(socket, {
        io, players, playerId, savePlayer, MAX_GOLD,
        statistics, timeCapsule, invitation, honor, passport, aura, dashboard,
        inn, territory, blueprint, contracts, newsBoard, blessing, library, wisdom,
        dungeonKeys, lotteryJackpot, titleCollection, guildWar, pvpTournament,
        clans, getZone,
    });

    // ── v1.61: 동료 ── (v1.88: handlers/companion_handlers.js)
    registerCompanionHandlers(socket, { io, players, playerId, savePlayer, companion });

    // ── v1.60: 월드 이벤트 ── (v1.88: handlers/world_event_handlers.js)
    registerWorldEventHandlers(socket, { worldEvent });

    // ── v1.59: 우체국 ── (v1.88: handlers/postoffice_handlers.js)
    registerPostofficeHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, postoffice, getZone });

    // ── v1.58: 트랜스모그 ── (v1.88: handlers/transmog_handlers.js)
    registerTransmogHandlers(socket, { io, players, playerId, savePlayer, transmog });

    // ── v1.57: 일일 운세 ── (v1.88: handlers/fortune_handlers.js)
    registerFortuneHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, fortune });

    // ── v1.56: 장비 보험 ── (v1.88: handlers/insurance_handlers.js)
    registerInsuranceHandlers(socket, { io, players, playerId, savePlayer, insurance });

    // ── v1.55: 원정 ── (v1.87: handlers/expedition_handlers.js)
    registerExpeditionHandlers(socket, { io, players, playerId, savePlayer, expedition });

    // ── v1.54: 레이드 ── (v1.87: handlers/raid_handlers.js)
    registerRaidHandlers(socket, { io, players, playerId, savePlayer, raid, handleRaidFinish });

    // ── v1.53: 변환 ── (v1.87: handlers/transmutation_handlers.js)
    registerTransmutationHandlers(socket, { io, players, playerId, savePlayer, transmutation });

    // ── v1.52: 부직업 ── (v1.87: handlers/jobs_handlers.js)
    registerJobsHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, jobs });

    // ── v1.51: 암시장 ── (v1.87: handlers/black_market_handlers.js)
    registerBlackMarketHandlers(socket, {
        io, players, playerId, savePlayer, blackMarket,
        getCurrentBlackMarket: () => $.currentBlackMarket,
        setCurrentBlackMarket: (m) => { $.currentBlackMarket = m; }
    });

    // ── v1.50: 종합 랭킹 ── (v1.87: handlers/leaderboard_handlers.js)
    registerLeaderboardHandlers(socket, { players, playerId, leaderboard });

    // ── v1.49: 룬 ── (v1.86: handlers/runes_handlers.js)
    registerRunesHandlers(socket, { io, players, playerId, savePlayer, trackQuest, runes });

    // ── v1.48: 펫 교배 ── (v1.86: handlers/breeding_handlers.js)
    registerBreedingHandlers(socket, { io, players, playerId, savePlayer, breeding });

    // ── v1.47: 유물 ── (v1.86: handlers/relic_handlers.js)
    registerRelicHandlers(socket, { io, players, playerId, savePlayer, relic });

    // ── v1.46: 보물 지도 ── (v1.86: handlers/treasure_map_handlers.js)
    registerTreasureMapHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, MAX_DIAMONDS, treasureMap });

    // ── v1.45: 일일 훈련 ── (v1.86: handlers/training_handlers.js)
    registerTrainingHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, training });

    // ── v1.42: 펫 배틀 ── (v1.86: handlers/pet_battle_handlers.js)
    registerPetBattleHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, petBattle });

    // ── v1.36: 농장 ── (v1.85: handlers/farm_handlers.js)
    registerFarmHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, farm });

    // ── v1.35: 특성 트리 ── (v1.85: handlers/skill_tree_handlers.js)
    registerSkillTreeHandlers(socket, { io, players, playerId, savePlayer, skillTree });

    // ── v1.34: 우편함 ── (v1.85: handlers/mail_handlers.js)
    registerMailHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, MAX_DIAMONDS, mailbox });

    // ── v1.33: 도감 ── (v1.85: handlers/codex_handlers.js)
    registerCodexHandlers(socket, { players, playerId, savePlayer, codex, codexDiscover });

    // ── v1.32: 일일 상점 ── (v1.85: handlers/daily_shop_handlers.js)
    registerDailyShopHandlers(socket, {
        io, players, playerId, savePlayer, dailyShop,
        getTodayDailyShop: () => $.todayDailyShop,
        setTodayDailyShop: (s) => { $.todayDailyShop = s; }
    });

    // ── v1.31: 경매장 ── (v1.84: handlers/auction_handlers.js로 분리)
    registerAuctionHandlers(socket, {
        io, players, playerId, savePlayer, MAX_GOLD, auction, EQUIP_STATS, TRADE_GOODS
    });

    // ── v1.30: 보스 러시 ── (v1.84: handlers/boss_rush_handlers.js로 분리)
    registerBossRushHandlers(socket, {
        io, players, playerId, savePlayer, bossRush,
        bossRushSessions, bossRushRanking: $.bossRushRanking, finishBossRush
    });

    // ── v1.29: 시즌 패스 ── (v1.84: handlers/season_handlers.js로 분리)
    registerSeasonHandlers(socket, {
        io, players, playerId, savePlayer, MAX_GOLD, MAX_DIAMONDS, seasonPass
    });

    // ── v1.28: 시즌 축제 이벤트 ── (v1.84: handlers/event_handlers.js로 분리)
    registerEventHandlers(socket, { festival });

    // ── v1.27: 낚시 ── (v1.83: game/handlers/fishing_handlers.js로 분리)
    registerFishingHandlers(socket, {
        io, players, playerId, savePlayer, trackQuest, codexDiscover,
        getZone, isNight: $.isNight, MAX_GOLD, fishing
    });

    // ── 채팅 ──

    // --- warehouse_deposit ---
    socket.on('warehouse_deposit', (itemId) => {
        const p = players[playerId];
        if (!p || !p.inventory || !p.inventory[itemId]) return;
        if (!p.warehouse) p.warehouse = {};
        p.inventory[itemId]--;
        if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
        p.warehouse[itemId] = (p.warehouse[itemId] || 0) + 1;
        savePlayer(p);
        socket.emit('warehouse_data', { warehouse: p.warehouse, inventory: p.inventory });
    });


    // --- warehouse_withdraw ---
    socket.on('warehouse_withdraw', (itemId) => {
        const p = players[playerId];
        if (!p || !p.warehouse || !p.warehouse[itemId]) return;
        if (!p.inventory) p.inventory = {};
        p.warehouse[itemId]--;
        if (p.warehouse[itemId] <= 0) delete p.warehouse[itemId];
        p.inventory[itemId] = (p.inventory[itemId] || 0) + 1;
        savePlayer(p);
        socket.emit('warehouse_data', { warehouse: p.warehouse, inventory: p.inventory });
    });


    // --- get_warehouse ---
    socket.on('get_warehouse', () => {
        const p = players[playerId];
        if (!p) return;
        socket.emit('warehouse_data', { warehouse: p.warehouse || {}, inventory: p.inventory || {} });
    });

    // ── 몬스터 테이밍 (포켓몬) ──
    // 가장 가까운 몬스터 자동 테이밍

    // --- use_buff_item ---
    socket.on('use_buff_item', (itemId) => {
        const p = players[playerId];
        if (!p || !p.inventory || !p.inventory[itemId]) return;
        if (BUFF_TYPES[itemId]) {
            p.inventory[itemId]--;
            if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
            applyBuff(p, itemId);
            savePlayer(p);
            socket.emit('buff_result', { success:true, msg:`${BUFF_TYPES[itemId].name} 사용!` });
        }
    });

    // ── 칭호 변경 ──

}

module.exports = { registerInventoryConnectionHandlers };

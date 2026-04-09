// Connection Handler (Phase 5 refactor)
// Extracted from server.js io.on("connection") block

function registerConnection(io, $) {

io.on("connection", (socket) => {
    const playerId = socket.id;

    if (Object.keys(players).length >= MAX_PLAYERS) {
        socket.emit('server_full', { message: '서버가 가득 찼습니다.' });
        socket.disconnect();
        return;
    }

    // ── 소켓 레이트 리밋 (DoS 방어) ──
    // move/update_dir 같은 고빈도 이벤트는 카운트에서 제외.
    // 일반 이벤트는 1초당 200개까지 허용 (정상 게임플레이는 훨씬 적음).
    const _rateBucket = { count: 0, windowStart: Date.now(), strikes: 0 };
    const _highFreqEvents = new Set(['move', 'update_dir', 'throw', 'active_tap']);
    socket.use((packet, next) => {
        // 패킷 형식: [eventName, ...args]
        const eventName = Array.isArray(packet) ? packet[0] : null;
        if (_highFreqEvents.has(eventName)) { next(); return; }

        const now = Date.now();
        if (now - _rateBucket.windowStart > 1000) {
            // 윈도우 초기화 + 정상 윈도우에서는 strike도 자연 회복
            if (_rateBucket.count <= 200 && _rateBucket.strikes > 0) _rateBucket.strikes--;
            _rateBucket.count = 0;
            _rateBucket.windowStart = now;
        }
        _rateBucket.count++;
        if (_rateBucket.count > 200) {
            _rateBucket.strikes++;
            if (_rateBucket.strikes >= 5) {
                console.warn(`[rate-limit] socket ${socket.id} disconnect — ${_rateBucket.count}/s`);
                socket.disconnect(true);
            }
            return; // 패킷 드롭
        }
        next();
    });

    socket.on('init_request', async (dataStr) => {
        let selectedClass = 'Warrior';
        let deviceId = playerId;

        try {
            if (dataStr) {
                const data = JSON.parse(dataStr);
                if (data.className && CLASSES[data.className]) selectedClass = data.className;
                if (data.deviceId) deviceId = data.deviceId;
            }
        } catch(e) {}

        socket.deviceId = deviceId;

        let loadedData = null;
        try {
            const [rows] = await pool.query('SELECT * FROM players_save WHERE device_id = ?', [deviceId]);
            if (rows.length > 0) loadedData = rows[0];
        } catch(e) {}

        const cls = CLASSES[selectedClass];
        let pInfo = {
            id: playerId,
            deviceId,
            className: selectedClass,
            displayName: cls.displayName,
            x: -480 + Math.random() * 40, // 바람개비 마을 안에서 시작
            y: -480 + Math.random() * 40,
            hp: cls.maxHp,
            maxHp: cls.maxHp,
            atk: cls.atk,
            def: cls.def,
            critRate: cls.critRate,
            dodgeRate: cls.dodgeRate,
            dmgMulti: 1.0,
            dirX: 0, dirY: -1,
            gold: 0,
            diamonds: 100, // 신규 유저 보너스
            level: 1,
            exp: 0,
            isAlive: true,
            killCount: 0,
            karma: 0,
            team: 'peace',
            ownerId: null,
            targetId: null,
            isKing: false,
            isBot: false,
            skins: [],
            activeSkin: null,
            maxArmy: 30,
            inventory: { 'pot_hp_s': 5, 'scroll_return': 2 },
            // 스탯 포인트
            statPoints: 0,
            bonusStr: 0, bonusDex: 0, bonusInt: 0, bonusCon: 0,
            // MP 시스템
            mp: 100, maxMp: 100,
            // 속성
            element: ELEMENTS[Math.floor(Math.random() * 4)],
            // 전직
            isAdvanced: false, advancedClass: null,
            // 혈맹
            clanName: null,
            // 파티
            partyId: null,
            lastHpRegen: Date.now(),
            autoSkillCooldown: 0,
            // 퀘스트/도감/탐험 초기화 (신규 플레이어)
            questProgress: {},
            questCompleted: {},
            bestiary: {},
            discoveredZones: ['aden'],
            waypoints: ['aden'],
        };

        if (loadedData && loadedData.is_alive) {
            pInfo.className = loadedData.class_name;
            pInfo.displayName = CLASSES[pInfo.className]?.displayName || pInfo.className;
            pInfo.level = loadedData.level;
            pInfo.exp = loadedData.exp;
            pInfo.gold = loadedData.gold || 0;
            pInfo.killCount = loadedData.kill_count;
            pInfo.karma = loadedData.karma || 0;
            pInfo.team = loadedData.team;

            // 확장 데이터 복원
            if (loadedData.ext_data) {
                try {
                    const ext = JSON.parse(loadedData.ext_data);
                    Object.assign(pInfo, {
                        equipped: ext.equipped || {},
                        enchantLevels: ext.enchantLevels || {},
                        equipOptions: ext.equipOptions || {},
                        inventory: ext.inventory || pInfo.inventory,
                        warehouse: ext.warehouse || {},
                        diamonds: ext.diamonds || pInfo.diamonds,
                        statPoints: ext.statPoints || 0,
                        bonusStr: ext.bonusStr || 0, bonusDex: ext.bonusDex || 0,
                        bonusInt: ext.bonusInt || 0, bonusCon: ext.bonusCon || 0,
                        isAdvanced: ext.isAdvanced || false,
                        advancedClass: ext.advancedClass || null,
                        baseClassName: ext.baseClassName || null,
                        pvpWins: ext.pvpWins || 0,
                        towerHighest: ext.towerHighest || 0,
                        attendance: ext.attendance || {},
                        lastLoginDate: ext.lastLoginDate || null,
                        lastWeek: ext.lastWeek || null,
                        clanName: ext.clanName || null,
                        activePet: ext.activePet || null,
                        pets: ext.pets || [],
                        activeMount: ext.activeMount || null,
                        mounts: ext.mounts || [],
                        titles: ext.titles || [],
                        activeTitle: ext.activeTitle || null,
                        activeSkin: ext.activeSkin || null,
                        skins: ext.skins || [],
                        morphKills: ext.morphKills || {},
                        totalTamed: ext.totalTamed || 0,
                        totalTradeProfit: ext.totalTradeProfit || 0,
                        totalCrafts: ext.totalCrafts || 0,
                        dungeonClears: ext.dungeonClears || 0,
                        bestiary: ext.bestiary || {},
                        waypoints: ext.waypoints || ['aden'],
                        faction: ext.faction || null,
                        factionRep: ext.factionRep || 0,
                        prestigeLevel: ext.prestigeLevel || 0,
                        legacyPerks: ext.legacyPerks || [],
                        itemRunes: ext.itemRunes || {},
                        advanceBonus: ext.advanceBonus || null,
                        _dailyChallengeProgress: ext._dailyChallengeProgress || 0,
                        _dailyChallengeCompleted: ext._dailyChallengeCompleted || false,
                        _dailyChallengeClaimed: ext._dailyChallengeClaimed || false,
                        _weeklyChallengeWeek: ext._weeklyChallengeWeek || null,
                        _weeklyChallengeProgress: ext._weeklyChallengeProgress || 0,
                        _weeklyChallengeClaimed: ext._weeklyChallengeClaimed || false,
                        discoveredZones: ext.discoveredZones || [],
                        fishingLevel: ext.fishingLevel || 1,
                        _fishCount: ext._fishCount || 0,
                        maxArmy: ext.maxArmy || 30,
                        autoPotion: ext.autoPotion || false,
                        questProgress: ext.questProgress || {},
                        questCompleted: ext.questCompleted || {},
                    });
                    if (pInfo.isAdvanced && pInfo.advancedClass) {
                        const adv = CLASS_ADVANCE[pInfo.baseClassName || pInfo.className];
                        if (adv) pInfo.displayName = adv.displayName;
                    }
                } catch(e) {
                    console.error(`[ext_data parse 실패] device=${pInfo.deviceId} player=${pInfo.displayName||'?'}: ${e.message}`);
                }
            }

            const baseCls = CLASSES[pInfo.baseClassName || pInfo.className] || CLASSES[pInfo.className];
            // recalcStats로 장비/스탯 포인트 포함 전체 재계산
            pInfo.atk = baseCls.atk;
            pInfo.def = baseCls.def;
            pInfo.critRate = baseCls.critRate;
            pInfo.dodgeRate = baseCls.dodgeRate;
            pInfo.maxHp = baseCls.maxHp + (pInfo.level - 1) * 25;
            pInfo.dmgMulti = 1.0 + (pInfo.level - 1) * 0.08;

            if (pInfo.team.startsWith('king_')) {
                pInfo.isKing = true;
                pInfo.maxHp = Math.floor(pInfo.maxHp * 1.8);
                pInfo.hp = pInfo.maxHp;
                pInfo.dmgMulti *= 2.0;
            }

            // 군대 복구
            if (loadedData.army_data) {
                let savedArmy = [];
                try {
                    savedArmy = typeof loadedData.army_data === 'string'
                        ? JSON.parse(loadedData.army_data) : loadedData.army_data;
                } catch(e) {}

                savedArmy.forEach(bot => {
                    $.entityIdCounter++;
                    const botId = 'bot_restored_' + $.entityIdCounter;
                    const botCls = CLASSES[bot.className] || CLASSES['Warrior'];
                    players[botId] = {
                        id: botId, deviceId: 'bot',
                        className: bot.className,
                        displayName: botCls.displayName,
                        x: bot.x, y: bot.y,
                        hp: bot.hp, maxHp: bot.maxHp,
                        atk: botCls.atk, def: botCls.def,
                        critRate: botCls.critRate, dodgeRate: botCls.dodgeRate,
                        dmgMulti: pInfo.dmgMulti,
                        dirX: 0, dirY: -1,
                        gold: 0, level: bot.level || 1, exp: 0,
                        isAlive: true, killCount: 0, karma: 0,
                        team: pInfo.team,
                        ownerId: pInfo.id,
                        targetId: null,
                        isKing: false, isBot: true,
                        lastHpRegen: Date.now(), autoSkillCooldown: 0
                    };
                    socket.broadcast.emit('player_join', players[botId]);
                });
            }
        } else {
            savePlayer(pInfo);
        }

        // 장비/스탯 포인트 포함 전체 스탯 재계산
        recalcStats(pInfo);
        pInfo.hp = pInfo.maxHp;

        players[playerId] = pInfo;

        // ── 오프라인 우편함 배달 ──
        // 1) DB에서 우편 조회 + 삭제
        (async () => {
            try {
                const [dbMails] = await pool.query('SELECT id, from_name, item_id, item_count, gold FROM mails WHERE target_name = ? ORDER BY id ASC LIMIT 50', [pInfo.displayName]);
                if (dbMails && dbMails.length > 0) {
                    let totalGold = 0, itemSummary = [];
                    if (!pInfo.inventory) pInfo.inventory = {};
                    const idsToDelete = [];
                    for (const m of dbMails) {
                        if (m.gold > 0) { pInfo.gold += m.gold; totalGold += m.gold; }
                        if (m.item_id && m.item_count > 0) {
                            pInfo.inventory[m.item_id] = (pInfo.inventory[m.item_id] || 0) + m.item_count;
                            itemSummary.push(`${m.item_id} x${m.item_count}`);
                        }
                        idsToDelete.push(m.id);
                    }
                    if (idsToDelete.length > 0) {
                        await pool.query(`DELETE FROM mails WHERE id IN (${idsToDelete.map(() => '?').join(',')})`, idsToDelete);
                    }
                    capResources(pInfo);
                    savePlayer(pInfo);
                    socket.emit('mail_delivered', {
                        count: dbMails.length,
                        gold: totalGold,
                        items: itemSummary,
                        msg: `📬 우편함 ${dbMails.length}건 배달됨!${totalGold ? ' +'+totalGold+'G' : ''}${itemSummary.length ? ' / '+itemSummary.join(', ') : ''}`
                    });
                }
            } catch (e) { console.error('[DB] mail deliver:', e.message); }
        })();
        // 2) 메모리 fallback (DB 실패 시 보관된 것들)
        if (pendingMails[pInfo.displayName] && pendingMails[pInfo.displayName].length > 0) {
            const mails = pendingMails[pInfo.displayName];
            let totalGold = 0, itemSummary = [];
            if (!pInfo.inventory) pInfo.inventory = {};
            for (const m of mails) {
                if (m.gold > 0) { pInfo.gold += m.gold; totalGold += m.gold; }
                if (m.itemId && m.itemCount > 0) {
                    pInfo.inventory[m.itemId] = (pInfo.inventory[m.itemId] || 0) + m.itemCount;
                    itemSummary.push(`${m.itemId} x${m.itemCount}`);
                }
            }
            delete pendingMails[pInfo.displayName];
            capResources(pInfo);
            socket.emit('mail_delivered', {
                count: mails.length,
                gold: totalGold,
                items: itemSummary,
                msg: `📬 우편함(메모리) ${mails.length}건 배달됨!${totalGold ? ' +'+totalGold+'G' : ''}${itemSummary.length ? ' / '+itemSummary.join(', ') : ''}`
            });
        }

        // ── 출석 체크 & 일일/주간 퀘스트 초기화 ──
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const thisWeek = getWeekNumber();
        if (!pInfo.lastLoginDate || pInfo.lastLoginDate !== today) {
            // 일일 퀘스트 진행도 초기화
            if (pInfo.questProgress) {
                for (const [qId, q] of Object.entries(QUESTS)) {
                    if (q.type === 'daily') { pInfo.questProgress[qId] = 0; if (pInfo.questCompleted) delete pInfo.questCompleted[qId]; }
                }
            }
            // 출석 체크 보상
            if (!pInfo.attendance) pInfo.attendance = { streak: 0, lastDate: null };
            if (pInfo.attendance.lastDate === getYesterday()) {
                pInfo.attendance.streak++;
            } else if (pInfo.attendance.lastDate !== today) {
                pInfo.attendance.streak = 1;
            }
            pInfo.attendance.lastDate = today;
            const streak = pInfo.attendance.streak;
            const attendReward = { gold: 50 * streak, diamonds: streak >= 7 ? 30 : 10, exp: 100 * streak };
            pInfo.gold += attendReward.gold;
            pInfo.diamonds = (pInfo.diamonds || 0) + attendReward.diamonds;
            giveExp(pInfo, attendReward.exp);
            socket.emit('attendance_reward', { streak, reward: attendReward, msg: `출석 ${streak}일차! +${attendReward.gold}G, +${attendReward.diamonds}D` });
            if (streak === 7) {
                socket.emit('attendance_reward', { streak: 7, msg: '7일 연속 출석! 희귀 상자 지급!' });
                if (!pInfo.inventory) pInfo.inventory = {};
                pInfo.inventory['rare_box'] = (pInfo.inventory['rare_box'] || 0) + 1;
            }
            pInfo.lastLoginDate = today;
            // 일일 챌린지 리셋
            pInfo._dailyChallengeProgress = 0;
            pInfo._dailyChallengeCompleted = false;
            pInfo._dailyChallengeClaimed = false;
            // 아레나 일일 횟수 초기화
            pInfo.arenaCountToday = 0;
        }
        // 주간 퀘스트 초기화
        if (!pInfo.lastWeek || pInfo.lastWeek !== thisWeek) {
            if (pInfo.questProgress) {
                for (const [qId, q] of Object.entries(QUESTS)) {
                    if (q.type === 'weekly') { pInfo.questProgress[qId] = 0; if (pInfo.questCompleted) delete pInfo.questCompleted[qId]; }
                }
            }
            pInfo.lastWeek = thisWeek;
        }

        socket.emit('init', {
            id: playerId,
            players,
            axes,
            aoes,
            monsters,
            drops,
            classInfo: CLASSES,
            karmaInfo: KARMA,
            monsterTiers: MONSTER_TIERS,
            mountSpeed: getMountSpeed(pInfo),
            gradeInfo: GRADE_INFO,
            barriers: TERRAIN_BARRIERS,
            roads: ROADS,
            zoneConnections: ZONE_CONNECTIONS,
        });

        socket.broadcast.emit('player_join', players[playerId]);

        // ── 신규 플레이어 온보딩 가이드 ──
        if (pInfo.level <= 1 && !pInfo.questProgress?.main_hunt1) {
            setTimeout(() => {
                socket.emit('guide_msg', { step: 1, msg: '환영합니다! 마을 밖 이슬숲에서 슬라임을 사냥해보세요.', target: 'forest' });
                setTimeout(() => {
                    socket.emit('guide_msg', { step: 2, msg: '자동 전투 중입니다. 몬스터 근처로 이동하면 자동 공격합니다.' });
                }, 8000);
                setTimeout(() => {
                    socket.emit('guide_msg', { step: 3, msg: '하단 메뉴에서 장비/스킬/퀘스트를 확인할 수 있습니다.' });
                }, 16000);
            }, 2000);
        } else if (pInfo.level <= 5) {
            setTimeout(() => {
                const zone = getZone(pInfo.x, pInfo.y);
                const safeZone = zone && ZONES[zone.id]?.safe;
                if (safeZone) socket.emit('guide_msg', { msg: `Lv.${pInfo.level} — 마을 밖으로 나가서 사냥을 시작하세요!` });
            }, 3000);
        }
        // 접속 시 현재 퀘스트 진행도 알림
        if (pInfo.questProgress) {
            for (const [qId, q] of Object.entries(QUESTS)) {
                if (q.type === 'daily' && !(pInfo.questCompleted?.[qId])) {
                    const prog = pInfo.questProgress[qId] || 0;
                    if (prog > 0 && prog < q.goal) {
                        setTimeout(() => {
                            socket.emit('quest_progress', { name: q.name, current: prog, goal: q.goal, remaining: q.goal - prog });
                        }, 4000);
                        break;
                    }
                }
            }
        }
        // ── 환영 메시지 (복귀 유저) ──
        if (pInfo.level > 1 && loadedData) {
            setTimeout(() => {
                socket.emit('welcome_back', {
                    level: pInfo.level, kills: pInfo.killCount || 0, gold: pInfo.gold,
                    prestige: pInfo.prestigeLevel || 0,
                });
            }, 1500);
        }
        // ── 추천 존 ──
        setTimeout(() => {
            let bestZone = null, bestBonus = 0;
            for (const [zId, z] of Object.entries(ZONES)) {
                if (z.safe || z.isCastle || z.isArena) continue;
                if (pInfo.level >= z.lvl[0] && pInfo.level <= z.lvl[1]) {
                    const zm = ZONE_MONSTERS[zId];
                    const bonus = zm ? (zm.expBonus || 0) + (zm.goldBonus || 0) : 0;
                    if (bonus > bestBonus) { bestBonus = bonus; bestZone = { name: z.name, lvl: z.lvl }; }
                }
            }
            if (bestZone) socket.emit('recommend_zone', { name: bestZone.name, lvl: bestZone.lvl, bonus: Math.floor(bestBonus * 100) });
        }, 5000);
    });

    socket.on('move', (data) => {
        try {
            const moveData = JSON.parse(data);
            const p = players[playerId];
            if (!p || !p.isAlive || p.isBot) return;
            const nx = parseFloat(moveData.x), ny = parseFloat(moveData.y);
            if (!isFinite(nx) || !isFinite(ny)) return;
            // 이동 거리 검증 (텔레포트 핵 방지 + 도로 보너스)
            const onRoad = isOnRoad(p.x, p.y);
            let maxDist = onRoad ? 3.6 : 3;
            // 날씨 속도 보정
            if ($.currentWeather.effect?.spdDown) maxDist *= (1 - $.currentWeather.effect.spdDown);
            // 슬로우 지형 (숲/늪)
            maxDist *= isSlowTerrain(nx, ny);
            const dist = Math.hypot(nx - p.x, ny - p.y);
            if (dist > maxDist) return;
            // 지형 장벽 충돌 체크
            const barrier = isBlocked(nx, ny);
            if (barrier) {
                // 장벽에 부딪히면 이동 취소 (현재 위치 유지)
                return;
            }
            // 맵 범위 제한
            p.x = Math.max(-1020, Math.min(1020, nx));
            p.y = Math.max(-1020, Math.min(1020, ny));
            if (moveData.dirX !== undefined) p.dirX = moveData.dirX;
            if (moveData.dirY !== undefined) p.dirY = moveData.dirY;
            // 존 레벨 경고
            const curZone = getZone(p.x, p.y);
            if (curZone && ZONES[curZone.id]) {
                const zLvl = ZONES[curZone.id].lvl;
                const prevZoneId = p._lastZoneId;
                if (prevZoneId !== curZone.id) {
                    p._lastZoneId = curZone.id;
                    if (p.level < zLvl[0]) {
                        socket.emit('server_msg', { msg: `경고: ${ZONES[curZone.id].name}은(는) Lv.${zLvl[0]}+ 추천 구역입니다! (현재 Lv.${p.level})`, type: 'danger' });
                    }
                    // 마을 첫 방문 시 웨이포인트 자동 등록
                    if (ZONES[curZone.id].safe) {
                        if (!p.waypoints) p.waypoints = ['aden'];
                        if (!p.waypoints.includes(curZone.id)) {
                            p.waypoints.push(curZone.id);
                            socket.emit('server_msg', { msg: `[웨이포인트] ${ZONES[curZone.id].name} 등록! 이제 어디서든 이동 가능`, type: 'normal' });
                            giveExp(p, 10);
                        }
                    }
                    // 존 분위기 텍스트
                    const ambience = ZONE_AMBIENCE[curZone.id];
                    if (ambience) socket.emit('zone_ambient', { text: ambience, zone: ZONES[curZone.id].name });
                    // 탐험도 자동 등록
                    if (!p.discoveredZones) p.discoveredZones = [];
                    if (!p.discoveredZones.includes(curZone.id)) {
                        p.discoveredZones.push(curZone.id);
                        const total = Object.keys(ZONES).length;
                        const pct = Math.floor(p.discoveredZones.length / total * 100);
                        socket.emit('zone_discovered', { zone: ZONES[curZone.id].name, discovered: p.discoveredZones.length, total, pct });
                        giveExp(p, 5);
                        if (pct === 25) { p.gold += 1000; socket.emit('server_msg', { msg: '[탐험] 25% 달성! +1000G', type: 'rare' }); }
                        if (pct === 50) { p.diamonds = (p.diamonds||0) + 50; socket.emit('server_msg', { msg: '[탐험] 50% 달성! +50D', type: 'rare' }); }
                        if (pct === 75) { p.diamonds = (p.diamonds||0) + 100; socket.emit('server_msg', { msg: '[탐험] 75% 달성! +100D', type: 'rare' }); }
                        if (pct >= 100) { io.emit('server_msg', { msg: `[탐험] ${p.displayName}이(가) 전 지역 탐험 완료!`, type: 'boss' }); }
                    }
                }
            }
        } catch(e) {}
    });

    // PvP 토글 (카오틱/킹 시스템)
    // ── NPC 상호작용 ──
    socket.on('interact_npc', (npcType) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;

        // 마을 안에 있는지 체크
        const zone = getZone(p.x, p.y);
        if (!zone || !ZONES[zone.id]?.safe) {
            socket.emit('npc_result', { msg: '마을에서만 NPC 이용 가능' }); return;
        }
        const zoneNpcs = ZONES[zone.id]?.npcs || [];
        const npcInfo = NPCS[npcType];
        if (!npcInfo || !zoneNpcs.includes(npcType)) {
            socket.emit('npc_result', { msg: '이 마을에 해당 NPC가 없습니다' }); return;
        }

        switch (npcInfo.type) {
            case 'healer':
                p.hp = p.maxHp;
                socket.emit('npc_result', { msg: '치료 완료! HP가 가득 찼습니다.', type: 'healer' });
                io.emit('player_update', p);
                break;
            case 'smith':
                // 강화 가능한 장비 목록 전송
                const enchantable = [];
                if (p.equipped) {
                    for (const slot of EQUIPMENT_SLOTS) {
                        const eqId = p.equipped[slot];
                        if (eqId && EQUIP_STATS[eqId]) {
                            const eq = EQUIP_STATS[eqId];
                            const level = (p.enchantLevels && p.enchantLevels[eqId]) || 0;
                            const maxEnchant = (GRADE_INFO[eq.grade] || GRADE_INFO.normal).maxEnchant;
                            enchantable.push({ id: eqId, name: eq.name, slot, level, maxEnchant, grade: eq.grade });
                        }
                    }
                }
                socket.emit('npc_smith', { msg: getNpcMsg(npcType, p), items: enchantable });
                break;
            case 'shop':
                socket.emit('npc_result', { msg: getNpcMsg(npcType, p), type: 'shop' });
                break;
            case 'cook':
                socket.emit('npc_result', { msg: getNpcMsg(npcType, p), type: 'cook' });
                break;
            case 'travel': {
                // 다른 마을 목록
                const towns = Object.entries(ZONES)
                    .filter(([id, z]) => z.safe && z.npcs && id !== zone.id)
                    .map(([id, z]) => ({ id, name: z.name, x: z.x + z.w/2, y: z.y + z.h/2 }));
                socket.emit('npc_travel', { msg: getNpcMsg(npcType, p), towns });
                break;
            }
            case 'fisher':
                socket.emit('npc_result', { msg: getNpcMsg(npcType, p), type: 'fisher' });
                break;
            default:
                socket.emit('npc_result', { msg: getNpcMsg(npcType, p) });
        }
    });

    // ── NPC 항해사 이동 ──
    socket.on('npc_travel_to', (townId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const targetZone = ZONES[townId];
        if (!targetZone || !targetZone.safe) return;
        const cost = 100;
        if (p.gold < cost) { socket.emit('npc_result', { msg: `이동 비용 ${cost}G 부족` }); return; }
        p.gold -= cost;
        p.x = targetZone.x + targetZone.w / 2;
        p.y = targetZone.y + targetZone.h / 2;
        savePlayer(p);
        io.emit('player_update', p);
        socket.emit('npc_result', { msg: `${targetZone.name}(으)로 이동 완료! (-${cost}G)` });
    });

    socket.on('toggle_pvp', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        // PvP 토글 쿨타임 (10초)
        const now = Date.now();
        if (p._lastPvpToggle && now - p._lastPvpToggle < 10000) {
            socket.emit('server_msg', { msg: 'PvP 전환 쿨타임 (10초)', type: 'normal' }); return;
        }
        p._lastPvpToggle = now;
        // 안전지대에서만 PvP 전환 가능
        const pZone = getZone(p.x, p.y);
        if (!pZone || !ZONES[pZone.id]?.safe) {
            socket.emit('server_msg', { msg: '마을에서만 PvP 전환 가능', type: 'danger' }); return;
        }

        if (p.team === 'peace') {
            if (!hasKing) {
                p.team = 'king_' + playerId;
                p.isKing = true;
                p.maxHp = Math.floor(p.maxHp * 1.8); // 3→1.8배
                p.hp = p.maxHp;
                p.dmgMulti *= 1.4; // 2→1.4배
                hasKing = true;
            } else {
                p.team = 'pvp_' + playerId;
                p.maxHp = Math.floor(p.maxHp * 1.3); // 1.5→1.3배
                p.hp = p.maxHp;
                p.dmgMulti *= 1.3; // 1.2→1.3배
            }
        } else {
            if (p.isKing) { hasKing = false; p.isKing = false; }
            p.team = 'peace';
            recalcStats(p); // 장비 보너스 포함 재계산
            p.dmgMulti = 1.0 + (p.level - 1) * 0.08;
            if (p.hp > p.maxHp) p.hp = p.maxHp;
        }

        savePlayer(p);
        io.emit('player_update', p);

        // 군대도 팀 동기화
        for (let bId in players) {
            if (players[bId].isBot && players[bId].ownerId === playerId) {
                players[bId].team = p.team;
                io.emit('player_update', players[bId]);
            }
        }
    });

    // 가디언 타워 건설 (-80골드)
    socket.on('build_tower', () => {
        const p = players[playerId];
        if (!p || !p.isAlive || p.team === 'peace' || p.gold < 80) return;

        p.gold -= 80;
        $.entityIdCounter++;
        const towerId = 'tower_' + $.entityIdCounter;
        const tCls = CLASSES['GuardianTower'];

        players[towerId] = {
            id: towerId, deviceId: 'tower',
            className: 'GuardianTower',
            displayName: tCls.displayName,
            x: p.x, y: p.y,
            hp: tCls.maxHp, maxHp: tCls.maxHp,
            atk: tCls.atk, def: tCls.def,
            critRate: tCls.critRate, dodgeRate: tCls.dodgeRate,
            dmgMulti: p.dmgMulti,
            dirX: 0, dirY: -1,
            gold: 0, level: p.level, exp: 0,
            isAlive: true, killCount: 0, karma: 0,
            team: p.team,
            ownerId: playerId,
            targetId: null,
            isKing: false, isBot: true,
            lastHpRegen: Date.now(), autoSkillCooldown: 0
        };
        io.emit('player_join', players[towerId]);
        io.emit('player_update', p);
        savePlayer(p);
    });

    // 용병 고용 (-150골드)
    socket.on('add_bot', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;

        let myArmyCount = 0;
        for (let bId in players) {
            if (players[bId].isBot && players[bId].ownerId === playerId
                && players[bId].className !== 'GuardianTower' && players[bId].isAlive) {
                myArmyCount++;
            }
        }

        if (p.gold >= 150 && myArmyCount < 30) {
            p.gold -= 150;
            $.entityIdCounter++;
            const botId = 'bot_manual_' + $.entityIdCounter;

            const classNames = ['Assassin', 'Warrior', 'Knight', 'Mage', 'Cleric'];
            const randomClass = classNames[Math.floor(Math.random() * classNames.length)];
            const botCls = CLASSES[randomClass];

            players[botId] = {
                id: botId, deviceId: 'bot',
                className: randomClass,
                displayName: botCls.displayName,
                x: p.x + (Math.random() * 2 - 1),
                y: p.y + (Math.random() * 2 - 1),
                hp: botCls.maxHp, maxHp: botCls.maxHp,
                atk: botCls.atk, def: botCls.def,
                critRate: botCls.critRate, dodgeRate: botCls.dodgeRate,
                dmgMulti: 1.0,
                dirX: 0, dirY: -1,
                gold: 0, level: 1, exp: 0,
                isAlive: true, killCount: 0, karma: 0,
                team: p.team,
                ownerId: playerId,
                targetId: null,
                isKing: false, isBot: true,
                lastHpRegen: Date.now(), autoSkillCooldown: 0
            };
            io.emit('player_join', players[botId]);
            io.emit('player_update', p);
            savePlayer(p);
        }
    });

    // 방향만 업데이트 (위치 변경 없이)
    socket.on('update_dir', (data) => {
        try {
            const d = JSON.parse(data);
            if (players[playerId] && players[playerId].isAlive) {
                if (d.dirX !== undefined) players[playerId].dirX = d.dirX;
                if (d.dirY !== undefined) players[playerId].dirY = d.dirY;
            }
        } catch(e) {}
    });

    socket.on('throw', () => {
        if (!players[playerId] || !players[playerId].isAlive) return;
        executeThrow(playerId);
    });

    socket.on('respawn', (dataStr) => {
        let newClass = 'Warrior';
        try {
            if (dataStr) {
                const data = JSON.parse(dataStr);
                if (data.className && CLASSES[data.className]) newClass = data.className;
            }
        } catch(e) {}

        if (players[playerId] && !players[playerId].isAlive) {
            const p = players[playerId];
            // 클래스 변경 (레벨/골드/장비는 유지 — 사망 시 이미 약탈됨)
            if (newClass !== p.className && !p.isAdvanced) {
                p.className = newClass;
                p.baseClassName = newClass;
                p.displayName = CLASSES[newClass]?.displayName || newClass;
            }
            p.team = 'peace';
            p.isKing = false; p.targetId = null;
            p.isAlive = true;
            // 장비/스탯 포함 전체 재계산
            recalcStats(p);
            p.hp = p.maxHp;
            // 마을에서 부활
            p.x = -480 + Math.random() * 40;
            p.y = -480 + Math.random() * 40;

            savePlayer(p);
            io.emit('player_respawn', p);
        }
    });

    // ── 상점 구매 ──
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
    socket.on('get_quests', () => {
        const p = players[playerId];
        if (!p) return;
        if (!p.questProgress) p.questProgress = {};
        if (!p.questCompleted) p.questCompleted = {};
        socket.emit('quest_data', {
            quests: QUESTS,
            progress: p.questProgress,
            completed: p.questCompleted
        });
    });

    // ── 퀘스트 보상 수령 ──
    socket.on('quest_claim', (questId) => {
        const p = players[playerId];
        if (!p) return;
        const q = QUESTS[questId];
        if (!q) return;
        if (p.questCompleted && p.questCompleted[questId]) { socket.emit('quest_result', {success:false, msg:'이미 수령'}); return; }
        const progress = (p.questProgress && p.questProgress[questId]) || 0;
        if (progress < q.goal) { socket.emit('quest_result', {success:false, msg:'미완료'}); return; }

        if (!p.questCompleted) p.questCompleted = {};
        p.questCompleted[questId] = true;
        if (q.reward.gold) p.gold += q.reward.gold;
        if (q.reward.diamonds) p.diamonds = (p.diamonds||0) + q.reward.diamonds;
        if (q.reward.exp) giveExp(p, q.reward.exp);
        capResources(p);

        // 업적이면 전체 공지 + 팬파레
        if (q.type === 'achievement') {
            io.emit('server_msg', { msg: `[업적] ${p.displayName}: "${q.name}" 달성!`, type: 'rare' });
            socket.emit('achievement_unlock', { name: q.name, desc: q.desc, reward: q.reward });
        }

        savePlayer(p);
        socket.emit('quest_result', {success:true, msg:`${q.name} 보상 수령!`});
        io.emit('player_update', p);
    });

    // ── 유닛 관리 (용병 목록) ──
    socket.on('get_units', () => {
        const p = players[playerId];
        if (!p) return;
        const units = [];
        for (const bId in players) {
            const b = players[bId];
            if (b.isBot && b.ownerId === playerId && b.isAlive) {
                units.push({ id:bId, className:b.className, displayName:b.displayName, level:b.level, hp:b.hp, maxHp:b.maxHp });
            }
        }
        socket.emit('unit_data', { units, maxArmy: p.maxArmy || 30 });
    });

    // ── 유닛 해고 ──
    socket.on('dismiss_unit', (unitId) => {
        const b = players[unitId];
        if (!b || !b.isBot || b.ownerId !== playerId) return;
        b.isAlive = false;
        io.emit('player_die', { victimId: unitId, attackerId: playerId, stolen: false });
        delete players[unitId];
        socket.emit('unit_result', { success:true, msg:`${b.displayName} 해고됨` });
    });

    // ── 용병 NPC 판매 ──
    socket.on('sell_unit', (unitId) => {
        const p = players[playerId];
        const b = players[unitId];
        if (!p || !b || !b.isBot || b.ownerId !== playerId) return;

        // 등급별 판매 가격
        const sellPrices = { normal: 30, elite: 100, rare: 300, boss: 1000 };
        const price = sellPrices[b.tamedTier] || 50;

        p.gold += price;
        b.isAlive = false;
        io.emit('player_die', { victimId: unitId, attackerId: playerId, stolen: false });
        delete players[unitId];
        savePlayer(p);
        socket.emit('unit_result', { success:true, msg:`${b.displayName} NPC 판매 (+${price}G)` });
        io.emit('player_update', p);
    });

    // ── 장비 착용 ──
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
    socket.on('waypoint_teleport', (zoneId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        // 던전/아레나/탑 진행 중 도주 차단
        if (p.inDungeon) { socket.emit('waypoint_result', { msg: '던전 내에서는 이동 불가' }); return; }
        if (p.arenaMatchId) { socket.emit('waypoint_result', { msg: '아레나/결투 중 이동 불가' }); return; }
        if (towerProgress[playerId]) { socket.emit('waypoint_result', { msg: '무한의 탑 도전 중 이동 불가' }); return; }
        if (!p.waypoints) p.waypoints = ['aden']; // 기본 시작 마을
        if (!p.waypoints.includes(zoneId)) { socket.emit('waypoint_result', { msg: '미방문 지역' }); return; }
        const zone = ZONES[zoneId];
        if (!zone || !zone.safe) { socket.emit('waypoint_result', { msg: '마을만 이동 가능' }); return; }
        // 쿨타임 60초
        const now = Date.now();
        if (p._lastWaypoint && now - p._lastWaypoint < 60000) {
            socket.emit('waypoint_result', { msg: `쿨타임 ${Math.ceil((60000-(now-p._lastWaypoint))/1000)}초` }); return;
        }
        p._lastWaypoint = now;
        p.x = zone.x + zone.w/2;
        p.y = zone.y + zone.h/2;
        savePlayer(p);
        io.emit('player_update', p);
        socket.emit('waypoint_result', { msg: `${zone.name}(으)로 이동!` });
    });

    // ── 웨이포인트 목록 ──
    socket.on('get_waypoints', () => {
        const p = players[playerId];
        if (!p) return;
        if (!p.waypoints) p.waypoints = ['aden'];
        const list = p.waypoints.map(zId => ({ id: zId, name: ZONES[zId]?.name || zId }));
        socket.emit('waypoint_list', list);
    });

    // ── 액티브 플레이 보너스 (탭/클릭 시 보너스) ──
    socket.on('active_tap', () => {
        const p = players[playerId];
        if (!p || !p.isAlive || p.isBot) return;
        const now = Date.now();
        if (p._lastActiveTap && now - p._lastActiveTap < 3000) return; // 3초 쿨타임
        p._lastActiveTap = now;
        // 액티브 보너스: 다음 5초간 데미지 +30%
        if (!p._activeBonus) p._activeBonus = 0;
        p._activeBonus = now + 5000;
        socket.emit('active_bonus', { duration: 5, multi: 1.3 });
    });

    // ── 크리티컬 루트 수집 ──
    socket.on('claim_critical_loot', (dropId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const drop = drops[dropId];
        if (!drop || drop.type !== 'critical_loot') return;
        if (Math.hypot(p.x - drop.x, p.y - drop.y) > 5) { socket.emit('loot_result', { msg: '너무 멀어요' }); return; }
        // 5배 희귀도 보상
        if (!p.inventory) p.inventory = {};
        const rareItems = Object.entries(EQUIP_STATS).filter(([id,eq]) => eq.grade === 'rare' || eq.grade === 'epic');
        if (rareItems.length > 0) {
            const [itemId, eq] = rareItems[Math.floor(Math.random() * rareItems.length)];
            p.inventory[itemId] = (p.inventory[itemId]||0) + 1;
            socket.emit('loot_result', { msg: `크리티컬 루트! ${eq.name} (${GRADE_INFO[eq.grade].name}) 획득!` });
            io.emit('server_msg', { msg: `${p.displayName}이(가) 크리티컬 루트로 ${eq.name} 획득!`, type: 'rare' });
        } else {
            p.gold += 1000;
            socket.emit('loot_result', { msg: '크리티컬 루트! +1000G!' });
        }
        io.emit('drop_destroy', dropId);
        delete drops[dropId];
        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 버프 탭 연장 (50 MP로 +2초) ──
    socket.on('extend_buff', (buffId) => {
        const p = players[playerId];
        if (!p || !p.activeBuffs || !p.activeBuffs[buffId]) return;
        if ((p.mp || 0) < 50) { socket.emit('buff_result', { msg: 'MP 부족 (50 필요)' }); return; }
        p.mp -= 50;
        p.activeBuffs[buffId].endTime += 2000;
        socket.emit('buff_result', { msg: p.activeBuffs[buffId].name + ' +2초 연장! (-50MP)' });
    });

    // ── 캐릭터 프로필 ──
    socket.on('get_profile', () => {
        const p = players[playerId];
        if (!p) return;
        const equippedList = [];
        if (p.equipped) {
            for (const [slot, eqId] of Object.entries(p.equipped)) {
                if (!eqId) continue;
                const eq = EQUIP_STATS[eqId];
                const enchant = p.enchantLevels?.[eqId] || 0;
                const runes = p.itemRunes?.[eqId] || [];
                equippedList.push({ slot, id: eqId, name: eq?.name || eqId, grade: eq?.grade, enchant, runes });
            }
        }
        socket.emit('profile_data', {
            name: p.displayName, class: p.className, advancedClass: p.advancedClass,
            level: p.level, prestige: p.prestigeLevel || 0,
            atk: p.atk, def: p.def, maxHp: p.maxHp, critRate: Math.floor((p.critRate||0)*100),
            dodgeRate: Math.floor((p.dodgeRate||0)*100), dmgMulti: (p.dmgMulti||1).toFixed(2),
            gold: p.gold, diamonds: p.diamonds || 0,
            faction: p.faction ? FACTIONS[p.faction]?.name : '없음',
            factionRep: p.factionRep || 0,
            titles: (p.titles || []).length, activeTitle: p.activeTitle,
            equipped: equippedList,
            kills: p.killCount || 0, pvpWins: p.pvpWins || 0,
            towerHighest: p.towerHighest || 0,
            bestiary: Object.keys(p.bestiary || {}).length,
            exploration: (p.discoveredZones || []).length,
            fishingLevel: p.fishingLevel || 1,
        });
    });

    // ── 다른 플레이어 조회 ──
    socket.on('inspect_player', (targetId) => {
        const target = players[targetId];
        if (!target || target.isBot) return;
        const equippedList = [];
        if (target.equipped) {
            for (const [slot, eqId] of Object.entries(target.equipped)) {
                if (!eqId) continue;
                const eq = EQUIP_STATS[eqId];
                equippedList.push({ slot, name: eq?.name || eqId, grade: eq?.grade, enchant: target.enchantLevels?.[eqId] || 0 });
            }
        }
        socket.emit('inspect_data', {
            name: target.displayName, class: target.advancedClass || target.className,
            level: target.level, prestige: target.prestigeLevel || 0,
            faction: target.faction ? FACTIONS[target.faction]?.name : null,
            team: target.team, kills: target.killCount || 0,
            equipped: equippedList,
        });
    });

    // ── 월드 이벤트 로그 ──
    socket.on('get_world_events', () => {
        socket.emit('world_events', worldEventLog.slice(-20).reverse().map(e => ({
            time: Math.floor((Date.now() - e.time) / 60000), msg: e.msg, type: e.type
        })));
    });

    // ── 스킬 쿨타임 실시간 ──
    socket.on('get_skill_cooldowns', () => {
        const p = players[playerId];
        if (!p) return;
        const cls = p.baseClassName || p.className;
        const skills = SKILLS[cls] || [];
        const cds = skills.filter(s => s.type !== 'passive').map(s => {
            const lastUsed = p.skillCooldowns?.[s.name] || 0;
            const remaining = Math.max(0, Math.ceil((s.cooldown * 1000 - (Date.now() - lastUsed)) / 1000));
            return { name: s.name, cooldown: s.cooldown, remaining, mpCost: s.mpCost || 0, ready: remaining === 0 };
        });
        socket.emit('skill_cooldowns', cds);
    });

    // ── 길드 레이드 ──
    socket.on('clan_raid_start', (raidId) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) { socket.emit('raid_result', { msg: '혈맹 필요' }); return; }
        const clan = clans[p.clanName];
        if (clan.leader !== playerId) { socket.emit('raid_result', { msg: '혈맹장만 시작 가능' }); return; }
        const raid = CLAN_RAIDS[raidId];
        if (!raid) { socket.emit('raid_result', { msg: '유효하지 않은 레이드' }); return; }
        if (clan.level < raid.clanLevel) { socket.emit('raid_result', { msg: `혈맹 Lv.${raid.clanLevel} 필요` }); return; }
        if (clan.dungeonCooldown && Date.now() < clan.dungeonCooldown) {
            const remain = Math.ceil((clan.dungeonCooldown - Date.now()) / 3600000);
            socket.emit('raid_result', { msg: `쿨타임 ${remain}시간 남음` }); return;
        }
        // 온라인 멤버 수 체크
        const online = clan.members.filter(mid => players[mid]?.isAlive && !players[mid]?.isBot);
        if (online.length < raid.minMembers) { socket.emit('raid_result', { msg: `최소 ${raid.minMembers}명 온라인 필요 (현재 ${online.length}명)` }); return; }

        clan.dungeonCooldown = Date.now() + 604800000; // 7일 쿨타임
        // 레이드 시작 — 보상 직접 지급 (간소화)
        for (const mid of online) {
            const member = players[mid];
            if (!member) continue;
            member.gold += raid.reward.gold;
            member.diamonds = (member.diamonds||0) + raid.reward.diamonds;
            giveExp(member, raid.reward.exp);
            capResources(member);
            io.to(mid).emit('raid_result', { msg: `${raid.name} 완료! +${raid.reward.gold}G +${raid.reward.exp}EXP +${raid.reward.diamonds}D` });
            io.emit('player_update', member);
        }
        clan.exp += 100;
        io.emit('server_msg', { msg: `[길드 레이드] ${p.clanName} 혈맹이 ${raid.name} 클리어!`, type: 'boss' });
        logWorldEvent(`${p.clanName} — ${raid.name} 클리어`, 'boss');
    });

    // ── PvP 시즌 정보 ──
    socket.on('get_arena_season', () => {
        const p = players[playerId];
        const myRank = arenaRankings[playerId] || { wins:0, losses:0, points:1000 };
        const myTier = getArenaTier(myRank.points);
        const seasonDays = Math.floor((Date.now() - $.arenaSeasonStart) / 86400000);
        const seasonRemain = Math.max(0, 28 - seasonDays);
        socket.emit('arena_season', {
            tier: myTier.name, tierColor: myTier.color,
            points: myRank.points, wins: myRank.wins, losses: myRank.losses,
            seasonRemain, allTiers: ARENA_TIERS,
        });
    });

    // ── 일일 챌린지 조회 ──
    socket.on('get_daily_challenge', () => {
        const p = players[playerId];
        if (!p) return;
        const challenge = getTodaysChallenge();
        const progress = p._dailyChallengeProgress || 0;
        const completed = p._dailyChallengeCompleted || false;
        socket.emit('daily_challenge', {
            name: challenge.name, desc: challenge.desc, zone: challenge.zone,
            goal: challenge.goal, progress: Math.min(progress, challenge.goal),
            completed, reward: challenge.reward,
        });
    });

    // ── 주간 챌린지 ──
    socket.on('get_weekly_challenge', () => {
        const p = players[playerId];
        if (!p) return;
        const challenge = getThisWeekChallenge();
        // 주차가 바뀌면 자동 리셋
        const thisWeek = getWeekNumber();
        if (p._weeklyChallengeWeek !== thisWeek) {
            p._weeklyChallengeWeek = thisWeek;
            p._weeklyChallengeProgress = 0;
            p._weeklyChallengeClaimed = false;
        }
        const progress = p._weeklyChallengeProgress || 0;
        socket.emit('weekly_challenge', {
            name: challenge.name, desc: challenge.desc,
            goal: challenge.goal, progress: Math.min(progress, challenge.goal),
            completed: progress >= challenge.goal, claimed: !!p._weeklyChallengeClaimed,
            reward: challenge.reward,
        });
    });

    socket.on('claim_weekly_challenge', () => {
        const p = players[playerId];
        if (!p) return;
        const thisWeek = getWeekNumber();
        if (p._weeklyChallengeWeek !== thisWeek) { socket.emit('challenge_result', { msg: '주간 미시작' }); return; }
        if (p._weeklyChallengeClaimed) { socket.emit('challenge_result', { msg: '이번 주 이미 수령' }); return; }
        const challenge = getThisWeekChallenge();
        if ((p._weeklyChallengeProgress || 0) < challenge.goal) { socket.emit('challenge_result', { msg: `미완료 (${p._weeklyChallengeProgress||0}/${challenge.goal})` }); return; }
        p.gold += challenge.reward.gold;
        if (challenge.reward.diamonds) p.diamonds = (p.diamonds||0) + challenge.reward.diamonds;
        if (challenge.reward.item) {
            if (!p.inventory) p.inventory = {};
            p.inventory[challenge.reward.item] = (p.inventory[challenge.reward.item] || 0) + (challenge.reward.itemQty || 1);
        }
        capResources(p);
        p._weeklyChallengeClaimed = true;
        savePlayer(p);
        socket.emit('challenge_result', { msg: `[주간] ${challenge.name} 완료! +${challenge.reward.gold}G ${challenge.reward.diamonds ? '+'+challenge.reward.diamonds+'D' : ''}${challenge.reward.item ? ' +'+challenge.reward.item+' x'+(challenge.reward.itemQty||1) : ''}` });
        io.emit('server_msg', { msg: `${p.displayName}이(가) 주간 챌린지 [${challenge.name}] 완료!`, type: 'rare' });
        io.emit('player_update', p);
    });

    // ── 일일 챌린지 보상 수령 ──
    socket.on('claim_daily_challenge', () => {
        const p = players[playerId];
        if (!p || !p._dailyChallengeCompleted) { socket.emit('challenge_result', { msg: '미완료' }); return; }
        // 이중 수령 방어 (이미 수령 시 차단)
        if (p._dailyChallengeClaimed) { socket.emit('challenge_result', { msg: '오늘 이미 수령' }); return; }
        const challenge = getTodaysChallenge();
        p.gold += challenge.reward.gold;
        if (challenge.reward.diamonds) p.diamonds = (p.diamonds||0) + challenge.reward.diamonds;
        capResources(p);
        p._dailyChallengeCompleted = false;
        p._dailyChallengeProgress = 0;
        p._dailyChallengeClaimed = true;
        savePlayer(p);
        socket.emit('challenge_result', { msg: `${challenge.name} 완료! +${challenge.reward.gold}G${challenge.reward.diamonds ? ' +'+challenge.reward.diamonds+'D' : ''}` });
        io.emit('player_update', p);
    });

    // ── 1:1 결투 요청 ──
    socket.on('duel_request', (targetId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const target = players[targetId];
        if (!target || target.isBot || !target.isAlive) { socket.emit('duel_result', { msg: '상대를 찾을 수 없음' }); return; }
        if (p.level < 10) { socket.emit('duel_result', { msg: 'Lv.10 이상 필요' }); return; }
        if (p.arenaMatchId || target.arenaMatchId) { socket.emit('duel_result', { msg: '이미 대전 중' }); return; }
        // 대기 중 결투 요청 저장 (수락 시 검증)
        if (!target._pendingDuels) target._pendingDuels = {};
        target._pendingDuels[playerId] = Date.now() + 30000; // 30초 유효
        // 결투 요청 전송
        io.to(targetId).emit('duel_incoming', { fromId: playerId, fromName: p.displayName, fromLevel: p.level, fromClass: p.advancedClass || p.className });
        socket.emit('duel_result', { msg: `${target.displayName}에게 결투 요청!` });
    });

    // ── 결투 수락 ──
    socket.on('duel_accept', (fromId) => {
        const p = players[playerId];
        const challenger = players[fromId];
        if (!p || !challenger || !p.isAlive || !challenger.isAlive) return;
        // 유효한 결투 요청이 실제로 존재하는지 검증
        if (!p._pendingDuels || !p._pendingDuels[fromId] || Date.now() > p._pendingDuels[fromId]) {
            socket.emit('duel_result', { msg: '유효한 결투 요청이 없습니다' });
            return;
        }
        if (p.arenaMatchId || challenger.arenaMatchId) {
            socket.emit('duel_result', { msg: '이미 대전 중' });
            return;
        }
        delete p._pendingDuels[fromId];

        // 아레나 시스템 재사용
        arenaMatchIdCounter++;
        const matchId = 'duel_' + arenaMatchIdCounter;
        const arenaZone = ZONES.arena;
        p.x = arenaZone.x + arenaZone.w - 10; p.y = arenaZone.y + arenaZone.h / 2;
        challenger.x = arenaZone.x + 10; challenger.y = arenaZone.y + arenaZone.h / 2;
        p.hp = p.maxHp; challenger.hp = challenger.maxHp;

        arenaMatches[matchId] = { player1: fromId, player2: playerId, startTime: Date.now(), isDuel: true };
        p.arenaMatchId = matchId; challenger.arenaMatchId = matchId;

        io.to(playerId).emit('arena_start', { matchId, opponent: challenger.displayName, opponentClass: challenger.className });
        io.to(fromId).emit('arena_start', { matchId, opponent: p.displayName, opponentClass: p.className });
        io.emit('server_msg', { msg: `[결투] ${challenger.displayName} vs ${p.displayName} 결투 시작!`, type: 'rare' });
        logWorldEvent(`결투: ${challenger.displayName} vs ${p.displayName}`, 'rare');

        // 3분 타임아웃 (아레나와 동일)
        setTimeout(() => {
            const match = arenaMatches[matchId];
            if (!match) return;
            const hp1 = players[match.player1]?.hp / (players[match.player1]?.maxHp||1) || 0;
            const hp2 = players[match.player2]?.hp / (players[match.player2]?.maxHp||1) || 0;
            const winnerId = hp1 >= hp2 ? match.player1 : match.player2;
            const loserId = winnerId === match.player1 ? match.player2 : match.player1;
            endArenaMatch(matchId, winnerId, loserId, '시간 초과 (HP 판정)');
        }, 180000);
    });

    // ── 맵 핑 (파티원에게) ──
    socket.on('map_ping', (data) => {
        const p = players[playerId];
        if (!p || !p.partyId || !parties[p.partyId]) return;
        parties[p.partyId].members.forEach(mid => {
            io.to(mid).emit('map_ping', { name: p.displayName, x: Math.round(data.x), y: Math.round(data.y) });
        });
    });

    // ── 자동 분해 설정 ──
    socket.on('set_auto_dismantle', (val) => {
        const p = players[playerId];
        if (p) p.autoDismantle = !!val;
    });

    // ── 길드 채팅 ──
    socket.on('guild_chat', (msg) => {
        const p = players[playerId];
        if (!p || !p.clanName || typeof msg !== 'string' || msg.length > 100) return;
        const clan = clans[p.clanName];
        if (!clan) return;
        const cleanMsg = msg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        for (const mid of clan.members) {
            io.to(mid).emit('guild_chat_msg', { sender: p.displayName, msg: cleanMsg });
        }
    });

    // ── 온라인 플레이어 목록 (상위 30명) ──
    socket.on('get_online_players', () => {
        const list = [];
        for (const pid in players) {
            const pl = players[pid];
            if (pl.isBot || !pl.isAlive) continue;
            const z = getZone(pl.x, pl.y);
            list.push({
                id: pid,
                name: pl.displayName || pl.className,
                level: pl.level || 1,
                className: pl.advancedClass || pl.className,
                zone: z?.name || '?',
                karma: pl.karma || 0,
                clan: pl.clanName || null,
            });
        }
        list.sort((a, b) => b.level - a.level);
        socket.emit('online_players', { count: list.length, players: list.slice(0, 30) });
    });

    // ── 길드 온라인 멤버 ──
    socket.on('get_guild_members', () => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const clan = clans[p.clanName];
        const members = clan.members.map(mid => {
            const m = players[mid];
            return { id: mid, name: m?.displayName || '?', level: m?.level || 0, online: !!m?.isAlive, class: m?.advancedClass || m?.className || '?' };
        });
        socket.emit('guild_members', { name: p.clanName, level: clan.level, members });
    });

    // ── 랭킹 조회 ──
    socket.on('get_ranking', () => {
        updateRankings();
        socket.emit('ranking_data', rankings);
    });

    // ── 변신(Morph) 시스템 ──
    socket.on('morph', (morphType) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        if (!p.morphKills) p.morphKills = {};

        const MORPHS = {
            slime:    { need: 30,  bonus: { maxHp: 50, speed: 3 }, name: '슬라임 변신', duration: 120 },
            orc:      { need: 20,  bonus: { atk: 15, def: 10 }, name: '오크 변신', duration: 120 },
            darkknight:{ need: 15, bonus: { atk: 25, critRate: 0.1 }, name: '다크나이트 변신', duration: 90 },
            dragon:   { need: 5,   bonus: { atk: 40, maxHp: 200, def: 20 }, name: '드래곤 변신', duration: 60 },
        };

        const morph = MORPHS[morphType];
        if (!morph) return;
        if ((p.morphKills[morphType] || 0) < morph.need) {
            socket.emit('morph_result', { success: false, msg: `${morph.name} 필요 처치 수: ${p.morphKills[morphType]||0}/${morph.need}` });
            return;
        }

        p.morphKills[morphType] -= morph.need;
        p.activeMorph = morphType;
        if (morph.bonus.atk) p.atk += morph.bonus.atk;
        if (morph.bonus.def) p.def += morph.bonus.def;
        if (morph.bonus.maxHp) { p.maxHp += morph.bonus.maxHp; p.hp = p.maxHp; }
        if (morph.bonus.critRate) p.critRate += morph.bonus.critRate;
        if (morph.bonus.speed) p.speed = (CLASSES[p.className]?.speed || 10) + morph.bonus.speed;

        io.emit('server_msg', { msg: `${p.displayName}이(가) ${morph.name}!`, type: 'morph' });
        socket.emit('morph_result', { success: true, msg: `${morph.name} 활성화! (${morph.duration}초)` });
        io.emit('player_update', p);

        // 변신 해제 타이머
        setTimeout(() => {
            if (!players[playerId]) return;
            const pp = players[playerId];
            pp.activeMorph = null;
            recalcStats(pp);
            pp.hp = Math.min(pp.hp, pp.maxHp);
            io.emit('player_update', pp);
            io.to(playerId).emit('morph_result', { success: true, msg: '변신 해제됨' });
        }, morph.duration * 1000);
    });

    // ── 장비 강화 (+15까지, 기획서 기준) ──
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
    socket.on('toggle_auto_skill', () => {
        const p = players[playerId];
        if (!p) return;
        p.autoSkill = !p.autoSkill;
        socket.emit('auto_skill_status', { enabled: p.autoSkill });
        socket.emit('combat_log', { msg: '자동 스킬 ' + (p.autoSkill ? 'ON ⚔' : 'OFF') });
    });

    // ── 자동 물약 토글 ──
    socket.on('toggle_auto_potion', () => {
        const p = players[playerId];
        if (!p) return;
        p.autoPotion = !p.autoPotion;
        socket.emit('auto_potion_status', { enabled: p.autoPotion });
    });

    // ── 던전 입장 ──
    socket.on('enter_dungeon', (dungeonId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const dungeon = DUNGEONS[dungeonId];
        if (!dungeon) { socket.emit('dungeon_result', { msg: '존재하지 않는 던전' }); return; }
        if (p.level < dungeon.minLevel) { socket.emit('dungeon_result', { msg: `레벨 ${dungeon.minLevel} 이상 필요` }); return; }
        if (p.inDungeon) { socket.emit('dungeon_result', { msg: '이미 던전에 참가 중' }); return; }

        // 던전 인스턴스 생성
        $.entityIdCounter++;
        const instanceId = 'dungeon_' + $.entityIdCounter;
        activeDungeons[instanceId] = {
            dungeonId, players: [playerId], currentStage: 0,
            monstersLeft: dungeon.monsters[0].count,
            startTime: Date.now(), totalStages: dungeon.stages,
        };
        p.inDungeon = instanceId;
        socket.emit('dungeon_enter', {
            instanceId, name: dungeon.name, stage: 1, totalStages: dungeon.stages,
            monstersLeft: dungeon.monsters[0].count, tier: dungeon.monsters[0].tier
        });
        io.emit('server_msg', { msg: `${p.displayName}이(가) ${dungeon.name}에 입장!`, type: 'normal' });
    });

    // ── 던전 몬스터 처치 보고 ──
    socket.on('dungeon_kill', () => {
        const p = players[playerId];
        if (!p || !p.inDungeon) return;
        const inst = activeDungeons[p.inDungeon];
        if (!inst) return;
        // 스팸 쓰로틀 (최소 200ms 간격)
        const nowMs = Date.now();
        if (inst._lastKillAt && nowMs - inst._lastKillAt < 200) return;
        inst._lastKillAt = nowMs;
        inst.monstersLeft--;
        if (inst.monstersLeft <= 0) {
            inst.currentStage++;
            const dungeon = DUNGEONS[inst.dungeonId];
            if (inst.currentStage >= dungeon.stages) {
                // 던전 클리어
                const rewards = dungeon.rewards;
                for (const pid of inst.players) {
                    const pp = players[pid];
                    if (!pp) continue;
                    pp.gold += rewards.gold;
                    giveExp(pp, rewards.exp);
                    if (!pp.inventory) pp.inventory = {};
                    const dropItem = rewards.drops[Math.floor(Math.random() * rewards.drops.length)];
                    if (Math.random() < 0.3) {
                        pp.inventory[dropItem] = (pp.inventory[dropItem]||0) + 1;
                        const eName = EQUIP_STATS[dropItem]?.name || dropItem;
                        io.to(pid).emit('combat_log', { msg: `던전 보상: ${eName} 획득!` });
                    }
                    pp.inDungeon = null;
                    io.to(pid).emit('dungeon_clear', { name: dungeon.name, gold: rewards.gold, exp: rewards.exp });
                    io.emit('player_update', pp);
                }
                io.emit('server_msg', { msg: `${dungeon.name} 클리어!`, type: 'rare' });
                delete activeDungeons[p.inDungeon];
            } else {
                // 다음 스테이지
                const nextMonsters = dungeon.monsters[inst.currentStage];
                inst.monstersLeft = nextMonsters.count;
                for (const pid of inst.players) {
                    io.to(pid).emit('dungeon_stage', {
                        stage: inst.currentStage + 1, totalStages: dungeon.stages,
                        monstersLeft: nextMonsters.count, tier: nextMonsters.tier
                    });
                }
            }
        } else {
            socket.emit('dungeon_update', { monstersLeft: inst.monstersLeft });
        }
    });

    // ── 스탯 포인트 배분 ──
    socket.on('add_stat', (stat) => {
        const p = players[playerId];
        if (!p || (p.statPoints || 0) <= 0) return;
        if (!['str','dex','int','con'].includes(stat)) return;
        p.statPoints--;
        const key = 'bonus' + stat.charAt(0).toUpperCase() + stat.slice(1);
        p[key] = (p[key] || 0) + 1;
        recalcStats(p);
        if (p.hp > p.maxHp) p.hp = p.maxHp;
        savePlayer(p);
        socket.emit('stat_result', { success: true, statPoints: p.statPoints, str: p.bonusStr||0, dex: p.bonusDex||0, int: p.bonusInt||0, con: p.bonusCon||0 });
        io.emit('player_update', p);
    });

    // ── 스탯 리셋 ──
    socket.on('reset_stats', () => {
        const p = players[playerId];
        if (!p) return;
        const cost = 500 + p.level * 100;
        if (p.gold < cost) { socket.emit('stat_result', { success: false, msg: `골드 부족 (${cost}G 필요)` }); return; }
        p.gold -= cost;
        // 스탯 포인트 반환
        const totalUsed = (p.bonusStr||0) + (p.bonusDex||0) + (p.bonusInt||0) + (p.bonusCon||0);
        p.statPoints = (p.statPoints || 0) + totalUsed;
        p.bonusStr = 0; p.bonusDex = 0; p.bonusInt = 0; p.bonusCon = 0;
        recalcStats(p);
        savePlayer(p);
        socket.emit('stat_result', { success: true, msg: `스탯 초기화! (${totalUsed}포인트 반환, -${cost}G)`, statPoints: p.statPoints, str:0, dex:0, int:0, con:0 });
        io.emit('player_update', p);
    });

    // ── 무한의 탑: 입장 ──
    socket.on('tower_enter', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        if (p.level < 10) { socket.emit('tower_result', { msg: 'Lv.10 이상 필요' }); return; }
        if (towerProgress[playerId]) { socket.emit('tower_result', { msg: '이미 탑 도전 중' }); return; }
        const startFloor = (p.towerHighest || 0) + 1;
        if (startFloor > INFINITE_TOWER.maxFloor) { socket.emit('tower_result', { msg: '100층 완전 클리어!' }); return; }
        const monsters = INFINITE_TOWER.getMonsters(startFloor);
        towerProgress[playerId] = { currentFloor: startFloor, monstersLeft: monsters.count, startTime: Date.now() };
        socket.emit('tower_enter', { floor: startFloor, maxFloor: INFINITE_TOWER.maxFloor, monstersLeft: monsters.count, tier: monsters.tier, monsterHp: monsters.hp });
    });

    // ── 무한의 탑: 몬스터 처치 ──
    socket.on('tower_kill', () => {
        const p = players[playerId];
        if (!p || !towerProgress[playerId]) return;
        const tp = towerProgress[playerId];
        // 스팸 쓰로틀 (최소 200ms 간격)
        const nowMs = Date.now();
        if (tp._lastKillAt && nowMs - tp._lastKillAt < 200) return;
        tp._lastKillAt = nowMs;
        tp.monstersLeft--;

        if (tp.monstersLeft <= 0) {
            // 층 클리어
            const reward = INFINITE_TOWER.getReward(tp.currentFloor);
            p.gold += reward.gold;
            giveExp(p, reward.exp);
            if (reward.diamonds > 0) p.diamonds = (p.diamonds||0) + reward.diamonds;
            if (!p.inventory) p.inventory = {};
            for (const d of reward.drops) {
                p.inventory[d] = (p.inventory[d]||0) + 1;
                const eName = EQUIP_STATS[d]?.name || d;
                socket.emit('combat_log', { msg: `탑 ${tp.currentFloor}층 보상: ${eName}` });
            }
            p.towerHighest = Math.max(p.towerHighest || 0, tp.currentFloor);
            socket.emit('tower_clear', { floor: tp.currentFloor, reward });

            // 다음 층
            const nextFloor = tp.currentFloor + 1;
            if (nextFloor > INFINITE_TOWER.maxFloor) {
                socket.emit('tower_result', { msg: `무한의 탑 완전 클리어! (${tp.currentFloor}층)` });
                io.emit('server_msg', { msg: `${p.displayName}이(가) 무한의 탑 ${tp.currentFloor}층 클리어!`, type: 'rare' });
                delete towerProgress[playerId];
            } else {
                const nextMonsters = INFINITE_TOWER.getMonsters(nextFloor);
                tp.currentFloor = nextFloor;
                tp.monstersLeft = nextMonsters.count;
                socket.emit('tower_stage', { floor: nextFloor, monstersLeft: nextMonsters.count, tier: nextMonsters.tier, monsterHp: nextMonsters.hp });
            }
            if (tp.currentFloor % 10 === 0) {
                io.emit('server_msg', { msg: `${p.displayName}이(가) 무한의 탑 ${tp.currentFloor}층 돌파!`, type: 'normal' });
            }
            savePlayer(p);
            io.emit('player_update', p);
        } else {
            socket.emit('tower_update', { monstersLeft: tp.monstersLeft });
        }
    });

    // ── 무한의 탑: 포기 ──
    socket.on('tower_leave', () => {
        if (towerProgress[playerId]) {
            socket.emit('tower_result', { msg: `${towerProgress[playerId].currentFloor}층에서 포기` });
            delete towerProgress[playerId];
        }
    });

    // ── 희귀 상자 오픈 ──
    socket.on('open_rare_box', () => {
        const p = players[playerId];
        if (!p || !p.inventory || !p.inventory['rare_box']) { socket.emit('box_result', { msg: '상자 없음' }); return; }
        p.inventory['rare_box']--;
        if (p.inventory['rare_box'] <= 0) delete p.inventory['rare_box'];

        // 랜덤 보상
        const roll = Math.random();
        let rewardMsg = '';
        if (roll < 0.02) {
            // 전설 장비 2%
            const items = ['equip_sword_5','equip_armor_5'];
            const item = items[Math.floor(Math.random() * items.length)];
            p.inventory[item] = (p.inventory[item]||0) + 1;
            rewardMsg = (EQUIP_STATS[item]?.name || item) + ' (전설!)';
            io.emit('server_msg', { msg: `${p.displayName}이(가) 희귀 상자에서 ${rewardMsg} 획득!`, type: 'rare' });
        } else if (roll < 0.10) {
            // 영웅 장비 8%
            const items = ['equip_sword_4','equip_armor_4','equip_ring_3','equip_neck_3'];
            const item = items[Math.floor(Math.random() * items.length)];
            p.inventory[item] = (p.inventory[item]||0) + 1;
            rewardMsg = (EQUIP_STATS[item]?.name || item) + ' (영웅)';
        } else if (roll < 0.35) {
            // 희귀 장비 25%
            const items = ['equip_sword_3','equip_armor_3','equip_helm_3','equip_glove_3','equip_boots_3','equip_ring_2','equip_neck_2'];
            const item = items[Math.floor(Math.random() * items.length)];
            p.inventory[item] = (p.inventory[item]||0) + 1;
            rewardMsg = (EQUIP_STATS[item]?.name || item) + ' (희귀)';
        } else if (roll < 0.60) {
            // 재료 25%
            p.inventory['mat_dragon'] = (p.inventory['mat_dragon']||0) + 2;
            p.inventory['mat_soul'] = (p.inventory['mat_soul']||0) + 5;
            rewardMsg = '드래곤 비늘 x2, 영혼석 x5';
        } else {
            // 골드/다이아 40%
            const gold = 1000 + Math.floor(Math.random() * 4000);
            const dia = 20 + Math.floor(Math.random() * 30);
            p.gold += gold;
            p.diamonds = (p.diamonds||0) + dia;
            rewardMsg = `${gold}G + ${dia}D`;
        }
        socket.emit('box_result', { msg: `희귀 상자 오픈! ${rewardMsg}` });
        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 친구 추가 요청 ──
    socket.on('friend_request', (targetId) => {
        const p = players[playerId];
        if (!p || !players[targetId] || players[targetId].isBot) return;
        if (targetId === playerId) return;
        if (!friendLists[playerId]) friendLists[playerId] = [];
        if (friendLists[playerId].includes(targetId)) { socket.emit('friend_result', { msg: '이미 친구입니다' }); return; }
        if (friendLists[playerId].length >= 50) { socket.emit('friend_result', { msg: '친구 최대 50명' }); return; }

        if (!friendRequests[targetId]) friendRequests[targetId] = [];
        // 중복 요청 방지 (스팸 차단)
        if (friendRequests[targetId].some(r => r.fromId === playerId)) {
            socket.emit('friend_result', { msg: '이미 요청을 보냈습니다' });
            return;
        }
        // 받은 요청 한도 (스팸 차단)
        if (friendRequests[targetId].length >= 30) {
            socket.emit('friend_result', { msg: '상대 받은 요청 한도 초과' });
            return;
        }
        friendRequests[targetId].push({ fromId: playerId, fromName: p.displayName, time: Date.now() });
        io.to(targetId).emit('friend_request_received', { fromId: playerId, fromName: p.displayName });
        socket.emit('friend_result', { msg: `${players[targetId].displayName}에게 친구 요청 전송` });
    });

    // ── 친구 요청 수락 ──
    socket.on('friend_accept', (fromId) => {
        const p = players[playerId];
        if (!p || !players[fromId]) return;
        if (!friendRequests[playerId]) return;
        const reqIdx = friendRequests[playerId].findIndex(r => r.fromId === fromId);
        if (reqIdx === -1) return;
        friendRequests[playerId].splice(reqIdx, 1);

        if (!friendLists[playerId]) friendLists[playerId] = [];
        if (!friendLists[fromId]) friendLists[fromId] = [];
        // 양쪽 한도 + 중복 검증
        if (friendLists[playerId].length >= 50 || friendLists[fromId].length >= 50) {
            socket.emit('friend_result', { msg: '친구 목록 한도 초과 (50명)' });
            return;
        }
        if (friendLists[playerId].includes(fromId)) {
            socket.emit('friend_result', { msg: '이미 친구입니다' });
            return;
        }
        friendLists[playerId].push(fromId);
        friendLists[fromId].push(playerId);

        socket.emit('friend_result', { msg: `${players[fromId]?.displayName || '?'}와 친구가 되었습니다!` });
        io.to(fromId).emit('friend_result', { msg: `${p.displayName}와 친구가 되었습니다!` });
    });

    // ── 친구 삭제 ──
    socket.on('friend_remove', (targetId) => {
        if (!friendLists[playerId]) return;
        friendLists[playerId] = friendLists[playerId].filter(f => f !== targetId);
        if (friendLists[targetId]) friendLists[targetId] = friendLists[targetId].filter(f => f !== playerId);
        socket.emit('friend_result', { msg: '친구 삭제 완료' });
    });

    // ── 친구 목록 ──
    socket.on('get_friends', () => {
        const list = (friendLists[playerId] || []).map(fid => ({
            id: fid, name: players[fid]?.displayName || '?',
            level: players[fid]?.level || 0, className: players[fid]?.className || '?',
            online: !!players[fid]?.isAlive,
        }));
        const requests = (friendRequests[playerId] || []).map(r => ({ fromId: r.fromId, fromName: r.fromName }));
        socket.emit('friend_list', { friends: list, requests });
    });

    // ── 귓속말 (1:1 메시지) ──
    socket.on('whisper', (data) => {
        const p = players[playerId];
        if (!p || typeof data.targetId !== 'string' || typeof data.msg !== 'string') return;
        const target = players[data.targetId];
        if (!target || target.isBot) { socket.emit('whisper_result', { msg: '상대를 찾을 수 없습니다' }); return; }
        if (data.msg.length > 100) return;
        const safeMsg = data.msg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        io.to(data.targetId).emit('whisper_received', { fromId: playerId, fromName: p.displayName, msg: safeMsg });
        socket.emit('whisper_sent', { toName: target.displayName, msg: safeMsg });
    });

    // ── 우편 거래 (아이템/골드 전송) ──
    socket.on('mail_send', (data) => {
        const p = players[playerId];
        if (!p || p.level < 15) { socket.emit('mail_result', { msg: 'Lv.15 이상 필요' }); return; }
        if (!data) return;
        const targetName = data.targetName;
        const itemId = data.itemId;
        const itemCount = Math.floor(Number(data.itemCount));
        const gold = Math.floor(Number(data.gold));
        // 음수/NaN/Infinity 방지 (도용 익스플로잇 차단)
        const validItemCount = Number.isFinite(itemCount) && itemCount > 0;
        const validGold = Number.isFinite(gold) && gold > 0;
        if (!validItemCount && !validGold) { socket.emit('mail_result', { msg: '잘못된 입력' }); return; }
        if (validGold && gold > MAX_GOLD) { socket.emit('mail_result', { msg: '골드 초과' }); return; }

        // 수신자 찾기 (온라인 우선)
        let targetId = null;
        for (const [pid, pl] of Object.entries(players)) {
            if (!pl.isBot && pl.displayName === targetName) { targetId = pid; break; }
        }
        if (targetName === p.displayName) { socket.emit('mail_result', { msg: '자신에게 보낼 수 없음' }); return; }
        const target = targetId ? players[targetId] : null;
        const isOffline = !target;

        // 우편 비용 50G
        const mailCost = 50 + (gold > 0 ? Math.floor(gold * 0.01) : 0);
        if (p.gold < mailCost) { socket.emit('mail_result', { msg: `우편 비용 ${mailCost}G 부족` }); return; }
        p.gold -= mailCost;

        // 오프라인이면 pendingMails에 보관
        if (isOffline) {
            // 발신자 자원/아이템 차감
            if (itemId && validItemCount) {
                if (!p.inventory || !p.inventory[itemId] || p.inventory[itemId] < itemCount) {
                    p.gold += mailCost; // 환불
                    socket.emit('mail_result', { msg: '아이템 부족' }); return;
                }
                const eq = EQUIP_STATS[itemId];
                if (eq && eq.bound) { p.gold += mailCost; socket.emit('mail_result', { msg: '귀속 아이템 거래 불가' }); return; }
                p.inventory[itemId] -= itemCount;
                if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
            }
            if (validGold) {
                if (p.gold < gold) { p.gold += mailCost; socket.emit('mail_result', { msg: '골드 부족' }); return; }
                p.gold -= gold;
            }
            // DB에 영속화 (서버 재시작에도 유지)
            (async () => {
                try {
                    await pool.query(
                        `INSERT INTO mails (target_name, from_name, item_id, item_count, gold) VALUES (?, ?, ?, ?, ?)`,
                        [targetName, p.displayName, validItemCount ? itemId : null, validItemCount ? itemCount : 0, validGold ? gold : 0]
                    );
                } catch (e) {
                    console.error('[DB] mail insert:', e.message);
                    // DB 실패 시 메모리 fallback
                    if (!pendingMails[targetName]) pendingMails[targetName] = [];
                    pendingMails[targetName].push({
                        from: p.displayName,
                        itemId: validItemCount ? itemId : null,
                        itemCount: validItemCount ? itemCount : 0,
                        gold: validGold ? gold : 0,
                        timestamp: Date.now(),
                    });
                    if (pendingMails[targetName].length > 50) pendingMails[targetName].shift();
                }
            })();
            savePlayer(p);
            io.emit('player_update', p);
            socket.emit('mail_result', { msg: `📬 ${targetName} 오프라인 — 우편함에 보관됨` });
            return;
        }

        if (targetId === playerId) { socket.emit('mail_result', { msg: '자신에게 보낼 수 없음' }); return; }

        // 아이템 전송
        if (itemId && validItemCount) {
            if (!p.inventory || !p.inventory[itemId] || p.inventory[itemId] < itemCount) {
                socket.emit('mail_result', { msg: '아이템 부족' }); return;
            }
            // 귀속 아이템 체크
            const eq = EQUIP_STATS[itemId];
            if (eq && eq.bound) { socket.emit('mail_result', { msg: '귀속 아이템은 거래 불가' }); return; }

            p.inventory[itemId] -= itemCount;
            if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
            if (!target.inventory) target.inventory = {};
            target.inventory[itemId] = (target.inventory[itemId] || 0) + itemCount;
            const iName = TRADEABLE_ITEMS[itemId]?.name || EQUIP_STATS[itemId]?.name || itemId;
            io.to(targetId).emit('mail_received', { from: p.displayName, item: iName, count: itemCount });
            socket.emit('mail_result', { msg: `${target.displayName}에게 ${iName} x${itemCount} 전송 완료!` });
        }

        // 골드 전송
        if (validGold) {
            if (p.gold < gold) { socket.emit('mail_result', { msg: '골드 부족' }); return; }
            p.gold -= gold;
            target.gold += gold;
            io.to(targetId).emit('mail_received', { from: p.displayName, gold });
            socket.emit('mail_result', { msg: `${target.displayName}에게 ${gold}G 전송 완료!` });
        }

        savePlayer(p); savePlayer(target);
        io.emit('player_update', p); io.emit('player_update', target);
    });

    // ── 전직 (Lv.20) ──
    // ── 전직 선택지 요청 ──
    socket.on('get_advance_options', () => {
        const p = players[playerId];
        if (!p || p.isAdvanced || p.level < 20) return;
        const options = CLASS_ADVANCE[p.className];
        if (!options) return;
        socket.emit('advance_options', options.map((o, i) => ({ idx: i, name: o.displayName, desc: o.desc,
            stats: `ATK+${o.bonusAtk||0} DEF+${o.bonusDef||0} HP+${o.bonusHp||0} CRIT+${Math.floor((o.bonusCrit||0)*100)}% 회피+${Math.floor((o.bonusDodge||0)*100)}%`
        })));
    });

    // ── 전직 (분기 선택) ──
    socket.on('class_advance', (choiceIdx) => {
        const p = players[playerId];
        if (!p || p.isAdvanced || p.level < 20) {
            socket.emit('advance_result', { success: false, msg: p?.isAdvanced ? '이미 전직함' : 'Lv.20 필요' });
            return;
        }
        const options = CLASS_ADVANCE[p.className];
        if (!options) { socket.emit('advance_result', { success: false, msg: '전직 불가' }); return; }
        const idx = parseInt(choiceIdx) || 0;
        const adv = options[Math.min(idx, options.length - 1)];
        if (!adv) return;
        p.isAdvanced = true;
        p.baseClassName = p.className;
        p.advancedClass = adv.name;
        p.displayName = adv.displayName;
        // 보너스 스탯은 recalcStats에서 처리할 수 있도록 저장
        p.advanceBonus = { atk: adv.bonusAtk||0, def: adv.bonusDef||0, hp: adv.bonusHp||0, crit: adv.bonusCrit||0, dodge: adv.bonusDodge||0, speed: adv.bonusSpeed||0 };
        recalcStats(p);
        p.hp = p.maxHp;
        savePlayer(p);
        io.emit('server_msg', { msg: `${p.displayName} 전직! [${adv.displayName}]`, type: 'rare' });
        socket.emit('advance_result', { success: true, msg: `${adv.displayName}(으)로 전직 완료! — ${adv.desc}` });
        io.emit('player_update', p);
    });

    // ── 혈맹(클랜) 생성 ──
    socket.on('create_clan', (clanName) => {
        const p = players[playerId];
        if (!p || p.level < 10) { socket.emit('clan_result', { success: false, msg: 'Lv.10 이상 필요' }); return; }
        if (p.clanName) { socket.emit('clan_result', { success: false, msg: '이미 혈맹 가입 중' }); return; }
        if (typeof clanName !== 'string' || clanName.length < 2 || clanName.length > 12) { socket.emit('clan_result', { success: false, msg: '이름 2~12자' }); return; }
        if (clans[clanName]) { socket.emit('clan_result', { success: false, msg: '이미 존재하는 혈맹' }); return; }
        if (p.gold < 5000) { socket.emit('clan_result', { success: false, msg: '5000G 필요' }); return; }

        p.gold -= 5000;
        p.clanName = clanName;
        clans[clanName] = { leader: playerId, officers:[], members: [playerId], level: 1, exp: 0, storage: {}, war: null, dungeonCooldown: 0 };
        savePlayer(p);
        io.emit('server_msg', { msg: `혈맹 [${clanName}] 창설! 군주: ${p.displayName}`, type: 'rare' });
        socket.emit('clan_result', { success: true, msg: `혈맹 [${clanName}] 창설 완료!` });
    });

    // ── 혈맹 가입 ──
    socket.on('join_clan', (clanName) => {
        const p = players[playerId];
        if (!p || p.clanName) return;
        if (!clans[clanName]) { socket.emit('clan_result', { success: false, msg: '존재하지 않는 혈맹' }); return; }
        const maxMembers = CLAN_MAX_MEMBERS[clans[clanName].level] || 10;
        if (clans[clanName].members.length >= maxMembers) { socket.emit('clan_result', { success: false, msg: `혈맹 정원 초과 (${maxMembers}명)` }); return; }
        p.clanName = clanName;
        clans[clanName].members.push(playerId);
        savePlayer(p);
        socket.emit('clan_result', { success: true, msg: `혈맹 [${clanName}] 가입!` });
    });

    // ── 혈맹 목록 ──
    socket.on('get_clans', () => {
        const list = Object.entries(clans).map(([name, c]) => ({
            name, memberCount: c.members.length, level: c.level, exp: c.exp,
            maxMembers: CLAN_MAX_MEMBERS[c.level] || 10,
            leader: players[c.leader]?.displayName || '?',
            skills: Object.keys(CLAN_SKILLS).filter(lv => c.level >= lv).map(lv => CLAN_SKILLS[lv].name),
        }));
        socket.emit('clan_list', list);
    });

    // ── 혈맹 경험치 기부 (몬스터 사냥 시 자동 + 수동 기부) ──
    socket.on('clan_donate', (amount) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const gold = Math.min(Math.max(0, Math.floor(amount)), p.gold);
        if (gold <= 0) return;
        p.gold -= gold;
        const clan = clans[p.clanName];
        clan.exp += Math.floor(gold / 10);

        // 레벨업 체크
        const nextLevelExp = CLAN_LEVEL_EXP[clan.level] || 99999;
        if (clan.exp >= nextLevelExp && clan.level < 5) {
            clan.exp -= nextLevelExp;
            clan.level++;
            const newSkill = CLAN_SKILLS[clan.level];
            io.emit('server_msg', { msg: `혈맹 [${p.clanName}] 레벨 ${clan.level} 달성! ${newSkill ? newSkill.name + ' 해금!' : ''}`, type: 'rare' });
        }
        socket.emit('clan_result', { success: true, msg: `${gold}G 기부 완료! (혈맹 EXP +${Math.floor(gold/10)})` });
    });

    // ── 혈맹 창고 조회 ──
    socket.on('get_clan_storage', () => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) {
            socket.emit('clan_storage_data', { success:false, msg:'혈맹 가입 필요' });
            return;
        }
        const storage = clans[p.clanName].storage || {};
        // 아이템 메타 정보 합치기
        const items = {};
        for (const [itemId, count] of Object.entries(storage)) {
            const eq = EQUIP_STATS[itemId];
            const tradeable = TRADEABLE_ITEMS[itemId];
            items[itemId] = {
                count,
                name: eq?.name || tradeable?.name || itemId,
                grade: eq?.grade || null,
                category: tradeable?.category || (eq ? '장비' : '기타'),
            };
        }
        socket.emit('clan_storage_data', {
            success: true,
            clanName: p.clanName,
            items,
            myInventory: p.inventory || {},
        });
    });

    // ── 혈맹 창고 (아이템 넣기/빼기) ──
    socket.on('clan_storage_deposit', (data) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        if (!data || typeof data.itemId !== 'string') return;
        const itemId = data.itemId;
        const count = Math.floor(Number(data.count));
        if (!Number.isFinite(count) || count <= 0) return;
        if (!p.inventory || !p.inventory[itemId] || p.inventory[itemId] < count) return;
        p.inventory[itemId] -= count;
        if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
        const storage = clans[p.clanName].storage;
        storage[itemId] = (storage[itemId] || 0) + count;
        socket.emit('clan_result', { success: true, msg: `창고에 ${itemId} x${count} 보관` });
    });

    socket.on('clan_storage_withdraw', (data) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        if (!data || typeof data.itemId !== 'string') return;
        const itemId = data.itemId;
        const count = Math.floor(Number(data.count));
        if (!Number.isFinite(count) || count <= 0) return;
        const storage = clans[p.clanName].storage;
        if (!storage[itemId] || storage[itemId] < count) return;
        storage[itemId] -= count;
        if (storage[itemId] <= 0) delete storage[itemId];
        if (!p.inventory) p.inventory = {};
        p.inventory[itemId] = (p.inventory[itemId] || 0) + count;
        socket.emit('clan_result', { success: true, msg: `창고에서 ${itemId} x${count} 인출` });
    });

    // ── 혈맹 전쟁 선포 ──
    socket.on('clan_war_declare', (targetClanName) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const clan = clans[p.clanName];
        if (clan.leader !== playerId) { socket.emit('clan_result', { success: false, msg: '군주만 선포 가능' }); return; }
        if (!clans[targetClanName]) { socket.emit('clan_result', { success: false, msg: '존재하지 않는 혈맹' }); return; }
        if (clan.level < 3) { socket.emit('clan_result', { success: false, msg: '혈맹 Lv.3 이상 필요' }); return; }
        if (clan.war) { socket.emit('clan_result', { success: false, msg: '이미 전쟁 중' }); return; }

        clan.war = { target: targetClanName, startTime: Date.now(), endTime: Date.now() + 86400000, kills: 0 };
        clans[targetClanName].war = { target: p.clanName, startTime: Date.now(), endTime: Date.now() + 86400000, kills: 0 };
        io.emit('server_msg', { msg: `[혈맹 전쟁] ${p.clanName} vs ${targetClanName} 전쟁 시작! (24시간)`, type: 'boss' });
        socket.emit('clan_result', { success: true, msg: `${targetClanName}에 전쟁 선포!` });
    });

    // ── 혈맹 직위 변경 ──
    socket.on('clan_promote', (data) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const clan = clans[p.clanName];
        const { targetId, rank } = data;
        if (clan.leader !== playerId && !clan.officers.includes(playerId)) return;
        if (rank === 'officer' && clan.leader === playerId) {
            if (!clan.officers.includes(targetId)) clan.officers.push(targetId);
            socket.emit('clan_result', { success: true, msg: '간부 임명 완료' });
        }
    });

    // ── 혈맹 탈퇴 ──
    socket.on('clan_leave', () => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const clan = clans[p.clanName];
        if (clan.leader === playerId) {
            // 군주가 탈퇴하면 혈맹 해산
            for (const mid of clan.members) {
                if (players[mid]) { players[mid].clanName = null; io.to(mid).emit('clan_result', { success:true, msg:'혈맹 해산됨' }); }
            }
            delete clans[p.clanName];
        } else {
            clan.members = clan.members.filter(m => m !== playerId);
            clan.officers = (clan.officers || []).filter(o => o !== playerId);
        }
        p.clanName = null;
        savePlayer(p);
        socket.emit('clan_result', { success: true, msg: '혈맹 탈퇴' });
    });

    // ── 혈맹 추방 ──
    socket.on('clan_kick', (targetId) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const clan = clans[p.clanName];
        if (clan.leader !== playerId && !(clan.officers || []).includes(playerId)) return;
        if (targetId === clan.leader) return; // 군주는 추방 불가
        clan.members = clan.members.filter(m => m !== targetId);
        clan.officers = (clan.officers || []).filter(o => o !== targetId);
        if (players[targetId]) {
            players[targetId].clanName = null;
            io.to(targetId).emit('clan_result', { success: true, msg: '혈맹에서 추방당했습니다' });
        }
        socket.emit('clan_result', { success: true, msg: '멤버 추방 완료' });
    });

    // ── 경매장: 아이템 등록 ──
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
            if (prevBidder) { prevBidder.gold += prevBid.amount; io.emit('player_update', prevBidder); }
        }

        p.gold -= bidAmount;
        listing.bids.push({ bidderId: playerId, bidderName: p.displayName, amount: bidAmount });
        socket.emit('market_result', { msg: `${listing.itemName}에 ${bidAmount}G 입찰 완료!` });
        io.emit('player_update', p);
    });

    // ── 경매장: 목록 조회 ──
    socket.on('market_browse', (filter) => {
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
            if (bidder) { bidder.gold += lastBid.amount; io.emit('player_update', bidder); }
        }
        // 아이템 반환
        if (!p.inventory) p.inventory = {};
        p.inventory[listing.itemId] = (p.inventory[listing.itemId] || 0) + 1;
        $.marketListings.splice(idx, 1);
        socket.emit('market_result', { msg: `${listing.itemName} 등록 취소` });
    });

    // ── 현상금 수락 ──
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
    socket.on('get_bounties', () => {
        socket.emit('bounty_update', bountyBoard.map(b => ({ targetName: b.targetName, reward: b.reward, claimed: !!b.claimedBy })));
    });

    // ── 몬스터 도감 ──
    socket.on('get_bestiary', () => {
        const p = players[playerId];
        if (!p) return;
        const bestiary = p.bestiary || {};
        const totalTypes = Object.keys(ZONE_MONSTER_NAMES).reduce((sum, zId) => sum + Object.keys(ZONE_MONSTER_NAMES[zId]).length, 0);
        const discovered = Object.keys(bestiary).length;
        socket.emit('bestiary_data', { bestiary, discovered, total: totalTypes });
    });

    // ── 주사위 도박 (제안) ──
    socket.on('dice_challenge', (data) => {
        const p = players[playerId];
        if (!p || !p.isAlive || !data) return;
        const targetId = data.targetId;
        const bet = Math.floor(Number(data.bet));
        // NaN/Infinity 가드 (골드 손상 방지)
        if (!Number.isFinite(bet)) { socket.emit('dice_result', { msg: '잘못된 베팅액' }); return; }
        const target = players[targetId];
        if (!target || target.isBot || !target.isAlive || targetId === playerId) { socket.emit('dice_result', { msg: '상대를 찾을 수 없음' }); return; }
        const zone = getZone(p.x, p.y);
        const tZone = getZone(target.x, target.y);
        if (!zone || !ZONES[zone.id]?.safe) { socket.emit('dice_result', { msg: '마을에서만 가능' }); return; }
        if (!tZone || tZone.id !== zone.id) { socket.emit('dice_result', { msg: '같은 마을에 있어야 합니다' }); return; }
        const betAmount = Math.max(100, Math.min(10000, bet));
        if (p.gold < betAmount || target.gold < betAmount) { socket.emit('dice_result', { msg: '골드 부족' }); return; }
        if (!p._diceCount) p._diceCount = { hour: Math.floor(Date.now()/3600000), count: 0 };
        if (p._diceCount.hour !== Math.floor(Date.now()/3600000)) { p._diceCount = { hour: Math.floor(Date.now()/3600000), count: 0 }; }
        if (p._diceCount.count >= 5) { socket.emit('dice_result', { msg: '시간당 5회 제한 초과' }); return; }

        // 즉시 실행이 아닌 제안 — 대상 동의 필요 (강제 도박 익스플로잇 차단)
        if (!target._pendingDiceOffers) target._pendingDiceOffers = {};
        target._pendingDiceOffers[playerId] = { bet: betAmount, expiresAt: Date.now() + 30000 };
        io.to(targetId).emit('dice_incoming', { fromId: playerId, fromName: p.displayName, bet: betAmount });
        socket.emit('dice_result', { msg: `${target.displayName}에게 ${betAmount}G 도박 신청!` });
    });

    // ── 주사위 도박 (수락) ──
    socket.on('dice_accept', (fromId) => {
        const target = players[playerId];
        if (!target || !target.isAlive || !target._pendingDiceOffers || !target._pendingDiceOffers[fromId]) {
            socket.emit('dice_result', { msg: '유효한 도전이 없습니다' }); return;
        }
        const offer = target._pendingDiceOffers[fromId];
        delete target._pendingDiceOffers[fromId];
        if (Date.now() > offer.expiresAt) { socket.emit('dice_result', { msg: '도전이 만료되었습니다' }); return; }
        const p = players[fromId];
        if (!p || !p.isAlive) { socket.emit('dice_result', { msg: '상대 없음' }); return; }
        // 거리/존 재검증
        const zone = getZone(p.x, p.y);
        const tZone = getZone(target.x, target.y);
        if (!zone || !tZone || zone.id !== tZone.id || !ZONES[zone.id]?.safe) {
            socket.emit('dice_result', { msg: '같은 마을에 있어야 합니다' }); return;
        }
        const betAmount = offer.bet;
        if (p.gold < betAmount || target.gold < betAmount) { socket.emit('dice_result', { msg: '골드 부족' }); return; }
        // 양쪽 시간당 카운트 차감
        if (!p._diceCount) p._diceCount = { hour: Math.floor(Date.now()/3600000), count: 0 };
        if (p._diceCount.hour !== Math.floor(Date.now()/3600000)) p._diceCount = { hour: Math.floor(Date.now()/3600000), count: 0 };
        if (p._diceCount.count >= 5) { socket.emit('dice_result', { msg: '상대 시간당 한도 초과' }); return; }
        if (!target._diceCount) target._diceCount = { hour: Math.floor(Date.now()/3600000), count: 0 };
        if (target._diceCount.hour !== Math.floor(Date.now()/3600000)) target._diceCount = { hour: Math.floor(Date.now()/3600000), count: 0 };
        if (target._diceCount.count >= 5) { socket.emit('dice_result', { msg: '시간당 5회 제한 초과' }); return; }
        p._diceCount.count++;
        target._diceCount.count++;

        const roll1 = Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1;
        const roll2 = Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1;
        const tax = Math.floor(betAmount * 0.05);
        let winner, loser;
        if (roll1 > roll2) { winner = p; loser = target; }
        else if (roll2 > roll1) { winner = target; loser = p; }
        else { // 동점
            io.to(fromId).emit('dice_result', { msg: `동점! (${roll1} vs ${roll2}) 무승부`, roll1, roll2, tie: true });
            socket.emit('dice_result', { msg: `동점! (${roll2} vs ${roll1}) 무승부`, roll1: roll2, roll2: roll1, tie: true });
            return;
        }
        loser.gold -= betAmount;
        winner.gold += betAmount - tax;
        const result = { roll1, roll2, bet: betAmount, winner: winner.displayName, tax };
        io.to(fromId).emit('dice_result', { msg: `주사위: ${roll1} vs ${roll2} → ${winner.displayName} 승리!${winner===p ? ' +'+(betAmount-tax)+'G' : ' -'+betAmount+'G'}`, ...result });
        socket.emit('dice_result', { msg: `주사위: ${roll2} vs ${roll1} → ${winner.displayName} 승리!${winner===target ? ' +'+(betAmount-tax)+'G' : ' -'+betAmount+'G'}`, ...result });
        if (betAmount >= 5000) io.emit('server_msg', { msg: `[도박] ${p.displayName} vs ${target.displayName} — ${betAmount}G 판돈! ${winner.displayName} 승리!`, type: 'rare' });
        io.emit('player_update', p); io.emit('player_update', target);
    });

    // ── 떠돌이 상인 구매 ──
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
    socket.on('start_fishing', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const zone = getZone(p.x, p.y);
        if (!zone || zone.id !== 'fishing') { socket.emit('fish_result', { msg: '낚시 만에서만 가능!' }); return; }
        if (p._fishing) return;
        p._fishing = true;
        socket.emit('fish_cast', { msg: '낚싯대를 던졌습니다... 기다리세요...' });
        const biteTime = 3000 + Math.random() * 5000;
        p._fishTimer1 = setTimeout(() => {
            if (!players[playerId] || !p._fishing) return;
            p._fishBite = Date.now();
            socket.emit('fish_bite', { msg: '입질이다! 빨리 낚아올려요!' });
            p._fishTimer2 = setTimeout(() => {
                if (players[playerId] && p._fishBite) {
                    p._fishing = false; p._fishBite = null;
                    socket.emit('fish_result', { msg: '놓쳤다... 다시 시도하세요.' });
                }
            }, 1500);
        }, biteTime);
    });

    // ── 낚시 낚아올리기 ──
    socket.on('hook_fish', () => {
        const p = players[playerId];
        if (!p || !p._fishBite) return;
        p._fishing = false; p._fishBite = null;
        if (!p.fishingLevel) p.fishingLevel = 1;
        // 물고기 뽑기
        const eligible = FISH_TABLE.filter(f => p.fishingLevel >= f.minLevel);
        const totalWeight = eligible.reduce((s, f) => s + f.weight, 0);
        let roll = Math.random() * totalWeight;
        let caught = eligible[0];
        for (const f of eligible) {
            roll -= f.weight;
            if (roll <= 0) { caught = f; break; }
        }
        // 낚시 레벨업 (20마리마다)
        p._fishCount = (p._fishCount || 0) + 1;
        if (p._fishCount % 20 === 0 && p.fishingLevel < 50) {
            p.fishingLevel++;
            socket.emit('fish_result', { msg: `낚시 레벨 UP! Lv.${p.fishingLevel}` });
        }
        // 보상
        if (!p.inventory) p.inventory = {};
        p.inventory['goods_fish'] = (p.inventory['goods_fish'] || 0) + 1;
        p.gold += caught.sell;
        capResources(p);
        const gradeColors = {common:'#ccc',uncommon:'#4c4',rare:'#48f',epic:'#a4f',legendary:'#f80'};
        socket.emit('fish_result', { msg: `${caught.name} 낚음! (+${caught.sell}G)`, name: caught.name, grade: caught.grade, color: gradeColors[caught.grade] });
        if (caught.grade === 'epic' || caught.grade === 'legendary') {
            io.emit('server_msg', { msg: `[낚시] ${p.displayName}이(가) ${caught.name}을(를) 낚았다!`, type: 'rare' });
        }
        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 이모트 ──
    socket.on('emote', (emoteId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const text = EMOTES[emoteId];
        if (!text) return;
        // 같은 존의 모든 플레이어에게 브로드캐스트
        io.emit('emote_show', { playerId, playerName: p.displayName, emote: text, x: p.x, y: p.y });
    });

    // ── 출석 캘린더 ──
    socket.on('get_attendance_calendar', () => {
        const p = players[playerId];
        if (!p) return;
        const streak = p.attendance?.streak || 0;
        const calendar = ATTENDANCE_REWARDS.map((r, i) => ({
            day: r.day, reward: r.reward,
            claimed: i < streak,
            today: i === streak,
        }));
        socket.emit('attendance_calendar', { calendar, streak });
    });

    // ── 탐험도 조회 ──
    socket.on('get_exploration', () => {
        const p = players[playerId];
        if (!p) return;
        const discovered = p.discoveredZones || [];
        const total = Object.keys(ZONES).length;
        socket.emit('exploration_data', { discovered, total, pct: Math.floor(discovered.length / total * 100) });
    });

    // 5대 신규 시스템 소켓 핸들러
    // ══════════════════════════════════════

    // ── 1. 시즌 균열 입장 ──
    socket.on('rift_enter', () => {
        const p = players[playerId];
        if (!p || !p.isAlive || p.level < 20) { socket.emit('rift_result', { msg: 'Lv.20 이상 필요' }); return; }
        const theme = currentSeason.theme;
        if (!p._riftDepth) p._riftDepth = 0;
        p._riftDepth++;
        const depth = p._riftDepth;
        const monsterHp = 500 + depth * 200;
        const monsterAtk = 20 + depth * 10;
        const reward = { gold: 200 + depth * 100, exp: 500 + depth * 200, diamonds: depth % 5 === 0 ? depth * 2 : 0 };

        socket.emit('rift_floor', { depth, theme: theme.name, color: theme.color, monsterHp, monsterAtk, reward });
        // 균열 리더보드 갱신
        currentSeason.leaderboard[playerId] = Math.max(currentSeason.leaderboard[playerId] || 0, depth);
        if (depth % 10 === 0) {
            io.emit('server_msg', { msg: `[균열] ${p.displayName}이(가) ${theme.name} ${depth}층 돌파!`, type: 'rare' });
        }
    });

    // ── 1b. 균열 몬스터 클리어 ──
    socket.on('rift_clear', () => {
        const p = players[playerId];
        if (!p || !p._riftDepth) return;
        const depth = p._riftDepth;
        const reward = { gold: 200 + depth * 100, exp: 500 + depth * 200, diamonds: depth % 5 === 0 ? depth * 2 : 0 };
        p.gold += reward.gold;
        if (reward.diamonds) p.diamonds = (p.diamonds||0) + reward.diamonds;
        giveExp(p, reward.exp);
        capResources(p);
        savePlayer(p);
        io.emit('player_update', p);
        socket.emit('rift_result', { msg: `균열 ${depth}층 클리어! +${reward.gold}G +${reward.exp}EXP${reward.diamonds ? ' +'+reward.diamonds+'D' : ''}` });
    });

    // ── 1c. 균열 리더보드 ──
    socket.on('get_rift_ranking', () => {
        const sorted = Object.entries(currentSeason.leaderboard)
            .sort((a,b) => b[1] - a[1]).slice(0, 20)
            .map(([pid, depth], i) => ({ rank: i+1, name: players[pid]?.displayName || '?', depth }));
        socket.emit('rift_ranking', { theme: currentSeason.theme.name, rankings: sorted });
    });

    // ── 2. 룬 장착 ──
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
    socket.on('faction_join', (factionId) => {
        const p = players[playerId];
        if (!p || p.level < 20) { socket.emit('faction_result', { msg: 'Lv.20 이상 필요' }); return; }
        if (p.faction) { socket.emit('faction_result', { msg: '이미 진영 가입 중: ' + FACTIONS[p.faction]?.name }); return; }
        if (!FACTIONS[factionId]) { socket.emit('faction_result', { msg: '유효하지 않은 진영' }); return; }
        p.faction = factionId;
        p.factionRep = 0;
        savePlayer(p);
        socket.emit('faction_result', { msg: `${FACTIONS[factionId].name}에 가입! 진영전에서 활약하세요.` });
        io.emit('server_msg', { msg: `${p.displayName}이(가) ${FACTIONS[factionId].name}에 합류!`, type: 'normal' });
    });

    // ── 3b. 진영 정보 ──
    socket.on('get_faction_info', () => {
        const p = players[playerId];
        const info = {};
        for (const [fId, f] of Object.entries(FACTIONS)) {
            const zoneCount = Object.keys(factionState[fId]?.zones || {}).length;
            info[fId] = { name: f.name, color: f.color, zones: zoneCount, kills: factionState[fId]?.kills || 0 };
        }
        socket.emit('faction_info', { factions: info, myFaction: p?.faction || null, myRep: p?.factionRep || 0 });
    });

    // ── 4. 프레스티지 (환생) ──
    socket.on('prestige', () => {
        const p = players[playerId];
        if (!p || p.level < 50) { socket.emit('prestige_result', { msg: 'Lv.50 이상 필요' }); return; }
        if (!p.prestigeLevel) p.prestigeLevel = 0;
        if (p.prestigeLevel >= 10) { socket.emit('prestige_result', { msg: '최대 환생 (10회)' }); return; }
        p.prestigeLevel++;
        const perkIdx = p.prestigeLevel - 1;
        const perk = LEGACY_PERKS[perkIdx];
        if (!p.legacyPerks) p.legacyPerks = [];
        p.legacyPerks.push(perk);

        // 레벨 리셋 (장비/인벤은 유지)
        p.level = 1; p.exp = 0;
        p.statPoints = 0; p.bonusStr = 0; p.bonusDex = 0; p.bonusInt = 0; p.bonusCon = 0;
        recalcStats(p);
        p.hp = p.maxHp;

        savePlayer(p);
        io.emit('server_msg', { msg: `[환생] ${p.displayName} ${p.prestigeLevel}차 환생! "${perk.name}" 획득!`, type: 'boss' });
        socket.emit('prestige_result', { msg: `${p.prestigeLevel}차 환생! "${perk.name}" — ${perk.desc}. 다시 Lv.1부터!`, perk });
        io.emit('player_update', p);
    });

    // ── 5. 의뢰 게시판 ──
    socket.on('contract_create', (data) => {
        const p = players[playerId];
        if (!p || p.level < 10) { socket.emit('contract_result', { msg: 'Lv.10 이상 필요' }); return; }
        if (!data) return;
        const reward = Math.floor(Number(data.reward));
        // 유효 정수 + 100~1,000,000 범위
        if (!Number.isFinite(reward) || reward < 100 || reward > 1000000) {
            socket.emit('contract_result', { msg: '보상은 100~1,000,000G' }); return;
        }
        // type/target 문자열 검증 + XSS 차단
        const safeType = (typeof data.type === 'string' ? data.type : '').slice(0, 30).replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const safeTarget = (typeof data.target === 'string' ? data.target : '').slice(0, 30).replace(/</g,'&lt;').replace(/>/g,'&gt;');
        if (!safeType) return;
        const cost = Math.floor(reward * 1.1); // 10% 수수료
        if (p.gold < cost) { socket.emit('contract_result', { msg: `골드 부족 (${cost}G 필요 — 수수료 10%)` }); return; }
        // 동시 의뢰 수 제한 (스팸 방지)
        const myOpen = contractBoard.filter(c => c.creatorId === playerId && c.status === 'open').length;
        if (myOpen >= 5) { socket.emit('contract_result', { msg: '동시 의뢰 5개 한도 초과' }); return; }
        p.gold -= cost;
        contractIdCounter++;
        const contract = {
            id: contractIdCounter, creatorId: playerId, creatorName: p.displayName,
            type: safeType, target: safeTarget, reward,
            status: 'open', acceptedBy: null, expiresAt: Date.now() + 3600000, // 1시간
        };
        contractBoard.push(contract);
        savePlayer(p);
        socket.emit('contract_result', { msg: `의뢰 등록! "${safeType}" — ${reward}G 보상` });
        io.emit('server_msg', { msg: `[의뢰] ${p.displayName}의 새 의뢰: "${safeType}" (${reward}G)`, type: 'normal' });
    });

    socket.on('contract_accept', (contractId) => {
        const p = players[playerId];
        if (!p) return;
        const c = contractBoard.find(x => x.id === contractId && x.status === 'open');
        if (!c) { socket.emit('contract_result', { msg: '의뢰 없음 또는 마감' }); return; }
        if (c.creatorId === playerId) { socket.emit('contract_result', { msg: '자기 의뢰 수락 불가' }); return; }
        c.status = 'accepted';
        c.acceptedBy = playerId;
        c._acceptedAt = Date.now();
        socket.emit('contract_result', { msg: `의뢰 수락! "${c.type}" — 1시간 내 완료하세요.` });
        io.to(c.creatorId).emit('contract_result', { msg: `${p.displayName}이(가) 당신의 의뢰를 수락!` });
    });

    socket.on('contract_complete', (contractId) => {
        const p = players[playerId];
        if (!p) return;
        const c = contractBoard.find(x => x.id === contractId && x.acceptedBy === playerId && x.status === 'accepted');
        if (!c) { socket.emit('contract_result', { msg: '완료 불가' }); return; }
        // 악용 방지: 수락 후 최소 5분 경과 필요
        if (Date.now() - (c._acceptedAt || 0) < 300000) {
            socket.emit('contract_result', { msg: `최소 5분 후 완료 가능 (${Math.ceil((300000-(Date.now()-(c._acceptedAt||0)))/60000)}분 남음)` }); return;
        }
        c.status = 'completed';
        p.gold += c.reward;
        capResources(p);
        savePlayer(p);
        socket.emit('contract_result', { msg: `의뢰 완료! +${c.reward}G` });
        io.to(c.creatorId).emit('contract_result', { msg: `의뢰 "${c.type}" 완료됨!` });
        io.emit('player_update', p);
    });

    socket.on('get_contracts', () => {
        const now = Date.now();
        contractBoard = contractBoard.filter(c => now < c.expiresAt && c.status !== 'completed');
        socket.emit('contract_list', contractBoard.map(c => ({
            id: c.id, creator: c.creatorName, type: c.type, target: c.target,
            reward: c.reward, status: c.status, timeLeft: Math.floor((c.expiresAt - now)/60000),
        })));
    });

    // ── 아레나: 참가 신청 ──
    socket.on('arena_join', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        if (p.level < 10) { socket.emit('arena_result', { msg: 'Lv.10 이상 필요' }); return; }
        if ((p.arenaCountToday || 0) >= 10) { socket.emit('arena_result', { msg: '일일 아레나 10회 초과' }); return; }
        if (arenaQueue.includes(playerId)) { socket.emit('arena_result', { msg: '이미 대기 중' }); return; }
        // 이미 매치 중인지 체크
        for (const m of Object.values(arenaMatches)) {
            if (m.player1 === playerId || m.player2 === playerId) {
                socket.emit('arena_result', { msg: '이미 매치 진행 중' }); return;
            }
        }
        arenaQueue.push(playerId);
        socket.emit('arena_result', { msg: '아레나 대기열 참가! 상대 매칭 중...' });

        // 매칭 시도
        if (arenaQueue.length >= 2) {
            const p1Id = arenaQueue.shift();
            const p2Id = arenaQueue.shift();
            const p1 = players[p1Id], p2 = players[p2Id];
            if (!p1 || !p2 || !p1.isAlive || !p2.isAlive) return;

            arenaMatchIdCounter++;
            const matchId = 'arena_' + arenaMatchIdCounter;
            const arenaZone = ZONES.arena;
            // 양 플레이어를 아레나로 이동
            p1.x = arenaZone.x + 10; p1.y = arenaZone.y + arenaZone.h / 2;
            p2.x = arenaZone.x + arenaZone.w - 10; p2.y = arenaZone.y + arenaZone.h / 2;
            p1.hp = p1.maxHp; p2.hp = p2.maxHp; // HP 풀 회복

            arenaMatches[matchId] = { player1: p1Id, player2: p2Id, startTime: Date.now() };
            p1.arenaMatchId = matchId; p2.arenaMatchId = matchId;

            io.to(p1Id).emit('arena_start', { matchId, opponent: p2.displayName, opponentClass: p2.className });
            io.to(p2Id).emit('arena_start', { matchId, opponent: p1.displayName, opponentClass: p1.className });
            io.emit('server_msg', { msg: `[아레나] ${p1.displayName} vs ${p2.displayName} 대결 시작!`, type: 'normal' });

            // 3분 타임아웃
            setTimeout(() => {
                const match = arenaMatches[matchId];
                if (!match) return;
                const mp1 = players[match.player1], mp2 = players[match.player2];
                // 남은 HP 비율로 승자 결정
                const hp1Pct = mp1 ? mp1.hp / mp1.maxHp : 0;
                const hp2Pct = mp2 ? mp2.hp / mp2.maxHp : 0;
                const winnerId = hp1Pct >= hp2Pct ? match.player1 : match.player2;
                const loserId = winnerId === match.player1 ? match.player2 : match.player1;
                endArenaMatch(matchId, winnerId, loserId, '시간 초과 - HP 비율 판정');
            }, 180000);
        }
    });

    // ── 아레나: 대기열 취소 ──
    socket.on('arena_leave', () => {
        arenaQueue = arenaQueue.filter(id => id !== playerId);
        socket.emit('arena_result', { msg: '대기열 취소' });
    });

    // ── 아레나: 랭킹 조회 ──
    socket.on('arena_rankings', () => {
        const sorted = Object.entries(arenaRankings)
            .sort((a, b) => b[1].points - a[1].points)
            .slice(0, 20)
            .map(([pid, r], idx) => ({
                rank: idx + 1, name: players[pid]?.displayName || '?',
                className: players[pid]?.className || '?',
                wins: r.wins, losses: r.losses, points: r.points
            }));
        socket.emit('arena_ranking_list', sorted);
    });

    // ── 파티 생성 ──
    socket.on('create_party', () => {
        const p = players[playerId];
        if (!p || p.partyId) { socket.emit('party_result', { success: false, msg: '이미 파티 중' }); return; }
        partyIdCounter++;
        const pid = 'party_' + partyIdCounter;
        p.partyId = pid;
        parties[pid] = { leader: playerId, members: [playerId], name: p.displayName + '의 파티' };
        socket.emit('party_result', { success: true, msg: '파티 생성!' });
        socket.emit('party_info', parties[pid]);
    });

    // ── 파티 초대 (근처 플레이어 자동) ──
    socket.on('party_invite_nearby', () => {
        const p = players[playerId];
        if (!p || !p.partyId) return;
        const party = parties[p.partyId];
        if (!party || party.leader !== playerId) return;
        if (party.members.length >= 5) { socket.emit('party_result', { success: false, msg: '파티 최대 5명' }); return; }

        for (const pid in players) {
            const target = players[pid];
            if (pid === playerId || target.isBot || target.partyId) continue;
            const dist = Math.hypot(p.x - target.x, p.y - target.y);
            if (dist < 10) {
                target.partyId = p.partyId;
                party.members.push(pid);
                io.to(pid).emit('party_result', { success: true, msg: `${p.displayName}의 파티에 합류!` });
                socket.emit('party_result', { success: true, msg: `${target.displayName} 파티 합류!` });
                // 파티원 모두에게 업데이트
                for (const mid of party.members) {
                    io.to(mid).emit('party_info', { ...party, memberNames: party.members.map(m => players[m]?.displayName || '?') });
                }
                break;
            }
        }
    });

    // ── 파티 탈퇴 ──
    socket.on('leave_party', () => {
        const p = players[playerId];
        if (!p || !p.partyId) return;
        const party = parties[p.partyId];
        if (!party) { p.partyId = null; return; }

        party.members = party.members.filter(m => m !== playerId);

        if (party.members.length === 0) {
            delete parties[p.partyId];
        } else {
            // 리더가 떠나면 다음 사람이 리더
            if (party.leader === playerId) {
                party.leader = party.members[0];
                io.to(party.leader).emit('party_result', { success: true, msg: '파티장이 되었습니다!' });
            }
            for (const mid of party.members) {
                io.to(mid).emit('party_info', { ...party, memberNames: party.members.map(m => players[m]?.displayName || '?') });
            }
        }
        p.partyId = null;
        socket.emit('party_result', { success: true, msg: '파티 탈퇴' });
    });

    // ── 파티 해산 ──
    socket.on('disband_party', () => {
        const p = players[playerId];
        if (!p || !p.partyId) return;
        const party = parties[p.partyId];
        if (!party || party.leader !== playerId) { socket.emit('party_result', { success: false, msg: '파티장만 해산 가능' }); return; }

        for (const mid of party.members) {
            if (players[mid]) players[mid].partyId = null;
            io.to(mid).emit('party_result', { success: true, msg: '파티가 해산되었습니다' });
        }
        delete parties[p.partyId];
    });

    // ── 파티 정보 조회 ──
    socket.on('get_party_info', () => {
        const p = players[playerId];
        if (!p || !p.partyId || !parties[p.partyId]) { socket.emit('party_info', null); return; }
        const party = parties[p.partyId];
        socket.emit('party_info', {
            ...party,
            memberNames: party.members.map(m => ({
                id: m, name: players[m]?.displayName || '?',
                level: players[m]?.level || 1, className: players[m]?.className || '?',
                hp: players[m]?.hp || 0, maxHp: players[m]?.maxHp || 1,
                isLeader: m === party.leader,
            }))
        });
    });

    // ── 파티 던전 입장 ──
    socket.on('party_enter_dungeon', (dungeonId) => {
        const p = players[playerId];
        if (!p || !p.partyId) { socket.emit('dungeon_result', { msg: '파티 필요' }); return; }
        const party = parties[p.partyId];
        if (!party || party.leader !== playerId) { socket.emit('dungeon_result', { msg: '파티장만 입장 가능' }); return; }
        const dungeon = DUNGEONS[dungeonId];
        if (!dungeon) { socket.emit('dungeon_result', { msg: '존재하지 않는 던전' }); return; }
        if (party.members.length > dungeon.maxParty) { socket.emit('dungeon_result', { msg: `최대 ${dungeon.maxParty}명` }); return; }

        // 모든 파티원 레벨 체크
        for (const mid of party.members) {
            const member = players[mid];
            if (!member || !member.isAlive) { socket.emit('dungeon_result', { msg: '모든 파티원이 생존해야 함' }); return; }
            if (member.level < dungeon.minLevel) { socket.emit('dungeon_result', { msg: `${member.displayName}: 레벨 ${dungeon.minLevel} 이상 필요` }); return; }
        }

        $.entityIdCounter++;
        const instanceId = 'dungeon_' + $.entityIdCounter;
        activeDungeons[instanceId] = {
            dungeonId, players: [...party.members], currentStage: 0,
            monstersLeft: dungeon.monsters[0].count,
            startTime: Date.now(), totalStages: dungeon.stages,
        };
        for (const mid of party.members) {
            if (players[mid]) players[mid].inDungeon = instanceId;
            io.to(mid).emit('dungeon_enter', {
                instanceId, name: dungeon.name, stage: 1, totalStages: dungeon.stages,
                monstersLeft: dungeon.monsters[0].count, tier: dungeon.monsters[0].tier
            });
        }
        io.emit('server_msg', { msg: `${p.displayName}의 파티가 ${dungeon.name}에 입장! (${party.members.length}명)`, type: 'normal' });
    });

    // ── 창고 ──
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

    socket.on('get_warehouse', () => {
        const p = players[playerId];
        if (!p) return;
        socket.emit('warehouse_data', { warehouse: p.warehouse || {}, inventory: p.inventory || {} });
    });

    // ── 몬스터 테이밍 (포켓몬) ──
    // 가장 가까운 몬스터 자동 테이밍
    socket.on('tame_nearest', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) { socket.emit('tame_result', {success:false, msg:'캐릭터가 없습니다'}); return; }
        let nearestId = null, nearestDist = 999;
        for (const mId in monsters) {
            if (!monsters[mId].isAlive) continue;
            const d = Math.hypot(p.x - monsters[mId].x, p.y - monsters[mId].y);
            if (d < nearestDist) { nearestDist = d; nearestId = mId; }
        }
        if (!nearestId || nearestDist > 8) {
            socket.emit('tame_result', {success:false, msg:'근처 몬스터 없음 (8 이내)'});
            return;
        }
        doTame(playerId, nearestId, socket);
    });

    socket.on('tame_monster', (monsterId) => { doTame(playerId, monsterId, socket); });

    function doTame(ownerId, monsterId, sock) {
        const p = players[ownerId];
        if (!p || !p.isAlive) return;
        const mob = monsters[monsterId];
        if (!mob || !mob.isAlive) { sock.emit('tame_result', { success:false, msg:'대상 없음' }); return; }
        const dist = Math.hypot(p.x - mob.x, p.y - mob.y);
        if (dist > 8) { sock.emit('tame_result', { success:false, msg:'너무 멀어요 (8 이내)' }); return; }
        const tameCost = TAME_COSTS[mob.tier] || 50;
        if (p.gold < tameCost) { sock.emit('tame_result', { success:false, msg:`${tameCost}G 필요` }); return; }

        p.gold -= tameCost;
        const rate = TAME_RATES[mob.tier] || 0.1;
        const success = Math.random() < rate;

        if (success) {
            // 테이밍 성공 → 용병으로 추가
            let myArmyCount = 0;
            for (const bId in players) {
                if (players[bId].isBot && players[bId].ownerId === ownerId && players[bId].isAlive) myArmyCount++;
            }
            if (myArmyCount >= (p.maxArmy || 30)) {
                sock.emit('tame_result', { success:false, msg:'용병 슬롯 부족!' });
                return;
            }

            // 몬스터 → 용병 변환
            const tier = MONSTER_TIERS[mob.tier];
            $.entityIdCounter++;
            const botId = 'tamed_' + $.entityIdCounter;
            const cls = CLASSES['Warrior']; // 기본 워리어 베이스
            players[botId] = {
                id: botId, deviceId: 'tamed',
                className: 'Warrior', displayName: p.displayName + '의 ' + mob.name,
                x: p.x + (Math.random() * 4 - 2), y: p.y + (Math.random() * 4 - 2),
                hp: mob.maxHp, maxHp: mob.maxHp,
                atk: mob.atk || 10, def: mob.def || 5,
                critRate: 0.1, dodgeRate: 0.05,
                dmgMulti: 1.0,
                dirX: 0, dirY: -1,
                gold: 0, level: Math.max(1, Math.floor(mob.maxHp / 50)), exp: 0,
                isAlive: true, killCount: 0, karma: 0,
                team: p.team, ownerId: ownerId,
                targetId: null, isKing: false, isBot: true,
                tamedTier: mob.tier, tamedName: mob.name,
                // 등급별 공격 스타일
                attackStyle: mob.tier === 'normal' ? 'melee' : mob.tier === 'elite' ? 'charge' : mob.tier === 'rare' ? 'aoe' : 'breath',
                lastHpRegen: Date.now(), autoSkillCooldown: 0, skillCooldowns: {},
            };

            // 등급별 스탯 보정
            if (mob.tier === 'elite') { players[botId].atk *= 1.3; players[botId].def *= 1.2; }
            if (mob.tier === 'rare')  { players[botId].atk *= 1.6; players[botId].critRate = 0.2; }
            if (mob.tier === 'boss')  { players[botId].atk *= 2.0; players[botId].maxHp *= 1.5; players[botId].hp = players[botId].maxHp; }

            // 몬스터 제거
            delete monsters[monsterId];
            io.emit('monster_die', { id: monsterId, tier: mob.tier, killer: ownerId });
            spawnMonster();
            io.emit('monster_spawn', monsters['monster_' + $.entityIdCounter]);

            io.emit('player_join', players[botId]);
            io.emit('server_msg', { msg: `${p.displayName}이(가) ${mob.name}을(를) 테이밍!`, type: 'morph' });
            sock.emit('tame_result', { success:true, msg: `${mob.name} 테이밍 성공! (${Math.floor(rate*100)}%)` });
            p.totalTamed = (p.totalTamed || 0) + 1;
        } else {
            // 테이밍 실패 → 몬스터 화남 (플레이어에게 데미지)
            p.hp -= mob.atk || 10;
            sock.emit('tame_result', { success:false, msg: `테이밍 실패! (${Math.floor(rate*100)}%) 몬스터가 화났다!` });
            io.emit('player_hit', { id: ownerId, hp: p.hp, damage: mob.atk || 10, isCrit: false });
        }
        savePlayer(p);
        io.emit('player_update', p);
    }

    // ── 거상 — 마을 상점 매매 ──
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

    socket.on('get_town_prices', () => {
        socket.emit('town_prices', $.townPrices);
    });

    // ── 용병 거래 (제안) ──
    socket.on('trade_unit', (dataStr) => {
        try {
            const data = JSON.parse(dataStr);
            const unitId = data && data.unitId;
            const targetPlayerId = data && data.targetPlayerId;
            const price = Math.floor(Number(data && data.price));
            if (!Number.isFinite(price) || price < 0 || price > MAX_GOLD) return;
            const p = players[playerId];
            const t = players[targetPlayerId];
            const unit = players[unitId];
            if (!p || !t || !unit || !unit.isBot || unit.ownerId !== playerId) return;
            if (t.isBot || targetPlayerId === playerId) return;
            const dist = Math.hypot(p.x - t.x, p.y - t.y);
            if (dist > 10) { socket.emit('trade_result', { success:false, msg:'너무 멀어요' }); return; }

            // 즉시 거래가 아닌 제안 — 대상이 unit_buy_accept로 수락해야 실행
            if (!t._pendingUnitOffers) t._pendingUnitOffers = {};
            t._pendingUnitOffers[unitId] = { sellerId: playerId, price, expiresAt: Date.now() + 60000 };
            io.to(targetPlayerId).emit('unit_offer', { unitId, sellerId: playerId, sellerName: p.displayName, price, unitClass: unit.className });
            socket.emit('trade_result', { success:true, msg:`${t.displayName}에게 용병 판매 제안 (${price}G)` });
        } catch(e) {}
    });

    // ── 용병 구매 수락 ──
    socket.on('unit_buy_accept', (unitId) => {
        const t = players[playerId];
        if (!t || !t._pendingUnitOffers || !t._pendingUnitOffers[unitId]) return;
        const offer = t._pendingUnitOffers[unitId];
        if (Date.now() > offer.expiresAt) { delete t._pendingUnitOffers[unitId]; return; }
        const p = players[offer.sellerId];
        const unit = players[unitId];
        if (!p || !unit || !unit.isBot || unit.ownerId !== offer.sellerId) {
            delete t._pendingUnitOffers[unitId];
            socket.emit('trade_result', { success:false, msg:'제안이 유효하지 않습니다' });
            return;
        }
        if (t.gold < offer.price) { socket.emit('trade_result', { success:false, msg:'골드 부족' }); return; }
        delete t._pendingUnitOffers[unitId];
        // 실행
        unit.ownerId = playerId;
        unit.team = t.team;
        if (offer.price > 0) { t.gold -= offer.price; p.gold += offer.price; }
        savePlayer(p); savePlayer(t);
        io.to(offer.sellerId).emit('trade_result', { success:true, msg:`용병 판매 완료! +${offer.price}G` });
        socket.emit('trade_result', { success:true, msg:`용병 구매 완료! -${offer.price}G` });
        io.emit('player_update', p);
        io.emit('player_update', t);
        io.emit('player_update', unit);
    });

    // ── 공성전 ──
    socket.on('start_siege', () => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) { socket.emit('siege_result', { msg:'혈맹 필요' }); return; }
        // 군주만 공성 선포 가능 (clan_war_declare와 일관성)
        if (clans[p.clanName].leader !== playerId) { socket.emit('siege_result', { msg:'군주만 선포 가능' }); return; }
        if ($.siegeActive) { socket.emit('siege_result', { msg:'이미 공성 중' }); return; }
        if ($.castleOwner === p.clanName) { socket.emit('siege_result', { msg:'이미 성 소유 중' }); return; }

        $.siegeActive = true;
        io.emit('server_msg', { msg:`[공성전] ${p.clanName} 혈맹이 왕의 성에 공격을 선포했습니다! (5분)`, type:'boss' });

        $.siegeTimer = setTimeout(() => {
            $.siegeActive = false;
            // 공성 성공 여부: 성 구역에 공격자 혈맹이 가장 많으면 성공
            const clanCounts = {};
            for (const pid in players) {
                const pl = players[pid];
                if (!pl.isAlive || !pl.clanName || pl.isBot) continue;
                const z = getZone(pl.x, pl.y);
                // getZone은 맵 밖에서 null 반환 가능 — 크래시 방지
                if (z && z.isCastle) {
                    clanCounts[pl.clanName] = (clanCounts[pl.clanName] || 0) + 1;
                }
            }
            let winner = null, maxCount = 0;
            for (const [clan, count] of Object.entries(clanCounts)) {
                if (count > maxCount) { maxCount = count; winner = clan; }
            }
            if (winner) {
                $.castleOwner = winner;
                io.emit('server_msg', { msg:`[공성전] ${winner} 혈맹이 왕의 성을 차지했습니다!`, type:'rare' });
            } else {
                io.emit('server_msg', { msg:`[공성전] 공성 실패 — 성을 지켜냈습니다!`, type:'normal' });
            }
        }, 300000); // 5분

        socket.emit('siege_result', { msg:'공성전 시작! 5분 내에 성을 점령하세요!' });
    });

    // ── 1:1 거래 ──
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
    socket.on('craft', (recipeId) => {
        const p = players[playerId];
        if (!p) return;
        const result = handleCraft(p, recipeId, io);
        if (result.success) {
            p.totalCrafts = (p.totalCrafts || 0) + 1;
            checkTitles(p);
        }
        savePlayer(p);
        socket.emit('craft_result', result);
        if (result.success) io.emit('player_update', p);
    });

    // ── 스킬 상세 정보 ──
    socket.on('get_skills', () => {
        const p = players[playerId];
        if (!p) return;
        const cls = p.baseClassName || p.className;
        const skills = SKILLS[cls] || [];
        const skillData = skills.map(s => ({
            name: s.name, type: s.type,
            dmgMulti: s.dmgMulti || 0, cooldown: s.cooldown || 0,
            mpCost: s.mpCost || 0, range: s.range || 0,
            level: s.level, aoe: s.aoe || false,
            desc: s.stealth ? '은신 후 다음 공격 2배' :
                  s.allyAtkMulti ? '아군 ATK +' + Math.floor((s.allyAtkMulti-1)*100) + '%' :
                  s.taunt ? '몬스터 어그로 강제 변경' :
                  s.dmgReduce ? '받는 데미지 ' + Math.floor(s.dmgReduce*100) + '% 감소' :
                  s.allyInvincible ? '아군 무적 ' + s.duration + '초' :
                  s.chainCount ? '적 ' + s.chainCount + '명 연쇄 타격' :
                  s.executeThreshold ? 'HP ' + Math.floor(s.executeThreshold*100) + '% 이하 처형' :
                  s.poisonDot ? '공격 시 독 ' + s.poisonDot + '/초' :
                  s.hpThreshold ? 'HP ' + Math.floor(s.hpThreshold*100) + '%↓ → ATK +' + Math.floor(s.atkBonus*100) + '%' :
                  s.allyDefMulti ? '아군 DEF +' + Math.floor((s.allyDefMulti-1)*100) + '%' :
                  s.mpRegenMulti ? 'MP 회복 +' + Math.floor((s.mpRegenMulti-1)*100) + '%' :
                  s.dmgMulti ? '데미지 x' + s.dmgMulti : '패시브',
            unlocked: p.level >= s.level,
            cooldownLeft: p.skillCooldowns?.[s.name] ? Math.max(0, Math.ceil((s.cooldown*1000 - (Date.now() - p.skillCooldowns[s.name]))/1000)) : 0,
        }));
        socket.emit('skill_data', skillData);
    });

    // ── 장비 비교 정보 ──
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

    socket.on('get_recipes', () => {
        socket.emit('recipe_list', RECIPES);
    });

    // ── 펫 구매 ──
    socket.on('buy_pet', (petId) => {
        const p = players[playerId];
        if (!p) return;
        const result = handleBuyPet(p, petId);
        if (result.success) savePlayer(p);
        socket.emit('pet_result', result);
    });

    // ── 펫 진화 ──
    socket.on('evolve_pet', (petId) => {
        const p = players[playerId];
        if (!p) return;
        const result = handleEvolvePet(p, petId);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
            io.emit('server_msg', { msg: `${p.displayName}이(가) 펫을 진화시켰습니다: ${result.msg}`, type: 'rare' });
        }
        socket.emit('pet_result', result);
    });

    // ── 탈것 구매 ──
    socket.on('buy_mount', (mountId) => {
        const p = players[playerId];
        if (!p) return;
        const result = handleBuyMount(p, mountId);
        if (result.success) savePlayer(p);
        socket.emit('mount_result', result);
    });

    // ── 버프 사용 (인벤토리 아이템) ──
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
    socket.on('chat', (msg) => {
        const p = players[playerId];
        if (!p || typeof msg !== 'string' || msg.length > 100) return;
        // 레이트 리밋: 2초 윈도우 4메시지 → 초과 시 5초 뮤트
        const now = Date.now();
        if (!p._chatLog) p._chatLog = [];
        if (p._chatMutedUntil && now < p._chatMutedUntil) {
            socket.emit('chat_msg', { sender: 'SYSTEM', msg: `채팅 도배 방지 — ${Math.ceil((p._chatMutedUntil-now)/1000)}초 후 가능`, team: 'system' });
            return;
        }
        p._chatLog = p._chatLog.filter(t => now - t < 2000);
        p._chatLog.push(now);
        if (p._chatLog.length > 4) {
            p._chatMutedUntil = now + 5000;
            p._chatLog = [];
            socket.emit('chat_msg', { sender: 'SYSTEM', msg: '채팅 도배 방지 — 5초간 채팅 불가', team: 'system' });
            return;
        }
        const cleanMsg = msg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const titleInfo = p.activeTitle && TITLES[p.activeTitle] ? TITLES[p.activeTitle] : null;
        io.emit('chat_msg', {
            sender: p.displayName || p.className,
            msg: cleanMsg,
            team: p.team,
            isKing: p.isKing,
            karma: p.karma,
            title: titleInfo?.name || null,
            titleColor: titleInfo?.color || null,
            faction: p.faction ? FACTIONS[p.faction]?.name : null,
            level: p.level,
        });
    });

    socket.on('disconnect', () => {
        if (players[playerId]) {
            const p = players[playerId];
            if (p.isKing) hasKing = false;
            // 던전 인스턴스 정리
            if (p.inDungeon && activeDungeons[p.inDungeon]) {
                const inst = activeDungeons[p.inDungeon];
                inst.players = inst.players.filter(pid => pid !== playerId);
                if (inst.players.length === 0) delete activeDungeons[p.inDungeon];
            }
            // 낚시 타이머 정리
            if (p._fishTimer1) clearTimeout(p._fishTimer1);
            if (p._fishTimer2) clearTimeout(p._fishTimer2);
            // 무한의 탑 정리
            if (towerProgress[playerId]) delete towerProgress[playerId];
            // 아레나 큐 정리
            arenaQueue = arenaQueue.filter(id => id !== playerId);
            // 진행 중 아레나 매치 즉시 포기 처리 (상대가 3분 대기하지 않도록)
            if (p.arenaMatchId && arenaMatches[p.arenaMatchId]) {
                const match = arenaMatches[p.arenaMatchId];
                const opponentId = match.player1 === playerId ? match.player2 : match.player1;
                endArenaMatch(p.arenaMatchId, opponentId, playerId, '상대 이탈');
            }
            // 대기 중 거래/결투/용병 제안 정리 (상대 플레이어에 걸어둔 것도 제거)
            for (const otherId in players) {
                const other = players[otherId];
                if (other._pendingTrades && other._pendingTrades[playerId]) delete other._pendingTrades[playerId];
                if (other._pendingDuels && other._pendingDuels[playerId]) delete other._pendingDuels[playerId];
                if (other._pendingDiceOffers && other._pendingDiceOffers[playerId]) delete other._pendingDiceOffers[playerId];
                if (other._pendingUnitOffers) {
                    for (const uid in other._pendingUnitOffers) {
                        if (other._pendingUnitOffers[uid].sellerId === playerId) delete other._pendingUnitOffers[uid];
                    }
                }
            }

            savePlayer(p);

            for (const bId of Object.keys(players)) {
                if (players[bId] && players[bId].isBot && players[bId].ownerId === playerId) {
                    io.emit('player_leave', bId);
                    delete players[bId];
                }
            }
            delete players[playerId];
            io.emit('player_leave', playerId);
        }
    });
});
}

module.exports = { registerConnection };

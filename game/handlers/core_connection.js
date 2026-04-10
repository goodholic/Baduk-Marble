// core connection handlers (split from connection.js)

function registerCoreConnectionHandlers(socket, $) {
    const {
        playerId, players, io, savePlayer, pool, monsters, drops, axes, aoes,
        recalcStats, getZone, getNpcMsg, isOnRoad, isBlocked, isSlowTerrain, CLASSES, QUESTS,
        CLASS_ADVANCE, ZONES, EQUIPMENT_SLOTS, EQUIP_STATS, GRADE_INFO, ZONE_AMBIENCE, NPCS, getMountSpeed,
        TITLES, capResources, giveExp, executeThrow, arenaMatches, ELEMENTS, FACTIONS, getYesterday,
        getWeekNumber, MONSTER_TIERS, KARMA, ZONE_MONSTERS, ZONE_CONNECTIONS,
        TERRAIN_BARRIERS, ROADS,
    } = $;
    // --- init_request ---
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
                        mp: ext.mp || 100,
                        maxMp: ext.maxMp || 100,
                        element: ext.element || ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
                        questProgress: ext.questProgress || {},
                        questCompleted: ext.questCompleted || {},
                        _storyQuests: ext._storyQuests || null,
                        _totalPlaytime: ext._totalPlaytime || 0,
                        _totalGoldEarned: ext._totalGoldEarned || 0,
                        _summons: ext._summons || null,
                        _weatherDungeon: ext._weatherDungeon || null,
                        _pvpMatch: ext._pvpMatch || null,
                        _bountyHunter: ext._bountyHunter || null,
                        _race: ext._race || null,
                        _relicFusion: ext._relicFusion || null,
                        _skillWave: ext._skillWave || null,
                        _achievements: ext._achievements || null,
                        _wishTree: ext._wishTree || null,
                        _soulSystem: ext._soulSystem || null,
                        _timeDungeon: ext._timeDungeon || null,
                        _mythicSummon: ext._mythicSummon || null,
                        _ancientRuins: ext._ancientRuins || null,
                        _advGuild: ext._advGuild || null,
                        _magicLab: ext._magicLab || null,
                        // v2.38~v2.56 시스템
                        _moonSanctuary: ext._moonSanctuary || null,
                        _weaponSoul: ext._weaponSoul || null,
                        _fortress: ext._fortress || null,
                        _astral: ext._astral || null,
                        _cursedDungeon: ext._cursedDungeon || null,
                        _fateDuel: ext._fateDuel || null,
                        _spiritForge: ext._spiritForge || null,
                        _colosseum: ext._colosseum || null,
                        _dreamArch: ext._dreamArch || null,
                        _constellWar: ext._constellWar || null,
                        _forbiddenLib: ext._forbiddenLib || null,
                        _beastColossus: ext._beastColossus || null,
                        _caravan: ext._caravan || null,
                        _memoryPalace: ext._memoryPalace || null,
                        _demonThrone: ext._demonThrone || null,
                        _celestialForge: ext._celestialForge || null,
                        _livingGrimoire: ext._livingGrimoire || null,
                        _worldSeed: ext._worldSeed || null,
                        _fateWeaver: ext._fateWeaver || null,
                        // pre-v2.37 시스템
                        _grimoire: ext._grimoire || null,
                        _bloodline: ext._bloodline || null,
                        _soulContract: ext._soulContract || null,
                        _ancientLang: ext._ancientLang || null,
                        _divine: ext._divine || null,
                        _pastLife: ext._pastLife || null,
                        _mutationLog: ext._mutationLog || null,
                        _cursedEquip: ext._cursedEquip || null,
                        _alchemy: ext._alchemy || null,
                        _golem: ext._golem || null,
                        _hallRelics: ext._hallRelics || [],
                        _spiritPact: ext._spiritPact || null,
                        _mythicWeapon: ext._mythicWeapon || null,
                        _dimTravel: ext._dimTravel || null,
                        _riftDepth: ext._riftDepth || 0,
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
                    const botId = 'bot_restored_' + $.nextEntityId();
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
                        if (m.gold > 0) { pInfo.gold = Math.min(999999999, pInfo.gold + m.gold); totalGold += m.gold; }
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
        if ($.pendingMails[pInfo.displayName] && $.pendingMails[pInfo.displayName].length > 0) {
            const mails = $.pendingMails[pInfo.displayName];
            let totalGold = 0, itemSummary = [];
            if (!pInfo.inventory) pInfo.inventory = {};
            for (const m of mails) {
                if (m.gold > 0) { pInfo.gold = Math.min(999999999, pInfo.gold + m.gold); totalGold += m.gold; }
                if (m.itemId && m.itemCount > 0) {
                    pInfo.inventory[m.itemId] = (pInfo.inventory[m.itemId] || 0) + m.itemCount;
                    itemSummary.push(`${m.itemId} x${m.itemCount}`);
                }
            }
            delete $.pendingMails[pInfo.displayName];
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
            pInfo.diamonds = Math.min(999999999, (pInfo.diamonds || 0) + attendReward.diamonds);
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


    // --- move ---
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
                        if (pct === 25) { p.gold = Math.min(999999999, (p.gold || 0) + 1000); savePlayer(p); socket.emit('server_msg', { msg: '[탐험] 25% 달성! +1000G', type: 'rare' }); }
                        if (pct === 50) { p.diamonds = Math.min(999999999, (p.diamonds||0) + 50); savePlayer(p); socket.emit('server_msg', { msg: '[탐험] 50% 달성! +50D', type: 'rare' }); }
                        if (pct === 75) { p.diamonds = Math.min(999999999, (p.diamonds||0) + 100); savePlayer(p); socket.emit('server_msg', { msg: '[탐험] 75% 달성! +100D', type: 'rare' }); }
                        if (pct >= 100) { savePlayer(p); io.emit('server_msg', { msg: `[탐험] ${p.displayName}이(가) 전 지역 탐험 완료!`, type: 'boss' }); }
                    }
                }
            }
        } catch(e) {}
    });

    // PvP 토글 (카오틱/킹 시스템)
    // ── NPC 상호작용 ──

    // --- interact_npc ---
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

    // --- npc_travel_to ---
    socket.on('npc_travel_to', (townId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const targetZone = ZONES[townId];
        if (!targetZone || !targetZone.safe) return;
        const cost = 100;
        if ((p.gold || 0) < cost) { socket.emit('npc_result', { msg: `이동 비용 ${cost}G 부족` }); return; }
        p.gold -= cost;
        p.x = targetZone.x + targetZone.w / 2;
        p.y = targetZone.y + targetZone.h / 2;
        savePlayer(p);
        io.emit('player_update', p);
        socket.emit('npc_result', { msg: `${targetZone.name}(으)로 이동 완료! (-${cost}G)` });
    });


    // --- update_dir ---
    socket.on('update_dir', (data) => {
        try {
            const d = JSON.parse(data);
            if (players[playerId] && players[playerId].isAlive) {
                if (d.dirX !== undefined) players[playerId].dirX = d.dirX;
                if (d.dirY !== undefined) players[playerId].dirY = d.dirY;
            }
        } catch(e) {}
    });


    // --- throw ---
    socket.on('throw', () => {
        if (!players[playerId] || !players[playerId].isAlive) return;
        executeThrow(playerId);
    });


    // --- respawn ---
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

    // --- chat ---
    socket.on('chat', (msg) => {
        console.log(`[Chat] ${playerId}: "${msg}" io=${!!io}`);
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


    // --- disconnect ---
    socket.on('disconnect', () => {
        if (players[playerId]) {
            const p = players[playerId];
            if (p.isKing) $.hasKing = false;
            // 던전 인스턴스 정리
            if (p.inDungeon && $.activeDungeons[p.inDungeon]) {
                const inst = $.activeDungeons[p.inDungeon];
                inst.players = inst.players.filter(pid => pid !== playerId);
                if (inst.players.length === 0) delete $.activeDungeons[p.inDungeon];
            }
            // 낚시 타이머 정리
            if (p._fishTimer1) clearTimeout(p._fishTimer1);
            if (p._fishTimer2) clearTimeout(p._fishTimer2);
            // 무한의 탑 정리
            if ($.towerProgress[playerId]) delete $.towerProgress[playerId];
            // 아레나 큐 정리
            $.arenaQueue = $.arenaQueue.filter(id => id !== playerId);
            // 진행 중 아레나 매치 즉시 포기 처리 (상대가 3분 대기하지 않도록)
            if (p.arenaMatchId && arenaMatches[p.arenaMatchId]) {
                const match = arenaMatches[p.arenaMatchId];
                const opponentId = match.player1 === playerId ? match.player2 : match.player1;
                $.endArenaMatch(p.arenaMatchId, opponentId, playerId, '상대 이탈');
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

}

module.exports = { registerCoreConnectionHandlers };

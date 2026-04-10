// combat_pvp connection handlers (split from connection.js)

function registerCombatPvpConnectionHandlers(socket, $) {
    const {
        playerId, players, io, savePlayer, monsters, drops, recalcStats, getZone, CLASSES,
        ZONES, EQUIP_STATS, GRADE_INFO, TAME_RATES, TAME_COSTS, capResources, spawnMonster, giveExp,
        clans, arenaMatches, arenaRankings, MONSTER_TIERS, DUNGEONS,
    } = $;
    // --- toggle_pvp ---
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
            if (!$.hasKing) {
                p.team = 'king_' + playerId;
                p.isKing = true;
                p.maxHp = Math.floor(p.maxHp * 1.8); // 3→1.8배
                p.hp = p.maxHp;
                p.dmgMulti *= 1.4; // 2→1.4배
                $.hasKing = true;
            } else {
                p.team = 'pvp_' + playerId;
                p.maxHp = Math.floor(p.maxHp * 1.3); // 1.5→1.3배
                p.hp = p.maxHp;
                p.dmgMulti *= 1.3; // 1.2→1.3배
            }
        } else {
            if (p.isKing) { $.hasKing = false; p.isKing = false; }
            p.team = 'peace';
            recalcStats(p); // 장비 보너스 포함 재계산
            p.dmgMulti = 1.0 + (p.level - 1) * 0.08;
            if (p.hp > p.maxHp) p.hp = p.maxHp;
        }

        if (p.team !== 'peace') trackQuest(p, 'toggle_pvp', 1);
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

    // --- build_tower ---
    socket.on('build_tower', () => {
        const p = players[playerId];
        if (!p || !p.isAlive || p.team === 'peace' || (p.gold || 0) < 80) return;

        p.gold -= 80;
        const towerId = 'tower_' + $.nextEntityId();
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

    // --- add_bot ---
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
            const botId = 'bot_manual_' + $.nextEntityId();

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

    // --- duel_request ---
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

    // --- duel_accept ---
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
        $.arenaMatchIdCounter++;
        const matchId = 'duel_' + $.arenaMatchIdCounter;
        const arenaZone = ZONES.arena;
        p.x = arenaZone.x + arenaZone.w - 10; p.y = arenaZone.y + arenaZone.h / 2;
        challenger.x = arenaZone.x + 10; challenger.y = arenaZone.y + arenaZone.h / 2;
        p.hp = p.maxHp; challenger.hp = challenger.maxHp;

        arenaMatches[matchId] = { player1: fromId, player2: playerId, startTime: Date.now(), isDuel: true };
        p.arenaMatchId = matchId; challenger.arenaMatchId = matchId;

        io.to(playerId).emit('arena_start', { matchId, opponent: challenger.displayName, opponentClass: challenger.className });
        io.to(fromId).emit('arena_start', { matchId, opponent: p.displayName, opponentClass: p.className });
        io.emit('server_msg', { msg: `[결투] ${challenger.displayName} vs ${p.displayName} 결투 시작!`, type: 'rare' });
        $.logWorldEvent(`결투: ${challenger.displayName} vs ${p.displayName}`, 'rare');

        // 3분 타임아웃 (아레나와 동일)
        setTimeout(() => {
            const match = arenaMatches[matchId];
            if (!match) return;
            const hp1 = players[match.player1]?.hp / (players[match.player1]?.maxHp||1) || 0;
            const hp2 = players[match.player2]?.hp / (players[match.player2]?.maxHp||1) || 0;
            const winnerId = hp1 >= hp2 ? match.player1 : match.player2;
            const loserId = winnerId === match.player1 ? match.player2 : match.player1;
            $.endArenaMatch(matchId, winnerId, loserId, '시간 초과 (HP 판정)');
        }, 180000);
    });

    // ── 맵 핑 (파티원에게) ──

    // --- active_tap ---
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

    // --- claim_critical_loot ---
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
            p.gold = Math.min(999999999, p.gold + 1000);
            socket.emit('loot_result', { msg: '크리티컬 루트! +1000G!' });
        }
        io.emit('drop_destroy', dropId);
        delete drops[dropId];
        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 버프 탭 연장 (50 MP로 +2초) ──

    // --- extend_buff ---
    socket.on('extend_buff', (buffId) => {
        const p = players[playerId];
        if (!p || !p.activeBuffs || !p.activeBuffs[buffId]) return;
        if ((p.mp || 0) < 50) { socket.emit('buff_result', { msg: 'MP 부족 (50 필요)' }); return; }
        p.mp -= 50;
        p.activeBuffs[buffId].endTime += 2000;
        socket.emit('buff_result', { msg: p.activeBuffs[buffId].name + ' +2초 연장! (-50MP)' });
    });

    // ── 캐릭터 프로필 ──

    // --- toggle_auto_skill ---
    socket.on('toggle_auto_skill', () => {
        const p = players[playerId];
        if (!p) return;
        p.autoSkill = !p.autoSkill;
        socket.emit('auto_skill_status', { enabled: p.autoSkill });
        socket.emit('combat_log', { msg: '자동 스킬 ' + (p.autoSkill ? 'ON ⚔' : 'OFF') });
    });

    // ── 자동 물약 토글 ──

    // --- toggle_auto_potion ---
    socket.on('toggle_auto_potion', () => {
        const p = players[playerId];
        if (!p) return;
        p.autoPotion = !p.autoPotion;
        socket.emit('auto_potion_status', { enabled: p.autoPotion });
    });

    // ── 던전 입장 ──

    // --- enter_dungeon ---
    socket.on('enter_dungeon', (dungeonId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const dungeon = DUNGEONS[dungeonId];
        if (!dungeon) { socket.emit('dungeon_result', { msg: '존재하지 않는 던전' }); return; }
        if (p.level < dungeon.minLevel) { socket.emit('dungeon_result', { msg: `레벨 ${dungeon.minLevel} 이상 필요` }); return; }
        if (p.inDungeon) { socket.emit('dungeon_result', { msg: '이미 던전에 참가 중' }); return; }

        // 던전 인스턴스 생성
        const instanceId = 'dungeon_' + $.nextEntityId();
        $.activeDungeons[instanceId] = {
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

    // --- dungeon_kill ---
    socket.on('dungeon_kill', () => {
        const p = players[playerId];
        if (!p || !p.inDungeon) return;
        const inst = $.activeDungeons[p.inDungeon];
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
                    pp.gold = Math.min(999999999, pp.gold + rewards.gold);
                    giveExp(pp, rewards.exp);
                    if (!pp.inventory) pp.inventory = {};
                    const dropItem = rewards.drops[Math.floor(Math.random() * rewards.drops.length)];
                    if (Math.random() < 0.3) {
                        pp.inventory[dropItem] = (pp.inventory[dropItem]||0) + 1;
                        const eName = EQUIP_STATS[dropItem]?.name || dropItem;
                        io.to(pid).emit('combat_log', { msg: `던전 보상: ${eName} 획득!` });
                    }
                    pp.inDungeon = null;
                    trackQuest(pp, 'dungeon_clear', 1);
                    io.to(pid).emit('dungeon_clear', { name: dungeon.name, gold: rewards.gold, exp: rewards.exp });
                    io.emit('player_update', pp);
                }
                io.emit('server_msg', { msg: `${dungeon.name} 클리어!`, type: 'rare' });
                delete $.activeDungeons[p.inDungeon];
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

    // --- tower_enter ---
    socket.on('tower_enter', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        if (p.level < 10) { socket.emit('tower_result', { msg: 'Lv.10 이상 필요' }); return; }
        if ($.towerProgress[playerId]) { socket.emit('tower_result', { msg: '이미 탑 도전 중' }); return; }
        const startFloor = (p.towerHighest || 0) + 1;
        if (startFloor > INFINITE_TOWER.maxFloor) { socket.emit('tower_result', { msg: '100층 완전 클리어!' }); return; }
        const monsters = INFINITE_TOWER.getMonsters(startFloor);
        $.towerProgress[playerId] = { currentFloor: startFloor, monstersLeft: monsters.count, startTime: Date.now() };
        socket.emit('tower_enter', { floor: startFloor, maxFloor: INFINITE_TOWER.maxFloor, monstersLeft: monsters.count, tier: monsters.tier, monsterHp: monsters.hp });
    });

    // ── 무한의 탑: 몬스터 처치 ──

    // --- tower_kill ---
    socket.on('tower_kill', () => {
        const p = players[playerId];
        if (!p || !$.towerProgress[playerId]) return;
        const tp = $.towerProgress[playerId];
        // 스팸 쓰로틀 (최소 200ms 간격)
        const nowMs = Date.now();
        if (tp._lastKillAt && nowMs - tp._lastKillAt < 200) return;
        tp._lastKillAt = nowMs;
        tp.monstersLeft--;

        if (tp.monstersLeft <= 0) {
            // 층 클리어
            const reward = INFINITE_TOWER.getReward(tp.currentFloor);
            p.gold = Math.min(999999999, p.gold + reward.gold);
            giveExp(p, reward.exp);
            if (reward.diamonds > 0) p.diamonds = Math.min(999999999, (p.diamonds || 0) + reward.diamonds);
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
                delete $.towerProgress[playerId];
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

    // --- tower_leave ---
    socket.on('tower_leave', () => {
        const p = players[playerId]; if (!p) return;
        if ($.towerProgress[playerId]) {
            socket.emit('tower_result', { msg: `${$.towerProgress[playerId].currentFloor}층에서 포기` });
            delete $.towerProgress[playerId];
        }
    });

    // ── 희귀 상자 오픈 ──

    // --- open_rare_box ---
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
            p.gold = Math.min(999999999, p.gold + gold);
            p.diamonds = Math.min(999999999, (p.diamonds || 0) + dia);
            rewardMsg = `${gold}G + ${dia}D`;
        }
        socket.emit('box_result', { msg: `희귀 상자 오픈! ${rewardMsg}` });
        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 친구 추가 요청 ──

    // --- morph ---
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

    // --- tame_nearest ---
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


    // --- tame_monster ---
    socket.on('tame_monster', (monsterId) => { doTame(playerId, monsterId, socket); });

    function doTame(ownerId, monsterId, sock) {
        const p = players[ownerId];
        if (!p || !p.isAlive) return;
        const mob = monsters[monsterId];
        if (!mob || !mob.isAlive) { sock.emit('tame_result', { success:false, msg:'대상 없음' }); return; }
        const dist = Math.hypot(p.x - mob.x, p.y - mob.y);
        if (dist > 8) { sock.emit('tame_result', { success:false, msg:'너무 멀어요 (8 이내)' }); return; }
        const tameCost = TAME_COSTS[mob.tier] || 50;
        if ((p.gold || 0) < tameCost) { sock.emit('tame_result', { success:false, msg:`${tameCost}G 필요` }); return; }

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
            const botId = 'tamed_' + $.nextEntityId();
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

            io.emit('player_join', players[botId]);
            io.emit('server_msg', { msg: `${p.displayName}이(가) ${mob.name}을(를) 테이밍!`, type: 'morph' });
            sock.emit('tame_result', { success:true, msg: `${mob.name} 테이밍 성공! (${Math.floor(rate*100)}%)` });
            p.totalTamed = (p.totalTamed || 0) + 1;
            trackQuest(p, 'tame_count', 1);
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

    // --- dice_challenge ---
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
        if ((p.gold || 0) < betAmount || target.gold < betAmount) { socket.emit('dice_result', { msg: '골드 부족' }); return; }
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

    // --- dice_accept ---
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
        if ((p.gold || 0) < betAmount || target.gold < betAmount) { socket.emit('dice_result', { msg: '골드 부족' }); return; }
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
        loser.gold = Math.max(0, loser.gold - betAmount);
        winner.gold = Math.min(999999999, winner.gold + betAmount - tax);
        const result = { roll1, roll2, bet: betAmount, winner: winner.displayName, tax };
        io.to(fromId).emit('dice_result', { msg: `주사위: ${roll1} vs ${roll2} → ${winner.displayName} 승리!${winner===p ? ' +'+(betAmount-tax)+'G' : ' -'+betAmount+'G'}`, ...result });
        socket.emit('dice_result', { msg: `주사위: ${roll2} vs ${roll1} → ${winner.displayName} 승리!${winner===target ? ' +'+(betAmount-tax)+'G' : ' -'+betAmount+'G'}`, ...result });
        if (betAmount >= 5000) io.emit('server_msg', { msg: `[도박] ${p.displayName} vs ${target.displayName} — ${betAmount}G 판돈! ${winner.displayName} 승리!`, type: 'rare' });
        savePlayer(p); savePlayer(target);
        io.emit('player_update', p); io.emit('player_update', target);
    });

    // ── 떠돌이 상인 구매 ──

    // --- start_siege ---
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

    // --- arena_join ---
    socket.on('arena_join', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        if (p.level < 10) { socket.emit('arena_result', { msg: 'Lv.10 이상 필요' }); return; }
        if ((p.arenaCountToday || 0) >= 10) { socket.emit('arena_result', { msg: '일일 아레나 10회 초과' }); return; }
        if ($.arenaQueue.includes(playerId)) { socket.emit('arena_result', { msg: '이미 대기 중' }); return; }
        // 이미 매치 중인지 체크
        for (const m of Object.values(arenaMatches)) {
            if (m.player1 === playerId || m.player2 === playerId) {
                socket.emit('arena_result', { msg: '이미 매치 진행 중' }); return;
            }
        }
        $.arenaQueue.push(playerId);
        socket.emit('arena_result', { msg: '아레나 대기열 참가! 상대 매칭 중...' });

        // 매칭 시도
        if ($.arenaQueue.length >= 2) {
            const p1Id = $.arenaQueue.shift();
            const p2Id = $.arenaQueue.shift();
            const p1 = players[p1Id], p2 = players[p2Id];
            if (!p1 || !p2 || !p1.isAlive || !p2.isAlive) return;

            $.arenaMatchIdCounter++;
            const matchId = 'arena_' + $.arenaMatchIdCounter;
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
                $.endArenaMatch(matchId, winnerId, loserId, '시간 초과 - HP 비율 판정');
            }, 180000);
        }
    });

    // ── 아레나: 대기열 취소 ──

    // --- arena_leave ---
    socket.on('arena_leave', () => {
        $.arenaQueue = $.arenaQueue.filter(id => id !== playerId);
        socket.emit('arena_result', { msg: '대기열 취소' });
    });

    // ── 아레나: 랭킹 조회 ──

    // --- arena_rankings ---
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

    // --- start_fishing ---
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

    // --- hook_fish ---
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
        p.gold = Math.min(999999999, p.gold + caught.sell);
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

}

module.exports = { registerCombatPvpConnectionHandlers };

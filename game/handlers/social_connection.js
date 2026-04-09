// social connection handlers (split from connection.js)

function registerSocialConnectionHandlers(socket, $) {
    const {
        players, io, savePlayer, pool, recalcStats, getZone, CLASS_ADVANCE, EQUIP_STATS,
        TRADEABLE_ITEMS, CLAN_LEVEL_EXP, CLAN_MAX_MEMBERS, CLAN_SKILLS, MAX_GOLD, clans, rankings, pendingMails,
        FACTIONS, DUNGEONS,
    } = $;
    // --- get_profile ---
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

    // --- inspect_player ---
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

    // --- friend_request ---
    socket.on('friend_request', (targetId) => {
        const p = players[playerId];
        if (!p || !players[targetId] || players[targetId].isBot) return;
        if (targetId === playerId) return;
        if (!$.friendLists[playerId]) $.friendLists[playerId] = [];
        if ($.friendLists[playerId].includes(targetId)) { socket.emit('friend_result', { msg: '이미 친구입니다' }); return; }
        if ($.friendLists[playerId].length >= 50) { socket.emit('friend_result', { msg: '친구 최대 50명' }); return; }

        if (!$.friendRequests[targetId]) $.friendRequests[targetId] = [];
        // 중복 요청 방지 (스팸 차단)
        if ($.friendRequests[targetId].some(r => r.fromId === playerId)) {
            socket.emit('friend_result', { msg: '이미 요청을 보냈습니다' });
            return;
        }
        // 받은 요청 한도 (스팸 차단)
        if ($.friendRequests[targetId].length >= 30) {
            socket.emit('friend_result', { msg: '상대 받은 요청 한도 초과' });
            return;
        }
        $.friendRequests[targetId].push({ fromId: playerId, fromName: p.displayName, time: Date.now() });
        io.to(targetId).emit('friend_request_received', { fromId: playerId, fromName: p.displayName });
        socket.emit('friend_result', { msg: `${players[targetId].displayName}에게 친구 요청 전송` });
    });

    // ── 친구 요청 수락 ──

    // --- friend_accept ---
    socket.on('friend_accept', (fromId) => {
        const p = players[playerId];
        if (!p || !players[fromId]) return;
        if (!$.friendRequests[playerId]) return;
        const reqIdx = $.friendRequests[playerId].findIndex(r => r.fromId === fromId);
        if (reqIdx === -1) return;
        $.friendRequests[playerId].splice(reqIdx, 1);

        if (!$.friendLists[playerId]) $.friendLists[playerId] = [];
        if (!$.friendLists[fromId]) $.friendLists[fromId] = [];
        // 양쪽 한도 + 중복 검증
        if ($.friendLists[playerId].length >= 50 || $.friendLists[fromId].length >= 50) {
            socket.emit('friend_result', { msg: '친구 목록 한도 초과 (50명)' });
            return;
        }
        if ($.friendLists[playerId].includes(fromId)) {
            socket.emit('friend_result', { msg: '이미 친구입니다' });
            return;
        }
        $.friendLists[playerId].push(fromId);
        $.friendLists[fromId].push(playerId);

        socket.emit('friend_result', { msg: `${players[fromId]?.displayName || '?'}와 친구가 되었습니다!` });
        io.to(fromId).emit('friend_result', { msg: `${p.displayName}와 친구가 되었습니다!` });
    });

    // ── 친구 삭제 ──

    // --- friend_remove ---
    socket.on('friend_remove', (targetId) => {
        if (!$.friendLists[playerId]) return;
        $.friendLists[playerId] = $.friendLists[playerId].filter(f => f !== targetId);
        if ($.friendLists[targetId]) $.friendLists[targetId] = $.friendLists[targetId].filter(f => f !== playerId);
        socket.emit('friend_result', { msg: '친구 삭제 완료' });
    });

    // ── 친구 목록 ──

    // --- get_friends ---
    socket.on('get_friends', () => {
        const list = ($.friendLists[playerId] || []).map(fid => ({
            id: fid, name: players[fid]?.displayName || '?',
            level: players[fid]?.level || 0, className: players[fid]?.className || '?',
            online: !!players[fid]?.isAlive,
        }));
        const requests = ($.friendRequests[playerId] || []).map(r => ({ fromId: r.fromId, fromName: r.fromName }));
        socket.emit('friend_list', { friends: list, requests });
    });

    // ── 귓속말 (1:1 메시지) ──

    // --- whisper ---
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

    // --- get_online_players ---
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

    // --- get_guild_members ---
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

    // --- guild_chat ---
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

    // --- get_ranking ---
    socket.on('get_ranking', () => {
        $.updateRankings();
        socket.emit('ranking_data', rankings);
    });

    // ── 변신(Morph) 시스템 ──

    // --- mail_send ---
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
                    if (!$.pendingMails[targetName]) $.pendingMails[targetName] = [];
                    $.pendingMails[targetName].push({
                        from: p.displayName,
                        itemId: validItemCount ? itemId : null,
                        itemCount: validItemCount ? itemCount : 0,
                        gold: validGold ? gold : 0,
                        timestamp: Date.now(),
                    });
                    if ($.pendingMails[targetName].length > 50) $.pendingMails[targetName].shift();
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

    // --- get_advance_options ---
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

    // --- class_advance ---
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

    // --- create_clan ---
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

    // --- join_clan ---
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

    // --- get_clans ---
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

    // --- clan_donate ---
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

    // --- get_clan_storage ---
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

    // --- clan_storage_deposit ---
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


    // --- clan_storage_withdraw ---
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

    // --- clan_war_declare ---
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

    // --- clan_promote ---
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

    // --- clan_leave ---
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

    // --- clan_kick ---
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

    // --- create_party ---
    socket.on('create_party', () => {
        const p = players[playerId];
        if (!p || p.partyId) { socket.emit('party_result', { success: false, msg: '이미 파티 중' }); return; }
        partyIdCounter++;
        const pid = 'party_' + partyIdCounter;
        p.partyId = pid;
        $.parties[pid] = { leader: playerId, members: [playerId], name: p.displayName + '의 파티' };
        socket.emit('party_result', { success: true, msg: '파티 생성!' });
        socket.emit('party_info', $.parties[pid]);
    });

    // ── 파티 초대 (근처 플레이어 자동) ──

    // --- party_invite_nearby ---
    socket.on('party_invite_nearby', () => {
        const p = players[playerId];
        if (!p || !p.partyId) return;
        const party = $.parties[p.partyId];
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

    // --- leave_party ---
    socket.on('leave_party', () => {
        const p = players[playerId];
        if (!p || !p.partyId) return;
        const party = $.parties[p.partyId];
        if (!party) { p.partyId = null; return; }

        party.members = party.members.filter(m => m !== playerId);

        if (party.members.length === 0) {
            delete $.parties[p.partyId];
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

    // --- disband_party ---
    socket.on('disband_party', () => {
        const p = players[playerId];
        if (!p || !p.partyId) return;
        const party = $.parties[p.partyId];
        if (!party || party.leader !== playerId) { socket.emit('party_result', { success: false, msg: '파티장만 해산 가능' }); return; }

        for (const mid of party.members) {
            if (players[mid]) players[mid].partyId = null;
            io.to(mid).emit('party_result', { success: true, msg: '파티가 해산되었습니다' });
        }
        delete $.parties[p.partyId];
    });

    // ── 파티 정보 조회 ──

    // --- get_party_info ---
    socket.on('get_party_info', () => {
        const p = players[playerId];
        if (!p || !p.partyId || !$.parties[p.partyId]) { socket.emit('party_info', null); return; }
        const party = $.parties[p.partyId];
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

    // --- party_enter_dungeon ---
    socket.on('party_enter_dungeon', (dungeonId) => {
        const p = players[playerId];
        if (!p || !p.partyId) { socket.emit('dungeon_result', { msg: '파티 필요' }); return; }
        const party = $.parties[p.partyId];
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
        $.activeDungeons[instanceId] = {
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

    // --- trade_unit ---
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

    // --- unit_buy_accept ---
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

}

module.exports = { registerSocialConnectionHandlers };

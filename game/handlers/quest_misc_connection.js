// quest_misc connection handlers (split from connection.js)

function registerQuestMiscConnectionHandlers(socket, $) {
    const {
        players, io, savePlayer, recalcStats, SKILLS, QUESTS, ZONES, EMOTES,
        ARENA_TIERS, capResources, getArenaTier, getTodaysChallenge, getThisWeekChallenge, giveExp, clans, arenaRankings,
        rankings, FACTIONS, getWeekNumber, ATTENDANCE_REWARDS, ZONE_MONSTER_NAMES, worldEventLog,
    } = $;
    // --- get_quests ---
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

    // --- quest_claim ---
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

    // --- get_units ---
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

    // --- dismiss_unit ---
    socket.on('dismiss_unit', (unitId) => {
        const p = players[playerId]; if (!p) return;
        const b = players[unitId];
        if (!b || !b.isBot || b.ownerId !== playerId) return;
        b.isAlive = false;
        io.emit('player_die', { victimId: unitId, attackerId: playerId, stolen: false });
        delete players[unitId];
        socket.emit('unit_result', { success:true, msg:`${b.displayName} 해고됨` });
    });

    // ── 용병 NPC 판매 ──

    // --- sell_unit ---
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

    // --- waypoint_teleport ---
    socket.on('waypoint_teleport', (zoneId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        // 던전/아레나/탑 진행 중 도주 차단
        if (p.inDungeon) { socket.emit('waypoint_result', { msg: '던전 내에서는 이동 불가' }); return; }
        if (p.arenaMatchId) { socket.emit('waypoint_result', { msg: '아레나/결투 중 이동 불가' }); return; }
        if ($.towerProgress[playerId]) { socket.emit('waypoint_result', { msg: '무한의 탑 도전 중 이동 불가' }); return; }
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

    // --- get_waypoints ---
    socket.on('get_waypoints', () => {
        const p = players[playerId];
        if (!p) return;
        if (!p.waypoints) p.waypoints = ['aden'];
        const list = p.waypoints.map(zId => ({ id: zId, name: ZONES[zId]?.name || zId }));
        socket.emit('waypoint_list', list);
    });

    // ── 액티브 플레이 보너스 (탭/클릭 시 보너스) ──

    // --- get_world_events ---
    socket.on('get_world_events', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('world_events', worldEventLog.slice(-20).reverse().map(e => ({
            time: Math.floor((Date.now() - e.time) / 60000), msg: e.msg, type: e.type
        })));
    });

    // ── 스킬 쿨타임 실시간 ──

    // --- get_skill_cooldowns ---
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

    // --- clan_raid_start ---
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
        $.logWorldEvent(`${p.clanName} — ${raid.name} 클리어`, 'boss');
    });

    // ── PvP 시즌 정보 ──

    // --- get_arena_season ---
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

    // --- get_daily_challenge ---
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

    // --- get_weekly_challenge ---
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


    // --- claim_weekly_challenge ---
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
        trackQuest(p, 'weekly_all', 1); // 주간 챌린지 완료 실적 추적 (ach_weekly_all)
        savePlayer(p);
        socket.emit('challenge_result', { msg: `[주간] ${challenge.name} 완료! +${challenge.reward.gold}G ${challenge.reward.diamonds ? '+'+challenge.reward.diamonds+'D' : ''}${challenge.reward.item ? ' +'+challenge.reward.item+' x'+(challenge.reward.itemQty||1) : ''}` });
        io.emit('server_msg', { msg: `${p.displayName}이(가) 주간 챌린지 [${challenge.name}] 완료!`, type: 'rare' });
        io.emit('player_update', p);
    });

    // ── 일일 챌린지 보상 수령 ──

    // --- claim_daily_challenge ---
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

    // --- map_ping ---
    socket.on('map_ping', (data) => {
        const p = players[playerId];
        if (!p || !p.partyId || !$.parties[p.partyId]) return;
        $.parties[p.partyId].members.forEach(mid => {
            io.to(mid).emit('map_ping', { name: p.displayName, x: Math.round(data.x), y: Math.round(data.y) });
        });
    });

    // ── 자동 분해 설정 ──

    // --- emote ---
    socket.on('emote', (emoteId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const text = EMOTES[emoteId];
        if (!text) return;
        // 같은 존의 모든 플레이어에게 브로드캐스트
        io.emit('emote_show', { playerId, playerName: p.displayName, emote: text, x: p.x, y: p.y });
    });

    // ── 출석 캘린더 ──

    // --- get_attendance_calendar ---
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

    // --- get_exploration ---
    socket.on('get_exploration', () => {
        const p = players[playerId];
        if (!p) return;
        const discovered = p.discoveredZones || [];
        const total = Object.keys(ZONES).length;
        socket.emit('exploration_data', { discovered, total, pct: total > 0 ? Math.floor(discovered.length / total * 100) : 0 });
    });

    // 5대 신규 시스템 소켓 핸들러
    // ══════════════════════════════════════

    // ── 1. 시즌 균열 입장 ──

    // --- rift_enter ---
    socket.on('rift_enter', () => {
        const p = players[playerId];
        if (!p || !p.isAlive || p.level < 20) { socket.emit('rift_result', { msg: 'Lv.20 이상 필요' }); return; }
        const theme = $.currentSeason.theme;
        if (!p._riftDepth) p._riftDepth = 0;
        p._riftDepth++;
        const depth = p._riftDepth;
        const monsterHp = 500 + depth * 200;
        const monsterAtk = 20 + depth * 10;
        const reward = { gold: 200 + depth * 100, exp: 500 + depth * 200, diamonds: depth % 5 === 0 ? depth * 2 : 0 };

        socket.emit('rift_floor', { depth, theme: theme.name, color: theme.color, monsterHp, monsterAtk, reward });
        // 균열 리더보드 갱신
        $.currentSeason.leaderboard[playerId] = Math.max($.currentSeason.leaderboard[playerId] || 0, depth);
        if (depth % 10 === 0) {
            io.emit('server_msg', { msg: `[균열] ${p.displayName}이(가) ${theme.name} ${depth}층 돌파!`, type: 'rare' });
        }
    });

    // ── 1b. 균열 몬스터 클리어 ──

    // --- rift_clear ---
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

    // --- get_rift_ranking ---
    socket.on('get_rift_ranking', () => {
        const p = players[playerId]; if (!p) return;
        const sorted = Object.entries($.currentSeason.leaderboard)
            .sort((a,b) => b[1] - a[1]).slice(0, 20)
            .map(([pid, depth], i) => ({ rank: i+1, name: players[pid]?.displayName || '?', depth }));
        socket.emit('rift_ranking', { theme: $.currentSeason.theme.name, rankings: sorted });
    });

    // ── 2. 룬 장착 ──

    // --- faction_join ---
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

    // --- get_faction_info ---
    socket.on('get_faction_info', () => {
        const p = players[playerId];
        const info = {};
        for (const [fId, f] of Object.entries(FACTIONS)) {
            const zoneCount = Object.keys($.factionState[fId]?.zones || {}).length;
            info[fId] = { name: f.name, color: f.color, zones: zoneCount, kills: $.factionState[fId]?.kills || 0 };
        }
        socket.emit('faction_info', { factions: info, myFaction: p?.faction || null, myRep: p?.factionRep || 0 });
    });

    // ── 4. 프레스티지 (환생) ──

    // --- prestige ---
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

        trackQuest(p, 'prestige_count', 1);

        // v2.46: 환생의 기억 생성
        let pastLifeResult = null;
        if ($.pastLife) {
            pastLifeResult = $.pastLife.onPrestige(p);
            if (pastLifeResult.gained.length > 0) {
                const memNames = pastLifeResult.gained.map(g => g.icon + g.name).join(', ');
                io.emit('server_msg', { msg: `[전생] ${p.displayName}: ${memNames} 기억 획득!`, type: 'rare' });
            }
        }

        savePlayer(p);
        io.emit('server_msg', { msg: `[환생] ${p.displayName} ${p.prestigeLevel}차 환생! "${perk.name}" 획득!`, type: 'boss' });
        socket.emit('prestige_result', { msg: `${p.prestigeLevel}차 환생! "${perk.name}" — ${perk.desc}. 다시 Lv.1부터!`, perk, pastLife: pastLifeResult });
        io.emit('player_update', p);
    });

    // ── 5. 의뢰 게시판 ──

    // --- contract_create ---
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
        const myOpen = $.contractBoard.filter(c => c.creatorId === playerId && c.status === 'open').length;
        if (myOpen >= 5) { socket.emit('contract_result', { msg: '동시 의뢰 5개 한도 초과' }); return; }
        p.gold -= cost;
        $.contractIdCounter++;
        const contract = {
            id: $.contractIdCounter, creatorId: playerId, creatorName: p.displayName,
            type: safeType, target: safeTarget, reward,
            status: 'open', acceptedBy: null, expiresAt: Date.now() + 3600000, // 1시간
        };
        $.contractBoard.push(contract);
        savePlayer(p);
        socket.emit('contract_result', { msg: `의뢰 등록! "${safeType}" — ${reward}G 보상` });
        io.emit('server_msg', { msg: `[의뢰] ${p.displayName}의 새 의뢰: "${safeType}" (${reward}G)`, type: 'normal' });
    });


    // --- contract_accept ---
    socket.on('contract_accept', (contractId) => {
        const p = players[playerId];
        if (!p) return;
        const c = $.contractBoard.find(x => x.id === contractId && x.status === 'open');
        if (!c) { socket.emit('contract_result', { msg: '의뢰 없음 또는 마감' }); return; }
        if (c.creatorId === playerId) { socket.emit('contract_result', { msg: '자기 의뢰 수락 불가' }); return; }
        c.status = 'accepted';
        c.acceptedBy = playerId;
        c._acceptedAt = Date.now();
        socket.emit('contract_result', { msg: `의뢰 수락! "${c.type}" — 1시간 내 완료하세요.` });
        io.to(c.creatorId).emit('contract_result', { msg: `${p.displayName}이(가) 당신의 의뢰를 수락!` });
    });


    // --- contract_complete ---
    socket.on('contract_complete', (contractId) => {
        const p = players[playerId];
        if (!p) return;
        const c = $.contractBoard.find(x => x.id === contractId && x.acceptedBy === playerId && x.status === 'accepted');
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


    // --- get_contracts ---
    socket.on('get_contracts', () => {
        const now = Date.now();
        $.contractBoard = $.contractBoard.filter(c => now < c.expiresAt && c.status !== 'completed');
        socket.emit('contract_list', $.contractBoard.map(c => ({
            id: c.id, creator: c.creatorName, type: c.type, target: c.target,
            reward: c.reward, status: c.status, timeLeft: Math.floor((c.expiresAt - now)/60000),
        })));
    });

    // ── 아레나: 참가 신청 ──

    // --- add_stat ---
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

    // --- reset_stats ---
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

    // --- get_bestiary ---
    socket.on('get_bestiary', () => {
        const p = players[playerId];
        if (!p) return;
        const bestiary = p.bestiary || {};
        const totalTypes = Object.keys(ZONE_MONSTER_NAMES).reduce((sum, zId) => sum + Object.keys(ZONE_MONSTER_NAMES[zId]).length, 0);
        const discovered = Object.keys(bestiary).length;
        socket.emit('bestiary_data', { bestiary, discovered, total: totalTypes });
    });

    // ── 주사위 도박 (제안) ──

    // --- get_skills ---
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

}

module.exports = { registerQuestMiscConnectionHandlers };

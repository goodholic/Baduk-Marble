mergeInto(LibraryManager.library, {
    SocketConnect: function (urlStr) {
        var url = UTF8ToString(urlStr);
        
        if (typeof io === 'undefined') {
            var script = document.createElement('script');
            script.src = "https://cdn.socket.io/4.8.3/socket.io.min.js";
            script.onload = function() {
                window.socket = io(url);
                setupSocketListeners();
            };
            document.head.appendChild(script);
        } else {
            window.socket = io(url);
            setupSocketListeners();
        }

        function setupSocketListeners() {
            // [참고] InitRequest는 GameManager에서 명시적으로 호출하도록 수정되었으므로 제거
            // window.socket.on("connect", function () { window.socket.emit("init_request"); });

            window.socket.on("init", function (data) {
                SendMessage('GameManager', 'OnInit', JSON.stringify(data));
            });

            window.socket.on("player_join", function (data) {
                SendMessage('GameManager', 'OnPlayerJoin', JSON.stringify(data));
            });

            window.socket.on("player_leave", function (playerId) {
                SendMessage('GameManager', 'OnPlayerLeave', playerId);
            });

            window.socket.on("player_update", function (data) {
                SendMessage('GameManager', 'OnPlayerUpdate', JSON.stringify(data));
            });

            window.socket.on("sync", function (data) {
                SendMessage('GameManager', 'OnSync', JSON.stringify(data));
            });

            window.socket.on("axe_spawn", function (data) {
                SendMessage('GameManager', 'OnAxeSpawn', JSON.stringify(data));
            });

            window.socket.on("axe_destroy", function (axeId) {
                SendMessage('GameManager', 'OnAxeDestroy', axeId.toString());
            });

            window.socket.on("aoe_spawn", function (data) {
                SendMessage('GameManager', 'OnAoeSpawn', JSON.stringify(data));
            });

            window.socket.on("aoe_destroy", function (id) {
                SendMessage('GameManager', 'OnAoeDestroy', id.toString());
            });

            window.socket.on("player_hit", function (data) {
                SendMessage('GameManager', 'OnPlayerHit', JSON.stringify(data));
            });

            window.socket.on("player_die", function (data) {
                SendMessage('GameManager', 'OnPlayerDie', JSON.stringify(data));
            });

            window.socket.on("player_respawn", function (data) {
                SendMessage('GameManager', 'OnPlayerRespawn', JSON.stringify(data));
            });

            window.socket.on("monster_spawn", function (data) {
                SendMessage('GameManager', 'OnMonsterSpawn', JSON.stringify(data));
            });

            window.socket.on("monster_hit", function (data) {
                SendMessage('GameManager', 'OnMonsterHit', JSON.stringify(data));
            });

            window.socket.on("monster_die", function (data) {
                SendMessage('GameManager', 'OnMonsterDie', JSON.stringify(data));
            });

            window.socket.on("drop_spawn", function (data) {
                SendMessage('GameManager', 'OnDropSpawn', JSON.stringify(data));
            });

            window.socket.on("drop_destroy", function (dropId) {
                SendMessage('GameManager', 'OnDropDestroy', dropId);
            });

            window.socket.on("level_up", function (data) {
                SendMessage('GameManager', 'OnLevelUp', JSON.stringify(data));
            });

            window.socket.on("pk_alert", function (data) {
                SendMessage('GameManager', 'OnPkAlert', JSON.stringify(data));
            });

            window.socket.on("chaotic_death_penalty", function (data) {
                SendMessage('GameManager', 'OnChaoticDeathPenalty', JSON.stringify(data));
            });

            window.socket.on("shop_result", function (data) {
                SendMessage('GameManager', 'OnShopResult', JSON.stringify(data));
            });

            window.socket.on("shop_list_result", function (data) {
                SendMessage('GameManager', 'OnShopListResult', JSON.stringify(data));
            });

            window.socket.on("daily_result", function (data) {
                SendMessage('GameManager', 'OnDailyResult', JSON.stringify(data));
            });

            window.socket.on("market_data", function (data) {
                SendMessage('GameManager', 'OnMarketData', JSON.stringify(data));
            });

            window.socket.on("market_update", function (data) {
                SendMessage('GameManager', 'OnMarketData', JSON.stringify(data));
            });

            window.socket.on("market_result", function (data) {
                SendMessage('GameManager', 'OnMarketResult', JSON.stringify(data));
            });

            window.socket.on("inventory_data", function (data) {
                SendMessage('GameManager', 'OnInventoryData', JSON.stringify(data));
            });

            window.socket.on("quest_data", function (data) {
                SendMessage('GameManager', 'OnQuestData', JSON.stringify(data));
            });

            window.socket.on("quest_result", function (data) {
                SendMessage('GameManager', 'OnQuestResult', JSON.stringify(data));
            });

            window.socket.on("unit_data", function (data) {
                SendMessage('GameManager', 'OnUnitData', JSON.stringify(data));
            });

            window.socket.on("unit_result", function (data) {
                SendMessage('GameManager', 'OnUnitResult', JSON.stringify(data));
            });

            window.socket.on("equip_result", function (data) {
                SendMessage('GameManager', 'OnEquipResult', JSON.stringify(data));
            });

            window.socket.on("ranking_data", function (data) {
                SendMessage('GameManager', 'OnRankingData', JSON.stringify(data));
            });

            window.socket.on("morph_result", function (data) {
                // HTML에서 처리
            });

            window.socket.on("enchant_result", function (data) {
                // HTML에서 처리
            });

            window.socket.on("server_msg", function (data) {
                // HTML에서 처리
            });

            window.socket.on("combat_log", function (data) {
                // HTML에서 처리
            });

            // ═══ v4.2 신규 시스템 소켓 리스너 ═══

            // 용병 시스템
            window.socket.on("hire_market_lineup", function (data) {
                SendMessage('SLGManager', 'OnHireMarketLineup', JSON.stringify(data));
            });
            window.socket.on("hire_result", function (data) {
                SendMessage('SLGManager', 'OnHireResult', JSON.stringify(data));
            });
            window.socket.on("bond_info", function (data) {
                SendMessage('SLGManager', 'OnBondInfo', JSON.stringify(data));
            });
            window.socket.on("bond_talk_result", function (data) {
                SendMessage('SLGManager', 'OnBondTalkResult', JSON.stringify(data));
            });
            window.socket.on("colosseum_modes", function (data) {
                SendMessage('SLGManager', 'OnColosseumModes', JSON.stringify(data));
            });
            window.socket.on("colosseum_result", function (data) {
                SendMessage('SLGManager', 'OnColosseumResult', JSON.stringify(data));
            });
            window.socket.on("colosseum_ranking", function (data) {
                SendMessage('SLGManager', 'OnColosseumRanking', JSON.stringify(data));
            });
            window.socket.on("merc_story_list", function (data) {
                SendMessage('SLGManager', 'OnMercStoryList', JSON.stringify(data));
            });
            window.socket.on("merc_story_episode", function (data) {
                SendMessage('SLGManager', 'OnMercStoryEpisode', JSON.stringify(data));
            });
            window.socket.on("merc_active_bonds", function (data) {
                SendMessage('SLGManager', 'OnMercActiveBonds', JSON.stringify(data));
            });
            window.socket.on("merc_codex_status", function (data) {
                SendMessage('SLGManager', 'OnMercCodexStatus', JSON.stringify(data));
            });

            // 공성전
            window.socket.on("siege_castle_info", function (data) {
                SendMessage('SiegeManager', 'OnSiegeCastleInfo', JSON.stringify(data));
            });
            window.socket.on("siege_trap_upgraded", function (data) {
                SendMessage('SiegeManager', 'OnSiegeTrapUpgraded', JSON.stringify(data));
            });
            window.socket.on("siege_battle_start", function (data) {
                SendMessage('SiegeManager', 'OnSiegeBattleStart', JSON.stringify(data));
            });
            window.socket.on("siege_phase_change", function (data) {
                SendMessage('SiegeManager', 'OnSiegePhaseChange', JSON.stringify(data));
            });
            window.socket.on("siege_throne_update", function (data) {
                SendMessage('SiegeManager', 'OnSiegeThroneUpdate', JSON.stringify(data));
            });
            window.socket.on("siege_skill_executed", function (data) {
                SendMessage('SiegeManager', 'OnSiegeSkillExecuted', JSON.stringify(data));
            });
            window.socket.on("siege_battle_end", function (data) {
                SendMessage('SiegeManager', 'OnSiegeBattleEnd', JSON.stringify(data));
            });
            window.socket.on("siege_morale_update", function (data) {
                SendMessage('SiegeManager', 'OnSiegeMoraleUpdate', JSON.stringify(data));
            });

            // 카라반
            window.socket.on("caravan_started", function (data) {
                SendMessage('SiegeManager', 'OnCaravanStarted', JSON.stringify(data));
            });
            window.socket.on("caravan_position", function (data) {
                SendMessage('SiegeManager', 'OnCaravanPosition', JSON.stringify(data));
            });
            window.socket.on("caravan_event", function (data) {
                SendMessage('SiegeManager', 'OnCaravanEvent', JSON.stringify(data));
            });
            window.socket.on("caravan_arrived", function (data) {
                SendMessage('SiegeManager', 'OnCaravanArrived', JSON.stringify(data));
            });
            window.socket.on("caravan_raid_result", function (data) {
                SendMessage('SiegeManager', 'OnCaravanRaidResult', JSON.stringify(data));
            });
            window.socket.on("caravan_raided", function (data) {
                SendMessage('SiegeManager', 'OnCaravanRaided', JSON.stringify(data));
            });

            // IO 재앙 & 로그라이크
            window.socket.on("io_disaster_start", function (data) {
                SendMessage('GameManager', 'OnDisasterStart', JSON.stringify(data));
            });
            window.socket.on("io_disaster_end", function (data) {
                SendMessage('GameManager', 'OnDisasterEnd', JSON.stringify(data));
            });
            window.socket.on("io_mutant_wave", function (data) {
                SendMessage('GameManager', 'OnMutantWave', JSON.stringify(data));
            });
            window.socket.on("roguelike_floor", function (data) {
                SendMessage('SLGManager', 'OnRoguelikeFloor', JSON.stringify(data));
            });
            window.socket.on("roguelike_end", function (data) {
                SendMessage('SLGManager', 'OnRoguelikeEnd', JSON.stringify(data));
            });

            // 서버 대전쟁
            window.socket.on("war_status", function (data) {
                SendMessage('SiegeManager', 'OnWarStatus', JSON.stringify(data));
            });
            window.socket.on("war_faction_joined", function (data) {
                SendMessage('SiegeManager', 'OnWarFactionJoined', JSON.stringify(data));
            });
            window.socket.on("war_started", function (data) {
                SendMessage('SiegeManager', 'OnWarStarted', JSON.stringify(data));
            });
            window.socket.on("war_ended", function (data) {
                SendMessage('SiegeManager', 'OnWarEnded', JSON.stringify(data));
            });

            // 서버 토스트 (공용)
            window.socket.on("server_toast", function (data) {
                SendMessage('GameManager', 'OnServerToast', JSON.stringify(data));
            });
        }
    },

    SocketEmit: function (eventNameStr, dataStr) {
        var eventName = UTF8ToString(eventNameStr);
        var data = UTF8ToString(dataStr);
        if (window.socket) {
            window.socket.emit(eventName, data);
        }
    }
});
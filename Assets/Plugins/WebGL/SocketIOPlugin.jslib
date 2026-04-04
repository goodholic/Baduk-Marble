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
mergeInto(LibraryManager.library, {
    SocketConnect: function (urlStr) {
        var url = UTF8ToString(urlStr);
        
        // socket.io 라이브러리가 로드되지 않았다면 동적으로 추가
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
            // [핵심 수정 1] 소켓 연결이 완료되면 즉시 서버에 초기화(init_request)를 요청합니다.
            // 이 코드가 있어야 서버가 플레이어를 생성하고 유니티에 캐릭터를 소환하라는 명령을 내립니다.
            window.socket.on("connect", function () {
                window.socket.emit("init_request");
            });

            window.socket.on("init", function (data) {
                SendMessage('GameManager', 'OnInit', JSON.stringify(data));
            });

            window.socket.on("player_join", function (data) {
                SendMessage('GameManager', 'OnPlayerJoin', JSON.stringify(data));
            });

            window.socket.on("player_leave", function (playerId) {
                // playerId는 문자열이므로 JSON 변환 없이 바로 전송
                SendMessage('GameManager', 'OnPlayerLeave', playerId);
            });
            
            window.socket.on("sync", function (data) {
                SendMessage('GameManager', 'OnSync', JSON.stringify(data));
            });
            
            window.socket.on("axe_spawn", function (data) {
                SendMessage('GameManager', 'OnAxeSpawn', JSON.stringify(data));
            });
            
            window.socket.on("axe_destroy", function (axeId) {
                // axeId는 숫자이므로 Unity에서 string으로 받기 위해 변환
                SendMessage('GameManager', 'OnAxeDestroy', axeId.toString());
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
        }
    },

    SocketEmit: function (eventNameStr, dataStr) {
        var eventName = UTF8ToString(eventNameStr);
        var data = UTF8ToString(dataStr);
        if (window.socket) {
            // [핵심 수정 2] JSON.parse(data)를 제거하고 유니티에서 넘어온 문자열(String) 그대로 전송합니다.
            // 서버(server.js)에서 이미 JSON.parse()를 수행하고 있기 때문에 문자열 형태로 보내야 충돌이 발생하지 않습니다.
            window.socket.emit(eventName, data);
        }
    }
});
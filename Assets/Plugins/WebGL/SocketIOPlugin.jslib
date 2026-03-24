mergeInto(LibraryManager.library, {
    InitSocketIO: function (urlStr) {
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
            window.socket.on("update_state", function (data) {
                // 서버로부터 상태를 받으면 Unity의 GameManager 객체로 데이터 전달
                SendMessage('GameManager', 'OnUpdateState', data);
            });
            window.socket.on("game_over", function (data) {
                // 게임 종료 시 Unity로 데이터 전달
                SendMessage('GameManager', 'OnGameOver', data);
            });
        }
    },

    EmitMove: function (dx, dy) {
        if (window.socket) {
            window.socket.emit("move", JSON.stringify({ dx: dx, dy: dy }));
        }
    }
});
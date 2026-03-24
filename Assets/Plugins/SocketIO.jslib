mergeInto(LibraryManager.library, {
    InitSocketIO: function(urlPtr) {
        var url = UTF8ToString(urlPtr);

        // 웹 브라우저에 Socket.IO 자바스크립트 라이브러리를 동적으로 로드합니다.
        var script = document.createElement('script');
        script.src = "https://cdn.socket.io/4.8.1/socket.io.min.js";
        
        script.onload = function() {
            // 로드가 완료되면 서버에 접속합니다.
            window.gameSocket = io(url);

            window.gameSocket.on("connect", function() {
                console.log("웹 브라우저 JS Socket.IO 연결 성공!");
            });

            // 서버에서 받은 데이터를 유니티의 GameManager 스크립트로 전달 (SendMessage)
            window.gameSocket.on("update_state", function(data) {
                var str = typeof data === 'string' ? data : JSON.stringify(data);
                window.myUnityInstance.SendMessage("GameManager", "OnUpdateState", str);
            });

            window.gameSocket.on("dice_result", function(data) {
                var str = typeof data === 'string' ? data : JSON.stringify(data);
                window.myUnityInstance.SendMessage("GameManager", "OnDiceResult", str);
            });

            window.gameSocket.on("bankrupt_notify", function(data) {
                window.myUnityInstance.SendMessage("GameManager", "OnBankruptNotify", "bankrupt");
            });

            window.gameSocket.on("game_over", function(data) {
                var str = typeof data === 'string' ? data : JSON.stringify(data);
                window.myUnityInstance.SendMessage("GameManager", "OnGameOver", str);
            });
        };
        document.head.appendChild(script);
    },

    EmitRollDice: function() {
        if (window.gameSocket) {
            window.gameSocket.emit("roll_dice");
        }
    },

    EmitMove: function(dx, dy) {
        if (window.gameSocket) {
            window.gameSocket.emit("move", { dx: dx, dy: dy });
        }
    }
});
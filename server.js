require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');

const app = express();
const server = http.createServer(app);
// Railway 환경에서는 CORS 설정을 열어두는 것이 좋습니다.
const io = new Server(server, {
    cors: { origin: "*" }
});

// Railway 환경 변수명(MYSQLHOST 등)에 맞춘 MySQL 데이터베이스 연결
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'localhost',
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'board_game',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 게임 상태 변수
let board = [];
let players = {};
let gameTime = 600; // 10분 (600초)
let gameInterval = null;

// 19x19 바둑판 초기화 함수
function initBoard() {
    board = [];
    for (let y = 0; y < 19; y++) {
        let row = [];
        for (let x = 0; x < 19; x++) {
            row.push(0); // 0: 중립, 1: 백팀, 2: 흑팀
        }
        board.push(row);
    }
}

// 게임 리셋 로직
function resetGame() {
    initBoard();
    gameTime = 600;
    for (let id in players) {
        players[id].gold = 100;
        players[id].remainingMoves = 0;
        players[id].isBankrupt = false;
        players[id].x = 9; // 중앙 스폰
        players[id].y = 9;
    }
    broadcastState();
}

// 초기 보드 생성
initBoard();

// 매 초마다 타이머 감소 및 클라이언트 동기화
gameInterval = setInterval(() => {
    gameTime--;
    if (gameTime <= 0) {
        endGame();
    } else {
        broadcastState();
    }
}, 1000);

// 게임 종료 계산 및 MySQL 저장 로직
async function endGame() {
    let team1Tiles = 0;
    let team2Tiles = 0;

    for (let y = 0; y < 19; y++) {
        for (let x = 0; x < 19; x++) {
            if (board[y][x] === 1) team1Tiles++;
            else if (board[y][x] === 2) team2Tiles++;
        }
    }

    let winner = 0;
    if (team1Tiles > team2Tiles) winner = 1;
    else if (team2Tiles > team1Tiles) winner = 2;

    io.emit("game_over", { winner: winner });

    // DB에 결과 기록 시도
    try {
        await pool.query('INSERT INTO match_history (winner_team, team1_score, team2_score) VALUES (?, ?, ?)', [winner, team1Tiles, team2Tiles]);
        console.log("게임 결과 DB 저장 성공!");
    } catch (err) {
        console.error("DB 저장 에러:", err.message);
    }

    // 5초 대기 후 게임 리셋
    setTimeout(() => {
        resetGame();
    }, 5000);
}

// 시야 제한이 적용된 상태 전송
function broadcastState() {
    for (let socketId in players) {
        let p = players[socketId];
        let personalBoard = [];
        let personalPlayers = {};

        // 1. 시야 제한이 적용된 타일 생성
        for (let y = 0; y < 19; y++) {
            let row = [];
            for (let x = 0; x < 19; x++) {
                let tile = board[y][x];
                if (tile === p.team || tile === 0) {
                    row.push(tile);
                } else {
                    row.push(0);
                }
            }
            personalBoard.push(row);
        }

        // 2. 시야 제한이 적용된 플레이어 위치 전송 (1칸 이내 적만 보임)
        for (let otherId in players) {
            let other = players[otherId];
            if (other.team === p.team || other.isBankrupt) {
                personalPlayers[otherId] = other;
            } else {
                let distX = Math.abs(other.x - p.x);
                let distY = Math.abs(other.y - p.y);
                if (distX <= 1 && distY <= 1) {
                    personalPlayers[otherId] = other;
                }
            }
        }

        io.to(socketId).emit("update_state", {
            myId: socketId,
            time: gameTime,
            board: personalBoard,
            players: personalPlayers
        });
    }
}

// 소켓 통신 처리
io.on("connection", (socket) => {
    console.log("플레이어 접속:", socket.id);

    // 팀 배정
    let team1Count = 0;
    let team2Count = 0;
    for (let id in players) {
        if (players[id].team === 1) team1Count++;
        else team2Count++;
    }
    let assignedTeam = (team1Count <= team2Count) ? 1 : 2;

    // 플레이어 초기 생성
    players[socket.id] = {
        x: 9, 
        y: 9,
        team: assignedTeam,
        gold: 100,
        remainingMoves: 0,
        isBankrupt: false
    };

    broadcastState();

    // 주사위 굴리기 처리
    socket.on("roll_dice", () => {
        let p = players[socket.id];
        if (!p || p.isBankrupt || p.remainingMoves > 0) return;

        let diceValue = Math.floor(Math.random() * 6) + 1;
        p.remainingMoves = diceValue;
        
        socket.emit("dice_result", { value: diceValue });
        broadcastState();
    });

    // 이동 처리
    socket.on("move", (data) => {
        let p = players[socket.id];
        if (!p || p.isBankrupt || p.remainingMoves <= 0) return;

        let nx = p.x + data.dx;
        let ny = p.y + data.dy;

        // 보드 맵 이탈 방지
        if (nx < 0 || nx > 18 || ny < 0 || ny > 18) return;

        // 위치 적용 및 이동수 차감
        p.x = nx;
        p.y = ny;
        p.remainingMoves--;

        let currentTile = board[ny][nx];
        let enemyTeam = (p.team === 1) ? 2 : 1;

        if (p.remainingMoves > 0) {
            if (currentTile === enemyTeam) {
                p.gold += 1; 
            } else if (currentTile === 0) {
                board[ny][nx] = p.team;
            }
        } 
        else if (p.remainingMoves === 0) {
            if (currentTile === enemyTeam) {
                p.gold -= 5; 
                board[ny][nx] = p.team; 
            } else if (currentTile === 0) {
                board[ny][nx] = p.team; 
            }

            if (p.gold <= 0) {
                p.isBankrupt = true;
                socket.emit("bankrupt_notify", {});
            }
        }

        broadcastState();
    });

    // 접속 종료
    socket.on("disconnect", () => {
        console.log("플레이어 퇴장:", socket.id);
        delete players[socket.id];
        broadcastState();
    });
});

const PORT = process.env.PORT || 3000;
// 배포 환경을 위해 '0.0.0.0' 바인딩 추가
server.listen(PORT, '0.0.0.0', () => {
    console.log(`서버가 ${PORT} 포트에서 열렸습니다.`);
});
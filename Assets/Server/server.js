require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// MySQL 데이터베이스 연결 (초기 세팅)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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
        broadcastState(); // 매 초마다 남은 시간을 클라이언트에 동기화
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
    } catch (err) {
        console.error("DB 저장 에러 (DB 세팅 전이면 정상입니다):", err.message);
    }

    // 5초 대기 후 게임 리셋
    setTimeout(() => {
        resetGame();
    }, 5000);
}

// 시야 제한이 적용된 "개인화된" 상태를 전체에게 전송
function broadcastState() {
    for (let socketId in players) {
        let p = players[socketId];
        let personalBoard = [];
        let personalPlayers = {};

        // 1. 시야 제한이 적용된 타일 생성 (적팀 타일은 0으로 보임)
        for (let y = 0; y < 19; y++) {
            let row = [];
            for (let x = 0; x < 19; x++) {
                let tile = board[y][x];
                if (tile === p.team || tile === 0) {
                    row.push(tile);
                } else {
                    // 적팀 타일은 클라이언트에게 중립(0)으로 위장해서 보냄
                    row.push(0);
                }
            }
            personalBoard.push(row);
        }

        // 2. 시야 제한이 적용된 플레이어 위치 전송 (1칸 이내 적만 보임)
        for (let otherId in players) {
            let other = players[otherId];
            if (other.team === p.team || other.isBankrupt) {
                // 같은 팀이거나 파산한 유령 상태면 전송
                personalPlayers[otherId] = other;
            } else {
                // 적팀일 경우 거리 계산 (상하좌우 대각선 1칸 반경)
                let distX = Math.abs(other.x - p.x);
                let distY = Math.abs(other.y - p.y);
                if (distX <= 1 && distY <= 1) {
                    personalPlayers[otherId] = other;
                }
            }
        }

        // 해당 유저에게만 특수 제작된 데이터 전송
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

    // 팀 배정 (n vs n 형태를 맞추기 위해 1팀, 2팀 인원 비교)
    let team1Count = 0;
    let team2Count = 0;
    for (let id in players) {
        if (players[id].team === 1) team1Count++;
        else team1Count++;
    }
    let assignedTeam = (team1Count <= team2Count) ? 1 : 2;

    // 플레이어 초기 생성
    players[socket.id] = {
        x: 9, // 중앙에서 시작
        y: 9,
        team: assignedTeam,
        gold: 100, // 초기 자금 100원
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

        // 이동 중인 로직 (도착지가 아닌 지나가는 길)
        if (p.remainingMoves > 0) {
            if (currentTile === enemyTeam) {
                p.gold += 1; // 상대방 건물 밟으며 지나가면 자동 +1원 획득
            } else if (currentTile === 0) {
                board[ny][nx] = p.team; // 빈 땅은 지나가면서 내 색상으로 칠함
            }
        } 
        // 최종 도착지 로직 (주사위 이동이 끝난 지점)
        else if (p.remainingMoves === 0) {
            if (currentTile === enemyTeam) {
                p.gold -= 5; // 적 건물에 도착 시 통행료 -5원
                board[ny][nx] = p.team; // 그리고 그 땅을 내 땅으로 점령
            } else if (currentTile === 0) {
                board[ny][nx] = p.team; // 빈 땅 도착 시 내 땅으로
            }

            // 파산 체크
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
server.listen(PORT, () => {
    console.log(`서버가 ${PORT} 포트에서 열렸습니다.`);
});
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const server = http.createServer(app);

// 유니티 WebGL 파일(.wasm 등)을 브라우저가 올바르게 인식하도록 MIME 타입 강제 지정
express.static.mime.define({'application/wasm': ['wasm']});

// 유니티 WebGL 빌드 폴더(public)를 정적 파일로 제공하도록 설정
app.use(express.static(path.join(__dirname, 'public')));

// 웹 브라우저 접속 시 public 폴더 안의 유니티 웹 빌드(index.html)를 띄워줌
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
            row.push(0); // 0: 중립(빈 공간), 1: 백팀, 2: 흑팀
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

// 게임 종료 계산 (바둑의 '집' 계산 로직) 및 MySQL 저장 로직
async function endGame() {
    let team1Score = 0;
    let team2Score = 0;
    
    // 방문 여부를 체크할 19x19 배열 생성
    let visited = [];
    for (let y = 0; y < 19; y++) {
        let row = [];
        for (let x = 0; x < 19; x++) {
            row.push(false);
        }
        visited.push(row);
    }

    // BFS 기반 바둑 집(영역) 계산 알고리즘
    for (let y = 0; y < 19; y++) {
        for (let x = 0; x < 19; x++) {
            // 빈 공간(0)이면서 아직 방문하지 않은 곳 탐색
            if (board[y][x] === 0 && !visited[y][x]) {
                let queue = [{x: x, y: y}];
                visited[y][x] = true;
                
                let territorySize = 0; // 이 빈 공간 덩어리의 크기 (집 개수)
                let surroundingTeams = new Set(); // 이 공간을 둘러싸고 있는 팀 목록
                
                while (queue.length > 0) {
                    let curr = queue.shift();
                    territorySize++;
                    
                    // 상하좌우 탐색
                    let directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                    for (let dir of directions) {
                        let nx = curr.x + dir[0];
                        let ny = curr.y + dir[1];
                        
                        // 보드 범위 내에 있는지 확인 (외곽선은 바둑에서 자연스러운 벽으로 간주됨)
                        if (nx >= 0 && nx < 19 && ny >= 0 && ny < 19) {
                            if (board[ny][nx] === 0) {
                                if (!visited[ny][nx]) {
                                    visited[ny][nx] = true;
                                    queue.push({x: nx, y: ny});
                                }
                            } else {
                                // 빈 공간이 아니라면 건물을 지은 팀(1 또는 2) 기록
                                surroundingTeams.add(board[ny][nx]);
                            }
                        }
                    }
                }
                
                // 해당 빈 공간(집)을 완벽하게 단 하나의 팀만이 둘러싸고 있을 때만 점수로 인정!
                if (surroundingTeams.size === 1) {
                    if (surroundingTeams.has(1)) {
                        team1Score += territorySize; // 백팀 집 점수 획득
                    } else if (surroundingTeams.has(2)) {
                        team2Score += territorySize; // 흑팀 집 점수 획득
                    }
                }
            }
        }
    }

    let winner = 0;
    if (team1Score > team2Score) winner = 1;
    else if (team2Score > team1Score) winner = 2;

    // WebGL IL2CPP 에러 방지를 위해 JSON.stringify 사용
    io.emit("game_over", JSON.stringify({ winner: winner, team1Score: team1Score, team2Score: team2Score }));

    // DB에 결과 기록 시도
    try {
        await pool.query('INSERT INTO match_history (winner_team, team1_score, team2_score) VALUES (?, ?, ?)', [winner, team1Score, team2Score]);
        console.log(`게임 결과 DB 저장 성공! (백팀 집: ${team1Score}, 흑팀 집: ${team2Score})`);
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
                // 자기 팀이 그린 모양이거나 중립 구역은 보임
                if (tile === p.team || tile === 0) {
                    row.push(tile);
                } else {
                    // 적팀이 그린 모양은 가려짐
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
                // 상하좌우대각선 8칸 이내 (거리가 1 이하)
                if (distX <= 1 && distY <= 1) {
                    personalPlayers[otherId] = other;
                }
            }
        }

        // WebGL IL2CPP 에러 방지를 위해 JSON.stringify 사용
        io.to(socketId).emit("update_state", JSON.stringify({
            myId: socketId,
            time: gameTime,
            board: personalBoard,
            players: personalPlayers
        }));
    }
}

// 소켓 통신 처리
io.on("connection", (socket) => {
    console.log("플레이어 접속:", socket.id);

    // 팀 배정 (n vs n 균형 맞추기)
    let team1Count = 0;
    let team2Count = 0;
    for (let id in players) {
        if (players[id].team === 1) team1Count++;
        else team2Count++;
    }
    // 백(1) 팀부터 배정 후 인원수 맞춤
    let assignedTeam = (team1Count <= team2Count) ? 1 : 2;

    // 플레이어 초기 생성
    players[socket.id] = {
        x: 9, 
        y: 9,
        team: assignedTeam,
        gold: 100, // 초반 100원
        remainingMoves: 0,
        isBankrupt: false
    };

    broadcastState();

    // 주사위 굴리기 처리
    socket.on("roll_dice", () => {
        let p = players[socket.id];
        // 파산했거나 아직 이동 횟수가 남아있으면 굴릴 수 없음
        if (!p || p.isBankrupt || p.remainingMoves > 0) return;

        let diceValue = Math.floor(Math.random() * 6) + 1;
        p.remainingMoves = diceValue;
        
        // WebGL IL2CPP 에러 방지를 위해 JSON.stringify 사용
        socket.emit("dice_result", JSON.stringify({ value: diceValue }));
        broadcastState();
    });

    // 이동 처리
    socket.on("move", (data) => {
        // 클라이언트(WebGL) 측 직렬화 에러를 피하기 위해 문자열로 전송된 경우를 대비한 파싱
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { console.error("이동 데이터 파싱 실패", e); return; }
        }

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

        // 이동 중인 경우
        if (p.remainingMoves > 0) {
            if (currentTile === enemyTeam) {
                p.gold += 1; // 이동하는 칸에 상대방 건물이 있으면 +1원 획득
            } else if (currentTile === 0) {
                board[ny][nx] = p.team; // 빈 땅이면 우리 타일 그림
            }
        } 
        // 이동이 끝난 마지막 칸인 경우
        else if (p.remainingMoves === 0) {
            if (currentTile === enemyTeam) {
                p.gold -= 5; // 도착지에 상대방 건물이 있으면 -5원 통행료
                board[ny][nx] = p.team; // 땅 뺏기
            } else if (currentTile === 0) {
                board[ny][nx] = p.team; 
            }

            // 통행료 지불 후 파산 판정
            if (p.gold <= 0) {
                p.isBankrupt = true;
                // WebGL IL2CPP 에러 방지를 위해 JSON.stringify 사용
                socket.emit("bankrupt_notify", JSON.stringify({}));
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
// 배포 환경을 위해 '0.0.0.0' 바인딩
server.listen(PORT, '0.0.0.0', () => {
    console.log(`서버가 ${PORT} 포트에서 열렸습니다.`);
});
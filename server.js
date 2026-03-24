require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const server = http.createServer(app);

express.static.mime.define({'application/wasm': ['wasm']});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const io = new Server(server, {
    cors: { origin: "*" }
});

// Railway MySQL 연결 설정
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'mysql.railway.internal',
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'JotmJcNfsfKYFrDVLbZMlXkAPIRlnnpH',
    database: process.env.MYSQLDATABASE || 'railway',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

let board = [];
let players = {};
let gameTime = 600; // 10분
let gameInterval = null;

function initBoard() {
    board = [];
    for (let y = 0; y < 19; y++) {
        let row = [];
        for (let x = 0; x < 19; x++) {
            row.push(0); // 0: 빈 공간, 1: 백팀, 2: 흑팀
        }
        board.push(row);
    }
}

function resetGame() {
    initBoard();
    gameTime = 600;
    for (let id in players) {
        players[id].x = 9;
        players[id].y = 9;
    }
    broadcastState();
}

initBoard();

gameInterval = setInterval(() => {
    gameTime--;
    if (gameTime <= 0) {
        endGame();
    } else {
        broadcastState();
    }
}, 1000);

// 실시간 바둑 집(점수) 계산 로직
function calculateScores() {
    let team1Score = 0;
    let team2Score = 0;
    let visited = Array.from({ length: 19 }, () => Array(19).fill(false));

    for (let y = 0; y < 19; y++) {
        for (let x = 0; x < 19; x++) {
            // 빈 공간(0)을 발견하면 탐색 시작
            if (board[y][x] === 0 && !visited[y][x]) {
                let queue = [{x: x, y: y}];
                visited[y][x] = true;
                let territorySize = 0;
                let surroundingTeams = new Set();
                
                while (queue.length > 0) {
                    let curr = queue.shift();
                    territorySize++;
                    let directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                    
                    for (let dir of directions) {
                        let nx = curr.x + dir[0];
                        let ny = curr.y + dir[1];
                        
                        if (nx >= 0 && nx < 19 && ny >= 0 && ny < 19) {
                            if (board[ny][nx] === 0) {
                                if (!visited[ny][nx]) {
                                    visited[ny][nx] = true;
                                    queue.push({x: nx, y: ny});
                                }
                            } else {
                                // 벽을 만났을 때 어떤 팀의 벽인지 기록
                                surroundingTeams.add(board[ny][nx]);
                            }
                        }
                    }
                }
                
                // 오직 한 팀에 의해서만 완전히 둘러싸인 집일 경우 점수 인정
                if (surroundingTeams.size === 1) {
                    if (surroundingTeams.has(1)) team1Score += territorySize;
                    else if (surroundingTeams.has(2)) team2Score += territorySize;
                }
            }
        }
    }
    return { team1Score, team2Score };
}

async function endGame() {
    const scores = calculateScores();
    let team1Score = scores.team1Score;
    let team2Score = scores.team2Score;
    let winner = 0;

    if (team1Score > team2Score) winner = 1;
    else if (team2Score > team1Score) winner = 2;

    io.emit("game_over", JSON.stringify({ winner: winner, team1Score: team1Score, team2Score: team2Score }));

    try {
        await pool.query('INSERT INTO match_history (winner_team, team1_score, team2_score) VALUES (?, ?, ?)', [winner, team1Score, team2Score]);
    } catch (err) {
        console.error("DB 저장 에러:", err.message);
    }

    // 5초 대기 후 게임 초기화
    setTimeout(() => { resetGame(); }, 5000);
}

function broadcastState() {
    const scores = calculateScores();
    
    // 각 개인별 ID와 실시간 점수를 포함하여 전송
    for (let socketId in players) {
        io.to(socketId).emit("update_state", JSON.stringify({
            myId: socketId,
            time: gameTime,
            board: board,
            players: players,
            team1Score: scores.team1Score,
            team2Score: scores.team2Score
        }));
    }
}

io.on("connection", (socket) => {
    // 인원수 균형을 맞추어 흑/백 배정
    let team1Count = 0;
    let team2Count = 0;
    for (let id in players) {
        if (players[id].team === 1) team1Count++;
        else team2Count++;
    }
    let assignedTeam = (team1Count <= team2Count) ? 1 : 2;

    players[socket.id] = {
        x: 9, 
        y: 9,
        team: assignedTeam
    };

    broadcastState();

    socket.on("move", (data) => {
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { return; }
        }

        let p = players[socket.id];
        if (!p) return;

        let nx = p.x + data.dx;
        let ny = p.y + data.dy;

        // 보드 밖으로 나가지 못하게 제한
        if (nx < 0 || nx > 18 || ny < 0 || ny > 18) return;

        p.x = nx;
        p.y = ny;

        // 이동하는 즉시 해당 타일을 내 팀의 색으로 칠함
        board[ny][nx] = p.team;

        broadcastState();
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        broadcastState();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
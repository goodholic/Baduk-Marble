require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// WebGL 빌드 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io 설정 (CORS 전체 허용)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const players = {};
let axes = [];
let axeIdCounter = 0;

const ARENA_SIZE = 30; // 난투장 맵 크기 (가로세로 30 유닛)

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // 1. 초기 플레이어 생성 (랜덤 위치, 기본 방향은 위쪽)
    players[socket.id] = {
        id: socket.id,
        x: (Math.random() - 0.5) * ARENA_SIZE,
        y: (Math.random() - 0.5) * ARENA_SIZE,
        dirX: 0,
        dirY: 1, 
        hp: 100,
        score: 0,
        isAlive: true
    };

    // 자신에게 현재 맵에 있는 모든 플레이어 상태 전송
    socket.emit('init', {
        id: socket.id,
        players: players
    });

    // 다른 모든 플레이어들에게 새로운 플레이어 접속 알림
    socket.broadcast.emit('player_join', players[socket.id]);

    // 2. 플레이어 이동 데이터 수신
    socket.on('move', (data) => {
        if (players[socket.id] && players[socket.id].isAlive) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            
            // 방향 벡터 갱신 (캐릭터가 멈춰도 마지막으로 바라본 방향으로 도끼를 던지기 위함)
            if (data.dirX !== 0 || data.dirY !== 0) {
                const mag = Math.sqrt(data.dirX * data.dirX + data.dirY * data.dirY);
                players[socket.id].dirX = data.dirX / mag;
                players[socket.id].dirY = data.dirY / mag;
            }
        }
    });

    // 3. 도끼 투척 이벤트 수신
    socket.on('throw', () => {
        const p = players[socket.id];
        if (p && p.isAlive) {
            const axe = {
                id: axeIdCounter++,
                ownerId: socket.id,
                x: p.x,
                y: p.y,
                dirX: p.dirX,
                dirY: p.dirY,
                speed: 20, // 도끼 비행 속도
                lifeTime: 1.2 // 1.2초 후 자동 소멸 (사거리)
            };
            axes.push(axe);
            io.emit('axe_spawn', axe); // 모든 클라이언트에게 도끼 생성 알림
        }
    });

    // 4. 사망 후 부활 요청 수신
    socket.on('respawn', () => {
        if (players[socket.id]) {
            players[socket.id].x = (Math.random() - 0.5) * ARENA_SIZE;
            players[socket.id].y = (Math.random() - 0.5) * ARENA_SIZE;
            players[socket.id].hp = 100;
            players[socket.id].isAlive = true;
            io.emit('player_respawn', players[socket.id]);
        }
    });

    // 5. 접속 해제 처리
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('player_leave', socket.id);
    });
});

// ==========================================
// 중앙 서버 물리 & 판정 루프 (초당 30회 실행)
// ==========================================
const TICK_RATE = 30;
const DELTA_TIME = 1 / TICK_RATE;

setInterval(() => {
    // 도끼 이동 계산 및 충돌 판정
    for (let i = axes.length - 1; i >= 0; i--) {
        const axe = axes[i];
        axe.x += axe.dirX * axe.speed * DELTA_TIME;
        axe.y += axe.dirY * axe.speed * DELTA_TIME;
        axe.lifeTime -= DELTA_TIME;

        // 수명이 다 된 도끼 제거
        if (axe.lifeTime <= 0) {
            io.emit('axe_destroy', axe.id);
            axes.splice(i, 1);
            continue;
        }

        // 플레이어 피격 검사 (원형 범위 충돌)
        let isHit = false;
        for (const socketId in players) {
            const p = players[socketId];
            
            // 죽은 유저이거나, 본인이 던진 도끼면 무시
            if (!p.isAlive || socketId === axe.ownerId) continue;

            const dx = p.x - axe.x;
            const dy = p.y - axe.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 1.5) { // 피격 판정 반경
                p.hp -= 35;   // 도끼 1방당 데미지
                isHit = true;

                io.emit('axe_destroy', axe.id); // 맞춘 도끼는 즉시 소멸

                if (p.hp <= 0) {
                    p.isAlive = false;
                    p.hp = 0;
                    
                    // 킬어시스트 점수 부여
                    if (players[axe.ownerId]) {
                        players[axe.ownerId].score += 10; 
                    }
                    io.emit('player_die', { victimId: p.id, killerId: axe.ownerId });
                } else {
                    io.emit('player_hit', { id: p.id, hp: p.hp });
                }
                break; // 도끼 1개는 1명만 타격하고 끝남
            }
        }

        // 충돌했다면 서버 배열에서도 도끼 삭제
        if (isHit) {
            axes.splice(i, 1);
        }
    }

    // 모든 클라이언트에게 갱신된 위치 및 점수 동기화
    io.emit('sync', players);

}, 1000 / TICK_RATE);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`AXE.io Battle Server running on port ${PORT}`);
});